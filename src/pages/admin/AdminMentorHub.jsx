import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '@/layouts';
import { PageHeader, FeatureIcon } from '@/components/ui';
import AdminConsultants from './AdminConsultants.jsx';
import AdminMentorSchedules from './AdminMentorSchedules.jsx';
import AdminMentorVerifications from './AdminMentorVerifications.jsx';
import AdminMentorQualifications from './AdminMentorQualifications.jsx';
import AdminMentorGroupPolicy from './AdminMentorGroupPolicy.jsx';
import { useLocale } from '@/locales/locale.js';

function cleanPath(pathname) {
  return pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
}

const ROUTE_META = {
  '/admin/mentors': {
    breadcrumb: 'Hồ sơ Giáo viên',
    eyebrow: 'Đội ngũ Giáo viên',
    title: 'Hồ sơ Giáo viên',
    description: 'Quản lý danh sách Giáo viên, trạng thái tài khoản, hồ sơ xác minh và quyền giảng dạy hiện tại.',
    feature: 'mentor',
  },
  '/admin/consultants': {
    breadcrumb: 'Hồ sơ Giáo viên',
    eyebrow: 'Đội ngũ Giáo viên',
    title: 'Hồ sơ Giáo viên',
    description: 'Quản lý danh sách Giáo viên, trạng thái tài khoản, hồ sơ xác minh và quyền giảng dạy hiện tại.',
    feature: 'mentor',
  },
  '/admin/mentor-verifications': {
    breadcrumb: 'Xét duyệt hồ sơ',
    eyebrow: 'Đội ngũ Giáo viên',
    title: 'Xét duyệt hồ sơ Giáo viên',
    description: 'Kiểm tra chứng chỉ, thông tin chuyên môn và phê duyệt hoặc yêu cầu bổ sung hồ sơ.',
    feature: 'verify',
  },
  '/admin/mentor-schedules': {
    breadcrumb: 'Duyệt lịch dạy',
    eyebrow: 'Vận hành & lịch dạy',
    title: 'Duyệt lịch dạy Giáo viên',
    description: 'Xem lịch theo tuần và xét duyệt từng khung giờ hoặc theo lô trước khi mở lớp.',
    feature: 'calendar',
  },
  '/admin/mentor-qualifications': {
    breadcrumb: 'Phân quyền JLPT',
    eyebrow: 'Đội ngũ Giáo viên',
    title: 'Phân quyền giảng dạy JLPT',
    description: 'Cấp và thu hồi quyền giảng dạy theo chứng chỉ và cấp độ JLPT đã xác minh (N5–N1).',
    feature: 'graduation',
  },
  '/admin/mentor-group-policy': {
    breadcrumb: 'Chính sách lớp nhóm',
    eyebrow: 'Cấu hình học tập',
    title: 'Chính sách lớp nhóm',
    description: 'Xem phiên bản chính sách đang áp dụng, lịch sử thay đổi và ban hành phiên bản mới.',
    feature: 'settings',
  },
};

export default function AdminMentorHub() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const current = cleanPath(pathname);

  const meta = ROUTE_META[current] || ROUTE_META['/admin/mentors'];
  const isSchedules = current === '/admin/mentor-schedules';
  const isVerifications = current === '/admin/mentor-verifications';
  const isQualifications = current === '/admin/mentor-qualifications';
  const isGroupPolicy = current === '/admin/mentor-group-policy';

  return (
    <AdminShell pathname={pathname} breadcrumb={tr(meta.breadcrumb)}>
      <main data-page="AdminMentorHub" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr(meta.eyebrow)}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature={meta.feature} size="lg" />
              <span>{tr(meta.title)}</span>
            </span>
          }
          description={tr(meta.description)}
          actions={
            isGroupPolicy ? (
              <Link
                to="/admin/policies/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr('Mở Chính sách học tập')}
              </Link>
            ) : isSchedules ? (
              <Link
                to="/admin/slot-review/"
                className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr('Yêu cầu đổi/hủy lịch')}
              </Link>
            ) : null
          }
        />

        {isSchedules ? (
          <AdminMentorSchedules embedded />
        ) : isVerifications ? (
          <AdminMentorVerifications />
        ) : isQualifications ? (
          <AdminMentorQualifications />
        ) : isGroupPolicy ? (
          <AdminMentorGroupPolicy />
        ) : (
          <AdminConsultants />
        )}
      </main>
    </AdminShell>
  );
}
