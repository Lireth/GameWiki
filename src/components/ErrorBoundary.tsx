import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 渲染错误兜底：任一页面抛错时降级为错误提示（导航壳保持可用），
 * 而不是整站白屏。切路由时通过 key 重建实例，自动恢复下一页的渲染。
 * 常见来源：懒加载 chunk 拉取失败、脏数据触发的渲染异常。
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[wiki] 页面渲染出错：', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center border border-red-500/40 bg-red-500/5 px-6 py-14 text-center"
      >
        <p className="font-display text-sm tracking-widest text-red-300">
          RENDER ERROR
        </p>
        <p className="mt-3 text-sm text-slate-300">页面渲染出错，请重试。</p>
        <p className="mt-1.5 max-w-md break-all text-xs leading-relaxed text-slate-500">
          {error.message || String(error)}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="chamfer-xs bg-gold-500 px-4 py-2 text-sm font-semibold text-space-950 transition hover:bg-gold-400"
          >
            刷新页面
          </button>
          <Link
            to="/"
            className="chamfer-xs border border-space-600/60 px-4 py-2 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-300"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }
}
