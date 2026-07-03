import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { BabyRecord } from '@/utils/api';

/**
 * 本地记录 store
 *
 * 负责维护当前用户在前端缓存的护理记录列表，用作离线兜底。
 * 这里仅提供首页计时器、提交后立刻反显等场景所需的最小能力，
 * 真实的统计/明细数据仍以后端接口为准。
 */
export const useRecordStore = defineStore('records', () => {
  /** 当前会话的本地记录列表（倒序：最新的在前面） */
  const todayRecords = ref<BabyRecord[]>([]);

  // 启动时尝试从 localStorage 恢复历史缓存，失败则回退到空数组
  const savedRecords = localStorage.getItem('today_records');
  if (savedRecords) {
    try {
      todayRecords.value = JSON.parse(savedRecords);
    } catch {
      todayRecords.value = [];
    }
  }

  /** 将当前记录列表持久化到 localStorage */
  const saveToLocal = () => {
    localStorage.setItem('today_records', JSON.stringify(todayRecords.value));
  };

  /** 新增一条记录到列表头部，并写入 localStorage */
  const addRecord = (record: BabyRecord) => {
    todayRecords.value.unshift(record);
    saveToLocal();
  };

  /** 清空当前宝宝的本地即时记录缓存 */
  const clearRecords = () => {
    todayRecords.value = [];
    saveToLocal();
  };

  return {
    todayRecords,
    addRecord,
    clearRecords
  };
});
