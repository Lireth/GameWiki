import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LightCone } from '../../db/types';
import { lightConeLink } from '../../lib/links';
import { PATH_META } from '../../lib/meta';
import { PathBadge, RarityStars } from '../ui/Badges';
import { CornerTicks } from '../ui/Panel';

export function LightConeCard({ lightCone }: { lightCone: LightCone }) {
  const path = PATH_META[lightCone.path];
  const [failedImage, setFailedImage] = useState(false);

  return (
    <Link to={lightConeLink(lightCone.id)} className="group relative block border border-space-600/50 bg-space-850/70 transition duration-200 hover:-translate-y-0.5 hover:border-gold-500/50 hover:bg-space-800/80 hover:shadow-[0_8px_28px_-12px_rgba(233,180,95,0.35)]">
      <CornerTicks className="opacity-0 transition group-hover:opacity-100" />

      {/* 头图：无图片数据时以命途色渐变 + 菱形轮廓占位 */}
      <div
        className="relative flex h-20 items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${path.color}22, transparent 65%)`,
        }}
      >
        {lightCone.image && !failedImage ? (
          <img
            src={lightCone.image}
            alt={lightCone.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="size-9 rotate-45 border-2 transition group-hover:scale-110"
            style={{ borderColor: `${path.color}88` }}
          />
        )}
        <span className="absolute left-2 top-2 font-display text-[10px] tracking-widest text-slate-400">
          {lightCone.releaseVersion ? `v${lightCone.releaseVersion}` : ''}
        </span>
        <RarityStars
          rarity={lightCone.rarity}
          className="absolute right-2 top-2"
        />
      </div>

      <div className="p-3">
        <h3 className="truncate font-semibold text-slate-100 transition group-hover:text-gold-300">
          {lightCone.name}
        </h3>
        <div className="mt-2">
          <PathBadge id={lightCone.path} />
        </div>
      </div>
    </Link>
  );
}
