import { z } from 'zod';

/**
 * 单条护理记录创建参数校验
 *
 * 字段命名与数据库 / 前端约定保持一致，clientId 用于离线幂等；
 * source 默认为 PWA，未来 web 端也可复用此 Schema。
 */
export const createRecordSchema = z.object({
  clientId: z.string().min(1),
  babyId: z.string().uuid(),
  userId: z.string().uuid(),
  eventType: z.enum(['poop', 'pee', 'breastfeeding', 'formula']),
  happenedAt: z.string().datetime(),
  duration: z.number().int().positive().max(180).optional(),
  side: z.enum(['left', 'right', 'both']).optional(),
  amount: z.number().int().positive().max(500).optional(),
  note: z.string().max(500).optional(),
  source: z.enum(['web', 'pwa']).default('pwa')
});

/** 批量创建：一次最多 100 条，便于离线同步队列分批 */
export const batchCreateRecordSchema = z.object({
  records: z.array(createRecordSchema).min(1).max(100)
});

/** 列表查询参数：必须指定 babyId，from / to 为 ISO 时间字符串 */
export const listRecordQuerySchema = z.object({
  babyId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});
