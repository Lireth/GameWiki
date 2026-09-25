import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character } from '../db/types';
import { ELEMENT_IDS, PATH_IDS } from '../db/types';
import { useCharacters } from '../hooks/useWikiData';
import { ELEMENT_META, PATH_META, RARITY_META } from '../lib/meta';

const CELL_KEY_SEPARATOR = '|';

/** 按「属性 | 命途」分桶，桶内按实装日期从新到旧排列 */
function useMatrixCells(characters: Character[]) {
  return useMemo(() => {
    const map = new Map<string, Character[]>();
    for (const character of characters) {
      const key = `${character.element}${CELL_KEY_SEPARATOR}${character.path}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(character);
      else map.set(key, [character]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    }
    return map;
  }, [characters]);
}

function MatrixChip({ character }: { character: Character }) {
  const color = RARITY_META[character.rarity].color;
  return (
    <Link
      to={`/characters/${character.id}`}
      title={`${character.name} · v${character.releaseVersion} · ${character.releaseDate}`}
      className="block truncate border px-1.5 py-1 text-xs leading-4 transition hover:brightness-125"
      style={{
        color,
        borderColor: `${color}44`,
        backgroundColor: `${color}12`,
      }}
    >
      {character.name}
    </Link>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <i aria-hidden className="size-2.5 rotate-45 bg-star-5" />
        5★ 角色
      </span>
      <span className="flex items-center gap-1.5">
        <i aria-hidden className="size-2.5 rotate-45 bg-star-4" />
        4★ 角色
      </span>
      <span>横轴为命途、纵轴为战斗属性，单元格内按实装日期从新到旧排列</span>
    </div>
  );
}

export function MatrixPage() {
  const characters = useCharacters();
  const cells = useMatrixCells(characters);
  const hasData = characters.length > 0;

  return (
    <div>
      <PageHeader
        en="Path × Type Matrix"
        title="命途 × 战斗属性矩阵"
        description="每个单元格展示对应「战斗属性 × 命途」组合下的角色，点击角色名可查看详情。"
      />

      {/* 桌面端：完整二维矩阵 */}
      {hasData ? (
        <>
          <div className="hidden overflow-x-auto pb-2 md:block">
            <div className="min-w-[960px]">
              <div
                className="grid gap-px border border-space-600/40 bg-space-600/40"
                style={{
                  gridTemplateColumns: '120px repeat(8, minmax(104px, 1fr))',
                }}
              >
                {/* 表头行 */}
                <div className="flex flex-col justify-center bg-space-800 px-3 py-3">
                  <span className="text-xs text-slate-400">属性 ↓</span>
                  <span className="text-xs text-slate-500">命途 →</span>
                </div>
                {PATH_IDS.map((pathId) => {
                  const path = PATH_META[pathId];
                  return (
                    <div
                      key={pathId}
                      className="bg-space-800 px-2 py-3 text-center"
                      style={{ color: path.color }}
                    >
                      <p className="text-sm font-semibold">{path.label}</p>
                      <p className="mt-0.5 font-display text-[10px] tracking-widest text-slate-500 uppercase">
                        {path.en}
                      </p>
                    </div>
                  );
                })}

                {/* 数据行 */}
                {ELEMENT_IDS.map((elementId) => {
                  const element = ELEMENT_META[elementId];
                  return (
                    <Fragment key={elementId}>
                      <div
                        className="flex flex-col justify-center bg-space-800 px-3 py-2.5"
                        style={{ color: element.color }}
                      >
                        <p className="text-sm font-semibold">{element.label}</p>
                        <p className="mt-0.5 font-display text-[10px] tracking-widest text-slate-500 uppercase">
                          {element.en}
                        </p>
                      </div>
                      {PATH_IDS.map((pathId) => {
                        const bucket = cells.get(
                          `${elementId}${CELL_KEY_SEPARATOR}${pathId}`,
                        );
                        return (
                          <div
                            key={pathId}
                            className="min-h-[52px] bg-space-900 p-1.5"
                          >
                            {bucket ? (
                              <div className="space-y-1">
                                {bucket.map((character) => (
                                  <MatrixChip
                                    key={character.id}
                                    character={character}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-700">—</span>
                            )}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 移动端：按属性分组的堆叠视图 */}
          <div className="space-y-4 md:hidden">
            {ELEMENT_IDS.map((elementId) => {
              const element = ELEMENT_META[elementId];
              const rows = PATH_IDS.map(
                (pathId) =>
                  [
                    pathId,
                    cells.get(`${elementId}${CELL_KEY_SEPARATOR}${pathId}`) ?? [],
                  ] as const,
              ).filter(([, bucket]) => bucket.length > 0);
              if (rows.length === 0) return null;

              return (
                <Panel key={elementId} className="p-4" ticks>
                  <h3
                    className="font-semibold"
                    style={{ color: element.color }}
                  >
                    {element.label}
                    <span className="ml-2 font-display text-[10px] tracking-widest text-slate-500 uppercase">
                      {element.en}
                    </span>
                  </h3>
                  <dl className="mt-3 space-y-3">
                    {rows.map(([pathId, bucket]) => (
                      <div key={pathId} className="flex gap-3">
                        <dt
                          className="w-10 shrink-0 pt-1.5 text-xs"
                          style={{ color: PATH_META[pathId].color }}
                        >
                          {PATH_META[pathId].label}
                        </dt>
                        <dd className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                          {bucket.map((character) => (
                            <MatrixChip
                              key={character.id}
                              character={character}
                            />
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
              );
            })}
          </div>

          <Legend />
        </>
      ) : (
        <EmptyState
          title="暂无角色数据"
          hint="角色数据尚未收录，可在 src/data/seed.ts 中录入；有数据后矩阵会自动生成。"
        />
      )}
    </div>
  );
}
