import { useMemo, useState } from 'react';
import { recordError, type RecordType } from '../../lib/recordValidation';
import { confirmDialog } from '../../lib/dialog';
import { Panel } from '../ui/Panel';

export interface BatchImportPanelProps {
  entryType: RecordType;
  typeLabel: string;
  /** 导入动作在 AdminPage（bulkPut + 提示），items 已经校验通过 */
  onImport: (items: Record<string, unknown>[]) => void;
}

interface ParsedResult {
  parseError?: string;
  items?: unknown[];
}

interface ValidatedResult {
  valid: { item: Record<string, unknown>; index: number }[];
  invalid: { index: number; id: string | undefined; error: string }[];
}

/**
 * 管理页批量录入：粘贴单类型 JSON 数组 → 实时解析与逐条校验（与
 * 备份导入同口径，见 lib/recordValidation.ts）→ 确认后按 id 覆盖写入。
 * 记录格式与「导出数据」的备份 JSON 中对应类型数组完全一致。
 */
export function BatchImportPanel({
  entryType,
  typeLabel,
  onImport,
}: BatchImportPanelProps) {
  const [text, setText] = useState('');

  const parsed = useMemo<ParsedResult | null>(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    try {
      const value: unknown = JSON.parse(trimmed);
      if (!Array.isArray(value)) {
        return { parseError: '顶层应为数组，例如 [{...}, {...}]' };
      }
      return { items: value };
    } catch {
      return { parseError: '不是有效的 JSON 文本，请检查引号与逗号' };
    }
  }, [text]);

  const validated = useMemo<ValidatedResult | null>(() => {
    if (!parsed?.items) return null;
    const valid: { item: Record<string, unknown>; index: number }[] = [];
    const invalid: { index: number; id: string | undefined; error: string }[] = [];
    parsed.items.forEach((item, index) => {
      const error = recordError(entryType, item);
      if (error) {
        invalid.push({
          index,
          id: typeof (item as { id?: unknown })?.id === 'string'
            ? (item as { id: string }).id
            : undefined,
          error,
        });
      } else {
        valid.push({ item: item as Record<string, unknown>, index });
      }
    });
    return { valid, invalid };
  }, [parsed, entryType]);

  const importAll = async () => {
    if (!validated || validated.valid.length === 0) return;
    const confirmed = await confirmDialog({
      title: '确认批量导入？',
      message: `将写入 ${validated.valid.length} 条${typeLabel}记录；与现有数据 id 相同的条目会被覆盖。`,
      confirmText: '导入',
    });
    if (!confirmed) return;
    onImport(validated.valid.map((entry) => entry.item));
  };

  return (
    <Panel className="p-5 md:p-6" ticks>
      <h2 className="text-lg font-semibold text-slate-100">
        批量录入{typeLabel}
        <span className="ml-2 text-xs font-normal text-slate-500">
          粘贴 JSON 数组，逐条校验后按 ID 覆盖写入
        </span>
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        格式与「导出数据」备份中 {typeLabel}数组一致；必填字段、枚举取值与日期格式会逐条校验，无效条目不会写入。
      </p>

      <textarea
        value={text}
        rows={10}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        placeholder={`[\n  {\n    "id": "example-id",\n    "name": "示例名称",\n    ...\n  }\n]`}
        aria-label="批量录入 JSON"
        className="mt-3 w-full border border-space-600/60 bg-space-850/80 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
      />

      {parsed?.parseError && (
        <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {parsed.parseError}
        </p>
      )}

      {validated && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="text-slate-400">
            共 {validated.valid.length + validated.invalid.length} 条：
            <span className="text-emerald-300">有效 {validated.valid.length} 条</span>
            {validated.invalid.length > 0 && (
              <span className="text-red-300"> · 无效 {validated.invalid.length} 条</span>
            )}
          </p>

          {validated.invalid.length > 0 && (
            <ul className="max-h-[160px] space-y-1 overflow-y-auto border border-red-500/30 bg-red-500/5 p-2">
              {validated.invalid.map((entry) => (
                <li key={entry.index} className="text-red-300">
                  第 {entry.index + 1} 条
                  {entry.id ? `（${entry.id}）` : ''}：{entry.error}
                </li>
              ))}
            </ul>
          )}

          {validated.valid.length > 0 && (
            <ul className="max-h-[160px] space-y-1 overflow-y-auto border border-space-700/60 bg-space-850/60 p-2">
              {validated.valid.map((entry) => (
                <li key={entry.index} className="text-slate-400">
                  <span className="font-display text-slate-300">{String(entry.item.id)}</span>
                  {entry.item.name !== undefined && ` · ${String(entry.item.name)}`}
                  {entry.item.title !== undefined && ` · ${String(entry.item.title)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          disabled={!validated || validated.valid.length === 0}
          onClick={() => void importAll()}
          className="chamfer-xs bg-gold-500 px-4 py-2 text-sm font-semibold text-space-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validated && validated.valid.length > 0
            ? `导入 ${validated.valid.length} 条（同 ID 覆盖）`
            : '导入'}
        </button>
      </div>
    </Panel>
  );
}
