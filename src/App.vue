<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { syncPendingRecords } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';

const route = useRoute();
const authStore = useAuthStore();
const babyStore = useBabyStore();

const active = computed(() => (route.path === '/stats' ? 1 : 0));

const showTabbar = computed(() => {
  return !['/login', '/register', '/profile', '/profile/create'].includes(route.path);
});

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await babyStore.loadBaby();
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
  --van-tabbar-background: #ffffff;
  --van-tabbar-item-font-size: 11px;
  --van-tabbar-height: 56px;
}
</style>
