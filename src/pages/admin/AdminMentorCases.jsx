import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { Banner, notify } from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import { useLocale } from '@/locales/locale.js';

const CASE_TABS = [
  { id: 'complaints', label: 'Khiếu nại khóa học' },
  { id: 'schedule', label: 'Yêu cầu dời/hủy lớp' },
  { id: 'transfers', label: 'Yêu cầu chuyển lớp' },
];

export default function AdminMentorCases() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const complaintIdParam = searchParams.get('complaintId');
  const scheduleReqIdParam = searchParams.get('cohortScheduleRequestId');
  const transferReqIdParam = searchParams.get('transferRequestId');
  const rawTab = searchParams.get('tab');

  const activeTab = CASE_TABS.some((t) => t.id === rawTab)
    ? rawTab
    : scheduleReqIdParam
      ? 'schedule'
      : transferReqIdParam
        ? 'transfers'
        : 'complaints';

  function selectTab(nextTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
  }

  async function runAction(fn, message = 'Đã lưu thay đổi.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const toastId = notify.loading(tr('Đang cập nhật xử lý…'), '', { key: 'admin-case-action' });
    try {
      const result = await fn();
      const text = typeof message === 'function' ? message(result) : tr(message);
      setNotice(text);
      notify.success(text, '', { id: toastId, key: 'admin-case-action', replace: true });
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, tr('Chưa xử lý được yêu cầu'), { id: toastId, key: 'admin-case-action', replace: true });
    } finally {
      setBusy(false);
    }
  }

  const caseToolbarTabs = {
    label: tr('Phân loại ngoại lệ'),
    value: activeTab,
    onChange: selectTab,
    tabs: CASE_TABS.map((t) => ({ value: t.id, label: tr(t.label) })),
  };

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Ngoại lệ & khiếu nại')}>
      <main data-page="AdminMentorCases" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <AdminPageHeader
          icon={Gavel}
          title="Khiếu nại & ngoại lệ"
        />

        {error && <Banner tone="danger">{error}</Banner>}
        {notice && <Banner tone="success">{notice}</Banner>}

        {activeTab === 'complaints' && (
          <AdminCohortComplaintsPanel busy={busy} initialComplaintId={complaintIdParam} toolbarTabs={caseToolbarTabs} onRun={runAction} />
        )}
        {activeTab === 'schedule' && (
          <AdminCohortScheduleRequestsPanel busy={busy} initialRequestId={scheduleReqIdParam} toolbarTabs={caseToolbarTabs} onRun={runAction} />
        )}
        {activeTab === 'transfers' && (
          <AdminCohortTransferQueuePanel busy={busy} initialTransferId={transferReqIdParam} toolbarTabs={caseToolbarTabs} onRun={runAction} />
        )}
      </main>
    </AdminShell>
  );
}
