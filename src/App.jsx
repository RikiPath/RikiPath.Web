import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PreviewNav from './components/PreviewNav.jsx';

// —— Marketing ——
import { HomeLanding, CourseCatalog, CourseDetail } from './pages/marketing';

// —— Auth ——
import { Auth, Register, ForgotPassword, OnboardingSurvey } from './pages/auth';

// —— Learner ——
import {
  Dashboard,
  HomeLearner,
  MultiColumnDashboard,
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
} from './pages/learner';

// —— Tư vấn (Consultation) ——
import {
  Consultation,
  ConsultationHub,
  ConsultationCenter,
  ConsultationQueue,
  BookingSchedule,
  ConsultationPayment,
  ConsultantOverview,
  ConsultationPrep,
  ConsultationRequestDetail,
  WorkSchedule,
  TextConsultationReply,
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
} from './pages/cms';

// —— Admin ——
import {
  AdminOverview,
  AdminUsers,
  AdminRoles,
  AdminContentReview,
} from './pages/admin';

export default function App() {
  return (
    <BrowserRouter>
      <div className="rikipath-shell min-h-screen bg-[#FAF7F5]">
        <PreviewNav />
        <Routes>
          {/* ========== MARKETING ========== */}
          <Route path="/" element={<HomeLanding />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/course-detail" element={<CourseDetail />} />

          {/* ========== AUTH ========== */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<OnboardingSurvey />} />

          {/* ========== LEARNER ========== */}
          <Route path="/app" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/home-learner" element={<HomeLearner />} />
          <Route path="/multi-dashboard" element={<MultiColumnDashboard />} />
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

          {/* ========== TƯ VẤN ========== */}
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/consultation-hub" element={<ConsultationHub />} />
          <Route path="/consultation-center" element={<ConsultationCenter />} />
          <Route path="/consultation-queue" element={<ConsultationQueue />} />
          <Route path="/booking-schedule" element={<BookingSchedule />} />
          <Route path="/consultation-payment" element={<ConsultationPayment />} />
          <Route path="/consultant-overview" element={<ConsultantOverview />} />
          <Route path="/consultation-prep" element={<ConsultationPrep />} />
          <Route path="/consultation-request" element={<ConsultationRequestDetail />} />
          <Route path="/work-schedule" element={<WorkSchedule />} />
          <Route path="/consultation-reply" element={<TextConsultationReply />} />

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

          {/* ========== ADMIN ========== */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/content-review" element={<AdminContentReview />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
