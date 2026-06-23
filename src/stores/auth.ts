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

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const isLoading = ref(false);
  const isReady = ref(false);

  const isLoggedIn = computed(() => !!getAccessToken() && !!user.value);

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
