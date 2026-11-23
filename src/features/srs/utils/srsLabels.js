export function normalizeSrsCardType(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'kanji' ? 'Kanji' : 'Vocabulary';
}

export function formatSrsCardTypeLabel(rawType, tr = (s) => s) {
  return tr(normalizeSrsCardType(rawType) === 'Kanji' ? 'Kanji' : 'Từ vựng');
}

const STUDY_MODE_LABELS = {
  flip: 'Lật thẻ',
  typing: 'Gõ đáp án',
  mcq: 'Trắc nghiệm',
  mixed: 'Hỗn hợp',
};

export const SRS_TEMPLATE_STATUS_META = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  0: { label: 'Bản nháp', tone: 'neutral' },
  PendingReview: { label: 'Chờ duyệt', tone: 'warning' },
  1: { label: 'Chờ duyệt', tone: 'warning' },
  Published: { label: 'Đã xuất bản', tone: 'success' },
  2: { label: 'Đã xuất bản', tone: 'success' },
  Rejected: { label: 'Bị từ chối', tone: 'danger' },
  3: { label: 'Bị từ chối', tone: 'danger' },
  Unpublished: { label: 'Ngừng xuất bản', tone: 'neutral' },
  4: { label: 'Ngừng xuất bản', tone: 'neutral' },
};

export function getSrsTemplateStatusMeta(status) {
  return SRS_TEMPLATE_STATUS_META[status] || { label: String(status || ''), tone: 'neutral' };
}

export function formatSrsStudyMode(mode, tr = (s) => s) {
  const key = String(mode || '').trim().toLowerCase();
  return tr(STUDY_MODE_LABELS[key] || STUDY_MODE_LABELS.flip);
}
