import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { config } from '../../config.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';

const SALT_ROUNDS = 10;

/** 生成随机 Refresh Token */
const createRefreshTokenValue = () => randomBytes(32).toString('hex');

/** Refresh Token 过期时间 */
const getRefreshExpiresAt = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.refreshExpiresInDays);
  return expiresAt;
};

/** 设置 Refresh Token Cookie */
const setRefreshCookie = (reply: any, refreshToken: string) => {
  reply.setCookie('refreshToken', refreshToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: config.refreshExpiresInDays * 24 * 60 * 60
  });
};

/** 对外返回的用户信息 */
const toPublicUser = (user: { id: string; phone: string | null; nickname: string | null }) => ({
  id: user.id,
  phone: user.phone,
  nickname: user.nickname
});

/** 签发 Access + Refresh Token */
async function issueTokens(app: FastifyInstance, user: { id: string; phone: string | null; nickname: string | null }) {
  const accessToken = app.jwt.sign({ userId: user.id, phone: user.phone });
  const refreshToken = createRefreshTokenValue();

  await app.prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshExpiresAt()
    }
  });

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

/** 鉴权相关路由 */
export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);

    const exists = await app.prisma.user.findUnique({ where: { phone: input.phone } });
    if (exists) return reply.code(409).send({ message: '手机号已注册' });

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await app.prisma.user.create({
      data: {
        phone: input.phone,
        passwordHash,
        nickname: input.nickname
      }
    });

    const tokens = await issueTokens(app, user);
    setRefreshCookie(reply, tokens.refreshToken);
    return reply.code(201).send(tokens);
  });

  app.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user?.passwordHash) return reply.code(401).send({ message: '手机号或密码错误' });

    const matched = await bcrypt.compare(input.password, user.passwordHash);
    if (!matched) return reply.code(401).send({ message: '手机号或密码错误' });

    const tokens = await issueTokens(app, user);
    setRefreshCookie(reply, tokens.refreshToken);
    return tokens;
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body || {});
    const token = body.refreshToken || request.cookies.refreshToken;
    if (!token) return reply.code(401).send({ message: 'Refresh Token 不存在' });

    const saved = await app.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!saved || saved.expiresAt < new Date()) {
      if (saved) await app.prisma.refreshToken.delete({ where: { id: saved.id } });
      return reply.code(401).send({ message: 'Refresh Token 已失效' });
    }

    await app.prisma.refreshToken.delete({ where: { id: saved.id } });
    const tokens = await issueTokens(app, saved.user);
    setRefreshCookie(reply, tokens.refreshToken);
    return tokens;
  });

  app.post('/auth/logout', { preHandler: app.authenticate }, async (request, reply) => {
    const body = refreshSchema.parse(request.body || {});
    const token = body.refreshToken || request.cookies.refreshToken;
    if (token) {
      await app.prisma.refreshToken.deleteMany({ where: { token } });
    }
    reply.clearCookie('refreshToken', { path: '/' });
    return { success: true };
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: request.user.userId } });
    if (!user) return reply.code(404).send({ message: '用户不存在' });
    return toPublicUser(user);
  });
}
