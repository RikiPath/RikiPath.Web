import { useLocation, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, GraduationCap, UsersRound } from 'lucide-react';
import { AdminShell } from '@/layouts';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import AdminTeachingProposalReviewPanel from '@/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx';
import AdminConsultants from './AdminConsultants.jsx';
import AdminMentorVerifications from './AdminMentorVerifications.jsx';
import AdminMentorQualifications from './AdminMentorQualifications.jsx';
import { useLocale } from '@/locales/locale.js';

function cleanPath(pathname) {
  return pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
}

const ROUTE_META = {
  '/admin/mentors': {
    breadcrumb: 'Hồ sơ Giáo viên',
    title: 'Hồ sơ Giáo viên',
    icon: UsersRound,
  },
  '/admin/consultants': {
    breadcrumb: 'Hồ sơ Giáo viên',
    title: 'Hồ sơ Giáo viên',
    icon: UsersRound,
  },
  '/admin/mentor-verifications': {
    breadcrumb: 'Xét duyệt hồ sơ',
    title: 'Xét duyệt hồ sơ Giáo viên',
    icon: BadgeCheck,
  },
  '/admin/mentor-schedules': {
    breadcrumb: 'Đề xuất mở lớp',
    title: 'Đề xuất mở lớp',
    icon: CalendarCheck,
  },
  '/admin/mentor-qualifications': {
    breadcrumb: 'Phân quyền JLPT',
    title: 'Phân quyền giảng dạy JLPT',
    icon: GraduationCap,
  },
};

export default function AdminMentorHub() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const current = cleanPath(pathname);
  const initialProposalId = searchParams.get('proposalId');

  const meta = ROUTE_META[current] || ROUTE_META['/admin/mentors'];
  const isSchedules = current === '/admin/mentor-schedules';
  const isVerifications = current === '/admin/mentor-verifications';
  const isQualifications = current === '/admin/mentor-qualifications';

  const isViewportLocked = !isVerifications;

  return (
    <AdminShell pathname={pathname} breadcrumb={tr(meta.breadcrumb)}>
      <AdminWorkspace data-page="AdminMentorHub" viewportLocked={isViewportLocked}>
        <AdminPageHeader
          icon={meta.icon}
          title={meta.title}
        />

        {isSchedules ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <AdminTeachingProposalReviewPanel
              initialProposalId={initialProposalId}
              fillHeight
            />
          </div>
        ) : isVerifications ? (
          <AdminMentorVerifications />
        ) : isQualifications ? (
          <AdminMentorQualifications fillHeight />
        ) : (
          <AdminConsultants fillHeight />
        )}
      </AdminWorkspace>
    </AdminShell>
  );
}
