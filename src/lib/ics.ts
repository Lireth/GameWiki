/**
 * 资讯日历 ICS 导出纯逻辑（RFC 5545 全天事件）。
 * 独立于 React 与 DOM（下载辅助函数除外），便于单元测试；
 * 生成内容可导入系统日历 / Google Calendar，实现卡池与活动提醒。
 */
import type { NewsEvent } from '../db/types';
import { parseISODate, toISODate } from './format';
import { NEWS_TYPE_META } from './meta';

/** RFC 5545 文本转义：反斜杠、分号、逗号、换行 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** YYYY-MM-DD → ICS 全天日期值（YYYYMMDD） */
export function toIcsDate(iso: string): string {
  return iso.replaceAll('-', '');
}

/** ISO 日期 + n 天（本地时区纯日期运算，避开 UTC 偏移与夏令时干扰） */
export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  return toISODate(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days),
  );
}

/** 当前时刻的 ICS DTSTAMP（UTC 基本格式：YYYYMMDDTHHMMSSZ） */
function dtStampNow(): string {
  return `${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
}

/**
 * 把资讯事件列表构建为 VCALENDAR 文本。
 * 全天事件的 DTEND 为排他端点：单日事件 DTEND = 次日，
 * 跨天事件 DTEND = endDate 次日；行尾统一 CRLF（RFC 5545 要求）。
 */
export function buildNewsIcs(events: readonly NewsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//hsr-wiki//news calendar//CN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:星穹铁道资料站 · 资讯日历',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ];
  const stamp = dtStampNow();

  for (const event of events) {
    const endISO = event.endDate ?? event.date;
    const description = [
      NEWS_TYPE_META[event.type].label,
      event.version ? `版本 ${event.version}` : undefined,
      event.description,
    ]
      .filter(Boolean)
      .join(' · ');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@hsr-wiki.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDaysISO(endISO, 1))}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/** 触发浏览器下载 ICS 文件（text/calendar） */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
