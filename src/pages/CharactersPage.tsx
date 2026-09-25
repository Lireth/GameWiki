import { Fragment, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CharacterCard } from '../components/cards/CharacterCard';
import { SearchIcon, StarIcon } from '../components/icons';
import {
  FacetChip,
  FilterRow,
  FilterRowLines,
} from '../components/ui/FilterPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character } from '../db/types';
import { useCharacters } from '../hooks/useWikiData';
import {
  BODY_TYPE_GROUPS,
  BODY_TYPE_LABEL,
  ELEMENT_META,
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

type FacetKey = 'rarity' | 'path' | 'element' | 'bodyType' | 'version';

const FACET_KEYS: FacetKey[] = [
  'rarity',
  'path',
  'element',
  'bodyType',
  'version',
];

interface FilterState extends Record<FacetKey, string> {
  q: string;
}

const EMPTY_FACETS: Record<FacetKey, string> = {
  rarity: '',
  path: '',
  element: '',
  bodyType: '',
  version: '',
};

function facetValue(character: Character, key: FacetKey): string {
  switch (key) {
    case 'rarity':
      return String(character.rarity);
    case 'version':
      return character.releaseVersion;
    case 'bodyType':
      return character.bodyType ?? '';
    default:
      return character[key];
  }
}

/**
 * 判断角色是否命中筛选条件。
 * exclude 用于分面计数：统计某维度的选项数量时，忽略该维度自身的筛选，
 * 但保留其它维度与搜索词，保证各选项计数随其它条件联动。
 */
function matchesFilters(
  character: Character,
  filters: FilterState,
  exclude?: FacetKey,
): boolean {
  const keyword = filters.q.trim().toLowerCase();
  if (
    keyword &&
    ![character.name, character.faction, character.camp].some((text) =>
      text.toLowerCase().includes(keyword),
    )
  ) {
    return false;
  }
  for (const key of FACET_KEYS) {
    if (key === exclude) continue;
    const value = filters[key];
    if (value && facetValue(character, key) !== value) return false;
  }
  return true;
}

function sortCharacters(list: Character[], sort: string): Character[] {
  const sorted = [...list];
  switch (sort) {
    case 'date-asc':
      return sorted.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    case 'rarity-desc':
      return sorted.sort(
        (a, b) =>
          b.rarity - a.rarity || b.releaseDate.localeCompare(a.releaseDate),
      );
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    case 'date-desc':
    default:
      return sorted.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }
}

export function CharactersPage() {
  const characters = useCharacters();
  const [params, setParams] = useSearchParams();

  const filters: FilterState = {
    q: params.get('q') ?? '',
    rarity: params.get('rarity') ?? '',
    path: params.get('path') ?? '',
    element: params.get('element') ?? '',
    bodyType: params.get('bodyType') ?? '',
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
    characters.filter(
      (c) => matchesFilters(c, filters, key) && facetValue(c, key) === value,
    ).length;

  const allCount = characters.filter((c) =>
    matchesFilters(c, { ...filters, ...EMPTY_FACETS }),
  ).length;

  /** 数据中实际出现的版本（用于补充常显列表之外的新版本） */
  const dataVersions = useMemo(
    () =>
      [...new Set(characters.map((c) => c.releaseVersion))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [characters],
  );

  /** 实装版本分组：以常显配置为基础，数据中的新版本追加到对应大版本（或新建分组） */
  const versionGroups = useMemo(() => {
    const known = new Set(VERSION_GROUPS.flatMap((group) => group.values));
    const groups = VERSION_GROUPS.map((group) => ({
      major: group.major,
      values: [...group.values],
    }));
    for (const value of dataVersions) {
      if (known.has(value)) continue;
      const major = value.split('.')[0];
      let group = groups.find((g) => g.major === major);
      if (!group) {
        group = { major, values: [] };
        groups.push(group);
      }
      group.values.push(value);
      group.values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return groups;
  }, [dataVersions]);

  const filtered = useMemo(() => {
    const matched = characters.filter((c) => matchesFilters(c, filters));
    return sortCharacters(matched, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    characters,
    filters.q,
    filters.rarity,
    filters.path,
    filters.element,
    filters.version,
    filters.bodyType,
    sort,
  ]);

  const hasAnyFilter =
    Boolean(filters.q) || FACET_KEYS.some((key) => filters[key]);

  return (
    <div>
      <PageHeader
        en="Characters"
        title="角色图鉴"
        description="按名称、稀有度、命途、战斗属性、体型与实装版本搜索和筛选角色。"
      >
        <div className="mt-6 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={filters.q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="搜索角色名 / 派系 / 阵营…"
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
              {([5, 4] as const).map((r) => (
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

            <FilterRow label="战斗属性">
              {Object.entries(ELEMENT_META).map(([value, meta]) => (
                <FacetChip
                  key={value}
                  active={filters.element === value}
                  count={facetCount('element', value)}
                  color={meta.color}
                  onClick={() => toggleFacet('element', value)}
                >
                  <i aria-hidden className="size-1.5 rotate-45 bg-current" />
                  {meta.label}
                </FacetChip>
              ))}
            </FilterRow>

            {/* 体型：第一行男性、第二行女性 */}
            <FilterRowLines
              label="体型"
              lines={BODY_TYPE_GROUPS.map((group) => (
                <Fragment key={group.title}>
                  <span className="mr-1 text-xs text-slate-500">
                    {group.title}
                  </span>
                  {group.values.map((value) => (
                    <FacetChip
                      key={value}
                      active={filters.bodyType === value}
                      count={facetCount('bodyType', value)}
                      onClick={() => toggleFacet('bodyType', value)}
                    >
                      {BODY_TYPE_LABEL[value]}
                    </FacetChip>
                  ))}
                </Fragment>
              ))}
            />

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
              名角色
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

      {characters.length === 0 ? (
        <EmptyState
          title="暂无角色数据"
          hint="角色数据尚未收录，可在 src/data/seed.ts 中录入，页面会自动展示。"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有符合条件的角色"
          hint="试试调整搜索关键词或筛选条件。"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}
    </div>
  );
}
