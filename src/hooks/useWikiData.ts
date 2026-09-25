import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { computeFacetResult } from '../lib/facets';
import {
  getBootstrapStatus,
  subscribeBootstrap,
  type BootstrapStatus,
} from '../db/bootstrap';
import {
  getFavorites,
  subscribeFavorites,
} from '../lib/favorites';
import type {
  Character,
  LightCone,
  NewsEvent,
  RelicSet,
} from '../db/types';

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

/** 全部遗器套装（实时响应数据库变化） */
export function useRelics(): RelicSet[] {
  return useLiveQuery(() => db.relics.toArray(), [], []) ?? [];
}

/** 按主键查询单个遗器套装 */
export function useRelicById(id: string | undefined): RelicSet | undefined {
  return useLiveQuery(async () => (id ? await db.relics.get(id) : undefined), [id]);
}

/** 遗器表内条目总数 */
export function useRelicCount(): number {
  return useLiveQuery(() => db.relics.count(), [], 0) ?? 0;
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
/* 搜索输入防抖                                                        */
/* ------------------------------------------------------------------ */

/**
 * 搜索输入防抖：输入即时回显到输入框，URL 参数延迟同步（默认 250ms）。
 * 外部 q 变化（清空筛选、浏览器后退）时立即同步回输入框。
 */
export function useDebouncedSearch(
  q: string,
  setQ: (value: string) => void,
  delay = 250,
) {
  const [text, setText] = useState(q);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setText(q);
  }, [q]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = useCallback(
    (value: string) => {
      setText(value);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setQ(value), delay);
    },
    [setQ, delay],
  );

  return { text, onChange };
}

/* ------------------------------------------------------------------ */
/* 收藏 / 心愿单（IndexedDB meta 表，随导出备份保留）                    */
/* ------------------------------------------------------------------ */

// 存储与迁移逻辑见 lib/favorites.ts，这里保持原导出位置兼容
export {
  FAVORITE_PREFIX,
  getFavorites,
  toggleFavorite,
} from '../lib/favorites';

/** 收藏集合（实时响应变更） */
export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeFavorites, getFavorites);
}


/* ------------------------------------------------------------------ */
/* 分面筛选（角色 / 光锥图鉴列表页共享）                                */
/* ------------------------------------------------------------------ */

// 排序选项与分面计数的纯逻辑实现见 lib/facets.ts，这里保持原导出位置兼容
export { SORT_OPTIONS, sortList } from '../lib/facets';

/** 「只看收藏」前置过滤的返回值 */
export interface FavoriteFilterApi<T> {
  /** URL 参数 fav=1 是否生效 */
  favOnly: boolean;
  /** 当前表内已收藏条目数 */
  favCount: number;
  /** favOnly 生效时仅保留已收藏条目，否则原样返回 */
  visibleItems: T[];
  toggleFavOnly: () => void;
}

/**
 * 「只看收藏」：URL 参数 fav=1 作为前置过滤接入分面筛选（计数随其联动）。
 * items 条目需带唯一 id；prefix 见 FAVORITE_PREFIX。
 */
export function useFavoriteFilter<T extends { id: string }>(
  items: T[],
  prefix: string,
): FavoriteFilterApi<T> {
  const favorites = useFavorites();
  const [params, setParams] = useSearchParams();

  const favOnly = params.get('fav') === '1';
  const favoriteIds = useMemo(
    () =>
      new Set(
        [...favorites]
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length)),
      ),
    [favorites, prefix],
  );
  const favCount = useMemo(
    () => items.filter((item) => favoriteIds.has(item.id)).length,
    [items, favoriteIds],
  );
  const visibleItems = useMemo(
    () => (favOnly ? items.filter((item) => favoriteIds.has(item.id)) : items),
    [items, favOnly, favoriteIds],
  );
  const toggleFavOnly = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (favOnly) next.delete('fav');
        else next.set('fav', '1');
        return next;
      },
      { replace: true },
    );
  }, [favOnly, setParams]);

  return { favOnly, favCount, visibleItems, toggleFavOnly };
}

export interface FacetFilterApi<T, K extends string> {
  /** 搜索关键词（URL 参数 q） */
  q: string;
  setQ: (value: string) => void;
  /** 其它 URL 参数的读写（如 sort），与分面参数共用同一条历史记录 */
  getParam: (key: string) => string | null;
  setParam: (key: string, value: string) => void;
  /** 各分面维度当前选中的值列表（空数组 = 未筛选；URL 参数为逗号分隔值） */
  facets: Record<K, string[]>;
  /** 点击未选中的值加入该维度，再次点击移除（维度内多选 OR，维度间 AND） */
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
 * 每个维度可多选（维度内 OR、维度间 AND）；facetValue 返回条目在该维度上的唯一取值，
 * 空字符串表示无此属性。matchesKeyword 只负责搜索词匹配。
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
    const record = {} as Record<K, string[]>;
    for (const key of facetKeys) {
      record[key] = (params.get(key) ?? '').split(',').filter(Boolean);
    }
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
      const current = facets[key];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      setParam(key, next.join(','));
    },
    [facets, setParam],
  );

  const clearFilters = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const { facetCounts, allCount, matched } = useMemo(
    () =>
      computeFacetResult(items, facetKeys, facets, q, facetValue, matchesKeyword),
    [items, facetKeys, facets, q, facetValue, matchesKeyword],
  );

  const countOf = useCallback(
    (key: K, value: string) => facetCounts.get(key)?.get(value) ?? 0,
    [facetCounts],
  );

  const hasAnyFilter = Boolean(q) || facetKeys.some((key) => facets[key].length > 0);

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
