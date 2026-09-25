import { describe, expect, it } from 'vitest';
import { computeFacetResult, sortList } from './facets';

interface Item {
  id: string;
  name: string;
  rarity: number;
  path: string;
  version: string;
}

const ITEMS: Item[] = [
  { id: 'a', name: 'seele', rarity: 5, path: 'hunt', version: '1.0' },
  { id: 'b', name: 'bronya', rarity: 5, path: 'harmony', version: '1.0' },
  { id: 'c', name: 'dan-heng', rarity: 4, path: 'hunt', version: '1.1' },
  { id: 'd', name: 'natasha', rarity: 4, path: 'abundance', version: '1.0' },
];

const KEYS = ['rarity', 'path', 'version'] as const;
type Key = (typeof KEYS)[number];

const facetValue = (item: Item, key: Key) => String(item[key]);
const matchesKeyword = (item: Item, keyword: string) =>
  item.name.toLowerCase().includes(keyword);
const empty = { rarity: [], path: [], version: [] } as Record<Key, string[]>;

const count = (
  result: ReturnType<typeof computeFacetResult<Item, Key>>,
  key: Key,
  value: string,
) => result.facetCounts.get(key)?.get(value) ?? 0;

describe('computeFacetResult（无筛选）', () => {
  it('全部命中，各维度计数等于取值总数', () => {
    const result = computeFacetResult(ITEMS, KEYS, empty, '', facetValue, matchesKeyword);
    expect(result.allCount).toBe(4);
    expect(result.matched.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(count(result, 'rarity', '5')).toBe(2);
    expect(count(result, 'rarity', '4')).toBe(2);
    expect(count(result, 'path', 'hunt')).toBe(2);
    expect(count(result, 'version', '1.0')).toBe(3);
  });
});

describe('computeFacetResult（关键词）', () => {
  it('allCount 与命中结果、分面计数都只含关键词命中项', () => {
    const result = computeFacetResult(ITEMS, KEYS, empty, 'seele', facetValue, matchesKeyword);
    expect(result.allCount).toBe(1);
    expect(result.matched.map((i) => i.id)).toEqual(['a']);
    expect(count(result, 'rarity', '5')).toBe(1);
    expect(count(result, 'rarity', '4')).toBe(0);
    expect(count(result, 'path', 'hunt')).toBe(1);
    expect(count(result, 'path', 'harmony')).toBe(0);
  });
});

describe('computeFacetResult（单选分面）', () => {
  it('命中本维度；其它维度计数排除未通过项；本维度计数保留未通过项的取值（分面联动）', () => {
    const result = computeFacetResult(
      ITEMS,
      KEYS,
      { ...empty, rarity: ['5'] },
      '',
      facetValue,
      matchesKeyword,
    );
    expect(result.matched.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.allCount).toBe(4); // allCount 只看关键词

    // path / version 计数：只统计稀有度通过的 a、b
    expect(count(result, 'path', 'hunt')).toBe(1);
    expect(count(result, 'path', 'harmony')).toBe(1);
    expect(count(result, 'path', 'abundance')).toBe(0);
    expect(count(result, 'version', '1.1')).toBe(0);

    // rarity 自身维度计数：4★ 选项仍显示（排除本维度口径）
    expect(count(result, 'rarity', '5')).toBe(2);
    expect(count(result, 'rarity', '4')).toBe(2);
  });
});

describe('computeFacetResult（多选分面）', () => {
  it('维度内多选为 OR：命中任一选中值', () => {
    const result = computeFacetResult(
      ITEMS,
      KEYS,
      { ...empty, path: ['hunt', 'harmony'] },
      '',
      facetValue,
      matchesKeyword,
    );
    expect(result.matched.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    // d 因 path 未通过，仅在 path 维度计入自己的取值
    expect(count(result, 'path', 'abundance')).toBe(1);
    expect(count(result, 'rarity', '4')).toBe(1);
  });

  it('维度间为 AND：需同时满足所有已选维度', () => {
    const result = computeFacetResult(
      ITEMS,
      KEYS,
      { ...empty, rarity: ['5'], path: ['harmony'] },
      '',
      facetValue,
      matchesKeyword,
    );
    expect(result.matched.map((i) => i.id)).toEqual(['b']);
    expect(count(result, 'version', '1.0')).toBe(1);
    expect(count(result, 'version', '1.1')).toBe(0);
  });
});

describe('computeFacetResult（空字符串取值）', () => {
  it('无此属性的条目计入空选项', () => {
    const items = [
      { id: 'x', version: '' },
      { id: 'y', version: '1.0' },
    ];
    const result = computeFacetResult(
      items,
      ['version'],
      { version: [] },
      '',
      (item, key) => item[key],
      () => true,
    );
    expect(result.facetCounts.get('version')?.get('')).toBe(1);
    expect(result.facetCounts.get('version')?.get('1.0')).toBe(1);
  });
});

describe('sortList', () => {
  const items = [
    { id: '1', date: '1.2', rarity: 4, name: 'bob' },
    { id: '2', date: '1.1', rarity: 5, name: 'alice' },
    { id: '3', date: '1.3', rarity: 5, name: 'carol' },
  ];
  const accessors = {
    date: (i: (typeof items)[number]) => i.date,
    rarity: (i: (typeof items)[number]) => i.rarity,
    name: (i: (typeof items)[number]) => i.name,
  };
  const ids = (list: typeof items) => list.map((i) => i.id);

  it('date-desc / date-asc 按日期字符串比较', () => {
    expect(ids(sortList(items, 'date-desc', accessors))).toEqual(['3', '1', '2']);
    expect(ids(sortList(items, 'date-asc', accessors))).toEqual(['2', '1', '3']);
  });

  it('rarity-desc 同稀有度按日期从新到旧', () => {
    expect(ids(sortList(items, 'rarity-desc', accessors))).toEqual(['3', '2', '1']);
  });

  it('name 按名称升序', () => {
    expect(ids(sortList(items, 'name', accessors))).toEqual(['2', '1', '3']);
  });

  it('未知排序值回退到 date-desc，且不修改原数组', () => {
    const source = [...items];
    expect(ids(sortList(items, 'unknown', accessors))).toEqual(['3', '1', '2']);
    expect(items).toEqual(source);
  });
});
