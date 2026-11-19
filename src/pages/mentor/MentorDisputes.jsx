import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { MentorShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { notify } from '@/components/ui';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel.jsx';
import '@/pages/shared/studyCourses.css';
import { useLocale } from '@/locales/locale.js';

export default function MentorDisputes() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function runAction(fn, message = 'Đã lưu phản hồi.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const toastId = notify.loading('Đang gửi phản hồi…', '', { key: 'mentor-dispute-action' });
    try {
      const result = await fn();
      const text = typeof message === 'function' ? message(result) : message;
      setNotice(text);
      notify.success(text, '', { id: toastId, key: 'mentor-dispute-action', replace: true });
    } catch (e) {
      setError(describeApiError(e).message);
      notify.apiError(e, 'Chưa lưu được phản hồi', { id: toastId, key: 'mentor-dispute-action', replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Khiếu nại khóa học')}>
      <div className="rp-container py-6 text-rp-text lg:py-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-rp-brand-strong">{tr('GIẢI TRÌNH')}</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Khiếu nại khóa học của học viên')}</h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-rp-text-muted">
              {tr('Phản hồi các khiếu nại liên quan đến chất lượng giảng dạy, thái độ hoặc lịch học của lớp nhóm bạn phụ trách.')}
            </p>
          </div>
          <Link
            to="/mentor-study-courses/"
            className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            {tr('Về lớp phụ trách')}
          </Link>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-2xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-2xl bg-rp-success-bg px-4 py-3 text-[13px] text-rp-success">
            {notice}
          </p>
        )}

        <div className="course-page" style={{ padding: 0 }}>
          <CohortComplaintPanel role="Mentor" busy={busy} onRun={runAction} />
        </div>
      </div>
    </MentorShell>
  );
}
