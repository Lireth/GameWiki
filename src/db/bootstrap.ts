import {
  characterSeed,
  lightConeSeed,
  newsEventSeed,
  relicSeed,
  SEED_VERSION,
} from '../data/seed';
import Dexie from 'dexie';
import { db } from './db';
import { loadFavorites } from '../lib/favorites';
import { IDB_IMAGE_PREFIX, dataURLToBlob } from '../lib/imageRef';

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
 * 应用启动时调用：
 * - 对应表为空且存在种子数据时全量写入；
 * - 表非空但种子版本落后时按 id 增量更新（bulkPut，不删除表中额外条目）；
 * - 失败时记录状态供界面提示，不阻塞页面渲染。
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.open();
    const stored = await db.meta.get('seedVersion');
    const storedVersion = stored ? Number(stored.value) : 0;
    const seedChanged = storedVersion < SEED_VERSION;

    await Promise.all([
      db.characters.count().then((count) => {
        if (count === 0 && characterSeed.length > 0) {
          return db.characters.bulkAdd(characterSeed);
        }
        if (count > 0 && seedChanged) {
          return db.characters.bulkPut(characterSeed);
        }
      }),
      db.lightCones.count().then((count) => {
        if (count === 0 && lightConeSeed.length > 0) {
          return db.lightCones.bulkAdd(lightConeSeed);
        }
        if (count > 0 && seedChanged) {
          return db.lightCones.bulkPut(lightConeSeed);
        }
      }),
      db.newsEvents.count().then((count) => {
        if (count === 0 && newsEventSeed.length > 0) {
          return db.newsEvents.bulkAdd(newsEventSeed);
        }
        if (count > 0 && seedChanged) {
          return db.newsEvents.bulkPut(newsEventSeed);
        }
      }),
      db.relics.count().then((count) => {
        if (count === 0 && relicSeed.length > 0) {
          return db.relics.bulkAdd(relicSeed);
        }
        if (count > 0 && seedChanged) {
          return db.relics.bulkPut(relicSeed);
        }
      }),
    ]);
    if (seedChanged) {
      await db.meta.put({ key: 'seedVersion', value: String(SEED_VERSION) });
    }
    await migrateInlineImages();
    await loadFavorites();
    setStatus('ok');
  } catch (error) {
    console.error('[wiki] 本地数据库初始化失败：', error);
    setStatus('failed');
  }
}
