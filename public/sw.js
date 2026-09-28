/* 星穹铁道资料站 Service Worker。
   - 页面导航请求：网络优先，失败时回退缓存，最后回退到预缓存的应用壳，
     保证离线状态下（含首次离线访问未到过的路由）SPA 仍可打开；
   - 其余同源 GET：stale-while-revalidate；
   - 跨域请求（外链图片等）不缓存。
   首次离线访问前需至少成功联网加载过一次。
   __BUILD_ID__ 占位符在构建时替换为本次构建时间戳（见 vite.config.ts），
   使每次发布都产生新的缓存名，旧缓存随 activate 阶段清理。 */
const CACHE_NAME = 'hsr-wiki-__BUILD_ID__';
// 应用壳取 SW 所在目录：随部署 base 自适应（根路径为 /，子路径为 /<repo>/）
const APP_SHELL = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 预缓存应用壳：逐个写入，单条失败不阻断安装
      try {
        await cache.add(new Request(APP_SHELL, { cache: 'reload' }));
      } catch {
        /* 预缓存失败时退化为运行期 SWR 缓存 */
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// 更新提示：页面在收到新版本就绪通知后发送 SKIP_WAITING，立即接管并刷新
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，离线时回退到该页缓存或应用壳
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (
            (await cache.match(request)) ??
            (await cache.match(APP_SHELL)) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // 静态资源：stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    })(),
  );
});
