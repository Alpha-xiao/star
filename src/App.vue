<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { syncPendingRecords } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';
import { useThemeStore } from '@/stores/theme';

/**
 * 根组件负责承载页面转场、底部导航和应用级离线同步触发。
 * 登录态与宝宝档案的判定仍交给路由守卫和对应 Store 处理。
 */
const route = useRoute();
const authStore = useAuthStore();
const babyStore = useBabyStore();
const themeStore = useThemeStore();

// 应用启动时立即初始化主题，避免首屏闪烁
themeStore.init();

const active = computed(() => {
  if (route.path === '/stats') return 1;
  if (route.path === '/profile') return 2;
  return 0;
});

const showTabbar = computed(() => {
  return !['/login', '/register', '/profile/create', '/family', '/family/join'].includes(route.path);
});

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await babyStore.loadAccessibleBabies();
    // 启动和网络恢复时重试离线暂存记录，保持本地先记、后端后同步的链路。
    syncPendingRecords();
    window.addEventListener('online', syncPendingRecords);
  }
});
</script>

<template>
  <div class="relative mx-auto min-h-screen max-w-[430px] bg-[var(--bg-color)]">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <van-tabbar
      v-show="showTabbar"
      :model-value="active"
      route
      active-color="var(--brand-primary)"
      class="border-t border-t-[var(--border-light)]">
      <van-tabbar-item replace to="/" icon="edit">记录</van-tabbar-item>
      <van-tabbar-item replace to="/stats" icon="chart-trending-o">统计</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="contact-o">档案</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:root {
  --van-primary-color: var(--brand-primary);
  --van-button-default-border-color: var(--brand-primary);
  --van-action-sheet-max-height: 70%;
  --van-tabbar-background: var(--surface-card);
  --van-tabbar-item-font-size: 11px;
  --van-tabbar-height: 56px;
  --van-cell-background: var(--surface-card);
  --van-cell-text-color: var(--text-primary);
  --van-background: var(--surface-page);
  --van-background-2: var(--surface-card);
  --van-text-color: var(--text-primary);
  --van-text-color-2: var(--text-secondary);
  --van-text-color-3: var(--text-tertiary);
  --van-border-color: var(--border-light);
  --van-dialog-background: var(--surface-card);
  --van-dialog-header-text-color: var(--text-primary);
  --van-popup-background: var(--surface-card);
  --van-field-input-text-color: var(--text-primary);
  --van-field-placeholder-text-color: var(--text-disabled);
  --van-action-sheet-item-background: var(--surface-card);
  --van-picker-background: var(--surface-card);
  --van-loading-text-color: var(--text-secondary);
}
</style>
