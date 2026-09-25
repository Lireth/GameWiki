import { describe, expect, it } from 'vitest';
import { PATH_IDS } from '../db/types';
import { buildVersionGroups, PATH_META } from './meta';

describe('PATH_META', () => {
  it('每个命途 ID 都有元数据（查表渲染依赖此完整性）', () => {
    for (const id of PATH_IDS) {
      expect(PATH_META[id]).toBeDefined();
      expect(PATH_META[id].label).toBeTruthy();
      expect(PATH_META[id].color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('buildVersionGroups', () => {
  it('无数据时返回常显配置原样', () => {
    const groups = buildVersionGroups([]);
    expect(groups.map((g) => g.major)).toEqual(['1', '2', '3', '4']);
    expect(groups[0].values).toEqual(['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
  });

  it('数据中的新版本追加到对应大版本分组末尾', () => {
    const groups = buildVersionGroups(['4.7']);
    const g4 = groups.find((g) => g.major === '4')!;
    expect(g4.values[g4.values.length - 1]).toBe('4.7');
    expect(g4.values.filter((v) => v === '4.7')).toHaveLength(1);
  });

  it('未知大版本号新建分组', () => {
    const groups = buildVersionGroups(['5.0']);
    expect(groups.map((g) => g.major)).toEqual(['1', '2', '3', '4', '5']);
    expect(groups[4].values).toEqual(['5.0']);
  });

  it('版本按数值排序（4.10 排在 4.9 之后）', () => {
    const groups = buildVersionGroups(['4.10', '4.9']);
    const g4 = groups.find((g) => g.major === '4')!;
    expect(g4.values.indexOf('4.10')).toBeGreaterThan(g4.values.indexOf('4.9'));
  });

  it('去重并忽略空值', () => {
    const groups = buildVersionGroups(['2.7', '2.7', undefined]);
    const g2 = groups.find((g) => g.major === '2')!;
    expect(g2.values.filter((v) => v === '2.7')).toHaveLength(1);
    expect(groups.map((g) => g.major)).toEqual(['1', '2', '3', '4']);
  });

  it('extraVersions（URL 残留的已选版本）同样参与合并', () => {
    const groups = buildVersionGroups([], ['4.7', '9.9']);
    expect(groups.map((g) => g.major)).toEqual(['1', '2', '3', '4', '9']);
    expect(groups.find((g) => g.major === '4')!.values).toContain('4.7');
    expect(groups.find((g) => g.major === '9')!.values).toEqual(['9.9']);
  });
});
