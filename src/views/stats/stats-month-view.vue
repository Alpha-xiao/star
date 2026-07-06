<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { showToast } from 'vant';
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-vue-next';
import * as echarts from 'echarts';
import { type DailyStats } from '@/utils/api';
import { useBabyStore } from '@/stores/baby';
import { useTrendStore, getMonthRange } from '@/stores/trend';
import { downloadDailyStatsCsv, trackEvent } from '@/utils/trend-utils';

/**
 * 月视图：单指标 Segment + 月度摘要 + 热力图 + 30 日趋势线。
 */
const babyStore = useBabyStore();
const trendStore = useTrendStore();

/** 支持的指标：奶量、母乳、睡眠、排泄 */
type Metric = 'milk' | 'breast' | 'sleep' | 'poop';

const metricOptions: Array<{ key: Metric; label: string; unit: string; color: string }> = [
  { key: 'milk', label: '奶量', unit: 'ml', color: '#E65100' },
  { key: 'breast', label: '母乳', unit: 'min', color: '#C62828' },
  { key: 'sleep', label: '睡眠', unit: 'h', color: '#5C6BC0' },
  { key: 'poop', label: '排泄', unit: '次', color: '#1565C0' }
];

const metric = ref<Metric>('milk');
const anchor = ref<Date>(new Date());
const monthDays = ref<DailyStats[]>([]);
const isLoading = ref(false);

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const currentRange = computed(() => getMonthRange(anchor.value));

/** 是否为本月 */
const isCurrentMonth = computed(() => {
  const now = getMonthRange(new Date());
  return now.from === currentRange.value.from;
});

/** 月份标题 */
const monthText = computed(() => {
  const { start } = currentRange.value;
  return `${start.getFullYear()} 年 ${start.getMonth() + 1} 月`;
});

const currentMetric = computed(() => metricOptions.find((m) => m.key === metric.value)!);

/** 取指定指标的当日数值 */
const valueOf = (day: DailyStats) => {
  if (metric.value === 'milk') return day.formulaAmount || 0;
  if (metric.value === 'breast') return day.breastDuration || 0;
  if (metric.value === 'sleep') return day.sleepDuration || 0;
  return (day.peeCount || 0) + (day.poopCount || 0);
};

/** 展示数值（睡眠转小时） */
const displayValue = (day: DailyStats) => {
  const v = valueOf(day);
  if (metric.value === 'sleep') return Number((v / 60).toFixed(1));
  return v;
};

/** 已记录天数 */
const recordedDays = computed(() => monthDays.value.filter((d) => valueOf(d) > 0).length);

const totalDays = computed(() => monthDays.value.length);

/** 摘要：总量 / 日均 / 单日峰值 */
const summary = computed(() => {
  const values = monthDays.value.map(valueOf);
  const total = values.reduce((s, v) => s + v, 0);
  const days = recordedDays.value || 1;
  const avg = total / days;
  const peak = values.length ? Math.max(...values) : 0;
  return {
    total: metric.value === 'sleep' ? Number((total / 60).toFixed(1)) : total,
    avg: metric.value === 'sleep' ? Number((avg / 60).toFixed(1)) : Math.round(avg),
    peak: metric.value === 'sleep' ? Number((peak / 60).toFixed(1)) : peak
  };
});

/** 热力图分级：按最近有值序列的四分位阈值切 5 档 */
const thresholds = computed(() => {
  const valid = monthDays.value.map(valueOf).filter((v) => v > 0).sort((a, b) => a - b);
  if (valid.length === 0) return [0, 0, 0, 0];
  const pick = (p: number) => valid[Math.min(valid.length - 1, Math.floor(valid.length * p))];
  return [pick(0.2), pick(0.4), pick(0.6), pick(0.8)];
});

/** 计算某天的热力等级：0 / 1 / 2 / 3 / 4 */
const heatLevel = (day: DailyStats) => {
  const v = valueOf(day);
  if (v <= 0) return 0;
  const [t1, t2, t3, t4] = thresholds.value;
  if (v <= t1) return 1;
  if (v <= t2) return 2;
  if (v <= t3) return 3;
  if (v <= t4) return 4;
  return 4;
};

/** 月历网格：包含前面的空占位，让第一天对齐周一 */
interface CalendarCell {
  key: string;
  day: number | null;
  date?: string;
  value?: number;
  level: number;
  isToday: boolean;
}

const calendarCells = computed<CalendarCell[]>(() => {
  const { start } = currentRange.value;
  const firstDayIndex = (start.getDay() + 6) % 7; // 让周一为 0
  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ key: `mute-pre-${i}`, day: null, level: 0, isToday: false });
  }
  const today = new Date();
  monthDays.value.forEach((day) => {
    const dt = new Date(`${day.date}T00:00:00+08:00`);
    cells.push({
      key: day.date,
      day: dt.getDate(),
      date: day.date,
      value: valueOf(day),
      level: heatLevel(day),
      isToday:
        dt.getFullYear() === today.getFullYear() &&
        dt.getMonth() === today.getMonth() &&
        dt.getDate() === today.getDate()
    });
  });
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ key: `mute-post-${i}`, day: null, level: 0, isToday: false });
    }
  }
  return cells;
});

/** 7 日移动平均 */
const movingAvg = computed(() => {
  const values = monthDays.value.map((d) => (metric.value === 'sleep' ? valueOf(d) / 60 : valueOf(d)));
  return values.map((_, idx) => {
    const start = Math.max(0, idx - 6);
    const slice = values.slice(start, idx + 1);
    return Number((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(2));
  });
});

/** 加载当月数据 */
const loadData = async () => {
  const babyId = babyStore.currentBabyId;
  if (!babyId) return;

  isLoading.value = true;
  try {
    const month = await trendStore.loadMonth(babyId, anchor.value);
    monthDays.value = month.days;
    await nextTick();
    renderChart();
  } catch (error) {
    console.error('Load monthly stats failed:', error);
    showToast({ message: '月趋势加载失败', type: 'fail' });
  } finally {
    isLoading.value = false;
  }
};

/** 绘制月度趋势线（当日值 + 7 日移动平均） */
const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);

  const days = monthDays.value.map((d) => d.date.slice(8, 10));
  const values = monthDays.value.map((d) => displayValue(d));
  const avg = movingAvg.value;

  chart.setOption({
    grid: { left: 8, right: 12, top: 24, bottom: 24, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#EEE' } },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: currentMetric.value.unit,
      nameTextStyle: { color: '#999', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 10 },
      splitLine: { lineStyle: { color: '#F5F0EA', type: 'dashed' } }
    },
    series: [
      {
        name: '当日',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: values,
        lineStyle: { color: currentMetric.value.color, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${currentMetric.value.color}44` },
            { offset: 1, color: `${currentMetric.value.color}00` }
          ])
        }
      },
      {
        name: '7 日移动平均',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: avg,
        lineStyle: { color: '#999', width: 1.4, type: 'dashed' }
      }
    ]
  });
  chart.resize();
};

/** 切换月 */
const prevMonth = () => {
  const next = new Date(anchor.value);
  next.setMonth(next.getMonth() - 1);
  anchor.value = next;
  trackEvent('trend_range_change', { direction: 'prev', view: 'month' });
};

const nextMonth = () => {
  if (isCurrentMonth.value) return;
  const next = new Date(anchor.value);
  next.setMonth(next.getMonth() + 1);
  anchor.value = next;
  trackEvent('trend_range_change', { direction: 'next', view: 'month' });
};

const onSwitchMetric = (m: Metric) => {
  metric.value = m;
  trackEvent('trend_metric_switch', { metric: m });
  nextTick(renderChart);
};

/** 导出 CSV */
const onExportCsv = () => {
  if (babyStore.isReadOnly) {
    showToast({ message: '只读成员暂无导出权限', type: 'fail' });
    return;
  }
  trackEvent('trend_export_click', { view: 'month' });
  const { from, to } = currentRange.value;
  downloadDailyStatsCsv(monthDays.value, `monthly-stats-${from}-${to}`);
};

const handleResize = () => chart?.resize();

watch(
  () => babyStore.currentBabyId,
  () => {
    trendStore.invalidate();
    loadData();
  }
);
watch(anchor, () => loadData());

onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  chart?.dispose();
  window.removeEventListener('resize', handleResize);
});

/** 热力等级样式类 */
const heatClass = (level: number) => {
  if (level === 0) return 'bg-[var(--surface-pressed)] text-[var(--text-secondary)]';
  if (level === 1) return 'bg-[#ffe9ce] text-[var(--text-secondary)]';
  if (level === 2) return 'bg-[#ffcf95] text-[var(--text-secondary)]';
  if (level === 3) return 'bg-[#ffa966] text-white';
  return 'bg-[var(--brand-primary)] text-white';
};
</script>

<template>
  <div class="flex flex-1 min-h-0 flex-col overflow-y-auto px-5 pb-6">
    <!-- 日期导航 -->
    <div class="mb-4 flex items-center justify-between">
      <button class="btn-day-nav press" @click="prevMonth">
        <ChevronLeft :size="14" color="var(--text-secondary)" />
      </button>
      <div class="flex flex-col items-center">
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">{{ monthText }}</span>
        <span class="mt-0.5 text-[11px] text-[var(--text-tertiary)]">已记录 {{ recordedDays }} / {{ totalDays }} 天</span>
      </div>
      <button
        class="btn-day-nav press"
        :disabled="isCurrentMonth"
        :class="{ 'opacity-30 pointer-events-none': isCurrentMonth }"
        @click="nextMonth">
        <ChevronRight :size="14" color="var(--text-secondary)" />
      </button>
    </div>

    <!-- 指标 Segment -->
    <div class="mb-3.5 flex gap-1.5">
      <button
        v-for="opt in metricOptions"
        :key="opt.key"
        class="press flex-1 rounded-[14px] py-2 text-xs font-semibold shadow-[var(--card-shadow)]"
        :class="metric === opt.key ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--surface-card)] text-[var(--text-secondary)]'"
        @click="onSwitchMetric(opt.key)">
        {{ opt.label }}
      </button>
    </div>

    <!-- 月度摘要 -->
    <div class="mb-3.5 rounded-[20px] bg-gradient-to-br from-[#FFAB40] to-[var(--brand-primary)] p-4 text-white shadow-[var(--card-shadow)]">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs opacity-90">{{ currentMetric.label }}摘要</span>
        <span class="text-[13px] font-semibold">{{ recordedDays }} / {{ totalDays }} 天</span>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <div class="flex items-baseline gap-1">
            <span class="text-[22px] font-bold leading-none">{{ summary.total }}</span>
            <span class="text-[11px] opacity-90">{{ currentMetric.unit }}</span>
          </div>
          <div class="mt-1 text-[11px] opacity-90">总{{ currentMetric.label }}</div>
        </div>
        <div>
          <div class="flex items-baseline gap-1">
            <span class="text-[22px] font-bold leading-none">{{ summary.avg }}</span>
            <span class="text-[11px] opacity-90">{{ currentMetric.unit }}</span>
          </div>
          <div class="mt-1 text-[11px] opacity-90">日均</div>
        </div>
        <div>
          <div class="flex items-baseline gap-1">
            <span class="text-[22px] font-bold leading-none">{{ summary.peak }}</span>
            <span class="text-[11px] opacity-90">{{ currentMetric.unit }}</span>
          </div>
          <div class="mt-1 text-[11px] opacity-90">单日峰值</div>
        </div>
      </div>
    </div>

    <!-- 热力图 -->
    <div class="mb-3.5 rounded-[20px] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-bold text-[var(--text-primary)]">{{ currentMetric.label }}热力</span>
        <span class="text-[11px] text-[var(--text-tertiary)]">颜色越深{{ currentMetric.label }}越多</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div v-for="wd in ['一', '二', '三', '四', '五', '六', '日']" :key="wd" class="py-0.5 text-center text-[10px] text-[var(--text-tertiary)]">{{ wd }}</div>
        <div
          v-for="cell in calendarCells"
          :key="cell.key"
          class="relative flex aspect-square items-center justify-center rounded-md text-[10px]"
          :class="[
            cell.day === null ? 'bg-transparent text-[var(--text-disabled)]' : heatClass(cell.level),
            cell.isToday ? 'outline outline-[1.5px] outline-[var(--brand-primary)]' : ''
          ]">
          <span v-if="cell.day !== null">{{ cell.day }}</span>
          <span v-if="cell.day !== null && cell.value" class="absolute right-1 bottom-0.5 text-[8px] text-[var(--text-tertiary)]">
            {{ metric === 'sleep' ? (cell.value / 60).toFixed(1) : cell.value }}
          </span>
        </div>
      </div>
      <div class="mt-2 flex flex-wrap gap-3 border-t border-dashed border-[var(--border-light)] pt-2.5 text-[11px] text-[var(--text-secondary)]">
        <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#ffe9ce]"></i>低</span>
        <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#ffcf95]"></i>中低</span>
        <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#ffa966]"></i>中高</span>
        <span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[var(--brand-primary)]"></i>高</span>
      </div>
    </div>

    <!-- 30 日趋势线 -->
    <div class="mb-3.5 rounded-[20px] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-bold text-[var(--text-primary)]">近 30 天趋势</span>
        <span class="text-[11px] text-[var(--text-tertiary)]">7 日移动平均</span>
      </div>
      <div ref="chartRef" class="h-[220px] w-full"></div>
    </div>

    <!-- 导出/分享 -->
    <div class="mb-4 flex gap-2.5">
      <button
        class="press flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[var(--brand-primary)] py-3 text-[13px] font-semibold text-white shadow-[var(--card-shadow)]"
        :class="{ 'pointer-events-none opacity-50': babyStore.isReadOnly }"
        @click="onExportCsv">
        <Download :size="15" />
        导出 CSV
      </button>
      <button
        class="press flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[var(--surface-card)] py-3 text-[13px] font-semibold text-[var(--text-primary)] shadow-[var(--card-shadow)]"
        :class="{ 'pointer-events-none opacity-50': babyStore.isReadOnly }"
        @click="showToast('分享长图敬请期待')">
        <Share2 :size="15" />
        分享长图
      </button>
    </div>
  </div>
</template>
