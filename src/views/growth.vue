<template>
  <div class="growth-page min-h-screen bg-[var(--bg-color)]">
    <!-- 导航栏 -->
    <div
      class="sticky top-0 z-10 flex items-center justify-between bg-[var(--surface-header)] px-4 py-3 shadow-[0_1px_0_var(--border-light)] backdrop-blur">
      <button @click="goBack" class="press flex h-9 w-9 items-center justify-center rounded-full">
        <ArrowLeft class="w-6 h-6 text-[var(--text-primary)]" />
      </button>
      <h1 class="text-lg font-bold text-[var(--text-primary)]">成长记录</h1>
      <button @click="showForm = true" class="press flex h-9 w-9 items-center justify-center rounded-full">
        <Plus class="w-6 h-6 text-[var(--text-primary)]" />
      </button>
    </div>

    <div class="px-4 pb-2 pt-4">
      <!-- 最新指标卡片 -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="growth-summary-card">
          <div class="flex justify-center mb-2">
            <div class="growth-summary-icon bg-[var(--growth-bg)]">
              <Scale class="w-4 h-4 text-[var(--growth-color)]" />
            </div>
          </div>
          <div class="mb-1 text-xs font-medium text-[var(--text-secondary)]">体重</div>
          <div
            v-if="growthStore.latest?.latestWeight"
            class="text-[19px] font-bold leading-tight text-[var(--growth-color)]">
            {{ growthStore.latest.latestWeight.value.toFixed(2) }}
            <span class="text-xs font-normal">kg</span>
          </div>
          <div v-else class="text-[19px] font-bold leading-tight text-[var(--text-disabled)]">-</div>
        </div>

        <div class="growth-summary-card">
          <div class="flex justify-center mb-2">
            <div class="growth-summary-icon bg-[var(--height-bg)]">
              <Ruler class="w-4 h-4 text-[var(--height-color)]" />
            </div>
          </div>
          <div class="mb-1 text-xs font-medium text-[var(--text-secondary)]">身高</div>
          <div
            v-if="growthStore.latest?.latestHeight"
            class="text-[19px] font-bold leading-tight text-[var(--height-color)]">
            {{ growthStore.latest.latestHeight.value.toFixed(1) }}
            <span class="text-xs font-normal">cm</span>
          </div>
          <div v-else class="text-[19px] font-bold leading-tight text-[var(--text-disabled)]">-</div>
        </div>

        <div class="growth-summary-card">
          <div class="flex justify-center mb-2">
            <div class="growth-summary-icon bg-[var(--head-bg)]">
              <Circle class="w-4 h-4 text-[var(--head-color)]" />
            </div>
          </div>
          <div class="mb-1 text-xs font-medium text-[var(--text-secondary)]">头围</div>
          <div
            v-if="growthStore.latest?.latestHead"
            class="text-[19px] font-bold leading-tight text-[var(--head-color)]">
            {{ growthStore.latest.latestHead.value.toFixed(1) }}
            <span class="text-xs font-normal">cm</span>
          </div>
          <div v-else class="text-[19px] font-bold leading-tight text-[var(--text-disabled)]">-</div>
        </div>
      </div>

      <!-- 指标切换 Tab -->
      <div class="growth-tab-shell">
        <button
          v-for="tab in metricTabs"
          :key="tab.key"
          @click="currentMetric = tab.key"
          class="press growth-tab-item"
          :class="currentMetric === tab.key ? 'is-active' : ''"
          :style="getMetricTabStyle(tab.key)">
          {{ tab.label }}
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="chartData.babyPoints.length === 0" class="growth-empty-card">
        <div class="growth-empty-icon" :class="metricIconBgClass">
          <Activity class="w-8 h-8" :class="metricIconTextClass" />
        </div>
        <div class="text-sm font-medium text-[var(--text-primary)]">还没有{{ metricLabel }}记录</div>
        <div class="mt-1 text-xs text-[var(--text-tertiary)]">点击右上角 + 开始记录吧</div>
      </div>

      <!-- 图表区域 -->
      <div v-else class="mb-4 rounded-[20px] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-bold text-[var(--text-primary)]">{{ metricLabel }}趋势</span>
          <span
            class="rounded-full bg-[var(--brand-light)] px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)]">
            WHO参考
          </span>
        </div>
        <div ref="chartRef" class="h-[280px]"></div>
      </div>

      <!-- 发育评估条 -->
      <div v-if="assessment" class="mb-4 rounded-xl p-3 flex items-center gap-2" :class="assessmentStatusClass">
        <div
          v-if="assessment.status === 'normal'"
          class="w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <Check class="w-3 h-3 text-green-700" />
        </div>
        <div v-else class="w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <AlertTriangle class="w-3 h-3 text-orange-700" />
        </div>
        <span class="text-sm font-medium">
          {{ assessment.status === 'normal' ? '发育正常' : '需要关注' }} · {{ metricLabel }}处于
          {{ assessment.percentile }} 百分位
        </span>
        <span v-if="assessment.status !== 'normal'" class="text-xs opacity-80">，建议咨询医生</span>
      </div>

      <!-- 测量记录列表 -->
      <div
        v-if="growthStore.records.length > 0"
        class="mb-4 overflow-hidden rounded-[20px] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-light)]">
          <h2 class="font-bold text-[var(--text-primary)]">历史记录</h2>
          <span class="text-xs text-[var(--text-tertiary)]">{{ growthStore.records.length }} 条</span>
        </div>
        <div>
          <van-swipe-cell v-for="record in growthStore.records" :key="record.id">
            <div class="flex items-center px-4 py-3 border-b border-[var(--border-light)]">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-[var(--text-primary)]">{{ formatDate(record.measuredAt) }}</span>
                  <span v-if="babyStore.baby?.birthday" class="text-xs text-[var(--text-tertiary)]">
                    {{ getAgeText(record.measuredAt) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 text-sm">
                  <span
                    v-if="record.weight"
                    class="px-2 py-0.5 rounded-full text-xs bg-[var(--growth-bg)] text-[var(--growth-color)]">
                    体重 {{ record.weight.toFixed(2) }}kg
                  </span>
                  <span
                    v-if="record.height"
                    class="px-2 py-0.5 rounded-full text-xs bg-[var(--height-bg)] text-[var(--height-color)]">
                    身高 {{ record.height.toFixed(1) }}cm
                  </span>
                  <span
                    v-if="record.headCircumference"
                    class="px-2 py-0.5 rounded-full text-xs bg-[var(--head-bg)] text-[var(--head-color)]">
                    头围 {{ record.headCircumference.toFixed(1) }}cm
                  </span>
                  <span v-if="record.note" class="text-[var(--text-tertiary)] text-xs">
                    {{ record.note }}
                  </span>
                </div>
              </div>
              <button @click="editRecord(record)" class="press p-2 text-[var(--text-tertiary)]">
                <Edit class="w-4 h-4" />
              </button>
            </div>
            <template #right>
              <button @click="deleteRecord(record)" class="swipe-btn swipe-btn-danger">删除</button>
            </template>
          </van-swipe-cell>
        </div>
      </div>

      <!-- 测量小贴士 -->
      <div class="growth-tip-card">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-card)]/75">
            <Info class="w-4 h-4 text-[var(--growth-color)]" />
          </div>
          <span class="text-sm font-bold text-[var(--growth-color)]">测量小贴士</span>
        </div>
        <ul class="space-y-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          <li>建议在宝宝安静、空腹时测量体重</li>
          <li>身高测量时让宝宝平躺，腿伸直</li>
          <li>头围测量绕眉骨上方最宽处一周</li>
          <li>记录频率：0-6个月每月一次，6-12个月每2个月一次</li>
        </ul>
      </div>
    </div>

    <!-- 录入/编辑表单弹窗 -->
    <van-popup v-model:show="showForm" position="bottom" :style="{ height: 'auto' }" round @close="resetForm">
      <div class="px-4 pb-5 pt-5">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-bold text-[var(--text-primary)]">{{ editingRecord ? '编辑记录' : '添加记录' }}</h3>
          <button @click="showForm = false" class="press p-1">
            <X class="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <!-- 测量日期 -->
        <div class="mb-4">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">测量日期</label>
          <button
            class="press theme-field-box flex h-12 w-full items-center justify-between px-4 text-left focus:outline-none"
            @click="openDatePicker">
            <span class="text-[15px] font-medium text-[var(--text-primary)]">选择日期</span>
            <span class="flex items-center gap-2 text-[15px] text-[var(--text-tertiary)]">
              {{ formData.measuredAt }}
              <Calendar class="h-4 w-4 text-[var(--brand-primary)]" />
            </span>
          </button>
        </div>

        <!-- 体重 -->
        <div class="mb-4">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">体重 (kg)</label>
          <div class="theme-field-box flex h-12 items-center px-4">
            <input
              :value="normalizeNumberInput(formData.weight)"
              @input="formData.weight = normalizeNumberValue(($event.target as HTMLInputElement).value)"
              type="number"
              inputmode="decimal"
              placeholder="选填，例如 6.5"
              class="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]" />
            <span class="ml-3 text-[13px] font-medium text-[var(--text-tertiary)]">kg</span>
          </div>
        </div>

        <!-- 身高 -->
        <div class="mb-4">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">身高 (cm)</label>
          <div class="theme-field-box flex h-12 items-center px-4">
            <input
              :value="normalizeNumberInput(formData.height)"
              @input="formData.height = normalizeNumberValue(($event.target as HTMLInputElement).value)"
              type="number"
              inputmode="decimal"
              placeholder="选填，例如 65.5"
              class="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]" />
            <span class="ml-3 text-[13px] font-medium text-[var(--text-tertiary)]">cm</span>
          </div>
        </div>

        <!-- 头围 -->
        <div class="mb-4">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">头围 (cm)</label>
          <div class="theme-field-box flex h-12 items-center px-4">
            <input
              :value="normalizeNumberInput(formData.headCircumference)"
              @input="updateNumberField('headCircumference', $event)"
              type="number"
              inputmode="decimal"
              placeholder="选填，例如 42.0"
              class="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]" />
            <span class="ml-3 text-[13px] font-medium text-[var(--text-tertiary)]">cm</span>
          </div>
        </div>

        <!-- 备注 -->
        <div class="mb-6">
          <label class="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">备注</label>
          <div class="theme-field-box px-4 py-3">
            <textarea
              v-model="formData.note"
              maxlength="200"
              rows="2"
              placeholder="选填"
              class="block min-h-[48px] w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]" />
            <div class="mt-1 text-right text-xs text-[var(--text-tertiary)]">{{ formData.note.length }}/200</div>
          </div>
        </div>

        <button @click="submitForm" :disabled="!hasAnyValue || isSubmitting" class="btn-primary press w-full">
          {{ isSubmitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </van-popup>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="datePickerValue"
        title="选择测量日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false" />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import {
  ArrowLeft,
  Plus,
  Scale,
  Ruler,
  Circle,
  Activity,
  Check,
  AlertTriangle,
  Edit,
  X,
  Info,
  Calendar
} from 'lucide-vue-next';
import { useGrowthStore, type MetricType, type GrowthRecord as GrowthRecordType } from '@/stores/growth';
import { useBabyStore } from '@/stores/baby';
import { showToast, showConfirmDialog } from 'vant';

const router = useRouter();
const growthStore = useGrowthStore();
const babyStore = useBabyStore();

const currentMetric = ref<MetricType>('weight');
const showForm = ref(false);
const showDatePicker = ref(false);
const isSubmitting = ref(false);
const editingRecord = ref<GrowthRecordType | null>(null);

const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;

const datePickerValue = ref<[string, string, string]>(toPickerValue(new Date()));
const minDate = new Date(2020, 0, 1);
const maxDate = new Date();

/** Vant 日期选择器使用字符串数组作为选中值。 */
function toPickerValue(date: Date): [string, string, string] {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ];
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const formData = ref({
  measuredAt: formatDateValue(new Date()),
  weight: null as number | null,
  height: null as number | null,
  headCircumference: null as number | null,
  note: ''
});

const metricTabs = [
  { key: 'weight' as const, label: '体重' },
  { key: 'height' as const, label: '身高' },
  { key: 'head' as const, label: '头围' }
];

const metricLabel = computed(() => metricTabs.find((t) => t.key === currentMetric.value)?.label || '');

function getMetricTabStyle(metric: MetricType) {
  const color = getMetricColor(metric);
  const isActive = currentMetric.value === metric;
  const shadowColor =
    metric === 'weight'
      ? 'rgba(46,125,50,0.22)'
      : metric === 'height'
        ? 'rgba(21,101,192,0.22)'
        : 'rgba(123,31,162,0.22)';

  return {
    '--growth-tab-color': color,
    '--growth-tab-shadow': shadowColor,
    backgroundColor: isActive ? color : 'transparent',
    color: isActive ? '#fff' : 'var(--text-primary)',
    boxShadow: isActive ? `0 6px 14px ${shadowColor}` : 'none'
  };
}

const metricIconBgClass = computed(() => {
  switch (currentMetric.value) {
    case 'weight':
      return 'bg-[var(--growth-bg)]';
    case 'height':
      return 'bg-[var(--height-bg)]';
    case 'head':
      return 'bg-[var(--head-bg)]';
  }
});

const metricIconTextClass = computed(() => {
  switch (currentMetric.value) {
    case 'weight':
      return 'text-[var(--growth-color)]';
    case 'height':
      return 'text-[var(--height-color)]';
    case 'head':
      return 'text-[var(--head-color)]';
  }
});

const hasAnyValue = computed(() => {
  return formData.value.weight !== null || formData.value.height !== null || formData.value.headCircumference !== null;
});

const chartData = computed(() => {
  return growthStore.buildChartData(currentMetric.value, babyStore.baby?.birthday, babyStore.baby?.gender);
});

const assessment = computed(() => {
  return growthStore.assessLatest(currentMetric.value, babyStore.baby?.birthday, babyStore.baby?.gender);
});

const assessmentStatusClass = computed(() => {
  if (!assessment.value) return 'bg-green-100 text-green-800';
  return assessment.value.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
});

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr: string): string {
  const date = parseDateValue(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getAgeText(measuredAt: string): string {
  if (!babyStore.baby?.birthday) return '';
  const days = growthStore.calculateAgeInMonths(babyStore.baby.birthday, measuredAt);
  if (days === 0) return '出生时';
  if (days < 12) return `${days}个月`;
  const years = Math.floor(days / 12);
  const months = days % 12;
  if (months === 0) return `${years}岁`;
  return `${years}岁${months}个月`;
}

function goBack() {
  router.back();
}

function resetForm() {
  const today = new Date();
  formData.value = {
    measuredAt: formatDateValue(today),
    weight: null,
    height: null,
    headCircumference: null,
    note: ''
  };
  datePickerValue.value = toPickerValue(today);
  editingRecord.value = null;
  isSubmitting.value = false;
}

function editRecord(record: GrowthRecordType) {
  editingRecord.value = record;
  formData.value = {
    measuredAt: record.measuredAt,
    weight: record.weight ?? null,
    height: record.height ?? null,
    headCircumference: record.headCircumference ?? null,
    note: record.note ?? ''
  };
  datePickerValue.value = toPickerValue(parseDateValue(record.measuredAt));
  showForm.value = true;
}

async function deleteRecord(record: GrowthRecordType) {
  try {
    await showConfirmDialog({
      title: '删除记录',
      message: '确定要删除这条成长记录吗？'
    });
    if (!babyStore.currentBabyId) return;
    const success = await growthStore.deleteRecord(record.id, babyStore.currentBabyId);
    if (success) {
      showToast('删除成功');
    }
  } catch {
    // 取消删除
  }
}

function normalizeNumberInput(value: number | null): string | undefined {
  return value === null ? undefined : String(value);
}

function normalizeNumberValue(value: string | number | undefined): number | null {
  if (value === '' || value === undefined) return null;
  return Number(value);
}

function updateNumberField(field: 'weight' | 'height' | 'headCircumference', event: Event) {
  formData.value[field] = normalizeNumberValue((event.target as HTMLInputElement).value);
}

function openDatePicker() {
  datePickerValue.value = toPickerValue(parseDateValue(formData.value.measuredAt));
  showDatePicker.value = true;
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  const [year, month, day] = selectedValues;
  const selectedDate = parseDateValue(`${year}-${month}-${day}`);
  formData.value.measuredAt = formatDateValue(selectedDate);
  datePickerValue.value = toPickerValue(selectedDate);
  showDatePicker.value = false;
}

async function submitForm() {
  if (!hasAnyValue.value || isSubmitting.value) return;
  if (!babyStore.currentBabyId) return;

  isSubmitting.value = true;

  try {
    if (editingRecord.value) {
      // 编辑模式
      const success = await growthStore.updateRecord(
        editingRecord.value.clientId,
        {
          measuredAt: formData.value.measuredAt,
          weight: formData.value.weight,
          height: formData.value.height,
          headCircumference: formData.value.headCircumference,
          note: formData.value.note || null
        },
        babyStore.currentBabyId
      );
      if (success) {
        showToast('更新成功');
        showForm.value = false;
      }
    } else {
      // 新建模式
      const success = await growthStore.addRecord({
        babyId: babyStore.currentBabyId,
        measuredAt: formData.value.measuredAt,
        weight: formData.value.weight,
        height: formData.value.height,
        headCircumference: formData.value.headCircumference,
        note: formData.value.note || null
      });
      if (success) {
        showToast('保存成功');
        showForm.value = false;
      }
    }
  } catch {
    showToast('保存失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
}

function getMetricColor(metric: MetricType): string {
  switch (metric) {
    case 'weight':
      return '#2e7d32';
    case 'height':
      return '#1565c0';
    case 'head':
      return '#7b1fa2';
  }
}

function getMetricUnit(metric: MetricType): string {
  switch (metric) {
    case 'weight':
      return 'kg';
    case 'height':
      return 'cm';
    case 'head':
      return 'cm';
  }
}

function initChart() {
  if (!chartRef.value) return;

  chartInstance = echarts.init(chartRef.value);
  updateChart();

  window.addEventListener('resize', () => {
    chartInstance?.resize();
  });
}

function updateChart() {
  if (!chartInstance) return;

  const color = getMetricColor(currentMetric.value);
  const unit = getMetricUnit(currentMetric.value);

  // 百分位颜色
  const percentileColors = {
    p3: '#c8e6c9',
    p15: '#a5d6a7',
    p50: '#81c784',
    p85: '#a5d6a7',
    p97: '#c8e6c9'
  };

  // 构建 WHO 参考线数据
  const whoLines = [
    { key: 'p97', label: 'P97', data: chartData.value.whoStandards.map((d) => [d.month, d.p97]) },
    { key: 'p85', label: 'P85', data: chartData.value.whoStandards.map((d) => [d.month, d.p85]) },
    { key: 'p50', label: 'P50', data: chartData.value.whoStandards.map((d) => [d.month, d.p50]) },
    { key: 'p15', label: 'P15', data: chartData.value.whoStandards.map((d) => [d.month, d.p15]) },
    { key: 'p3', label: 'P3', data: chartData.value.whoStandards.map((d) => [d.month, d.p3]) }
  ];

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const point = params.find((p: any) => p.seriesName === '宝宝');
        if (point) {
          return `${point.data[0]}个月<br/>${metricLabel}: ${point.data[1].toFixed(2)} ${unit}<br/>${point.data[2]}`;
        }
        return '';
      }
    },
    grid: {
      left: 40,
      right: 20,
      top: 40,
      bottom: 40
    },
    legend: {
      top: 0,
      data: ['宝宝', 'P97', 'P85', 'P50', 'P15', 'P3'],
      textStyle: { fontSize: 11 }
    },
    xAxis: {
      type: 'value',
      name: '月龄',
      nameTextStyle: { fontSize: 11, color: '#999' },
      min: 0,
      max: chartData.value.maxMonth,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { fontSize: 11, color: '#999' },
      axisLabel: { fontSize: 11 }
    },
    series: [
      // P97
      {
        name: 'P97',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: percentileColors.p97, type: 'dashed', width: 1 },
        data: whoLines.find((l) => l.key === 'p97')?.data
      },
      // P85
      {
        name: 'P85',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: percentileColors.p85, type: 'dashed', width: 1 },
        data: whoLines.find((l) => l.key === 'p85')?.data
      },
      // P50
      {
        name: 'P50',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: percentileColors.p50, width: 1.5 },
        data: whoLines.find((l) => l.key === 'p50')?.data
      },
      // P15
      {
        name: 'P15',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: percentileColors.p15, type: 'dashed', width: 1 },
        data: whoLines.find((l) => l.key === 'p15')?.data
      },
      // P3
      {
        name: 'P3',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: percentileColors.p3, type: 'dashed', width: 1 },
        data: whoLines.find((l) => l.key === 'p3')?.data
      },
      // 宝宝数据
      {
        name: '宝宝',
        type: 'line',
        smooth: chartData.value.babyPoints.length >= 2,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color, width: 2 },
        itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
        data: chartData.value.babyPoints.map((p) => [p.month, p.value, p.measuredAt])
      }
    ]
  };

  chartInstance.setOption(option, true);
}

onMounted(async () => {
  if (!babyStore.currentBabyId && babyStore.baby?.id) {
    babyStore.currentBabyId = babyStore.baby.id;
  }
  if (babyStore.currentBabyId) {
    await Promise.all([
      growthStore.loadRecords(babyStore.currentBabyId),
      growthStore.loadLatest(babyStore.currentBabyId)
    ]);
    await growthStore.syncPending();
  }
  await nextTick();
  initChart();
});

watch(currentMetric, () => {
  updateChart();
});

watch(
  () => [growthStore.records.length, growthStore.latest?.totalRecords],
  () => {
    nextTick(() => {
      updateChart();
    });
  }
);
</script>
