import { NavLink, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import AdminConsultants from './AdminConsultants.jsx';
import AdminMentorSchedules from './AdminMentorSchedules.jsx';
import AdminMentorPlans from './AdminMentorPlans.jsx';
import AdminMentorVerifications from './AdminMentorVerifications.jsx';
import AdminMentorCompensation from './AdminMentorCompensation.jsx';

const SECTIONS = [
  {
    to: '/admin/mentors',
    label: 'Quản lý cố vấn',
    note: 'Danh sách và trạng thái cố vấn.',
    paths: ['/admin/mentors', '/admin/consultants'],
  },
  {
    to: '/admin/mentor-verifications',
    label: 'Hồ sơ chờ xét duyệt',
    note: 'Phê duyệt, từ chối và yêu cầu bổ sung.',
    paths: ['/admin/mentor-verifications'],
  },
  {
    to: '/admin/mentor-schedules',
    label: 'Lịch tư vấn',
    note: 'Xem lịch tư vấn đã công bố.',
    paths: ['/admin/mentor-schedules'],
  },
  {
    to: '/admin/mentor-plans',
    label: 'Gói tư vấn (N5–N2)',
    note: 'Cấu hình giá gói 1 và 3 buổi theo JLPT.',
    paths: ['/admin/mentor-plans'],
  },
  {
    to: '/admin/mentor-compensation',
    label: 'Thù lao & Kỳ lương',
    note: 'Đơn giá giờ, hệ số JLPT, bảng kê và chi trả.',
    paths: ['/admin/mentor-compensation'],
  },
];

function cleanPath(pathname) {
  return pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
}

export default function AdminMentorHub() {
  const { pathname } = useLocation();
  const current = cleanPath(pathname);
  const schedules = current === '/admin/mentor-schedules';
  const verifications = current === '/admin/mentor-verifications';
  const compensation = current === '/admin/mentor-compensation';

  return (
    <AdminShell pathname={pathname} breadcrumb="Quản lý cố vấn">
      <main
        className="mx-auto max-w-[1320px] px-4 py-5
                   text-[#352C31] sm:px-6 lg:px-8"
      >
        <header className="mb-4">
          <h1 className="text-[25px] font-semibold tracking-tight">
            Quản lý cố vấn
          </h1>
          <p className="mt-1 text-[13px] text-[#82737B]">
            Hồ sơ xét duyệt, lịch tư vấn, gói tư vấn theo JLPT N5–N2, kỳ lương và chi trả thù lao.
          </p>
        </header>

        <nav
          aria-label="Mục quản lý cố vấn"
          className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          {SECTIONS.map((section) => {
            const active = section.paths.includes(current);

            return (
              <NavLink
                key={section.to}
                to={section.to}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl border px-4 py-3 transition ${
                  active
                    ? 'border-[#AD3155] bg-[#FCEEF3]'
                    : 'border-[#EAE1E6] bg-white hover:bg-[#FDFAFC]'
                }`}
              >
                <span
                  className={`block text-[14px] font-medium ${
                    active ? 'text-[#AD3155]' : 'text-[#51434A]'
                  }`}
                >
                  {section.label}
                </span>
                <span className="mt-1 block text-[12px] text-[#82737B]">
                  {section.note}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {verifications ? (
          <AdminMentorVerifications />
        ) : current === '/admin/mentor-plans' ? (
          <AdminMentorPlans />
        ) : compensation ? (
          <AdminMentorCompensation />
        ) : schedules ? (
          <AdminMentorSchedules embedded />
        ) : (
          <AdminConsultants embedded />
        )}
      </main>
    </AdminShell>
  );
}
