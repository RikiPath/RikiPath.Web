import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PreviewNav from './components/PreviewNav.jsx';

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
  KanjiWritingPracticePage
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="rikipath-shell min-h-screen bg-[#FAF7F5]">
          <PreviewNav />
          <Routes>
            {/* ========== MARKETING ========== */}
            <Route path="/" element={<HomeLanding />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/courses" element={<CourseCatalog />} />
            <Route path="/course-detail" element={<CourseDetail />} />
            <Route path="/feature/:slug" element={<FeatureDetail />} />

            {/* ========== AUTH ========== */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/update-email" element={<UpdateEmail />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/onboarding" element={<OnboardingSurvey />} />

            {/* ========== LEARNER ========== */}
            <Route path="/app" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/home-learner" element={<Navigate to="/app" replace />} />
            <Route path="/multi-dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/kanji-writing" element={<KanjiWritingPracticePage />} />
            <Route path="/lessons" element={<LessonList />} />
            <Route path="/lesson-player" element={<LessonPlayer />} />
            <Route path="/lesson-complete" element={<LessonComplete />} />
            <Route path="/roadmap" element={<RoadmapJLPT />} />
            <Route path="/sentence-studio" element={<SentenceStudio />} />
            <Route path="/kanji-studio" element={<KanjiStudio />} />
            <Route path="/kanji-notebook" element={<KanjiNotebook />} />
            <Route path="/vocabulary" element={<VocabularyNotebook />} />
            <Route path="/daily-srs" element={<DailySRS />} />
            <Route path="/ai-counselor" element={<AICounselor />} />
            <Route path="/ai-scoring" element={<AIScoringResult />} />
            <Route path="/exam-n3" element={<ExamN3 />} />
            <Route path="/exam-result" element={<ExamResult />} />
            <Route path="/vocabulary-detail" element={<VocabWordDetail />} />
            <Route path="/settings" element={<LearnerSettings />} />

            {/* ========== MENTOR ========== */}
            <Route path="/mentor" element={<Consultation />} />
            <Route path="/consultation" element={<Navigate to="/mentor" replace />} />
            <Route path="/consultation-hub" element={<Navigate to="/mentor" replace />} />
            <Route path="/consultation-center" element={<ConsultationCenter />} />
            <Route path="/booking-schedule" element={<BookingSchedule />} />
            <Route path="/consultation-payment" element={<ConsultationPayment />} />
            <Route path="/sensei-profile" element={<SenseiProfile />} />
            <Route path="/consultation-session" element={<ConsultationSessionDetail />} />
            <Route path="/consultation-receipt" element={<ConsultationReceipt />} />
            <Route path="/consultation-room" element={<ConsultationRoom />} />
            <Route path="/consultation-room/:roomId" element={<ConsultationRoom />} />
            <Route path="/meeting-room" element={<ConsultationRoom />} />
            <Route path="/meeting-room/:roomId" element={<ConsultationRoom />} />

            {/* MENTOR PORTAL (Mentor & Giảng viên) */}
            <Route path="/mentor-overview" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultantOverview /></ProtectedRoute>} />
            <Route path="/consultant-overview" element={<Navigate to="/mentor-overview" replace />} />
            <Route path="/consultation-queue" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationQueue /></ProtectedRoute>} />
            <Route path="/consultation-prep" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationPrep /></ProtectedRoute>} />
            <Route path="/consultation-request" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><ConsultationRequestDetail /></ProtectedRoute>} />
            <Route path="/work-schedule" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><WorkSchedule /></ProtectedRoute>} />
            <Route path="/consultation-reply" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><TextConsultationReply /></ProtectedRoute>} />
            <Route path="/mentor-availability" element={<ProtectedRoute allowedRoles={['Mentor', 'Consultant', 'Admin']}><MentorAvailability /></ProtectedRoute>} />

            {/* ========== CMS STUDIO (Tác giả nội dung & Admin) ========== */}
            <Route path="/cms-studio" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><CMSStudio /></ProtectedRoute>} />
            <Route path="/author-dashboard" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><AuthorDashboard /></ProtectedRoute>} />
            <Route path="/exam-builder" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><ExamBuilder /></ProtectedRoute>} />
            <Route path="/question-bank" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><QuestionBank /></ProtectedRoute>} />
            <Route path="/content-library" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><ContentLibrary /></ProtectedRoute>} />
            <Route path="/lesson-cms" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><LessonCMS /></ProtectedRoute>} />
            <Route path="/bulk-import" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><BulkImport /></ProtectedRoute>} />
            <Route path="/vocabulary-editor" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><VocabularyEditor /></ProtectedRoute>} />
            <Route path="/kanji-editor" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><KanjiEditor /></ProtectedRoute>} />
            <Route path="/video-editor" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><VideoLessonEditor /></ProtectedRoute>} />
            <Route path="/lesson-cms-detail" element={<ProtectedRoute allowedRoles={['ContentAuthor', 'Admin']}><CmsLessonDetail /></ProtectedRoute>} />

            {/* ========== ADMIN (Quản trị hệ thống) ========== */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminOverview /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/users/detail" element={<ProtectedRoute requireAdmin><AdminUserDetail /></ProtectedRoute>} />
            <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><AdminRoles /></ProtectedRoute>} />
            <Route path="/admin/content-review" element={<ProtectedRoute requireAdmin><AdminContentReview /></ProtectedRoute>} />
            <Route path="/admin/consultants" element={<ProtectedRoute requireAdmin><AdminConsultants /></ProtectedRoute>} />
            <Route path="/admin/mentors" element={<ProtectedRoute requireAdmin><AdminConsultants /></ProtectedRoute>} />
            <Route path="/admin/packages" element={<ProtectedRoute requireAdmin><AdminOperations /></ProtectedRoute>} />
            <Route path="/admin/operations" element={<ProtectedRoute requireAdmin><AdminOperations /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

