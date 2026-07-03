import { describe, expect, it } from 'vitest';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';

describe('auth.schemas', () => {
  it('允许合法注册参数', () => {
    const result = registerSchema.parse({
      phone: '13812345678',
      password: '123456',
      nickname: '妈妈'
    });

    expect(result.phone).toBe('13812345678');
    expect(result.nickname).toBe('妈妈');
  });

  it('拒绝非法手机号', () => {
    expect(() => loginSchema.parse({ phone: '123', password: '123456' })).toThrow();
  });

  it('允许 refreshToken 为空，兼容 Cookie 刷新', () => {
    expect(refreshSchema.parse({})).toEqual({});
  });
});
