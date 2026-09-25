import { useMemo } from 'react';
import { CharacterCard } from '../components/cards/CharacterCard';
import { LightConeCard } from '../components/cards/LightConeCard';
import { RelicCard } from '../components/cards/RelicCard';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  FAVORITE_PREFIX,
  useBootstrapStatus,
  useCharacters,
  useFavorites,
  useLightCones,
  useRelics,
} from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/** 收藏 id 前缀 → 本表条目列表 */
function useFavoritesByType() {
  const characters = useCharacters();
  const lightCones = useLightCones();
  const relics = useRelics();
  const favorites = useFavorites();

  return useMemo(() => {
    const pick = <T extends { id: string }>(
      items: T[],
      prefix: string,
    ): T[] => {
      const ids = new Set(
        [...favorites]
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length)),
      );
      return items.filter((item) => ids.has(item.id));
    };
    return {
      characters: pick(characters, FAVORITE_PREFIX.character),
      lightCones: pick(lightCones, FAVORITE_PREFIX.lightCone),
      relics: pick(relics, FAVORITE_PREFIX.relic),
    };
  }, [characters, lightCones, relics, favorites]);
}

export function FavoritesPage() {
  useDocumentTitle('我的收藏');
  const dataReady = useBootstrapStatus() === 'ok';
  const hasAnyData =
    useCharacters().length +
      useLightCones().length +
      useRelics().length >
    0;
  const { characters, lightCones, relics } = useFavoritesByType();
  const total = characters.length + lightCones.length + relics.length;

  return (
    <div>
      <PageHeader
        en="Favorites"
        title="我的收藏"
        description="图鉴卡片与详情页点击星标即可收藏；收藏保存在本地数据库中，随「导出数据」一起备份。"
      />

      {total === 0 ? (
        !hasAnyData && !dataReady ? (
          <LoadingState />
        ) : (
          <EmptyState
            title="还没有收藏任何条目"
            hint="在角色 / 光锥 / 遗器图鉴或详情页点击右上角星标即可收藏。"
          />
        )
      ) : (
        <div className="space-y-8">
          {characters.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-100">
                角色
                <span className="ml-2 font-display text-sm text-slate-500">
                  {characters.length} 名
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {characters.map((character) => (
                  <CharacterCard key={character.id} character={character} />
                ))}
              </div>
            </section>
          )}

          {lightCones.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-100">
                光锥
                <span className="ml-2 font-display text-sm text-slate-500">
                  {lightCones.length} 件
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lightCones.map((lightCone) => (
                  <LightConeCard key={lightCone.id} lightCone={lightCone} />
                ))}
              </div>
            </section>
          )}

          {relics.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-100">
                遗器
                <span className="ml-2 font-display text-sm text-slate-500">
                  {relics.length} 套
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {relics.map((relic) => (
                  <RelicCard key={relic.id} relic={relic} />
                ))}
              </div>
            </section>
          )}

          <Panel className="p-4 text-center text-xs text-slate-500">
            共收藏 {total} 项 · 取消星标即从收藏中移除
          </Panel>
        </div>
      )}
    </div>
  );
}
