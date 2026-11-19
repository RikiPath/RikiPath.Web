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
    title: 'Bạn chưa có lớp học nào.',
    description: 'Chọn Mentor, xem lịch 10 tuần và cường độ Nhẹ / Tiêu chuẩn / Nâng cao trước khi giữ chỗ.',
  },
  srs: {
    title: 'Bạn đã hoàn thành lượt ôn tập hôm nay.',
    description: 'Lưu thêm từ vựng hoặc Hán tự vào sổ tay để hệ thống tự động lên lịch ôn tập.',
  },
  homework: {
    title: 'Chưa có bài tập nào.',
    description: 'Bài tập do Mentor giao sẽ xuất hiện tại đây cùng hướng dẫn và hạn nộp.',
  },
  progress: {
    title: 'Chưa có dữ liệu tiến độ.',
    description: 'Làm bài đánh giá năng lực hoặc hoàn thành bài học đầu tiên để bắt đầu theo dõi.',
  },
  subscription: {
    title: 'Bạn chưa đăng ký gói tự học.',
    description: 'Khám phá các gói tự học JLPT để mở khóa toàn bộ bài giảng và sổ tay cá nhân.',
  },
  mentorReviews: {
    title: 'Chưa có đánh giá lớp nhóm.',
    description: 'Nhận xét của học viên sau khi tham gia buổi học sẽ hiển thị tại đây.',
  },
  mentorSchedule: {
    title: 'Tuần này chưa có khung giờ dạy.',
    description: 'Đăng ký khung giờ rảnh hoặc kiểm tra các lớp nhóm được phân công.',
  },
  notifications: {
    title: 'Chưa có thông báo.',
    description: 'Thông báo về lớp học, bài tập và lịch dạy sẽ xuất hiện tại đây.',
  },
  contentAuthor: {
    title: 'Bạn chưa gửi nội dung nào.',
    description: 'Soạn bài học thủ công hoặc nhập từ Excel, xem trước rồi gửi duyệt.',
  },
  adminQueue: {
    title: 'Không có yêu cầu nào cần xử lý.',
    description: 'Hàng đợi hiện đang trống theo bộ lọc đã chọn.',
  },
  data: {
    title: 'Chưa có dữ liệu.',
    description: 'Dữ liệu hiện chưa phát sinh ở mục này.',
  },
});

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
