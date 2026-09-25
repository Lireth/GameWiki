import { StarIcon } from '../icons';
import {
  ELEMENT_META,
  GENDER_LABEL,
  NEWS_TYPE_META,
  PATH_META,
  RARITY_META,
} from '../../lib/meta';
import type { ElementId, Gender, NewsEventType, PathId, Rarity } from '../../db/types';

function Diamond({ className = '' }: { className?: string }) {
  return (
    <i aria-hidden className={`size-1.5 rotate-45 bg-current ${className}`} />
  );
}

export function RarityStars({
  rarity,
  className = '',
}: {
  rarity: Rarity;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={`${rarity}星`}
    >
      {Array.from({ length: rarity }).map((_, i) => (
        <StarIcon
          key={i}
          className="size-3"
          style={{ color: RARITY_META[rarity].color }}
        />
      ))}
    </span>
  );
}

export function PathBadge({ id }: { id: PathId }) {
  const meta = PATH_META[id];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs leading-5"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}14`,
      }}
    >
      <Diamond />
      {meta.label}
    </span>
  );
}

export function ElementBadge({ id }: { id: ElementId }) {
  const meta = ELEMENT_META[id];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs leading-5"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}14`,
      }}
    >
      <Diamond />
      {meta.label}
    </span>
  );
}

export function GenderBadge({ gender }: { gender: Gender }) {
  return (
    <span className="inline-flex items-center border border-space-600/70 bg-space-800/70 px-2 py-0.5 text-xs leading-5 text-slate-300">
      {GENDER_LABEL[gender]}
    </span>
  );
}

export function TypeBadge({ type }: { type: NewsEventType }) {
  const meta = NEWS_TYPE_META[type];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-xs leading-5"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}14`,
      }}
    >
      <Diamond />
      {meta.label}
    </span>
  );
}
