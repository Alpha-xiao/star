import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Baby } from '@/types/baby';
import { createBaby as createBabyApi, getBabies, updateBaby as updateBabyApi } from '@/utils/api';

export const useBabyStore = defineStore('baby', () => {
  const baby = ref<Baby | null>(null);
  const isLoading = ref(false);

  // 从 localStorage 初始化
  const saved = localStorage.getItem('baby_profile');
  if (saved) {
    try {
      baby.value = JSON.parse(saved);
    } catch {
      baby.value = null;
    }
  }

  /** 是否已有宝宝档案 */
  const hasProfile = computed(() => !!baby.value);

  /** 出生天数 */
  const ageInDays = computed(() => {
    if (!baby.value?.birthday) return null;
    const birth = new Date(`${baby.value.birthday}T00:00:00+08:00`);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / 86400000);
  });

  /** 年龄文案 */
  const ageText = computed(() => {
    const days = ageInDays.value;
    if (days === null) return '';
    if (days < 30) return `${days}天`;
    const months = Math.floor(days / 30);
    const remainDays = days % 30;
    if (months < 12) return remainDays > 0 ? `${months}个月${remainDays}天` : `${months}个月`;
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`;
  });

  /** 持久化到 localStorage */
  const saveToLocal = () => {
    if (baby.value) {
      localStorage.setItem('baby_profile', JSON.stringify(baby.value));
    } else {
      localStorage.removeItem('baby_profile');
    }
  };

  /** 清除本地宝宝档案缓存 */
  const clearBaby = () => {
    baby.value = null;
    saveToLocal();
  };

  /** 从后端加载宝宝档案 */
  const loadBaby = async () => {
    isLoading.value = true;
    try {
      const list = await getBabies();
      baby.value = list[0] || null;
      saveToLocal();
    } catch (e) {
      console.error('加载宝宝档案失败', e);
    } finally {
      isLoading.value = false;
    }
  };

  /** 创建宝宝档案 */
  const createBaby = async (data: Partial<Baby>) => {
    isLoading.value = true;
    try {
      const result = await createBabyApi(data);
      baby.value = result;
      saveToLocal();
      return result;
    } finally {
      isLoading.value = false;
    }
  };

  /** 更新宝宝档案 */
  const updateBaby = async (data: Partial<Baby>) => {
    if (!baby.value) return;
    isLoading.value = true;
    try {
      const result = await updateBabyApi(baby.value.id, data);
      baby.value = result;
      saveToLocal();
      return result;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    baby,
    hasProfile,
    ageInDays,
    ageText,
    isLoading,
    clearBaby,
    loadBaby,
    createBaby,
    updateBaby
  };
});
