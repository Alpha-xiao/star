import { describe, expect, it, vi } from 'vitest';
import { generateCode, generateUniqueCode, getInviteExpiresAt, maskPhone } from './family.service.js';

describe('family.service', () => {
  it('生成 6 位去除易混淆字符的邀请码', () => {
    const code = generateCode();

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('手机号脱敏保留前三后四', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });

  it('邀请码默认 7 天后过期', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));

    expect(getInviteExpiresAt().toISOString()).toBe('2026-07-08T00:00:00.000Z');

    vi.useRealTimers();
  });

  it('生成不与现有记录冲突的邀请码', async () => {
    const app = {
      prisma: {
        inviteCode: {
          findUnique: vi.fn().mockResolvedValue(null)
        }
      }
    } as any;

    const code = await generateUniqueCode(app);

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(app.prisma.inviteCode.findUnique).toHaveBeenCalledTimes(1);
  });
});
