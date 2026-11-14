/** Shared nav IA — one source of truth per product group */

export const CMS_NAV = {
  brand: { title: 'RikiPath', subtitle: 'CMS Studio' },
  groups: [
    {
      label: 'Học liệu',
      items: [
        { to: '/cms-studio', label: 'Tổng quan', hint: 'Dashboard studio', icon: 'space_dashboard' },
        { to: '/lesson-cms', label: 'Bài học', hint: 'Giáo trình & bài giảng', icon: 'menu_book', alsoActive: ['/lesson-cms-detail'] },
        { to: '/bulk-import', label: 'Import Excel', hint: 'Thêm cả một bài học', icon: 'upload_file' },
        { to: '/content-plan', label: 'Soạn với AI', hint: 'Kế hoạch, kanji, gửi duyệt', icon: 'auto_awesome' },
        { to: '/vocabulary-editor', label: 'Từ vựng & Hán tự', hint: 'Hiện sau khi bài được duyệt', icon: 'translate', alsoActive: ['/kanji-editor'] },
        { to: '/content-library', label: 'Ngữ pháp', hint: 'Hiện sau khi bài được duyệt', icon: 'psychology' },
      ],
    },
    {
      label: 'Luyện thi',
      items: [
        { to: '/question-bank', label: 'Ngân hàng câu hỏi', hint: 'Câu hỏi theo kỹ năng', icon: 'quiz' },
        { to: '/exam-builder', label: 'Xây đề thi', hint: 'Đề mock & section', icon: 'assignment' },
      ],
    },
    {
      label: 'Kiểm duyệt',
      items: [
        { to: '/author-dashboard', label: 'Bảng tác giả', hint: 'Nội dung của tôi', icon: 'edit_note' },
      ],
    },
  ],
  user: { name: 'Sakura Admin', role: 'Content Lead' },
};

export const ADMIN_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Admin' },
  groups: [
    {
      label: 'Điều hành',
      items: [
        {
          to: '/admin/dashboard',
          label: 'Tổng quan',
          icon: 'space_dashboard',
        },
        {
          to: '/admin/users',
          label: 'Người dùng',
          icon: 'group',
          alsoActive: ['/admin/users/detail'],
        },
      ],
    },
    {
      label: 'Tư vấn',
      items: [
        {
          to: '/admin/mentors',
          label: 'Hồ sơ cố vấn',
          icon: 'badge',
          alsoActive: ['/admin/consultants'],
        },
        { to: '/admin/mentor-verifications', label: 'Xét duyệt', icon: 'verified' },
        { to: '/admin/mentor-schedules', label: 'Lịch tuần', icon: 'calendar_month' },
        { to: '/admin/mentor-template', label: 'Mẫu ca', icon: 'event_repeat' },
        { to: '/admin/slot-review', label: 'Khung giờ', icon: 'schedule' },
        { to: '/admin/mentor-plans', label: 'Gói tư vấn', icon: 'sell' },
        { to: '/admin/study-courses', label: 'Khóa học & học lại', icon: 'school' },
        { to: '/admin/study-catalog', label: 'Chứng chỉ & cấp độ', icon: 'category' },
        { to: '/admin/mentor-compensation', label: 'Thù lao & Kỳ lương', icon: 'payments' },
        { to: '/admin/mentor-cases', label: 'Ngoại lệ', icon: 'gavel' },
        { to: '/admin/mentor-quality', label: 'Chất lượng', icon: 'monitoring' },
      ],
    },
    {
      label: 'Nội dung',
      items: [
        { to: '/admin/content-review', label: 'Duyệt nội dung', icon: 'fact_check' },
        { to: '/admin/certificate-sections', label: 'Phần thi', icon: 'view_agenda' },
      ],
    },
  ],
};

export const LEARNER_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Học tiếng Nhật và luyện thi JLPT' },
  groups: [
    { id: 'study', label: 'Học tập' },
    { id: 'riki', label: 'Riki' },
    { id: 'support', label: 'Hỗ trợ' },
  ],
  items: [
    { to: '/app', label: 'Tổng quan', hint: 'Tiến độ hôm nay', icon: 'space_dashboard', end: true, group: 'study' },
    { to: '/roadmap', label: 'Lộ trình', hint: 'Khám phá JLPT', icon: 'explore', group: 'study' },
    { to: '/placement', label: 'Đánh giá', hint: 'Ước tính trình độ JLPT', icon: 'quiz', prefix: true, group: 'study' },
    { to: '/lessons', label: 'Bài học', hint: 'Giáo trình đang học', icon: 'menu_book', group: 'study' },
    { to: '/vocabulary', label: 'Sổ từ', hint: 'Từ vựng & Kanji', icon: 'edit_note', alsoActive: ['/kanji-notebook', '/vocabulary-detail'], group: 'study' },
    { to: '/daily-srs', label: 'Ôn SRS', hint: 'Lặp ngắt quãng', icon: 'style', group: 'study' },
    {
      id: 'riki',
      label: 'Studio Riki',
      hint: 'Luyện viết & làm văn',
      icon: 'auto_awesome',
      group: 'riki',
      children: [
        {
          id: 'vocabulary',
          label: 'Từ vựng',
          icon: 'translate',
          children: [
            { to: '/kanji-writing?type=hiragana', label: 'Hiragana', icon: 'あ' },
            { to: '/kanji-writing?type=katakana', label: 'Katakana', icon: 'カ' },
          ],
        },
        { to: '/kanji-writing?type=kanji', label: 'Hán tự', icon: '漢' },
        { to: '/riki/essay', label: 'Luyện làm văn', icon: 'edit_note' },
      ],
    },
    { to: '/ai-counselor', label: 'Cố vấn AI', hint: 'Haru đồng hành', icon: 'psychology', group: 'support' },
    { to: '/mentor-chat', label: 'Tin nhắn 1–1', hint: 'Trao đổi riêng với cố vấn', icon: 'forum', group: 'support' },
    {
      to: '/mentor',
      label: 'Tư vấn 1-1',
      hint: 'Cố vấn hỗ trợ ôn luyện JLPT',
      icon: 'support_agent',
      group: 'support',
      alsoActive: [
        '/booking-schedule',
        '/consultation-payment',
        '/consultation-center',
        '/consultation-session',
        '/consultation-receipt',
        '/consultation-room',
        '/mentor-availability',
        '/mentors',
      ],
    },
    { to: '/payments', label: 'Thanh toán', icon: 'payments', group: 'support', alsoActive: ['/payments/history', '/consultation-payment', '/consultation-receipt', '/payment/success', '/payment/cancel'] },
    { to: '/settings', label: 'Cài đặt', hint: 'Tài khoản & mục tiêu', icon: 'settings', group: 'support' },
  ],
  user: { name: 'Học viên', role: 'Học viên' },
};

export const CONSULT_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Tư vấn 1-1' },
  groups: [
    {
      label: 'Buổi tư vấn',
      items: [
        { to: '/mentor-overview', label: 'Tổng quan', hint: 'Lịch và số liệu', icon: 'dashboard' },
        { to: '/mentor-study-courses', label: 'Khóa học 1–1', icon: 'school' },
        {
          to: '/consultation-queue',
          label: 'Hàng đợi',
          hint: 'Buổi được phân cho bạn',
          icon: 'pending_actions',
          alsoActive: ['/consultation-request'],
        },
        { to: '/consultation-prep', label: 'Chuẩn bị buổi', hint: 'Ghi chú trước giờ', icon: 'fact_check' },
        { to: '/mentor-chat', label: 'Tin nhắn 1–1', hint: 'Trao đổi riêng với học viên', icon: 'forum' },
        { to: '/mentor-reviews', label: 'Đánh giá', hint: 'Phản hồi học viên', icon: 'reviews' },
      ],
    },
    {
      label: 'Lịch',
      items: [
        { to: '/work-schedule', label: 'Lịch làm việc', hint: 'Tuần của bạn', icon: 'calendar_month' },
        { to: '/mentor-shift-schedule', label: 'Ca làm việc', hint: 'Khung 90 phút', icon: 'event_available', alsoActive: ['/mentor-availability'] },
      ],
    },
    {
      label: 'Hồ sơ',
      items: [
        { to: '/mentor-profile', label: 'Hồ sơ chuyên gia', hint: 'Xác minh và chuyên môn', icon: 'badge' },
        { to: '/mentor-compensation', label: 'Thù lao', hint: 'Bảng kê và tài khoản nhận', icon: 'payments' },
        { to: '/mentor-disputes', label: 'Khiếu nại', hint: 'Giải trình của học viên', icon: 'gavel' },
      ],
    },
  ],
  user: { name: 'Cố vấn', role: 'Cố vấn' },
};

export const MARKETING_NAV = {
  links: [
    { to: '/about', label: 'RikiPath là gì?' },
    { to: '/courses', label: 'Luyện thi JLPT' },
    { to: '/thi-thu', label: 'Thi thử' },
    { to: '/#pathway', label: 'Cấu trúc đề' },
  ],
  login: { to: '/auth', label: 'Đăng nhập' },
  cta: { to: '/register', label: 'Bắt đầu ôn luyện' },
};

export function pathMatches(pathname, item) {
  if (!item || item.neverActive || !item.to) return false;
  const clean = (pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/');
  const target = (item.to.split('?')[0].split('#')[0].replace(/\/$/, '') || '/');
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
