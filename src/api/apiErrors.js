// Ánh xạ lỗi API tập trung: errorCode → thông điệp tiếng Việt thân thiện.
// Không bao giờ hiển thị stack trace / thông điệp kỹ thuật của máy chủ cho người dùng.

export const NETWORK_MESSAGE = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
export const GENERIC_MESSAGE = 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
export const INTERNAL_MESSAGE = 'Hệ thống gặp sự cố. Vui lòng thử lại sau.';
export const AUTH_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
export const FORBIDDEN_MESSAGE = 'Bạn không có quyền truy cập nội dung hoặc thực hiện thao tác này.';

export const ERROR_MESSAGES = Object.freeze({
  // Lịch dạy của Mentor / lịch lớp
  HOMEWORK_AI_DRAFT_UNAVAILABLE: 'AI chưa tạo được gợi ý chấm. Bạn vẫn có thể chấm trực tiếp.',
  HOMEWORK_SUBMISSION_CHANGED: 'Học viên vừa cập nhật bài nộp. Vui lòng tải lại trước khi chấm.',
  MENTOR_SCHEDULE_CONFLICT: 'Khung giờ này trùng với lịch dạy đã có. Vui lòng chọn khung giờ khác.',
  MENTOR_REST_INTERVAL_VIOLATION: 'Khung giờ không đảm bảo thời gian nghỉ tối thiểu giữa hai buổi dạy. Vui lòng chọn khung giờ khác.',
  MENTOR_DAILY_LIMIT_EXCEEDED: 'Vượt quá số buổi dạy tối đa trong một ngày theo chính sách. Vui lòng chọn ngày khác.',
  MENTOR_WEEKLY_LIMIT_EXCEEDED: 'Vượt quá số buổi dạy tối đa trong một tuần theo chính sách. Vui lòng chọn tuần khác.',
  COHORT_SESSION_DUPLICATE: 'Lịch lớp có các buổi trùng thời gian. Vui lòng kiểm tra lại khung giờ đã chọn.',
  COHORT_SCHEDULE_REVISION_CONFLICT: 'Lịch lớp vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.',
  COHORT_SCHEDULE_ALREADY_PUBLISHED: 'Lịch lớp đã được công bố nên không thể sửa trực tiếp. Vui lòng gửi yêu cầu dời/hủy lớp.',
  COHORT_SCHEDULE_INCOMPLETE: 'Lịch lớp chưa đủ số buổi theo gói học. Vui lòng chọn thêm khung giờ.',
  // Gói học
  COURSE_PLAN_INVALID_CAPACITY: 'Sĩ số lớp không hợp lệ theo chính sách lớp nhóm hiện hành.',
  COURSE_PLAN_INVALID_INTENSITY: 'Cường độ học không hợp lệ. Vui lòng chọn số buổi/tuần được chính sách cho phép.',
  COURSE_PLAN_INVALID_DURATION: 'Thời lượng khóa học không hợp lệ theo chính sách (số tuần, tổng số buổi hoặc phút/buổi).',
  // Ghi danh & thanh toán
  COHORT_FULL: 'Lớp đã đủ 4 học viên. Vui lòng chọn lớp khác.',
  COHORT_ENROLLMENT_CLOSED: 'Lớp đã đóng ghi danh. Vui lòng chọn lớp khác.',
  COHORT_ALREADY_ENROLLED: 'Bạn đã ghi danh lớp này. Vui lòng xem mục "Lớp đang học của tôi".',
  COHORT_SCHEDULE_CONFLICT: 'Lịch lớp này trùng với lịch học khác của bạn. Vui lòng chọn lớp khác.',
  PAYMENT_GATEWAY_INVALID_LINK: 'Không tạo được liên kết thanh toán hợp lệ. Vui lòng thử lại sau ít phút.',
  COHORT_CANCELLATION_NOT_ALLOWED: 'Khóa học đã bắt đầu nên không thể tự hủy ghi danh. Bạn có thể gửi khiếu nại nếu cần hỗ trợ.',
  TRANSFER_SOURCE_STARTED: 'Không thể chuyển lớp sau khi khóa học đã bắt đầu.',
  // Yêu cầu dời/hủy lớp
  COHORT_SCHEDULE_REQUEST_PENDING: 'Lớp đang có một yêu cầu dời/hủy chờ duyệt. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.',
  COHORT_HAS_CONFIRMED_LEARNERS: 'Lớp đã có học viên ghi danh thành công nên không thể hủy.',
  COHORT_PAYMENT_PENDING: 'Lớp đang có giao dịch thanh toán chờ xác minh. Vui lòng thử lại sau.',
  COHORT_PAYMENT_REVIEW_OPEN: 'Lớp đang có giao dịch cần Admin xem xét. Vui lòng xử lý giao dịch đó trước.',
  COHORT_ALREADY_STARTED: 'Lớp đã khai giảng nên không thể dời hoặc hủy.',
  COHORT_SCHEDULE_REQUEST_REASON_REQUIRED: 'Vui lòng nhập lý do cho yêu cầu.',
  // Đánh giá Mentor
  COHORT_REVIEW_NOT_ELIGIBLE: 'Bạn chỉ có thể đánh giá Mentor đã trực tiếp dạy bạn trong khóa học này.',
  COHORT_REVIEW_DUPLICATE: 'Bạn đã đánh giá Mentor này cho khóa học. Bạn có thể chỉnh sửa đánh giá đã gửi.',
  // Gói tự học & lượt AI
  SELF_STUDY_PACKAGE_REQUIRED: 'Tính năng này yêu cầu Gói tự học đang hiệu lực. Vào mục Gói tự học để kích hoạt.',
  WRITING_PACKAGE_REQUIRED: 'Nhận dạng chữ viết tay từ ảnh yêu cầu Gói tự học hoặc Gói luyện viết.',
  SPEAKING_PACKAGE_REQUIRED: 'Chấm điểm luyện nói AI yêu cầu Gói tự học hoặc Gói luyện nói.',
  AI_CREDIT_REQUIRED: 'Bạn chưa có lượt chấm AI cho kỹ năng này. Vào mục Gói tự học để mua thêm lượt.',
  // Hệ thống
  INTERNAL_ERROR: INTERNAL_MESSAGE,
  CONCURRENCY_CONFLICT: 'Dữ liệu vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.',
  DUPLICATE_REQUEST: 'Yêu cầu này đã được gửi trước đó. Vui lòng kiểm tra lại trạng thái.',
  UPSTREAM_TIMEOUT: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút.',
});

export const PAYMENT_STATE_MESSAGES = Object.freeze({
  AwaitingPayment: 'Thanh toán đang được xác minh. Vui lòng kiểm tra trạng thái giao dịch.',
  Expired: 'Thời gian giữ chỗ đã hết. Vui lòng kiểm tra lại tình trạng lớp trước khi thanh toán.',
  Failed: 'Thanh toán không thành công. Chỗ đã được giải phóng, bạn có thể đăng ký lại.',
  PaidUnderReview: 'Giao dịch đã được ghi nhận nhưng chưa thể hoàn tất ghi danh. Bộ phận quản trị sẽ xem xét yêu cầu của bạn.',
  Confirmed: 'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công.',
  Cancelled: 'Giao dịch đã bị hủy.',
});

export const paymentStateMessage = (state) => PAYMENT_STATE_MESSAGES[state] || '';

// Mã mà máy chủ trả về thông điệp chi tiết (tên lớp, giờ, ngày) — ưu tiên hiển thị thông điệp đó.
const PREFER_SERVER_DETAIL = new Set([
  'HOMEWORK_AI_DRAFT_UNAVAILABLE',
  'MENTOR_SCHEDULE_CONFLICT',
  'MENTOR_REST_INTERVAL_VIOLATION',
  'MENTOR_DAILY_LIMIT_EXCEEDED',
  'MENTOR_WEEKLY_LIMIT_EXCEEDED',
  'COHORT_SESSION_DUPLICATE',
  'COHORT_SCHEDULE_CONFLICT',
]);

const RETRYABLE_CODES = new Set([
  'HOMEWORK_AI_DRAFT_UNAVAILABLE',
  'INTERNAL_ERROR',
  'UPSTREAM_TIMEOUT',
  'CONCURRENCY_CONFLICT',
  'COHORT_SCHEDULE_REVISION_CONFLICT',
  'PAYMENT_GATEWAY_INVALID_LINK',
  'COHORT_PAYMENT_PENDING',
]);

const CONFLICT_CODES = new Set([
  'CONCURRENCY_CONFLICT',
  'DUPLICATE_REQUEST',
  'MENTOR_SCHEDULE_CONFLICT',
  'MENTOR_REST_INTERVAL_VIOLATION',
  'MENTOR_DAILY_LIMIT_EXCEEDED',
  'MENTOR_WEEKLY_LIMIT_EXCEEDED',
  'COHORT_SESSION_DUPLICATE',
  'COHORT_SCHEDULE_REVISION_CONFLICT',
  'COHORT_SCHEDULE_ALREADY_PUBLISHED',
  'COHORT_FULL',
  'COHORT_ENROLLMENT_CLOSED',
  'COHORT_ALREADY_ENROLLED',
  'COHORT_SCHEDULE_CONFLICT',
  'COHORT_CANCELLATION_NOT_ALLOWED',
  'TRANSFER_SOURCE_STARTED',
  'COHORT_SCHEDULE_REQUEST_PENDING',
  'COHORT_HAS_CONFIRMED_LEARNERS',
  'COHORT_PAYMENT_PENDING',
  'COHORT_PAYMENT_REVIEW_OPEN',
  'COHORT_ALREADY_STARTED',
  'COHORT_REVIEW_NOT_ELIGIBLE',
  'COHORT_REVIEW_DUPLICATE',
]);

const NETWORK_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED', 'ERR_CANCELED_TIMEOUT']);

const TECHNICAL_PATTERN =
  /(exception|stack ?trace|traceback|\bat\s+[\w$.<>]+\s*\(|System\.|Microsoft\.|Npgsql|SqlException|EntityFramework|DbUpdate|NullReference|Object reference|\bSQL\b|SELECT\s|INSERT\s|<html|<!doctype|\{\s*"|\bundefined\b|\bnull reference\b|Request failed with status code|Network Error|timeout of \d+ms|cổng \d+|localhost|https?:\/\/)/i;

/** Thông điệp máy chủ chỉ được dùng nếu ngắn, một dòng và không mang chi tiết kỹ thuật. */
export function isSafeUserMessage(text) {
  if (typeof text !== 'string') return false;
  const value = text.trim();
  if (!value || value.length > 300) return false;
  if (/[\r\n]/.test(value)) return false;
  return !TECHNICAL_PATTERN.test(value);
}

const STATUS_MESSAGES = {
  400: 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
  403: FORBIDDEN_MESSAGE,
  404: 'Không tìm thấy dữ liệu yêu cầu. Có thể dữ liệu đã thay đổi, vui lòng tải lại.',
  409: 'Dữ liệu đã thay đổi hoặc xung đột với trạng thái hiện tại. Vui lòng tải lại và thử lại.',
  413: 'Tệp đính kèm quá lớn. Vui lòng chọn tệp nhỏ hơn 10 MB.',
  415: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận PDF, PNG hoặc JPG.',
  422: 'Dữ liệu chưa đáp ứng quy định. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  502: 'Dịch vụ liên kết đang gián đoạn. Vui lòng thử lại sau ít phút.',
  503: 'Hệ thống đang bảo trì hoặc quá tải. Vui lòng thử lại sau.',
  504: ERROR_MESSAGES.UPSTREAM_TIMEOUT,
};

/**
 * Maps an API/network error to a Smart UI Rendering state category.
 * @returns {'unauthenticated' | 'forbidden' | 'business-conflict' | 'network-error' | 'server-error'}
 */
export function classifyApiErrorState(error) {
  if (!error) return 'server-error';
  const status = Number(error.status ?? error.response?.status) || null;
  const code = error.errorCode || error.data?.errorCode || error.response?.data?.errorCode || null;
  const offline =
    !status &&
    (error.isNetwork === true ||
      error.isTimeout === true ||
      NETWORK_CODES.has(error.code) ||
      error.message === 'Network Error' ||
      (typeof navigator !== 'undefined' && navigator && navigator.onLine === false && !code));
  if (offline) return 'network-error';
  if (status === 401 || code === 'AUTH_EXPIRED') return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 409 || (code && CONFLICT_CODES.has(code))) return 'business-conflict';
  return 'server-error';
}

/**
 * Primary `message` stays clean for users (never embeds long correlationId or stack traces).
 * `referenceText` / `messageWithReference` expose correlationId strictly for support drawers & diagnostics.
 * @returns {{ code: string|null, message: string, userMessage: string, referenceText: string|null, messageWithReference: string, state: string, retryable: boolean, authExpired: boolean, offline: boolean, status: number|null, correlationId: string|null }}
 */
export function describeApiError(error) {
  if (!error) {
    return {
      code: null,
      message: GENERIC_MESSAGE,
      userMessage: GENERIC_MESSAGE,
      referenceText: null,
      messageWithReference: GENERIC_MESSAGE,
      state: 'server-error',
      retryable: false,
      authExpired: false,
      offline: false,
      status: null,
      correlationId: null,
    };
  }
  const status = Number(error.status ?? error.response?.status) || null;
  const code =
    error.errorCode ||
    error.data?.errorCode ||
    error.response?.data?.errorCode ||
    null;
  const correlationId =
    error.correlationId ||
    error.response?.headers?.['x-correlation-id'] ||
    null;
  const serverMessage = error.data?.errorMessage ?? error.response?.data?.errorMessage ?? null;
  const state = classifyApiErrorState(error);
  const referenceText = correlationId ? `Mã tra cứu: ${correlationId}` : null;
  const build = (message, overrides = {}) => ({
    code,
    status,
    correlationId,
    referenceText,
    state,
    authExpired: false,
    offline: false,
    retryable: false,
    message,
    userMessage: message,
    messageWithReference: referenceText ? `${message} (${referenceText})` : message,
    ...overrides,
  });

  if (state === 'network-error') {
    return build(NETWORK_MESSAGE, { code: code || 'NETWORK_ERROR', offline: true, retryable: true });
  }

  if (status === 401) {
    return build(AUTH_EXPIRED_MESSAGE, { code: code || 'AUTH_EXPIRED', authExpired: true });
  }

  if (code === 'INTERNAL_ERROR' || (status && status >= 500 && !ERROR_MESSAGES[code])) {
    const message = status && status !== 500 && STATUS_MESSAGES[status] ? STATUS_MESSAGES[status] : INTERNAL_MESSAGE;
    return build(message, { code: code || 'INTERNAL_ERROR', retryable: true });
  }

  const retryable = RETRYABLE_CODES.has(code) || status === 504;
  if (code && ERROR_MESSAGES[code]) {
    const message = PREFER_SERVER_DETAIL.has(code) && isSafeUserMessage(serverMessage) ? serverMessage.trim() : ERROR_MESSAGES[code];
    return build(message, { retryable });
  }
  if (code && PAYMENT_STATE_MESSAGES[code]) {
    return build(PAYMENT_STATE_MESSAGES[code], { retryable });
  }

  // Mã chưa biết: dùng thông điệp máy chủ nếu an toàn, nếu không dùng thông điệp theo HTTP status.
  if (isSafeUserMessage(serverMessage)) return build(serverMessage.trim(), { retryable });
  if (status && STATUS_MESSAGES[status]) return build(STATUS_MESSAGES[status], { retryable });
  // Lỗi do chính giao diện ném ra (kiểm tra dữ liệu phía client) – chỉ khi thông điệp an toàn.
  if (!status && isSafeUserMessage(error.message)) return build(error.message.trim());
  return build(GENERIC_MESSAGE, { retryable });
}

export const errorMessage = (error) => describeApiError(error).message;
