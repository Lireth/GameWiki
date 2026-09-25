import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Character } from '../../db/types';
import { ELEMENT_META, RARITY_META } from '../../lib/meta';
import { ElementBadge, PathBadge, RarityStars } from '../ui/Badges';
import { CornerTicks } from '../ui/Panel';

export function CharacterCard({ character }: { character: Character }) {
  const element = ELEMENT_META[character.element];
  const rarityColor = RARITY_META[character.rarity].color;
  const [failedAvatar, setFailedAvatar] = useState(false);

  return (
    <Link
      to={`/characters/${character.id}`}
      className="group relative block border border-space-600/50 bg-space-850/70 transition duration-200 hover:-translate-y-0.5 hover:border-gold-500/50 hover:bg-space-800/80 hover:shadow-[0_8px_28px_-12px_rgba(233,180,95,0.35)]"
    >
      <CornerTicks className="opacity-0 transition group-hover:opacity-100" />

      {/* 头图：无图片数据时以属性色渐变 + 名称首字占位 */}
      <div
        className="relative flex h-20 items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${element.color}2b, transparent 65%)`,
        }}
      >
        {character.avatar && !failedAvatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            loading="lazy"
            decoding="async"
            onError={() => setFailedAvatar(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="font-display text-4xl font-bold"
            style={{ color: `${element.color}d0` }}
          >
            {character.name.slice(0, 1)}
          </span>
        )}
        <span className="absolute left-2 top-2 font-display text-[10px] tracking-widest text-slate-400">
          v{character.releaseVersion}
        </span>
        <RarityStars
          rarity={character.rarity}
          className="absolute right-2 top-2"
        />
      </div>

      <div className="p-3">
        <h3
          className="truncate font-semibold text-slate-100 transition group-hover:text-gold-300"
          style={{ borderLeft: `2px solid ${rarityColor}66`, paddingLeft: 8 }}
        >
          {character.name}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <PathBadge id={character.path} />
          <ElementBadge id={character.element} />
        </div>
        <p className="mt-2 truncate text-xs text-slate-500">
          {character.camp} · {character.faction}
        </p>
      </div>
    </Link>
  );
}
