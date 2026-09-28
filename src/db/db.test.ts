import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

// 种子数据用固定假数据替代，以覆盖 bootstrap 的写入与重灌分支
// （与 src/data/seed.ts 同构，含真实内容时同样适用）
vi.mock('../data/seed', () => ({
  characterSeed: [
    {
      id: 'seele',
      name: '希儿',
      rarity: 5,
      path: 'hunt',
      element: 'quantum',
      faction: '星穹列车',
      camp: '雅利洛-VI',
      gender: 'female',
      bodyType: 'youngFemale',
      releaseDate: '2026-01-01',
      releaseVersion: '1.0',
    },
  ],
  lightConeSeed: [
    { id: 'lc-cruel', name: '残酷的夜', rarity: 5, path: 'hunt' },
  ],
  relicSeed: [],
  newsEventSeed: [
    {
      id: 'ev-seele',
      type: 'character',
      title: '希儿实装',
      date: '2026-01-01',
      relatedCharacterId: 'seele',
    },
  ],
}));

import { bootstrapDatabase, addSeedTombstones, removeSeedTombstones, SEED_HASH_KEY } from './bootstrap';
import { db } from './db';
import type { Character } from './types';

const SEELE: Character = {
  id: 'seele',
  name: '希儿',
  rarity: 5,
  path: 'hunt',
  element: 'quantum',
  faction: '星穹列车',
  camp: '雅利洛-VI',
  gender: 'female' as const,
  bodyType: 'youngFemale' as const,
  releaseDate: '2026-01-01',
  releaseVersion: '1.0',
};

beforeEach(async () => {
  // 每个用例从空库开始（Dexie 会在下次 open 时按 schema 重建）
  await db.delete();
});

/** 首次 bootstrap 后把内容指纹标记为过期，下次启动触发种子增量同步 */
async function markSeedStale() {
  const row = await db.meta.get(SEED_HASH_KEY);
  await db.meta.put({ key: SEED_HASH_KEY, value: `stale-${row?.value ?? ''}` });
}

describe('bootstrapDatabase（fake-indexeddb 集成）', () => {
  it('空表时全量写入种子并记录内容指纹', async () => {
    await bootstrapDatabase();

    expect(await db.characters.count()).toBe(1);
    expect(await db.lightCones.count()).toBe(1);
    expect(await db.newsEvents.count()).toBe(1);
    const hash = await db.meta.get(SEED_HASH_KEY);
    expect(hash?.value).toBeTruthy();
    // 旧版手动版本号键已被内容指纹取代
    expect(await db.meta.get('seedVersion')).toBeUndefined();
  });

  it('种子内容未变时不重复写入，用户修改保留', async () => {
    await bootstrapDatabase();
    await db.characters.put({ ...SEELE, name: '改过的希儿' });

    await bootstrapDatabase();

    const character = await db.characters.get('seele');
    expect(character?.name).toBe('改过的希儿');
    expect(await db.characters.count()).toBe(1);
  });

  it('种子内容变化时按 id 增量更新：种子条目恢复、额外条目保留', async () => {
    await bootstrapDatabase();
    const hash = (await db.meta.get(SEED_HASH_KEY))?.value;
    // 模拟旧版本数据：指纹标记为过期 + 篡改种子条目 + 追加一条不在种子中的数据
    await markSeedStale();
    await db.characters.put({ ...SEELE, name: '旧数据' });
    await db.characters.put({ ...SEELE, id: 'extra', name: '额外角色' });

    await bootstrapDatabase();

    const restored = await db.characters.get('seele');
    expect(restored?.name).toBe('希儿'); // 被种子覆盖
    const extra = await db.characters.get('extra');
    expect(extra?.name).toBe('额外角色'); // 不在种子中的条目不受影响
    expect(await db.characters.count()).toBe(2);
    // 同步完成后指纹回写为当前内容哈希
    expect((await db.meta.get(SEED_HASH_KEY))?.value).toBe(hash);
  });

  it('重复初始化幂等，不产生重复数据', async () => {
    await bootstrapDatabase();
    await bootstrapDatabase();
    await bootstrapDatabase();

    expect(await db.characters.count()).toBe(1);
    expect(await db.lightCones.count()).toBe(1);
    expect(await db.newsEvents.count()).toBe(1);
  });

  it('表被清空而指纹未变时仍重新灌入种子（bulkPut 幂等覆盖，兼容并发首启窗口）', async () => {
    await bootstrapDatabase();
    // 模拟极端情况：另一标签页并发首启时本页读到空表（count 读取与写入
    // 之间存在窗口）。bulkPut 覆盖相同数据无副作用，不会像 bulkAdd 那样
    // 因主键冲突抛 ConstraintError 误报初始化失败
    await db.characters.clear();

    await bootstrapDatabase();

    expect((await db.characters.get('seele'))?.name).toBe('希儿');
    expect(await db.characters.count()).toBe(1);
  });
});

describe('种子删除墓碑', () => {
  it('被删除的种子条目在种子更新时不会被复活', async () => {
    await bootstrapDatabase();
    // 模拟管理页删除：删记录 + 记墓碑（AdminPage.remove 在同一事务内完成这两步）
    await db.characters.delete('seele');
    await addSeedTombstones(['characters:seele']);
    await markSeedStale();

    await bootstrapDatabase();

    expect(await db.characters.get('seele')).toBeUndefined();
    // 无墓碑的其它表照常增量同步
    expect((await db.lightCones.get('lc-cruel'))?.name).toBe('残酷的夜');
  });

  it('墓碑条目重新保存（同 id 录入 / 备份导入）后恢复种子同步资格', async () => {
    await bootstrapDatabase();
    await db.characters.delete('seele');
    await addSeedTombstones(['characters:seele']);
    // 模拟重新录入：removeSeedTombstones 由 AdminPage.save / Footer.importData 调用
    await removeSeedTombstones(['characters:seele']);
    await markSeedStale();

    await bootstrapDatabase();

    expect((await db.characters.get('seele'))?.name).toBe('希儿');
  });

  it('种子已不再包含的条目，其墓碑随种子更新被清理', async () => {
    await bootstrapDatabase();
    await addSeedTombstones(['characters:ghost-id']);
    await markSeedStale();

    await bootstrapDatabase();

    const row = await db.meta.get('seedTombstones');
    expect(JSON.parse(row?.value ?? '[]')).toEqual([]);
  });

  it('重复墓碑写入幂等，不产生冗余 meta 更新', async () => {
    await db.open();
    await addSeedTombstones(['characters:seele']);
    const first = await db.meta.get('seedTombstones');
    await addSeedTombstones(['characters:seele']);
    const second = await db.meta.get('seedTombstones');

    expect(first).toEqual(second);
  });
});

describe('内联图片迁移（v6）', () => {
  it('data URL 头像迁入 images 表并改写为 idb: 引用，迁移幂等', async () => {
    const DATA_URL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await db.open();
    // 用不在种子中的 id，避免种子增量重灌覆盖测试记录
    await db.characters.put({ ...SEELE, id: 'extra-img', avatar: DATA_URL });

    await bootstrapDatabase();

    const migrated = await db.characters.get('extra-img');
    expect(migrated?.avatar).toBe('idb:img-character:extra-img');
    const image = await db.images.get('img-character:extra-img');
    expect(image?.blob).toBeInstanceOf(Blob);

    // 再次启动不重复迁移（字段已是 idb: 引用）
    await bootstrapDatabase();
    expect(await db.images.count()).toBe(1);
  });

  it('启动时回收业务表未引用的孤儿图片', async () => {
    await db.open();
    // 一条被引用的图片 + 一条孤儿图片（用不在种子中的 id，避免种子重灌干扰）
    await db.characters.put({ ...SEELE, id: 'extra-img', avatar: 'idb:img-keep' });
    await db.images.bulkPut([
      { id: 'img-keep', blob: new Blob(['keep']) },
      { id: 'img-orphan', blob: new Blob(['orphan']) },
    ]);

    await bootstrapDatabase();

    expect(await db.images.get('img-keep')).toBeTruthy();
    expect(await db.images.get('img-orphan')).toBeUndefined();
  });
});
