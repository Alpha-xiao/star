<script setup lang="ts">
import { ref } from 'vue';
import { showConfirmDialog, showToast } from 'vant';
import { useRecordStore } from '@/stores/records';
import { submitRecord, type BabyRecord } from '@/utils/api';

const store = useRecordStore();

// --- 状态控制 ---
const showPoopSheet = ref(false);
const showPeeSheet = ref(false);
const showBreastDialog = ref(false);
const showFormulaDialog = ref(false);

const poopOptions = [
  { name: '黄色糊状', color: '#f39c12' },
  { name: '绿色稀便', color: '#27ae60' },
  { name: '有奶瓣', color: '#d35400' },
  { name: '其他', color: '#7f8c8d' },
];

const peeOptions = [
  { name: '量多' },
  { name: '量少' },
  { name: '换尿布' },
];

// --- 表单数据 ---
const breastSide = ref<'左侧' | '右侧' | '双侧'>('左侧');
const breastDuration = ref(15);
const formulaAmount = ref(60);

// --- 通用提交逻辑 ---
const isSubmitting = ref(false);
const handleRecord = async (type: string, data: Partial<BabyRecord>) => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  
  const record: BabyRecord = {
    event_type: type,
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    ...data,
  };

  // 先存本地 store
  store.addRecord(record);
  
  // 异步提交 Webhook
  await submitRecord(record);
  
  isSubmitting.value = false;
  showToast({ message: '记录成功', type: 'success' });
};

// --- 撤销逻辑 ---
const onUndo = () => {
  showConfirmDialog({
    title: '撤销确认',
    message: '确定要删除上一条记录吗？',
  }).then(() => {
    const removed = store.undoLastRecord();
    if (removed) {
      showToast('已撤销上一条记录');
    }
  }).catch(() => {});
};

// --- 各项功能处理 ---
const onPoopSelect = (item: any) => {
  handleRecord('拉屎', { note: item.name });
  showPoopSheet.value = false;
};

const onPeeSelect = (item: any) => {
  handleRecord('拉尿', { note: item.name });
  showPeeSheet.value = false;
};

const submitBreast = () => {
  handleRecord('母乳喂养', { side: breastSide.value, duration: breastDuration.value });
  showBreastDialog.value = false;
};

const submitFormula = () => {
  handleRecord('奶粉喂养', { amount: formulaAmount.value });
  showFormulaDialog.value = false;
};
</script>

<template>
  <div class="home-container">
    <div class="header">
      <div class="title">BabyStar ✨</div>
      <van-button 
        icon="replay" 
        size="small" 
        round 
        class="undo-btn" 
        @click="onUndo"
      >
        撤销
      </van-button>
    </div>

    <div class="grid-menu">
      <div class="menu-item poop" @click="showPoopSheet = true">
        <span class="emoji">💩</span>
        <span class="label">拉屎</span>
      </div>
      <div class="menu-item pee" @click="showPeeSheet = true">
        <span class="emoji">💧</span>
        <span class="label">拉尿</span>
      </div>
      <div class="menu-item breast" @click="showBreastDialog = true">
        <span class="emoji">🤱</span>
        <span class="label">母乳</span>
      </div>
      <div class="menu-item formula" @click="showFormulaDialog = true">
        <span class="emoji">🍼</span>
        <span class="label">奶粉</span>
      </div>
    </div>

    <!-- 拉屎备注 -->
    <van-action-sheet
      v-model:show="showPoopSheet"
      :actions="poopOptions"
      cancel-text="取消"
      close-on-click-action
      @select="onPoopSelect"
      title="💩 选择便便性状"
    />

    <!-- 拉尿备注 -->
    <van-action-sheet
      v-model:show="showPeeSheet"
      :actions="peeOptions"
      cancel-text="取消"
      close-on-click-action
      @select="onPeeSelect"
      title="💧 选择尿量/操作"
    />

    <!-- 母乳弹窗 -->
    <van-dialog
      v-model:show="showBreastDialog"
      title="🤱 母乳喂养"
      show-cancel-button
      @confirm="submitBreast"
    >
      <div class="dialog-content">
        <div class="form-item">
          <label>喂养位置</label>
          <van-radio-group v-model="breastSide" direction="horizontal">
            <van-radio name="左侧">左侧</van-radio>
            <van-radio name="右侧">右侧</van-radio>
            <van-radio name="双侧">双侧</van-radio>
          </van-radio-group>
        </div>
        <div class="form-item">
          <label>时长 (分钟)</label>
          <van-stepper v-model="breastDuration" :min="1" :max="60" />
        </div>
      </div>
    </van-dialog>

    <!-- 奶粉弹窗 -->
    <van-dialog
      v-model:show="showFormulaDialog"
      title="🍼 奶粉喂养"
      show-cancel-button
      @confirm="submitFormula"
    >
      <div class="dialog-content">
        <div class="form-item center">
          <label>奶量 (ml)</label>
          <van-stepper 
            v-model="formulaAmount" 
            :min="10" 
            :max="300" 
            :step="10" 
            integer
            input-width="60px"
            button-size="32px"
          />
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.home-container {
  padding: 20px;
  background-color: var(--bg-color);
  min-height: calc(100vh - 50px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-main);
}

.undo-btn {
  background-color: #fff;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.grid-menu {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
}

.menu-item {
  height: 140px;
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: transform 0.1s;
  cursor: pointer;
}

.menu-item:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.emoji {
  font-size: 40px;
  margin-bottom: 8px;
}

.label {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-main);
}

/* 按钮颜色微调 */
.poop { border-bottom: 5px solid #f1c40f; }
.pee { border-bottom: 5px solid #3498db; }
.breast { border-bottom: 5px solid #e74c3c; }
.formula { border-bottom: 5px solid #9b59b6; }

.dialog-content {
  padding: 24px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item.center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-item label {
  display: block;
  margin-bottom: 12px;
  color: var(--text-light);
  font-size: 14px;
}
</style>
