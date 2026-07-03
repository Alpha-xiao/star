import fp from 'fastify-plugin';
import { config } from '../config.js';

interface VisitBucket {
  count: number;
  blockedUntil: number;
  windowStart: number;
}

const buckets = new Map<string, VisitBucket>();
const suspiciousUserAgents = [/bot/i, /crawler/i, /spider/i, /scrapy/i, /curl/i, /wget/i, /python-requests/i];

/**
 * 轻量级防爬/限流插件。
 *
 * 以 IP + User-Agent 为维度做滑动窗口计数，超过阈值后短暂封禁。
 * 该实现为单进程内存版，适合 MVP 和开发环境；生产多实例可替换为 Redis 计数。
 */
export const antiCrawlerPlugin = fp(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS' || request.url === '/health') return;

    const now = Date.now();
    const userAgent = request.headers['user-agent'] || 'unknown';
    const key = `${request.ip}:${userAgent}`;
    const windowMs = config.antiCrawler.windowMs;
    const maxRequests = suspiciousUserAgents.some((pattern) => pattern.test(String(userAgent)))
      ? config.antiCrawler.suspiciousMax
      : config.antiCrawler.max;

    const bucket = buckets.get(key) || { count: 0, blockedUntil: 0, windowStart: now };

    if (bucket.blockedUntil > now) {
      return reply
        .code(429)
        .header('Retry-After', Math.ceil((bucket.blockedUntil - now) / 1000))
        .send({ message: '请求过于频繁，请稍后再试' });
    }

    if (now - bucket.windowStart > windowMs) {
      bucket.count = 0;
      bucket.windowStart = now;
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      bucket.blockedUntil = now + config.antiCrawler.blockMs;
      buckets.set(key, bucket);
      request.log.warn({ ip: request.ip, userAgent, url: request.url }, '触发防爬限流');
      return reply
        .code(429)
        .header('Retry-After', Math.ceil(config.antiCrawler.blockMs / 1000))
        .send({ message: '请求过于频繁，请稍后再试' });
    }

    buckets.set(key, bucket);
  });

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > config.antiCrawler.windowMs && bucket.blockedUntil < now) {
        buckets.delete(key);
      }
    }
  }, config.antiCrawler.windowMs).unref();
});
