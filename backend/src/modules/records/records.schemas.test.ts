import { describe, expect, it } from 'vitest';
import { createRecordSchema, recordDetailSchema } from './records.schemas.js';

const baseRecord = {
  clientId: 'client-1',
  babyId: '00000000-0000-0000-0000-000000000101',
  userId: '00000000-0000-0000-0000-000000000001',
  happenedAt: '2026-07-01T08:00:00.000Z',
  source: 'pwa' as const
};

describe('records.schemas', () => {
  it('允许合法奶粉记录', () => {
    const result = createRecordSchema.parse({
      ...baseRecord,
      eventType: 'formula',
      amount: 90
    });

    expect(result.eventType).toBe('formula');
    expect(result.amount).toBe(90);
  });

  it('睡眠记录必须包含时长或结束时间', () => {
    const result = recordDetailSchema.safeParse({
      eventType: 'sleep',
      happenedAt: '2026-07-01T08:00:00.000Z'
    });

    expect(result.success).toBe(false);
  });

  it('拒绝结束时间早于开始时间的睡眠记录', () => {
    const result = recordDetailSchema.safeParse({
      eventType: 'sleep',
      happenedAt: '2026-07-01T08:00:00.000Z',
      endedAt: '2026-07-01T07:59:00.000Z'
    });

    expect(result.success).toBe(false);
  });

  it('拒绝非睡眠记录携带结束时间', () => {
    const result = recordDetailSchema.safeParse({
      eventType: 'formula',
      happenedAt: '2026-07-01T08:00:00.000Z',
      endedAt: '2026-07-01T09:00:00.000Z',
      amount: 60
    });

    expect(result.success).toBe(false);
  });
});
