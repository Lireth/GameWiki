import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { PathBadge, RarityStars } from '../components/ui/Badges';
import { RelatedEvents } from '../components/ui/RelatedEvents';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { FieldRow, PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  FAVORITE_PREFIX,
  useBootstrapStatus,
  useLightConeById,
  useLightConeCount,
  useNewsEvents,
} from '../hooks/useWikiData';
import { formatDateCN } from '../lib/format';
import { versionLink } from '../lib/links';
import { ACQUISITION_LABEL, PATH_META } from '../lib/meta';

export function LightConeDetailPage() {
  const { id } = useParams();
  const lightCone = useLightConeById(id);
  const lightConeCount = useLightConeCount();
  const newsEvents = useNewsEvents();
  const dataReady = useBootstrapStatus() === 'ok';
  const [failedImage, setFailedImage] = useState<string | null>(null);

  if (!lightCone) {
    return (
      <div>
        <PageHeader en="Light Cone" title="光锥详情" />
        {lightConeCount === 0 ? (
          dataReady ? (
            <EmptyState
              title="暂无光锥数据"
              hint="光锥数据尚未收录，可通过页脚「数据管理」录入，或导入备份数据。"
            />
          ) : (
            <LoadingState />
          )
        ) : (
          <EmptyState
            title="未找到该光锥"
            hint="该光锥不存在或已被移除，可返回图鉴重新选择。"
          />
        )}
        <div className="mt-6 text-center">
          <Link
            to="/light-cones"
            className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400"
          >
            <ArrowLeftIcon className="size-4" />
            返回光锥图鉴
          </Link>
        </div>
      </div>
    );
  }

  const path = PATH_META[lightCone.path];
  /** 该光锥的实装 / 卡池 / 活动时间线（RelatedEvents 内部按日期排序） */
  const relatedEvents = newsEvents.filter(
    (event) => event.relatedLightConeId === lightCone.id,
  );
  const showImage = lightCone.image && failedImage !== lightCone.image;

  return (
    <div>
      <Link
        to="/light-cones"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-gold-300"
      >
        <ArrowLeftIcon className="size-4" />
        返回光锥图鉴
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel className="self-start overflow-hidden" ticks>
          <div
            className="relative flex h-44 items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(150deg, ${path.color}26, transparent 70%)`,
            }}
          >
            {showImage ? (
              <img
                src={lightCone.image}
                alt={lightCone.name}
                loading="lazy"
                decoding="async"
                onError={() => setFailedImage(lightCone.image ?? null)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="size-20 rotate-45 border-2"
                style={{ borderColor: `${path.color}77` }}
              />
            )}
          </div>
          <div className="p-5">
            <RarityStars rarity={lightCone.rarity} />
            <div className="mt-2 flex items-center gap-2">
              <h1 className="min-w-0 flex-1 font-display text-3xl font-bold text-slate-50">
                {lightCone.name}
              </h1>
              <FavoriteButton
                favoriteKey={`${FAVORITE_PREFIX.lightCone}${lightCone.id}`}
              />
            </div>
            <div className="mt-3">
              <PathBadge id={lightCone.path} />
            </div>
          </div>
        </Panel>

        <div>
          <Panel className="px-5 py-2 md:px-7" ticks>
            <dl>
              <FieldRow label="稀有度">
                <RarityStars rarity={lightCone.rarity} className="align-middle" />
              </FieldRow>
              <FieldRow label="命途">
                <span className="mr-2">{path.label}</span>
                <span className="font-display text-xs tracking-widest text-slate-500">
                  {path.en}
                </span>
              </FieldRow>
              <FieldRow label="获取方式">
                {lightCone.acquisition
                  ? ACQUISITION_LABEL[lightCone.acquisition]
                  : '—'}
              </FieldRow>
              <FieldRow label="实装日期">
                {lightCone.releaseDate ? formatDateCN(lightCone.releaseDate) : '—'}
              </FieldRow>
              <FieldRow label="实装版本">
                {lightCone.releaseVersion ? (
                  <Link
                    to={versionLink(lightCone.releaseVersion)}
                    title="查看该版本全部内容"
                    className="font-display transition hover:text-gold-300"
                  >
                    v{lightCone.releaseVersion}
                  </Link>
                ) : (
                  '—'
                )}
              </FieldRow>
            </dl>
          </Panel>

          {lightCone.description && (
            <Panel className="mt-6 p-5 md:p-7">
              <h2 className="text-lg font-semibold text-slate-100">光锥描述</h2>
              <p className="mt-3 leading-loose whitespace-pre-line text-slate-400">
                {lightCone.description}
              </p>
            </Panel>
          )}

          <RelatedEvents events={relatedEvents} />
        </div>
      </div>
    </div>
  );
}
