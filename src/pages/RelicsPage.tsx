import { useMemo } from 'react';
import { RelicCard } from '../components/cards/RelicCard';
import {
  FacetChip,
  FilterRow,
  ListSearchBox,
  ListToolbar,
  RarityFacetRow,
  VersionFacetRow,
  ViewAllRow,
} from '../components/ui/FilterPanel';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { RelicSet } from '../db/types';
import { RELIC_RARITIES } from '../db/types';
import {
  FAVORITE_PREFIX,
  sortList,
  useBootstrapStatus,
  useFacetFilter,
  useFavoriteFilter,
  useRelics,
} from '../hooks/useWikiData';
import { buildVersionGroups, RELIC_CATEGORY_META } from '../lib/meta';

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
  const dataReady = useBootstrapStatus() === 'ok';
  const { favOnly, favCount, visibleItems, toggleFavOnly } =
    useFavoriteFilter(relics, FAVORITE_PREFIX.relic);
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
          <ListSearchBox q={q} setQ={setQ} placeholder="搜索遗器套装名称…" />

          {/* 分面筛选面板 */}
          <Panel className="p-0">
            <ViewAllRow
              allCount={allCount}
              hasAnyFilter={hasAnyFilter}
              clearFilters={clearFilters}
              favOnly={favOnly}
              favCount={favCount}
              onToggleFav={toggleFavOnly}
            />

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

            <RarityFacetRow
              rarities={RELIC_RARITIES}
              selected={facets.rarity}
              countOf={(value) => countOf('rarity', value)}
              onToggle={(value) => toggleFacet('rarity', value)}
              display="text"
            />

            <VersionFacetRow
              groups={versionGroups}
              selected={facets.version}
              countOf={(value) => countOf('version', value)}
              onToggle={(value) => toggleFacet('version', value)}
            />
          </Panel>

          <ListToolbar
            count={filtered.length}
            unit="套遗器"
            sort={sort}
            onSortChange={(value) => setParam('sort', value)}
          />
        </div>
      </PageHeader>

      {relics.length === 0 ? (
        dataReady ? (
          <EmptyState
            title="暂无遗器数据"
            hint="可通过页脚「数据管理」录入，或导入备份数据，页面会自动展示。"
          />
        ) : (
          <LoadingState />
        )
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
