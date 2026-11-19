import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getPlacementResult } from '@/features/placement/api/placementApi.js';
import { Badge, Card, CardHeader, ErrorState, HaruMascot, ProgressBar, SakuraLoader } from '@/components/ui';

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
      <div data-page="PlacementResult" className="rp-container-reading py-6 lg:py-8">
        {query.isPending && (
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải kết quả đánh giá')} delay={160} />
        )}
        {query.isError && <Card><ErrorState error={query.error} title={tr('Chưa tải được kết quả')} onRetry={() => query.refetch()} retrying={query.isFetching} /></Card>}

        {result && (
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-rp-card-lg border border-rp-line bg-rp-surface">
              <div className="rp-pattern-seigaiha absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
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
                    <Link to="/roadmap/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press">
                      {tr('Xem lộ trình gợi ý')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                    <Link to="/placement/" className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
                      <RotateCcw aria-hidden="true" className="h-4 w-4" /> {tr('Về trang đánh giá')}
                    </Link>
                  </div>
                </div>
                <HaruMascot pose="celebrating" size={140} className="hidden shrink-0 sm:block" />
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              {result.levelBreakdowns?.length > 0 && (
                <Card>
                  <CardHeader title={tr('Theo cấp độ')} />
                  <ul className="space-y-4">
                    {result.levelBreakdowns.map((item) => (
                      <li key={item.jlptLevelId}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-semibold text-rp-text">{item.jlptLevelName}</span>
                          <span className="tabular-nums text-rp-text-muted">{item.correctCount}/{item.totalCount} · {Math.round(item.scorePercent)}%</span>
                        </div>
                        <ProgressBar value={item.scorePercent} max={100} label={`${item.jlptLevelName}`} />
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {result.sections?.length > 0 && (
                <Card>
                  <CardHeader title={tr('Theo phần thi')} />
                  <ul className="space-y-4">
                    {result.sections.map((item) => {
                      const pct = item.totalCount ? (item.correctCount / item.totalCount) * 100 : 0;
                      return (
                        <li key={item.mockTestSectionId}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="font-semibold text-rp-text">{item.sectionTitle || item.languageSkillName}</span>
                            <span className="tabular-nums text-rp-text-muted">{item.correctCount}/{item.totalCount}</span>
                          </div>
                          <ProgressBar value={pct} max={100} label={item.sectionTitle || item.languageSkillName} />
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
