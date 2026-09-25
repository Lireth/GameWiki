import type { Character, LightCone, NewsEvent } from '../db/types';

/**
 * ============================================================
 *  种子数据文件（与页面代码完全分离）
 * ============================================================
 *  页面不写死任何游戏数据，所有数据都从这里录入 IndexedDB。
 *  字段与类型说明见 README.md 和 src/db/types.ts。
 *
 *  示例（真实数据请自行录入，开发阶段保持为空数组）：
 *
 *  export const characterSeed: Character[] = [
 *    {
 *      id: 'example-id',          // 唯一 ID
 *      name: '示例角色',           // 名称
 *      rarity: 5,                 // 稀有度：4 | 5
 *      path: 'destruction',       // 命途：destruction | hunt | erudition | harmony | nihility | preservation | abundance | remembrance
 *      element: 'physical',       // 属性：physical | fire | ice | lightning | wind | quantum | imaginary
 *      faction: '示例派系',        // 派系
 *      camp: '示例阵营',           // 阵营
 *      gender: 'female',          // 性别：female | male
 *      releaseDate: '2026-01-01', // 实装日期 YYYY-MM-DD
 *      releaseVersion: '1.0',     // 实装版本
 *    },
 *  ];
 */

/** 角色种子数据 */
export const characterSeed: Character[] = [];

/** 光锥种子数据 */
export const lightConeSeed: LightCone[] = [];

/** 资讯 / 日历事件种子数据 */
export const newsEventSeed: NewsEvent[] = [];
