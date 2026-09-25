/**
 * 跨页导航链接的单一真相：路由结构或参数改名时只需调整此处。
 * 页面与组件一律通过这些助手生成站内链接，避免散落的字符串模板。
 */

export interface LinkableEvent {
  relatedCharacterId?: string;
  relatedLightConeId?: string;
}

/** 资讯事件的关联详情页链接：角色优先，其次光锥，无关联时为 null */
export function eventLink(event: LinkableEvent): string | null {
  if (event.relatedCharacterId) return `/characters/${event.relatedCharacterId}`;
  if (event.relatedLightConeId) return `/light-cones/${event.relatedLightConeId}`;
  return null;
}

/** 版本详情页链接 */
export function versionLink(version: string): string {
  return `/versions/${version}`;
}

/** 角色详情页链接 */
export function characterLink(id: string): string {
  return `/characters/${id}`;
}

/** 光锥详情页链接 */
export function lightConeLink(id: string): string {
  return `/light-cones/${id}`;
}

/** 跳转到资讯日历对应月份视图的链接（配合 NewsPage 的 y / m URL 参数） */
export function newsMonthLink(iso: string): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return `/news?y=${year}&m=${month}`;
}
