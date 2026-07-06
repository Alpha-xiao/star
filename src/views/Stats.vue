<script setup lang="ts">
import { ref } from 'vue';
import StatsDayView from './stats/stats-day-view.vue';
import StatsWeekView from './stats/stats-week-view.vue';
import StatsMonthView from './stats/stats-month-view.vue';

/**
 * 统计页容器：负责 日 / 周 / 月 三视图的 Tab 切换。
 *
 * 单日复盘保留原体验，周/月视图承载历史趋势和数据导出，
 * 三个视图都各自维护数据加载和补录/编辑逻辑，保持职责单一。
 */
type StatsView = 'day' | 'week' | 'month';

const activeView = ref<StatsView>('day');

const tabs: Array<{ key: StatsView; label: string }> = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' }
];
</script>

<template>
  <div class="flex h-[calc(100vh_-_var(--van-tabbar-height))] flex-col overflow-hidden bg-[var(--bg-color)] pt-5">
    <div class="mx-auto mb-4 flex gap-1 rounded-full bg-[var(--surface-card)] px-1 py-1 shadow-[var(--card-shadow)]">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="press min-w-[52px] rounded-full px-4 py-1.5 text-[13px] font-semibold transition"
        :class="
          activeView === tab.key
            ? 'bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(230,81,0,0.28)]'
            : 'text-[var(--text-secondary)]'
        "
        @click="activeView = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <StatsDayView v-if="activeView === 'day'" />
    <StatsWeekView v-else-if="activeView === 'week'" />
    <StatsMonthView v-else />
  </div>
</template>
