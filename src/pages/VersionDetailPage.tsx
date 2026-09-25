import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { CharacterCard } from '../components/cards/CharacterCard';
import { LightConeCard } from '../components/cards/LightConeCard';
import { TypeBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  useCharacters,
  useLightCones,
  useNewsEvents,
} from '../hooks/useWikiData';
import { formatDateShort } from '../lib/format';
import { eventLink, newsMonthLink } from '../lib/links';

export function VersionDetailPage() {
  const { version = '' } = useParams();
  const characters = useCharacters();
  const lightCones = useLightCones();
  const newsEvents = useNewsEvents();

  const versionChars = useMemo(
    () =>
      characters
        .filter((c) => c.releaseVersion === version)
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [characters, version],
  );
  const versionCones = useMemo(
    () =>
      lightCones
        .filter((lc) => lc.releaseVersion === version)
        .sort((a, b) =>
          (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''),
        ),
    [lightCones, version],
  );
  const versionEvents = useMemo(
    () =>
      newsEvents
        .filter((event) => event.version === version)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [newsEvents, version],
  );

  const hasContent =
    versionChars.length + versionCones.length + versionEvents.length > 0;

  if (!hasContent) {
    return (
      <div>
        <PageHeader en="Version" title={`v${version || '?'}`} />
        <EmptyState
          title="该版本暂无收录内容"
          hint="没有找到实装于该版本的角色、光锥或资讯事件，可返回资讯日历查看其它版本。"
        />
        <div className="mt-6 text-center">
          <Link
            to="/news"
            className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400"
          >
            <ArrowLeftIcon className="size-4" />
            返回资讯日历
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        en={`Version ${version}`}
        title={`v${version} 版本内容`}
        description="聚合实装于该版本的全部角色、光锥与资讯事件。"
      >
        <Link
          to="/news"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold-300 transition hover:text-gold-400"
        >
          <ArrowLeftIcon className="size-3.5" />
          返回资讯日历
        </Link>
      </PageHeader>

      <div className="space-y-10">
        {versionChars.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-100">
              实装角色
              <span className="ml-2 font-display text-sm text-slate-500">
                {versionChars.length} 名
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {versionChars.map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
            </div>
          </section>
        )}

        {versionCones.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-100">
              实装光锥
              <span className="ml-2 font-display text-sm text-slate-500">
                {versionCones.length} 件
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {versionCones.map((lightCone) => (
                <LightConeCard key={lightCone.id} lightCone={lightCone} />
              ))}
            </div>
          </section>
        )}

        {versionEvents.length > 0 && (
          <section>
            <Panel className="p-5 md:p-6" ticks>
              <h2 className="text-lg font-semibold text-slate-100">
                版本资讯
                <span className="ml-2 font-display text-xs text-slate-500">
                  {versionEvents.length} 项
                </span>
              </h2>
              <ul className="mt-2">
                {versionEvents.map((event) => {
                  const link = eventLink(event);
                  return (
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
                      {link ? (
                        <Link
                          to={link}
                          className="min-w-0 flex-1 truncate text-sm text-slate-200 hover:text-gold-300"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                          {event.title}
                        </span>
                      )}
                      {event.endDate && (
                        <span className="text-xs text-slate-500">
                          至 {formatDateShort(event.endDate)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        )}
      </div>
    </div>
  );
}
