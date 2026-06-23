<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Baby, Calendar, Camera, ChevronLeft, Heart } from 'lucide-vue-next';
import { useBabyStore } from '@/stores/baby';

const router = useRouter();
const babyStore = useBabyStore();

// 表单数据
const name = ref('');
const birthday = ref('');
const birthdayDisplay = ref('');
const gender = ref<'male' | 'female' | ''>('');
const birthWeight = ref<number | undefined>();
const birthHeight = ref<number | undefined>();
const avatarUrl = ref('');

// 日期选择器
const showDatePicker = ref(false);
const pickerDate = ref<[string, string, string]>(['2025', '01', '01']);

const toPickerDate = (date: Date): [string, string, string] => [
  String(date.getFullYear()),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
];

/** 打开日期选择器 */
const openDatePicker = () => {
  pickerDate.value = toPickerDate(new Date());
  showDatePicker.value = true;
};

/** 日期选择器确认 */
const onDateConfirm = ({ selectedValues }: { selectedValues: Array<string | number> }) => {
  const [year, month, day] = selectedValues.map(String);
  birthday.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  birthdayDisplay.value = `${Number(year)}年${Number(month)}月${Number(day)}日`;
  showDatePicker.value = false;
};

/** 头像选择 */
const showAvatarSheet = ref(false);
const avatarInput = ref<HTMLInputElement>();

const onAvatarSelect = (item: { name: string }) => {
  if (item.name === '从相册选择') {
    avatarInput.value?.click();
  }
  showAvatarSheet.value = false;
};

const onAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      avatarUrl.value = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
};

/** 是否可提交 */
const canSubmit = computed(() => name.value.trim() && birthday.value && gender.value);

const isSubmitting = ref(false);

/** 提交创建 */
const onSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    await babyStore.createBaby({
      name: name.value.trim(),
      birthday: birthday.value,
      gender: gender.value as 'male' | 'female',
      birthWeight: birthWeight.value,
      birthHeight: birthHeight.value
    });
    showToast('宝宝档案创建成功');
    router.push('/');
  } catch {
    showToast({ message: '创建失败，请稍后重试', type: 'fail' });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-color)] px-5 pt-5 pb-6">
    <!-- 顶部导航栏 -->
    <header class="sticky top-0 z-20 -mx-5 mb-6 flex h-16 items-center justify-between bg-[var(--bg-color)] px-5 pt-5">
      <button class="btn-day-nav press" @click="router.back()">
        <ChevronLeft :size="18" color="var(--text-secondary)" />
      </button>
      <span class="text-[17px] font-semibold text-[var(--text-primary)]">创建宝宝档案</span>
      <div class="w-7" />
    </header>

    <!-- 头像上传区 -->
    <div class="mb-6 flex flex-col items-center">
      <div
        class="relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--brand-primary)] bg-[var(--formula-icon-bg)]"
        @click="showAvatarSheet = true">
        <img v-if="avatarUrl" :src="avatarUrl" class="h-full w-full object-cover" />
        <Camera v-else :size="32" color="var(--brand-primary)" />
      </div>
      <span class="mt-2 text-[13px] text-[var(--text-tertiary)]">点击添加头像</span>
    </div>

    <!-- 表单卡片 -->
    <div class="mb-6 rounded-[var(--radius-large)] bg-white p-5 shadow-[var(--card-shadow)]">
      <!-- 宝宝昵称 -->
      <div class="mb-5">
        <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">宝宝昵称</label>
        <input
          v-model="name"
          class="h-11 w-full border-b border-[var(--border-light)] bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]"
          placeholder="给宝宝起个昵称吧"
          maxlength="20" />
      </div>

      <!-- 出生日期 -->
      <div class="mb-5">
        <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">出生日期</label>
        <div
          class="flex h-11 cursor-pointer items-center justify-between border-b border-[var(--border-light)]"
          @click="openDatePicker">
          <span
            :class="
              birthdayDisplay ? 'text-[15px] text-[var(--text-primary)]' : 'text-[15px] text-[var(--text-disabled)]'
            ">
            {{ birthdayDisplay || '请选择出生日期' }}
          </span>
          <Calendar :size="20" color="var(--brand-primary)" />
        </div>
      </div>

      <!-- 性别 -->
      <div class="mb-5">
        <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">性别</label>
        <div class="flex gap-3">
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[15px] transition"
            :class="
              gender === 'male'
                ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                : 'border-[#E0E0E0] bg-white text-[var(--text-secondary)]'
            "
            @click="gender = 'male'">
            <Baby :size="18" />
            男孩
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[15px] transition"
            :class="
              gender === 'female'
                ? 'border-[#C62828] bg-[#FCE4EC] text-[#C62828]'
                : 'border-[#E0E0E0] bg-white text-[var(--text-secondary)]'
            "
            @click="gender = 'female'">
            <Heart :size="18" />
            女孩
          </button>
        </div>
      </div>

      <!-- 出生体重 -->
      <div class="mb-5">
        <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">
          出生体重
          <span class="text-[var(--text-disabled)]">(选填)</span>
        </label>
        <div class="flex items-center border-b border-[var(--border-light)]">
          <input
            v-model.number="birthWeight"
            type="number"
            step="0.01"
            min="0"
            class="h-11 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]"
            placeholder="0.00" />
          <span class="text-[13px] text-[var(--text-tertiary)]">kg</span>
        </div>
      </div>

      <!-- 出生身高 -->
      <div>
        <label class="mb-2 block text-[13px] text-[var(--text-tertiary)]">
          出生身高
          <span class="text-[var(--text-disabled)]">(选填)</span>
        </label>
        <div class="flex items-center border-b border-[var(--border-light)]">
          <input
            v-model.number="birthHeight"
            type="number"
            step="0.1"
            min="0"
            class="h-11 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]"
            placeholder="0.0" />
          <span class="text-[13px] text-[var(--text-tertiary)]">cm</span>
        </div>
      </div>
    </div>

    <!-- 提交按钮 -->
    <button class="btn-primary mb-4 press" :disabled="!canSubmit || isSubmitting" @click="onSubmit">
      开始记录
    </button>

    <!-- 底部引导文案 -->
    <p class="text-center text-xs text-[var(--text-disabled)]">创建后即可开始记录宝宝的每一天</p>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="pickerDate"
        title="选择出生日期"
        :min-date="new Date(2020, 0, 1)"
        :max-date="new Date()"
        :columns-type="['year', 'month', 'day']"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false" />
    </van-popup>

    <!-- 头像选择 -->
    <van-action-sheet
      v-model:show="showAvatarSheet"
      :actions="[{ name: '从相册选择' }, { name: '拍照' }]"
      cancel-text="取消"
      close-on-click-action
      @select="onAvatarSelect" />

    <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
  </div>
</template>
