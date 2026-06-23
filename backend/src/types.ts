import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; phone?: string | null };
    user: { userId: string; phone?: string | null };
  }
}

// 让 fastify.prisma / fastify.authenticate 在 TypeScript 中具备完整类型提示
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: { userId: string; phone?: string | null };
  }
}
