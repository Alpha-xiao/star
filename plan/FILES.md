# BabyStar 项目文件说明

## 根目录文件

### package.json

项目依赖和脚本配置文件，定义了项目名称、版本、依赖包和可用命令。

**主要脚本**：

- `npm run dev`：启动开发服务器
- `npm run build`：构建生产版本
- `npm run preview`：预览构建结果

### vite.config.ts

Vite 构建工具配置文件，配置了以下功能：

- Vue 插件支持
- 组件自动引入（Vant）
- PWA 支持
- 路径别名 `@`
- 开发服务器配置

### tsconfig.json

TypeScript 编译器配置文件，定义了：

- 模块解析策略
- 路径映射
- 编译选项

### index.html

应用入口 HTML 文件，包含：

- 移动端视口配置
- Apple PWA 支持
- 应用标题

### .gitignore

Git 忽略文件配置，排除了：

- node_modules/
- dist/
- 编辑器配置文件
- 日志文件

---

## src/ 目录

### main.ts

应用入口文件，负责：

- 创建 Vue 应用实例
- 初始化 Pinia 状态管理
- 配置路由
- 引入全局样式和 Vant 样式
- 挂载应用

### App.vue

根组件，负责：

- 路由视图渲染
- 底部 TabBar 导航
- 应用生命周期管理
- 网络状态监听和数据同步

### style.css

全局样式文件，定义了：

- CSS 变量
- 主题色配置
- 基础样式
- 安全区域适配

### vite-env.d.ts

Vite 类型声明文件，提供：

- Vite 环境变量类型
- Vue 文件类型支持

---

## src/views/ 目录

### Home.vue

记录首页组件，提供核心记录功能：

**功能区域**：

1. 顶部标题和撤销按钮
2. 2x2 网格菜单（大按钮）
3. ActionSheet 弹出层（拉屎/拉尿选项）
4. Dialog 弹窗（母乳/奶粉输入）

**核心方法**：

- `handleRecord()`：统一记录提交逻辑
- `onUndo()`：撤销操作
- `onPoopSelect()` / `onPeeSelect()`：选项处理
- `submitBreast()` / `submitFormula()`：表单提交

### Stats.vue

统计页面组件，展示当日护理汇总：

**功能区域**：

1. 日期标题
2. 空状态提示
3. 统计卡片网格
4. 腾讯文档跳转按钮

**计算属性**：

- `currentDate`：当前日期显示
- `summary`：统计数据计算

---

## src/stores/ 目录

### records.ts

Pinia 状态管理文件，管理记录数据：

**状态**：

- `todayRecords`：当日记录数组

**方法**：

- `addRecord()`：添加新记录
- `undoLastRecord()`：撤销最后一条
- `saveToLocal()`：保存到 localStorage
- `sortedRecords`：排序后的记录（计算属性）

**数据持久化**：

- 初始化时从 localStorage 读取
- 修改时自动保存
- 键名：`today_records`

---

## src/router/ 目录

### index.ts

路由配置文件，定义了应用路由：

**路由表**：

- `/` → Home 组件（首页）
- `/stats` → Stats 组件（统计页）

**配置**：

- 使用 History 模式路由
- 支持 Vue Router 导航

---

## src/utils/ 目录

### api.ts

API 工具文件，提供数据同步功能：

**类型定义**：

- `BabyRecord`：记录数据类型

**方法**：

- `submitRecord()`：提交记录到后端接口
- `syncPendingRecords()`：同步暂存记录
- `fetchTodayStats()`：查询后端当日统计
- `fetchTodayRecords()`：查询后端当日记录列表

**离线策略**：

- 网络失败时存入 `pending_records`
- 网络恢复时自动同步
- 支持批量提交

**后端接口配置**：

- 前端通过 `VITE_API_BASE_URL` 指向后端 API
- 请求方法：JSON over HTTP

---

## components.d.ts

组件类型声明文件，由 `unplugin-vue-components` 自动生成，包含：

- Vant 组件类型
- Vue Router 组件类型
- 全局组件类型声明

---

## 其他注意事项

### 生成文件说明

项目源码目录不应保留由 `vue-tsc` 生成的 `.js` 文件。

- `tsconfig.json` 已开启 `noEmit: true`
- 开发时只编辑 `.ts` / `.vue` 源文件
- 如发现 `src/**/*.js`，应确认后清理

### 本地存储键

- `today_records`：当日记录数据
- `pending_records`：待同步记录数据

### 第三方服务

- 腾讯文档：完整报表查看（需用户配置链接）

---

**文档版本**：v1.0  
**最后更新**：2026-06-12
