import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import { useBootstrapStatus } from '../../hooks/useWikiData';

export function AppLayout() {
  const bootstrapStatus = useBootstrapStatus();

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {bootstrapStatus === 'failed' && (
        <div
          role="alert"
          className="border-b border-red-500/40 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-300 md:px-6"
        >
          本地数据库初始化失败，数据无法读取与保存。可能是浏览器隐私模式或存储配额受限，请检查浏览器设置后刷新。
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 md:px-6 md:pt-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
