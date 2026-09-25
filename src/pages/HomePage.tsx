import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarIcon,
  ConeIcon,
  GridIcon,
  UsersIcon,
} from '../components/icons';
import { CharacterCard } from '../components/cards/CharacterCard';
import { LightConeCard } from '../components/cards/LightConeCard';
import { TypeBadge } from '../components/ui/Badges';
import { Panel } from '../components/ui/Panel';
import {
  useCharacters,
  useLightCones,
  useNewsEvents,
} from '../hooks/useWikiData';
import type { Character, LightCone } from '../db/types';
import { formatDateShort } from '../lib/format';
import { newsMonthLink, versionLink } from '../lib/links';

const FEATURES = [
  {
    to: '/characters',
    icon: UsersIcon,
    title: '角色图鉴',
    en: 'CHARACTERS',
    desc: '按稀有度、命途、战斗属性、派系、阵营等维度搜索、筛选与排序全部角色。',
  },
  {
    to: '/light-cones',
    icon: ConeIcon,
    title: '光锥图鉴',
    en: 'LIGHT CONES',
    desc: '浏览各命途的光锥，查看稀有度与实装信息。',
  },
  {
    to: '/matrix',
    icon: GridIcon,
    title: '命途 × 属性矩阵',
    en: 'PATH × TYPE MATRIX',
    desc: '二维矩阵一览命途与战斗属性组合下的角色分布，单元格内按实装日期从新到旧排列。',
  },
  {
    to: '/news',
    icon: CalendarIcon,
    title: '资讯日历',
    en: 'NEWS CALENDAR',
    desc: '以年月日历视图追踪版本更新、角色 / 光锥实装、卡池与活动等关键节点。',
  },
];

const ABOUT_POINTS = [
  '角色图鉴支持关键词搜索、多维筛选与多种排序',
  '命途 × 战斗属性二维矩阵，适配桌面端与移动端',
  '资讯日历支持年月切换与事件类型筛选',
  '数据存于浏览器 IndexedDB（Dexie），与页面代码分离',
  '暂未收录数据时展示友好的空状态',
  '深色科幻风格，桌面端与手机端均可正常使用',
];

function HeroRings() {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className="pointer-events-none absolute -right-24 top-1/2 hidden w-[420px] -translate-y-1/2 opacity-30 lg:block"
    >
      <circle
        cx="200"
        cy="200"
        r="150"
        fill="none"
        stroke="#e9b45f"
        strokeOpacity="0.35"
        strokeDasharray="4 10"
      />
      <circle
        cx="200"
        cy="200"
        r="108"
        fill="none"
        stroke="#7fb4f5"
        strokeOpacity="0.3"
      />
      <circle
        cx="200"
        cy="200"
        r="70"
        fill="none"
        stroke="#e9b45f"
        strokeOpacity="0.2"
        strokeDasharray="2 8"
      />
      <path
        d="M200 128l17 47 47 17-47 17-17 47-17-47-47-17 47-17z"
        fill="#e9b45f"
        fillOpacity="0.5"
      />
    </svg>
  );
}

function StatTile({ label, en, value }: { label: string; en: string; value: number }) {
  return (
    <Panel className="px-5 py-4" ticks>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="font-display text-[10px] tracking-[0.3em] text-slate-500">
          {en}
        </span>
      </div>
      <p className="mt-1.5 font-display text-3xl font-bold text-gold-300">
        {value}
      </p>
    </Panel>
  );
}

export function HomePage() {
  const characters = useCharacters();
  const lightCones = useLightCones();
  const newsEvents = useNewsEvents();

  /** 最新实装：角色与光锥按实装日期合并取前 6 个 */
  const latest = useMemo(() => {
    const items: {
      kind: 'character' | 'lightCone';
      date: string;
      data: Character | LightCone;
    }[] = [
      ...characters.map((c) => ({ kind: 'character' as const, date: c.releaseDate, data: c })),
      ...lightCones.map((lc) => ({
        kind: 'lightCone' as const,
        date: lc.releaseDate ?? '',
        data: lc,
      })),
    ];
    return items
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [characters, lightCones]);

  /** 近期资讯：按日期从新到旧取前 6 条 */
  const recentEvents = useMemo(
    () => [...newsEvents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [newsEvents],
  );

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden border border-space-600/40 bg-space-850/60 px-6 py-14 md:px-12 md:py-20">
        <HeroRings />
        <div className="relative max-w-2xl">
          <p className="font-display text-xs tracking-[0.5em] text-gold-500 uppercase">
            Honkai: Star Rail Wiki
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-slate-50 md:text-6xl">
            星穹铁道
            <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              资料站
            </span>
          </h1>
          <p className="mt-5 leading-relaxed text-slate-400">
            收录《崩坏：星穹铁道》的角色、光锥资料，提供命途 ×
            战斗属性矩阵与资讯日历。数据保存在本地浏览器中，随版本持续更新。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/characters"
              className="chamfer-sm bg-gold-500 px-5 py-2.5 text-sm font-semibold text-space-950 transition hover:bg-gold-400"
            >
              浏览角色图鉴
            </Link>
            <Link
              to="/matrix"
              className="chamfer-sm border border-gold-500/50 px-5 py-2.5 text-sm font-semibold text-gold-300 transition hover:bg-gold-500/10"
            >
              查看命途矩阵
            </Link>
          </div>
        </div>
      </section>

      {/* 数据概览 */}
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="角色" en="CHARACTERS" value={characters.length} />
          <StatTile label="光锥" en="LIGHT CONES" value={lightCones.length} />
          <StatTile label="资讯事件" en="NEWS EVENTS" value={newsEvents.length} />
        </div>
      </section>

      {/* 最新实装 */}
      {latest.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-xs tracking-[0.35em] text-gold-500/80 uppercase">
                Latest
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-100">最新实装</h2>
            </div>
            <Link
              to="/characters"
              className="text-xs text-gold-300 transition hover:text-gold-400"
            >
              查看角色图鉴 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((item) =>
              item.kind === 'character' ? (
                <CharacterCard
                  key={item.data.id}
                  character={item.data as Character}
                />
              ) : (
                <LightConeCard
                  key={item.data.id}
                  lightCone={item.data as LightCone}
                />
              ),
            )}
          </div>
        </section>
      )}

      {/* 近期资讯 */}
      {recentEvents.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-xs tracking-[0.35em] text-gold-500/80 uppercase">
                Recent Events
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-100">近期资讯</h2>
            </div>
            <Link
              to="/news"
              className="text-xs text-gold-300 transition hover:text-gold-400"
            >
              查看资讯日历 →
            </Link>
          </div>
          <Panel className="p-5 md:p-6" ticks>
            <ul>
              {recentEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-space-700/50 py-3 last:border-b-0"
                >
                  <Link
                    to={newsMonthLink(event.date)}
                    title="在资讯日历中查看该月"
                    className="w-24 shrink-0 font-display text-sm text-gold-300 transition hover:text-gold-400"
                  >
                    {formatDateShort(event.date)}
                  </Link>
                  <TypeBadge type={event.type} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                    {event.title}
                  </span>
                  {event.version && (
                    <Link
                      to={versionLink(event.version)}
                      title="查看该版本全部内容"
                      className="font-display text-xs tracking-wider text-slate-500 transition hover:text-gold-300"
                    >
                      v{event.version}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* 功能入口 */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs tracking-[0.35em] text-gold-500/80 uppercase">
              Explore
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">浏览资料</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="group relative border border-space-600/50 bg-space-850/60 p-5 transition hover:border-gold-500/50 hover:bg-space-800/80"
            >
              <feature.icon className="size-6 text-gold-400" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="font-semibold text-slate-100 transition group-hover:text-gold-300">
                    {feature.title}
                  </h3>
                  <span className="font-display text-[10px] tracking-[0.25em] text-slate-500">
                    {feature.en}
                  </span>
                </div>
                <ArrowRightIcon className="size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-gold-400" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {feature.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 站点说明 */}
      <section>
        <Panel className="p-6 md:p-8" ticks>
          <p className="font-display text-xs tracking-[0.35em] text-gold-500/80 uppercase">
            About
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-100">本站说明</h2>
          <ul className="mt-5 grid gap-2.5 text-sm text-slate-400 sm:grid-cols-2">
            {ABOUT_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <i
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-gold-500"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}
