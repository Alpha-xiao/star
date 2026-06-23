<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showConfirmDialog, showToast } from 'vant';
import { ArrowRight, Baby, ChevronLeft, ChevronRight, CircleDot, Droplets, Heart } from 'lucide-vue-next';
import {
  fetchDailyRecords,
  fetchDailyStats,
  formatDateValue,
  undoRecord,
  type BabyRecord,
  type DailyStats
} from '@/utils/api';

// 当前选中日期对应的汇总数据，初始全部置零
const summary = ref<DailyStats>({
  date: '',
  poopCount: 0,
  peeCount: 0,
  breastDuration: 0,
  formulaAmount: 0
});

// 当前选中日期对应的明细记录列表
const records = ref<BabyRecord[]>([]);

// 当前查询日期，格式 YYYY-MM-DD
const selectedDate = ref(formatDateValue(new Date()));

// 正在撤销的记录的 clientId，用于按钮 loading 显示
const undoingClientId = ref('');

const isLoading = ref(false);

// 日期选择器相关
const showDatePicker = ref(false);
const pickerDate = ref<[string, string, string]>(['2025', '01', '01']);

/** 打开日期选择器，初始化为当前选中日期 */
const openDatePicker = () => {
  const date = parseSelectedDate();
  pickerDate.value = [String(date.getFullYear()), String(date.getMonth() + 1), String(date.getDate())];
  showDatePicker.value = true;
};

/** 日期选择器确认回调 */
const onDateConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  const [year, month, day] = selectedValues;
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+08:00`);
  selectedDate.value = formatDateValue(date);
  showDatePicker.value = false;
  loadDailyStats();
};

/** 把 selectedDate 解析为东八区的本地 Date 对象 */
const parseSelectedDate = () => new Date(`${selectedDate.value}T00:00:00+08:00`);

/** 顶部日期主文案，例如 "6月16日" */
const currentDateText = computed(() => {
  const date = parseSelectedDate();
  return `${date.getMonth() + 1}月${date.getDate()}日`;
});

/** 顶部日期次文案，例如 "周二" */
const currentWeekText = computed(() => {
  const date = parseSelectedDate();
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weeks[date.getDay()];
});

/** 当天是否有任何记录，用于切换空状态展示 */
const hasData = computed(() => {
  return (
    summary.value.poopCount > 0 ||
    summary.value.peeCount > 0 ||
    summary.value.breastDuration > 0 ||
    summary.value.formulaAmount > 0
  );
});

/** 把 ISO 时间格式化成 HH:mm */
const formatRecordTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/** 列表条目右侧补充信息，根据事件类型组合 ml / 时长 / 备注 */
const getRecordDetail = (record: BabyRecord) => {
  if (record.event_type === '奶粉喂养') return `${record.amount || 0}ml`;
  if (record.event_type === '母乳喂养') return `${record.side || '未记录'} · ${record.duration || 0}min`;
  return record.note || '无备注';
};

/** 列表条目左侧圆点的功能色，按事件类型映射到 CSS 变量 */
const getRecordDotClass = (record: BabyRecord) => {
  if (record.event_type === '奶粉喂养') return 'bg-[var(--formula-color)]';
  if (record.event_type === '母乳喂养') return 'bg-[var(--breast-color)]';
  if (record.event_type === '拉尿') return 'bg-[var(--urine-color)]';
  return 'bg-[var(--stool-color)]';
};

/** 拉取当前日期的统计 + 明细，失败时给出提示并保持原数据 */
const loadDailyStats = async () => {
  isLoading.value = true;
  try {
    const [stats, dailyRecords] = await Promise.all([
      fetchDailyStats(selectedDate.value),
      fetchDailyRecords(selectedDate.value)
    ]);
    summary.value = stats;
    records.value = dailyRecords;
  } catch (error) {
    console.error('Load daily stats failed:', error);
    showToast({ message: '统计数据加载失败', type: 'fail' });
  } finally {
    isLoading.value = false;
  }
};

/** 在当前日期上加减若干天，并立即重新加载数据 */
const changeDay = (offset: number) => {
  const date = parseSelectedDate();
  date.setDate(date.getDate() + offset);
  selectedDate.value = formatDateValue(date);
  loadDailyStats();
};

const prevDay = () => changeDay(-1);
const nextDay = () => changeDay(1);

/** 当前选中日期是否为今天，用于禁用"下一天"按钮 */
const isToday = computed(() => selectedDate.value === formatDateValue(new Date()));

/** 一键回到今天 */
const goToday = () => {
  selectedDate.value = formatDateValue(new Date());
  loadDailyStats();
};

/**
 * 撤销一条记录：弹出确认 → 调接口 → 成功后重新加载数据
 *
 * 通过 undoingClientId 标记当前撤销中的记录，UI 上展示按钮 loading
 * 状态，避免重复点击。
 */
const onUndoRecord = (record: BabyRecord) => {
  showConfirmDialog({
    title: '撤销确认',
    message: '确定要撤销这条记录吗？'
  })
    .then(async () => {
      undoingClientId.value = record.clientId || '';
      const success = await undoRecord(record);
      if (success) {
        showToast('已撤销该记录');
        await loadDailyStats();
      } else {
        showToast({ message: '撤销失败，请稍后重试', type: 'fail' });
      }
    })
    .finally(() => {
      undoingClientId.value = '';
    });
};

onMounted(loadDailyStats);
</script>

<template>
  <div class="min-h-[calc(100vh-120px)] bg-[var(--bg-color)] px-5 pt-5 pb-6">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button class="btn-day-nav press" @click="prevDay">
          <ChevronLeft :size="14" color="var(--text-secondary)" />
        </button>
        <div class="mx-2 flex cursor-pointer items-baseline press" @click="openDatePicker">
          <span class="text-base font-semibold text-[var(--text-primary)]">{{ currentDateText }}</span>
          <span class="ml-1 text-sm text-[var(--text-tertiary)]">{{ currentWeekText }}</span>
        </div>
        <button
          class="btn-day-nav press"
          :disabled="isToday"
          :class="{ 'opacity-30 pointer-events-none': isToday }"
          @click="nextDay">
          <ChevronRight :size="14" color="var(--text-secondary)" />
        </button>
      </div>
      <button class="btn-today press" @click="goToday">今天</button>
    </div>

    <div v-if="isLoading" class="pt-[60px] text-center text-[var(--text-tertiary)]">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--stool-icon-bg)]">
        <Baby :size="40" color="var(--stool-color)" />
      </div>
      <p>正在查询今日统计...</p>
    </div>

    <div v-else-if="!hasData" class="pt-[60px] text-center text-[var(--text-tertiary)]">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--stool-icon-bg)]">
        <Baby :size="40" color="var(--stool-color)" />
      </div>
      <p>今日还没有记录哦，快去首页记录吧~</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-2.5">
        <div class="card-stat bg-[var(--formula-bg)]">
          <div class="flex items-center gap-3">
            <span class="stat-icon bg-[var(--formula-icon-bg)]">
              <Baby :size="24" color="var(--formula-color)" />
            </span>
            <div>
              <div class="text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {{ summary.formulaAmount }}
                <small class="ml-1 text-xs font-normal text-[var(--text-tertiary)]">ml</small>
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">奶粉总量</div>
            </div>
          </div>
        </div>
        <div class="card-stat bg-[var(--breast-bg)]">
          <div class="flex items-center gap-3">
            <span class="stat-icon bg-[var(--breast-icon-bg)]">
              <Heart :size="24" color="var(--breast-color)" />
            </span>
            <div>
              <div class="text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {{ summary.breastDuration }}
                <small class="ml-1 text-xs font-normal text-[var(--text-tertiary)]">min</small>
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">母乳时长</div>
            </div>
          </div>
        </div>
        <div class="card-stat bg-[var(--urine-bg)]">
          <div class="flex items-center gap-3">
            <span class="stat-icon bg-[var(--urine-icon-bg)]">
              <Droplets :size="24" color="var(--urine-color)" />
            </span>
            <div>
              <div class="text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {{ summary.peeCount }}
                <small class="ml-1 text-xs font-normal text-[var(--text-tertiary)]">次</small>
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">拉尿次数</div>
            </div>
          </div>
        </div>
        <div class="card-stat bg-[var(--stool-bg)]">
          <div class="flex items-center gap-3">
            <span class="stat-icon bg-[var(--stool-icon-bg)]">
              <CircleDot :size="24" color="var(--stool-color)" />
            </span>
            <div>
              <div class="text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {{ summary.poopCount }}
                <small class="ml-1 text-xs font-normal text-[var(--text-tertiary)]">次</small>
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">拉屎次数</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <div class="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          <span class="h-3.5 w-[3px] rounded-sm bg-[var(--brand-secondary)]"></span>
          <span>记录明细</span>
        </div>

        <div class="record-list">
          <div
            v-for="record in records"
            :key="record.clientId || record.timestamp"
            class="record-item press active:bg-[var(--surface-pressed)]">
            <span class="h-3 w-3 rounded-full" :class="getRecordDotClass(record)"></span>
            <div class="min-w-0">
              <div class="truncate text-[15px] font-semibold text-[var(--text-primary)]">
                {{ record.event_type }}
                <span class="ml-1 text-[13px] font-normal text-[var(--text-tertiary)]">
                  {{ getRecordDetail(record) }}
                </span>
              </div>
            </div>
            <div class="ml-2 flex shrink-0 items-center gap-1.5">
              <span class="text-xs text-[var(--text-tertiary)]">
                {{ formatRecordTime(record.timestamp) }}
              </span>
              <button
                class="btn-undo press"
                :disabled="undoingClientId === record.clientId"
                @click.stop="onUndoRecord(record)">
                <van-loading v-if="undoingClientId === record.clientId" size="12" color="var(--text-disabled)" />
                <ArrowRight v-else :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 日期选择器弹窗 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="pickerDate"
        title="选择日期"
        :min-date="new Date(2024, 0, 1)"
        :max-date="new Date()"
        :columns-type="['year', 'month', 'day']"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false" />
    </van-popup>
  </div>
</template>
