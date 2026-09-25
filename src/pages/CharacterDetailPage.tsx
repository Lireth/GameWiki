import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import {
  ElementBadge,
  GenderBadge,
  PathBadge,
  RarityStars,
  TypeBadge,
} from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { FieldRow, PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  useCharacterById,
  useCharacterCount,
  useNewsEvents,
} from '../hooks/useWikiData';
import { formatDateCN, formatDateShort } from '../lib/format';
import { BODY_TYPE_LABEL, ELEMENT_META, PATH_META } from '../lib/meta';

export function CharacterDetailPage() {
  const { id } = useParams();
  const character = useCharacterById(id);
  const characterCount = useCharacterCount();
  const newsEvents = useNewsEvents();
  /** 头像加载失败的头像地址（切换角色时重置判断） */
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  if (!character) {
    return (
      <div>
        <PageHeader en="Character" title="角色详情" />
        {characterCount === 0 ? (
          <EmptyState
            title="暂无角色数据"
            hint="角色数据尚未收录，可在 src/data/seed.ts 中录入。"
          />
        ) : (
          <EmptyState
            title="未找到该角色"
            hint="该角色不存在或已被移除，可返回图鉴重新选择。"
          />
        )}
        <div className="mt-6 text-center">
          <Link
            to="/characters"
            className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400"
          >
            <ArrowLeftIcon className="size-4" />
            返回角色图鉴
          </Link>
        </div>
      </div>
    );
  }

  const element = ELEMENT_META[character.element];
  const path = PATH_META[character.path];
  /** 该角色的实装 / 卡池 / 活动时间线（按日期从早到晚） */
  const relatedEvents = newsEvents
    .filter((event) => event.relatedCharacterId === character.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const showAvatar = character.avatar && failedAvatar !== character.avatar;

  return (
    <div>
      <Link
        to="/characters"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-gold-300"
      >
        <ArrowLeftIcon className="size-4" />
        返回角色图鉴
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* 侧栏：立绘占位 + 基本信息 */}
        <Panel className="self-start overflow-hidden" ticks>
          <div
            className="relative flex h-44 items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(150deg, ${element.color}30, transparent 70%)`,
            }}
          >
            {showAvatar ? (
              <img
                src={character.avatar}
                alt={character.name}
                loading="lazy"
                decoding="async"
                onError={() => setFailedAvatar(character.avatar ?? null)}
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <span
                  className="font-display text-7xl font-bold"
                  style={{ color: `${element.color}cc` }}
                >
                  {character.name.slice(0, 1)}
                </span>
                <span
                  aria-hidden
                  className="absolute -bottom-6 -right-6 size-24 rotate-45 border"
                  style={{ borderColor: `${path.color}33` }}
                />
              </>
            )}
          </div>
          <div className="p-5">
            <RarityStars rarity={character.rarity} />
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-50">
              {character.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <PathBadge id={character.path} />
              <ElementBadge id={character.element} />
              <GenderBadge gender={character.gender} />
            </div>
          </div>
        </Panel>

        {/* 资料字段 */}
        <div>
          <Panel className="px-5 py-2 md:px-7" ticks>
            <dl>
              <FieldRow label="稀有度">
                <RarityStars rarity={character.rarity} className="align-middle" />
              </FieldRow>
              <FieldRow label="命途">
                <span className="mr-2">{path.label}</span>
                <span className="font-display text-xs tracking-widest text-slate-500">
                  {path.en}
                </span>
              </FieldRow>
              <FieldRow label="战斗属性">
                <span className="mr-2" style={{ color: element.color }}>
                  ● {element.label}
                </span>
                <span className="font-display text-xs tracking-widest text-slate-500">
                  {element.en}
                </span>
              </FieldRow>
              <FieldRow label="派系">{character.faction || '—'}</FieldRow>
              <FieldRow label="阵营">{character.camp || '—'}</FieldRow>
              <FieldRow label="性别">{character.gender === 'female' ? '女' : '男'}</FieldRow>
              <FieldRow label="体型">
                {BODY_TYPE_LABEL[character.bodyType] ?? '—'}
              </FieldRow>
              <FieldRow label="实装日期">
                {formatDateCN(character.releaseDate)}
              </FieldRow>
              <FieldRow label="实装版本">
                <span className="font-display">v{character.releaseVersion}</span>
              </FieldRow>
            </dl>
          </Panel>

          {character.description && (
            <Panel className="mt-6 p-5 md:p-7">
              <h2 className="text-lg font-semibold text-slate-100">角色简介</h2>
              <p className="mt-3 leading-loose whitespace-pre-line text-slate-400">
                {character.description}
              </p>
            </Panel>
          )}

          {relatedEvents.length > 0 && (
            <Panel className="mt-6 p-5 md:p-7" ticks>
              <h2 className="text-lg font-semibold text-slate-100">相关动态</h2>
              <ul className="mt-2">
                {relatedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-space-700/50 py-3 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 font-display text-sm text-gold-300">
                      {formatDateShort(event.date)}
                    </span>
                    <TypeBadge type={event.type} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {event.title}
                    </span>
                    {event.endDate && (
                      <span className="text-xs text-slate-500">
                        至 {formatDateShort(event.endDate)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
