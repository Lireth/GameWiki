import { Link } from 'react-router-dom';
import { db, DB_SCHEMA_VERSION } from '../../db/db';
import {
  ACQUISITION_TYPES,
  BODY_TYPES,
  ELEMENT_IDS,
  GENDERS,
  NEWS_EVENT_TYPES,
  PATH_IDS,
  RELIC_CATEGORIES,
  type Character,
  type LightCone,
  type NewsEvent,
  type RelicSet,
} from '../../db/types';
import { DATE_PATTERN, MAX_IMAGE_DATA_URL_LENGTH } from '../../lib/entryValidation';
import { getFavorites, mergeFavorites } from '../../lib/favorites';
import { blobToDataURL, parseImageRef } from '../../lib/imageRef';
import { alertDialog, confirmDialog } from '../../lib/dialog';

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
      schemaVersion: DB_SCHEMA_VERSION,
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
    void alertDialog(
      `${error instanceof Error ? error.message : String(error)}`,
      '导出失败',
    );
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
    /** 枚举字段宽松校验：缺省（旧版备份）放行，出现时必须在白名单内 */
    const inList = (value: unknown, ids: readonly string[]) =>
      value === undefined || (isStr(value) && ids.includes(value));
    /** 日期字段宽松校验：缺省放行，出现时必须为 YYYY-MM-DD */
    const isDate = (value: unknown) =>
      value === undefined || (isStr(value) && DATE_PATTERN.test(value));
    /** 取对象数组（元素保持 unknown，由各校验谓词收窄） */
    const listOf = (value: unknown): unknown[] =>
      Array.isArray(value) ? value : [];

    // 备份来自更新版本站点时，未知字段会被宽松导入忽略，提前告知
    const schemaVersion =
      typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
    const newerThanApp = schemaVersion > DB_SCHEMA_VERSION;

    // 必填字段 + 枚举白名单 + 日期格式（与管理页表单校验同口径），脏数据不入库
    const allCharacters = listOf(data.characters);
    const characters = allCharacters.filter((item): item is Character =>
      isRecord(item) && isStr(item.id) && isStr(item.name) && isStr(item.path) &&
      isStr(item.element) &&
      (item.rarity === 4 || item.rarity === 5) && isStr(item.releaseDate) &&
      isStr(item.releaseVersion) &&
      inList(item.path, PATH_IDS) && inList(item.element, ELEMENT_IDS) &&
      inList(item.gender, GENDERS) && inList(item.bodyType, BODY_TYPES) &&
      isDate(item.releaseDate),
    );
    const allLightCones = listOf(data.lightCones);
    const lightCones = allLightCones.filter((item): item is LightCone =>
      isRecord(item) && isStr(item.id) && isStr(item.name) && isStr(item.path) &&
      (item.rarity === 3 || item.rarity === 4 || item.rarity === 5) &&
      inList(item.path, PATH_IDS) && inList(item.acquisition, ACQUISITION_TYPES) &&
      isDate(item.releaseDate),
    );
    const allNewsEvents = listOf(data.newsEvents);
    const newsEvents = allNewsEvents.filter((item): item is NewsEvent =>
      isRecord(item) && isStr(item.id) && isStr(item.type) && isStr(item.title) &&
      isStr(item.date) && inList(item.type, NEWS_EVENT_TYPES) &&
      (isStr(item.date) && DATE_PATTERN.test(item.date)) && isDate(item.endDate),
    );
    const allRelics = listOf(data.relics);
    const relics = allRelics.filter((item): item is RelicSet =>
      isRecord(item) && isStr(item.id) && isStr(item.name) && isStr(item.category) &&
      isStr(item.effect2) &&
      (item.rarity === 2 || item.rarity === 3 || item.rarity === 4 || item.rarity === 5) &&
      inList(item.category, RELIC_CATEGORIES) && isDate(item.releaseDate),
    );
    const favorites = Array.isArray(data.favorites)
      ? data.favorites.filter((item): item is string => isStr(item))
      : [];

    // 图片 data URL 超限的条目跳过（与管理页上传的 1MB 上限一致）
    const oversized = (value: unknown) =>
      typeof value === 'string' &&
      value.startsWith('data:') &&
      value.length > MAX_IMAGE_DATA_URL_LENGTH;
    const validCharacters = characters.filter((c) => !oversized(c.avatar));
    const validLightCones = lightCones.filter((c) => !oversized(c.image));
    const skipped =
      allCharacters.length - validCharacters.length +
      (allLightCones.length - validLightCones.length) +
      (allNewsEvents.length - newsEvents.length) +
      (allRelics.length - relics.length);

    if (
      validCharacters.length +
        validLightCones.length +
        newsEvents.length +
        relics.length +
        favorites.length ===
      0
    ) {
      void alertDialog(
        '文件中未找到可导入的数据（需要 characters / lightCones / relics / newsEvents / favorites 字段）。',
        '无可导入数据',
      );
      return;
    }
    const confirmed = await confirmDialog({
      title: '确认导入？',
      message:
        `将导入：角色 ${validCharacters.length} 名、光锥 ${validLightCones.length} 件、遗器 ${relics.length} 套、资讯 ${newsEvents.length} 条` +
        (favorites.length ? `、收藏 ${favorites.length} 条` : '') +
        '.' +
        (newerThanApp ? '\n注意：该备份来自更新版本的站点，新字段将被忽略。' : '') +
        (skipped > 0 ? `\n另有 ${skipped} 条校验未通过（枚举 / 日期格式 / 图片超限）的条目将被跳过。` : '') +
        '\n与现有数据 id 相同的条目会被覆盖，其余保留。',
      confirmText: '导入',
    });
    if (!confirmed) return;

    await db.transaction(
      'rw',
      [db.characters, db.lightCones, db.newsEvents, db.relics],
      async () => {
        if (validCharacters.length) await db.characters.bulkPut(validCharacters);
        if (validLightCones.length) await db.lightCones.bulkPut(validLightCones);
        if (newsEvents.length) await db.newsEvents.bulkPut(newsEvents);
        if (relics.length) await db.relics.bulkPut(relics);
      },
    );
    // 收藏与现有收藏集合并（并集），不覆盖丢失
    if (favorites.length) await mergeFavorites(favorites);
    void alertDialog('导入完成，页面数据已实时更新。', '导入成功');
  } catch {
    void alertDialog('文件不是有效的备份 JSON。', '导入失败');
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
