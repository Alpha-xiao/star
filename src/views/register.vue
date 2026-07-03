<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Lock, Phone, User } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

/**
 * 注册页：创建账号并立即进入首次宝宝建档流程。
 */
const router = useRouter();
const authStore = useAuthStore();

const phone = ref('');
const password = ref('');
const nickname = ref('');
/** 注册按钮可用性：手机号格式与密码长度都通过后才允许提交。 */
const canSubmit = computed(() => /^1\d{10}$/.test(phone.value) && password.value.length >= 6);

/** 注册成功后进入宝宝建档流程。 */
const onSubmit = async () => {
  if (!canSubmit.value || authStore.isLoading) return;
  try {
    await authStore.register(phone.value, password.value, nickname.value.trim() || undefined);
    showToast('注册成功');
    router.replace('/profile/create');
  } catch {
    showToast({ message: '注册失败，请检查手机号是否已注册', type: 'fail' });
  }
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--bg-color)] px-6 pt-16 pb-8">
    <div class="mb-10 text-center">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">创建账号</h1>
      <p class="mt-2 text-sm text-[var(--text-tertiary)]">注册后即可创建宝宝档案</p>
    </div>

    <div class="rounded-[var(--radius-large)] bg-white p-5 shadow-[var(--card-shadow)]">
      <label class="mb-2 block text-sm text-[var(--text-tertiary)]">昵称（选填）</label>
      <div class="mb-5 flex h-11 items-center gap-2 border-b border-[var(--border-light)]">
        <User :size="18" color="var(--brand-primary)" />
        <input v-model="nickname" class="flex-1 bg-transparent outline-none" placeholder="怎么称呼你" maxlength="20" />
      </div>

      <label class="mb-2 block text-sm text-[var(--text-tertiary)]">手机号</label>
      <div class="mb-5 flex h-11 items-center gap-2 border-b border-[var(--border-light)]">
        <Phone :size="18" color="var(--brand-primary)" />
        <input v-model="phone" class="flex-1 bg-transparent outline-none" placeholder="请输入手机号" maxlength="11" />
      </div>

      <label class="mb-2 block text-sm text-[var(--text-tertiary)]">密码</label>
      <div class="flex h-11 items-center gap-2 border-b border-[var(--border-light)]">
        <Lock :size="18" color="var(--brand-primary)" />
        <input v-model="password" type="password" class="flex-1 bg-transparent outline-none" placeholder="至少 6 位密码" />
      </div>
    </div>

    <button class="btn-primary mt-6 press" :disabled="!canSubmit || authStore.isLoading" @click="onSubmit">
      注册并继续
    </button>

    <button class="mt-5 text-sm font-semibold text-[var(--brand-primary)]" @click="router.push('/login')">
      已有账号？去登录
    </button>
  </div>
</template>
