import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ConeIcon } from '../components/icons';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { CopyLinkButton } from '../components/ui/FilterPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import type { Character, LightCone, NewsEvent } from '../db/types';
import {
  useBootstrapStatus,
  useCharacters,
  useLightCones,
  useNewsEvents,
} from '../hooks/useWikiData';
import { formatDateShort } from '../lib/format';
import { characterLink, lightConeLink, versionLink } from '../lib/links';
import { PATH_META, RARITY_META } from '../lib/meta';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface BannerRowProps {
  event: NewsEvent;
  /** 关联 id → 实体（页面级解析一次，行内只做查表） */
  characterById: Map<string, Character>;
  lightConeById: Map<string, LightCone>;
}

/** 卡池行：UP 角色 / 光锥存在时展示可跳转徽标，否则仅展示标题与时段 */
function BannerRow({ event, characterById, lightConeById }: BannerRowProps) {
  const character = event.relatedCharacterId
    ? characterById.get(event.relatedCharacterId)
    : undefined;
  const lightCone = event.relatedLightConeId
    ? lightConeById.get(event.relatedLightConeId)
    : undefined;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-space-700/50 py-3 last:border-b-0">
      <span className="w-40 shrink-0 font-display text-sm text-gold-300">
        {formatDateShort(event.date)}
        {event.endDate && (
          <span className="text-[11px] text-slate-500">
            {' '}
            ~ {formatDateShort(event.endDate)}
          </span>
        )}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-sm text-slate-200"
        title={event.title}
      >
        {event.title}
      </span>
      {character && (
        <Link
          to={characterLink(character.id)}
          title={`UP 角色：${character.name}`}
          className="shrink-0 border px-2 py-0.5 text-xs leading-5 transition hover:brightness-125"
          style={{
            color: RARITY_META[character.rarity].color,
            borderColor: `${RARITY_META[character.rarity].color}55`,
            backgroundColor: `${RARITY_META[character.rarity].color}14`,
          }}
        >
          {character.name}
        </Link>
      )}
      {lightCone && (
        <Link
          to={lightConeLink(lightCone.id)}
          title={`UP 光锥：${lightCone.name}`}
          className="inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-xs leading-5 transition hover:brightness-125"
          style={{
            color: PATH_META[lightCone.path].color,
            borderColor: `${PATH_META[lightCone.path].color}55`,
            backgroundColor: `${PATH_META[lightCone.path].color}14`,
          }}
        >
          <ConeIcon className="size-3" />
          {lightCone.name}
        </Link>
      )}
      {event.version && (
        <Link
          to={versionLink(event.version)}
          title="查看该版本全部内容"
          className="shrink-0 font-display text-xs tracking-wider text-slate-500 transition hover:text-gold-300"
        >
          v{event.version}
        </Link>
      )}
    </li>
  );
}

export function BannersPage() {
  useDocumentTitle(
    '卡池时间线',
    '按版本回溯跃迁卡池：UP 角色 / 光锥与开放时段一览，可跳转详情与版本页。',
  );
  const events = useNewsEvents();
  const characters = useCharacters();
  const lightCones = useLightCones();
  const dataReady = useBootstrapStatus() === 'ok';

  const banners = useMemo(
    () =>
      events
        .filter((event) => event.type === 'banner')
        .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    [events],
  );

  const characterById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  );
  const lightConeById = useMemo(
    () => new Map(lightCones.map((lc) => [lc.id, lc])),
    [lightCones],
  );

  /** 按版本分组（数值序从新到旧），无版本标记的归入「未标注版本」 */
  const groups = useMemo(() => {
    const map = new Map<string, NewsEvent[]>();
    for (const event of banners) {
      const key = event.version ?? '未标注版本';
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '未标注版本') return 1;
      if (b === '未标注版本') return -1;
      return b.localeCompare(a, undefined, { numeric: true });
    });
  }, [banners]);

  return (
    <div>
      <PageHeader
        en="Warp Banners"
        title="卡池时间线"
        description="按版本回溯跃迁卡池：UP 角色 / 光锥与开放时段，点击可跳转详情页与对应版本。"
      >
        <div className="mt-4">
          <CopyLinkButton />
        </div>
      </PageHeader>

      {events.length === 0 ? (
        dataReady ? (
          <EmptyState
            title="暂无资讯数据"
            hint="卡池时间线由资讯日历中的「跃迁卡池」事件聚合生成，可通过页脚「数据管理」录入或导入备份数据。"
          />
        ) : (
          <LoadingState />
        )
      ) : banners.length === 0 ? (
        <EmptyState
          title="暂无卡池数据"
          hint="还没有收录类型为「跃迁卡池」的资讯事件；可在数据管理或批量录入中添加（type 为 banner，建议关联 UP 角色 / 光锥并填写起止日期）。"
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([version, versionBanners]) => (
            <section key={version}>
              <h2 className="mb-2.5 flex items-center gap-2 font-display text-sm tracking-[0.3em] text-gold-500/80 uppercase">
                {version === '未标注版本' ? (
                  '未标注版本'
                ) : (
                  <Link
                    to={versionLink(version)}
                    title="查看该版本全部内容"
                    className="transition hover:text-gold-300"
                  >
                    Version {version}
                  </Link>
                )}
                <span className="font-display text-xs text-slate-500">
                  {versionBanners.length} 期
                </span>
              </h2>
              <Panel className="p-5 md:p-6" ticks>
                <ul>
                  {versionBanners.map((event) => (
                    <BannerRow
                      key={event.id}
                      event={event}
                      characterById={characterById}
                      lightConeById={lightConeById}
                    />
                  ))}
                </ul>
              </Panel>
            </section>
          ))}
          <div className="text-center">
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm text-gold-300 transition hover:text-gold-400"
            >
              <ArrowLeftIcon className="size-4" />
              在资讯日历中查看全部时间节点
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
