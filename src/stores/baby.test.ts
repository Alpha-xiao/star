import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useBabyStore } from './baby';
import type { Baby } from '@/types/baby';

vi.mock('@/utils/api', () => ({
  apiGetAccessibleBabies: vi.fn(),
  createBaby: vi.fn(),
  getBaby: vi.fn(),
  updateBaby: vi.fn()
}));

const baby: Baby = {
  id: 'baby-1',
  name: '小星星',
  birthday: '2026-06-01',
  gender: 'male',
  birthWeight: 3.2,
  birthHeight: 50,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z'
};

describe('useBabyStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('根据当前角色计算记录和管理权限', () => {
    localStorage.setItem('baby_profile', JSON.stringify(baby));
    const store = useBabyStore();

    expect(store.hasProfile).toBe(true);
    expect(store.currentRole).toBe('owner');
    expect(store.canRecord).toBe(true);
    expect(store.canManageBaby).toBe(true);
    expect(store.canManageFamily).toBe(true);
    expect(store.isReadOnly).toBe(false);
  });

  it('清除宝宝信息时同步移除本地缓存', () => {
    localStorage.setItem('baby_profile', JSON.stringify(baby));
    localStorage.setItem('current_baby_id', baby.id);
    const store = useBabyStore();

    store.clearBaby();

    expect(store.baby).toBeNull();
    expect(store.currentBabyId).toBeNull();
    expect(localStorage.getItem('baby_profile')).toBeNull();
    expect(localStorage.getItem('current_baby_id')).toBeNull();
  });
});
