import { Fragment, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RelicCard } from '../components/cards/RelicCard';
import { SearchIcon } from '../components/icons';
import {
  CopyLinkButton,
  FacetChip,
  FilterRow,
  sortSelectClass,
} from '../components/ui/FilterPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { RelicSet } from '../db/types';
import { RELIC_RARITIES } from '../db/types';
import {
  FAVORITE_PREFIX,
  SORT_OPTIONS,
  sortList,
  useDebouncedSearch,
  useFacetFilter,
  useFavorites,
  useRelics,
} from '../hooks/useWikiData';
import {
  buildVersionGroups,
  RARITY_META,
  RELIC_CATEGORY_META,
} from '../lib/meta';

type FacetKey = 'category' | 'rarity' | 'version';

const FACET_KEYS: FacetKey[] = ['category', 'rarity', 'version'];

function facetValue(relic: RelicSet, key: FacetKey): string {
  switch (key) {
    case 'rarity':
      return String(relic.rarity);
    case 'version':
      return relic.releaseVersion ?? '';
    default:
      return relic[key];
  }
}

function matchesKeyword(relic: RelicSet, keyword: string): boolean {
  return relic.name.toLowerCase().includes(keyword);
}

const SORT_ACCESSORS = {
  date: (r: RelicSet) => r.releaseDate ?? '',
  rarity: (r: RelicSet) => r.rarity,
  name: (r: RelicSet) => r.name,
};

export function RelicsPage() {
  const relics = useRelics();
  const favorites = useFavorites();
  const [searchParams] = useSearchParams();
  /** 「只看收藏」：URL 参数 fav=1，作为前置过滤接入分面筛选（计数随其联动） */
  const favOnly = searchParams.get('fav') === '1';
  const favoriteItems = useMemo(
    () =>
      new Set(
        [...favorites]
          .filter((key) => key.startsWith(FAVORITE_PREFIX.relic))
          .map((key) => key.slice(FAVORITE_PREFIX.relic.length)),
      ),
    [favorites],
  );
  const favCount = useMemo(
    () => relics.filter((r) => favoriteItems.has(r.id)).length,
    [relics, favoriteItems],
  );
  const visibleItems = useMemo(
    () => (favOnly ? relics.filter((r) => favoriteItems.has(r.id)) : relics),
    [relics, favOnly, favoriteItems],
  );
  const {
    q,
    setQ,
    getParam,
    setParam,
    facets,
    toggleFacet,
    clearFilters,
    countOf,
    allCount,
    matched,
    hasAnyFilter,
  } = useFacetFilter(visibleItems, FACET_KEYS, facetValue, matchesKeyword);
  const { text: searchText, onChange: onSearchChange } = useDebouncedSearch(q, setQ);
  const sort = getParam('sort') ?? 'date-desc';

  const filtered = useMemo(
    () => sortList(matched, sort, SORT_ACCESSORS),
    [matched, sort],
  );

  /** 实装版本分组：常显配置 + 数据中的新版本 + URL 残留的已选版本（计数 0 仍可解除） */
  const versionGroups = useMemo(
    () => buildVersionGroups(relics.map((r) => r.releaseVersion), facets.version),
    [relics, facets.version],
  );

  return (
    <div>
      <PageHeader
        en="Relics"
        title="遗器图鉴"
        description="按名称、类别、稀有度与实装版本搜索和筛选遗器套装，查看部件与套装效果。"
      >
        <div className="mt-6 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索遗器套装名称…"
              className="w-full border border-space-600/60 bg-space-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
            />
          </div>

          {/* 分面筛选面板 */}
          <Panel className="p-0">
            <FilterRow label="查看全部">
              <FacetChip
                active={!hasAnyFilter}
                count={allCount}
                onClick={clearFilters}
              >
                查看全部
              </FacetChip>
              <FacetChip
                active={favOnly}
                count={favCount}
                onClick={() => setParam('fav', favOnly ? '' : '1')}
              >
                只看收藏
              </FacetChip>
            </FilterRow>

            <FilterRow label="类别">
              {Object.entries(RELIC_CATEGORY_META).map(([value, meta]) => (
                <FacetChip
                  key={value}
                  active={facets.category.includes(value)}
                  count={countOf('category', value)}
                  color={meta.color}
                  onClick={() => toggleFacet('category', value)}
                >
                  <i aria-hidden className="size-1.5 rotate-45 bg-current" />
                  {meta.label}
                </FacetChip>
              ))}
            </FilterRow>

            <FilterRow label="稀有度">
              {RELIC_RARITIES.map((r) => (
                <FacetChip
                  key={r}
                  active={facets.rarity.includes(String(r))}
                  count={countOf('rarity', String(r))}
                  color={RARITY_META[r].color}
                  ariaLabel={`${r}星`}
                  onClick={() => toggleFacet('rarity', String(r))}
                >
                  {r}★
                </FacetChip>
              ))}
            </FilterRow>

            {/* 实装版本：按大版本号分行，常显 */}
            <FilterRow label="实装版本">
              <Fragment>
                {versionGroups
                  .flatMap((group) => group.values)
                  .map((value) => (
                    <FacetChip
                      key={value}
                      active={facets.version.includes(value)}
                      count={countOf('version', value)}
                      onClick={() => toggleFacet('version', value)}
                    >
                      <span className="font-display">{value}</span>
                    </FacetChip>
                  ))}
              </Fragment>
            </FilterRow>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              共{' '}
              <span className="font-display text-sm text-gold-300">
                {filtered.length}
              </span>{' '}
              套遗器
            </p>
            <div className="flex items-center gap-3">
              <CopyLinkButton />
              <label className="flex items-center gap-2">
                <span>排序</span>
                <select
                  aria-label="排序"
                  value={sort}
                  onChange={(e) => setParam('sort', e.target.value)}
                  className={sortSelectClass}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </PageHeader>

      {relics.length === 0 ? (
        <EmptyState
          title="暂无遗器数据"
          hint="遗器数据尚未收录，可在 src/data/seed.ts 中录入，页面会自动展示。"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有符合条件的遗器"
          hint="试试调整搜索关键词或筛选条件。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((relic) => (
            <RelicCard key={relic.id} relic={relic} />
          ))}
        </div>
      )}
    </div>
  );
}
