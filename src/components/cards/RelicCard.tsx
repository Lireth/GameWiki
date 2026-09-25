import { Link } from 'react-router-dom';
import type { RelicSet } from '../../db/types';
import { relicLink } from '../../lib/links';
import { RELIC_CATEGORY_META } from '../../lib/meta';
import { RarityStars } from '../ui/Badges';
import { FavoriteButton } from '../ui/FavoriteButton';
import { CornerTicks } from '../ui/Panel';
import { FAVORITE_PREFIX } from '../../hooks/useWikiData';
import { useEntityImage } from '../../hooks/useEntityImage';

export function RelicCard({ relic }: { relic: RelicSet }) {
  const category = RELIC_CATEGORY_META[relic.category];
  const imageSrc = useEntityImage(relic.image);

  return (
    <Link
      to={relicLink(relic.id)}
      className="group relative block border border-space-600/50 bg-space-850/70 transition duration-200 hover:-translate-y-0.5 hover:border-gold-500/50 hover:bg-space-800/80 hover:shadow-[0_8px_28px_-12px_rgba(233,180,95,0.35)]"
    >
      <CornerTicks className="opacity-0 transition group-hover:opacity-100" />

      {/* 头图：无图片数据时以类别色渐变 + 菱形占位 */}
      <div
        className="relative flex h-20 items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${category.color}22, transparent 65%)`,
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={relic.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="size-9 rotate-45 border-2 transition group-hover:scale-110"
            style={{ borderColor: `${category.color}88` }}
          />
        )}
        <span className="absolute left-2 top-2 font-display text-[10px] tracking-widest text-slate-400">
          {relic.releaseVersion ? `v${relic.releaseVersion}` : ''}
        </span>
        <RarityStars
          rarity={relic.rarity}
          className="absolute right-2 top-2"
        />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 flex-1 truncate font-semibold text-slate-100 transition group-hover:text-gold-300">
            {relic.name}
          </h3>
          <FavoriteButton
            favoriteKey={`${FAVORITE_PREFIX.relic}${relic.id}`}
          />
        </div>
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs leading-5"
            style={{
              color: category.color,
              borderColor: `${category.color}55`,
              backgroundColor: `${category.color}14`,
            }}
          >
            <i aria-hidden className="size-1.5 rotate-45 bg-current" />
            {category.label}
          </span>
        </div>
        <p className="mt-2 truncate text-xs text-slate-500">{relic.effect2}</p>
      </div>
    </Link>
  );
}
