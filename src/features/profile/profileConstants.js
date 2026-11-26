export const PROFILE_TABS = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'UserRound' },
  { id: 'professional', label: 'Hồ sơ chuyên môn', icon: 'GraduationCap', roles: ['Mentor'] },
  { id: 'security', label: 'Bảo mật & đăng nhập', icon: 'ShieldCheck' },
  { id: 'notifications', label: 'Thông báo', icon: 'Bell' },
  { id: 'preferences', label: 'Ngôn ngữ & giao diện', icon: 'SlidersHorizontal' },
  { id: 'goals', label: 'Mục tiêu học tập', icon: 'Target', roles: ['Learner'] },
];

export const ROLE_META = {
  Learner: {
    label: 'Học viên',
    badgeClass: 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong',
    summary: 'Học viên tiếng Nhật trên hệ thống lộ trình cá nhân hóa JLPT N5–N1.',
  },
  Mentor: {
    label: 'Giáo viên',
    badgeClass: 'border-[#DCE5F4] bg-[#F2F6FC] text-[#2B5387]',
    summary: 'Giáo viên giảng dạy và đồng hành cùng các lớp học nhóm trên RikiPath.',
  },
  ContentAuthor: {
    label: 'Quản lý nội dung',
    badgeClass: 'border-[#E6DFC8] bg-[#FAF6EB] text-[#7D5B12]',
    summary: 'Biên soạn giáo trình, từ vựng, ngữ pháp, Hán tự và bộ đề thi chuẩn JLPT.',
  },
  Admin: {
    label: 'Quản trị viên',
    badgeClass: 'border-[#DED7DE] bg-[#F5F2F5] text-[#4C3B4D]',
    summary: 'Quản trị vận hành toàn hệ thống, phân quyền người dùng và kiểm duyệt nội dung.',
  },
};

export const NOTIFICATION_CATEGORIES_BY_ROLE = {
  Learner: [
    {
      key: 'schedule',
      title: 'Lịch học & lớp nhóm',
      description: 'Thông báo buổi học sắp diễn ra, thay đổi lịch hoặc điểm danh lớp.',
    },
    {
      key: 'homework',
      title: 'Bài tập & phản hồi',
      description: 'Nhắc hạn nộp bài tập và kết quả chấm điểm từ giáo viên.',
    },
    {
      key: 'studyReminder',
      title: 'Nhắc ôn tập mỗi ngày',
      description: 'Gợi ý phiên ôn tập SRS và giữ chuỗi học tập đều đặn.',
    },
  ],
  Mentor: [
    {
      key: 'scheduleReview',
      title: 'Xét duyệt lịch dạy',
      description: 'Cập nhật khi Quản trị viên duyệt hoặc yêu cầu bổ sung khung giờ giảng dạy.',
    },
    {
      key: 'teachingSchedule',
      title: 'Nhắc buổi dạy & điểm danh',
      description: 'Nhắc trước giờ vào lớp và hoàn tất ghi nhận sau buổi dạy.',
    },
    {
      key: 'cohort',
      title: 'Cập nhật lớp phụ trách',
      description: 'Khi được phân công lớp mới hoặc có thay đổi danh sách học viên.',
    },
    {
      key: 'homework',
      title: 'Bài nộp từ học viên',
      description: 'Thông báo khi học viên hoàn thành bài tập cần chấm.',
    },
  ],
  ContentAuthor: [
    {
      key: 'approvalResult',
      title: 'Kết quả duyệt nội dung',
      description: 'Thông báo khi học liệu hoặc đề thi được phê duyệt phát hành.',
    },
    {
      key: 'rejectedContent',
      title: 'Nội dung bị từ chối',
      description: 'Nhận chi tiết lý do nếu nội dung chưa đạt tiêu chuẩn xuất bản.',
    },
    {
      key: 'revisionRequest',
      title: 'Yêu cầu chỉnh sửa',
      description: 'Nhận phản hồi chỉnh sửa trực tiếp từ bộ phận kiểm duyệt.',
    },
  ],
  Admin: [
    {
      key: 'approvalQueue',
      title: 'Hàng đợi xét duyệt',
      description: 'Hồ sơ giáo viên, lịch dạy hoặc học liệu mới chờ kiểm duyệt.',
    },
    {
      key: 'complaints',
      title: 'Khiếu nại & sự cố',
      description: 'Phản ánh cần xử lý từ học viên hoặc giáo viên.',
    },
    {
      key: 'operations',
      title: 'Cảnh báo vận hành',
      description: 'Biến động lớp học, thanh toán hoặc trạng thái vận hành bất thường.',
    },
  ],
};

export const STUDY_TIME_PREFERENCES = [
  { id: 'morning', label: 'Buổi sáng', hint: '06:00 – 11:00' },
  { id: 'afternoon', label: 'Buổi chiều', hint: '12:00 – 17:00' },
  { id: 'evening', label: 'Buổi tối', hint: '18:00 – 23:00' },
];

export const PHONE_REGEX = /^(?:\+?\d{9,15}|0\d{8,11})$/;

export function evaluatePasswordStrength(password = '') {
  const value = String(password || '');
  const checks = {
    minLength: value.length >= 6,
    recommendedLength: value.length >= 8,
    hasUpperOrLower: /[a-z]/.test(value) && /[A-Z]/.test(value),
    hasDigit: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value),
  };

  if (!value) {
    return { score: 0, label: 'Chưa nhập', tone: 'neutral', checks };
  }
  if (!checks.minLength) {
    return { score: 1, label: 'Quá ngắn', tone: 'danger', checks };
  }

  let points = 1;
  if (checks.recommendedLength) points++;
  if (checks.hasUpperOrLower) points++;
  if (checks.hasDigit) points++;
  if (checks.hasSymbol) points++;

  if (points <= 2) return { score: 2, label: 'Yếu', tone: 'warning', checks };
  if (points === 3) return { score: 3, label: 'Trung bình', tone: 'info', checks };
  return { score: 4, label: 'Mạnh', tone: 'success', checks };
}
