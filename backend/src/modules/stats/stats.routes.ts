import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const dailyStatsQuerySchema = z.object({
  babyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const rangeStatsQuerySchema = z.object({
  babyId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

function getDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000+08:00`);
  const end = new Date(`${date}T23:59:59.999+08:00`);
  return { start, end };
}

async function calculateDailyStats(app: FastifyInstance, babyId: string, userId: string, date: string) {
  const { start, end } = getDayRange(date);
  const records = await app.prisma.careRecord.findMany({
    where: {
      babyId,
      userId,
      deletedAt: null,
      happenedAt: { gte: start, lte: end }
    }
  });

  return {
    date,
    formulaAmount: records
      .filter((record) => record.eventType === 'formula')
      .reduce((total, record) => total + (record.amount || 0), 0),
    breastDuration: records
      .filter((record) => record.eventType === 'breastfeeding')
      .reduce((total, record) => total + (record.duration || 0), 0),
    poopCount: records.filter((record) => record.eventType === 'poop').length,
    peeCount: records.filter((record) => record.eventType === 'pee').length
  };
}

function eachDate(from: string, to: string) {
  const dates: string[] = [];
  const current = new Date(`${from}T00:00:00.000+08:00`);
  const end = new Date(`${to}T00:00:00.000+08:00`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/** 统计相关路由 */
export async function statsRoutes(app: FastifyInstance) {
  const ensureBabyOwner = async (babyId: string, userId: string) => {
    const baby = await app.prisma.baby.findFirst({ where: { id: babyId, ownerId: userId } });
    return !!baby;
  };

  app.get('/stats/daily', async (request, reply) => {
    const query = dailyStatsQuerySchema.parse(request.query);
    const userId = request.user.userId;

    if (!(await ensureBabyOwner(query.babyId, userId))) {
      return reply.code(403).send({ message: '无权查看该宝宝统计' });
    }

    return calculateDailyStats(app, query.babyId, userId, query.date);
  });

  app.get('/stats/range', async (request, reply) => {
    const query = rangeStatsQuerySchema.parse(request.query);
    const userId = request.user.userId;

    if (!(await ensureBabyOwner(query.babyId, userId))) {
      return reply.code(403).send({ message: '无权查看该宝宝统计' });
    }

    const items = await Promise.all(
      eachDate(query.from, query.to).map((date) => calculateDailyStats(app, query.babyId, userId, date))
    );

    return { items };
  });
}
