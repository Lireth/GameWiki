import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Character, LightCone, NewsEvent } from '../db/types';

/** 全部角色（实时响应数据库变化） */
export function useCharacters(): Character[] {
  return useLiveQuery(() => db.characters.toArray(), [], []) ?? [];
}

export function useLightCones(): LightCone[] {
  return useLiveQuery(() => db.lightCones.toArray(), [], []) ?? [];
}

export function useNewsEvents(): NewsEvent[] {
  return useLiveQuery(() => db.newsEvents.toArray(), [], []) ?? [];
}

/** 按主键查询单个角色（详情页无需加载整表） */
export function useCharacterById(id: string | undefined): Character | undefined {
  return useLiveQuery(async () => (id ? await db.characters.get(id) : undefined), [id]);
}

/** 按主键查询单个光锥 */
export function useLightConeById(id: string | undefined): LightCone | undefined {
  return useLiveQuery(async () => (id ? await db.lightCones.get(id) : undefined), [id]);
}

/** 表内条目总数（详情页用于区分「暂无数据」与「未找到该条目」） */
export function useCharacterCount(): number {
  return useLiveQuery(() => db.characters.count(), [], 0) ?? 0;
}

export function useLightConeCount(): number {
  return useLiveQuery(() => db.lightCones.count(), [], 0) ?? 0;
}
