import type { FastifyInstance } from 'fastify';
import { createBabySchema, updateBabySchema } from './babies.schemas.js';

/** 宝宝档案相关路由 */
export async function babiesRoutes(app: FastifyInstance) {
  /** 将 YYYY-MM-DD 转为 Date，空值保持 null */
  const parseBirthday = (birthday?: string | null) => {
    return birthday ? new Date(`${birthday}T00:00:00.000Z`) : null;
  };

  // 创建宝宝档案，ownerId 始终来自登录用户
  app.post('/babies', async (request, reply) => {
    const input = createBabySchema.parse(request.body);

    const baby = await app.prisma.baby.create({
      data: {
        ownerId: request.user.userId,
        name: input.name,
        birthday: parseBirthday(input.birthday),
        gender: input.gender,
        birthWeight: input.birthWeight,
        birthHeight: input.birthHeight,
        bloodType: input.bloodType,
        avatarUrl: input.avatarUrl
      }
    });

    return reply.code(201).send(baby);
  });

  // 查询单个宝宝档案，只允许访问自己的宝宝
  app.get('/babies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const baby = await app.prisma.baby.findFirst({
      where: { id, ownerId: request.user.userId }
    });

    if (!baby) return reply.code(404).send({ message: 'Baby not found' });
    return baby;
  });

  // 更新宝宝档案，只允许更新自己的宝宝
  app.put('/babies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBabySchema.parse(request.body);

    const exists = await app.prisma.baby.findFirst({
      where: { id, ownerId: request.user.userId }
    });
    if (!exists) return reply.code(404).send({ message: 'Baby not found' });

    return app.prisma.baby.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.birthday !== undefined && { birthday: parseBirthday(input.birthday) }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.birthWeight !== undefined && { birthWeight: input.birthWeight }),
        ...(input.birthHeight !== undefined && { birthHeight: input.birthHeight }),
        ...(input.bloodType !== undefined && { bloodType: input.bloodType }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl })
      }
    });
  });

  // 查询当前用户的宝宝列表
  app.get('/babies', async (request) => {
    return app.prisma.baby.findMany({
      where: { ownerId: request.user.userId },
      orderBy: { createdAt: 'desc' }
    });
  });
}
