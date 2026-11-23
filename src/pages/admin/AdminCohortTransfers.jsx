import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import { useAdminAction } from '@/features/admin/hooks/useAdminAction.js';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import { useLocale } from '@/locales/locale.js';

export default function AdminCohortTransfers() {
  const { tr } = useLocale();
  const [searchParams] = useSearchParams();
  const [refreshTick, setRefreshTick] = useState(0);
  const { busy, runAction } = useAdminAction({
    toastKey: 'admin-transfers',
    onAfterSuccess: () => setRefreshTick((t) => t + 1),
  });

  return (
    <AdminShell breadcrumb={tr('Chuyển lớp')}>
      <AdminWorkspace data-page="AdminCohortTransfers" viewportLocked>
        <AdminPageHeader
          icon={ArrowLeftRight}
          title="Chuyển lớp"
        />

        <AdminCohortTransferQueuePanel
          busy={busy}
          fillHeight
          refreshSignal={refreshTick}
          initialTransferId={searchParams.get('transferRequestId')}
          onRun={runAction}
        />
      </AdminWorkspace>
    </AdminShell>
  );
}
