<script setup lang="ts">
import { useRecordStore } from '@/stores/records';
import { computed } from 'vue';

const store = useRecordStore();

// --- 日期显示 ---
const currentDate = computed(() => {
  const now = new Date();
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weeks[now.getDay()]}`;
});

// --- 计算总量 ---
const summary = computed(() => {
  const records = store.todayRecords;
  return {
    poopCount: records.filter((r) => r.event_type === '拉屎').length,
    peeCount: records.filter((r) => r.event_type === '拉尿').length,
    breastDuration: records.filter((r) => r.event_type === '母乳喂养').reduce((acc, r) => acc + (r.duration || 0), 0),
    formulaAmount: records.filter((r) => r.event_type === '奶粉喂养').reduce((acc, r) => acc + (r.amount || 0), 0)
  };
});

const goToReport = () => {
  // 假设腾讯文档链接，用户可自行替换
  window.open('https://docs.qq.com/', '_blank');
};
</script>

<template>
  <div class="stats-container">
    <div class="header">
      <div class="title">{{ currentDate }} 统计</div>
      <!-- <div class="date-info">{{ currentDate }}</div> -->
    </div>

    <div v-if="store.todayRecords.length === 0" class="empty-state">
      <span class="empty-emoji">👶</span>
      <p>今日还没有记录哦，快去首页记录吧~</p>
    </div>

    <template v-else>
      <!-- 总量汇总卡片 -->
      <div class="summary-grid">
        <div class="summary-item formula">
          <span class="summary-label">🍼 奶粉总量</span>
          <span class="summary-value">
            {{ summary.formulaAmount }}
            <small>ml</small>
          </span>
        </div>
        <div class="summary-item breast">
          <span class="summary-label">🤱 母乳时长</span>
          <span class="summary-value">
            {{ summary.breastDuration }}
            <small>min</small>
          </span>
        </div>
        <div class="summary-item poop">
          <span class="summary-label">💩 拉屎次数</span>
          <span class="summary-value">
            {{ summary.poopCount }}
            <small>次</small>
          </span>
        </div>
        <div class="summary-item pee">
          <span class="summary-label">💧 拉尿次数</span>
          <span class="summary-value">
            {{ summary.peeCount }}
            <small>次</small>
          </span>
        </div>
      </div>
    </template>

    <div class="footer-btn">
      <van-button type="primary" block round color="var(--primary-color)" @click="goToReport">
        查看腾讯文档完整报表
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.stats-container {
  padding: 20px;
  background-color: var(--bg-color);
  min-height: calc(100vh - 120px);
  padding-bottom: 80px;
}

.header {
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-main);
  margin-bottom: 4px;
}

.date-info {
  font-size: 14px;
  color: var(--text-light);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.summary-item {
  background-color: var(--card-bg);
  padding: 16px;
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.summary-label {
  font-size: 13px;
  color: var(--text-light);
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-main);
}

.summary-value small {
  font-size: 12px;
  font-weight: normal;
  margin-left: 2px;
}

.summary-item.formula {
  border-top: 4px solid #9b59b6;
}
.summary-item.breast {
  border-top: 4px solid #e74c3c;
}
.summary-item.poop {
  border-top: 4px solid #f1c40f;
}
.summary-item.pee {
  border-top: 4px solid #3498db;
}

.empty-state {
  text-align: center;
  padding-top: 60px;
  color: var(--text-light);
}

.empty-emoji {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.footer-btn {
  position: fixed;
  bottom: 70px;
  left: 20px;
  right: 20px;
  z-index: 10;
}
</style>
