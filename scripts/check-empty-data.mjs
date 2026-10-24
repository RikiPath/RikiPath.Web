import fs from 'node:fs';
import { createServer } from 'vite';
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.sessionStorage = storage;
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');
  const { AuthProvider } = await server.ssrLoadModule('/src/auth/AuthContext.jsx');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const groups = {
    cms: ['AuthorDashboard','CmsLessonDetail','CMSStudio','ContentLibrary','ExamBuilder','KanjiEditor','LessonCMS','QuestionBank','VideoLessonEditor','VocabularyEditor','BulkImport'],
    consultation: ['ConsultantOverview','ConsultationPrep','SenseiProfile','TextConsultationReply','WorkSchedule','Consultation','ConsultationHub','MentorAvailability'],
    learner: ['AICounselor','AIScoringResult','ExamN3','ExamResult','HomeLearner','KanjiNotebook','LessonComplete','LessonList','LessonPlayer','MultiColumnDashboard','RoadmapJLPT','SentenceStudio','VocabularyNotebook','VocabWordDetail','KanjiStudio'],
    marketing: ['HomeLanding','CourseDetail','FeatureDetail'],
    admin: ['AdminConsultants'],
  };
  let count = 0;
  for (const [group, pages] of Object.entries(groups)) for (const page of pages) {
    const file = `/src/pages/${group}/${page}.jsx`;
    const { default: Component } = await server.ssrLoadModule(file);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [page === 'FeatureDetail' ? '/feature/shadowing' : '/'] }, React.createElement(QueryClientProvider, { client }, React.createElement(AuthProvider, {}, React.createElement(Routes, {}, React.createElement(Route, { path: page === 'FeatureDetail' ? '/feature/:slug' : '*', element: React.createElement(Component) }))))));
    if (!html) throw new Error(`${page}: rendered empty`);
    if (/Sensei Sato|Sensei Aoi|Minh Anh|Nguyễn Văn A|Trần Thị B|599\.000|RP-PAY-88421/.test(html)) throw new Error(`${page}: demo data remains`);
    client.clear();
    count++;
  }
  if (fs.existsSync('src/mocks/preview.js')) throw new Error('Fake preview data still exists');
  const session = await server.ssrLoadModule('/src/auth/session.js');
  globalThis.localStorage = { ...storage, getItem: () => JSON.stringify({ accessToken: 'preview-learner', isPreview: true }) };
  if (session.getSession() !== null) throw new Error('Legacy preview session must be rejected');
  console.log(`PASS: ${count} screens render without sample identities; legacy fake auth rejected.`);
} finally {
  await server.close();
}

