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
  { to: '/home-learner', label: 'Home Learner', page: 'HomeLearner', group: 'learner' },
  { to: '/multi-dashboard', label: 'Multi Dash', page: 'MultiColumnDashboard', group: 'learner' },
  { to: '/lessons', label: 'Lessons', page: 'LessonList', group: 'learner' },
  { to: '/lesson-player', label: 'Player', page: 'LessonPlayer', group: 'learner' },
  { to: '/lesson-complete', label: 'Complete', page: 'LessonComplete', group: 'learner' },
  { to: '/roadmap', label: 'Roadmap', page: 'RoadmapJLPT', group: 'learner' },
  { to: '/sentence-studio', label: 'Sentence', page: 'SentenceStudio', group: 'learner' },
  { to: '/kanji-studio', label: 'Kanji AI', page: 'KanjiStudio', group: 'learner' },
  { to: '/kanji-notebook', label: 'Kanji Note', page: 'KanjiNotebook', group: 'learner' },
  { to: '/vocabulary', label: 'Sổ từ', page: 'VocabularyNotebook', group: 'learner' },
  { to: '/daily-srs', label: 'SRS', page: 'DailySRS', group: 'learner' },
  { to: '/ai-counselor', label: 'AI Counselor', page: 'AICounselor', group: 'learner' },
  { to: '/ai-scoring', label: 'AI Score', page: 'AIScoringResult', group: 'learner' },
  { to: '/exam-n3', label: 'Exam N3', page: 'ExamN3', group: 'learner' },
  // Consultation
  { to: '/consultation', label: 'Consultation', page: 'Consultation', group: 'consult' },
  { to: '/consultation-hub', label: 'Consult Hub', page: 'ConsultationHub', group: 'consult' },
  { to: '/consultation-center', label: 'Consult Center', page: 'ConsultationCenter', group: 'consult' },
  { to: '/consultation-queue', label: 'Queue', page: 'ConsultationQueue', group: 'consult' },
  { to: '/booking-schedule', label: 'Booking', page: 'BookingSchedule', group: 'consult' },
  { to: '/consultation-payment', label: 'Payment', page: 'ConsultationPayment', group: 'consult' },
  { to: '/consultant-overview', label: 'Consultant', page: 'ConsultantOverview', group: 'consult' },
  { to: '/consultation-prep', label: 'Prep', page: 'ConsultationPrep', group: 'consult' },
  { to: '/consultation-request', label: 'Request', page: 'ConsultationRequestDetail', group: 'consult' },
  { to: '/work-schedule', label: 'Work Schedule', page: 'WorkSchedule', group: 'consult' },
  { to: '/consultation-reply', label: 'Reply', page: 'TextConsultationReply', group: 'consult' },
  // CMS
  { to: '/cms-studio', label: 'CMS Studio', page: 'CMSStudio', group: 'cms' },
  { to: '/author-dashboard', label: 'Author', page: 'AuthorDashboard', group: 'cms' },
  { to: '/exam-builder', label: 'Exam Builder', page: 'ExamBuilder', group: 'cms' },
  { to: '/question-bank', label: 'Question Bank', page: 'QuestionBank', group: 'cms' },
  { to: '/content-library', label: 'Content Lib', page: 'ContentLibrary', group: 'cms' },
  { to: '/lesson-cms', label: 'Lesson CMS', page: 'LessonCMS', group: 'cms' },
  { to: '/bulk-import', label: 'Bulk Import', page: 'BulkImport', group: 'cms' },
  { to: '/vocabulary-editor', label: 'Vocab Edit', page: 'VocabularyEditor', group: 'cms' },
  { to: '/kanji-editor', label: 'Kanji Edit', page: 'KanjiEditor', group: 'cms' },
  { to: '/video-editor', label: 'Video Edit', page: 'VideoLessonEditor', group: 'cms' },
  // Admin
  { to: '/admin', label: 'Admin', page: 'AdminOverview', group: 'admin' },
  { to: '/admin/users', label: 'Users', page: 'AdminUsers', group: 'admin' },
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
    description: 'Dashboard → bài học → luyện → thi',
    steps: [
      { n: 1, to: '/app', label: 'Dashboard', page: 'Dashboard', hint: 'Dashboard' },
      { n: 2, to: '/home-learner', label: 'Home HV', page: 'HomeLearner', hint: 'Home' },
      { n: 3, to: '/lessons', label: 'Bài học', page: 'LessonList', hint: 'Lessons' },
      { n: 4, to: '/lesson-player', label: 'Player', page: 'LessonPlayer', hint: 'Player' },
      { n: 5, to: '/lesson-complete', label: 'Hoàn thành', page: 'LessonComplete', hint: 'Complete' },
      { n: 6, to: '/roadmap', label: 'Lộ trình', page: 'RoadmapJLPT', hint: 'Roadmap' },
      { n: 7, to: '/vocabulary', label: 'Sổ từ', page: 'VocabularyNotebook', hint: 'Vocab' },
      { n: 8, to: '/daily-srs', label: 'SRS', page: 'DailySRS', hint: 'SRS' },
      { n: 9, to: '/sentence-studio', label: 'Viết câu', page: 'SentenceStudio', hint: 'Sentence' },
      { n: 10, to: '/kanji-studio', label: 'Kanji AI', page: 'KanjiStudio', hint: 'Kanji' },
      { n: 11, to: '/ai-counselor', label: 'Cố vấn AI', page: 'AICounselor', hint: 'AI' },
      { n: 12, to: '/ai-scoring', label: 'Chấm AI', page: 'AIScoringResult', hint: 'Scoring' },
      { n: 13, to: '/exam-n3', label: 'Thi N3', page: 'ExamN3', hint: 'Exam' },
    ],
  },
  {
    id: 'consult',
    stepLabel: 'Luồng 4',
    title: 'Tư vấn chuyên gia',
    description: 'Hub → hàng đợi → đặt lịch → thanh toán → Sensei',
    steps: [
      { n: 1, to: '/consultation', label: 'Tư vấn', page: 'Consultation', hint: 'Consult' },
      { n: 2, to: '/consultation-hub', label: 'Hub', page: 'ConsultationHub', hint: 'Hub' },
      { n: 3, to: '/consultation-center', label: 'Trung tâm', page: 'ConsultationCenter', hint: 'Center' },
      { n: 4, to: '/consultation-queue', label: 'Hàng đợi', page: 'ConsultationQueue', hint: 'Queue' },
      { n: 5, to: '/booking-schedule', label: 'Đặt lịch', page: 'BookingSchedule', hint: 'Booking' },
      { n: 6, to: '/consultation-payment', label: 'Thanh toán', page: 'ConsultationPayment', hint: 'Pay' },
      { n: 7, to: '/consultant-overview', label: 'Tổng quan CG', page: 'ConsultantOverview', hint: 'Overview' },
      { n: 8, to: '/consultation-prep', label: 'Chuẩn bị', page: 'ConsultationPrep', hint: 'Prep' },
      { n: 9, to: '/consultation-request', label: 'Yêu cầu', page: 'ConsultationRequestDetail', hint: 'Request' },
      { n: 10, to: '/work-schedule', label: 'Lịch làm việc', page: 'WorkSchedule', hint: 'Schedule' },
      { n: 11, to: '/consultation-reply', label: 'Trả lời', page: 'TextConsultationReply', hint: 'Reply' },
    ],
  },
  {
    id: 'cms',
    stepLabel: 'Luồng 5',
    title: 'CMS & Tác giả',
    description: 'Studio → nội dung → đề thi → biên tập',
    steps: [
      { n: 1, to: '/cms-studio', label: 'CMS Studio', page: 'CMSStudio', hint: 'CMS' },
      { n: 2, to: '/author-dashboard', label: 'Tác giả', page: 'AuthorDashboard', hint: 'Author' },
      { n: 3, to: '/content-library', label: 'Kho học liệu', page: 'ContentLibrary', hint: 'Library' },
      { n: 4, to: '/lesson-cms', label: 'QL Bài học', page: 'LessonCMS', hint: 'Lessons CMS' },
      { n: 5, to: '/exam-builder', label: 'Xây đề', page: 'ExamBuilder', hint: 'Builder' },
      { n: 6, to: '/question-bank', label: 'Ngân hàng CH', page: 'QuestionBank', hint: 'Bank' },
      { n: 7, to: '/bulk-import', label: 'Import', page: 'BulkImport', hint: 'Import' },
      { n: 8, to: '/vocabulary-editor', label: 'Sửa từ', page: 'VocabularyEditor', hint: 'Vocab' },
      { n: 9, to: '/kanji-editor', label: 'Sửa Kanji', page: 'KanjiEditor', hint: 'Kanji' },
      { n: 10, to: '/video-editor', label: 'Sửa video', page: 'VideoLessonEditor', hint: 'Video' },
    ],
  },
  {
    id: 'admin',
    stepLabel: 'Luồng 6',
    title: 'Quản trị Admin',
    description: 'Tổng quan → người dùng → phân quyền → duyệt nội dung',
    steps: [
      { n: 1, to: '/admin', label: 'Tổng quan', page: 'AdminOverview', hint: 'Overview' },
      { n: 2, to: '/admin/users', label: 'Người dùng', page: 'AdminUsers', hint: 'Users' },
      { n: 3, to: '/admin/roles', label: 'Phân quyền', page: 'AdminRoles', hint: 'Roles' },
      { n: 4, to: '/admin/content-review', label: 'Duyệt ND', page: 'AdminContentReview', hint: 'Review' },
    ],
  },
];

export function matchFlowStep(pathname) {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '') || '/';

  for (const flow of FLOWS) {
    if (flow.id === 'all') continue;
    const idx = flow.steps.findIndex((s) => s.to === normalized);
    if (idx !== -1) return { flow, stepIndex: idx, step: flow.steps[idx] };
  }

  const all = FLOWS.find((f) => f.id === 'all');
  const idx = all.steps.findIndex((s) => s.to === normalized);
  if (idx !== -1) return { flow: all, stepIndex: idx, step: all.steps[idx] };

  if (normalized === '/landing') return matchFlowStep('/');
  if (normalized === '/dashboard') return matchFlowStep('/app');

  return { flow: FLOWS[0], stepIndex: 0, step: FLOWS[0].steps[0] };
}

export const ROUTE_ALIASES = {
  '/landing': '/',
  '/dashboard': '/app',
};
