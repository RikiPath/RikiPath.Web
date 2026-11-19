import { translateTemplate } from '@/locales/locale.js';
// Quy tắc bài tập lớp nhóm theo hợp đồng Backend sau tích hợp PR #70 (chấm bài của teammate là canonical).
// Tách khỏi JSX để kiểm thử bằng node:test.

export const HOMEWORK_SCAN_MAX_BYTES = 10 * 1024 * 1024;
export const HOMEWORK_SCAN_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
export const HOMEWORK_FEEDBACK_MAX = 2000;
export const AI_DRAFT_UNAVAILABLE_CODE = 'HOMEWORK_AI_DRAFT_UNAVAILABLE';

/** Trả về thông báo lỗi tiếng Việt, hoặc null nếu tệp hợp lệ. */
export function validateHomeworkScanFile(file) {
  if (!file) return null;
  if (!HOMEWORK_SCAN_TYPES.includes(file.type)) return 'Chỉ nhận ảnh PNG/JPG hoặc tệp PDF.';
  if (!(file.size > 0) || file.size > HOMEWORK_SCAN_MAX_BYTES) return 'Tệp bài làm phải nhỏ hơn hoặc bằng 10 MB.';
  return null;
}

/** Backend yêu cầu điểm 0–100 và nhận xét 1–2000 ký tự trước khi công bố. */
export function buildGradePayload(draft = {}) {
  const feedback = String(draft.feedback ?? '').trim();
  const rawScore = draft.score;
  const score = rawScore === '' || rawScore == null ? NaN : Number(rawScore);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { error: 'Nhập điểm từ 0 đến 100 trước khi công bố.' };
  }
  if (!feedback) return { error: 'Vui lòng nhập nhận xét trước khi công bố cho học viên.' };
  if (feedback.length > HOMEWORK_FEEDBACK_MAX) return { error: translateTemplate('Nhận xét tối đa {0} ký tự.', { 0: HOMEWORK_FEEDBACK_MAX }) };
  return { payload: { passed: Boolean(draft.passed), score, feedback, publishAiDraft: false } };
}

/** AI/OCR chưa sẵn sàng là kết quả hợp lệ: Mentor vẫn chấm trực tiếp, lý do đã được lưu ở bài tập. */
export function isAiDraftUnavailable(info) {
  return info?.code === AI_DRAFT_UNAVAILABLE_CODE || (info?.status === 503 && !info?.code);
}

export function aiDraftNotice(result) {
  return result?.available === false
    ? translateTemplate('AI chưa tạo được gợi ý: {0}. Bạn vẫn có thể chấm trực tiếp.', { 0: result.reason || 'dịch vụ tạm thời gián đoạn' })
    : 'Đã cập nhật gợi ý nháp AI cho Mentor.';
}
