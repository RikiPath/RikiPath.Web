/**
 * Normalizes JLPT level display text to concise level codes (e.g. "N5", "N4", "N3", "N2", "N1").
 * Keeps underlying IDs/values untouched; strips redundant prefixes/suffixes like
 * "JLPT N5", "N5 · JLPT N5", "N5 - JLPT N5", or "JLPT · N5".
 */
export function formatJlptLevel(raw) {
  if (raw == null) return '';
  if (typeof raw === 'object') {
    const candidate =
      raw.code ??
      raw.jlptLevelCode ??
      raw.levelCode ??
      raw.level ??
      raw.name ??
      raw.displayName ??
      '';
    return formatJlptLevel(candidate);
  }
  const text = String(raw).trim();
  if (!text) return '';
  const match = text.match(/\b(N[1-5])\b/i);
  if (match) return match[1].toUpperCase();
  return text;
}
