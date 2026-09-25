import { StrictMode, type ReactNode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import './index.css';
import App from './App';
import { bootstrapDatabase } from './db/bootstrap';

/** 全局错误边界：渲染异常时展示可恢复的降级界面，避免整站白屏 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-space-950 p-6">
        <div className="max-w-md border border-space-600/60 bg-space-850/80 p-6 text-center">
          <p className="font-display text-xs tracking-[0.3em] text-gold-500 uppercase">
            Error
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-100">页面出现异常</h1>
          <p className="mt-3 break-all text-sm text-slate-400">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="chamfer-xs mt-5 border border-gold-500/50 px-4 py-2 text-sm text-gold-300 transition hover:bg-gold-500/10"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}

void bootstrapDatabase();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
