import { useNavigate, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useLocale } from '@/locales/locale.js';
import { Banner, Button, Card, ContextualErrorState, PageContainer, RefreshButton, RefreshingIndicator, SakuraLoader } from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import '@/pages/shared/studyCourses.css';

export default function CohortDiscoveryPage() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspace = useLearnerCohortWorkspace({ includeCohorts: true, includeEntitlements: true });

  const {
    courses,
    cohorts,
    entitlements,
    cohortsQuery,
    entitlementsQuery,
    busy,
    actionError,
    actionNotice,
    setActionError,
    setActionNotice,
    runAction,
  } = workspace;
  const initialMentorId = searchParams.get('mentorId') || '';

  return (
    <LearnerShell breadcrumb={tr('Khám phá lớp học')}>
      <PageContainer width="default" className="space-y-5">
        <IllustratedPageHeader
          icon="group"
          tone="sky"
          eyebrow={tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
          title={tr('Khám phá lớp học nhóm JLPT')}
          description={tr('So sánh lịch khai giảng, cấp độ JLPT, Giáo viên phụ trách và đăng ký tham gia trực tiếp bằng quyền học hoặc thanh toán trực tuyến.')}
          actions={
            !cohortsQuery.isPending && !cohortsQuery.isError && cohorts.length > 0 ? (
              <RefreshButton
                onRefresh={() => Promise.all([
                  cohortsQuery.refetch({ cancelRefetch: true }),
                  entitlementsQuery.refetch({ cancelRefetch: true }),
                ])}
                refreshing={(cohortsQuery.isFetching || entitlementsQuery.isFetching) && !cohortsQuery.isPending}
                disabled={cohortsQuery.isPending}
              />
            ) : null
          }
        />

        {(cohortsQuery.isFetching || entitlementsQuery.isFetching) && !cohortsQuery.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {actionError && (
          <Banner tone="danger" title={tr('Chưa thực hiện được')} onDismiss={() => setActionError('')}>
            {actionError}
          </Banner>
        )}

        {actionNotice && (
          <Banner tone="success" title={tr('Thông báo')} onDismiss={() => setActionNotice('')}>
            {actionNotice}
          </Banner>
        )}

        {entitlementsQuery.isError && (
          <Banner
            tone="warning"
            actions={
              <Button variant="ghost" size="sm" onClick={() => entitlementsQuery.refetch()} loading={entitlementsQuery.isFetching}>
                {tr('Thử lại')}
              </Button>
            }
          >
            {tr('Chưa tải được quyền ghi danh hiện tại của tài khoản. Nếu bạn có quyền miễn phí hoặc ôn lại, hãy thử tải lại.')}
          </Banner>
        )}

        {cohortsQuery.isPending ? (
          <Card className="py-6">
            <SakuraLoader context="cohort" label={tr('Đang tải danh sách lớp nhóm...')} />
          </Card>
        ) : cohortsQuery.isError ? (
          <Card>
            <ContextualErrorState
              error={cohortsQuery.error}
              title={tr('Chưa tải được danh sách lớp')}
              onRetry={() => cohortsQuery.refetch()}
              retrying={cohortsQuery.isFetching}
            />
          </Card>
        ) : (
          <div className="course-page" style={{ padding: 0 }}>
            <LearnerCohortDiscoveryPanel
              cohorts={cohorts}
              enrolledCourses={courses}
              myEntitlements={entitlements}
              busy={busy}
              onRun={runAction}
              initialMentorId={initialMentorId}
              onEnrolled={(courseId) => {
                if (courseId) navigate(`/my-courses/${courseId}`);
                else navigate('/my-courses');
              }}
            />
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
