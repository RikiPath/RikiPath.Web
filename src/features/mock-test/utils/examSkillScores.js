export const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const examSkills = [
  { code: 'vocabulary', label: 'Từ vựng', aliases: /vocab|tu vung|語彙/ },
  { code: 'grammar', label: 'Ngữ pháp', aliases: /grammar|ngu phap|文法/ },
  { code: 'reading', label: 'Đọc hiểu', aliases: /reading|\bdoc\b|読解/ },
  { code: 'listening', label: 'Nghe hiểu', aliases: /listening|\bnghe\b|聴解/ },
];

const NOT_ASSESSED_PRODUCTIVE_ALIASES = /speaking|writing|\bnoi\b|\bviet\b|会話|作文|表現/;

export function classifyExamSkill(rawName) {
  const name = String(rawName || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
  if (!name || NOT_ASSESSED_PRODUCTIVE_ALIASES.test(name)) return null;
  const matches = examSkills.filter((skill) => skill.aliases.test(name));
  return matches.length === 1 ? matches[0].code : null;
}

export function isValidSkillScore(score) {
  return Boolean(
    score &&
      score.count != null &&
      score.correct != null &&
      BigInt(score.count) > 0n &&
      BigInt(score.correct) >= 0n &&
      BigInt(score.correct) <= BigInt(score.count) &&
      score.unevaluated !== true,
  );
}

function buildAssessmentMap(skillAssessments) {
  if (!Array.isArray(skillAssessments)) return null;
  const map = new Map();
  for (const item of skillAssessments) {
    const code = classifyExamSkill(item?.skillCode || item?.skill || item?.sectionTitle);
    if (code) map.set(code, item);
  }
  return map;
}

function hasValidAudioEvidence(section, code, assessmentMap) {
  if (code !== 'listening') return true;
  if (section?.hasAudioEvidence === false) return false;
  if (assessmentMap?.has('listening')) {
    const entry = assessmentMap.get('listening');
    if (entry?.hasData === false) return false;
  }
  return true;
}

export function extractUnevaluatedSkillNotes(sections = [], skillAssessments = null) {
  const notes = {};
  const assessmentMap = buildAssessmentMap(skillAssessments);

  for (const section of sections || []) {
    const code = classifyExamSkill(section?.languageSkillName?.trim() || section?.sectionTitle || section?.sectionName);
    if (!code) continue;
    if (code === 'listening' && section?.hasAudioEvidence === false) {
      notes[code] = { reason: 'missing_audio' };
    }
  }

  if (assessmentMap) {
    for (const [code, item] of assessmentMap.entries()) {
      if (item?.hasData === false && !notes[code]) {
        notes[code] = { reason: code === 'listening' ? 'missing_audio' : 'not_tested' };
      }
    }
  }

  return notes;
}

export function summarizeSkills(sections = [], skillAssessments = null) {
  const scores = {};
  const assessmentMap = buildAssessmentMap(skillAssessments);

  for (const section of sections || []) {
    const count = section.totalCount ?? section.totalQuestions;
    const correct = section.correctCount;
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(correct) || count <= 0 || correct < 0 || correct > count) {
      continue;
    }

    const code = classifyExamSkill(section.languageSkillName?.trim() || section.sectionTitle || section.sectionName);
    if (!code) continue;
    if (!hasValidAudioEvidence(section, code, assessmentMap)) continue;

    scores[code] ??= { correct: 0n, count: 0n };
    scores[code].correct += BigInt(correct);
    scores[code].count += BigInt(count);
  }
  return scores;
}

export function splitPlacementScores(result) {
  const sections = result?.sections ?? [];
  const breakdowns = result?.levelBreakdowns ?? [];
  const byId = new Map(
    breakdowns
      .filter((item) => item.jlptLevelId > 0)
      .map((item) => [item.jlptLevelId, item.jlptLevelName]),
  );
  const sectionLevel = (section) => section.jlptLevelName || byId.get(section.jlptLevelId);
  const knownLevels = [
    ...new Set([
      ...breakdowns.map((item) => item.jlptLevelName),
      ...sections.map(sectionLevel),
      result?.screeningLevelName,
    ].filter(Boolean)),
  ];
  const singleLevel = knownLevels.length === 1 ? knownLevels[0] : undefined;
  return Object.fromEntries(
    jlptLevels
      .map((level) => [
        level,
        summarizeSkills(
          sections.filter((section) => (sectionLevel(section) ?? singleLevel) === level),
          result?.skillAssessments ?? null,
        ),
      ])
      .filter(([, scores]) => Object.keys(scores).length),
  );
}

export function getEvaluatedSkills(series = []) {
  return examSkills.filter((skill) => series.some((item) => isValidSkillScore(item?.scores?.[skill.code])));
}

export function computeSkillInsights(result) {
  const assessments = Array.isArray(result?.skillAssessments) ? result.skillAssessments : [];
  if (assessments.length > 0) {
    const evaluated = assessments.filter((item) => item?.hasData === true && Number.isFinite(Number(item?.scorePercent)));
    const strengths = evaluated.filter((item) => Number(item.scorePercent) >= 80 || item.priority === 'maintenance');
    const improvements = evaluated.filter((item) => Number(item.scorePercent) < 80 || item.priority === 'high');
    const unevaluated = assessments.filter((item) => item?.hasData === false || item?.priority === 'needs_assessment');
    return { evaluated, strengths, improvements, unevaluated };
  }

  const summary = summarizeSkills(result?.sections ?? []);
  const evaluated = examSkills
    .filter((skill) => isValidSkillScore(summary[skill.code]))
    .map((skill) => {
      const score = summary[skill.code];
      const pct = Math.round((Number(score.correct) * 100) / Number(score.count));
      return {
        skillCode: skill.code,
        skill: skill.label,
        scorePercent: pct,
        correctCount: Number(score.correct),
        totalCount: Number(score.count),
        hasData: true,
        priority: pct >= 80 ? 'maintenance' : 'high',
      };
    });
  return {
    evaluated,
    strengths: evaluated.filter((item) => item.scorePercent >= 80),
    improvements: evaluated.filter((item) => item.scorePercent < 80),
    unevaluated: [],
  };
}

export function scoreDifference(before, after) {
  if (!isValidSkillScore(before) || !isValidSkillScore(after)) return null;
  return {
    correct: BigInt(after.correct) * BigInt(before.count) - BigInt(before.correct) * BigInt(after.count),
    count: BigInt(after.count) * BigInt(before.count),
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

/**
 * Normalizes backend placement/exam sections into balanced cards for the compact 4-col result grid.
 * Preserves level labels (N5/N4/...) and marks missing-audio Listening cleanly as unevaluated.
 */
export function buildCompactSkillCards(result) {
  const sections = Array.isArray(result?.sections) ? result.sections : [];
  if (sections.length > 0) {
    return sections.map((section, index) => {
      const rawTitle = section.languageSkillName?.trim() || section.sectionTitle || section.sectionName || '';
      const skillCode = classifyExamSkill(rawTitle);
      const skillMeta = examSkills.find((s) => s.code === skillCode);
      const totalCount = Number(section.totalQuestions ?? section.totalCount) || 0;
      const correctCount = Number(section.correctCount) || 0;
      const unverifiedAudio = skillCode === 'listening' && section.hasAudioEvidence === false;
      const hasData = !unverifiedAudio && totalCount > 0;
      const scorePercent = hasData ? Math.round((correctCount / totalCount) * 100) : null;

      return {
        id: section.mockTestSectionId ?? `${section.jlptLevelName || 'lvl'}-${skillCode || rawTitle}-${index}`,
        levelName: section.jlptLevelName || null,
        skillCode,
        title: skillMeta?.label || section.sectionTitle || section.sectionName || rawTitle,
        correctCount,
        totalCount,
        scorePercent,
        hasData,
        unverifiedAudio,
      };
    });
  }

  const assessments = Array.isArray(result?.skillAssessments) ? result.skillAssessments : [];
  return assessments.map((item, index) => ({
    id: item.skillCode || `${item.skill}-${index}`,
    levelName: item.jlptLevelName || null,
    skillCode: classifyExamSkill(item.skillCode || item.skill),
    title: item.skill || item.sectionTitle || item.skillCode || '',
    correctCount: Number(item.correctCount) || 0,
    totalCount: Number(item.totalCount) || 0,
    scorePercent: item.hasData && Number.isFinite(Number(item.scorePercent)) ? Math.round(Number(item.scorePercent)) : null,
    hasData: Boolean(item.hasData),
    unverifiedAudio: item.skillCode === 'listening' && !item.hasData,
  }));
}

const SKILL_ORDER = new Map(examSkills.map((skill, index) => [skill.code, index]));

function normalizeSkillName(rawName) {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
}

function isProductiveSkillLabel(rawName) {
  return NOT_ASSESSED_PRODUCTIVE_ALIASES.test(normalizeSkillName(rawName));
}

function resolveSkillLabel(item) {
  const code = classifyExamSkill(item?.skillCode || item?.skill || item?.title || item?.sectionTitle);
  const meta = examSkills.find((s) => s.code === code);
  return meta?.label || item?.skill || item?.title || item?.skillCode || '';
}

function compareSkillItemsDesc(a, b) {
  const pctDiff = Number(b.scorePercent) - Number(a.scorePercent);
  if (pctDiff !== 0) return pctDiff;
  const totalA = Number(a.totalCount) || 0;
  const totalB = Number(b.totalCount) || 0;
  if (totalA > 0 && totalB > 0) {
    const ratioDiff = Number(b.correctCount) / totalB - Number(a.correctCount) / totalA;
    if (ratioDiff !== 0) return ratioDiff > 0 ? 1 : -1;
  }
  return (SKILL_ORDER.get(classifyExamSkill(a.skillCode || a.skill)) ?? 99) -
    (SKILL_ORDER.get(classifyExamSkill(b.skillCode || b.skill)) ?? 99);
}

/**
 * Groups assessed skills by JLPT level (N5 -> N1) for the unified two-column breakdown panel.
 * Ignores Speaking/Writing MCQ entries and keeps Listening without audio explicitly marked unevaluated.
 */
export function groupSkillCardsByLevel(result) {
  if (!result) return [];
  const rawSections = Array.isArray(result.sections) ? result.sections : [];
  const breakdowns = Array.isArray(result.levelBreakdowns) ? result.levelBreakdowns : [];
  const levelById = new Map(
    breakdowns.filter((b) => b?.jlptLevelId > 0 && b?.jlptLevelName).map((b) => [b.jlptLevelId, b.jlptLevelName]),
  );
  const knownLevels = [
    ...new Set([
      ...breakdowns.map((b) => b?.jlptLevelName),
      ...rawSections.map((s) => s?.jlptLevelName || levelById.get(s?.jlptLevelId)),
      result.screeningLevelName,
    ].filter(Boolean)),
  ];
  const fallbackLevel = knownLevels.length === 1 ? knownLevels[0] : null;
  const notes = extractUnevaluatedSkillNotes(rawSections, result.skillAssessments);

  const cards = buildCompactSkillCards(result)
    .map((card, index) => {
      const source = rawSections[index];
      const rawName = source?.languageSkillName || source?.sectionTitle || source?.sectionName || card.title;
      if (card.skillCode == null && isProductiveSkillLabel(rawName)) {
        return null;
      }
      if (card.totalCount <= 0 && card.skillCode !== 'listening') {
        return null;
      }
      const levelName =
        card.levelName ||
        (source?.jlptLevelId ? levelById.get(source.jlptLevelId) : null) ||
        fallbackLevel ||
        'ALL';
      const unverifiedAudio =
        card.skillCode === 'listening' &&
        (card.unverifiedAudio || !card.hasData || notes.listening?.reason === 'missing_audio');
      const hasData = !unverifiedAudio && card.hasData && card.totalCount > 0 && Number.isFinite(card.scorePercent);
      return {
        ...card,
        title: resolveSkillLabel({ skillCode: card.skillCode, title: card.title }),
        levelName,
        unverifiedAudio,
        hasData,
        scorePercent: hasData ? card.scorePercent : null,
      };
    })
    .filter(Boolean);

  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.levelName)) groups.set(card.levelName, []);
    groups.get(card.levelName).push(card);
  }

  const orderedLevels = [...jlptLevels.filter((lvl) => groups.has(lvl)), ...[...groups.keys()].filter((k) => !jlptLevels.includes(k))];
  return orderedLevels.map((levelKey) => {
    const items = [...groups.get(levelKey)].sort(
      (a, b) => (SKILL_ORDER.get(a.skillCode) ?? 99) - (SKILL_ORDER.get(b.skillCode) ?? 99),
    );
    const evaluatedItems = items.filter((item) => item.hasData);
    const evaluatedCorrect = evaluatedItems.reduce((sum, item) => sum + item.correctCount, 0);
    const evaluatedTotal = evaluatedItems.reduce((sum, item) => sum + item.totalCount, 0);
    const scorePercent = evaluatedTotal > 0 ? Math.round((evaluatedCorrect / evaluatedTotal) * 100) : null;
    return {
      key: levelKey,
      levelName: levelKey === 'ALL' ? null : levelKey,
      items,
      evaluatedCorrect,
      evaluatedTotal,
      scorePercent,
      hasData: evaluatedTotal > 0,
    };
  });
}

/**
 * Derives paired real-data strength and improvement summaries for Hàng 3 without fabricating fake strengths.
 */
export function resolveSkillFeedbackSummary(result) {
  const insights = computeSkillInsights(result || {});
  const notes = extractUnevaluatedSkillNotes(result?.sections ?? [], result?.skillAssessments ?? null);
  const evaluated = (insights.evaluated ?? []).map((item) => ({
    ...item,
    skillCode: classifyExamSkill(item.skillCode || item.skill),
    skill: resolveSkillLabel(item),
    scorePercent: Math.round(Number(item.scorePercent) || 0),
    correctCount: Number(item.correctCount) || 0,
    totalCount: Number(item.totalCount) || 0,
  }));

  const unevaluatedMap = new Map();
  for (const item of insights.unevaluated ?? []) {
    const code = classifyExamSkill(item?.skillCode || item?.skill);
    if (code) {
      unevaluatedMap.set(code, {
        skillCode: code,
        skill: resolveSkillLabel(item),
        reason: item?.reason || notes?.[code]?.reason || (code === 'listening' ? 'missing_audio' : 'not_tested'),
      });
    }
  }
  for (const [code, note] of Object.entries(notes)) {
    if (!unevaluatedMap.has(code)) {
      unevaluatedMap.set(code, {
        skillCode: code,
        skill: resolveSkillLabel({ skillCode: code }),
        reason: note.reason || 'missing_audio',
      });
    }
  }
  const unevaluated = [...unevaluatedMap.values()];

  if (evaluated.length === 0) {
    return {
      hasEvaluated: false,
      strengthMode: 'empty',
      focusMode: 'empty',
      topSkills: [],
      focusSkills: [],
      unevaluated,
    };
  }

  const rankedDesc = [...evaluated].sort(compareSkillItemsDesc);
  const rankedAsc = [...rankedDesc].reverse();
  const topScore = rankedDesc[0].scorePercent;

  if (topScore === 0) {
    return {
      hasEvaluated: true,
      strengthMode: 'zero',
      focusMode: 'needs_work',
      topSkills: rankedDesc,
      focusSkills: rankedAsc.slice(0, 2),
      unevaluated,
    };
  }

  const topSkills = rankedDesc.filter((item) => item.scorePercent === topScore).slice(0, 2);
  const strengthMode = topScore >= 80 ? 'strong' : 'relative';

  const topCodes = new Set(topSkills.map((item) => item.skillCode));
  const weakCandidates = rankedAsc.filter((item) => item.scorePercent < 80 && !topCodes.has(item.skillCode));
  const fallbackWeakCandidates = rankedAsc.filter((item) => item.scorePercent < 80);

  let focusSkills;
  let focusMode;
  if (weakCandidates.length > 0) {
    focusSkills = weakCandidates.slice(0, 2);
    focusMode = 'needs_work';
  } else if (fallbackWeakCandidates.length > 0) {
    focusSkills = fallbackWeakCandidates.slice(0, 2);
    focusMode = 'needs_work';
  } else {
    focusSkills = rankedAsc.slice(0, 1);
    focusMode = 'maintain';
  }

  return {
    hasEvaluated: true,
    strengthMode,
    focusMode,
    topSkills,
    focusSkills,
    unevaluated,
  };
}

/**
 * Maps known backend Vietnamese assessment summary templates through `tr`/`trf` so JA/VI switch cleanly.
 */
export function translateBackendAssessmentMessage(message, tr, trf) {
  if (!message) return '';
  const raw = String(message).trim();
  if (raw === 'Bạn có thể bắt đầu lộ trình N5 từ nền tảng, ưu tiên các kỹ năng còn yếu.') {
    return tr('Bạn có thể bắt đầu lộ trình N5 từ nền tảng, ưu tiên các kỹ năng còn yếu.');
  }
  const weakMatch = raw.match(/^Lộ trình ôn (N[1-5]) sẽ ưu tiên củng cố những kỹ năng còn yếu trước khi luyện đề\.$/);
  if (weakMatch) {
    return trf('Lộ trình ôn {0} sẽ ưu tiên củng cố những kỹ năng còn yếu trước khi luyện đề.', { 0: weakMatch[1] });
  }
  const regularMatch = raw.match(/^Bạn có thể lập lộ trình ôn (N[1-5]) theo kết quả từng kỹ năng\.$/);
  if (regularMatch) {
    return trf('Bạn có thể lập lộ trình ôn {0} theo kết quả từng kỹ năng.', { 0: regularMatch[1] });
  }
  return tr(raw);
}

/**
 * Maps known backend Vietnamese skill comment templates through `tr`/`trf` for PlacementGuidance.
 */
export function translateBackendSkillComment(comment, tr, trf) {
  if (!comment) return '';
  const raw = String(comment).trim();
  const inconsistent = raw.match(/^(.+?): kết quả ở (N[1-5]) và (N[1-5]) chưa nhất quán\. Cần thêm dữ liệu để xác nhận cấp độ\.$/);
  if (inconsistent) {
    return trf('{0}: kết quả ở {1} và {2} chưa nhất quán. Cần thêm dữ liệu để xác nhận cấp độ.', {
      0: tr(inconsistent[1]),
      1: inconsistent[2],
      2: inconsistent[3],
    });
  }
  const insufficient = raw.match(/^(.+?): chưa đủ câu hỏi hợp lệ để ước lượng cấp độ\.$/);
  if (insufficient) {
    return trf('{0}: chưa đủ câu hỏi hợp lệ để ước lượng cấp độ.', { 0: tr(insufficient[1]) });
  }
  const bandMatch = raw.match(/^(.+?): đạt ngưỡng ở (N[1-5]) và đang tiến gần (N[1-5])\.$/);
  if (bandMatch) {
    return trf('{0}: đạt ngưỡng ở {1} và đang tiến gần {2}.', {
      0: tr(bandMatch[1]),
      1: bandMatch[2],
      2: bandMatch[3],
    });
  }
  const foundational = raw.match(/^(.+?): chưa đạt ngưỡng ở các cấp đã kiểm tra\. Nên ôn lại kiến thức nền của kỹ năng này\.$/);
  if (foundational) {
    return trf('{0}: chưa đạt ngưỡng ở các cấp đã kiểm tra. Nên ôn lại kiến thức nền của kỹ năng này.', {
      0: tr(foundational[1]),
    });
  }
  const aligned = raw.match(/^(.+?): kết quả phù hợp khoảng (N[1-5]), với mục tiêu ôn (N[1-5])\.$/);
  if (aligned) {
    return trf('{0}: kết quả phù hợp khoảng {1}, với mục tiêu ôn {2}.', {
      0: tr(aligned[1]),
      1: aligned[2],
      2: aligned[3],
    });
  }
  return tr(raw);
}
