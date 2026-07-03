import type { FamilyRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import {
  batchCreateRecordSchema,
  createRecordSchema,
  listRecordQuerySchema,
  updateRecordSchema
} from './records.schemas.js';

/** 护理记录相关路由 */
export async function recordsRoutes(app: FastifyInstance) {
  const canWriteRecord = (role?: 'owner' | FamilyRole) => role === 'owner' || role === 'admin' || role === 'member';

  const ensureWritableBaby = async (babyId: string, userId: string) => {
    const access = await app.checkBabyAccess(userId, babyId, 'member');
    return access.hasAccess && canWriteRecord(access.role);
  };

  const getSleepTiming = (input: { happenedAt: string; endedAt?: string; duration?: number }) => {
    const startedAt = new Date(input.happenedAt);
    let endedAt = input.endedAt ? new Date(input.endedAt) : undefined;
    let duration = input.duration;

    if (endedAt && !duration) {
      duration = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    }
    if (duration && !endedAt) {
      endedAt = new Date(startedAt.getTime() + duration * 60000);
    }

    return { endedAt, duration };
  };

  const getRecordData = (input: {
    eventType: 'poop' | 'pee' | 'breastfeeding' | 'formula' | 'sleep';
    happenedAt: string;
    endedAt?: string;
    duration?: number;
    side?: 'left' | 'right' | 'both';
    amount?: number;
    note?: string;
  }) => {
    if (input.eventType === 'sleep') {
      const sleep = getSleepTiming(input);
      return {
        eventType: input.eventType,
        happenedAt: new Date(input.happenedAt),
        endedAt: sleep.endedAt,
        duration: sleep.duration,
        side: null,
        amount: null,
        note: input.note
      };
    }

    return {
      eventType: input.eventType,
      happenedAt: new Date(input.happenedAt),
      endedAt: null,
      duration: input.eventType === 'breastfeeding' ? input.duration : null,
      side: input.eventType === 'breastfeeding' ? input.side : null,
      amount: input.eventType === 'formula' ? input.amount : null,
      note: input.eventType === 'poop' || input.eventType === 'pee' ? input.note : null
    };
  };

  // 创建单条记录：clientId 已存在则直接返回原记录，避免离线重复提交
  app.post('/records', async (request, reply) => {
    const input = createRecordSchema.parse(request.body);
    const userId = request.user.userId;

    if (!(await ensureWritableBaby(input.babyId, userId))) {
      return reply.code(403).send({ message: '无权操作该宝宝记录' });
    }

    const record = await app.prisma.careRecord.upsert({
      where: { clientId: input.clientId },
      update: {},
      create: {
        clientId: input.clientId,
        babyId: input.babyId,
        userId,
        ...getRecordData(input),
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
        if (!(await ensureWritableBaby(item.babyId, userId))) {
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
            ...getRecordData(item),
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

  // 查询当前宝宝最近一条已结束睡眠，用于计算清醒窗口
  app.get('/records/last-sleep', async (request, reply) => {
    const query = listRecordQuerySchema.pick({ babyId: true }).parse(request.query);
    const userId = request.user.userId;
    const access = await app.checkBabyAccess(userId, query.babyId);

    if (!access.hasAccess) {
      return reply.code(403).send({ message: '无权查看该宝宝记录' });
    }

    const record = await app.prisma.careRecord.findFirst({
      where: { babyId: query.babyId, eventType: 'sleep', deletedAt: null, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
      include: { user: { select: { id: true, nickname: true } } }
    });

    return record ? { ...record, recorder: { userId: record.user.id, nickname: record.user.nickname } } : null;
  });

  // 查询当前宝宝正在进行的睡眠，用于刷新后恢复计时器
  app.get('/records/active-sleep', async (request, reply) => {
    const query = listRecordQuerySchema.pick({ babyId: true }).parse(request.query);
    const userId = request.user.userId;
    const access = await app.checkBabyAccess(userId, query.babyId);

    if (!access.hasAccess) {
      return reply.code(403).send({ message: '无权查看该宝宝记录' });
    }

    const record = await app.prisma.careRecord.findFirst({
      where: { babyId: query.babyId, eventType: 'sleep', deletedAt: null, endedAt: null },
      orderBy: { happenedAt: 'desc' },
      include: { user: { select: { id: true, nickname: true } } }
    });

    return record ? { ...record, recorder: { userId: record.user.id, nickname: record.user.nickname } } : null;
  });

  // 查询某个时间范围内的记录
  app.get('/records', async (request, reply) => {
    const query = listRecordQuerySchema.parse(request.query);
    const userId = request.user.userId;
    const access = await app.checkBabyAccess(userId, query.babyId);

    if (!access.hasAccess) {
      return reply.code(403).send({ message: '无权查看该宝宝记录' });
    }

    const records = await app.prisma.careRecord.findMany({
      where: {
        babyId: query.babyId,
        deletedAt: null,
        happenedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined
        }
      },
      include: { user: { select: { id: true, nickname: true } } },
      orderBy: { happenedAt: 'desc' }
    });

    return {
      items: records.map((record) => ({
        ...record,
        recorder: { userId: record.user.id, nickname: record.user.nickname }
      }))
    };
  });

  const ensureRecordWritable = async (record: { babyId: string; userId: string }, userId: string, reply: any) => {
    const access = await app.checkBabyAccess(userId, record.babyId, 'member');
    if (!access.hasAccess || !canWriteRecord(access.role)) {
      return reply.code(403).send({ message: '无权操作该宝宝记录' });
    }

    const canEditOthers = access.role === 'owner' || access.role === 'admin';
    if (!canEditOthers && record.userId !== userId) {
      return reply.code(403).send({ message: '只能操作自己创建的记录' });
    }

    return null;
  };

  const undoRecord = async (record: { id: string; babyId: string; userId: string }, userId: string, reply: any) => {
    const forbidden = await ensureRecordWritable(record, userId, reply);
    if (forbidden) return forbidden;

    await app.prisma.careRecord.update({ where: { id: record.id }, data: { deletedAt: new Date() } });
    return { success: true };
  };

  // 通过 clientId 更新一条记录，统计会自动基于更新后的明细重新计算
  app.put('/records/by-client-id/:clientId', async (request, reply) => {
    const params = request.params as { clientId: string };
    const input = updateRecordSchema.parse(request.body);
    const record = await app.prisma.careRecord.findUnique({ where: { clientId: params.clientId } });

    if (!record || record.deletedAt) return reply.code(404).send({ message: '记录不存在或已被撤销' });

    const forbidden = await ensureRecordWritable(record, request.user.userId, reply);
    if (forbidden) return forbidden;

    await app.prisma.careRecord.update({
      where: { id: record.id },
      data: getRecordData(input)
    });

    return { success: true };
  });

  // 通过 clientId 撤销（软删除）一条记录
  app.post('/records/by-client-id/:clientId/undo', async (request, reply) => {
    const params = request.params as { clientId: string };
    const record = await app.prisma.careRecord.findUnique({ where: { clientId: params.clientId } });
    if (!record) return { success: true };
    return undoRecord(record, request.user.userId, reply);
  });

  // 通过主键 id 软删除
  app.delete('/records/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const record = await app.prisma.careRecord.findUnique({ where: { id: params.id } });
    if (!record) return { success: true };
    return undoRecord(record, request.user.userId, reply);
  });
}
