import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Baby } from '@/types/baby';
import {
  apiGetAccessibleBabies,
  createBaby as createBabyApi,
  getBaby as getBabyApi,
  updateBaby as updateBabyApi,
  type AccessibleBaby
} from '@/utils/api';

/**
 * 宝宝档案 Store。
 *
 * 维护当前选中的宝宝、可访问宝宝列表以及基于家庭角色推导出的权限。
 * 当前宝宝 ID 与档案会缓存在 localStorage，保证刷新后能快速恢复页面状态。
 */
export const useBabyStore = defineStore('baby', () => {
  const baby = ref<Baby | null>(null);
  const accessibleBabies = ref<AccessibleBaby[]>([]);
  const currentBabyId = ref<string | null>(localStorage.getItem('current_baby_id'));
  const isLoading = ref(false);

  // 启动时先使用 localStorage 档案做首屏兜底，后续再由接口刷新为最新数据。
  const saved = localStorage.getItem('baby_profile');
  if (saved) {
    try {
      baby.value = JSON.parse(saved);
      currentBabyId.value = currentBabyId.value || baby.value?.id || null;
    } catch {
      baby.value = null;
    }
  }

  /** 是否有可访问的宝宝 */
  const hasAccessibleBaby = computed(() => accessibleBabies.value.length > 0 || !!baby.value);

  /** 是否已有宝宝档案 */
  const hasProfile = computed(() => hasAccessibleBaby.value);

  /** 当前宝宝的访问关系 */
  const currentAccess = computed(() => {
    return accessibleBabies.value.find((item) => item.id === currentBabyId.value) || null;
  });

  /** 当前宝宝下的家庭角色 */
  const currentRole = computed(() => currentAccess.value?.relation || (baby.value ? 'owner' : null));

  /** 当前宝宝是否由自己创建 */
  const isOwnedBaby = computed(() => currentRole.value === 'owner');

  /** 是否可以新增护理记录：创建者、管理员、记录者可写，只读成员不可写 */
  const canRecord = computed(() => ['owner', 'admin', 'member'].includes(currentRole.value || ''));

  /** 是否可以编辑宝宝档案：创建者和管理员拥有管理权限 */
  const canManageBaby = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin');

  /** 是否可以管理家庭成员：创建者和管理员可邀请、改角色、移除成员 */
  const canManageFamily = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin');

  /** 是否为只读成员 */
  const isReadOnly = computed(() => currentRole.value === 'viewer');

  /** 出生天数：用东八区零点解析生日，避免 UTC 日期转换导致天数偏差 */
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

  /** 持久化到 localStorage：同时保存当前宝宝档案和当前选择 ID */
  const saveToLocal = () => {
    if (baby.value) {
      localStorage.setItem('baby_profile', JSON.stringify(baby.value));
      localStorage.setItem('current_baby_id', baby.value.id);
    } else {
      localStorage.removeItem('baby_profile');
      localStorage.removeItem('current_baby_id');
    }
  };

  /** 清除本地宝宝档案缓存 */
  const clearBaby = () => {
    baby.value = null;
    accessibleBabies.value = [];
    currentBabyId.value = null;
    saveToLocal();
  };

  /** 按 currentBabyId 加载宝宝档案 */
  const loadBaby = async () => {
    isLoading.value = true;
    try {
      if (!currentBabyId.value) {
        await loadAccessibleBabies();
        return;
      }
      baby.value = await getBabyApi(currentBabyId.value);
      saveToLocal();
    } catch (e) {
      console.error('加载宝宝档案失败', e);
    } finally {
      isLoading.value = false;
    }
  };

  /** 加载当前用户可访问的宝宝列表，并确保 currentBabyId 指向仍有权限访问的宝宝 */
  const loadAccessibleBabies = async () => {
    isLoading.value = true;
    try {
      const res = await apiGetAccessibleBabies();
      accessibleBabies.value = res.babies;

      if (res.babies.length > 0) {
        const valid = res.babies.find((item) => item.id === currentBabyId.value);
        const nextBabyId = valid?.id || res.babies[0].id;
        currentBabyId.value = nextBabyId;
        localStorage.setItem('current_baby_id', nextBabyId);
        baby.value = await getBabyApi(nextBabyId);
        saveToLocal();
      } else {
        baby.value = null;
        currentBabyId.value = null;
        saveToLocal();
      }
    } catch (e) {
      console.error('加载可访问宝宝列表失败', e);
    } finally {
      isLoading.value = false;
    }
  };

  /** 切换当前宝宝 */
  const switchBaby = async (babyId: string) => {
    currentBabyId.value = babyId;
    localStorage.setItem('current_baby_id', babyId);
    await loadBaby();
  };

  /** 创建宝宝档案 */
  const createBaby = async (data: Partial<Baby>) => {
    isLoading.value = true;
    try {
      const result = await createBabyApi(data);
      baby.value = result;
      currentBabyId.value = result.id;
      saveToLocal();
      await loadAccessibleBabies();
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
      await loadAccessibleBabies();
      return result;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    baby,
    accessibleBabies,
    currentBabyId,
    hasProfile,
    hasAccessibleBaby,
    currentAccess,
    currentRole,
    isOwnedBaby,
    canRecord,
    canManageBaby,
    canManageFamily,
    isReadOnly,
    ageInDays,
    ageText,
    isLoading,
    clearBaby,
    loadBaby,
    loadAccessibleBabies,
    switchBaby,
    createBaby,
    updateBaby
  };
});
