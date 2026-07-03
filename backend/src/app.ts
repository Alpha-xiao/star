import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { config } from './config.js';
import './types.js';
import { prismaPlugin } from './plugins/prisma.js';
import { antiCrawlerPlugin } from './plugins/anti-crawler.js';
import { authPlugin } from './plugins/auth.js';
import { permissionPlugin } from './plugins/permission.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { recordsRoutes } from './modules/records/records.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';
import { babiesRoutes } from './modules/babies/babies.routes.js';
import { familyRoutes } from './modules/family/family.routes.js';
import { growthRoutes } from './modules/growth/growth.routes.js';

/**
 * 构建 Fastify 应用实例
 *
 * - 装载 CORS、Prisma、鉴权插件
 * - 统一处理 Zod 校验错误，返回 400 + 详细 issues
 * - 暴露 /health 健康检查 + /api 下的业务路由
 */
export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  await app.register(antiCrawlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(permissionPlugin);

  // 全局错误处理：参数校验错误转 400，Fastify 客户端错误保留原状态码，其它兜底为 500
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: 'Validation failed',
        issues: error.issues
      });
    }

    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
    if (statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : '请求参数错误';
      return reply.code(statusCode).send({ message });
    }

    app.log.error(error);
    return reply.code(500).send({ message: 'Internal server error' });
  });

  // 健康检查，方便容器探活
  app.get('/health', async () => ({ status: 'ok' }));

  // 业务路由统一挂在 /api 前缀下
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(recordsRoutes, { prefix: '/api' });
  await app.register(statsRoutes, { prefix: '/api' });
  await app.register(babiesRoutes, { prefix: '/api' });
  await app.register(familyRoutes, { prefix: '/api' });
  await app.register(growthRoutes, { prefix: '/api' });

  return app;
}
