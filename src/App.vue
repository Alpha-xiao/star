<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { syncPendingRecords } from '@/utils/api';

const active = ref(0);

onMounted(() => {
  // 页面加载时尝试同步暂存记录
  syncPendingRecords();
  
  // 监听网络在线状态
  window.addEventListener('online', syncPendingRecords);
});
</script>

<template>
  <div class="app-wrapper">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <van-tabbar v-model="active" route active-color="var(--primary-color)">
      <van-tabbar-item replace to="/" icon="edit">记录</van-tabbar-item>
      <van-tabbar-item replace to="/stats" icon="chart-trending-o">统计</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style>
.app-wrapper {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--bg-color);
  position: relative;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 全局覆盖 Vant 样式以匹配主题 */
:root {
  --van-primary-color: var(--primary-color);
  --van-button-default-border-color: var(--primary-color);
  --van-action-sheet-max-height: 70%;
}
</style>
