import { StarIcon } from '../icons';
import { toggleFavorite, useFavorites } from '../../hooks/useWikiData';

interface FavoriteButtonProps {
  /** 收藏键（c:<id> / lc:<id>，见 FAVORITE_PREFIX） */
  favoriteKey: string;
  className?: string;
}

/** 收藏星标：激活为金色实星，未激活为暗星；卡片内使用时阻止触发外层链接跳转 */
export function FavoriteButton({ favoriteKey, className = '' }: FavoriteButtonProps) {
  const favorites = useFavorites();
  const active = favorites.has(favoriteKey);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? '取消收藏' : '加入收藏'}
      title={active ? '取消收藏' : '加入收藏'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(favoriteKey);
      }}
      className={`shrink-0 transition ${
        active ? 'text-gold-400' : 'text-slate-600 hover:text-gold-300'
      } ${className}`}
    >
      <StarIcon className="size-4" />
    </button>
  );
}
