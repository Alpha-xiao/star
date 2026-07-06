<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Calendar, Clock3 } from 'lucide-vue-next';
import { formatDateValue, formatTimeValue } from '@/utils/api';

/**
 * 补录时间字段
 *
 * 组合 Vant 的 date-picker 与 time-picker，暴露 { date, time } 的 v-model；
 * 布局与 design-rules.md 中一致：卡片圆角 14px，图标 + 文本按行分布。
 */
interface TimeValue {
  date: string;
  time: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: TimeValue;
    minDate?: string;
    maxDate?: string;
  }>(),
  {
    minDate: undefined,
    maxDate: undefined
  }
);

const emit = defineEmits<{ (event: 'update:modelValue', value: TimeValue): void }>();

const showDatePicker = ref(false);
const showTimePicker = ref(false);

/** 把 YYYY-MM-DD 拆成 picker 需要的字符串数组 */
const parseDateParts = (value: string): [string, string, string] => {
  const [year, month, day] = value.split('-');
  const now = new Date();
  return [
    year || String(now.getFullYear()),
    (month || String(now.getMonth() + 1)).padStart(2, '0'),
    (day || String(now.getDate())).padStart(2, '0')
  ];
};

/** 把 HH:mm 拆成 picker 需要的字符串数组 */
const parseTimeParts = (value: string): [string, string] => {
  const [hours, minutes] = value.split(':');
  return [(hours || '00').padStart(2, '0'), (minutes || '00').padStart(2, '0')];
};

const datePickerValue = ref<[string, string, string]>(parseDateParts(props.modelValue.date));
const timePickerValue = ref<[string, string]>(parseTimeParts(props.modelValue.time));

// 监听外部变更，保持 picker 内部值一致
watch(
  () => props.modelValue.date,
  (value) => {
    datePickerValue.value = parseDateParts(value);
  }
);

watch(
  () => props.modelValue.time,
  (value) => {
    timePickerValue.value = parseTimeParts(value);
  }
);

/** 通用 emit：只更新单个字段，保持另一个字段不变 */
const emitUpdate = (patch: Partial<TimeValue>) => {
  emit('update:modelValue', { ...props.modelValue, ...patch });
};

/** 计算 date-picker 的最小/最大日期 */
const parseIsoDate = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const minDateObj = computed(() => parseIsoDate(props.minDate) || new Date(2020, 0, 1));
const maxDateObj = computed(() => parseIsoDate(props.maxDate) || new Date());

/** 展示用中文日期文案 */
const dateDisplay = computed(() => {
  if (!props.modelValue.date) return '选择日期';
  const [year, month, day] = props.modelValue.date.split('-').map(Number);
  return `${year}年${month}月${day}日`;
});

/** 展示用时间文案 */
const timeDisplay = computed(() => props.modelValue.time || '选择时间');

/** 打开日期弹层前同步 picker 值 */
const openDatePicker = () => {
  datePickerValue.value = parseDateParts(props.modelValue.date);
  showDatePicker.value = true;
};

const openTimePicker = () => {
  timePickerValue.value = parseTimeParts(props.modelValue.time);
  showTimePicker.value = true;
};

const onDateConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  const [year, month, day] = selectedValues;
  emitUpdate({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
  showDatePicker.value = false;
};

const onTimeConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  const [hours, minutes] = selectedValues;
  emitUpdate({ time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` });
  showTimePicker.value = false;
};

/** 快捷「现在」按钮：把日期时间置为当前时刻 */
const setNow = () => {
  const now = new Date();
  emit('update:modelValue', { date: formatDateValue(now), time: formatTimeValue(now) });
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      type="button"
      class="press flex items-center justify-between rounded-[14px] bg-[var(--surface-muted)] px-4 py-3 text-left"
      aria-label="发生时间-日期"
      @click="openDatePicker">
      <span class="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
        <Calendar :size="16" color="var(--brand-primary)" />
        {{ dateDisplay }}
      </span>
      <span class="text-xs text-[var(--text-tertiary)]">日期</span>
    </button>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="press flex flex-1 items-center justify-between rounded-[14px] bg-[var(--surface-muted)] px-4 py-3 text-left"
        aria-label="发生时间-时分"
        @click="openTimePicker">
        <span class="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
          <Clock3 :size="16" color="var(--brand-primary)" />
          {{ timeDisplay }}
        </span>
        <span class="text-xs text-[var(--text-tertiary)]">时分</span>
      </button>
      <button
        type="button"
        class="btn-today press"
        aria-label="设为现在时间"
        @click="setNow">
        现在
      </button>
    </div>

    <van-popup v-model:show="showDatePicker" position="bottom" round teleport="body">
      <van-date-picker
        v-model="datePickerValue"
        title="选择日期"
        :min-date="minDateObj"
        :max-date="maxDateObj"
        :columns-type="['year', 'month', 'day']"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false" />
    </van-popup>

    <van-popup v-model:show="showTimePicker" position="bottom" round teleport="body">
      <van-time-picker
        v-model="timePickerValue"
        title="选择时间"
        :columns-type="['hour', 'minute']"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false" />
    </van-popup>
  </div>
</template>
