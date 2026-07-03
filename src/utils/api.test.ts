import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: (key: string) => localStorageMock.store[key] || null,
  setItem: (key: string, value: string) => { localStorageMock.store[key] = value; },
  removeItem: (key: string) => { delete localStorageMock.store[key]; },
  clear: () => { localStorageMock.store = {}; }
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock showToast
vi.mock('vant', () => ({
  showToast: vi.fn()
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
});

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch });

describe('API Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Token Management', () => {
    it('getAccessToken 应从 localStorage 获取', async () => {
      const { getAccessToken } = await import('./api');
      localStorageMock.store['babystar_access_token'] = 'test-token';
      expect(getAccessToken()).toBe('test-token');
    });

    it('getRefreshToken 应从 localStorage 获取', async () => {
      const { getRefreshToken } = await import('./api');
      localStorageMock.store['babystar_refresh_token'] = 'test-refresh';
      expect(getRefreshToken()).toBe('test-refresh');
    });

    it('saveAuthTokens 应保存到 localStorage', async () => {
      const { saveAuthTokens, getAccessToken, getRefreshToken } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      expect(getAccessToken()).toBe('access-1');
      expect(getRefreshToken()).toBe('refresh-1');
    });

    it('clearAuthTokens 应清除 localStorage 中的 token', async () => {
      const { clearAuthTokens, saveAuthTokens, getAccessToken, getRefreshToken } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      clearAuthTokens();
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('getBabyId', () => {
    it('应优先从 current_baby_id 获取', async () => {
      const { getBabyId } = await import('./api');
      localStorageMock.store['current_baby_id'] = 'baby-current';
      expect(getBabyId()).toBe('baby-current');
    });

    it('应从 baby_profile 获取', async () => {
      const { getBabyId } = await import('./api');
      localStorageMock.store['baby_profile'] = JSON.stringify({ id: 'baby-profile' });
      expect(getBabyId()).toBe('baby-profile');
    });

    it('应返回默认值', async () => {
      const { getBabyId } = await import('./api');
      expect(getBabyId()).toBe('00000000-0000-0000-0000-000000000101');
    });
  });

  describe('formatDateValue', () => {
    it('应格式化日期为 YYYY-MM-DD', async () => {
      const { formatDateValue } = await import('./api');
      const date = new Date('2024-01-15T12:34:56Z');
      expect(formatDateValue(date)).toBe('2024-01-15');
    });
  });

  describe('Auth API', () => {
    it('login 成功应保存 token', async () => {
      const { login } = await import('./api');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: 'access-login',
          refreshToken: 'refresh-login',
          user: { id: 'user-1', phone: '13812345678' }
        })
      });

      const result = await login('13812345678', 'password');
      expect(result.user.id).toBe('user-1');
      expect(localStorageMock.store['babystar_access_token']).toBe('access-login');
    });

    it('login 失败应抛出错误', async () => {
      const { login } = await import('./api');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => '登录失败'
      });

      await expect(login('13812345678', 'wrong')).rejects.toThrow();
    });

    it('register 成功应保存 token', async () => {
      const { register } = await import('./api');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: 'access-register',
          refreshToken: 'refresh-register',
          user: { id: 'user-2', phone: '13912345678' }
        })
      });

      const result = await register('13912345678', 'password', '爸爸');
      expect(result.user.id).toBe('user-2');
      expect(localStorageMock.store['babystar_access_token']).toBe('access-register');
    });

    it('getMe 成功应返回用户信息', async () => {
      const { getMe, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1', phone: '13812345678' })
      });

      const user = await getMe();
      expect(user.id).toBe('user-1');
    });

    it('logout 应清除 token', async () => {
      const { logout, saveAuthTokens, getAccessToken } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      await logout();
      expect(getAccessToken()).toBeNull();
    });

    it('checkAndRefreshAuth 有 access token 返回 true', async () => {
      const { checkAndRefreshAuth, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      expect(await checkAndRefreshAuth()).toBe(true);
    });
  });

  describe('Record API', () => {
    it('submitRecord 成功应返回 true', async () => {
      const { submitRecord, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const success = await submitRecord({
        event_type: '奶粉喂养',
        timestamp: '2024-01-01T10:00:00.000Z',
        amount: 120
      });

      expect(success).toBe(true);
    });

    it('submitRecord 失败应保存到 pending', async () => {
      const { submitRecord, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockRejectedValueOnce(new Error('网络错误'));

      const success = await submitRecord({
        clientId: 'pending-1',
        event_type: '奶粉喂养',
        timestamp: '2024-01-01T10:00:00.000Z',
        amount: 120
      });

      expect(success).toBe(false);
      const pending = JSON.parse(localStorageMock.store['pending_records'] || '[]');
      expect(pending).toHaveLength(1);
    });

    it('updateRecord 成功应返回 true', async () => {
      const { updateRecord, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const success = await updateRecord({
        clientId: 'record-1',
        event_type: '奶粉喂养',
        timestamp: '2024-01-01T10:00:00.000Z',
        amount: 150
      });

      expect(success).toBe(true);
    });

    it('undoRecord 成功应返回 true', async () => {
      const { undoRecord, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const success = await undoRecord({
        clientId: 'record-1',
        event_type: '奶粉喂养',
        timestamp: '2024-01-01T10:00:00.000Z',
        amount: 120
      });

      expect(success).toBe(true);
    });

    it('syncPendingRecords 成功应移除已同步的', async () => {
      const { syncPendingRecords, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      localStorageMock.store['pending_records'] = JSON.stringify([
        { clientId: 'pending-1', event_type: '奶粉喂养', timestamp: '2024-01-01T10:00:00.000Z', amount: 120 },
        { clientId: 'pending-2', event_type: '拉尿', timestamp: '2024-01-01T11:00:00.000Z' }
      ]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: ['pending-1'] })
      });

      await syncPendingRecords();

      const pending = JSON.parse(localStorageMock.store['pending_records'] || '[]');
      expect(pending).toHaveLength(1);
      expect(pending[0].clientId).toBe('pending-2');
    });

    it('fetchDailyStats 成功应返回统计数据', async () => {
      const { fetchDailyStats, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2024-01-15',
          formulaAmount: 360,
          breastDuration: 0,
          poopCount: 2,
          peeCount: 5,
          sleepDuration: 720,
          sleepCount: 3
        })
      });

      const stats = await fetchDailyStats('2024-01-15');
      expect(stats.date).toBe('2024-01-15');
      expect(stats.formulaAmount).toBe(360);
    });

    it('fetchDailyRecords 成功应返回记录列表', async () => {
      const { fetchDailyRecords, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { clientId: 'r1', eventType: 'formula', happenedAt: '2024-01-15T10:00:00.000Z', amount: 120 }
          ]
        })
      });

      const records = await fetchDailyRecords('2024-01-15');
      expect(records).toHaveLength(1);
      expect(records[0].event_type).toBe('奶粉喂养');
    });

    it('getLastSleep 成功应返回最后睡眠记录', async () => {
      const { getLastSleep, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clientId: 'sleep-1',
          eventType: 'sleep',
          happenedAt: '2024-01-15T10:00:00.000Z',
          duration: 60
        })
      });

      const record = await getLastSleep('baby-1');
      expect(record?.event_type).toBe('睡眠');
    });

    it('getLastSleep 无记录返回 null', async () => {
      const { getLastSleep, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const record = await getLastSleep('baby-1');
      expect(record).toBeNull();
    });

    it('getActiveSleep 成功应返回活动睡眠记录', async () => {
      const { getActiveSleep, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          clientId: 'active-1',
          eventType: 'sleep',
          happenedAt: '2024-01-15T10:00:00.000Z'
        })
      });

      const record = await getActiveSleep('baby-1');
      expect(record?.event_type).toBe('睡眠');
    });

    it('getActiveSleep 无记录返回 null', async () => {
      const { getActiveSleep, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      localStorageMock.store['current_baby_id'] = 'baby-1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      const record = await getActiveSleep('baby-1');
      expect(record).toBeNull();
    });
  });

  describe('Baby API', () => {
    it('createBaby 成功应返回宝宝信息', async () => {
      const { createBaby, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'baby-new',
          name: '小星星',
          birthday: '2024-01-01',
          gender: 'male',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        })
      });

      const baby = await createBaby({
        name: '小星星',
        birthday: '2024-01-01',
        gender: 'male'
      });

      expect(baby.id).toBe('baby-new');
      expect(baby.name).toBe('小星星');
    });

    it('getBaby 成功应返回宝宝信息', async () => {
      const { getBaby, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'baby-1',
          name: '小星星',
          birthday: '2024-01-01',
          gender: 'male',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        })
      });

      const baby = await getBaby('baby-1');
      expect(baby.id).toBe('baby-1');
    });

    it('updateBaby 成功应返回更新后的宝宝信息', async () => {
      const { updateBaby, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'baby-1',
          name: '小月亮',
          birthday: '2024-01-01',
          gender: 'male',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        })
      });

      const baby = await updateBaby('baby-1', { name: '小月亮' });
      expect(baby.name).toBe('小月亮');
    });

    it('getBabies 成功应返回宝宝列表', async () => {
      const { getBabies, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          { id: 'baby-1', name: '小星星', birthday: '2024-01-01', gender: 'male' }
        ])
      });

      const babies = await getBabies();
      expect(babies).toHaveLength(1);
    });

    it('apiGetAccessibleBabies 成功应返回可访问的宝宝列表', async () => {
      const { apiGetAccessibleBabies, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          babies: [
            { id: 'baby-1', name: '小星星', birthday: '2024-01-01', gender: 'male', relation: 'owner' }
          ]
        })
      });

      const result = await apiGetAccessibleBabies();
      expect(result.babies).toHaveLength(1);
    });
  });

  describe('Family API', () => {
    it('apiGenerateInviteCode 成功应返回邀请码', async () => {
      const { apiGenerateInviteCode, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'ABC123',
          expiresAt: '2024-01-08T00:00:00.000Z',
          usedCount: 0,
          maxUses: 10
        })
      });

      const code = await apiGenerateInviteCode('baby-1');
      expect(code.code).toBe('ABC123');
    });

    it('apiGetInviteCodes 成功应返回邀请码列表', async () => {
      const { apiGetInviteCodes, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          codes: [
            { code: 'ABC123', expiresAt: '2024-01-08T00:00:00.000Z', usedCount: 0, maxUses: 10 }
          ]
        })
      });

      const result = await apiGetInviteCodes('baby-1');
      expect(result.codes).toHaveLength(1);
    });

    it('apiRevokeInviteCode 成功应返回消息', async () => {
      const { apiRevokeInviteCode, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '已撤销' })
      });

      const result = await apiRevokeInviteCode('ABC123');
      expect(result.message).toBe('已撤销');
    });

    it('apiJoinByCode 成功应返回加入结果', async () => {
      const { apiJoinByCode, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          baby: { id: 'baby-1', name: '小星星' },
          role: 'member',
          joinedAt: '2024-01-01T00:00:00.000Z'
        })
      });

      const result = await apiJoinByCode('ABC123');
      expect(result.baby.id).toBe('baby-1');
    });

    it('apiGetMembers 成功应返回成员列表', async () => {
      const { apiGetMembers, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          members: [
            { id: 'm1', user: { id: 'user-1' }, role: 'owner', isOwner: true, joinedAt: '2024-01-01T00:00:00.000Z' }
          ]
        })
      });

      const result = await apiGetMembers('baby-1');
      expect(result.members).toHaveLength(1);
    });

    it('apiChangeRole 成功应返回消息', async () => {
      const { apiChangeRole, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '已更新' })
      });

      const result = await apiChangeRole('m1', 'admin');
      expect(result.message).toBe('已更新');
    });

    it('apiRemoveMember 成功应返回消息', async () => {
      const { apiRemoveMember, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '已移除' })
      });

      const result = await apiRemoveMember('m1');
      expect(result.message).toBe('已移除');
    });

    it('apiLeave 成功应返回消息', async () => {
      const { apiLeave, saveAuthTokens } = await import('./api');
      saveAuthTokens('access-1', 'refresh-1');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '已退出' })
      });

      const result = await apiLeave('baby-1');
      expect(result.message).toBe('已退出');
    });
  });
});
