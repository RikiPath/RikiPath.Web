// Shared model helpers for Content Author forms (statuses as returned by the API,
// PascalCase → camelCase normalisation with stable row ids for editable lists).

export const ORDERING_TYPE = 'Ordering';

export const statuses = {
  Draft: { label: 'Bản nháp', style: 'bg-stone-100 text-stone-700' },
  PendingReview: { label: 'Chờ Admin duyệt', style: 'bg-amber-100 text-amber-900' },
  Approved: { label: 'Đã duyệt', style: 'bg-emerald-100 text-emerald-800' },
  Rejected: { label: 'Bị từ chối', style: 'bg-rose-100 text-rose-800' },
};

export function normalizeKeys(value) {
  if (Array.isArray(value)) return value.map(withRowId);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    const name = key.charAt(0).toLowerCase() + key.slice(1);
    return [name, name === 'interactionData' || name === 'answerKey' ? child : normalizeKeys(child)];
  }));
}

export function withRowId(row) {
  const item = { ...normalizeKeys(row), uiId: crypto.randomUUID() };
  if (item.questionType?.toLowerCase() === 'ordering') {
    item.questionType = ORDERING_TYPE;
    if (Array.isArray(item.answerKey) && item.answerKey.every(token => typeof token === 'string')) {
      item.orderingParts = item.answerKey.map(text => ({ text, uiId: crypto.randomUUID() }));
    }
  }
  return item;
}
