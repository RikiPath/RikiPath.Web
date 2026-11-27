// Route → page key → allowed roles. Single source of truth for:
//  - App.jsx (lazy page mapping + guards)
//  - post-login redirect (never send a user to a page outside their role)
//  - test/app_nav_routes.test.js (every sidebar link must exist here)
//
// roles: undefined = public; [] = any signed-in user; [...] = these roles only.
// Roles come from the verified session/JWT (AuthContext), never from the URL.

const L = ['Learner'];
const M = ['Mentor'];
const MA = ['Mentor', 'Admin'];
const CA = ['ContentAuthor', 'Admin'];
const A = ['Admin'];
const ANY = [];

export const ROUTES = [
  // Public
  { path: '/', page: 'HomeLanding' },
  { path: '/about', page: 'AboutRiki' },
  { path: '/courses', page: 'CourseCatalog' },
  { path: '/thi-thu', page: 'MockExam' },
  { path: '/feature/:slug', page: 'FeatureDetail' },

  // Auth (public pages handle the signed-in case themselves)
  { path: '/auth', page: 'Auth' },
  { path: '/register', page: 'Register' },
  { path: '/forgot-password', page: 'ForgotPassword' },
  { path: '/reset-password', page: 'ResetPassword' },
  { path: '/verify-email', page: 'VerifyEmail' },
  { path: '/update-email', page: 'UpdateEmail', roles: ANY },
  { path: '/change-password', page: 'ChangePassword', roles: ANY },
  { path: '/onboarding', page: 'OnboardingSurvey', roles: L },

  // Learner — self-study
  { path: '/app', page: 'Dashboard', roles: L },
  { path: '/roadmap', page: 'RoadmapJLPT', roles: L },
  { path: '/roadmap/stages/:stageId', page: 'RoadmapStageDetail', roles: L },
  // One general assessment page for every entry point (Sidebar, Dashboard, links).
  { path: '/placement', page: 'ExamN3', roles: L },
  { path: '/placement/exam', page: 'PlacementExam', roles: L },
  { path: '/placement/result/:attemptId', page: 'PlacementResult', roles: L },
  { path: '/placement-test', page: 'ExamN3', roles: L },
  { path: '/app/placement-test', page: 'ExamN3', roles: L },
  { path: '/lessons', page: 'LessonList', roles: L, study: true },
  { path: '/lesson-player', page: 'LessonPlayer', roles: L, study: true },
  { path: '/lesson-player/:lessonId', page: 'LessonPlayer', roles: L, study: true },
  { path: '/lesson-practice', page: 'LessonPractice', roles: L },
  { path: '/riki/listening', page: 'LessonList', props: { section: 'listening' }, roles: L, study: true },
  { path: '/riki/reading', page: 'LessonList', props: { section: 'reading' }, roles: L, study: true },
  { path: '/riki/speaking', page: 'SpeakingPracticePage', roles: L },
  { path: '/speech', page: 'SpeakingPracticePage', roles: L },
  { path: '/riki/essay', page: 'LearnerEssayPage', roles: L },
  { path: '/sentence-studio', page: 'SentenceStudio', roles: L },
  { path: '/ai-scoring', page: 'AIScoringResult', roles: L },
  { path: '/kanji-writing', page: 'KanjiWritingPracticePage', roles: L },
  { path: '/kanji-notebook', page: 'KanjiNotebook', roles: L },
  { path: '/vocabulary-detail', page: 'VocabWordDetail', roles: L },
  { path: '/grammar', page: 'GrammarBank', roles: L },
  { path: '/daily-srs', page: 'DailySRS', props: { section: 'today' }, roles: L },
  { path: '/daily-srs/due', page: 'DailySRS', props: { section: 'due' }, roles: L },
  { path: '/daily-srs/practice', page: 'DailySRS', props: { section: 'practice' }, roles: L },
  { path: '/daily-srs/practice/:mode', page: 'DailySRS', props: { section: 'practice' }, roles: L },
  { path: '/daily-srs/modes', page: 'DailySRS', props: { section: 'mode' }, roles: L },
  { path: '/daily-srs/modes/:mode', page: 'DailySRS', props: { section: 'mode' }, roles: L },
  { path: '/daily-srs/library', page: 'DailySRS', props: { section: 'library' }, roles: L },
  { path: '/daily-srs/templates', page: 'DailySRS', props: { section: 'templates' }, roles: L },
  { path: '/daily-srs/progress', page: 'DailySRS', props: { section: 'progress' }, roles: L },
  { path: '/practice-sets', page: 'PracticeSetsPage', roles: L },
  { path: '/practice-sets/attempt/:attemptId', page: 'MockTestPage', props: { routeMode: 'practice' }, roles: L },
  { path: '/practice-sets/result/:attemptId', page: 'MockTestPage', props: { routeMode: 'practice', resultOnly: true }, roles: L },
  { path: '/mock-test', page: 'MockTestPage', roles: L },
  { path: '/mock-tests', page: 'MockTestPage', roles: L },
  { path: '/mock-tests/attempt/:attemptId', page: 'MockTestPage', props: { routeMode: 'mock' }, roles: L },
  { path: '/mock-tests/result/:attemptId', page: 'MockTestPage', props: { routeMode: 'mock', resultOnly: true }, roles: L },
  { path: '/exam-result', page: 'ExamResult', roles: L },
  { path: '/profile', page: 'AccountProfile', roles: ANY },
  { path: '/settings', page: 'LearnerSettings', roles: ANY },
  { path: '/plans', page: 'StudyPlans', paymentReturn: 'plans' },
  { path: '/study-payment', page: 'StudyPayment', roles: L },
  { path: '/payment/success', page: 'StudyPaymentReceipt', roles: L, paymentReturn: 'receipt' },
  { path: '/payment/cancel', page: 'StudyPaymentReceipt', roles: L, paymentReturn: 'receipt' },
  { path: '/study-payment-receipt', page: 'StudyPaymentReceipt', roles: L, paymentReturn: 'receipt' },

  // Learner — Group Learning Workspace (Classes → Homework → Calendar → Progress → Discovery → Mentors)
  { path: '/mentors', page: 'MentorDirectory', roles: L },
  { path: '/mentors/:mentorId', page: 'MentorPublicProfile', roles: L },
  { path: '/cohorts', page: 'CohortDiscoveryPage', roles: L },
  { path: '/my-courses', page: 'LearnerMyCoursesPage', roles: L },
  { path: '/my-courses/:courseId', page: 'CohortWorkspacePage', roles: L },
  { path: '/calendar', page: 'LearnerCalendarPage', roles: L },
  { path: '/homework', page: 'HomeworkPage', roles: L },
  { path: '/group-learning/progress', page: 'GroupLearningProgressPage', roles: L },
  { path: '/meeting-room', page: 'ConsultationRoom', roles: ['Learner', 'Mentor', 'Admin'] },
  { path: '/meeting-room/:roomId', page: 'ConsultationRoom', roles: ['Learner', 'Mentor', 'Admin'] },
  { path: '/consultation-room', page: 'ConsultationRoom', roles: ['Learner', 'Mentor', 'Admin'] },
  { path: '/consultation-room/:roomId', page: 'ConsultationRoom', roles: ['Learner', 'Mentor', 'Admin'] },

  // Mentor
  { path: '/mentor-overview', page: 'ConsultantOverview', roles: MA },
  { path: '/mentor-study-courses', page: 'MentorClassWorkspace', roles: M },
  { path: '/mentor-study-courses/:cohortId', page: 'MentorClassWorkspace', roles: M },
  { path: '/mentor-study-courses/:cohortId/learners/:learnerId/competency', page: 'MentorLearnerCompetencyPage', roles: M },
  { path: '/mentor/cohorts/:cohortId', page: 'MentorClassWorkspace', roles: M },
  { path: '/mentor/cohorts/:cohortId/learners/:learnerId/competency', page: 'MentorLearnerCompetencyPage', roles: M },
  { path: '/mentor/complaints/:complaintId', page: 'MentorDisputes', roles: MA },
  { path: '/mentor/bookings/:id', page: 'WorkSchedule', roles: MA },
  { path: '/mentor/meetings/:roomId', page: 'ConsultationRoom', roles: MA },
  { path: '/mentor-homework', page: 'HomeworkPage', props: { mentor: true }, roles: M },
  { path: '/mentor-grading', page: 'MentorGrading', roles: M },
  { path: '/mentor-shift-schedule', page: 'MentorShiftSchedule', roles: M },
  { path: '/mentor-proposal-history', page: 'MentorProposalHistory', roles: M },
  { path: '/mentor-availability', page: 'MentorAvailability', roles: M },
  { path: '/work-schedule', page: 'WorkSchedule', roles: MA },
  { path: '/mentor-attendance-kpi', page: 'MentorAttendanceKpi', roles: MA },
  { path: '/mentor-reviews', page: 'MentorReviews', roles: MA },
  { path: '/mentor-disputes', page: 'MentorDisputes', roles: MA },
  { path: '/mentor-profile', page: 'MentorProfile', roles: MA },

  // Content Author
  { path: '/cms-studio', page: 'CMSStudio', roles: CA },
  { path: '/author-dashboard', page: 'AuthorDashboard', roles: CA },
  { path: '/exam-builder', page: 'ExamBuilder', roles: CA },
  { path: '/question-bank', page: 'QuestionBank', roles: CA },
  { path: '/content-library', page: 'ContentLibrary', roles: CA },
  { path: '/lesson-cms', page: 'LessonCMS', roles: CA },
  { path: '/lesson-cms-detail', page: 'CmsLessonDetail', roles: CA },
  { path: '/content-manual', page: 'ManualContentPage', roles: CA },
  { path: '/srs-templates', page: 'SrsTemplatesPage', roles: CA },
  { path: '/bulk-import', page: 'ContentImportPreviewPage', roles: CA },
  { path: '/content-studio', page: 'ContentImportPreviewPage', roles: CA },
  { path: '/vocabulary-editor', page: 'VocabularyEditor', roles: CA },
  { path: '/kanji-editor', page: 'KanjiEditor', roles: CA },
  { path: '/content-plan', page: 'ContentPlanStudio', roles: CA },

  // Admin
  { path: '/admin/dashboard', page: 'AdminDashboard', roles: A },
  { path: '/admin/users', page: 'AdminUsers', roles: A },
  { path: '/admin/users/detail', page: 'AdminUserDetail', roles: A },
  { path: '/admin/content-review', page: 'AdminContentReview', roles: A },
  { path: '/admin/approval-content', page: 'AdminContentReview', roles: A },
  { path: '/admin/certificate-sections', page: 'AdminCertificateSections', roles: A },
  { path: '/admin/study-catalog', page: 'AdminStudyCatalog', roles: A },
  { path: '/admin/plans', page: 'AdminPlansWorkspace', roles: A },
  { path: '/admin/policies', page: 'AdminLearningPolicies', roles: A },
  { path: '/admin/payments', page: 'AdminPaymentsWorkspace', roles: A },
  { path: '/admin/study-courses', page: 'AdminGroupWorkspace', roles: A },
  { path: '/admin/retake-support', page: 'AdminRetakeSupport', roles: A },
  { path: '/admin/schedule-requests', page: 'AdminScheduleRequests', roles: A },
  { path: '/admin/mentor-replacements', page: 'AdminMentorReplacements', roles: A },
  { path: '/admin/transfers', page: 'AdminCohortTransfers', roles: A },
  { path: '/admin/complaints', page: 'AdminComplaints', roles: A },
  { path: '/admin/mentor-homework', page: 'HomeworkPage', props: { admin: true }, roles: A },
  { path: '/admin/mentors', page: 'AdminMentorHub', roles: A },
  { path: '/admin/consultants', page: 'AdminMentorHub', roles: A },
  { path: '/admin/mentor-verifications', page: 'AdminMentorHub', roles: A },
  { path: '/admin/mentor-schedules', page: 'AdminMentorHub', roles: A },
  { path: '/admin/mentor-qualifications', page: 'AdminMentorHub', roles: A },
  { path: '/admin/slot-review', page: 'AdminSlotReview', roles: A },
  { path: '/admin/mentor-template', page: 'AdminMentorTemplate', roles: A },
  { path: '/admin/mentor-quality', page: 'AdminMentorQuality', roles: A },
  { path: '/admin/mentor-cases', page: 'AdminMentorCases', roles: A },
];

// Old URLs kept working (bookmarks, notification links). Legacy 1-1 booking,
// consultation packages and mentor payout URLs land on their replacements.
export const REDIRECTS = [
  ['/landing', '/'],
  ['/account-profile', '/profile'],
  ['/course-detail', '/courses'],
  ['/dashboard', '/app'],
  ['/home-learner', '/app'],
  ['/multi-dashboard', '/app'],
  ['/ai-counselor', '/app'],
  ['/group-learning', '/my-courses'],
  ['/lesson-complete', '/lessons'],
  ['/kanji-studio', '/kanji-writing'],
  ['/vocabulary', '/kanji-notebook'],
  ['/exam-n3', '/mock-tests/?level=N3'],
  ['/mentor', '/mentors'],
  ['/consultation', '/mentors'],
  ['/consultation-hub', '/mentors'],
  ['/consultation-center', '/my-courses'],
  ['/booking-schedule', '/mentors'],
  ['/sensei-profile', '/mentors'],
  ['/payments', '/my-courses'],
  ['/payments/history', '/my-courses'],
  ['/consultation-payment', '/my-courses'],
  ['/consultation-receipt', '/my-courses'],
  ['/mentor-chat', '/my-courses'],
  ['/consultation-session', '/my-courses'],
  ['/consultation-records', '/my-courses'],
  ['/mentor/cohorts', '/mentor-study-courses'],
  ['/mentor/complaints', '/mentor-disputes'],
  ['/mentor/profile', '/mentor-profile'],
  ['/mentor/schedule', '/work-schedule'],
  ['/mentor/availability', '/mentor-shift-schedule'],
  ['/mentor/reviews', '/mentor-reviews'],
  ['/mentor/disputes', '/mentor-disputes'],
  ['/consultant-overview', '/mentor-overview'],
  ['/consultation-queue', '/mentor-study-courses'],
  ['/consultation-prep', '/mentor-study-courses'],
  ['/consultation-request', '/mentor-study-courses'],
  ['/consultation-reply', '/mentor-reviews'],
  ['/mentor-compensation', '/mentor-attendance-kpi'],
  ['/admin', '/admin/dashboard'],
  ['/admin/roles', '/admin/users'],
  ['/admin/packages', '/admin/study-courses'],
  ['/admin/operations', '/admin/study-courses'],
  ['/admin/group-courses', '/admin/study-courses'],
  ['/admin/mentor-plans', '/admin/study-courses'],
  ['/admin/mentor-compensation', '/admin/mentor-quality'],
  ['/admin/policies/teaching', '/admin/policies'],
  ['/admin/policies/admission', '/admin/policies'],
  ['/admin/policies/training', '/admin/policies'],
  ['/admin/mentor-group-policy', '/admin/policies'],
];

export const ROLE_HOME = {
  Learner: '/app',
  Mentor: '/mentor-overview',
  ContentAuthor: '/cms-studio',
  Admin: '/admin/dashboard',
};

export function homeForRole(role) {
  const key = Object.keys(ROLE_HOME).find((k) => k.toLowerCase() === String(role || '').toLowerCase());
  return ROLE_HOME[key] || '/app';
}

function cleanPath(path) {
  return (String(path || '').split('#')[0].split('?')[0].replace(/\/+$/, '') || '/');
}

/** Minimal matcher for our patterns (`:param` segments only). */
export function matchRoute(pathname) {
  const target = cleanPath(pathname).split('/');
  return ROUTES.find((route) => {
    const parts = route.path.split('/');
    if (parts.length !== target.length) return false;
    return parts.every((part, i) => part.startsWith(':') ? Boolean(target[i]) : part === target[i]);
  }) || null;
}

/** true when a user holding `roles` may open `pathname` (unknown paths → false). */
export function canAccessPath(pathname, roles = []) {
  const route = matchRoute(pathname);
  if (!route) return false;
  if (!route.roles) return true;
  if (route.roles.length === 0) return roles.length > 0;
  const held = roles.map((r) => String(r).toLowerCase());
  return route.roles.some((r) => held.includes(r.toLowerCase()));
}
