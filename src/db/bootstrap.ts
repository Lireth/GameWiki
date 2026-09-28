import Dexie from 'dexie';
import { db } from './db';
import { loadFavorites } from '../lib/favorites';
import { IDB_IMAGE_PREFIX, dataURLToBlob, parseImageRef } from '../lib/imageRef';

export type BootstrapStatus = 'pending' | 'ok' | 'failed';

let status: BootstrapStatus = 'pending';
const listeners = new Set<() => void>();

function setStatus(next: BootstrapStatus) {
  status = next;
  for (const listener of listeners) listener();
}

/** 订阅初始化状态（配合 useSyncExternalStore 使用） */
export function subscribeBootstrap(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBootstrapStatus(): BootstrapStatus {
  return status;
}

/* ------------------------------------------------------------------ */
/* 种子删除墓碑（tombstone）                                            */
/* ------------------------------------------------------------------ */

/**
 * 管理页删除过的条目（`表名:id`）记录为墓碑，种子同步时跳过这些 id，
 * 防止种子内容更新时把已删除条目“复活”。存于 meta 表；
 * 重新录入同 id 条目（管理页保存 / 备份导入）即清除墓碑，恢复同步资格。
 * 注意：墓碑不随「导出数据」备份 —— 备份本身不含被删除的条目，语义自洽。
 */
const SEED_TOMBSTONES_KEY = 'seedTombstones';

/** 种子内容指纹的 meta 键（替代旧版手动维护的 seedVersion，后者启动时清理） */
export const SEED_HASH_KEY = 'seedHash';

function parseTombstones(raw: string | null | undefined): Set<string> {
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(list)
        ? list.filter((item): item is string => typeof item === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

async function loadSeedTombstones(): Promise<Set<string>> {
  try {
    const row = await db.meta.get(SEED_TOMBSTONES_KEY);
    return parseTombstones(row?.value);
  } catch {
    return new Set();
  }
}

async function saveSeedTombstones(refs: ReadonlySet<string>): Promise<void> {
  await db.meta.put({
    key: SEED_TOMBSTONES_KEY,
    value: JSON.stringify([...refs]),
  });
}

/** 记录删除墓碑（管理页删除时调用；处于事务内则随事务一起提交） */
export async function addSeedTombstones(refs: readonly string[]): Promise<void> {
  const tombstones = await loadSeedTombstones();
  const next = new Set(tombstones);
  let changed = false;
  for (const ref of refs) {
    if (!next.has(ref)) {
      next.add(ref);
      changed = true;
    }
  }
  if (changed) await saveSeedTombstones(next);
}

/** 清除墓碑（管理页重新保存 / 备份导入同 id 条目时调用），无变化时不写库 */
export async function removeSeedTombstones(
  refs: readonly string[],
): Promise<void> {
  const tombstones = await loadSeedTombstones();
  const next = new Set(tombstones);
  let changed = false;
  for (const ref of refs) {
    if (next.delete(ref)) changed = true;
  }
  if (changed) await saveSeedTombstones(next);
}

/* ------------------------------------------------------------------ */
/* 种子同步                                                            */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a 内容指纹：任一种子数组的内容变化都会改变哈希，
 * 替代手工递增 SEED_VERSION，消除“忘记 +1”导致种子更新不生效的人为失误。
 * 种子条目为字面量对象（键序构建期固定），同一构建产物哈希稳定；
 * 仅用于“是否有变化”判断，碰撞的最坏后果等价于忘记递增版本号。
 */
function hashSeeds(groups: readonly unknown[]): string {
  const json = JSON.stringify(groups);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * 单表种子同步：空表且存在有效种子数据时全量写入；
 * 表非空且种子内容变化时按 id 增量更新（不删除表中额外条目）。
 * 墓碑中的 id 一律跳过（对应条目已被用户删除）。
 */
async function seedTable<T extends { id: string }>(
  table: Dexie.Table<T, string>,
  seed: T[],
  seedChanged: boolean,
  tombstones: ReadonlySet<string>,
): Promise<void> {
  const prefix = `${table.name}:`;
  const active =
    tombstones.size > 0
      ? seed.filter((entry) => !tombstones.has(`${prefix}${entry.id}`))
      : seed;
  const count = await table.count();
  // 统一用 bulkPut（幂等覆盖）：count 读取与写入之间存在窗口，双标签页
  // 同时首启时后到者若用 bulkAdd 会因主键冲突抛 ConstraintError，
  // 被外层捕获后误报“初始化失败”；覆盖写入相同数据则无副作用
  if (active.length > 0 && (count === 0 || seedChanged)) {
    await table.bulkPut(active);
  }
}

/**
 * v6 迁移：把业务记录里内联的 data URL 图片转入 images 表，
 * 记录改存 idb: 引用 —— 列表页全表读取不再携带图片载荷。
 * 按字段是否仍为 data: 判断，幂等可重试；失败不阻塞主流程。
 */
async function migrateInlineImages(): Promise<void> {
  const moveImages = async <T extends { id: string }>(
    table: Dexie.Table<T, string>,
    getImage: (record: T) => string | undefined,
    withImageRef: (record: T, ref: string) => T,
    keyPrefix: string,
  ) => {
    const records = await table.toArray();
    for (const record of records) {
      const dataURL = getImage(record);
      if (!dataURL?.startsWith('data:')) continue;
      const key = `${keyPrefix}:${record.id}`;
      await db.images.put({ id: key, blob: await dataURLToBlob(dataURL) });
      await table.put(withImageRef(record, `${IDB_IMAGE_PREFIX}${key}`));
    }
  };

  try {
    await moveImages(db.characters, (c) => c.avatar, (c, ref) => ({ ...c, avatar: ref }), 'img-character');
    await moveImages(db.lightCones, (lc) => lc.image, (lc, ref) => ({ ...lc, image: ref }), 'img-lightCone');
    await moveImages(db.relics, (r) => r.image, (r, ref) => ({ ...r, image: ref }), 'img-relic');
  } catch (error) {
    // 迁移失败仅影响图片显示（记录仍保留原 data URL），下次启动会重试
    console.error('[wiki] 内联图片迁移失败：', error);
  }
}

/**
 * 回收孤儿图片：删除业务表不再引用的 images 行。
 * 上传后取消保存、表单中替换 / 清空图片字段都会留下无主 Blob，
 * 启动时（无未保存表单的安全窗口）统一清理，幂等。
 */
async function cleanupOrphanImages(): Promise<void> {
  try {
    const referenced = new Set<string>();
    const collect = (value: string | undefined) => {
      const ref = parseImageRef(value);
      if (ref) referenced.add(ref);
    };
    for (const record of await db.characters.toArray()) collect(record.avatar);
    for (const record of await db.lightCones.toArray()) collect(record.image);
    for (const record of await db.relics.toArray()) collect(record.image);

    const orphans: string[] = [];
    for (const image of await db.images.toArray()) {
      if (!referenced.has(image.id)) orphans.push(image.id);
    }
    if (orphans.length > 0) await db.images.bulkDelete(orphans);
  } catch (error) {
    console.error('[wiki] 孤儿图片回收失败：', error);
  }
}

/**
 * 应用启动时调用：
 * - 动态加载种子模块（独立 chunk，不进主包）；
 * - 逐表执行种子同步（见 seedTable），墓碑条目跳过；
 * - 失败时记录状态供界面提示，不阻塞页面渲染。
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.open();
    const { characterSeed, lightConeSeed, newsEventSeed, relicSeed } =
      await import('../data/seed');

    const tombstones = await loadSeedTombstones();
    const hash = hashSeeds([
      characterSeed,
      lightConeSeed,
      newsEventSeed,
      relicSeed,
    ]);
    const storedHash = (await db.meta.get(SEED_HASH_KEY))?.value;
    const seedChanged = storedHash !== hash;

    await Promise.all([
      seedTable(db.characters, characterSeed, seedChanged, tombstones),
      seedTable(db.lightCones, lightConeSeed, seedChanged, tombstones),
      seedTable(db.newsEvents, newsEventSeed, seedChanged, tombstones),
      seedTable(db.relics, relicSeed, seedChanged, tombstones),
    ]);
    if (seedChanged) {
      await db.meta.put({ key: SEED_HASH_KEY, value: hash });
      // 旧版手动种子版本号键已被内容指纹取代，清理遗留行
      await db.meta.delete('seedVersion');
      // 种子已不再包含的条目，其墓碑随之失效，一并清理
      const validRefs = new Set([
        ...characterSeed.map((c) => `characters:${c.id}`),
        ...lightConeSeed.map((lc) => `lightCones:${lc.id}`),
        ...newsEventSeed.map((e) => `newsEvents:${e.id}`),
        ...relicSeed.map((r) => `relics:${r.id}`),
      ]);
      const kept = [...tombstones].filter((ref) => validRefs.has(ref));
      if (kept.length !== tombstones.size) {
        await saveSeedTombstones(new Set(kept));
      }
    }
    await migrateInlineImages();
    await cleanupOrphanImages();
    await loadFavorites();
    setStatus('ok');
  } catch (error) {
    console.error('[wiki] 本地数据库初始化失败：', error);
    setStatus('failed');
  }
}
