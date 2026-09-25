import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { parseImageRef } from '../lib/imageRef';

/** objectURL 按 Blob 主键缓存（Blob 内容不可变，会话期内无需 revoke） */
const objectUrlCache = new Map<string, string>();

function toObjectUrl(id: string, blob: Blob): string {
  const cached = objectUrlCache.get(id);
  if (cached) return cached;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

/**
 * 解析实体图片字段为可直接用于 <img src> 的地址：
 * - 远程 URL / data URL 原样返回；
 * - idb: 引用从 images 表加载 Blob 并转为 objectURL（加载中返回 undefined，展示占位）。
 */
export function useEntityImage(src: string | undefined): string | undefined {
  const ref = parseImageRef(src);
  const row = useLiveQuery(
    async () => (ref ? await db.images.get(ref) : undefined),
    [ref],
  );
  if (!src) return undefined;
  if (!ref) return src;
  return row ? toObjectUrl(row.id, row.blob) : undefined;
}
