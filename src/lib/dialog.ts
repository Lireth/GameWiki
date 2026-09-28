/**
 * 统一对话框状态：Promise 化的 confirmDialog / alertDialog，
 * 替换 window.confirm / alert —— 样式与站内主题一致，
 * 且能展示多行富信息（如导入确认中的统计明细）。
 * 模块级状态 + 订阅者模式（与 favorites.ts / bootstrap.ts 同一套约定），
 * 由 AppLayout 挂载唯一 DialogHost 渲染（组件见 ui/Dialog.tsx）。
 */

export interface DialogOptions {
  title: string;
  /** 支持换行的正文 */
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作：确认按钮红色 */
  danger?: boolean;
}

let state: DialogOptions | null = null;
let resolver: ((value: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** 订阅对话框状态（配合 useSyncExternalStore 使用） */
export function subscribeDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDialogState(): DialogOptions | null {
  return state;
}

function settle(value: boolean) {
  resolver?.(value);
  resolver = null;
  state = null;
  emit();
}

/** 确认对话框：确定返回 true，取消 / Esc / 点击遮罩返回 false（默认取消按钮「取消」） */
export function confirmDialog(options: DialogOptions): Promise<boolean> {
  state = { cancelText: '取消', ...options };
  return new Promise((resolve) => {
    resolver = resolve;
    emit();
  });
}

/** 消息提示（替代 window.alert）：仅一个确认按钮，Esc 等同确认 */
export async function alertDialog(message: string, title = '提示'): Promise<void> {
  await confirmDialog({ title, message, confirmText: '知道了', cancelText: undefined });
}

export { settle as settleDialog };
