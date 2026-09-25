import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

// 种子数据用固定假数据替代（真实 seed 为空数组），以覆盖 bootstrap 的写入与重灌分支
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
  SEED_VERSION: 2,
}));

import { bootstrapDatabase } from './bootstrap';
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

describe('bootstrapDatabase（fake-indexeddb 集成）', () => {
  it('空表时全量写入种子并记录种子版本', async () => {
    await bootstrapDatabase();

    expect(await db.characters.count()).toBe(1);
    expect(await db.lightCones.count()).toBe(1);
    expect(await db.newsEvents.count()).toBe(1);
    const meta = await db.meta.get('seedVersion');
    expect(meta?.value).toBe('2');
  });

  it('种子版本未变时不重复写入，用户修改保留', async () => {
    await bootstrapDatabase();
    await db.characters.put({ ...SEELE, name: '改过的希儿' });

    await bootstrapDatabase();

    const character = await db.characters.get('seele');
    expect(character?.name).toBe('改过的希儿');
    expect(await db.characters.count()).toBe(1);
  });

  it('种子版本落后时按 id 增量更新：种子条目恢复、额外条目保留', async () => {
    await bootstrapDatabase();
    // 模拟旧版本数据：手动降版本号 + 篡改种子条目 + 追加一条不在种子中的数据
    await db.meta.put({ key: 'seedVersion', value: '1' });
    await db.characters.put({ ...SEELE, name: '旧数据' });
    await db.characters.put({ ...SEELE, id: 'extra', name: '额外角色' });

    await bootstrapDatabase();

    const restored = await db.characters.get('seele');
    expect(restored?.name).toBe('希儿'); // 被种子覆盖
    const extra = await db.characters.get('extra');
    expect(extra?.name).toBe('额外角色'); // 不在种子中的条目不受影响
    expect(await db.characters.count()).toBe(2);
    const meta = await db.meta.get('seedVersion');
    expect(meta?.value).toBe('2');
  });

  it('重复初始化幂等，不产生重复数据', async () => {
    await bootstrapDatabase();
    await bootstrapDatabase();
    await bootstrapDatabase();

    expect(await db.characters.count()).toBe(1);
    expect(await db.lightCones.count()).toBe(1);
    expect(await db.newsEvents.count()).toBe(1);
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
