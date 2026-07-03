import { z } from 'zod';

/** 创建宝宝档案参数校验 */
export const createBabySchema = z.object({
  name: z.string().min(1).max(50),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender: z.enum(['male', 'female']),
  birthWeight: z.number().positive().max(10).optional(),
  birthHeight: z.number().positive().max(100).optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'unknown']).optional(),
  avatarUrl: z.string().max(500).optional()
});

/** 更新宝宝档案参数校验（所有字段可选） */
export const updateBabySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender: z.enum(['male', 'female']).optional(),
  birthWeight: z.number().positive().max(10).optional(),
  birthHeight: z.number().positive().max(100).optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'unknown']).optional(),
  avatarUrl: z.string().max(500).optional()
});
