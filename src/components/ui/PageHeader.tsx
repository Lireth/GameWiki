import type { ReactNode } from 'react';

interface PageHeaderProps {
  en: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ en, title, description, children }: PageHeaderProps) {
  return (
    <header className="relative mb-8 border-b border-space-600/40 pb-6">
      <p className="font-display text-xs tracking-[0.4em] text-gold-500/90 uppercase">
        {en}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-slate-50 md:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

interface FieldRowProps {
  label: string;
  children: ReactNode;
}

export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex items-center gap-4 border-b border-space-700/50 py-3 last:border-b-0">
      <dt className="w-20 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-200">{children}</dd>
    </div>
  );
}
