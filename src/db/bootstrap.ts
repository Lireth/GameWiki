import {
  characterSeed,
  lightConeSeed,
  newsEventSeed,
  relicSeed,
  SEED_VERSION,
} from '../data/seed';
import { db } from './db';
import { loadFavorites } from '../lib/favorites';

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
 * 应用启动时调用：
 * - 对应表为空且存在种子数据时全量写入；
 * - 表非空但种子版本落后时按 id 增量更新（bulkPut，不删除表中额外条目）；
 * - 失败时记录状态供界面提示，不阻塞页面渲染。
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.open();
    // 收藏与种子数据同源加载（含旧 localStorage 数据的一次性迁移）
    await loadFavorites();
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
    setStatus('ok');
  } catch (error) {
    console.error('[wiki] 本地数据库初始化失败：', error);
    setStatus('failed');
  }
}
