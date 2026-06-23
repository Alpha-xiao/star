import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 数据库客户端插件
 *
 * 应用启动时建立连接，并把客户端挂到 fastify.prisma 上供路由使用；
 * 应用关闭时自动断开连接，避免连接泄漏。
 */
export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient();
  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
