# BabyStar 数据库设计方案

## 1. 数据库推荐

### 1.1 推荐结论

推荐使用 **PostgreSQL**。

BabyStar 后端已经采用 [Prisma Schema](file:///d:/workspace/star/backend/prisma/schema.prisma) 并配置为 PostgreSQL，因此数据库设计建议继续围绕 PostgreSQL 落地。

### 1.2 推荐原因

1. **结构化数据强**：护理记录、宝宝档案、用户、同步日志都适合关系型建模。
2. **时间范围查询友好**：项目核心查询是“某宝宝某一天/某一段时间的记录和统计”，PostgreSQL 对时间索引支持很好。
3. **事务可靠**：记录写入、软删除、同步状态更新需要可靠一致性。
4. **JSONB 支持好**：外部 Webhook 请求/响应可以存为 JSONB，便于审计和排查。
5. **Prisma 适配成熟**：当前后端方案 A 使用 Prisma，PostgreSQL 是 Prisma 的一等支持数据库。
6. **扩展空间大**：后续可支持多宝宝、多家庭成员、统计报表、趋势分析。

### 1.3 部署推荐

#### 开发环境

- 本地 Docker PostgreSQL
- 或本机 PostgreSQL

#### 生产环境

优先推荐：

- **Neon PostgreSQL**：轻量、托管、免费额度适合 MVP。
- **Supabase PostgreSQL**：自带控制台和 Auth 扩展能力。
- **腾讯云 PostgreSQL**：如果主要用户在国内，访问和合规更合适。

当前项目如果希望快速上线，推荐：

> **Neon PostgreSQL / Supabase PostgreSQL + Fastify API + Prisma**

如果希望国内访问稳定，推荐：

> **腾讯云 PostgreSQL + 腾讯云轻量服务器/云托管**

---

## 2. 业务数据范围

BabyStar 当前和后续需要保存的数据主要包括：

1. 用户信息
2. 宝宝档案
3. 护理记录
4. 外部同步日志
5. 未来可扩展的家庭成员关系、配置项、统计快照

当前 MVP 后端已经实现三张核心表：

- `users`
- `babies`
- `care_records`

对应 Prisma 模型位于 [schema.prisma](file:///d:/workspace/star/backend/prisma/schema.prisma)。

---

## 3. ER 关系设计

```text
users 1 ─── N babies
users 1 ─── N care_records
babies 1 ── N care_records
```

含义：

- 一个用户可以创建多个宝宝档案。
- 一个宝宝有多条护理记录。
- 每条护理记录由某个用户创建。
- 每条护理记录可能产生多条外部同步日志。

---

## 4. 表结构设计

## 4.1 users 用户表

### 作用

保存应用使用者信息。MVP 阶段可以先创建一个默认用户，后续再接入登录。

### 字段设计

| 字段       | 类型        | 约束            | 说明                 |
| ---------- | ----------- | --------------- | -------------------- |
| id         | uuid        | PK              | 用户 ID              |
| phone      | varchar     | unique nullable | 手机号，后续登录使用 |
| email      | varchar     | unique nullable | 邮箱，后续登录使用   |
| nickname   | varchar     | nullable        | 昵称                 |
| created_at | timestamptz | not null        | 创建时间             |
| updated_at | timestamptz | not null        | 更新时间             |

### Prisma 对应

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  phone     String?  @unique
  email     String?  @unique
  nickname  String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  babies  Baby[]
  records CareRecord[]

  @@map("users")
}
```

### 索引建议

- `phone` unique：手机号登录。
- `email` unique：邮箱登录。

---

## 4.2 babies 宝宝档案表

### 作用

保存宝宝基础信息。未来支持多宝宝、多家庭成员时，这是核心表。

### 字段设计

| 字段       | 类型        | 约束        | 说明                      |
| ---------- | ----------- | ----------- | ------------------------- |
| id         | uuid        | PK          | 宝宝 ID                   |
| owner_id   | uuid        | FK users.id | 所属用户                  |
| name       | varchar     | not null    | 宝宝名称                  |
| birthday   | date        | nullable    | 出生日期                  |
| gender     | varchar     | nullable    | 性别：male/female/unknown |
| created_at | timestamptz | not null    | 创建时间                  |
| updated_at | timestamptz | not null    | 更新时间                  |

### Prisma 对应

```prisma
model Baby {
  id        String   @id @default(uuid()) @db.Uuid
  ownerId   String   @map("owner_id") @db.Uuid
  name      String
  birthday  DateTime? @db.Date
  gender    String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  owner   User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  records CareRecord[]

  @@index([ownerId])
  @@map("babies")
}
```

### 索引建议

```sql
create index idx_babies_owner_id on babies(owner_id);
```

查询场景：

- 获取当前用户名下所有宝宝。

---

## 4.3 care_records 护理记录表

### 作用

保存所有护理记录，是项目最核心的数据表。

当前前端记录入口在 [Home.vue](file:///d:/workspace/star/src/views/Home.vue#L33-L87)，原本记录结构在 [api.ts](file:///d:/workspace/star/src/utils/api.ts#L3-L10)。后端应使用更规范的字段命名和枚举。

### 字段设计

| 字段        | 类型        | 约束            | 说明                          |
| ----------- | ----------- | --------------- | ----------------------------- |
| id          | uuid        | PK              | 服务端记录 ID                 |
| client_id   | varchar     | unique not null | 前端离线生成 ID，用于幂等同步 |
| baby_id     | uuid        | FK babies.id    | 所属宝宝                      |
| user_id     | uuid        | FK users.id     | 创建用户                      |
| event_type  | enum        | not null        | 事件类型                      |
| happened_at | timestamptz | not null        | 护理发生时间                  |
| duration    | integer     | nullable        | 母乳喂养时长，单位分钟        |
| side        | enum        | nullable        | 母乳侧别                      |
| amount      | integer     | nullable        | 奶粉量，单位 ml               |
| note        | text        | nullable        | 备注，如便便性状、尿量        |
| source      | enum        | not null        | 来源：web/pwa                 |
| sync_status | enum        | not null        | 外部同步状态                  |
| deleted_at  | timestamptz | nullable        | 软删除时间，用于撤销          |
| created_at  | timestamptz | not null        | 创建时间                      |
| updated_at  | timestamptz | not null        | 更新时间                      |

### 枚举设计

#### event_type

| 值            | 含义     | 对应前端 |
| ------------- | -------- | -------- |
| poop          | 拉屎     | 拉屎     |
| pee           | 拉尿     | 拉尿     |
| breastfeeding | 母乳喂养 | 母乳喂养 |
| formula       | 奶粉喂养 | 奶粉喂养 |

#### side

| 值    | 含义 |
| ----- | ---- |
| left  | 左侧 |
| right | 右侧 |
| both  | 双侧 |

#### source

| 值  | 含义     |
| --- | -------- |
| web | 普通网页 |
| pwa | PWA 应用 |

#### sync_status

| 值      | 含义           |
| ------- | -------------- |
| pending | 待同步外部系统 |
| synced  | 已同步         |
| failed  | 同步失败       |

### Prisma 对应

```prisma
model CareRecord {
  id         String        @id @default(uuid()) @db.Uuid
  clientId   String        @unique @map("client_id")
  babyId     String        @map("baby_id") @db.Uuid
  userId     String        @map("user_id") @db.Uuid
  eventType  CareEventType @map("event_type")
  happenedAt DateTime      @map("happened_at")
  duration   Int?
  side       BreastSide?
  amount     Int?
  note       String?
  source     RecordSource  @default(pwa)
  deletedAt  DateTime?     @map("deleted_at")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  baby     Baby              @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([babyId, happenedAt(sort: Desc)])
  @@index([userId, happenedAt(sort: Desc)])
  @@map("care_records")
}
```

### 索引建议

```sql
create unique index uniq_care_records_client_id on care_records(client_id);
create index idx_care_records_baby_happened_at on care_records(baby_id, happened_at desc);
create index idx_care_records_user_happened_at on care_records(user_id, happened_at desc);
```

### 关键查询场景

#### 查询某天记录

```sql
select *
from care_records
where baby_id = $1
  and deleted_at is null
  and happened_at >= $2
  and happened_at < $3
order by happened_at desc;
```

#### 每日统计

```sql
select
  sum(case when event_type = 'formula' then coalesce(amount, 0) else 0 end) as formula_amount,
  sum(case when event_type = 'breastfeeding' then coalesce(duration, 0) else 0 end) as breast_duration,
  count(*) filter (where event_type = 'poop') as poop_count,
  count(*) filter (where event_type = 'pee') as pee_count
from care_records
where baby_id = $1
  and deleted_at is null
  and happened_at >= $2
  and happened_at < $3;
```

### 数据校验建议

| 事件类型      | 必填字段       | 校验规则            |
| ------------- | -------------- | ------------------- |
| poop          | note 可选      | note 长度不超过 500 |
| pee           | note 可选      | note 长度不超过 500 |
| breastfeeding | duration, side | duration 1-180      |
| formula       | amount         | amount 1-500        |

---

## 4.4 external_sync_logs 外部同步日志表

### 作用

记录护理记录同步到外部服务的过程。当前后端同步逻辑位于后端模块中。

### 字段设计

| 字段            | 类型        | 约束               | 说明        |
| --------------- | ----------- | ------------------ | ----------- |
| id              | uuid        | PK                 | 日志 ID     |
| record_id       | uuid        | FK care_records.id | 护理记录 ID |
| target          | enum        | not null           | 同步目标    |
| status          | enum        | not null           | 同步结果    |
| request_payload | jsonb       | not null           | 请求内容    |
| response_body   | jsonb       | nullable           | 响应内容    |
| error_message   | text        | nullable           | 错误信息    |
| created_at      | timestamptz | not null           | 创建时间    |

### 枚举设计

#### target

| 值          | 含义     |
| ----------- | -------- |
| tencent_doc | 腾讯文档 |

#### status

| 值      | 含义     |
| ------- | -------- |
| success | 同步成功 |
| failed  | 同步失败 |

### Prisma 对应

```prisma
model ExternalSyncLog {
  id             String        @id @default(uuid()) @db.Uuid
  recordId       String        @map("record_id") @db.Uuid
  target         SyncTarget
  status         SyncLogStatus
  requestPayload Json          @map("request_payload")
  responseBody   Json?         @map("response_body")
  errorMessage   String?       @map("error_message")
  createdAt      DateTime      @default(now()) @map("created_at")

  record CareRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)

  @@index([recordId])
  @@map("external_sync_logs")
}
```

### 索引建议

```sql
create index idx_external_sync_logs_record_id on external_sync_logs(record_id);
```

---

## 5. 未来扩展表设计

以下表不建议 MVP 阶段立即实现，但建议设计上预留。

## 5.1 family_members 家庭成员表

### 作用

支持爸爸、妈妈、家人共同记录同一个宝宝。

| 字段       | 类型        | 说明                |
| ---------- | ----------- | ------------------- |
| id         | uuid        | 主键                |
| baby_id    | uuid        | 宝宝 ID             |
| user_id    | uuid        | 用户 ID             |
| role       | varchar     | owner/editor/viewer |
| created_at | timestamptz | 创建时间            |

建议唯一约束：

```sql
create unique index uniq_family_members_baby_user on family_members(baby_id, user_id);
```

## 5.2 baby_settings 宝宝配置表

### 作用

保存每个宝宝的个性化配置。

| 字段            | 类型        | 说明                     |
| --------------- | ----------- | ------------------------ |
| id              | uuid        | 主键                     |
| baby_id         | uuid        | 宝宝 ID                  |
| timezone        | varchar     | 时区，默认 Asia/Shanghai |
| tencent_doc_url | text        | 腾讯文档链接             |
| created_at      | timestamptz | 创建时间                 |
| updated_at      | timestamptz | 更新时间                 |

## 5.3 daily_stats_snapshot 每日统计快照表

### 作用

当数据量变大后，可以把每日统计结果定时落表，减少实时聚合压力。

| 字段            | 类型        | 说明       |
| --------------- | ----------- | ---------- |
| id              | uuid        | 主键       |
| baby_id         | uuid        | 宝宝 ID    |
| stat_date       | date        | 统计日期   |
| formula_amount  | integer     | 奶粉总量   |
| breast_duration | integer     | 母乳总时长 |
| poop_count      | integer     | 拉屎次数   |
| pee_count       | integer     | 拉尿次数   |
| created_at      | timestamptz | 创建时间   |
| updated_at      | timestamptz | 更新时间   |

建议唯一约束：

```sql
create unique index uniq_daily_stats_snapshot_baby_date on daily_stats_snapshot(baby_id, stat_date);
```

---

## 6. 数据生命周期设计

### 6.1 创建记录

```text
前端生成 clientId
  ↓
POST /api/records 或 POST /api/records/batch
  ↓
后端按 client_id 幂等 upsert
  ↓
care_records 写入
```

### 6.2 撤销记录

```text
DELETE /api/records/:id
  ↓
设置 deleted_at = now()
  ↓
统计时过滤 deleted_at is null
```

采用软删除的好处：

- 保留审计痕迹。
- 避免误删数据不可恢复。
- 后续可实现“撤销恢复”。

### 6.3 离线同步

```text
前端 localStorage.pending_records
  ↓
POST /api/records/batch
  ↓
后端通过 client_id 去重
  ↓
返回 success / failed
  ↓
前端移除成功项，保留失败项
```

---

## 7. Prisma 与数据库一致性建议

当前 [schema.prisma](file:///d:/workspace/star/backend/prisma/schema.prisma) 已经覆盖 MVP 需要的四张表。

建议后续做两点小增强：

1. 把 `Baby.gender` 从 `String?` 改成枚举。
2. 根据业务校验在 API 层限制不同 `eventType` 对应字段。

例如：

- `formula` 必须有 `amount`。
- `breastfeeding` 必须有 `duration` 和 `side`。
- `poop` / `pee` 不应提交 `amount`。

---

## 8. 初始化数据建议

MVP 阶段如果暂时不做登录，可以手动插入一个默认用户和宝宝：

```sql
insert into users (id, nickname, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', '默认用户', now(), now());

insert into babies (id, owner_id, name, birthday, gender, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'BabyStar',
  current_date,
  'unknown',
  now(),
  now()
);
```

前端接入后，可先固定使用：

```text
userId = 00000000-0000-0000-0000-000000000001
babyId = 00000000-0000-0000-0000-000000000101
```

等登录和宝宝档案功能完成后，再改为动态读取。

---

## 9. 数据库连接配置

后端环境变量位于 [backend/.env.example](file:///d:/workspace/star/backend/.env.example)。

示例：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/babystar?schema=public"
```

初始化步骤：

```powershell
cd backend
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
```

---

## 10. 结论

BabyStar 推荐使用 **PostgreSQL**，当前最小可用数据库设计为：

1. `users`：用户表
2. `babies`：宝宝档案表
3. `care_records`：护理记录主表

这套设计可以覆盖当前功能：

- 极速记录
- 离线批量同步
- 每日统计
- 历史记录查询
- 撤销记录

也可以平滑扩展到未来功能：

- 多宝宝
- 家庭成员协作
- 历史趋势图表
- 腾讯文档同步审计
- 日统计快照

---

**文档版本**：v1.0  
**最后更新**：2026-06-12
