import { describe, expect, it } from 'vitest';
import {
  eachISODate,
  eventTouchesMonth,
  formatDateCN,
  formatDateShort,
  monthGrid,
  newsMonthLink,
  parseISODate,
  toISODate,
  weekdayCN,
} from './format';

describe('parseISODate / toISODate', () => {
  it('按本地时区解析，年月日与字符串一致', () => {
    const d = parseISODate('2026-09-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);
  });

  it('toISODate 补零，往返一致', () => {
    expect(toISODate(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(toISODate(parseISODate('2026-01-31'))).toBe('2026-01-31');
  });
});

describe('格式化', () => {
  it('formatDateCN / formatDateShort / weekdayCN', () => {
    expect(formatDateCN('2026-09-25')).toBe('2026年9月25日');
    expect(formatDateShort('2026-09-25')).toBe('9月25日');
    expect(weekdayCN('2026-09-25')).toBe('星期五');
  });
});

describe('monthGrid', () => {
  it('周一为起点，自动补齐前后月，35 或 42 格', () => {
    // 2026-09-01 是周二（周一起始偏移 1），9 月 30 天 → 35 格
    const grid = monthGrid(2026, 8);
    expect(grid).toHaveLength(35);
    expect(grid[0].iso).toBe('2026-08-31');
    expect(grid[0].inMonth).toBe(false);
    expect(grid[1].iso).toBe('2026-09-01');
    expect(grid[1].inMonth).toBe(true);
    expect(grid[grid.length - 1].iso).toBe('2026-10-04');
    expect(grid[grid.length - 1].inMonth).toBe(false);
  });

  it('当月第一天是周一且行数超 5 行时用 42 格', () => {
    // 2026-08-01 是周六（偏移 5），8 月 31 天 → 36 > 35 → 42 格
    const grid = monthGrid(2026, 7);
    expect(grid).toHaveLength(42);
    expect(grid[0].iso).toBe('2026-07-27');
    expect(grid[5].iso).toBe('2026-08-01');
  });

  it('当前月的网格中存在 isToday 标记', () => {
    const now = new Date();
    const grid = monthGrid(now.getFullYear(), now.getMonth());
    expect(grid.filter((cell) => cell.isToday)).toHaveLength(1);
  });
});

describe('eachISODate', () => {
  it('枚举闭区间内的每一天', () => {
    expect(eachISODate('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  it('end 早于 start 时视为单日', () => {
    expect(eachISODate('2026-09-25', '2026-09-01')).toEqual(['2026-09-25']);
  });

  it('上限 62 天，防止脏数据撑爆日历', () => {
    const days = eachISODate('2026-01-01', '2026-12-31');
    expect(days).toHaveLength(62);
    expect(days[0]).toBe('2026-01-01');
    expect(days[days.length - 1]).toBe('2026-03-03');
  });
});

describe('eventTouchesMonth', () => {
  it('单日事件只命中所在月份', () => {
    expect(eventTouchesMonth({ date: '2026-09-25' }, 2026, 8)).toBe(true);
    expect(eventTouchesMonth({ date: '2026-09-25' }, 2026, 9)).toBe(false);
  });

  it('跨天事件命中覆盖到的每个月', () => {
    const event = { date: '2026-08-30', endDate: '2026-10-02' };
    expect(eventTouchesMonth(event, 2026, 7)).toBe(true);
    expect(eventTouchesMonth(event, 2026, 8)).toBe(true);
    expect(eventTouchesMonth(event, 2026, 9)).toBe(true);
    expect(eventTouchesMonth(event, 2026, 10)).toBe(false);
  });
});

describe('newsMonthLink', () => {
  it('生成跳转到日历对应月份的链接', () => {
    expect(newsMonthLink('2026-09-25')).toBe('/news?y=2026&m=9');
    expect(newsMonthLink('2026-01-05')).toBe('/news?y=2026&m=1');
  });
});
