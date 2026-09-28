import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 只打包 latin 子集（站点仅用于英文 / 数字展示），裁掉用不到的天城文与扩展子集
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import './index.css';
import App from './App';
import { bootstrapDatabase } from './db/bootstrap';
import { ErrorBoundary } from './components/ErrorBoundary';

void bootstrapDatabase();

// PWA：生产环境注册 Service Worker（同源静态资源缓存，支持离线访问；失败不影响正常使用）。
// 新 SW 安装完成且存在被接管的旧控制器时，广播 sw-update-ready 事件供更新提示条使用。
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const notifyUpdateReady = (registration: ServiceWorkerRegistration) => {
      window.dispatchEvent(new CustomEvent('sw-update-ready', { detail: registration }));
    };
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // 页面打开前已有等待接管的新 SW
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateReady(registration);
        }
        // 页面打开期间发现并安装了新 SW
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateReady(registration);
            }
          });
        });
      })
      .catch(() => {
        /* 注册失败时站点仍按普通 SPA 运行 */
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
