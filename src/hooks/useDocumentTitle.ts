import { useEffect } from 'react';

const BASE_TITLE = '星穹铁道资料站 · Honkai: Star Rail Wiki';

/**
 * 页面级 document.title：多标签页 / 浏览器历史 / 已安装 PWA 中可辨识当前页面；
 * 卸载或切换时恢复站点默认标题。
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · 星穹铁道资料站` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
