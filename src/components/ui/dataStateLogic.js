import { classifyApiErrorState, describeApiError } from '@/api/apiErrors.js';

export const DATA_VIEW_STATES = Object.freeze([
  'initial-loading',
  'success-with-data',
  'success-empty',
  'background-refresh',
  'unauthenticated',
  'forbidden',
  'network-error',
  'server-error',
  'business-conflict',
  'stale-data',
]);

const ERROR_STATES = new Set([
  'unauthenticated',
  'forbidden',
  'network-error',
  'server-error',
  'business-conflict',
]);

export function isErrorDataState(state) {
  return ERROR_STATES.has(state);
}

/**
 * Context-aware empty state copy keyed by domain.
 * Empty states must ONLY render when Backend confirms empty data, never on API errors.
 */
export const CONTEXT_EMPTY_COPY = Object.freeze({
  groupLearning: {
    illustration: 'classroom',
    title: 'Bạn chưa có lớp học nào.',
    description: 'Chọn Giáo viên, xem lịch 10 tuần và cường độ Nhẹ / Tiêu chuẩn / Nâng cao trước khi giữ chỗ.',
  },
  srs: {
    illustration: 'flashcard',
    title: 'Bạn đã hoàn thành lượt ôn tập hôm nay.',
    description: 'Lưu thêm từ vựng hoặc Hán tự vào sổ tay để hệ thống tự động lên lịch ôn tập.',
  },
  homework: {
    illustration: 'homework',
    title: 'Chưa có bài tập nào.',
    description: 'Bài tập do Giáo viên giao sẽ xuất hiện tại đây cùng hướng dẫn và hạn nộp.',
  },
  progress: {
    illustration: 'chart',
    title: 'Chưa có dữ liệu tiến độ.',
    description: 'Làm bài đánh giá năng lực hoặc hoàn thành bài học đầu tiên để bắt đầu theo dõi.',
  },
  subscription: {
    illustration: 'certificate',
    title: 'Bạn chưa đăng ký gói tự học.',
    description: 'Khám phá các gói tự học JLPT để mở khóa toàn bộ bài giảng và sổ tay cá nhân.',
  },
  mentorReviews: {
    illustration: 'review',
    title: 'Chưa có đánh giá lớp nhóm.',
    description: 'Nhận xét của học viên sau khi tham gia buổi học sẽ hiển thị tại đây.',
  },
  mentorSchedule: {
    illustration: 'calendar',
    title: 'Tuần này chưa có khung giờ dạy.',
    description: 'Đăng ký khung giờ rảnh hoặc kiểm tra các lớp nhóm được phân công.',
  },
  notifications: {
    illustration: 'bell',
    title: 'Chưa có thông báo.',
    description: 'Thông báo về lớp học, bài tập và lịch dạy sẽ xuất hiện tại đây.',
  },
  contentAuthor: {
    illustration: 'book',
    title: 'Bạn chưa gửi nội dung nào.',
    description: 'Soạn bài học thủ công hoặc nhập từ Excel, xem trước rồi gửi duyệt.',
  },
  adminQueue: {
    illustration: 'appointment',
    title: 'Không có yêu cầu nào cần xử lý.',
    description: 'Hàng đợi hiện đang trống theo bộ lọc đã chọn.',
  },
  data: {
    illustration: 'table',
    title: 'Chưa có dữ liệu.',
    description: 'Dữ liệu hiện chưa phát sinh ở mục này.',
  },
});

const CONTEXT_ILLUSTRATION_MAP = Object.freeze({
  groupLearning: 'classroom',
  cohort: 'classroom',
  cohorts: 'classroom',
  srs: 'flashcard',
  vocabulary: 'flashcard',
  notebook: 'flashcard',
  flashcard: 'flashcard',
  homework: 'homework',
  essay: 'homework',
  writing: 'homework',
  grading: 'homework',
  kanji: 'kanji',
  kana: 'kanji',
  lessons: 'book',
  lesson: 'book',
  book: 'book',
  contentAuthor: 'book',
  grammar: 'book',
  progress: 'chart',
  analytics: 'chart',
  kpi: 'chart',
  stats: 'chart',
  subscription: 'certificate',
  plans: 'certificate',
  certificate: 'certificate',
  exam: 'certificate',
  mockTest: 'certificate',
  policies: 'certificate',
  mentorReviews: 'review',
  reviews: 'review',
  mentorSchedule: 'calendar',
  calendar: 'calendar',
  schedule: 'calendar',
  adminQueue: 'appointment',
  transfers: 'appointment',
  appointment: 'appointment',
  scheduleRequests: 'appointment',
  notifications: 'bell',
  bell: 'bell',
  complaints: 'message',
  messages: 'message',
  chat: 'message',
  mentor: 'mentor',
  mentors: 'mentor',
  users: 'mentor',
  payments: 'clock',
  receipt: 'clock',
  audit: 'clock',
  history: 'clock',
  search: 'search',
  filter: 'search',
  import: 'table',
  questions: 'table',
  table: 'table',
  data: 'table',
});

export function resolveEmptyIllustration({ illustration, art, variant, context, title, description } = {}) {
  const explicit = illustration || art;
  if (explicit && explicit !== 'empty') return explicit;
  if (variant === 'search') return 'search';
  if (context && CONTEXT_ILLUSTRATION_MAP[context]) return CONTEXT_ILLUSTRATION_MAP[context];

  const text = `${title || ''} ${description || ''}`.toLowerCase();
  if (/khớp|bộ lọc|từ khóa|tìm kiếm|phù hợp|tìm thấy/.test(text)) return 'search';
  if (/thông báo/.test(text)) return 'bell';
  if (/bài tập|bài viết|soạn bài|chấm/.test(text)) return 'homework';
  if (/từ vựng|sổ tay|flashcard|ôn tập|highlight/.test(text)) return 'flashcard';
  if (/kanji|hán tự|kana|nét/.test(text)) return 'kanji';
  if (/đánh giá|nhận xét|sao/.test(text)) return 'review';
  if (/thống kê|tiến độ|kpi|kỹ năng|biểu đồ/.test(text)) return 'chart';
  if (/khiếu nại|tin nhắn|hỗ trợ|trò chuyện/.test(text)) return 'message';
  if (/chuyển lớp|dời\/hủy|đặt hẹn|yêu cầu/.test(text)) return 'appointment';
  if (/lịch|buổi học|buổi dạy|khung giờ/.test(text)) return 'calendar';
  if (/lớp|học viên|ghi danh/.test(text)) return 'classroom';
  if (/giáo viên|tài khoản|người dùng/.test(text)) return 'mentor';
  if (/gói|chứng chỉ|cấp độ|phần thi|chính sách|đề thi/.test(text)) return 'certificate';
  if (/lịch sử|giao dịch|biên lai|lưu vết|thay đổi cấu hình/.test(text)) return 'clock';
  if (/bài học|học liệu|ngữ pháp|sách/.test(text)) return 'book';
  return 'table';
}

export function getContextualEmptyCopy(context = 'data') {
  return CONTEXT_EMPTY_COPY[context] || CONTEXT_EMPTY_COPY.data;
}

/**
 * Classifies any TanStack Query / async snapshot into one of the 10 Smart UI Rendering states.
 * - Background refetch preserves valid existing data (`background-refresh`)
 * - Failed background refetch preserves valid existing data (`stale-data`)
 * - Disabled idle queries with no error/data resolve safely instead of spinning forever
 */
export function resolveDataState(
  query,
  {
    isAuthenticated = true,
    isEmpty,
    hasData: hasDataFn,
    disabledState = 'success-empty',
  } = {},
) {
  if (!isAuthenticated) return 'unauthenticated';
  if (!query) return 'initial-loading';

  const hasData = hasDataFn
    ? Boolean(hasDataFn(query.data))
    : query.data !== undefined && query.data !== null;

  if (hasData) {
    if (query.isFetching) return 'background-refresh';
    if (query.isError) return 'stale-data';
    const empty = typeof isEmpty === 'function' ? Boolean(isEmpty(query.data)) : Boolean(isEmpty);
    return empty ? 'success-empty' : 'success-with-data';
  }

  if (query.isError) {
    return classifyApiErrorState(query.error);
  }

  if (query.isLoading || (query.isPending && query.fetchStatus !== 'idle')) {
    return 'initial-loading';
  }

  return disabledState;
}

/**
 * Maps an error + data state to detailed UI presentation metadata (404 sub-kind preserved).
 */
export function resolveErrorPresentation(error) {
  const info = describeApiError(error);
  if (info.status === 404) {
    return { ...info, uiKind: 'notFound' };
  }
  const map = {
    'network-error': 'offline',
    unauthenticated: 'expired',
    forbidden: 'forbidden',
    'business-conflict': 'conflict',
    'server-error': 'error',
  };
  return { ...info, uiKind: map[info.state] || 'error' };
}

/**
 * Rendering policy for Optional Dashboard Widgets:
 * - Never exposes full error cards or correlationIds on Dashboard
 * - Never fakes empty/0 values when an API failed
 * - Allows clean hide or compact non-disruptive fallback on error
 * - Logs diagnostics whenever degraded/hidden on error
 *
 * @returns {{ mode: 'loading' | 'data' | 'refresh' | 'stale' | 'empty' | 'error-compact' | 'hidden', shouldRecordDiagnostic: boolean }}
 */
export function resolveOptionalWidgetPolicy(
  state,
  { emptyPolicy = 'cta', errorPolicy = 'hide' } = {},
) {
  if (state === 'initial-loading') {
    return { mode: 'loading', shouldRecordDiagnostic: false };
  }
  if (state === 'success-with-data') {
    return { mode: 'data', shouldRecordDiagnostic: false };
  }
  if (state === 'background-refresh') {
    return { mode: 'refresh', shouldRecordDiagnostic: false };
  }
  if (state === 'stale-data') {
    return { mode: 'stale', shouldRecordDiagnostic: true };
  }
  if (state === 'success-empty') {
    return {
      mode: emptyPolicy === 'hide' ? 'hidden' : 'empty',
      shouldRecordDiagnostic: false,
    };
  }
  if (isErrorDataState(state)) {
    return {
      mode: errorPolicy === 'compact' ? 'error-compact' : 'hidden',
      shouldRecordDiagnostic: true,
    };
  }
  return { mode: 'hidden', shouldRecordDiagnostic: false };
}
