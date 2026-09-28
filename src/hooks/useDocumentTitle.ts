import { useEffect } from 'react';

const BASE_TITLE = '星穹铁道资料站 · Honkai: Star Rail Wiki';
/** 与 index.html 中的默认 meta description 保持一致 */
const BASE_DESCRIPTION =
  '崩坏：星穹铁道 游戏资料 Wiki —— 角色图鉴、光锥图鉴、命途×属性矩阵与资讯日历';

/** 搜索引擎摘要上限（过长的 description 会被搜索结果截断） */
const MAX_DESCRIPTION_LENGTH = 160;

function setMeta(key: string, content: string, byProperty = false) {
  const attr = byProperty ? 'property' : 'name';
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * 页面级元信息：
 * - document.title：多标签页 / 浏览器历史 / 已安装 PWA 中可辨识当前页面；
 * - meta description 与 og:title / og:description / og:url：分享到社交
 *   平台与搜索引擎收录时展示页面摘要与直达链接。
 * 卸载或切换时恢复站点默认值；description 超长时截断。
 */
export function useDocumentTitle(title?: string, description?: string) {
  const fullTitle = title ? `${title} · 星穹铁道资料站` : BASE_TITLE;
  const desc = (description ?? BASE_DESCRIPTION).slice(0, MAX_DESCRIPTION_LENGTH);

  useEffect(() => {
    document.title = fullTitle;
    setMeta('description', desc);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', desc, true);
    setMeta('og:url', window.location.href, true);
    return () => {
      document.title = BASE_TITLE;
      setMeta('description', BASE_DESCRIPTION);
      setMeta('og:title', BASE_TITLE, true);
      setMeta('og:description', BASE_DESCRIPTION, true);
    };
  }, [fullTitle, desc]);
}
