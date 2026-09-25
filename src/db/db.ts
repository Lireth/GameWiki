import Dexie, { type Table } from 'dexie';
import type { Character, LightCone, NewsEvent } from './types';

/**
 * 本地数据库：所有页面数据都存放在浏览器 IndexedDB 中，
 * 与页面代码分离，方便日后录入真实数据或切换为远程 API。
 */
export class WikiDatabase extends Dexie {
  characters!: Table<Character, string>;
  lightCones!: Table<LightCone, string>;
  newsEvents!: Table<NewsEvent, string>;
  /** 键值元数据（如种子数据版本号） */
  meta!: Table<{ key: string; value: string }, string>;

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
  }
}

export const db = new WikiDatabase();
