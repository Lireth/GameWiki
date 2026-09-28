import { useEffect, useSyncExternalStore } from 'react';
import {
  getDialogState,
  settleDialog,
  subscribeDialog,
} from '../../lib/dialog';

/** 统一对话框渲染宿主：状态与 API 在 lib/dialog.ts，由 AppLayout 挂载唯一实例 */
export function DialogHost() {
  const options = useSyncExternalStore(subscribeDialog, getDialogState);

  useEffect(() => {
    if (!options) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        settleDialog(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options]);

  if (!options) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-space-950/70 px-4 backdrop-blur-sm"
      onClick={() => settleDialog(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={options.title}
        className="chamfer-xs w-full max-w-md border border-space-600/60 bg-space-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-100">{options.title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
          {options.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          {options.cancelText && (
            <button
              type="button"
              onClick={() => settleDialog(false)}
              className="chamfer-xs border border-space-600/60 px-4 py-2 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-300"
            >
              {options.cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => settleDialog(true)}
            className={`chamfer-xs px-4 py-2 text-sm font-semibold transition ${
              options.danger
                ? 'bg-red-500 text-space-950 hover:bg-red-400'
                : 'bg-gold-500 text-space-950 hover:bg-gold-400'
            }`}
          >
            {options.confirmText ?? '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
