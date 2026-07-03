import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';
import {
  apiChangeRole,
  apiGenerateInviteCode,
  apiGetInviteCodes,
  apiGetMembers,
  apiJoinByCode,
  apiLeave,
  apiRemoveMember,
  apiRevokeInviteCode,
  type FamilyMember,
  type FamilyRole,
  type InviteCode,
  type JoinedResult
} from '@/utils/api';

/**
 * 家庭成员 Store。
 *
 * 集中维护当前宝宝的家庭成员、邀请码以及由成员角色推导出的操作权限。
 * 页面层只负责触发动作，成员移除、角色变更、加入家庭后的宝宝切换都在这里收口。
 */
export const useFamilyStore = defineStore('family', () => {
  const members = ref<FamilyMember[]>([]);
  const inviteCodes = ref<InviteCode[]>([]);
  const isLoading = ref(false);

  const memberCount = computed(() => members.value.length);
  const hasMembers = computed(() => members.value.length > 1);

  /** 当前登录用户在成员列表中的成员关系，用于推导页面操作权限。 */
  const myMember = computed(() => {
    const authStore = useAuthStore();
    return members.value.find((member) => member.user.id === authStore.user?.id);
  });

  const myRole = computed(() => {
    const member = myMember.value;
    return member?.isOwner ? 'owner' : member?.role ?? null;
  });

  const canManageMembers = computed(() => myRole.value === 'owner' || myRole.value === 'admin');
  const canRecord = computed(() => myRole.value === 'owner' || myRole.value === 'admin' || myRole.value === 'member');

  /** 拉取家庭成员列表；权限由后端按 babyId 校验。 */
  const fetchMembers = async (babyId: string) => {
    isLoading.value = true;
    try {
      const res = await apiGetMembers(babyId);
      members.value = res.members;
    } finally {
      isLoading.value = false;
    }
  };

  /** 生成新邀请码并插入列表头部，优先展示最新可用的邀请码。 */
  const generateInviteCode = async (babyId: string) => {
    const res = await apiGenerateInviteCode(babyId);
    inviteCodes.value.unshift(res);
    return res;
  };

  /** 加载当前仍有效的邀请码列表。 */
  const fetchInviteCodes = async (babyId: string) => {
    const res = await apiGetInviteCodes(babyId);
    inviteCodes.value = res.codes;
  };

  const revokeInviteCode = async (code: string) => {
    await apiRevokeInviteCode(code);
    inviteCodes.value = inviteCodes.value.filter((item) => item.code !== code);
  };

  /** 使用邀请码加入家庭后，刷新可访问宝宝列表并切换到刚加入的宝宝。 */
  const joinByCode = async (code: string): Promise<JoinedResult> => {
    const res = await apiJoinByCode(code);
    const babyStore = useBabyStore();
    await babyStore.loadAccessibleBabies();
    await babyStore.switchBaby(res.baby.id);
    return res;
  };

  /** 修改成员角色：后端成功后同步更新本地成员项。 */
  const changeRole = async (memberId: string, role: FamilyRole) => {
    await apiChangeRole(memberId, role);
    const member = members.value.find((item) => item.id === memberId);
    if (member) member.role = role;
  };

  /** 移除成员：后端成功后从本地成员列表删除。 */
  const removeMember = async (memberId: string) => {
    await apiRemoveMember(memberId);
    members.value = members.value.filter((item) => item.id !== memberId);
  };

  /** 主动退出家庭后清空家庭缓存，并重新选择当前可访问宝宝。 */
  const leave = async (babyId: string) => {
    await apiLeave(babyId);
    reset();
    await useBabyStore().loadAccessibleBabies();
  };

  const reset = () => {
    members.value = [];
    inviteCodes.value = [];
  };

  return {
    members,
    inviteCodes,
    isLoading,
    memberCount,
    hasMembers,
    myRole,
    canManageMembers,
    canRecord,
    fetchMembers,
    generateInviteCode,
    fetchInviteCodes,
    revokeInviteCode,
    joinByCode,
    changeRole,
    removeMember,
    leave,
    reset
  };
});
