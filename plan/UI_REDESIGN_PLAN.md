# BabyStar UI 重设计 — 实施计划

> 本文件供 Trae AI 开发助手参考。请结合 `.trae/rules/design-rules.md` 和设计稿截图
> (`plan/design_home_redesign.png`、`plan/design_detail_redesign.png`) 执行。

---

## 前置依赖

需要安装 `lucide-vue-next` 图标库以替代 emoji 图标：

```bash
npm install lucide-vue-next
```

---

## 第一步：更新 CSS 变量和全局样式

**修改文件**: `src/style.css`

**具体变更**:

1. 更新 `:root` CSS 变量：
```css
:root {
  --primary-color: #E65100;       /* 原 #D8A15D → 改为品牌橙 */
  --bg-color: #FAF5F0;            /* 原 #F8F1E7 → 改为暖米色 */
  --card-bg: #FFFFFF;             /* 不变 */
  --text-main: #2D2D2D;           /* 原 #222222 → 稍微柔化 */
  --text-secondary: #666666;      /* 不变 */
  --text-light: #999999;          /* 不变 */
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);  /* 更轻柔 */
  --radius-large: 20px;           /* 原 12px → 更大圆角 */
  --radius-small: 16px;           /* 原 8px → 更大圆角 */
  --radius-button: 14px;
  --border-radius: 16px;          /* 原 12px */

  /* 新增功能色 */
  --formula-color: #E65100;
  --formula-bg: #FFF8F0;
  --formula-icon-bg: #FFE0CC;
  --breast-color: #C62828;
  --breast-bg: #FFF0F3;
  --breast-icon-bg: #FFD6E0;
  --urine-color: #1565C0;
  --urine-bg: #F0F7FF;
  --urine-icon-bg: #BBDEFB;
  --stool-color: #5D4037;
  --stool-bg: #F5F0EB;
  --stool-icon-bg: #E8D5C4;
}
```

2. 更新全局字体栈，添加 PingFang SC：
```css
font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
```

---

## 第二步：重构 Home.vue（记录入口页）

**修改文件**: `src/views/Home.vue`

参照设计稿: `plan/design_home_redesign.png`

### 2.1 品牌导航栏 (替换原 "BabyStar ✨" 标题)

替换原有的 `<div class="mb-[30px]">...</div>` 为：

```
布局: flex, justify-between, align-center
高度: 44px, margin-bottom: 16px

左侧:
  - 品牌 logo: 28×28px, 圆角 8px, 背景 linear-gradient(135deg, #FF9A56, #FF6B35)
  - 内嵌 lucide Star 图标 (白色, 16px)
  - "BabyStar" 文字, 18px, font-weight 700, color #2D2D2D, margin-left 8px

右侧:
  - 宝宝头像: 32×32px 圆形, 2px #FFF 边框, 轻投影
  - 暂时用占位图标 (lucide User, 18px, #E65100) + 浅色背景 #FFE0CC
```

### 2.2 计时器卡片 (新增组件)

在品牌导航栏下方、操作卡片网格上方，新增一个全宽计时器卡片：

```
布局: 全宽, padding 16px 20px
圆角: 16px
背景: linear-gradient(135deg, #FF9A56, #FFB74D)
装饰: 右上角 80px 半透明圆 rgba(255,255,255,0.12), absolute 定位
margin-bottom: 20px

内容 (全部白色):
  - "距上次喂奶" — 12px, opacity 0.85
  - 动态计时数值 "X小时Y分钟" — 28px bold, margin-top 4px
  - "上次: HH:MM 奶粉 XML" — 12px, opacity 0.75, margin-top 4px

数据逻辑:
  - 从 store.todayRecords 中找到最近一条奶粉/母乳记录
  - 计算距今的时间差
  - 如果没有记录，显示 "暂无喂奶记录"
```

### 2.3 操作卡片网格 (重构)

替换原有的 4 个 grid 卡片：

```
网格: grid-cols-2, gap 12px (原 gap-5=20px → 12px)
margin-bottom: 24px

每张卡片:
  - 白色背景, 圆角 20px (原 var(--radius-small)=8px → 20px)
  - 投影: var(--card-shadow)
  - padding: 20px 16px (原 h-[140px] → auto)
  - flex-column, align-center, gap 10px

  结构:
  - 图标容器: 52×52px, 圆角 16px, 功能色底色
    · 奶粉 → bg #FFF3E0, lucide Baby icon, color #E65100
    · 母乳 → bg #FCE4EC, lucide Heart icon, color #C62828
    · 拉尿 → bg #E3F2FD, lucide Droplets icon, color #1565C0
    · 拉屎 → bg #EFEBE9, lucide CircleDot icon, color #5D4037
  - 标签: 15px, font-weight 600, color #333
  - 右上角 "+" 号: 18px 圆形, bg #F5F5F5, 文字 "+" 12px 浅灰, absolute top-3 right-3

  交互:
  - active: scale(0.96), opacity 0.85, transition 150ms
  - 点击: 弹出对应的 ActionSheet / Dialog (保持原有逻辑不变)
```

### 2.4 今日概览 (新增组件)

在操作卡片网格下方新增：

```
全宽白色卡片, 圆角 16px, 投影 0 2px 10px rgba(0,0,0,0.04), padding 16px

标题行:
  - 左侧竖线: 3×14px, bg #FF9A56, 圆角 2px
  - "今日概览" — 13px, font-weight 600, color #999

统计行 (flex, justify-around, margin-top 12px):
  每项 flex-column, align-center:
  - 彩色圆点 8px (奶粉 #FF9A56, 母乳 #E91E63, 拉尿 #42A5F5, 拉屎 #8D6E63)
  - 数值: 18px bold #333, 内联单位 12px #999
  - 标签: 11px #999

数据: 从 store.todayRecords 实时计算 (或调用 fetchDailyStats)
```

### 2.5 保持不变的逻辑

以下逻辑保持原样不动：
- `showPoopSheet` / `showPeeSheet` / `showBreastDialog` / `showFormulaDialog` 弹窗控制
- `handleRecord` 提交逻辑
- `submitBreast` / `submitFormula` / `onPoopSelect` / `onPeeSelect` 处理函数
- 所有 Vant 组件 (van-action-sheet, van-dialog, van-radio-group, van-stepper) 保持不变

---

## 第三步：重构 Stats.vue（记录明细页）

**修改文件**: `src/views/Stats.vue`

参照设计稿: `plan/design_detail_redesign.png`

### 3.1 日期选择器 (重构)

替换原有的全宽按钮 + Vant popup 日期选择器：

```
布局: flex, justify-between, align-center
padding-bottom: 16px

左侧 (日期导航 flex, align-center):
  - 左箭头: 28×28px 圆形, bg #FFF, shadow 0 1px 4px rgba(0,0,0,0.08)
    内嵌 lucide ChevronLeft (14px, #666)
    点击: selectedDate - 1 天

  - 日期文字: margin 0 8px
    · 日期部分 "6月16日" — 16px, font-weight 600, color #333
    · 星期部分 "周二" — 14px, font-weight 400, color #999, margin-left 4px
    (去掉年份，因为已有日期选择器上下文)

  - 右箭头: 同左箭头样式
    点击: selectedDate + 1 天

右侧:
  - "今天" 按钮: pill 形状, bg #FFF3E0, color #E65100
    font-size 12px, font-weight 600, padding 4px 12px, 圆角 14px
    点击: 回到当天日期
```

日期逻辑变更：
- 去掉 Vant popup 日期选择器 (`van-popup` + `van-date-picker`)
- 改为左右箭头 ±1 天的交互
- `formatCurrentDate` 计算属性改为 "X月X日" 格式 (去掉年份)
- 新增 `prevDay()` / `nextDay()` / `goToday()` 方法

### 3.2 统计卡片网格 (样式微调)

现有的 2×2 网格结构已经很好，只需要微调：

```
变更项:
  - 卡片高度: 126px → auto (改为 padding 14px 16px, 自适应)
  - 数值字号: 34px → 22px (当前太大，改为设计规范的 Stat 层级)
  - 圆角: 22px → 16px
  - 网格间距: gap-3 (12px) → gap-2.5 (10px)

保持不变的:
  - 功能色背景方案 (橙/粉/棕/蓝) ✓
  - emoji 图标替换为 lucide 图标 + 功能色 icon 容器:
    · 奶粉: lucide Baby, 图标容器 36×36px, 圆角 12px, bg #FFE0CC
    · 母乳: lucide Heart, 同上
    · 拉屎: lucide CircleDot, 同上
    · 拉尿: lucide Droplets, 同上
  - 信息层次: icon + 数值(22px 700) + 标签(12px 400 #999)
```

### 3.3 记录列表 (微调)

```
保持不变的:
  - 彩色圆点 ✓ (已实现)
  - 筛选按钮 ✓ (已实现)
  - 撤销功能 ✓ (已实现)

变更项:
  - 列表标题 "记录明细" 左侧竖线: 3×14px, bg #FF9A56, 圆角 2px (已有 ✓)
  - 类型标题: 保持 font-black → 改为 font-weight 600, 15px
  - 详情文字: 保持原样 ✓
  - 时间戳: 保持 HH:MM 格式 ✓ (已正确)
  - 右箭头按钮: 保留原有撤销功能 ✓
  - 列表容器: 保持白色圆角卡片样式 ✓
```

### 3.4 FAB 悬浮按钮 (新增)

```
定位: fixed, bottom 80px, right 24px, z-index 10
尺寸: 52×52px, 圆形
背景: linear-gradient(135deg, #FF9A56, #FF6B35)
投影: 0 4px 16px rgba(255, 107, 53, 0.35)
图标: lucide Plus (白色, 24px)

交互:
  - active: scale(0.92), transition 150ms
  - 点击: 显示分类选择 ActionSheet (复用 Home 页的逻辑)
    · 弹出 Vant ActionSheet: [奶粉喂养, 母乳喂养, 拉尿, 拉屎]
    · 选择后跳转到 Home 页并自动弹出对应的输入弹窗
    · (简单方案: 直接 emit 事件或 router.push('/') 后通过 query 参数触发)
```

### 3.5 空状态 (微调)

```
保持原有逻辑:
  - "今日还没有记录哦，快去首页记录吧~" ✓

微调:
  - 将 emoji 👶 替换为 lucide Baby 图标 (64px, color #E8D5C4)
  - 增加一个 "立即记录" CTA 按钮:
    pill 形状, bg #E65100, color #FFF, 14px 600, padding 8px 24px, 圆角 14px
    点击: router.push('/')
```

---

## 第四步：更新 App.vue（底部导航）

**修改文件**: `src/App.vue`

```
变更项:
  - max-width: 600px → 430px (匹配设计规范的 430px 上限)
  - Vant tabbar 的 active-color 保持 var(--primary-color) (已自动跟随新品牌色)
  - 图标大小: 保持默认或调整为 22px
  - 标签字号: 11px (通过 --van-tabbar-item-font-size)

保持不变:
  - van-tabbar 路由模式 ✓
  - 两个 tab: 记录 + 统计 ✓
  - 页面转场动画 (fade) ✓
```

---

## 第五步：验证与收尾

1. 运行 `npm run dev`，在浏览器中检查两个页面的视觉效果
2. 检查所有交互功能正常 (弹窗、记录、撤销、日期切换)
3. 确认移动端适配 (375px / 390px / 430px 三种宽度)
4. 确认暗色/亮色模式下颜色无异常 (如果有)
5. 检查 PWA manifest 的主题色是否需要同步更新

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增 lucide-vue-next 依赖 |
| `src/style.css` | 修改 | 更新 CSS 变量, 新增功能色 token |
| `src/views/Home.vue` | 重构 | 新增导航栏/计时器/今日概览, 重构卡片 |
| `src/views/Stats.vue` | 重构 | 重构日期选择器, 微调样式, 新增 FAB |
| `src/App.vue` | 微调 | 调整 max-width, tabbar 样式 |

**不需要修改的文件** (保持不动):
- `src/router/index.ts` — 路由不变
- `src/stores/records.ts` — 状态管理不变
- `src/utils/api.ts` — API 层不变
- `backend/` — 后端不变
- `plan/` — 文档不变
