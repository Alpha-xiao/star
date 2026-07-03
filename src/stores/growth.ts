import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  fetchGrowthRecords,
  fetchGrowthLatest,
  submitGrowthRecord,
  updateGrowthRecord as updateGrowthRecordApi,
  deleteGrowthRecord as deleteGrowthRecordApi,
  syncPendingGrowthRecords,
  type GrowthRecord,
  type GrowthLatest,
  type CreateGrowthInput,
  type UpdateGrowthInput
} from '@/utils/api';
import {
  whoWeightBoy,
  whoWeightGirl,
  whoHeightBoy,
  whoHeightGirl,
  whoHeadBoy,
  whoHeadGirl,
} from '@/data/index';
import type { WHOStandard } from '@/data/who-types';

export type MetricType = 'weight' | 'height' | 'head';
export type { GrowthRecord };

/** 图表数据点 */
export interface ChartDataPoint {
  month: number;
  value: number;
  measuredAt: string;
}

/** 百分位区间评估结果 */
export interface GrowthAssessment {
  percentile: string;
  status: 'normal' | 'low' | 'high';
}

export const useGrowthStore = defineStore('growth', () => {
  const records = ref<GrowthRecord[]>([]);
  const latest = ref<GrowthLatest | null>(null);
  const isLoading = ref(false);

  /** 加载成长记录列表 */
  const loadRecords = async (babyId: string) => {
    isLoading.value = true;
    try {
      records.value = await fetchGrowthRecords(babyId);
    } finally {
      isLoading.value = false;
    }
  };

  /** 加载最新指标 */
  const loadLatest = async (babyId: string) => {
    isLoading.value = true;
    try {
      latest.value = await fetchGrowthLatest(babyId);
    } finally {
      isLoading.value = false;
    }
  };

  /** 添加成长记录 */
  const addRecord = async (data: Omit<CreateGrowthInput, 'clientId'>) => {
    const clientId = crypto.randomUUID();
    const success = await submitGrowthRecord({ ...data, clientId });
    if (success && data.babyId) {
      await Promise.all([
        loadRecords(data.babyId),
        loadLatest(data.babyId),
      ]);
    }
    return success;
  };

  /** 更新成长记录 */
  const updateRecord = async (clientId: string, data: UpdateGrowthInput, babyId: string) => {
    const success = await updateGrowthRecordApi(clientId, data);
    if (success) {
      await Promise.all([
        loadRecords(babyId),
        loadLatest(babyId),
      ]);
    }
    return success;
  };

  /** 删除成长记录 */
  const deleteRecord = async (id: string, babyId: string) => {
    const success = await deleteGrowthRecordApi(id);
    if (success) {
      await Promise.all([
        loadRecords(babyId),
        loadLatest(babyId),
      ]);
    }
    return success;
  };

  /** 同步暂存记录 */
  const syncPending = async () => {
    await syncPendingGrowthRecords();
  };

  /** 根据宝宝生日计算月龄 */
  function calculateAgeInDays(birthday: string, measuredAt: string): number {
    const birthDate = new Date(`${birthday}T00:00:00+08:00`);
    const measureDate = new Date(`${measuredAt}T00:00:00+08:00`);
    const diff = measureDate.getTime() - birthDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  /** 计算月龄（取四舍五入） */
  function calculateAgeInMonths(birthday: string, measuredAt: string): number {
    const days = calculateAgeInDays(birthday, measuredAt);
    return Math.max(0, Math.round(days / 30.44));
  }

  /** 获取对应性别和指标的 WHO 标准数据 */
  function getWHOStandards(gender: string | null | undefined, metric: MetricType): WHOStandard[] {
    const isBoy = gender?.toLowerCase() === 'male';
    switch (metric) {
      case 'weight':
        return isBoy ? whoWeightBoy : whoWeightGirl;
      case 'height':
        return isBoy ? whoHeightBoy : whoHeightGirl;
      case 'head':
        return isBoy ? whoHeadBoy : whoHeadGirl;
      default:
        return [];
    }
  }

  /** 评估某个值在 WHO 标准中的百分位区间 */
  function assessGrowth(
    ageInMonths: number,
    value: number,
    whoStandards: WHOStandard[]
  ): GrowthAssessment {
    const std = whoStandards.find(d => d.month === Math.min(60, Math.max(0, ageInMonths)));
    if (!std) {
      return { percentile: '无参考数据', status: 'normal' };
    }

    if (value < std.p3) {
      return { percentile: '< P3', status: 'low' };
    } else if (value < std.p15) {
      return { percentile: 'P3-P15', status: 'normal' };
    } else if (value < std.p50) {
      return { percentile: 'P15-P50', status: 'normal' };
    } else if (value < std.p85) {
      return { percentile: 'P50-P85', status: 'normal' };
    } else if (value < std.p97) {
      return { percentile: 'P85-P97', status: 'normal' };
    } else {
      return { percentile: '> P97', status: 'high' };
    }
  }

  /** 构建图表数据 */
  function buildChartData(
    metric: MetricType,
    birthday: string | null | undefined,
    gender: string | null | undefined
  ) {
    const whoStandards = getWHOStandards(gender, metric);

    // 提取该指标的非空记录
    const babyPoints: ChartDataPoint[] = [];
    for (const record of records.value) {
      let value: number | null | undefined;
      switch (metric) {
        case 'weight':
          value = record.weight;
          break;
        case 'height':
          value = record.height;
          break;
        case 'head':
          value = record.headCircumference;
          break;
      }
      if (value !== null && value !== undefined && birthday) {
        const month = calculateAgeInMonths(birthday, record.measuredAt);
        babyPoints.push({ month, value, measuredAt: record.measuredAt });
      }
    }

    // 按月龄排序
    babyPoints.sort((a, b) => a.month - b.month);

    // 计算图表范围：从出生到当前月龄+2
    let maxMonth = 6;
    if (birthday) {
      maxMonth = Math.max(6, Math.min(60, calculateAgeInMonths(birthday, new Date().toISOString().slice(0, 10)) + 2));
    }

    // 截取需要的 WHO 数据
    const chartWhoStandards = whoStandards.filter(d => d.month <= maxMonth);

    return {
      babyPoints,
      whoStandards: chartWhoStandards,
      maxMonth,
    };
  }

  /** 评估最新数据 */
  function assessLatest(
    metric: MetricType,
    birthday: string | null | undefined,
    gender: string | null | undefined
  ): GrowthAssessment | null {
    if (!latest.value || !birthday) return null;

    let latestValue: { value: number; measuredAt: string; ageInDays: number } | null | undefined;
    switch (metric) {
      case 'weight':
        latestValue = latest.value.latestWeight;
        break;
      case 'height':
        latestValue = latest.value.latestHeight;
        break;
      case 'head':
        latestValue = latest.value.latestHead;
        break;
    }

    if (!latestValue) return null;

    const whoStandards = getWHOStandards(gender, metric);
    const ageInMonths = Math.max(0, Math.round(latestValue.ageInDays / 30.44));

    return assessGrowth(ageInMonths, latestValue.value, whoStandards);
  }

  return {
    records,
    latest,
    isLoading,
    loadRecords,
    loadLatest,
    addRecord,
    updateRecord,
    deleteRecord,
    syncPending,
    buildChartData,
    assessLatest,
    calculateAgeInMonths,
  };
});
