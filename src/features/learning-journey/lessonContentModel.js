// Splits Published lesson content (LessonDetailResponse) into short study pages for the Lesson Player.
// Only real data is used — no generated meanings, readings, audio or examples.

export const LEARN_PARTS = Object.freeze({
  content: { label: 'Nội dung bài', key: null, size: 1 },
  vocab: { label: 'Từ vựng', key: 'vocabularies', size: 5 },
  kanji: { label: 'Hán tự', key: 'kanjis', size: 5 },
  grammar: { label: 'Ngữ pháp', key: 'grammars', size: 3 },
});

export function itemKey(part, item) {
  const id = item?.vocabularyId ?? item?.kanjiId ?? item?.grammarPatternId ?? item?.word ?? item?.character ?? item?.title;
  return `${part}:${id}`;
}

export function hasLessonBody(detail) {
  return Boolean(detail?.content?.trim() || detail?.audioUrl || detail?.videoUrl || detail?.attachmentUrl);
}

/** Balanced chunks: 20 items → 4 × 5, 7 items → 4 + 3 (never one item per page). */
export function chunkItems(items, size) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];
  const count = Math.ceil(list.length / size);
  const per = Math.ceil(list.length / count);
  return Array.from({ length: count }, (_, i) => list.slice(i * per, (i + 1) * per)).filter((chunk) => chunk.length > 0);
}

export function buildLearnPages(detail) {
  if (!detail) return [];
  const pages = [];
  if (hasLessonBody(detail)) pages.push({ id: 'content', part: 'content', chunk: 0, chunkCount: 1, items: [] });
  for (const part of ['vocab', 'kanji', 'grammar']) {
    const meta = LEARN_PARTS[part];
    const chunks = chunkItems(detail[meta.key], meta.size);
    chunks.forEach((items, chunk) => {
      pages.push({ id: `${part}-${chunk}`, part, chunk, chunkCount: chunks.length, items });
    });
  }
  return pages;
}

export function knowledgeSummary(detail) {
  if (!detail) return [];
  return ['vocab', 'kanji', 'grammar']
    .map((part) => ({ part, label: LEARN_PARTS[part].label, count: (detail[LEARN_PARTS[part].key] ?? []).length }))
    .filter((entry) => entry.count > 0);
}

// ── Per-learner "where was I" bookmark (browser only; progress itself is saved by the Backend) ────

function positionKey(userId, lessonId) {
  return `rikipath:lesson-position:${userId ?? 'guest'}:${lessonId}`;
}

export function readLearnPosition(userId, lessonId) {
  try {
    const value = Number(localStorage.getItem(positionKey(userId, lessonId)));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function writeLearnPosition(userId, lessonId, index) {
  try {
    localStorage.setItem(positionKey(userId, lessonId), String(index));
  } catch {
    // Position memory is a convenience; storage may be unavailable.
  }
}
