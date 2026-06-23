# BabyStar Backend

BabyStar 后端服务，基于 Fastify + Prisma + PostgreSQL 实现。

## 功能

- 护理记录创建：`POST /api/records`
- 离线记录批量同步：`POST /api/records/batch`
- 记录查询：`GET /api/records`
- 记录撤销：`DELETE /api/records/:id`
- 每日统计：`GET /api/stats/daily`
- 区间统计：`GET /api/stats/range`
- 健康检查：`GET /health`

## 开始使用

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## 使用 Docker 启动 PostgreSQL

项目已提供 [docker-compose.yml](file:///d:/workspace/star/backend/docker-compose.yml)，数据库配置如下：

- 数据库：`babystar`
- 用户名：`babystar`
- 密码：`babystar123`
- 端口：`5432`

启动数据库：

```powershell
cd backend
docker compose up -d postgres
npm run prisma:migrate
npm run dev
```

如果 Docker Desktop 是首次安装，请先手动打开 Docker Desktop，等待状态变为 Running 后再执行上面的命令。

## 环境变量

见 [.env.example](./.env.example)。

## MVP 请求示例

```bash
curl -X POST http://localhost:4000/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":"client-uuid-001",
    "babyId":"00000000-0000-0000-0000-000000000000",
    "userId":"00000000-0000-0000-0000-000000000000",
    "eventType":"formula",
    "happenedAt":"2026-06-12T08:30:00.000Z",
    "amount":60,
    "source":"pwa"
  }'
```
