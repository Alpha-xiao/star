import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  checkAndRefreshAuth,
  clearAuthTokens,
  getAccessToken,
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  type AuthUser
} from '@/utils/api';
import { useBabyStore } from '@/stores/baby';

/**
 * 登录态 Store。
 *
 * 负责把鉴权 token 与当前用户信息同步起来；宝宝档案属于用户维度，
 * 因此注册、鉴权失败和退出时会同步清理宝宝缓存，避免串号展示。
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const isLoading = ref(false);
  const isReady = ref(false);

  /** 只有 token 与用户信息都存在时才视为已登录。 */
  const isLoggedIn = computed(() => !!getAccessToken() && !!user.value);

  /** 登录成功后写入当前用户；token 保存由 API 层统一处理。 */
  const login = async (phone: string, password: string) => {
    isLoading.value = true;
    try {
      const result = await loginApi(phone, password);
      user.value = result.user;
      return result;
    } finally {
      isLoading.value = false;
    }
  };

  /** 注册新账号后清空可能残留的旧宝宝缓存，再进入建档流程。 */
  const register = async (phone: string, password: string, nickname?: string) => {
    isLoading.value = true;
    try {
      const result = await registerApi(phone, password, nickname);
      useBabyStore().clearBaby();
      user.value = result.user;
      return result;
    } finally {
      isLoading.value = false;
    }
  };

  /** 应用启动时恢复登录态，支持 accessToken 缺失但 refreshToken 仍有效的场景。 */
  const checkAuth = async () => {
    isLoading.value = true;
    try {
      const ok = await checkAndRefreshAuth();
      if (ok) user.value = await getMe();
      return ok;
    } catch {
      user.value = null;
      useBabyStore().clearBaby();
      clearAuthTokens();
      return false;
    } finally {
      isLoading.value = false;
      isReady.value = true;
    }
  };

  /** 退出登录时无论后端请求是否成功，都清理前端用户、宝宝与 token 缓存。 */
  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      user.value = null;
      useBabyStore().clearBaby();
      clearAuthTokens();
    }
  };

  return { user, isLoading, isReady, isLoggedIn, login, register, checkAuth, logout };
});
