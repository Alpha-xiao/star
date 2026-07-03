import type { FastifyInstance } from 'fastify';
import {
  babyIdQuerySchema,
  changeRoleSchema,
  inviteCodeBodySchema,
  inviteCodeParamSchema,
  joinFamilySchema,
  leaveFamilySchema,
  memberParamSchema
} from './family.schemas.js';
import { generateUniqueCode, getInviteExpiresAt, maskPhone } from './family.service.js';

/** 家庭协作相关路由 */
export async function familyRoutes(app: FastifyInstance) {
  app.post('/family/invite-code', async (request, reply) => {
    const input = inviteCodeBodySchema.parse(request.body);
    const access = await app.checkBabyAccess(request.user.userId, input.babyId, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足，仅管理者可生成邀请码' });

    const inviteCode = await app.prisma.inviteCode.create({
      data: {
        code: await generateUniqueCode(app),
        babyId: input.babyId,
        createdBy: request.user.userId,
        expiresAt: getInviteExpiresAt()
      }
    });

    return reply.code(201).send({
      code: inviteCode.code,
      expiresAt: inviteCode.expiresAt,
      maxUses: inviteCode.maxUses,
      usedCount: inviteCode.usedCount
    });
  });

  app.get('/family/invite-code', async (request, reply) => {
    const query = babyIdQuerySchema.parse(request.query);
    const access = await app.checkBabyAccess(request.user.userId, query.babyId, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足' });

    const codes = await app.prisma.inviteCode.findMany({
      where: {
        babyId: query.babyId,
        expiresAt: { gt: new Date() }
      },
      include: { creator: { select: { nickname: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return { codes: codes.filter((item) => item.usedCount < item.maxUses) };
  });

  app.delete('/family/invite-code/:code', async (request, reply) => {
    const params = inviteCodeParamSchema.parse(request.params);
    const code = params.code.toUpperCase();
    const inviteCode = await app.prisma.inviteCode.findUnique({ where: { code } });
    if (!inviteCode) return { message: '邀请码已作废' };

    const access = await app.checkBabyAccess(request.user.userId, inviteCode.babyId, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足' });

    await app.prisma.inviteCode.deleteMany({ where: { code } });
    return { message: '邀请码已作废' };
  });

  app.post('/family/join', async (request, reply) => {
    const input = joinFamilySchema.parse(request.body);
    const inviteCode = await app.prisma.inviteCode.findUnique({
      where: { code: input.code },
      include: {
        baby: {
          include: { owner: { select: { id: true, nickname: true } } }
        }
      }
    });

    if (!inviteCode || inviteCode.expiresAt <= new Date()) {
      return reply.code(400).send({ message: '邀请码不存在或已过期' });
    }
    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return reply.code(400).send({ message: '邀请码已达到最大使用次数' });
    }
    if (inviteCode.baby.ownerId === request.user.userId) {
      return reply.code(400).send({ message: '不能加入自己创建的宝宝' });
    }

    const exists = await app.prisma.babyMember.findUnique({
      where: { babyId_userId: { babyId: inviteCode.babyId, userId: request.user.userId } }
    });
    if (exists) return reply.code(400).send({ message: '你已经是该宝宝的成员' });

    const member = await app.prisma.$transaction(async (tx) => {
      const created = await tx.babyMember.create({
        data: { babyId: inviteCode.babyId, userId: request.user.userId, role: 'member' }
      });
      await tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: { usedCount: { increment: 1 } }
      });
      return created;
    });

    return {
      baby: {
        id: inviteCode.baby.id,
        name: inviteCode.baby.name,
        avatarUrl: inviteCode.baby.avatarUrl,
        owner: { nickname: inviteCode.baby.owner.nickname }
      },
      role: member.role,
      joinedAt: member.joinedAt
    };
  });

  app.get('/family/members', async (request, reply) => {
    const query = babyIdQuerySchema.parse(request.query);
    const access = await app.checkBabyAccess(request.user.userId, query.babyId);
    if (!access.hasAccess) return reply.code(403).send({ message: '无权访问该宝宝' });

    const baby = await app.prisma.baby.findUnique({
      where: { id: query.babyId },
      include: { owner: { select: { id: true, nickname: true, phone: true } } }
    });
    if (!baby) return reply.code(404).send({ message: 'Baby not found' });

    const members = await app.prisma.babyMember.findMany({
      where: { babyId: query.babyId },
      include: { user: { select: { id: true, nickname: true, phone: true } } },
      orderBy: { joinedAt: 'asc' }
    });

    return {
      members: [
        {
          id: `owner-${baby.owner.id}`,
          user: { ...baby.owner, phone: maskPhone(baby.owner.phone), avatarUrl: baby.avatarUrl },
          role: 'owner',
          isOwner: true,
          joinedAt: baby.createdAt
        },
        ...members.map((member) => ({
          id: member.id,
          user: { ...member.user, phone: maskPhone(member.user.phone), avatarUrl: null },
          role: member.role,
          isOwner: false,
          joinedAt: member.joinedAt
        }))
      ]
    };
  });

  app.put('/family/members/:memberId', async (request, reply) => {
    const params = memberParamSchema.parse(request.params);
    const input = changeRoleSchema.parse(request.body);
    const target = await app.prisma.babyMember.findUnique({ where: { id: params.memberId } });
    if (!target) return reply.code(404).send({ message: '成员不存在' });

    const access = await app.checkBabyAccess(request.user.userId, target.babyId, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足' });
    if (access.role !== 'owner' && input.role === 'admin') {
      return reply.code(403).send({ message: '只有宝宝创建者可以设置管理员' });
    }

    await app.prisma.babyMember.update({ where: { id: params.memberId }, data: { role: input.role } });
    return { message: '角色已更新' };
  });

  app.delete('/family/members/:memberId', async (request, reply) => {
    const params = memberParamSchema.parse(request.params);
    const target = await app.prisma.babyMember.findUnique({ where: { id: params.memberId } });
    if (!target) return reply.code(404).send({ message: '成员不存在' });

    const access = await app.checkBabyAccess(request.user.userId, target.babyId, 'admin');
    if (!access.hasAccess) return reply.code(403).send({ message: '权限不足' });

    await app.prisma.babyMember.delete({ where: { id: params.memberId } });
    return { message: '成员已移除' };
  });

  app.post('/family/leave', async (request, reply) => {
    const input = leaveFamilySchema.parse(request.body);
    const baby = await app.prisma.baby.findUnique({ where: { id: input.babyId } });
    if (!baby) return reply.code(404).send({ message: 'Baby not found' });
    if (baby.ownerId === request.user.userId) {
      return reply.code(400).send({ message: '宝宝创建者不能退出，如需删除宝宝请联系管理员' });
    }

    await app.prisma.babyMember.deleteMany({
      where: { babyId: input.babyId, userId: request.user.userId }
    });
    return { message: '已退出' };
  });
}
