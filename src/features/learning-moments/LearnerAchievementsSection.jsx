import { useQuery } from '@tanstack/react-query';
import { Card, ContextualErrorState, SkeletonText } from '@/components/ui';
import { getSession } from '@/app/auth/session.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { getLearnerAchievements } from './learningMomentsApi.js';
import { CELEBRATION_ACCENTS, describeAchievement } from './momentCatalog.js';
import CelebrationVisual from './CelebrationVisual.jsx';

/**
 * Achievement history: only achievements the server derived from real learning data (no placeholder badges),
 * with the date each was reached when known, plus the nearest real next goals.
 */
export default function LearnerAchievementsSection() {
  const { tr, trf } = useLocale();
  const session = getSession();
  const query = useQuery({
    queryKey: ['learning-moments', 'achievements', session?.userId ?? 'anon'],
    queryFn: getLearnerAchievements,
    enabled: Boolean(session?.accessToken),
    staleTime: 60_000,
  });

  const achieved = (query.data?.achieved || [])
    .map((a) => ({ a, view: describeAchievement(a, tr, trf) }))
    .filter((x) => x.view);
  const next = (query.data?.next || [])
    .map((a) => ({ a, view: describeAchievement(a, tr, trf) }))
    .filter((x) => x.view);

  return (
    <Card padding="lg" className="space-y-4 border-[#EAE3E4] bg-white">
      <div>
        <h3 className="text-[16px] font-extrabold text-rp-navy">{tr('Thành tích của tôi')}</h3>
        <p className="mt-0.5 text-xs text-rp-text-muted">{tr('Các cột mốc bạn đã đạt được trong hành trình học.')}</p>
      </div>

      {query.isPending ? (
        <SkeletonText lines={3} />
      ) : query.isError ? (
        <ContextualErrorState variant="inline" compact error={query.error} title={tr('Chưa tải được thành tích')} onRetry={() => query.refetch()} />
      ) : achieved.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-rp-line bg-rp-bg-2/60 px-4 py-5 text-center text-[13px] text-rp-text-muted">
          {tr('Bạn chưa có thành tích nào. Hoàn thành bài học đầu tiên để nhận huy hiệu đầu tiên nhé!')}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] gap-2.5">
          {achieved.map(({ a, view }) => (
            <li key={`${a.code}-${a.value ?? ''}`} className="rp-srs-card-hover flex items-center gap-3 rounded-2xl border border-[#F1E6D6] bg-[#FFFBF5] px-3.5 py-3">
              <CelebrationVisual visual={view.visual} accent={CELEBRATION_ACCENTS[view.accent] || CELEBRATION_ACCENTS.sakura} animation="none" size="sm" centered={false} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-extrabold text-rp-navy">{view.title}</span>
                <span className="block truncate text-xs text-rp-text-muted">
                  {a.achievedAtUtc ? formatVnDateTime(a.achievedAtUtc) : view.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {next.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-rp-line pt-3 text-xs text-rp-text-2">
          <span className="font-bold text-rp-text-muted">{tr('Mục tiêu tiếp theo')}:</span>
          {next.map(({ a, view }) => (
            <span key={`${a.code}-${a.value ?? ''}`} className="inline-flex items-center gap-1 rounded-full bg-rp-bg-2 px-2.5 py-1 font-semibold">
              <CelebrationVisual visual={view.visual} accent={CELEBRATION_ACCENTS[view.accent] || CELEBRATION_ACCENTS.sakura} animation="none" size="xs" centered={false} />
              {view.title}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
