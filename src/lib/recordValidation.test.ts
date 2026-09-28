import { describe, expect, it } from 'vitest';
import {
  characterRecordError,
  isCharacterRecord,
  isNewsEventRecord,
  newsEventRecordError,
  recordError,
} from './recordValidation';

const validCharacter = {
  id: 'seele',
  name: '希儿',
  rarity: 5,
  path: 'hunt',
  element: 'quantum',
  releaseDate: '2026-01-01',
  releaseVersion: '1.0',
};

describe('characterRecordError', () => {
  it('合法记录返回 null，且类型谓词通过', () => {
    expect(characterRecordError(validCharacter)).toBeNull();
    expect(isCharacterRecord(validCharacter)).toBe(true);
  });

  it('逐项报告缺失必填字段', () => {
    expect(characterRecordError({})).toBe('缺少 ID');
    expect(characterRecordError({ id: 'x' })).toBe('缺少名称');
    expect(characterRecordError({ ...validCharacter, releaseVersion: undefined })).toBe(
      '缺少实装版本',
    );
  });

  it('枚举取值无效时报错，缺省放行（旧版备份兼容）', () => {
    expect(characterRecordError({ ...validCharacter, path: 'nope' })).toContain(
      '命途取值无效',
    );
    expect(
      characterRecordError({ ...validCharacter, gender: undefined }),
    ).toBeNull();
  });

  it('稀有度与日期格式校验', () => {
    expect(characterRecordError({ ...validCharacter, rarity: 3 })).toContain('稀有度');
    expect(characterRecordError({ ...validCharacter, releaseDate: '2026/1/1' })).toContain(
      'YYYY-MM-DD',
    );
  });
});

describe('newsEventRecordError', () => {
  const validEvent = { id: 'e1', type: 'banner', title: '卡池', date: '2026-02-01' };

  it('合法记录返回 null', () => {
    expect(newsEventRecordError(validEvent)).toBeNull();
    expect(isNewsEventRecord(validEvent)).toBe(true);
  });

  it('事件类型白名单与日期格式', () => {
    expect(newsEventRecordError({ ...validEvent, type: 'other' })).toContain('事件类型');
    expect(newsEventRecordError({ ...validEvent, endDate: '2026-2-1' })).toContain(
      'YYYY-MM-DD',
    );
  });
});

describe('recordError 统一入口', () => {
  it('按类型分发并校验超限图片', () => {
    expect(recordError('character', validCharacter)).toBeNull();
    expect(
      recordError('character', { ...validCharacter, avatar: `data:image/png;base64,${'a'.repeat(1_400_001)}` }),
    ).toContain('1MB');
    expect(recordError('lightCone', { id: 'x' })).toBe('缺少名称');
  });
});
