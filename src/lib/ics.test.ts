import { describe, expect, it } from 'vitest';
import type { NewsEvent } from '../db/types';
import { addDaysISO, buildNewsIcs, toIcsDate } from './ics';

function makeEvent(overrides: Partial<NewsEvent> = {}): NewsEvent {
  return {
    id: 'v3.7',
    type: 'version',
    title: '3.7 版本更新',
    date: '2026-09-30',
    ...overrides,
  };
}

describe('toIcsDate', () => {
  it('YYYY-MM-DD 转为 YYYYMMDD', () => {
    expect(toIcsDate('2026-09-30')).toBe('20260930');
  });
});

describe('addDaysISO', () => {
  it('跨月进位', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('跨年进位', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('普通日期加多天', () => {
    expect(addDaysISO('2026-09-28', 7)).toBe('2026-10-05');
  });
});

describe('buildNewsIcs', () => {
  it('包含日历头与事件结构，单日事件 DTEND 为次日', () => {
    const ics = buildNewsIcs([makeEvent()]);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('UID:v3.7@hsr-wiki.local');
    expect(lines).toContain('DTSTART;VALUE=DATE:20260930');
    expect(lines).toContain('DTEND;VALUE=DATE:20261001');
    expect(lines).toContain('SUMMARY:3.7 版本更新');
    expect(lines).toContain('END:VEVENT');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('跨天事件 DTEND 为结束日期次日', () => {
    const ics = buildNewsIcs([
      makeEvent({ type: 'banner', date: '2026-09-30', endDate: '2026-10-20' }),
    ]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260930');
    expect(ics).toContain('DTEND;VALUE=DATE:20261021');
  });

  it('DESCRIPTION 拼接类型标签与版本号', () => {
    const ics = buildNewsIcs([
      makeEvent({ version: '3.7', description: '开放新地图' }),
    ]);
    expect(ics).toContain('DESCRIPTION:版本更新 · 版本 3.7 · 开放新地图');
  });

  it('SUMMARY / DESCRIPTION 中的逗号分号与换行按 RFC 5545 转义', () => {
    const ics = buildNewsIcs([
      makeEvent({
        title: '限时,活动;开启',
        description: '第一行\n第二行',
      }),
    ]);
    expect(ics).toContain('SUMMARY:限时\\,活动\\;开启');
    expect(ics).toContain('DESCRIPTION:版本更新 · 第一行\\n第二行');
  });
});
