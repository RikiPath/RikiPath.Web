import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { DataRefreshBoundary, RefreshButton } from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { useAdminAction } from '@/features/admin/hooks/useAdminAction.js';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import AdminRetakeSupportPanel from '@/features/cohorts/components/AdminRetakeSupportPanel.jsx';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

export default function AdminRetakeSupport() {
  const { tr } = useLocale();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const [selectedCourseId, setSelectedCourseId] = useState(() => (courseIdParam ? Number(courseIdParam) : null));

  const snapshotQuery = useQuery({
    queryKey: ['admin-retake-support-snapshot'],
    queryFn: async () => {
      const [courses, cohorts] = await Promise.all([courseGet(), getCohorts()]);
      return {
        courses: Array.isArray(courses) ? courses : [],
        cohorts: Array.isArray(cohorts) ? cohorts : [],
      };
    },
  });

  const { busy, runAction } = useAdminAction({
    toastKey: 'admin-retake-support',
    onAfterSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-retake-support-snapshot'] }),
  });

  const { courses, cohorts } = snapshotQuery.data || { courses: [], cohorts: [] };

  return (
    <AdminShell breadcrumb={tr('Ghi danh & ôn lại JLPT')}>
      <main data-page="AdminRetakeSupport" className="rp-container py-[var(--rp-space-page-y)] space-y-4 text-rp-text">
        <AdminPageHeader
          icon={RefreshCw}
          title="Ghi danh & ôn lại JLPT"
          actions={
            <div className="flex items-center gap-2">
              {snapshotQuery.isSuccess && courses.length > 0 && (
                <RefreshButton
                  onRefresh={() => snapshotQuery.refetch({ cancelRefetch: true })}
                  refreshing={snapshotQuery.isFetching && !snapshotQuery.isPending}
                  disabled={busy || snapshotQuery.isPending}
                />
              )}
            </div>
          }
        />

        <DataRefreshBoundary
          queries={[snapshotQuery]}
          loading={snapshotQuery.isPending}
          refreshing={snapshotQuery.isFetching && !snapshotQuery.isPending}
          error={snapshotQuery.error}
          hasData={Boolean(snapshotQuery.data)}
          isEmpty={false}
          loadingContext="cohort"
          loadingDelay={140}
          errorTitle={tr('Chưa tải được danh sách ghi danh')}
          onRetry={() => snapshotQuery.refetch({ cancelRefetch: true })}
        >
          <AdminRetakeSupportPanel
            courses={courses}
            cohorts={cohorts}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            busy={busy}
            onRun={runAction}
          />
        </DataRefreshBoundary>
      </main>
    </AdminShell>
  );
}
