import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    Components({
      resolvers: [VantResolver({ importStyle: false })]
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'offline.html'],
      manifest: {
        name: 'BabyStar - 新生儿护理记录',
        short_name: 'BabyStar',
        description: '新生儿日常护理极速记录H5',
        theme_color: '#E65100',
        background_color: '#FAF5F0',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 预缓存的资源类型：HTML、JS、CSS、样式外文件、图标
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        // 单个可预缓存文件上限提高到 5MB，避免 ECharts 之类的大依赖被跳过
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SPA 路由离线兜底：任何未命中缓存的导航请求返回 index.html
        navigateFallback: '/index.html',
        // 排除后端接口和 SW 自己，避免命中兜底页
        navigateFallbackDenylist: [/^\/api\//, /^\/backend\//, /^\/sw\.js$/, /^\/workbox-.*\.js$/],
        // 切换新版本 Service Worker 后立即接管所有页面
        clientsClaim: true,
        skipWaiting: true,
        // 运行时缓存策略：按资源类型和来源分别处理
        runtimeCaching: [
          {
            // 页面导航请求：网络优先，离线回退到离线兜底页
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'babystar-pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              precacheFallback: {
                fallbackURL: '/offline.html'
              }
            }
          },
          {
            // JS / CSS：Stale-While-Revalidate，先返回缓存再后台刷新
            urlPattern: ({ request }) =>
              request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'babystar-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            // 图片 / 字体：CacheFirst，命中直接返回
            urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'babystar-media',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google/CDN 字体：长期缓存
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'babystar-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // 统计与查询接口：网络优先 + 短超时，弱网时用最近一次缓存兜底
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /\/api\/(stats|records|growth|babies)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'babystar-api-get',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        // 开发环境可选开启 SW，便于本地验证离线策略
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
