import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  AlertDialog,
  Banner,
  Button,
  ContextualErrorState,
  Field,
  Modal,
  PageContainer,
  SakuraLoader,
  Textarea,
  formatIsoDateDisplay,
  notify,
} from '@/components/ui';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  deleteTeachingProposalDraft,
  getMyTeachingProposal,
  getTeachingProposalContext,
  submitTeachingProposal,
  validateTeachingProposal,
  withdrawTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  buildProposalCommitments,
  buildProposalPreviewCalendarSlots,
  calendarSlotToWeeklySlot,
  dayKeyToWeekday,
  DEFAULT_PROPOSAL_POLICY,
  expandProposalOccurrences,
  findEarliestValidStartDate,
  normalizeProposalPolicy,
  resolveJlptLevelAvailability,
  resolveStableReferenceWeek,
  sortWeeklySessions,
  validateCourseStartDate,
  validateProposalState,
  validateWeeklySlotAddition,
  weekdayLabelVn,
  weeklySlotKey,
} from '@/features/scheduling/utils/proposalValidation.js';
import { buildRegistrationRows } from '@/features/scheduling/utils/registrationTableModel.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import {
  buildSubmitIdempotencyKey,
  clearLocalDraft,
  DRAFT_SAVE_STATUS,
} from '@/features/scheduling/utils/proposalDraftStorage.js';
import { useProposalDraftPersistence } from '@/features/scheduling/hooks/useProposalDraftPersistence.js';
import {
  buildOccupiedItems,
  buildPresetCandidateSlots,
  clockFromMinutes,
  DEFAULT_DAYPARTS,
  vnLocalToUtcIso,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import { mondayOfDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import InteractiveSlotCalendar from '@/features/scheduling/components/InteractiveSlotCalendar.jsx';
import SmartQuickRegistrationModal from '@/features/scheduling/components/SmartQuickRegistrationModal.jsx';
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

const QUICK_FILL_WEEKDAYS = [
  { weekday: 1, short: 'T2', full: 'Thứ 2' },
  { weekday: 2, short: 'T3', full: 'Thứ 3' },
  { weekday: 3, short: 'T4', full: 'Thứ 4' },
  { weekday: 4, short: 'T5', full: 'Thứ 5' },
  { weekday: 5, short: 'T6', full: 'Thứ 6' },
  { weekday: 6, short: 'T7', full: 'Thứ 7' },
  { weekday: 0, short: 'CN', full: 'Chủ nhật' },
];

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
    courseDurationWeeks: policy?.courseDurationWeeks ?? 10,
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

function reconcileEditableDraft(targetDraft, policy) {
  if (!targetDraft || (targetDraft.status !== 'Draft' && targetDraft.status !== 'ChangesRequested')) {
    return targetDraft;
  }
  const sessions = targetDraft.weeklySessions || [];
  if (sessions.length === 0) {
    return targetDraft.expectedStartDate
      ? { ...targetDraft, expectedStartDate: '' }
      : targetDraft;
  }
  if (targetDraft.expectedStartDate) {
    const check = validateCourseStartDate({
      dayKey: targetDraft.expectedStartDate,
      weeklySessions: sessions,
      policy,
    });
    if (!check.valid) {
      const todayKey = toVnDateKey(new Date());
      const aligned = findEarliestValidStartDate({
        minDateKey: targetDraft.expectedStartDate >= todayKey ? targetDraft.expectedStartDate : null,
        weeklySessions: sessions,
        policy,
      });
      return { ...targetDraft, expectedStartDate: aligned || '' };
    }
  }
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
    expectedStartDate: p.expectedStartDate || '',
    optionalNotes: p.optionalNotes || '',
    optionalAttachments: Array.isArray(p.optionalAttachments) ? p.optionalAttachments : [],
    weeklySessions: sortWeeklySessions(p.weeklySessions || []),
    courseDurationWeeks: p.courseDurationWeeks || policy?.courseDurationWeeks || 10,
    sessionDurationMinutes: p.sessionDurationMinutes || policy?.sessionDurationMinutes || 90,
  };
}

const VALIDATE_DEBOUNCE_MS = 450;

export default function MentorShiftSchedule() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const workspace = useMentorScheduleWorkspace({ includeCalendarStatus: false });
  const {
    uid,
    slots,
    cohorts,
    cohortSessions,
    externalBusyEvents,
    policy: availabilityPolicy,
    scheduleQuery,
    availabilityQuery,
    cohortsQuery,
    invalidateScheduling,
    createAvailability,
    createAvailabilityBatch,
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

  // Calendar View State (strictly isolated from Business Selection State)
  const [registrationMode, setRegistrationMode] = useState('proposal');
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar');
  const [calendarAnchorKey, setCalendarAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [calendarFocusRequest, setCalendarFocusRequest] = useState(null);
  const [availSelectedSlots, setAvailSelectedSlots] = useState([]);

  // Stable business reference week when `expectedStartDate` is not yet chosen (never mutated by Calendar navigation)
  const [referenceWeekKey, setReferenceWeekKey] = useState(null);
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setLiveNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const [draft, setDraft] = useState(() => createEmptyDraft(DEFAULT_PROPOSAL_POLICY));
  const [initialized, setInitialized] = useState(false);

  // Step 2 & Step 3 Overlays + Read-Only Detail Modal (List View replaces the duplicate Registration History drawer)
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [showCourseErrors, setShowCourseErrors] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [inspectedProposal, setInspectedProposal] = useState(null);

  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [availQuickRules, setAvailQuickRules] = useState(() => new Set(['1-Evening', '3-Evening', '5-Evening']));

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [clearSelectionConfirmOpen, setClearSelectionConfirmOpen] = useState(false);
  const [clearingSelection, setClearingSelection] = useState(false);
  const [reregisterConfirmTarget, setReregisterConfirmTarget] = useState(null);
  const [lastSubmittedBanner, setLastSubmittedBanner] = useState(null);

  const submitKeyRef = useRef(null);
  const isEditable = draft.status === 'Draft' || draft.status === 'ChangesRequested';

  const invalidateProposals = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: contextKey }),
      invalidateScheduling(),
    ]);
  }, [contextKey, invalidateScheduling, queryClient]);

  const persistence = useProposalDraftPersistence({
    userId: uid,
    draft,
    isEditable,
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
  // - Calendar always stays on the Mentor's single active working draft (or ChangesRequested if targeted by URL)
  //   so closing/reopening restores their saved draft without duplicate draft conflicts.
  // - If URL ?proposalId=X points to a submitted/reviewed proposal (PendingReview/Approved/Rejected),
  //   keep the Calendar on the active working draft and open the read-only Detail Modal directly.
  useEffect(() => {
    if (!ctx || initialized) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setInitialized(true);
      const paramId = Number(searchParams.get('proposalId') || 0);
      const fromUrl = paramId ? proposals.find((p) => Number(p.id) === paramId) : null;
      const fromUrlEditable = fromUrl && (fromUrl.status === 'Draft' || fromUrl.status === 'ChangesRequested')
        && !isBlankProposalDraft(fromUrl)
        ? fromUrl
        : null;
      const singleDraft = proposals.find((p) => p.status === 'Draft' && !isBlankProposalDraft(p))
        || proposals.find((p) => p.status === 'ChangesRequested')
        || null;
      const workingSession = fromUrlEditable || singleDraft;

      if (workingSession) {
        const normalized = normalizeServerProposalToDraft(workingSession, proposalPolicy);
        const hydrated = persistence.hydrateFromServer(normalized);
        const targetDraft = reconcileEditableDraft(
          normalizeServerProposalToDraft(hydrated || normalized, proposalPolicy),
          proposalPolicy
        );
        setDraft(targetDraft);
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
        }
      } else {
        const blank = createEmptyDraft(proposalPolicy);
        const hydrated = persistence.hydrateFromServer(blank);
        const targetDraft = reconcileEditableDraft(
          normalizeServerProposalToDraft(hydrated || blank, proposalPolicy),
          proposalPolicy
        );
        setDraft(targetDraft);
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
        }
      }

      if (fromUrl && !fromUrlEditable) {
        if (fromUrl.expectedStartDate) {
          setCalendarAnchorKey(fromUrl.expectedStartDate);
        }
        setInspectedProposal(normalizeServerProposalToDraft(fromUrl, proposalPolicy));
      }
    });
    return () => {
      alive = false;
    };
  }, [ctx, initialized, persistence, proposalPolicy, proposals, searchParams]);

  // Normalized commitments across existing cohorts, availabilities, PendingReview and ChangesRequested proposals
  const occupiedItems = useMemo(
    () => buildOccupiedItems({ slots, cohortSessions, externalBusyEvents }),
    [slots, cohortSessions, externalBusyEvents]
  );

  const commitments = useMemo(
    () => buildProposalCommitments({
      occupiedItems,
      otherProposals: proposals,
      currentProposalId: draft.id,
      policy: proposalPolicy,
    }),
    [occupiedItems, proposals, draft.id, proposalPolicy]
  );

  // Authoritative Business Validation — strictly independent of Calendar View State (`calendarAnchorKey`)
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
      viewAnchorKey: null,
      policy: proposalPolicy,
      nowMs: liveNowMs,
    }),
    [draft, availableLevels, qualifiedLevels, mentorVerified, mentorVerifiedJlptLevel, proposals, cohorts, commitments, proposalPolicy, liveNowMs]
  );

  // Finite 10-week actual occurrences (when start date is valid) OR 1 stable future reference week (when start date unset).
  // Strictly isolated from `calendarAnchorKey` navigation!
  const proposalPreview = useMemo(
    () => buildProposalPreviewCalendarSlots({
      weeklySessions: draft.weeklySessions || [],
      expectedStartDate: draft.expectedStartDate || null,
      referenceWeekKey,
      policy: proposalPolicy,
      nowMs: liveNowMs,
    }),
    [draft.weeklySessions, draft.expectedStartDate, referenceWeekKey, proposalPolicy, liveNowMs]
  );

  // Only render green editable selection cards when the proposal is editable (`Draft` / `ChangesRequested`).
  // Submitted/locked proposals (`PendingReview`, `Approved`, etc.) render with their real status tone (e.g. amber `Chờ duyệt`).
  const calendarSelectedSlots = useMemo(
    () => (isEditable ? proposalPreview.slots : []),
    [isEditable, proposalPreview.slots]
  );

  const { invalidWeeklyMap, invalidOccurrenceMap, invalidPatternCount } = useMemo(() => {
    const wkMap = new Map();
    const occMap = new Map();
    const invalidKeys = new Set();
    const step1Blocking = (clientValidation.errors || []).filter(
      (e) => e.step === 1 && e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'
    );
    for (const err of step1Blocking) {
      if (err.slotKey) {
        invalidKeys.add(err.slotKey);
        if (err.conflictDate) {
          const parts = String(err.slotKey).split('_');
          const startMin = Number(parts[1]);
          if (Number.isFinite(startMin)) {
            occMap.set(`${err.conflictDate}_${startMin}`, err.message);
          } else if (!wkMap.has(err.slotKey)) {
            wkMap.set(err.slotKey, err.message);
          }
        } else if (!wkMap.has(err.slotKey)) {
          wkMap.set(err.slotKey, err.message);
        }
      }
    }
    return {
      invalidWeeklyMap: wkMap,
      invalidOccurrenceMap: occMap,
      invalidPatternCount: invalidKeys.size > 0 ? invalidKeys.size : step1Blocking.length,
    };
  }, [clientValidation.errors]);

  // Unified Registration Table rows for Expandable List View (replaces both flat occurrence list & duplicate History drawer)
  const registrationRows = useMemo(
    () => buildRegistrationRows({
      draft,
      proposals,
      proposalPreview,
      invalidWeeklyMap,
      slots,
      cohorts,
      availableLevels,
      policy: proposalPolicy,
      nowMs: liveNowMs,
      canProceedSelection: isEditable && clientValidation.step1Valid,
    }),
    [
      availableLevels,
      clientValidation.step1Valid,
      cohorts,
      draft,
      invalidWeeklyMap,
      isEditable,
      liveNowMs,
      proposalPolicy,
      proposalPreview,
      proposals,
      slots,
    ]
  );

  // Live debounced backend validation whenever draft has start date + weekly sessions
  const [validateNonce, setValidateNonce] = useState(0);
  const [serverValidationState, setServerValidationState] = useState(null);
  const serverValidatePayload = useMemo(() => {
    if (!isEditable || registrationMode !== 'proposal') return null;
    if (!draft.expectedStartDate || (draft.weeklySessions || []).length === 0) return null;
    return {
      proposalId: draft.id || null,
      certificateLevelId: draft.certificateLevelId ? Number(draft.certificateLevelId) : null,
      programType: 'StandardJlpt',
      coursePlanId: null,
      courseObjective: draft.courseObjective || null,
      expectedStartDate: draft.expectedStartDate,
      courseDurationWeeks: proposalPolicy.courseDurationWeeks,
      sessionDurationMinutes: proposalPolicy.sessionDurationMinutes,
      weeklySessions: (draft.weeklySessions || []).map((s) => ({
        weekday: Number(s.weekday),
        startMinute: Number(s.startMinute),
        endMinute: Number(s.endMinute || Number(s.startMinute) + proposalPolicy.sessionDurationMinutes),
      })),
    };
  }, [
    draft,
    isEditable,
    proposalPolicy.courseDurationWeeks,
    proposalPolicy.sessionDurationMinutes,
    registrationMode,
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
    if (
      patch.expectedStartDate
      && patch.expectedStartDate !== draft.expectedStartDate
      && validateCourseStartDate({
        dayKey: patch.expectedStartDate,
        weeklySessions: patch.weeklySessions || draft.weeklySessions || [],
        policy: proposalPolicy,
      }).valid
    ) {
      setCalendarAnchorKey(patch.expectedStartDate);
    }
    setDraft((cur) => ({ ...cur, ...patch }));
  }, [draft.expectedStartDate, draft.weeklySessions, proposalPolicy]);

  const triggerFocusToSessions = useCallback((sessions, startDateHint = null) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return;
    const nowMs = Date.now();
    const startValid = startDateHint
      && validateCourseStartDate({ dayKey: startDateHint, weeklySessions: sessions, policy: proposalPolicy, nowMs }).valid;

    let targetAnchor = startValid ? startDateHint : null;
    if (!targetAnchor) {
      const stableMon = resolveStableReferenceWeek({
        weeklySessions: sessions,
        preferredReferenceWeekKey: referenceWeekKey,
        policy: proposalPolicy,
        nowMs,
      });
      setReferenceWeekKey(stableMon);
      targetAnchor = stableMon;
    }

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
    const sessions = draft.weeklySessions || [];
    if (sessions.length === 0) return;
    const targetDayKey = (proposalPreview.mode === 'finite_10_weeks' && proposalPreview.courseStartDate)
      || proposalPreview.slots[0]?.dayKey
      || resolveStableReferenceWeek({
        weeklySessions: sessions,
        preferredReferenceWeekKey: referenceWeekKey,
        policy: proposalPolicy,
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
  }, [draft.weeklySessions, proposalPolicy, proposalPreview.courseStartDate, proposalPreview.mode, proposalPreview.slots, referenceWeekKey]);

  const openProposal = useCallback((proposal) => {
    if (!proposal) return;
    const isProposalEditable = proposal.status === 'Draft' || proposal.status === 'ChangesRequested';
    if (!isProposalEditable) {
      // Submitted/reviewed proposals (PendingReview, Approved, Rejected) open the read-only Detail Modal directly
      // without disturbing the Mentor's single active working draft on the Calendar.
      setCourseDrawerOpen(false);
      setReviewModalOpen(false);
      if (proposal.expectedStartDate) {
        setCalendarAnchorKey(proposal.expectedStartDate);
      }
      setInspectedProposal(normalizeServerProposalToDraft(proposal, proposalPolicy));
      return;
    }

    submitKeyRef.current = null;
    setRegistrationMode('proposal');
    setCalendarDisplayMode('calendar');
    setShowCourseErrors(false);
    setLastSubmittedBanner(null);
    setInspectedProposal(null);
    const normalized = normalizeServerProposalToDraft(proposal, proposalPolicy);
    const hydrated = persistence.hydrateFromServer(normalized);
    const resolved = reconcileEditableDraft(
      normalizeServerProposalToDraft(hydrated || normalized, proposalPolicy),
      proposalPolicy
    );
    setDraft(resolved);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    if (resolved.expectedStartDate && resolved.expectedStartDate >= toVnDateKey(new Date())) {
      setCalendarAnchorKey(resolved.expectedStartDate);
    }
    if ((resolved.weeklySessions || []).length > 0) {
      triggerFocusToSessions(resolved.weeklySessions, resolved.expectedStartDate);
    }
    if (proposal.id) {
      setSearchParams({ proposalId: String(proposal.id) }, { replace: true });
    }
  }, [persistence, proposalPolicy, setSearchParams, triggerFocusToSessions]);

  const handleInspectProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (target) openProposal(target);
  }, [openProposal, proposals]);

  const handleWithdrawProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (!target) return;
    if (target.status !== 'PendingReview' && target.status !== 'ChangesRequested') return;
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

    // Revalidate each session against live commitments, rest gaps, daily/weekly caps, and max sessions per proposal
    const acceptedSessions = [];
    for (const candidate of normalizedSessions) {
      const check = validateWeeklySlotAddition({
        weekday: candidate.weekday,
        startMinute: candidate.startMinute,
        currentSessions: acceptedSessions,
        expectedStartDate: null,
        viewAnchorKey: null,
        commitments,
        policy: proposalPolicy,
      });
      if (check.valid && check.slot) {
        acceptedSessions.push(check.slot);
      }
    }

    if (acceptedSessions.length === 0) {
      notify.error(tr('Các khung giờ của đề xuất trước hiện đã bị trùng lịch hoặc không còn khả dụng. Vui lòng chọn lịch mới trên lịch.'));
      return;
    }

    const validStartDate = findEarliestValidStartDate({
      weeklySessions: acceptedSessions,
      policy: proposalPolicy,
    }) || '';

    const levelEntry = availableLevels.find(
      (l) => String(l.code || '').toUpperCase() === String(sourceProposal.jlptLevelCode || '').toUpperCase()
        || Number(l.certificateLevelId ?? l.id) === Number(sourceProposal.certificateLevelId)
    );

    submitKeyRef.current = null;
    setReregisterConfirmTarget(null);
    setInspectedProposal(null);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    setRegistrationMode('proposal');
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
      expectedStartDate: validStartDate,
      courseDurationWeeks: proposalPolicy.courseDurationWeeks,
      sessionDurationMinutes: proposalPolicy.sessionDurationMinutes,
      weeklySessions: acceptedSessions,
      optionalNotes: sourceProposal.optionalNotes || '',
      optionalAttachments: Array.isArray(sourceProposal.optionalAttachments) ? sourceProposal.optionalAttachments : [],
    }));

    if (acceptedSessions.length < normalizedSessions.length) {
      notify.info(
        trf('Đã khôi phục {0}/{1} khung giờ còn khả dụng. Vui lòng kiểm tra và hoàn thiện trước khi gửi duyệt.', {
          0: acceptedSessions.length,
          1: normalizedSessions.length,
        })
      );
    } else {
      notify.success(tr('Đã tạo bản đăng ký lại từ đề xuất trước. Vui lòng kiểm tra lại thông tin và lịch trước khi gửi duyệt.'));
    }
  }, [availableLevels, commitments, proposalPolicy, tr, trf]);

  const handleReregisterProposalById = useCallback((proposalId) => {
    const target = proposals.find((p) => Number(p.id) === Number(proposalId));
    if (!target || target.status !== 'Rejected') return;

    if (!mentorVerified) {
      notify.error(tr('Bạn cần hoàn tất xác minh hồ sơ chuyên môn trước khi đăng ký mở lớp.'));
      return;
    }

    const levelMatrix = resolveJlptLevelAvailability({
      availableLevels,
      qualifiedLevels,
      mentorVerifiedJlptLevel,
      proposals,
      cohorts,
      currentProposalId: draft.status === 'Draft' ? draft.id : null,
    });
    if (target.jlptLevelCode) {
      const levelInfo = levelMatrix.find(
        (item) => String(item.code || '').toUpperCase() === String(target.jlptLevelCode).toUpperCase()
      );
      if (levelInfo && !levelInfo.qualified) {
        notify.error(tr('Không đủ trình độ chuyên môn cho cấp độ JLPT này.'));
        return;
      }
      if (levelInfo && levelInfo.disabled) {
        notify.error(levelInfo.disabledReason || tr('Cấp độ JLPT này hiện đã có đề xuất hoặc lớp đang hoạt động.'));
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
    cohorts,
    draft,
    mentorVerified,
    mentorVerifiedJlptLevel,
    proposals,
    qualifiedLevels,
    tr,
  ]);

  const resetToFreshSelection = useCallback(() => {
    submitKeyRef.current = null;
    persistence.cancelPendingAndClear();
    setRegistrationMode('proposal');
    setShowCourseErrors(false);
    setLastSubmittedBanner(null);
    setInspectedProposal(null);
    setCalendarFocusRequest(null);
    setReferenceWeekKey(null);
    setDraft(createEmptyDraft(proposalPolicy));
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
    if (draft.status === 'ChangesRequested') {
      setWithdrawTarget(draft);
      setWithdrawModalOpen(true);
      return;
    }
    if (hasEnteredClassMetadata(draft)) {
      setClearSelectionConfirmOpen(true);
      return;
    }
    void executeClearSelection();
  }, [draft, executeClearSelection]);

  // Project PendingReview & ChangesRequested proposals onto calendar cards (including the currently viewed PendingReview proposal)
  const pendingProposalEvents = useMemo(() => {
    const items = [];
    const seenIds = new Set();

    const pushPendingCard = ({
      id,
      proposalId,
      jlptLevelCode,
      dayKey,
      startMin,
      endMin,
      weekday,
      status,
      label,
      sessionNumber = null,
      totalSessions = null,
    }) => {
      if (!dayKey || !Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) return;
      if (seenIds.has(id)) return;
      seenIds.add(id);
      const startClock = clockFromMinutes(startMin);
      const endClock = clockFromMinutes(endMin);
      const timeRange = `${startClock}–${endClock}`;
      const friendlyStatus = status === 'ChangesRequested' ? 'Cần bổ sung' : 'Chờ duyệt';
      const sessionBadge = sessionNumber && totalSessions ? trf('Buổi {0}/{1}', { 0: sessionNumber, 1: totalSessions }) : null;
      const detailParts = [sessionBadge, tr(friendlyStatus)].filter(Boolean);
      items.push({
        id,
        proposalId: proposalId || null,
        proposalStatus: status || 'PendingReview',
        jlptLevelCode: jlptLevelCode || null,
        courseTitle: label || null,
        sessionNumber: sessionNumber || null,
        totalSessions: totalSessions || null,
        sourceKind: 'pendingProposal',
        draggable: false,
        locked: true,
        dayKey,
        startMin,
        endMin,
        startHour: Math.floor(startMin / 60),
        startMinute: startMin % 60,
        endHour: Math.floor(endMin / 60),
        endMinute: endMin % 60,
        startClock,
        endClock,
        timeLabel: timeRange,
        title: timeRange,
        fullTitle: `${label || tr('Đề xuất mở lớp')} (${timeRange})`,
        statusLabel: friendlyStatus,
        tone: 'pending',
        detail: detailParts.join(' · ') || `${weekdayLabelVn(weekday)} · ${timeRange}`,
      });
    };

    for (const c of commitments) {
      if (c.kind !== 'pendingProposal') continue;
      const startMin = Number.isFinite(Number(c.startMin))
        ? Number(c.startMin)
        : (c.startMs ? (((Math.floor((c.startMs + 7 * 3600_000) / 60_000)) % 1440) + 1440) % 1440 : NaN);
      const endMin = Number.isFinite(Number(c.endMin))
        ? Number(c.endMin)
        : (c.endMs ? (((Math.floor((c.endMs + 7 * 3600_000) / 60_000)) % 1440) + 1440) % 1440 : NaN);
      pushPendingCard({
        id: c.id,
        proposalId: c.proposalId,
        jlptLevelCode: c.jlptLevelCode,
        dayKey: c.dayKey,
        startMin,
        endMin,
        weekday: c.weekday,
        status: c.status,
        label: c.label,
        sessionNumber: c.sessionNumber || null,
        totalSessions: c.totalSessions || null,
      });
    }

    // If the currently viewed proposal is PendingReview, render its finite occurrences directly as amber "Chờ duyệt" cards
    if (draft.status === 'PendingReview') {
      const sourceOccs = Array.isArray(draft.occurrencesPreview) && draft.occurrencesPreview.length > 0
        ? draft.occurrencesPreview
        : (proposalPreview.occurrences || []);
      const totalCount = sourceOccs.length;
      const resolvedLabel = draft.courseTitle?.trim()
        || (draft.jlptLevelCode ? trf('Đề xuất mở lớp {0}', { 0: draft.jlptLevelCode }) : tr('Đề xuất mở lớp'));
      for (const occ of sourceOccs) {
        const startMin = Number(occ.startMinute);
        const endMin = Number(occ.endMinute || (startMin + proposalPolicy.sessionDurationMinutes));
        const occStartMs = occ.startMs || (occ.startUtc || occ.startUtcIso ? new Date(occ.startUtc || occ.startUtcIso).getTime() : 0);
        pushPendingCard({
          id: `prop-${draft.id || 'cur'}-${occStartMs || `${occ.localDate}_${startMin}`}`,
          proposalId: draft.id || null,
          jlptLevelCode: draft.jlptLevelCode || null,
          dayKey: occ.localDate,
          startMin,
          endMin,
          weekday: occ.weekday,
          status: 'PendingReview',
          label: resolvedLabel,
          sessionNumber: occ.sessionNumber || null,
          totalSessions: totalCount || null,
        });
      }
    }

    return items;
  }, [commitments, draft.courseTitle, draft.id, draft.jlptLevelCode, draft.occurrencesPreview, draft.status, proposalPolicy.sessionDurationMinutes, proposalPreview.occurrences, tr, trf]);

  // Project Rejected proposals as non-blocking red history cards (locked: false, clickable to inspect rejection reason or re-select)
  const rejectedProposalEvents = useMemo(() => {
    const items = [];
    const seenIds = new Set();
    for (const prop of proposals) {
      if (!prop || prop.status !== 'Rejected') continue;
      if (!prop.expectedStartDate || !Array.isArray(prop.weeklySessions) || prop.weeklySessions.length === 0) continue;
      const occs = Array.isArray(prop.occurrencesPreview) && prop.occurrencesPreview.length > 0
        ? prop.occurrencesPreview
        : expandProposalOccurrences({
          expectedStartDate: prop.expectedStartDate,
          weeklySessions: prop.weeklySessions,
          courseDurationWeeks: prop.courseDurationWeeks || proposalPolicy.courseDurationWeeks,
          sessionDurationMinutes: prop.sessionDurationMinutes || proposalPolicy.sessionDurationMinutes,
        });
      const totalCount = occs.length;
      const resolvedLabel = prop.courseTitle?.trim()
        || (prop.jlptLevelCode ? trf('Đề xuất mở lớp {0}', { 0: prop.jlptLevelCode }) : tr('Đề xuất mở lớp'));
      for (let idx = 0; idx < occs.length; idx += 1) {
        const occ = occs[idx];
        const startMin = Number(occ.startMinute);
        const endMin = Number(occ.endMinute || (startMin + (prop.sessionDurationMinutes || proposalPolicy.sessionDurationMinutes)));
        if (!occ.localDate || !Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) continue;
        const id = `rej-prop-${prop.id}-${occ.localDate}_${startMin}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        const startClock = clockFromMinutes(startMin);
        const endClock = clockFromMinutes(endMin);
        const timeRange = `${startClock}–${endClock}`;
        const sessNum = occ.sessionNumber || idx + 1;
        const sessionBadge = totalCount ? trf('Buổi {0}/{1}', { 0: sessNum, 1: totalCount }) : null;
        items.push({
          id,
          proposalId: prop.id,
          proposalStatus: 'Rejected',
          jlptLevelCode: prop.jlptLevelCode || null,
          courseTitle: prop.courseTitle?.trim() || null,
          sessionNumber: sessNum,
          totalSessions: totalCount || null,
          rejectionReason: prop.reviewReason || null,
          sourceKind: 'rejectedProposal',
          draggable: false,
          locked: false,
          dayKey: occ.localDate,
          startMin,
          endMin,
          startHour: Math.floor(startMin / 60),
          startMinute: startMin % 60,
          endHour: Math.floor(endMin / 60),
          endMinute: endMin % 60,
          startClock,
          endClock,
          timeLabel: timeRange,
          title: timeRange,
          fullTitle: `${resolvedLabel} (${timeRange})`,
          statusLabel: 'Bị từ chối',
          tone: 'rejected',
          detail: [sessionBadge, tr('Bị từ chối')].filter(Boolean).join(' · '),
        });
      }
    }
    return items;
  }, [proposals, proposalPolicy.courseDurationWeeks, proposalPolicy.sessionDurationMinutes, tr, trf]);

  // Map approved proposal generatedAvailabilityIds -> JLPT level & session metadata for clean green "Đã duyệt" cards
  const slotProposalMetaById = useMemo(() => {
    const map = new Map();
    for (const prop of proposals) {
      if (!prop || prop.status !== 'Approved') continue;
      const ids = Array.isArray(prop.generatedAvailabilityIds) ? prop.generatedAvailabilityIds : [];
      const total = ids.length || null;
      ids.forEach((avId, idx) => {
        if (!avId) return;
        map.set(Number(avId), {
          proposalId: prop.id,
          jlptLevelCode: prop.jlptLevelCode || null,
          courseTitle: prop.courseTitle?.trim() || null,
          sessionNumber: idx + 1,
          totalSessions: total,
        });
      });
    }
    return map;
  }, [proposals]);

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
    const startClock = clockFromMinutes(startMin);
    const candidateStartMs = Date.parse(vnLocalToUtcIso(dayKey, startClock));
    if (Number.isFinite(candidateStartMs) && candidateStartMs <= Date.now()) {
      return {
        valid: false,
        code: 'PAST_SCHEDULE_SLOT',
        reason: tr('Đã quá thời gian này.'),
      };
    }

    const weekday = dayKeyToWeekday(dayKey);
    const sessionsPool = Array.isArray(currentOverride)
      ? normalizeSessionList(currentOverride)
      : (draft.weeklySessions || []);
    const normalizedReplaceKey = replaceKey
      ? (sessionsPool.find((s) => s.key === replaceKey)?.key || weeklySlotKey(weekday, startMin))
      : null;

    const check = validateWeeklySlotAddition({
      weekday,
      startMinute: startMin,
      currentSessions: sessionsPool,
      replaceKey: normalizedReplaceKey,
      expectedStartDate: draft.expectedStartDate || null,
      viewAnchorKey: null,
      commitments,
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
  }, [commitments, draft.expectedStartDate, draft.weeklySessions, normalizeSessionList, proposalPolicy, tr]);

  const handleProposalCalendarSelectionChange = useCallback((nextOrUpdater) => {
    if (!isEditable) return;
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
      if (draft.status === 'Draft') {
        requestClearSelection();
        return;
      }
      setReferenceWeekKey(null);
      patchDraft({ weeklySessions: [], expectedStartDate: '' });
      return;
    }

    let nextStartDate = draft.expectedStartDate || '';
    if (nextStartDate) {
      const check = validateCourseStartDate({
        dayKey: nextStartDate,
        weeklySessions: nextSessions,
        policy: proposalPolicy,
      });
      if (!check.valid) {
        if (
          addedDayKey
          && validateCourseStartDate({ dayKey: addedDayKey, weeklySessions: nextSessions, policy: proposalPolicy }).valid
        ) {
          nextStartDate = addedDayKey;
        } else {
          const todayKey = toVnDateKey(new Date());
          nextStartDate = findEarliestValidStartDate({
            minDateKey: nextStartDate >= todayKey ? nextStartDate : null,
            weeklySessions: nextSessions,
            policy: proposalPolicy,
          }) || '';
        }
      }
    } else if (addedDayKey) {
      setReferenceWeekKey(mondayOfDateKey(addedDayKey));
    }

    patchDraft(
      nextStartDate !== (draft.expectedStartDate || '')
        ? { weeklySessions: nextSessions, expectedStartDate: nextStartDate }
        : { weeklySessions: nextSessions }
    );
  }, [calendarSelectedSlots, draft.expectedStartDate, draft.status, isEditable, patchDraft, proposalPolicy, requestClearSelection]);

  // Quick Fill preview (Single Availability Mode)
  const availQuickFillPreview = useMemo(() => {
    if (!quickFillOpen || registrationMode !== 'availability') return null;
    return buildPresetCandidateSlots({
      weekStart: mondayOfDateKey(calendarAnchorKey),
      selectedRules: availQuickRules,
      policy: availabilityPolicy,
      occupiedItems,
      existingSelectedSlots: availSelectedSlots,
    });
  }, [availQuickRules, availSelectedSlots, availabilityPolicy, calendarAnchorKey, occupiedItems, quickFillOpen, registrationMode]);

  const toggleAvailRule = (weekday, daypartCode) => {
    const k = `${weekday}-${daypartCode}`;
    setAvailQuickRules((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // Re-fetch proposals/commitments and availability right before applying; throws so the wizard never reports success.
  const revalidateQuickRegistration = useCallback(async () => {
    const [ctxResult] = await Promise.all([
      contextQuery.refetch({ cancelRefetch: true }),
      invalidateScheduling(),
    ]);
    if (ctxResult?.isError) throw ctxResult.error || new Error('refresh failed');
  }, [contextQuery, invalidateScheduling]);

  const handleApplySmartQuickRegistration = useCallback((preview) => {
    if (!preview?.canApply || preview.validCandidates.length === 0) return;
    const prevSessions = [...(draft.weeklySessions || [])];
    const prevStartDate = draft.expectedStartDate || '';
    let nextStartDate = prevStartDate;
    if (
      nextStartDate
      && !validateCourseStartDate({ dayKey: nextStartDate, weeklySessions: preview.resultingSessions, policy: proposalPolicy }).valid
    ) {
      const todayKey = toVnDateKey(new Date());
      nextStartDate = findEarliestValidStartDate({
        minDateKey: nextStartDate >= todayKey ? nextStartDate : null,
        weeklySessions: preview.resultingSessions,
        policy: proposalPolicy,
      }) || '';
    }
    patchDraft(
      nextStartDate !== prevStartDate
        ? { weeklySessions: preview.resultingSessions, expectedStartDate: nextStartDate }
        : { weeklySessions: preview.resultingSessions }
    );
    setQuickFillOpen(false);
    triggerFocusToSessions(preview.validCandidates, nextStartDate || null);

    notify.success({
      title: trf('Đã áp dụng {0} buổi dạy vào lịch đang chọn.', { 0: preview.validCandidates.length }),
      key: 'smart-quick-reg-applied',
      duration: 7000,
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          patchDraft({ weeklySessions: prevSessions, expectedStartDate: prevStartDate });
        },
      },
    });
  }, [draft.expectedStartDate, draft.weeklySessions, patchDraft, proposalPolicy, trf, triggerFocusToSessions]);

  const applyAvailQuickFill = () => {
    if (!availQuickFillPreview || availQuickFillPreview.validSlots.length === 0) return;
    setAvailSelectedSlots((cur) => {
      const existingKeys = new Set(cur.map((s) => s.key));
      const added = availQuickFillPreview.validSlots.filter((s) => !existingKeys.has(s.key));
      return [...cur, ...added];
    });
    setQuickFillOpen(false);
    notify.success(trf('Đã chọn thêm {0} khung giờ vào danh sách gửi.', {
      0: availQuickFillPreview.validSlots.length,
    }));
  };

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

      setDraft(createEmptyDraft(proposalPolicy));
      setSearchParams({}, { replace: true });
      if (submitted?.expectedStartDate) {
        setCalendarAnchorKey(submitted.expectedStartDate);
      }

      const submittedSummary = {
        id: submitted?.id,
        proposal: normalizeServerProposalToDraft(submitted, proposalPolicy),
        jlptLevelCode: submitted?.jlptLevelCode || draft.jlptLevelCode || null,
        title: submitted?.courseTitle?.trim()
          || (submitted?.jlptLevelCode
            ? trf('Đề xuất mở lớp {0}', { 0: submitted.jlptLevelCode })
            : tr('Đề xuất mở lớp')),
      };
      setLastSubmittedBanner(submittedSummary);
      await Promise.all([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      notify.success(
        tr('Gửi đề xuất mở lớp thành công'),
        tr('Đề xuất của bạn đang chờ quản trị viên phê duyệt.')
      );
    },
    onError: (err) => {
      notify.error(describeApiError(err).message || tr('Chưa thể gửi duyệt đề xuất. Vui lòng kiểm tra lại thông tin và lịch dạy.'));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const target = withdrawTarget || draft;
      if (!target?.id) throw new Error(tr('Không tìm thấy đề xuất cần hủy.'));
      return {
        targetId: target.id,
        res: await withdrawTeachingProposal(target.id, {
          reason: withdrawReason.trim() || null,
          expectedRevision: target.revision,
        }),
      };
    },
    onSuccess: async ({ targetId }) => {
      setWithdrawModalOpen(false);
      setWithdrawReason('');
      setWithdrawTarget(null);
      setInspectedProposal((cur) => (cur && Number(cur.id) === Number(targetId) ? null : cur));
      setLastSubmittedBanner((cur) => (cur && Number(cur.id) === Number(targetId) ? null : cur));
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
      await Promise.all([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      notify.success(tr('Đã hủy đề xuất mở lớp. Các khung giờ tạm giữ đã được giải phóng.'));
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
    if (draft.expectedStartDate) parts.push(`${tr('Khai giảng')} ${formatIsoDateDisplay(draft.expectedStartDate)}`);
    return parts.join(' · ');
  }, [draft.expectedStartDate, draft.jlptLevelCode, draft.weeklySessions, selectedLevelObj?.code, tr]);

  const renderSaveIndicator = () => {
    if (!isEditable || registrationMode !== 'proposal') return null;
    switch (persistence.saveStatus) {
      case DRAFT_SAVE_STATUS.SAVING:
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-1.5 text-sm font-semibold text-rp-text-muted">
            <RefreshCw className="h-4.5 w-4.5 shrink-0 animate-spin text-rp-brand" />
            {tr('Đang lưu…')}
          </span>
        );
      case DRAFT_SAVE_STATUS.SAVED:
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            {tr('Đã lưu')}
          </span>
        );
      case DRAFT_SAVE_STATUS.UNSYNCED:
        return (
          <button
            type="button"
            onClick={() => persistence.syncNow()}
            className="rp-link inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-sm font-semibold text-amber-800"
          >
            <Save className="h-4.5 w-4.5 shrink-0" />
            {tr('Chưa đồng bộ')}
          </button>
        );
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

  const calendarPolicy = useMemo(() => {
    if (registrationMode === 'proposal') {
      return {
        ...availabilityPolicy,
        sessionMinutes: proposalPolicy.sessionDurationMinutes,
        restMinutes: proposalPolicy.restMinutes,
      };
    }
    return availabilityPolicy;
  }, [availabilityPolicy, proposalPolicy.restMinutes, proposalPolicy.sessionDurationMinutes, registrationMode]);

  const effectiveBusy = scheduleQuery.isLoading || availabilityQuery.isLoading || cohortsQuery.isLoading;
  const pageRefreshing = (contextQuery.isFetching && !contextQuery.isPending)
    || (availabilityQuery.isFetching && !availabilityQuery.isPending)
    || (cohortsQuery.isFetching && !cohortsQuery.isPending);

  if (contextQuery.isLoading && !ctx && effectiveBusy) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
        <PageContainer as="div" width="default">
          <SakuraLoader variant="section" context="schedule" delay={140} />
        </PageContainer>
      </MentorShell>
    );
  }

  if (contextQuery.error && !ctx && availabilityQuery.error) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
        <PageContainer as="div" width="default">
          <ContextualErrorState
            error={contextQuery.error || availabilityQuery.error}
            title={tr('Chưa tải được dữ liệu lịch dạy')}
            onRetry={() => Promise.all([contextQuery.refetch(), invalidateScheduling()])}
          />
        </PageContainer>
      </MentorShell>
    );
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
      <PageContainer as="div" data-page="MentorShiftSchedule" width="default" className="space-y-3.5 text-rp-text">
        <h1 className="sr-only">{tr('Đăng ký lịch dạy')}</h1>

        {/* Post-Submit Confirmation Banner */}
        {registrationMode === 'proposal' && lastSubmittedBanner && (
          <Banner
            tone="success"
            title={tr('Gửi đề xuất mở lớp thành công')}
            onDismiss={() => setLastSubmittedBanner(null)}
            actions={
              lastSubmittedBanner.id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const submittedObj = proposals.find((p) => Number(p.id) === Number(lastSubmittedBanner.id))
                      || lastSubmittedBanner.proposal;
                    if (submittedObj) openProposal(submittedObj);
                    else setCalendarDisplayMode('list');
                  }}
                >
                  {tr('Xem chi tiết')}
                </Button>
              ) : null
            }
          >
            {trf('Đề xuất "{0}" đang chờ quản trị viên phê duyệt. Các khung giờ vừa gửi đã được hiển thị trên lịch để bạn tiếp tục đăng ký cấp độ khác nếu muốn.', {
              0: lastSubmittedBanner.title,
            })}
          </Banner>
        )}

        {/* Conditional Alerts (Conflict / Admin Feedback / Read-Only State) */}
        {registrationMode === 'proposal' && persistence.conflictState && (
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

        {registrationMode === 'proposal' && draft.reviewReason && draft.status === 'ChangesRequested' && (
          <Banner
            tone="warning"
            title={tr('Quản trị viên yêu cầu chỉnh sửa bổ sung')}
            actions={
              draft.id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Trash2}
                  onClick={() => {
                    setWithdrawTarget(draft);
                    setWithdrawModalOpen(true);
                  }}
                >
                  {tr('Hủy đề xuất')}
                </Button>
              ) : null
            }
          >
            {draft.reviewReason}
          </Banner>
        )}

        {/* PRIMARY INTERACTIVE CALENDAR WORKSPACE */}
        <InteractiveSlotCalendar
          slots={slots}
          cohortSessions={cohortSessions}
          externalBusyEvents={externalBusyEvents}
          policy={calendarPolicy}
          displayMode={calendarDisplayMode}
          onDisplayModeChange={setCalendarDisplayMode}
          anchorKey={calendarAnchorKey}
          onAnchorChange={setCalendarAnchorKey}
          focusRequest={calendarFocusRequest}
          selectedSlots={registrationMode === 'proposal' ? calendarSelectedSlots : availSelectedSlots}
          onSelectedSlotsChange={registrationMode === 'proposal' ? handleProposalCalendarSelectionChange : setAvailSelectedSlots}
          busy={submitMutation.isPending}
          onCreateAvailability={registrationMode === 'availability' ? createAvailability : undefined}
          onCreateAvailabilityBatch={registrationMode === 'availability' ? createAvailabilityBatch : undefined}
          onMovePendingSlot={movePendingSlot}
          onDeletePendingSlot={deletePendingSlot}
          onRequestCancelSlot={requestCancelSlot}
          onRequestChangeSlot={requestChangeSlot}
          onRefresh={() => Promise.all([
            contextQuery.refetch({ cancelRefetch: true }),
            invalidateScheduling(),
          ])}
          refreshing={pageRefreshing}
          headerTopRight={registrationMode === 'proposal' ? renderSaveIndicator() : null}
          renderCustomHeaderActions={isEditable ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={CalendarPlus}
              onClick={() => setQuickFillOpen(true)}
              className="!h-8.5 rounded-xl"
            >
              {tr('Đăng ký nhanh')}
            </Button>
          ) : null}
          proposalMode={registrationMode === 'proposal'}
          customValidateCandidate={registrationMode === 'proposal' ? handleValidateProposalCandidate : null}
          proposalConfig={registrationMode === 'proposal' ? {
            minPerWeek: proposalPolicy.minSessionsPerWeek,
            maxPerWeek: proposalPolicy.maxSessionsPerWeek,
            durationWeeks: proposalPolicy.courseDurationWeeks,
            jlptLevelCode: draft.jlptLevelCode || null,
            courseTitle: draft.courseTitle?.trim() || null,
            weeklyPatternCount: isEditable ? (draft.weeklySessions || []).length : 0,
            invalidPatternCount,
            invalidWeeklyMap,
            invalidOccurrenceMap,
            invalidStartDateWarning: proposalPreview.startDateWarning || null,
            fallbackWeeklyPatterns: proposalPreview.mode === 'invalid_start_date' ? (draft.weeklySessions || []) : [],
            courseStartDate: proposalPreview.courseStartDate,
            courseEndDate: proposalPreview.courseEndDate,
            readOnly: !isEditable,
            hasScheduleErrors: (clientValidation.errors || []).some(
              (e) => e.step === 1 && e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'
            ),
            hasCourseInfoReady: clientValidation.step1Valid && clientValidation.step2Valid,
            courseSummaryText,
            pendingProposalEvents,
            rejectedProposalEvents,
            slotProposalMetaById,
            registrationRows,
            onWithdrawProposal: handleWithdrawProposalById,
            onReregisterProposal: handleReregisterProposalById,
            onNextStep: () => {
              const hasInvalidRestoredDate = Boolean(
                draft.expectedStartDate
                && !validateCourseStartDate({
                  dayKey: draft.expectedStartDate,
                  weeklySessions: draft.weeklySessions || [],
                  policy: proposalPolicy,
                }).valid
              );
              if (!draft.expectedStartDate && (draft.weeklySessions || []).length > 0 && isEditable) {
                const suggestedDate = findEarliestValidStartDate({
                  weeklySessions: draft.weeklySessions,
                  policy: proposalPolicy,
                });
                if (suggestedDate) {
                  patchDraft({ expectedStartDate: suggestedDate });
                }
              }
              setShowCourseErrors(hasInvalidRestoredDate);
              setCourseDrawerOpen(true);
            },
            onOpenCourseInfo: () => {
              const hasInvalidRestoredDate = Boolean(
                draft.expectedStartDate
                && !validateCourseStartDate({
                  dayKey: draft.expectedStartDate,
                  weeklySessions: draft.weeklySessions || [],
                  policy: proposalPolicy,
                }).valid
              );
              if (!draft.expectedStartDate && (draft.weeklySessions || []).length > 0 && isEditable) {
                const suggestedDate = findEarliestValidStartDate({
                  weeklySessions: draft.weeklySessions,
                  policy: proposalPolicy,
                });
                if (suggestedDate) {
                  patchDraft({ expectedStartDate: suggestedDate });
                }
              }
              if (hasInvalidRestoredDate) setShowCourseErrors(true);
              setCourseDrawerOpen(true);
            },
            onJumpToSelected: handleJumpToSelectedSchedule,
            onClearAll: requestClearSelection,
            onInspectProposal: handleInspectProposalById,
            onOpenReview: () => {
              setReviewModalOpen(true);
            },
          } : null}
        />

        {/* Step 2: Course Info Drawer */}
        <TeachingProposalCourseInfoDrawer
          open={courseDrawerOpen}
          onClose={() => setCourseDrawerOpen(false)}
          draft={draft}
          onChange={patchDraft}
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          policy={proposalPolicy}
          validation={clientValidation}
          readOnly={!isEditable}
          mentorVerified={mentorVerified}
          mentorVerifiedJlptLevel={mentorVerifiedJlptLevel}
          mentorDeclaredJlptLevel={mentorDeclaredJlptLevel}
          showAllErrors={showCourseErrors}
          serverValidating={serverValidating}
          onViewBlockingProposal={(proposalId) => {
            const target = proposals.find((p) => Number(p.id) === Number(proposalId));
            if (target) openProposal(target);
            else {
              setCourseDrawerOpen(false);
              setCalendarDisplayMode('list');
            }
          }}
          onOpenProposalList={() => {
            setCourseDrawerOpen(false);
            setCalendarDisplayMode('list');
          }}
          onProceedToReview={() => {
            setShowCourseErrors(true);
            if (!clientValidation.step1Valid || !clientValidation.step2Valid) return;
            setCourseDrawerOpen(false);
            setValidateNonce((n) => n + 1);
            setReviewModalOpen(true);
          }}
        />

        {/* Step 3: Confirmation Modal / Read-Only Proposal Detail Modal */}
        <TeachingProposalReviewModal
          open={reviewModalOpen || Boolean(inspectedProposal)}
          onClose={() => {
            setReviewModalOpen(false);
            setInspectedProposal(null);
          }}
          draft={inspectedProposal || draft}
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          policy={proposalPolicy}
          validation={clientValidation}
          serverValidation={activeServerValidation}
          serverValidating={serverValidating}
          serverValidationError={serverValidationError}
          onRetryValidation={() => setValidateNonce((n) => n + 1)}
          readOnly={Boolean(inspectedProposal) || !isEditable}
          mentorVerified={mentorVerified}
          submitting={submitMutation.isPending}
          onEditCourseInfo={() => {
            setReviewModalOpen(false);
            setShowCourseErrors(true);
            setCourseDrawerOpen(true);
          }}
          onBackToCalendar={() => setReviewModalOpen(false)}
          onSubmit={() => submitMutation.mutate()}
          onWithdraw={
            inspectedProposal?.status === 'PendingReview'
              ? () => {
                setWithdrawTarget(inspectedProposal);
                setWithdrawModalOpen(true);
              }
              : null
          }
        />

        {/* Smart Quick Registration Modal (Proposal Mode) */}
        {registrationMode === 'proposal' && (
          <SmartQuickRegistrationModal
            open={quickFillOpen}
            onClose={() => setQuickFillOpen(false)}
            currentSessions={draft.weeklySessions || []}
            expectedStartDate={draft.expectedStartDate || null}
            commitments={commitments}
            policy={proposalPolicy}
            availabilityReady={!effectiveBusy && !contextQuery.isLoading}
            availabilityError={Boolean(contextQuery.isError && !ctx)}
            onRetryAvailability={() => contextQuery.refetch()}
            onRevalidate={revalidateQuickRegistration}
            onApply={handleApplySmartQuickRegistration}
            nowMs={liveNowMs}
            userId={uid}
            proposalId={draft.id || null}
          />
        )}

        {/* Legacy Single-Slot Quick Registration Modal (Single Availability Mode) */}
        {registrationMode === 'availability' && (
          <Modal
            open={quickFillOpen}
            onClose={() => setQuickFillOpen(false)}
            size="lg"
            title={tr('Đăng ký nhanh khung giờ rảnh trong tuần')}
            description={tr('Chọn thứ và buổi trong tuần hiện tại, xem trước khung hợp lệ trước khi thêm vào danh sách chọn.')}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-rp-text-muted">
                  {trf('Sẽ thêm {0} khung giờ hợp lệ', { 0: availQuickFillPreview?.validSlots.length ?? 0 })}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => setQuickFillOpen(false)}>
                    {tr('Hủy')}
                  </Button>
                  <Button
                    type="button"
                    disabled={!availQuickFillPreview || availQuickFillPreview.validSlots.length === 0}
                    onClick={applyAvailQuickFill}
                  >
                    {trf('Áp dụng lịch dạy ({0} buổi)', { 0: availQuickFillPreview?.validSlots.length ?? 0 })}
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-rp-line">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-rp-bg-2/50 text-rp-text-muted">
                      <th className="border-b border-rp-line px-2.5 py-2 text-left font-semibold">{tr('Buổi')}</th>
                      {QUICK_FILL_WEEKDAYS.map((d) => (
                        <th key={d.weekday} className="border-b border-rp-line px-2 py-2 text-center font-semibold">
                          {d.short}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(availabilityPolicy?.dayparts || DEFAULT_DAYPARTS).map((dp) => (
                      <tr key={dp.code} className="border-b border-rp-line last:border-b-0">
                        <td className="px-2.5 py-2 font-medium text-rp-text">{tr(dp.label)}</td>
                        {QUICK_FILL_WEEKDAYS.map((d) => {
                          const k = `${d.weekday}-${dp.code}`;
                          const checked = availQuickRules.has(k);
                          return (
                            <td key={k} className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleAvailRule(d.weekday, dp.code)}
                                className={`h-7 w-9 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  checked
                                    ? 'border-[#E05A7A] bg-[#E05A7A] text-white'
                                    : 'border-rp-line bg-white text-rp-text-muted hover:border-[#F2CCD7]'
                                }`}
                              >
                                {checked ? '✓' : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {availQuickFillPreview && (
                <div className="grid gap-3 md:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
                    <p className="m-0 font-bold text-emerald-800">
                      {trf('Khung giờ hợp lệ ({0})', { 0: availQuickFillPreview.validSlots.length })}
                    </p>
                    <p className="m-0 text-emerald-800/80">
                      {availQuickFillPreview.validSlots.slice(0, 6).map((s) => `${formatIsoDateDisplay(s.dayKey)} ${s.startClock}`).join(', ') || tr('Không có khung phù hợp.')}
                      {availQuickFillPreview.validSlots.length > 6 ? ` (+${availQuickFillPreview.validSlots.length - 6})` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                    <p className="m-0 font-bold text-amber-900">
                      {trf('Đã bỏ qua ({0})', { 0: availQuickFillPreview.skippedSlots.length })}
                    </p>
                    <p className="m-0 text-amber-800/80">
                      {availQuickFillPreview.skippedSlots.length === 0
                        ? tr('Không có khung xung đột.')
                        : trf('{0} khung bị trùng hoặc vi phạm khoảng nghỉ.', { 0: availQuickFillPreview.skippedSlots.length })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Cancel Proposal Confirmation Modal */}
        <Modal
          open={withdrawModalOpen}
          onClose={() => {
            if (withdrawMutation.isPending) return;
            setWithdrawModalOpen(false);
            setWithdrawTarget(null);
          }}
          title={tr('Hủy đề xuất mở lớp')}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={withdrawMutation.isPending}
                onClick={() => {
                  setWithdrawModalOpen(false);
                  setWithdrawTarget(null);
                }}
              >
                {tr('Quay lại')}
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate()}
              >
                {tr('Xác nhận hủy đề xuất')}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="m-0 text-rp-text-2">
              {tr('Sau khi hủy, đề xuất này sẽ bị xóa khỏi danh sách và các khung giờ tạm giữ sẽ được giải phóng ngay lập tức.')}
            </p>
            <Field label={tr('Lý do hủy đề xuất (không bắt buộc)')}>
              <Textarea
                rows={3}
                maxLength={1000}
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder={tr('Ví dụ: Thay đổi khung giờ rảnh buổi tối trong tháng tới.')}
              />
            </Field>
          </div>
        </Modal>

        {/* Confirm Clear Active Selection When Class Metadata Exists */}
        <AlertDialog
          open={clearSelectionConfirmOpen}
          onClose={() => !clearingSelection && setClearSelectionConfirmOpen(false)}
          title={tr('Xóa toàn bộ lịch và thông tin lớp đang chọn?')}
          description={tr('Lịch dạy, cấp độ JLPT, ngày khai giảng, thông tin lớp và tài liệu đính kèm đang soạn sẽ bị xóa. Các đề xuất đã gửi trước đó sẽ không bị ảnh hưởng.')}
          confirmLabel={tr('Xóa lịch đang chọn')}
          cancelLabel={tr('Giữ lại')}
          tone="danger"
          loading={clearingSelection}
          onConfirm={() => {
            void executeClearSelection();
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
