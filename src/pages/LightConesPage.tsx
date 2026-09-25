import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LightConeCard } from '../components/cards/LightConeCard';
import { SearchIcon } from '../components/icons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import type { LightCone } from '../db/types';
import { useLightCones } from '../hooks/useWikiData';
import { PATH_META } from '../lib/meta';

const SORT_OPTIONS = [
  { value: 'date-desc', label: '实装日期 新→旧' },
  { value: 'date-asc', label: '实装日期 旧→新' },
  { value: 'rarity-desc', label: '稀有度 高→低' },
  { value: 'name', label: '名称排序' },
] as const;

const selectClass =
  'w-full border border-space-600/60 bg-space-850/80 px-2.5 py-2 text-sm text-slate-200 focus:border-gold-500/60 focus:outline-none';

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

  const q = params.get('q') ?? '';
  const rarity = params.get('rarity') ?? '';
  const path = params.get('path') ?? '';
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

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const matched = lightCones.filter((lc) => {
      if (keyword && !lc.name.toLowerCase().includes(keyword)) return false;
      if (rarity && lc.rarity !== Number(rarity)) return false;
      if (path && lc.path !== path) return false;
      return true;
    });
    return sortLightCones(matched, sort);
  }, [lightCones, q, rarity, path, sort]);

  const hasFilters = Boolean(params.get('rarity') || params.get('path'));

  return (
    <div>
      <PageHeader
        en="Light Cones"
        title="光锥图鉴"
        description="按名称、稀有度与命途筛选光锥。"
      >
        <div className="mt-6 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="搜索光锥名称…"
              className="w-full border border-space-600/60 bg-space-850/80 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <select
              aria-label="稀有度"
              value={rarity}
              onChange={(e) => setParam('rarity', e.target.value)}
              className={selectClass}
            >
              <option value="">稀有度：全部</option>
              <option value="5">5★</option>
              <option value="4">4★</option>
            </select>
            <select
              aria-label="命途"
              value={path}
              onChange={(e) => setParam('path', e.target.value)}
              className={`${selectClass} col-span-2 sm:col-span-1`}
            >
              <option value="">命途：全部</option>
              {Object.entries(PATH_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
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
              件光锥
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
