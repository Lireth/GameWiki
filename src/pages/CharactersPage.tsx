import { Fragment, useMemo } from 'react';
import { CharacterCard } from '../components/cards/CharacterCard';
import {
  FacetChip,
  FilterRow,
  FilterRowLines,
  ListSearchBox,
  ListToolbar,
  RarityFacetRow,
  VersionFacetRow,
  ViewAllRow,
} from '../components/ui/FilterPanel';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character } from '../db/types';
import { RARITIES } from '../db/types';
import {
  FAVORITE_PREFIX,
  sortList,
  useBootstrapStatus,
  useCharacters,
  useFacetFilter,
  useFavoriteFilter,
} from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  BODY_TYPE_GROUPS,
  BODY_TYPE_LABEL,
  buildVersionGroups,
  ELEMENT_META,
  PATH_META,
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
  return [character.name, ...(character.aliases ?? []), character.faction, character.camp].some(
    (text) => text.toLowerCase().includes(keyword),
  );
}

const SORT_ACCESSORS = {
  date: (c: Character) => c.releaseDate,
  rarity: (c: Character) => c.rarity,
  name: (c: Character) => c.name,
};

export function CharactersPage() {
  useDocumentTitle('角色图鉴');
  const characters = useCharacters();
  const dataReady = useBootstrapStatus() === 'ok';
  const { favOnly, favCount, visibleItems, toggleFavOnly } =
    useFavoriteFilter(characters, FAVORITE_PREFIX.character);
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
    () => buildVersionGroups(characters.map((c) => c.releaseVersion), facets.version),
    [characters, facets.version],
  );

  return (
    <div>
      <PageHeader
        en="Characters"
        title="角色图鉴"
        description="按名称、稀有度、命途、战斗属性、体型与实装版本搜索和筛选角色。"
      >
        <div className="mt-6 space-y-3">
          <ListSearchBox q={q} setQ={setQ} placeholder="搜索角色名 / 派系 / 阵营…" />

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
              rarities={RARITIES}
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

            <FilterRow label="战斗属性">
              {Object.entries(ELEMENT_META).map(([value, meta]) => (
                <FacetChip
                  key={value}
                  active={facets.element.includes(value)}
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
                      active={facets.bodyType.includes(value)}
                      count={countOf('bodyType', value)}
                      onClick={() => toggleFacet('bodyType', value)}
                    >
                      {BODY_TYPE_LABEL[value]}
                    </FacetChip>
                  ))}
                </Fragment>
              ))}
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
            unit="名角色"
            sort={sort}
            onSortChange={(value) => setParam('sort', value)}
          />
        </div>
      </PageHeader>

      {characters.length === 0 ? (
        dataReady ? (
          <EmptyState
            title="暂无角色数据"
            hint="可通过页脚「数据管理」录入，或导入备份数据，页面会自动展示。"
          />
        ) : (
          <LoadingState />
        )
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
