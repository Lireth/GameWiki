/**
 * 数据健康检查纯逻辑（管理页调用，独立于 React 便于测试）。
 * 检查悬挂关联、无效枚举值、日期格式 / 顺序、重复名称等问题；
 * 返回问题清单，空数组表示未发现问题。
 */
import type { Character, LightCone, NewsEvent, RelicSet } from '../db/types';
import {
  ACQUISITION_TYPES,
  BODY_TYPES,
  ELEMENT_IDS,
  GENDERS,
  NEWS_EVENT_TYPES,
  PATH_IDS,
  RELIC_CATEGORIES,
} from '../db/types';
import { parseImageRef } from './imageRef';

export type HealthTable = 'characters' | 'lightCones' | 'relics' | 'newsEvents';

export interface HealthIssue {
  severity: 'error' | 'warning';
  table: HealthTable;
  entryId: string;
  entryLabel: string;
  message: string;
}

export const HEALTH_TABLE_LABEL: Record<HealthTable, string> = {
  characters: '角色',
  lightCones: '光锥',
  relics: '遗器',
  newsEvents: '资讯',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 名称重复计数（同表内），返回出现次数 > 1 的名称集合 */
function findDuplicateNames(names: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
}

export function checkWikiData(data: {
  characters: Character[];
  lightCones: LightCone[];
  relics: RelicSet[];
  newsEvents: NewsEvent[];
  /** images 表现有主键集合；提供时检查 idb: 图片引用是否悬空 */
  imageIds?: ReadonlySet<string>;
}): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const push = (
    severity: HealthIssue['severity'],
    table: HealthTable,
    entryId: string,
    entryLabel: string,
    message: string,
  ) => {
    issues.push({ severity, table, entryId, entryLabel, message });
  };

  /** idb: 图片引用是否指向存在的本地图片（未提供 imageIds 时跳过） */
  const imageRefOk = (value: string | undefined): boolean => {
    const ref = parseImageRef(value);
    if (!ref) return true;
    return data.imageIds ? data.imageIds.has(ref) : true;
  };

  /* ---------------- 角色 ---------------- */
  const duplicateCharNames = findDuplicateNames(data.characters.map((c) => c.name));
  for (const c of data.characters) {
    if (!c.name) push('error', 'characters', c.id, c.id, '缺少名称');
    if (c.rarity !== 4 && c.rarity !== 5) {
      push('error', 'characters', c.id, c.name || c.id, `稀有度取值无效（${c.rarity}），应为 4★ 或 5★`);
    }
    if (!PATH_IDS.includes(c.path)) {
      push('error', 'characters', c.id, c.name || c.id, `命途取值无效（${c.path}）`);
    }
    if (!ELEMENT_IDS.includes(c.element)) {
      push('error', 'characters', c.id, c.name || c.id, `战斗属性取值无效（${c.element}）`);
    }
    if (!GENDERS.includes(c.gender)) {
      push('error', 'characters', c.id, c.name || c.id, `性别取值无效（${c.gender}）`);
    }
    if (!BODY_TYPES.includes(c.bodyType)) {
      push('error', 'characters', c.id, c.name || c.id, `体型取值无效（${c.bodyType}）`);
    }
    if (!DATE_PATTERN.test(c.releaseDate)) {
      push('error', 'characters', c.id, c.name || c.id, '实装日期格式应为 YYYY-MM-DD');
    }
    if (!imageRefOk(c.avatar)) {
      push('warning', 'characters', c.id, c.name || c.id, '头像图片引用指向不存在的本地图片');
    }
    if (!c.releaseVersion) {
      push('warning', 'characters', c.id, c.name || c.id, '缺少实装版本，无法在版本页 / 版本筛选中归类');
    }
    if (duplicateCharNames.has(c.name)) {
      push('warning', 'characters', c.id, c.name, '名称与其它角色重复');
    }
  }

  /* ---------------- 光锥 ---------------- */
  const duplicateConeNames = findDuplicateNames(data.lightCones.map((lc) => lc.name));
  for (const lc of data.lightCones) {
    if (!lc.name) push('error', 'lightCones', lc.id, lc.id, '缺少名称');
    if (lc.rarity !== 3 && lc.rarity !== 4 && lc.rarity !== 5) {
      push('error', 'lightCones', lc.id, lc.name || lc.id, `稀有度取值无效（${lc.rarity}），应为 3-5★`);
    }
    if (!PATH_IDS.includes(lc.path)) {
      push('error', 'lightCones', lc.id, lc.name || lc.id, `命途取值无效（${lc.path}）`);
    }
    if (lc.acquisition !== undefined && !ACQUISITION_TYPES.includes(lc.acquisition)) {
      push('error', 'lightCones', lc.id, lc.name || lc.id, `获取方式取值无效（${lc.acquisition}）`);
    }
    if (lc.releaseDate !== undefined && !DATE_PATTERN.test(lc.releaseDate)) {
      push('error', 'lightCones', lc.id, lc.name || lc.id, '实装日期格式应为 YYYY-MM-DD');
    }
    if (!imageRefOk(lc.image)) {
      push('warning', 'lightCones', lc.id, lc.name || lc.id, '图片引用指向不存在的本地图片');
    }
    if (duplicateConeNames.has(lc.name)) {
      push('warning', 'lightCones', lc.id, lc.name, '名称与其它光锥重复');
    }
  }

  /* ---------------- 遗器 ---------------- */
  const duplicateRelicNames = findDuplicateNames(data.relics.map((r) => r.name));
  for (const relic of data.relics) {
    if (!relic.name) push('error', 'relics', relic.id, relic.id, '缺少套装名称');
    if (!relic.effect2) {
      push('error', 'relics', relic.id, relic.name || relic.id, '缺少二件套效果');
    }
    if (!RELIC_CATEGORIES.includes(relic.category)) {
      push('error', 'relics', relic.id, relic.name || relic.id, `类别取值无效（${relic.category}）`);
    }
    if (relic.rarity !== 2 && relic.rarity !== 3 && relic.rarity !== 4 && relic.rarity !== 5) {
      push('error', 'relics', relic.id, relic.name || relic.id, `稀有度取值无效（${relic.rarity}），应为 2-5★`);
    }
    if (relic.category === 'planar' && relic.effect4) {
      push('warning', 'relics', relic.id, relic.name, '位面饰品不应有四件套效果');
    }
    if (relic.releaseDate !== undefined && !DATE_PATTERN.test(relic.releaseDate)) {
      push('error', 'relics', relic.id, relic.name || relic.id, '实装日期格式应为 YYYY-MM-DD');
    }
    if (!imageRefOk(relic.image)) {
      push('warning', 'relics', relic.id, relic.name || relic.id, '图片引用指向不存在的本地图片');
    }
    if (duplicateRelicNames.has(relic.name)) {
      push('warning', 'relics', relic.id, relic.name, '名称与其它遗器重复');
    }
  }

  /* ---------------- 资讯事件 ---------------- */
  const characterIds = new Set(data.characters.map((c) => c.id));
  const lightConeIds = new Set(data.lightCones.map((lc) => lc.id));
  const relicIds = new Set(data.relics.map((r) => r.id));
  for (const event of data.newsEvents) {
    if (!event.title) push('error', 'newsEvents', event.id, event.id, '缺少标题');
    if (!NEWS_EVENT_TYPES.includes(event.type)) {
      push('error', 'newsEvents', event.id, event.title || event.id, `事件类型取值无效（${event.type}）`);
    }
    if (!DATE_PATTERN.test(event.date)) {
      push('error', 'newsEvents', event.id, event.title || event.id, '开始日期格式应为 YYYY-MM-DD');
    }
    if (event.endDate !== undefined && event.endDate < event.date) {
      push('error', 'newsEvents', event.id, event.title || event.id, '结束日期早于开始日期');
    }
    if (event.relatedCharacterId !== undefined && !characterIds.has(event.relatedCharacterId)) {
      push('error', 'newsEvents', event.id, event.title || event.id, `关联角色「${event.relatedCharacterId}」不存在（悬挂引用）`);
    }
    if (event.relatedLightConeId !== undefined && !lightConeIds.has(event.relatedLightConeId)) {
      push('error', 'newsEvents', event.id, event.title || event.id, `关联光锥「${event.relatedLightConeId}」不存在（悬挂引用）`);
    }
    if (event.relatedRelicId !== undefined && !relicIds.has(event.relatedRelicId)) {
      push('error', 'newsEvents', event.id, event.title || event.id, `关联遗器「${event.relatedRelicId}」不存在（悬挂引用）`);
    }
  }

  return issues;
}
