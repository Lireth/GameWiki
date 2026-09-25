import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/icons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { TypeBadge } from '../components/ui/Badges';
import type { NewsEvent, NewsEventType } from '../db/types';
import { NEWS_EVENT_TYPES } from '../db/types';
import { useNewsEvents } from '../hooks/useWikiData';
import {
  eventTouchesMonth,
  eachISODate,
  formatDateShort,
  monthGrid,
  weekdayCN,
} from '../lib/format';
import { NEWS_TYPE_META } from '../lib/meta';

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

const MAX_CHIPS_PER_DAY = 3;

type TypeFilter = NewsEventType | 'all';

/** 事件关联的角色 / 光锥详情页链接（无关联时为 null） */
function eventLink(event: NewsEvent): string | null {
  if (event.relatedCharacterId) return `/characters/${event.relatedCharacterId}`;
  if (event.relatedLightConeId) return `/light-cones/${event.relatedLightConeId}`;
  return null;
}

/** 按类型筛选并按日期分桶（跨天事件在起止区间内的每一天都展示） */
function useEventsByDate(events: NewsEvent[], typeFilter: TypeFilter) {
  return useMemo(() => {
    const map = new Map<string, NewsEvent[]>();
    for (const event of events) {
      if (typeFilter !== 'all' && event.type !== typeFilter) continue;
      for (const iso of eachISODate(event.date, event.endDate ?? event.date)) {
        const bucket = map.get(iso);
        if (bucket) bucket.push(event);
        else map.set(iso, [event]);
      }
    }
    return map;
  }, [events, typeFilter]);
}

function EventChip({ event }: { event: NewsEvent }) {
  const meta = NEWS_TYPE_META[event.type];
  const style = {
    color: meta.color,
    backgroundColor: `${meta.color}1f`,
  };
  const inner = (
    <>
      <i aria-hidden className="size-1 shrink-0 rotate-45 bg-current" />
      <span className="truncate">{event.title}</span>
    </>
  );
  const className =
    'flex items-center gap-1 px-1 py-0.5 text-[11px] leading-4 transition hover:brightness-125';

  const link = eventLink(event);

  return link ? (
    <Link to={link} className={className} style={style} title={event.title}>
      {inner}
    </Link>
  ) : (
    <span className={className} style={style} title={event.title}>
      {inner}
    </span>
  );
}

export function NewsPage() {
  const events = useNewsEvents();
  // 「今天」在会话期内固定，避免跨午夜渲染不一致
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const grid = useMemo(() => monthGrid(year, month0), [year, month0]);
  const eventsByDate = useEventsByDate(events, typeFilter);

  const monthEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            (typeFilter === 'all' || event.type === typeFilter) &&
            eventTouchesMonth(event, year, month0),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, typeFilter, year, month0],
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month0 + delta, 1);
    setYear(next.getFullYear());
    setMonth0(next.getMonth());
  };

  const backToToday = () => {
    setYear(now.getFullYear());
    setMonth0(now.getMonth());
  };

  const isCurrentMonth =
    year === now.getFullYear() && month0 === now.getMonth();

  return (
    <div>
      <PageHeader
        en="News Calendar"
        title="资讯日历"
        description="以年月日历视图展示版本更新、角色 / 光锥实装、卡池与活动等关键时间节点。"
      />

      {/* 工具栏：月份切换 + 类型筛选 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="上一月"
            className="border border-space-600/60 p-2 text-slate-400 transition hover:border-gold-500/60 hover:text-gold-300"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <h2 className="min-w-[7.5rem] text-center font-display text-xl font-bold text-slate-100">
            {year}年{month0 + 1}月
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="下一月"
            className="border border-space-600/60 p-2 text-slate-400 transition hover:border-gold-500/60 hover:text-gold-300"
          >
            <ChevronRightIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={backToToday}
            disabled={isCurrentMonth}
            className="chamfer-xs ml-2 border border-gold-500/50 px-3 py-1.5 text-xs text-gold-300 transition hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            今天
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`chamfer-xs border px-2.5 py-1 text-xs transition ${
              typeFilter === 'all'
                ? 'border-gold-500 bg-gold-500 text-space-950'
                : 'border-space-600/60 text-slate-400 hover:border-gold-500/50 hover:text-gold-300'
            }`}
          >
            全部
          </button>
          {NEWS_EVENT_TYPES.map((type) => {
            const meta = NEWS_TYPE_META[type];
            const active = typeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(active ? 'all' : type)}
                className="chamfer-xs border px-2.5 py-1 text-xs transition hover:brightness-125"
                style={
                  active
                    ? { backgroundColor: meta.color, borderColor: meta.color, color: '#04060c' }
                    : { borderColor: `${meta.color}55`, color: `${meta.color}bb` }
                }
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 日历网格 */}
      <Panel className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-space-600/40 bg-space-800/60">
          {WEEKDAY_HEADERS.map((label) => (
            <div
              key={label}
              className="py-2.5 text-center text-xs text-slate-500"
            >
              周{label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-space-700/40">
          {grid.map((cell) => {
            const dayEvents = eventsByDate.get(cell.iso) ?? [];
            const visible = dayEvents.slice(0, MAX_CHIPS_PER_DAY);
            const hidden = dayEvents.length - visible.length;
            return (
              <div
                key={cell.iso}
                className={`min-h-[84px] p-1.5 sm:min-h-[104px] ${
                  cell.inMonth ? 'bg-space-900' : 'bg-space-950/60 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-display text-xs font-semibold ${
                      cell.isToday ? 'text-gold-300' : 'text-slate-500'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.isToday && (
                    <span className="shrink-0 whitespace-nowrap border border-gold-500/70 px-1 text-[10px] leading-4 text-gold-300">
                      今天
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {visible.map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
                  {hidden > 0 && (
                    <p className="text-[10px] text-slate-500">+{hidden} 项</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 本月事件列表 */}
      <Panel className="mt-8 p-5 md:p-6" ticks>
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="size-5 text-gold-400" />
          <h3 className="text-lg font-semibold text-slate-100">
            {year}年{month0 + 1}月事件
          </h3>
          <span className="font-display text-xs tracking-widest text-slate-500">
            {monthEvents.length} 项
          </span>
        </div>

        {events.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="暂无资讯数据"
            hint="资讯事件尚未收录，可在 src/data/seed.ts 中录入；支持版本、角色、光锥、活动、卡池、活动结束六类事件。"
          />
        ) : monthEvents.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            本月暂无资讯{typeFilter !== 'all' && '（当前筛选条件下）'}
          </p>
        ) : (
          <ul className="mt-2">
            {monthEvents.map((event) => {
              const link = eventLink(event);
              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-space-700/50 py-3 last:border-b-0"
                >
                  <span className="w-24 shrink-0 font-display text-sm text-gold-300">
                    {formatDateShort(event.date)}
                    <span className="ml-1.5 text-[11px] text-slate-500">
                      {weekdayCN(event.date)}
                    </span>
                  </span>
                  <TypeBadge type={event.type} />
                  {link ? (
                    <Link
                      to={link}
                      className="min-w-0 flex-1 truncate text-sm text-slate-200 hover:text-gold-300"
                    >
                      {event.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {event.title}
                    </span>
                  )}
                  {event.endDate && (
                    <span className="text-xs text-slate-500">
                      至 {formatDateShort(event.endDate)}
                    </span>
                  )}
                  {event.version && (
                    <span className="font-display text-xs tracking-wider text-slate-500">
                      v{event.version}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
