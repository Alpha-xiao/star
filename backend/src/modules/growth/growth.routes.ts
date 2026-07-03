import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createGrowthSchema,
  updateGrowthSchema,
  listGrowthQuerySchema,
  growthIdParamSchema,
  growthClientIdParamSchema
} from './growth.schemas.js';

/** 成长记录的路由 */
export async function growthRoutes(app: FastifyInstance) {
  /** 创建成长记录：记录者及以上角色可写入，创建者视为最高权限。 */
  app.post(
    '/growth',
    {
      preHandler: [app.authenticate, app.requireBabyAccess('member')]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = createGrowthSchema.parse(request.body);
      const userId = request.user.userId;

      const record = await app.prisma.growthRecord.create({
        data: {
          clientId: data.clientId,
          babyId: data.babyId,
          userId,
          measuredAt: new Date(data.measuredAt),
          weight: data.weight ?? null,
          heightCm: data.height ?? null,
          headCircumference: data.headCircumference ?? null,
          note: data.note ?? null
        },
        include: {
          user: { select: { id: true, nickname: true } }
        }
      });

      return reply.code(201).send(record);
    }
  );

  /** 获取宝宝的所有成长记录：只读成员也可以查看。 */
  app.get(
    '/growth',
    {
      preHandler: [app.authenticate, app.requireBabyAccess('viewer')]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { babyId } = listGrowthQuerySchema.parse(request.query);

      const records = await app.prisma.growthRecord.findMany({
        where: {
          babyId,
          deletedAt: null
        },
        include: {
          user: { select: { id: true, nickname: true } }
        },
        orderBy: { measuredAt: 'desc' }
      });

      return reply.send(records);
    }
  );

  /** 获取最新的成长记录指标，用于档案页和成长页概览。 */
  app.get(
    '/growth/latest',
    {
      preHandler: [app.authenticate, app.requireBabyAccess('viewer')]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { babyId } = listGrowthQuerySchema.parse(request.query);

      const baby = await app.prisma.baby.findUnique({
        where: { id: babyId }
      });

      if (!baby?.birthday) {
        return reply.send({
          latestWeight: null,
          latestHeight: null,
          latestHead: null,
          totalRecords: 0
        });
      }

      const birthday = baby.birthday;

      const [latestWeight, latestHeight, latestHead, totalRecords] = await Promise.all([
        app.prisma.growthRecord.findFirst({
          where: { babyId, deletedAt: null, weight: { not: null } },
          orderBy: { measuredAt: 'desc' }
        }),
        app.prisma.growthRecord.findFirst({
          where: { babyId, deletedAt: null, heightCm: { not: null } },
          orderBy: { measuredAt: 'desc' }
        }),
        app.prisma.growthRecord.findFirst({
          where: { babyId, deletedAt: null, headCircumference: { not: null } },
          orderBy: { measuredAt: 'desc' }
        }),
        app.prisma.growthRecord.count({
          where: { babyId, deletedAt: null }
        })
      ]);

      function calculateAgeDays(measuredAt: Date) {
        const diff = measuredAt.getTime() - birthday.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      }

      return reply.send({
        latestWeight: latestWeight
          ? {
              value: latestWeight.weight,
              measuredAt: latestWeight.measuredAt.toISOString().slice(0, 10),
              ageInDays: calculateAgeDays(latestWeight.measuredAt)
            }
          : null,
        latestHeight: latestHeight
          ? {
              value: latestHeight.heightCm,
              measuredAt: latestHeight.measuredAt.toISOString().slice(0, 10),
              ageInDays: calculateAgeDays(latestHeight.measuredAt)
            }
          : null,
        latestHead: latestHead
          ? {
              value: latestHead.headCircumference,
              measuredAt: latestHead.measuredAt.toISOString().slice(0, 10),
              ageInDays: calculateAgeDays(latestHead.measuredAt)
            }
          : null,
        totalRecords
      });
    }
  );

  /** 按 clientId 更新成长记录：管理员可编辑全部，普通记录者只能编辑自己的记录。 */
  app.put(
    '/growth/by-client-id/:clientId',
    {
      preHandler: [app.authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { clientId } = growthClientIdParamSchema.parse(request.params);
      const data = updateGrowthSchema.parse(request.body);
      const userId = request.user.userId;

      const existing = await app.prisma.growthRecord.findUnique({
        where: { clientId }
      });

      if (!existing) {
        return reply.code(404).send({ message: '记录不存在' });
      }

      // by-client-id 接口没有 babyId 入参，需要先查记录，再用记录归属宝宝做权限校验。
      const access = await app.checkBabyAccess(userId, existing.babyId, 'member');
      if (!access.hasAccess) {
        return reply.code(403).send({ message: access.message || '无权访问该宝宝' });
      }

      if (!['owner', 'admin'].includes(access.role || '') && existing.userId !== userId) {
        return reply.code(403).send({ message: '只能编辑自己的记录' });
      }

      const updateData: any = {};
      if (data.measuredAt) updateData.measuredAt = new Date(data.measuredAt);
      if (data.weight !== undefined) updateData.weight = data.weight;
      if (data.height !== undefined) updateData.heightCm = data.height;
      if (data.headCircumference !== undefined) updateData.headCircumference = data.headCircumference;
      if (data.note !== undefined) updateData.note = data.note;

      const record = await app.prisma.growthRecord.update({
        where: { clientId },
        data: updateData,
        include: {
          user: { select: { id: true, nickname: true } }
        }
      });

      return reply.send(record);
    }
  );

  /** 删除成长记录（软删除）：管理员可删除全部，普通记录者只能删除自己的记录。 */
  app.delete(
    '/growth/:id',
    {
      preHandler: [app.authenticate]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = growthIdParamSchema.parse(request.params);
      const userId = request.user.userId;

      const existing = await app.prisma.growthRecord.findUnique({
        where: { id }
      });

      if (!existing) {
        return reply.code(404).send({ message: '记录不存在' });
      }

      // 删除接口同样只带记录 id，权限需基于记录归属宝宝校验。
      const access = await app.checkBabyAccess(userId, existing.babyId, 'member');
      if (!access.hasAccess) {
        return reply.code(403).send({ message: access.message || '无权访问该宝宝' });
      }

      if (!['owner', 'admin'].includes(access.role || '') && existing.userId !== userId) {
        return reply.code(403).send({ message: '只能删除自己的记录' });
      }

      await app.prisma.growthRecord.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      return reply.send({ message: '删除成功' });
    }
  );
}
