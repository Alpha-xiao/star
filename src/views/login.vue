<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Lock, Phone, Star } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';

/**
 * 登录页：完成账号登录后恢复宝宝档案，并根据 redirect 或建档状态决定落点。
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const babyStore = useBabyStore();

const phone = ref('');
const password = ref('');
const canSubmit = computed(() => /^1\d{10}$/.test(phone.value) && password.value.length >= 6);

const onSubmit = async () => {
  if (!canSubmit.value || authStore.isLoading) return;
  try {
    await authStore.login(phone.value, password.value);
    await babyStore.loadBaby();
    showToast('登录成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
    // 登录成功后优先回到被守卫拦截的原目标；没有宝宝档案则进入建档页。
    const target = redirect && redirect !== '/login' ? redirect : babyStore.hasProfile ? '/' : '/profile/create';
    console.log('target: ', target);
    window.location.replace(target);
  } catch {
    showToast({ message: '手机号或密码错误', type: 'fail' });
  }
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--bg-color)] px-6 pt-16 pb-8">
    <div class="mb-10 flex flex-col items-center">
      <div class="brand-logo mb-3 h-12 w-12">
        <Star :size="26" color="#fff" fill="#fff" />
      </div>
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">BabyStar</h1>
      <p class="mt-2 text-sm text-[var(--text-tertiary)]">登录后同步宝宝护理记录</p>
    </div>

    <div class="rounded-[var(--radius-large)] bg-white p-5 shadow-[var(--card-shadow)]">
      <label class="mb-2 block text-sm text-[var(--text-tertiary)]">手机号</label>
      <div class="mb-5 flex h-11 items-center gap-2 border-b border-[var(--border-light)]">
        <Phone :size="18" color="var(--brand-primary)" />
        <input v-model="phone" class="flex-1 bg-transparent outline-none" placeholder="请输入手机号" maxlength="11" />
      </div>

      <label class="mb-2 block text-sm text-[var(--text-tertiary)]">密码</label>
      <div class="flex h-11 items-center gap-2 border-b border-[var(--border-light)]">
        <Lock :size="18" color="var(--brand-primary)" />
        <input
          v-model="password"
          type="password"
          class="flex-1 bg-transparent outline-none"
          placeholder="至少 6 位密码" />
      </div>
    </div>

    <button class="btn-primary mt-6 press" :disabled="!canSubmit || authStore.isLoading" @click="onSubmit">登录</button>

    <button class="mt-5 text-sm font-semibold text-[var(--brand-primary)]" @click="router.push('/register')">
      还没有账号？去注册
    </button>
  </div>
</template>
