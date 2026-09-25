/**
 * 实体图片引用：业务表（characters / lightCones / relics）的 image 字段
 * 允许三种取值 —— 远程 URL、内联 data URL（仅导入/旧数据迁移期）、
 * 以及 idb:<imageId> 引用（本地 Blob 存于 images 表）。
 * 列表页只读取业务表，不再随记录加载图片载荷。
 */

export const IDB_IMAGE_PREFIX = 'idb:';

/** 解析 idb: 引用，非引用形式返回 null */
export function parseImageRef(src: string | undefined | null): string | null {
  if (src && src.startsWith(IDB_IMAGE_PREFIX)) {
    return src.slice(IDB_IMAGE_PREFIX.length);
  }
  return null;
}

/** 生成新的图片主键（上传时使用） */
export function makeImageKey(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** data URL → Blob（迁移 / 测试用） */
export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const response = await fetch(dataURL);
  return response.blob();
}

/** Blob → data URL（导出备份时还原为自包含 JSON） */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

/** 上传图片压缩：最长边不超过 maxEdge；PNG 保留透明度，其余转 JPEG */
export async function compressImageFile(file: File, maxEdge = 512): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    // 尺寸达标且体积不大时不再重编码
    if (scale === 1 && file.size <= 200 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, 0.85),
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}
