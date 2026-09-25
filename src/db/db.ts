import Dexie, { type Table } from 'dexie';
import type { Character, ImageBlob, LightCone, NewsEvent, RelicSet } from './types';

/**
 * 本地数据库：所有页面数据都存放在浏览器 IndexedDB 中，
 * 与页面代码分离，方便日后录入真实数据或切换为远程 API。
 */
export class WikiDatabase extends Dexie {
  characters!: Table<Character, string>;
  lightCones!: Table<LightCone, string>;
  newsEvents!: Table<NewsEvent, string>;
  /** 键值元数据（如种子数据版本号、收藏集合） */
  meta!: Table<{ key: string; value: string }, string>;
  relics!: Table<RelicSet, string>;
  /** 本地图片 Blob（业务表以 idb: 前缀引用，见 lib/imageRef.ts） */
  images!: Table<ImageBlob, string>;

  constructor() {
    super('hsr-wiki');
    this.version(1).stores({
      characters:
        'id, name, rarity, path, element, gender, camp, faction, releaseDate',
      lightCones: 'id, name, rarity, path, releaseDate',
      newsEvents: 'id, type, date, endDate',
    });
    // v2：characters 增加 bodyType 索引（旧数据行无此字段，无需迁移）
    this.version(2).stores({
      characters:
        'id, name, rarity, path, element, gender, bodyType, camp, faction, releaseDate',
    });
    // v3：lightCones 增加 acquisition 索引（旧数据行无此字段，无需迁移）
    this.version(3).stores({
      lightCones: 'id, name, rarity, path, acquisition, releaseDate',
    });
    // v4：新增 meta 表，记录种子数据版本号（支持种子更新后的增量重灌）
    this.version(4).stores({ meta: 'key' });
    // v5：新增 relics 表（遗器图鉴）
    this.version(5).stores({
      relics: 'id, name, category, rarity, releaseVersion, releaseDate',
    });
    // v6：newsEvents 增加关联字段索引；新增 images 表（业务表图片改为 idb: 引用，
    // 旧的内联 data URL 由启动迁移转入 images 表）
    this.version(6).stores({
      newsEvents:
        'id, type, date, endDate, relatedCharacterId, relatedLightConeId, relatedRelicId',
      images: 'id',
    });
  }
}

export const db = new WikiDatabase();
