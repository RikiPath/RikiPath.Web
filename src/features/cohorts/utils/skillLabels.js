import { currentIntlTag, translateText } from '@/locales/locale.js';

export const SKILL_DISPLAY_ORDER = Object.freeze([
  'vocabulary',
  'kanji',
  'grammar',
  'reading',
  'listening',
  'writing',
  'speaking',
]);

const SKILL_VI_BY_CODE = Object.freeze({
  vocabulary: 'Từ vựng',
  vocab: 'Từ vựng',
  kanji: 'Hán tự',
  grammar: 'Ngữ pháp',
  listening: 'Nghe hiểu',
  reading: 'Đọc hiểu',
  writing: 'Viết',
  speaking: 'Nói',
});

const SOURCE_VI_BY_CODE = Object.freeze({
  placement: 'Đánh giá năng lực',
  mocktest: 'Thi thử JLPT',
  practiceexercise: 'Bài luyện tập',
  aipracticegrading: 'Luyện Viết/Nói AI',
  cohorthomework: 'Bài tập tại lớp',
  cohorthomeworkexercise: 'Bài tập luyện tập tại lớp',
  inclasscohorthomework: 'Bài tập tại lớp',
  inclasshomeworkexercise: 'Bài luyện tập tại lớp',
});

/**
 * Normalizes a skill code or display name to its canonical lowercase key.
 */
export function normalizeSkillCode(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('vocab') || s.includes('từ vựng') || s.includes('語彙')) return 'vocabulary';
  if (s.includes('kanji') || s.includes('hán tự') || s.includes('漢字')) return 'kanji';
  if (s.includes('grammar') || s.includes('ngữ pháp') || s.includes('文法')) return 'grammar';
  if (s.includes('listen') || s.includes('nghe') || s.includes('聴解')) return 'listening';
  if (s.includes('read') || s.includes('đọc') || s.includes('読解')) return 'reading';
  if (s.includes('writ') || s.includes('viết') || s.includes('作文')) return 'writing';
  if (s.includes('speak') || s.includes('nói') || s.includes('会話')) return 'speaking';
  return s;
}

/**
 * Returns deterministic canonical sort rank across Japanese language skills.
 */
export function getSkillSortRank(code) {
  const normalized = normalizeSkillCode(code);
  const idx = SKILL_DISPLAY_ORDER.indexOf(normalized);
  return idx >= 0 ? idx : 99;
}

/**
 * Sorts an array of skill items deterministically into canonical JLPT / skill order.
 */
export function sortSkillsCanonical(list = [], getCode = (item) => item?.skillCode || item?.skillLabel || item) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const ra = getSkillSortRank(getCode(a));
    const rb = getSkillSortRank(getCode(b));
    if (ra !== rb) return ra - rb;
    return String(getCode(a) || '').localeCompare(String(getCode(b) || ''));
  });
}

/**
 * Formats a numeric percentage (or 0-100 score) cleanly using the active locale, stripping trailing `.0`.
 */
export function formatPercent(value, maximumFractionDigits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const rounded = Math.round(num * Math.pow(10, maximumFractionDigits)) / Math.pow(10, maximumFractionDigits);
  return `${new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits }).format(rounded)}%`;
}

/**
 * Formats a percentage-point delta (`+40 điểm %`, `-5,5 điểm %`, `0 điểm %`) so it is never confused with relative growth rate.
 */
export function formatPercentagePointDelta(delta, tr = translateText) {
  const num = Number(delta);
  if (!Number.isFinite(num)) return '—';
  const rounded = Math.round(num * 10) / 10;
  const absFormatted = new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 1 }).format(Math.abs(rounded));
  const translateFn = typeof tr === 'function' ? tr : translateText;
  if (rounded > 0) return `+${absFormatted} ${translateFn('điểm phần trăm')}`;
  if (rounded < 0) return `-${absFormatted} ${translateFn('điểm phần trăm')}`;
  return `0 ${translateFn('điểm phần trăm')}`;
}

/**
 * Formats any system skill identifier/code into unified Vietnamese/localized terminology
 * (never leaking raw English enum names such as Vocabulary/Grammar/Listening/Reading/Writing/Speaking).
 */
export function formatSkillLabel(raw, tr = translateText) {
  const value = String(raw || '').trim();
  if (!value) return tr('Kỹ năng');
  const code = normalizeSkillCode(value);
  const canonicalVi = SKILL_VI_BY_CODE[code] || value;
  return typeof tr === 'function' ? tr(canonicalVi) : translateText(canonicalVi);
}

/**
 * Formats one or comma-separated backend data-source tags into clean Vietnamese/localized labels.
 */
export function formatDataSourceLabel(raw, tr = translateText) {
  if (!raw) return '';
  const parts = Array.isArray(raw)
    ? raw
    : String(raw)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  const translateFn = typeof tr === 'function' ? tr : translateText;
  return [...new Set(parts)]
    .map((p) => {
      const normalized = p.trim().toLowerCase().replace(/[\s_-]+/g, '');
      const vi = SOURCE_VI_BY_CODE[normalized] || p;
      return translateFn(vi);
    })
    .join(' · ');
}
