<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { showToast } from 'vant';
import { Baby, CircleDot, Clock3, Droplets, Heart, Moon, X } from 'lucide-vue-next';
import { formatDateValue, formatTimeValue, submitBackfillRecord, type BabyRecord } from '@/utils/api';
import { useRecordStore } from '@/stores/records';
import { trackBackfill } from '@/utils/analytics';
import BackfillTimeField from './BackfillTimeField.vue';
import { BACKFILL_TYPE_LABELS, mapBackfillTypeToEvent, validateBackfillTime, type BackfillType } from './backfill-form';

/**
 * 补录弹窗
 *
 * 承担奶粉/母乳/拉尿/拉屎/睡眠 5 类记录的历史补录。核心流程：
 *  1. 组装时间与类型专属字段
 *  2. 校验时间是否为未来或早于宝宝出生日
 *  3. 写入本地 store 并调用 submitBackfillRecord（source=backfill）
 */

const props = withDefaults(
  defineProps<{
    visible: boolean;
    type: BackfillType;
    defaultDate?: string;
    babyBirthday?: string | null;
  }>(),
  {
    defaultDate: undefined,
    babyBirthday: null
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'submitted', record: BabyRecord): void;
}>();

const recordStore = useRecordStore();

/** 头部图标 + 主题色，按记录类型区分 */
const typeMeta = computed(() => {
  const map: Record<BackfillType, { icon: unknown; color: string; bg: string }> = {
    formula: { icon: Baby, color: 'var(--formula-color)', bg: 'var(--formula-icon-bg)' },
    breast: { icon: Heart, color: 'var(--breast-color)', bg: 'var(--breast-icon-bg)' },
    urine: { icon: Droplets, color: 'var(--urine-color)', bg: 'var(--urine-icon-bg)' },
    stool: { icon: CircleDot, color: 'var(--stool-color)', bg: 'var(--stool-icon-bg)' },
    sleep: { icon: Moon, color: 'var(--sleep-color)', bg: 'var(--sleep-icon-bg)' }
  };
  return map[props.type];
});

const title = computed(() => `补录${BACKFILL_TYPE_LABELS[props.type]}`);

// --- 表单字段 ---
const timeValue = ref({ date: '', time: '' });
const formulaAmount = ref(60);
const breastSide = ref<'左侧' | '右侧' | '双侧'>('左侧');
const breastDuration = ref(15);
const urineOption = ref('量多');
const stoolOption = ref('黄色糊状');
const stoolNote = ref('');
const urineNote = ref('');
const sleepDuration = ref(60);
const isSaving = ref(false);

/** 拉屎性状可选项，与首页 poopOptions 保持一致 */
const stoolOptions = ['黄色糊状', '黄色软便', '黄色水样', '绿色稀便', '泡沫便', '黑色/墨绿（胎便）', '其他'];
/** 拉尿可选项，与首页 peeOptions 保持一致 */
const urineOptions = ['量多', '量少', '换尿布'];

/** 依据补录类型、默认日期重置弹窗字段 */
const resetFields = () => {
  const now = new Date();
  timeValue.value = {
    date: props.defaultDate || formatDateValue(now),
    time: formatTimeValue(now)
  };
  formulaAmount.value = 60;
  breastSide.value = '左侧';
  breastDuration.value = 15;
  urineOption.value = '量多';
  urineNote.value = '';
  stoolOption.value = '黄色糊状';
  stoolNote.value = '';
  sleepDuration.value = 60;
};

// 打开时重置字段并发送埋点
watch(
  () => props.visible,
  (value) => {
    if (value) {
      resetFields();
      trackBackfill('open', { type: props.type });
    }
  }
);

/** 组合 date+time 得到 Date 对象，供多处校验/展示使用 */
const composedDate = computed(() => {
  const [year, month, day] = timeValue.value.date.split('-').map(Number);
  const [hours, minutes] = timeValue.value.time.split(':').map(Number);
  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
});

/** 睡眠补录：入睡 + 时长自动推导的醒来时间 */
const sleepEndedAt = computed(() => {
  if (props.type !== 'sleep' || !composedDate.value) return null;
  return new Date(composedDate.value.getTime() + sleepDuration.value * 60000);
});

const sleepEndedDisplay = computed(() => {
  if (!sleepEndedAt.value) return '';
  const time = formatTimeValue(sleepEndedAt.value);
  const date = formatDateValue(sleepEndedAt.value);
  return `${date} ${time}`;
});

/** 校验错误提示（时间非法、跨越现在等） */
const errorMessage = computed(() => {
  const timeError = validateBackfillTime(timeValue.value.date, timeValue.value.time, props.babyBirthday);
  if (timeError) return timeError;
  if (props.type === 'sleep' && sleepEndedAt.value && sleepEndedAt.value.getTime() > Date.now() + 60_000) {
    return '睡眠尚未结束，请稍后再补录';
  }
  return '';
});

const canSubmit = computed(() => !errorMessage.value && !isSaving.value);

/** 组装最终待提交的 BabyRecord */
const buildRecord = (): BabyRecord | null => {
  const target = composedDate.value;
  if (!target) return null;

  const base: BabyRecord = {
    clientId: crypto.randomUUID(),
    event_type: mapBackfillTypeToEvent(props.type),
    timestamp: target.toISOString(),
    source: 'backfill'
  };

  switch (props.type) {
    case 'formula':
      base.amount = formulaAmount.value;
      break;
    case 'breast':
      base.side = breastSide.value;
      base.duration = breastDuration.value;
      break;
    case 'urine':
      base.note = urineNote.value.trim() || urineOption.value;
      break;
    case 'stool':
      base.note = stoolNote.value.trim() || stoolOption.value;
      break;
    case 'sleep':
      base.duration = sleepDuration.value;
      if (sleepEndedAt.value) base.endedAt = sleepEndedAt.value.toISOString();
      break;
  }
  return base;
};

const close = (reason: 'cancel' | 'submitted') => {
  if (reason === 'cancel') trackBackfill('cancel', { type: props.type });
  emit('update:visible', false);
};

/** 保存补录：本地 store 先反显，再异步同步后端 */
const onSave = async () => {
  if (!canSubmit.value) return;
  const record = buildRecord();
  if (!record) return;

  isSaving.value = true;
  try {
    recordStore.addRecord(record);
    const ok = await submitBackfillRecord(record);
    if (!ok) {
      // submitBackfillRecord 内部已经写入 pending 并 toast，不重复提示
      trackBackfill('fail', { type: props.type, reason: 'submit_failed' });
    } else {
      const timeText = formatTimeValue(new Date(record.timestamp));
      showToast({ message: `已补录 ${timeText} ${BACKFILL_TYPE_LABELS[props.type]}`, type: 'success' });
      trackBackfill('submit', {
        type: props.type,
        deltaMinutes: Math.round((Date.now() - new Date(record.timestamp).getTime()) / 60000)
      });
    }
    emit('submitted', record);
    close('submitted');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <van-popup
    :show="visible"
    position="bottom"
    round
    teleport="body"
    :style="{ maxHeight: '92vh' }"
    @update:show="(value: boolean) => emit('update:visible', value)"
    @close="close('cancel')">
    <div class="flex max-h-[92vh] flex-col bg-[var(--surface-card)]">
      <!-- 顶部标题 -->
      <div class="flex items-center justify-between border-b border-[var(--divider-color)] px-5 py-4">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-[12px]" :style="{ background: typeMeta.bg }">
            <Clock3 :size="16" :color="typeMeta.color" />
          </span>
          <span class="text-base font-bold text-[var(--text-primary)]">{{ title }}</span>
        </div>
        <button class="press p-1 text-[var(--text-tertiary)]" type="button" @click="close('cancel')">
          <X :size="20" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">
        <!-- 通用：发生时间 -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-[var(--text-tertiary)]">发生时间</label>
          <BackfillTimeField v-model="timeValue" :max-date="undefined" :min-date="babyBirthday || undefined" />
        </div>

        <!-- 奶粉 -->
        <div v-if="type === 'formula'" class="mb-5 flex flex-col items-center">
          <label class="mb-2 block self-start text-sm text-[var(--text-tertiary)]">奶量 (ml)</label>
          <van-stepper
            v-model="formulaAmount"
            :min="10"
            :max="300"
            :step="10"
            integer
            input-width="60px"
            button-size="32px" />
        </div>

        <!-- 母乳 -->
        <template v-if="type === 'breast'">
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">喂养位置</label>
            <van-radio-group v-model="breastSide" direction="horizontal">
              <van-radio name="左侧">左侧</van-radio>
              <van-radio name="右侧">右侧</van-radio>
              <van-radio name="双侧">双侧</van-radio>
            </van-radio-group>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">时长 (分钟)</label>
            <van-stepper v-model="breastDuration" :min="1" :max="60" />
          </div>
        </template>

        <!-- 拉尿 -->
        <template v-if="type === 'urine'">
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">情况</label>
            <van-radio-group v-model="urineOption" direction="horizontal">
              <van-radio v-for="option in urineOptions" :key="option" :name="option">{{ option }}</van-radio>
            </van-radio-group>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">备注（选填）</label>
            <van-field v-model="urineNote" placeholder="例如：颜色偏深" maxlength="100" show-word-limit />
          </div>
        </template>

        <!-- 拉屎 -->
        <template v-if="type === 'stool'">
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">性状</label>
            <van-radio-group v-model="stoolOption">
              <div class="flex flex-col gap-2">
                <van-radio v-for="option in stoolOptions" :key="option" :name="option">{{ option }}</van-radio>
              </div>
            </van-radio-group>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">备注（选填）</label>
            <van-field v-model="stoolNote" placeholder="例如：偏干" maxlength="100" show-word-limit />
          </div>
        </template>

        <!-- 睡眠 -->
        <template v-if="type === 'sleep'">
          <div class="mb-5 flex flex-col items-center">
            <label class="mb-2 block self-start text-sm text-[var(--text-tertiary)]">睡眠时长（分钟）</label>
            <van-stepper
              v-model="sleepDuration"
              :min="5"
              :max="720"
              :step="5"
              integer
              input-width="72px"
              button-size="32px" />
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-sm text-[var(--text-tertiary)]">醒来时间</label>
            <div class="rounded-[14px] bg-[var(--surface-muted)] px-4 py-3 text-[15px] text-[var(--text-secondary)]">
              {{ sleepEndedDisplay || '—' }}
            </div>
          </div>
        </template>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="mb-4 text-xs text-[var(--danger-color)]">⚠ {{ errorMessage }}</div>
      </div>

      <!-- 底部按钮 -->
      <div class="flex gap-3 border-t border-[var(--divider-color)] px-5 py-3">
        <button
          type="button"
          class="press h-12 flex-1 rounded-[14px] bg-[var(--surface-muted)] text-[15px] font-semibold text-[var(--text-secondary)]"
          @click="close('cancel')">
          取消
        </button>
        <button
          type="button"
          class="press h-12 flex-1 rounded-[14px] text-[15px] font-bold text-white transition"
          :style="{
            background: canSubmit ? 'var(--brand-primary)' : 'rgba(230, 81, 0, 0.5)',
            cursor: canSubmit ? 'pointer' : 'not-allowed'
          }"
          :disabled="!canSubmit"
          @click="onSave">
          {{ isSaving ? '保存中...' : '保存补录' }}
        </button>
      </div>
    </div>
  </van-popup>
</template>
