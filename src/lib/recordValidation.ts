/**
 * 记录级校验纯逻辑：JSON 导入（页脚备份恢复）与管理页批量录入共用，
 * 与表单字段校验（entryValidation）同口径 —— 必填字段 + 枚举白名单 +
 * 日期格式 + 图片体积。缺省（undefined）字段宽松放行以兼容旧版备份；
 * 每条记录返回第一条错误明细（批量录入展示）或经类型谓词做布尔过滤。
 */
import {
  ACQUISITION_TYPES,
  BODY_TYPES,
  ELEMENT_IDS,
  GENDERS,
  NEWS_EVENT_TYPES,
  PATH_IDS,
  RELIC_CATEGORIES,
  type Character,
  type LightCone,
  type NewsEvent,
  type RelicSet,
} from '../db/types';
import { DATE_PATTERN, MAX_IMAGE_DATA_URL_LENGTH } from './entryValidation';

/** 记录类型（与 pages/admin/schema.ts 的 EntryType 同构，供 lib 层使用） */
export type RecordType = 'character' | 'lightCone' | 'relic' | 'newsEvent';

const isStr = (value: unknown) => typeof value === 'string';
const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && item !== null;

/** 枚举字段宽松校验：缺省（旧版备份）放行，出现时必须在白名单内 */
function inList(value: unknown, ids: readonly string[]): boolean {
  return value === undefined || (isStr(value) && ids.includes(value));
}

/** 可选日期字段：缺省放行，出现时必须为 YYYY-MM-DD */
function optionalDateOk(value: unknown): boolean {
  return value === undefined || (isStr(value) && DATE_PATTERN.test(value));
}

/** data URL 图片体积上限（与管理页上传的 1MB 上限一致） */
function imageOk(value: unknown): boolean {
  return !(
    isStr(value) &&
    value.startsWith('data:') &&
    value.length > MAX_IMAGE_DATA_URL_LENGTH
  );
}

function enumMessage(label: string, value: unknown): string {
  return `${label}取值无效（${String(value)}）`;
}

export function characterRecordError(item: unknown): string | null {
  if (!isRecord(item)) return '记录不是对象';
  if (!isStr(item.id)) return '缺少 ID';
  if (!isStr(item.name)) return '缺少名称';
  if (!isStr(item.path)) return '缺少命途';
  if (!isStr(item.element)) return '缺少战斗属性';
  if (item.rarity !== 4 && item.rarity !== 5) {
    return `稀有度取值无效（${String(item.rarity)}），应为 4★ 或 5★`;
  }
  if (!isStr(item.releaseDate)) return '缺少实装日期';
  if (!isStr(item.releaseVersion)) return '缺少实装版本';
  if (!inList(item.path, PATH_IDS)) return enumMessage('命途', item.path);
  if (!inList(item.element, ELEMENT_IDS)) return enumMessage('战斗属性', item.element);
  if (!inList(item.gender, GENDERS)) return enumMessage('性别', item.gender);
  if (!inList(item.bodyType, BODY_TYPES)) return enumMessage('体型', item.bodyType);
  if (!DATE_PATTERN.test(item.releaseDate)) return '实装日期格式应为 YYYY-MM-DD';
  if (!imageOk(item.avatar)) return '头像图片超过 1MB 上限';
  return null;
}

export function lightConeRecordError(item: unknown): string | null {
  if (!isRecord(item)) return '记录不是对象';
  if (!isStr(item.id)) return '缺少 ID';
  if (!isStr(item.name)) return '缺少名称';
  if (!isStr(item.path)) return '缺少命途';
  if (item.rarity !== 3 && item.rarity !== 4 && item.rarity !== 5) {
    return `稀有度取值无效（${String(item.rarity)}），应为 3-5★`;
  }
  if (!inList(item.path, PATH_IDS)) return enumMessage('命途', item.path);
  if (!inList(item.acquisition, ACQUISITION_TYPES)) {
    return enumMessage('获取方式', item.acquisition);
  }
  if (!optionalDateOk(item.releaseDate)) return '实装日期格式应为 YYYY-MM-DD';
  if (!imageOk(item.image)) return '图片超过 1MB 上限';
  return null;
}

export function relicRecordError(item: unknown): string | null {
  if (!isRecord(item)) return '记录不是对象';
  if (!isStr(item.id)) return '缺少 ID';
  if (!isStr(item.name)) return '缺少套装名称';
  if (!isStr(item.category)) return '缺少类别';
  if (!isStr(item.effect2)) return '缺少二件套效果';
  if (
    item.rarity !== 2 &&
    item.rarity !== 3 &&
    item.rarity !== 4 &&
    item.rarity !== 5
  ) {
    return `稀有度取值无效（${String(item.rarity)}），应为 2-5★`;
  }
  if (!inList(item.category, RELIC_CATEGORIES)) {
    return enumMessage('类别', item.category);
  }
  if (!optionalDateOk(item.releaseDate)) return '实装日期格式应为 YYYY-MM-DD';
  if (!imageOk(item.image)) return '图片超过 1MB 上限';
  return null;
}

export function newsEventRecordError(item: unknown): string | null {
  if (!isRecord(item)) return '记录不是对象';
  if (!isStr(item.id)) return '缺少 ID';
  if (!isStr(item.type)) return '缺少事件类型';
  if (!isStr(item.title)) return '缺少标题';
  if (!isStr(item.date)) return '缺少开始日期';
  if (!inList(item.type, NEWS_EVENT_TYPES)) {
    return enumMessage('事件类型', item.type);
  }
  if (!DATE_PATTERN.test(item.date)) return '开始日期格式应为 YYYY-MM-DD';
  if (!optionalDateOk(item.endDate)) return '结束日期格式应为 YYYY-MM-DD';
  return null;
}

/** 统一入口：返回第一条错误明细（null = 有效），批量录入逐条展示用 */
export function recordError(type: RecordType, item: unknown): string | null {
  switch (type) {
    case 'character':
      return characterRecordError(item);
    case 'lightCone':
      return lightConeRecordError(item);
    case 'relic':
      return relicRecordError(item);
    case 'newsEvent':
      return newsEventRecordError(item);
  }
}

/* ---------------- 类型谓词（导入过滤用） ---------------- */

export const isCharacterRecord = (item: unknown): item is Character =>
  characterRecordError(item) === null;

export const isLightConeRecord = (item: unknown): item is LightCone =>
  lightConeRecordError(item) === null;

export const isRelicRecord = (item: unknown): item is RelicSet =>
  relicRecordError(item) === null;

export const isNewsEventRecord = (item: unknown): item is NewsEvent =>
  newsEventRecordError(item) === null;
