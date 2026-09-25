import type {
  BodyType,
  ElementId,
  Gender,
  NewsEventType,
  PathId,
  Rarity,
} from '../db/types';

export interface TaxonomyMeta {
  label: string;
  en: string;
  color: string;
}

/** 命途元数据（展示名 / 英文名 / 主题色） */
export const PATH_META: Record<PathId, TaxonomyMeta> = {
  destruction: { label: '毁灭', en: 'Destruction', color: '#ff7f66' },
  hunt: { label: '巡猎', en: 'The Hunt', color: '#5fd4e8' },
  erudition: { label: '智识', en: 'Erudition', color: '#7f9df5' },
  harmony: { label: '同谐', en: 'Harmony', color: '#f2c66d' },
  nihility: { label: '虚无', en: 'Nihility', color: '#a687f2' },
  preservation: { label: '存护', en: 'Preservation', color: '#f5df85' },
  abundance: { label: '丰饶', en: 'Abundance', color: '#63dfa4' },
  remembrance: { label: '记忆', en: 'Remembrance', color: '#93b9ff' },
};

/** 战斗属性元数据 */
export const ELEMENT_META: Record<ElementId, TaxonomyMeta> = {
  physical: { label: '物理', en: 'Physical', color: '#cdd3de' },
  fire: { label: '火', en: 'Fire', color: '#f25f52' },
  ice: { label: '冰', en: 'Ice', color: '#72c9f5' },
  lightning: { label: '雷', en: 'Lightning', color: '#d27ef2' },
  wind: { label: '风', en: 'Wind', color: '#4fd6a8' },
  quantum: { label: '量子', en: 'Quantum', color: '#6b74e8' },
  imaginary: { label: '虚数', en: 'Imaginary', color: '#f0d354' },
};

/** 稀有度元数据 */
export const RARITY_META: Record<Rarity, { color: string }> = {
  4: { color: '#c79bf5' },
  5: { color: '#ffce6b' },
};

/** 性别展示名 */
export const GENDER_LABEL: Record<Gender, string> = {
  female: '女',
  male: '男',
};

/** 体型展示名（男系 → 女系） */
export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  adultMale: '成男',
  youngMale: '男青年',
  teenBoy: '少年',
  adultFemale: '成女',
  youngFemale: '女青年',
  teenGirl: '少女',
  littleGirl: '幼女',
};

/** 体型筛选分组：第一行男性、第二行女性 */
export const BODY_TYPE_GROUPS: { title: string; values: BodyType[] }[] = [
  { title: '男', values: ['adultMale', 'youngMale', 'teenBoy'] },
  { title: '女', values: ['adultFemale', 'youngFemale', 'teenGirl', 'littleGirl'] },
];

/**
 * 实装版本分类（常显，不依赖角色数据；按大版本分行）。
 * 数据中出现此处未列出的版本时，会自动追加到对应大版本分组（或新建分组）。
 */
export const VERSION_GROUPS: { major: string; values: string[] }[] = [
  { major: '1', values: ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6'] },
  {
    major: '2',
    values: ['2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7'],
  },
  {
    major: '3',
    values: ['3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'],
  },
  {
    major: '4',
    values: ['4.0', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6'],
  },
];

/** 资讯事件类型元数据 */
export const NEWS_TYPE_META: Record<
  NewsEventType,
  { label: string; color: string }
> = {
  version: { label: '版本更新', color: '#f2c66d' },
  character: { label: '角色实装', color: '#72c9f5' },
  lightcone: { label: '光锥实装', color: '#a687f2' },
  event: { label: '活动开启', color: '#63dfa4' },
  banner: { label: '跃迁卡池', color: '#f28e6d' },
  eventEnd: { label: '活动结束', color: '#8a93a6' },
};

/** 通用选项列表（供筛选下拉使用） */
export const PATH_OPTIONS = Object.entries(PATH_META).map(([value, meta]) => ({
  value: value as PathId,
  label: meta.label,
}));

export const ELEMENT_OPTIONS = Object.entries(ELEMENT_META).map(
  ([value, meta]) => ({ value: value as ElementId, label: meta.label }),
);

export const RARITY_OPTIONS = [5, 4].map((r) => ({
  value: r as Rarity,
  label: `${r}★`,
}));
