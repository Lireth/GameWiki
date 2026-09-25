import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  getBootstrapStatus,
  subscribeBootstrap,
  type BootstrapStatus,
} from '../db/bootstrap';
import type { Character, LightCone, NewsEvent } from '../db/types';

/** 全部角色（实时响应数据库变化） */
export function useCharacters(): Character[] {
  return useLiveQuery(() => db.characters.toArray(), [], []) ?? [];
}

export function useLightCones(): LightCone[] {
  return useLiveQuery(() => db.lightCones.toArray(), [], []) ?? [];
}

export function useNewsEvents(): NewsEvent[] {
  return useLiveQuery(() => db.newsEvents.toArray(), [], []) ?? [];
}

/** 按主键查询单个角色（详情页无需加载整表） */
export function useCharacterById(id: string | undefined): Character | undefined {
  return useLiveQuery(async () => (id ? await db.characters.get(id) : undefined), [id]);
}

/** 按主键查询单个光锥 */
export function useLightConeById(id: string | undefined): LightCone | undefined {
  return useLiveQuery(async () => (id ? await db.lightCones.get(id) : undefined), [id]);
}

/** 表内条目总数（详情页用于区分「暂无数据」与「未找到该条目」） */
export function useCharacterCount(): number {
  return useLiveQuery(() => db.characters.count(), [], 0) ?? 0;
}

export function useLightConeCount(): number {
  return useLiveQuery(() => db.lightCones.count(), [], 0) ?? 0;
}

/** 本地数据库初始化状态（失败时界面显示全局提示） */
export function useBootstrapStatus(): BootstrapStatus {
  return useSyncExternalStore(subscribeBootstrap, getBootstrapStatus);
}

/* ------------------------------------------------------------------ */
/* 分面筛选（角色 / 光锥图鉴列表页共享）                                */
/* ------------------------------------------------------------------ */

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

export interface FacetFilterApi<T, K extends string> {
  /** 搜索关键词（URL 参数 q） */
  q: string;
  setQ: (value: string) => void;
  /** 其它 URL 参数的读写（如 sort），与分面参数共用同一条历史记录 */
  getParam: (key: string) => string | null;
  setParam: (key: string, value: string) => void;
  /** 各分面维度当前选中的值（空字符串 = 未筛选），URL 参数与维度同名 */
  facets: Record<K, string>;
  /** 再次点击已选中的值即取消该维度筛选 */
  toggleFacet: (key: K, value: string) => void;
  clearFilters: () => void;
  /** 某维度某选项的计数（排除该维度自身筛选，随其它维度与搜索词联动） */
  countOf: (key: K, value: string) => number;
  /** 仅按搜索词的命中数（「查看全部」计数） */
  allCount: number;
  /** 命中全部筛选条件的条目（未排序） */
  matched: T[];
  hasAnyFilter: boolean;
}

/**
 * 分面筛选 hook：筛选状态同步到 URL，命中结果与全部分面计数在一次遍历中算出。
 * facetValue 返回空字符串表示该条目无此属性；matchesKeyword 只负责搜索词匹配。
 * 注意 facetValue / matchesKeyword 需传模块级函数以保持引用稳定。
 */
export function useFacetFilter<T, K extends string>(
  items: T[],
  facetKeys: readonly K[],
  facetValue: (item: T, key: K) => string,
  matchesKeyword: (item: T, keyword: string) => boolean,
): FacetFilterApi<T, K> {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const facets = useMemo(() => {
    const record = {} as Record<K, string>;
    for (const key of facetKeys) record[key] = params.get(key) ?? '';
    return record;
  }, [params, facetKeys]);

  const setParam = useCallback(
    (key: string, value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setQ = useCallback((value: string) => setParam('q', value), [setParam]);

  const toggleFacet = useCallback(
    (key: K, value: string) => {
      setParam(key, facets[key] === value ? '' : value);
    },
    [facets, setParam],
  );

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const { facetCounts, allCount, matched } = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const counts = new Map<K, Map<string, number>>();
    for (const key of facetKeys) counts.set(key, new Map());
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
        if (facets[key] && value !== facets[key]) fails++;
      }
      if (fails === 0) {
        // 全部维度通过：计入命中结果，并计入每个维度的所有选项
        matched.push(item);
        for (const key of facetKeys) {
          const bucket = counts.get(key)!;
          bucket.set(values[key], (bucket.get(values[key]) ?? 0) + 1);
        }
        continue;
      }
      if (fails === 1) {
        // 仅一个维度未通过：该条目仍计入其它维度的选项计数（分面联动）
        for (const key of facetKeys) {
          if (!facets[key] || values[key] === facets[key]) continue;
          const bucket = counts.get(key)!;
          bucket.set(values[key], (bucket.get(values[key]) ?? 0) + 1);
        }
      }
    }
    return { facetCounts: counts, allCount, matched };
  }, [items, facetKeys, facets, q, facetValue, matchesKeyword]);

  const countOf = useCallback(
    (key: K, value: string) => facetCounts.get(key)?.get(value) ?? 0,
    [facetCounts],
  );

  const hasAnyFilter = Boolean(q) || facetKeys.some((key) => facets[key]);

  return {
    q,
    setQ,
    getParam: (key) => params.get(key),
    setParam,
    facets,
    toggleFacet,
    clearFilters,
    countOf,
    allCount,
    matched,
    hasAnyFilter,
  };
}
