export const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const examSkills = [
  { code: 'vocabulary', label: 'Từ vựng', aliases: /vocab|tu vung|語彙/ },
  { code: 'grammar', label: 'Ngữ pháp', aliases: /grammar|ngu phap|文法/ },
  { code: 'reading', label: 'Đọc hiểu', aliases: /reading|\bdoc\b|読解/ },
  { code: 'listening', label: 'Nghe hiểu', aliases: /listening|\bnghe\b|聴解/ },
];

export function summarizeSkills(sections = []) {
  const scores = {};
  for (const section of sections) {
    const count = section.totalCount ?? section.totalQuestions;
    const correct = section.correctCount;
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(correct) || count <= 0 || correct < 0 || correct > count) continue;

    const name = (section.languageSkillName?.trim() || section.sectionTitle || section.sectionName || '')
      .toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
    const matches = examSkills.filter(skill => skill.aliases.test(name));
    if (matches.length !== 1) continue;

    const { code } = matches[0];
    scores[code] ??= { correct: 0n, count: 0n, missingAudio: false };
    scores[code].correct += BigInt(correct);
    scores[code].count += BigInt(count);
    scores[code].missingAudio ||= code === 'listening' && section.hasAudioEvidence === false;
  }
  return scores;
}

export function splitPlacementScores(result) {
  const sections = result.sections ?? [];
  const breakdowns = result.levelBreakdowns ?? [];
  const byId = new Map(breakdowns.filter(item => item.jlptLevelId > 0)
    .map(item => [item.jlptLevelId, item.jlptLevelName]));
  const sectionLevel = section => section.jlptLevelName || byId.get(section.jlptLevelId);
  const knownLevels = [...new Set([
    ...breakdowns.map(item => item.jlptLevelName), ...sections.map(sectionLevel), result.screeningLevelName,
  ].filter(Boolean))];
  const singleLevel = knownLevels.length === 1 ? knownLevels[0] : undefined;
  return Object.fromEntries(jlptLevels.map(level => [
    level, summarizeSkills(sections.filter(section => (sectionLevel(section) ?? singleLevel) === level)),
  ]).filter(([, scores]) => Object.keys(scores).length));
}

export function scoreDifference(before, after) {
  if (!before || !after) return null;
  return {
    correct: after.correct * before.count - before.correct * after.count,
    count: after.count * before.count,
  };
}

export function formatScore({ correct, count }, signed = false) {
  if (correct === 0n) return '0';
  const absolutePercent = (correct < 0n ? -correct : correct) * 100n;
  let scale = 10n ** 12n;
  // Extend the decimal scale if a real difference would disappear at twelve places.
  while (absolutePercent * scale < count) scale *= 10n;
  const rounded = (absolutePercent * scale + count / 2n) / count;
  const fraction = (rounded % scale).toString().padStart(scale.toString().length - 1, '0').replace(/0+$/, '');
  const sign = correct < 0n ? '−' : signed ? '+' : '';
  return sign + (rounded / scale).toString() + (fraction ? ',' + fraction : '');
}
