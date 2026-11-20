import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { Banner, FeatureIcon, PageHeader, Tabs, notify } from '@/components/ui';
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

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Ngoại lệ & khiếu nại')}>
      <main data-page="AdminMentorCases" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Học cùng Giáo viên')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="cases" icon={Gavel} size="lg" />
              <span>{tr('Ngoại lệ & khiếu nại')}</span>
            </span>
          }
          description={tr('Xét duyệt khiếu nại khóa học, yêu cầu dời/hủy lớp và yêu cầu chuyển lớp theo chính sách hiện hành.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/admin/study-courses/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr('Gói học, lớp & ghi danh')}
              </Link>
              <Link
                to="/admin/mentor-quality/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                {tr('Điểm danh & KPI')}
              </Link>
            </div>
          }
        />

        <Tabs
          variant="pill"
          label={tr('Phân loại ngoại lệ')}
          value={activeTab}
          onChange={selectTab}
          tabs={CASE_TABS.map((t) => ({ value: t.id, label: tr(t.label) }))}
        />

        {error && <Banner tone="danger">{error}</Banner>}
        {notice && <Banner tone="success">{notice}</Banner>}

        {activeTab === 'complaints' && (
          <AdminCohortComplaintsPanel busy={busy} initialComplaintId={complaintIdParam} onRun={runAction} />
        )}
        {activeTab === 'schedule' && (
          <AdminCohortScheduleRequestsPanel busy={busy} initialRequestId={scheduleReqIdParam} onRun={runAction} />
        )}
        {activeTab === 'transfers' && (
          <AdminCohortTransferQueuePanel busy={busy} initialTransferId={transferReqIdParam} onRun={runAction} />
        )}
      </main>
    </AdminShell>
  );
}
