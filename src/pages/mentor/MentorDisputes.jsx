import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { getSession } from '@/app/auth/session.js';
import { AdminShell, MentorShell } from '@/layouts';
import { Banner, Button, PageContainer, PageHeader, notify } from '@/components/ui';
import CohortComplaintPanel from '@/features/complaints/components/CohortComplaintPanel.jsx';
import { useLocale } from '@/locales/locale.js';

export default function MentorDisputes() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const session = getSession();
  const isAdminViewer = session?.primaryRole === 'Admin';
  const { complaintId: pathComplaintId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightComplaintId = pathComplaintId || searchParams.get('complaintId') || null;
  const cohortId = searchParams.get('cohortId') || null;
  const [busy, setBusy] = useState(false);

  async function runAction(fn, message = 'Đã lưu phản hồi.') {
    if (busy) return;
    setBusy(true);
    const toastId = notify.loading('Đang gửi phản hồi…', '', { key: 'mentor-dispute-action' });
    try {
      const result = await fn();
      const text = typeof message === 'function' ? message(result) : message;
      notify.success(text, '', { id: toastId, key: 'mentor-dispute-action', replace: true });
    } catch (e) {
      notify.apiError(e, 'Chưa lưu được phản hồi', { id: toastId, key: 'mentor-dispute-action', replace: true });
      throw e;
    } finally {
      setBusy(false);
    }
  }

  if (isAdminViewer) {
    return (
      <AdminShell pathname={pathname} breadcrumb={tr('Khiếu nại khóa học')}>
        <PageContainer width="default" density="comfortable" className="text-rp-text">
          <PageHeader
            eyebrow="Quản trị hệ thống"
            title="Khiếu nại khóa học của học viên"
            description="Trang này dành cho Giáo viên gửi giải trình khiếu nại. Quản trị viên xử lý và ra quyết định tại trung tâm Quản lý lớp nhóm."
          />
          <Banner
            tone="info"
            title="Chuyển đến trung tâm xử lý Quản trị"
            actions={(
              <Button as={Link} to="/admin/study-courses/" variant="primary" size="sm">
                {tr('Mở Quản lý khóa học')}
              </Button>
            )}
          >
            {tr('Quản trị viên xem toàn bộ khiếu nại và đưa ra quyết định xử lý tại không gian Quản lý lớp nhóm.')}
          </Banner>
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Khiếu nại khóa học')}>
      <PageContainer width="default" density="comfortable" className="text-rp-text">
        <PageHeader
          eyebrow="Giải trình"
          title="Khiếu nại khóa học của học viên"
          description="Phản hồi các khiếu nại liên quan đến chất lượng giảng dạy, thái độ hoặc lịch học của lớp nhóm bạn phụ trách."
          actions={(
            <Button as={Link} to="/mentor-study-courses/" variant="secondary" size="sm">
              {tr('Về lớp phụ trách')}
            </Button>
          )}
        />

        <CohortComplaintPanel
          role="Mentor"
          cohortId={cohortId}
          highlightComplaintId={highlightComplaintId}
          busy={busy}
          onRun={runAction}
        />
      </PageContainer>
    </MentorShell>
  );
}
