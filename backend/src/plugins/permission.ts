import type { FamilyRole } from '@prisma/client';
import fp from 'fastify-plugin';

const roleHierarchy: Record<FamilyRole, number> = {
  admin: 3,
  member: 2,
  viewer: 1
};

/** 宝宝访问权限插件 */
export const permissionPlugin = fp(async (app) => {
  /** 检查当前用户是否是宝宝创建者，或拥有指定成员角色 */
  app.decorate('checkBabyAccess', async (userId: string, babyId: string, requiredRole?: FamilyRole) => {
    const baby = await app.prisma.baby.findFirst({
      where: { id: babyId, ownerId: userId }
    });

    if (baby) return { hasAccess: true, role: 'owner' as const };

    const member = await app.prisma.babyMember.findUnique({
      where: { babyId_userId: { babyId, userId } }
    });

    if (!member) return { hasAccess: false, message: '无权访问该宝宝' };

    if (requiredRole && roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
      return { hasAccess: false, role: member.role, message: '权限不足' };
    }

    return { hasAccess: true, role: member.role };
  });

  /** 从 params/body/query 中读取 babyId，并校验访问权限 */
  app.decorate('requireBabyAccess', (requiredRole?: FamilyRole) => {
    return async (request, reply) => {
      const params = request.params as { babyId?: string; id?: string } | undefined;
      const body = request.body as { babyId?: string } | undefined;
      const query = request.query as { babyId?: string } | undefined;
      const babyId = params?.babyId || body?.babyId || query?.babyId;

      if (!babyId) return reply.code(400).send({ message: '缺少 babyId' });

      const result = await app.checkBabyAccess(request.user.userId, babyId, requiredRole);
      if (!result.hasAccess) return reply.code(403).send({ message: result.message || '无权访问该宝宝' });

      request.user.role = result.role;
      request.user.babyId = babyId;
    };
  });
});
