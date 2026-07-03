import 'dotenv/config';

/**
 * 后端运行时配置
 *
 * 通过 dotenv 自动加载 .env，所有敏感值（数据库连接）
 * 都不进代码仓库，只通过环境变量注入。
 */
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : true;

export const config = {
  /** Fastify 监听端口 */
  port: Number(process.env.PORT || 4000),
  /** Fastify 绑定地址，0.0.0.0 表示对外可访问 */
  host: process.env.HOST || '0.0.0.0',
  /** Prisma 使用的 PostgreSQL 连接串 */
  databaseUrl: process.env.DATABASE_URL,
  /** CORS 白名单，未配置时允许所有来源 */
  corsOrigin,
  /** JWT Access Token 签名密钥 */
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  /** Access Token 有效期 */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  /** Refresh Token Cookie 签名密钥 */
  refreshSecret: process.env.REFRESH_SECRET || 'dev-refresh-secret-change-me',
  /** Refresh Token 有效天数 */
  refreshExpiresInDays: Number(process.env.REFRESH_EXPIRES_DAYS || 30),
  /** 防爬限流配置：默认每 IP+UA 每分钟 120 次，可通过环境变量调节 */
  antiCrawler: {
    windowMs: Number(process.env.ANTI_CRAWLER_WINDOW_MS || 60000),
    max: Number(process.env.ANTI_CRAWLER_MAX || 120),
    suspiciousMax: Number(process.env.ANTI_CRAWLER_SUSPICIOUS_MAX || 30),
    blockMs: Number(process.env.ANTI_CRAWLER_BLOCK_MS || 300000)
  }
};
