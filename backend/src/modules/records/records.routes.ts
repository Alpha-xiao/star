import type { FastifyInstance } from 'fastify';
import { batchCreateRecordSchema, createRecordSchema, listRecordQuerySchema } from './records.schemas.js';

/** 护理记录相关路由 */
export async function recordsRoutes(app: FastifyInstance) {
  /** 校验宝宝是否属于当前登录用户 */
  const ensureBabyOwner = async (babyId: string, userId: string) => {
    const baby = await app.prisma.baby.findFirst({ where: { id: babyId, ownerId: userId } });
    return !!baby;
  };

  // 创建单条记录：clientId 已存在则直接返回原记录，避免离线重复提交
  app.post('/records', async (request, reply) => {
    const input = createRecordSchema.parse(request.body);
    const userId = request.user.userId;

    if (!(await ensureBabyOwner(input.babyId, userId))) {
      return reply.code(403).send({ message: '无权操作该宝宝记录' });
    }

    const record = await app.prisma.careRecord.upsert({
      where: { clientId: input.clientId },
      update: {},
      create: {
        clientId: input.clientId,
        babyId: input.babyId,
        userId,
        eventType: input.eventType,
        happenedAt: new Date(input.happenedAt),
        duration: input.duration,
        side: input.side,
        amount: input.amount,
        note: input.note,
        source: input.source
      }
    });

    return reply.code(201).send({
      id: record.id,
      clientId: record.clientId,
      status: 'created'
    });
  });

  // 批量创建：成功的 clientId 返回给前端用于清理本地暂存队列
  app.post('/records/batch', async (request) => {
    const input = batchCreateRecordSchema.parse(request.body);
    const userId = request.user.userId;
    const success: string[] = [];
    const failed: Array<{ clientId: string; message: string }> = [];

    for (const item of input.records) {
      try {
        if (!(await ensureBabyOwner(item.babyId, userId))) {
          failed.push({ clientId: item.clientId, message: '无权操作该宝宝记录' });
          continue;
        }

        await app.prisma.careRecord.upsert({
          where: { clientId: item.clientId },
          update: {},
          create: {
            clientId: item.clientId,
            babyId: item.babyId,
            userId,
            eventType: item.eventType,
            happenedAt: new Date(item.happenedAt),
            duration: item.duration,
            side: item.side,
            amount: item.amount,
            note: item.note,
            source: item.source
          }
        });

        success.push(item.clientId);
      } catch (error) {
        failed.push({
          clientId: item.clientId,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed };
  });

  // 查询某个时间范围内的记录
  app.get('/records', async (request, reply) => {
    const query = listRecordQuerySchema.parse(request.query);
    const userId = request.user.userId;

    if (!(await ensureBabyOwner(query.babyId, userId))) {
      return reply.code(403).send({ message: '无权查看该宝宝记录' });
    }

    const records = await app.prisma.careRecord.findMany({
      where: {
        babyId: query.babyId,
        userId,
        deletedAt: null,
        happenedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined
        }
      },
      orderBy: { happenedAt: 'desc' }
    });

    return { items: records };
  });

  // 通过 clientId 撤销（软删除）一条记录
  app.post('/records/by-client-id/:clientId/undo', async (request) => {
    const params = request.params as { clientId: string };

    await app.prisma.careRecord.updateMany({
      where: { clientId: params.clientId, userId: request.user.userId },
      data: { deletedAt: new Date() }
    });

    return { success: true };
  });

  // 通过主键 id 软删除
  app.delete('/records/:id', async (request) => {
    const params = request.params as { id: string };

    await app.prisma.careRecord.updateMany({
      where: { id: params.id, userId: request.user.userId },
      data: { deletedAt: new Date() }
    });

    return { success: true };
  });
}
