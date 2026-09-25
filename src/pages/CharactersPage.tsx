import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CharacterCard } from '../components/cards/CharacterCard';
import { SearchIcon } from '../components/icons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import type { Character } from '../db/types';
import { useCharacters } from '../hooks/useWikiData';
import {
  ELEMENT_META,
  GENDER_LABEL,
  GENDER_OPTIONS,
  PATH_META,
} from '../lib/meta';

const SORT_OPTIONS = [
  { value: 'date-desc', label: '实装日期 新→旧' },
  { value: 'date-asc', label: '实装日期 旧→新' },
  { value: 'rarity-desc', label: '稀有度 高→低' },
  { value: 'name', label: '名称排序' },
] as const;

const FILTER_KEYS = ['rarity', 'path', 'element', 'gender', 'camp', 'faction'] as const;

function distinct(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
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

const selectClass =
  'w-full border border-space-600/60 bg-space-850/80 px-2.5 py-2 text-sm text-slate-200 focus:border-gold-500/60 focus:outline-none';

export function CharactersPage() {
  const characters = useCharacters();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const rarity = params.get('rarity') ?? '';
  const path = params.get('path') ?? '';
  const element = params.get('element') ?? '';
  const gender = params.get('gender') ?? '';
  const camp = params.get('camp') ?? '';
  const faction = params.get('faction') ?? '';
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

  const clearFilters = () => setParams({}, { replace: true });

  const camps = useMemo(
    () => distinct(characters.map((c) => c.camp)),
    [characters],
  );
  const factions = useMemo(
    () => distinct(characters.map((c) => c.faction)),
    [characters],
  );

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const matched = characters.filter((c) => {
      if (
        keyword &&
        ![c.name, c.faction, c.camp].some((text) =>
          text.toLowerCase().includes(keyword),
        )
      ) {
        return false;
      }
      if (rarity && c.rarity !== Number(rarity)) return false;
      if (path && c.path !== path) return false;
      if (element && c.element !== element) return false;
      if (gender && c.gender !== gender) return false;
      if (camp && c.camp !== camp) return false;
      if (faction && c.faction !== faction) return false;
      return true;
    });
    return sortCharacters(matched, sort);
  }, [characters, q, rarity, path, element, gender, camp, faction, sort]);

  const hasFilters = FILTER_KEYS.some((key) => params.get(key));

  const renderSelect = (
    label: string,
    key: string,
    value: string,
    options: { value: string; label: string }[],
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => setParam(key, e.target.value)}
      className={selectClass}
    >
      <option value="">{label}：全部</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <PageHeader
        en="Characters"
        title="角色图鉴"
        description="按名称、稀有度、命途、战斗属性、派系、阵营与性别搜索和筛选角色。"
      >
        <div className="mt-6 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="搜索角色名 / 派系 / 阵营…"
              className="w-full border border-space-600/60 bg-space-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            {renderSelect(
              '稀有度',
              'rarity',
              rarity,
              [5, 4].map((r) => ({ value: String(r), label: `${r}★` })),
            )}
            {renderSelect(
              '命途',
              'path',
              path,
              Object.entries(PATH_META).map(([value, meta]) => ({
                value,
                label: meta.label,
              })),
            )}
            {renderSelect(
              '属性',
              'element',
              element,
              Object.entries(ELEMENT_META).map(([value, meta]) => ({
                value,
                label: meta.label,
              })),
            )}
            {renderSelect(
              '性别',
              'gender',
              gender,
              GENDER_OPTIONS.map((g) => ({
                value: g.value,
                label: GENDER_LABEL[g.value],
              })),
            )}
            {renderSelect(
              '阵营',
              'camp',
              camp,
              camps.map((value) => ({ value, label: value })),
            )}
            {renderSelect(
              '派系',
              'faction',
              faction,
              factions.map((value) => ({ value, label: value })),
            )}
            <select
              aria-label="排序"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className={selectClass}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              共 <span className="font-display text-sm text-gold-300">{filtered.length}</span>{' '}
              名角色
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="border border-space-600/60 px-2.5 py-1 transition hover:border-gold-500/60 hover:text-gold-300"
              >
                重置筛选
              </button>
            )}
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
