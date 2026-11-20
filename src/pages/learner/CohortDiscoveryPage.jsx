import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useLocale } from '@/locales/locale.js';
import { Banner, Button, Card, ContextualErrorState, PageContainer, PageHeader, SakuraLoader } from '@/components/ui';
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
        <PageHeader
          eyebrow={tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
          title={tr('Khám phá lớp học nhóm JLPT')}
          description={tr('So sánh lịch khai giảng, cấp độ JLPT, Giáo viên phụ trách và đăng ký tham gia trực tiếp bằng quyền học hoặc thanh toán PayOS.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button as={Link} to="/mentors" variant="secondary" size="sm">
                {tr('Tìm Giáo viên')}
              </Button>
              <Button as={Link} to="/my-courses" variant="primary" size="sm" iconRight={ArrowRight}>
                {tr('Lớp của tôi')}
              </Button>
            </div>
          }
        />

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
          <Card className="p-8">
            <SakuraLoader context="cohort" label={tr('Đang tải danh sách lớp nhóm...')} />
          </Card>
        ) : cohortsQuery.isError ? (
          <Card className="p-6">
            <ContextualErrorState
              error={cohortsQuery.error}
              title={tr('Chưa tải được danh sách lớp')}
              onRetry={() => cohortsQuery.refetch()}
              retrying={cohortsQuery.isFetching}
            />
          </Card>
        ) : (
          <div className="course-page" style={{ padding: 0 }}>
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => cohortsQuery.refetch()}
                disabled={cohortsQuery.isFetching}
                loading={cohortsQuery.isFetching}
                icon={RefreshCw}
              >
                {tr('Làm mới danh sách')}
              </Button>
            </div>
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
