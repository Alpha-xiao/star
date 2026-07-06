import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchRangeStats, formatDateValue, type DailyStats } from '@/utils/api';

/**
 * 历史趋势 Store。
 *
 * 负责缓存周/月粒度的每日聚合数据，避免用户在同一区间反复切换时重复拉取。
 * 切换宝宝、退出登录或权限变化时应通过 invalidate() 清空缓存，防止跨宝宝串数据。
 */
export interface WeekSeries {
  babyId: string;
  from: string;
  to: string;
  days: DailyStats[];
}

export interface MonthSeries {
  babyId: string;
  from: string;
  to: string;
  days: DailyStats[];
}

/** 生成缓存键：{babyId}:{from}~{to}。 */
const cacheKey = (babyId: string, from: string, to: string) => `${babyId}:${from}~${to}`;

/**
 * 按东八区计算某周开始（周一 00:00）与结束（周日 23:59）。
 *
 * anchor 允许传入某周任意一天，返回 YYYY-MM-DD。
 */
export function getWeekRange(anchor: Date = new Date()) {
  const local = new Date(anchor);
  const day = local.getDay(); // 0 = 周日
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(local);
  start.setDate(local.getDate() + offsetToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end, from: formatDateValue(start), to: formatDateValue(end) };
}

/** 计算某个月的起止日期（自然月）。 */
export function getMonthRange(anchor: Date = new Date()) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end, from: formatDateValue(start), to: formatDateValue(end) };
}

/** 判断两个日期是否为同一天。 */
export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const useTrendStore = defineStore('trend', () => {
  const weeklyCache = ref<Map<string, WeekSeries>>(new Map());
  const monthlyCache = ref<Map<string, MonthSeries>>(new Map());
  const isLoading = ref(false);
  const lastFetchedAt = ref<number>(0);

  /** 清空所有缓存，用于切换宝宝、退出登录或权限变化。 */
  const invalidate = () => {
    weeklyCache.value.clear();
    monthlyCache.value.clear();
    lastFetchedAt.value = 0;
  };

  /** 加载并缓存指定区间的每日聚合数据。 */
  const loadRange = async (babyId: string, from: string, to: string): Promise<DailyStats[]> => {
    isLoading.value = true;
    try {
      const items = await fetchRangeStats(babyId, from, to);
      lastFetchedAt.value = Date.now();
      return items;
    } finally {
      isLoading.value = false;
    }
  };

  /** 加载指定周数据；命中缓存则直接返回。 */
  const loadWeek = async (babyId: string, anchor: Date): Promise<WeekSeries> => {
    const { from, to } = getWeekRange(anchor);
    const key = cacheKey(babyId, from, to);
    const cached = weeklyCache.value.get(key);
    if (cached) return cached;

    const days = await loadRange(babyId, from, to);
    const series: WeekSeries = { babyId, from, to, days };
    weeklyCache.value.set(key, series);
    return series;
  };

  /** 加载指定月数据；命中缓存则直接返回。 */
  const loadMonth = async (babyId: string, anchor: Date): Promise<MonthSeries> => {
    const { from, to } = getMonthRange(anchor);
    const key = cacheKey(babyId, from, to);
    const cached = monthlyCache.value.get(key);
    if (cached) return cached;

    const days = await loadRange(babyId, from, to);
    const series: MonthSeries = { babyId, from, to, days };
    monthlyCache.value.set(key, series);
    return series;
  };

  /** 兼容旧命名。 */
  const hasCache = computed(() => weeklyCache.value.size + monthlyCache.value.size > 0);

  return {
    isLoading,
    lastFetchedAt,
    hasCache,
    invalidate,
    loadWeek,
    loadMonth,
    loadRange
  };
});
