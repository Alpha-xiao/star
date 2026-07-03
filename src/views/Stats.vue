<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showConfirmDialog, showToast } from 'vant';
import { ArrowRight, Baby, ChevronLeft, ChevronRight, CircleDot, Droplets, Heart, Moon, Pencil } from 'lucide-vue-next';
import {
  fetchDailyRecords,
  fetchDailyStats,
  formatDateValue,
  undoRecord,
  updateRecord,
  type BabyRecord,
  type DailyStats
} from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';
import { useFamilyStore } from '@/stores/family';

/**
 * 统计页以服务端返回数据为准，负责按日期展示汇总和明细，
 * 同时承载记录编辑、撤销以及按家庭角色限制操作的交互。
 */
const authStore = useAuthStore();
const babyStore = useBabyStore();
const familyStore = useFamilyStore();

// 当前选中日期对应的汇总数据，初始全部置零
const summary = ref<DailyStats>({
  date: '',
  poopCount: 0,
  peeCount: 0,
  breastDuration: 0,
  formulaAmount: 0,
  sleepDuration: 0,
  sleepCount: 0
});

// 当前选中日期对应的明细记录列表
const records = ref<BabyRecord[]>([]);

// 当前查询日期，格式 YYYY-MM-DD
const selectedDate = ref(formatDateValue(new Date()));

// 正在撤销的记录的 clientId，用于按钮 loading 显示
const undoingClientId = ref('');

const isLoading = ref(false);
const isSaving = ref(false);
const showEditDialog = ref(false);
const editingRecord = ref<BabyRecord | null>(null);
const editTime = ref('');
const editAmount = ref(60);
const editDuration = ref(15);
const editSide = ref<'左侧' | '右侧' | '双侧'>('左侧');
const editNote = ref('');

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
    summary.value.formulaAmount > 0 ||
    summary.value.sleepCount > 0
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
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}分钟`;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

const getRecordDetail = (record: BabyRecord) => {
  if (record.event_type === '奶粉喂养') return `${record.amount || 0}ml`;
  if (record.event_type === '母乳喂养') return `${record.side || '未记录'} · ${record.duration || 0}min`;
  if (record.event_type === '睡眠') {
    const endTime = record.endedAt ? `-${formatRecordTime(record.endedAt)}` : '';
    return `${formatDuration(record.duration || 0)} ${formatRecordTime(record.timestamp)}${endTime}`;
  }
  return record.note || '无备注';
};

/** 列表条目左侧圆点的功能色，按事件类型映射到 CSS 变量 */
const getRecordDotClass = (record: BabyRecord) => {
  if (record.event_type === '奶粉喂养') return 'bg-[var(--formula-color)]';
  if (record.event_type === '母乳喂养') return 'bg-[var(--breast-color)]';
  if (record.event_type === '拉尿') return 'bg-[var(--urine-color)]';
  if (record.event_type === '睡眠') return 'bg-[var(--sleep-color)]';
  return 'bg-[var(--stool-color)]';
};

const editTitle = computed(() => (editingRecord.value ? `编辑${editingRecord.value.event_type}` : '编辑记录'));

/** 将记录 ISO 时间转换成 time 输入框需要的 HH:mm。 */
const toTimeValue = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * 记录操作权限：创建者/管理员可操作全部记录，记录者只能操作自己创建的记录，
 * 只读成员不可编辑和撤销。
 */
const canOperateRecord = (record: BabyRecord) => {
  if (babyStore.currentRole === 'owner' || babyStore.currentRole === 'admin') return true;
  if (babyStore.currentRole === 'member') return record.recorder?.userId === authStore.user?.id;
  return false;
};

/** 根据权限失败原因展示更具体的提示。 */
const showRecordPermissionTip = (record: BabyRecord) => {
  const message = babyStore.isReadOnly ? '当前为只读成员，不能编辑记录' : '只能操作自己创建的记录';
  showToast({ message, type: 'fail' });
};

/** 打开编辑弹窗前完成权限校验，并把不同记录类型的字段填入对应表单。 */
const openEditDialog = (record: BabyRecord) => {
  if (!canOperateRecord(record)) {
    showRecordPermissionTip(record);
    return;
  }

  editingRecord.value = { ...record };
  editTime.value = toTimeValue(record.timestamp);
  editAmount.value = record.amount || 60;
  editDuration.value = record.duration || (record.event_type === '睡眠' ? 60 : 15);
  editSide.value = (record.side as '左侧' | '右侧' | '双侧') || '左侧';
  editNote.value = record.note || '';
  showEditDialog.value = true;
};

/**
 * 将编辑表单组装回 BabyRecord。
 *
 * 日期取当前 selectedDate 的东八区自然日，时间取用户在弹窗中选择的 HH:mm；
 * 只保留当前记录类型允许编辑的字段，避免把无关字段提交给后端。
 */
const buildEditedRecord = () => {
  if (!editingRecord.value) return null;

  const [hours, minutes] = editTime.value.split(':').map(Number);
  const happenedAt = parseSelectedDate();
  happenedAt.setHours(hours, minutes, 0, 0);

  const record: BabyRecord = {
    clientId: editingRecord.value.clientId,
    event_type: editingRecord.value.event_type,
    timestamp: happenedAt.toISOString()
  };

  if (record.event_type === '奶粉喂养') record.amount = editAmount.value;
  if (record.event_type === '母乳喂养') {
    record.side = editSide.value;
    record.duration = editDuration.value;
  }
  if (record.event_type === '拉屎' || record.event_type === '拉尿') record.note = editNote.value.trim() || undefined;
  if (record.event_type === '睡眠') {
    record.duration = editDuration.value;
    record.endedAt = new Date(happenedAt.getTime() + editDuration.value * 60000).toISOString();
    record.note = editNote.value.trim() || undefined;
  }

  return record;
};

/** 提交编辑后的记录，成功后重新拉取统计与明细，保证页面以后端数据为准。 */
const submitEditRecord = async () => {
  if (editingRecord.value && !canOperateRecord(editingRecord.value)) {
    showRecordPermissionTip(editingRecord.value);
    showEditDialog.value = false;
    return;
  }

  const record = buildEditedRecord();
  if (!record) return;

  isSaving.value = true;
  try {
    const success = await updateRecord(record);
    if (!success) {
      showToast({ message: '保存失败，请稍后重试', type: 'fail' });
      return;
    }

    showEditDialog.value = false;
    showToast({ message: '已保存修改', type: 'success' });
    await loadDailyStats();
  } catch (error) {
    console.error('Update record failed:', error);
    showToast({ message: '保存失败，请稍后重试', type: 'fail' });
  } finally {
    isSaving.value = false;
  }
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
  if (!canOperateRecord(record)) {
    showRecordPermissionTip(record);
    return;
  }

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
  <div
    class="flex h-[calc(100vh_-_var(--van-tabbar-height))] flex-col overflow-hidden bg-[var(--bg-color)] px-5 pt-5 pb-6">
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

    <div v-else class="flex min-h-0 flex-1 flex-col">
      <div class="grid shrink-0 grid-cols-2 gap-2.5">
        <div class="card-stat col-span-2 bg-[var(--sleep-bg)]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stat-icon bg-[var(--sleep-icon-bg)]">
                <Moon :size="24" color="var(--sleep-color)" />
              </span>
              <div>
                <div class="text-[15px] font-semibold text-[var(--text-primary)]">睡眠</div>
                <div class="mt-1 text-xs text-[var(--text-tertiary)]">{{ summary.sleepCount }}次</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[22px] font-bold leading-none text-[var(--text-primary)]">
                {{ formatDuration(summary.sleepDuration) }}
              </div>
              <div class="mt-1 text-xs text-[var(--text-tertiary)]">总时长</div>
            </div>
          </div>
        </div>
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

      <div class="mt-6 flex min-h-0 flex-1 flex-col">
        <div class="mb-3 flex shrink-0 items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          <span class="h-3.5 w-[3px] rounded-sm bg-[var(--brand-secondary)]"></span>
          <span>记录明细</span>
        </div>

        <div class="record-list min-h-0 max-h-full flex-1 overflow-y-auto overscroll-contain">
          <van-swipe-cell v-for="record in records" :key="record.clientId || record.timestamp">
            <div
              class="record-item press active:bg-[var(--surface-pressed)]"
              :class="canOperateRecord(record) ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'"
              @click="openEditDialog(record)">
              <div class="flex w-full min-w-0 flex-col">
                <div class="flex min-w-0 items-center">
                  <span class="mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="getRecordDotClass(record)"></span>
                  <span class="shrink-0 text-[15px] font-semibold text-[var(--text-primary)]">
                    {{ record.event_type }}
                  </span>
                  <span class="ml-1 truncate text-sm text-[var(--text-tertiary)]">
                    {{ getRecordDetail(record) }}
                  </span>
                  <span class="ml-auto shrink-0 pl-2 text-[13px] text-[var(--text-tertiary)]">
                    {{ formatRecordTime(record.timestamp) }}
                  </span>
                </div>
                <div v-if="familyStore.hasMembers && record.recorder?.nickname" class="mt-1 ml-5">
                  <span
                    class="inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium"
                    :class="
                      record.recorder.userId === authStore.user?.id
                        ? 'bg-[var(--formula-bg)] text-[var(--formula-color)]'
                        : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                    ">
                    {{ record.recorder.nickname }}
                  </span>
                </div>
              </div>
            </div>
            <template #right>
              <button v-if="canOperateRecord(record)" class="swipe-btn swipe-btn-danger" @click="onUndoRecord(record)">
                <van-loading v-if="undoingClientId === record.clientId" size="16" color="#fff" />
                <span v-else>撤销</span>
              </button>
            </template>
          </van-swipe-cell>
        </div>
      </div>
    </div>

    <van-dialog
      v-model:show="showEditDialog"
      :title="editTitle"
      show-cancel-button
      :confirm-button-loading="isSaving"
      @confirm="submitEditRecord">
      <div class="p-6">
        <div class="mb-5">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">发生时间</label>
          <van-field v-model="editTime" type="time" input-align="center" />
        </div>

        <div v-if="editingRecord?.event_type === '奶粉喂养'" class="mb-5 flex flex-col items-center">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">奶量 (ml)</label>
          <van-stepper
            v-model="editAmount"
            :min="10"
            :max="300"
            :step="10"
            integer
            input-width="60px"
            button-size="32px" />
        </div>

        <template v-if="editingRecord?.event_type === '母乳喂养'">
          <div class="mb-5">
            <label class="mb-3 block text-sm text-[var(--text-tertiary)]">喂养位置</label>
            <van-radio-group v-model="editSide" direction="horizontal">
              <van-radio name="左侧">左侧</van-radio>
              <van-radio name="右侧">右侧</van-radio>
              <van-radio name="双侧">双侧</van-radio>
            </van-radio-group>
          </div>
          <div class="mb-5">
            <label class="mb-3 block text-sm text-[var(--text-tertiary)]">时长 (分钟)</label>
            <van-stepper v-model="editDuration" :min="1" :max="60" />
          </div>
        </template>

        <div v-if="editingRecord?.event_type === '拉屎' || editingRecord?.event_type === '拉尿'" class="mb-5">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">备注</label>
          <van-field v-model="editNote" placeholder="请输入备注" maxlength="100" show-word-limit />
        </div>

        <template v-if="editingRecord?.event_type === '睡眠'">
          <div class="mb-5 flex flex-col items-center">
            <label class="mb-3 block text-sm text-[var(--text-tertiary)]">睡眠时长</label>
            <van-stepper
              v-model="editDuration"
              :min="5"
              :max="720"
              :step="5"
              integer
              input-width="72px"
              button-size="32px" />
            <span class="mt-2 text-xs text-[var(--text-tertiary)]">{{ formatDuration(editDuration) }}</span>
          </div>
          <div class="mb-5">
            <label class="mb-3 block text-sm text-[var(--text-tertiary)]">备注</label>
            <van-field v-model="editNote" placeholder="请输入备注" maxlength="100" show-word-limit />
          </div>
        </template>
      </div>
    </van-dialog>

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
