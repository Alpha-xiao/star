import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** 生成排除易混淆字符的 6 位邀请码 */
export function generateCode() {
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/** 生成不会和现有记录冲突的邀请码 */
export async function generateUniqueCode(app: FastifyInstance) {
  for (let i = 0; i < 5; i += 1) {
    const code = generateCode();
    const exists = await app.prisma.inviteCode.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('邀请码生成失败');
}

/** 手机号脱敏 */
export function maskPhone(phone?: string | null) {
  if (!phone) return null;
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

/** 邀请码默认过期时间：7 天 */
export function getInviteExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}
