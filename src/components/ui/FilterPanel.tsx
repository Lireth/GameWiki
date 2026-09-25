import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { SearchIcon, StarIcon } from '../icons';
import { useDebouncedSearch } from '../../hooks/useWikiData';
import { SORT_OPTIONS } from '../../lib/facets';
import { RARITY_META } from '../../lib/meta';

/** 列表页排序下拉框的共用样式 */
export const sortSelectClass =
  'border border-space-600/60 bg-space-850/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-gold-500/60 focus:outline-none';

/** 复制当前页面链接（含筛选 / 年月 / 类型等 URL 状态），便于分享当前视图 */
export function CopyLinkButton({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败：当前环境不支持访问剪贴板（需 HTTPS 或 localhost）。');
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`border border-space-600/60 px-2.5 py-1 text-xs text-slate-400 transition hover:border-gold-500/50 hover:text-gold-300 ${className}`}
    >
      {copied ? '已复制 ✓' : '分享链接'}
    </button>
  );
}

interface ListSearchBoxProps {
  /** URL 参数 q（防抖同步，输入即时回显） */
  q: string;
  setQ: (value: string) => void;
  placeholder: string;
}

/** 图鉴列表页搜索框（内部接 useDebouncedSearch） */
export function ListSearchBox({ q, setQ, placeholder }: ListSearchBoxProps) {
  const { text, onChange } = useDebouncedSearch(q, setQ);
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      <input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-space-600/60 bg-space-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
      />
    </div>
  );
}

interface ViewAllRowProps {
  /** 仅按搜索词的命中数 */
  allCount: number;
  /** 是否存在搜索 / 分面筛选（fav 参数不计入，由本组件并入激活态判断） */
  hasAnyFilter: boolean;
  clearFilters: () => void;
  /** 传入后渲染「只看收藏」chip（URL 参数 fav=1 的前置过滤） */
  favOnly?: boolean;
  favCount?: number;
  onToggleFav?: () => void;
}

/** 「查看全部」行：清空筛选入口 + 可选「只看收藏」 */
export function ViewAllRow({
  allCount,
  hasAnyFilter,
  clearFilters,
  favOnly,
  favCount,
  onToggleFav,
}: ViewAllRowProps) {
  const showFav = onToggleFav !== undefined && favOnly !== undefined && favCount !== undefined;
  return (
    <FilterRow label="查看全部">
      <FacetChip
        active={!hasAnyFilter && !(showFav && favOnly)}
        count={allCount}
        onClick={clearFilters}
      >
        查看全部
      </FacetChip>
      {showFav && (
        <FacetChip active={favOnly} count={favCount} onClick={onToggleFav}>
          只看收藏
        </FacetChip>
      )}
    </FilterRow>
  );
}

interface RarityFacetRowProps {
  rarities: readonly number[];
  /** 当前选中的稀有度值（字符串形式） */
  selected: readonly string[];
  countOf: (value: string) => number;
  onToggle: (value: string) => void;
  /** stars: 重复星形图标（角色 / 光锥）；text: 「5★」文本（遗器 / 矩阵） */
  display?: 'stars' | 'text';
}

/** 稀有度筛选行 */
export function RarityFacetRow({
  rarities,
  selected,
  countOf,
  onToggle,
  display = 'stars',
}: RarityFacetRowProps) {
  return (
    <FilterRow label="稀有度">
      {rarities.map((rarity) => {
        const value = String(rarity);
        return (
          <FacetChip
            key={rarity}
            active={selected.includes(value)}
            count={countOf(value)}
            color={RARITY_META[rarity as 2 | 3 | 4 | 5].color}
            ariaLabel={display === 'stars' ? `${rarity}星` : undefined}
            onClick={() => onToggle(value)}
          >
            {display === 'stars' ? (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: rarity }).map((_, i) => (
                  <StarIcon key={i} className="size-3" />
                ))}
              </span>
            ) : (
              <>{rarity}★</>
            )}
          </FacetChip>
        );
      })}
    </FilterRow>
  );
}

interface VersionFacetRowProps {
  /** 大版本分组（见 buildVersionGroups） */
  groups: readonly { major: string; values: string[] }[];
  selected: readonly string[];
  countOf: (value: string) => number;
  onToggle: (value: string) => void;
}

/** 实装版本筛选行：按大版本分行常显 */
export function VersionFacetRow({
  groups,
  selected,
  countOf,
  onToggle,
}: VersionFacetRowProps) {
  return (
    <FilterRowLines
      label="实装版本"
      lines={groups.map((group) => (
        <Fragment key={group.major}>
          {group.values.map((value) => (
            <FacetChip
              key={value}
              active={selected.includes(value)}
              count={countOf(value)}
              onClick={() => onToggle(value)}
            >
              <span className="font-display">{value}</span>
            </FacetChip>
          ))}
        </Fragment>
      ))}
    />
  );
}

interface ListToolbarProps {
  count: number;
  /** 计数单位，如「名角色」「件光锥」「套遗器」 */
  unit: string;
  sort: string;
  onSortChange: (value: string) => void;
}

/** 列表计数 + 分享链接 + 排序下拉 */
export function ListToolbar({ count, unit, sort, onSortChange }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <p>
        共 <span className="font-display text-sm text-gold-300">{count}</span> {unit}
      </p>
      <div className="flex items-center gap-3">
        <CopyLinkButton />
        <label className="flex items-center gap-2">
          <span>排序</span>
          <select
            aria-label="排序"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className={sortSelectClass}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

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
