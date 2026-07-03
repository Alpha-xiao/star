---
alwaysApply: true
---

# BabyStar 数据库规则

- 数据库推荐并默认使用 PostgreSQL。
- ORM 使用 Prisma，模型定义以 `backend/prisma/schema.prisma` 为准。
- 核心表：
  - `users`：用户
  - `babies`：宝宝档案
  - `care_records`：护理记录
- 护理记录主表必须包含：`clientId`、`babyId`、`userId`、`eventType`、`happenedAt`、`deletedAt`。
- `clientId` 必须唯一，用于离线批量同步幂等。
- 统计查询应基于 `babyId + happenedAt`，并排除 `deletedAt` 不为空的数据。
- 关键索引必须保留：
  - `care_records(client_id)` 唯一索引
  - `care_records(baby_id, happened_at desc)`
  - `care_records(user_id, happened_at desc)`
- 详细数据库设计参考 `plan/DATABASE_DESIGN.md`。
