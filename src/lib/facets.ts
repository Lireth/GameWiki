/**
 * 分面筛选与排序的纯逻辑（角色 / 光锥图鉴列表页共享）。
 * 独立于 React 与路由，便于单元测试；useFacetFilter 是它的 React 封装。
 */

/** 列表页共用的排序选项与 id */
export const SORT_OPTIONS = [
  { value: 'date-desc', label: '实装日期 新→旧' },
  { value: 'date-asc', label: '实装日期 旧→新' },
  { value: 'rarity-desc', label: '稀有度 高→低' },
  { value: 'name', label: '名称排序' },
] as const;

/**
 * 通用排序：date 取 YYYY-MM-DD（可比字符串），rarity / name 按需提供。
 * 未提供日期的条目按空字符串参与比较，与历史行为一致。
 */
export function sortList<T>(
  list: readonly T[],
  sort: string,
  accessors: {
    date: (item: T) => string;
    rarity: (item: T) => number;
    name: (item: T) => string;
  },
): T[] {
  const sorted = [...list];
  switch (sort) {
    case 'date-asc':
      return sorted.sort((a, b) => accessors.date(a).localeCompare(accessors.date(b)));
    case 'rarity-desc':
      return sorted.sort(
        (a, b) =>
          accessors.rarity(b) - accessors.rarity(a) ||
          accessors.date(b).localeCompare(accessors.date(a)),
      );
    case 'name':
      return sorted.sort((a, b) =>
        accessors.name(a).localeCompare(accessors.name(b), 'zh-Hans-CN'),
      );
    case 'date-desc':
    default:
      return sorted.sort((a, b) => accessors.date(b).localeCompare(accessors.date(a)));
  }
}

export interface FacetResult<T, K extends string> {
  /** facetKey → (optionValue → 计数) */
  facetCounts: Map<K, Map<string, number>>;
  /** 仅按搜索词的命中数（「查看全部」计数） */
  allCount: number;
  /** 命中全部筛选条件的条目（未排序） */
  matched: T[];
}

/**
 * 分面计数与命中计算：一次遍历同时算出命中结果、全部分面计数与「查看全部」计数。
 * 每个维度可多选（维度内 OR、维度间 AND）；facetValue 返回条目在该维度上的唯一取值，
 * 空字符串表示无此属性。分面计数的口径是「排除该维度自身、保留其它维度与搜索词」，
 * 保证各选项计数随其它条件联动。
 */
export function computeFacetResult<T, K extends string>(
  items: readonly T[],
  facetKeys: readonly K[],
  facets: Record<K, string[]>,
  q: string,
  facetValue: (item: T, key: K) => string,
  matchesKeyword: (item: T, keyword: string) => boolean,
): FacetResult<T, K> {
  const keyword = q.trim().toLowerCase();
  const facetCounts = new Map<K, Map<string, number>>();
  for (const key of facetKeys) facetCounts.set(key, new Map());
  let allCount = 0;
  const matched: T[] = [];

  for (const item of items) {
    if (keyword && !matchesKeyword(item, keyword)) continue;
    allCount++;

    let fails = 0;
    const values = {} as Record<K, string>;
    for (const key of facetKeys) {
      const value = facetValue(item, key);
      values[key] = value;
      const selected = facets[key];
      if (selected.length > 0 && !selected.includes(value)) fails++;
    }
    if (fails === 0) {
      // 全部维度通过：计入命中结果，并计入每个维度的所有选项
      matched.push(item);
      for (const key of facetKeys) {
        const bucket = facetCounts.get(key)!;
        bucket.set(values[key], (bucket.get(values[key]) ?? 0) + 1);
      }
      continue;
    }
    if (fails === 1) {
      // 仅一个维度未通过：该条目仍计入其它维度的选项计数（分面联动）
      for (const key of facetKeys) {
        const selected = facets[key];
        if (selected.length === 0 || selected.includes(values[key])) continue;
        const bucket = facetCounts.get(key)!;
        bucket.set(values[key], (bucket.get(values[key]) ?? 0) + 1);
      }
    }
  }
  return { facetCounts, allCount, matched };
}
