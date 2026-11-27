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
  MENTOR_DAILY_LIMIT_EXCEEDED: 'Khung giờ đăng ký trong ngày đã đạt giới hạn xếp lịch. Vui lòng chọn ngày khác.',
  MENTOR_WEEKLY_LIMIT_EXCEEDED: 'Lịch đăng ký trong tuần đã đạt giới hạn xếp lịch. Vui lòng điều chỉnh lại khung giờ.',
  COHORT_SESSION_DUPLICATE: 'Lịch lớp có các buổi trùng thời gian. Vui lòng kiểm tra lại khung giờ đã chọn.',
  COHORT_SCHEDULE_REVISION_CONFLICT: 'Lịch lớp vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.',
  COHORT_SCHEDULE_ALREADY_PUBLISHED: 'Lịch lớp đã được công bố nên không thể sửa trực tiếp. Vui lòng gửi yêu cầu dời/hủy lớp.',
  COHORT_SCHEDULE_INCOMPLETE: 'Lịch lớp chưa đủ số buổi theo khóa học. Vui lòng chọn thêm khung giờ.',
  // Đề xuất mở lớp & xác thực thời gian / chuyên môn
  PAST_SCHEDULE_SLOT: 'Đã quá thời gian này.',
  SESSION_ALREADY_STARTED: 'Buổi học đầu tiên đã trôi qua hoặc đã bắt đầu. Vui lòng kiểm tra lại lịch.',
  INSUFFICIENT_PROPOSAL_LEAD_TIME: 'Chưa đủ khoảng thời gian tối thiểu trước khi bắt đầu mở lớp.',
  INSUFFICIENT_ENROLLMENT_LEAD_TIME: 'Chưa đủ thời gian tuyển sinh tối thiểu trước buổi học đầu tiên.',
  INVALID_COURSE_START_DATE: 'Thời điểm bắt đầu lớp học không hợp lệ. Vui lòng kiểm tra lại.',
  COURSE_START_SESSION_MISMATCH: 'Ngày bắt đầu chưa khớp với các khung giờ hằng tuần đã chọn.',
  INVALID_RECURRENCE_SCHEDULE: 'Lịch học lặp theo tuần không hợp lệ. Vui lòng kiểm tra lại các khung giờ đã chọn.',
  COURSE_WEEKS_INVALID: 'Số tuần giảng dạy phải là số nguyên dương từ 1 đến 104 tuần.',
  TOTAL_SESSIONS_EXCEEDS_LIMIT: 'Tổng số buổi của một lớp không vượt quá 1.000 buổi. Vui lòng điều chỉnh số buổi mỗi tuần hoặc số tuần giảng dạy.',
  SCHEDULE_SLOT_NOT_FOUND_IN_WINDOW: 'Không tìm thấy khung thời gian phù hợp để mở lớp trong phạm vi công bố lịch hiện tại.',
  SCHEDULE_PREVIEW_STALE: 'Lịch dự kiến đã thay đổi do có lịch mới hoặc chính sách vừa cập nhật. Vui lòng kiểm tra lại lịch mới nhất trước khi phê duyệt.',
  INSUFFICIENT_TEACHING_QUALIFICATION: 'Không đủ trình độ chuyên môn.',
  MENTOR_QUALIFICATION_NOT_VERIFIED: 'Hồ sơ chuyên môn của bạn chưa được xác minh để đăng ký mở lớp.',
  DUPLICATE_ACTIVE_LEVEL_PROPOSAL: 'Bạn đã có đề xuất hoặc lớp đang hoạt động ở trình độ này.',
  STALE_MENTOR_QUALIFICATION: 'Thông tin trình độ chuyên môn vừa thay đổi. Vui lòng tải lại trang và kiểm tra lại.',
  // Gói học
  COURSE_PLAN_INVALID_CAPACITY: 'Sĩ số lớp không hợp lệ theo chính sách lớp nhóm hiện hành.',
  COURSE_PLAN_INVALID_INTENSITY: 'Số buổi học mỗi tuần không hợp lệ. Vui lòng chọn ít nhất 1 buổi mỗi tuần.',
  COURSE_PLAN_INVALID_DURATION: 'Thời lượng khóa học chưa hợp lệ (số tuần, tổng số buổi hoặc phút mỗi buổi).',
  // Ghi danh & thanh toán
  COHORT_FULL: 'Lớp học đã đủ sĩ số. Vui lòng chọn lớp khác.',
  COHORT_ENROLLMENT_CLOSED: 'Lớp đã đóng ghi danh. Vui lòng chọn lớp khác.',
  COHORT_ALREADY_ENROLLED: 'Bạn đã ghi danh lớp này. Vui lòng xem mục "Lớp đang học của tôi".',
  COHORT_SCHEDULE_CONFLICT: 'Lịch lớp này trùng với lịch học khác của bạn. Vui lòng chọn lớp khác.',
  PAYMENT_GATEWAY_INVALID_LINK: 'Không tạo được liên kết thanh toán hợp lệ. Vui lòng thử lại sau ít phút.',
  // Thanh toán gói tự học (PayOS)
  PLAN_NOT_AVAILABLE: 'Gói học này hiện không còn mở bán. Vui lòng chọn gói khác.',
  PLAN_PRICE_INVALID: 'Gói học đang được cập nhật giá. Vui lòng thử lại sau.',
  PAYMENT_LINK_IN_PROGRESS: 'Đơn hàng đang được tạo. Vui lòng đợi trong giây lát rồi thử lại.',
  PAYMENT_GATEWAY_NOT_CONFIGURED: 'Cổng thanh toán tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  PAYMENT_GATEWAY_UNAVAILABLE: 'Cổng thanh toán tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  PAYMENT_GATEWAY_RATE_LIMITED: 'Cổng thanh toán đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
  PAYMENT_GATEWAY_TIMEOUT: 'Cổng thanh toán đang phản hồi chậm. Vui lòng thử lại.',
  PAYMENT_GATEWAY_REJECTED: 'Chưa tạo được liên kết thanh toán. Vui lòng thử lại.',
  COHORT_CANCELLATION_NOT_ALLOWED: 'Khóa học đã bắt đầu nên không thể tự hủy ghi danh. Bạn có thể gửi khiếu nại nếu cần hỗ trợ.',
  TRANSFER_SOURCE_STARTED: 'Không thể chuyển lớp sau khi khóa học đã bắt đầu.',
  // Yêu cầu dời/hủy lớp
  COHORT_SCHEDULE_REQUEST_PENDING: 'Lớp đang có một yêu cầu dời/hủy chờ duyệt. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.',
  COHORT_HAS_CONFIRMED_LEARNERS: 'Lớp đã có học viên ghi danh thành công nên không thể hủy.',
  COHORT_PAYMENT_PENDING: 'Lớp đang có giao dịch thanh toán chờ xác minh. Vui lòng thử lại sau.',
  COHORT_PAYMENT_REVIEW_OPEN: 'Lớp đang có giao dịch cần quản trị viên xem xét. Vui lòng xử lý giao dịch đó trước.',
  COHORT_ALREADY_STARTED: 'Lớp đang diễn ra nên không thể dời hoặc hủy.',
  COHORT_CANCELLED_NO_LEARNERS: 'Lớp học đã được hủy vì không có học viên ghi danh khi đóng tuyển sinh.',
  COHORT_SCHEDULE_REQUEST_REASON_REQUIRED: 'Vui lòng nhập lý do cho yêu cầu.',
  // Đánh giá Mentor
  COHORT_REVIEW_NOT_ELIGIBLE: 'Bạn chỉ có thể đánh giá Giáo viên đã trực tiếp dạy bạn trong khóa học này.',
  COHORT_REVIEW_DUPLICATE: 'Bạn đã đánh giá Giáo viên này cho khóa học. Bạn có thể chỉnh sửa đánh giá đã gửi.',
  // Gói tự học & lượt AI
  SELF_STUDY_PACKAGE_REQUIRED: 'Tính năng này yêu cầu Gói tự học đang hiệu lực. Vào mục Gói tự học để kích hoạt.',
  WRITING_PACKAGE_REQUIRED: 'Nhận dạng chữ viết tay từ ảnh yêu cầu Gói tự học hoặc Gói luyện viết.',
  SPEAKING_PACKAGE_REQUIRED: 'Chấm điểm luyện nói AI yêu cầu Gói tự học hoặc Gói luyện nói.',
  AI_CREDIT_REQUIRED: 'Bạn chưa có lượt chấm AI cho kỹ năng này. Vào mục Gói tự học để mua thêm lượt.',
  FEATURE_DISABLED: 'Tính năng này đang tạm ngừng cung cấp. Bạn có thể quay lại sử dụng khi hệ thống mở lại.',
  FEATURE_POLICY_RESTRICTED: 'Tính năng này hiện không khả dụng với gói học của bạn.',
  // Thiết lập mục tiêu, đánh giá năng lực & lộ trình học
  STUDY_LEVEL_REQUIRED: 'Vui lòng chọn chứng chỉ và mục tiêu JLPT (N5–N2) trước khi xem lộ trình học.',
  STUDY_LEVEL_UNSUPPORTED: 'Lộ trình hiện hỗ trợ các cấp độ JLPT từ N5 đến N2.',
  LEARNING_GOAL_REQUIRED: 'Vui lòng thiết lập mục tiêu JLPT (N5–N2) trước khi thực hiện bước tiếp theo.',
  STANDARD_ROADMAP_PLACEMENT_REQUIRED: 'Vui lòng hoàn thành bài đánh giá năng lực hoặc chủ động chọn bỏ qua để mở lộ trình tiêu chuẩn.',
  PLACEMENT_IN_PROGRESS: 'Bạn đang có bài đánh giá năng lực chưa hoàn tất. Hãy tiếp tục làm bài để hoàn thiện thiết lập.',
  PLACEMENT_PENDING_SUBMISSION: 'Bạn có lượt đánh giá năng lực đã hết giờ cần nộp để nhận kết quả.',
  PLACEMENT_GOAL_REQUIRED: 'Vui lòng lưu mục tiêu JLPT hợp lệ trước khi bắt đầu bài đánh giá năng lực.',
  PLACEMENT_INSUFFICIENT_FOR_TARGET: 'Kết quả đánh giá hiện tại chưa bao phủ đủ cấp độ mục tiêu. Hãy làm bài đánh giá bổ sung hoặc chọn Lộ trình tiêu chuẩn.',
  PLACEMENT_ATTEMPT_LIMIT_REACHED: 'Bạn đã sử dụng hết số lượt đánh giá cho phạm vi này theo chính sách hiện hành.',
  PLACEMENT_RETAKE_NOT_AVAILABLE: 'Hãy mở kết quả đánh giá hiện tại hoặc chọn Đánh giá lại để làm lượt mới.',
  LEARNING_PATH_AI_QUOTA: 'Bạn đã dùng hết lượt tạo lộ trình cá nhân hóa AI. Vui lòng mua thêm lượt hoặc sử dụng Lộ trình tiêu chuẩn.',
  LEARNING_PATH_GOAL_REQUIRED: 'Vui lòng thiết lập mục tiêu JLPT (N5–N2) trước khi tạo lộ trình học AI.',
  LEARNING_PATH_PLACEMENT_REQUIRED: 'Cần hoàn thành bài đánh giá năng lực hợp lệ trước khi mở khóa lộ trình cá nhân hóa AI.',
  PATH_PREVIEW_REQUIRED: 'Bạn đã có lộ trình AI đang hoạt động. Hãy xem trước và xác nhận để cập nhật.',
  ROADMAP_MODE_INVALID: 'Chế độ lộ trình không hợp lệ. Vui lòng chọn Lộ trình tiêu chuẩn hoặc Lộ trình cá nhân hóa AI.',
  // Luyện đề & Thi thử JLPT
  MOCK_TEST_PREVIEW_FORBIDDEN: 'Đề thi thử JLPT không cho phép xem trước danh sách câu hỏi.',
  PRACTICE_SET_UNAVAILABLE: 'Bộ đề luyện tập hiện chưa khả dụng hoặc đang được cập nhật.',
  MOCK_TEST_CANNOT_RESTART_ACTIVE: 'Bạn đang có một lượt thi thử JLPT chưa hoàn thành. Vui lòng tiếp tục hoặc nộp lượt hiện tại.',
  MOCK_TEST_ABANDONED: 'Lượt làm bài này đã kết thúc do bạn chọn bắt đầu lượt mới.',
  MOCK_TEST_PDF_REQUIRES_ATTEMPT: 'Bạn cần hoàn thành ít nhất một lượt thi thử trước khi tải bản PDF của đề thi này.',
  MOCK_TEST_EXPIRED: 'Lượt làm bài đã hết thời gian theo đồng hồ máy chủ.',
  MOCK_TEST_COMPLETED: 'Lượt làm bài này đã được nộp và chấm điểm.',
  // Danh mục chứng chỉ & cấp độ
  DISPLAY_ORDER_INVALID: 'Thứ tự hiển thị phải là số nguyên dương bắt đầu từ 1.',
  DISPLAY_ORDER_CONFLICT: 'Thứ tự hiển thị đã được sử dụng trong danh sách này.',
  CERTIFICATE_NAME_INVALID: 'Tên chứng chỉ không hợp lệ hoặc vượt quá 100 ký tự.',
  CERTIFICATE_DESCRIPTION_TOO_LONG: 'Mô tả chứng chỉ tối đa 2000 ký tự.',
  CERTIFICATE_ALREADY_EXISTS: 'Tên chứng chỉ đã tồn tại.',
  CERTIFICATE_NOT_FOUND: 'Không tìm thấy chứng chỉ.',
  LEVEL_CODE_INVALID: 'Mã cấp độ không hợp lệ hoặc vượt quá 50 ký tự.',
  LEVEL_DESCRIPTION_TOO_LONG: 'Mô tả cấp độ tối đa 2000 ký tự.',
  LEVEL_ALREADY_EXISTS: 'Mã cấp độ đã tồn tại trong chứng chỉ này.',
  LEVEL_NOT_FOUND: 'Không tìm thấy cấp độ.',
  LEVEL_IDENTITY_LOCKED: 'Giữ nguyên mã và chứng chỉ của cấp độ đã tạo.',
  ORDER_REVISION_CONFLICT: 'Dữ liệu vừa được quản trị viên khác cập nhật. Vui lòng tải lại.',
  // Cấu hình gói học & thanh toán (Admin)
  PLAN_CATEGORY_INVALID: 'Loại gói học không hợp lệ.',
  SUBSCRIPTION_PLAN_NAME_INVALID: 'Tên gói học là bắt buộc và tối đa 150 ký tự.',
  SUBSCRIPTION_PLAN_DESCRIPTION_TOO_LONG: 'Mô tả gói học tối đa 500 ký tự.',
  SUBSCRIPTION_PLAN_PRICE_INVALID: 'Giá gói phải là số nguyên VND không âm.',
  SUBSCRIPTION_PLAN_PRICE_REQUIRED: 'Gói đang mở bán phải có giá lớn hơn 0 VND.',
  SUBSCRIPTION_PLAN_DURATION_INVALID: 'Thời hạn gói học không hợp lệ theo loại gói.',
  SUBSCRIPTION_PLAN_QUOTA_INVALID: 'Số lượt AI không hợp lệ.',
  SUBSCRIPTION_PLAN_DUPLICATE_NAME: 'Tên gói học đã tồn tại.',
  FEATURE_NOT_FOUND: 'Quyền lợi được chọn không tồn tại trong hệ thống.',
  CORE_FREE_FEATURE_PROTECTED: 'Tính năng cốt lõi miễn phí được bảo vệ, không thể chuyển sang chế độ khóa hoặc tắt.',
  FEATURE_ACCESS_MODE_INVALID: 'Chế độ truy cập tính năng không hợp lệ.',
  FEATURE_CREDIT_KEY_INVALID: 'Khóa tiêu thụ lượt AI không hợp lệ.',
  INVALID_PAYMENT_STREAM: 'Luồng giao dịch không hợp lệ.',
  // Hệ thống
  NOTEBOOK_INVALID_INPUT: 'Thông tin Sổ tay không hợp lệ. Vui lòng kiểm tra lại.',
  NOTEBOOK_FOLDER_DUPLICATE: 'Tên thư mục này đã tồn tại.',
  NOTEBOOK_FILE_DUPLICATE: 'Tên tệp ghi chú này đã tồn tại trong thư mục.',
  NOTEBOOK_PAGE_DUPLICATE: 'Tên trang này đã tồn tại trong tệp ghi chú.',
  NOTEBOOK_REVISION_CONFLICT: 'Trang hoặc mục này vừa được cập nhật ở nơi khác. Hãy tải bản mới nhất trước khi lưu.',
  NOTEBOOK_FOLDER_NOT_EMPTY: 'Thư mục vẫn còn tệp ghi chú. Hãy di chuyển tệp hoặc xác nhận xóa toàn bộ thư mục.',
  NOTEBOOK_FILE_NOT_EMPTY: 'Tệp ghi chú vẫn còn trang. Hãy xác nhận để xóa toàn bộ tệp và các trang bên trong.',
  SRS_SESSION_TIME_EXPIRED: 'Đã hết thời gian cho phiên ôn tập tự do.',
  SRS_SESSION_CLOSED: 'Phiên ôn tập này đã kết thúc.',
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
  'DISPLAY_ORDER_INVALID',
  'DISPLAY_ORDER_CONFLICT',
  'CERTIFICATE_ALREADY_EXISTS',
  'LEVEL_ALREADY_EXISTS',
  'LEVEL_IDENTITY_LOCKED',
  'ORDER_REVISION_CONFLICT',
]);

const RETRYABLE_CODES = new Set([
  'PAYMENT_LINK_IN_PROGRESS',
  'PAYMENT_GATEWAY_RATE_LIMITED',
  'PAYMENT_GATEWAY_TIMEOUT',
  'PAYMENT_GATEWAY_REJECTED',
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
  'DISPLAY_ORDER_CONFLICT',
  'CERTIFICATE_ALREADY_EXISTS',
  'LEVEL_ALREADY_EXISTS',
  'LEVEL_IDENTITY_LOCKED',
  'ORDER_REVISION_CONFLICT',
  'MENTOR_SCHEDULE_CONFLICT',
  'MENTOR_REST_INTERVAL_VIOLATION',
  'MENTOR_DAILY_LIMIT_EXCEEDED',
  'MENTOR_WEEKLY_LIMIT_EXCEEDED',
  'COHORT_SESSION_DUPLICATE',
  'COHORT_SCHEDULE_REVISION_CONFLICT',
  'COHORT_SCHEDULE_ALREADY_PUBLISHED',
  'SCHEDULE_PREVIEW_STALE',
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

export const errorMessage = (error, fallback = '') => {
  const described = describeApiError(error);
  if (fallback && (!error || described.message === GENERIC_MESSAGE)) {
    return fallback;
  }
  return described.message || fallback || GENERIC_MESSAGE;
};
