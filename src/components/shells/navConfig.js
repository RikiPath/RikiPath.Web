/** Shared nav IA — one source of truth per product group */

export const CMS_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Studio / CMS' },
  groups: [
    {
      label: 'Quản lý Nội dung (CMS)',
      items: [
        { to: '/cms-studio', label: 'Tổng quan CMS', icon: 'space_dashboard' },
        { to: '/lesson-cms', label: 'Quản lý Bài học', icon: 'menu_book', alsoActive: ['/lesson-cms-detail'] },
        { to: '/vocabulary-editor', label: 'Từ vựng & Hán tự', icon: 'translate', alsoActive: ['/kanji-editor'] },
        { to: '/content-library', label: 'Ngữ pháp', icon: 'psychology' },
        { to: '/question-bank', label: 'Ngân hàng câu hỏi', icon: 'quiz' },
        { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'fact_check', badge: '12' },
        { to: '/exam-builder', label: 'Xây đề thi', icon: 'assignment' },
        { to: '/bulk-import', label: 'Import hàng loạt', icon: 'upload_file' },
        { to: '/video-editor', label: 'Biên tập Video', icon: 'videocam' },
        { to: '/author-dashboard', label: 'Bảng tác giả', icon: 'edit_note' },
      ],
    },
    {
      label: 'Hệ thống Quản trị',
      items: [
        { to: '/admin', label: 'Tổng quan Quản trị', icon: 'monitoring' },
        { to: '/admin/users', label: 'Người dùng & Học viên', icon: 'groups' },
        { to: '/admin/roles', label: 'Phân quyền hệ thống', icon: 'admin_panel_settings' },
        { to: '/admin', label: 'Báo cáo & Doanh thu', icon: 'query_stats', neverActive: true },
        { to: '/admin', label: 'Cài đặt', icon: 'settings', neverActive: true },
      ],
    },
  ],
  headerBadge: 'CMS Studio v2.4 (Sakura Edition)',
  user: { name: 'Sakura Admin', role: 'Content Lead' },
};

export const ADMIN_NAV = {
  brand: { title: 'RikiPath Admin', subtitle: 'Quản trị hệ thống' },
  items: [
    { to: '/admin', label: 'Tổng quan', icon: 'dashboard', end: true },
    { to: '/admin/users', label: 'Người dùng', icon: 'group', alsoActive: ['/admin/users/detail'] },
    { to: '/admin/roles', label: 'Vai trò & quyền', icon: 'lock_person' },
    { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'fact_check' },
    { to: '/lesson-cms', label: 'Cấu hình học tập', icon: 'school' },
    { to: '/admin', label: 'Báo cáo', icon: 'bar_chart', neverActive: true },
    { to: '/admin', label: 'Nhật ký hệ thống', icon: 'history', neverActive: true },
    { to: '/admin', label: 'Cài đặt', icon: 'settings', neverActive: true },
  ],
  footerItems: [
    { to: '/admin', label: 'Hồ sơ', icon: 'account_circle', neverActive: true },
    { to: '/auth', label: 'Đăng xuất', icon: 'logout', neverActive: true },
  ],
};

export const LEARNER_NAV = {
  brand: { title: 'RikiPath', subtitle: 'JLPT Academy' },
  items: [
    { to: '/app', label: 'Tổng quan', icon: 'dashboard', end: true },
    { to: '/roadmap', label: 'Khám phá / Lộ trình', icon: 'explore' },
    { to: '/lessons', label: 'Bài học', icon: 'menu_book' },
    { to: '/vocabulary', label: 'Sổ từ & Kanji', icon: 'edit_note', alsoActive: ['/kanji-studio', '/kanji-notebook', '/vocabulary-detail'] },
    { to: '/daily-srs', label: 'Ôn SRS', icon: 'style' },
    { to: '/ai-counselor', label: 'Cố vấn AI', icon: 'psychology' },
    {
      to: '/consultation',
      label: 'Tư vấn 1-1',
      icon: 'support_agent',
      alsoActive: [
        '/booking-schedule',
        '/consultation-payment',
        '/consultation-center',
        '/consultation-session',
        '/consultation-receipt',
        '/consultation-room',
        '/sensei-profile',
      ],
    },
    { to: '/settings', label: 'Cài đặt', icon: 'settings' },
  ],
  user: { name: 'Minh Anh', role: 'Học viên N4' },
};

export const CONSULT_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Cổng Cố Vấn', badge: 'SENSEI' },
  items: [
    { to: '/consultant-overview', label: 'Tổng quan', icon: 'dashboard' },
    { to: '/consultation-queue', label: 'Hàng đợi', icon: 'pending_actions' },
    { to: '/consultation-prep', label: 'Chuẩn bị buổi', icon: 'fact_check' },
    { to: '/consultation-request', label: 'Chi tiết yêu cầu', icon: 'description' },
    { to: '/consultation-reply', label: 'Trả lời văn bản', icon: 'forum' },
    { to: '/work-schedule', label: 'Lịch làm việc', icon: 'calendar_month' },
  ],
  user: { name: 'Sensei Aoi', role: 'Cố vấn N3–N2' },
};

export const MARKETING_NAV = {
  links: [
    { to: '/', label: 'Trang chủ', end: true },
    { to: '/courses', label: 'Khóa học' },
    { to: '/consultation', label: 'Tư vấn' },
    { to: '/auth', label: 'Đăng nhập' },
  ],
  cta: { to: '/register', label: 'Bắt đầu học' },
};

export function pathMatches(pathname, item) {
  if (item.neverActive) return false;
  const clean = pathname.replace(/\/$/, '') || '/';
  const target = item.to.replace(/\/$/, '') || '/';
  if (clean === target) return true;
  if (item.alsoActive?.some((p) => {
    const a = p.replace(/\/$/, '') || '/';
    return clean === a || (item.prefix && clean.startsWith(`${a}/`));
  })) {
    return true;
  }
  // Only prefix-match when explicitly requested (nested sections)
  if (item.prefix && target !== '/' && clean.startsWith(`${target}/`)) return true;
  return false;
}
