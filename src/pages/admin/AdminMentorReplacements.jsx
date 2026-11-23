import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { DataRefreshBoundary, RefreshButton } from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { useAdminAction } from '@/features/admin/hooks/useAdminAction.js';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import AdminMentorReplacementPanel from '@/features/cohorts/components/AdminMentorReplacementPanel.jsx';
import { useLocale } from '@/locales/locale.js';

export default function AdminMentorReplacements() {
  const { tr } = useLocale();
  const queryClient = useQueryClient();

  const snapshotQuery = useQuery({
    queryKey: ['admin-mentor-replacement-snapshot'],
    queryFn: async () => {
      const [cohorts, mentors] = await Promise.all([getCohorts(), courseGet('/mentors')]);
      return {
        cohorts: Array.isArray(cohorts) ? cohorts : [],
        mentors: Array.isArray(mentors) ? mentors : [],
      };
    },
  });

  const { busy, runAction } = useAdminAction({
    toastKey: 'admin-mentor-replacements',
    onAfterSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-mentor-replacement-snapshot'] }),
  });

  const data = snapshotQuery.data || { cohorts: [], mentors: [] };

  return (
    <AdminShell breadcrumb={tr('Đổi Giáo viên')}>
      <main data-page="AdminMentorReplacements" className="rp-container py-[var(--rp-space-page-y)] space-y-4 text-rp-text">
        <AdminPageHeader
          icon={UserCheck}
          title="Đổi Giáo viên"
          actions={
            snapshotQuery.isSuccess && (data.cohorts.length > 0 || data.mentors.length > 0) ? (
              <RefreshButton
                onRefresh={() => snapshotQuery.refetch({ cancelRefetch: true })}
                refreshing={snapshotQuery.isFetching && !snapshotQuery.isPending}
                disabled={busy || snapshotQuery.isPending}
              />
            ) : null
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
          errorTitle={tr('Chưa tải được dữ liệu lớp học và Giáo viên')}
          onRetry={() => snapshotQuery.refetch({ cancelRefetch: true })}
        >
          <AdminMentorReplacementPanel cohorts={data.cohorts} mentors={data.mentors} busy={busy} onRun={runAction} />
        </DataRefreshBoundary>
      </main>
    </AdminShell>
  );
}
