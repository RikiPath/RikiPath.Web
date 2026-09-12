/**
 * RikiPath — luồng sản phẩm + ALL_PAGES cho Navbar nhảy nhanh.
 */

export const ALL_PAGES = [
  // Marketing
  { to: '/', label: 'Landing', page: 'HomeLanding', group: 'marketing' },
  { to: '/courses', label: 'Catalog', page: 'CourseCatalog', group: 'marketing' },
  { to: '/course-detail', label: 'Course Detail', page: 'CourseDetail', group: 'marketing' },
  // Auth
  { to: '/auth', label: 'Auth', page: 'Auth', group: 'auth' },
  { to: '/register', label: 'Register', page: 'Register', group: 'auth' },
  { to: '/forgot-password', label: 'Forgot PW', page: 'ForgotPassword', group: 'auth' },
  { to: '/onboarding', label: 'Onboarding', page: 'OnboardingSurvey', group: 'onboarding' },
  // Learner
  { to: '/app', label: 'Dashboard', page: 'Dashboard', group: 'learner' },
  { to: '/lessons', label: 'Lessons', page: 'LessonList', group: 'learner' },
  { to: '/lesson-player', label: 'Player', page: 'LessonPlayer', group: 'learner' },
  { to: '/lesson-complete', label: 'Complete', page: 'LessonComplete', group: 'learner' },
  { to: '/roadmap', label: 'Roadmap', page: 'RoadmapJLPT', group: 'learner' },
  { to: '/vocabulary', label: 'Sổ từ', page: 'VocabularyNotebook', group: 'learner' },
  { to: '/vocabulary-detail', label: 'Chi tiết từ', page: 'VocabWordDetail', group: 'learner' },
  { to: '/kanji-notebook', label: 'Kanji Note', page: 'KanjiNotebook', group: 'learner' },
  { to: '/daily-srs', label: 'SRS', page: 'DailySRS', group: 'learner' },
  { to: '/sentence-studio', label: 'Sentence', page: 'SentenceStudio', group: 'learner' },
  { to: '/kanji-studio', label: 'Kanji AI', page: 'KanjiStudio', group: 'learner' },
  { to: '/ai-counselor', label: 'AI Counselor', page: 'AICounselor', group: 'learner' },
  { to: '/ai-scoring', label: 'AI Score', page: 'AIScoringResult', group: 'learner' },
  { to: '/exam-n3', label: 'Exam N3', page: 'ExamN3', group: 'learner' },
  { to: '/exam-result', label: 'Kết quả thi', page: 'ExamResult', group: 'learner' },
  { to: '/settings', label: 'Cài đặt HV', page: 'LearnerSettings', group: 'learner' },
  // Tư vấn học viên
  { to: '/consultation', label: 'Gói tư vấn', page: 'Consultation', group: 'consult-learner' },
  { to: '/booking-schedule', label: 'Đặt lịch', page: 'BookingSchedule', group: 'consult-learner' },
  { to: '/consultation-payment', label: 'Thanh toán', page: 'ConsultationPayment', group: 'consult-learner' },
  { to: '/consultation-center', label: 'Lịch của tôi', page: 'ConsultationCenter', group: 'consult-learner' },
  { to: '/sensei-profile', label: 'Hồ sơ Sensei', page: 'SenseiProfile', group: 'consult-learner' },
  { to: '/consultation-session', label: 'Chi tiết buổi', page: 'ConsultationSessionDetail', group: 'consult-learner' },
  { to: '/consultation-room', label: 'Phòng video', page: 'ConsultationRoom', group: 'consult-learner' },
  { to: '/consultation-receipt', label: 'Biên lai', page: 'ConsultationReceipt', group: 'consult-learner' },
  // Sensei
  { to: '/consultant-overview', label: 'Tổng quan CG', page: 'ConsultantOverview', group: 'consult-sensei' },
  { to: '/consultation-queue', label: 'Hàng đợi', page: 'ConsultationQueue', group: 'consult-sensei' },
  { to: '/consultation-prep', label: 'Prep', page: 'ConsultationPrep', group: 'consult-sensei' },
  { to: '/consultation-request', label: 'Yêu cầu', page: 'ConsultationRequestDetail', group: 'consult-sensei' },
  { to: '/consultation-reply', label: 'Reply', page: 'TextConsultationReply', group: 'consult-sensei' },
  { to: '/work-schedule', label: 'Lịch làm việc', page: 'WorkSchedule', group: 'consult-sensei' },
  // CMS
  { to: '/cms-studio', label: 'CMS Studio', page: 'CMSStudio', group: 'cms' },
  { to: '/author-dashboard', label: 'Author', page: 'AuthorDashboard', group: 'cms' },
  { to: '/content-library', label: 'Content Lib', page: 'ContentLibrary', group: 'cms' },
  { to: '/lesson-cms', label: 'Lesson CMS', page: 'LessonCMS', group: 'cms' },
  { to: '/lesson-cms-detail', label: 'Chi tiết bài CMS', page: 'CmsLessonDetail', group: 'cms' },
  { to: '/exam-builder', label: 'Exam Builder', page: 'ExamBuilder', group: 'cms' },
  { to: '/question-bank', label: 'Question Bank', page: 'QuestionBank', group: 'cms' },
  { to: '/bulk-import', label: 'Bulk Import', page: 'BulkImport', group: 'cms' },
  { to: '/vocabulary-editor', label: 'Vocab Edit', page: 'VocabularyEditor', group: 'cms' },
  { to: '/kanji-editor', label: 'Kanji Edit', page: 'KanjiEditor', group: 'cms' },
  { to: '/video-editor', label: 'Video Edit', page: 'VideoLessonEditor', group: 'cms' },
  // Admin
  { to: '/admin', label: 'Admin', page: 'AdminOverview', group: 'admin' },
  { to: '/admin/users', label: 'Users', page: 'AdminUsers', group: 'admin' },
  { to: '/admin/users/detail', label: 'Chi tiết user', page: 'AdminUserDetail', group: 'admin' },
  { to: '/admin/roles', label: 'Roles', page: 'AdminRoles', group: 'admin' },
  { to: '/admin/content-review', label: 'Duyệt ND', page: 'AdminContentReview', group: 'admin' },
];

export const FLOWS = [
  {
    id: 'all',
    stepLabel: 'Tất cả',
    title: 'Nhảy nhanh mọi trang',
    description: 'Danh sách đầy đủ các màn hình UI để chuyển nhanh',
    steps: ALL_PAGES.map((p, i) => ({
      n: i + 1,
      to: p.to,
      label: p.label,
      page: p.page,
      hint: p.page,
    })),
  },
  {
    id: 'marketing',
    stepLabel: 'Luồng 1',
    title: 'Khám phá & chuyển đổi',
    description: 'Landing → Catalog → Detail → Auth/Register',
    steps: [
      { n: 1, to: '/', label: 'Trang chủ', page: 'HomeLanding', hint: 'Landing' },
      { n: 2, to: '/courses', label: 'Danh mục', page: 'CourseCatalog', hint: 'Catalog' },
      { n: 3, to: '/course-detail', label: 'Chi tiết khóa', page: 'CourseDetail', hint: 'Detail' },
      { n: 4, to: '/auth', label: 'Đăng nhập', page: 'Auth', hint: 'Auth' },
      { n: 5, to: '/register', label: 'Đăng ký', page: 'Register', hint: 'Register' },
    ],
  },
  {
    id: 'auth',
    stepLabel: 'Luồng 2',
    title: 'Xác thực',
    description: 'Login / Register / Forgot / Onboarding',
    steps: [
      { n: 1, to: '/auth', label: 'Đăng nhập', page: 'Auth', hint: 'Auth' },
      { n: 2, to: '/register', label: 'Đăng ký', page: 'Register', hint: 'Register' },
      { n: 3, to: '/forgot-password', label: 'Quên MK', page: 'ForgotPassword', hint: 'Forgot' },
      { n: 4, to: '/onboarding', label: 'Onboarding', page: 'OnboardingSurvey', hint: 'Survey' },
    ],
  },
  {
    id: 'learner',
    stepLabel: 'Luồng 3',
    title: 'Học tập',
    description: 'Dashboard là hub — bài học, ôn tập, thi tỏa ra từ đây',
    steps: [
      { n: 1, to: '/app', label: 'Dashboard', page: 'Dashboard', hint: 'Dashboard' },
      { n: 2, to: '/lessons', label: 'Bài học', page: 'LessonList', hint: 'Lessons' },
      { n: 3, to: '/lesson-player', label: 'Player', page: 'LessonPlayer', hint: 'Player' },
      { n: 4, to: '/lesson-complete', label: 'Hoàn thành', page: 'LessonComplete', hint: 'Complete' },
      { n: 5, to: '/roadmap', label: 'Lộ trình', page: 'RoadmapJLPT', hint: 'Roadmap' },
      { n: 6, to: '/vocabulary', label: 'Sổ từ', page: 'VocabularyNotebook', hint: 'Vocab' },
      { n: 7, to: '/vocabulary-detail', label: 'Chi tiết từ', page: 'VocabWordDetail', hint: 'Word' },
      { n: 8, to: '/kanji-notebook', label: 'Sổ Kanji', page: 'KanjiNotebook', hint: 'Kanji note' },
      { n: 9, to: '/daily-srs', label: 'SRS', page: 'DailySRS', hint: 'SRS' },
      { n: 10, to: '/sentence-studio', label: 'Viết câu', page: 'SentenceStudio', hint: 'Sentence' },
      { n: 11, to: '/kanji-studio', label: 'Kanji AI', page: 'KanjiStudio', hint: 'Kanji' },
      { n: 12, to: '/ai-counselor', label: 'Cố vấn AI', page: 'AICounselor', hint: 'AI' },
      { n: 13, to: '/ai-scoring', label: 'Chấm AI', page: 'AIScoringResult', hint: 'Scoring' },
      { n: 14, to: '/exam-n3', label: 'Thi N3', page: 'ExamN3', hint: 'Exam' },
      { n: 15, to: '/exam-result', label: 'Kết quả thi', page: 'ExamResult', hint: 'Result' },
      { n: 16, to: '/settings', label: 'Cài đặt', page: 'LearnerSettings', hint: 'Settings' },
    ],
  },
  {
    id: 'consult-learner',
    stepLabel: 'Luồng 4',
    title: 'Tư vấn học viên',
    description: 'Chọn gói → đặt lịch → thanh toán → xem lịch của tôi',
    steps: [
      { n: 1, to: '/consultation', label: 'Gói tư vấn', page: 'Consultation', hint: 'Packages' },
      { n: 2, to: '/booking-schedule', label: 'Đặt lịch', page: 'BookingSchedule', hint: 'Booking' },
      { n: 3, to: '/consultation-payment', label: 'Thanh toán', page: 'ConsultationPayment', hint: 'Pay' },
      { n: 4, to: '/consultation-receipt', label: 'Biên lai', page: 'ConsultationReceipt', hint: 'Receipt' },
      { n: 5, to: '/consultation-center', label: 'Lịch của tôi', page: 'ConsultationCenter', hint: 'My bookings' },
      { n: 6, to: '/consultation-session', label: 'Chi tiết buổi', page: 'ConsultationSessionDetail', hint: 'Session' },
      { n: 7, to: '/consultation-room', label: 'Vào phòng', page: 'ConsultationRoom', hint: 'Room' },
      { n: 8, to: '/sensei-profile', label: 'Hồ sơ Sensei', page: 'SenseiProfile', hint: 'Sensei' },
    ],
  },
  {
    id: 'consult-sensei',
    stepLabel: 'Luồng 5',
    title: 'Sensei làm việc',
    description: 'Tổng quan → hàng đợi → chuẩn bị / trả lời → lịch làm việc',
    steps: [
      { n: 1, to: '/consultant-overview', label: 'Tổng quan CG', page: 'ConsultantOverview', hint: 'Overview' },
      { n: 2, to: '/consultation-queue', label: 'Hàng đợi', page: 'ConsultationQueue', hint: 'Queue' },
      { n: 3, to: '/consultation-prep', label: 'Chuẩn bị', page: 'ConsultationPrep', hint: 'Prep' },
      { n: 4, to: '/consultation-request', label: 'Chi tiết YC', page: 'ConsultationRequestDetail', hint: 'Request' },
      { n: 5, to: '/consultation-reply', label: 'Trả lời', page: 'TextConsultationReply', hint: 'Reply' },
      { n: 6, to: '/work-schedule', label: 'Lịch làm việc', page: 'WorkSchedule', hint: 'Schedule' },
    ],
  },
  {
    id: 'cms',
    stepLabel: 'Luồng 6',
    title: 'CMS & Tác giả',
    description: 'Studio → nội dung → đề thi → biên tập',
    steps: [
      { n: 1, to: '/cms-studio', label: 'CMS Studio', page: 'CMSStudio', hint: 'CMS' },
      { n: 2, to: '/author-dashboard', label: 'Tác giả', page: 'AuthorDashboard', hint: 'Author' },
      { n: 3, to: '/content-library', label: 'Kho học liệu', page: 'ContentLibrary', hint: 'Library' },
      { n: 4, to: '/lesson-cms', label: 'QL Bài học', page: 'LessonCMS', hint: 'Lessons CMS' },
      { n: 5, to: '/lesson-cms-detail', label: 'Chi tiết bài', page: 'CmsLessonDetail', hint: 'Lesson detail' },
      { n: 6, to: '/exam-builder', label: 'Xây đề', page: 'ExamBuilder', hint: 'Builder' },
      { n: 7, to: '/question-bank', label: 'Ngân hàng CH', page: 'QuestionBank', hint: 'Bank' },
      { n: 8, to: '/bulk-import', label: 'Import', page: 'BulkImport', hint: 'Import' },
      { n: 9, to: '/vocabulary-editor', label: 'Sửa từ', page: 'VocabularyEditor', hint: 'Vocab' },
      { n: 10, to: '/kanji-editor', label: 'Sửa Kanji', page: 'KanjiEditor', hint: 'Kanji' },
      { n: 11, to: '/video-editor', label: 'Sửa video', page: 'VideoLessonEditor', hint: 'Video' },
    ],
  },
  {
    id: 'admin',
    stepLabel: 'Luồng 7',
    title: 'Quản trị Admin',
    description: 'Tổng quan → người dùng → phân quyền → duyệt nội dung',
    steps: [
      { n: 1, to: '/admin', label: 'Tổng quan', page: 'AdminOverview', hint: 'Overview' },
      { n: 2, to: '/admin/users', label: 'Người dùng', page: 'AdminUsers', hint: 'Users' },
      { n: 3, to: '/admin/users/detail', label: 'Chi tiết user', page: 'AdminUserDetail', hint: 'User detail' },
      { n: 4, to: '/admin/roles', label: 'Phân quyền', page: 'AdminRoles', hint: 'Roles' },
      { n: 5, to: '/admin/content-review', label: 'Duyệt ND', page: 'AdminContentReview', hint: 'Review' },
    ],
  },
];

export const ROUTE_ALIASES = {
  '/landing': '/',
  '/dashboard': '/app',
  '/home-learner': '/app',
  '/multi-dashboard': '/app',
  '/consultation-hub': '/consultation',
};

export function matchFlowStep(pathname) {
  const raw = pathname === '/' ? '/' : pathname.replace(/\/$/, '') || '/';
  const normalized = ROUTE_ALIASES[raw] || raw;

  for (const flow of FLOWS) {
    if (flow.id === 'all') continue;
    const idx = flow.steps.findIndex((s) => s.to === normalized);
    if (idx !== -1) return { flow, stepIndex: idx, step: flow.steps[idx] };
  }

  const all = FLOWS.find((f) => f.id === 'all');
  const idx = all.steps.findIndex((s) => s.to === normalized);
  if (idx !== -1) return { flow: all, stepIndex: idx, step: all.steps[idx] };

  return { flow: FLOWS[0], stepIndex: 0, step: FLOWS[0].steps[0] };
}
