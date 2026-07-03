import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFamilyStore } from './family';

const mockLoadAccessibleBabies = vi.fn();
const mockSwitchBaby = vi.fn();

vi.mock('@/utils/api', () => ({
  apiChangeRole: vi.fn(),
  apiGenerateInviteCode: vi.fn(),
  apiGetInviteCodes: vi.fn(),
  apiGetMembers: vi.fn(),
  apiJoinByCode: vi.fn(),
  apiLeave: vi.fn(),
  apiRemoveMember: vi.fn(),
  apiRevokeInviteCode: vi.fn()
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', phone: '13812345678', nickname: '妈妈' }
  }))
}));

vi.mock('@/stores/baby', () => ({
  useBabyStore: vi.fn(() => ({
    loadAccessibleBabies: mockLoadAccessibleBabies,
    switchBaby: mockSwitchBaby
  }))
}));

describe('useFamilyStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('初始状态成员和邀请码应为空', () => {
    const store = useFamilyStore();
    expect(store.members).toEqual([]);
    expect(store.inviteCodes).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.memberCount).toBe(0);
    expect(store.hasMembers).toBe(false);
  });

  it('fetchMembers 成功应更新成员列表', async () => {
    const { apiGetMembers } = await import('@/utils/api');
    const mockGetMembers = apiGetMembers as ReturnType<typeof vi.fn>;
    mockGetMembers.mockResolvedValue({
      members: [
        { id: 'm1', user: { id: 'user-1' }, role: 'owner', isOwner: true, joinedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'm2', user: { id: 'user-2' }, role: 'member', isOwner: false, joinedAt: '2024-01-02T00:00:00.000Z' }
      ]
    });

    const store = useFamilyStore();
    await store.fetchMembers('baby-1');

    expect(store.members).toHaveLength(2);
    expect(store.memberCount).toBe(2);
    expect(store.hasMembers).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('generateInviteCode 成功应添加到列表头部', async () => {
    const { apiGenerateInviteCode } = await import('@/utils/api');
    const mockGenerate = apiGenerateInviteCode as ReturnType<typeof vi.fn>;
    mockGenerate.mockResolvedValue({ code: 'ABC123', expiresAt: '2024-01-08T00:00:00.000Z', usedCount: 0, maxUses: 10 });

    const store = useFamilyStore();
    store.inviteCodes = [{ code: 'OLD123', expiresAt: '2024-01-07T00:00:00.000Z', usedCount: 0, maxUses: 10 }];
    const result = await store.generateInviteCode('baby-1');

    expect(result.code).toBe('ABC123');
    expect(store.inviteCodes).toHaveLength(2);
    expect(store.inviteCodes[0].code).toBe('ABC123');
  });

  it('fetchInviteCodes 成功应更新邀请码列表', async () => {
    const { apiGetInviteCodes } = await import('@/utils/api');
    const mockGetCodes = apiGetInviteCodes as ReturnType<typeof vi.fn>;
    mockGetCodes.mockResolvedValue({
      codes: [
        { code: 'ABC123', expiresAt: '2024-01-08T00:00:00.000Z', usedCount: 0, maxUses: 10 }
      ]
    });

    const store = useFamilyStore();
    await store.fetchInviteCodes('baby-1');

    expect(store.inviteCodes).toHaveLength(1);
  });

  it('revokeInviteCode 成功应从列表移除', async () => {
    const { apiRevokeInviteCode } = await import('@/utils/api');
    const mockRevoke = apiRevokeInviteCode as ReturnType<typeof vi.fn>;
    mockRevoke.mockResolvedValue({ message: 'OK' });

    const store = useFamilyStore();
    store.inviteCodes = [
      { code: 'ABC123', expiresAt: '2024-01-08T00:00:00.000Z', usedCount: 0, maxUses: 10 },
      { code: 'DEF456', expiresAt: '2024-01-09T00:00:00.000Z', usedCount: 0, maxUses: 10 }
    ];
    await store.revokeInviteCode('ABC123');

    expect(mockRevoke).toHaveBeenCalledWith('ABC123');
    expect(store.inviteCodes).toHaveLength(1);
    expect(store.inviteCodes[0].code).toBe('DEF456');
  });

  it('joinByCode 成功应切换到新宝宝', async () => {
    const { apiJoinByCode } = await import('@/utils/api');
    const mockJoin = apiJoinByCode as ReturnType<typeof vi.fn>;
    mockJoin.mockResolvedValue({
      baby: { id: 'baby-new', name: '小星星' },
      role: 'member',
      joinedAt: '2024-01-01T00:00:00.000Z'
    });

    const store = useFamilyStore();
    const result = await store.joinByCode('ABC123');

    expect(result.baby.id).toBe('baby-new');
    expect(mockLoadAccessibleBabies).toHaveBeenCalled();
    expect(mockSwitchBaby).toHaveBeenCalledWith('baby-new');
  });

  it('changeRole 成功应更新成员角色', async () => {
    const { apiChangeRole } = await import('@/utils/api');
    const mockChange = apiChangeRole as ReturnType<typeof vi.fn>;
    mockChange.mockResolvedValue({ message: 'OK' });

    const store = useFamilyStore();
    store.members = [
      { id: 'm1', user: { id: 'user-2' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    await store.changeRole('m1', 'admin');

    expect(mockChange).toHaveBeenCalledWith('m1', 'admin');
    expect(store.members[0].role).toBe('admin');
  });

  it('removeMember 成功应从列表移除', async () => {
    const { apiRemoveMember } = await import('@/utils/api');
    const mockRemove = apiRemoveMember as ReturnType<typeof vi.fn>;
    mockRemove.mockResolvedValue({ message: 'OK' });

    const store = useFamilyStore();
    store.members = [
      { id: 'm1', user: { id: 'user-2' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'm2', user: { id: 'user-3' }, role: 'viewer', isOwner: false, joinedAt: '2024-01-02T00:00:00.000Z' }
    ];
    await store.removeMember('m1');

    expect(mockRemove).toHaveBeenCalledWith('m1');
    expect(store.members).toHaveLength(1);
    expect(store.members[0].id).toBe('m2');
  });

  it('leave 成功应重置并重新加载宝宝', async () => {
    const { apiLeave } = await import('@/utils/api');
    const mockLeave = apiLeave as ReturnType<typeof vi.fn>;
    mockLeave.mockResolvedValue({ message: 'OK' });

    const store = useFamilyStore();
    store.members = [{ id: 'm1', user: { id: 'user-2' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }];
    await store.leave('baby-1');

    expect(mockLeave).toHaveBeenCalledWith('baby-1');
    expect(store.members).toEqual([]);
    expect(mockLoadAccessibleBabies).toHaveBeenCalled();
  });

  it('reset 应清空成员和邀请码', () => {
    const store = useFamilyStore();
    store.members = [{ id: 'm1', user: { id: 'user-2' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }];
    store.inviteCodes = [{ code: 'ABC123', expiresAt: '2024-01-08T00:00:00.000Z', usedCount: 0, maxUses: 10 }];

    store.reset();

    expect(store.members).toEqual([]);
    expect(store.inviteCodes).toEqual([]);
  });

  it('myRole 应为 owner 当用户是所有者', () => {
    const store = useFamilyStore();
    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'owner', isOwner: true, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.myRole).toBe('owner');
  });

  it('canManageMembers 对于 owner 和 admin 为 true', () => {
    const store = useFamilyStore();
    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'owner', isOwner: true, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canManageMembers).toBe(true);

    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'admin', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canManageMembers).toBe(true);

    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canManageMembers).toBe(false);
  });

  it('canRecord 对于 owner, admin, member 为 true', () => {
    const store = useFamilyStore();
    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'owner', isOwner: true, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canRecord).toBe(true);

    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'admin', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canRecord).toBe(true);

    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'member', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canRecord).toBe(true);

    store.members = [
      { id: 'm1', user: { id: 'user-1' }, role: 'viewer', isOwner: false, joinedAt: '2024-01-01T00:00:00.000Z' }
    ];
    expect(store.canRecord).toBe(false);
  });
});
