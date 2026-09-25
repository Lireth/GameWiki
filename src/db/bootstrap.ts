import { characterSeed, lightConeSeed, newsEventSeed } from '../data/seed';
import { db } from './db';

/**
 * 应用启动时调用：对应表为空且存在种子数据时才写入，
 * 避免重复插入，也便于用户随时手动清空数据库。
 */
export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.open();
    await Promise.all([
      db.characters.count().then((count) => {
        if (count === 0 && characterSeed.length > 0) {
          return db.characters.bulkAdd(characterSeed);
        }
      }),
      db.lightCones.count().then((count) => {
        if (count === 0 && lightConeSeed.length > 0) {
          return db.lightCones.bulkAdd(lightConeSeed);
        }
      }),
      db.newsEvents.count().then((count) => {
        if (count === 0 && newsEventSeed.length > 0) {
          return db.newsEvents.bulkAdd(newsEventSeed);
        }
      }),
    ]);
  } catch (error) {
    console.error('[wiki] 本地数据库初始化失败：', error);
  }
}
