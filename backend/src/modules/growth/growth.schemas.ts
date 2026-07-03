import { z } from 'zod';

/** 创建成长记录的 schema */
export const createGrowthSchema = z.object({
  babyId: z.string().uuid(),
  clientId: z.string().min(1),
  measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive().max(30).optional().nullable(),
  height: z.number().positive().max(150).optional().nullable(),
  headCircumference: z.number().positive().max(60).optional().nullable(),
  note: z.string().max(200).optional().nullable(),
}).refine(
  (data) => data.weight || data.height || data.headCircumference,
  { message: '至少填写一项成长数据' }
);

/** 更新成长记录的 schema */
export const updateGrowthSchema = z.object({
  measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight: z.number().positive().max(30).nullable().optional(),
  height: z.number().positive().max(150).nullable().optional(),
  headCircumference: z.number().positive().max(60).nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

/** 查询参数的 schema */
export const listGrowthQuerySchema = z.object({
  babyId: z.string().uuid(),
});

/** 邀请码参数的 schema */
export const growthIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** 按 clientId 更新的参数 schema */
export const growthClientIdParamSchema = z.object({
  clientId: z.string().min(1),
});
