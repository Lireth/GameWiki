import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character } from '../db/types';
import { ELEMENT_IDS, PATH_IDS } from '../db/types';
import { useBootstrapStatus, useCharacters } from '../hooks/useWikiData';
import { useEntityImage } from '../hooks/useEntityImage';
import { ELEMENT_META, PATH_META, RARITY_META } from '../lib/meta';
import { characterLink } from '../lib/links';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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

/** 矩阵块统一比例（与头像素材一致的 160/188），同格多角色时用左右按钮切换 */
function MatrixCell({ characters }: { characters: Character[] }) {
  const count = characters.length;
  const [rawIndex, setRawIndex] = useState(0);
  const index = Math.min(rawIndex, count - 1);
  const character = characters[index];
  const element = ELEMENT_META[character.element];
  const rarityColor = RARITY_META[character.rarity].color;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const avatarSrc = useEntityImage(character.avatar);
  const showAvatar = avatarSrc && avatarSrc !== failedSrc;

  const step = (delta: number) =>
    setRawIndex((index + delta + count) % count);

  return (
    <div className="group relative bg-space-900">
      <Link
        to={characterLink(character.id)}
        title={`${character.name} · v${character.releaseVersion} · ${character.releaseDate}`}
        className="block"
      >
        {showAvatar ? (
          <img
            src={avatarSrc}
            alt={character.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(avatarSrc ?? null)}
            className="aspect-[160/188] w-full object-cover"
          />
        ) : (
          <span
            className="flex aspect-[160/188] w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${element.color}2b, transparent 65%)`,
            }}
          >
            <span
              className="font-display text-2xl font-bold"
              style={{ color: `${element.color}d0` }}
            >
              {character.name.slice(0, 1)}
            </span>
          </span>
        )}
        {/* 名称条：底色渐变保证可读性，文字颜色区分稀有度 */}
        <span
          className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-space-900/95 via-space-900/60 to-transparent px-1 pb-0.5 pt-3 text-[11px] font-medium leading-4"
          style={{ color: rarityColor }}
        >
          {character.name}
        </span>
      </Link>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="上一位角色"
            onClick={() => step(-1)}
            className="absolute left-0.5 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center border border-space-600/80 bg-space-900/85 text-slate-300 transition hover:border-gold-500/60 hover:text-gold-300"
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="下一位角色"
            onClick={() => step(1)}
            className="absolute right-0.5 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center border border-space-600/80 bg-space-900/85 text-slate-300 transition hover:border-gold-500/60 hover:text-gold-300"
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
          <span className="absolute right-0.5 top-0.5 bg-space-900/85 px-1 font-display text-[10px] leading-4 text-slate-300">
            {index + 1}/{count}
          </span>
        </>
      )}
    </div>
  );
}

/** 空格子：与数据格子保持同一比例，矩阵整体尺寸一致 */
function EmptyCell() {
  return (
    <div className="flex aspect-[160/188] items-center justify-center bg-space-900">
      <span className="text-slate-700">—</span>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-star-5">5★</span>/
        <span className="font-semibold text-star-4">4★</span>
        名称颜色代表稀有度
      </span>
      <span>
        横轴为命途、纵轴为战斗属性，格内默认展示最新实装的角色，同格多角色时可用左右按钮切换
      </span>
    </div>
  );
}

export function MatrixPage() {
  useDocumentTitle(
    '命途 × 属性矩阵',
    '命途 × 战斗属性矩阵：每格展示对应组合下的角色。',
  );
  const characters = useCharacters();
  const dataReady = useBootstrapStatus() === 'ok';
  const cells = useMatrixCells(characters);
  const hasData = characters.length > 0;

  /** 各命途 / 属性下的角色数（表头统计） */
  const pathCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const character of characters) {
      map.set(character.path, (map.get(character.path) ?? 0) + 1);
    }
    return map;
  }, [characters]);
  const elementCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const character of characters) {
      map.set(character.element, (map.get(character.element) ?? 0) + 1);
    }
    return map;
  }, [characters]);

  return (
    <div>
      <PageHeader
        title="命途 × 战斗属性矩阵"
        description="每个单元格展示对应「战斗属性 × 命途」组合下的角色，点击头像可查看详情；同格多角色时可用左右按钮切换。"
      />

      {hasData ? (
        <>
          {/* 桌面端：完整二维矩阵，所有格子统一比例 */}
          <div className="hidden overflow-x-auto pb-2 md:block">
            <div className="min-w-[1080px]">
              <div
                className="grid gap-px border border-space-600/40 bg-space-600/40"
                style={{
                  gridTemplateColumns: `120px repeat(${PATH_IDS.length}, minmax(104px, 1fr))`,
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
                      <p className="mt-0.5 font-display text-[10px] text-slate-500">
                        {pathCounts.get(pathId) ?? 0}
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
                        <p className="mt-0.5 font-display text-[10px] text-slate-500">
                          {elementCounts.get(elementId) ?? 0}
                        </p>
                      </div>
                      {PATH_IDS.map((pathId) => {
                        const bucket = cells.get(
                          `${elementId}${CELL_KEY_SEPARATOR}${pathId}`,
                        );
                        return bucket && bucket.length > 0 ? (
                          <MatrixCell
                            key={pathId}
                            characters={bucket}
                          />
                        ) : (
                          <EmptyCell key={pathId} />
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 移动端：按属性分组的堆叠视图，格子与桌面端同款 */}
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
                    <span className="ml-2 font-display text-[10px] text-slate-500">
                      {elementCounts.get(elementId) ?? 0}
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
                        <dd className="min-w-0 flex-1">
                          <div className="w-24">
                            <MatrixCell characters={bucket} />
                          </div>
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
      ) : dataReady ? (
        <EmptyState
          title="暂无角色数据"
          hint="角色数据尚未收录，可通过页脚「数据管理」录入，或导入备份数据；有数据后矩阵会自动生成。"
        />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
