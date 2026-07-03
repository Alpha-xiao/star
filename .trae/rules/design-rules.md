---
alwaysApply: true
---

# BabyStar UI 设计规范 (Design Rules)

## 色彩体系 (Color Tokens)

### 品牌色

| Token               | 色值      | 用途                            |
| ------------------- | --------- | ------------------------------- |
| `--brand-primary`   | `#E65100` | 主品牌色，高亮、按钮、active 态 |
| `--brand-secondary` | `#FF9A56` | 辅助品牌色                      |
| `--brand-light`     | `#FFF3E0` | 品牌浅色底                      |

> **计时器卡片渐变**：`linear-gradient(135deg, #FFAB40 → #E65100)`，通过明亮起点 + 深色终点提供更强的层次对比，辅助文字使用 `text-white/90` / `text-white/80` 透明度而非 opacity，避免叠加白噪点。

### 功能色 (记录类型专属色)

| 类型           | 文字色    | 背景色    | 图标底色  |
| -------------- | --------- | --------- | --------- |
| 奶粉 (formula) | `#E65100` | `#FFEAD6` | `#FFD5B8` |
| 母乳 (breast)  | `#C62828` | `#FFE3EC` | `#FFC7D6` |
| 拉尿 (urine)   | `#1565C0` | `#DFF0FF` | `#B8DDFF` |
| 拉屎 (stool)   | `#5D4037` | `#E2CDB8` | `#D4B89E` |

> 功能色背景与页面主背景 `#FAF5F0` 形成可识别的色差，「+」按钮使用对应的图标底色 + 文字色，避免与浅灰 `#F5F5F5` 融合。

### 中性色

| Token               | 色值      | 用途                |
| ------------------- | --------- | ------------------- |
| `--bg-color`        | `#FAF5F0` | 页面背景（暖米色）  |
| `--text-primary`    | `#2D2D2D` | 主文字              |
| `--text-secondary`  | `#666666` | 次要文字            |
| `--text-tertiary`   | `#999999` | 辅助文字            |
| `--text-disabled`   | `#CCCCCC` | 禁用态              |
| `--border-light`    | `#F0F0F0` | 轻边框              |
| `--surface-pressed` | `#FFF8F0` | 卡片/列表按压态底色 |

## 字体层级

| 层级    | 字号 | 字重           | 颜色              | 用途              |
| ------- | ---- | -------------- | ----------------- | ----------------- |
| H1      | 18px | 700 (Bold)     | `--text-primary`  | 页面标题/品牌名   |
| H2      | 16px | 600 (Semibold) | `--text-primary`  | 区域标题          |
| Body1   | 15px | 600 (Semibold) | `#333`            | 列表标题/卡片标签 |
| Body2   | 13px | 400 (Regular)  | `--text-tertiary` | 列表详情/辅助说明 |
| Stat    | 22px | 700 (Bold)     | `#333`            | 统计数值          |
| Caption | 12px | 400 (Regular)  | `--text-tertiary` | 时间戳/备注       |
| Timer   | 28px | 700 (Bold)     | `#FFFFFF`         | 计时器大数字      |

## 间距系统 (基于 4px)

| Token | 值   | 用途                    |
| ----- | ---- | ----------------------- |
| `xs`  | 4px  | 图标与文字微间距        |
| `sm`  | 8px  | 列表项内部间距          |
| `md`  | 12px | 卡片网格间距            |
| `lg`  | 16px | 区块间距/卡片内 padding |
| `xl`  | 20px | 页面水平 padding        |
| `2xl` | 24px | 区块间垂直分隔          |

## 圆角系统

| 元素        | 圆角        |
| ----------- | ----------- |
| 卡片 (大)   | 20px        |
| 卡片 (统计) | 16px        |
| 图标容器    | 12px / 16px |
| 药丸按钮    | 14px        |
| 头像 / FAB  | 50% (圆形)  |

## 投影

| 元素   | 阴影                                  |
| ------ | ------------------------------------- |
| 卡片   | `0 6px 18px rgba(80, 55, 30, 0.1)`    |
| FAB    | `0 4px 16px rgba(255, 107, 53, 0.35)` |
| 导航栏 | `border-top: 1px solid #F0F0F0`       |

> 卡片阴影使用偏暖的棕灰色，避免黑色阴影在暖米色背景上发灰。

## 交互规范

- **按压反馈**: `transform: scale(0.96); opacity: 0.85; transition: 150ms ease`（统一使用 `press` 工具类）
- **页面转场**: 右滑入 + 左滑出, duration 300ms, ease-out
- **底部弹窗**: 从底部滑入, duration 250ms, spring 弹性动画
- **次级按钮（如「今天」）**：白底 + `1px var(--brand-primary)` 描边 + 品牌色文字，区别于主按钮的实心橙色填充（统一使用 `btn-today` 组件类）
- **底部 Tabbar**：`active` 索引必须由当前路由计算，不可使用静态默认值，防止页面切换后出现高亮错位

## 图标规范

- **禁止使用 emoji 作为图标**，统一使用 `lucide-vue-next` 图标库
- 图标尺寸: 导航 22px, 卡片内 28px, 列表内 14px
- 图标颜色跟随功能色体系

## 响应式

- 目标设备: iPhone SE (375px) ~ iPhone 15 Pro Max (430px)
- 页面宽度: 100vw, max-width 430px, margin: 0 auto
- 锁定竖屏

## CSS 组件类

> 以下语义化组件类定义在 `src/style.css`，模板中直接使用类名即可，无需重复编写长 Tailwind class 组合。

| 类名           | 用途             | 说明                                       |
| -------------- | ---------------- | ------------------------------------------ |
| `press`        | 按压反馈工具类   | 统一 `scale(0.96) + opacity(0.85)`         |
| `timer-card`   | 计时器卡片       | 渐变背景 + 圆角 + 投影 + 内边距            |
| `record-btn`   | 首页记录按钮     | flex 纵向居中 + 圆角 + 投影                |
| `record-badge` | 记录按钮右上角标 | 绝对定位 + 圆形 + 18px                     |
| `record-icon`  | 记录按钮图标容器 | 52px 方形 + 16px 圆角                      |
| `card-stat`    | 统计卡片         | 16px 圆角 + 投影 + 内边距                  |
| `stat-icon`    | 统计卡片图标容器 | 36px 方形 + 12px 圆角                      |
| `btn-today`    | 「今天」按钮     | 白底 + 品牌色描边 + 品牌色文字 + 14px 圆角 |
| `btn-day-nav`  | 日期导航按钮     | 28px 圆形 + 白底 + 轻阴影                  |
| `record-list`  | 记录列表容器     | 滚动 + 20px 圆角 + 白底 + 投影             |
| `record-item`  | 记录列表项       | grid 三栏 + 底边框 + 末项无边框            |
| `btn-undo`     | 撤销按钮         | 20px 圆形 + 禁用色 + 按压态                |
| `brand-logo`   | 品牌 Logo        | 渐变背景 + 8px 圆角 + 28px                 |
| `user-avatar`  | 用户头像         | 圆形 + 白边框 + 投影 + 32px                |
