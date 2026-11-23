export const JLPT_LEVEL_CODES = ['N5', 'N4', 'N3', 'N2', 'N1'];

const JLPT_ORDER = new Map(JLPT_LEVEL_CODES.map((code, index) => [code, index]));

function katakanaToHiragana(text) {
  return text.replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function normalizeKanjiSearch(value = '') {
  const nfd = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return katakanaToHiragana(nfd).normalize('NFC').toLowerCase().trim();
}

export function filterKanjiLibrary(items, keyword) {
  const query = normalizeKanjiSearch(keyword);
  return items.filter(
    (item) =>
      !query ||
      [item.character, item.sinoVietnamese, item.meaning, item.onYomi, item.kunYomi].some((value) =>
        normalizeKanjiSearch(value).includes(query),
      ),
  );
}

export function matchRecognizedKanji(items, characters) {
  return [...new Set(characters)].flatMap((character) => items.filter((item) => item.character === character));
}

export function parseJlptLevels(raw) {
  if (!raw) return [];
  const tokens = Array.isArray(raw) ? raw : String(raw).split(/[,/|;\s]+/);
  const cleaned = tokens
    .map((token) => String(token || '').trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  return unique.sort((a, b) => (JLPT_ORDER.get(a) ?? 99) - (JLPT_ORDER.get(b) ?? 99) || a.localeCompare(b));
}

function primaryLevelRank(levels) {
  if (!levels.length) return 99;
  return Math.min(...levels.map((code) => JLPT_ORDER.get(code) ?? 99));
}

export function mergeKanjiLibrary(catalogItems = [], scores = [], dueItems = []) {
  const scoreMap = new Map();
  for (const score of Array.isArray(scores) ? scores : []) {
    const id = Number(score?.kanjiId);
    if (id > 0) scoreMap.set(id, score);
  }

  const dueMap = new Map();
  for (const due of Array.isArray(dueItems) ? dueItems : []) {
    const id = Number(due?.kanjiId ?? due?.id);
    if (id > 0) dueMap.set(id, due);
  }

  const byId = new Map();
  const sources = [...(Array.isArray(catalogItems) ? catalogItems : []), ...(Array.isArray(dueItems) ? dueItems : [])];

  for (const raw of sources) {
    if (!raw || !raw.character) continue;
    const kanjiId = Number(raw.kanjiId ?? raw.id);
    if (!(kanjiId > 0)) continue;

    const existing = byId.get(kanjiId);
    const mergedLevels = parseJlptLevels(raw.jlptLevelName || raw.levelCode || existing?.jlptLevelName);
    const scoreEntry = scoreMap.get(kanjiId);
    const dueEntry = dueMap.get(kanjiId);
    const strokeCount = Number(raw.strokeCount ?? existing?.strokeCount ?? 0) || 0;
    const rawScore = scoreEntry?.score ?? raw.writingScore ?? dueEntry?.writingScore ?? existing?.writingScore ?? null;
    const writingScore = rawScore == null ? null : Number(rawScore);

    byId.set(kanjiId, {
      id: kanjiId,
      kanjiId,
      character: raw.character || existing?.character || '',
      meaning: raw.meaning || existing?.meaning || '',
      sinoVietnamese: raw.sinoVietnamese || existing?.sinoVietnamese || '',
      onYomi: raw.onYomi || existing?.onYomi || '',
      kunYomi: raw.kunYomi || existing?.kunYomi || '',
      strokeCount,
      strokeOrderUrl: raw.strokeOrderUrl || raw.strokeOrderImageUrl || existing?.strokeOrderUrl || null,
      audioUrl: raw.audioUrl || existing?.audioUrl || null,
      jlptLevelName: mergedLevels.join(', '),
      jlptLevels: mergedLevels,
      writingScore,
      correctStrokeCount: scoreEntry?.correctStrokeCount ?? existing?.correctStrokeCount ?? null,
      totalStrokeCount: scoreEntry?.totalStrokeCount ?? existing?.totalStrokeCount ?? (strokeCount || null),
      writingPracticeMode: scoreEntry?.practiceMode ?? raw.writingPracticeMode ?? dueEntry?.writingPracticeMode ?? existing?.writingPracticeMode ?? null,
      scoreUpdatedAt: scoreEntry?.completedAt ?? existing?.scoreUpdatedAt ?? null,
      isDueForWriting: Boolean(dueEntry),
      isNew: dueEntry ? Boolean(dueEntry.isNew) : writingScore == null,
      practiced: writingScore != null,
      mastered: writingScore != null && writingScore >= 80,
    });
  }

  return [...byId.values()].sort(
    (a, b) =>
      primaryLevelRank(a.jlptLevels) - primaryLevelRank(b.jlptLevels) ||
      (a.strokeCount || 999) - (b.strokeCount || 999) ||
      a.kanjiId - b.kanjiId,
  );
}

export function filterKanjiCatalog(items = [], { keyword = '', level = 'ALL', status = 'all' } = {}) {
  const byLevelAndStatus = (Array.isArray(items) ? items : []).filter((item) => {
    if (level && level !== 'ALL') {
      const levels = item.jlptLevels?.length ? item.jlptLevels : parseJlptLevels(item.jlptLevelName);
      if (!levels.includes(String(level).toUpperCase())) return false;
    }
    if (status === 'practiced') return Boolean(item.practiced);
    if (status === 'unpracticed') return !item.practiced;
    if (status === 'due') return Boolean(item.isDueForWriting);
    return true;
  });
  return filterKanjiLibrary(byLevelAndStatus, keyword);
}

export function summarizeKanjiCatalog(items = [], jlptCatalog = []) {
  const list = Array.isArray(items) ? items : [];
  const counts = new Map();
  const practicedCounts = new Map();

  for (const item of list) {
    const levels = item.jlptLevels?.length ? item.jlptLevels : parseJlptLevels(item.jlptLevelName);
    for (const code of levels) {
      counts.set(code, (counts.get(code) || 0) + 1);
      if (item.practiced) practicedCounts.set(code, (practicedCounts.get(code) || 0) + 1);
    }
  }

  const catalogByCode = new Map();
  for (const row of Array.isArray(jlptCatalog) ? jlptCatalog : []) {
    const code = String(row?.code || '').trim().toUpperCase();
    if (code) catalogByCode.set(code, row);
  }

  const codes = [...new Set([...JLPT_LEVEL_CODES.filter((c) => catalogByCode.has(c) || counts.has(c)), ...counts.keys()])]
    .sort((a, b) => (JLPT_ORDER.get(a) ?? 99) - (JLPT_ORDER.get(b) ?? 99) || a.localeCompare(b));

  const levels = codes.map((code) => ({
    code,
    id: catalogByCode.get(code)?.id ?? null,
    description: catalogByCode.get(code)?.description ?? '',
    count: counts.get(code) || 0,
    practicedCount: practicedCounts.get(code) || 0,
  }));

  return {
    total: list.length,
    practiced: list.filter((item) => item.practiced).length,
    mastered: list.filter((item) => item.mastered).length,
    dueCount: list.filter((item) => item.isDueForWriting).length,
    levels,
  };
}

export function computeWritingScore(totalMistakes = 0, strokeCount = 1) {
  const totalStrokeCount = Math.max(1, Number(strokeCount) || 1);
  const mistakes = Math.max(0, Number(totalMistakes) || 0);
  const score = Math.max(0, Math.min(100, 100 - mistakes * 10));
  const correctStrokeCount = Math.max(0, totalStrokeCount - Math.min(totalStrokeCount, mistakes));
  return {
    score,
    correctStrokeCount,
    totalStrokeCount,
    totalMistakes: mistakes,
  };
}
