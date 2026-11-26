/**
 * Shared Japanese Selection Validator, Safe Selection Extraction, and Translation Scope Guards.
 * Mirrors Backend `JapaneseTextValidator.cs` (max length = 500 chars) so Frontend & Backend
 * enforce identical rules across study content, SRS, reading, listening transcripts, and reviews.
 */

export const MAX_TRANSLATION_TEXT_LENGTH = 500;

const HIRAGANA_RE = /[\u3040-\u309F]/;
const KATAKANA_RE = /[\u30A0-\u30FF\u31F0-\u31FF\uFF66-\uFF9F\u30FC]/;
const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF々〆ヵヶ]/;
const VIETNAMESE_DIACRITIC_RE = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;
const URL_RE = /(?:https?:\/\/|www\.)\S+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// High-frequency Simplified Chinese characters absent from standard Japanese Joyo Kanji.
const SIMPLIFIED_CHINESE_UNIQUE_RE =
  /[这为国学说们个时来没里发对经动现关开点问机电车东长书买卖听见给让从进还应该边过运远连选错钟钱门间难题飞饭鱼鸟黄龙你他她它吗呢吧哪么很着过师认识试请诉谁课谈论谢议记读许证评调变资费赚赠赢买赔质赞赖赶起]/;

export function sanitizeTranslationText(raw = '') {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clones a DOM Range cleanly without altering live page DOM:
 * - Removes `<rt>`, `<rp>` (so `<ruby>電車<rt>でんしゃ</rt></ruby>` extracts as `"電車"`, not `"電車でんしゃ"`)
 * - Removes `[aria-hidden="true"]`, `[data-translate-ignore="true"]`, `<script>`, `<style>`
 * - Preserves line breaks across block elements (`P`, `DIV`, `LI`, `TR`, `BR`) in exact selection order
 */
export function extractCleanSelectionText(range) {
  if (!range || typeof range.cloneContents !== 'function') return '';
  try {
    const fragment = range.cloneContents();
    if (!fragment) return '';

    const doc = range.startContainer?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return sanitizeTranslationText(fragment.textContent || '');

    const box = doc.createElement('div');
    box.appendChild(fragment);

    const ignored = box.querySelectorAll('rt, rp, script, style, [aria-hidden="true"], [data-translate-ignore="true"]');
    for (const node of ignored) {
      node.remove();
    }

    const blockTags = new Set(['P', 'DIV', 'LI', 'TR', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    const chunks = [];
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {
        if (node.nodeValue) chunks.push(node.nodeValue);
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName?.toUpperCase();
      if (tag === 'BR') {
        chunks.push('\n');
        return;
      }
      const isBlock = blockTags.has(tag);
      if (isBlock && chunks.length > 0 && !chunks[chunks.length - 1].endsWith('\n')) {
        chunks.push('\n');
      }
      for (const child of node.childNodes) {
        walk(child);
      }
      if (isBlock && chunks.length > 0 && !chunks[chunks.length - 1].endsWith('\n')) {
        chunks.push('\n');
      }
    };

    walk(box);
    return sanitizeTranslationText(chunks.join(''));
  } catch {
    return sanitizeTranslationText(range.toString?.() || '');
  }
}

export function analyzeScriptStats(text) {
  let hiragana = 0;
  let katakana = 0;
  let kanji = 0;
  let latin = 0;
  let digits = 0;
  let vietnamese = 0;
  let simplifiedChineseOnly = 0;

  for (const ch of text) {
    if (HIRAGANA_RE.test(ch)) {
      hiragana += 1;
    } else if (KATAKANA_RE.test(ch)) {
      katakana += 1;
    } else if (KANJI_RE.test(ch)) {
      kanji += 1;
      if (SIMPLIFIED_CHINESE_UNIQUE_RE.test(ch)) simplifiedChineseOnly += 1;
    } else if ((ch >= '0' && ch <= '9') || (ch >= '\uFF10' && ch <= '\uFF19')) {
      digits += 1;
    } else if (VIETNAMESE_DIACRITIC_RE.test(ch)) {
      vietnamese += 1;
      latin += 1;
    } else if (/[\p{L}]/u.test(ch) && ch.charCodeAt(0) <= 0x024f) {
      latin += 1;
    }
  }

  const kana = hiragana + katakana;
  const totalJapanese = kana + kanji;
  return {
    hiragana,
    katakana,
    kana,
    kanji,
    totalJapanese,
    latin,
    digits,
    vietnamese,
    simplifiedChineseOnly,
  };
}

/**
 * Validates whether a selected text string should activate Japanese -> Vietnamese translation.
 * Returns `{ valid, reason, text, isSingleKanji, isShortLookup, stats }`.
 */
export function validateJapaneseSelection(rawText, { maxLength = MAX_TRANSLATION_TEXT_LENGTH } = {}) {
  const text = sanitizeTranslationText(rawText);
  if (!text) {
    return { valid: false, reason: 'empty', text: '', stats: null };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      reason: 'too-long',
      text,
      length: text.length,
      maxLength,
      stats: analyzeScriptStats(text),
    };
  }

  const stats = analyzeScriptStats(text);

  if (EMAIL_RE.test(text) || (URL_RE.test(text) && stats.totalJapanese === 0)) {
    return { valid: false, reason: 'url-or-email', text, stats };
  }

  if (stats.totalJapanese === 0) {
    return { valid: false, reason: 'non-japanese', text, stats };
  }

  // Isolated single Hiragana or Katakana character (no Kanji, no other characters) lacks word context.
  if (stats.kana === 1 && stats.kanji === 0 && stats.latin === 0 && stats.digits === 0) {
    return { valid: false, reason: 'single-kana', text, stats };
  }

  // Reject text with Vietnamese diacritics unless Japanese strongly dominates (e.g. a quote inside a sentence).
  if (stats.vietnamese > 0 && stats.totalJapanese < Math.max(4, stats.latin * 2)) {
    return { valid: false, reason: 'non-japanese', text, stats };
  }

  // Pure Kanji with zero Kana: reject if Simplified-Chinese-only characters are detected.
  if (stats.kana === 0 && stats.simplifiedChineseOnly > 0) {
    return { valid: false, reason: 'non-japanese', text, stats };
  }

  const substantive = stats.totalJapanese + stats.latin;
  if (substantive > 0 && stats.totalJapanese / substantive < 0.3) {
    return { valid: false, reason: 'non-japanese', text, stats };
  }

  return {
    valid: true,
    reason: null,
    text,
    isSingleKanji: stats.kanji === 1 && stats.kana === 0 && stats.latin === 0,
    isShortLookup: text.length <= 30,
    stats,
  };
}

/**
 * Determines whether a DOM node lives inside a forbidden chrome/input/exam area for selection translation.
 */
export function isNodeBlockedForTranslation(node) {
  if (!node) return true;
  let el = node.nodeType === 1 ? node : node.parentElement;
  while (el) {
    const tag = el.tagName?.toUpperCase();
    const role = el.getAttribute?.('role');
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      tag === 'OPTION' ||
      tag === 'BUTTON' ||
      tag === 'NAV' ||
      tag === 'ASIDE' ||
      tag === 'HEADER' ||
      tag === 'FOOTER' ||
      tag === 'LABEL' ||
      tag === 'CODE' ||
      tag === 'PRE' ||
      el.isContentEditable ||
      el.hasAttribute?.('disabled') ||
      el.getAttribute?.('aria-disabled') === 'true' ||
      role === 'navigation' ||
      role === 'banner' ||
      role === 'menubar' ||
      role === 'menu' ||
      role === 'menuitem' ||
      role === 'toolbar' ||
      role === 'tablist' ||
      role === 'dialog' ||
      el.getAttribute?.('data-translate-scope') === 'deny' ||
      el.getAttribute?.('data-breadcrumb') === 'true' ||
      el.getAttribute?.('data-page-header') === 'true' ||
      el.getAttribute?.('data-exam-attempt-active') === 'true' ||
      el.getAttribute?.('data-notebook-ignore') === 'true' ||
      el.getAttribute?.('data-notebook-capture-ignore') === 'true' ||
      el.getAttribute?.('data-no-capture') === 'true'
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}
