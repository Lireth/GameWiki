import { describe, expect, it } from 'vitest';
import {
  characterSeed,
  lightConeSeed,
  newsEventSeed,
  relicSeed,
} from './seed';
import {
  characterRecordError,
  isNewsEventRecord,
  isRelicRecord,
  lightConeRecordError,
} from '../lib/recordValidation';
import { checkWikiData } from '../lib/healthCheck';
import { DATE_PATTERN } from '../lib/entryValidation';

/**
 * 种子数据质量门禁：抓取 / 手工维护的种子在合入前必须整体通过
 * 与「批量录入 / 备份导入」同口径的记录校验（recordValidation），
 * 且健康检查不允许出现 error 级问题（悬挂关联、无效枚举、日期顺序等）。
 */
describe('种子数据质量', () => {
  it('全部角色条目通过记录级校验', () => {
    const bad = characterSeed
      .map((entry) => characterRecordError(entry))
      .filter(Boolean);
    expect(bad).toEqual([]);
  });

  it('全部光锥条目通过记录级校验', () => {
    const bad = lightConeSeed
      .map((entry) => lightConeRecordError(entry))
      .filter(Boolean);
    expect(bad).toEqual([]);
  });

  it('全部遗器条目通过记录级校验', () => {
    const bad = relicSeed
      .map((entry) => !isRelicRecord(entry) && (entry as { id: string }).id)
      .filter(Boolean);
    expect(bad).toEqual([]);
  });

  it('全部资讯事件通过记录级校验', () => {
    const bad = newsEventSeed
      .map((entry) => !isNewsEventRecord(entry) && (entry as { id: string }).id)
      .filter(Boolean);
    expect(bad).toEqual([]);
  });

  it('各表 id 与资讯事件 id 唯一', () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(characterSeed.map((c) => c.id))).toBe(true);
    expect(unique(lightConeSeed.map((lc) => lc.id))).toBe(true);
    expect(unique(relicSeed.map((r) => r.id))).toBe(true);
    expect(unique(newsEventSeed.map((e) => e.id))).toBe(true);
  });

  it('资讯事件关联的角色 / 光锥 / 遗器 id 均真实存在', () => {
    const characterIds = new Set(characterSeed.map((c) => c.id));
    const coneIds = new Set(lightConeSeed.map((lc) => lc.id));
    const relicIds = new Set(relicSeed.map((r) => r.id));
    const dangling: string[] = [];
    for (const event of newsEventSeed) {
      if (event.relatedCharacterId && !characterIds.has(event.relatedCharacterId)) {
        dangling.push(`${event.id} → 角色 ${event.relatedCharacterId}`);
      }
      if (event.relatedLightConeId && !coneIds.has(event.relatedLightConeId)) {
        dangling.push(`${event.id} → 光锥 ${event.relatedLightConeId}`);
      }
      if (event.relatedRelicId && !relicIds.has(event.relatedRelicId)) {
        dangling.push(`${event.id} → 遗器 ${event.relatedRelicId}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('带结束日期的事件不早于开始日期，日期均为 YYYY-MM-DD', () => {
    for (const event of newsEventSeed) {
      expect(DATE_PATTERN.test(event.date), event.id).toBe(true);
      if (event.endDate) {
        expect(DATE_PATTERN.test(event.endDate), event.id).toBe(true);
        expect(event.endDate >= event.date, event.id).toBe(true);
      }
    }
  });

  it('健康检查不允许出现 error 级问题', () => {
    const issues = checkWikiData({
      characters: characterSeed,
      lightCones: lightConeSeed,
      relics: relicSeed,
      newsEvents: newsEventSeed,
    });
    const errors = issues.filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });
});
