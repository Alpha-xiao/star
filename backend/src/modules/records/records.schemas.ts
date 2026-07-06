import { z } from 'zod';

/**
 * 单条护理记录创建参数校验
 *
 * 字段命名与数据库 / 前端约定保持一致，clientId 用于离线幂等；
 * source 默认为 PWA，未来 web 端也可复用此 Schema。
 */
export const recordDetailBaseSchema = z.object({
  eventType: z.enum(['poop', 'pee', 'breastfeeding', 'formula', 'sleep']),
  happenedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  duration: z.number().int().positive().max(720).optional(),
  side: z.enum(['left', 'right', 'both']).optional(),
  amount: z.number().int().positive().max(500).optional(),
  note: z.string().max(500).optional()
});

export const recordDetailSchema = recordDetailBaseSchema.superRefine((value, ctx) => {
  if (value.eventType === 'breastfeeding' && value.duration && value.duration > 180) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['duration'], message: '母乳时长不能超过 180 分钟' });
  }
  if (value.eventType !== 'sleep' && value.endedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endedAt'], message: '只有睡眠记录支持结束时间' });
  }
  if (value.eventType === 'sleep') {
    if (!value.duration && !value.endedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['duration'], message: '睡眠记录需要填写时长或醒来时间' });
    }
    if (value.endedAt && new Date(value.endedAt).getTime() <= new Date(value.happenedAt).getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endedAt'], message: '醒来时间必须晚于入睡时间' });
    }
  }
  // 补录也不允许指定未来时间；预留 60 秒容差以兼容客户端与服务端时钟偏差
  if (new Date(value.happenedAt).getTime() > Date.now() + 60_000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['happenedAt'], message: '补录时间不能是未来时间' });
  }
});

export const createRecordSchema = recordDetailBaseSchema
  .extend({
    clientId: z.string().min(1),
    babyId: z.string().uuid(),
    userId: z.string().uuid(),
    source: z.enum(['web', 'pwa', 'backfill']).default('pwa')
  })
  .superRefine((value, ctx) => {
    const result = recordDetailSchema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue(issue);
    }
  });

/** 单条护理记录更新参数校验 */
export const updateRecordSchema = recordDetailSchema;

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
