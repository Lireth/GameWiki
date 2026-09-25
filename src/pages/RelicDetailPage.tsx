import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/icons';
import { RarityStars } from '../components/ui/Badges';
import { EmptyState, LoadingState } from '../components/ui/EmptyState';
import { FieldRow, PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  FAVORITE_PREFIX,
  useBootstrapStatus,
  useRelicById,
  useRelicCount,
} from '../hooks/useWikiData';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { formatDateCN } from '../lib/format';
import { versionLink } from '../lib/links';
import { RELIC_CATEGORY_META, RELIC_SLOT_LABEL } from '../lib/meta';
import { useEntityImage } from '../hooks/useEntityImage';
import { RelatedEvents } from '../components/ui/RelatedEvents';
import { useNewsEvents } from '../hooks/useWikiData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function RelicDetailPage() {
  const { id } = useParams();
  const relic = useRelicById(id);
  const relicCount = useRelicCount();
  const newsEvents = useNewsEvents();
  const dataReady = useBootstrapStatus() === 'ok';
  const imageSrc = useEntityImage(relic?.image);
  useDocumentTitle(relic ? `${relic.name} · 遗器详情` : '遗器详情');

  if (!relic) {
    return (
      <div>
        <PageHeader en="Relic" title="遗器详情" />
        {relicCount === 0 ? (
          dataReady ? (
            <EmptyState
              title="暂无遗器数据"
              hint="遗器数据尚未收录，可通过页脚「数据管理」录入，或导入备份数据。"
            />
          ) : (
            <LoadingState />
          )
        ) : (
          <EmptyState
            title="未找到该遗器"
            hint="该遗器不存在或已被移除，可返回图鉴重新选择。"
          />
        )}
        <div className="mt-6 text-center">
          <Link
            to="/relics"
            className="inline-flex items-center gap-1.5 text-sm text-gold-300 hover:text-gold-400"
          >
            <ArrowLeftIcon className="size-4" />
            返回遗器图鉴
          </Link>
        </div>
      </div>
    );
  }

  const category = RELIC_CATEGORY_META[relic.category];
  /** 该遗器的实装 / 活动时间线（RelatedEvents 内部按日期排序） */
  const relatedEvents = newsEvents.filter(
    (event) => event.relatedRelicId === relic.id,
  );

  return (
    <div>
      <Link
        to="/relics"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-gold-300"
      >
        <ArrowLeftIcon className="size-4" />
        返回遗器图鉴
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* 侧栏：图片占位 + 基本信息 */}
        <Panel className="self-start overflow-hidden" ticks>
          <div
            className="relative flex h-44 items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(150deg, ${category.color}30, transparent 70%)`,
            }}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={relic.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="size-24 rotate-45 border-2"
                style={{ borderColor: `${category.color}77` }}
              />
            )}
          </div>
          <div className="p-5">
            <RarityStars rarity={relic.rarity} />
            <div className="mt-2 flex items-center gap-2">
              <h1 className="min-w-0 flex-1 font-display text-3xl font-bold text-slate-50">
                {relic.name}
              </h1>
              <FavoriteButton
                favoriteKey={`${FAVORITE_PREFIX.relic}${relic.id}`}
              />
            </div>
            <div className="mt-3">
              <span
                className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs leading-5"
                style={{
                  color: category.color,
                  borderColor: `${category.color}55`,
                  backgroundColor: `${category.color}14`,
                }}
              >
                <i aria-hidden className="size-1.5 rotate-45 bg-current" />
                {category.label}
              </span>
            </div>
          </div>
        </Panel>

        {/* 资料字段 */}
        <div>
          <Panel className="px-5 py-2 md:px-7" ticks>
            <dl>
              <FieldRow label="稀有度">
                <RarityStars rarity={relic.rarity} className="align-middle" />
              </FieldRow>
              <FieldRow label="类别">{category.label}</FieldRow>
              <FieldRow label="实装日期">
                {relic.releaseDate ? formatDateCN(relic.releaseDate) : '—'}
              </FieldRow>
              <FieldRow label="实装版本">
                {relic.releaseVersion ? (
                  <Link
                    to={versionLink(relic.releaseVersion)}
                    title="查看该版本全部内容"
                    className="font-display transition hover:text-gold-300"
                  >
                    v{relic.releaseVersion}
                  </Link>
                ) : (
                  '—'
                )}
              </FieldRow>
              <FieldRow label="二件套效果">
                <span className="leading-relaxed">{relic.effect2}</span>
              </FieldRow>
              {relic.effect4 && (
                <FieldRow label="四件套效果">
                  <span className="leading-relaxed">{relic.effect4}</span>
                </FieldRow>
              )}
            </dl>
          </Panel>

          {relic.pieces && relic.pieces.length > 0 && (
            <Panel className="mt-6 p-5 md:p-7" ticks>
              <h2 className="text-lg font-semibold text-slate-100">套装部件</h2>
              <ul className="mt-3">
                {relic.pieces.map((piece) => (
                  <li
                    key={piece.slot}
                    className="border-b border-space-700/50 py-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="border px-2 py-0.5 text-xs leading-5"
                        style={{
                          color: category.color,
                          borderColor: `${category.color}55`,
                          backgroundColor: `${category.color}14`,
                        }}
                      >
                        {RELIC_SLOT_LABEL[piece.slot]}
                      </span>
                      <span className="text-sm text-slate-200">{piece.name}</span>
                    </div>
                    {piece.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        {piece.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {relic.description && (
            <Panel className="mt-6 p-5 md:p-7">
              <h2 className="text-lg font-semibold text-slate-100">套装说明</h2>
              <p className="mt-3 leading-loose whitespace-pre-line text-slate-400">
                {relic.description}
              </p>
            </Panel>
          )}

          <RelatedEvents events={relatedEvents} />
        </div>
      </div>
    </div>
  );
}
