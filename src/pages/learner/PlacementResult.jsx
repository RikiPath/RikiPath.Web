import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getPlacementResult } from '@/features/placement/api/placementApi.js';
import { Badge, Button, Card, CardHeader, ErrorState, HaruMascot, PageContainer, ProgressBar, SakuraLoader } from '@/components/ui';

/** Placement result: estimated level, recommendation and per-level / per-section breakdown (all from the API). */
export default function PlacementResult() {
  const { attemptId } = useParams();
  const { tr } = useLocale();
  const uid = getSession()?.userId ?? 'anon';
  const query = useQuery({
    queryKey: ['placement-result', uid, attemptId],
    queryFn: () => getPlacementResult(attemptId),
    enabled: Boolean(attemptId),
  });
  const result = query.data;

  return (
    <LearnerShell breadcrumb={tr('Kết quả đánh giá')}>
      <PageContainer data-page="PlacementResult" width="reading" density="comfortable" className="text-rp-text">
        {query.isPending && (
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải kết quả đánh giá')} delay={160} />
        )}
        {query.isError && <Card><ErrorState error={query.error} title={tr('Chưa tải được kết quả')} onRetry={() => query.refetch()} retrying={query.isFetching} /></Card>}

        {result && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-rp-card-lg border border-rp-line bg-rp-surface">
              <div className="rp-pattern-seigaiha absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rp-brand">{tr('Kết quả đánh giá năng lực')}</p>
                  <p className="mt-3 text-sm text-rp-text-muted">{tr('Trình độ ước tính')}</p>
                  <p className="text-[40px] font-extrabold leading-tight text-rp-brand-strong">{result.assessedJlptLevelName || '—'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-rp-text-2">
                    <Badge tone="info" icon={false}>{result.correctCount}/{result.totalQuestions} {tr('câu đúng')}</Badge>
                    <Badge tone="neutral" icon={false}>{Math.round(result.totalScore)}%</Badge>
                    {result.recommendedTargetJlptLevelName && <Badge tone="brand" icon={false}>{tr('Nên ôn tới')} {result.recommendedTargetJlptLevelName}</Badge>}
                  </div>
                  <p className="mt-3 text-xs text-rp-text-muted">{tr('Đây là ước tính để gợi ý lộ trình, không phải kết quả JLPT chính thức.')}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to="/roadmap/">
                      <Button variant="primary" iconRight={ArrowRight}>{tr('Xem lộ trình gợi ý')}</Button>
                    </Link>
                    <Link to="/placement/">
                      <Button variant="secondary" icon={RotateCcw}>{tr('Về trang đánh giá')}</Button>
                    </Link>
                  </div>
                </div>
                <HaruMascot pose="celebrating" size={140} className="hidden shrink-0 sm:block" />
              </div>
            </section>

            <LearnerFeedbackPanel type="placement" id={Number(attemptId)} label="Phản hồi về bài đánh giá năng lực" />
            {result.levelBreakdowns?.length > 0 && (
              <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                <h2 className="text-[15px] font-semibold">{tr('Theo cấp độ')}</h2>
                <ul className="mt-3 space-y-2">
                  {result.levelBreakdowns.map((item) => (
                    <li key={item.jlptLevelId} className="flex items-center justify-between text-[13px]">
                      <span>{item.jlptLevelName}</span>
                      <span className="text-[#8C7782]">
                        {item.correctCount}/{item.totalCount} · {Math.round(item.scorePercent)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.sections?.length > 0 && (
              <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                <h2 className="text-[15px] font-semibold">{tr('Theo phần')}</h2>
                <ul className="mt-3 space-y-2">
                  {result.sections.map((item) => (
                    <li key={item.mockTestSectionId} className="flex items-center justify-between text-[13px]">
                      <span>{item.sectionTitle || item.languageSkillName}</span>
                      <span className="text-[#8C7782]">{item.correctCount}/{item.totalCount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
