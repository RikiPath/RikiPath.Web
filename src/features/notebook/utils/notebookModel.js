// Pure domain & codec utilities for RikiPath Smart Learning Notebook (V6.5).
// Compatible with RikiPath.Backend (LearnerNote + LearnerNoteEntry) and RikiPath.Mobile.
//
// Folder -> Note Page mapping:
//   - Backend stores LearnerNote { id, name, description, entryCount, createdAt }.
//   - Mobile displays `name` and optional plain-text `description`.
//   - Web supports Folder hierarchy in two ways so Mobile stays 100% readable:
//       1) `Name` formatted as `"Folder :: Note Page"` (or plain `"Note Page"` inside Default Folder `"Sổ tay chung"`), OR
//       2) Structured metadata footer in `Description`: `Plain description\n<!--rp-nb:{"folder":"JLPT N4","tags":["N4"],"favorite":true,"body":"..."}-->`
//   - When saving/updating from Web, we keep `Name` clean (or `"Folder / NoteTitle"` if folder is custom) and store rich page blocks/metadata safely.
//
// Entry metadata codec:
//   - Backend stores LearnerNoteEntry { noteEntryId, reviewCardId, vocabularyId, kanjiId, contentType, term, reading, meaning, note, addedAt }.
//   - `note` can hold plain personal notes (Mobile & Web) plus an optional JSON metadata trailer:
//     `Personal note text\n<!--rp-entry:{"kind":"highlight","color":"rose","sourcePath":"/lesson-player/?lessonId=12","sourceTitle":"Bài 3","contentId":"lesson-12","contentVersion":"v1","prefix":"...","suffix":"...","tags":["N4"]}-->`
//   - This keeps `note` human-readable in Mobile while preserving rich Web highlight/source/tag metadata in PostgreSQL via Backend API.

const NOTE_META_MARKER = '<!--rp-nb:';
const ENTRY_META_MARKER = '<!--rp-entry:';
const META_END = '-->';

export const DEFAULT_FOLDER_NAME = 'Sổ tay chung';

export const HIGHLIGHT_COLORS = [
  {
    id: 'rose',
    label: 'Hồng Sakura',
    bgClass: 'bg-[#FCE8EF]',
    borderClass: 'border-[#F2B8CB]',
    textClass: 'text-[#8C2D4B]',
    dotClass: 'bg-[#E05A7A]',
    markBg: '#FCE8EF',
    markBorder: '#E89AB4',
  },
  {
    id: 'amber',
    label: 'Vàng nắng',
    bgClass: 'bg-[#FEF5D9]',
    borderClass: 'border-[#F5D47A]',
    textClass: 'text-[#7C520B]',
    dotClass: 'bg-[#E4A020]',
    markBg: '#FEF3C7',
    markBorder: '#F2C968',
  },
  {
    id: 'mint',
    label: 'Xanh Mint',
    bgClass: 'bg-[#E6F8EF]',
    borderClass: 'border-[#9EE2C0]',
    textClass: 'text-[#0F5E38]',
    dotClass: 'bg-[#16A34A]',
    markBg: '#E6F8EF',
    markBorder: '#8AD9B3',
  },
  {
    id: 'sky',
    label: 'Xanh Lam',
    bgClass: 'bg-[#EAF3FF]',
    borderClass: 'border-[#A8CCFA]',
    textClass: 'text-[#1E4E8C]',
    dotClass: 'bg-[#3B82F6]',
    markBg: '#EAF3FF',
    markBorder: '#9EC5F8',
  },
];

export const NOTEBOOK_CONTENT_KINDS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'grammar', label: 'Ngữ pháp' },
  { id: 'kanji', label: 'Hán tự' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'note', label: 'Ghi chú' },
];

export function getHighlightColorMeta(colorId) {
  return HIGHLIGHT_COLORS.find((c) => c.id === colorId) || HIGHLIGHT_COLORS[0];
}

/**
 * Sanitize user-entered rich note text to prevent XSS while preserving safe formatting lines.
 */
export function sanitizeNotebookText(input) {
  if (input == null) return '';
  return String(input)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '')
    .trim();
}

export function sanitizeInternalRoutePath(pathInput) {
  const s = sanitizeNotebookText(pathInput);
  if (!s) return '';
  if (!s.startsWith('/') || s.startsWith('//')) return '';
  return s;
}

/**
 * Parse a LearnerNote DTO `{ id, name, description, entryCount, createdAt }`
 * into a structured Note Page with Folder, Title, Tags, Favorite, and Rich Body.
 */
export function parseNotebookList(rawList) {
  if (!rawList) return null;
  const rawName = String(rawList.name || '').trim();
  const rawDesc = String(rawList.description || '');

  let plainDesc = rawDesc;
  let meta = {};

  const markerIdx = rawDesc.indexOf(NOTE_META_MARKER);
  if (markerIdx >= 0) {
    const endIdx = rawDesc.indexOf(META_END, markerIdx);
    if (endIdx > markerIdx) {
      plainDesc = rawDesc.slice(0, markerIdx).trim();
      const jsonStr = rawDesc.slice(markerIdx + NOTE_META_MARKER.length, endIdx);
      try {
        meta = JSON.parse(jsonStr) || {};
      } catch {
        meta = {};
      }
    }
  }

  // Folder can also be encoded as "Folder :: Note Title" in Name
  let folder = meta.folder ? String(meta.folder).trim() : '';
  let title = rawName;
  if (rawName.includes('::')) {
    const parts = rawName.split('::');
    const left = parts[0].trim();
    const right = parts.slice(1).join('::').trim();
    if (left && right) {
      if (!folder) folder = left;
      title = right;
    }
  }

  if (!folder) folder = DEFAULT_FOLDER_NAME;
  if (!title) title = rawName || 'Trang ghi chú';

  const tags = Array.isArray(meta.tags)
    ? meta.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return {
    id: rawList.id,
    rawName,
    title,
    folder,
    summary: plainDesc,
    body: typeof meta.body === 'string' ? meta.body : plainDesc,
    tags,
    favorite: Boolean(meta.favorite),
    sourcePath: meta.sourcePath || '',
    sourceTitle: meta.sourceTitle || '',
    entryCount: Number(rawList.entryCount) || 0,
    createdAt: rawList.createdAt || null,
    updatedAt: meta.updatedAt || rawList.createdAt || null,
  };
}

/**
 * Serialize a Note Page back into `{ name, description }` for Backend `POST/PUT /api/Notebook/lists`.
 */
export function serializeNotebookList({
  title,
  folder = DEFAULT_FOLDER_NAME,
  summary = '',
  body = '',
  tags = [],
  favorite = false,
  sourcePath = '',
  sourceTitle = '',
}) {
  const cleanTitle = sanitizeNotebookText(title) || 'Trang ghi chú';
  const cleanFolder = sanitizeNotebookText(folder) || DEFAULT_FOLDER_NAME;
  const cleanSummary = sanitizeNotebookText(summary);
  const cleanBody = sanitizeNotebookText(body);

  const name = cleanFolder && cleanFolder !== DEFAULT_FOLDER_NAME
    ? `${cleanFolder} :: ${cleanTitle}`
    : cleanTitle;

  const meta = {
    folder: cleanFolder,
    tags: Array.isArray(tags) ? tags.map((t) => sanitizeNotebookText(t)).filter(Boolean) : [],
    favorite: Boolean(favorite),
    body: cleanBody,
    sourcePath: sanitizeInternalRoutePath(sourcePath),
    sourceTitle: sanitizeNotebookText(sourceTitle),
    updatedAt: new Date().toISOString(),
  };

  const description = cleanSummary
    ? `${cleanSummary}\n${NOTE_META_MARKER}${JSON.stringify(meta)}${META_END}`
    : `${NOTE_META_MARKER}${JSON.stringify(meta)}${META_END}`;

  return {
    name: name.slice(0, 200),
    description,
  };
}

/**
 * Parse a Backend `NotebookEntryResponse` into an enriched Smart Notebook Entry.
 */
export function parseNotebookEntry(rawEntry, listId = null) {
  if (!rawEntry) return null;
  const rawNote = String(rawEntry.note || '');
  let personalNote = rawNote;
  let meta = {};

  const markerIdx = rawNote.indexOf(ENTRY_META_MARKER);
  if (markerIdx >= 0) {
    const endIdx = rawNote.indexOf(META_END, markerIdx);
    if (endIdx > markerIdx) {
      personalNote = rawNote.slice(0, markerIdx).trim();
      const jsonStr = rawNote.slice(markerIdx + ENTRY_META_MARKER.length, endIdx);
      try {
        meta = JSON.parse(jsonStr) || {};
      } catch {
        meta = {};
      }
    }
  }

  // Determine high-level kind: vocabulary | kanji | grammar | highlight | note
  let kind = meta.kind || rawEntry.contentType || 'vocabulary';
  if (rawEntry.vocabularyId) kind = 'vocabulary';
  else if (rawEntry.kanjiId) kind = 'kanji';
  else if (!meta.kind && rawEntry.contentType === 'manual') {
    kind = 'vocabulary';
  }

  const highlightColor = meta.color || 'rose';
  const tags = Array.isArray(meta.tags)
    ? meta.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return {
    noteEntryId: rawEntry.noteEntryId,
    learnerNoteId: listId ?? rawEntry.learnerNoteId ?? null,
    reviewCardId: rawEntry.reviewCardId ?? null,
    hasSrs: Boolean(rawEntry.reviewCardId && rawEntry.reviewCardId > 0),
    vocabularyId: rawEntry.vocabularyId ?? null,
    kanjiId: rawEntry.kanjiId ?? null,
    grammarPatternId: meta.grammarPatternId ?? null,
    contentType: rawEntry.contentType || 'manual',
    kind,
    term: String(rawEntry.term || '').trim(),
    reading: rawEntry.reading ? String(rawEntry.reading).trim() : '',
    meaning: String(rawEntry.meaning || '').trim(),
    personalNote,
    example: meta.example ? String(meta.example).trim() : '',
    exampleMeaning: meta.exampleMeaning ? String(meta.exampleMeaning).trim() : '',
    color: highlightColor,
    tags,
    favorite: Boolean(meta.favorite),
    sourcePath: meta.sourcePath || '',
    sourceTitle: meta.sourceTitle || '',
    contentId: meta.contentId || '',
    contentVersion: meta.contentVersion || '',
    anchorPrefix: meta.prefix || '',
    anchorSuffix: meta.suffix || '',
    addedAt: rawEntry.addedAt || null,
  };
}

/**
 * Serialize personal note + contextual metadata into Backend `Note` field.
 */
export function serializeEntryNote({
  personalNote = '',
  kind = 'vocabulary',
  color = 'rose',
  example = '',
  exampleMeaning = '',
  tags = [],
  favorite = false,
  sourcePath = '',
  sourceTitle = '',
  contentId = '',
  contentVersion = '',
  anchorPrefix = '',
  anchorSuffix = '',
  grammarPatternId = null,
} = {}) {
  const cleanNote = sanitizeNotebookText(personalNote);
  const meta = {
    kind,
    color,
    ...(example ? { example: sanitizeNotebookText(example) } : {}),
    ...(exampleMeaning ? { exampleMeaning: sanitizeNotebookText(exampleMeaning) } : {}),
    ...(Array.isArray(tags) && tags.length > 0
      ? { tags: tags.map((t) => sanitizeNotebookText(t)).filter(Boolean) }
      : {}),
    ...(favorite ? { favorite: true } : {}),
    ...(sourcePath ? { sourcePath: sanitizeInternalRoutePath(sourcePath) } : {}),
    ...(sourceTitle ? { sourceTitle: sanitizeNotebookText(sourceTitle) } : {}),
    ...(contentId ? { contentId: sanitizeNotebookText(contentId) } : {}),
    ...(contentVersion ? { contentVersion: sanitizeNotebookText(contentVersion) } : {}),
    ...(anchorPrefix ? { prefix: String(anchorPrefix).slice(-48) } : {}),
    ...(anchorSuffix ? { suffix: String(anchorSuffix).slice(0, 48) } : {}),
    ...(grammarPatternId ? { grammarPatternId: Number(grammarPatternId) } : {}),
  };

  const encodedMeta = `${ENTRY_META_MARKER}${JSON.stringify(meta)}${META_END}`;
  return cleanNote ? `${cleanNote}\n${encodedMeta}` : encodedMeta;
}

/**
 * Group parsed Note Pages by folder name.
 */
export function groupNotePagesByFolder(notePages = [], extraFolders = []) {
  const folderMap = new Map();
  folderMap.set(DEFAULT_FOLDER_NAME, []);

  for (const f of extraFolders) {
    const clean = sanitizeNotebookText(f);
    if (clean && !folderMap.has(clean)) folderMap.set(clean, []);
  }

  for (const page of notePages) {
    const folder = page.folder || DEFAULT_FOLDER_NAME;
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder).push(page);
  }

  return [...folderMap.entries()].map(([name, pages]) => ({
    name,
    pages: pages.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
    }),
    totalEntries: pages.reduce((acc, p) => acc + (p.entryCount || 0), 0),
  }));
}

/**
 * Classify a selected text snippet into a suggested Notebook kind ('vocabulary' | 'kanji' | 'grammar' | 'highlight').
 */
export function suggestKindForSelection(selectedText = '', contextHint = '') {
  const text = String(selectedText || '').trim();
  if (!text) return 'note';
  if (contextHint === 'kanji' || (/^[\u4e00-\u9faf]$/.test(text) && text.length === 1)) {
    return 'kanji';
  }
  if (contextHint === 'grammar' || text.startsWith('〜') || text.startsWith('~')) {
    return 'grammar';
  }
  if (text.length <= 18 && !/[。！？.!?\n]/.test(text)) {
    return 'vocabulary';
  }
  return 'highlight';
}

/**
 * Compute a stable content version hash (FNV-1a 32-bit hex) for a text block so highlight re-anchoring
 * can detect when lesson content was modified and avoid highlighting the wrong words.
 */
export function computeContentVersionHash(text = '') {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `v-${(hash >>> 0).toString(16)}`;
}

/**
 * Verify if a saved highlight entry reliably matches a target text block.
 * Returns `{ matched: boolean, staleVersion: boolean, index: number, length: number }`.
 */
export function matchHighlightAnchorInText(fullText = '', highlightEntry = {}) {
  const source = String(fullText || '');
  const quote = String(highlightEntry?.term || '').trim();
  if (!source || !quote) {
    return { matched: false, staleVersion: false, index: -1, length: 0 };
  }

  const currentVersion = computeContentVersionHash(source);
  const versionDiffers = Boolean(
    highlightEntry.contentVersion &&
    highlightEntry.contentVersion !== currentVersion
  );

  const prefix = String(highlightEntry.anchorPrefix || '');
  const suffix = String(highlightEntry.anchorSuffix || '');

  // Try exact contextual match (prefix + quote + suffix) first
  if (prefix || suffix) {
    const pattern = `${prefix}${quote}${suffix}`;
    const ctxIdx = source.indexOf(pattern);
    if (ctxIdx >= 0) {
      return {
        matched: true,
        staleVersion: false,
        index: ctxIdx + prefix.length,
        length: quote.length,
      };
    }
  }

  // Fallback: direct quote search if unique or if version matches
  const firstIdx = source.indexOf(quote);
  if (firstIdx < 0) {
    return {
      matched: false,
      staleVersion: versionDiffers,
      index: -1,
      length: 0,
    };
  }

  const secondIdx = source.indexOf(quote, firstIdx + 1);
  if (secondIdx >= 0 && versionDiffers && (prefix || suffix)) {
    // Ambiguous duplicate occurrence after content edit -> mark stale rather than highlight wrong word
    return {
      matched: false,
      staleVersion: true,
      index: -1,
      length: 0,
    };
  }

  return {
    matched: true,
    staleVersion: false,
    index: firstIdx,
    length: quote.length,
  };
}

/**
 * Determine whether a pathname allows Contextual Text Selection Capture & Floating Notebook.
 * Explicitly blocks timed exams / placement exams / mock tests when in active exam policy mode.
 */
export function isNotebookCaptureSupportedOnPath(pathname = '') {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  // Exam policy: never allow notebook capture during active placement exam or timed mock test taking
  if (
    clean.startsWith('/placement/exam') ||
    clean.startsWith('/placement-test') ||
    clean.startsWith('/app/placement-test') ||
    clean.startsWith('/thi-thu')
  ) {
    return { bubbleAllowed: false, selectionAllowed: false, reason: 'exam-policy' };
  }

  const selectionPaths = [
    '/lessons',
    '/lesson-player',
    '/lesson-practice',
    '/roadmap',
    '/vocabulary',
    '/vocabulary-detail',
    '/grammar',
    '/kanji-writing',
    '/kanji-notebook',
    '/riki/listening',
    '/riki/reading',
    '/riki/essay',
    '/sentence-studio',
    '/ai-scoring',
    '/daily-srs',
    '/exam-result',
    '/homework',
    '/my-courses',
  ];

  const selectionAllowed = selectionPaths.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );

  return {
    bubbleAllowed: true,
    selectionAllowed,
    reason: selectionAllowed ? 'supported' : 'workspace-only',
  };
}
