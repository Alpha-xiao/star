<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Baby, CircleDot, Droplets, Heart, Plus, Star, User } from 'lucide-vue-next';
import { showToast } from 'vant';
import { useRecordStore } from '@/stores/records';
import { useBabyStore } from '@/stores/baby';
import { submitRecord, type BabyRecord } from '@/utils/api';

const store = useRecordStore();
const babyStore = useBabyStore();
const route = useRoute();
const router = useRouter();

// --- 弹窗显隐控制 ---
const showPoopSheet = ref(false);
const showPeeSheet = ref(false);
const showBreastDialog = ref(false);
const showFormulaDialog = ref(false);

// --- 距上次喂奶计时器相关状态 ---
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;

// 拉屎弹窗的备选性状选项
const poopOptions = [
  { name: '黄色糊状' },
  { name: '黄色软便' },
  { name: '黄色水样' },
  { name: '绿色稀便' },
  { name: '泡沫便' },
  { name: '黑色/墨绿（胎便）' },
  { name: '其他' }
];

// 拉尿弹窗的备选操作选项
const peeOptions = [{ name: '量多' }, { name: '量少' }, { name: '换尿布' }];

// --- 表单数据 ---
const breastSide = ref<'左侧' | '右侧' | '双侧'>('左侧');
const breastDuration = ref(15);
const formulaAmount = ref(60);

/** 当天本地缓存中的记录列表 */
const todayRecords = computed(() => {
  const today = new Date().toDateString();
  return store.todayRecords.filter((record) => new Date(record.timestamp).toDateString() === today);
});

/** 最近一条喂奶记录（奶粉或母乳），用于驱动顶部计时器 */
const lastFeedRecord = computed(() => {
  return [...todayRecords.value]
    .filter((record) => record.event_type === '奶粉喂养' || record.event_type === '母乳喂养')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
});

/** 顶部计时器的主文案，例如 "1小时20分钟" */
const timerText = computed(() => {
  if (!lastFeedRecord.value) return '暂无喂奶记录';
  const diffMinutes = Math.max(
    0,
    Math.floor((now.value.getTime() - new Date(lastFeedRecord.value.timestamp).getTime()) / 60000)
  );
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours <= 0) return `${minutes}分钟`;
  return `${hours}小时${minutes}分钟`;
});

/** 顶部计时器的辅助文案，例如 "上次: 14:30 奶粉 60ml" */
const lastFeedText = computed(() => {
  const record = lastFeedRecord.value;
  if (!record) return '记录一次喂养后开始计时';
  const time = new Date(record.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const detail = record.event_type === '奶粉喂养' ? `${record.amount || 0}ml` : `${record.duration || 0}min`;
  return `上次: ${time} ${record.event_type.replace('喂养', '')} ${detail}`;
});

/** 根据外部传入的 action 打开对应的记录弹窗（供统计页 FAB 等场景调用） */
const openAction = (action: unknown) => {
  if (action === 'formula') showFormulaDialog.value = true;
  if (action === 'breast') showBreastDialog.value = true;
  if (action === 'pee') showPeeSheet.value = true;
  if (action === 'poop') showPoopSheet.value = true;
};

// 监听路由 query.action：打开后立即清除参数，避免再次进入首页时重复弹窗
watch(
  () => route.query.action,
  (action) => {
    if (!action) return;
    openAction(action);
    router.replace({ path: '/' });
  },
  { immediate: true }
);

// --- 通用提交逻辑 ---
const isSubmitting = ref(false);

/**
 * 通用提交入口
 *
 * 1. 生成 clientId 并写入本地 store，方便首页计时器立即更新
 * 2. 异步调用后端接口，失败时由 submitRecord 自动写入暂存队列
 */
const handleRecord = async (type: string, data: Partial<BabyRecord>) => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  const record: BabyRecord = {
    clientId: crypto.randomUUID(),
    event_type: type,
    timestamp: new Date().toISOString(),
    ...data
  };

  // 先写本地 store，保证首页计时器立刻反映最新一次喂养
  store.addRecord(record);

  // 异步同步到后端，失败会自动进入暂存队列
  await submitRecord(record);

  isSubmitting.value = false;
  showToast({ message: '记录成功', type: 'success' });
};

// --- 各项功能处理 ---
const onPoopSelect = (item: { name: string }) => {
  handleRecord('拉屎', { note: item.name });
  showPoopSheet.value = false;
};

const onPeeSelect = (item: { name: string }) => {
  handleRecord('拉尿', { note: item.name });
  showPeeSheet.value = false;
};

const submitBreast = () => {
  handleRecord('母乳喂养', { side: breastSide.value, duration: breastDuration.value });
  showBreastDialog.value = false;
};

const submitFormula = () => {
  handleRecord('奶粉喂养', { amount: formulaAmount.value });
  showFormulaDialog.value = false;
};

onMounted(() => {
  // 每分钟刷新一次「现在时间」，让计时器不断滚动
  timer = setInterval(() => {
    now.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="min-h-[calc(100vh-50px)] bg-[var(--bg-color)] px-5 pt-5 pb-6">
    <header class="mb-4 flex h-11 items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="brand-logo">
          <Star :size="16" color="#fff" fill="#fff" />
        </div>
        <span class="text-lg font-bold text-[var(--text-primary)]">BabyStar</span>
      </div>
      <div class="user-avatar cursor-pointer press" @click="router.push('/profile')">
        <img
          v-if="babyStore.baby?.avatarUrl"
          :src="babyStore.baby.avatarUrl"
          class="h-full w-full rounded-full object-cover" />
        <span v-else-if="babyStore.baby" class="text-base font-bold text-[var(--brand-primary)]">
          {{ babyStore.baby.name.charAt(0) }}
        </span>
        <User v-else :size="18" color="var(--brand-primary)" />
      </div>
    </header>

    <section class="timer-card">
      <div class="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10"></div>
      <div class="relative text-xs text-white/90">距上次喂奶</div>
      <div class="relative mt-1 text-[28px] font-bold leading-tight">{{ timerText }}</div>
      <div class="relative mt-1 text-xs text-white/80">{{ lastFeedText }}</div>
    </section>

    <div class="mb-6 grid grid-cols-2 gap-3">
      <button class="record-btn bg-[var(--formula-bg)] press" @click="showFormulaDialog = true">
        <span class="record-badge bg-[var(--formula-icon-bg)] text-[var(--formula-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon bg-[var(--formula-icon-bg)]">
          <Baby :size="28" color="var(--formula-color)" />
        </span>
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">奶粉</span>
      </button>

      <button class="record-btn bg-[var(--breast-bg)] press" @click="showBreastDialog = true">
        <span class="record-badge bg-[var(--breast-icon-bg)] text-[var(--breast-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon bg-[var(--breast-icon-bg)]">
          <Heart :size="28" color="var(--breast-color)" />
        </span>
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">母乳</span>
      </button>

      <button class="record-btn bg-[var(--urine-bg)] press" @click="showPeeSheet = true">
        <span class="record-badge bg-[var(--urine-icon-bg)] text-[var(--urine-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon bg-[var(--urine-icon-bg)]">
          <Droplets :size="28" color="var(--urine-color)" />
        </span>
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">拉尿</span>
      </button>

      <button class="record-btn bg-[var(--stool-bg)] press" @click="showPoopSheet = true">
        <span class="record-badge bg-[var(--stool-icon-bg)] text-[var(--stool-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon bg-[var(--stool-icon-bg)]">
          <CircleDot :size="28" color="var(--stool-color)" />
        </span>
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">拉屎</span>
      </button>
    </div>

    <van-action-sheet
      v-model:show="showPoopSheet"
      :actions="poopOptions"
      cancel-text="取消"
      close-on-click-action
      @select="onPoopSelect"
      title="选择便便性状" />

    <van-action-sheet
      v-model:show="showPeeSheet"
      :actions="peeOptions"
      cancel-text="取消"
      close-on-click-action
      @select="onPeeSelect"
      title="选择尿量/操作" />

    <van-dialog v-model:show="showBreastDialog" title="母乳喂养" show-cancel-button @confirm="submitBreast">
      <div class="p-6">
        <div class="mb-5">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">喂养位置</label>
          <van-radio-group v-model="breastSide" direction="horizontal">
            <van-radio name="左侧">左侧</van-radio>
            <van-radio name="右侧">右侧</van-radio>
            <van-radio name="双侧">双侧</van-radio>
          </van-radio-group>
        </div>
        <div class="mb-5">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">时长 (分钟)</label>
          <van-stepper v-model="breastDuration" :min="1" :max="60" />
        </div>
      </div>
    </van-dialog>

    <van-dialog v-model:show="showFormulaDialog" title="奶粉喂养" show-cancel-button @confirm="submitFormula">
      <div class="p-6">
        <div class="mb-5 flex flex-col items-center">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">奶量 (ml)</label>
          <van-stepper
            v-model="formulaAmount"
            :min="10"
            :max="300"
            :step="10"
            integer
            input-width="60px"
            button-size="32px" />
        </div>
      </div>
    </van-dialog>
  </div>
</template>
