import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { useBootstrapStatus } from '../../hooks/useWikiData';
import { bootstrapDatabase } from '../../db/bootstrap';

export function AppLayout() {
  const bootstrapStatus = useBootstrapStatus();

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {bootstrapStatus === 'failed' && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-red-500/40 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-300 md:px-6"
        >
          <span>
            本地数据库初始化失败，数据无法读取与保存。可能是浏览器隐私模式或存储配额受限。
          </span>
          <button
            type="button"
            onClick={() => void bootstrapDatabase()}
            className="border border-red-400/50 px-2 py-0.5 text-red-200 transition hover:bg-red-500/20"
          >
            重试
          </button>
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 md:px-6 md:pt-10">
        {/* 边界只包内容区：懒加载 chunk 时导航栏与页脚保持稳定 */}
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <p className="font-display text-sm tracking-widest text-slate-500">
                LOADING…
              </p>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
