import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRecordStore } from './records';
import type { BabyRecord } from '@/utils/api';

describe('useRecordStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('新增记录时写入列表头部并同步到 localStorage', () => {
    const store = useRecordStore();
    const first: BabyRecord = { clientId: '1', event_type: '奶粉喂养', timestamp: '2026-07-01T08:00:00.000Z', amount: 60 };
    const second: BabyRecord = { clientId: '2', event_type: '拉尿', timestamp: '2026-07-01T09:00:00.000Z', note: '量多' };

    store.addRecord(first);
    store.addRecord(second);

    expect(store.todayRecords).toEqual([second, first]);
    expect(JSON.parse(localStorage.getItem('today_records') || '[]')).toEqual([second, first]);
  });

  it('清空记录时同步清空本地缓存', () => {
    const store = useRecordStore();
    store.addRecord({ clientId: '1', event_type: '母乳喂养', timestamp: '2026-07-01T08:00:00.000Z', duration: 15 });

    store.clearRecords();

    expect(store.todayRecords).toEqual([]);
    expect(localStorage.getItem('today_records')).toBe('[]');
  });

  it('初始化时从 localStorage 恢复记录', () => {
    const saved: BabyRecord[] = [{ clientId: '1', event_type: '拉屎', timestamp: '2026-07-01T08:00:00.000Z', note: '黄色糊状' }];
    localStorage.setItem('today_records', JSON.stringify(saved));
    setActivePinia(createPinia());

    const store = useRecordStore();

    expect(store.todayRecords).toEqual(saved);
  });
});
