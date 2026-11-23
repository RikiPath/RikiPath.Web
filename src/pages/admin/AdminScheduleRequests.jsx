import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import { useAdminAction } from '@/features/admin/hooks/useAdminAction.js';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminSlotReview from './AdminSlotReview.jsx';
import { useLocale } from '@/locales/locale.js';

export default function AdminScheduleRequests() {
  const { tr } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialReqId = searchParams.get('cohortScheduleRequestId');
  const initialMode = searchParams.get('tab') === 'change'
    ? 'change'
    : (searchParams.get('view') === 'slots' || searchParams.get('tab') === 'cancel')
      ? 'cancel'
      : 'cohort';
  const [mode, setMode] = useState(initialMode);
  const [refreshTick, setRefreshTick] = useState(0);

  const { busy, runAction } = useAdminAction({
    toastKey: 'admin-schedule-requests',
    onAfterSuccess: () => setRefreshTick((t) => t + 1),
  });

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    const next = new URLSearchParams(searchParams);
    if (nextMode === 'cohort') {
      next.set('view', 'cohort');
      next.delete('tab');
    } else {
      next.set('view', 'slots');
      next.set('tab', nextMode);
    }
    setSearchParams(next, { replace: true });
  };

  const toolbarTabs = {
    label: tr('Phân loại yêu cầu lịch'),
    value: mode,
    onChange: handleModeChange,
    tabs: [
      { value: 'cohort', label: tr('Dời lịch buổi học lớp nhóm') },
      { value: 'cancel', label: tr('Xin hủy khung giờ Giáo viên') },
      { value: 'change', label: tr('Xin đổi tiết Giáo viên') },
    ],
  };

  return (
    <AdminShell breadcrumb={tr('Yêu cầu đổi/hủy lịch')}>
      <AdminWorkspace data-page="AdminScheduleRequests" viewportLocked>
        <AdminPageHeader
          icon={CalendarClock}
          title="Yêu cầu đổi/hủy lịch"
        />

        {mode === 'cohort' ? (
          <AdminCohortScheduleRequestsPanel
            busy={busy}
            fillHeight
            toolbarTabs={toolbarTabs}
            refreshSignal={refreshTick}
            initialRequestId={initialReqId}
            onRun={runAction}
          />
        ) : (
          <AdminSlotReview
            key={mode}
            embedded
            fillHeight
            allowedTabs={[mode]}
            initialTabOverride={mode}
            toolbarTabsOverride={toolbarTabs}
          />
        )}
      </AdminWorkspace>
    </AdminShell>
  );
}
