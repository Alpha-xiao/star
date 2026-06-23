import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config.js';

/** 不需要登录即可访问的接口 */
const WHITELIST = ['/health', '/api/auth/register', '/api/auth/login', '/api/auth/refresh'];

/** JWT + Cookie 鉴权插件 */
export const authPlugin = fp(async (app) => {
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn }
  });

  await app.register(cookie, {
    secret: config.refreshSecret,
    parseOptions: {}
  });

  app.decorate('authenticate', async (request, reply) => {
    if (WHITELIST.some((path) => request.url.startsWith(path))) return;

    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: '未登录或 Token 已过期' });
    }
  });

  app.addHook('onRequest', app.authenticate);
});
