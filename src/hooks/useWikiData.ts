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
