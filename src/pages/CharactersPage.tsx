import { Fragment, useMemo } from 'react';
import { CharacterCard } from '../components/cards/CharacterCard';
import { SearchIcon, StarIcon } from '../components/icons';
import {
  FacetChip,
  FilterRow,
  FilterRowLines,
  sortSelectClass,
} from '../components/ui/FilterPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character } from '../db/types';
import { RARITIES } from '../db/types';
import {
  SORT_OPTIONS,
  sortList,
  useCharacters,
  useFacetFilter,
} from '../hooks/useWikiData';
import {
  BODY_TYPE_GROUPS,
  BODY_TYPE_LABEL,
  buildVersionGroups,
  ELEMENT_META,
  PATH_META,
  RARITY_META,
} from '../lib/meta';

type FacetKey = 'rarity' | 'path' | 'element' | 'bodyType' | 'version';

const FACET_KEYS: FacetKey[] = [
  'rarity',
  'path',
  'element',
  'bodyType',
  'version',
];

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

function matchesKeyword(character: Character, keyword: string): boolean {
  return [character.name, character.faction, character.camp].some((text) =>
    text.toLowerCase().includes(keyword),
  );
}

const SORT_ACCESSORS = {
  date: (c: Character) => c.releaseDate,
  rarity: (c: Character) => c.rarity,
  name: (c: Character) => c.name,
};

export function CharactersPage() {
  const characters = useCharacters();
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
  } = useFacetFilter(characters, FACET_KEYS, facetValue, matchesKeyword);
  const sort = getParam('sort') ?? 'date-desc';

  const filtered = useMemo(
    () => sortList(matched, sort, SORT_ACCESSORS),
    [matched, sort],
  );

  /** 实装版本分组：以常显配置为基础，数据中的新版本追加到对应大版本（或新建分组） */
  const versionGroups = useMemo(
    () => buildVersionGroups(characters.map((c) => c.releaseVersion)),
    [characters],
  );

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
              value={q}
              onChange={(e) => setQ(e.target.value)}
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
              {RARITIES.map((r) => (
                <FacetChip
                  key={r}
                  active={facets.rarity === String(r)}
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
                  active={facets.path === value}
                  count={countOf('path', value)}
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
                  active={facets.element === value}
                  count={countOf('element', value)}
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
                      active={facets.bodyType === value}
                      count={countOf('bodyType', value)}
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
                      active={facets.version === value}
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
