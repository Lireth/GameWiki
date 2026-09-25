import { describe, expect, it } from 'vitest';
import {
  MAX_IMAGE_DATA_URL_LENGTH,
  collectEntryFieldErrors,
  parseAliases,
  validateDateRange,
  validateEntryFields,
  validateRelatedIds,
  type EntryFieldSpec,
} from './entryValidation';

const FIELDS: EntryFieldSpec[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true },
  { name: 'releaseDate', label: '实装日期', kind: 'date', required: true },
  { name: 'path', label: '命途', kind: 'choice', values: ['hunt', 'harmony'] },
  { name: 'avatar', label: '头像图片', kind: 'image' },
];

describe('validateEntryFields', () => {
  it('全部通过时返回 null', () => {
    expect(
      validateEntryFields(FIELDS, {
        id: 'seele',
        releaseDate: '2026-09-25',
        path: 'hunt',
      }),
    ).toBeNull();
  });

  it('必填字段缺失时提示字段名', () => {
    expect(validateEntryFields(FIELDS, { releaseDate: '2026-09-25' })).toBe(
      '请填写「ID」',
    );
  });

  it('日期字段格式非法时报错', () => {
    expect(
      validateEntryFields(FIELDS, { id: 'a', releaseDate: '2026/09/25' }),
    ).toBe('「实装日期」格式应为 YYYY-MM-DD');
  });

  it('choice 字段取值必须在白名单内', () => {
    expect(
      validateEntryFields(FIELDS, { id: 'a', releaseDate: '2026-09-25', path: 'hunt' }),
    ).toBeNull();
    expect(
      validateEntryFields(FIELDS, { id: 'a', releaseDate: '2026-09-25', path: 'destruction' }),
    ).toBe('「命途」的取值无效，请重新选择');
  });

  it('image 字段仅限制 data URL 体积，不限制外部 URL 长度', () => {
    const longBinary = 'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_DATA_URL_LENGTH);
    const form = { id: 'a', releaseDate: '2026-09-25', avatar: longBinary };
    expect(validateEntryFields(FIELDS, form)).toBe(
      '「头像图片」图片超过 1MB 上限，请压缩后再上传',
    );

    const longExternal = 'https://example.com/' + 'A'.repeat(MAX_IMAGE_DATA_URL_LENGTH);
    expect(
      validateEntryFields(FIELDS, { id: 'a', releaseDate: '2026-09-25', avatar: longExternal }),
    ).toBeNull();
  });
});

describe('validateDateRange', () => {
  it('结束日期早于开始日期时报错，相等 / 缺省通过', () => {
    expect(validateDateRange('2026-09-25', '2026-09-20')).toBe(
      '「结束日期」不能早于「开始日期」',
    );
    expect(validateDateRange('2026-09-25', '2026-09-25')).toBeNull();
    expect(validateDateRange('2026-09-25', undefined)).toBeNull();
    expect(validateDateRange(undefined, '2026-09-25')).toBeNull();
  });
});

describe('validateRelatedIds', () => {
  const chars = new Set(['seele']);
  const cones = new Set(['lc1']);
  const relics = new Set(['relic1']);

  it('关联 id 存在或缺省时通过', () => {
    expect(validateRelatedIds({ relatedCharacterId: 'seele' }, chars, cones, relics)).toBeNull();
    expect(validateRelatedIds({}, chars, cones, relics)).toBeNull();
  });

  it('关联 id 不存在时报错', () => {
    expect(validateRelatedIds({ relatedCharacterId: 'nope' }, chars, cones, relics)).toBe(
      '关联角色的 ID 不存在，请重新选择',
    );
    expect(validateRelatedIds({ relatedLightConeId: 'nope' }, chars, cones, relics)).toBe(
      '关联光锥的 ID 不存在，请重新选择',
    );
    expect(validateRelatedIds({ relatedRelicId: 'nope' }, chars, cones, relics)).toBe(
      '关联遗器的 ID 不存在，请重新选择',
    );
  });
});

describe('collectEntryFieldErrors', () => {
  it('收集全部字段错误并按字段名索引', () => {
    const errors = collectEntryFieldErrors(FIELDS, {
      id: '',
      releaseDate: '2026/01/01',
      path: 'destruction',
      avatar: '',
    });
    expect(Object.keys(errors).sort()).toEqual(['id', 'path', 'releaseDate']);
    expect(errors.id).toBe('请填写「ID」');
    expect(errors.releaseDate).toBe('「实装日期」格式应为 YYYY-MM-DD');
  });

  it('无错误时返回空对象', () => {
    expect(
      collectEntryFieldErrors(FIELDS, {
        id: 'seele',
        releaseDate: '2026-01-01',
        path: 'hunt',
        avatar: '',
      }),
    ).toEqual({});
  });
});

describe('parseAliases', () => {
  it('按行解析并去除空项与首尾空白', () => {
    expect(parseAliases('Seele\n  希儿  \n\nワイルドファイア')).toEqual([
      'Seele',
      '希儿',
      'ワイルドファイア',
    ]);
  });

  it('兼容逗号与顿号分隔', () => {
    expect(parseAliases('Seele，希儿、Wildfire')).toEqual([
      'Seele',
      '希儿',
      'Wildfire',
    ]);
  });

  it('精确去重（大小写敏感）；全空时返回 undefined', () => {
    expect(parseAliases('Seele\nseele\n Seele ')).toEqual(['Seele', 'seele']);
    expect(parseAliases('')).toBeUndefined();
    expect(parseAliases(undefined)).toBeUndefined();
    expect(parseAliases('　')).toBeUndefined();
  });
});
