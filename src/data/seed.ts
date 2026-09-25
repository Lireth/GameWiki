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
 *      bodyType: 'youngFemale',   // 体型：adultMale(成男) | youngMale(男青年) | teenBoy(少年) | adultFemale(成女) | youngFemale(女青年) | teenGirl(少女) | littleGirl(幼女)
 *      releaseDate: '2026-01-01', // 实装日期 YYYY-MM-DD
 *      releaseVersion: '1.0',     // 实装版本
 *    },
 *  ];
 */

/** 角色种子数据 */
export const characterSeed: Character[] = [];

/**
 * 光锥种子数据 —— 稀有度为 3 | 4 | 5（光锥含 3★）。
 * acquisition（获取方式）取值：warp(跃迁) | limitedWarp(限定跃迁) | event(活动) |
 * quest(任务) | exploration(探索) | namelessHonor(无名勋礼) | shopExchange(商店兑换) |
 * worldShop(世界商店) | simUniverseShop(模拟宇宙「黑塔的商店」) | actionSummary(行动摘要) |
 * echoOfWar(历战余响) | treasure(奇珍琳琅) | levelReward(等级奖励) | collabWarp(联动跃迁)
 *
 * 示例：
 * export const lightConeSeed: LightCone[] = [
 *   {
 *     id: 'example-cone',
 *     name: '示例光锥',
 *     rarity: 5,
 *     path: 'destruction',
 *     acquisition: 'warp',
 *     releaseDate: '2026-01-01',
 *     releaseVersion: '1.0',
 *   },
 * ];
 */
export const lightConeSeed: LightCone[] = [];

/** 资讯 / 日历事件种子数据 */
export const newsEventSeed: NewsEvent[] = [];
