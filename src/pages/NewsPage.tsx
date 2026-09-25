import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/icons';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { CopyLinkButton } from '../components/ui/FilterPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { TypeBadge } from '../components/ui/Badges';
import type { NewsEvent, NewsEventType } from '../db/types';
import { NEWS_EVENT_TYPES } from '../db/types';
import { useBootstrapStatus, useNewsEvents } from '../hooks/useWikiData';
import {
  eventTouchesMonth,
  eachISODate,
  formatDateCN,
  formatDateShort,
  monthGrid,
  weekdayCN,
} from '../lib/format';
import { eventLink, versionLink } from '../lib/links';
import { NEWS_TYPE_META } from '../lib/meta';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

const MAX_CHIPS_PER_DAY = 3;

type TypeFilter = NewsEventType | 'all';

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

/** 解析 URL 中的年（y）/ 月（m，1-12），非法或缺省时回退到当前日期 */
function readYear(raw: string | null, now: Date): number {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2000 && year <= 2200
    ? year
    : now.getFullYear();
}

function readMonth(raw: string | null, now: Date): number {
  const month = Number(raw);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month - 1
    : now.getMonth();
}

export function NewsPage() {
  useDocumentTitle('资讯日历');
  const events = useNewsEvents();
  const dataReady = useBootstrapStatus() === 'ok';
  const [params, setParams] = useSearchParams();
  // 「今天」在会话期内固定，避免跨午夜渲染不一致
  const now = useMemo(() => new Date(), []);
  // 年月与类型筛选同步到 URL，可直接分享指定月份 / 筛选条件的视图
  const year = readYear(params.get('y'), now);
  const month0 = readMonth(params.get('m'), now);
  const rawType = params.get('type');
  const typeFilter: TypeFilter =
    rawType && (NEWS_EVENT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as TypeFilter)
      : 'all';
  // 选中日期（d 参数）：点击日历格查看当日全部事件
  const rawDay = params.get('d');
  const selectedDate =
    rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay : null;

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

  /** 选中日期的事件（含跨天事件的进行中日） */
  const selectedDayEvents = useMemo(
    () => (selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []),
    [eventsByDate, selectedDate],
  );
  const listEvents = selectedDate ? selectedDayEvents : monthEvents;

  const setParamsFor = (mutate: (next: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true },
    );

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month0 + delta, 1);
    setParamsFor((n) => {
      n.set('y', String(next.getFullYear()));
      n.set('m', String(next.getMonth() + 1));
      n.delete('d');
    });
  };

  const backToToday = () =>
    setParamsFor((n) => {
      n.delete('y');
      n.delete('m');
      n.delete('d');
    });

  const setTypeFilter = (type: TypeFilter) =>
    setParamsFor((n) => {
      if (type === 'all') n.delete('type');
      else n.set('type', type);
    });

  /** 点击日历格 / 「+N 项」：选中该日查看全部事件，再次点击取消 */
  const toggleDay = (iso: string) =>
    setParamsFor((n) => {
      if (n.get('d') === iso) n.delete('d');
      else n.set('d', iso);
    });

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
          <CopyLinkButton className="ml-1" />
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
                } ${cell.iso === selectedDate ? 'ring-1 ring-inset ring-gold-500/70' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(cell.iso)}
                  aria-pressed={cell.iso === selectedDate}
                  title="查看当日全部事件"
                  className="flex w-full items-center justify-between text-left"
                >
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
                </button>
                <div className="mt-1 space-y-1">
                  {visible.map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleDay(cell.iso)}
                      title="查看当日全部事件"
                      className="text-[10px] text-slate-500 transition hover:text-gold-300"
                    >
                      +{hidden} 项
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 事件列表：选中日期时仅展示当日，否则展示整月 */}
      <Panel className="mt-8 p-5 md:p-6" ticks>
        <div className="flex flex-wrap items-center gap-2.5">
          <CalendarIcon className="size-5 text-gold-400" />
          {selectedDate ? (
            <>
              <h3 className="text-lg font-semibold text-slate-100">
                {formatDateCN(selectedDate)}
                <span className="ml-1.5 text-sm text-slate-500">
                  {weekdayCN(selectedDate)}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => toggleDay(selectedDate)}
                className="ml-auto border border-gold-500/50 px-2 py-1 text-xs text-gold-300 transition hover:bg-gold-500/10"
              >
                查看整月
              </button>
            </>
          ) : (
            <h3 className="text-lg font-semibold text-slate-100">
              {year}年{month0 + 1}月事件
            </h3>
          )}
          <span className="font-display text-xs tracking-widest text-slate-500">
            {listEvents.length} 项
          </span>
        </div>

        {events.length === 0 ? (
          dataReady ? (
            <EmptyState
              className="mt-4"
              title="暂无资讯数据"
              hint="资讯事件尚未收录，可通过页脚「数据管理」录入；支持版本、角色、光锥、活动、卡池、活动结束六类事件。"
            />
          ) : (
            <LoadingState className="mt-4" />
          )
        ) : listEvents.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {selectedDate ? '当日暂无资讯' : '本月暂无资讯'}
            {typeFilter !== 'all' && '（当前筛选条件下）'}
          </p>
        ) : (
          <ul className="mt-2">
            {listEvents.map((event) => {
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
                    <Link
                      to={versionLink(event.version)}
                      title="查看该版本全部内容"
                      className="font-display text-xs tracking-wider text-slate-500 transition hover:text-gold-300"
                    >
                      v{event.version}
                    </Link>
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
