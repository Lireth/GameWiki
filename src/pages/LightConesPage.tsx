import { Fragment, useMemo } from 'react';
import { LightConeCard } from '../components/cards/LightConeCard';
import { SearchIcon, StarIcon } from '../components/icons';
import {
  CopyLinkButton,
  FacetChip,
  FilterRow,
  FilterRowLines,
  sortSelectClass,
} from '../components/ui/FilterPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { LightCone } from '../db/types';
import { LIGHT_CONE_RARITIES } from '../db/types';
import {
  SORT_OPTIONS,
  sortList,
  useDebouncedSearch,
  useFacetFilter,
  useLightCones,
} from '../hooks/useWikiData';
import {
  ACQUISITION_LABEL,
  buildVersionGroups,
  PATH_META,
  RARITY_META,
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
  return lightCone.name.toLowerCase().includes(keyword);
}

const SORT_ACCESSORS = {
  date: (lc: LightCone) => lc.releaseDate ?? '',
  rarity: (lc: LightCone) => lc.rarity,
  name: (lc: LightCone) => lc.name,
};

export function LightConesPage() {
  const lightCones = useLightCones();
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
  } = useFacetFilter(lightCones, FACET_KEYS, facetValue, matchesKeyword);
  const { text: searchText, onChange: onSearchChange } = useDebouncedSearch(q, setQ);
  const sort = getParam('sort') ?? 'date-desc';

  const filtered = useMemo(
    () => sortList(matched, sort, SORT_ACCESSORS),
    [matched, sort],
  );

  /** 实装版本分组：以常显配置为基础，数据中的新版本追加到对应大版本（或新建分组） */
  const versionGroups = useMemo(
    () => buildVersionGroups(lightCones.map((lc) => lc.releaseVersion)),
    [lightCones],
  );

  return (
    <div>
      <PageHeader
        en="Light Cones"
        title="光锥图鉴"
        description="按名称、稀有度、命途、获取方式与实装版本搜索和筛选光锥。"
      >
        <div className="mt-6 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索光锥名称…"
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
            </FilterRow>

            <FilterRow label="稀有度">
              {LIGHT_CONE_RARITIES.map((r) => (
                <FacetChip
                  key={r}
                  active={facets.rarity.includes(String(r))}
                  count={countOf('rarity', String(r))}
                  color={RARITY_META[r].color}
                  ariaLabel={`${r}星`}
                  onClick={() => toggleFacet('rarity', String(r))}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: r }).map((_, i) => (
                      <StarIcon key={i} className="size-3" />
                    ))}
                  </span>
                </FacetChip>
              ))}
            </FilterRow>

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

            {/* 实装版本：按大版本号分行，常显 */}
            <FilterRowLines
              label="实装版本"
              lines={versionGroups.map((group) => (
                <Fragment key={group.major}>
                  {group.values.map((value) => (
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
              ))}
            />
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              共{' '}
              <span className="font-display text-sm text-gold-300">
                {filtered.length}
              </span>{' '}
              件光锥
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

      {lightCones.length === 0 ? (
        <EmptyState
          title="暂无光锥数据"
          hint="光锥数据尚未收录，可在 src/data/seed.ts 中录入，页面会自动展示。"
        />
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
