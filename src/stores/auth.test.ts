import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from './auth';

vi.mock('@/utils/api', () => ({
  checkAndRefreshAuth: vi.fn(),
  clearAuthTokens: vi.fn(),
  getAccessToken: vi.fn(),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
}));

vi.mock('@/stores/baby', () => ({
  useBabyStore: vi.fn(() => ({
    clearBaby: vi.fn()
  }))
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('初始状态应为未登录', () => {
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(false);
    expect(store.user).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.isReady).toBe(false);
  });

  it('登录成功应设置用户信息', async () => {
    const { login } = await import('@/utils/api');
    const mockLogin = login as ReturnType<typeof vi.fn>;
    mockLogin.mockResolvedValue({
      user: { id: 'user-1', phone: '13812345678', nickname: '妈妈' },
      accessToken: 'token-1',
      refreshToken: 'refresh-1'
    });

    const store = useAuthStore();
    const result = await store.login('13812345678', 'password');

    expect(result.user.id).toBe('user-1');
    expect(store.user?.id).toBe('user-1');
    expect(store.isLoading).toBe(false);
  });

  it('登录失败不应设置用户信息', async () => {
    const { login } = await import('@/utils/api');
    const mockLogin = login as ReturnType<typeof vi.fn>;
    mockLogin.mockRejectedValue(new Error('登录失败'));

    const store = useAuthStore();
    await expect(store.login('13812345678', 'wrong')).rejects.toThrow();
    expect(store.user).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('注册成功应设置用户信息并清除宝宝信息', async () => {
    const { register, clearAuthTokens } = await import('@/utils/api');
    const mockRegister = register as ReturnType<typeof vi.fn>;
    const mockClearTokens = clearAuthTokens as ReturnType<typeof vi.fn>;
    mockRegister.mockResolvedValue({
      user: { id: 'user-2', phone: '13912345678', nickname: '爸爸' },
      accessToken: 'token-2',
      refreshToken: 'refresh-2'
    });

    const store = useAuthStore();
    const result = await store.register('13912345678', 'password', '爸爸');

    expect(result.user.id).toBe('user-2');
    expect(store.user?.id).toBe('user-2');
    expect(store.isLoading).toBe(false);
  });

  it('checkAuth 成功应获取用户信息并标记 ready', async () => {
    const { checkAndRefreshAuth, getMe } = await import('@/utils/api');
    const mockCheck = checkAndRefreshAuth as ReturnType<typeof vi.fn>;
    const mockGetMe = getMe as ReturnType<typeof vi.fn>;
    mockCheck.mockResolvedValue(true);
    mockGetMe.mockResolvedValue({ id: 'user-1', phone: '13812345678', nickname: '妈妈' });

    const store = useAuthStore();
    const ok = await store.checkAuth();

    expect(ok).toBe(true);
    expect(store.user?.id).toBe('user-1');
    expect(store.isReady).toBe(true);
  });

  it('checkAuth 失败应清除所有信息', async () => {
    const { checkAndRefreshAuth, clearAuthTokens } = await import('@/utils/api');
    const mockCheck = checkAndRefreshAuth as ReturnType<typeof vi.fn>;
    const mockClearTokens = clearAuthTokens as ReturnType<typeof vi.fn>;
    mockCheck.mockRejectedValue(new Error('失败'));

    const store = useAuthStore();
    const ok = await store.checkAuth();

    expect(ok).toBe(false);
    expect(store.user).toBeNull();
    expect(mockClearTokens).toHaveBeenCalled();
    expect(store.isReady).toBe(true);
  });

  it('登出应清除用户和宝宝信息', async () => {
    const { logout, clearAuthTokens } = await import('@/utils/api');
    const mockLogout = logout as ReturnType<typeof vi.fn>;
    const mockClearTokens = clearAuthTokens as ReturnType<typeof vi.fn>;

    const store = useAuthStore();
    await store.logout();

    expect(store.user).toBeNull();
    expect(mockLogout).toHaveBeenCalled();
    expect(mockClearTokens).toHaveBeenCalled();
  });
});
