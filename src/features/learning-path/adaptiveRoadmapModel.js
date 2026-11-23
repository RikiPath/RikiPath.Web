export const SKILL_LABELS = {
  VOCABULARY: 'Từ vựng',
  KANJI: 'Hán tự',
  GRAMMAR: 'Ngữ pháp',
  READING: 'Đọc hiểu',
  LISTENING: 'Nghe hiểu',
};

export function normalizeRoadmapMode(mode) {
  const value = String(mode ?? '').trim().toUpperCase();
  if (value === 'AI_PERSONALIZED' || value === 'AIPERSONALIZED' || value === 'AI') {
    return 'AI_PERSONALIZED';
  }
  return 'STANDARD';
}

export function formatSkillProfileItem(item) {
  const code = String(item?.skillCode ?? '').trim().toUpperCase();
  const label = item?.skillLabel || SKILL_LABELS[code] || item?.skillName || 'Kỹ năng';
  const status = String(item?.proficiencyStatus ?? item?.status ?? 'NOT_YET_ASSESSED').trim().toUpperCase();
  const sampleCount = Number(item?.evidenceCount ?? item?.weightedQuestionCount ?? item?.sampleCount ?? 0);
  const rawScore = item?.proficiencyPercent ?? item?.accuracyPercent ?? item?.scorePercent ?? item?.weightedScorePercent;
  const hasNumericScore = rawScore !== null && rawScore !== undefined && Number.isFinite(Number(rawScore));

  if (status === 'NOT_YET_ASSESSED' || !hasNumericScore) {
    return {
      skillCode: code || label,
      skillLabel: label,
      status: 'NOT_YET_ASSESSED',
      statusLabel: 'Chưa đủ dữ liệu',
      tone: 'neutral',
      scoreLabel: null,
      sampleCount,
      confidenceLabel: 'Chưa đủ dữ liệu đánh giá',
      sourceSummary: item?.summary || item?.sourceSummary || 'Làm bài đánh giá hoặc bài luyện tập để hệ thống đo chính xác kỹ năng này.',
    };
  }

  const rounded = Math.round(Number(rawScore));
  const statusMeta = (status === 'WEAK' || status === 'NEEDS_REVIEW')
    ? { statusLabel: 'Cần củng cố', tone: 'danger' }
    : status === 'STRONG'
      ? { statusLabel: 'Ổn định', tone: 'success' }
      : { statusLabel: 'Trung bình', tone: 'warning' };

  return {
    skillCode: code || label,
    skillLabel: label,
    status,
    statusLabel: statusMeta.statusLabel,
    tone: statusMeta.tone,
    scoreLabel: `${rounded}%`,
    scorePercent: rounded,
    sampleCount,
    confidenceLabel: item?.confidence || null,
    sourceSummary: item?.summary || item?.sourceSummary || null,
  };
}

export function formatLessonCompletionState(lesson, requiresPlan = false) {
  if (lesson?.isLocked) {
    return { code: 'LOCKED', label: 'Chờ đạt bài trước', tone: 'neutral' };
  }
  if (requiresPlan) {
    return { code: 'PLAN_REQUIRED', label: 'Cần gói tự học', tone: 'warning' };
  }
  const state = String(lesson?.completionState ?? '').trim();
  if (lesson?.isCompleted || state === 'Completed') {
    return { code: 'COMPLETED', label: 'Đã hoàn thành', tone: 'success' };
  }
  if (state === 'NeedsReview') {
    return { code: 'NEEDS_REVIEW', label: 'Cần ôn lại', tone: 'warning' };
  }
  if (state === 'StudiedPendingQuiz' || (lesson?.isStudied && lesson?.hasPracticeExercise)) {
    return { code: 'STUDIED_PENDING_QUIZ', label: 'Chờ đạt kiểm tra nhanh', tone: 'brand' };
  }
  if (lesson?.isStudied && !lesson?.hasPracticeExercise) {
    return { code: 'STUDIED', label: 'Đã xem nội dung', tone: 'brand' };
  }
  return { code: 'READY', label: 'Sẵn sàng', tone: 'brand' };
}

export function formatCheckpointScopeLabel(scope) {
  const normalized = String(scope ?? '').trim();
  if (normalized === 'StageAssessment') {
    return 'Đánh giá tổng kết cấp độ';
  }
  if (normalized === 'GroupQuiz') {
    return 'Kiểm tra cuối chặng';
  }
  return 'Kiểm tra nhanh bài học';
}

export function buildStageProgress(stage) {
  const lessons = Array.isArray(stage?.lessons) ? stage.lessons : [];
  const total = lessons.length;
  const completed = lessons.filter((lesson) => Boolean(lesson?.isCompleted)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const status = String(stage?.status ?? '').trim();
  return {
    completed,
    total,
    percent,
    isCompleted: Boolean(stage?.isCompleted)
      || status === 'Completed'
      || status === 'Mastered'
      || (total > 0 && completed === total),
  };
}

export function resolvePrimaryStages(roadmap) {
  if (Array.isArray(roadmap?.stages) && roadmap.stages.length > 0) {
    return roadmap.stages;
  }
  const lessons = Array.isArray(roadmap?.lessons) ? roadmap.lessons : [];
  if (lessons.length === 0) return [];

  const groups = new Map();
  for (const lesson of lessons) {
    const level = lesson.levelCode || roadmap?.targetJlptLevelName || 'N5';
    const key = `${level}::${lesson.topicTitle || 'Chặng học'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        stageId: key,
        title: lesson.topicTitle || `Lộ trình ${level}`,
        levelCode: level,
        isBridgeStage: Boolean(roadmap?.targetJlptLevelName && level !== roadmap.targetJlptLevelName),
        learningObjectives: null,
        lessons: [],
        groupQuiz: null,
        stageAssessment: null,
      });
    }
    groups.get(key).lessons.push(lesson);
  }
  return Array.from(groups.values());
}
