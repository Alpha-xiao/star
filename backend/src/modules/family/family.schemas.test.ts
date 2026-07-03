import { describe, expect, it } from 'vitest';
import {
  babyIdQuerySchema,
  inviteCodeBodySchema,
  inviteCodeParamSchema,
  joinFamilySchema,
  memberParamSchema,
  changeRoleSchema,
  leaveFamilySchema
} from './family.schemas.js';

describe('family.schemas', () => {
  describe('babyIdQuerySchema', () => {
    it('允许合法的 babyId', () => {
      const result = babyIdQuerySchema.parse({
        babyId: '00000000-0000-0000-0000-000000000101'
      });
      expect(result.babyId).toBe('00000000-0000-0000-0000-000000000101');
    });

    it('拒绝无效的 UUID', () => {
      expect(() =>
        babyIdQuerySchema.parse({
          babyId: 'invalid-uuid'
        })
      ).toThrow();
    });

    it('拒绝缺少 babyId', () => {
      expect(() =>
        babyIdQuerySchema.parse({})
      ).toThrow();
    });
  });

  describe('inviteCodeBodySchema', () => {
    it('允许合法的 babyId', () => {
      const result = inviteCodeBodySchema.parse({
        babyId: '00000000-0000-0000-0000-000000000101'
      });
      expect(result.babyId).toBe('00000000-0000-0000-0000-000000000101');
    });

    it('拒绝无效的 UUID', () => {
      expect(() =>
        inviteCodeBodySchema.parse({
          babyId: 'invalid-uuid'
        })
      ).toThrow();
    });

    it('拒绝缺少 babyId', () => {
      expect(() =>
        inviteCodeBodySchema.parse({})
      ).toThrow();
    });
  });

  describe('inviteCodeParamSchema', () => {
    it('允许合法的邀请码', () => {
      const result = inviteCodeParamSchema.parse({
        code: 'ABC123'
      });
      expect(result.code).toBe('ABC123');
    });

    it('允许短邀请码', () => {
      const result = inviteCodeParamSchema.parse({
        code: 'A'
      });
      expect(result.code).toBe('A');
    });

    it('允许长邀请码', () => {
      const result = inviteCodeParamSchema.parse({
        code: 'ABCDEFGHIJKL'
      });
      expect(result.code).toBe('ABCDEFGHIJKL');
    });

    it('拒绝过长的邀请码', () => {
      expect(() =>
        inviteCodeParamSchema.parse({
          code: 'ABCDEFGHIJKLM'
        })
      ).toThrow();
    });

    it('允许小写字母', () => {
      const result = inviteCodeParamSchema.parse({
        code: 'abc123'
      });
      expect(result.code).toBe('abc123');
    });

    it('允许混合大小写', () => {
      const result = inviteCodeParamSchema.parse({
        code: 'AbC123'
      });
      expect(result.code).toBe('AbC123');
    });

    it('允许带空格的邀请码并自动 trim', () => {
      const result = inviteCodeParamSchema.parse({
        code: ' ABC123 '
      });
      expect(result.code).toBe('ABC123');
    });

    it('拒绝空邀请码', () => {
      expect(() =>
        inviteCodeParamSchema.parse({
          code: ''
        })
      ).toThrow();
    });

    it('拒绝全空白邀请码', () => {
      expect(() =>
        inviteCodeParamSchema.parse({
          code: '   '
        })
      ).toThrow();
    });

    it('拒绝缺少 code', () => {
      expect(() =>
        inviteCodeParamSchema.parse({})
      ).toThrow();
    });
  });

  describe('joinFamilySchema', () => {
    it('允许合法的 6 位邀请码', () => {
      const result = joinFamilySchema.parse({
        code: 'ABC123'
      });
      expect(result.code).toBe('ABC123');
    });

    it('自动转换为大写', () => {
      const result = joinFamilySchema.parse({
        code: 'abc123'
      });
      expect(result.code).toBe('ABC123');
    });

    it('拒绝少于 6 位的邀请码', () => {
      expect(() =>
        joinFamilySchema.parse({
          code: 'ABC12'
        })
      ).toThrow();
    });

    it('拒绝多于 6 位的邀请码', () => {
      expect(() =>
        joinFamilySchema.parse({
          code: 'ABC1234'
        })
      ).toThrow();
    });

    it('拒绝空邀请码', () => {
      expect(() =>
        joinFamilySchema.parse({
          code: ''
        })
      ).toThrow();
    });

    it('拒绝缺少 code', () => {
      expect(() =>
        joinFamilySchema.parse({})
      ).toThrow();
    });

    it('允许数字和字母混合', () => {
      const result = joinFamilySchema.parse({
        code: 'A1B2C3'
      });
      expect(result.code).toBe('A1B2C3');
    });

    it('允许纯字母', () => {
      const result = joinFamilySchema.parse({
        code: 'ABCDEF'
      });
      expect(result.code).toBe('ABCDEF');
    });

    it('允许纯数字', () => {
      const result = joinFamilySchema.parse({
        code: '123456'
      });
      expect(result.code).toBe('123456');
    });
  });

  describe('memberParamSchema', () => {
    it('允许合法的 memberId', () => {
      const result = memberParamSchema.parse({
        memberId: '00000000-0000-0000-0000-000000000101'
      });
      expect(result.memberId).toBe('00000000-0000-0000-0000-000000000101');
    });

    it('拒绝无效的 UUID', () => {
      expect(() =>
        memberParamSchema.parse({
          memberId: 'invalid-uuid'
        })
      ).toThrow();
    });

    it('拒绝缺少 memberId', () => {
      expect(() =>
        memberParamSchema.parse({})
      ).toThrow();
    });
  });

  describe('changeRoleSchema', () => {
    it('允许 admin 角色', () => {
      const result = changeRoleSchema.parse({
        role: 'admin'
      });
      expect(result.role).toBe('admin');
    });

    it('允许 member 角色', () => {
      const result = changeRoleSchema.parse({
        role: 'member'
      });
      expect(result.role).toBe('member');
    });

    it('允许 viewer 角色', () => {
      const result = changeRoleSchema.parse({
        role: 'viewer'
      });
      expect(result.role).toBe('viewer');
    });

    it('拒绝无效角色', () => {
      expect(() =>
        changeRoleSchema.parse({
          role: 'owner'
        })
      ).toThrow();
    });

    it('拒绝任意字符串', () => {
      expect(() =>
        changeRoleSchema.parse({
          role: 'invalid'
        })
      ).toThrow();
    });

    it('拒绝缺少 role', () => {
      expect(() =>
        changeRoleSchema.parse({})
      ).toThrow();
    });

    it('不允许修改为 owner', () => {
      expect(() =>
        changeRoleSchema.parse({
          role: 'owner'
        })
      ).toThrow();
    });
  });

  describe('leaveFamilySchema', () => {
    it('允许合法的 babyId', () => {
      const result = leaveFamilySchema.parse({
        babyId: '00000000-0000-0000-0000-000000000101'
      });
      expect(result.babyId).toBe('00000000-0000-0000-0000-000000000101');
    });

    it('拒绝无效的 UUID', () => {
      expect(() =>
        leaveFamilySchema.parse({
          babyId: 'invalid-uuid'
        })
      ).toThrow();
    });

    it('拒绝缺少 babyId', () => {
      expect(() =>
        leaveFamilySchema.parse({})
      ).toThrow();
    });
  });
});
