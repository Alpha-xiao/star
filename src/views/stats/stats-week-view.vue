<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { showToast } from 'vant';
import { useRouter } from 'vue-router';
import { Baby, ChevronLeft, ChevronRight, Droplets, Heart, Moon, TrendingDown, TrendingUp, Lightbulb, BarChart3, Share2, Download } from 'lucide-vue-next';
import * as echarts from 'echarts';
import { type DailyStats } from '@/utils/api';
import { useBabyStore } from '@/stores/baby';
import { useTrendStore, getWeekRange } from '@/stores/trend';
import { downloadDailyStatsCsv, trackEvent } from '@/utils/trend-utils';

/**
 * 周视图：主推「周报摘要 + KPI 磁贴 + 单指标图表 + 洞察卡」的趋势视角。
 */
const babyStore = useBabyStore();
const trendStore = useTrendStore();
const router = useRouter();

/** 当前周的锚点日期（东八区），周内任意一天均可代表该周。 */
const anchor = ref<Date>(new Date());

/** 本周聚合数据 */
const currentDays = ref<DailyStats[]>([]);
/** 上周聚合数据，用于同期对比 */
const previousDays = ref<DailyStats[]>([]);
const isLoading = ref(false);

const milkChartRef = ref<HTMLElement>();
const poopChartRef = ref<HTMLElement>();
let milkChart: echarts.ECharts | null = null;
let poopChart: echarts.ECharts | null = null;

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

/** 本周日期范围 */
const currentRange = computed(() => getWeekRange(anchor.value));

/** 是否为本周（当前周不允许再前进） */
const isCurrentWeek = computed(() => {
  const today = getWeekRange(new Date());
  return today.from === currentRange.value.from;
});

/** 本周区间显示文案 */
const rangeText = computed(() => {
  const { start, end } = currentRange.value;
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
});

/** 副标题：ISO 周数 */
const secondaryText = computed(() => {
  const { start } = currentRange.value;
  return `${start.getFullYear()} · 第 ${getIsoWeek(start)} 周${isCurrentWeek.value ? ' · 本周' : ''}`;
});

/** 计算 ISO 周数 */
function getIsoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** 有效记录天数（至少有一类记录的天数），用于空状态判断 */
const validDayCount = computed(() => {
  return currentDays.value.filter(
    (day) =>
      day.formulaAmount > 0 ||
      day.breastDuration > 0 ||
      day.sleepDuration > 0 ||
      day.peeCount > 0 ||
      day.poopCount > 0
  ).length;
});

/** 数据是否不足（少于 3 天） */
const isDataInsufficient = computed(() => validDayCount.value < 3);

/** 求和辅助 */
const sum = (list: DailyStats[], key: keyof DailyStats) =>
  list.reduce((total, day) => total + Number(day[key] || 0), 0);

/** 计算环比百分比 */
const compareRatio = (current: number, previous: number) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

/** 周报摘要数据 */
const summary = computed(() => {
  const totalMilk = sum(currentDays.value, 'formulaAmount');
  const totalSleep = sum(currentDays.value, 'sleepDuration');
  const totalPoo = sum(currentDays.value, 'poopCount') + sum(currentDays.value, 'peeCount');
  const prevMilk = sum(previousDays.value, 'formulaAmount');
  const prevSleep = sum(previousDays.value, 'sleepDuration');
  const prevPoo = sum(previousDays.value, 'poopCount') + sum(previousDays.value, 'peeCount');
  return {
    totalMilk,
    totalSleep,
    totalPoo,
    milkRatio: compareRatio(totalMilk, prevMilk),
    sleepRatio: compareRatio(totalSleep, prevSleep),
    pooRatio: compareRatio(totalPoo, prevPoo)
  };
});

/** KPI 磁贴 */
const kpiTiles = computed(() => {
  const days = currentDays.value.length || 7;
  const totalMilk = sum(currentDays.value, 'formulaAmount');
  const totalBreast = sum(currentDays.value, 'breastDuration');
  const totalSleepMin = sum(currentDays.value, 'sleepDuration');
  const totalFeed = sum(currentDays.value, 'formulaAmount') > 0 ? currentDays.value.filter((d) => d.formulaAmount > 0).length : 0;

  const prevMilkAvg = previousDays.value.length ? sum(previousDays.value, 'formulaAmount') / previousDays.value.length : 0;
  const prevBreastAvg = previousDays.value.length
    ? sum(previousDays.value, 'breastDuration') / previousDays.value.length
    : 0;
  const prevSleepAvg = previousDays.value.length
    ? sum(previousDays.value, 'sleepDuration') / previousDays.value.length
    : 0;

  const milkAvg = totalMilk / days;
  const breastAvg = totalBreast / days;
  const sleepAvg = totalSleepMin / days;

  return {
    milkAvg,
    milkDiff: milkAvg - prevMilkAvg,
    breastAvg,
    breastDiff: breastAvg - prevBreastAvg,
    sleepAvg,
    sleepDiff: sleepAvg - prevSleepAvg,
    feedAvgCount: totalFeed
  };
});

/** 洞察卡：根据本周数据规则匹配文案 */
const insights = computed(() => {
  const tips: string[] = [];
  if (summary.value.milkRatio !== null) {
    if (summary.value.milkRatio > 0) tips.push('奶量平稳上升，符合月龄参考区间');
    else if (summary.value.milkRatio < -10) tips.push('本周奶量较上周下降，建议关注宝宝进食状态');
    else tips.push('奶量保持稳定，作息接近规律');
  }
  const totalSleepH = summary.value.totalSleep / 60;
  if (totalSleepH > 0) {
    if (totalSleepH < 90) tips.push(`本周总睡眠 ${totalSleepH.toFixed(1)}h，可以适当增加白天小睡`);
    else tips.push(`本周总睡眠 ${totalSleepH.toFixed(1)}h，睡眠时长充足`);
  }
  const totalPoop = sum(currentDays.value, 'poopCount');
  if (totalPoop > 0) tips.push(`本周拉屎 ${totalPoop} 次，肠道活动情况良好`);
  return tips.slice(0, 3);
});

/** 加载本周与上周数据 */
const loadData = async () => {
  const babyId = babyStore.currentBabyId;
  if (!babyId) return;

  isLoading.value = true;
  try {
    const week = await trendStore.loadWeek(babyId, anchor.value);
    const prevAnchor = new Date(week.days[0]?.date || anchor.value);
    prevAnchor.setDate(prevAnchor.getDate() - 7);
    const prevWeek = await trendStore.loadWeek(babyId, prevAnchor);
    currentDays.value = week.days;
    previousDays.value = prevWeek.days;
    await nextTick();
    renderCharts();
  } catch (error) {
    console.error('Load weekly stats failed:', error);
    showToast({ message: '周趋势加载失败', type: 'fail' });
  } finally {
    isLoading.value = false;
  }
};

/** 上/下一周 */
const prevWeek = () => {
  const next = new Date(anchor.value);
  next.setDate(next.getDate() - 7);
  anchor.value = next;
  trackEvent('trend_range_change', { direction: 'prev', view: 'week' });
};

const nextWeek = () => {
  if (isCurrentWeek.value) return;
  const next = new Date(anchor.value);
  next.setDate(next.getDate() + 7);
  anchor.value = next;
  trackEvent('trend_range_change', { direction: 'next', view: 'week' });
};

const goToday = () => {
  anchor.value = new Date();
  trackEvent('trend_range_change', { direction: 'today', view: 'week' });
};

/** 图表基础配置 */
const baseGrid = { left: 8, right: 12, top: 24, bottom: 24, containLabel: true };
const baseAxis = {
  axisLine: { lineStyle: { color: '#EEE' } },
  axisTick: { show: false },
  axisLabel: { color: '#999', fontSize: 10 },
  splitLine: { lineStyle: { color: '#F5F0EA', type: 'dashed' as const } }
};

/** 绘制奶量折线与排泄堆叠柱 */
const renderCharts = () => {
  if (milkChartRef.value) {
    if (!milkChart) milkChart = echarts.init(milkChartRef.value);
    const milkData = currentDays.value.map((d) => d.formulaAmount || 0);
    const breastData = currentDays.value.map((d) => d.breastDuration || 0);
    const prevMilk = previousDays.value.map((d) => d.formulaAmount || 0);
    milkChart.setOption({
      grid: baseGrid,
      tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#F0E7DA', textStyle: { color: '#333' } },
      xAxis: { type: 'category', data: weekdays, ...baseAxis },
      yAxis: { type: 'value', name: 'ml / min', nameTextStyle: { color: '#999', fontSize: 10 }, ...baseAxis },
      series: [
        {
          name: '奶粉',
          type: 'line',
          smooth: true,
          data: milkData,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#E65100' },
          lineStyle: { color: '#E65100', width: 2.4 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(230,81,0,0.25)' },
              { offset: 1, color: 'rgba(230,81,0,0)' }
            ])
          }
        },
        {
          name: '母乳',
          type: 'line',
          smooth: true,
          data: breastData,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: '#C62828' },
          lineStyle: { color: '#C62828', width: 2 }
        },
        {
          name: '上周奶粉',
          type: 'line',
          smooth: true,
          data: prevMilk,
          symbol: 'none',
          lineStyle: { color: '#999999', width: 1.4, type: 'dashed', opacity: 0.6 }
        }
      ]
    });
    milkChart.resize();
  }

  if (poopChartRef.value) {
    if (!poopChart) poopChart = echarts.init(poopChartRef.value);
    poopChart.setOption({
      grid: baseGrid,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: weekdays, ...baseAxis },
      yAxis: { type: 'value', name: '次', nameTextStyle: { color: '#999', fontSize: 10 }, ...baseAxis },
      series: [
        {
          name: '拉尿',
          type: 'bar',
          stack: 'p',
          barWidth: 14,
          data: currentDays.value.map((d) => d.peeCount || 0),
          itemStyle: { color: '#1565C0', borderRadius: [0, 0, 4, 4] }
        },
        {
          name: '拉屎',
          type: 'bar',
          stack: 'p',
          barWidth: 14,
          data: currentDays.value.map((d) => d.poopCount || 0),
          itemStyle: { color: '#5D4037', borderRadius: [4, 4, 0, 0] }
        }
      ]
    });
    poopChart.resize();
  }
};

const handleResize = () => {
  milkChart?.resize();
  poopChart?.resize();
};

/** 导出 CSV */
const onExportCsv = () => {
  if (babyStore.isReadOnly) {
    showToast({ message: '只读成员暂无导出权限', type: 'fail' });
    return;
  }
  trackEvent('trend_export_click', { view: 'week' });
  const { from, to } = currentRange.value;
  downloadDailyStatsCsv(currentDays.value, `weekly-stats-${from}-${to}`);
};

const goRecord = () => {
  trackEvent('trend_empty_cta_click', { view: 'week' });
  router.push('/');
};

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
  milkChart?.dispose();
  poopChart?.dispose();
  window.removeEventListener('resize', handleResize);
});

/** 格式化时长为 xh xxmin */
const formatHour = (minutes: number) => (minutes / 60).toFixed(1);
</script>

<template>
  <div class="flex flex-1 min-h-0 flex-col overflow-y-auto px-5 pb-6">
    <!-- 日期导航 -->
    <div class="mb-4 flex items-center justify-between">
      <button class="btn-day-nav press" @click="prevWeek">
        <ChevronLeft :size="14" color="var(--text-secondary)" />
      </button>
      <div class="flex flex-col items-center">
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">{{ rangeText }}</span>
        <span class="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{{ secondaryText }}</span>
      </div>
      <button
        class="btn-day-nav press"
        :disabled="isCurrentWeek"
        :class="{ 'opacity-30 pointer-events-none': isCurrentWeek }"
        @click="nextWeek">
        <ChevronRight :size="14" color="var(--text-secondary)" />
      </button>
    </div>

    <!-- 空状态 -->
    <template v-if="isDataInsufficient && !isLoading">
      <div class="mt-6 rounded-[20px] bg-[var(--surface-card)] p-8 text-center shadow-[var(--card-shadow)]">
        <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
          <BarChart3 :size="32" color="var(--brand-primary)" />
        </div>
        <div class="text-[15px] font-semibold text-[var(--text-primary)]">本周还没有足够数据</div>
        <div class="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          趋势图表需要连续记录 3 天以上
          <br />
          坚持记录，就能看到宝宝的成长节奏
        </div>
        <button class="mt-4 rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(230,81,0,0.28)] press" @click="goRecord">
          去记录一条
        </button>
      </div>
      <div class="mt-4 rounded-[18px] border border-[#ffd7a8] bg-gradient-to-br from-[#fff3e0] to-[#ffefd5] p-3.5 flex gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-primary)] text-white">
          <Lightbulb :size="16" />
        </div>
        <div class="flex-1">
          <div class="text-[13px] font-bold text-[var(--brand-primary)]">数据小贴士</div>
          <ul class="mt-1 space-y-1 pl-4 list-disc text-xs text-[var(--text-secondary)]">
            <li>每天记录 1 次奶量，即可生成日均趋势</li>
            <li>连续 3 天有睡眠记录，即可看清醒窗口</li>
            <li>周报会自动计算与上周的对比</li>
          </ul>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- 周报摘要卡 -->
      <div class="mb-3.5 rounded-[20px] bg-gradient-to-br from-[#FFAB40] to-[var(--brand-primary)] p-4 text-white shadow-[var(--card-shadow)]">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs opacity-90">本周摘要</span>
          <span class="text-[13px] font-semibold">{{ rangeText }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <div class="flex items-baseline gap-1">
              <span class="text-[22px] font-bold leading-none">{{ summary.totalMilk }}</span>
              <span class="text-[11px] opacity-90">ml</span>
            </div>
            <div class="mt-1 text-[11px] opacity-90">总奶量</div>
            <span v-if="summary.milkRatio !== null" class="mt-1 inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold" :class="summary.milkRatio >= 0 ? 'bg-white/20' : 'bg-white/15'">
              <TrendingUp v-if="summary.milkRatio >= 0" :size="10" />
              <TrendingDown v-else :size="10" />
              {{ summary.milkRatio >= 0 ? '+' : '' }}{{ summary.milkRatio.toFixed(1) }}%
            </span>
          </div>
          <div>
            <div class="flex items-baseline gap-1">
              <span class="text-[22px] font-bold leading-none">{{ formatHour(summary.totalSleep) }}</span>
              <span class="text-[11px] opacity-90">h</span>
            </div>
            <div class="mt-1 text-[11px] opacity-90">睡眠时长</div>
            <span v-if="summary.sleepRatio !== null" class="mt-1 inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold" :class="summary.sleepRatio >= 0 ? 'bg-white/20' : 'bg-white/15'">
              <TrendingUp v-if="summary.sleepRatio >= 0" :size="10" />
              <TrendingDown v-else :size="10" />
              {{ summary.sleepRatio >= 0 ? '+' : '' }}{{ summary.sleepRatio.toFixed(1) }}%
            </span>
          </div>
          <div>
            <div class="flex items-baseline gap-1">
              <span class="text-[22px] font-bold leading-none">{{ summary.totalPoo }}</span>
              <span class="text-[11px] opacity-90">次</span>
            </div>
            <div class="mt-1 text-[11px] opacity-90">排泄次数</div>
            <span v-if="summary.pooRatio !== null" class="mt-1 inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold" :class="summary.pooRatio >= 0 ? 'bg-white/20' : 'bg-white/15'">
              <TrendingUp v-if="summary.pooRatio >= 0" :size="10" />
              <TrendingDown v-else :size="10" />
              {{ summary.pooRatio >= 0 ? '+' : '' }}{{ summary.pooRatio.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- KPI 磁贴 -->
      <div class="mb-3.5 grid grid-cols-2 gap-2.5">
        <div class="rounded-[18px] bg-[var(--surface-card)] p-3.5 shadow-[var(--card-shadow)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--formula-bg)]">
              <Baby :size="16" color="var(--formula-color)" />
            </span>
            <span class="text-xs font-semibold text-[var(--text-secondary)]">日均奶量</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-[20px] font-bold text-[var(--text-primary)]">{{ Math.round(kpiTiles.milkAvg) }}</span>
            <span class="text-[11px] font-medium text-[var(--text-tertiary)]">ml/日</span>
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            较上周
            <span :class="kpiTiles.milkDiff >= 0 ? 'font-semibold text-[#2E7D32]' : 'font-semibold text-[var(--brand-primary)]'">
              {{ kpiTiles.milkDiff >= 0 ? '↑' : '↓' }} {{ Math.abs(Math.round(kpiTiles.milkDiff)) }} ml
            </span>
          </div>
        </div>

        <div class="rounded-[18px] bg-[var(--surface-card)] p-3.5 shadow-[var(--card-shadow)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--breast-bg)]">
              <Heart :size="16" color="var(--breast-color)" />
            </span>
            <span class="text-xs font-semibold text-[var(--text-secondary)]">母乳时长</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-[20px] font-bold text-[var(--text-primary)]">{{ Math.round(kpiTiles.breastAvg) }}</span>
            <span class="text-[11px] font-medium text-[var(--text-tertiary)]">min/日</span>
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            较上周
            <span :class="kpiTiles.breastDiff >= 0 ? 'font-semibold text-[#2E7D32]' : 'font-semibold text-[var(--brand-primary)]'">
              {{ kpiTiles.breastDiff >= 0 ? '↑' : '↓' }} {{ Math.abs(Math.round(kpiTiles.breastDiff)) }} min
            </span>
          </div>
        </div>

        <div class="rounded-[18px] bg-[var(--surface-card)] p-3.5 shadow-[var(--card-shadow)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--sleep-bg)]">
              <Moon :size="16" color="var(--sleep-color)" />
            </span>
            <span class="text-xs font-semibold text-[var(--text-secondary)]">日均睡眠</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-[20px] font-bold text-[var(--text-primary)]">{{ formatHour(kpiTiles.sleepAvg) }}</span>
            <span class="text-[11px] font-medium text-[var(--text-tertiary)]">h/日</span>
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            较上周
            <span :class="kpiTiles.sleepDiff >= 0 ? 'font-semibold text-[#2E7D32]' : 'font-semibold text-[var(--brand-primary)]'">
              {{ kpiTiles.sleepDiff >= 0 ? '↑' : '↓' }} {{ formatHour(Math.abs(kpiTiles.sleepDiff)) }} h
            </span>
          </div>
        </div>

        <div class="rounded-[18px] bg-[var(--surface-card)] p-3.5 shadow-[var(--card-shadow)]">
          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--urine-bg)]">
              <Droplets :size="16" color="var(--urine-color)" />
            </span>
            <span class="text-xs font-semibold text-[var(--text-secondary)]">喂养天数</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-[20px] font-bold text-[var(--text-primary)]">{{ kpiTiles.feedAvgCount }}</span>
            <span class="text-[11px] font-medium text-[var(--text-tertiary)]">天</span>
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-tertiary)]">
            本周记录奶粉的天数
          </div>
        </div>
      </div>

      <!-- 奶量折线 -->
      <div class="mb-3.5 rounded-[20px] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-bold text-[var(--text-primary)]">奶量趋势</span>
          <span class="rounded-[10px] bg-[var(--brand-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]">周</span>
        </div>
        <div ref="milkChartRef" class="h-[200px] w-full"></div>
        <div class="mt-2 flex flex-wrap gap-3 border-t border-dashed border-[var(--border-light)] pt-2.5 text-[11px] text-[var(--text-secondary)]">
          <span class="inline-flex items-center gap-1.5">
            <i class="h-2 w-2 rounded-full bg-[var(--formula-color)]"></i>奶粉 ml
          </span>
          <span class="inline-flex items-center gap-1.5">
            <i class="h-2 w-2 rounded-full bg-[var(--breast-color)]"></i>母乳 min
          </span>
          <span class="inline-flex items-center gap-1.5">
            <i class="h-2 w-2 rounded-full bg-[var(--text-tertiary)] opacity-50"></i>上周奶粉
          </span>
        </div>
      </div>

      <!-- 排泄柱状 -->
      <div class="mb-3.5 rounded-[20px] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-bold text-[var(--text-primary)]">排泄次数</span>
          <span class="text-[11px] text-[var(--text-tertiary)]">拉尿 vs 拉屎</span>
        </div>
        <div ref="poopChartRef" class="h-[200px] w-full"></div>
        <div class="mt-2 flex flex-wrap gap-3 border-t border-dashed border-[var(--border-light)] pt-2.5 text-[11px] text-[var(--text-secondary)]">
          <span class="inline-flex items-center gap-1.5">
            <i class="h-2 w-2 rounded-full bg-[var(--urine-color)]"></i>拉尿
          </span>
          <span class="inline-flex items-center gap-1.5">
            <i class="h-2 w-2 rounded-full bg-[var(--stool-color)]"></i>拉屎
          </span>
        </div>
      </div>

      <!-- 洞察卡 -->
      <div v-if="insights.length" class="mb-3.5 rounded-[18px] border border-[#ffd7a8] bg-gradient-to-br from-[#fff3e0] to-[#ffefd5] p-3.5 flex gap-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-primary)] text-white">
          <Lightbulb :size="16" />
        </div>
        <div class="flex-1">
          <div class="text-[13px] font-bold text-[var(--brand-primary)]">本周洞察</div>
          <ul class="mt-1 space-y-1 pl-4 list-disc text-xs leading-relaxed text-[var(--text-secondary)]">
            <li v-for="tip in insights" :key="tip">{{ tip }}</li>
          </ul>
        </div>
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
    </template>
  </div>
</template>
