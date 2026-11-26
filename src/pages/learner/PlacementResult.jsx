import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, Clock, Compass, GitCompareArrows, RotateCcw } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { getPlacementResult } from '@/features/placement/api/placementApi.js';
import { formatDurationSeconds, resolveStatusMeta } from '@/features/mock-test/utils/practiceStatusHelpers.js';
import AssessmentResultDashboard from '@/features/mock-test/components/AssessmentResultDashboard.jsx';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import {
  Badge,
  Button,
  Card,
  DetailPageHeader,
  ErrorState,
  PageContainer,
  SakuraLoader,
} from '@/components/ui';

function formatPlacementDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

/** Placement result: compact detail header + two-column workspace with left sidebar score summary. */
export default function PlacementResult() {
  const { attemptId } = useParams();
  const { tr, trf } = useLocale();
  const uid = getSession()?.userId ?? 'anon';
  const query = useQuery({
    queryKey: ['placement-result', uid, attemptId],
    queryFn: () => getPlacementResult(attemptId),
    enabled: Boolean(attemptId),
  });
  const result = query.data;
  const displayLevel =
    result?.assessedJlptLevelName || result?.screeningLevelName || result?.recommendedTargetJlptLevelName || '—';
  const submittedStr = formatPlacementDate(result?.submittedAt || result?.startedAt);
  const durationStr = result?.durationSeconds != null ? formatDurationSeconds(result.durationSeconds, trf) : null;
  const statusMeta = result ? resolveStatusMeta(result.status || 'completed', tr) : null;

  const headerSubtitle = result
    ? (result.isComprehensiveAssessment
      ? tr('Đánh giá tổng hợp năng lực JLPT')
      : result.screeningLevelName
        ? trf('Đánh giá năng lực đầu vào JLPT {0}', { 0: result.screeningLevelName })
        : tr('Đánh giá năng lực đầu vào JLPT'))
    : undefined;

  return (
    <LearnerShell breadcrumb={tr('Kết quả đánh giá')}>
      <PageContainer data-page="PlacementResult" width="wide" density="comfortable" className="space-y-4 text-rp-text">
        <DetailPageHeader
          compact
          backFallbackTo="/placement/"
          backLabel="Về trang đánh giá"
          backOriginLabel="Quay lại lịch sử"
          restoreListKey="/exam-result"
          icon={Compass}
          title={tr('Kết quả đánh giá năng lực')}
          subtitle={headerSubtitle}
          badges={
            result && (
              <>
                {displayLevel !== '—' && (
                  <Badge tone="brand" size="sm" icon={false}>
                    {tr('Ước tính:')} {displayLevel}
                  </Badge>
                )}
                {result.recommendedTargetJlptLevelName && (
                  <Badge tone="info" size="sm" icon={false}>
                    {tr('Mục tiêu')} {result.recommendedTargetJlptLevelName}
                  </Badge>
                )}
                {statusMeta && (
                  <Badge tone={statusMeta.tone} size="sm" icon={false}>
                    {statusMeta.label}
                  </Badge>
                )}
              </>
            )
          }
          meta={
            result && (
              <>
                {submittedStr && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                    {submittedStr}
                  </span>
                )}
                {result.totalQuestions > 0 && (
                  <span className="inline-flex items-center gap-1">
                    {trf('{0} câu hỏi', { 0: result.totalQuestions })}
                  </span>
                )}
                {durationStr && durationStr !== '—' && (
                  <span className="inline-flex items-center gap-1">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    {durationStr}
                  </span>
                )}
              </>
            )
          }
          actions={
            <>
              {attemptId && (
                <Button
                  as={Link}
                  to={`/exam-result/?tab=compare&attemptId=${attemptId}`}
                  variant="outline"
                  size="sm"
                  icon={GitCompareArrows}
                >
                  {tr('So sánh kết quả')}
                </Button>
              )}
              <Button as={Link} to="/placement/" variant="primary" size="sm" icon={RotateCcw}>
                {tr('Về trang đánh giá')}
              </Button>
            </>
          }
        />

        {query.isPending && (
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải kết quả đánh giá')} delay={160} />
        )}
        {query.isError && (
          <Card>
            <ErrorState error={query.error} title={tr('Chưa tải được kết quả')} onRetry={() => query.refetch()} retrying={query.isFetching} />
          </Card>
        )}

        {result && (
          <AssessmentResultDashboard
            result={result}
            onceKey={attemptId ? `placement-result-${attemptId}` : undefined}
            badgeText={tr('Điểm đánh giá năng lực')}
            estimatedLevelLabel={displayLevel}
            targetLevelLabel={result.recommendedTargetJlptLevelName ? `${tr('Nên ôn tới')} ${result.recommendedTargetJlptLevelName}` : undefined}
            chartTarget={result.recommendedTargetJlptLevelName || displayLevel}
            primaryCtaTo="/roadmap/?generateAi=1"
            primaryCtaLabel={tr('Tạo lộ trình học với AI')}
            footerActions={
              <>
                <Button as={Link} to="/roadmap/" variant="secondary" size="sm" iconRight={ArrowRight}>
                  {tr('Xem lộ trình học')}
                </Button>
                <Button as={Link} to="/riki/listening/" variant="ghost" size="sm">
                  {tr('Tự ôn với audio')}
                </Button>
                <Button as={Link} to="/cohorts/" variant="ghost" size="sm">
                  {tr('Tìm lớp nhóm cùng Giáo viên')}
                </Button>
                <Button as={Link} to="/placement/" variant="ghost" size="sm" icon={RotateCcw}>
                  {tr('Về trang đánh giá')}
                </Button>
              </>
            }
          />
        )}
      </PageContainer>
    </LearnerShell>
  );
}
