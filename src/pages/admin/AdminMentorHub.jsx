import { NavLink, useLocation } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, ClipboardList, GraduationCap, UsersRound } from 'lucide-react';
import { AdminShell } from '@/layouts';
import AdminConsultants from './AdminConsultants.jsx';
import AdminMentorSchedules from './AdminMentorSchedules.jsx';
import AdminMentorVerifications from './AdminMentorVerifications.jsx';
import AdminMentorQualifications from './AdminMentorQualifications.jsx';
import AdminMentorGroupPolicy from './AdminMentorGroupPolicy.jsx';
import { useLocale } from '@/locales/locale.js';

const SECTIONS = [
  {
    to: '/admin/mentors',
    label: 'Hồ sơ Giáo viên',
    note: 'Danh sách và trạng thái Giáo viên.',
    paths: ['/admin/mentors', '/admin/consultants'],
    icon: UsersRound,
    tone: 'bg-tone-mentor-bg text-tone-mentor',
  },
  {
    to: '/admin/mentor-verifications',
    label: 'Hồ sơ chờ xét duyệt',
    note: 'Phê duyệt, từ chối và bổ sung.',
    paths: ['/admin/mentor-verifications'],
    icon: BadgeCheck,
    tone: 'bg-tone-reading-bg text-tone-reading',
  },
  {
    to: '/admin/mentor-schedules',
    label: 'Duyệt lịch dạy',
    note: 'Khung giờ dạy lớp nhóm của Giáo viên.',
    paths: ['/admin/mentor-schedules'],
    icon: CalendarCheck,
    tone: 'bg-tone-calendar-bg text-tone-calendar',
  },
  {
    to: '/admin/mentor-qualifications',
    label: 'Phân quyền JLPT',
    note: 'Cấp hoặc thu hồi JLPT N5–N2.',
    paths: ['/admin/mentor-qualifications'],
    icon: GraduationCap,
    tone: 'bg-tone-grammar-bg text-tone-grammar',
  },
  {
    to: '/admin/mentor-group-policy',
    label: 'Chính sách lớp nhóm',
    note: 'Sĩ số, hạn đăng ký, bài tập & đánh giá năng lực.',
    paths: ['/admin/mentor-group-policy'],
    icon: ClipboardList,
    tone: 'bg-rp-brand-tint text-rp-brand-strong',
  },
];

function cleanPath(pathname) {
  return pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
}

export default function AdminMentorHub() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const current = cleanPath(pathname);
  const schedules = current === '/admin/mentor-schedules';
  const verifications = current === '/admin/mentor-verifications';
  const qualifications = current === '/admin/mentor-qualifications';
  const groupPolicy = current === '/admin/mentor-group-policy';

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Quản lý Giáo viên')}>
      <div className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text">
        <header className="mb-[var(--rp-space-stack)]">
          <h1 className="rp-type-page-title">
            {tr('Quản lý Giáo viên')}
          </h1>
          <p className="rp-type-body mt-1 text-rp-text-2">
            {tr('Hồ sơ xét duyệt, lịch dạy lớp nhóm, phân quyền giảng dạy JLPT N5–N2 và chính sách lớp nhóm.')}
          </p>
        </header>

        <nav
          aria-label={tr('Mục quản lý giáo viên')}
          className="mb-[var(--rp-space-section)] grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        >
          {SECTIONS.map((section) => {
            const active = section.paths.includes(current);
            const Icon = section.icon;

            return (
              <NavLink
                key={section.to}
                to={section.to}
                aria-current={active ? 'page' : undefined}
                className={`rp-focus rp-card-hover rp-interactive group flex items-start gap-3 rounded-rp-card border px-3.5 py-3 transition-all ${
                  active
                    ? 'border-rp-brand-border bg-rp-brand-tint shadow-rp-xs'
                    : 'border-rp-line bg-rp-surface hover:border-rp-brand-border'
                }`}
              >
                <span aria-hidden="true" className={`rp-icon-tilt mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${section.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13.5px] font-semibold ${
                      active ? 'text-rp-brand-strong' : 'text-rp-text'
                    }`}
                  >
                    {tr(section.label)}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-rp-text-muted">
                    {tr(section.note)}
                  </span>
                </span>
              </NavLink>
            );
          })}
        </nav>

        {verifications ? (
          <AdminMentorVerifications />
        ) : qualifications ? (
          <AdminMentorQualifications />
        ) : groupPolicy ? (
          <AdminMentorGroupPolicy />
        ) : schedules ? (
          <AdminMentorSchedules embedded />
        ) : (
          <AdminConsultants embedded />
        )}
      </div>
    </AdminShell>
  );
}
