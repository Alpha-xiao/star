<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { ChevronLeft, Trash2, UserRound, Users } from 'lucide-vue-next';
import { useBabyStore } from '@/stores/baby';
import { useFamilyStore } from '@/stores/family';
import type { FamilyMember, FamilyRole } from '@/utils/api';

/**
 * 家庭成员页：展示当前宝宝家庭关系，提供邀请码、角色调整、移除和退出能力。
 * 所有写操作最终仍依赖后端权限校验，前端权限仅用于减少误触。
 */
const router = useRouter();
const babyStore = useBabyStore();
const familyStore = useFamilyStore();

const activeMemberId = ref('');
const isInviteOperating = ref(false);
const roleActions = [
  { name: '管理员', value: 'admin' },
  { name: '记录者', value: 'member' },
  { name: '只读', value: 'viewer' }
];

const currentInviteCode = computed(() => familyStore.inviteCodes[0]);
/** 家庭管理权限来自成员角色；本地创建者兜底可继续管理。 */
const canManageFamily = computed(() => familyStore.canManageMembers || babyStore.isOwnedBaby);
/** 非创建者成员允许主动退出家庭。 */
const canLeave = computed(() => familyStore.myRole && familyStore.myRole !== 'owner');

const roleText = (role: string) => {
  const map: Record<string, string> = { owner: '创建者', admin: '管理员', member: '记录者', viewer: '只读' };
  return map[role] || role;
};

const roleClass = (role: string) => {
  const map: Record<string, string> = {
    owner: 'bg-[var(--brand-light)] text-[var(--brand-primary)]',
    admin: 'bg-[var(--male-bg)] text-[var(--male-color)]',
    member: 'bg-[var(--growth-bg)] text-[var(--growth-color)]',
    viewer: 'bg-[var(--surface-muted)] text-[var(--text-tertiary)]'
  };
  return map[role] || map.viewer;
};

/** 加载成员与邀请码；成员接口失败时为创建者提供本地兜底，避免管理入口完全不可用。 */
const loadData = async () => {
  if (!babyStore.baby) return;

  try {
    await familyStore.fetchMembers(babyStore.baby.id);
  } catch (error) {
    console.error('加载家庭成员失败', error);
    if (babyStore.isOwnedBaby && familyStore.members.length === 0) {
      familyStore.members = [
        {
          id: `owner-${babyStore.baby.id}`,
          user: { id: '', nickname: '宝宝创建者', avatarUrl: babyStore.baby.avatarUrl },
          role: 'owner',
          isOwner: true,
          joinedAt: babyStore.baby.createdAt
        }
      ];
    }
    showToast({ message: '成员列表加载失败，已显示创建者操作', type: 'fail' });
  }

  if (canManageFamily.value) {
    try {
      await familyStore.fetchInviteCodes(babyStore.baby.id);
    } catch (error) {
      console.error('加载邀请码失败', error);
    }
  }
};

/** 生成或刷新邀请码，同一时间只允许一个生成请求。 */
const generateCode = async () => {
  if (!babyStore.baby || isInviteOperating.value) return;
  isInviteOperating.value = true;
  try {
    await familyStore.generateInviteCode(babyStore.baby.id);
    showToast('邀请码已生成');
  } catch {
    showToast({ message: '生成失败，请稍后重试', type: 'fail' });
  } finally {
    isInviteOperating.value = false;
  }
};

/** 邀请码复制到系统剪贴板，便于直接分享给家人。 */
const copyCode = async () => {
  if (!currentInviteCode.value) return;
  await navigator.clipboard.writeText(currentInviteCode.value.code);
  showToast('邀请码已复制');
};

/** 作废当前展示的邀请码，防止旧 code 继续被使用。 */
const revokeCode = async () => {
  if (!currentInviteCode.value) return;
  try {
    await familyStore.revokeInviteCode(currentInviteCode.value.code);
    showToast('邀请码已作废');
  } catch (error) {
    console.error('作废邀请码失败', error);
    showToast({ message: '作废失败，请刷新后重试', type: 'fail' });
  }
};

/** 修改成员角色；最终权限仍由后端接口校验。 */
const changeRole = async (member: FamilyMember, role: FamilyRole) => {
  try {
    await familyStore.changeRole(member.id, role);
    activeMemberId.value = '';
    showToast('角色已更新');
  } catch {
    showToast({ message: '角色更新失败', type: 'fail' });
  }
};

const removeMember = (member: FamilyMember) => {
  showConfirmDialog({ title: '移除成员', message: `确定移除 ${member.user.nickname || '该成员'} 吗？` }).then(
    async () => {
      // 移除后 Store 先更新本地列表，避免等待整页重新加载。
      await familyStore.removeMember(member.id);
      showToast('成员已移除');
    }
  );
};

const leaveFamily = () => {
  if (!babyStore.baby) return;
  showConfirmDialog({ title: '退出家庭', message: '退出后将无法查看这个宝宝的数据，确定退出吗？' }).then(async () => {
    await familyStore.leave(babyStore.baby!.id);
    showToast('已退出家庭');
    // 退出后可访问宝宝已重新计算，回到首页由路由守卫处理是否需要重新建档。
    router.push('/');
  });
};

onMounted(loadData);
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-color)] px-5 pt-5 pb-6">
    <header class="sticky top-0 z-20 -mx-5 mb-6 flex h-16 items-center justify-between bg-[var(--bg-color)] px-5 pt-5">
      <button class="btn-day-nav press" @click="router.back()">
        <ChevronLeft :size="18" color="var(--text-secondary)" />
      </button>
      <span class="text-[17px] font-semibold text-[var(--text-primary)]">家庭成员</span>
      <button class="btn-day-nav press" @click="router.push('/family/join')">
        <Users :size="18" color="var(--brand-primary)" />
      </button>
    </header>

    <section
      v-if="canManageFamily"
      class="mb-5 rounded-[var(--radius-large)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
      <div class="mb-4 flex items-center gap-2">
        <span class="h-3.5 w-[3px] rounded-sm bg-[var(--brand-secondary)]" />
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">邀请家人</span>
      </div>

      <template v-if="currentInviteCode">
        <div class="rounded-2xl bg-[var(--bg-color)] px-4 py-5 text-center">
          <div class="font-mono text-2xl font-bold tracking-[8px] text-[var(--brand-primary)]">
            {{ currentInviteCode.code }}
          </div>
          <p class="mt-2 text-xs text-[var(--text-tertiary)]">
            剩余 {{ currentInviteCode.maxUses - currentInviteCode.usedCount }} 次 · 有效期至
            {{ String(currentInviteCode.expiresAt).slice(0, 10) }}
          </p>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button
            class="press rounded-xl bg-[var(--brand-primary)] py-2 text-sm font-semibold"
            style="color: #ffffff"
            @click="copyCode">
            复制
          </button>
          <button
            class="press rounded-xl bg-[var(--brand-light)] py-2 text-sm font-semibold"
            style="color: var(--brand-primary)"
            :disabled="isInviteOperating"
            @click="generateCode">
            重新生成
          </button>
          <button
            class="press rounded-xl bg-[var(--danger-bg)] py-2 text-sm font-semibold"
            style="color: var(--danger-color)"
            @click="revokeCode">
            作废
          </button>
        </div>
      </template>
      <button v-else class="btn-primary press" :disabled="isInviteOperating" @click="generateCode">生成邀请码</button>
    </section>

    <section class="rounded-[var(--radius-large)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
      <div class="mb-2 flex items-center gap-2">
        <span class="h-3.5 w-[3px] rounded-sm bg-[var(--brand-secondary)]" />
        <span class="text-[15px] font-semibold text-[var(--text-primary)]">
          成员列表 ({{ familyStore.memberCount }}人)
        </span>
      </div>

      <div
        v-for="member in familyStore.members"
        :key="member.id"
        class="border-b border-[var(--divider-color)] py-3 last:border-b-0">
        <div
          class="flex items-center justify-between"
          @click="
            !member.isOwner &&
            familyStore.canManageMembers &&
            (activeMemberId = activeMemberId === member.id ? '' : member.id)
          ">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-light)]">
              <img v-if="member.user.avatarUrl" :src="member.user.avatarUrl" class="h-full w-full object-cover" />
              <UserRound v-else :size="20" color="var(--brand-primary)" />
            </div>
            <div>
              <div class="text-[15px] font-semibold text-[var(--text-primary)]">
                {{ member.user.nickname || member.user.phone || '家庭成员' }}
              </div>
              <div class="text-xs text-[var(--text-tertiary)]">{{ member.user.phone || '已加入' }}</div>
            </div>
          </div>
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="roleClass(member.role)">
            {{ roleText(member.role) }}
          </span>
        </div>

        <div v-if="activeMemberId === member.id" class="mt-3 flex flex-wrap gap-2 pl-13">
          <button
            v-for="action in roleActions"
            :key="action.value"
            class="press rounded-xl bg-[var(--bg-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
            @click="changeRole(member, action.value as FamilyRole)">
            {{ action.name }}
          </button>
          <button
            class="press flex items-center gap-1 rounded-xl bg-[var(--danger-bg)] px-3 py-1.5 text-xs text-[var(--danger-color)]"
            @click="removeMember(member)">
            <Trash2 :size="12" />
            移除
          </button>
        </div>
      </div>
    </section>

    <button
      v-if="canLeave"
      class="press mt-5 h-12 w-full rounded-2xl bg-[var(--surface-card)] text-sm font-semibold text-[var(--danger-color)] shadow-[var(--card-shadow)]"
      @click="leaveFamily">
      退出家庭
    </button>
  </div>
</template>
