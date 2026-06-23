# BabyStar 项目架构设计文档

## 1. 项目概述

BabyStar 是一款专为新生儿护理设计的 H5 应用，旨在提供便捷、快速的日常护理记录功能。应用采用极简治愈风格设计，支持单手操作，确保在各种场景下都能轻松完成记录。

### 1.1 核心功能
- **极速记录**：2 步内完成任意护理记录
- **单手友好**：适配抱娃等单手操作场景
- **离线存储**：网络不佳时自动暂存数据
- **自动同步**：网络恢复后自动同步暂存记录
- **数据统计**：展示每日护理总量
- **宝宝档案**：创建和管理宝宝基本信息
- **PWA 支持**：离线访问和主屏幕安装

### 1.2 设计理念
- **极简主义**：界面简洁，操作直观
- **治愈系风格**：柔和的色彩搭配，缓解育儿焦虑
- **快速响应**：极致的性能优化，确保流畅体验

---

## 2. 技术栈

### 2.1 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4.21 | 前端框架 |
| TypeScript | 6.0.3 | 类型系统 |
| Vite | 8.0.14 | 构建工具 |

### 2.2 核心库
| 技术 | 版本 | 用途 |
|------|------|------|
| Pinia | 2.1.7 | 状态管理 |
| Vue Router | 4.3.0 | 路由管理 |
| Vant | 4.8.2 | UI 组件库 |
| lucide-vue-next | - | 图标库 |

### 2.3 开发工具
| 技术 | 版本 | 用途 |
|------|------|------|
| vite-plugin-pwa | 1.3.0 | PWA 支持 |
| unplugin-vue-components | 32.1.0 | 组件自动引入 |
| @vitejs/plugin-vue | 6.0.7 | Vue 插件 |
| Tailwind CSS | 4.3.1 | 样式框架 |

---

## 3. 项目结构

```
star/
├── src/
│   ├── views/           # 页面组件
│   │   ├── home.vue     # 记录首页
│   │   ├── stats.vue    # 统计页面
│   │   ├── profile.vue  # 宝宝档案查看/编辑页
│   │   └── profile-create.vue  # 宝宝档案创建页
│   ├── stores/          # Pinia 状态管理
│   │   ├── records.ts   # 记录数据存储
│   │   └── baby.ts      # 宝宝档案存储
│   ├── types/           # TypeScript 类型定义
│   │   └── baby.ts      # 宝宝档案类型
│   ├── router/          # 路由配置
│   │   └── index.ts     # 路由定义 + 路由守卫
│   ├── utils/           # 工具函数
│   │   └── api.ts       # API 和类型定义
│   ├── App.vue          # 根组件
│   ├── main.ts          # 入口文件
│   └── style.css        # 全局样式 + CSS 组件类
├── backend/             # 后端服务
│   ├── src/
│   │   ├── modules/
│   │   │   ├── records/ # 护理记录模块
│   │   │   └── stats/   # 统计模块
│   │   ├── plugins/     # Fastify 插件
│   │   ├── config.ts    # 运行时配置
│   │   └── main.ts      # 入口
│   └── prisma/
│       └── schema.prisma # 数据库模型
├── plan/                # 项目文档
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

---

## 4. 架构设计

### 4.1 整体架构

应用采用经典的 Vue 3 单页应用架构，主要分为以下几层：

```
┌──────────────────────────────────────────────────┐
│          视图层 (Views)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ home.vue │ │stats.vue │ │profile.vue│ │...  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┘ │
└──────────────┬───────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────┐
│       状态管理层 (Pinia Stores)                   │
│  ┌──────────────────┐ ┌──────────────────┐      │
│  │  useRecordStore  │ │  useBabyStore    │      │
│  └──────────────────┘ └──────────────────┘      │
└──────────────┬───────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────┐
│      工具层 (Utils)                              │
│  ┌────────────────────────────────────────┐     │
│  │  submitRecord() / fetchDailyStats()    │     │
│  │  createBaby() / getBabies()            │     │
│  │  syncPendingRecords()                  │     │
│  └────────────────────────────────────────┘     │
└──────────────┬───────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────┐
│      后端 API (Fastify + Prisma + PostgreSQL)    │
│  ┌────────────────────────────────────────┐     │
│  │  /api/records  /api/stats  /api/babies │     │
│  └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### 4.2 数据模型

```typescript
// 护理记录
interface BabyRecord {
  clientId?: string;
  event_type: string;    // 拉屎/拉尿/母乳喂养/奶粉喂养
  timestamp: string;
  duration?: number;
  side?: string;
  amount?: number;
  note?: string;
}

// 宝宝档案
interface Baby {
  id: string;
  name: string;
  birthday: string;      // YYYY-MM-DD
  gender: 'male' | 'female';
  birthWeight?: number;
  birthHeight?: number;
  bloodType?: 'A' | 'B' | 'AB' | 'O' | 'unknown';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. 功能模块详解

### 5.1 记录模块 (home.vue)

**功能描述**：
- 提供 4 个大按钮的网格布局，便于单手操作
- 每种记录类型都有对应的交互方式
- 支持快速撤销操作
- 右上角头像联动宝宝档案

**记录类型**：
1. **拉屎**：弹出 ActionSheet，选择便便性状
2. **拉尿**：弹出 ActionSheet，选择尿量或操作
3. **母乳喂养**：弹出 Dialog，选择喂养位置和时长
4. **奶粉喂养**：弹出 Dialog，输入奶量

**核心流程**：
```
用户点击按钮 → 弹出交互界面 → 提交数据 → 
保存到 Store → 调用后端 API → 显示成功提示
```

### 5.2 统计模块 (stats.vue)

**功能描述**：
- 显示当前日期，支持点击切换年月日
- 左右箭头切换日期，不能查看未来日期
- 统计当日各类护理数据的总量
- 记录明细列表，支持撤销

**统计指标**：
- 奶粉总量 (ml)
- 母乳时长 (分钟)
- 拉屎次数 (次)
- 拉尿次数 (次)

### 5.3 宝宝档案模块 (profile.vue / profile-create.vue)

**功能描述**：
- 创建宝宝档案：昵称、出生日期、性别、体重、身高、头像
- 查看宝宝档案：Hero 区域、数据卡片、基本信息、快捷操作
- 编辑宝宝档案：切换编辑模式修改信息
- 路由守卫：无档案时自动跳转创建页

### 5.4 状态管理模块

#### records.ts
- 存储当日所有记录
- 提供记录添加、撤销功能
- 自动同步到 localStorage

#### baby.ts
- 存储宝宝档案信息
- 计算出生天数、年龄文案
- localStorage 持久化 + 后端同步

### 5.5 API 模块 (api.ts)

**功能描述**：
- 定义数据类型
- 提供记录提交、统计查询接口
- 提供宝宝档案 CRUD 接口
- 处理离线暂存逻辑
- 动态获取当前宝宝 ID

**容错机制**：
- 网络失败时自动存入 `localStorage.pending_records`
- 网络恢复时自动同步
- 应用启动时检查并同步暂存数据

---

## 6. 数据流向

### 6.1 记录流程

```
1. 用户在 Home 页点击记录按钮
2. 完成交互操作（选择/输入）
3. 构造 BabyRecord 对象
4. 调用 store.addRecord() 存入状态
5. 调用 submitRecord() 提交后端 API
   ├─ 成功：完成
   └─ 失败：存入 pending_records
6. 显示成功提示
```

### 6.2 同步流程

```
1. App.vue 组件挂载
2. 调用 syncPendingRecords()
3. 读取 localStorage.pending_records
4. 批量提交到后端 API
5. 成功提交的记录从 pending 中移除
6. 监听在线状态，网络恢复时再次触发同步
```

### 6.3 统计流程

```
1. stats.vue 组件渲染
2. 调用 fetchDailyStats() + fetchDailyRecords()
3. 后端返回统计数据
4. 渲染统计卡片 + 记录明细列表
```

### 6.4 宝宝档案流程

```
1. App.vue 启动 → loadBaby() 从后端加载
2. 无档案 → beforeEach 守卫重定向到 /profile/create
3. 填写信息 → createBaby() → 跳转首页
4. 首页头像 → 点击跳转 /profile 查看
5. 编辑 → updateBaby() → 刷新显示
```

---

## 7. 路由设计

| 路径 | 名称 | 组件 | 说明 |
|------|------|------|------|
| / | home | home.vue | 记录首页 |
| /stats | stats | stats.vue | 统计页面 |
| /profile | profile | profile.vue | 宝宝档案查看/编辑 |
| /profile/create | profileCreate | profile-create.vue | 宝宝档案创建 |

**路由守卫**：
- 无档案时自动跳转 `/profile/create`
- 已有档案时 `/profile/create` 自动跳转 `/`
- `/profile` 和 `/profile/create` 页面隐藏底部 Tabbar

---

## 8. 样式系统

### 8.1 CSS 变量

```css
:root {
  --brand-primary: #E65100;
  --brand-secondary: #FF9A56;
  --brand-light: #FFF3E0;
  --bg-color: #FAF5F0;
  --text-primary: #2D2D2D;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --text-disabled: #CCCCCC;
  --border-light: #F0F0F0;
  --surface-pressed: #FFF8F0;
  --card-shadow: 0 6px 18px rgba(80, 55, 30, 0.1);
  --radius-large: 20px;
  --radius-small: 16px;
  --radius-button: 14px;
  /* 功能色 */
  --formula-color: #E65100;
  --formula-bg: #FFEAD6;
  --formula-icon-bg: #FFD5B8;
  --breast-color: #C62828;
  --breast-bg: #FFE3EC;
  --breast-icon-bg: #FFC7D6;
  --urine-color: #1565C0;
  --urine-bg: #DFF0FF;
  --urine-icon-bg: #B8DDFF;
  --stool-color: #5D4037;
  --stool-bg: #E2CDB8;
  --stool-icon-bg: #D4B89E;
}
```

### 8.2 CSS 组件类

语义化组件类定义在 `src/style.css`，模板中直接使用类名：

| 类名 | 用途 |
|------|------|
| `press` | 按压反馈工具类 |
| `timer-card` | 计时器卡片 |
| `record-btn` | 首页记录按钮 |
| `record-badge` | 记录按钮右上角标 |
| `record-icon` | 记录按钮图标容器 |
| `card-stat` | 统计卡片 |
| `stat-icon` | 统计卡片图标容器 |
| `btn-today` | 「今天」按钮 |
| `btn-day-nav` | 日期导航按钮 |
| `record-list` | 记录列表容器 |
| `record-item` | 记录列表项 |
| `btn-undo` | 撤销按钮 |
| `brand-logo` | 品牌 Logo |
| `user-avatar` | 用户头像 |

### 8.3 响应式设计
- 最大宽度 430px，居中布局
- 适配移动设备
- 支持刘海屏安全区域

---

## 9. PWA 配置

### 9.1 清单信息
- 名称：BabyStar - 新生儿护理记录
- 短名称：BabyStar
- 主题色：#FFB6C1
- 图标：192x192、512x512

### 9.2 服务工作者
- 注册类型：autoUpdate
- 自动更新策略

---

## 10. 开发指南

### 10.1 本地开发
```bash
npm install
npm run dev
```

### 10.2 构建部署
```bash
npm run build
npm run preview
```

### 10.3 代码规范
- 使用 TypeScript 类型系统
- 组件采用 Composition API
- 样式优先使用 Tailwind CSS 工具类 + CSS 组件类
- 状态管理使用 Pinia
- 文件和目录使用 kebab-case 命名

---

## 11. 扩展建议

### 11.1 未来功能
- [ ] 历史记录查询
- [ ] 图表可视化
- [ ] 数据导出功能
- [ ] 多宝宝支持
- [ ] 家庭成员协作
- [ ] 生长曲线

### 11.2 优化方向
- [ ] 优化首次加载性能
- [ ] 添加单元测试
- [ ] CI/CD 自动化部署
- [ ] 错误监控和日志收集
- [ ] 国际化支持

---

## 12. 注意事项

### 12.1 数据持久化
- 记录数据通过后端 API 持久化到 PostgreSQL
- 暂存记录在网络恢复后会自动同步
- 宝宝档案同时缓存到 localStorage 和后端

### 12.2 浏览器兼容性
- 推荐使用现代浏览器
- PWA 功能需要 HTTPS 环境（本地开发除外）

---

**文档版本**：v2.0  
**最后更新**：2026-06-17  
**维护者**：项目团队
