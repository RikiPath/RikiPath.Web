/**
 * Pure Learner Visual System V2 tokens, streak milestone helpers, and Daily Command Center logic.
 * Kept JSX-free so Node tests verify rules directly.
 */

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export const SUPPORTED_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2'];
const SUPPORTED_JLPT_SET = new Set(SUPPORTED_JLPT_LEVELS);

export function normalizeJlptCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/^JLPT\s+/i, '')
    .trim();
}

export function isSupportedJlptLevel(raw) {
  return SUPPORTED_JLPT_SET.has(normalizeJlptCode(raw));
}

export function filterSupportedJlptLevels(items = [], getCode) {
  const extractor =
    getCode ||
    ((item) => (typeof item === 'string' ? item : item?.code || item?.value || item?.name || ''));
  return (Array.isArray(items) ? items : []).filter((item) =>
    isSupportedJlptLevel(extractor(item)),
  );
}

export const SURFACE_TONES = {
  default: {
    card: 'border-rp-line bg-rp-surface',
    soft: 'bg-rp-bg-2 border-rp-line',
    iconBg: 'bg-rp-bg-2 border-rp-line',
    badge: 'neutral',
    accentText: 'text-rp-text',
  },
  sakura: {
    card: 'border-rp-brand-border bg-rp-brand-tint/60',
    soft: 'bg-rp-brand-tint border-rp-brand-border',
    iconBg: 'bg-rp-brand-soft/80 border-rp-brand-border',
    badge: 'brand',
    accentText: 'text-rp-brand-strong',
  },
  mint: {
    card: 'border-rp-mint-line bg-rp-mint-bg/60',
    soft: 'bg-rp-mint-bg border-rp-mint-line',
    iconBg: 'bg-rp-mint-bg border-rp-mint-line',
    badge: 'success',
    accentText: 'text-rp-mint',
  },
  lavender: {
    card: 'border-rp-lavender-line bg-rp-lavender-bg/60',
    soft: 'bg-rp-lavender-bg border-rp-lavender-line',
    iconBg: 'bg-rp-lavender-bg border-rp-lavender-line',
    badge: 'info',
    accentText: 'text-rp-lavender',
  },
  peach: {
    card: 'border-rp-peach-line bg-rp-peach-bg/60',
    soft: 'bg-rp-peach-bg border-rp-peach-line',
    iconBg: 'bg-rp-peach-bg border-rp-peach-line',
    badge: 'warning',
    accentText: 'text-rp-peach',
  },
  sky: {
    card: 'border-rp-sky-line bg-rp-sky-bg/60',
    soft: 'bg-rp-sky-bg border-rp-sky-line',
    iconBg: 'bg-rp-sky-bg border-rp-sky-line',
    badge: 'info',
    accentText: 'text-rp-sky',
  },
  navy: {
    card: 'border-rp-navy-line bg-rp-navy-bg/65',
    soft: 'bg-rp-navy-bg border-rp-navy-line',
    iconBg: 'bg-rp-navy-bg border-rp-navy-line',
    badge: 'neutral',
    accentText: 'text-rp-navy',
  },
};

export const SKILL_SURFACE_MAP = {
  vocabulary: 'mint',
  grammar: 'peach',
  kanji: 'lavender',
  kana: 'sakura',
  listening: 'sky',
  reading: 'navy',
  writing: 'peach',
  speaking: 'mint',
  srs: 'lavender',
  roadmap: 'sakura',
  mock: 'navy',
  group: 'sky',
  mentor: 'sakura',
  notebook: 'lavender',
  calendar: 'sky',
  achievement: 'peach',
};

export function resolveSurfaceTone(tone = 'default') {
  return SURFACE_TONES[tone] || SURFACE_TONES.default;
}

/**
 * Computes genuine milestone progress directly from backend `currentStreakDays` & `isActiveToday`.
 * Never advances or fabricates days client-side.
 */
export function computeStreakProgress(currentStreakDays = 0, isActiveToday = false) {
  const days = Number.isFinite(Number(currentStreakDays)) ? Math.max(0, Math.floor(Number(currentStreakDays))) : 0;
  const achievedMilestones = STREAK_MILESTONES.filter((m) => days >= m);
  const nextMilestone = STREAK_MILESTONES.find((m) => days < m) || null;
  const previousFloor = achievedMilestones.length > 0 ? achievedMilestones[achievedMilestones.length - 1] : 0;

  let progressPercent = 100;
  let remainingDays = 0;
  if (nextMilestone != null) {
    const span = Math.max(1, nextMilestone - previousFloor);
    progressPercent = Math.max(0, Math.min(100, Math.round(((days - previousFloor) / span) * 100)));
    remainingDays = Math.max(0, nextMilestone - days);
  }

  return {
    days,
    isActiveToday: Boolean(isActiveToday),
    achievedMilestones,
    highestMilestone: achievedMilestones.length > 0 ? achievedMilestones[achievedMilestones.length - 1] : null,
    isMilestoneHit: achievedMilestones.includes(days) && days > 0,
    nextMilestone,
    remainingDays,
    progressPercent,
  };
}

/**
 * Selects the single next actionable day from an active backend AI Learning Path response.
 */
export function pickNextRoadmapDay(latestPath) {
  if (!latestPath || String(latestPath.status || '').toLowerCase() !== 'active') return null;
  const days = Array.isArray(latestPath.dailySchedules) ? latestPath.dailySchedules : [];
  if (days.length === 0) return null;

  const startedPending = days.find((d) => d?.isStarted && !d?.isCompleted);
  if (startedPending) return startedPending;

  const uncompleted = days.find((d) => !d?.isCompleted);
  if (uncompleted) return uncompleted;

  return null;
}

/**
 * Resolves honest Daily Command Center hero state strictly from backend-confirmed state & entitlements.
 */
export function resolveDashboardPrimaryFlow({
  targetLevel,
  completedLessons = 0,
  dueCards = 0,
  roadmapAccess = {},
  studyAccess = {},
}) {
  const aiRemaining =
    Number.isFinite(Number(studyAccess?.learningPathUsesRemaining))
      ? Number(studyAccess.learningPathUsesRemaining)
      : null;

  const hasConfirmedGoal = Boolean(roadmapAccess.hasConfirmedGoal ?? targetLevel);
  const hasPlacementCompleted = Boolean(roadmapAccess.hasPlacementCompleted);
  const aiEligible = Boolean(roadmapAccess.aiRoadmapEligible ?? hasPlacementCompleted);
  const standardEligible = Boolean(
    roadmapAccess.standardRoadmapEligible ??
    hasPlacementCompleted,
  );

  // Sequential flow: step 1 is always the JLPT goal (the assessment stays locked until it is confirmed).
  if (!hasConfirmedGoal) {
    return {
      stage: 'needs-goal',
      to: '/onboarding/',
      ctaLabel: 'Đặt mục tiêu JLPT',
      hint: 'Hãy chọn mục tiêu JLPT để RikiPath chuẩn bị bài đánh giá phù hợp với bạn.',
    };
  }

  if (!roadmapAccess.isPending && !standardEligible && !roadmapAccess.hasActiveAiPath) {
    if (roadmapAccess.isPlacementInProgress) {
      return {
        stage: 'placement-in-progress',
        to: '/app/placement-test/',
        ctaLabel: roadmapAccess.hasPendingPlacementSubmission
          ? 'Nộp bài đánh giá'
          : 'Tiếp tục đánh giá năng lực',
        hint: 'Bạn có bài đánh giá đang làm dở. Hoàn thành để nhận lộ trình phù hợp.',
      };
    }
    return {
      stage: 'needs-placement',
      to: '/app/placement-test/',
      ctaLabel: 'Đánh giá năng lực',
      hint: 'Bước tiếp theo, hãy đánh giá năng lực để tìm ra lộ trình học phù hợp với bạn.',
    };
  }

  if (!roadmapAccess.isPending && standardEligible && !aiEligible) {
    return {
      stage: 'standard-roadmap',
      to: '/roadmap/',
      secondaryTo: '/app/placement-test/',
      ctaLabel: 'Mở lộ trình tiêu chuẩn',
      secondaryLabel: 'Đánh giá năng lực',
      hint: 'Lộ trình tiêu chuẩn đã sẵn sàng. Bạn có thể đánh giá năng lực bất cứ lúc nào.',
    };
  }

  if (!roadmapAccess.hasActiveAiPath && !roadmapAccess.isPending && aiEligible) {
    if (aiRemaining === 0) {
      return {
        stage: 'needs-ai-credit',
        to: '/plans/',
        secondaryTo: '/roadmap/',
        ctaLabel: 'Xem gói lượt AI',
        secondaryLabel: 'Mở lộ trình tiêu chuẩn',
        hint: 'Bạn có thể học theo lộ trình tiêu chuẩn, hoặc thêm lượt AI để tạo lộ trình cá nhân hóa.',
      };
    }
    return {
      stage: 'ready-for-ai',
      to: '/roadmap/?generateAi=1',
      secondaryTo: '/roadmap/',
      ctaLabel: 'Tạo lộ trình học với AI',
      secondaryLabel: 'Mở lộ trình tiêu chuẩn',
      hint: 'Mục tiêu và kết quả đánh giá đã sẵn sàng. Hãy tạo lộ trình học phù hợp với bạn.',
    };
  }

  const nextDay = pickNextRoadmapDay(roadmapAccess.latestPath);
  if (nextDay) {
    const firstLesson = Array.isArray(nextDay.lessons) ? nextDay.lessons[0] : null;
    return {
      stage: 'active-roadmap',
      nextDay,
      to: firstLesson?.lessonId ? `/lesson-player/?lessonId=${firstLesson.lessonId}&from=ai` : '/roadmap/',
      roadmapTo: '/roadmap/',
      ctaLabel: nextDay.isStarted ? 'Tiếp tục ngày học' : 'Bắt đầu ngày học',
      hint: nextDay.title || 'Hoàn thành bài học hôm nay để duy trì chuỗi ngày học JLPT.',
    };
  }

  if (Number(dueCards) > 0) {
    return {
      stage: 'srs-due',
      to: '/daily-srs/',
      ctaLabel: 'Ôn thẻ SRS hôm nay',
      hint: 'Ưu tiên hoàn thành các thẻ nhớ sắp quên trước khi học kiến thức mới.',
    };
  }

  if (Number(completedLessons) > 0) {
    return {
      stage: 'continue-lessons',
      to: '/lessons/',
      ctaLabel: 'Tiếp tục học',
      hint: 'Duy trì nhịp độ đều đặn với các bài học JLPT theo cấp độ của bạn.',
    };
  }

  return {
    stage: 'start-roadmap',
    to: '/roadmap/',
    ctaLabel: 'Mở lộ trình học',
    hint: 'Xem chặng học JLPT và bắt đầu bài học đầu tiên ngay hôm nay.',
  };
}

/**
 * Formats an ISO/Date input into a GMT+7 (Asia/Ho_Chi_Minh) YYYY-MM-DD key matching Backend Streak rules.
 */
export function toVnDateKey(input) {
  if (!input) return '';
  const raw = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = input instanceof Date ? input : new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return y && m && d ? `${y}-${m}-${d}` : '';
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function shiftDateKey(dateKey, deltaDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  return new Date(utc).toISOString().slice(0, 10);
}

/**
 * Builds the set of strictly verified active YYYY-MM-DD dates from real backend telemetry:
 * 1) Consecutive streak window backward from `lastActivityDate` by `currentStreakDays`
 * 2) Today if `isActiveToday`
 * 3) Timestamped records from MockTest/Placement history, Writing/Speaking submissions, and Homework submissions.
 */
export function buildVerifiedActivityDateSet({
  streak,
  mockHistory = [],
  practiceHistory = [],
  homeworkList = [],
  todayKey = toVnDateKey(new Date()),
} = {}) {
  const dates = new Set();

  if (streak?.isActiveToday && todayKey) {
    dates.add(todayKey);
  }

  const lastKey = toVnDateKey(streak?.lastActivityDate);
  const consecutive = Math.max(0, Math.floor(Number(streak?.currentStreakDays) || 0));
  if (lastKey && consecutive > 0) {
    const capped = Math.min(consecutive, 366);
    for (let i = 0; i < capped; i += 1) {
      const k = shiftDateKey(lastKey, -i);
      if (k) dates.add(k);
    }
  } else if (lastKey) {
    dates.add(lastKey);
  }

  for (const item of Array.isArray(mockHistory) ? mockHistory : []) {
    const k = toVnDateKey(item?.submittedAt || item?.completedAt || item?.createdAt || item?.startedAt);
    if (k) dates.add(k);
  }

  for (const item of Array.isArray(practiceHistory) ? practiceHistory : []) {
    const k = toVnDateKey(item?.submittedAt || item?.createdAt || item?.gradedAt);
    if (k) dates.add(k);
  }

  for (const item of Array.isArray(homeworkList) ? homeworkList : []) {
    if (item?.submittedAt || item?.submissionDate || item?.gradedAt) {
      const k = toVnDateKey(item.submittedAt || item.submissionDate || item.gradedAt);
      if (k) dates.add(k);
    }
  }

  return dates;
}

/**
 * Computes Mon..Sun (T2..CN) day states for the current GMT+7 week using only verified dates.
 */
export function buildCurrentWeekStrip(verifiedDates, todayKey = toVnDateKey(new Date())) {
  const safeToday = todayKey || '2026-11-21';
  const [y, m, d] = safeToday.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const jsDay = utc.getUTCDay(); // 0=Sun..6=Sat
  const offsetFromMon = (jsDay + 6) % 7;
  const mondayKey = shiftDateKey(safeToday, -offsetFromMon);
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return labels.map((label, idx) => {
    const dateKey = shiftDateKey(mondayKey, idx);
    const active = verifiedDates instanceof Set ? verifiedDates.has(dateKey) : false;
    const isToday = dateKey === safeToday;
    const isFuture = dateKey > safeToday;
    return {
      key: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][idx],
      label,
      dateKey,
      active,
      isToday,
      isFuture,
    };
  });
}

/**
 * Builds up to 6 Mon-Sun weeks matrix for a given year and 0-indexed month.
 */
export function buildMonthCalendarMatrix(year, monthIndex, verifiedDates, todayKey = toVnDateKey(new Date())) {
  const firstDayUtc = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekdayMon0 = (firstDayUtc.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekdayMon0 + daysInMonth) / 7) * 7;
  const startUtc = Date.UTC(year, monthIndex, 1 - firstWeekdayMon0);

  const weeks = [];
  for (let i = 0; i < totalCells; i += 7) {
    const days = [];
    for (let j = 0; j < 7; j += 1) {
      const cellDate = new Date(startUtc + (i + j) * 86400000);
      const cellKey = cellDate.toISOString().slice(0, 10);
      const inMonth = cellDate.getUTCMonth() === monthIndex;
      days.push({
        dateKey: cellKey,
        dayNumber: cellDate.getUTCDate(),
        inMonth,
        active: verifiedDates instanceof Set ? verifiedDates.has(cellKey) : false,
        isToday: cellKey === todayKey,
      });
    }
    weeks.push({ weekNumber: Math.floor(i / 7) + 1, days });
  }
  return weeks;
}
