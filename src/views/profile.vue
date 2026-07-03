<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Baby, Calendar, Camera, ChevronLeft, ChevronRight, Download, Heart, Pencil, Users, X } from 'lucide-vue-next';
import { useBabyStore } from '@/stores/baby';
import { useGrowthStore } from '@/stores/growth';

/**
 * 宝宝档案页：展示当前宝宝资料，并在管理员/创建者权限下允许编辑。
 * 页面只维护编辑态临时表单，保存后通过 babyStore 刷新本地缓存。
 */
const router = useRouter();
const babyStore = useBabyStore();
const growthStore = useGrowthStore();

// 查看 / 编辑模式切换
const isEditing = ref(false);

// 编辑态临时数据
const editName = ref('');
const editBirthday = ref('');
const editBirthdayDisplay = ref('');
const editGender = ref<'male' | 'female'>('male');
const editBirthWeight = ref<number | undefined>();
const editBirthHeight = ref<number | undefined>();
const editBloodType = ref('');
const editAvatarUrl = ref('');

// 日期选择器
const showDatePicker = ref(false);
const pickerDate = ref<[string, string, string]>(['2025', '01', '01']);

const toPickerDate = (date: Date): [string, string, string] => [
  String(date.getFullYear()),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
];

// 血型选择
const showBloodSheet = ref(false);
const bloodOptions = [{ name: 'A' }, { name: 'B' }, { name: 'AB' }, { name: 'O' }, { name: '不确定' }];

// 头像选择
const showAvatarSheet = ref(false);
const avatarInput = ref<HTMLInputElement>();

/** 当前用户是否可编辑档案：仅宝宝创建者和管理员有管理权限。 */
const canEditProfile = computed(() => babyStore.canManageBaby);

/** 档案编辑权限不足时的统一提示。 */
const showProfilePermissionTip = () => {
  showToast({ message: '只有管理员可以编辑宝宝档案', type: 'fail' });
};

/** 进入编辑模式，初始化编辑数据 */
const enterEdit = () => {
  if (!canEditProfile.value) {
    showProfilePermissionTip();
    return;
  }

  const b = babyStore.baby;
  if (!b) return;
  editName.value = b.name;
  editBirthday.value = b.birthday || '';
  editBirthdayDisplay.value = b.birthday ? formatBirthdayDisplay(b.birthday) : '';
  editGender.value = b.gender;
  editBirthWeight.value = b.birthWeight;
  editBirthHeight.value = b.birthHeight;
  editBloodType.value = b.bloodType || '';
  editAvatarUrl.value = b.avatarUrl || '';
  isEditing.value = true;
};

/** 取消编辑 */
const cancelEdit = () => {
  isEditing.value = false;
};

/** 保存编辑，只提交当前表单允许修改的档案字段。 */
const saveEdit = async () => {
  if (!canEditProfile.value) {
    showProfilePermissionTip();
    isEditing.value = false;
    return;
  }

  try {
    await babyStore.updateBaby({
      name: editName.value.trim(),
      birthday: editBirthday.value || null,
      gender: editGender.value,
      ...(typeof editBirthWeight.value === 'number' &&
        !Number.isNaN(editBirthWeight.value) && { birthWeight: editBirthWeight.value }),
      ...(typeof editBirthHeight.value === 'number' &&
        !Number.isNaN(editBirthHeight.value) && { birthHeight: editBirthHeight.value }),
      ...(editBloodType.value && { bloodType: editBloodType.value as any })
    });
    isEditing.value = false;
    showToast('档案已更新');
  } catch {
    showToast({ message: '更新失败，请稍后重试', type: 'fail' });
  }
};

/** 格式化出生日期显示 */
const formatBirthdayDisplay = (date?: string) => {
  if (!date) return '未填写';
  const d = new Date(`${date}T00:00:00+08:00`);
  if (isNaN(d.getTime())) return '未填写';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

/** 日期选择器确认 */
const onDateConfirm = ({ selectedValues }: { selectedValues: Array<string | number> }) => {
  const [year, month, day] = selectedValues.map(String);
  editBirthday.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  editBirthdayDisplay.value = `${Number(year)}年${Number(month)}月${Number(day)}日`;
  showDatePicker.value = false;
};

/** 打开日期选择器，优先回显当前生日，非法日期回退到今天。 */
const openDatePicker = () => {
  const d = editBirthday.value ? new Date(`${editBirthday.value}T00:00:00+08:00`) : new Date();
  pickerDate.value = toPickerDate(isNaN(d.getTime()) ? new Date() : d);
  showDatePicker.value = true;
};

/** 血型选择 */
const onBloodSelect = (item: { name: string }) => {
  editBloodType.value = item.name === '不确定' ? 'unknown' : item.name;
  showBloodSheet.value = false;
};

/** 头像选择 */
const onAvatarSelect = (item: { name: string }) => {
  if (item.name === '从相册选择') {
    avatarInput.value?.click();
  }
  showAvatarSheet.value = false;
};

const onAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    // 头像当前仅作为本地预览字段处理，后续接入上传服务时再保存到后端。
    const reader = new FileReader();
    reader.onload = () => {
      editAvatarUrl.value = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
};

/** 性别文案 */
const genderText = computed(() => (babyStore.baby?.gender === 'male' ? '男孩' : '女孩'));

/** 返回 */
const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/');
  }
};

/** 成长数据概览入口 */
const openGrowthOverview = () => {
  router.push('/growth');
};

onMounted(async () => {
  if (babyStore.currentBabyId) {
    await growthStore.loadLatest(babyStore.currentBabyId);
  }
});
</script>

<template>
  <div
    class="min-h-[calc(100vh-56px)] overflow-hidden bg-[var(--bg-color)] pb-[calc(var(--van-tabbar-height)+env(safe-area-inset-bottom)+24px)]">
    <div
      class="min-h-[calc(100vh-56px)] rounded-[10px] border border-[#E5E0DA] bg-[radial-gradient(circle_at_50%_5%,#FFF8EE_0%,#FAF5F0_42%,#F7EFE7_100%)] px-6 pt-5 pb-8">
      <!-- 顶部导航栏 -->
      <header class="mb-8 flex h-10 items-center justify-between">
        <button class="btn-day-nav press h-8 w-8" @click="isEditing ? cancelEdit() : goBack()">
          <X v-if="isEditing" :size="18" color="var(--text-secondary)" />
          <ChevronLeft v-else :size="19" color="var(--text-secondary)" />
        </button>
        <span class="text-[18px] font-bold text-[var(--text-primary)]">
          {{ isEditing ? '编辑档案' : '宝宝档案' }}
        </span>
        <button v-if="!isEditing" class="btn-day-nav press h-8 w-8" @click="enterEdit">
          <Pencil :size="18" color="var(--brand-primary)" />
        </button>
        <button v-else class="btn-save press" @click="saveEdit">保存</button>
      </header>

      <!-- 查看模式 -->
      <template v-if="!isEditing && babyStore.baby">
        <!-- Hero 区域 -->
        <div class="mb-7 flex flex-col items-center">
          <div
            class="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[var(--formula-icon-bg)] shadow-[0_6px_18px_rgba(80,55,30,0.12)]">
            <img v-if="babyStore.baby.avatarUrl" :src="babyStore.baby.avatarUrl" class="h-full w-full object-cover" />
            <Baby v-else :size="40" color="var(--brand-primary)" />
          </div>
          <h2 class="mt-4 text-[24px] font-bold leading-tight text-[var(--text-primary)]">{{ babyStore.baby.name }}</h2>
          <span
            v-if="babyStore.ageText"
            class="mt-2 inline-block rounded-full bg-[var(--brand-primary)] px-3.5 py-1 text-xs font-bold leading-none text-white">
            {{ babyStore.ageText }}
          </span>
          <p class="mt-3 text-[15px] font-medium text-[var(--text-tertiary)]">
            {{
              babyStore.baby.birthday
                ? `${genderText} · ${formatBirthdayDisplay(babyStore.baby.birthday)} 出生`
                : genderText
            }}
          </p>
        </div>

        <!-- 成长数据概览入口 -->
        <button
          class="press mb-7 flex w-full flex-col items-center rounded-[20px] bg-white px-4 py-6 text-center shadow-[var(--card-shadow)]"
          @click="openGrowthOverview">
          <span class="text-[17px] font-bold text-[var(--text-primary)]">成长数据概览</span>
          <template v-if="growthStore.latest && growthStore.latest.totalRecords > 0">
            <span class="mt-3 text-[13px] text-[var(--text-tertiary)]">
              最近:
              <span v-if="growthStore.latest.latestWeight" class="ml-1 text-[var(--growth-color)] font-medium">
                {{ growthStore.latest.latestWeight.value.toFixed(2) }}kg
              </span>
              <span v-if="growthStore.latest.latestHeight" class="ml-1 text-[var(--height-color)] font-medium">
                {{ growthStore.latest.latestHeight.value.toFixed(1) }}cm
              </span>
              <span v-if="growthStore.latest.latestHead" class="ml-1 text-[var(--head-color)] font-medium">
                {{ growthStore.latest.latestHead.value.toFixed(1) }}cm
              </span>
            </span>
          </template>
          <span v-else class="mt-3 text-[13px] text-[var(--text-tertiary)]">暂无成长记录，点击前往记录</span>
        </button>

        <!-- 基本信息卡片 -->
        <div class="mb-6 rounded-[20px] bg-white px-4 pb-3 pt-5 shadow-[var(--card-shadow)]">
          <div class="mb-5 flex items-center gap-2">
            <span class="h-4 w-[3px] rounded-sm bg-[var(--brand-secondary)]" />
            <span class="text-[17px] font-bold text-[var(--text-primary)]">基础信息</span>
          </div>
          <div class="flex justify-between border-b border-[#F5F5F5] py-3">
            <span class="text-[13px] text-[var(--text-tertiary)]">出生日期</span>
            <span class="text-[13px] text-[var(--text-primary)]">
              {{ formatBirthdayDisplay(babyStore.baby.birthday ?? undefined) }}
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-[#F5F5F5] py-3">
            <span class="text-[13px] text-[var(--text-tertiary)]">性别</span>
            <span class="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="babyStore.baby.gender === 'male' ? 'bg-[#1565C0]' : 'bg-[#C62828]'" />
              {{ genderText }}
            </span>
          </div>
          <div class="flex justify-between border-b border-[#F5F5F5] py-3">
            <span class="text-[13px] text-[var(--text-tertiary)]">出生体重</span>
            <span
              :class="
                babyStore.baby.birthWeight
                  ? 'text-[13px] text-[var(--text-primary)]'
                  : 'text-[13px] italic text-[var(--text-disabled)]'
              ">
              {{ babyStore.baby.birthWeight ? `${babyStore.baby.birthWeight} kg` : '未填写' }}
            </span>
          </div>
          <div class="flex justify-between border-b border-[#F5F5F5] py-3">
            <span class="text-[13px] text-[var(--text-tertiary)]">出生身高</span>
            <span
              :class="
                babyStore.baby.birthHeight
                  ? 'text-[13px] text-[var(--text-primary)]'
                  : 'text-[13px] italic text-[var(--text-disabled)]'
              ">
              {{ babyStore.baby.birthHeight ? `${babyStore.baby.birthHeight} cm` : '未填写' }}
            </span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-[13px] text-[var(--text-tertiary)]">血型</span>
            <span
              :class="
                babyStore.baby.bloodType && babyStore.baby.bloodType !== 'unknown'
                  ? 'text-[13px] text-[var(--text-primary)]'
                  : 'text-[13px] italic text-[var(--text-disabled)]'
              ">
              {{
                babyStore.baby.bloodType && babyStore.baby.bloodType !== 'unknown' ? babyStore.baby.bloodType : '未填写'
              }}
            </span>
          </div>
        </div>

        <!-- 快捷操作卡片 -->
        <div class="rounded-[20px] bg-white p-4 shadow-[var(--card-shadow)]">
          <div class="mb-4 flex items-center gap-2">
            <span class="h-3.5 w-[3px] rounded-sm bg-[var(--brand-secondary)]" />
            <span class="text-[15px] font-semibold text-[var(--text-primary)]">快捷操作</span>
          </div>
          <div
            v-if="canEditProfile"
            class="flex cursor-pointer items-center justify-between border-b border-[#F5F5F5] py-3.5 press"
            @click="enterEdit">
            <span class="flex items-center gap-2.5 text-[15px] text-[var(--text-primary)]">
              <Pencil :size="20" color="var(--brand-primary)" />
              编辑档案
            </span>
            <ChevronRight :size="16" color="var(--text-disabled)" />
          </div>
          <div
            class="flex cursor-pointer items-center justify-between border-b border-[#F5F5F5] py-3.5 press"
            @click="router.push('/family')">
            <span class="flex items-center gap-2.5 text-[15px] text-[var(--text-primary)]">
              <Users :size="20" color="var(--brand-primary)" />
              家庭成员
            </span>
            <span class="flex items-center gap-2">
              <span class="text-xs text-[var(--text-tertiary)]">查看</span>
              <ChevronRight :size="16" color="var(--text-disabled)" />
            </span>
          </div>
          <div class="flex cursor-pointer items-center justify-between py-3.5 press" @click="showToast('即将开放')">
            <span class="flex items-center gap-2.5 text-[15px] text-[var(--text-primary)]">
              <Download :size="20" color="var(--brand-primary)" />
              导出数据
            </span>
            <span class="flex items-center gap-2">
              <span class="text-xs text-[var(--text-disabled)]">即将开放</span>
              <ChevronRight :size="16" color="var(--text-disabled)" />
            </span>
          </div>
        </div>
      </template>

      <!-- 编辑模式 -->
      <template v-else-if="isEditing">
        <!-- 头像编辑 -->
        <div class="mb-6 flex flex-col items-center">
          <div
            class="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[var(--formula-icon-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            @click="showAvatarSheet = true">
            <img v-if="editAvatarUrl" :src="editAvatarUrl" class="h-full w-full object-cover" />
            <Baby v-else :size="36" color="var(--brand-primary)" />
            <div
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition hover:opacity-100">
              <Camera :size="20" color="#fff" />
            </div>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div class="rounded-[var(--radius-large)] bg-white p-5 shadow-[var(--card-shadow)]">
          <div class="mb-5">
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">宝宝昵称</label>
            <input
              v-model="editName"
              class="h-11 w-full border-b border-[var(--border-light)] bg-transparent text-[15px] text-[var(--text-primary)] outline-none"
              maxlength="20" />
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">出生日期</label>
            <div
              class="flex h-11 cursor-pointer items-center justify-between border-b border-[var(--border-light)]"
              @click="openDatePicker">
              <span class="text-[15px] text-[var(--text-primary)]">{{ editBirthdayDisplay }}</span>
              <Calendar :size="20" color="var(--brand-primary)" />
            </div>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">性别</label>
            <div class="flex gap-3">
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[15px] transition"
                :class="
                  editGender === 'male'
                    ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                    : 'border-[#E0E0E0] bg-white text-[var(--text-secondary)]'
                "
                @click="editGender = 'male'">
                <Baby :size="18" />
                男孩
              </button>
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[15px] transition"
                :class="
                  editGender === 'female'
                    ? 'border-[#C62828] bg-[#FCE4EC] text-[#C62828]'
                    : 'border-[#E0E0E0] bg-white text-[var(--text-secondary)]'
                "
                @click="editGender = 'female'">
                <Heart :size="18" />
                女孩
              </button>
            </div>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">
              出生体重
              <span class="text-[var(--text-disabled)]">(选填)</span>
            </label>
            <div class="flex items-center border-b border-[var(--border-light)]">
              <input
                v-model.number="editBirthWeight"
                type="number"
                step="0.01"
                min="0"
                class="h-11 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none"
                placeholder="0.00" />
              <span class="text-[13px] text-[var(--text-tertiary)]">kg</span>
            </div>
          </div>
          <div class="mb-5">
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">
              出生身高
              <span class="text-[var(--text-disabled)]">(选填)</span>
            </label>
            <div class="flex items-center border-b border-[var(--border-light)]">
              <input
                v-model.number="editBirthHeight"
                type="number"
                step="0.1"
                min="0"
                class="h-11 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none"
                placeholder="0.0" />
              <span class="text-[13px] text-[var(--text-tertiary)]">cm</span>
            </div>
          </div>
          <div>
            <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">
              血型
              <span class="text-[var(--text-disabled)]">(选填)</span>
            </label>
            <div
              class="flex h-11 cursor-pointer items-center justify-between border-b border-[var(--border-light)]"
              @click="showBloodSheet = true">
              <span
                :class="
                  editBloodType && editBloodType !== 'unknown'
                    ? 'text-[15px] text-[var(--text-primary)]'
                    : 'text-[15px] text-[var(--text-disabled)]'
                ">
                {{ editBloodType && editBloodType !== 'unknown' ? editBloodType : '请选择血型' }}
              </span>
              <ChevronRight :size="16" color="var(--text-disabled)" />
            </div>
          </div>
        </div>
      </template>

      <!-- 日期选择器 -->
      <van-popup v-model:show="showDatePicker" position="bottom" round>
        <van-date-picker
          v-model="pickerDate"
          title="选择日期"
          :min-date="new Date(2020, 0, 1)"
          :max-date="new Date()"
          :columns-type="['year', 'month', 'day']"
          @confirm="onDateConfirm"
          @cancel="showDatePicker = false" />
      </van-popup>

      <!-- 血型选择 -->
      <van-action-sheet
        v-model:show="showBloodSheet"
        :actions="bloodOptions"
        cancel-text="取消"
        close-on-click-action
        @select="onBloodSelect" />

      <!-- 头像选择 -->
      <van-action-sheet
        v-model:show="showAvatarSheet"
        :actions="[{ name: '从相册选择' }, { name: '拍照' }]"
        cancel-text="取消"
        close-on-click-action
        @select="onAvatarSelect" />

      <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
    </div>
  </div>
</template>
