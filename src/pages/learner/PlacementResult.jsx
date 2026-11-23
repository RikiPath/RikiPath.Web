import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getPlacementResult } from '@/features/placement/api/placementApi.js';
import AssessmentResultDashboard from '@/features/mock-test/components/AssessmentResultDashboard.jsx';
import {
  Button,
  Card,
  ErrorState,
  PageContainer,
  SakuraLoader,
} from '@/components/ui';

/** Placement result: wide 5-row Sakura analytics dashboard with Radar + table, skill feedback, breakdown panel, and next actions. */
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
  const displayLevel = result?.assessedJlptLevelName || result?.screeningLevelName || result?.recommendedTargetJlptLevelName || '—';

  return (
    <LearnerShell breadcrumb={tr('Kết quả đánh giá')}>
      <PageContainer data-page="PlacementResult" width="wide" density="comfortable" className="text-rp-text">
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
            badgeText={tr('Kết quả đánh giá năng lực')}
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
