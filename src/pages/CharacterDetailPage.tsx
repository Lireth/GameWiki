import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import {
  ElementBadge,
  GenderBadge,
  PathBadge,
  RarityStars,
} from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { FieldRow, PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { useCharacters } from '../hooks/useWikiData';
import { formatDateCN } from '../lib/format';
import { ELEMENT_META, PATH_META } from '../lib/meta';

export function CharacterDetailPage() {
  const { id } = useParams();
  const characters = useCharacters();
  const character = characters.find((c) => c.id === id);

  if (!character) {
    return (
      <div>
        <PageHeader en="Character" title="角色详情" />
        {characters.length === 0 ? (
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
            {character.avatar ? (
              <img
                src={character.avatar}
                alt={character.name}
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
        </div>
      </div>
    </div>
  );
}
