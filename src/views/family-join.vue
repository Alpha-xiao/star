<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Baby, ChevronLeft, Home, Users } from 'lucide-vue-next';
import { useFamilyStore } from '@/stores/family';

/**
 * 加入家庭页。
 * 用户输入邀请码后加入对应宝宝家庭，并由 familyStore 刷新可访问宝宝和当前宝宝。
 */
const router = useRouter();
const familyStore = useFamilyStore();

const code = ref('');
const isSubmitting = ref(false);
const joinedBaby = ref<{ name: string; avatarUrl?: string | null; owner?: { nickname?: string | null } } | null>(null);
const showJoinedDialog = ref(false);

/** 邀请码只保留 6 位大写字母/数字，兼容用户粘贴带空格或小写的内容。 */
const normalizeCode = () => {
  code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

/** 提交邀请码，加入成功后 Store 会刷新可访问宝宝并切换当前宝宝。 */
const submit = async () => {
  normalizeCode();
  if (code.value.length !== 6) {
    showToast({ message: '请输入 6 位邀请码', type: 'fail' });
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await familyStore.joinByCode(code.value);
    joinedBaby.value = res.baby;
    showJoinedDialog.value = true;
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '加入失败', type: 'fail' });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-color)] px-5 pt-5 pb-6">
    <header class="sticky top-0 z-20 -mx-5 mb-8 flex h-16 items-center justify-between bg-[var(--bg-color)] px-5 pt-5">
      <button class="btn-day-nav press" @click="router.back()">
        <ChevronLeft :size="18" color="var(--text-secondary)" />
      </button>
      <span class="text-[17px] font-semibold text-[var(--text-primary)]">加入家庭</span>
      <span class="w-7" />
    </header>

    <div class="flex flex-col items-center text-center">
      <div class="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-light)]">
        <Users :size="38" color="var(--brand-primary)" />
      </div>
      <h1 class="text-lg font-bold text-[var(--text-primary)]">输入家人分享的邀请码</h1>
      <p class="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">即可一起记录宝宝的成长</p>
    </div>

    <div class="mt-8 rounded-[var(--radius-large)] bg-white p-5 shadow-[var(--card-shadow)]">
      <input
        v-model="code"
        class="h-14 w-full rounded-2xl bg-[var(--bg-color)] text-center font-mono text-2xl font-bold tracking-[8px] text-[var(--text-primary)] outline-none"
        maxlength="6"
        placeholder="请输入"
        @input="normalizeCode" />
      <button
        class="press mt-5 h-12 w-full rounded-2xl bg-[var(--brand-primary)] text-[15px] font-semibold disabled:opacity-60"
        style="color: #ffffff"
        :disabled="isSubmitting"
        @click="submit">
        {{ isSubmitting ? '加入中...' : '加入家庭' }}
      </button>
    </div>

    <p class="mt-6 text-center text-xs leading-6 text-[var(--text-tertiary)]">
      还没有邀请码？<br />让宝宝的家长在 App 中生成
    </p>

    <van-dialog v-model:show="showJoinedDialog" :show-confirm-button="false" close-on-click-overlay>
      <div v-if="joinedBaby" class="p-6 text-center">
        <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--formula-icon-bg)]">
          <img v-if="joinedBaby.avatarUrl" :src="joinedBaby.avatarUrl" class="h-full w-full object-cover" />
          <Baby v-else :size="32" color="var(--brand-primary)" />
        </div>
        <h2 class="text-lg font-bold text-[var(--text-primary)]">你已加入 {{ joinedBaby.name }} 的家庭</h2>
        <p class="mt-2 text-sm text-[var(--text-tertiary)]">记录人：{{ joinedBaby.owner?.nickname || '宝宝家长' }}</p>
        <button
          class="press mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-primary)] text-sm font-semibold text-white"
          @click="router.push('/')">
          <Home :size="16" />
          进入首页
        </button>
      </div>
    </van-dialog>
  </div>
</template>
