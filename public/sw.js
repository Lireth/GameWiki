/* 星穹铁道资料站 Service Worker。
   - 页面导航请求：网络优先，失败时回退缓存，最后回退到预缓存的应用壳，
     保证离线状态下（含首次离线访问未到过的路由）SPA 仍可打开；
   - /assets/ 构建产物（文件名带内容 hash）与少量根文件：stale-while-revalidate；
   - /avatars|cones|relics/ 本地化游戏图片：缓存优先 + FIFO 数量上限
     （IMAGE_LIMIT，独立缓存名），离线可用且存储占用有界；
   - 跨域请求（外链图片等）不缓存。
   首次离线访问前需至少成功联网加载过一次。
   更新流程：新 SW 安装后进入 waiting 等待，不自动接管 —— 避免旧页面仍在
   运行旧 JS 时新版本 activate 已清理旧缓存，旧 hash 的懒加载 chunk 请求
   404 落入 ErrorBoundary；由页面更新提示条（PwaUpdateBanner）征得用户同意
   后发送 SKIP_WAITING 消息接管并刷新（见 main.tsx 的注册逻辑）。
   __BUILD_ID__ 占位符在构建时替换为本次构建时间戳（见 vite.config.ts），
   使每次发布都产生新的缓存名，旧缓存随 activate 阶段清理。 */
const CACHE_NAME = 'hsr-wiki-__BUILD_ID__';
// 图片走独立缓存：FIFO 淘汰只统计图片条目，不干扰应用壳与构建产物缓存
const IMAGE_CACHE_NAME = `${CACHE_NAME}-img`;
// 应用壳取 SW 所在目录：随部署 base 自适应（根路径为 /，子路径为 /<repo>/）
const APP_SHELL = new URL('./', self.registration.scope).pathname;
// 本地化游戏图片目录（随 base 自适应）；上限按当前规模（约 330 张）留出
// 数年余量，防止 Cache Storage 随版本无界增长
const IMAGE_DIRS = ['avatars', 'cones', 'relics'].map(
  (dir) => `${APP_SHELL}${dir}/`,
);
const IMAGE_LIMIT = 600;

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
      // 不在 install 期 skipWaiting：保持 waiting 状态等待页面确认，
      // 更新接管时机由下方 message 通道（SKIP_WAITING）控制
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE_NAME)
          .map((key) => caches.delete(key)),
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

  // 本地化游戏图片：缓存优先 + FIFO 数量上限。缓存命中即离线可用；
  // 未命中回源后写入并淘汰超限的最旧条目（Cache API keys() 按创建序返回，
  // FIFO 近似 LRU，足够约束总量）
  if (IMAGE_DIRS.some((dir) => url.pathname.startsWith(dir))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          for (const key of keys.slice(0, keys.length - IMAGE_LIMIT)) {
            await cache.delete(key);
          }
        }
        return response;
      })(),
    );
    return;
  }

  // 其余静态资源（/assets/ 构建产物与 manifest、图标等少量根文件，
  // 总量小且 /assets/ 文件名带内容 hash）：stale-while-revalidate
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
