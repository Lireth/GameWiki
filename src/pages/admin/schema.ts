/**
 * 管理页条目 schema 与纯逻辑：字段定义、表单状态互转、摘要展示、
 * 业务表映射。独立于 React 便于复用与测试；组件在 ./AdminPage.tsx。
 */
import { db } from '../../db/db';
import {
  ACQUISITION_TYPES,
  BODY_TYPES,
  ELEMENT_IDS,
  GENDERS,
  NEWS_EVENT_TYPES,
  PATH_IDS,
  RELIC_CATEGORIES,
  RELIC_SLOTS,
  type Character,
  type LightCone,
  type NewsEvent,
  type RelicSet,
} from '../../db/types';
import { parseImageRef } from '../../lib/imageRef';
import { parseAliases } from '../../lib/entryValidation';
import type { RecordType } from '../../lib/recordValidation';
import {
  ACQUISITION_LABEL,
  BODY_TYPE_LABEL,
  ELEMENT_META,
  GENDER_LABEL,
  NEWS_TYPE_META,
  PATH_META,
  RELIC_CATEGORY_META,
  RELIC_SLOT_LABEL,
} from '../../lib/meta';

/** 条目类型（与 lib/recordValidation 的 RecordType 保持同一来源） */
export type EntryType = RecordType;

export const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'character', label: '角色' },
  { value: 'lightCone', label: '光锥' },
  { value: 'relic', label: '遗器' },
  { value: 'newsEvent', label: '资讯事件' },
];

export interface FieldDef {
  name: string;
  label: string;
  kind: 'text' | 'date' | 'textarea' | 'choice' | 'image';
  options?: { value: string; label: string }[];
  /** choice 字段的合法取值白名单（保存前校验） */
  values?: readonly string[];
  required?: boolean;
  /** 空值保存为 undefined（可选字段） */
  optional?: boolean;
  /** 编辑时锁定不可改（主键 id） */
  lockOnEdit?: boolean;
}

function choice(meta: Record<string, unknown>): { value: string; label: string }[] {
  return Object.entries(meta).map(([value, m]) => ({
    value,
    label: typeof m === 'string' ? m : String((m as { label: unknown }).label),
  }));
}

const CHARACTER_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '名称', kind: 'text', required: true },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
    ],
    values: ['5', '4'],
  },
  { name: 'path', label: '命途', kind: 'choice', required: true, options: choice(PATH_META), values: PATH_IDS },
  { name: 'element', label: '战斗属性', kind: 'choice', required: true, options: choice(ELEMENT_META), values: ELEMENT_IDS },
  { name: 'faction', label: '派系', kind: 'text' },
  { name: 'camp', label: '阵营', kind: 'text' },
  { name: 'gender', label: '性别', kind: 'choice', required: true, options: choice(GENDER_LABEL), values: GENDERS },
  { name: 'bodyType', label: '体型', kind: 'choice', required: true, options: choice(BODY_TYPE_LABEL), values: BODY_TYPES },
  { name: 'releaseDate', label: '实装日期', kind: 'date', required: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7）', kind: 'text', required: true },
  { name: 'aliases', label: '别名 / 英文名（每行一个，可选）', kind: 'textarea', optional: true },
  { name: 'avatar', label: '头像图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '角色简介', kind: 'textarea', optional: true },
];

const LIGHT_CONE_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '名称', kind: 'text', required: true },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
      { value: '3', label: '3★' },
    ],
    values: ['5', '4', '3'],
  },
  { name: 'path', label: '命途', kind: 'choice', required: true, options: choice(PATH_META), values: PATH_IDS },
  {
    name: 'acquisition',
    label: '获取方式',
    kind: 'choice',
    optional: true,
    options: choice(ACQUISITION_LABEL),
    values: ACQUISITION_TYPES,
  },
  { name: 'releaseDate', label: '实装日期（可选）', kind: 'date', optional: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7）', kind: 'text', optional: true },
  { name: 'aliases', label: '别名 / 英文名（每行一个，可选）', kind: 'textarea', optional: true },
  { name: 'image', label: '光锥图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '光锥描述', kind: 'textarea', optional: true },
];

const NEWS_EVENT_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'type', label: '事件类型', kind: 'choice', required: true, options: choice(NEWS_TYPE_META), values: NEWS_EVENT_TYPES },
  { name: 'title', label: '标题', kind: 'text', required: true },
  { name: 'date', label: '开始日期', kind: 'date', required: true },
  { name: 'endDate', label: '结束日期（可选）', kind: 'date', optional: true },
  { name: 'version', label: '版本（如 3.7，可选）', kind: 'text', optional: true },
  { name: 'description', label: '说明（可选）', kind: 'textarea', optional: true },
  { name: 'relatedCharacterId', label: '关联角色（可选）', kind: 'choice', optional: true, options: [] },
  { name: 'relatedLightConeId', label: '关联光锥（可选）', kind: 'choice', optional: true, options: [] },
  { name: 'relatedRelicId', label: '关联遗器（可选）', kind: 'choice', optional: true, options: [] },
];

const RELIC_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '套装名称', kind: 'text', required: true },
  { name: 'category', label: '类别', kind: 'choice', required: true, options: choice(RELIC_CATEGORY_META), values: RELIC_CATEGORIES },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
      { value: '3', label: '3★' },
      { value: '2', label: '2★' },
    ],
    values: ['5', '4', '3', '2'],
  },
  { name: 'effect2', label: '二件套效果', kind: 'textarea', required: true },
  { name: 'effect4', label: '四件套效果（位面饰品无）', kind: 'textarea', optional: true },
  { name: 'releaseDate', label: '实装日期（可选）', kind: 'date', optional: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7，可选）', kind: 'text', optional: true },
  { name: 'aliases', label: '别名 / 英文名（每行一个，可选）', kind: 'textarea', optional: true },
  { name: 'image', label: '套装图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '套装说明（可选）', kind: 'textarea', optional: true },
  // 六个部位的名称与描述：名称非空的部位才会写入 pieces
  ...RELIC_SLOTS.flatMap((slot) => [
    { name: `piece_${slot}_name`, label: `${RELIC_SLOT_LABEL[slot]}部件名称（可选）`, kind: 'text' as const },
    { name: `piece_${slot}_desc`, label: `${RELIC_SLOT_LABEL[slot]}部件描述（可选）`, kind: 'textarea' as const },
  ]),
];

export function fieldsFor(type: EntryType): FieldDef[] {
  switch (type) {
    case 'character':
      return CHARACTER_FIELDS;
    case 'lightCone':
      return LIGHT_CONE_FIELDS;
    case 'relic':
      return RELIC_FIELDS;
    case 'newsEvent':
      return NEWS_EVENT_FIELDS;
  }
}

export type FormState = Record<string, string>;

export function emptyForm(type: EntryType): FormState {
  const form: FormState = {};
  for (const field of fieldsFor(type)) {
    form[field.name] =
      field.kind === 'choice' && field.required && field.options?.length
        ? field.options[0].value
        : '';
  }
  return form;
}

export function buildEntry(
  type: EntryType,
  form: FormState,
): Character | LightCone | NewsEvent | RelicSet {
  const trim = (name: string) => form[name]?.trim() ?? '';
  switch (type) {
    case 'character':
      return {
        id: trim('id'),
        name: trim('name'),
        rarity: Number(form.rarity) as Character['rarity'],
        path: form.path as Character['path'],
        element: form.element as Character['element'],
        faction: trim('faction'),
        camp: trim('camp'),
        gender: form.gender as Character['gender'],
        bodyType: form.bodyType as Character['bodyType'],
        releaseDate: trim('releaseDate'),
        releaseVersion: trim('releaseVersion'),
        aliases: parseAliases(form.aliases),
        avatar: trim('avatar') || undefined,
        description: trim('description') || undefined,
      };
    case 'lightCone':
      return {
        id: trim('id'),
        name: trim('name'),
        rarity: Number(form.rarity) as LightCone['rarity'],
        path: form.path as LightCone['path'],
        acquisition: (trim('acquisition') || undefined) as LightCone['acquisition'],
        releaseDate: trim('releaseDate') || undefined,
        releaseVersion: trim('releaseVersion') || undefined,
        aliases: parseAliases(form.aliases),
        image: trim('image') || undefined,
        description: trim('description') || undefined,
      };
    case 'newsEvent':
      return {
        id: trim('id'),
        type: form.type as NewsEvent['type'],
        title: trim('title'),
        date: trim('date'),
        endDate: trim('endDate') || undefined,
        version: trim('version') || undefined,
        description: trim('description') || undefined,
        relatedCharacterId: trim('relatedCharacterId') || undefined,
        relatedLightConeId: trim('relatedLightConeId') || undefined,
        relatedRelicId: trim('relatedRelicId') || undefined,
      };
    case 'relic': {
      const pieces = RELIC_SLOTS.map((slot) => ({
        slot,
        name: trim(`piece_${slot}_name`),
        description: trim(`piece_${slot}_desc`) || undefined,
      })).filter((piece) => piece.name);
      return {
        id: trim('id'),
        name: trim('name'),
        category: form.category as RelicSet['category'],
        rarity: Number(form.rarity) as RelicSet['rarity'],
        effect2: trim('effect2'),
        effect4: trim('effect4') || undefined,
        releaseDate: trim('releaseDate') || undefined,
        releaseVersion: trim('releaseVersion') || undefined,
        pieces: pieces.length > 0 ? pieces : undefined,
        aliases: parseAliases(form.aliases),
        image: trim('image') || undefined,
        description: trim('description') || undefined,
      };
    }
  }
}

/** 条目 → 表单状态（编辑回填；aliases 数组展开为多行文本） */
export function entryToForm(
  type: EntryType,
  entry: Character | LightCone | NewsEvent | RelicSet,
): FormState {
  const data = entry as unknown as Record<string, unknown>;
  const form = emptyForm(type);
  for (const field of fieldsFor(type)) {
    const value = data[field.name];
    // 数组字段（aliases）展开为多行文本
    form[field.name] = Array.isArray(value)
      ? value.join('\n')
      : value === undefined || value === null
        ? ''
        : String(value);
  }
  // 遗器部位列表拆回表单字段
  if (type === 'relic' && Array.isArray(data.pieces)) {
    for (const piece of data.pieces as { slot: string; name: string; description?: string }[]) {
      form[`piece_${piece.slot}_name`] = piece.name;
      form[`piece_${piece.slot}_desc`] = piece.description ?? '';
    }
  }
  return form;
}

export function entryLabel(
  entry: Character | LightCone | NewsEvent | RelicSet,
): string {
  return 'name' in entry ? entry.name : (entry as NewsEvent).title;
}

export interface RelatedNames {
  character: Map<string, string>;
  lightCone: Map<string, string>;
  relic: Map<string, string>;
}

export function entrySummary(
  type: EntryType,
  entry: Character | LightCone | NewsEvent | RelicSet,
  relatedNames?: RelatedNames,
): string {
  if (type === 'character') {
    const c = entry as Character;
    return `${c.rarity}★ · ${PATH_META[c.path].label} · ${ELEMENT_META[c.element].label} · v${c.releaseVersion} · ${c.releaseDate}`;
  }
  if (type === 'lightCone') {
    const lc = entry as LightCone;
    return `${lc.rarity}★ · ${PATH_META[lc.path].label}${lc.acquisition ? ` · ${ACQUISITION_LABEL[lc.acquisition]}` : ''}${lc.releaseVersion ? ` · v${lc.releaseVersion}` : ''}`;
  }
  if (type === 'relic') {
    const r = entry as RelicSet;
    return `${RELIC_CATEGORY_META[r.category].label} · ${r.rarity}★${r.releaseVersion ? ` · v${r.releaseVersion}` : ''}`;
  }
  const event = entry as NewsEvent;
  const related = [
    event.relatedCharacterId && `角色 ${relatedNames?.character.get(event.relatedCharacterId) ?? event.relatedCharacterId}`,
    event.relatedLightConeId && `光锥 ${relatedNames?.lightCone.get(event.relatedLightConeId) ?? event.relatedLightConeId}`,
    event.relatedRelicId && `遗器 ${relatedNames?.relic.get(event.relatedRelicId) ?? event.relatedRelicId}`,
  ]
    .filter(Boolean)
    .join('、');
  return `${NEWS_TYPE_META[event.type].label} · ${event.date}${event.endDate ? ` 至 ${event.endDate}` : ''}${related ? ` · 关联 ${related}` : ''}`;
}

/** 实体类型 → 资讯事件的关联字段名（删除实体时同步清理悬挂引用） */
export const RELATED_FIELD = {
  character: 'relatedCharacterId',
  lightCone: 'relatedLightConeId',
  relic: 'relatedRelicId',
} as const;

/** 实体记录上的图片字段名（用于删除时同步清理 images 表） */
export function imageFieldOf(type: EntryType): 'avatar' | 'image' | null {
  if (type === 'character') return 'avatar';
  if (type === 'lightCone' || type === 'relic') return 'image';
  return null;
}

/** 实体类型 → 业务表（新增 / 删除共用） */
export function tableFor(type: EntryType) {
  return type === 'character'
    ? db.characters
    : type === 'lightCone'
      ? db.lightCones
      : type === 'relic'
        ? db.relics
        : db.newsEvents;
}

/** 删除实体时图片字段值 → images 表主键（非 idb: 引用返回 null） */
export function imageKeyOf(
  type: EntryType,
  entry: Character | LightCone | NewsEvent | RelicSet,
): string | null {
  const imageField = imageFieldOf(type);
  const imageValue = imageField
    ? (entry as unknown as Record<string, unknown>)[imageField]
    : undefined;
  return typeof imageValue === 'string' ? parseImageRef(imageValue) : null;
}
