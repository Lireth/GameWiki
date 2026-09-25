const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 解析 YYYY-MM-DD 为本地时间（避免时区偏移问题） */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** 2026-09-25 → 2026年9月25日 */
export function formatDateCN(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 2026-09-25 → 9月25日 */
export function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function weekdayCN(iso: string): string {
  return `星期${WEEKDAYS[parseISODate(iso).getDay()]}`;
}

/** 枚举 [start, end] 区间内（含两端）的 YYYY-MM-DD；end 早于 start 时视为单日，上限 62 天防脏数据 */
export function eachISODate(start: string, end: string): string[] {
  const last = parseISODate(start >= end ? start : end);
  const result: string[] = [];
  let cursor = parseISODate(start);
  while (cursor <= last && result.length < 62) {
    result.push(toISODate(cursor));
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1,
    );
  }
  return result;
}

export interface CalendarCell {
  /** YYYY-MM-DD */
  iso: string;
  /** 展示的「日」数字 */
  day: number;
  /** 是否属于当前显示月份 */
  inMonth: boolean;
  isToday: boolean;
}

/**
 * 构建某年某月（month0: 0-11）的日历网格，周一为一周起点，
 * 自动补齐前后月日期，行数按需为 5 或 6 行。
 */
export function monthGrid(year: number, month0: number): CalendarCell[] {
  const firstDow = (new Date(year, month0, 1).getDay() + 6) % 7; // 周一 = 0
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cellCount = firstDow + daysInMonth <= 35 ? 35 : 42;
  const today = todayISO();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < cellCount; i++) {
    const date = new Date(year, month0, 1 - firstDow + i);
    const iso = toISODate(date);
    cells.push({
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month0,
      isToday: iso === today,
    });
  }
  return cells;
}

/** 事件是否与某年某月有交集（含跨月活动的开始 / 结束 / 覆盖整月） */
export function eventTouchesMonth(
  event: { date: string; endDate?: string },
  year: number,
  month0: number,
): boolean {
  const start = parseISODate(event.date);
  const end = event.endDate ? parseISODate(event.endDate) : start;
  const monthStart = new Date(year, month0, 1);
  const monthEnd = new Date(year, month0 + 1, 0);
  return start <= monthEnd && end >= monthStart;
}
