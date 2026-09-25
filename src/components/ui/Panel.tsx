import type { HTMLAttributes, ReactNode } from 'react';

export function CornerTicks({ className = '' }: { className?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 size-2.5 border-l border-t border-gold-500/70 ${className}`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-0 right-0 size-2.5 border-b border-r border-gold-500/70 ${className}`}
      />
    </>
  );
}

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** 显示左上 / 右下角的金色角标 */
  ticks?: boolean;
}

export function Panel({
  className = '',
  ticks = false,
  children,
  ...rest
}: PanelProps): ReactNode {
  return (
    <div
      className={`relative border border-space-600/50 bg-space-850/70 ${className}`}
      {...rest}
    >
      {ticks && <CornerTicks />}
      {children}
    </div>
  );
}
