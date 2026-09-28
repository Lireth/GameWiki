/**
 * 集合差纯逻辑（版本对比页共用）：按主键把两个列表分为
 * 仅 A、仅 B、共有三组。独立于 React 便于单元测试。
 */

export interface DiffResult<T> {
  /** 仅存在于 A 的条目（保持 A 的顺序） */
  onlyA: T[];
  /** 仅存在于 B 的条目（保持 B 的顺序） */
  onlyB: T[];
  /** 两个列表都有的条目（按 A 的顺序） */
  shared: T[];
}

export function diffById<T>(
  a: readonly T[],
  b: readonly T[],
  key: (item: T) => string,
): DiffResult<T> {
  const bKeys = new Set(b.map(key));
  const aKeys = new Set(a.map(key));

  const onlyA: T[] = [];
  const shared: T[] = [];
  for (const item of a) {
    if (bKeys.has(key(item))) shared.push(item);
    else onlyA.push(item);
  }
  const onlyB = b.filter((item) => !aKeys.has(key(item)));

  return { onlyA, onlyB, shared };
}
