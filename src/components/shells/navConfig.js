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
          to: '/admin/users',
          label: 'Tổng quan',
          hint: 'Người dùng',
          icon: 'space_dashboard',
          alsoActive: ['/admin/users/detail'],
        },
      ],
    },
    {
      label: 'Mentor',
      items: [
        {
          to: '/admin/mentors',
          label: 'Mentor',
          hint: 'Hồ sơ và xếp lịch tuần',
          icon: 'support_agent',
          alsoActive: ['/admin/mentor-schedules', '/admin/mentor-plans', '/admin/consultants'],
          children: [
            { to: '/admin/mentors', label: 'Hồ sơ', alsoActive: ['/admin/consultants'] },
            { to: '/admin/mentor-schedules', label: 'Xếp lịch tuần' },
            { to: '/admin/mentor-plans', label: 'Gói tư vấn' },
          ],
        },
        { to: '/admin/operations', label: 'Gói & lịch', hint: 'Feature, booking', icon: 'tune' },
      ],
    },
    {
      label: 'Nội dung',
      items: [
        { to: '/admin/content-review', label: 'Duyệt nội dung', hint: 'Hàng chờ xuất bản', icon: 'fact_check' },
      ],
    },
  ],
};

export const LEARNER_NAV = {
  brand: { title: 'RikiPath', subtitle: 'JLPT Academy' },
  groups: [
    { id: 'study', label: 'Học tập' },
    { id: 'riki', label: 'Riki' },
    { id: 'support', label: 'Hỗ trợ' },
  ],
  items: [
    { to: '/app', label: 'Tổng quan', hint: 'Tiến độ hôm nay', icon: 'space_dashboard', end: true, group: 'study' },
    { to: '/roadmap', label: 'Lộ trình', hint: 'Khám phá JLPT', icon: 'explore', group: 'study' },
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
    { to: '/mentor-chat', label: 'Tin nhắn 1–1', hint: 'Trao đổi riêng với Mentor', icon: 'forum', group: 'support' },
    {
      to: '/mentor',
      label: 'Tư vấn 1-1',
      hint: 'Sensei trực tiếp',
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
      ],
    },
    { to: '/payments', label: 'Thanh toán', icon: 'payments', group: 'support', alsoActive: ['/payments/history', '/consultation-payment', '/consultation-receipt', '/payment/success', '/payment/cancel'] },
    { to: '/settings', label: 'Cài đặt', hint: 'Tài khoản & mục tiêu', icon: 'settings', group: 'support' },
  ],
  user: { name: 'Minh Anh', role: 'Học viên N4' },
};

export const CONSULT_NAV = {
  brand: { title: 'RikiPath', subtitle: 'Mentor' },
  groups: [
    {
      label: 'Buổi học',
      items: [
        { to: '/mentor-overview', label: 'Tổng quan', hint: 'Lịch và số liệu', icon: 'dashboard' },
        { to: '/mentor-chat', label: 'Tin nhắn 1–1', hint: 'Trao đổi riêng với học viên', icon: 'forum' },
        {
          to: '/consultation-request',
          label: 'Hàng đợi',
          hint: 'Yêu cầu chờ nhận',
          icon: 'pending_actions',
          alsoActive: ['/consultation-queue'],
        },
        { to: '/consultation-prep', label: 'Chuẩn bị buổi', hint: 'Ghi chú trước giờ', icon: 'fact_check' },
        { to: '/consultation-reply', label: 'Trả lời văn bản', hint: 'Phản hồi bài viết', icon: 'edit_note' },
      ],
    },
    {
      label: 'Lịch',
      items: [
        { to: '/work-schedule', label: 'Lịch làm việc', hint: 'Tuần của bạn', icon: 'calendar_month' },
        { to: '/mentor-availability', label: 'Lịch tuần', hint: 'Đăng ký buổi rảnh', icon: 'event_available' },
      ],
    },
  ],
  user: { name: 'Sensei Aoi', role: 'Mentor N3–N2' },
};

export const MARKETING_NAV = {
  links: [
    { to: '/about', label: 'RikiPath là gì?' },
    { to: '/courses', label: 'Luyện thi JLPT' },
    { to: '/thi-thu', label: 'Thi thử' },
    { to: '/#pathway', label: 'Cấu trúc đề' },
    { to: '/mentor', label: 'Tư vấn' },
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
