/**
 * Pure step-by-step learner setup, placement decision, and roadmap eligibility helpers.
 * Derived strictly from Backend responses (authoritative `profile.setupState` when present,
 * with clean fallback derivation from `profile`, `placementStatus`, and `latestPath`).
 * Never unlocks `/roadmap` or fabricates progress from local client flags.
 */

// Learner-facing tooltips: one short sentence per feature and state (no business rules in tooltips).
export const ROADMAP_LOCK_REASON = 'Đánh giá năng lực để mở lộ trình cá nhân hóa AI.';
export const PLACEMENT_GOAL_REASON = 'Đặt mục tiêu JLPT để mở khóa bài đánh giá.';
export const ROADMAP_SETUP_GOAL_REASON = 'Đặt mục tiêu và đánh giá năng lực để tạo lộ trình.';
export const ROADMAP_SETUP_PLACEMENT_REASON = 'Hoàn thành đánh giá năng lực để tạo lộ trình.';
export const ROADMAP_SETUP_IN_PROGRESS_REASON = 'Hoàn thành bài đánh giá đang làm dở.';
export const ROADMAP_SETUP_GRADING_REASON = 'Vui lòng chờ kết quả đánh giá.';
export const ROADMAP_SETUP_FLEXIBLE_REASON = ROADMAP_SETUP_GOAL_REASON;
export const ROADMAP_SETUP_SUPPLEMENT_REASON = ROADMAP_SETUP_PLACEMENT_REASON;
export const ROADMAP_SETUP_READY_REASON = 'Lộ trình của bạn đã sẵn sàng để tạo.';

/** Placement statuses that mean "submitted, result not ready yet" (none are emitted today; handled when they are). */
const GRADING_STATUSES = new Set(['GRADING', 'SCORING', 'PROCESSING', 'PENDING_RESULT']);

/**
 * Sequential learner setup (official rule): Goal → Placement → Roadmap.
 *   goal      — no confirmed JLPT goal (assessment and roadmap are locked)
 *   placement — goal confirmed, no valid assessment for it yet (roadmap locked)
 *   ready     — goal + valid assessment, roadmap not created yet
 *   active    — a roadmap already exists (including earlier learners' standard roadmaps)
 */
export function resolveSetupStep(flow) {
  const hasGoal = Boolean(flow?.hasConfirmedGoal ?? flow?.hasGoal);
  if (!hasGoal) return 'goal';
  if (!flow?.standardRoadmapEligible) return 'placement';
  if (flow?.hasInitializedRoadmap) return 'active';
  return 'ready';
}

/** Dashboard stepper index (0-based) for the current step. */
export function setupStepIndex(step) {
  return step === 'goal' ? 0 : step === 'placement' ? 1 : 2;
}

export const SETUP_STEP_COPY = {
  goal: {
    title: 'Đặt mục tiêu học tập',
    description: 'Hãy chọn mục tiêu JLPT để RikiPath chuẩn bị bài đánh giá phù hợp với bạn.',
  },
  placement: {
    title: 'Hiểu rõ hơn về trình độ của bạn',
    description: 'Bước tiếp theo, hãy đánh giá năng lực để tìm ra lộ trình học phù hợp với bạn.',
  },
  ready: {
    title: 'Sẵn sàng bắt đầu hành trình!',
    description: 'Mục tiêu và kết quả đánh giá đã sẵn sàng. Hãy tạo lộ trình học phù hợp với bạn.',
  },
  active: {
    title: 'Lộ trình học của bạn',
    description: 'Tiếp tục hành trình với bài học tiếp theo trong lộ trình.',
  },
};

export function isPlacementNavigationRoute(to) {
  const normalized = normalizeRoutePath(to);
  return normalized === '/placement' || normalized.startsWith('/placement/')
    || normalized === '/placement-test' || normalized === '/app/placement-test';
}

/** Features whose access depends on the learning setup (not on a plan or AI credits). */
export function setupFeatureForRoute(to) {
  if (isPlacementNavigationRoute(to)) return 'placement';
  if (isRoadmapNavigationRoute(to)) return 'roadmap';
  return null;
}

function placementSituation(flow) {
  const code = String(
    (typeof flow?.placementState === 'string' && flow.placementState)
    || (typeof flow?.placementStatus === 'string' && flow.placementStatus)
    || '',
  ).toUpperCase();
  if (GRADING_STATUSES.has(code)) return 'grading';
  if (flow?.hasPendingPlacementSubmission) return 'expired';
  if (flow?.isPlacementInProgress || flow?.hasActivePlacementAttempt) return 'in-progress';
  if (flow?.placementCanStart === false && flow?.placementCannotStartReason === 'PLACEMENT_ATTEMPT_LIMIT_REACHED') return 'quota';
  if (flow?.placementCompatibilityStatus === 'INSUFFICIENT_FOR_TARGET') return 'insufficient';
  return 'not-started';
}

/**
 * Context-aware guide for a locked setup feature. The feature the learner clicked decides the story
 * (assessment vs roadmap); the shared setup state decides the current step and the next action.
 * Returns null when the feature is open (or while the state is unknown: never a false lock).
 * Strings are VI keys; `primary.to` is a route.
 */
export function resolveFeatureLock(flow, feature) {
  if (!flow || flow.isPending || flow.isError || flow.lockState === 'unknown') return null;
  const hasGoal = Boolean(flow.hasConfirmedGoal ?? flow.hasGoal);
  const goalStep = (status) => ({ id: 'goal', label: 'Đặt mục tiêu JLPT', status });
  const placementStep = (status) => ({ id: 'placement', label: 'Đánh giá năng lực', status });
  const roadmapStep = { id: 'roadmap', label: 'Tạo lộ trình học', status: 'locked' };
  const toGoal = { label: 'Đặt mục tiêu JLPT', to: '/onboarding/' };

  if (feature === 'placement') {
    if (hasGoal) return null;
    return {
      feature,
      state: 'goal-required',
      art: 'placement',
      category: 'ĐÁNH GIÁ NĂNG LỰC',
      title: 'Bắt đầu từ mục tiêu của bạn',
      description: 'Hãy chọn cấp độ JLPT bạn muốn đạt được để RikiPath chuẩn bị bài đánh giá phù hợp.',
      tooltip: PLACEMENT_GOAL_REASON,
      steps: [goalStep('current'), placementStep('locked')],
      primary: toGoal,
    };
  }

  if (feature !== 'roadmap' || flow.standardRoadmapEligible) return null;

  const base = { feature, art: 'roadmap', category: 'LỘ TRÌNH HỌC JLPT' };
  if (!hasGoal) {
    return {
      ...base,
      state: 'goal-required',
      title: 'Hành trình JLPT đang chờ bạn!',
      description: 'Đặt mục tiêu và đánh giá năng lực để xây dựng lộ trình học phù hợp với riêng bạn.',
      tooltip: ROADMAP_SETUP_GOAL_REASON,
      steps: [goalStep('current'), placementStep('locked'), roadmapStep],
      primary: toGoal,
    };
  }

  const steps = [goalStep('done'), placementStep('current'), roadmapStep];
  const toPlacement = (label) => ({ label, to: '/app/placement-test/' });
  switch (placementSituation(flow)) {
    case 'grading':
      return {
        ...base, state: 'grading', steps,
        title: 'Kết quả của bạn đang được xử lý',
        description: 'Bạn có thể tạo lộ trình khi kết quả đánh giá đã sẵn sàng.',
        tooltip: ROADMAP_SETUP_GRADING_REASON,
        primary: null,
      };
    case 'expired':
      return {
        ...base, state: 'in-progress', steps,
        title: 'Còn một bước trước khi tạo lộ trình!',
        description: 'Bài đánh giá đã hết giờ. Hãy nộp bài để xem kết quả.',
        tooltip: ROADMAP_SETUP_IN_PROGRESS_REASON,
        primary: toPlacement('Nộp bài đánh giá'),
      };
    case 'in-progress':
      return {
        ...base, state: 'in-progress', steps,
        title: 'Còn một bước trước khi tạo lộ trình!',
        description: 'Bạn có bài đánh giá đang làm dở. Hoàn thành bài để RikiPath hiểu rõ trình độ hiện tại.',
        tooltip: ROADMAP_SETUP_IN_PROGRESS_REASON,
        primary: toPlacement('Tiếp tục đánh giá'),
      };
    case 'quota':
      // Attempts are counted per goal level (current policy): changing the goal is the supported way forward.
      return {
        ...base, state: 'quota', steps,
        title: 'Bạn đã dùng hết lượt đánh giá',
        description: 'Bạn chưa thể làm thêm bài đánh giá cho mục tiêu này. Hãy xem lại kết quả hoặc đổi mục tiêu JLPT để tiếp tục.',
        tooltip: ROADMAP_SETUP_PLACEMENT_REASON,
        primary: { label: 'Xem kết quả đánh giá', to: '/app/placement-test/' },
      };
    case 'insufficient':
      return {
        ...base, state: 'insufficient', steps,
        title: 'Cần đánh giá lại cho mục tiêu mới',
        description: 'Kết quả trước chưa phù hợp với mục tiêu JLPT hiện tại. Hãy làm bài đánh giá cho mục tiêu này.',
        tooltip: ROADMAP_SETUP_PLACEMENT_REASON,
        primary: toPlacement('Bắt đầu đánh giá'),
      };
    default:
      return {
        ...base, state: 'placement-required', steps,
        title: 'Còn một bước trước khi tạo lộ trình!',
        description: 'Mục tiêu của bạn đã sẵn sàng. Hãy hoàn thành bài đánh giá để RikiPath hiểu rõ trình độ hiện tại.',
        tooltip: ROADMAP_SETUP_PLACEMENT_REASON,
        primary: toPlacement('Bắt đầu đánh giá'),
      };
  }
}

/**
 * Lock indicator for a navigation destination (Sidebar, quick search, dashboard shortcuts) from the one setup
 * state. Returns null when the destination is open. Loading/error never locks (no false lock).
 */
export function setupIndicatorForRoute(flow, to) {
  const feature = setupFeatureForRoute(to);
  const lock = feature ? resolveFeatureLock(flow, feature) : null;
  if (!lock) return null;
  return {
    needsSetup: true,
    feature,
    gate: lock.state === 'goal-required' ? 'goal' : 'placement',
    reason: lock.tooltip,
    targetPath: lock.primary?.to ?? null,
  };
}

export function hasActiveLearningPath(path) {
  if (!path || typeof path !== 'object') return false;
  return String(path.status || '').trim().toUpperCase() === 'ACTIVE';
}

export function hasDraftLearningPath(path) {
  if (!path || typeof path !== 'object') return false;
  return String(path.status || '').trim().toUpperCase() === 'DRAFT';
}

export function normalizeRoutePath(to) {
  const path = String(to || '').split('?')[0].split('#')[0].replace(/\/+$/, '');
  return path || '/';
}

export function isAiRoadmapRoute(to) {
  return normalizeRoutePath(to) === '/roadmap';
}

export function isRoadmapNavigationRoute(to) {
  const normalized = normalizeRoutePath(to);
  return normalized === '/roadmap' || normalized.startsWith('/roadmap/');
}

function upper(value, fallback = '') {
  const text = String(value ?? '').trim().toUpperCase();
  return text || fallback;
}

/**
 * Classifies the learner's authoritative setup & roadmap readiness state, keeping
 * goal confirmation, placement decision, standard/AI eligibility, AI generation state,
 * and active roadmap selection strictly separated.
 */
export function computeLearningFlowState({
  profile,
  placementStatus,
  latestPath,
  setupState: explicitSetupState,
  isPending = false,
  isError = false,
} = {}) {
  const ss = explicitSetupState ?? profile?.setupState ?? null;

  const hasConfirmedGoal = ss
    ? Boolean(ss.hasConfirmedGoal)
    : Boolean(profile?.targetJlptLevelId || profile?.targetJlptLevelName);
  const hasGoal = hasConfirmedGoal;

  const hasPlacementCompleted = ss
    ? Boolean(ss.hasValidCompletedPlacement)
    : Boolean(hasConfirmedGoal && (placementStatus?.hasCompletedPlacementTest || placementStatus?.latestCompletedAttemptId));

  const hasActivePlacementAttempt = ss
    ? Boolean(ss.hasActivePlacementAttempt)
    : Boolean(placementStatus?.hasActiveAttempt);

  const hasPendingPlacementSubmission = ss
    ? Boolean(ss.hasPendingPlacementSubmission)
    : Boolean(placementStatus?.attemptAllowance?.pendingSubmissionAttemptId);

  const isPlacementInProgress = hasActivePlacementAttempt || hasPendingPlacementSubmission;

  const rawDecision = upper(
    ss?.placementDecision ?? placementStatus?.placementDecision ?? profile?.placementDecision,
    'NOT_TAKEN',
  );

  const isPlacementExplicitlySkipped = ss
    ? Boolean(ss.isPlacementExplicitlySkipped)
    : Boolean(!hasPlacementCompleted && rawDecision === 'SKIPPED');

  const placementStatusCode = ss?.placementStatus
    ? upper(ss.placementStatus)
    : hasPlacementCompleted
      ? 'COMPLETED'
      : hasActivePlacementAttempt
        ? 'IN_PROGRESS'
        : hasPendingPlacementSubmission
          ? 'PENDING_SUBMISSION'
          : isPlacementExplicitlySkipped
            ? 'EXPLICITLY_SKIPPED'
            : 'NOT_STARTED';

  const standardRoadmapEligible = ss
    ? Boolean(ss.standardRoadmapEligible)
    : Boolean(hasConfirmedGoal && hasPlacementCompleted);

  const aiRoadmapEligible = ss
    ? Boolean(ss.aiRoadmapEligible)
    : Boolean(hasConfirmedGoal && hasPlacementCompleted);

  const hasActiveAiPath = ss
    ? Boolean(ss.aiRoadmapState === 'READY' || (ss.hasActiveAiRoadmap && ss.activeAiRoadmapMatchesGoal !== false))
    : hasActiveLearningPath(latestPath);

  const hasDraftAiPreview = ss
    ? Boolean(ss.hasDraftAiRoadmapPreview)
    : hasDraftLearningPath(latestPath);

  const aiRoadmapState = ss?.aiRoadmapState
    ? upper(ss.aiRoadmapState)
    : !aiRoadmapEligible
      ? 'NOT_ELIGIBLE'
      : hasActiveAiPath
        ? 'READY'
        : hasDraftAiPreview
          ? 'DRAFT_PREVIEW'
          : 'NOT_GENERATED';

  const hasAnyValidRoadmap = ss
    ? Boolean(ss.hasInitializedRoadmap ?? ss.hasAnyValidRoadmap)
    : Boolean(hasActiveAiPath);

  const hasInitializedRoadmap = hasAnyValidRoadmap;

  const activeRoadmapType = ss?.activeRoadmapType
    ? upper(ss.activeRoadmapType)
    : !hasInitializedRoadmap
      ? 'NONE'
      : hasActiveAiPath && upper(profile?.learningMode) === 'AI_PERSONALIZED'
        ? 'AI_PERSONALIZED'
        : 'STANDARD';

  const assessedJlptLevelName = ss?.assessedJlptLevelName ?? placementStatus?.assessedJlptLevelName ?? profile?.assessedJlptLevelName ?? null;
  const assessedJlptLevelId = ss?.assessedJlptLevelId ?? placementStatus?.assessedJlptLevelId ?? profile?.assessedJlptLevelId ?? null;
  const latestPlacementAssessmentLevelName = ss?.latestPlacementAssessmentLevelName ?? placementStatus?.latestAssessmentLevelName ?? null;
  const latestPlacementIsComprehensive = Boolean(ss?.latestPlacementIsComprehensive ?? placementStatus?.latestAssessmentIsComprehensive);
  const placementCompatibilityStatus = upper(
    ss?.placementCompatibilityStatus ?? placementStatus?.placementCompatibilityStatus,
    hasPlacementCompleted ? (hasConfirmedGoal ? 'COMPATIBLE' : 'GOAL_NOT_SET') : 'NONE',
  );
  const placementCompatibilityReason = ss?.placementCompatibilityReason ?? placementStatus?.placementCompatibilityReason ?? null;

  const placementQuotaInitialized = Boolean(
    ss?.placementQuotaInitialized ?? placementStatus?.quotaInitialized ?? placementStatus?.attemptAllowance,
  );
  const placementAttemptLimit = ss?.placementAttemptLimit ?? placementStatus?.attemptAllowance?.limit ?? null;
  const placementAttemptsStarted = ss?.placementAttemptsStarted ?? placementStatus?.attemptAllowance?.started ?? null;
  const placementAttemptsRemaining = ss?.placementAttemptsRemaining ?? placementStatus?.attemptAllowance?.remaining ?? null;
  const placementCanStart = ss?.placementCanStart ?? placementStatus?.canStartNewAttempt ?? true;
  const placementCannotStartReason = ss?.placementCannotStartReason ?? placementStatus?.cannotStartReason ?? null;

  const setupStage = ss?.setupStage
    ? upper(ss.setupStage)
    : !hasConfirmedGoal
      ? 'GOAL_REQUIRED'
      : !standardRoadmapEligible
        ? (isPlacementInProgress ? 'PLACEMENT_IN_PROGRESS' : 'PLACEMENT_REQUIRED')
        : hasInitializedRoadmap
          ? 'ROADMAP_ACTIVE'
          : aiRoadmapEligible
            ? 'AI_READY_TO_GENERATE'
            : 'STANDARD_READY';

  const nextAction = ss?.nextAction
    ? upper(ss.nextAction)
    : setupStage === 'GOAL_REQUIRED'
      ? 'COMPLETE_ONBOARDING'
      : setupStage === 'PLACEMENT_IN_PROGRESS'
        ? (hasPendingPlacementSubmission ? 'SUBMIT_EXPIRED_PLACEMENT' : 'RESUME_PLACEMENT')
        : setupStage === 'PLACEMENT_REQUIRED'
          ? (placementCompatibilityStatus === 'INSUFFICIENT_FOR_TARGET' ? 'SUPPLEMENT_PLACEMENT' : 'START_PLACEMENT')
          : setupStage === 'STANDARD_READY'
            ? 'OPEN_STANDARD_ROADMAP'
            : setupStage === 'AI_READY_TO_GENERATE'
              ? 'GENERATE_AI_ROADMAP'
              : 'CONTINUE_ROADMAP';

  const hasValidRoadmapProgress = ss
    ? Boolean(ss.hasValidRoadmapProgress)
    : hasInitializedRoadmap;
  const roadmapCompletedLessons = ss ? (ss.roadmapCompletedLessons ?? null) : null;
  const roadmapTotalLessons = ss ? (ss.roadmapTotalLessons ?? null) : null;
  const roadmapCompletionPercent = ss ? (ss.roadmapCompletionPercent ?? null) : null;

  let lockState = 'open';
  if (isPending && !latestPath && !ss) {
    lockState = 'unknown';
  } else if (isError && !latestPath && !ss) {
    lockState = 'unknown';
  }

  // Backwards-compatible step classification for AI roadmap guide
  let step;
  if (hasActiveAiPath) {
    step = 'ready';
  } else if (!hasConfirmedGoal) {
    step = 'goal';
  } else if (!hasPlacementCompleted) {
    step = 'placement';
  } else {
    step = 'generate-ai';
  }

  // Sidebar / QuickJump lock opens RoadmapSetupModal only when prerequisites for ANY roadmap are genuinely incomplete.
  // Once goal + compatible placement (or explicit skip) are satisfied, `/roadmap` opens directly with initialized/unlocked state.
  const isRoadmapSetupIncomplete = !isPending && !isError && !standardRoadmapEligible;
  const roadmapNavReason = !hasConfirmedGoal
    ? ROADMAP_SETUP_GOAL_REASON
    : !standardRoadmapEligible
      ? ROADMAP_SETUP_PLACEMENT_REASON
      : ROADMAP_SETUP_READY_REASON;
  const roadmapNavIndicator = {
    needsSetup: isRoadmapSetupIncomplete,
    gate: hasConfirmedGoal ? 'placement' : 'goal',
    reason: roadmapNavReason,
    targetPath: '/roadmap',
  };

  return {
    // Canonical separated fields
    onboardingCompleted: hasConfirmedGoal,
    hasConfirmedGoal,
    placementStatus: placementStatusCode,
    placementDecision: hasPlacementCompleted ? 'COMPLETED' : isPlacementExplicitlySkipped ? 'SKIPPED' : 'NOT_TAKEN',
    hasActivePlacementAttempt,
    activePlacementAttemptId: ss?.activePlacementAttemptId ?? placementStatus?.activeAttemptId ?? null,
    hasPendingPlacementSubmission,
    pendingSubmissionAttemptId: ss?.pendingSubmissionAttemptId ?? placementStatus?.attemptAllowance?.pendingSubmissionAttemptId ?? null,
    hasPlacementCompleted,
    isPlacementInProgress,
    isPlacementExplicitlySkipped,
    assessedJlptLevelId,
    assessedJlptLevelName,
    latestPlacementAssessmentLevelName,
    latestPlacementIsComprehensive,
    placementCompatibilityStatus,
    placementCompatibilityReason,
    placementQuotaInitialized,
    placementAttemptLimit,
    placementAttemptsStarted,
    placementAttemptsRemaining,
    placementCanStart,
    placementCannotStartReason,
    standardRoadmapEligible,
    aiRoadmapEligible,
    aiRoadmapState,
    hasActiveAiPath,
    hasDraftAiPreview,
    hasInitializedRoadmap,
    hasAnyValidRoadmap: hasInitializedRoadmap,
    activeRoadmapType,
    setupStage,
    nextAction,
    blockingErrorCode: ss?.blockingErrorCode ?? null,
    hasValidRoadmapProgress,
    roadmapCompletedLessons,
    roadmapTotalLessons,
    roadmapCompletionPercent,
    isRoadmapSetupIncomplete,
    roadmapNavIndicator,

    // Backwards-compatible properties
    step,
    hasGoal,
    lockState,
  };
}
