import { describe, expect, it } from 'vitest';
import { createBabySchema, updateBabySchema } from './babies.schemas.js';

describe('babies.schemas', () => {
  describe('createBabySchema', () => {
    it('允许合法的宝宝创建参数', () => {
      const result = createBabySchema.parse({
        name: '小星星',
        birthday: '2024-01-01',
        gender: 'male',
        birthWeight: 3.5,
        birthHeight: 50,
        bloodType: 'A',
        avatarUrl: 'https://example.com/avatar.jpg'
      });

      expect(result.name).toBe('小星星');
      expect(result.gender).toBe('male');
    });

    it('允许最小必填字段', () => {
      const result = createBabySchema.parse({
        name: '小星星',
        gender: 'female'
      });

      expect(result.name).toBe('小星星');
      expect(result.gender).toBe('female');
    });

    it('允许 birthday 为 null', () => {
      const result = createBabySchema.parse({
        name: '小星星',
        gender: 'male',
        birthday: null
      });

      expect(result.birthday).toBeNull();
    });

    it('拒绝空名称', () => {
      expect(() =>
        createBabySchema.parse({
          name: '',
          gender: 'male'
        })
      ).toThrow();
    });

    it('拒绝过长名称', () => {
      expect(() =>
        createBabySchema.parse({
          name: 'a'.repeat(51),
          gender: 'male'
        })
      ).toThrow();
    });

    it('拒绝无效性别', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'other'
        })
      ).toThrow();
    });

    it('拒绝无效生日格式', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          birthday: '2024/01/01'
        })
      ).toThrow();
    });

    it('拒绝过大的出生体重', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          birthWeight: 11
        })
      ).toThrow();
    });

    it('拒绝非正数的出生体重', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          birthWeight: 0
        })
      ).toThrow();
    });

    it('拒绝过大的出生身高', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          birthHeight: 101
        })
      ).toThrow();
    });

    it('拒绝非正数的出生身高', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          birthHeight: 0
        })
      ).toThrow();
    });

    it('拒绝无效血型', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          bloodType: 'XYZ'
        })
      ).toThrow();
    });

    it('允许所有血型', () => {
      ['A', 'B', 'AB', 'O', 'unknown'].forEach((bloodType) => {
        const result = createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          bloodType: bloodType as any
        });
        expect(result.bloodType).toBe(bloodType);
      });
    });

    it('允许两种性别', () => {
      const maleResult = createBabySchema.parse({
        name: '小星星',
        gender: 'male'
      });
      expect(maleResult.gender).toBe('male');

      const femaleResult = createBabySchema.parse({
        name: '小星星',
        gender: 'female'
      });
      expect(femaleResult.gender).toBe('female');
    });

    it('拒绝过长的头像 URL', () => {
      expect(() =>
        createBabySchema.parse({
          name: '小星星',
          gender: 'male',
          avatarUrl: 'https://example.com/'.repeat(100)
        })
      ).toThrow();
    });
  });

  describe('updateBabySchema', () => {
    it('允许部分更新', () => {
      const result = updateBabySchema.parse({
        name: '小月亮'
      });

      expect(result.name).toBe('小月亮');
    });

    it('允许所有字段同时更新', () => {
      const result = updateBabySchema.parse({
        name: '小月亮',
        birthday: '2024-01-02',
        gender: 'female',
        birthWeight: 3.2,
        birthHeight: 49,
        bloodType: 'B',
        avatarUrl: 'https://example.com/new.jpg'
      });

      expect(result.name).toBe('小月亮');
      expect(result.gender).toBe('female');
    });

    it('允许空对象', () => {
      const result = updateBabySchema.parse({});
      expect(result).toEqual({});
    });

    it('允许 birthday 为 null', () => {
      const result = updateBabySchema.parse({
        birthday: null
      });
      expect(result.birthday).toBeNull();
    });

    it('拒绝空名称', () => {
      expect(() =>
        updateBabySchema.parse({
          name: ''
        })
      ).toThrow();
    });

    it('拒绝过长名称', () => {
      expect(() =>
        updateBabySchema.parse({
          name: 'a'.repeat(51)
        })
      ).toThrow();
    });

    it('拒绝无效性别', () => {
      expect(() =>
        updateBabySchema.parse({
          gender: 'other'
        })
      ).toThrow();
    });

    it('拒绝无效生日格式', () => {
      expect(() =>
        updateBabySchema.parse({
          birthday: '2024/01/01'
        })
      ).toThrow();
    });

    it('拒绝过大的出生体重', () => {
      expect(() =>
        updateBabySchema.parse({
          birthWeight: 11
        })
      ).toThrow();
    });

    it('拒绝非正数的出生体重', () => {
      expect(() =>
        updateBabySchema.parse({
          birthWeight: 0
        })
      ).toThrow();
    });

    it('拒绝过大的出生身高', () => {
      expect(() =>
        updateBabySchema.parse({
          birthHeight: 101
        })
      ).toThrow();
    });

    it('拒绝非正数的出生身高', () => {
      expect(() =>
        updateBabySchema.parse({
          birthHeight: 0
        })
      ).toThrow();
    });

    it('拒绝无效血型', () => {
      expect(() =>
        updateBabySchema.parse({
          bloodType: 'XYZ'
        })
      ).toThrow();
    });

    it('允许更新血型', () => {
      const result = updateBabySchema.parse({
        bloodType: 'AB'
      });
      expect(result.bloodType).toBe('AB');
    });

    it('允许更新头像 URL', () => {
      const result = updateBabySchema.parse({
        avatarUrl: 'https://example.com/new.jpg'
      });
      expect(result.avatarUrl).toBe('https://example.com/new.jpg');
    });

    it('拒绝过长的头像 URL', () => {
      expect(() =>
        updateBabySchema.parse({
          avatarUrl: 'https://example.com/'.repeat(100)
        })
      ).toThrow();
    });
  });
});
