/* 星穹铁道资料站 Service Worker。
   - 页面导航请求：网络优先，失败时回退缓存，最后回退到预缓存的应用壳，
     保证离线状态下（含首次离线访问未到过的路由）SPA 仍可打开；
   - 其余同源 GET：stale-while-revalidate；
   - 跨域请求（外链图片等）不缓存。
   首次离线访问前需至少成功联网加载过一次。 */
const CACHE_NAME = 'hsr-wiki-v2';
const APP_SHELL = '/';

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
