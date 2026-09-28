import { describe, expect, it } from 'vitest';
import { diffById } from './compare';

interface Item {
  id: string;
  label: string;
}

const item = (id: string): Item => ({ id, label: `item-${id}` });

describe('diffById', () => {
  it('正确划分仅 A / 仅 B / 共有', () => {
    const result = diffById(
      [item('a'), item('common1'), item('b')],
      [item('common1'), item('c'), item('common2')],
      (i) => i.id,
    );
    expect(result.onlyA.map((i) => i.id)).toEqual(['a', 'b']);
    expect(result.onlyB.map((i) => i.id)).toEqual(['c', 'common2']);
    expect(result.shared.map((i) => i.id)).toEqual(['common1']);
  });

  it('空列表：一方为空时另一侧全部进入 only', () => {
    expect(diffById<Item>([], [item('x')], (i) => i.id).onlyB.map((i) => i.id)).toEqual(['x']);
    expect(diffById<Item>([item('x')], [], (i) => i.id).onlyA.map((i) => i.id)).toEqual(['x']);
    expect(diffById<Item>([], [], (i) => i.id)).toEqual({ onlyA: [], onlyB: [], shared: [] });
  });

  it('完全相同：全部进入 shared', () => {
    const list = [item('a'), item('b')];
    expect(diffById(list, [...list], (i) => i.id).shared).toHaveLength(2);
  });

  it('保持输入顺序', () => {
    const result = diffById(
      [item('c'), item('a')],
      [item('b'), item('a')],
      (i) => i.id,
    );
    expect(result.onlyA.map((i) => i.id)).toEqual(['c']);
    expect(result.onlyB.map((i) => i.id)).toEqual(['b']);
    expect(result.shared.map((i) => i.id)).toEqual(['a']);
  });
});
