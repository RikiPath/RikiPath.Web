/**
 * Normalizes Backend daily schedule lessons (either parallel string/id arrays or object list)
 * into linkable lesson items without fabricating IDs.
 *
 * @param {object} dayItem
 * @returns {Array<{ lessonId: number|string|null, title: string }>}
 */
export function normalizeDayLessons(dayItem) {
  if (!dayItem || !Array.isArray(dayItem.lessons)) return [];
  const lessonIds = Array.isArray(dayItem.lessonIds) ? dayItem.lessonIds : [];

  return dayItem.lessons
    .map((entry, idx) => {
      if (typeof entry === 'string') {
        const title = entry.trim();
        if (!title) return null;
        return {
          lessonId: lessonIds[idx] ?? null,
          title,
        };
      }
      if (entry && typeof entry === 'object') {
        const title = String(entry.title || entry.name || '').trim();
        const lessonId = entry.lessonId ?? entry.id ?? lessonIds[idx] ?? null;
        if (!title && lessonId == null) return null;
        return {
          lessonId,
          title: title || `Bài ${idx + 1}`,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Resolves status string for a single day node on the roadmap tree.
 *
 * @param {object} dayItem
 * @returns {'completed'|'active'|'ready'|'locked'}
 */
export function deriveDayStatus(dayItem) {
  if (!dayItem) return 'locked';
  if (dayItem.isCompleted) return 'completed';
  if (dayItem.isStarted) return 'active';
  if (dayItem.canStart) return 'ready';
  return 'locked';
}

function buildFallbackPhases(schedules) {
  if (!Array.isArray(schedules) || schedules.length === 0) return [];
  const chunkSize = 5;
  const groups = [];
  for (let i = 0; i < schedules.length; i += chunkSize) {
    const slice = schedules.slice(i, i + chunkSize);
    const startDay = slice[0].day;
    const endDay = slice[slice.length - 1].day;
    groups.push({
      title: `Chặng ${groups.length + 1}`,
      focus: slice[0].focus || slice[0].title || '',
      startDay,
      endDay,
      startDate: slice[0].date || null,
      endDate: slice[slice.length - 1].date || null,
    });
  }
  return groups;
}

/**
 * Picks up to `limit` most informative days for compact branch view while always
 * including the active/ready day so learners see their next action immediately.
 *
 * @param {Array} days
 * @param {number} [limit=3]
 * @returns {{ visible: Array, hiddenCount: number }}
 */
export function pickPreviewBranchDays(days, limit = 3) {
  if (!Array.isArray(days) || days.length <= limit) {
    return { visible: Array.isArray(days) ? days : [], hiddenCount: 0 };
  }
  const activeIdx = days.findIndex((d) => !d.isCompleted && (d.isStarted || d.canStart));
  let start = 0;
  if (activeIdx >= 0) {
    start = Math.max(0, Math.min(activeIdx - 1, days.length - limit));
  } else if (days.every((d) => d.isCompleted)) {
    start = Math.max(0, days.length - limit);
  }
  const visible = days.slice(start, start + limit);
  return {
    visible,
    hiddenCount: Math.max(0, days.length - visible.length),
  };
}

/**
 * Builds the horizontal Left -> Right branching roadmap tree model directly from Backend
 * `LearningPathResponse`.
 *
 * @param {object|null|undefined} path
 * @param {object} [options]
 * @param {string} [options.targetLevelLabel]
 */
export function buildAiRoadmapTree(path, { targetLevelLabel } = {}) {
  const schedules = Array.isArray(path?.dailySchedules)
    ? [...path.dailySchedules].sort((a, b) => Number(a?.day ?? 0) - Number(b?.day ?? 0))
    : [];

  const totalDays = schedules.length || Number(path?.totalStudyDays) || 0;
  const completedDays = schedules.filter((d) => d?.isCompleted).length;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0;

  const rawPhases = Array.isArray(path?.phases) && path.phases.length > 0
    ? [...path.phases].sort((a, b) => Number(a?.startDay ?? 0) - Number(b?.startDay ?? 0))
    : buildFallbackPhases(schedules);

  const assignedDayNumbers = new Set();
  const branches = rawPhases.map((phase, idx) => {
    const startDay = Number(phase?.startDay ?? 0);
    const endDay = Number(phase?.endDay ?? 0);
    const isLast = idx === rawPhases.length - 1;

    const phaseDays = schedules.filter((dayItem) => {
      const dayNum = Number(dayItem?.day ?? 0);
      if (assignedDayNumbers.has(dayNum)) return false;
      const inBounds = startDay > 0 && endDay >= startDay
        ? dayNum >= startDay && dayNum <= endDay
        : isLast;
      const trailingOrphan = isLast && !inBounds;
      if (inBounds || trailingOrphan) {
        assignedDayNumbers.add(dayNum);
        return true;
      }
      return false;
    });

    const doneCount = phaseDays.filter((d) => d?.isCompleted).length;
    const totalCount = phaseDays.length;
    const hasStartedOrReady = phaseDays.some((d) => !d?.isCompleted && (d?.isStarted || d?.canStart));
    const allCompleted = totalCount > 0 && doneCount === totalCount;

    let status = 'locked';
    if (allCompleted) {
      status = 'completed';
    } else if (hasStartedOrReady || (doneCount > 0 && doneCount < totalCount)) {
      status = 'active';
    } else if (idx === 0 && totalCount === 0) {
      status = 'active';
    }

    const activeDay = phaseDays.find((d) => !d?.isCompleted && (d?.isStarted || d?.canStart)) || null;

    return {
      id: `phase-${idx + 1}`,
      index: idx,
      number: String(idx + 1).padStart(2, '0'),
      title: String(phase?.title || `Chặng ${idx + 1}`),
      focus: String(phase?.focus || ''),
      startDay: phase?.startDay ?? (phaseDays[0]?.day ?? null),
      endDay: phase?.endDay ?? (phaseDays[phaseDays.length - 1]?.day ?? null),
      startDate: phase?.startDate || null,
      endDate: phase?.endDate || null,
      days: phaseDays.map((d) => ({
        ...d,
        status: deriveDayStatus(d),
        normalizedLessons: normalizeDayLessons(d),
      })),
      completedCount: doneCount,
      totalCount,
      status,
      activeDay,
    };
  });

  const activeBranch = branches.find((b) => b.status === 'active')
    || branches.find((b) => b.status !== 'completed')
    || branches[0]
    || null;

  const activeDay = schedules.find((d) => !d?.isCompleted && (d?.isStarted || d?.canStart))
    || schedules.find((d) => !d?.isCompleted)
    || schedules[0]
    || null;

  const levelCode = targetLevelLabel || '';

  return {
    root: {
      levelCode,
      dailyStudyMinutes: Number(path?.dailyStudyMinutes) || 0,
      daysUntilExam: path?.daysUntilExam ?? null,
      completedDays,
      totalDays,
      progressPercent,
    },
    branches,
    activeBranchId: activeBranch?.id || null,
    activeDay,
    goal: {
      levelCode,
      completedDays,
      totalDays,
      progressPercent,
      isCompleted: totalDays > 0 && completedDays >= totalDays,
    },
    stats: {
      completedDays,
      totalDays,
      progressPercent,
    },
  };
}
