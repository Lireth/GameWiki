import { SparkIcon } from '../icons';

interface EmptyStateProps {
  title: string;
  hint?: string;
  className?: string;
}

export function EmptyState({ title, hint, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-space-600/70 bg-space-900/40 px-6 py-14 text-center ${className}`}
    >
      <SparkIcon className="size-8 text-slate-600" />
      <p className="mt-4 text-sm font-medium text-slate-300">{title}</p>
      {hint && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
  className?: string;
}

/**
 * 本地数据库初始化中（bootstrap 未完成）的占位态。
 * useLiveQuery 在首帧以空数组兜底，若不做此区分，
 * 首次访问会把「数据还在加载」误显示为面向录入者的空状态提示。
 */
export function LoadingState({
  label = '数据加载中…',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-space-600/70 bg-space-900/40 px-6 py-14 text-center ${className}`}
    >
      <SparkIcon className="size-8 animate-pulse text-slate-600" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </div>
  );
}
