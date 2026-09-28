import type { HealthIssue } from '../../lib/healthCheck';
import { HEALTH_TABLE_LABEL } from '../../lib/healthCheck';
import { Panel } from '../ui/Panel';

export interface HealthCheckPanelProps {
  /** null = 尚未检查 */
  issues: HealthIssue[] | null;
  onRun: () => void;
}

/** 管理页数据健康检查：运行与状态管理在 AdminPage，这里负责展示 */
export function HealthCheckPanel({ issues, onRun }: HealthCheckPanelProps) {
  return (
    <Panel className="mt-6 p-5 md:p-6" ticks>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">数据健康检查</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            检查悬挂关联、无效枚举值、日期格式与重复名称等问题，建议在批量导入后运行。
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          className="chamfer-xs border border-gold-500/50 px-3 py-1.5 text-sm text-gold-300 transition hover:bg-gold-500/10"
        >
          开始检查
        </button>
      </div>

      {issues !== null &&
        (issues.length === 0 ? (
          <p className="mt-4 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            未发现问题，数据状态良好。
          </p>
        ) : (
          <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {issues.map((issue, index) => (
              <li
                key={`${issue.table}-${issue.entryId}-${index}`}
                className="flex items-start gap-2.5 border border-space-700/60 bg-space-850/60 px-3 py-2 text-xs"
              >
                <span
                  aria-hidden
                  className={`mt-1 size-1.5 shrink-0 rotate-45 ${
                    issue.severity === 'error' ? 'bg-red-400' : 'bg-gold-400'
                  }`}
                />
                <span className="shrink-0 text-slate-500">
                  {HEALTH_TABLE_LABEL[issue.table]}
                </span>
                <span className="min-w-0">
                  <span className="text-slate-200">{issue.entryLabel}</span>
                  <span className="ml-1.5 font-display text-slate-600">
                    {issue.entryId}
                  </span>
                  <span className="ml-2 text-slate-400">{issue.message}</span>
                </span>
              </li>
            ))}
          </ul>
        ))}
    </Panel>
  );
}
