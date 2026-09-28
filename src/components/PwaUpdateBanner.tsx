import { useEffect, useState } from 'react';

/**
 * PWA 更新提示条：main.tsx 在新 Service Worker 安装完成时广播
 * sw-update-ready 事件（detail 携带 registration），此处展示提示，
 * 点击「立即更新」让等待中的 SW 跳过 waiting 接管页面并刷新。
 * 旧缓存名随构建自动更新（见 vite.config.ts 的 swBuildId 插件），
 * 不刷新则继续由旧 SW 服务，行为安全降级。
 */
export function PwaUpdateBanner() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onReady = (event: Event) =>
      setRegistration((event as CustomEvent<ServiceWorkerRegistration>).detail);
    window.addEventListener('sw-update-ready', onReady);
    return () => window.removeEventListener('sw-update-ready', onReady);
  }, []);

  if (!registration) return null;

  const applyUpdate = () => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold-500/40 bg-gold-500/10 px-4 py-2.5 text-center text-xs text-gold-300 md:px-6"
    >
      <span>站点已发布新版本，刷新后生效。</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="border border-gold-500/50 px-2 py-0.5 text-gold-200 transition hover:bg-gold-500/20"
      >
        立即更新
      </button>
      <button
        type="button"
        onClick={() => setRegistration(null)}
        aria-label="暂不更新"
        className="text-slate-500 transition hover:text-slate-300"
      >
        暂不
      </button>
    </div>
  );
}
