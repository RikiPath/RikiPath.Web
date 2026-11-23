import { Suspense, lazy, useContext, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { AuthContext, useAuth } from './auth/authContext.js';
import { SESSION_EXPIRED_EVENT } from '@/api/client.js';
import { queryClient } from '@/api/queryClient.js';
import PaymentReturn from './guards/PaymentReturn.jsx';
import ProtectedRoute from './guards/ProtectedRoute.jsx';
import RequireStudyPlan from './guards/RequireStudyPlan.jsx';
import { isPreviewEnabled } from '@/mocks/preview.js';
import { retryImport } from './retryImport.js';
import { REDIRECTS, ROUTES, homeForRole } from './routes/routeTable.js';
import { ErrorBoundary, FeedbackProvider, NotFoundScreen, SakuraLoader, loadingContextForPath, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

// Every page is its own chunk: first paint only loads the shell + current page.
// Each chunk import retries once on a transient chunk-load failure (see retryImport.js).
const page = (loader) => lazy(() => retryImport(loader));
const named = (loader, name) => lazy(() => retryImport(loader).then((m) => ({ default: m[name] })));
const PAGES = {
  // marketing
  HomeLanding: page(() => import('@/pages/marketing/HomeLanding.jsx')),
  AboutRiki: page(() => import('@/pages/marketing/AboutRiki.jsx')),
  CourseCatalog: page(() => import('@/pages/marketing/CourseCatalog.jsx')),
  MockExam: page(() => import('@/pages/marketing/MockExam.jsx')),
  FeatureDetail: page(() => import('@/pages/marketing/FeatureDetail.jsx')),
  // auth
  Auth: page(() => import('@/pages/auth/Auth.jsx')),
  Register: page(() => import('@/pages/auth/Register.jsx')),
  ForgotPassword: page(() => import('@/pages/auth/ForgotPassword.jsx')),
  ResetPassword: page(() => import('@/pages/auth/ResetPassword.jsx')),
  VerifyEmail: page(() => import('@/pages/auth/VerifyEmail.jsx')),
  UpdateEmail: page(() => import('@/pages/auth/UpdateEmail.jsx')),
  ChangePassword: page(() => import('@/pages/auth/ChangePassword.jsx')),
  OnboardingSurvey: page(() => import('@/pages/auth/OnboardingSurvey.jsx')),
  // learner
  Dashboard: page(() => import('@/pages/learner/Dashboard.jsx')),
  RoadmapJLPT: page(() => import('@/pages/learner/RoadmapJLPT.jsx')),
  RoadmapStageDetail: page(() => import('@/pages/learner/RoadmapStageDetail.jsx')),
  PlacementTest: page(() => import('@/pages/learner/PlacementTest.jsx')),
  PlacementExam: page(() => import('@/pages/learner/PlacementExam.jsx')),
  PlacementResult: page(() => import('@/pages/learner/PlacementResult.jsx')),
  ExamN3: page(() => import('@/pages/learner/ExamN3.jsx')),
  LessonList: page(() => import('@/pages/learner/LessonList.jsx')),
  LessonPlayer: page(() => import('@/pages/learner/LessonPlayer.jsx')),
  LessonPractice: page(() => import('@/pages/learner/LessonPractice.jsx')),
  SpeakingPracticePage: page(() => import('@/pages/learner/SpeakingPracticePage.jsx')),
  LearnerEssayPage: page(() => import('@/pages/learner/LearnerEssayPage.jsx')),
  SentenceStudio: page(() => import('@/pages/learner/SentenceStudio.jsx')),
  AIScoringResult: page(() => import('@/pages/learner/AIScoringResult.jsx')),
  KanjiWritingPracticePage: page(() => import('@/pages/learner/KanjiWritingPracticePage.jsx')),
  KanjiNotebook: page(() => import('@/pages/learner/KanjiNotebook.jsx')),
  VocabWordDetail: page(() => import('@/pages/learner/VocabWordDetail.jsx')),
  GrammarBank: page(() => import('@/pages/learner/GrammarBank.jsx')),
  DailySRS: page(() => import('@/pages/learner/DailySRS.jsx')),
  PracticeSetsPage: page(() => import('@/pages/learner/PracticeSetsPage.jsx')),
  MockTestPage: page(() => import('@/pages/learner/MockTestPage.jsx')),
  ExamResult: page(() => import('@/pages/learner/ExamResult.jsx')),
  AccountProfile: page(() => import('@/pages/shared/AccountProfile.jsx')),
  LearnerSettings: page(() => import('@/pages/learner/LearnerSettings.jsx')),
  StudyPlans: page(() => import('@/pages/learner/StudyPlans.jsx')),
  StudyPayment: page(() => import('@/pages/learner/StudyPayment.jsx')),
  StudyPaymentReceipt: page(() => import('@/pages/learner/StudyPaymentReceipt.jsx')),
  MentorDirectory: page(() => import('@/pages/learner/MentorDirectory.jsx')),
  HomeworkPage: page(() => import('@/pages/learner/HomeworkPage.jsx')),
  CohortDiscoveryPage: page(() => import('@/pages/learner/CohortDiscoveryPage.jsx')),
  LearnerMyCoursesPage: page(() => import('@/pages/learner/LearnerMyCoursesPage.jsx')),
  CohortWorkspacePage: page(() => import('@/pages/learner/CohortWorkspacePage.jsx')),
  LearnerCalendarPage: page(() => import('@/pages/learner/LearnerCalendarPage.jsx')),
  GroupLearningProgressPage: page(() => import('@/pages/learner/GroupLearningProgressPage.jsx')),
  StudyCoursesPage: page(() => import('@/pages/shared/StudyCoursesPage.jsx')),
  MentorClassWorkspace: page(() => import('@/pages/mentor/MentorClassWorkspace.jsx')),
  // mentor & shared meeting
  MentorPublicProfile: page(() => import('@/pages/learner/MentorPublicProfile.jsx')),
  ConsultationRoom: page(() => import('@/pages/shared/MeetingRoom.jsx')),
  ConsultantOverview: page(() => import('@/pages/mentor/ConsultantOverview.jsx')),
  MentorGrading: page(() => import('@/pages/mentor/MentorGrading.jsx')),
  MentorShiftSchedule: page(() => import('@/pages/mentor/MentorShiftSchedule.jsx')),
  MentorAvailability: page(() => import('@/pages/mentor/MentorAvailability.jsx')),
  WorkSchedule: page(() => import('@/pages/mentor/WorkSchedule.jsx')),
  MentorAttendanceKpi: page(() => import('@/pages/mentor/MentorAttendanceKpi.jsx')),
  MentorReviews: page(() => import('@/pages/mentor/MentorReviews.jsx')),
  MentorDisputes: page(() => import('@/pages/mentor/MentorDisputes.jsx')),
  MentorProfile: page(() => import('@/pages/mentor/MentorProfile.jsx')),
  // content author
  CMSStudio: page(() => import('@/pages/content-author/CMSStudio.jsx')),
  AuthorDashboard: page(() => import('@/pages/content-author/AuthorDashboard.jsx')),
  ExamBuilder: page(() => import('@/pages/content-author/ExamBuilder.jsx')),
  QuestionBank: page(() => import('@/pages/content-author/QuestionBank.jsx')),
  ContentLibrary: page(() => import('@/pages/content-author/ContentLibrary.jsx')),
  LessonCMS: page(() => import('@/pages/content-author/LessonCMS.jsx')),
  CmsLessonDetail: page(() => import('@/pages/content-author/CmsLessonDetail.jsx')),
  VocabularyEditor: page(() => import('@/pages/content-author/VocabularyEditor.jsx')),
  KanjiEditor: page(() => import('@/pages/content-author/KanjiEditor.jsx')),
  ContentPlanStudio: page(() => import('@/pages/content-author/ContentPlanStudio.jsx')),
  ManualContentPage: page(() => import('@/pages/content-author/ManualContentPage.jsx')),
  SrsTemplatesPage: page(() => import('@/pages/content-author/SrsTemplatesPage.jsx')),
  ContentImportPreviewPage: page(() => import('@/pages/content-author/ContentImportPreviewPage.jsx')),
  // admin
  AdminDashboard: page(() => import('@/pages/admin/AdminDashboard.jsx')),
  AdminUsers: page(() => import('@/pages/admin/AdminUsers.jsx')),
  AdminUserDetail: page(() => import('@/pages/admin/AdminUserDetail.jsx')),
  AdminContentReview: page(() => import('@/pages/admin/AdminContentReview.jsx')),
  AdminCertificateSections: page(() => import('@/pages/admin/AdminCertificateSections.jsx')),
  AdminStudyCatalog: page(() => import('@/pages/admin/AdminStudyCatalog.jsx')),
  AdminPlansWorkspace: page(() => import('@/pages/admin/AdminPlansWorkspace.jsx')),
  AdminPaymentsWorkspace: page(() => import('@/pages/admin/AdminPaymentsWorkspace.jsx')),
  AdminLearningPolicies: page(() => import('@/pages/admin/AdminLearningPolicies.jsx')),
  AdminGroupWorkspace: page(() => import('@/pages/admin/AdminGroupWorkspace.jsx')),
  AdminRetakeSupport: page(() => import('@/pages/admin/AdminRetakeSupport.jsx')),
  AdminScheduleRequests: page(() => import('@/pages/admin/AdminScheduleRequests.jsx')),
  AdminMentorReplacements: page(() => import('@/pages/admin/AdminMentorReplacements.jsx')),
  AdminCohortTransfers: page(() => import('@/pages/admin/AdminCohortTransfers.jsx')),
  AdminComplaints: page(() => import('@/pages/admin/AdminComplaints.jsx')),
  AdminMentorHub: page(() => import('@/pages/admin/AdminMentorHub.jsx')),
  AdminSlotReview: page(() => import('@/pages/admin/AdminSlotReview.jsx')),
  AdminMentorTemplate: page(() => import('@/pages/admin/AdminMentorTemplate.jsx')),
  AdminMentorQuality: page(() => import('@/pages/admin/AdminMentorQuality.jsx')),
  AdminMentorCases: page(() => import('@/pages/admin/AdminMentorCases.jsx')),
};

const PersistentContentImport = named(() => import('@/pages/content-author/ContentImportPreviewPage.jsx'), 'PersistentContentImport');

function withSlash(path) {
  if (!path || path === '/' || path === '*') return path;
  return path.endsWith('/') ? path : `${path}/`;
}

function NormalizePath() {
  const { pathname, search, hash } = useLocation();
  // Payment return routes strip their callback parameters before normalizing.
  if (search && ['/plans', '/payment/success', '/payment/cancel', '/study-payment-receipt', '/consultation-receipt'].includes(pathname)) return null;
  if (pathname.length > 1 && !pathname.endsWith('/')) {
    return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  }
  return null;
}

/** 401 from any API call → clear session, keep the return path, one toast (deduped). 403 never lands here. */
function SessionExpiryHandler() {
  const { expireSession, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onExpired = () => {
      if (!isAuthenticated) return;
      expireSession();
      queryClient.clear();
      notify.warning('Phiên đăng nhập đã hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', { key: 'session-expired' });
      navigate('/auth/', {
        replace: true,
        state: { from: { pathname: location.pathname, search: location.search }, notice: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [expireSession, isAuthenticated, navigate, location.pathname, location.search]);
  return null;
}

function PreviewSessionSync() {
  const { tr } = useLocale();
  const location = useLocation();
  const refreshSession = useContext(AuthContext)?.refreshSession;
  useEffect(() => {
    refreshSession?.();
  }, [location.search, refreshSession]);
  if (!isPreviewEnabled()) return null;
  return (
    <div role="status" className="pointer-events-none fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-rp-text px-3 py-1.5 text-[11px] font-semibold text-white shadow-rp-pop">
      {tr('Chế độ xem trước bằng dữ liệu mẫu · thêm ?preview=0 để tắt')}
    </div>
  );
}

function AuthorBackgroundTasks() {
  const { hasAnyRole, isAuthenticated } = useAuth();
  if (!isAuthenticated || !hasAnyRole(['ContentAuthor', 'Admin'])) return null;
  return (
    <Suspense fallback={null}>
      <PersistentContentImport />
    </Suspense>
  );
}

function NotFoundRoute() {
  const { isAuthenticated, primaryRole } = useAuth();
  return <NotFoundScreen homePath={isAuthenticated ? homeForRole(primaryRole) : '/'} />;
}

function renderRoute(route) {
  const Page = PAGES[route.page];
  let element = <Page {...(route.props || {})} />;
  if (route.study) element = <RequireStudyPlan feature={route.study === true ? undefined : route.study}>{element}</RequireStudyPlan>;
  if (route.roles) element = <ProtectedRoute allowedRoles={route.roles}>{element}</ProtectedRoute>;
  if (route.paymentReturn === 'plans') element = <PaymentReturn legacyPlans>{element}</PaymentReturn>;
  if (route.paymentReturn === 'receipt') element = <PaymentReturn>{element}</PaymentReturn>;
  return element;
}

function RoutePageLoader() {
  const { pathname } = useLocation();
  return <SakuraLoader variant="fullscreen" context={loadingContextForPath(pathname)} delay={160} />;
}

function RoutedApp() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RoutePageLoader />}>
        <Routes>
          {ROUTES.map((route) => (
            <Route key={route.path} path={withSlash(route.path)} element={renderRoute(route)} />
          ))}
          {REDIRECTS.map(([from, to]) => (
            <Route key={from} path={withSlash(from)} element={<Navigate to={to.includes('?') ? to : withSlash(to)} replace />} />
          ))}
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <FeedbackProvider>
          <div className="rikipath-shell min-h-screen bg-rp-bg">
            <NormalizePath />
            <SessionExpiryHandler />
            <PreviewSessionSync />
            <AuthorBackgroundTasks />
            <RoutedApp />
          </div>
        </FeedbackProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
