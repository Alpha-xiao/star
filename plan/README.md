# BabyStar 项目计划与文档

欢迎来到 BabyStar 项目计划文件夹！这里包含了项目的完整架构设计、功能说明和文件文档。

## 📚 文档索引

| 文档                                       | 说明                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)       | 项目架构设计文档，包含整体架构、技术栈、数据流向等   |
| [BACKEND_DESIGN.md](./BACKEND_DESIGN.md)   | 后端架构设计方案，包含技术选型、API、模块划分        |
| [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | 数据库推荐与表结构设计，包含 ER 关系、索引、生命周期 |
| [FILES.md](./FILES.md)                     | 项目文件说明，详细介绍每个文件的用途                 |
| [FEATURES.md](./FEATURES.md)               | 功能清单，列出所有已完成功能的详细说明               |

## 🏗️ 项目简介

BabyStar 是一款专为新生儿护理设计的 H5 应用，采用 Vue 3 + TypeScript + Vite 技术栈开发。

**核心特性**：

- 极速记录（2步完成）
- 单手友好操作
- 离线存储与自动同步
- PWA 支持
- 治愈系 UI 设计

## 📁 项目结构

```
star/
├── src/
│   ├── views/           # 页面组件
│   ├── stores/          # 状态管理
│   ├── router/          # 路由配置
│   ├── utils/           # 工具函数
│   ├── App.vue          # 根组件
│   ├── main.ts          # 入口文件
│   └── style.css        # 全局样式
├── plan/                # 项目文档（本文件夹）
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎯 功能概览

### 已完成功能

- ✅ 记录拉屎、拉尿、母乳喂养、奶粉喂养
- ✅ 单手友好的大按钮设计
- ✅ 记录撤销功能
- ✅ 当日数据统计
- ✅ 离线暂存与自动同步
- ✅ PWA 支持

### 技术栈

- Vue 3.4.21
- TypeScript 6.0.3
- Vite 8.0.14
- Pinia 2.1.7
- Vant 4.8.2
- Tailwind CSS 4.3.1
- Fastify + Prisma + PostgreSQL

---

**项目状态**：开发中  
**最后更新**：2026-06-12
