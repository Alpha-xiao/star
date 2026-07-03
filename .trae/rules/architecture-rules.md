---
alwaysApply: true
---

# BabyStar 架构规则

## 项目定位

- BabyStar 是新生儿护理记录 H5/PWA 应用，优先保证极速记录、单手友好、离线可用。
- 产品体验保持极简、治愈、移动端优先，不引入复杂交互。
- 记录链路要稳定：用户操作 → Pinia Store → localStorage → 后端 API → PostgreSQL/外部同步。

## 技术栈

- 前端使用 Vue 3 + TypeScript + Vite + Pinia + Vue Router + Vant + Tailwind CSS。
- 页面样式优先使用 Tailwind CSS 工具类，不再新增普通页面 scoped CSS。
- Vant 全局主题变量和 Vue Transition 必需样式可以保留在 CSS 中。

## 目录约定

- 页面组件放在 `src/views`。
- 状态管理放在 `src/stores`。
- 路由配置放在 `src/router`。
- API 和通用工具放在 `src/utils`。
- 后端服务放在 `backend/`。
- 完整设计文档放在 `plan/`，`.trae/rules/` 只保留精简执行规则。

## 命名规范

- 新增文件和目录统一使用短横线命名，即 kebab-case。
- 示例：`baby-profile.vue`、`record-card.vue`、`daily-stats.ts`。
- 不新增 PascalCase 或 camelCase 文件名；现有历史文件如 `Home.vue`、`Stats.vue` 可暂时保留，不主动重命名。
- Vue 组件内部变量、函数仍按现有 TypeScript 风格使用 camelCase。

## 数据与离线策略

- 本地先保存记录，再异步同步后端。
- 同步失败时写入 `localStorage.pending_records`。
- 应用启动和网络恢复时重试暂存记录。
- 统计页数据以数据库/后端返回为准，不只依赖本地 Store。

## 修改约束

- 修改代码时优先遵循现有目录结构和项目代码风格。
- 不随意删除 `plan/` 文档。
- 不将 Webhook 密钥、数据库连接等敏感配置写入前端源码。
