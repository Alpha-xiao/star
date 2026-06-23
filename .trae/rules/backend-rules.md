---
alwaysApply: true
---

# BabyStar 后端规则

- 后端位于 `backend/`，采用 Fastify + Prisma + PostgreSQL。
- 后端职责：保存护理记录、批量同步离线记录、查询统计。
- 不要把 Webhook 密钥或数据库连接写死在前端；统一使用后端 `.env`。
- MVP 接口优先保持稳定：
  - `GET /health`
  - `POST /api/records`
  - `POST /api/records/batch`
  - `GET /api/records`
  - `DELETE /api/records/:id`
  - `GET /api/stats/daily`
  - `GET /api/stats/range`
- 写入记录必须支持 `clientId` 幂等，离线重试不能产生重复记录。
- 撤销记录使用软删除 `deletedAt`，统计和查询默认过滤软删除数据。
- 后端新增接口时使用 Zod 做入参校验，并保持中文注释。
