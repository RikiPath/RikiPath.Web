import { NavLink, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import AdminConsultants from './AdminConsultants.jsx';
import AdminMentorSchedules from './AdminMentorSchedules.jsx';
import AdminMentorPlans from './AdminMentorPlans.jsx';

const SECTIONS = [
  {
    to: '/admin/mentors',
    label: 'Hồ sơ Mentor',
    note: 'Danh sách, trạng thái và thêm Mentor.',
    paths: ['/admin/mentors', '/admin/consultants'],
  },
  {
    to: '/admin/mentor-schedules',
    label: 'Xếp lịch tuần',
    note: 'Chọn tiết 50 phút từ buổi rảnh mentor đã đăng ký.',
    paths: ['/admin/mentor-schedules'],
  },
  { to: '/admin/mentor-plans', label: 'Gói tư vấn', note: 'Cấu hình giá gói 1 và 3 buổi.', paths: ['/admin/mentor-plans'] },
];

function cleanPath(pathname) {
  return pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
}

export default function AdminMentorHub() {
  const { pathname } = useLocation();
  const current = cleanPath(pathname);
  const schedules = current === '/admin/mentor-schedules';

  return (
    <AdminShell pathname={pathname} breadcrumb="Mentor">
      <main
        className="mx-auto max-w-[1320px] px-4 py-5
                   text-[#352C31] sm:px-6 lg:px-8"
      >
        <header className="mb-4">
          <h1 className="text-[25px] font-semibold tracking-tight">
            Mentor
          </h1>
          <p className="mt-1 text-[13px] text-[#82737B]">
            Hồ sơ và lịch tư vấn.
          </p>
        </header>

        <nav
          aria-label="Mục Mentor"
          className="mb-5 grid gap-3 sm:grid-cols-2"
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

        {current === '/admin/mentor-plans' ? <AdminMentorPlans /> : schedules ? (
          <AdminMentorSchedules embedded />
        ) : (
          <AdminConsultants embedded />
        )}
      </main>
    </AdminShell>
  );
}
