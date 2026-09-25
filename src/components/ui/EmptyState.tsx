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
