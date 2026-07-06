<script setup lang="ts">
import { computed } from 'vue';
import { Baby, CircleDot, Droplets, Heart, Moon } from 'lucide-vue-next';
import type { BackfillType } from './backfill-form';
import { BACKFILL_TYPE_LABELS } from './backfill-form';

/**
 * 补录类型选择底部弹层
 *
 * 用于统计页顶部「＋补录」入口：先选类型再打开 BackfillDialog。
 */
defineProps<{ visible: boolean }>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'select', type: BackfillType): void;
}>();

/** 5 种可补录的记录类型，按设计文档顺序排列 */
const options = computed(() => [
  { type: 'formula' as BackfillType, icon: Baby, color: 'var(--formula-color)', bg: 'var(--formula-icon-bg)' },
  { type: 'breast' as BackfillType, icon: Heart, color: 'var(--breast-color)', bg: 'var(--breast-icon-bg)' },
  { type: 'urine' as BackfillType, icon: Droplets, color: 'var(--urine-color)', bg: 'var(--urine-icon-bg)' },
  { type: 'stool' as BackfillType, icon: CircleDot, color: 'var(--stool-color)', bg: 'var(--stool-icon-bg)' },
  { type: 'sleep' as BackfillType, icon: Moon, color: 'var(--sleep-color)', bg: 'var(--sleep-icon-bg)' }
]);

const onSelect = (type: BackfillType) => {
  emit('select', type);
  emit('update:visible', false);
};
</script>

<template>
  <van-action-sheet
    :show="visible"
    title="补录记录"
    cancel-text="取消"
    close-on-click-action
    teleport="body"
    @update:show="(value: boolean) => emit('update:visible', value)"
    @cancel="emit('update:visible', false)">
    <div class="pb-2">
      <button
        v-for="item in options"
        :key="item.type"
        class="press flex w-full items-center gap-3 border-b border-[var(--divider-color)] px-5 py-4 text-left last:border-b-0"
        type="button"
        @click="onSelect(item.type)">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-[12px]"
          :style="{ background: item.bg }">
          <component :is="item.icon" :size="20" :color="item.color" />
        </span>
        <span class="flex-1 text-[15px] font-semibold text-[var(--text-primary)]">
          {{ BACKFILL_TYPE_LABELS[item.type] }}
        </span>
        <span class="text-[var(--text-tertiary)]">›</span>
      </button>
    </div>
  </van-action-sheet>
</template>
