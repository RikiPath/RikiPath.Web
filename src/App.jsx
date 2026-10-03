import { useContext, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { isPreviewEnabled } from './mocks/preview.js';
// —— Marketing ——
import { HomeLanding, CourseCatalog, CourseDetail, FeatureDetail } from './pages/marketing';

// —— Auth ——
import { Auth, Register, ForgotPassword, OnboardingSurvey, VerifyEmail, UpdateEmail, ChangePassword } from './pages/auth';

// —— Learner ——
import {
  Dashboard,
  LessonList,
  LessonPlayer,
  LessonComplete,
  RoadmapJLPT,
  SentenceStudio,
  KanjiStudio,
  KanjiNotebook,
  VocabularyNotebook,
  DailySRS,
  AICounselor,
  AIScoringResult,
  ExamN3,
  VocabWordDetail,
  ExamResult,
  LearnerSettings,
  KanjiWritingPracticePage,
  RikiSkillPlaceholder
} from './pages/learner';

// —— Tư vấn (Mentor) ——
import {
  Consultation,
  ConsultationCenter,
  ConsultationQueue,
  BookingSchedule,
  ConsultationPayment,
  ConsultantOverview,
  ConsultationPrep,
  ConsultationRequestDetail,
  WorkSchedule,
  TextConsultationReply,
  SenseiProfile,
  ConsultationSessionDetail,
  ConsultationReceipt,
  ConsultationRoom,
  MentorAvailability,
} from './pages/consultation';

// —— CMS ——
import {
  CMSStudio,
  AuthorDashboard,
  ExamBuilder,
  QuestionBank,
  ContentLibrary,
  LessonCMS,
  BulkImport,
  VocabularyEditor,
  KanjiEditor,
  VideoLessonEditor,
  CmsLessonDetail,
} from './pages/cms';

// —— Admin ——
import {
  AdminOverview,
  AdminUsers,
  AdminRoles,
  AdminContentReview,
  AdminUserDetail,
  AdminConsultants,
  AdminOperations,
} from './pages/admin';

function withSlash(path) {
  if (!path || path === '/' || path === '*') return path;
  return path.endsWith('/') ? path : `${path}/`;
}

function NormalizePath() {
  const { pathname, search, hash } = useLocation();
  if (pathname.length > 1 && !pathname.endsWith('/')) {
    return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  }
  return null;
}

function PreviewSessionSync() {
  const location = useLocation();
  const auth = useContext(AuthContext);
  useEffect(() => {
    auth?.refreshSession?.();
  }, [location.search, auth]);
  if (!isPreviewEnabled()) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#2D282A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
      Đang xem bằng mock data · thêm ?preview=0 để tắt
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="rikipath-shell min-h-screen bg-[#FAF7F5]">
          <NormalizePath />
          <PreviewSessionSync />
          <Routes>
            {/* ========== MARKETING ========== */}
            <Route path="/" element={<HomeLanding />} />
            <Route path={withSlash('/landing')} element={<Navigate to="/" replace />} />
            <Route path={withSlash('/courses')} element={<CourseCatalog />} />
            <Route path={withSlash('/course-detail')} element={<CourseDetail />} />
            <Route path={withSlash('/feature/:slug')} element={<FeatureDetail />} />

            {/* ========== AUTH ========== */}
            <Route path={withSlash('/auth')} element={<Auth />} />
            <Route path={withSlash('/register')} element={<Register />} />
            <Route path={withSlash('/forgot-password')} element={<ForgotPassword />} />
            <Route path={withSlash('/verify-email')} element={<VerifyEmail />} />
            <Route path={withSlash('/update-email')} element={<UpdateEmail />} />
            <Route path={withSlash('/change-password')} element={<ChangePassword />} />
            <Route path={withSlash('/onboarding')} element={<OnboardingSurvey />} />

            {/* ========== LEARNER ========== */}
            <Route path={withSlash('/app')} element={<Dashboard />} />
            <Route path={withSlash('/dashboard')} element={<Navigate to={withSlash('/app')} replace />} />
            <Route path={withSlash('/home-learner')} element={<Navigate to={withSlash('/app')} replace />} />
            <Route path={withSlash('/multi-dashboard')} element={<Navigate to={withSlash('/app')} replace />} />
            <Route path={withSlash('/kanji-writing')} element={<KanjiWritingPracticePage />} />
            <Route path={withSlash('/riki/listening')} element={<RikiSkillPlaceholder skill="listening" />} />
            <Route path={withSlash('/riki/speaking')} element={<RikiSkillPlaceholder skill="speaking" />} />
            <Route path={withSlash('/riki/reading')} element={<RikiSkillPlaceholder skill="reading" />} />
            <Route path={withSlash('/riki/essay')} element={<RikiSkillPlaceholder skill="essay" />} />
            <Route path={withSlash('/lessons')} element={<LessonList />} />
            <Route path={withSlash('/lesson-player')} element={<LessonPlayer />} />
            <Route path={withSlash('/lesson-complete')} element={<LessonComplete />} />
            <Route path={withSlash('/roadmap')} element={<RoadmapJLPT />} />
            <Route path={withSlash('/sentence-studio')} element={<SentenceStudio />} />
            <Route path={withSlash('/kanji-studio')} element={<KanjiStudio />} />
            <Route path={withSlash('/kanji-notebook')} element={<KanjiNotebook />} />
            <Route path={withSlash('/vocabulary')} element={<VocabularyNotebook />} />
            <Route path={withSlash('/daily-srs')} element={<DailySRS />} />
            <Route path={withSlash('/ai-counselor')} element={<AICounselor />} />
            <Route path={withSlash('/ai-scoring')} element={<AIScoringResult />} />
            <Route path={withSlash('/exam-n3')} element={<ExamN3 />} />
            <Route path={withSlash('/exam-result')} element={<ExamResult />} />
            <Route path={withSlash('/vocabulary-detail')} element={<VocabWordDetail />} />
            <Route path={withSlash('/settings')} element={<LearnerSettings />} />

            {/* ========== MENTOR ========== */}
            <Route path={withSlash('/mentor')} element={<Consultation />} />
            <Route path={withSlash('/consultation')} element={<Navigate to={withSlash('/mentor')} replace />} />
            <Route path={withSlash('/consultation-hub')} element={<Navigate to={withSlash('/mentor')} replace />} />
            <Route path={withSlash('/consultation-center')} element={<ConsultationCenter />} />
            <Route path={withSlash('/booking-schedule')} element={<BookingSchedule />} />
            <Route path={withSlash('/consultation-payment')} element={<ConsultationPayment />} />
            <Route path={withSlash('/sensei-profile')} element={<SenseiProfile />} />
            <Route path={withSlash('/consultation-session')} element={<ConsultationSessionDetail />} />
            <Route path={withSlash('/consultation-receipt')} element={<ConsultationReceipt />} />
            <Route path={withSlash('/consultation-room')} element={<ConsultationRoom />} />
            <Route path={withSlash('/consultation-room/:roomId')} element={<ConsultationRoom />} />
            <Route path={withSlash('/meeting-room')} element={<ConsultationRoom />} />
            <Route path={withSlash('/meeting-room/:roomId')} element={<ConsultationRoom />} />

            {/* MENTOR PORTAL (Mentor & Giảng viên) */}
            <Route path={withSlash('/mentor-overview')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultantOverview /></ProtectedRoute>} />
            <Route path={withSlash('/consultant-overview')} element={<Navigate to={withSlash('/mentor-overview')} replace />} />
            <Route path={withSlash('/consultation-queue')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationQueue /></ProtectedRoute>} />
            <Route path={withSlash('/consultation-prep')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationPrep /></ProtectedRoute>} />
            <Route path={withSlash('/consultation-request')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationRequestDetail /></ProtectedRoute>} />
            <Route path={withSlash('/work-schedule')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><WorkSchedule /></ProtectedRoute>} />
            <Route path={withSlash('/consultation-reply')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><TextConsultationReply /></ProtectedRoute>} />
            <Route path={withSlash('/mentor-availability')} element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><MentorAvailability /></ProtectedRoute>} />

            {/* ========== CMS STUDIO (Tác giả nội dung & Admin) ========== */}
            <Route path={withSlash('/cms-studio')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><CMSStudio /></ProtectedRoute>} />
            <Route path={withSlash('/author-dashboard')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><AuthorDashboard /></ProtectedRoute>} />
            <Route path={withSlash('/exam-builder')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><ExamBuilder /></ProtectedRoute>} />
            <Route path={withSlash('/question-bank')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><QuestionBank /></ProtectedRoute>} />
            <Route path={withSlash('/content-library')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><ContentLibrary /></ProtectedRoute>} />
            <Route path={withSlash('/lesson-cms')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><LessonCMS /></ProtectedRoute>} />
            <Route path={withSlash('/bulk-import')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><BulkImport /></ProtectedRoute>} />
            <Route path={withSlash('/vocabulary-editor')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><VocabularyEditor /></ProtectedRoute>} />
            <Route path={withSlash('/kanji-editor')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><KanjiEditor /></ProtectedRoute>} />
            <Route path={withSlash('/video-editor')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><VideoLessonEditor /></ProtectedRoute>} />
            <Route path={withSlash('/lesson-cms-detail')} element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><CmsLessonDetail /></ProtectedRoute>} />

            {/* ========== ADMIN (Quản trị hệ thống) ========== */}
            <Route path={withSlash('/admin')} element={<ProtectedRoute requireAdmin><AdminOverview /></ProtectedRoute>} />
            <Route path={withSlash('/admin/users')} element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path={withSlash('/admin/users/detail')} element={<ProtectedRoute requireAdmin><AdminUserDetail /></ProtectedRoute>} />
            <Route path={withSlash('/admin/roles')} element={<ProtectedRoute requireAdmin><AdminRoles /></ProtectedRoute>} />
            <Route path={withSlash('/admin/content-review')} element={<ProtectedRoute requireAdmin><AdminContentReview /></ProtectedRoute>} />
            <Route path={withSlash('/admin/consultants')} element={<ProtectedRoute requireAdmin><AdminConsultants /></ProtectedRoute>} />
            <Route path={withSlash('/admin/mentors')} element={<ProtectedRoute requireAdmin><AdminConsultants /></ProtectedRoute>} />
            <Route path={withSlash('/admin/packages')} element={<ProtectedRoute requireAdmin><AdminOperations /></ProtectedRoute>} />
            <Route path={withSlash('/admin/operations')} element={<ProtectedRoute requireAdmin><AdminOperations /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
