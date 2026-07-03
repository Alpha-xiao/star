import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSleepTimerStore } from './sleep-timer';

vi.mock('@/utils/api', () => ({
  getActiveSleep: vi.fn(),
  getLastSleep: vi.fn(),
  submitRecord: vi.fn()
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
});

describe('useSleepTimerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('初始状态应为非活动', () => {
    const store = useSleepTimerStore();
    expect(store.isActive).toBe(false);
    expect(store.startedAt).toBeNull();
    expect(store.elapsedMinutes).toBe(0);
    expect(store.wakeWindowMinutes).toBe(0);
    expect(store.lastWakeAt).toBeNull();
  });

  it('startSleep 应启动睡眠计时器', () => {
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    const store = useSleepTimerStore();

    store.startSleep('baby-1');

    expect(store.isActive).toBe(true);
    expect(store.startedAt).toBe('2024-01-01T10:00:00.000Z');
    expect(store.elapsedMinutes).toBe(0);
    expect(localStorage.getItem('babystar_sleep_timer_baby-1')).not.toBeNull();
  });

  it('重复调用 startSleep 不应重复启动', () => {
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    const store = useSleepTimerStore();

    store.startSleep('baby-1');
    const firstStartedAt = store.startedAt;

    vi.setSystemTime(new Date('2024-01-01T10:05:00.000Z'));
    store.startSleep('baby-1');

    expect(store.startedAt).toBe(firstStartedAt);
  });

  it('tick 更新经过时间', () => {
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    const store = useSleepTimerStore();
    store.startSleep('baby-1');

    vi.setSystemTime(new Date('2024-01-01T10:30:00.000Z'));
    store.tick();

    expect(store.elapsedMinutes).toBe(30);
  });

  it('elapsedDisplay 格式化时间', () => {
    const store = useSleepTimerStore();

    store.elapsedMinutes = 30;
    expect(store.elapsedDisplay).toBe('30分钟');

    store.elapsedMinutes = 90;
    expect(store.elapsedDisplay).toBe('1小时30分钟');

    store.elapsedMinutes = 120;
    expect(store.elapsedDisplay).toBe('2小时0分钟');
  });

  it('wakeWindowDisplay 格式化清醒窗口', () => {
    const store = useSleepTimerStore();

    store.wakeWindowMinutes = 45;
    expect(store.wakeWindowDisplay).toBe('45分钟');

    store.wakeWindowMinutes = 150;
    expect(store.wakeWindowDisplay).toBe('2小时30分钟');
  });

  it('startedTimeText 格式化开始时间', () => {
    const store = useSleepTimerStore();

    expect(store.startedTimeText).toBe('--:--');

    store.startedAt = '2024-01-01T10:30:00.000Z';
    expect(store.startedTimeText).not.toBe('--:--');
  });

  it('lastWakeTimeText 格式化最后醒来时间', () => {
    const store = useSleepTimerStore();

    expect(store.lastWakeTimeText).toBe('暂无睡眠记录');

    store.lastWakeAt = '2024-01-01T08:00:00.000Z';
    expect(store.lastWakeTimeText).not.toBe('暂无睡眠记录');
  });

  it('endSleep 成功应提交记录并重置状态', async () => {
    const { submitRecord } = await import('@/utils/api');
    const mockSubmit = submitRecord as ReturnType<typeof vi.fn>;
    mockSubmit.mockResolvedValue(true);

    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    const store = useSleepTimerStore();
    store.startSleep('baby-1');

    vi.setSystemTime(new Date('2024-01-01T11:00:00.000Z'));
    const success = await store.endSleep('睡得好');

    expect(success).toBe(true);
    expect(store.isActive).toBe(false);
    expect(store.startedAt).toBeNull();
    expect(store.elapsedMinutes).toBe(0);
    expect(store.lastWakeAt).toBe('2024-01-01T11:00:00.000Z');
    expect(localStorage.getItem('babystar_sleep_timer_baby-1')).toBeNull();
  });

  it('endSleep 在非活动状态返回 false', async () => {
    const store = useSleepTimerStore();
    const success = await store.endSleep();

    expect(success).toBe(false);
  });

  it('init 从 localStorage 恢复活动睡眠', async () => {
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    localStorage.setItem('babystar_sleep_timer_baby-1', JSON.stringify({ startedAt: '2024-01-01T10:00:00.000Z' }));

    const store = useSleepTimerStore();
    await store.init('baby-1');

    expect(store.isActive).toBe(true);
    expect(store.startedAt).toBe('2024-01-01T10:00:00.000Z');
  });

  it('init 从 API 恢复活动睡眠', async () => {
    const { getActiveSleep } = await import('@/utils/api');
    const mockGetActive = getActiveSleep as ReturnType<typeof vi.fn>;
    mockGetActive.mockResolvedValue({
      event_type: '睡眠',
      timestamp: '2024-01-01T10:00:00.000Z'
    });

    const store = useSleepTimerStore();
    await store.init('baby-1');

    expect(store.isActive).toBe(true);
    expect(store.startedAt).toBe('2024-01-01T10:00:00.000Z');
  });

  it('init 无活动睡眠时刷新清醒窗口', async () => {
    const { getActiveSleep, getLastSleep } = await import('@/utils/api');
    const mockGetActive = getActiveSleep as ReturnType<typeof vi.fn>;
    const mockGetLast = getLastSleep as ReturnType<typeof vi.fn>;
    mockGetActive.mockResolvedValue(null);
    mockGetLast.mockResolvedValue({
      event_type: '睡眠',
      timestamp: '2024-01-01T08:00:00.000Z',
      duration: 60
    });

    const store = useSleepTimerStore();
    await store.init('baby-1');

    expect(store.isActive).toBe(false);
    expect(store.lastWakeAt).not.toBeNull();
  });

  it('refreshWakeWindow 更新最后醒来时间和清醒窗口', async () => {
    const { getLastSleep } = await import('@/utils/api');
    const mockGetLast = getLastSleep as ReturnType<typeof vi.fn>;
    vi.setSystemTime(new Date('2024-01-01T11:00:00.000Z'));
    mockGetLast.mockResolvedValue({
      event_type: '睡眠',
      timestamp: '2024-01-01T09:00:00.000Z',
      endedAt: '2024-01-01T10:00:00.000Z'
    });

    const store = useSleepTimerStore();
    await store.refreshWakeWindow('baby-1');

    expect(store.lastWakeAt).toBe('2024-01-01T10:00:00.000Z');
  });

  it('refreshWakeWindow 无记录时重置', async () => {
    const { getLastSleep } = await import('@/utils/api');
    const mockGetLast = getLastSleep as ReturnType<typeof vi.fn>;
    mockGetLast.mockResolvedValue(null);

    const store = useSleepTimerStore();
    store.lastWakeAt = '2024-01-01T10:00:00.000Z';
    store.wakeWindowMinutes = 60;

    await store.refreshWakeWindow('baby-1');

    expect(store.lastWakeAt).toBeNull();
    expect(store.wakeWindowMinutes).toBe(0);
  });
});
