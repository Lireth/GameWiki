import type { ReactNode } from 'react';

/** 列表页排序下拉框的共用样式 */
export const sortSelectClass =
  'border border-space-600/60 bg-space-850/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-gold-500/60 focus:outline-none';

interface FilterRowProps {
  label: string;
  children: ReactNode;
}

/** 单行筛选：左侧维度标签 + 右侧一组标签 */
export function FilterRow({ label, children }: FilterRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-space-700/50 px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-16 shrink-0 pt-1 text-sm font-medium text-slate-400">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface FilterRowLinesProps {
  label: string;
  lines: ReactNode[];
}

/** 多行筛选：左侧维度标签 + 右侧多行标签组（如体型男/女两行、实装版本按大版本分行） */
export function FilterRowLines({ label, lines }: FilterRowLinesProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-space-700/50 px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-16 shrink-0 pt-1 text-sm font-medium text-slate-400">
        {label}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1.5">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FacetChipProps {
  active: boolean;
  count: number;
  /** 主题色（命途 / 属性 / 稀有度）；缺省为中性灰，选中时呈金色 */
  color?: string;
  /** 覆盖无障碍名称（如图标型标签） */
  ariaLabel?: string;
  onClick: () => void;
  children: ReactNode;
}

export function FacetChip({
  active,
  count,
  color,
  ariaLabel,
  onClick,
  children,
}: FacetChipProps) {
  const style = active
    ? {
        backgroundColor: color ?? '#e9b45f',
        borderColor: color ?? '#e9b45f',
        color: '#04060c',
      }
    : color
      ? {
          borderColor: `${color}44`,
          color: `${color}d9`,
          backgroundColor: `${color}0f`,
        }
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs leading-5 transition ${
        active
          ? 'font-semibold'
          : color
            ? 'hover:brightness-125'
            : 'text-slate-300 hover:border-gold-500/60 hover:text-gold-300'
      }`}
    >
      {children}
      <span className={`font-display ${active ? 'opacity-80' : 'opacity-70'}`}>
        ({count})
      </span>
    </button>
  );
}
