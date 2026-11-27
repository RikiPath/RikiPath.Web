import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  CloudOff,
  RotateCcw,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  AlertDialog,
  Banner,
  Button,
  ContextualErrorState,
  CountBadge,
  PageContainer,
  SakuraLoader,
  notify,
} from '@/components/ui';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  deleteTeachingProposalDraft,
  getMyTeachingProposal,
  getTeachingProposalContext,
  hideRejectedTeachingProposal,
  resubmitTeachingProposal,
  submitTeachingProposal,
  validateTeachingProposal,
  withdrawTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  buildProposalPreviewCalendarSlots,
  calendarSlotToWeeklySlot,
  computeMentorRegistrationCapacity,
  dayKeyToWeekday,
  DEFAULT_PROPOSAL_POLICY,
  findNextFutureDayKeyForWeeklyPattern,
  isFutureWeeklySlotOccurrence,
  normalizeProposalPolicy,
  resolveJlptLevelAvailability,
  resolveStableReferenceWeek,
  sortWeeklySessions,
  validateProposalState,
  validateWeeklySlotAddition,
  weeklySlotKey,
} from '@/features/scheduling/utils/proposalValidation.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import {
  buildSubmitIdempotencyKey,
  clearLocalDraft,
  DRAFT_SAVE_STATUS,
} from '@/features/scheduling/utils/proposalDraftStorage.js';
import { useProposalDraftPersistence } from '@/features/scheduling/hooks/useProposalDraftPersistence.js';
import {
  clockFromMinutes,
  vnLocalToUtcIso,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import { getViewDateRange, mondayOfDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import InteractiveSlotCalendar from '@/features/scheduling/components/InteractiveSlotCalendar.jsx';
import TeachingProposalCourseInfoDrawer from '@/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx';
import TeachingProposalReviewModal from '@/features/scheduling/components/TeachingProposalReviewModal.jsx';
import { describeApiError } from '@/api/apiErrors.js';
import { useLocale } from '@/locales/locale.js';

function hasEnteredClassMetadata(d) {
  return Boolean(
    d
    && (
      d.certificateLevelId
      || String(d.courseTitle || '').trim()
      || String(d.courseObjective || '').trim()
      || String(d.optionalNotes || '').trim()
      || (Array.isArray(d.optionalAttachments) && d.optionalAttachments.length > 0)
    )
  );
}

function createEmptyDraft(policy) {
  return {
    id: null,
    status: 'Draft',
    revision: 0,
    certificateLevelId: null,
    jlptLevelCode: null,
    programType: 'StandardJlpt',
    coursePlanId: null,
    courseTitle: '',
    courseObjective: '',
    expectedStartDate: '',
    referenceStartDate: null,
    courseDurationWeeks: 1,
    sessionDurationMinutes: policy?.sessionDurationMinutes ?? 90,
    weeklySessions: [],
    optionalNotes: '',
    optionalAttachments: [],
    reviewReason: null,
    history: [],
  };
}

function isBlankProposalDraft(p) {
  return Boolean(
    p
    && p.status === 'Draft'
    && (!p.weeklySessions || p.weeklySessions.length === 0)
  );
}

function reconcileEditableDraft(targetDraft) {
  return targetDraft;
}

function normalizeServerProposalToDraft(p, policy) {
  if (!p) return createEmptyDraft(policy);
  return {
    ...p,
    programType: 'StandardJlpt',
    coursePlanId: null,
    courseTitle: p.courseTitle || '',
    courseObjective: p.courseObjective || '',
    expectedStartDate: p.status === 'Approved' ? (p.expectedStartDate || '') : '',
    referenceStartDate: p.status === 'Approved' ? null : (p.referenceStartDate || null),
    optionalNotes: p.optionalNotes || '',
    optionalAttachments: Array.isArray(p.optionalAttachments) ? p.optionalAttachments : [],
    weeklySessions: sortWeeklySessions(p.weeklySessions || []),
    courseDurationWeeks: Math.max(1, Number(p.courseDurationWeeks || 1)),
    sessionDurationMinutes: p.sessionDurationMinutes || policy?.sessionDurationMinutes || 90,
  };
}

function areWeeklySchedulesEqual(a, b, defaultMinutes = 90) {
  const toCanonical = (list) => sortWeeklySessions(list || [])
    .map((s) => `${Number(s.weekday)}:${Number(s.startMinute)}:${Number(s.endMinute || Number(s.startMinute) + defaultMinutes)}`)
    .join('|');
  return toCanonical(a) === toCanonical(b);
}

function buildStep1InvalidMaps(validationErrors = []) {
  const wkMap = new Map();
  const occMap = new Map();
  const invalidKeys = new Set();
  const step1Blocking = (validationErrors || []).filter(
    (e) => e.step === 1 && e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'
  );
  for (const err of step1Blocking) {
    if (err.slotKey) {
      invalidKeys.add(err.slotKey);
      if (!wkMap.has(err.slotKey)) {
        wkMap.set(err.slotKey, err.message);
      }
      if (err.conflictDate) {
        const parts = String(err.slotKey).split('_');
        const startMin = Number(parts[1]);
        if (Number.isFinite(startMin)) {
          occMap.set(`${err.conflictDate}_${startMin}`, err.message);
        }
      }
    }
  }
  return {
    invalidWeeklyMap: wkMap,
    invalidOccurrenceMap: occMap,
    invalidPatternCount: invalidKeys.size > 0 ? invalidKeys.size : step1Blocking.length,
  };
}

const VALIDATE_DEBOUNCE_MS = 450;

export default function MentorShiftSchedule() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const workspace = useMentorScheduleWorkspace({ includeCalendarStatus: false });
  const {
    uid,
    slots,
    cohorts,
    policy: availabilityPolicy,
    scheduleQuery,
    availabilityQuery,
    cohortsQuery,
    invalidateScheduling,
    movePendingSlot,
    deletePendingSlot,
    requestCancelSlot,
    requestChangeSlot,
  } = workspace;

  const contextKey = useMemo(() => ['mentor-teaching-proposals-context', uid], [uid]);
  const contextQuery = useQuery({
    queryKey: contextKey,
    queryFn: getTeachingProposalContext,
    refetchInterval: 30000,
  });

  const ctx = contextQuery.data;
  const proposalPolicy = useMemo(
    () => normalizeProposalPolicy(ctx?.policy || DEFAULT_PROPOSAL_POLICY),
    [ctx?.policy]
  );
  const availableLevels = useMemo(
    () => (ctx?.availableLevels?.length ? ctx.availableLevels : ctx?.qualifiedLevels || []),
    [ctx]
  );
  const qualifiedLevels = useMemo(() => ctx?.qualifiedLevels || [], [ctx?.qualifiedLevels]);
  const rawProposals = ctx?.proposals;
  const proposals = useMemo(
    () => (Array.isArray(rawProposals) ? rawProposals.filter((p) => p && p.status !== 'Withdrawn') : []),
    [rawProposals]
  );
  const mentorVerified = ctx?.mentorVerified !== false;
  const mentorVerifiedJlptLevel = ctx?.mentorVerifiedJlptLevel || null;
  const mentorDeclaredJlptLevel = ctx?.mentorDeclaredJlptLevel || null;

  const mentorLevelAvailability = useMemo(
    () => resolveJlptLevelAvailability({
      availableLevels,
      qualifiedLevels,
      mentorVerified,
      mentorVerifiedJlptLevel,
    }),
    [availableLevels, mentorVerified, mentorVerifiedJlptLevel, qualifiedLevels]
  );

  const registrationCapacity = useMemo(
    () => computeMentorRegistrationCapacity({
      levelAvailability: mentorLevelAvailability,
      mentorVerified,
      loaded: Boolean(ctx) && !contextQuery.isLoading,
    }),
    [contextQuery.isLoading, ctx, mentorLevelAvailability, mentorVerified]
  );

  const isCapacityExhausted = registrationCapacity.isCapacityExhausted;
  const capacityMessage = tr(registrationCapacity.message || 'Bạn đã đăng ký đủ các cấp độ giảng dạy.');
  const officialProposalCount = useMemo(
    () => proposals.filter((p) => p && p.status !== 'Draft' && p.status !== 'Withdrawn').length,
    [proposals]
  );

  // Template Calendar View State: fixed Mon–Sun 1-week pattern (V4 Flexible Teaching)
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar');
  const [calendarAnchorKey, setCalendarAnchorKey] = useState(() => mondayOfDateKey(toVnDateKey(new Date())));
  const [visibleCalendarRange, setVisibleCalendarRange] = useState(() => getViewDateRange(mondayOfDateKey(toVnDateKey(new Date())), 'week'));
  const handleVisibleRangeChange = useCallback((nextRange) => {
    if (!nextRange?.startKey || !nextRange?.endKey) return;
    setVisibleCalendarRange((prev) => (
      prev?.startKey === nextRange.startKey
      && prev?.endKey === nextRange.endKey
      && prev?.view === nextRange.view
        ? prev
        : { startKey: nextRange.startKey, endKey: nextRange.endKey, view: nextRange.view }
    ));
  }, []);
  const [calendarFocusRequest, setCalendarFocusRequest] = useState(null);

  // Stable business reference week for weekly slot preview projections
  const [referenceWeekKey, setReferenceWeekKey] = useState(null);
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());
  useEffect(() => {
    const refreshNow = () => setLiveNowMs(Date.now());
    const id = setInterval(refreshNow, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshNow();
    };
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const [draft, setDraft] = useState(() => createEmptyDraft(DEFAULT_PROPOSAL_POLICY));
  const [initialized, setInitialized] = useState(false);

  // Step 2 & Step 3 Overlays + Isolated Revision Editing Flow + Read-Only Detail Modal + Registration History Drawer
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [showCourseErrors, setShowCourseErrors] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState(null);
  const [revisionBaseline, setRevisionBaseline] = useState(null);
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false);
  const [revisionShowErrors, setRevisionShowErrors] = useState(false);
  const [revisionReviewOpen, setRevisionReviewOpen] = useState(false);
  const [revisionScheduleEditing, setRevisionScheduleEditing] = useState(false);
  const [revisionScheduleSessions, setRevisionScheduleSessions] = useState([]);
  const [inspectedProposal, setInspectedProposal] = useState(null);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [highlightedProposalId, setHighlightedProposalId] = useState(null);

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [hideRejectedTarget, setHideRejectedTarget] = useState(null);
  const [clearSelectionConfirmOpen, setClearSelectionConfirmOpen] = useState(false);
  const [clearingSelection, setClearingSelection] = useState(false);
  const [reregisterConfirmTarget, setReregisterConfirmTarget] = useState(null);

  const submitKeyRef = useRef(null);
  const resubmitKeyRef = useRef(null);
  // Active working draft on the Calendar is strictly for unsent 'Draft' selections.
  // Official 'ChangesRequested' proposals are NEVER loaded into `draft`; they stay official orange cards
  // and edit exclusively inside the isolated `revisionDraft` flow.
  const isEditable = draft.status === 'Draft';

  const [prevCapacityExhausted, setPrevCapacityExhausted] = useState(isCapacityExhausted);
  if (isCapacityExhausted !== prevCapacityExhausted) {
    setPrevCapacityExhausted(isCapacityExhausted);
    if (isCapacityExhausted) {
      setCourseDrawerOpen(false);
      setReviewModalOpen(false);
    }
  }

  const invalidateProposals = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: contextKey }),
      invalidateScheduling(),
    ]);
  }, [contextKey, invalidateScheduling, queryClient]);

  const persistence = useProposalDraftPersistence({
    userId: uid,
    draft,
    isEditable: isEditable && !revisionScheduleEditing && !isCapacityExhausted,
    onServerSynced: (saved) => {
      setDraft((cur) => ({
        ...cur,
        id: saved.id,
        revision: saved.revision,
        status: saved.status,
        lastSavedAtUtc: saved.lastSavedAtUtc,
        updatedAtUtc: saved.updatedAtUtc,
      }));
      queryClient.invalidateQueries({ queryKey: contextKey });
    },
    onRestoreDraft: (restored, meta) => {
      setDraft(normalizeServerProposalToDraft(restored, proposalPolicy));
      if (meta?.restoredFromLocal) {
        notify.info(tr('Đã khôi phục lịch dạy đang chọn trên thiết bị này.'));
      }
    },
    onReconnectRevalidate: () => {
      contextQuery.refetch();
      invalidateScheduling();
    },
  });

  // Initial load hydration:
  // - Calendar ONLY hydrates the Mentor's single unsent 'Draft' working selection.
  // - Official proposals ('ChangesRequested', 'PendingReview', 'Approved', 'Rejected') are NEVER
  //   restored into `draft`, preserving both business status and any parallel active selection.
  useEffect(() => {
    if (!ctx || initialized) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setInitialized(true);
      const singleDraft = proposals.find((p) => p.status === 'Draft' && !isBlankProposalDraft(p)) || null;

      if (singleDraft) {
        const normalized = normalizeServerProposalToDraft(singleDraft, proposalPolicy);
        const hydrated = persistence.hydrateFromServer(normalized);
        const safeHydrated = hydrated && hydrated.status === 'Draft' ? hydrated : normalized;
        const targetDraft = reconcileEditableDraft(
          normalizeServerProposalToDraft(safeHydrated, proposalPolicy),
          proposalPolicy
        );
        setDraft(targetDraft);
        if (targetDraft.referenceStartDate) {
          setReferenceWeekKey(mondayOfDateKey(targetDraft.referenceStartDate));
        }
      } else {
        const blank = createEmptyDraft(proposalPolicy);
        const hydrated = persistence.hydrateFromServer(blank);
        const safeHydrated = hydrated && hydrated.status === 'Draft' ? hydrated : blank;
        const targetDraft = reconcileEditableDraft(
          normalizeServerProposalToDraft(safeHydrated, proposalPolicy),
          proposalPolicy
        );
        setDraft(targetDraft);
        if (targetDraft.referenceStartDate) {
          setReferenceWeekKey(mondayOfDateKey(targetDraft.referenceStartDate));
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [ctx, initialized, persistence, proposalPolicy, proposals]);

  // Notification & URL Deep Link handler (?proposalId=X): redirect to dedicated History page
  const urlProposalIdParam = Number(searchParams.get('proposalId') || 0);
  useEffect(() => {
    if (!urlProposalIdParam) return;
    navigate(`/mentor-proposal-history/?proposalId=${urlProposalIdParam}`, { replace: true });
  }, [navigate, urlProposalIdParam]);

  // Smoothly scroll highlighted deep-linked proposal card into view inside Registration History Drawer
  useEffect(() => {
    if (!listDrawerOpen || !highlightedProposalId) return undefined;
    const timer = window.setTimeout(() => {
      const el = document.querySelector(`[data-history-proposal-id="${highlightedProposalId}"]`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [highlightedProposalId, listDrawerOpen]);

  // V4 Template Mode: drafting weekly patterns is completely decoupled from existing proposals or official cohorts.
  const commitments = useMemo(() => [], []);
  const revisionCommitments = useMemo(() => [], []);

  // Authoritative Business Validation — strictly preserves draft reference week context (never dependent on viewport alone)
  const clientValidation = useMemo(
    () => validateProposalState({
      proposal: draft,
      availableLevels,
      qualifiedLevels,
      mentorVerified,
      mentorVerifiedJlptLevel,
      proposals,
      cohorts,
      commitments,
      referenceWeekKey: draft.referenceStartDate || referenceWeekKey || null,
      viewAnchorKey: null,
      policy: proposalPolicy,
      nowMs: liveNowMs,
    }),
    [draft, availableLevels, qualifiedLevels, mentorVerified, mentorVerifiedJlptLevel, proposals, cohorts, commitments, referenceWeekKey, proposalPolicy, liveNowMs]
  );

  const revisionValidation = useMemo(
    () => (revisionDraft
      ? validateProposalState({
        proposal: revisionDraft,
        availableLevels,
        qualifiedLevels,
        mentorVerified,
        mentorVerifiedJlptLevel,
        proposals,
        cohorts,
        commitments: revisionCommitments,
        referenceWeekKey: revisionDraft.referenceStartDate || referenceWeekKey || null,
        viewAnchorKey: null,
        policy: proposalPolicy,
        nowMs: liveNowMs,
      })
      : clientValidation),
    [availableLevels, clientValidation, cohorts, liveNowMs, mentorVerified, mentorVerifiedJlptLevel, proposalPolicy, proposals, qualifiedLevels, referenceWeekKey, revisionCommitments, revisionDraft]
  );

  // Representative weekly projections across visible Mon–Sun template week (includes all 7 weekdays).
  const proposalPreview = useMemo(
    () => buildProposalPreviewCalendarSlots({
      weeklySessions: draft.weeklySessions || [],
      visibleRange: visibleCalendarRange,
      referenceWeekKey: calendarAnchorKey,
      commitments,
      policy: proposalPolicy,
      nowMs: liveNowMs,
      includeAllWeekDays: true,
    }),
    [draft.weeklySessions, visibleCalendarRange, calendarAnchorKey, commitments, proposalPolicy, liveNowMs]
  );

  // Only render green editable selection cards when the proposal is editable (`Draft`).
  // Submitted/locked proposals (`PendingReview`, `Approved`, etc.) render with their real status tone (e.g. amber `Chờ duyệt`).
  const calendarSelectedSlots = useMemo(
    () => (isEditable ? proposalPreview.slots : []),
    [isEditable, proposalPreview.slots]
  );

  // Explicit Schedule Editing Mode for an existing `ChangesRequested` proposal:
  // Operates purely on temporary working-copy state (`revisionScheduleSessions`), leaving both
  // the official proposal and the Mentor's unrelated `draft` untouched until Apply/Resubmit.
  const revisionScheduleWorkingProposal = useMemo(
    () => (revisionScheduleEditing && revisionDraft
      ? {
        ...revisionDraft,
        weeklySessions: revisionScheduleSessions,
      }
      : null),
    [revisionDraft, revisionScheduleEditing, revisionScheduleSessions]
  );

  const revisionScheduleValidation = useMemo(
    () => (revisionScheduleWorkingProposal
      ? validateProposalState({
        proposal: revisionScheduleWorkingProposal,
        availableLevels,
        qualifiedLevels,
        mentorVerified,
        mentorVerifiedJlptLevel,
        proposals,
        cohorts,
        commitments: revisionCommitments,
        viewAnchorKey: null,
        policy: proposalPolicy,
        nowMs: liveNowMs,
      })
      : null),
    [availableLevels, cohorts, liveNowMs, mentorVerified, mentorVerifiedJlptLevel, proposalPolicy, proposals, qualifiedLevels, revisionCommitments, revisionScheduleWorkingProposal]
  );

  const revisionSchedulePreview = useMemo(
    () => (revisionScheduleEditing
      ? buildProposalPreviewCalendarSlots({
        weeklySessions: revisionScheduleSessions,
        visibleRange: visibleCalendarRange,
        referenceWeekKey: calendarAnchorKey,
        commitments: revisionCommitments,
        policy: proposalPolicy,
        nowMs: liveNowMs,
        includeAllWeekDays: true,
      })
      : null),
    [liveNowMs, proposalPolicy, visibleCalendarRange, calendarAnchorKey, revisionCommitments, revisionScheduleEditing, revisionScheduleSessions]
  );

  const revisionScheduleChanged = Boolean(
    revisionDraft
    && revisionBaseline
    && (
      !areWeeklySchedulesEqual(
        revisionDraft.weeklySessions,
        revisionBaseline.weeklySessions,
        proposalPolicy.sessionDurationMinutes
      )
      || Number(revisionDraft.courseDurationWeeks || 1) !== Number(revisionBaseline.courseDurationWeeks || 1)
    )
  );

  const { invalidWeeklyMap, invalidOccurrenceMap, invalidPatternCount } = useMemo(
    () => buildStep1InvalidMaps(clientValidation.errors),
    [clientValidation.errors]
  );

  const revisionInvalidMaps = useMemo(
    () => buildStep1InvalidMaps(revisionScheduleValidation?.errors),
    [revisionScheduleValidation?.errors]
  );

  // Live debounced backend validation for whichever editable flow is active (new selection OR isolated revision)
  const isRevisionActive = Boolean(revisionDraft && (revisionDrawerOpen || revisionReviewOpen));
  const [validateNonce, setValidateNonce] = useState(0);
  const [serverValidationState, setServerValidationState] = useState(null);
  const serverValidatePayload = useMemo(() => {
    const target = isRevisionActive ? revisionDraft : (isEditable ? draft : null);
    const weeksNum = Number(target?.courseDurationWeeks || 0);
    if (
      !target
      || !target.certificateLevelId
      || (target.weeklySessions || []).length === 0
      || !Number.isInteger(weeksNum)
      || weeksNum < 1
    ) {
      return null;
    }
    return {
      proposalId: target.id || null,
      certificateLevelId: target.certificateLevelId ? Number(target.certificateLevelId) : null,
      programType: 'StandardJlpt',
      coursePlanId: null,
      courseObjective: target.courseObjective || null,
      expectedStartDate: target.referenceStartDate || referenceWeekKey || null,
      courseDurationWeeks: weeksNum,
      sessionDurationMinutes: proposalPolicy.sessionDurationMinutes,
      weeklySessions: (target.weeklySessions || []).map((s) => ({
        weekday: Number(s.weekday),
        startMinute: Number(s.startMinute),
        endMinute: Number(s.endMinute || Number(s.startMinute) + proposalPolicy.sessionDurationMinutes),
      })),
    };
  }, [
    draft,
    isEditable,
    isRevisionActive,
    proposalPolicy.sessionDurationMinutes,
    referenceWeekKey,
    revisionDraft,
  ]);

  const serverValidateKey = serverValidatePayload ? `${validateNonce}|${JSON.stringify(serverValidatePayload)}` : '';
  useEffect(() => {
    if (!serverValidatePayload || !serverValidateKey) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      validateTeachingProposal(serverValidatePayload)
        .then((res) => alive && setServerValidationState({ key: serverValidateKey, data: res, error: null }))
        .catch((err) => {
          if (!alive) return;
          setServerValidationState({
            key: serverValidateKey,
            data: null,
            error: describeApiError(err).message || tr('Không thể kết nối máy chủ để xác minh lịch.'),
          });
        });
    }, VALIDATE_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [serverValidateKey, serverValidatePayload, tr]);

  const activeServerValidation = serverValidateKey && serverValidationState?.key === serverValidateKey
    ? serverValidationState.data
    : null;
  const serverValidationError = serverValidateKey && serverValidationState?.key === serverValidateKey
    ? serverValidationState.error
    : null;
  const serverValidating = Boolean(serverValidateKey) && !activeServerValidation && !serverValidationError;

  const patchDraft = useCallback((patch) => {
    submitKeyRef.current = null;
    setDraft((cur) => ({ ...cur, ...patch }));
  }, []);

  const triggerFocusToSessions = useCallback((sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return;
    const nowMs = Date.now();
    const stableMon = resolveStableReferenceWeek({
      weeklySessions: sessions,
      preferredReferenceWeekKey: referenceWeekKey,
      policy: proposalPolicy,
      nowMs,
    });
    setReferenceWeekKey(stableMon);
    const targetAnchor = stableMon;

    setCalendarAnchorKey(targetAnchor);
    const highlightKeys = sessions.map((s) => s.key || weeklySlotKey(s.weekday, s.startMinute));
    const earliestStartMin = Math.min(...sessions.map((s) => Number(s.startMinute)));
    setCalendarFocusRequest({
      id: Date.now(),
      targetDayKey: targetAnchor,
      targetStartMin: earliestStartMin,
      highlightKeys,
    });
  }, [proposalPolicy, referenceWeekKey]);

  const handleJumpToSelectedSchedule = useCallback(() => {
    const sessions = revisionScheduleEditing ? revisionScheduleSessions : (draft.weeklySessions || []);
    if (sessions.length === 0) return;
    const activePreview = revisionScheduleEditing ? revisionSchedulePreview : proposalPreview;
    const futureFromPreview = (activePreview?.slots || []).find(
      (sl) => isFutureWeeklySlotOccurrence(sl.dayKey, sl.startMin, liveNowMs)
    )?.dayKey;
    const sortedFutureDays = sessions
      .map((s) => findNextFutureDayKeyForWeeklyPattern(s.weekday, s.startMinute, liveNowMs))
      .filter(Boolean)
      .sort();
    const targetDayKey = futureFromPreview
      || sortedFutureDays[0]
      || resolveStableReferenceWeek({
        weeklySessions: sessions,
        preferredReferenceWeekKey: referenceWeekKey,
        policy: proposalPolicy,
        nowMs: liveNowMs,
      });
    if (!targetDayKey) return;
    const earliestStartMin = Math.min(...sessions.map((s) => Number(s.startMinute)));
    const highlightKeys = sessions.map((s) => s.key || weeklySlotKey(s.weekday, s.startMinute));
    setCalendarDisplayMode('calendar');
    setCalendarAnchorKey(targetDayKey);
    setCalendarFocusRequest({
      id: Date.now(),
      targetDayKey,
      targetStartMin: earliestStartMin,
      highlightKeys,
      preserveSubView: true,
    });
  }, [draft.weeklySessions, liveNowMs, proposalPolicy, proposalPreview, referenceWeekKey, revisionScheduleEditing, revisionSchedulePreview, revisionScheduleSessions]);

  const patchRevisionDraft = useCallback((patch) => {
    resubmitKeyRef.current = null;
    setRevisionDraft((cur) => (cur ? { ...cur, ...patch } : cur));
  }, []);

  const startRevisionProposal = useCallback((proposalOrId) => {
    const raw = typeof proposalOrId === 'object' && proposalOrId
      ? (proposals.find((p) => Number(p.id) === Number(proposalOrId.id)) || proposalOrId)
      : proposals.find((p) => Number(p.id) === Number(proposalOrId));
    if (!raw || raw.status !== 'ChangesRequested') return;

    resubmitKeyRef.current = null;
    const normalized = normalizeServerProposalToDraft(raw, proposalPolicy);
    setRevisionScheduleEditing(false);
    setRevisionScheduleSessions([]);
    setRevisionDraft(normalized);
    setRevisionBaseline(normalized);
    setRevisionShowErrors(false);
    setRevisionReviewOpen(false);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    setListDrawerOpen(false);
    setInspectedProposal(null);
    setRevisionDrawerOpen(true);
    setValidateNonce((n) => n + 1);
  }, [proposalPolicy, proposals]);

  const handleStartRevisionScheduleEdit = null;
  const handleCancelRevisionScheduleEdit = null;
  const handleApplyRevisionScheduleEdit = null;

  const closeRevisionFlow = useCallback(() => {
    setRevisionDrawerOpen(false);
    setRevisionReviewOpen(false);
    setRevisionShowErrors(false);
    setRevisionScheduleEditing(false);
    setRevisionScheduleSessions([]);
    setRevisionDraft(null);
    setRevisionBaseline(null);
    resubmitKeyRef.current = null;
  }, []);

  const openProposal = useCallback((proposal) => {
    if (!proposal) return;
    if (proposal.status !== 'Draft') {
      // ALL official proposals (PendingReview, ChangesRequested, Approved, Rejected) open the read-only
      // Proposal Detail Modal without disturbing the Mentor's single active `Draft` selection on the Calendar.
      // From there (or from Registration History / List View), `ChangesRequested` enters the isolated Revision Drawer.
      setListDrawerOpen(false);
      setCourseDrawerOpen(false);
      setReviewModalOpen(false);
      if (proposal.status === 'Approved' && proposal.expectedStartDate) {
        setCalendarAnchorKey(String(proposal.expectedStartDate).slice(0, 10));
      }
      setInspectedProposal(normalizeServerProposalToDraft(proposal, proposalPolicy));
      return;
    }

    submitKeyRef.current = null;
    setCalendarDisplayMode('calendar');
    setShowCourseErrors(false);
    setInspectedProposal(null);
    const normalized = normalizeServerProposalToDraft(proposal, proposalPolicy);
    const hydrated = persistence.hydrateFromServer(normalized);
    const safeHydrated = hydrated && hydrated.status === 'Draft' ? hydrated : normalized;
    const resolved = reconcileEditableDraft(
      normalizeServerProposalToDraft(safeHydrated, proposalPolicy),
      proposalPolicy
    );
    setDraft(resolved);
    setListDrawerOpen(false);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    if ((resolved.weeklySessions || []).length > 0) {
      triggerFocusToSessions(resolved.weeklySessions);
    }
  }, [persistence, proposalPolicy, triggerFocusToSessions]);

  const handleInspectProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (target) openProposal(target);
  }, [openProposal, proposals]);

  const handleEditRevisionProposalById = useCallback((proposalId) => {
    startRevisionProposal(proposalId);
  }, [startRevisionProposal]);

  const handleWithdrawProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (!target) return;
    if (target.status !== 'PendingReview' && target.status !== 'ChangesRequested') return;
    setListDrawerOpen(false);
    setWithdrawTarget(target);
    setWithdrawModalOpen(true);
  }, [proposals]);

  const applyReregisterProposal = useCallback((sourceProposal) => {
    if (!sourceProposal) return;
    const rawSessions = Array.isArray(sourceProposal.weeklySessions) ? sourceProposal.weeklySessions : [];
    const normalizedSessions = sortWeeklySessions(
      rawSessions.map((s) => {
        const wd = Number(s.weekday);
        const startMin = Number(s.startMinute ?? s.startMin ?? 0);
        const endMin = Number(s.endMinute ?? s.endMin ?? (startMin + proposalPolicy.sessionDurationMinutes));
        return {
          key: s.key || weeklySlotKey(wd, startMin),
          weekday: wd,
          startMinute: startMin,
          endMinute: endMin,
          startClock: s.startClock || clockFromMinutes(startMin),
          endClock: s.endClock || clockFromMinutes(endMin),
        };
      })
    );

    // Revalidate each weekly session against rest gaps, session geometry, pending weekly reservations,
    // and approved/cohort schedules on the target week
    const reregisterRefDate = referenceWeekKey || mondayOfDateKey(calendarAnchorKey);
    const acceptedSessions = [];
    for (const candidate of normalizedSessions) {
      const check = validateWeeklySlotAddition({
        weekday: candidate.weekday,
        startMinute: candidate.startMinute,
        currentSessions: acceptedSessions,
        commitments,
        courseDurationWeeks: Math.max(1, Number(sourceProposal.courseDurationWeeks || 1)),
        referenceStartDate: reregisterRefDate,
        nowMs: Math.max(liveNowMs, Date.now()),
        policy: proposalPolicy,
      });
      if (check.valid && check.slot) {
        acceptedSessions.push(check.slot);
      }
    }

    if (acceptedSessions.length === 0) {
      notify.error(tr('Các khung giờ của đề xuất trước hiện không còn hợp lệ theo thời lượng hoặc khoảng nghỉ. Vui lòng chọn lịch mới trên lịch.'));
      return;
    }

    const levelEntry = availableLevels.find(
      (l) => String(l.code || '').toUpperCase() === String(sourceProposal.jlptLevelCode || '').toUpperCase()
        || Number(l.certificateLevelId ?? l.id) === Number(sourceProposal.certificateLevelId)
    );

    submitKeyRef.current = null;
    setReregisterConfirmTarget(null);
    setListDrawerOpen(false);
    setInspectedProposal(null);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    setShowCourseErrors(false);

    // Always reuse the single active Draft slot (never create a parallel second draft, never auto-submit)
    setDraft((cur) => ({
      ...createEmptyDraft(proposalPolicy),
      id: cur.status === 'Draft' ? cur.id : null,
      revision: cur.status === 'Draft' ? cur.revision : 0,
      status: 'Draft',
      certificateLevelId: levelEntry ? Number(levelEntry.certificateLevelId ?? levelEntry.id) : (sourceProposal.certificateLevelId || null),
      jlptLevelCode: levelEntry?.code || sourceProposal.jlptLevelCode || null,
      courseTitle: sourceProposal.courseTitle || '',
      courseObjective: sourceProposal.courseObjective || '',
      expectedStartDate: '',
      referenceStartDate: reregisterRefDate || null,
      courseDurationWeeks: Math.max(1, Number(sourceProposal.courseDurationWeeks || 1)),
      sessionDurationMinutes: proposalPolicy.sessionDurationMinutes,
      weeklySessions: acceptedSessions,
      optionalNotes: sourceProposal.optionalNotes || '',
      optionalAttachments: Array.isArray(sourceProposal.optionalAttachments) ? sourceProposal.optionalAttachments : [],
    }));

    if (acceptedSessions.length < normalizedSessions.length) {
      notify.info(
        trf('Đã khôi phục {0}/{1} khung giờ khả dụng.', {
          0: acceptedSessions.length,
          1: normalizedSessions.length,
        })
      );
    } else {
      notify.success(tr('Đã tạo bản đăng ký lại từ đề xuất trước.'));
    }
  }, [availableLevels, calendarAnchorKey, commitments, liveNowMs, proposalPolicy, referenceWeekKey, tr, trf]);

  const handleReregisterProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (!target || target.status !== 'Rejected') return;

    if (!mentorVerified) {
      notify.error(tr('Bạn cần hoàn tất xác minh hồ sơ chuyên môn trước khi đăng ký mở lớp.'));
      return;
    }

    if (isCapacityExhausted) {
      notify.error(capacityMessage);
      return;
    }

    const levelMatrix = resolveJlptLevelAvailability({
      availableLevels,
      qualifiedLevels,
      mentorVerified,
      mentorVerifiedJlptLevel,
    });
    if (target.jlptLevelCode) {
      const levelInfo = levelMatrix.find(
        (item) => String(item.code || '').toUpperCase() === String(target.jlptLevelCode).toUpperCase()
      );
      if (levelInfo && !levelInfo.isQualified) {
        notify.error(tr('Không đủ trình độ chuyên môn cho cấp độ JLPT này.'));
        return;
      }
      if (levelInfo && !levelInfo.isAvailable) {
        notify.error(levelInfo.unavailableReason || tr('Tài khoản chưa đủ điều kiện mở lớp cho cấp độ JLPT này.'));
        return;
      }
    }

    const hasExistingSelection = (draft.weeklySessions || []).length > 0 || hasEnteredClassMetadata(draft);
    if (hasExistingSelection) {
      setReregisterConfirmTarget(target);
      return;
    }
    applyReregisterProposal(target);
  }, [
    applyReregisterProposal,
    availableLevels,
    capacityMessage,
    draft,
    isCapacityExhausted,
    mentorVerified,
    mentorVerifiedJlptLevel,
    proposals,
    qualifiedLevels,
    tr,
  ]);

  const resetToFreshSelection = useCallback(() => {
    submitKeyRef.current = null;
    persistence.cancelPendingAndClear();
    setShowCourseErrors(false);
    setInspectedProposal(null);
    setCalendarFocusRequest(null);
    setReferenceWeekKey(null);
    setDraft(createEmptyDraft(proposalPolicy));
    setListDrawerOpen(false);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    setSearchParams({}, { replace: true });
  }, [persistence, proposalPolicy, setSearchParams]);

  const executeClearSelection = useCallback(async () => {
    const serverDraftId = draft.status === 'Draft' && draft.id ? Number(draft.id) : null;
    setClearSelectionConfirmOpen(false);
    setClearingSelection(true);
    try {
      submitKeyRef.current = null;
      persistence.cancelPendingAndClear();
      setShowCourseErrors(false);
      setCalendarFocusRequest(null);
      setReferenceWeekKey(null);
      setCourseDrawerOpen(false);
      setReviewModalOpen(false);
      setDraft(createEmptyDraft(proposalPolicy));
      setSearchParams({}, { replace: true });

      // Optimistically clear any Draft row from Registration History cache immediately
      queryClient.setQueryData(contextKey, (old) => {
        if (!old || !Array.isArray(old.proposals)) return old;
        return {
          ...old,
          proposals: old.proposals.filter((p) => p.status !== 'Draft'),
        };
      });

      if (serverDraftId) {
        await deleteTeachingProposalDraft(serverDraftId).catch(() => null);
        await invalidateProposals();
      }
    } finally {
      setClearingSelection(false);
    }
  }, [contextKey, draft.id, draft.status, invalidateProposals, persistence, proposalPolicy, queryClient, setSearchParams]);

  const requestClearSelection = useCallback(() => {
    if (revisionScheduleEditing || draft.status !== 'Draft') {
      return;
    }
    if (hasEnteredClassMetadata(draft)) {
      setClearSelectionConfirmOpen(true);
      return;
    }
    void executeClearSelection();
  }, [draft, executeClearSelection, revisionScheduleEditing]);

  const normalizeSessionList = useCallback((items = []) => (
    items
      .filter((item) => item != null)
      .map((item) => {
        const weekday = Number.isFinite(Number(item.weekday)) ? Number(item.weekday) : dayKeyToWeekday(item.dayKey);
        const startMinute = Number(item.startMinute ?? item.startMin);
        const endMinute = Number(item.endMinute ?? item.endMin) || (startMinute + proposalPolicy.sessionDurationMinutes);
        return {
          key: item.key || weeklySlotKey(weekday, startMinute),
          weekday,
          startMinute,
          endMinute,
          startClock: item.startClock || clockFromMinutes(startMinute),
          endClock: item.endClock || clockFromMinutes(endMinute),
        };
      })
  ), [proposalPolicy.sessionDurationMinutes]);

  const handleValidateProposalCandidate = useCallback(({ dayKey, startMin, replaceKey = null, currentOverride = null }) => {
    if (!revisionScheduleEditing && isCapacityExhausted) {
      return {
        valid: false,
        code: 'MENTOR_ALL_LEVELS_OCCUPIED',
        reason: capacityMessage,
      };
    }

    const startClock = clockFromMinutes(startMin);
    const weekday = dayKeyToWeekday(dayKey);
    const sessionsPool = Array.isArray(currentOverride)
      ? normalizeSessionList(currentOverride)
      : (revisionScheduleEditing ? revisionScheduleSessions : (draft.weeklySessions || []));
    const normalizedReplaceKey = replaceKey
      ? (sessionsPool.find((s) => s.key === replaceKey)?.key || weeklySlotKey(weekday, startMin))
      : null;

    const check = validateWeeklySlotAddition({
      weekday,
      startMinute: startMin,
      dayKey,
      currentSessions: sessionsPool,
      replaceKey: normalizedReplaceKey,
      commitments: revisionScheduleEditing ? revisionCommitments : commitments,
      courseDurationWeeks: revisionScheduleEditing
        ? Math.max(1, Number(revisionDraft?.courseDurationWeeks || 1))
        : Math.max(1, Number(draft.courseDurationWeeks || 1)),
      referenceStartDate: dayKey,
      nowMs: Math.max(liveNowMs, Date.now()),
      policy: proposalPolicy,
    });

    if (!check.valid) return check;

    const endMin = startMin + proposalPolicy.sessionDurationMinutes;
    const endClock = clockFromMinutes(endMin);
    return {
      valid: true,
      key: check.slot.key,
      weekday,
      endMin,
      startClock,
      endClock,
      startUtcIso: vnLocalToUtcIso(dayKey, startClock),
      endUtcIso: vnLocalToUtcIso(dayKey, endClock),
      slot: check.slot,
    };
  }, [capacityMessage, commitments, draft.courseDurationWeeks, draft.weeklySessions, isCapacityExhausted, liveNowMs, normalizeSessionList, proposalPolicy, revisionCommitments, revisionDraft?.courseDurationWeeks, revisionScheduleEditing, revisionScheduleSessions]);

  const handleProposalCalendarSelectionChange = useCallback((nextOrUpdater) => {
    if (revisionScheduleEditing) {
      const currentSlots = revisionSchedulePreview?.slots || [];
      const resolved = typeof nextOrUpdater === 'function' ? nextOrUpdater(currentSlots) : nextOrUpdater;
      const dedup = new Map();
      let addedDayKey = null;
      for (const item of resolved || []) {
        if (item.justAdded && item.dayKey) {
          addedDayKey = item.dayKey;
        }
        const ws = calendarSlotToWeeklySlot({
          dayKey: item.dayKey,
          startMin: Number(item.startMin ?? item.startMinute),
          policy: proposalPolicy,
        });
        dedup.set(ws.key, ws);
      }
      const nextSessions = sortWeeklySessions([...dedup.values()]);
      if (nextSessions.length === 0) {
        setRevisionScheduleSessions([]);
        return;
      }
      if (addedDayKey) {
        setReferenceWeekKey(mondayOfDateKey(addedDayKey));
      }
      setRevisionScheduleSessions(nextSessions);
      return;
    }

    if (!isEditable || draft.status !== 'Draft' || isCapacityExhausted) return;
    const resolved = typeof nextOrUpdater === 'function' ? nextOrUpdater(calendarSelectedSlots) : nextOrUpdater;
    const dedup = new Map();
    let addedDayKey = null;
    for (const item of resolved || []) {
      if (item.justAdded && item.dayKey) {
        addedDayKey = item.dayKey;
      }
      const ws = calendarSlotToWeeklySlot({
        dayKey: item.dayKey,
        startMin: Number(item.startMin ?? item.startMinute),
        policy: proposalPolicy,
      });
      dedup.set(ws.key, ws);
    }
    const nextSessions = sortWeeklySessions([...dedup.values()]);
    if (nextSessions.length === 0) {
      requestClearSelection();
      return;
    }

    let nextRefStartDate = draft.referenceStartDate || null;
    if (addedDayKey) {
      const nextMon = mondayOfDateKey(addedDayKey);
      const todayVn = toVnDateKey(new Date(Math.max(liveNowMs, Date.now())));
      const normalizedRef = nextMon >= todayVn ? nextMon : addedDayKey;
      setReferenceWeekKey(nextMon);
      if ((draft.weeklySessions || []).length === 0 || !nextRefStartDate) {
        nextRefStartDate = normalizedRef;
      }
    }

    patchDraft({
      weeklySessions: nextSessions,
      referenceStartDate: nextRefStartDate,
    });
  }, [
    calendarSelectedSlots,
    draft.referenceStartDate,
    draft.status,
    draft.weeklySessions,
    isCapacityExhausted,
    isEditable,
    liveNowMs,
    patchDraft,
    proposalPolicy,
    requestClearSelection,
    revisionScheduleEditing,
    revisionSchedulePreview?.slots,
  ]);

  // Submit mutation (syncs server selection cleanly first, then submits idempotently)
  const submitMutation = useMutation({
    mutationFn: async () => {
      let target = { ...draft, programType: 'StandardJlpt', coursePlanId: null };
      const synced = await persistence.syncNow();
      if (synced?.id) {
        target = synced;
      } else if (!target.id) {
        throw new Error(tr('Vui lòng đợi lịch đang chọn được đồng bộ lên máy chủ trước khi gửi duyệt.'));
      }

      if (!submitKeyRef.current) {
        submitKeyRef.current = buildSubmitIdempotencyKey(uid, target.id, target.revision);
      }

      return submitTeachingProposal(target.id, {
        idempotencyKey: submitKeyRef.current,
        expectedRevision: target.revision,
      });
    },
    onSuccess: async (submitted) => {
      submitKeyRef.current = null;
      persistence.markCleanAfterSubmit(submitted);
      clearLocalDraft(uid, 'new');
      if (submitted?.id) clearLocalDraft(uid, submitted.id);
      setReviewModalOpen(false);
      setCourseDrawerOpen(false);
      setShowCourseErrors(false);
      setCalendarFocusRequest(null);
      setReferenceWeekKey(null);

      // Optimistically update the proposal list so the submitted proposal immediately renders
      // as amber "Chờ duyệt" cards on the Calendar while the working draft resets cleanly.
      if (submitted?.id) {
        queryClient.setQueryData(contextKey, (old) => {
          if (!old || !Array.isArray(old.proposals)) return old;
          const exists = old.proposals.some((p) => Number(p.id) === Number(submitted.id));
          const nextProposals = exists
            ? old.proposals.map((p) => (Number(p.id) === Number(submitted.id) ? submitted : p))
            : [submitted, ...old.proposals];
          return { ...old, proposals: nextProposals };
        });
      }

      notify.success(
        tr('Đã gửi đăng ký thành công!'),
        '',
        {
          key: `mentor-proposal-submitted-${submitted?.id || Date.now()}`,
          replace: true,
          duration: 5000,
        }
      );

      setDraft(createEmptyDraft(proposalPolicy));
      setSearchParams({}, { replace: true });

      await Promise.allSettled([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
    onError: (err) => {
      const info = describeApiError(err);
      const code = err?.response?.data?.code || err?.data?.code || info?.code;
      const status = err?.response?.status ?? err?.status;
      if (
        code === 'MENTOR_ALL_LEVELS_OCCUPIED'
        || code === 'PROPOSAL_CONFLICT_PENDING_PROPOSAL'
        || code === 'PROPOSAL_PENDING_REST_VIOLATION'
        || status === 409
      ) {
        if (code === 'MENTOR_ALL_LEVELS_OCCUPIED' || status === 409) {
          setCourseDrawerOpen(false);
          setReviewModalOpen(false);
        }
        invalidateProposals();
        contextQuery.refetch();
      }
      notify.error(info?.message || capacityMessage || tr('Chưa thể gửi duyệt đề xuất. Vui lòng kiểm tra lại thông tin và lịch dạy.'));
    },
  });

  // Isolated Revision Resubmission mutation:
  // Updates the SAME `ChangesRequested` proposal ID atomically and transitions it to `PendingReview`
  // without ever touching the Mentor's separate `draft` selection state.
  const resubmitMutation = useMutation({
    mutationFn: async () => {
      if (!revisionDraft?.id) {
        throw new Error(tr('Không tìm thấy đề xuất cần cập nhật.'));
      }
      if (!resubmitKeyRef.current) {
        resubmitKeyRef.current = buildSubmitIdempotencyKey(
          uid,
          revisionDraft.id,
          revisionDraft.revision ?? 0
        );
      }

      const atomicPayload = {
        idempotencyKey: resubmitKeyRef.current,
        expectedRevision: revisionDraft.revision ?? 0,
        certificateLevelId: revisionDraft.certificateLevelId ? Number(revisionDraft.certificateLevelId) : null,
        programType: 'StandardJlpt',
        coursePlanId: null,
        courseTitle: revisionDraft.courseTitle?.trim() || null,
        courseObjective: revisionDraft.courseObjective?.trim() || null,
        expectedStartDate: revisionDraft.referenceStartDate || null,
        courseDurationWeeks: Math.max(1, Number(revisionDraft.courseDurationWeeks || 1)),
        sessionDurationMinutes: revisionDraft.sessionDurationMinutes || proposalPolicy.sessionDurationMinutes,
        optionalNotes: revisionDraft.optionalNotes?.trim() || null,
        optionalAttachments: Array.isArray(revisionDraft.optionalAttachments) ? revisionDraft.optionalAttachments : [],
        weeklySessions: (revisionDraft.weeklySessions || []).map((s) => ({
          weekday: Number(s.weekday),
          startMinute: Number(s.startMinute),
          endMinute: Number(s.endMinute || Number(s.startMinute) + proposalPolicy.sessionDurationMinutes),
        })),
      };

      return resubmitTeachingProposal(revisionDraft.id, atomicPayload);
    },
    onSuccess: async (resubmitted) => {
      resubmitKeyRef.current = null;
      closeRevisionFlow();
      setHighlightedProposalId(null);

      if (resubmitted?.id) {
        clearLocalDraft(uid, resubmitted.id);
        queryClient.setQueryData(contextKey, (old) => {
          if (!old || !Array.isArray(old.proposals)) return old;
          const exists = old.proposals.some((p) => Number(p.id) === Number(resubmitted.id));
          const nextProposals = exists
            ? old.proposals.map((p) => (Number(p.id) === Number(resubmitted.id) ? resubmitted : p))
            : [resubmitted, ...old.proposals];
          return { ...old, proposals: nextProposals };
        });
        if (Number(searchParams.get('proposalId') || 0) === Number(resubmitted.id)) {
          setSearchParams({}, { replace: true });
        }
      }

      notify.success(
        tr('Đã gửi lại đăng ký thành công!'),
        '',
        {
          key: `mentor-proposal-resubmitted-${resubmitted?.id || Date.now()}`,
          replace: true,
          duration: 4000,
        }
      );

      await Promise.allSettled([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
    onError: (err) => {
      resubmitKeyRef.current = null;
      const info = describeApiError(err);
      const code = err?.response?.data?.code || err?.data?.code || info?.code;
      const status = err?.response?.status ?? err?.status;
      if (
        code === 'PROPOSAL_CONFLICT_PENDING_PROPOSAL'
        || code === 'PROPOSAL_PENDING_REST_VIOLATION'
        || status === 409
      ) {
        invalidateProposals();
        contextQuery.refetch();
      }
      notify.error(info.message || tr('Chưa thể gửi lại đề xuất. Vui lòng kiểm tra lại thông tin đã cập nhật.'));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const target = withdrawTarget || draft;
      if (!target?.id) throw new Error(tr('Không tìm thấy đề xuất cần hủy.'));
      return {
        targetId: target.id,
        res: await withdrawTeachingProposal(target.id, {
          expectedRevision: target.revision,
        }),
      };
    },
    onSuccess: async ({ targetId }) => {
      setWithdrawModalOpen(false);
      setWithdrawTarget(null);
      setInspectedProposal((cur) => (cur && Number(cur.id) === Number(targetId) ? null : cur));
      if (revisionDraft && Number(revisionDraft.id) === Number(targetId)) {
        closeRevisionFlow();
      }
      clearLocalDraft(uid, targetId);

      // Remove cancelled proposal immediately from cache
      queryClient.setQueryData(contextKey, (old) => {
        if (!old || !Array.isArray(old.proposals)) return old;
        return {
          ...old,
          proposals: old.proposals.filter((p) => Number(p.id) !== Number(targetId)),
        };
      });

      if (Number(draft.id) === Number(targetId)) {
        resetToFreshSelection();
      }
      notify.success(
        tr('Đã hủy đề xuất mở lớp.'),
        '',
        { key: `mentor-proposal-withdrawn-${targetId}`, replace: true },
      );
      await Promise.allSettled([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
    onError: (err) => notify.error(describeApiError(err).message),
  });

  const hideRejectedMutation = useMutation({
    mutationFn: async (target) => {
      const proposalId = target?.id ?? target;
      if (!proposalId) throw new Error(tr('Không tìm thấy đề xuất cần xóa.'));
      await hideRejectedTeachingProposal(proposalId);
      return Number(proposalId);
    },
    onSuccess: async (removedId) => {
      setHideRejectedTarget(null);
      setInspectedProposal((cur) => (cur && Number(cur.id) === removedId ? null : cur));
      clearLocalDraft(uid, removedId);

      queryClient.setQueryData(contextKey, (old) => {
        if (!old || !Array.isArray(old.proposals)) return old;
        return {
          ...old,
          proposals: old.proposals.filter((p) => Number(p.id) !== removedId),
        };
      });

      notify.success(
        tr('Đã xóa đề xuất bị từ chối khỏi danh sách đăng ký.'),
        undefined,
        { key: `mentor-proposal-hidden-${removedId}`, replace: true },
      );

      await Promise.allSettled([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
      ]);
    },
    onError: (err) => notify.error(describeApiError(err).message),
  });

  const handleReloadServerForConflict = async () => {
    if (!draft.id) return;
    try {
      const latest = await getMyTeachingProposal(draft.id);
      persistence.resolveKeepServer(latest);
      await invalidateProposals();
      notify.info(tr('Đã đồng bộ theo dữ liệu mới nhất từ máy chủ.'));
    } catch (err) {
      notify.error(describeApiError(err).message);
    }
  };

  const handleOverwriteConflictWithLocal = async () => {
    if (!draft.id) return;
    try {
      const latest = await getMyTeachingProposal(draft.id);
      await persistence.resolveOverwriteWithLocal(latest.revision);
      notify.success(tr('Đã lưu thay đổi cục bộ lên máy chủ.'));
    } catch (err) {
      notify.error(describeApiError(err).message);
    }
  };

  const selectedLevelObj = useMemo(
    () => availableLevels.find((l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)) || null,
    [availableLevels, draft.certificateLevelId]
  );

  const courseSummaryText = useMemo(() => {
    if ((draft.weeklySessions || []).length === 0) return '';
    const parts = [];
    if (selectedLevelObj?.code || draft.jlptLevelCode) parts.push(selectedLevelObj?.code || draft.jlptLevelCode);
    const weeks = Math.max(1, Number(draft.courseDurationWeeks || 1));
    parts.push(trf('{0} tuần', { 0: weeks }));
    return parts.join(' · ');
  }, [draft.courseDurationWeeks, draft.jlptLevelCode, draft.weeklySessions, selectedLevelObj?.code, trf]);

  const renderSaveIndicator = () => {
    if (revisionScheduleEditing || !isEditable) return null;
    switch (persistence.saveStatus) {
      case DRAFT_SAVE_STATUS.SAVING:
      case DRAFT_SAVE_STATUS.SAVED:
      case DRAFT_SAVE_STATUS.UNSYNCED:
        return null;
      case DRAFT_SAVE_STATUS.OFFLINE_PENDING:
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-sm font-semibold text-amber-800">
            <CloudOff className="h-4.5 w-4.5 shrink-0" />
            {tr('Mất kết nối — dữ liệu được giữ trên thiết bị')}
          </span>
        );
      case DRAFT_SAVE_STATUS.SYNC_FAILED:
        return (
          <button
            type="button"
            onClick={() => persistence.syncNow()}
            className="rp-link inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-sm font-semibold text-red-700"
          >
            <RotateCcw className="h-4.5 w-4.5 shrink-0" />
            {tr('Không thể lưu — thử lại')}
          </button>
        );
      case DRAFT_SAVE_STATUS.CONFLICT:
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            {tr('Phát hiện thay đổi từ thiết bị khác')}
          </span>
        );
      default:
        return null;
    }
  };

  const calendarPolicy = useMemo(() => ({
    ...availabilityPolicy,
    sessionMinutes: proposalPolicy.sessionDurationMinutes,
    restMinutes: proposalPolicy.restMinutes,
  }), [availabilityPolicy, proposalPolicy.restMinutes, proposalPolicy.sessionDurationMinutes]);

  const pageRefreshing = (contextQuery.isFetching && !contextQuery.isPending)
    || (availabilityQuery.isFetching && !availabilityQuery.isPending)
    || (cohortsQuery.isFetching && !cohortsQuery.isPending);

  if (contextQuery.isLoading && !ctx) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký khung giờ')}>
        <PageContainer as="div" width="default">
          <SakuraLoader variant="section" context="schedule" delay={140} />
        </PageContainer>
      </MentorShell>
    );
  }

  if ((contextQuery.error && !ctx) || (availabilityQuery.error && slots.length === 0 && !scheduleQuery.data)) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký khung giờ')}>
        <PageContainer as="div" width="default">
          <ContextualErrorState
            error={contextQuery.error || availabilityQuery.error}
            title={tr('Chưa tải được chính sách và dữ liệu lịch dạy')}
            onRetry={() => Promise.all([contextQuery.refetch(), invalidateScheduling()])}
          />
        </PageContainer>
      </MentorShell>
    );
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký khung giờ')}>
      <PageContainer as="div" data-page="MentorShiftSchedule" width="default" className="space-y-3.5 text-rp-text">
        <h1 className="sr-only">{tr('Đăng ký khung giờ')}</h1>

        {/* Conditional Alerts (Conflict / Admin Feedback / Read-Only State) */}
        {persistence.conflictState && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Phát hiện xung đột thay đổi từ thiết bị khác')}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleReloadServerForConflict}>
                  {tr('Giữ dữ liệu máy chủ')}
                </Button>
                <Button type="button" size="sm" onClick={handleOverwriteConflictWithLocal}>
                  {tr('Ghi đè dữ liệu trên máy này')}
                </Button>
              </div>
            }
          >
            {tr('Lịch đang chọn này đã được cập nhật từ tab hoặc thiết bị khác. Hãy chọn dữ liệu muốn giữ lại.')}
          </Banner>
        )}

        {isEditable && (draft.weeklySessions || []).length > 0 && invalidPatternCount > 0 && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Lịch đang chọn có khung giờ không hợp lệ')}
          >
            {trf('Có {0} khung giờ đang chọn bị trùng lịch hoặc chưa đủ thời gian nghỉ với lịch giảng dạy hiện tại. Vui lòng bỏ chọn hoặc đổi sang khung giờ khác trước khi tiếp tục.', {
              0: invalidPatternCount,
            })}
          </Banner>
        )}

        {/* PRIMARY INTERACTIVE CALENDAR WORKSPACE */}
        <InteractiveSlotCalendar
          slots={[]}
          cohorts={[]}
          cohortSessions={[]}
          externalBusyEvents={[]}
          policy={calendarPolicy}
          displayMode={calendarDisplayMode}
          onDisplayModeChange={setCalendarDisplayMode}
          anchorKey={calendarAnchorKey}
          onAnchorChange={setCalendarAnchorKey}
          onVisibleRangeChange={handleVisibleRangeChange}
          focusRequest={calendarFocusRequest}
          selectedSlots={revisionScheduleEditing ? (revisionSchedulePreview?.slots || []) : calendarSelectedSlots}
          onSelectedSlotsChange={handleProposalCalendarSelectionChange}
          busy={submitMutation.isPending || resubmitMutation.isPending}
          onMovePendingSlot={movePendingSlot}
          onDeletePendingSlot={deletePendingSlot}
          onRequestCancelSlot={requestCancelSlot}
          onRequestChangeSlot={requestChangeSlot}
          onRefresh={() => Promise.all([
            contextQuery.refetch({ cancelRefetch: true }),
            invalidateScheduling(),
          ])}
          refreshing={pageRefreshing}
          headerTopRight={renderSaveIndicator()}
          renderCustomHeaderActions={!revisionScheduleEditing ? (
            <Button
              as={Link}
              to="/mentor-proposal-history/"
              size="sm"
              variant="primary"
              icon={ClipboardList}
              className="!h-9 rounded-xl"
            >
              <span>{tr('Danh sách đăng ký')}</span>
              <CountBadge count={officialProposalCount} size="sm" />
            </Button>
          ) : null}
          proposalMode
          templateMode
          nowMs={liveNowMs}
          customValidateCandidate={handleValidateProposalCandidate}
          proposalConfig={{
            durationWeeks: Math.max(
              1,
              Number((revisionScheduleEditing ? revisionDraft?.courseDurationWeeks : draft.courseDurationWeeks) || 1)
            ),
            revisionEditing: revisionScheduleEditing,
            revisionProposalId: revisionDraft?.id || null,
            revisionLevelCode: revisionDraft?.jlptLevelCode || null,
            revisionTitle: revisionDraft?.courseTitle?.trim() || null,
            onCancelRevisionSchedule: handleCancelRevisionScheduleEdit,
            onApplyRevisionSchedule: handleApplyRevisionScheduleEdit,
            jlptLevelCode: (revisionScheduleEditing ? revisionDraft?.jlptLevelCode : draft.jlptLevelCode) || null,
            courseTitle: (revisionScheduleEditing ? revisionDraft?.courseTitle : draft.courseTitle)?.trim() || null,
            weeklyPatternCount: revisionScheduleEditing
              ? revisionScheduleSessions.length
              : (isEditable ? (draft.weeklySessions || []).length : 0),
            invalidPatternCount: revisionScheduleEditing
              ? revisionInvalidMaps.invalidPatternCount
              : invalidPatternCount,
            invalidWeeklyMap: revisionScheduleEditing
              ? revisionInvalidMaps.invalidWeeklyMap
              : invalidWeeklyMap,
            invalidOccurrenceMap: revisionScheduleEditing
              ? revisionInvalidMaps.invalidOccurrenceMap
              : invalidOccurrenceMap,
            invalidStartDateWarning: null,
            fallbackWeeklyPatterns: [],
            courseStartDate: null,
            courseEndDate: null,
            readOnly: revisionScheduleEditing ? false : !isEditable,
            capacityLocked: revisionScheduleEditing ? false : isCapacityExhausted,
            capacityLockedMessage: capacityMessage,
            hasScheduleErrors: revisionScheduleEditing
              ? (revisionScheduleValidation?.errors || []).some(
                (e) => e.step === 1 && e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'
              )
              : (clientValidation.errors || []).some(
                (e) => e.step === 1 && e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'
              ),
            hasCourseInfoReady: revisionScheduleEditing
              ? Boolean(revisionScheduleValidation?.step1Valid && revisionScheduleValidation?.step2Valid)
              : (clientValidation.step1Valid && clientValidation.step2Valid),
            courseSummaryText: revisionScheduleEditing ? '' : courseSummaryText,
            pendingProposalEvents: [],
            rejectedProposalEvents: [],
            slotProposalMetaById: new Map(),
            registrationRows: [],
            onWithdrawProposal: handleWithdrawProposalById,
            onReregisterProposal: handleReregisterProposalById,
            onNextStep: () => {
              if (isCapacityExhausted) return;
              setShowCourseErrors(false);
              setCourseDrawerOpen(true);
            },
            onOpenCourseInfo: () => {
              if (isCapacityExhausted) return;
              setCourseDrawerOpen(true);
            },
            onJumpToSelected: handleJumpToSelectedSchedule,
            onClearAll: requestClearSelection,
            onInspectProposal: handleInspectProposalById,
            onEditRevisionProposal: handleEditRevisionProposalById,
            onOpenReview: () => {
              setReviewModalOpen(true);
            },
          }}
        />

        {/* Step 2: Course Info Drawer (shared for New Registration & Isolated Proposal Revision) */}
        <TeachingProposalCourseInfoDrawer
          open={courseDrawerOpen || (revisionDrawerOpen && Boolean(revisionDraft))}
          mode={revisionDrawerOpen && revisionDraft ? 'revision' : 'create'}
          onClose={() => {
            if (revisionDrawerOpen) {
              closeRevisionFlow();
            } else {
              setCourseDrawerOpen(false);
            }
          }}
          draft={revisionDrawerOpen && revisionDraft ? revisionDraft : draft}
          onChange={revisionDrawerOpen && revisionDraft ? patchRevisionDraft : patchDraft}
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          policy={proposalPolicy}
          validation={revisionDrawerOpen && revisionDraft ? revisionValidation : clientValidation}
          commitments={revisionDrawerOpen && revisionDraft ? revisionCommitments : commitments}
          commitmentsLoading={contextQuery.isFetching && !contextQuery.data}
          nowMs={liveNowMs}
          readOnly={revisionDrawerOpen && revisionDraft ? false : !isEditable}
          mentorVerified={mentorVerified}
          mentorVerifiedJlptLevel={mentorVerifiedJlptLevel}
          mentorDeclaredJlptLevel={mentorDeclaredJlptLevel}
          showAllErrors={revisionDrawerOpen && revisionDraft ? revisionShowErrors : showCourseErrors}
          serverValidating={serverValidating}
          onViewBlockingProposal={(proposalId) => {
            setCourseDrawerOpen(false);
            setRevisionDrawerOpen(false);
            navigate(`/mentor-proposal-history/?proposalId=${proposalId}`);
          }}
          onOpenProposalList={() => {
            setCourseDrawerOpen(false);
            setRevisionDrawerOpen(false);
            navigate('/mentor-proposal-history/');
          }}
          onEditSchedule={revisionDrawerOpen && revisionDraft ? handleStartRevisionScheduleEdit : null}
          scheduleChanged={revisionDrawerOpen && revisionDraft ? revisionScheduleChanged : false}
          onProceedToReview={() => {
            if (revisionDrawerOpen && revisionDraft) {
              setRevisionShowErrors(true);
              if (!revisionValidation.step1Valid || !revisionValidation.step2Valid) return;
              setRevisionDrawerOpen(false);
              setValidateNonce((n) => n + 1);
              setRevisionReviewOpen(true);
              return;
            }
            setShowCourseErrors(true);
            if (!clientValidation.step1Valid || !clientValidation.step2Valid) return;
            setCourseDrawerOpen(false);
            setValidateNonce((n) => n + 1);
            setReviewModalOpen(true);
          }}
        />

        {/* Step 3: Confirmation Modal (New / Revision) & Read-Only Proposal Detail Modal */}
        <TeachingProposalReviewModal
          open={reviewModalOpen || (revisionReviewOpen && Boolean(revisionDraft)) || Boolean(inspectedProposal)}
          mode={revisionReviewOpen && revisionDraft ? 'revision' : 'create'}
          baselineProposal={revisionReviewOpen && revisionDraft ? revisionBaseline : null}
          onClose={() => {
            if (revisionReviewOpen) {
              closeRevisionFlow();
              return;
            }
            setReviewModalOpen(false);
            setInspectedProposal(null);
          }}
          draft={
            inspectedProposal
              || (revisionReviewOpen && revisionDraft ? revisionDraft : draft)
          }
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          policy={proposalPolicy}
          validation={revisionReviewOpen && revisionDraft ? revisionValidation : clientValidation}
          serverValidation={activeServerValidation}
          serverValidating={serverValidating}
          serverValidationError={serverValidationError}
          onRetryValidation={() => setValidateNonce((n) => n + 1)}
          readOnly={Boolean(inspectedProposal) || (!revisionReviewOpen && !isEditable)}
          mentorVerified={mentorVerified}
          submitting={revisionReviewOpen ? resubmitMutation.isPending : submitMutation.isPending}
          onEditCourseInfo={() => {
            if (revisionReviewOpen && revisionDraft) {
              setRevisionReviewOpen(false);
              setRevisionShowErrors(true);
              setRevisionDrawerOpen(true);
              return;
            }
            setReviewModalOpen(false);
            setShowCourseErrors(true);
            setCourseDrawerOpen(true);
          }}
          onChangeAttachments={(nextAttachments) => {
            if (revisionReviewOpen && revisionDraft) {
              patchRevisionDraft({ optionalAttachments: nextAttachments });
              return;
            }
            patchDraft({ optionalAttachments: nextAttachments });
          }}
          onBackToCalendar={() => {
            if (revisionReviewOpen) {
              setRevisionReviewOpen(false);
              setRevisionDrawerOpen(true);
            } else {
              setReviewModalOpen(false);
            }
          }}
          onEditSchedule={revisionReviewOpen && revisionDraft ? handleStartRevisionScheduleEdit : null}
          onSubmit={() => (revisionReviewOpen ? resubmitMutation.mutate() : submitMutation.mutate())}
          onStartRevision={
            inspectedProposal?.status === 'ChangesRequested'
              ? () => startRevisionProposal(inspectedProposal)
              : null
          }
          onWithdraw={
            inspectedProposal?.status === 'PendingReview' || inspectedProposal?.status === 'ChangesRequested'
              ? () => {
                setWithdrawTarget(inspectedProposal);
                setWithdrawModalOpen(true);
              }
              : null
          }
          onDeleteRejected={
            inspectedProposal?.status === 'Rejected'
              ? () => setHideRejectedTarget(inspectedProposal)
              : null
          }
        />

        {/* Cancel Proposal Confirmation Dialog */}
        <AlertDialog
          open={withdrawModalOpen}
          onClose={() => {
            if (withdrawMutation.isPending) return;
            setWithdrawModalOpen(false);
            setWithdrawTarget(null);
          }}
          title={tr('Hủy đề xuất mở lớp?')}
          description={tr('Đề xuất sẽ bị hủy và không được tiếp tục xét duyệt. Bạn có thể gửi đăng ký mới bất cứ lúc nào.')}
          cancelLabel={tr('Giữ lại')}
          confirmLabel={tr('Xác nhận hủy')}
          tone="danger"
          loading={withdrawMutation.isPending}
          onConfirm={() => withdrawMutation.mutate()}
        />

        {/* Confirm Clear Active Selection When Class Metadata Exists */}
        <AlertDialog
          open={clearSelectionConfirmOpen}
          onClose={() => !clearingSelection && setClearSelectionConfirmOpen(false)}
          title={tr('Xóa toàn bộ lịch và thông tin lớp đang chọn?')}
          description={tr('Lịch dạy, cấp độ JLPT, ngày bắt đầu, thông tin lớp và tài liệu đính kèm đang soạn sẽ bị xóa. Các đề xuất đã gửi trước đó sẽ không bị ảnh hưởng.')}
          confirmLabel={tr('Xóa lịch đang chọn')}
          cancelLabel={tr('Giữ lại')}
          tone="danger"
          loading={clearingSelection}
          onConfirm={() => {
            void executeClearSelection();
          }}
        />

        {/* Confirm Hiding a Rejected Proposal from Mentor History */}
        <AlertDialog
          open={Boolean(hideRejectedTarget)}
          onClose={() => {
            if (!hideRejectedMutation.isPending) setHideRejectedTarget(null);
          }}
          title={tr('Xóa đề xuất bị từ chối khỏi danh sách?')}
          description={tr('Đề xuất này sẽ được xóa khỏi Danh sách đăng ký cá nhân và không xuất hiện lại sau khi tải lại trang.')}
          confirmLabel={tr('Xác nhận xóa')}
          cancelLabel={tr('Quay lại')}
          tone="danger"
          loading={hideRejectedMutation.isPending}
          onConfirm={() => {
            if (hideRejectedTarget) hideRejectedMutation.mutate(hideRejectedTarget);
          }}
        />

        {/* Confirm Replacing Active Selection When Re-registering a Rejected Proposal */}
        <AlertDialog
          open={Boolean(reregisterConfirmTarget)}
          onClose={() => setReregisterConfirmTarget(null)}
          title={tr('Thay thế lịch đang chọn hiện tại?')}
          description={tr('Bạn đang có một lịch dạy đang chọn chưa gửi. Đăng ký lại từ đề xuất bị từ chối sẽ thay thế toàn bộ lịch và thông tin lớp đang chọn hiện tại (không tự động gửi duyệt).')}
          confirmLabel={tr('Thay thế & tạo bản chỉnh sửa')}
          cancelLabel={tr('Giữ lịch hiện tại')}
          tone="warning"
          onConfirm={() => {
            const target = reregisterConfirmTarget;
            setReregisterConfirmTarget(null);
            if (target) applyReregisterProposal(target);
          }}
        />
      </PageContainer>
    </MentorShell>
  );
}
