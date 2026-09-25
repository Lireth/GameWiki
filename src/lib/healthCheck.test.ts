import { describe, expect, it } from 'vitest';
import type { Character, LightCone, NewsEvent, RelicSet } from '../db/types';
import { checkWikiData } from './healthCheck';

const baseCharacter: Character = {
  id: 'seele',
  name: '希儿',
  rarity: 5,
  path: 'hunt',
  element: 'quantum',
  faction: '星穹列车',
  camp: '雅利洛-VI',
  gender: 'female',
  bodyType: 'youngFemale',
  releaseDate: '2026-01-01',
  releaseVersion: '1.0',
};

const baseLightCone: LightCone = {
  id: 'lc1',
  name: '残酷的夜',
  rarity: 5,
  path: 'hunt',
};

const baseRelic: RelicSet = {
  id: 'relic1',
  name: '雪套',
  category: 'cavern',
  rarity: 5,
  effect2: '冰属性伤害提高。',
  effect4: '……',
};

const baseEvent: NewsEvent = {
  id: 'ev1',
  type: 'character',
  title: '希儿实装',
  date: '2026-01-01',
};

describe('checkWikiData', () => {
  it('干净数据不产生问题', () => {
    const issues = checkWikiData({
      characters: [baseCharacter],
      lightCones: [baseLightCone],
      relics: [baseRelic],
      newsEvents: [
        { ...baseEvent, relatedCharacterId: 'seele', endDate: '2026-01-15' },
      ],
    });
    expect(issues).toEqual([]);
  });

  it('枚举值 / 日期格式 / 缺失字段报 error', () => {
    const issues = checkWikiData({
      characters: [
        {
          ...baseCharacter,
          id: 'bad',
          name: '',
          rarity: 6 as Character['rarity'],
          path: 'unknown' as Character['path'],
          releaseDate: '2026/01/01',
          releaseVersion: '',
        },
      ],
      lightCones: [],
      relics: [],
      newsEvents: [],
    });
    const messages = issues.map((issue) => issue.message);
    expect(messages).toContain('缺少名称');
    expect(messages.some((m) => m.startsWith('稀有度取值无效'))).toBe(true);
    expect(messages.some((m) => m.startsWith('命途取值无效'))).toBe(true);
    expect(messages).toContain('实装日期格式应为 YYYY-MM-DD');
    expect(messages).toContain('缺少实装版本，无法在版本页 / 版本筛选中归类');
  });

  it('悬挂关联与日期倒挂报 error', () => {
    const issues = checkWikiData({
      characters: [],
      lightCones: [],
      relics: [],
      newsEvents: [
        {
          ...baseEvent,
          relatedRelicId: 'ghost',
          endDate: '2025-12-31',
        },
      ],
    });
    expect(issues.some((issue) => issue.message.includes('关联遗器「ghost」不存在'))).toBe(true);
    expect(issues.some((issue) => issue.message === '结束日期早于开始日期')).toBe(true);
  });

  it('重复名称报 warning，位面饰品带四件套效果报 warning', () => {
    const issues = checkWikiData({
      characters: [baseCharacter, { ...baseCharacter, id: 'seele-2' }],
      lightCones: [],
      relics: [{ ...baseRelic, category: 'planar' }],
      newsEvents: [],
    });
    const warnings = issues.filter((issue) => issue.severity === 'warning');
    expect(warnings.some((issue) => issue.message === '名称与其它角色重复')).toBe(true);
    expect(warnings.some((issue) => issue.message === '位面饰品不应有四件套效果')).toBe(true);
  });
});
