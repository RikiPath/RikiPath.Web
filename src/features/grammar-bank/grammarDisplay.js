/**
 * Grammar Bank display helpers (pure, no React).
 *
 * Published GrammarPattern data has one `Title` that usually combines a Vietnamese name and the Japanese pattern
 * ("Đúng như kỳ vọng ～に違いない", "Trợ từ sở hữu の") and sometimes holds only the pattern ("N1 は N2 です").
 * There is no separate "meaning" column. These helpers only SPLIT the existing text for a two-line presentation;
 * they never invent or translate anything.
 */

// Hiragana, Katakana (incl. half-width), CJK ideographs, the wave dash forms used for "～", Japanese punctuation.
const JAPANESE_CHAR = /[\u3000-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uff5e\u301c\uff66-\uff9f]/;
// Vietnamese-only letters (diacritics) — a prefix without them (e.g. "N1 ") is part of the pattern, not a name.
const VIETNAMESE_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function hasJapanese(text) {
  return JAPANESE_CHAR.test(String(text || ''));
}

/**
 * @returns {{ pattern: string, name: string }} `pattern` = Japanese part shown as the main heading,
 *   `name` = Vietnamese name ('' when the title has none).
 */
export function splitGrammarTitle(title, structure = '') {
  const text = String(title || '').trim();
  if (!text) return { pattern: String(structure || '').trim(), name: '' };
  const index = text.search(JAPANESE_CHAR);
  if (index <= 0) return { pattern: text, name: '' };
  const prefix = text.slice(0, index).trim();
  if (!VIETNAMESE_LETTER.test(prefix)) return { pattern: text, name: '' };
  return { pattern: text.slice(index).trim(), name: prefix };
}

/**
 * Structure tokens for selective highlighting: "N1 + は + N2 + です" →
 * [{text:'N1', jp:false}, {text:'+', sep:true}, {text:'は', jp:true}, …]. Japanese tokens get the accent colour,
 * placeholders (N1, Thể thông thường) stay neutral.
 */
export function structureTokens(structure) {
  return String(structure || '')
    .split(/(\s*\+\s*)/)
    .filter((part) => part !== '')
    .map((part) => (/^\s*\+\s*$/.test(part)
      ? { text: '+', sep: true }
      // Accent only for the Japanese piece itself; mixed placeholders ("V／A-い (thể thông thường)") stay neutral.
      : { text: part.trim(), jp: hasJapanese(part) && !VIETNAMESE_LETTER.test(part) }));
}

/** Index-based page that contains `id` (1-based), or null when it is not in `items`. */
export function pageOfItem(items, id, pageSize) {
  const index = items.findIndex((item) => item.id === id);
  return index < 0 ? null : Math.floor(index / pageSize) + 1;
}

/* ------------------------------------------------------------------ search */

/**
 * Accent-insensitive, width-insensitive key: "Nhờ có" / "nho co" / "NHO CÓ" match; full-width "～" and "〜" fold to
 * one wave dash so "～おかげで" and "〜おかげで" are equal.
 */
export function searchKey(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/[\u301c\uff5e~]/g, '\u301c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Client-side filter over the published fields a learner can see (title, structure, usage, example, translation). */
export function matchesGrammar(item, query) {
  const key = searchKey(query);
  if (!key) return true;
  const haystack = searchKey([
    item.title, item.structure, item.explanation, item.exampleSentence, item.exampleSentenceMeaning,
  ].filter(Boolean).join(' '));
  return key.split(' ').every((word) => haystack.includes(word));
}

/* ------------------------------------------------------------------ structure */

/**
 * Structure is stored as one or more lines, optionally "Label: formula" (e.g. "A-な + な + おかげで",
 * "Nhóm 1: V-う → V-える (書く → 書ける)"). Legacy one-line data separated by " | " is split the same way.
 * @returns {{ label: string, formula: string }[]}
 */
export function parseStructure(structure) {
  return String(structure || '')
    .split(/\n+|\s+\|\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(':');
      const label = colon > 0 ? line.slice(0, colon).trim() : '';
      // Only a short, Japanese-free prefix is a label; "～ます: …" or a long clause stays one formula.
      if (label && label.length <= 24 && !hasJapanese(label)) {
        return { label, formula: line.slice(colon + 1).trim() };
      }
      return { label: '', formula: line };
    });
}

/* ------------------------------------------------------------------ usage notes */

const NOTE_PREFIX = /^lưu ý\s*:\s*/i;
const CONFUSION_PREFIX = /^dễ nhầm\s*:\s*/i;
const WRONG_PREFIX = /^sai\s*:\s*/i;
const RIGHT_PREFIX = /^đúng\s*:\s*/i;

/**
 * UsageNotes (one published field) uses marked lines for its sub-sections:
 *   plain paragraphs → meaning & usage · "Lưu ý:" → notes · "Dễ nhầm:" → similar grammar ·
 *   "Sai:" + "Đúng:" → common mistakes.
 * Nothing is generated: lines without a marker are shown as written.
 */
export function parseUsage(text) {
  const out = { paragraphs: [], notes: [], confusions: [], mistakes: [] };
  for (const raw of String(text || '').split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (NOTE_PREFIX.test(line)) out.notes.push(line.replace(NOTE_PREFIX, ''));
    else if (CONFUSION_PREFIX.test(line)) out.confusions.push(...parseConfusions(line.replace(CONFUSION_PREFIX, '')));
    else if (WRONG_PREFIX.test(line)) out.mistakes.push({ wrong: line.replace(WRONG_PREFIX, ''), right: '' });
    else if (RIGHT_PREFIX.test(line) && out.mistakes.length && !out.mistakes.at(-1).right) {
      out.mistakes.at(-1).right = line.replace(RIGHT_PREFIX, '');
    } else out.paragraphs.push(line);
  }
  return out;
}

/** "～せいで (kết quả xấu); ～はずだ (căn cứ khách quan)" → [{ pattern:'～せいで', note:'kết quả xấu' }, …] */
function parseConfusions(text) {
  return text.split(/\s*;\s*/).filter(Boolean).map((part) => {
    const match = part.match(/^(\S+)\s*(?:\((.*)\))?\.?$/);
    return match ? { pattern: match[1], note: (match[2] || '').trim() } : { pattern: part, note: '' };
  });
}

/**
 * Links a "Dễ nhầm" pattern to a real entry among `items` (the published list): exact pattern first, then the
 * shortest pattern that contains it. Returns null when no such entry exists — the UI then shows plain text,
 * never a link to a page that does not exist.
 */
export function findGrammarByPattern(items, pattern, excludeId) {
  const target = searchKey(pattern).replace(/^\u301c/, '');
  if (!target) return null;
  let best = null;
  for (const item of items) {
    if (item.id === excludeId) continue;
    const own = searchKey(splitGrammarTitle(item.title, item.structure).pattern).replace(/^\u301c/, '');
    if (own === target) return item;
    if (own.includes(target) && (!best || own.length < best.length)) best = { item, length: own.length };
  }
  return best?.item ?? null;
}
