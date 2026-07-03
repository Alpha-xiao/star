import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getActiveSleep, getLastSleep, submitRecord, type BabyRecord } from '@/utils/api';

/** 将分钟数格式化为首页睡眠卡片使用的中文时长。 */
const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (hours <= 0) return `${mins}分钟`;
  return `${hours}小时${mins}分钟`;
};

const getStorageKey = (babyId: string) => `babystar_sleep_timer_${babyId}`;

/**
 * 睡眠计时 Store。
 *
 * 负责记录当前宝宝的进行中睡眠、清醒窗口和跨刷新恢复。
 * 进行中状态按 babyId 单独持久化，避免多宝宝切换时串用计时器。
 */
export const useSleepTimerStore = defineStore('sleepTimer', () => {
  const isActive = ref(false);
  const startedAt = ref<string | null>(null);
  const elapsedMinutes = ref(0);
  const wakeWindowMinutes = ref(0);
  const lastWakeAt = ref<string | null>(null);
  const currentBabyId = ref('');

  /** 已入睡时长展示文案。 */
  const elapsedDisplay = computed(() => formatMinutes(elapsedMinutes.value));
  /** 清醒窗口展示文案，用于辅助判断下一次哄睡时机。 */
  const wakeWindowDisplay = computed(() => formatMinutes(wakeWindowMinutes.value));
  /** 最近一次醒来的本地时间展示。 */
  const lastWakeTimeText = computed(() => {
    if (!lastWakeAt.value) return '暂无睡眠记录';
    return new Date(lastWakeAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  });
  /** 当前睡眠开始时间的本地展示。 */
  const startedTimeText = computed(() => {
    if (!startedAt.value) return '--:--';
    return new Date(startedAt.value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  });

  /** 仅持久化进行中的睡眠开始时间；结束后立即清除本地计时缓存。 */
  const persist = () => {
    if (!currentBabyId.value) return;
    if (isActive.value && startedAt.value) {
      localStorage.setItem(getStorageKey(currentBabyId.value), JSON.stringify({ startedAt: startedAt.value }));
    } else {
      localStorage.removeItem(getStorageKey(currentBabyId.value));
    }
  };

  /** 每分钟刷新计时：睡眠中更新已睡时长，否则更新清醒窗口。 */
  const tick = () => {
    const now = Date.now();
    if (isActive.value && startedAt.value) {
      elapsedMinutes.value = Math.max(0, Math.floor((now - new Date(startedAt.value).getTime()) / 60000));
      return;
    }

    if (lastWakeAt.value) {
      wakeWindowMinutes.value = Math.max(0, Math.floor((now - new Date(lastWakeAt.value).getTime()) / 60000));
    }
  };

  /** 从后端最近一次睡眠记录推导清醒窗口起点。 */
  const refreshWakeWindow = async (babyId = currentBabyId.value) => {
    if (!babyId) return;
    const lastSleep = await getLastSleep(babyId);
    if (!lastSleep) {
      lastWakeAt.value = null;
      wakeWindowMinutes.value = 0;
      return;
    }

    lastWakeAt.value =
      lastSleep.endedAt ||
      new Date(new Date(lastSleep.timestamp).getTime() + (lastSleep.duration || 0) * 60000).toISOString();
    tick();
  };

  /**
   * 初始化当前宝宝睡眠状态：先恢复本地未结束计时，再用后端进行中睡眠兜底，
   * 都不存在时刷新最近醒来时间。
   */
  const init = async (babyId: string) => {
    currentBabyId.value = babyId;
    const saved = localStorage.getItem(getStorageKey(babyId));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { startedAt?: string };
        if (parsed.startedAt) {
          isActive.value = true;
          startedAt.value = parsed.startedAt;
          tick();
          return;
        }
      } catch {
        localStorage.removeItem(getStorageKey(babyId));
      }
    }

    const activeSleep = await getActiveSleep(babyId).catch(() => null);
    if (activeSleep) {
      isActive.value = true;
      startedAt.value = activeSleep.timestamp;
      persist();
      tick();
      return;
    }

    isActive.value = false;
    startedAt.value = null;
    elapsedMinutes.value = 0;
    await refreshWakeWindow(babyId).catch(() => undefined);
  };

  /** 开始睡眠计时，只记录本地开始时间，结束时再生成护理记录。 */
  const startSleep = (babyId: string) => {
    if (isActive.value) return;
    currentBabyId.value = babyId;
    isActive.value = true;
    startedAt.value = new Date().toISOString();
    elapsedMinutes.value = 0;
    persist();
    tick();
  };

  /**
   * 结束睡眠并提交护理记录。
   *
   * 无论同步是否成功都会结束本地计时；失败记录由 submitRecord 写入离线暂存。
   */
  const endSleep = async (note?: string) => {
    if (!isActive.value || !startedAt.value) return false;

    const endedAt = new Date().toISOString();
    const duration = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt.value).getTime()) / 60000));
    const record: BabyRecord = {
      clientId: crypto.randomUUID(),
      event_type: '睡眠',
      timestamp: startedAt.value,
      endedAt,
      duration,
      note: note?.trim() || undefined
    };

    const success = await submitRecord(record);
    isActive.value = false;
    startedAt.value = null;
    elapsedMinutes.value = 0;
    lastWakeAt.value = endedAt;
    persist();
    tick();
    return success;
  };

  return {
    isActive,
    startedAt,
    elapsedMinutes,
    wakeWindowMinutes,
    lastWakeAt,
    elapsedDisplay,
    wakeWindowDisplay,
    lastWakeTimeText,
    startedTimeText,
    init,
    tick,
    startSleep,
    endSleep,
    refreshWakeWindow
  };
});
