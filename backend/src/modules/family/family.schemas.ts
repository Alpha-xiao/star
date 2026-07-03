import { z } from 'zod';

/** babyId 查询参数校验 */
export const babyIdQuerySchema = z.object({
  babyId: z.string().uuid()
});

/** 生成邀请码参数校验 */
export const inviteCodeBodySchema = z.object({
  babyId: z.string().uuid()
});

/** 邀请码路径参数校验 */
export const inviteCodeParamSchema = z.object({
  code: z.string().trim().min(1).max(12)
});

/** 通过邀请码加入参数校验 */
export const joinFamilySchema = z.object({
  code: z.string().trim().length(6).transform((value) => value.toUpperCase())
});

/** 成员路径参数校验 */
export const memberParamSchema = z.object({
  memberId: z.string().uuid()
});

/** 修改成员角色参数校验 */
export const changeRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer'])
});

/** 主动退出参数校验 */
export const leaveFamilySchema = z.object({
  babyId: z.string().uuid()
});
