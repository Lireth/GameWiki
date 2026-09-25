import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import {
  useBootstrapStatus,
  useCharacters,
  useLightCones,
  useNewsEvents,
  useRelics,
} from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buildVersionGroups } from '../lib/meta';
import { versionLink } from '../lib/links';

interface VersionStats {
  characters: number;
  lightCones: number;
  relics: number;
  newsEvents: number;
}

/** 各版本在四张表中的条目数（0 计数在 UI 中隐藏） */
function useVersionStats() {
  const characters = useCharacters();
  const lightCones = useLightCones();
  const relics = useRelics();
  const newsEvents = useNewsEvents();

  return useMemo(() => {
    const stats = new Map<string, VersionStats>();
    const add = (
      version: string | undefined,
      kind: keyof VersionStats,
    ) => {
      if (!version) return;
      const current = stats.get(version) ?? {
        characters: 0,
        lightCones: 0,
        relics: 0,
        newsEvents: 0,
      };
      current[kind] += 1;
      stats.set(version, current);
    };
    for (const c of characters) add(c.releaseVersion, 'characters');
    for (const lc of lightCones) add(lc.releaseVersion, 'lightCones');
    for (const r of relics) add(r.releaseVersion, 'relics');
    for (const event of newsEvents) add(event.version, 'newsEvents');
    return { stats, hasData: characters.length + lightCones.length + relics.length + newsEvents.length > 0 };
  }, [characters, lightCones, relics, newsEvents]);
}

const KIND_LABELS: { key: keyof VersionStats; unit: string }[] = [
  { key: 'characters', unit: '名角色' },
  { key: 'lightCones', unit: '件光锥' },
  { key: 'relics', unit: '套遗器' },
  { key: 'newsEvents', unit: '项资讯' },
];

export function VersionIndexPage() {
  useDocumentTitle('版本索引');
  const dataReady = useBootstrapStatus() === 'ok';
  const { stats, hasData } = useVersionStats();

  /** 常显配置打底 + 数据中出现的版本补入对应大版本分组 */
  const groups = useMemo(
    () => buildVersionGroups([...stats.keys()]),
    [stats],
  );

  return (
    <div>
      <PageHeader
        en="Versions"
        title="版本索引"
        description="按大版本分组列出收录的全部实装版本，点击查看该版本聚合的角色、光锥、遗器与资讯。"
      />

      {stats.size === 0 ? (
        !hasData && !dataReady ? (
          <LoadingState />
        ) : (
          <EmptyState
            title="暂无版本数据"
            hint="条目录入实装版本后会自动在此归组，可通过页脚「数据管理」录入。"
          />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.major}>
              <h2 className="mb-2.5 font-display text-sm tracking-[0.3em] text-gold-500/80 uppercase">
                Version {group.major}.x
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.values.map((version) => {
                  const versionStats = stats.get(version);
                  if (!versionStats) return null;
                  return (
                    <Link
                      key={version}
                      to={versionLink(version)}
                      className="group border border-space-600/50 bg-space-850/60 p-4 transition hover:border-gold-500/50 hover:bg-space-800/80"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-2xl font-bold text-gold-300 transition group-hover:text-gold-200">
                          v{version}
                        </span>
                        <span className="text-xs text-slate-500">
                          查看 →
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                        {KIND_LABELS.filter(
                          ({ key }) => versionStats[key] > 0,
                        ).map(({ key, unit }) => (
                          <span key={key}>
                            <span className="font-display text-slate-200">
                              {versionStats[key]}
                            </span>{' '}
                            {unit}
                          </span>
                        ))}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
