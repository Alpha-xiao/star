<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Baby, Check, ChevronDown, CircleDot, Droplets, Heart, Moon, Plus, Star } from 'lucide-vue-next';
import { showToast } from 'vant';
import { useRecordStore } from '@/stores/records';
import { useSleepTimerStore } from '@/stores/sleep-timer';
import { useBabyStore } from '@/stores/baby';
import { submitRecord, type BabyRecord } from '@/utils/api';

/**
 * 首页记录页：提供高频护理记录入口，并优先把操作写入本地 Store，
 * 再由 API 层异步同步或暂存，保证弱网下也能快速完成记录。
 */
const store = useRecordStore();
const sleepTimerStore = useSleepTimerStore();
const babyStore = useBabyStore();
const route = useRoute();
const router = useRouter();

// --- 弹窗显隐控制 ---
const showPoopSheet = ref(false);
const showPeeSheet = ref(false);
const showBreastDialog = ref(false);
const showFormulaDialog = ref(false);
const showManualSleepDialog = ref(false);
const showBabySwitcher = ref(false);

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
const manualSleepTime = ref('');
const manualSleepDuration = ref(60);
const manualSleepNote = ref('');

const readonlyTip = '当前为只读成员，不能记录';

/** 所有记录入口统一校验家庭角色，只读成员只能查看不能写入。 */
const ensureCanRecord = () => {
  if (babyStore.canRecord) return true;
  showToast({ message: readonlyTip, type: 'fail' });
  return false;
};

/** 包装记录入口点击事件，权限通过后才打开对应弹窗。 */
const openRecordAction = (open: () => void) => {
  if (!ensureCanRecord()) return;
  open();
};

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
  if (!ensureCanRecord()) return;
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
  if (!ensureCanRecord()) return;
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

/** 打开手动睡眠弹窗，并用当前本地时间作为默认入睡时间。 */
const openManualSleepDialog = () => {
  if (!ensureCanRecord()) return;
  const date = new Date();
  manualSleepTime.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  manualSleepDuration.value = 60;
  manualSleepNote.value = '';
  showManualSleepDialog.value = true;
};

/** 开始当前宝宝的睡眠计时；真正的睡眠记录在结束时生成。 */
const startSleep = () => {
  if (!ensureCanRecord() || !babyStore.currentBabyId) return;
  sleepTimerStore.startSleep(babyStore.currentBabyId);
  showToast('已开始睡眠计时');
};

/** 结束睡眠计时并提交记录，离线失败由 Store/API 层暂存。 */
const endSleep = async () => {
  if (!ensureCanRecord()) return;
  const success = await sleepTimerStore.endSleep();
  if (success) showToast('已记录睡眠');
};

/**
 * 手动补录睡眠：以今天的本地 HH:mm 作为开始时间，按输入时长推导结束时间。
 * 提交后刷新清醒窗口，让睡眠卡片立即反映最新醒来时间。
 */
const submitManualSleep = async () => {
  if (!ensureCanRecord()) return;
  const [hours, minutes] = manualSleepTime.value.split(':').map(Number);
  const startedAt = new Date();
  startedAt.setHours(hours, minutes, 0, 0);
  const endedAt = new Date(startedAt.getTime() + manualSleepDuration.value * 60000);
  const record: BabyRecord = {
    clientId: crypto.randomUUID(),
    event_type: '睡眠',
    timestamp: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    duration: manualSleepDuration.value,
    note: manualSleepNote.value.trim() || undefined
  };

  store.addRecord(record);
  await submitRecord(record);
  await sleepTimerStore.refreshWakeWindow(babyStore.currentBabyId || undefined);
  showManualSleepDialog.value = false;
  showToast({ message: '睡眠记录成功', type: 'success' });
};

const manualSleepDurationText = computed(() => {
  const hours = Math.floor(manualSleepDuration.value / 60);
  const minutes = manualSleepDuration.value % 60;
  return hours <= 0 ? `${minutes}分钟` : `${hours}小时${minutes}分钟`;
});

/** 切换宝宝时清空本地即时记录缓存，并重新初始化该宝宝的睡眠计时器。 */
const switchBaby = async (babyId: string) => {
  showBabySwitcher.value = false;
  await babyStore.switchBaby(babyId);
  store.clearRecords();
  if (babyStore.currentBabyId) await sleepTimerStore.init(babyStore.currentBabyId);
  showToast('已切换宝宝');
};

onMounted(async () => {
  if (babyStore.currentBabyId) await sleepTimerStore.init(babyStore.currentBabyId);
  // 每分钟刷新一次「现在时间」，让计时器不断滚动
  timer = setInterval(() => {
    now.value = new Date();
    sleepTimerStore.tick();
  }, 60000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="flex h-[calc(100vh-var(--van-tabbar-height))] max-h-[calc(100vh-var(--van-tabbar-height))] flex-col overflow-hidden bg-[var(--bg-color)] px-4 pt-[clamp(10px,2vh,20px)] pb-[max(10px,env(safe-area-inset-bottom))]">
    <header class="mb-[clamp(8px,1.5vh,16px)] flex h-9 shrink-0 items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="brand-logo">
          <Star :size="16" color="#fff" fill="#fff" />
        </div>
        <button
          v-if="babyStore.accessibleBabies.length > 1"
          class="press flex items-center gap-1 rounded-full bg-[var(--surface-card)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--card-shadow)]"
          @click="showBabySwitcher = true">
          {{ babyStore.baby?.name || '选择宝宝' }}
          <ChevronDown :size="14" color="var(--text-tertiary)" />
        </button>
        <span v-else class="text-lg font-bold text-[var(--text-primary)]">BabyStar</span>
      </div>
      <span class="w-8" />
    </header>

    <section class="sleep-card home-sleep-card shrink-0">
      <div class="relative z-10">
        <div class="flex items-center gap-2 text-xs text-white/90">
          <span v-if="sleepTimerStore.isActive" class="sleep-pulse-dot"></span>
          <span v-else class="h-2 w-2 rounded-full bg-white/80"></span>
          <span>{{ sleepTimerStore.isActive ? '睡眠中' : '清醒' }}</span>
        </div>
        <div class="mt-0.5 text-[clamp(22px,4vh,28px)] font-bold leading-tight">
          {{ sleepTimerStore.isActive ? sleepTimerStore.elapsedDisplay : sleepTimerStore.wakeWindowDisplay }}
        </div>
        <div class="mt-0.5 text-xs text-white/80">
          {{
            sleepTimerStore.isActive
              ? `入睡时间: ${sleepTimerStore.startedTimeText}`
              : `上次醒来: ${sleepTimerStore.lastWakeTimeText}`
          }}
        </div>
        <div v-if="!sleepTimerStore.isActive" class="mt-0.5 text-xs text-white/70">清醒窗口参考: 45-90分钟</div>
        <div class="mt-[clamp(8px,1.5vh,16px)] flex gap-3">
          <button
            v-if="!sleepTimerStore.isActive"
            class="press flex h-[clamp(34px,5.5vh,40px)] flex-1 items-center justify-center gap-2 rounded-[14px] bg-white/20 text-sm font-bold text-white"
            :class="{ 'opacity-50': !babyStore.canRecord }"
            @click="startSleep">
            <Moon :size="16" />
            开始睡眠
          </button>
          <button
            v-if="!sleepTimerStore.isActive"
            class="press flex h-[clamp(34px,5.5vh,40px)] flex-1 items-center justify-center rounded-[14px] bg-white/15 text-sm font-bold text-white"
            :class="{ 'opacity-50': !babyStore.canRecord }"
            @click="openManualSleepDialog">
            手动记录
          </button>
          <button
            v-else
            class="press flex h-[clamp(38px,6vh,48px)] flex-1 items-center justify-center rounded-[14px] border-2 border-[var(--danger-strong)] bg-white/10 text-base font-bold text-[#ffebee]"
            :class="{ 'opacity-50': !babyStore.canRecord }"
            @click="endSleep">
            结束睡眠
          </button>
        </div>
      </div>
    </section>

    <section class="timer-card home-feed-card shrink-0">
      <div class="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/10"></div>
      <div class="relative text-xs text-white/90">距上次喂奶</div>
      <div class="relative mt-0.5 text-[clamp(20px,3.6vh,28px)] font-bold leading-tight">{{ timerText }}</div>
      <div class="relative mt-0.5 truncate text-xs text-white/80">{{ lastFeedText }}</div>
    </section>

    <div class="grid shrink-0 grid-cols-2 gap-[clamp(8px,1.4vh,12px)] pb-1">
      <button
        class="record-btn home-record-btn h-[116px] bg-[var(--formula-bg)] press"
        @click="openRecordAction(() => (showFormulaDialog = true))">
        <span class="record-badge home-record-badge bg-[var(--formula-icon-bg)] text-[var(--formula-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon home-record-icon bg-[var(--formula-icon-bg)]">
          <Baby :size="26" color="var(--formula-color)" />
        </span>
        <span class="text-[clamp(14px,2vh,15px)] font-semibold text-[var(--text-primary)]">奶粉</span>
      </button>

      <button
        class="record-btn home-record-btn h-[116px] bg-[var(--breast-bg)] press"
        @click="openRecordAction(() => (showBreastDialog = true))">
        <span class="record-badge home-record-badge bg-[var(--breast-icon-bg)] text-[var(--breast-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon home-record-icon bg-[var(--breast-icon-bg)]">
          <Heart :size="26" color="var(--breast-color)" />
        </span>
        <span class="text-[clamp(14px,2vh,15px)] font-semibold text-[var(--text-primary)]">母乳</span>
      </button>

      <button
        class="record-btn home-record-btn h-[116px] bg-[var(--urine-bg)] press"
        @click="openRecordAction(() => (showPeeSheet = true))">
        <span class="record-badge home-record-badge bg-[var(--urine-icon-bg)] text-[var(--urine-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon home-record-icon bg-[var(--urine-icon-bg)]">
          <Droplets :size="26" color="var(--urine-color)" />
        </span>
        <span class="text-[clamp(14px,2vh,15px)] font-semibold text-[var(--text-primary)]">拉尿</span>
      </button>

      <button
        class="record-btn home-record-btn h-[116px] bg-[var(--stool-bg)] press"
        :class="{ 'opacity-50 grayscale': !babyStore.canRecord }"
        @click="openRecordAction(() => (showPoopSheet = true))">
        <span class="record-badge home-record-badge bg-[var(--stool-icon-bg)] text-[var(--stool-color)]">
          <Plus :size="12" />
        </span>
        <span class="record-icon home-record-icon bg-[var(--stool-icon-bg)]">
          <CircleDot :size="26" color="var(--stool-color)" />
        </span>
        <span class="text-[clamp(14px,2vh,15px)] font-semibold text-[var(--text-primary)]">拉屎</span>
      </button>
    </div>

    <van-action-sheet v-model:show="showBabySwitcher" title="选择宝宝">
      <div class="px-5 pb-5">
        <button
          v-for="item in babyStore.accessibleBabies"
          :key="item.id"
          class="press flex w-full items-center justify-between border-b border-[var(--divider-color)] py-3 last:border-b-0"
          @click="switchBaby(item.id)">
          <span class="flex items-center gap-3">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-light)] text-sm font-bold text-[var(--brand-primary)]">
              {{ item.name.charAt(0) }}
            </span>
            <span class="text-[15px] font-semibold text-[var(--text-primary)]">{{ item.name }}</span>
          </span>
          <span class="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            {{ item.relation === 'owner' ? '我的宝宝' : '加入' }}
            <Check v-if="item.id === babyStore.currentBabyId" :size="16" color="var(--brand-primary)" />
          </span>
        </button>
      </div>
    </van-action-sheet>

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

    <van-dialog
      v-model:show="showManualSleepDialog"
      title="手动记录睡眠"
      show-cancel-button
      @confirm="submitManualSleep">
      <div class="p-6">
        <div class="mb-5">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">入睡时间</label>
          <van-field v-model="manualSleepTime" type="time" input-align="center" />
        </div>
        <div class="mb-5 flex flex-col items-center">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">睡眠时长</label>
          <van-stepper
            v-model="manualSleepDuration"
            :min="5"
            :max="720"
            :step="5"
            integer
            input-width="72px"
            button-size="32px" />
          <span class="mt-2 text-xs text-[var(--text-tertiary)]">{{ manualSleepDurationText }}</span>
        </div>
        <div class="mb-2">
          <label class="mb-3 block text-sm text-[var(--text-tertiary)]">备注（选填）</label>
          <van-field v-model="manualSleepNote" placeholder="例如：睡得很安稳" maxlength="100" show-word-limit />
        </div>
      </div>
    </van-dialog>
  </div>
</template>
