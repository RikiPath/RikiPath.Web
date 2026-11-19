import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useLocale } from '@/locales/locale.js';
import { Banner, Card, ContextualErrorState, PageHeader, SakuraLoader } from '@/components/ui';
import '@/pages/shared/studyCourses.css';

export default function CohortDiscoveryPage() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspace = useLearnerCohortWorkspace({ includeCohorts: true, includeEntitlements: true });

  const { courses, cohorts, entitlements, cohortsQuery, busy, actionError, actionNotice, setActionError, setActionNotice, runAction } = workspace;
  const initialMentorId = searchParams.get('mentorId') || '';

  return (
    <LearnerShell breadcrumb={tr('Khám phá lớp học')}>
      <div className="rp-container space-y-5 py-6 lg:py-8">
        <PageHeader
          eyebrow={tr('Học nhóm · 10 tuần · 90 phút/buổi · 1–4 học viên')}
          title={tr('Khám phá lớp học nhóm JLPT')}
          description={tr('So sánh lịch khai giảng, cấp độ JLPT, Giáo viên phụ trách và đăng ký tham gia trực tiếp bằng gói hoặc thanh toán PayOS.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/mentors"
                className="rp-focus inline-flex h-10 items-center rounded-xl border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text hover:bg-rp-muted"
              >
                {tr('Tìm Giáo viên')}
              </Link>
              <Link
                to="/my-courses"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                {tr('Lớp của tôi')}
                <ArrowRight className="h-4 w-4" />
              </Link>
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
              <button
                type="button"
                onClick={() => cohortsQuery.refetch()}
                disabled={cohortsQuery.isFetching}
                className="rp-focus inline-flex items-center gap-1.5 rounded-xl border border-rp-line bg-rp-surface px-3 py-1.5 text-xs font-semibold text-rp-text hover:bg-rp-muted"
              >
                <RefreshCw className={cohortsQuery.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                {tr('Làm mới danh sách')}
              </button>
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
      </div>
    </LearnerShell>
  );
}
