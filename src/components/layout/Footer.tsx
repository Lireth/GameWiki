import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import type { Character, LightCone, NewsEvent, RelicSet } from '../../db/types';
import { MAX_IMAGE_DATA_URL_LENGTH } from '../../lib/entryValidation';
import { getFavorites, mergeFavorites } from '../../lib/favorites';
import { blobToDataURL, parseImageRef } from '../../lib/imageRef';

/** 导出时把 idb: 图片引用还原为 data URL，保证备份 JSON 自包含可迁移 */
async function resolveExportImage(
  value: string | undefined,
): Promise<string | undefined> {
  if (!value) return undefined;
  const ref = parseImageRef(value);
  if (!ref) return value;
  const row = await db.images.get(ref);
  return row ? await blobToDataURL(row.blob) : undefined;
}

/** 导出全部数据表与收藏为 JSON 备份文件 */
async function exportData() {
  try {
    const characters = await Promise.all(
      (await db.characters.toArray()).map(async (character) => ({
        ...character,
        avatar: await resolveExportImage(character.avatar),
      })),
    );
    const lightCones = await Promise.all(
      (await db.lightCones.toArray()).map(async (lightCone) => ({
        ...lightCone,
        image: await resolveExportImage(lightCone.image),
      })),
    );
    const relics = await Promise.all(
      (await db.relics.toArray()).map(async (relic) => ({
        ...relic,
        image: await resolveExportImage(relic.image),
      })),
    );
    const payload = {
      app: 'hsr-wiki',
      exportedAt: new Date().toISOString(),
      favorites: [...getFavorites()],
      characters,
      lightCones,
      relics,
      newsEvents: await db.newsEvents.toArray(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hsr-wiki-backup-${payload.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`导出失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 读取备份 JSON 并按主键合并写入（同 id 条目覆盖，其余保留） */
async function importData(file: File) {
  try {
    const parsed: unknown = JSON.parse(await file.text());
    const data = (parsed ?? {}) as Record<string, unknown>;
    const isRecord = (item: unknown): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null;
    const isStr = (value: unknown) => typeof value === 'string';
    const pick = <T,>(value: unknown, guard: (item: Record<string, unknown>) => boolean): T[] =>
      Array.isArray(value) ? value.filter((item): item is T => isRecord(item) && guard(item)) : [];

    // 逐类型校验必填字段，避免脏数据混入数据库
    const allCharacters = pick<Character>(data.characters, (item) =>
      isStr(item.id) && isStr(item.name) && isStr(item.path) && isStr(item.element) &&
      (item.rarity === 4 || item.rarity === 5) && isStr(item.releaseDate) && isStr(item.releaseVersion),
    );
    const allLightCones = pick<LightCone>(data.lightCones, (item) =>
      isStr(item.id) && isStr(item.name) && isStr(item.path) &&
      (item.rarity === 3 || item.rarity === 4 || item.rarity === 5),
    );
    const newsEvents = pick<NewsEvent>(data.newsEvents, (item) =>
      isStr(item.id) && isStr(item.type) && isStr(item.title) && isStr(item.date),
    );
    const relics = pick<RelicSet>(data.relics, (item) =>
      isStr(item.id) && isStr(item.name) && isStr(item.category) &&
      isStr(item.effect2) &&
      (item.rarity === 2 || item.rarity === 3 || item.rarity === 4 || item.rarity === 5),
    );
    const favorites = Array.isArray(data.favorites)
      ? data.favorites.filter((item): item is string => isStr(item))
      : [];

    // 图片 data URL 超限的条目跳过（与管理页上传的 1MB 上限一致）
    const oversized = (value: unknown) =>
      typeof value === 'string' &&
      value.startsWith('data:') &&
      value.length > MAX_IMAGE_DATA_URL_LENGTH;
    const characters = allCharacters.filter((c) => !oversized(c.avatar));
    const lightCones = allLightCones.filter((c) => !oversized(c.image));
    const skipped =
      allCharacters.length - characters.length +
      (allLightCones.length - lightCones.length);

    if (
      characters.length +
        lightCones.length +
        newsEvents.length +
        relics.length +
        favorites.length ===
      0
    ) {
      alert('文件中未找到可导入的数据（需要 characters / lightCones / relics / newsEvents / favorites 字段）。');
      return;
    }
    const confirmed = window.confirm(
      `将导入：角色 ${characters.length} 名、光锥 ${lightCones.length} 件、遗器 ${relics.length} 套、资讯 ${newsEvents.length} 条` +
        (favorites.length ? `、收藏 ${favorites.length} 条` : '') +
        '.' +
        (skipped > 0 ? `\n另有 ${skipped} 条图片超过 1MB 的条目将被跳过。` : '') +
        '\n与现有数据 id 相同的条目会被覆盖，其余保留。是否继续？',
    );
    if (!confirmed) return;

    await db.transaction(
      'rw',
      [db.characters, db.lightCones, db.newsEvents, db.relics],
      async () => {
        if (characters.length) await db.characters.bulkPut(characters);
        if (lightCones.length) await db.lightCones.bulkPut(lightCones);
        if (newsEvents.length) await db.newsEvents.bulkPut(newsEvents);
        if (relics.length) await db.relics.bulkPut(relics);
      },
    );
    // 收藏与现有收藏集合并（并集），不覆盖丢失
    if (favorites.length) await mergeFavorites(favorites);
    alert('导入完成，页面数据已实时更新。');
  } catch {
    alert('导入失败：文件不是有效的备份 JSON。');
  }
}

export function Footer() {
  return (
    <footer className="border-t border-space-600/40 bg-space-900/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          星穹铁道资料站 · 粉丝学习项目，与 miHoYo / HoYoverse
          无关，游戏相关内容版权归原厂商所有
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* 数据维护：应用内增删改 + JSON 备份导出 / 按 id 合并导入 */}
          <Link
            to="/admin"
            className="border border-space-600/60 px-2.5 py-1 text-slate-400 transition hover:border-gold-500/50 hover:text-gold-300"
          >
            数据管理
          </Link>
          <button
            type="button"
            onClick={() => void exportData()}
            className="border border-space-600/60 px-2.5 py-1 text-slate-400 transition hover:border-gold-500/50 hover:text-gold-300"
          >
            导出数据
          </button>
          <label className="cursor-pointer border border-space-600/60 px-2.5 py-1 text-slate-400 transition hover:border-gold-500/50 hover:text-gold-300">
            导入数据
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importData(file);
                e.target.value = '';
              }}
            />
          </label>
          <p className="font-display tracking-[0.25em]">
            REACT · TAILWIND · DEXIE / INDEXEDDB
          </p>
        </div>
      </div>
    </footer>
  );
}
