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
    id: 'yellow',
    label: 'Vàng',
    bgClass: 'bg-[#FFF7DC]',
    borderClass: 'border-[#F6D56D]',
    textClass: 'text-[#7C520B]',
    dotClass: 'bg-[#F6D56D]',
    markBg: 'rgba(246, 213, 109, 0.44)',
    markBorder: '#D4A72C',
    hex: '#F6D56D',
  },
  {
    id: 'mint',
    label: 'Xanh Mint',
    bgClass: 'bg-[#E6F8EF]',
    borderClass: 'border-[#8EDAC4]',
    textClass: 'text-[#0F5E38]',
    dotClass: 'bg-[#8EDAC4]',
    markBg: 'rgba(142, 218, 196, 0.42)',
    markBorder: '#3EAB8D',
    hex: '#8EDAC4',
  },
  {
    id: 'sakura',
    label: 'Hồng Sakura',
    bgClass: 'bg-[#FCE8EF]',
    borderClass: 'border-[#F5A9C4]',
    textClass: 'text-[#8C2D4B]',
    dotClass: 'bg-[#F5A9C4]',
    markBg: 'rgba(245, 169, 196, 0.42)',
    markBorder: '#DB6B93',
    hex: '#F5A9C4',
  },
];

const LEGACY_COLOR_MAP = {
  amber: 'yellow',
  rose: 'sakura',
  sky: 'mint',
  pink: 'sakura',
  green: 'mint',
};

export function normalizeHighlightColorId(colorId) {
  const key = String(colorId || '').trim().toLowerCase();
  const mapped = LEGACY_COLOR_MAP[key] || key;
  return HIGHLIGHT_COLORS.some((c) => c.id === mapped) ? mapped : 'yellow';
}

export const NOTEBOOK_CONTENT_KINDS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'vocabulary', label: 'Từ vựng' },
  { id: 'grammar', label: 'Ngữ pháp' },
  { id: 'kanji', label: 'Hán tự' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'note', label: 'Ghi chú' },
  { id: 'manual', label: 'Tự ghi' },
];

export function getEntryKindLabel(kind = 'manual') {
  const clean = String(kind || 'manual').trim().toLowerCase();
  const match = NOTEBOOK_CONTENT_KINDS.find((k) => k.id === clean);
  return match ? match.label : 'Ghi chú';
}

const ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'bullet_item',
  'ordered_item',
  'checklist_item',
  'quote',
]);

let blockUidSeq = 1;
export function nextBlockId(prefix = 'b') {
  blockUidSeq += 1;
  return `${prefix}${Date.now().toString(36)}${blockUidSeq}`;
}

export function sanitizePlainFragment(input) {
  if (input == null) return '';
  return String(input)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '');
}

export function createEmptyRichDoc() {
  return {
    type: 'doc',
    version: 1,
    blocks: [{ id: nextBlockId(), type: 'paragraph', runs: [] }],
  };
}

function normalizeRuns(runsInput) {
  if (!Array.isArray(runsInput)) return [];
  const merged = [];
  for (const r of runsInput) {
    if (!r || typeof r !== 'object') continue;
    const text = sanitizePlainFragment(r.text ?? '');
    if (!text) continue;
    const bold = Boolean(r.bold);
    const italic = Boolean(r.italic);
    const highlight = r.highlight
      ? (r.highlight === true ? 'yellow' : normalizeHighlightColorId(r.highlight))
      : null;

    const prev = merged[merged.length - 1];
    if (prev && prev.bold === bold && prev.italic === italic && (prev.highlight || null) === highlight) {
      prev.text += text;
    } else {
      const next = { text };
      if (bold) next.bold = true;
      if (italic) next.italic = true;
      if (highlight) next.highlight = highlight;
      merged.push(next);
    }
  }
  return merged;
}

function legacyLineToBlock(line, index) {
  const cleanLine = sanitizePlainFragment(String(line || '').replace(/\r/g, ''));
  const id = `legacy_${index + 1}`;
  if (cleanLine.startsWith('### ')) {
    return { id, type: 'heading', level: 3, runs: cleanLine.slice(4) ? [{ text: cleanLine.slice(4) }] : [] };
  }
  if (cleanLine.startsWith('## ')) {
    return { id, type: 'heading', level: 2, runs: cleanLine.slice(3) ? [{ text: cleanLine.slice(3) }] : [] };
  }
  if (cleanLine.startsWith('# ')) {
    return { id, type: 'heading', level: 1, runs: cleanLine.slice(2) ? [{ text: cleanLine.slice(2) }] : [] };
  }
  if (/^(-\s+)?\[x\]\s/i.test(cleanLine)) {
    const body = cleanLine.replace(/^(-\s+)?\[x\]\s/i, '');
    return { id, type: 'checklist_item', checked: true, runs: body ? [{ text: body }] : [] };
  }
  if (/^(-\s+)?\[\s?\]\s/.test(cleanLine)) {
    const body = cleanLine.replace(/^(-\s+)?\[\s?\]\s/, '');
    return { id, type: 'checklist_item', checked: false, runs: body ? [{ text: body }] : [] };
  }
  if (/^[-*]\s+/.test(cleanLine)) {
    const body = cleanLine.slice(2);
    return { id, type: 'bullet_item', runs: body ? [{ text: body }] : [] };
  }
  if (/^\d+\.\s+/.test(cleanLine)) {
    const body = cleanLine.replace(/^\d+\.\s+/, '');
    return { id, type: 'ordered_item', runs: body ? [{ text: body }] : [] };
  }
  if (cleanLine.startsWith('> ')) {
    const body = cleanLine.slice(2);
    return { id, type: 'quote', runs: body ? [{ text: body }] : [] };
  }
  return { id, type: 'paragraph', runs: cleanLine ? [{ text: cleanLine }] : [] };
}

export function normalizeRichDocument(docInput, { ensureNonEmpty = true } = {}) {
  if (!docInput) {
    return ensureNonEmpty ? createEmptyRichDoc() : { type: 'doc', version: 1, blocks: [] };
  }
  if (typeof docInput === 'string') {
    const trimmed = docInput.trim();
    if (!trimmed) {
      return ensureNonEmpty ? createEmptyRichDoc() : { type: 'doc', version: 1, blocks: [] };
    }
    if (trimmed.startsWith('{')) {
      try {
        return normalizeRichDocument(JSON.parse(trimmed), { ensureNonEmpty });
      } catch {
        // Fallback to plain line parsing below.
      }
    }
    const lines = trimmed.split(/\r?\n/);
    const blocks = lines.map((line, idx) => legacyLineToBlock(line, idx));
    return {
      type: 'doc',
      version: 1,
      blocks: blocks.length > 0 || !ensureNonEmpty ? blocks : [{ id: nextBlockId(), type: 'paragraph', runs: [] }],
    };
  }

  const rawBlocks = Array.isArray(docInput?.blocks) ? docInput.blocks : [];
  const cleanBlocks = rawBlocks.slice(0, 500).map((b, idx) => {
    const type = ALLOWED_BLOCK_TYPES.has(b?.type) ? b.type : 'paragraph';
    const runs = Array.isArray(b?.runs)
      ? normalizeRuns(b.runs)
      : (typeof b?.text === 'string' && b.text ? [{ text: sanitizePlainFragment(b.text) }] : []);
    const block = {
      id: typeof b?.id === 'string' && b.id.trim() ? sanitizePlainFragment(b.id).slice(0, 48) : `b_${idx + 1}`,
      type,
      runs,
    };
    if (type === 'heading') {
      const lvl = Number(b?.level);
      block.level = lvl >= 1 && lvl <= 3 ? Math.trunc(lvl) : 2;
    }
    if (type === 'checklist_item') {
      block.checked = Boolean(b?.checked);
    }
    return block;
  });

  if (cleanBlocks.length === 0 && ensureNonEmpty) {
    cleanBlocks.push({ id: nextBlockId(), type: 'paragraph', runs: [] });
  }

  return { type: 'doc', version: 1, blocks: cleanBlocks };
}

export function serializeRichDocument(docInput) {
  const normalized = normalizeRichDocument(docInput, { ensureNonEmpty: false });
  return JSON.stringify(normalized);
}

export function countChecklistInDoc(docInput) {
  const doc = normalizeRichDocument(docInput, { ensureNonEmpty: false });
  let total = 0;
  let completed = 0;
  for (const b of doc.blocks) {
    if (b.type === 'checklist_item') {
      total += 1;
      if (b.checked) completed += 1;
    }
  }
  return { total, completed };
}

export function extractPlainTextFromDoc(docInput) {
  const doc = normalizeRichDocument(docInput, { ensureNonEmpty: false });
  return doc.blocks
    .map((b) => b.runs.map((r) => r.text).join(''))
    .filter((line) => line.length > 0)
    .join('\n');
}

export function mapSavedItemDto(raw) {
  if (!raw) return null;
  const kind = String(raw.itemKind || raw.contentType || 'manual').toLowerCase();
  const color = raw.highlightColor ? normalizeHighlightColorId(raw.highlightColor) : null;
  return {
    noteEntryId: raw.noteEntryId,
    learnerNoteId: raw.learnerNoteId,
    fileName: raw.fileName || '',
    notebookPageId: raw.notebookPageId ?? null,
    notebookPageTitle: raw.notebookPageTitle || raw.fileName || '',
    folderId: raw.folderId ?? null,
    folderName: raw.folderName || DEFAULT_FOLDER_NAME,
    reviewCardId: raw.reviewCardId ?? null,
    hasSrs: Boolean(raw.reviewCardId),
    vocabularyId: raw.vocabularyId ?? null,
    kanjiId: raw.kanjiId ?? null,
    grammarPatternId: raw.grammarPatternId ?? null,
    contentType: raw.contentType || kind,
    kind,
    term: raw.term || '',
    reading: raw.reading || '',
    meaning: raw.meaning || '',
    personalNote: raw.note || '',
    note: raw.note || '',
    color: color || 'sakura',
    highlightColor: color,
    sourceType: raw.sourceType || '',
    sourceId: raw.sourceId ?? null,
    sourcePath: sanitizeInternalRoutePath(raw.sourcePath || ''),
    sourceTitle: raw.sourceTitle || '',
    contextSnippet: raw.contextSnippet || '',
    example: raw.exampleSentence || '',
    exampleSentence: raw.exampleSentence || '',
    exampleMeaning: raw.exampleMeaning || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    favorite: Boolean(raw.isFavorite),
    isFavorite: Boolean(raw.isFavorite),
    revision: raw.revision ?? 1,
    addedAt: raw.addedAt || null,
    modifiedDate: raw.modifiedDate || raw.addedAt || null,
    isAlreadyExisting: Boolean(raw.isAlreadyExisting),
  };
}

export function getHighlightColorMeta(colorId) {
  const normalized = normalizeHighlightColorId(colorId);
  return HIGHLIGHT_COLORS.find((c) => c.id === normalized) || HIGHLIGHT_COLORS[0];
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

  const highlightColor = normalizeHighlightColorId(meta.color || 'yellow');
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
  color = 'yellow',
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
    color: normalizeHighlightColorId(color),
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
  const quote = String(highlightEntry?.selectedText || highlightEntry?.term || '').trim();
  if (!source || !quote) {
    return { matched: false, staleVersion: false, index: -1, length: 0 };
  }

  const expectedHash = highlightEntry.contentVersionHash || highlightEntry.contentVersion;
  const currentVersion = computeContentVersionHash(source);
  const versionDiffers = Boolean(expectedHash && expectedHash !== currentVersion);

  const prefix = String(highlightEntry.anchorPrefix || '');
  const suffix = String(highlightEntry.anchorSuffix || '');

  // Prefer the saved offset while the content version still matches.
  if (!versionDiffers && typeof highlightEntry.startOffset === 'number' && highlightEntry.startOffset >= 0) {
    const atOffset = source.slice(highlightEntry.startOffset, highlightEntry.startOffset + quote.length);
    if (atOffset === quote) {
      return { matched: true, staleVersion: false, index: highlightEntry.startOffset, length: quote.length };
    }
  }

  // Re-anchor edited content only if the whole context identifies one occurrence.
  if (prefix || suffix) {
    const pattern = `${prefix}${quote}${suffix}`;
    const ctxIdx = source.indexOf(pattern);
    if (ctxIdx >= 0 && source.indexOf(pattern, ctxIdx + 1) < 0) {
      return {
        matched: true,
        staleVersion: false,
        index: ctxIdx + prefix.length,
        length: quote.length,
      };
    }
  }

  // Anchored entries must not jump to a different occurrence when their source changes.
  if (prefix || suffix || highlightEntry.startOffset != null || expectedHash) {
    return { matched: false, staleVersion: versionDiffers, index: -1, length: 0 };
  }

  // Legacy entries without anchors may only match a unique occurrence.
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
  if (secondIdx >= 0) {
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

export function isActiveExamAttemptInDom() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[data-exam-attempt-active="true"]'));
}

/**
 * Determine whether a pathname allows Contextual Text Selection Capture & Floating Notebook.
 * Explicitly blocks timed exams / placement exams / mock tests when in active exam policy mode.
 */
export function isNotebookCaptureSupportedOnPath(pathname = '') {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  if (
    clean.startsWith('/placement/exam') ||
    clean.startsWith('/placement-exam') ||
    clean.startsWith('/placement-test') ||
    clean.startsWith('/app/placement-test') ||
    clean.startsWith('/mock-test') ||
    clean.startsWith('/mock-tests') ||
    clean.startsWith('/exam-n3') ||
    clean.startsWith('/thi-thu')
  ) {
    return { bubbleAllowed: false, selectionAllowed: false, reason: 'exam-policy' };
  }

  const selectionPaths = [
    '/lessons',
    '/lesson-player',
    '/lesson-practice',
    '/roadmap',
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

/**
 * Resolve the file a new page belongs to without asking the learner to pick it again:
 * 1. the file that is open/selected in the workspace (context), else
 * 2. the learner's default file of "Sổ tay chung".
 * Never falls back to an arbitrary file; returns null so the UI can guide the learner instead.
 */
export function resolveCreatePageTargetFile({ contextFileId, allFiles = [] }) {
  if (contextFileId) {
    const ctx = allFiles.find((f) => f.id === Number(contextFileId));
    if (ctx) return ctx;
  }
  return allFiles.find((f) => f.isDefault) || null;
}

/**
 * Locate an entity of `level` inside the Notebook V3 tree and return its ancestors.
 * Pure helper: ids are always the real backend ids; names are display-only.
 */
export function findNotebookLocation(folders = [], level, id) {
  if (id == null || id === '') return null;
  const target = Number(id);
  for (const folder of folders) {
    if (level === 'folder' && folder.id === target) return { folder, file: null, page: null };
    for (const file of folder.files || []) {
      if (level === 'file' && file.id === target) return { folder, file, page: null };
      if (level === 'page') {
        const page = (file.pages || []).find((p) => p.id === target);
        if (page) return { folder, file, page };
      }
    }
  }
  return null;
}
