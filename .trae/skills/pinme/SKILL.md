---
name: "pinme"
description: "将静态前端部署到 IPFS 以进行即时预览和去中心化托管。当用户想要部署应用、分享预览链接或发布应用时调用此 Skill。"
---

# PinMe Skill

此 Skill 用于将 BabyStar H5 应用部署到 IPFS。PinMe 是一个零配置的部署工具，非常适合快速分享预览链接。

## 使用场景

- **发布应用**：当开发完成，需要一个在线链接查看效果时。
- **分享预览**：向用户展示当前进度。
- **去中心化托管**：利用 IPFS 实现高可用性。

## 操作步骤

1. **构建项目**：在部署前，必须先运行构建命令生成静态文件。
   ```bash
   npm run build
   ```
2. **执行部署**：运行 PinMe 进行部署。
   ```bash
   npx pinme
   ```
3. **获取链接**：部署完成后，PinMe 会输出一个 IPFS CID 和一个预览 URL (例如 `https://pinme.io/xxx`)。

## 注意事项

- **路由模式**：由于 IPFS 是静态托管，建议将 Vue Router 设置为 `createWebHashHistory()` 模式，以避免刷新页面时出现 404 错误。
- **构建目录**：PinMe 默认会查找 `dist` 或 `build` 目录。Vite 默认输出目录为 `dist`，无需额外配置。
