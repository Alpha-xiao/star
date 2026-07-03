# BabyStar 后端架构设计方案

## 1. 背景与现状

当前 BabyStar 是一个前端优先的 H5/PWA 应用，记录数据通过前端提交到后端 API，并在本地使用 `localStorage` 做缓存与离线暂存。

当前关键实现：

- 记录入口：[Home.vue](file:///d:/workspace/star/src/views/Home.vue#L33-L52)
- 本地状态：[records.ts](file:///d:/workspace/star/src/stores/records.ts#L5-L48)
- API 同步：[api.ts](file:///d:/workspace/star/src/utils/api.ts#L12-L74)
- 应用启动与网络恢复同步：[App.vue](file:///d:/workspace/star/src/App.vue#L7-L13)

这种方案适合 MVP，但存在几个限制：

1. Webhook 地址暴露在前端，无法隐藏密钥或做鉴权。
2. 数据只在本地完整保存，换设备后无法查看历史记录。
3. 撤销只影响本地记录，已提交到 Webhook 的数据无法可靠回滚。
4. 统计只能基于当前浏览器本地数据，无法做跨天、跨设备、趋势分析。
5. 缺少用户、宝宝档案、权限和审计能力。

因此，如果 BabyStar 后续要长期使用或多设备同步，建议补充轻量后端。

---

## 2. 后端建设目标

### 2.1 核心目标

- 保存所有护理记录，支持跨设备同步。
- 提供按日期查询、统计汇总能力。
- 保护第三方 Webhook 或腾讯文档同步配置，不暴露在前端。
- 支持离线记录的批量同步和幂等写入。
- 为未来多宝宝、多家庭成员协作预留扩展空间。

### 2.2 非目标

当前阶段不建议一开始做复杂能力：

- 不做复杂社交体系。
- 不做大型后台管理系统。
- 不做重型微服务架构。
- 不做复杂报表引擎。

BabyStar 的后端应保持“小而稳”：记录可靠、查询方便、同步安全。

---

## 3. 推荐架构

### 3.1 架构模式

推荐采用：

**前端 PWA + 轻量 API 后端 + 数据库 + 后台同步任务**

```text
┌────────────────────┐
│  BabyStar H5/PWA   │
│  Vue + Pinia       │
└─────────┬──────────┘
          │ HTTPS JSON API
┌─────────▼──────────┐
│  Backend API       │
│  鉴权 / 记录 / 统计 │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│  Database          │
│  users/babies/...  │
└────────────────────┘
```

### 3.2 推荐技术选型

#### 方案 A：Node.js 后端，最贴合当前前端技术栈

推荐组合：

- Runtime：Node.js 20+
- Framework：NestJS 或 Fastify
- ORM：Prisma
- Database：PostgreSQL
- Cache/Queue：Redis + BullMQ（可选）
- Auth：JWT + refresh token，或家庭共享码
- Deploy：Railway / Render / Fly.io / 自建服务器 / 腾讯云轻量服务器

适用场景：

- 希望项目长期演进。
- 后续可能做多用户、多宝宝、多端同步。
- 需要较强的类型约束和工程规范。

#### 方案 B：Serverless/BaaS，最快落地

推荐组合：

- Supabase：PostgreSQL + Auth + Edge Functions
- 或腾讯云 CloudBase：云函数 + 云数据库

适用场景：

- 想快速上线。
- 后端开发投入较少。
- 接受平台绑定。

#### 方案 C：保留 Webhook，但增加代理后端

推荐组合：

- 一个轻量 API：`POST /records`
- 后端内部转发到外部服务
- 同时保存一份到数据库

适用场景：

- 希望最小改造前端。
- 先解决历史查询问题。

**本项目推荐从方案 C 起步，逐步演进到方案 A。**

---

## 4. 领域模型设计

### 4.1 核心实体

#### User 用户

代表使用应用的家长或照护人。

```ts
interface User {
  id: string;
  phone?: string;
  email?: string;
  nickname?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Baby 宝宝

一个用户可以管理一个或多个宝宝。

```ts
interface Baby {
  id: string;
  ownerId: string;
  name: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'unknown';
  createdAt: string;
  updatedAt: string;
}
```

#### CareRecord 护理记录

对应当前前端的 `BabyRecord`，但后端应增加 `id`、`babyId`、同步状态等字段。

```ts
type CareEventType = 'poop' | 'pee' | 'breastfeeding' | 'formula';

type BreastSide = 'left' | 'right' | 'both';

interface CareRecord {
  id: string;
  clientId: string;
  babyId: string;
  userId: string;
  eventType: CareEventType;
  happenedAt: string;
  duration?: number;
  side?: BreastSide;
  amount?: number;
  note?: string;
  source: 'web' | 'pwa';
  syncStatus: 'pending' | 'synced' | 'failed';
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

字段说明：

- `id`：服务端主键。
- `clientId`：前端离线生成的唯一 ID，用于幂等同步。
- `babyId`：所属宝宝。
- `userId`：创建人。
- `happenedAt`：护理发生时间。
- `deletedAt`：软删除，用于撤销和审计。

#### ExternalSyncLog 外部同步日志

记录同步到外部服务的结果。

```ts
interface ExternalSyncLog {
  id: string;
  recordId: string;
  target: string;
  status: 'success' | 'failed';
  requestPayload: unknown;
  responseBody?: unknown;
  errorMessage?: string;
  createdAt: string;
}
```

---

## 5. 数据库表设计

以 PostgreSQL 为例：

### 5.1 users

| 字段       | 类型        | 说明         |
| ---------- | ----------- | ------------ |
| id         | uuid        | 主键         |
| phone      | varchar     | 手机号，可选 |
| email      | varchar     | 邮箱，可选   |
| nickname   | varchar     | 昵称         |
| created_at | timestamptz | 创建时间     |
| updated_at | timestamptz | 更新时间     |

### 5.2 babies

| 字段       | 类型        | 说明     |
| ---------- | ----------- | -------- |
| id         | uuid        | 主键     |
| owner_id   | uuid        | 用户 ID  |
| name       | varchar     | 宝宝名称 |
| birthday   | date        | 出生日期 |
| gender     | varchar     | 性别     |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 5.3 care_records

| 字段        | 类型        | 说明          |
| ----------- | ----------- | ------------- |
| id          | uuid        | 主键          |
| client_id   | varchar     | 客户端唯一 ID |
| baby_id     | uuid        | 宝宝 ID       |
| user_id     | uuid        | 创建用户 ID   |
| event_type  | varchar     | 事件类型      |
| happened_at | timestamptz | 发生时间      |
| duration    | integer     | 时长，分钟    |
| side        | varchar     | 母乳侧别      |
| amount      | integer     | 奶粉量，ml    |
| note        | text        | 备注          |
| source      | varchar     | 来源          |
| sync_status | varchar     | 外部同步状态  |
| deleted_at  | timestamptz | 软删除时间    |
| created_at  | timestamptz | 创建时间      |
| updated_at  | timestamptz | 更新时间      |

建议索引：

```sql
create unique index uniq_care_records_client_id on care_records(client_id);
create index idx_care_records_baby_happened_at on care_records(baby_id, happened_at desc);
create index idx_care_records_user_happened_at on care_records(user_id, happened_at desc);
```

### 5.4 external_sync_logs

| 字段            | 类型        | 说明     |
| --------------- | ----------- | -------- |
| id              | uuid        | 主键     |
| record_id       | uuid        | 记录 ID  |
| target          | varchar     | 同步目标 |
| status          | varchar     | 结果     |
| request_payload | jsonb       | 请求内容 |
| response_body   | jsonb       | 响应内容 |
| error_message   | text        | 错误信息 |
| created_at      | timestamptz | 创建时间 |

---

## 6. API 设计

### 6.1 认证相关

#### POST /auth/login

用于短信、邮箱或简易口令登录。

```json
{
  "phone": "13800000000",
  "code": "123456"
}
```

返回：

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "nickname": "妈妈"
  }
}
```

MVP 阶段也可以先不做手机号，改用家庭共享码：

```json
{
  "familyCode": "BABY2026"
}
```

### 6.2 宝宝档案

#### GET /babies

获取当前用户可访问的宝宝列表。

#### POST /babies

创建宝宝档案。

```json
{
  "name": "小星星",
  "birthday": "2026-06-01",
  "gender": "unknown"
}
```

### 6.3 护理记录

#### POST /records

创建单条护理记录。

```json
{
  "clientId": "client-uuid-001",
  "babyId": "baby-id",
  "eventType": "formula",
  "happenedAt": "2026-06-12T08:30:00+08:00",
  "amount": 60,
  "source": "pwa"
}
```

返回：

```json
{
  "id": "record-id",
  "clientId": "client-uuid-001",
  "status": "created"
}
```

幂等要求：

- 如果 `clientId` 已存在，返回已存在的记录，不重复创建。
- 前端离线同步时可以安全重试。

#### POST /records/batch

批量同步离线记录。

```json
{
  "records": [
    {
      "clientId": "client-uuid-001",
      "babyId": "baby-id",
      "eventType": "pee",
      "happenedAt": "2026-06-12T09:00:00+08:00",
      "note": "量多",
      "source": "pwa"
    }
  ]
}
```

返回：

```json
{
  "success": ["client-uuid-001"],
  "failed": []
}
```

#### GET /records

按日期范围查询记录。

查询参数：

```text
babyId=baby-id&from=2026-06-12&to=2026-06-13
```

返回：

```json
{
  "items": [
    {
      "id": "record-id",
      "eventType": "pee",
      "happenedAt": "2026-06-12T09:00:00+08:00",
      "note": "量多"
    }
  ]
}
```

#### DELETE /records/:id

撤销记录，建议实现为软删除。

返回：

```json
{
  "success": true
}
```

### 6.4 统计接口

#### GET /stats/daily

查询某天统计数据。

查询参数：

```text
babyId=baby-id&date=2026-06-12
```

返回：

```json
{
  "date": "2026-06-12",
  "formulaAmount": 360,
  "breastDuration": 75,
  "poopCount": 4,
  "peeCount": 8
}
```

#### GET /stats/range

查询一段时间趋势。

查询参数：

```text
babyId=baby-id&from=2026-06-01&to=2026-06-12
```

返回：

```json
{
  "items": [
    {
      "date": "2026-06-12",
      "formulaAmount": 360,
      "breastDuration": 75,
      "poopCount": 4,
      "peeCount": 8
    }
  ]
}
```

---

## 7. 前端改造建议

### 7.1 API 层替换

当前 [api.ts](file:///d:/workspace/star/src/utils/api.ts#L12-L74) 直接提交后端 API。接入后端后建议改为：

```text
submitRecord(record)
  ↓
POST /records 或 POST /records/batch
  ↓
后端保存数据库
  ↓
后端异步同步外部服务
```

### 7.2 记录 ID 设计

前端创建记录时补充：

- `clientId`：用 `crypto.randomUUID()` 生成。
- `babyId`：从当前宝宝档案读取。
- `happenedAt`：使用 ISO 时间格式，替代本地字符串。

建议前端数据结构演进为：

```ts
interface BabyRecord {
  clientId: string;
  babyId: string;
  eventType: 'poop' | 'pee' | 'breastfeeding' | 'formula';
  happenedAt: string;
  duration?: number;
  side?: 'left' | 'right' | 'both';
  amount?: number;
  note?: string;
}
```

### 7.3 本地缓存策略

保留当前 `localStorage` 离线能力，但建议拆分：

- `today_records`：用于界面即时展示。
- `pending_records`：仅保存未成功同步的记录。
- `current_baby_id`：当前选择的宝宝。
- `access_token`：登录令牌，后续可迁移到更安全方案。

### 7.4 撤销能力

当前撤销只调用 [records.ts](file:///d:/workspace/star/src/stores/records.ts#L23-L30) 删除本地最后一条记录。接入后端后建议：

1. 本地立即隐藏该记录，提升体验。
2. 如果记录已同步，调用 `DELETE /records/:id`。
3. 如果记录未同步，从 `pending_records` 移除即可。

---

## 8. 后端内部模块划分

以 NestJS 为例：

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── jwt.strategy.ts
│   ├── babies/
│   │   ├── babies.controller.ts
│   │   ├── babies.service.ts
│   │   └── dto/
│   ├── records/
│   │   ├── records.controller.ts
│   │   ├── records.service.ts
│   │   └── dto/
│   ├── stats/
│   │   ├── stats.controller.ts
│   │   └── stats.service.ts
│   ├── sync/
│   │   ├── sync.service.ts
│   │   └── sync.processor.ts
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

模块职责：

| 模块    | 职责                               |
| ------- | ---------------------------------- |
| auth    | 登录、鉴权、令牌刷新               |
| babies  | 宝宝档案管理                       |
| records | 护理记录增删查、批量同步、幂等写入 |
| stats   | 日统计、区间统计                   |
| sync    | 同步腾讯文档/Webhook、失败重试     |
| prisma  | 数据库访问                         |

---

## 9. 安全设计

### 9.1 鉴权

MVP 推荐两种方式：

1. **家庭共享码**：简单好用，适合家庭内部使用。
2. **手机号/邮箱登录**：更正式，适合公开发布。

所有接口除登录外都应携带：

```text
Authorization: Bearer <accessToken>
```

### 9.2 权限

- 用户只能访问自己名下或被共享的宝宝。
- 创建、删除记录时必须校验 `babyId` 权限。
- 后续可扩展家庭成员角色：owner、editor、viewer。

### 9.3 敏感配置

以下内容必须放到后端环境变量：

```text
DATABASE_URL=
JWT_SECRET=
TENCENT_DOC_CONFIG=
```

不要再把敏感 URL 放在前端源码中。

### 9.4 数据校验

后端需要校验：

- `eventType` 必须在枚举内。
- `amount` 仅奶粉记录可用，范围建议 1-500。
- `duration` 仅母乳记录可用，范围建议 1-180。
- `happenedAt` 不能是明显异常时间。
- `clientId` 必填且唯一。

---

## 10. 外部同步设计

### 10.1 同步方式

推荐异步同步：

```text
POST /records
  ↓
保存数据库成功，立即返回前端
  ↓
后台任务同步到外部服务
  ↓
记录 external_sync_logs
```

优点：

- 前端体验更快。
- 第三方服务不稳定时不影响记录保存。
- 可失败重试。

### 10.2 重试策略

- 第 1 次失败：1 分钟后重试。
- 第 2 次失败：5 分钟后重试。
- 第 3 次失败：30 分钟后重试。
- 超过次数后标记为 `failed`，保留日志。

---

## 11. 部署设计

### 11.1 环境划分

| 环境       | 用途     |
| ---------- | -------- |
| local      | 本地开发 |
| staging    | 测试环境 |
| production | 正式环境 |

### 11.2 推荐部署组合

#### 低成本组合

- 前端：Vercel / Netlify / 静态服务器
- 后端：Railway / Render
- 数据库：Supabase PostgreSQL / Neon

#### 国内访问组合

- 前端：腾讯云 COS + CDN
- 后端：腾讯云轻量服务器 / 云托管
- 数据库：腾讯云 PostgreSQL / MySQL

---

## 12. 分阶段实施计划

### 阶段 1：最小可用后端

目标：替换前端直连 Webhook。

功能：

- `POST /records`
- `POST /records/batch`
- `GET /stats/daily`
- 数据库存储
- 后端转发 Webhook

前端改造：

- 修改 [api.ts](file:///d:/workspace/star/src/utils/api.ts#L14-L42) 的提交地址。
- 记录增加 `clientId`。
- 保留现有离线暂存逻辑。

### 阶段 2：历史记录与多日期统计

功能：

- `GET /records`
- `GET /stats/range`
- 统计页增加日期切换。
- 支持历史趋势查看。

### 阶段 3：用户与宝宝档案

功能：

- 登录鉴权。
- 宝宝档案管理。
- 家庭共享。

### 阶段 4：后台同步可靠性

功能：

- 同步日志。
- 失败重试。
- 管理后台或异常提醒。

---

## 13. 推荐结论

BabyStar 当前最适合的后端方案是：

> **先做一个轻量 Node.js API，提供记录保存、批量同步和日统计；Webhook/腾讯文档同步迁移到后端异步执行。**

这样既能保持当前 H5 的极速记录体验，又能解决数据安全、历史记录、跨设备同步和统计扩展问题。

如果只做 MVP，优先实现：

1. `POST /records/batch`
2. `GET /stats/daily`
3. PostgreSQL 的 `care_records` 表
4. 后端环境变量保存 Webhook URL
5. 前端 `api.ts` 改为请求自己的后端

---

**文档版本**：v1.0  
**最后更新**：2026-06-12
