import {
  BookOpenText,
  Clock,
  FileCheck2,
  Headphones,
  Languages,
  Layers,
  Puzzle,
  SpellCheck,
} from 'lucide-react';
import { currentIntlTag, translateTemplate } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

export const SKILL_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Vocabulary', label: 'Từ vựng' },
  { value: 'Kanji', label: 'Kanji' },
  { value: 'Grammar', label: 'Ngữ pháp' },
  { value: 'Reading', label: 'Đọc hiểu' },
  { value: 'Listening', label: 'Nghe hiểu' },
  { value: 'Mixed', label: 'Tổng hợp' },
];

export const PRACTICE_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'IN_PROGRESS', label: 'Đang làm dở' },
  { value: 'NOT_STARTED', label: 'Chưa làm' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
];

export function isPracticeKind(examKind) {
  const k = String(examKind || '').toLowerCase();
  return k === 'practiceset' || k === 'mixedpractice';
}

export function resolveSkillIcon(item) {
  if (item?.examKind === 'MixedPractice') return Puzzle;
  if (item?.examKind === 'FullMockTest') return FileCheck2;
  const text = [
    ...(Array.isArray(item?.includedSkills) ? item.includedSkills : []),
    item?.title || '',
  ]
    .join(' ')
    .toLowerCase();
  if (text.includes('kanji') || text.includes('hán tự')) return SpellCheck;
  if (text.includes('listening') || text.includes('nghe')) return Headphones;
  if (text.includes('reading') || text.includes('đọc')) return BookOpenText;
  if (text.includes('grammar') || text.includes('ngữ pháp')) return Layers;
  if (text.includes('vocab') || text.includes('từ vựng')) return Languages;
  return Clock;
}

export function resolveSkillTone(item) {
  if (item?.examKind === 'MixedPractice') return 'warning';
  if (item?.examKind === 'FullMockTest') return 'navy';
  const text = [
    ...(Array.isArray(item?.includedSkills) ? item.includedSkills : []),
    item?.title || '',
  ]
    .join(' ')
    .toLowerCase();
  if (text.includes('kanji') || text.includes('hán tự')) return 'grammar';
  if (text.includes('listening') || text.includes('nghe')) return 'listening';
  if (text.includes('reading') || text.includes('đọc')) return 'sakura';
  if (text.includes('grammar') || text.includes('ngữ pháp')) return 'kanji';
  return 'vocab';
}

export function resolveSkillLabel(skillName, tr) {
  if (!skillName) return '';
  const low = String(skillName).toLowerCase();
  if (low.includes('vocab')) return tr('Từ vựng');
  if (low.includes('kanji')) return tr('Kanji');
  if (low.includes('grammar')) return tr('Ngữ pháp');
  if (low.includes('reading')) return tr('Đọc hiểu');
  if (low.includes('listening')) return tr('Nghe hiểu');
  if (low.includes('mixed')) return tr('Tổng hợp');
  return skillName;
}

export function resolvePracticeSkillGroup(item) {
  const skills = Array.isArray(item?.includedSkills) ? item.includedSkills.map((s) => String(s).toLowerCase()) : [];
  const titleLow = String(item?.title || '').toLowerCase();
  const hasVocab = skills.some((s) => s.includes('vocab')) || titleLow.includes('từ vựng');
  const hasKanji = skills.some((s) => s.includes('kanji')) || titleLow.includes('kanji') || titleLow.includes('hán tự');
  const hasGrammar = skills.some((s) => s.includes('grammar')) || titleLow.includes('ngữ pháp');
  const hasReading = skills.some((s) => s.includes('reading')) || titleLow.includes('đọc hiểu');
  const hasListening = skills.some((s) => s.includes('listening')) || titleLow.includes('nghe hiểu');

  if (item?.examKind === 'MixedPractice' || skills.length >= 3) {
    return { key: 'mixed', label: 'Tổng hợp nhiều kỹ năng', icon: Puzzle, order: 60 };
  }
  if (hasVocab && hasKanji && !hasGrammar && !hasReading && !hasListening) {
    return { key: 'vocab_kanji', label: 'Từ vựng & Kanji', icon: Languages, order: 15 };
  }
  if (hasVocab && !hasKanji && !hasGrammar && !hasReading && !hasListening) {
    return { key: 'vocab', label: 'Từ vựng', icon: Languages, order: 10 };
  }
  if (hasKanji && !hasGrammar && !hasReading && !hasListening) {
    return { key: 'kanji', label: 'Kanji', icon: SpellCheck, order: 20 };
  }
  if (hasGrammar && !hasReading && !hasListening) {
    return { key: 'grammar', label: 'Ngữ pháp', icon: Layers, order: 30 };
  }
  if (hasReading && !hasListening) {
    return { key: 'reading', label: 'Đọc hiểu', icon: BookOpenText, order: 40 };
  }
  if (hasListening) {
    return { key: 'listening', label: 'Nghe hiểu', icon: Headphones, order: 50 };
  }
  return { key: 'mixed', label: 'Tổng hợp nhiều kỹ năng', icon: Puzzle, order: 60 };
}

export function groupPracticeSetsBySkill(items = []) {
  const map = new Map();
  for (const item of items) {
    const group = resolvePracticeSkillGroup(item);
    if (!map.has(group.key)) {
      map.set(group.key, { ...group, items: [] });
    }
    map.get(group.key).items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export function resolveQuestionTypeLabel(qType, tr) {
  switch (String(qType || '').toLowerCase()) {
    case 'singlechoice':
      return tr('Trắc nghiệm 1 đáp án');
    case 'multiplechoice':
      return tr('Chọn nhiều đáp án');
    case 'ordering':
      return tr('Sắp xếp câu');
    case 'fillblank':
      return tr('Điền vào chỗ trống');
    case 'matching':
      return tr('Ghép cặp');
    case 'shortanswer':
      return tr('Trả lời ngắn');
    default:
      return qType || tr('Câu hỏi');
  }
}

export function resolveStatusMeta(status, tr) {
  switch (String(status || '').toUpperCase()) {
    case 'IN_PROGRESS':
      return { tone: 'warning', label: tr('Đang làm') };
    case 'COMPLETED':
      return { tone: 'success', label: tr('Hoàn thành') };
    case 'SUBMITTED':
      return { tone: 'info', label: tr('Đã nộp') };
    case 'EXPIRED':
      return { tone: 'danger', label: tr('Hết thời gian') };
    case 'ABANDONED':
      return { tone: 'neutral', label: tr('Đã hủy') };
    case 'GRADING':
      return { tone: 'info', label: tr('Đang chấm') };
    case 'UNAVAILABLE':
      return { tone: 'danger', label: tr('Không khả dụng') };
    case 'NOT_STARTED':
    default:
      return { tone: 'neutral', label: tr('Chưa làm') };
  }
}

export function formatMockDateTime(value, withTime = true) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

export function formatRemainingShort(seconds, trf = translateTemplate) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '';
  const fmt = typeof trf === 'function' ? trf : translateTemplate;
  const total = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return fmt('Còn {0}g {1}p', { 0: h, 1: m });
  if (m > 0) return fmt('Còn {0} phút', { 0: m });
  return fmt('Còn {0} giây', { 0: s });
}

export function formatDurationSeconds(seconds, trf = translateTemplate) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '—';
  const fmt = typeof trf === 'function' ? trf : translateTemplate;
  const total = Math.max(0, Math.round(Number(seconds)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return fmt('{0} giây', { 0: s });
  if (s === 0) return fmt('{0} phút', { 0: m });
  return fmt('{0} phút {1} giây', { 0: m, 1: s });
}

export function formatScorePercent(score) {
  if (score == null || !Number.isFinite(Number(score))) return '—';
  return new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 2 }).format(Number(score));
}

export function formatPercentage(score) {
  const formatted = formatScorePercent(score);
  return formatted === '—' ? '—' : `${formatted}%`;
}

export function formatScaleScore(score, maxFractionDigits = 2) {
  if (score == null || !Number.isFinite(Number(score))) return '—';
  const digits = Math.max(
    0,
    Math.min(4, Number.isFinite(Number(maxFractionDigits)) ? Math.trunc(Number(maxFractionDigits)) : 2),
  );
  const factor = 10 ** digits;
  const rounded = Math.round(Number(score) * factor) / factor;
  return new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: digits }).format(rounded);
}

export function getToneSurfaceClasses(tone) {
  switch (tone) {
    case 'danger':
      return {
        box: 'border-rose-200/90 bg-rose-50/75',
        title: 'text-rose-900',
        meta: 'text-rose-700',
        scoreText: 'text-rose-700',
        barTone: 'danger',
        badgeTone: 'danger',
      };
    case 'warning':
      return {
        box: 'border-amber-200/90 bg-amber-50/75',
        title: 'text-amber-900',
        meta: 'text-amber-800',
        scoreText: 'text-amber-700',
        barTone: 'warning',
        badgeTone: 'warning',
      };
    case 'info':
      return {
        box: 'border-sky-200/90 bg-sky-50/75',
        title: 'text-sky-900',
        meta: 'text-sky-800',
        scoreText: 'text-sky-700',
        barTone: 'info',
        badgeTone: 'info',
      };
    case 'success':
      return {
        box: 'border-emerald-200/90 bg-emerald-50/75',
        title: 'text-emerald-900',
        meta: 'text-emerald-800',
        scoreText: 'text-emerald-700',
        barTone: 'success',
        badgeTone: 'success',
      };
    default:
      return {
        box: 'border-rp-line bg-rp-bg-2/70',
        title: 'text-rp-text',
        meta: 'text-rp-text-muted',
        scoreText: 'text-rp-brand-strong',
        barTone: 'brand',
        badgeTone: 'neutral',
      };
  }
}

export function classifyPracticeBandFallback(scoreOn10) {
  const s = Number(scoreOn10);
  if (!Number.isFinite(s) || s < 5) {
    return { band: 'NEEDS_IMPROVEMENT', label: 'Cần cải thiện', tone: 'danger' };
  }
  if (s < 7) {
    return { band: 'AVERAGE', label: 'Trung bình', tone: 'warning' };
  }
  if (s < 8.5) {
    return { band: 'GOOD', label: 'Khá', tone: 'info' };
  }
  return { band: 'EXCELLENT', label: 'Tốt', tone: 'success' };
}

export function resolvePracticeResultDisplay(
  { scoring, totalScore, latestScore, accuracyPercent, correctCount, latestCorrectCount, totalQuestions, latestTotalQuestions },
  tr = (s) => s,
) {
  const pctFallback = Number(accuracyPercent ?? totalScore ?? latestScore ?? 0);
  const hasBackendScoring = scoring && scoring.scoreType === 'PRACTICE_SCALE_10' && scoring.isScoringValid !== false;
  const score10 = hasBackendScoring
    ? Number(scoring.normalizedScore ?? 0)
    : Math.round((Math.max(0, Math.min(100, pctFallback)) / 10) * 100) / 100;
  const resolvedPct = hasBackendScoring ? Number(scoring.accuracyPercent ?? pctFallback) : Math.round(pctFallback * 100) / 100;
  const fallbackBand = classifyPracticeBandFallback(score10);
  const tone = (hasBackendScoring && scoring.performanceTone) || fallbackBand.tone;
  const bandLabelRaw = (hasBackendScoring && scoring.performanceLabel) || fallbackBand.label;
  const correct = correctCount ?? latestCorrectCount ?? 0;
  const total = totalQuestions ?? latestTotalQuestions ?? 0;

  return {
    isValid: scoring ? scoring.isScoringValid !== false : Number.isFinite(score10),
    score10,
    accuracyPct: resolvedPct,
    correctCount: correct,
    totalQuestions: total,
    rawScore: hasBackendScoring ? scoring.rawScore : correct,
    maxRawScore: hasBackendScoring ? scoring.maxRawScore : total,
    bandCode: (hasBackendScoring && scoring.performanceBand) || fallbackBand.band,
    bandLabel: tr(bandLabelRaw),
    tone,
    classes: getToneSurfaceClasses(tone),
    disclaimer: scoring?.disclaimer ? tr(scoring.disclaimer) : null,
  };
}

export function resolveMockResultDisplay(
  { scoring, totalScore, latestScore, accuracyPercent, correctCount, latestCorrectCount, totalQuestions, latestTotalQuestions },
  tr = (s) => s,
) {
  const correct = correctCount ?? latestCorrectCount ?? 0;
  const total = totalQuestions ?? latestTotalQuestions ?? 0;
  const resolvedPct = Number(scoring?.accuracyPercent ?? accuracyPercent ?? totalScore ?? latestScore ?? 0);
  const isSimulated180 = scoring?.scoreType === 'JLPT_MOCK_180' && scoring?.isScoringValid === true;
  const isPassApplicable = Boolean(isSimulated180 && scoring?.isPassStatusApplicable);
  const simulatedPassed = isPassApplicable ? Boolean(scoring?.simulatedPassed) : null;

  let tone = 'warning';
  let statusLabel = tr('Chưa đủ dữ liệu đánh giá ngưỡng JLPT');
  if (isSimulated180 && isPassApplicable) {
    tone = simulatedPassed ? 'success' : 'danger';
    statusLabel = tr(scoring.passStatusLabel || (simulatedPassed ? 'Đạt ngưỡng' : 'Chưa đạt'));
  } else if (scoring?.passStatusLabel) {
    statusLabel = tr(scoring.passStatusLabel);
  }

  return {
    isValid: Boolean(isSimulated180),
    isLegacy: scoring?.scoreType === 'LEGACY_PERCENT' || !scoring,
    scoreType: scoring?.scoreType || 'LEGACY_PERCENT',
    score180: isSimulated180 ? Number(scoring.normalizedScore ?? 0) : null,
    max180: scoring?.normalizedMaxScore || 180,
    passingScore: scoring?.passingScore ?? null,
    accuracyPct: Math.round(resolvedPct * 100) / 100,
    correctCount: correct,
    totalQuestions: total,
    isPassApplicable,
    simulatedPassed,
    passStatusCode: scoring?.passStatusCode || 'LEGACY_UNAVAILABLE',
    passStatusLabel: statusLabel,
    tone,
    classes: getToneSurfaceClasses(tone),
    scoringSections: Array.isArray(scoring?.scoringSections) ? scoring.scoringSections : [],
    failureReasons: Array.isArray(scoring?.failureReasons) ? scoring.failureReasons : [],
    disclaimer: scoring?.disclaimer ? tr(scoring.disclaimer) : null,
  };
}

export function formatAnswerKey(answerKey) {
  if (answerKey == null) return '';
  if (typeof answerKey === 'string' || typeof answerKey === 'number') return String(answerKey);
  if (Array.isArray(answerKey)) {
    return answerKey
      .map((item) => (typeof item === 'object' && item !== null ? item.text ?? item.label ?? item.content ?? '' : String(item)))
      .filter(Boolean)
      .join(' · ');
  }
  if (typeof answerKey === 'object') {
    if (Array.isArray(answerKey.tokens)) return answerKey.tokens.join(' ');
    if (Array.isArray(answerKey.blanks)) return answerKey.blanks.join(' / ');
    return Object.entries(answerKey)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return '';
}

export function resolveAttemptKindKey(attempt) {
  const kind = String(attempt?.examKind || attempt?.attemptKind || '').toLowerCase();
  if (kind === 'placement') return 'PLACEMENT';
  if (isPracticeKind(kind)) return 'PRACTICE';
  return 'MOCK';
}

export function resolveAttemptTargetRoute(attempt) {
  if (!attempt?.attemptId) return '/exam-result/';
  const kindKey = resolveAttemptKindKey(attempt);
  const inProgress = String(attempt?.attemptStatus || '').toLowerCase() === 'in_progress';
  if (kindKey === 'PLACEMENT') {
    return inProgress ? '/placement/exam/' : `/placement/result/${attempt.attemptId}/`;
  }
  if (kindKey === 'PRACTICE') {
    return inProgress
      ? `/practice-sets/attempt/${attempt.attemptId}/`
      : `/practice-sets/result/${attempt.attemptId}/`;
  }
  return inProgress
    ? `/mock-tests/attempt/${attempt.attemptId}/`
    : `/mock-tests/result/${attempt.attemptId}/`;
}

/**
 * Strips redundant prefix phrasing on catalog cards only (never mutates stored titles or Japanese characters).
 */
export function formatExamCardTitle(rawTitle, variant = 'practice') {
  const title = String(rawTitle || '').trim();
  if (!title) return '';
  const stripped = variant === 'mock'
    ? title.replace(/^Đề\s+thi\s+thử\s+/i, '').trim()
    : title.replace(/^Bộ\s+đề\s+luyện\s+tập\s+/i, '').trim();
  return stripped.length >= 6 ? stripped : title;
}

/**
 * Computes the single right-aligned inline metric on Metadata Row 4 for compact Practice Set & Mock Test cards.
 * Priority: In-Progress -> Grading -> Completed/Expired with valid score -> null (Not Started / Abandoned / Unavailable).
 */
export function resolveCompactCardMetric(item, variant = 'practice', { tr = (s) => s, trf = translateTemplate } = {}) {
  if (!item) return null;
  const status = String(item.userStatus || '').toUpperCase();

  // Priority 1: Active in-progress attempt always takes precedence over older completed scores.
  if (status === 'IN_PROGRESS' && item.activeAttemptId) {
    const answered = Number(item.activeAnsweredCount ?? 0);
    const total = Number(item.activeTotalQuestions ?? item.questionCount ?? 0);
    return {
      kind: 'progress',
      valueText: `${answered}/${total}`,
      unitText: tr('câu'),
      colorClass: 'text-amber-700',
      tooltip: trf('Đang làm: {0}/{1} câu', { 0: answered, 1: total }),
    };
  }

  // Priority 2: Processing / Grading -> never fabricate 0.
  if (status === 'GRADING') {
    return {
      kind: 'grading',
      valueText: tr('Đang chấm'),
      unitText: null,
      colorClass: 'text-rp-text-muted',
      tooltip: tr('Hệ thống đang xử lý kết quả bài làm'),
    };
  }

  // Priority 3: Completed or Expired with valid score -> show inline score + "điểm" unit.
  if ((status === 'COMPLETED' || status === 'EXPIRED') && (item.latestScoring || item.latestScore != null)) {
    if (variant === 'mock') {
      const m = resolveMockResultDisplay(
        {
          scoring: item.latestScoring,
          latestScore: item.latestScore,
          latestCorrectCount: item.latestCorrectCount,
          latestTotalQuestions: item.latestTotalQuestions ?? item.questionCount ?? 0,
        },
        tr,
      );
      if (m.isValid) {
        const formatted = formatScaleScore(m.score180);
        return {
          kind: 'score',
          valueText: `${formatted}/${m.max180}`,
          unitText: tr('điểm'),
          colorClass: m.classes.scoreText,
          tooltip: trf('Kết quả gần nhất: {0}/{1} điểm (mô phỏng JLPT)', { 0: formatted, 1: m.max180 }),
        };
      }
      return {
        kind: 'unavailable',
        valueText: tr('Chưa khả dụng'),
        unitText: null,
        colorClass: 'text-rp-text-muted',
        tooltip: m.passStatusLabel || tr('Chưa đủ dữ liệu đánh giá ngưỡng JLPT'),
      };
    }

    const p = resolvePracticeResultDisplay(
      {
        scoring: item.latestScoring,
        latestScore: item.latestScore,
        latestCorrectCount: item.latestCorrectCount,
        latestTotalQuestions: item.latestTotalQuestions ?? item.questionCount ?? 0,
      },
      tr,
    );
    if (p.isValid) {
      const formatted = formatScaleScore(p.score10);
      return {
        kind: 'score',
        valueText: `${formatted}/10`,
        unitText: tr('điểm'),
        colorClass: p.classes.scoreText,
        tooltip: trf('Kết quả gần nhất: {0}/10 điểm ({1}/{2} câu)', {
          0: formatted,
          1: p.correctCount,
          2: p.totalQuestions,
        }),
      };
    }
  }

  return null;
}
