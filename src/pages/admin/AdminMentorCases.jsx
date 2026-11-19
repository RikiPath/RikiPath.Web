import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { AdminShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui';
import AdminCohortComplaintsPanel from '@/features/complaints/components/AdminCohortComplaintsPanel.jsx';
import AdminCohortScheduleRequestsPanel from '@/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx';
import AdminCohortTransferQueuePanel from '@/features/cohorts/components/AdminCohortTransferQueuePanel.jsx';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

export default function AdminMentorCases() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function runAction(fn, message = 'Đã lưu thay đổi.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const toastId = notify.loading('Đang cập nhật xử lý…', '', { key: 'admin-case-action' });
    try {
      const result = await fn();
      const text = typeof message === 'function' ? message(result) : message;
      setNotice(text);
      notify.success(text, '', { id: toastId, key: 'admin-case-action', replace: true });
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, 'Chưa xử lý được yêu cầu', { id: toastId, key: 'admin-case-action', replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Khiếu nại & Yêu cầu lớp nhóm')}>
      <div className="rp-container py-6 text-rp-text lg:py-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-rp-brand-strong">{tr('XỬ LÝ')}</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Khiếu nại, Dời lịch & Chuyển lớp nhóm')}</h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-rp-text-muted">
              {tr('Xét duyệt khiếu nại khóa học, yêu cầu dời lịch/hủy lớp trống của Mentor và yêu cầu chuyển lớp của học viên.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/study-courses/"
              className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
            >
              {tr('Quản lý lớp nhóm')}
            </Link>
            <Link
              to="/admin/mentor-quality/"
              className="inline-flex h-9 items-center rounded-xl bg-rp-brand-strong px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-deep rp-press"
            >
              {tr('Chấm công & KPI')}
            </Link>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl bg-rp-success-bg px-4 py-3 text-[13px] text-rp-success">{notice}</p>}

        <div className="course-page space-y-5" style={{ padding: 0 }}>
          <AdminCohortComplaintsPanel busy={busy} onRun={runAction} />
          <AdminCohortScheduleRequestsPanel busy={busy} onRun={runAction} />
          <AdminCohortTransferQueuePanel busy={busy} onRun={runAction} />
        </div>
      </div>
    </AdminShell>
  );
}
