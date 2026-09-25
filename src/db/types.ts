/** 命途 ID（含「记忆」「欢愉」） */
export const PATH_IDS = [
  'destruction',
  'hunt',
  'erudition',
  'harmony',
  'nihility',
  'preservation',
  'abundance',
  'remembrance',
  'joviality',
] as const;
export type PathId = (typeof PATH_IDS)[number];

/** 战斗属性 ID */
export const ELEMENT_IDS = [
  'physical',
  'fire',
  'ice',
  'lightning',
  'wind',
  'quantum',
  'imaginary',
] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

/** 稀有度（角色，从高到低，供筛选面板直接遍历） */
export const RARITIES = [5, 4] as const;
export type Rarity = (typeof RARITIES)[number];

/** 稀有度（光锥，含 3★） */
export const LIGHT_CONE_RARITIES = [5, 4, 3] as const;
export type LightConeRarity = (typeof LIGHT_CONE_RARITIES)[number];

/** 光锥获取方式 */
export const ACQUISITION_TYPES = [
  'warp',
  'limitedWarp',
  'event',
  'quest',
  'exploration',
  'namelessHonor',
  'shopExchange',
  'worldShop',
  'simUniverseShop',
  'actionSummary',
  'echoOfWar',
  'treasure',
  'levelReward',
  'collabWarp',
] as const;
export type AcquisitionType = (typeof ACQUISITION_TYPES)[number];

/** 性别 */
export const GENDERS = ['female', 'male'] as const;
export type Gender = (typeof GENDERS)[number];

/** 体型（男系 → 女系） */
export const BODY_TYPES = [
  'adultMale',
  'youngMale',
  'teenBoy',
  'adultFemale',
  'youngFemale',
  'teenGirl',
  'littleGirl',
] as const;
export type BodyType = (typeof BODY_TYPES)[number];

/** 资讯 / 日历事件类型 */
export const NEWS_EVENT_TYPES = [
  'version',
  'character',
  'lightcone',
  'event',
  'banner',
  'eventEnd',
] as const;
export type NewsEventType = (typeof NEWS_EVENT_TYPES)[number];

export interface Character {
  /** 唯一 ID（建议英文或拼音短横线，如 seele-volleymyth） */
  id: string;
  /** 角色名 */
  name: string;
  /** 稀有度：4 / 5 */
  rarity: Rarity;
  /** 命途 */
  path: PathId;
  /** 战斗属性 */
  element: ElementId;
  /** 派系，如「星穹列车」 */
  faction: string;
  /** 阵营，如「雅利洛-VI」 */
  camp: string;
  gender: Gender;
  /** 体型：成男 / 男青年 / 少年 / 成女 / 女青年 / 少女 / 幼女 / 星 */
  bodyType: BodyType;
  /** 实装日期，格式 YYYY-MM-DD */
  releaseDate: string;
  /** 实装版本，如 1.0 */
  releaseVersion: string;
  /** 头像 / 立绘图片地址（可选，未填时卡片显示名称首字占位） */
  avatar?: string;
  description?: string;
}

export interface LightCone {
  id: string;
  name: string;
  /** 稀有度：3 / 4 / 5 */
  rarity: LightConeRarity;
  path: PathId;
  /** 获取方式（可选，未知时不归类） */
  acquisition?: AcquisitionType;
  releaseDate?: string;
  releaseVersion?: string;
  image?: string;
  description?: string;
}

export interface NewsEvent {
  id: string;
  type: NewsEventType;
  title: string;
  /** 开始日期，格式 YYYY-MM-DD */
  date: string;
  /** 结束日期（活动 / 卡池等可选） */
  endDate?: string;
  version?: string;
  description?: string;
  /** 关联角色（日历条目可点击跳转） */
  relatedCharacterId?: string;
  /** 关联光锥 */
  relatedLightConeId?: string;
}
