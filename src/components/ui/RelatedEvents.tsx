import { Link } from 'react-router-dom';
import { TypeBadge } from './Badges';
import { Panel } from './Panel';
import type { NewsEvent } from '../../db/types';
import { formatDateShort } from '../../lib/format';
import { newsMonthLink } from '../../lib/links';

interface RelatedEventsProps {
  /** 已按关联字段过滤好的事件（组件内部按日期从早到晚排序） */
  events: NewsEvent[];
  className?: string;
}

/** 详情页「相关动态」时间线：实装 / 卡池 / 活动事件，日期可跳转资讯日历对应月份 */
export function RelatedEvents({ events, className = 'mt-6' }: RelatedEventsProps) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Panel className={`${className} p-5 md:p-7`} ticks>
      <h2 className="text-lg font-semibold text-slate-100">相关动态</h2>
      <ul className="mt-2">
        {sorted.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-space-700/50 py-3 last:border-b-0"
          >
            <Link
              to={newsMonthLink(event.date)}
              title="在资讯日历中查看该月"
              className="w-24 shrink-0 font-display text-sm text-gold-300 transition hover:text-gold-400"
            >
              {formatDateShort(event.date)}
            </Link>
            <TypeBadge type={event.type} />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
              {event.title}
            </span>
            {event.endDate && (
              <span className="text-xs text-slate-500">
                至 {formatDateShort(event.endDate)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
