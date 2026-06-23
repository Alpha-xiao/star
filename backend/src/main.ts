import { buildApp } from './app.js';
import { config } from './config.js';

// 后端入口：构建 Fastify 应用并按配置启动监听
const app = await buildApp();

await app.listen({
  port: config.port,
  host: config.host
});
