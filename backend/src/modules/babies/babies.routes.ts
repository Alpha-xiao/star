import type { FastifyInstance } from 'fastify';
import { createBabySchema, updateBabySchema } from './babies.schemas.js';

/** 宝宝档案相关路由 */
export async function babiesRoutes(app: FastifyInstance) {
  /** 将 YYYY-MM-DD 转为 Date，空值保持 null */
  const parseBirthday = (birthday?: string | null) => {
    return birthday ? new Date(`${birthday}T00:00:00.000Z`) : null;
  };

  /** 按接口约定返回前端可直接使用的生日格式 */
  const normalizeBaby = <T extends { birthday: Date | null }>(baby: T) => ({
    ...baby,
    birthday: baby.birthday ? baby.birthday.toISOString().slice(0, 10) : null
  });

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

    return reply.code(201).send(normalizeBaby(baby));
  });

  // 获取当前用户可访问的所有宝宝：自己创建 + 加入的宝宝
  app.get('/babies/accessible', async (request) => {
    const [ownedBabies, memberships] = await Promise.all([
      app.prisma.baby.findMany({
        where: { ownerId: request.user.userId },
        orderBy: { createdAt: 'desc' }
      }),
      app.prisma.babyMember.findMany({
        where: { userId: request.user.userId },
        include: { baby: true },
        orderBy: { joinedAt: 'desc' }
      })
    ]);

    const babies = [
      ...ownedBabies.map((baby) => ({ ...normalizeBaby(baby), relation: 'owner' as const })),
      ...memberships.map((item) => ({ ...normalizeBaby(item.baby), relation: item.role }))
    ];

    return { babies };
  });

  // 查询单个宝宝档案，允许 owner 或家庭成员访问
  app.get('/babies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const access = await app.checkBabyAccess(request.user.userId, id);
    if (!access.hasAccess) return reply.code(404).send({ message: 'Baby not found' });

    const baby = await app.prisma.baby.findUnique({ where: { id } });
    if (!baby) return reply.code(404).send({ message: 'Baby not found' });
    return normalizeBaby(baby);
  });

  // 更新宝宝档案，只有 owner/admin 可以编辑
  app.put('/babies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBabySchema.parse(request.body);
    const access = await app.checkBabyAccess(request.user.userId, id, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足' });

    const exists = await app.prisma.baby.findUnique({ where: { id } });
    if (!exists) return reply.code(404).send({ message: 'Baby not found' });

    const baby = await app.prisma.baby.update({
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

    return normalizeBaby(baby);
  });

  // 查询当前用户创建的宝宝列表，保留旧接口兼容现有调用
  app.get('/babies', async (request) => {
    const babies = await app.prisma.baby.findMany({
      where: { ownerId: request.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    return babies.map(normalizeBaby);
  });
}
