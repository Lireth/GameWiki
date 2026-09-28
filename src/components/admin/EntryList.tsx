import type { Character, LightCone, NewsEvent, RelicSet } from '../../db/types';
import {
  ENTRY_TYPES,
  entryLabel,
  entrySummary,
  type EntryType,
  type RelatedNames,
} from '../../pages/admin/schema';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';

export type AnyEntry = Character | LightCone | NewsEvent | RelicSet;

export interface EntryListProps {
  entryType: EntryType;
  entries: AnyEntry[];
  visibleEntries: AnyEntry[];
  editingId: string | null;
  listQuery: string;
  relatedNames: RelatedNames;
  onQueryChange: (value: string) => void;
  onStartEdit: (entry: AnyEntry) => void;
  onRemove: (entry: AnyEntry, label: string) => void;
}

/** 管理页右侧条目列表：关键词过滤展示由父级算好，这里只负责渲染 */
export function EntryList({
  entryType,
  entries,
  visibleEntries,
  editingId,
  listQuery,
  relatedNames,
  onQueryChange,
  onStartEdit,
  onRemove,
}: EntryListProps) {
  const inputClass =
    'w-full border border-space-600/60 bg-space-850/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none';
  const keyword = listQuery.trim();

  return (
    <Panel className="p-5 md:p-6">
      <h2 className="text-lg font-semibold text-slate-100">
        {ENTRY_TYPES.find((type) => type.value === entryType)?.label}列表
        <span className="ml-2 font-display text-xs text-slate-500">
          {keyword ? `${visibleEntries.length}/${entries.length} 项` : `${entries.length} 项`}
        </span>
      </h2>

      <input
        value={listQuery}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索 ID / 名称…"
        aria-label="搜索条目"
        className={`${inputClass} mt-3`}
      />

      {entries.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="暂无数据"
          hint="通过左侧表单新增条目，或使用页脚「导入数据」恢复备份。"
        />
      ) : visibleEntries.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          没有匹配的条目，试试其它关键词。
        </p>
      ) : (
        <ul className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {visibleEntries.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-center gap-3 border px-3 py-2 text-sm transition ${
                editingId === entry.id
                  ? 'border-gold-500/60 bg-gold-500/5'
                  : 'border-space-700/60 bg-space-850/60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-200">{entryLabel(entry)}</p>
                <p className="truncate text-xs text-slate-500">
                  {entry.id} · {entrySummary(entryType, entry, relatedNames)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartEdit(entry)}
                className="shrink-0 text-xs text-gold-300 transition hover:text-gold-400"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry, entryLabel(entry))}
                className="shrink-0 text-xs text-slate-500 transition hover:text-red-400"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
