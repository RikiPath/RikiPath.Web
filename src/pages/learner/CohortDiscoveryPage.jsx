import { useNavigate, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import LearnerCohortDiscoveryPanel from '@/features/cohorts/components/LearnerCohortDiscoveryPanel';
import { useLearnerCohortWorkspace } from '@/features/cohorts/hooks/useLearnerCohortWorkspace.js';
import { useLocale } from '@/locales/locale.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  PageContainer,
  RefreshingIndicator,
  Skeleton,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';

function HorizontalCohortSkeletonList() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="rounded-rp-card border border-rp-line bg-rp-surface p-3.5">
        <div className="flex flex-wrap gap-2.5">
          <Skeleton className="h-10 w-52" rounded="rounded-xl" />
          <Skeleton className="h-10 w-36" rounded="rounded-xl" />
          <Skeleton className="h-10 w-32" rounded="rounded-xl" />
          <Skeleton className="h-10 w-36" rounded="rounded-xl" />
          <Skeleton className="h-10 w-36" rounded="rounded-xl" />
          <Skeleton className="h-10 w-24" rounded="rounded-xl" />
        </div>
      </div>
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @[940px]:grid-cols-2">
          {[1, 2, 3, 4].map((card) => (
            <div key={card} className="rounded-rp-card border border-rp-line bg-rp-surface p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-11" rounded="rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-28" rounded="rounded-full" />
              </div>
              <Skeleton className="h-4 w-60" />
              <div className="grid grid-cols-1 gap-4 border-y border-rp-line/60 py-3.5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-7 w-full" rounded="rounded-lg" />
                  <Skeleton className="h-7 w-full" rounded="rounded-lg" />
                  <Skeleton className="h-7 w-full" rounded="rounded-lg" />
                </div>
                <div className="space-y-2 sm:border-l sm:border-rp-line/60 sm:pl-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-4 w-36" rounded="rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" rounded="rounded-[10px]" />
                  <Skeleton className="h-8 w-28" rounded="rounded-[10px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CohortDiscoveryPage() {
  const { tr, trf } = useLocale();
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
  const initialCohortId = searchParams.get('cohortId') || '';

  const handleRefreshWorkspace = () => Promise.all([
    cohortsQuery.refetch({ cancelRefetch: true }),
    entitlementsQuery.refetch({ cancelRefetch: true }),
  ]);

  const isRefreshing = (cohortsQuery.isFetching || entitlementsQuery.isFetching) && !cohortsQuery.isPending;
  const usableEntitlementsCount = (Array.isArray(entitlements) ? entitlements.filter((e) => e.isUsable).length : 0);

  return (
    <LearnerShell breadcrumb={tr('Khám phá lớp học')}>
      <PageContainer width="wide" className="space-y-4">
        <IllustratedPageHeader
          icon="group"
          tone="sky"
          title={tr('Khám phá lớp học')}
          description={tr('So sánh lịch học, Giáo viên phụ trách, sĩ số và học phí để chọn lớp JLPT phù hợp.')}
          actions={
            !cohortsQuery.isPending && !cohortsQuery.isError && usableEntitlementsCount > 0 ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge tone="success" size="md">
                  {trf('Bạn có {0} quyền ghi danh khả dụng', { 0: usableEntitlementsCount })}
                </Badge>
              </div>
            ) : null
          }
        />

        {isRefreshing && (
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
          <HorizontalCohortSkeletonList />
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
          <LearnerCohortDiscoveryPanel
            cohorts={cohorts}
            enrolledCourses={courses}
            myEntitlements={entitlements}
            busy={busy}
            refreshing={isRefreshing}
            onRefresh={handleRefreshWorkspace}
            onRun={runAction}
            initialMentorId={initialMentorId}
            initialCohortId={initialCohortId}
            onEnrolled={(courseId, actionKind) => {
              if (courseId && actionKind !== 'resume_payment') navigate(`/my-courses/${courseId}`);
              else navigate('/my-courses');
            }}
          />
        )}
      </PageContainer>
    </LearnerShell>
  );
}
