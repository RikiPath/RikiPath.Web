import { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import { useAdminAction } from '@/features/admin/hooks/useAdminAction.js';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import { useLocale } from '@/locales/locale.js';

export default function AdminComplaints() {
  const { tr } = useLocale();
  const [searchParams] = useSearchParams();
  const [refreshTick, setRefreshTick] = useState(0);
  const { busy, runAction } = useAdminAction({
    toastKey: 'admin-complaints',
    onAfterSuccess: () => setRefreshTick((t) => t + 1),
  });

  return (
    <AdminShell breadcrumb={tr('Khiếu nại khóa học')}>
      <AdminWorkspace data-page="AdminComplaints" viewportLocked>
        <AdminPageHeader
          icon={MessageSquareWarning}
          title="Khiếu nại khóa học"
        />

        <AdminCohortComplaintsPanel
          busy={busy}
          fillHeight
          refreshSignal={refreshTick}
          initialComplaintId={searchParams.get('complaintId')}
          onRun={runAction}
        />
      </AdminWorkspace>
    </AdminShell>
  );
}
