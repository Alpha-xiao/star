import { z } from 'zod';

/** 手机号 + 密码注册参数 */
export const registerSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  password: z.string().min(6).max(64),
  nickname: z.string().max(50).optional()
});

/** 手机号 + 密码登录参数 */
export const loginSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  password: z.string().min(6).max(64)
});

/** Refresh Token 参数 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional()
});
