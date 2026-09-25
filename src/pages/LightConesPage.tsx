import { Fragment, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LightConeCard } from '../components/cards/LightConeCard';
import { SearchIcon, StarIcon } from '../components/icons';
import {
  FacetChip,
  FilterRow,
  FilterRowLines,
} from '../components/ui/FilterPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { LightCone } from '../db/types';
import { LIGHT_CONE_RARITIES } from '../db/types';
import { useLightCones } from '../hooks/useWikiData';
import {
  ACQUISITION_LABEL,
  PATH_META,
  RARITY_META,
  VERSION_GROUPS,
} from '../lib/meta';

const SORT_OPTIONS = [
  { value: 'date-desc', label: '实装日期 新→旧' },
  { value: 'date-asc', label: '实装日期 旧→新' },
  { value: 'rarity-desc', label: '稀有度 高→低' },
  { value: 'name', label: '名称排序' },
] as const;

const sortSelectClass =
  'border border-space-600/60 bg-space-850/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-gold-500/60 focus:outline-none';

type FacetKey = 'rarity' | 'path' | 'acquisition' | 'version';

const FACET_KEYS: FacetKey[] = ['rarity', 'path', 'acquisition', 'version'];

interface FilterState extends Record<FacetKey, string> {
  q: string;
}

const EMPTY_FACETS: Record<FacetKey, string> = {
  rarity: '',
  path: '',
  acquisition: '',
  version: '',
};

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

/**
 * 判断光锥是否命中筛选条件。
 * exclude 用于分面计数：统计某维度的选项数量时，忽略该维度自身的筛选，
 * 但保留其它维度与搜索词，保证各选项计数随其它条件联动。
 */
function matchesFilters(
  lightCone: LightCone,
  filters: FilterState,
  exclude?: FacetKey,
): boolean {
  const keyword = filters.q.trim().toLowerCase();
  if (keyword && !lightCone.name.toLowerCase().includes(keyword)) {
    return false;
  }
  for (const key of FACET_KEYS) {
    if (key === exclude) continue;
    const value = filters[key];
    if (value && facetValue(lightCone, key) !== value) return false;
  }
  return true;
}

function sortLightCones(list: LightCone[], sort: string): LightCone[] {
  const sorted = [...list];
  switch (sort) {
    case 'date-asc':
      return sorted.sort((a, b) =>
        (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''),
      );
    case 'rarity-desc':
      return sorted.sort(
        (a, b) =>
          b.rarity - a.rarity ||
          (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''),
      );
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    case 'date-desc':
    default:
      return sorted.sort((a, b) =>
        (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''),
      );
  }
}

export function LightConesPage() {
  const lightCones = useLightCones();
  const [params, setParams] = useSearchParams();

  const filters: FilterState = {
    q: params.get('q') ?? '',
    rarity: params.get('rarity') ?? '',
    path: params.get('path') ?? '',
    acquisition: params.get('acquisition') ?? '',
    version: params.get('version') ?? '',
  };
  const sort = params.get('sort') ?? 'date-desc';

  const setParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  /** 再次点击已选中的标签即取消该维度筛选 */
  const toggleFacet = (key: FacetKey, value: string) => {
    setParam(key, filters[key] === value ? '' : value);
  };

  const clearFilters = () => setParams({}, { replace: true });

  const facetCount = (key: FacetKey, value: string) =>
    lightCones.filter(
      (lc) => matchesFilters(lc, filters, key) && facetValue(lc, key) === value,
    ).length;

  const allCount = lightCones.filter((lc) =>
    matchesFilters(lc, { ...filters, ...EMPTY_FACETS }),
  ).length;

  /** 实装版本分组：以常显配置为基础，数据中的新版本追加到对应大版本（或新建分组） */
  const versionGroups = useMemo(() => {
    const known = new Set(VERSION_GROUPS.flatMap((group) => group.values));
    const groups = VERSION_GROUPS.map((group) => ({
      major: group.major,
      values: [...group.values],
    }));
    const dataVersions = [
      ...new Set(
        lightCones
          .map((lc) => lc.releaseVersion)
          .filter((v): v is string => Boolean(v)),
      ),
    ];
    for (const value of dataVersions) {
      if (known.has(value)) continue;
      const major = value.split('.')[0];
      let group = groups.find((g) => g.major === major);
      if (!group) {
        group = { major, values: [] };
        groups.push(group);
      }
      if (!group.values.includes(value)) group.values.push(value);
      group.values.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
    }
    return groups;
  }, [lightCones]);

  const filtered = useMemo(() => {
    const matched = lightCones.filter((lc) => matchesFilters(lc, filters));
    return sortLightCones(matched, sort);
    // filters 每次渲染都是新对象，这里只能展开字段作为依赖
  }, [
    lightCones,
    filters.q,
    filters.rarity,
    filters.path,
    filters.acquisition,
    filters.version,
    sort,
  ]);

  const hasAnyFilter =
    Boolean(filters.q) || FACET_KEYS.some((key) => filters[key]);

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
              value={filters.q}
              onChange={(e) => setParam('q', e.target.value)}
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
                  active={filters.rarity === String(r)}
                  count={facetCount('rarity', String(r))}
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
                  active={filters.path === value}
                  count={facetCount('path', value)}
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
                  active={filters.acquisition === value}
                  count={facetCount('acquisition', value)}
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
                      active={filters.version === value}
                      count={facetCount('version', value)}
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
