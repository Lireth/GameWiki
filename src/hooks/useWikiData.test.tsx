/**
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { db } from '../db/db';
import { loadFavorites } from '../lib/favorites';
import {
  FAVORITE_PREFIX,
  getFavorites,
  toggleFavorite,
  useDebouncedSearch,
  useFacetFilter,
  useFavoriteFilter,
  useFavorites,
} from './useWikiData';

interface Item {
  id: string;
  rarity: number;
  name: string;
}

const ITEMS: Item[] = [
  { id: 'a', rarity: 5, name: '甲' },
  { id: 'b', rarity: 4, name: '乙' },
  { id: 'c', rarity: 5, name: '丙' },
];

const FACET_KEYS = ['rarity'] as const;
const facetValue = (item: Item, _key: 'rarity') => String(item.rarity);
const matchesKeyword = (item: Item, keyword: string) =>
  item.name.includes(keyword);

function routerWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

beforeEach(async () => {
  window.localStorage.clear();
  await db.delete();
  // delete 后 Dexie 不会自动重开，显式恢复连接
  await db.open();
});

afterEach(cleanup);

describe('useFacetFilter（URL 同步的分面筛选）', () => {
  it('初始状态全部命中，分面计数正确', () => {
    const { result } = renderHook(
      () => useFacetFilter(ITEMS, FACET_KEYS, facetValue, matchesKeyword),
      { wrapper: routerWrapper },
    );
    expect(result.current.matched).toHaveLength(3);
    expect(result.current.allCount).toBe(3);
    expect(result.current.countOf('rarity', '5')).toBe(2);
    expect(result.current.countOf('rarity', '4')).toBe(1);
  });

  it('toggleFacet 更新命中结果并同步 URL 参数', () => {
    const { result } = renderHook(
      () => useFacetFilter(ITEMS, FACET_KEYS, facetValue, matchesKeyword),
      { wrapper: routerWrapper },
    );
    act(() => result.current.toggleFacet('rarity', '5'));
    expect(result.current.matched.map((item) => item.id)).toEqual(['a', 'c']);
    expect(result.current.facets.rarity).toEqual(['5']);
  });

  it('搜索词过滤命中数与「查看全部」计数', () => {
    const { result } = renderHook(
      () => useFacetFilter(ITEMS, FACET_KEYS, facetValue, matchesKeyword),
      { wrapper: routerWrapper },
    );
    act(() => result.current.setQ('甲'));
    expect(result.current.allCount).toBe(1);
    expect(result.current.matched.map((item) => item.id)).toEqual(['a']);
  });
});

describe('useDebouncedSearch（输入防抖）', () => {
  it('输入即时回显，URL 同步延迟触发', () => {
    vi.useFakeTimers();
    try {
      const setQ = vi.fn();
      const { result } = renderHook(() => useDebouncedSearch('', setQ, 250));
      act(() => result.current.onChange('希'));
      expect(result.current.text).toBe('希');
      expect(setQ).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(250));
      expect(setQ).toHaveBeenCalledWith('希');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useFavoriteFilter（只看收藏前置过滤）', () => {
  it('favOnly 过滤可见集合，favCount 随收藏联动', () => {
    act(() => toggleFavorite(`${FAVORITE_PREFIX.character}a`));
    const { result } = renderHook(
      () => useFavoriteFilter(ITEMS, FAVORITE_PREFIX.character),
      { wrapper: routerWrapper },
    );
    expect(result.current.favOnly).toBe(false);
    expect(result.current.favCount).toBe(1);
    expect(result.current.visibleItems).toHaveLength(3);

    act(() => result.current.toggleFavOnly());
    expect(result.current.favOnly).toBe(true);
    expect(result.current.visibleItems.map((item) => item.id)).toEqual(['a']);
  });
});

describe('收藏存储（IndexedDB + 旧 localStorage 迁移）', () => {
  it('迁移旧 localStorage 收藏到数据库并清理旧键', async () => {
    window.localStorage.setItem(
      'hsr-wiki-favorites',
      JSON.stringify(['c:seele', 'lc:night']),
    );
    await loadFavorites();

    expect(getFavorites().has('c:seele')).toBe(true);
    expect(getFavorites().has('lc:night')).toBe(true);
    expect(window.localStorage.getItem('hsr-wiki-favorites')).toBeNull();

    const row = await db.meta.get('favorites');
    expect(row).toBeTruthy();
    const stored: unknown = JSON.parse(row!.value);
    expect(stored).toContain('c:seele');
    expect(stored).toContain('lc:night');
  });

  it('toggleFavorite 更新订阅者并持久化到数据库', async () => {
    const { result } = renderHook(() => useFavorites());
    act(() => toggleFavorite('c:a'));
    expect(result.current.has('c:a')).toBe(true);

    await vi.waitFor(async () => {
      const row = await db.meta.get('favorites');
      const stored: unknown = JSON.parse(row!.value);
      expect(stored).toContain('c:a');
    });

    act(() => toggleFavorite('c:a'));
    expect(result.current.has('c:a')).toBe(false);
  });
});
