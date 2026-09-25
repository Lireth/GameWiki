import { db } from '../db/db';

/**
 * 收藏 / 心愿单存储：数据保存在 Dexie meta 表（键 favorites），
 * 随页脚「导出数据 / 导入数据」一起备份恢复，浏览器间迁移不再丢失。
 * 内存态 + 订阅者模式供 useSyncExternalStore 使用。
 */

/** 收藏 id 带表前缀，避免角色 / 光锥 / 遗器的 id 冲突 */
export const FAVORITE_PREFIX = {
  character: 'c:',
  lightCone: 'lc:',
  relic: 'r:',
} as const;

const FAVORITES_META_KEY = 'favorites';
/** 旧版 localStorage 存储键（启动时迁移到 IndexedDB 后移除） */
const FAVORITES_LEGACY_KEY = 'hsr-wiki-favorites';

let favoriteState: ReadonlySet<string> = new Set();
let favoritesLoaded = false;
const favoriteListeners = new Set<() => void>();

function setFavoriteState(next: ReadonlySet<string>) {
  favoriteState = next;
  for (const listener of favoriteListeners) listener();
}

function parseFavoriteKeys(raw: string | null | undefined): string[] {
  try {
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function readLegacyFavorites(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    return parseFavoriteKeys(window.localStorage.getItem(FAVORITES_LEGACY_KEY));
  } catch {
    return [];
  }
}

/** 写入数据库并更新内存态；返回是否写库成功（失败时仅保留内存态，下次切换会重试） */
async function persistFavorites(next: ReadonlySet<string>): Promise<boolean> {
  setFavoriteState(next);
  try {
    await db.meta.put({
      key: FAVORITES_META_KEY,
      value: JSON.stringify([...next]),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 应用启动时调用（bootstrap 内）：从数据库载入收藏，
 * 并把旧版 localStorage 数据一次性迁移进数据库（写库成功后才清理旧键）。
 */
export async function loadFavorites(): Promise<void> {
  if (favoritesLoaded) return;
  favoritesLoaded = true;

  let stored: string[] = [];
  try {
    const row = await db.meta.get(FAVORITES_META_KEY);
    stored = parseFavoriteKeys(row?.value);
  } catch {
    /* 读取失败时按空集合处理 */
  }

  const legacy = readLegacyFavorites();
  const merged = new Set([...stored, ...legacy]);
  if (legacy.length === 0) {
    setFavoriteState(merged);
    return;
  }
  const persisted = await persistFavorites(merged);
  if (persisted) {
    try {
      window.localStorage.removeItem(FAVORITES_LEGACY_KEY);
    } catch {
      /* 清理失败不影响迁移结果，下次启动会再次尝试 */
    }
  }
}

export function getFavorites(): ReadonlySet<string> {
  return favoriteState;
}

export function subscribeFavorites(listener: () => void): () => void {
  favoriteListeners.add(listener);
  return () => {
    favoriteListeners.delete(listener);
  };
}

export function toggleFavorite(key: string) {
  const next = new Set(favoriteState);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  void persistFavorites(next);
}

/** 与现有收藏合并（导入备份时调用），持久化并通知订阅者 */
export async function mergeFavorites(keys: readonly string[]): Promise<void> {
  const next = new Set(favoriteState);
  for (const key of keys) next.add(key);
  await persistFavorites(next);
}
