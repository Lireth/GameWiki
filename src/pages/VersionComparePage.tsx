import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  useAllVersions,
  useCharacters,
  useLightCones,
  useRelics,
} from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { diffById, type DiffResult } from '../lib/compare';
import { versionLink } from '../lib/links';
import { ELEMENT_META, PATH_META, RELIC_CATEGORY_META } from '../lib/meta';
import type { Character, LightCone, RelicSet } from '../db/types';

const selectClass =
  'border border-space-600/60 bg-space-850/80 px-2.5 py-1.5 text-sm text-slate-200 focus:border-gold-500/60 focus:outline-none';

function characterRow(c: Character): string {
  return `${c.rarity}★ · ${PATH_META[c.path].label} · ${ELEMENT_META[c.element].label}`;
}

function lightConeRow(lc: LightCone): string {
  return `${lc.rarity}★ · ${PATH_META[lc.path].label}`;
}

function relicRow(r: RelicSet): string {
  return `${RELIC_CATEGORY_META[r.category].label} · ${r.rarity}★`;
}

/** 单类别对比区块：仅 A / 仅 B 两侧并列，共有数量汇总 */
function DiffSection<T extends { id: string }>({
  title,
  diff,
  label,
  meta,
}: {
  title: string;
  diff: DiffResult<T>;
  label: (item: T) => string;
  meta: (item: T) => string;
}) {
  if (diff.onlyA.length + diff.onlyB.length + diff.shared.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-100">
        {title}
        <span className="ml-2 font-display text-sm text-slate-500">
          仅 A {diff.onlyA.length} · 仅 B {diff.onlyB.length} · 共有 {diff.shared.length}
        </span>
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            { title: '仅 A 版本', items: diff.onlyA },
            { title: '仅 B 版本', items: diff.onlyB },
          ] as const
        ).map((side) => (
          <Panel key={side.title} className="p-4">
            <h3 className="text-xs font-semibold text-slate-400">{side.title}</h3>
            {side.items.length === 0 ? (
              <p className="mt-2 text-xs text-slate-600">无</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {side.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-slate-200">{label(item)}</span>
                    <span className="shrink-0 text-[11px] text-slate-500">{meta(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
      {diff.shared.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          两版本共有：{diff.shared.map(label).join('、')}
        </p>
      )}
    </section>
  );
}

export function VersionComparePage() {
  const { version = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const characters = useCharacters();
  const lightCones = useLightCones();
  const relics = useRelics();
  const allVersions = useAllVersions();

  /** 对比版本（B）：URL 参数缺省时取基准版本的上一版本，非法值回退 */
  const rawWith = params.get('with');
  const versionIndex = allVersions.indexOf(version);
  const fallbackWith =
    versionIndex > 0 ? allVersions[versionIndex - 1] : allVersions.find((v) => v !== version);
  const withVersion =
    rawWith && allVersions.includes(rawWith) && rawWith !== version
      ? rawWith
      : (fallbackWith ?? '');

  const title =
    version && withVersion ? `版本对比 ${version} ↔ ${withVersion}` : '版本对比';
  useDocumentTitle(title, '对比两个实装版本的角色、光锥与遗器差异。');

  const versionChars = useMemo(
    () => diffById(
      characters.filter((c) => c.releaseVersion === version),
      characters.filter((c) => c.releaseVersion === withVersion),
      (c) => c.id,
    ),
    [characters, version, withVersion],
  );
  const versionCones = useMemo(
    () => diffById(
      lightCones.filter((lc) => lc.releaseVersion === version),
      lightCones.filter((lc) => lc.releaseVersion === withVersion),
      (lc) => lc.id,
    ),
    [lightCones, version, withVersion],
  );
  const versionRelics = useMemo(
    () => diffById(
      relics.filter((r) => r.releaseVersion === version),
      relics.filter((r) => r.releaseVersion === withVersion),
      (r) => r.id,
    ),
    [relics, version, withVersion],
  );

  const hasData = allVersions.length > 0;
  const canCompare = Boolean(version && withVersion);

  const switchBase = (next: string) => {
    // 基准版本变化走版本详情路由结构；对比版本（with）跟随 URL 保留
    const nextWith = next === withVersion ? version : withVersion;
    navigate(`/versions/${next}/compare${nextWith ? `?with=${nextWith}` : ''}`);
  };

  const switchWith = (next: string) =>
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next) nextParams.set('with', next);
        else nextParams.delete('with');
        return nextParams;
      },
      { replace: true },
    );

  return (
    <div>
      <PageHeader
        en="Version Compare"
        title={canCompare ? `v${version} ↔ v${withVersion}` : '版本对比'}
        description="对比两个实装版本各自新增的角色、光锥与遗器，快速了解版本间的收录差异。"
      >
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {hasData ? (
            <>
              <label className="flex items-center gap-1.5 text-slate-400">
                版本 A
                <select
                  value={version}
                  onChange={(e) => switchBase(e.target.value)}
                  className={selectClass}
                  aria-label="基准版本"
                >
                  {allVersions.map((v) => (
                    <option key={v} value={v}>
                      v{v}
                    </option>
                  ))}
                </select>
              </label>
              <span className="font-display text-slate-600">↔</span>
              <label className="flex items-center gap-1.5 text-slate-400">
                版本 B
                <select
                  value={withVersion}
                  onChange={(e) => switchWith(e.target.value)}
                  className={selectClass}
                  aria-label="对比版本"
                >
                  {allVersions
                    .filter((v) => v !== version)
                    .map((v) => (
                      <option key={v} value={v}>
                        v{v}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : null}
          <Link
            to={versionLink(version)}
            className="ml-auto inline-flex items-center gap-1 text-gold-300 transition hover:text-gold-400"
          >
            <ArrowLeftIcon className="size-3.5" />
            返回版本详情
          </Link>
        </div>
      </PageHeader>

      {!canCompare ? (
        <EmptyState
          title={hasData ? '该版本暂无可对比的版本' : '暂无版本数据'}
          hint={
            hasData
              ? '对比至少需要数据中存在两个版本，可通过「数据管理」或导入备份补充。'
              : '数据中尚未收录任何版本，可通过「数据管理」录入或导入备份数据。'
          }
        />
      ) : (
        <div className="space-y-8">
          <DiffSection
            title="实装角色"
            diff={versionChars}
            label={(c) => c.name}
            meta={characterRow}
          />
          <DiffSection
            title="实装光锥"
            diff={versionCones}
            label={(lc) => lc.name}
            meta={lightConeRow}
          />
          <DiffSection
            title="实装遗器"
            diff={versionRelics}
            label={(r) => r.name}
            meta={relicRow}
          />
        </div>
      )}
    </div>
  );
}
