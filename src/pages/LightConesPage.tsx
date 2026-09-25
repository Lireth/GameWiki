import { useMemo } from 'react';
import { LightConeCard } from '../components/cards/LightConeCard';
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
import type { LightCone } from '../db/types';
import { LIGHT_CONE_RARITIES } from '../db/types';
import {
  FAVORITE_PREFIX,
  sortList,
  useBootstrapStatus,
  useFacetFilter,
  useFavoriteFilter,
  useLightCones,
} from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  ACQUISITION_LABEL,
  buildVersionGroups,
  PATH_META,
} from '../lib/meta';

type FacetKey = 'rarity' | 'path' | 'acquisition' | 'version';

const FACET_KEYS: FacetKey[] = ['rarity', 'path', 'acquisition', 'version'];

function facetValue(lightCone: LightCone, key: FacetKey): string {
  switch (key) {
    case 'rarity':
      return String(lightCone.rarity);
    case 'version':
      return lightCone.releaseVersion ?? '';
    case 'acquisition':
      return lightCone.acquisition ?? '';
    default:
      return lightCone[key];
  }
}

function matchesKeyword(lightCone: LightCone, keyword: string): boolean {
  return [lightCone.name, ...(lightCone.aliases ?? [])].some((text) =>
    text.toLowerCase().includes(keyword),
  );
}

const SORT_ACCESSORS = {
  date: (lc: LightCone) => lc.releaseDate ?? '',
  rarity: (lc: LightCone) => lc.rarity,
  name: (lc: LightCone) => lc.name,
};

export function LightConesPage() {
  useDocumentTitle('光锥图鉴');
  const lightCones = useLightCones();
  const dataReady = useBootstrapStatus() === 'ok';
  const { favOnly, favCount, visibleItems, toggleFavOnly } =
    useFavoriteFilter(lightCones, FAVORITE_PREFIX.lightCone);
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
    () => buildVersionGroups(lightCones.map((lc) => lc.releaseVersion), facets.version),
    [lightCones, facets.version],
  );

  return (
    <div>
      <PageHeader
        en="Light Cones"
        title="光锥图鉴"
        description="按名称、稀有度、命途、获取方式与实装版本搜索和筛选光锥。"
      >
        <div className="mt-6 space-y-3">
          <ListSearchBox q={q} setQ={setQ} placeholder="搜索光锥名称…" />

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

            <RarityFacetRow
              rarities={LIGHT_CONE_RARITIES}
              selected={facets.rarity}
              countOf={(value) => countOf('rarity', value)}
              onToggle={(value) => toggleFacet('rarity', value)}
            />

            <FilterRow label="命途">
              {Object.entries(PATH_META).map(([value, meta]) => (
                <FacetChip
                  key={value}
                  active={facets.path.includes(value)}
                  count={countOf('path', value)}
                  color={meta.color}
                  onClick={() => toggleFacet('path', value)}
                >
                  <i aria-hidden className="size-1.5 rotate-45 bg-current" />
                  {meta.label}
                </FacetChip>
              ))}
            </FilterRow>

            <FilterRow label="获取方式">
              {Object.entries(ACQUISITION_LABEL).map(([value, label]) => (
                <FacetChip
                  key={value}
                  active={facets.acquisition.includes(value)}
                  count={countOf('acquisition', value)}
                  onClick={() => toggleFacet('acquisition', value)}
                >
                  {label}
                </FacetChip>
              ))}
            </FilterRow>

            <VersionFacetRow
              groups={versionGroups}
              selected={facets.version}
              countOf={(value) => countOf('version', value)}
              onToggle={(value) => toggleFacet('version', value)}
            />
          </Panel>

          <ListToolbar
            count={filtered.length}
            unit="件光锥"
            sort={sort}
            onSortChange={(value) => setParam('sort', value)}
          />
        </div>
      </PageHeader>

      {lightCones.length === 0 ? (
        dataReady ? (
          <EmptyState
            title="暂无光锥数据"
            hint="可通过页脚「数据管理」录入，或导入备份数据，页面会自动展示。"
          />
        ) : (
          <LoadingState />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有符合条件的光锥"
          hint="试试调整搜索关键词或筛选条件。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((lightCone) => (
            <LightConeCard key={lightCone.id} lightCone={lightCone} />
          ))}
        </div>
      )}
    </div>
  );
}
