/**
 * Pure context-aware messaging and query state classification helpers
 * for RikiPath's Global Sakura Loading System.
 */

export const DEFAULT_LOADING_DELAY_MS = 180;

export const LOADING_CONTEXTS = Object.freeze({
  page: 'Đang tải trang',
  route: 'Đang tải trang',
  dashboard: 'Đang tải bảng học tập',
  data: 'Đang tải dữ liệu',
  api: 'Đang tải dữ liệu',
  roadmap: 'Đang chuẩn bị lộ trình',
  lesson: 'Đang tải bài học',
  vocabulary: 'Đang tải từ vựng',
  grammar: 'Đang tải ngữ pháp',
  kanji: 'Đang chuẩn bị bài luyện viết',
  writing: 'Đang chuẩn bị bài luyện viết',
  srs: 'Đang chuẩn bị thẻ ôn tập',
  mock: 'Đang chuẩn bị đề thi',
  mockTest: 'Đang chuẩn bị đề thi',
  mocktest: 'Đang chuẩn bị đề thi',
  assessment: 'Đang chuẩn bị bài đánh giá',
  cohort: 'Đang tải lớp học',
  groupLearning: 'Đang tải lớp học',
  meeting: 'Đang kết nối phòng học',
  homework: 'Đang tải bài tập',
  calendar: 'Đang tải lịch học',
  schedule: 'Đang tải lịch học',
  profile: 'Đang tải hồ sơ',
  auth: 'Đang xác thực tài khoản',
  payment: 'Đang kiểm tra trạng thái thanh toán',
  grading: 'Đang xử lý bài làm',
  ai: 'Đang xử lý bài làm',
});

export function resolveLoadingLabel({ label, context = 'data', tr } = {}) {
  const raw = (typeof label === 'string' && label.trim())
    ? label.trim()
    : (LOADING_CONTEXTS[context] || LOADING_CONTEXTS.data);
  return typeof tr === 'function' ? tr(raw) : raw;
}

const PATH_CONTEXT_RULES = [
  [/^\/(app|dashboard|admin\/dashboard|mentor-overview|author-dashboard|cms-studio)(\/|$)/, 'dashboard'],
  [/^\/roadmap(\/|$)/, 'roadmap'],
  [/^\/(lessons|lesson-player|riki\/(listening|reading)|lesson-cms|content-manual|bulk-import|content-studio)(\/|$)/, 'lesson'],
  [/^\/(vocabulary|vocabulary-detail|vocabulary-editor)(\/|$)/, 'vocabulary'],
  [/^\/(grammar|content-library)(\/|$)/, 'grammar'],
  [/^\/(kanji-writing|kanji-notebook|kanji-editor)(\/|$)/, 'writing'],
  [/^\/daily-srs(\/|$)/, 'srs'],
  [/^\/(mock-tests|exam-result|placement|app\/placement-test|placement-test|exam-builder|question-bank)(\/|$)/, 'mock'],
  [/^\/(mentors|my-courses|mentor-study-courses|admin\/study-courses|meeting-room|consultation-room)(\/|$)/, 'cohort'],
  [/^\/(homework|mentor-homework|admin\/mentor-homework|lesson-practice)(\/|$)/, 'homework'],
  [/^\/(work-schedule|mentor-shift-schedule|mentor-availability|admin\/mentor-schedules|admin\/slot-review|admin\/mentor-template)(\/|$)/, 'calendar'],
  [/^\/(settings|mentor-profile|admin\/users|admin\/mentors|admin\/consultants|admin\/mentor-verifications|admin\/mentor-qualifications)(\/|$)/, 'profile'],
  [/^\/(plans|study-payment|payment\/|study-payment-receipt)(\/|$)/, 'payment'],
  [/^\/(riki\/essay|speech|riki\/speaking|sentence-studio|ai-scoring|mentor-grading)(\/|$)/, 'grading'],
];

export function loadingContextForPath(pathname = '/') {
  const clean = String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  for (const [pattern, ctx] of PATH_CONTEXT_RULES) {
    if (pattern.test(`${clean}/`)) return ctx;
  }
  return 'page';
}

/**
 * Classifies a query-like state without collapsing background refetches into
 * full loading replacements or returning empty/zero states prematurely.
 * @returns {'loading' | 'refreshing' | 'error' | 'empty' | 'success'}
 */
export function queryViewState(query, { isEmpty } = {}) {
  if (!query) return 'loading';
  const hasData = query.data !== undefined && query.data !== null;
  if (query.isPending || (query.isLoading && !hasData)) return 'loading';
  if (query.isError && !hasData) return 'error';
  if (hasData) {
    if (isEmpty?.(query.data)) return query.isFetching ? 'refreshing' : 'empty';
    return query.isFetching ? 'refreshing' : 'success';
  }
  return query.isError ? 'error' : 'empty';
}
