import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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
} from './pages/learner';

// —— Tư vấn (Consultation) ——
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
} from './pages/admin';

export default function App() {
  return (
    <BrowserRouter>
      <div className="rikipath-shell min-h-screen bg-[#FAF7F5]">
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

          {/* ========== TƯ VẤN ========== */}
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/consultation-hub" element={<Navigate to="/consultation" replace />} />
          <Route path="/consultation-center" element={<ConsultationCenter />} />
          <Route path="/consultation-queue" element={<ConsultationQueue />} />
          <Route path="/booking-schedule" element={<BookingSchedule />} />
          <Route path="/consultation-payment" element={<ConsultationPayment />} />
          <Route path="/consultant-overview" element={<ConsultantOverview />} />
          <Route path="/consultation-prep" element={<ConsultationPrep />} />
          <Route path="/consultation-request" element={<ConsultationRequestDetail />} />
          <Route path="/work-schedule" element={<WorkSchedule />} />
          <Route path="/consultation-reply" element={<TextConsultationReply />} />
          <Route path="/sensei-profile" element={<SenseiProfile />} />
          <Route path="/consultation-session" element={<ConsultationSessionDetail />} />
          <Route path="/consultation-receipt" element={<ConsultationReceipt />} />
          <Route path="/consultation-room" element={<ConsultationRoom />} />

          {/* ========== CMS ========== */}
          <Route path="/cms-studio" element={<CMSStudio />} />
          <Route path="/author-dashboard" element={<AuthorDashboard />} />
          <Route path="/exam-builder" element={<ExamBuilder />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/content-library" element={<ContentLibrary />} />
          <Route path="/lesson-cms" element={<LessonCMS />} />
          <Route path="/bulk-import" element={<BulkImport />} />
          <Route path="/vocabulary-editor" element={<VocabularyEditor />} />
          <Route path="/kanji-editor" element={<KanjiEditor />} />
          <Route path="/video-editor" element={<VideoLessonEditor />} />
          <Route path="/lesson-cms-detail" element={<CmsLessonDetail />} />

          {/* ========== ADMIN ========== */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/detail" element={<AdminUserDetail />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/content-review" element={<AdminContentReview />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
