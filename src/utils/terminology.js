import { translateText } from '@/locales/locale.js';

/**
 * Centralized user-facing Vietnamese terminology mappings.
 * Technical role/status identifiers remain untouched in API contracts, routes, and enums;
 * only UI presentation strings are mapped here.
 */

export const ROLE_DISPLAY_LABELS = {
  Admin: 'Quản trị viên',
  Administrator: 'Quản trị viên',
  Mentor: 'Giáo viên',
  Consultant: 'Giáo viên',
  Teacher: 'Giáo viên',
  Instructor: 'Giáo viên',
  Learner: 'Học viên',
  Student: 'Học viên',
  ContentAuthor: 'Quản lý nội dung',
  ContentManager: 'Quản lý nội dung',
  System: 'Hệ thống',
};

const ROLE_LOOKUP_LOWER = Object.fromEntries(
  Object.entries(ROLE_DISPLAY_LABELS).map(([k, v]) => [k.toLowerCase(), v]),
);

export function formatRoleLabel(role, tr = translateText) {
  if (!role) return '—';
  const raw = String(role).trim();
  const mapped = ROLE_DISPLAY_LABELS[raw] || ROLE_LOOKUP_LOWER[raw.toLowerCase()];
  return tr(mapped || 'Thành viên');
}

export const APPROVAL_STATUS_LABELS = {
  Pending: 'Chờ duyệt',
  PendingReview: 'Chờ duyệt',
  PendingApproval: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  ChangesRequested: 'Cần bổ sung',
  NeedsRevision: 'Cần bổ sung',
  Submitted: 'Đã gửi xét duyệt',
  Resubmitted: 'Đã gửi lại xét duyệt',
  Withdrawn: 'Đã rút',
  Cancelled: 'Đã hủy',
  Completed: 'Đã hoàn thành',
  Draft: 'Bản nháp',
  Published: 'Đã xuất bản',
  Unpublished: 'Ngừng xuất bản',
  Archived: 'Đã lưu trữ',
  Unverified: 'Chưa xác minh',
  Open: 'Đang mở',
  UnderReview: 'Đang xem xét',
  Resolved: 'Đã giải quyết',
};

export function formatApprovalStatusLabel(status, tr = translateText) {
  if (!status) return tr('Đang cập nhật');
  const mapped = APPROVAL_STATUS_LABELS[String(status).trim()];
  return tr(mapped || 'Đang cập nhật');
}

export const AUDIT_ACTION_LABELS = {
  Created: 'Tạo mới',
  Updated: 'Cập nhật',
  Submitted: 'Gửi xét duyệt',
  Resubmitted: 'Gửi lại xét duyệt',
  Approved: 'Phê duyệt',
  Published: 'Xuất bản',
  Unpublished: 'Ngừng xuất bản',
  Rejected: 'Từ chối',
  ChangesRequested: 'Yêu cầu bổ sung',
  NeedsRevision: 'Yêu cầu bổ sung',
  Withdrawn: 'Đã rút',
  Cancelled: 'Đã hủy',
  ShiftWeeks: 'Dời lịch lớp',
  CancelEmptyCohort: 'Hủy lớp chưa có học viên',
  MentorResponded: 'Giáo viên phản hồi',
  Resolved: 'Đã giải quyết',
};

export function formatAuditActionLabel(action, tr = translateText) {
  if (!action) return tr('Cập nhật');
  const mapped = AUDIT_ACTION_LABELS[String(action).trim()];
  return tr(mapped || action);
}

export const CONTENT_ENTITY_LABELS = {
  QuestionBank: 'Câu hỏi ngân hàng',
  Passage: 'Đoạn đọc / Nhóm nghe',
  PracticeSet: 'Bộ đề luyện tập',
  MockTest: 'Đề thi thử JLPT',
  Lesson: 'Bài học',
  Vocabulary: 'Từ vựng',
  Grammar: 'Ngữ pháp',
  Kanji: 'Hán tự',
  PracticeExercise: 'Bài luyện tập',
};

export function formatContentEntityLabel(entityType, tr = translateText) {
  if (!entityType) return '—';
  const mapped = CONTENT_ENTITY_LABELS[String(entityType).trim()];
  return tr(mapped || entityType);
}

export const EXAM_KIND_LABELS = {
  FullMockTest: 'Đề thi thử JLPT',
  MockTest: 'Đề thi thử JLPT',
  PracticeSet: 'Bộ đề luyện tập',
  MixedPractice: 'Đề luyện tập hỗn hợp',
  SkillPractice: 'Bộ đề theo kỹ năng',
};

export function formatExamKindLabel(examKind, tr = translateText) {
  if (!examKind) return '—';
  const mapped = EXAM_KIND_LABELS[String(examKind).trim()];
  return tr(mapped || examKind);
}

export const SOURCE_TYPE_LABELS = {
  Manual: 'Biên soạn thủ công',
  ExcelImport: 'Nhập từ Excel',
  PdfImport: 'Nhập từ PDF',
  WordImport: 'Nhập từ Word',
  JsonImport: 'Nhập từ JSON',
  AiAssisted: 'Có hỗ trợ AI',
};

export function formatSourceTypeLabel(sourceType, tr = translateText) {
  if (!sourceType) return tr('Biên soạn thủ công');
  const mapped = SOURCE_TYPE_LABELS[String(sourceType).trim()];
  return tr(mapped || 'Biên soạn thủ công');
}

export const RIGHTS_STATUS_LABELS = {
  Owned: 'Tự biên soạn / Sở hữu',
  Licensed: 'Có bản quyền cấp phép',
  PublicDomain: 'Phạm vi công cộng',
  Pending: 'Chờ xác minh bản quyền',
};

export function formatRightsStatusLabel(rightsStatus, tr = translateText) {
  if (!rightsStatus) return tr('Tự biên soạn / Sở hữu');
  const mapped = RIGHTS_STATUS_LABELS[String(rightsStatus).trim()];
  return tr(mapped || rightsStatus);
}

export const SKILL_NAME_LABELS = {
  Vocabulary: 'Từ vựng',
  Grammar: 'Ngữ pháp',
  Reading: 'Đọc hiểu',
  Listening: 'Nghe hiểu',
  Kanji: 'Hán tự',
  Writing: 'Viết',
  Speaking: 'Nói',
  Mixed: 'Hỗn hợp',
};

export function formatSkillNameLabel(skillName, tr = translateText) {
  if (!skillName) return '—';
  const mapped = SKILL_NAME_LABELS[String(skillName).trim()];
  return tr(mapped || skillName);
}

export const IMPORT_ROW_STATUS_LABELS = {
  Valid: 'Hợp lệ',
  Warning: 'Cảnh báo',
  Duplicate: 'Trùng lặp',
  Error: 'Lỗi',
  NeedsReview: 'Cần rà soát',
};

export function formatImportRowStatusLabel(status, tr = translateText) {
  if (!status) return tr('Hợp lệ');
  const mapped = IMPORT_ROW_STATUS_LABELS[String(status).trim()];
  return tr(mapped || status);
}

export const QUESTION_TYPE_LABELS = {
  MultipleChoice: 'Trắc nghiệm 4 lựa chọn',
  ReadingMultipleChoice: 'Đọc hiểu trắc nghiệm',
  ListeningMultipleChoice: 'Nghe hiểu trắc nghiệm',
  FillInTheBlank: 'Điền vào chỗ trống',
  Ordering: 'Sắp xếp câu',
  VisualMultipleChoice: 'Trắc nghiệm hình ảnh',
  TrueFalse: 'Đúng / Sai',
  Listening: 'Nghe hiểu',
};

export function formatQuestionTypeLabel(questionType, tr = translateText) {
  if (!questionType) return '—';
  const mapped = QUESTION_TYPE_LABELS[String(questionType).trim()];
  return tr(mapped || questionType);
}
