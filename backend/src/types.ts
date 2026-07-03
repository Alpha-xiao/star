import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FamilyRole, PrismaClient } from '@prisma/client';

type RequestUser = {
  userId: string;
  phone?: string | null;
  role?: 'owner' | FamilyRole;
  babyId?: string;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; phone?: string | null };
    user: RequestUser;
  }
}

// 让 fastify.prisma / fastify.authenticate / fastify.requireBabyAccess 在 TypeScript 中具备完整类型提示
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkBabyAccess: (
      userId: string,
      babyId: string,
      requiredRole?: FamilyRole
    ) => Promise<{ hasAccess: boolean; role?: 'owner' | FamilyRole; message?: string }>;
    requireBabyAccess: (requiredRole?: FamilyRole) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: RequestUser;
  }
}
