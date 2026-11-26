import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CloudOff,
  Eye,
  ListChecks,
  Pencil,
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
  CustomSelect,
  Drawer,
  Field,
  Modal,
  PageContainer,
  SakuraLoader,
  Textarea,
  formatIsoDateDisplay,
  formatTimeRange,
  notify,
} from '@/components/ui';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  deleteTeachingProposalDraft,
  getMyTeachingProposal,
  getTeachingProposalContext,
  resubmitTeachingProposal,
  submitTeachingProposal,
  validateTeachingProposal,
  withdrawTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  buildProposalCommitments,
  buildProposalPreviewCalendarSlots,
  calendarSlotToWeeklySlot,
  computeMentorRegistrationCapacity,
  dayKeyToWeekday,
  DEFAULT_PROPOSAL_POLICY,
  expandProposalOccurrences,
  findEarliestValidStartDate,
  normalizeProposalPolicy,
  PROPOSAL_STATUS_META,
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
import { getViewDateRange, mondayOfDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import InteractiveSlotCalendar from '@/features/scheduling/components/InteractiveSlotCalendar.jsx';
import SmartQuickRegistrationModal from '@/features/scheduling/components/SmartQuickRegistrationModal.jsx';
import TeachingProposalCourseInfoDrawer from '@/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx';
import TeachingProposalReviewModal from '@/features/scheduling/components/TeachingProposalReviewModal.jsx';
import { describeApiError } from '@/api/apiErrors.js';
import { useLocale } from '@/locales/locale.js';

const PROPOSAL_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả trạng thái', dotClass: 'bg-[#CE476D]' },
  { value: 'Draft', label: 'Đang chọn', dotClass: 'bg-emerald-500' },
  { value: 'PendingReview', label: 'Chờ duyệt', dotClass: 'bg-amber-500' },
  { value: 'ChangesRequested', label: 'Cần bổ sung', dotClass: 'bg-[#EA580C]' },
  { value: 'Approved', label: 'Đã duyệt', dotClass: 'bg-emerald-600' },
  { value: 'Rejected', label: 'Bị từ chối', dotClass: 'bg-red-500' },
];

function matchesHistoryFilter(item, filterValue) {
  if (!item) return false;
  if (filterValue === 'ALL') return true;
  return item.status === filterValue;
}

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

function reconcileEditableDraft(targetDraft) {
  if (!targetDraft || targetDraft.status !== 'Draft') {
    return targetDraft;
  }
  const sessions = targetDraft.weeklySessions || [];
  if (sessions.length === 0) {
    return targetDraft.expectedStartDate
      ? { ...targetDraft, expectedStartDate: '' }
      : targetDraft;
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
}

function resolveAlignedStartDate({ currentStartDate, nextSessions }) {
  if (!nextSessions || nextSessions.length === 0) return '';
  return currentStartDate || '';
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
      proposals,
      cohorts,
      currentProposalId: null,
      maxActiveClassesByLevel: proposalPolicy?.maxActiveClassesByLevel,
      maxTotalActiveClassesPerMentor: Number(proposalPolicy?.maxTotalActiveClassesPerMentor || 0),
    }),
    [
      availableLevels,
      cohorts,
      mentorVerified,
      mentorVerifiedJlptLevel,
      proposalPolicy?.maxActiveClassesByLevel,
      proposalPolicy?.maxTotalActiveClassesPerMentor,
      proposals,
      qualifiedLevels,
    ]
  );

  const registrationCapacity = useMemo(
    () => computeMentorRegistrationCapacity({
      levelAvailability: mentorLevelAvailability,
      mentorVerified,
      loaded: Boolean(ctx) && !contextQuery.isLoading,
      weeklySessionCap: proposalPolicy.weeklySessionCap,
      currentWeeklyCommittedCount: Number(ctx?.workload?.weeklyTotalProjectedSessions ?? 0),
      minSessionsPerWeek: proposalPolicy.minSessionsPerWeek,
      maxTotalActiveClassesPerMentor: Number(proposalPolicy?.maxTotalActiveClassesPerMentor || 0),
    }),
    [
      contextQuery.isLoading,
      ctx,
      mentorLevelAvailability,
      mentorVerified,
      proposalPolicy?.maxTotalActiveClassesPerMentor,
      proposalPolicy.minSessionsPerWeek,
      proposalPolicy.weeklySessionCap,
    ]
  );

  const isCapacityExhausted = registrationCapacity.isCapacityExhausted;
  const capacityMessage = tr(registrationCapacity.message || 'Bạn đã đăng ký đủ các cấp độ giảng dạy.');
  const officialProposalCount = useMemo(
    () => proposals.filter((p) => p && p.status !== 'Draft' && p.status !== 'Withdrawn').length,
    [proposals]
  );

  // Calendar View State (strictly isolated from Business Selection State)
  const [calendarDisplayMode, setCalendarDisplayMode] = useState('calendar');
  const [calendarAnchorKey, setCalendarAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [visibleCalendarRange, setVisibleCalendarRange] = useState(() => getViewDateRange(toVnDateKey(new Date()), 'week'));
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

  // Stable business reference week when `expectedStartDate` is not yet chosen (never mutated by Calendar navigation)
  const [referenceWeekKey, setReferenceWeekKey] = useState(null);
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setLiveNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const [draft, setDraft] = useState(() => createEmptyDraft(DEFAULT_PROPOSAL_POLICY));
  const [initialized, setInitialized] = useState(false);

  // Registration History list (strict Zero Selection Invariant: 0-slot Draft & Withdrawn excluded)
  const visibleProposals = useMemo(() => {
    const result = [];
    if (draft.status === 'Draft' && (draft.weeklySessions || []).length > 0) {
      const lvlObj = availableLevels.find(
        (l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)
      );
      result.push({
        ...draft,
        id: draft.id || 'active-selection',
        jlptLevelCode: lvlObj?.code || draft.jlptLevelCode || null,
        weeklySessionCount: draft.weeklySessions.length,
        courseDurationWeeks: draft.courseDurationWeeks || proposalPolicy.courseDurationWeeks,
      });
    }
    for (const p of proposals) {
      if (!p || p.status === 'Draft' || p.status === 'Withdrawn') continue;
      result.push(p);
    }
    return result;
  }, [availableLevels, draft, proposalPolicy.courseDurationWeeks, proposals]);

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
  const [revisionScheduleStartDate, setRevisionScheduleStartDate] = useState('');
  const [inspectedProposal, setInspectedProposal] = useState(null);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listFilter, setListFilter] = useState('ALL');
  const [highlightedProposalId, setHighlightedProposalId] = useState(null);

  const [quickFillOpen, setQuickFillOpen] = useState(false);

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [clearSelectionConfirmOpen, setClearSelectionConfirmOpen] = useState(false);
  const [clearingSelection, setClearingSelection] = useState(false);
  const [reregisterConfirmTarget, setReregisterConfirmTarget] = useState(null);

  const submitKeyRef = useRef(null);
  const resubmitKeyRef = useRef(null);
  const handledUrlProposalIdRef = useRef(null);
  // Active working draft on the Calendar is strictly for unsent 'Draft' selections.
  // Official 'ChangesRequested' proposals are NEVER loaded into `draft`; they stay official orange cards
  // and edit exclusively inside the isolated `revisionDraft` flow.
  const isEditable = draft.status === 'Draft';

  useEffect(() => {
    if (isCapacityExhausted) {
      setQuickFillOpen(false);
      setCourseDrawerOpen(false);
      setReviewModalOpen(false);
    }
  }, [isCapacityExhausted]);

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
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
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
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [ctx, initialized, persistence, proposalPolicy, proposals]);

  // Notification & URL Deep Link handler (?proposalId=X):
  // - ChangesRequested: opens Registration History Drawer focused on proposal X with admin feedback
  //   (without mutating `draft`, without auto-entering edit mode, without changing status).
  // - PendingReview / Approved / Rejected: opens the read-only Proposal Detail Modal.
  // - Missing / withdrawn: informs the mentor gracefully and cleans up the stale query param.
  const urlProposalIdParam = Number(searchParams.get('proposalId') || 0);
  useEffect(() => {
    if (!ctx || !urlProposalIdParam) {
      if (!urlProposalIdParam) handledUrlProposalIdRef.current = null;
      return undefined;
    }
    if (handledUrlProposalIdRef.current === urlProposalIdParam) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      handledUrlProposalIdRef.current = urlProposalIdParam;
      const target = proposals.find((p) => Number(p.id) === urlProposalIdParam);
      if (!target) {
        notify.info(tr('Thông tin đề xuất này không còn khả dụng hoặc đã được cập nhật.'));
        setSearchParams({}, { replace: true });
        return;
      }
      if (target.expectedStartDate) {
        setCalendarAnchorKey(String(target.expectedStartDate).slice(0, 10));
      }
      if (target.status === 'ChangesRequested') {
        setInspectedProposal(null);
        setListFilter('ALL');
        setHighlightedProposalId(target.id);
        setListDrawerOpen(true);
      } else if (target.status !== 'Draft') {
        setListDrawerOpen(false);
        setHighlightedProposalId(null);
        setInspectedProposal(normalizeServerProposalToDraft(target, proposalPolicy));
      }
    });
    return () => {
      alive = false;
    };
  }, [ctx, proposalPolicy, proposals, setSearchParams, tr, urlProposalIdParam]);

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

  // Normalized commitments across existing cohorts, availabilities, PendingReview and ChangesRequested proposals
  const occupiedItems = useMemo(
    () => buildOccupiedItems({ slots, cohortSessions, externalBusyEvents }),
    [slots, cohortSessions, externalBusyEvents]
  );

  const commitments = useMemo(
    () => buildProposalCommitments({
      occupiedItems,
      otherProposals: proposals,
      currentProposalId: draft.status === 'Draft' ? draft.id : null,
      policy: proposalPolicy,
    }),
    [occupiedItems, proposals, draft.status, draft.id, proposalPolicy]
  );

  // Isolated commitments for revising an existing `ChangesRequested` proposal:
  // excludes ONLY `revisionDraft.id` from self-conflict while keeping all other proposals & cohorts blocking.
  const revisionCommitments = useMemo(
    () => (revisionDraft
      ? buildProposalCommitments({
        occupiedItems,
        otherProposals: proposals,
        currentProposalId: revisionDraft.id,
        policy: proposalPolicy,
      })
      : commitments),
    [commitments, occupiedItems, proposalPolicy, proposals, revisionDraft]
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
        viewAnchorKey: null,
        policy: proposalPolicy,
        nowMs: liveNowMs,
      })
      : clientValidation),
    [availableLevels, clientValidation, cohorts, liveNowMs, mentorVerified, mentorVerifiedJlptLevel, proposalPolicy, proposals, qualifiedLevels, revisionCommitments, revisionDraft]
  );

  // Finite 10-week actual occurrences (when start date is valid) OR visible-range future representative projections (when start date unset).
  const proposalPreview = useMemo(
    () => buildProposalPreviewCalendarSlots({
      weeklySessions: draft.weeklySessions || [],
      expectedStartDate: draft.expectedStartDate || null,
      visibleRange: visibleCalendarRange,
      referenceWeekKey,
      commitments,
      policy: proposalPolicy,
      nowMs: liveNowMs,
    }),
    [draft.weeklySessions, draft.expectedStartDate, visibleCalendarRange, referenceWeekKey, commitments, proposalPolicy, liveNowMs]
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
        expectedStartDate: revisionScheduleStartDate,
      }
      : null),
    [revisionDraft, revisionScheduleEditing, revisionScheduleSessions, revisionScheduleStartDate]
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
        expectedStartDate: revisionScheduleStartDate || null,
        visibleRange: visibleCalendarRange,
        referenceWeekKey,
        commitments: revisionCommitments,
        policy: proposalPolicy,
        nowMs: liveNowMs,
      })
      : null),
    [liveNowMs, proposalPolicy, visibleCalendarRange, referenceWeekKey, revisionCommitments, revisionScheduleEditing, revisionScheduleSessions, revisionScheduleStartDate]
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
      || String(revisionDraft.expectedStartDate || '') !== String(revisionBaseline.expectedStartDate || '')
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
      canProceedSelection: isEditable && !isCapacityExhausted && clientValidation.step1Valid,
    }),
    [
      availableLevels,
      clientValidation.step1Valid,
      cohorts,
      draft,
      invalidWeeklyMap,
      isCapacityExhausted,
      isEditable,
      liveNowMs,
      proposalPolicy,
      proposalPreview,
      proposals,
      slots,
    ]
  );

  // Live debounced backend validation for whichever editable flow is active (new selection OR isolated revision)
  const isRevisionActive = Boolean(revisionDraft && (revisionDrawerOpen || revisionReviewOpen));
  const [validateNonce, setValidateNonce] = useState(0);
  const [serverValidationState, setServerValidationState] = useState(null);
  const serverValidatePayload = useMemo(() => {
    const target = isRevisionActive ? revisionDraft : (isEditable ? draft : null);
    if (!target || !target.expectedStartDate || (target.weeklySessions || []).length === 0) return null;
    return {
      proposalId: target.id || null,
      certificateLevelId: target.certificateLevelId ? Number(target.certificateLevelId) : null,
      programType: 'StandardJlpt',
      coursePlanId: null,
      courseObjective: target.courseObjective || null,
      expectedStartDate: target.expectedStartDate,
      courseDurationWeeks: proposalPolicy.courseDurationWeeks,
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
    proposalPolicy.courseDurationWeeks,
    proposalPolicy.sessionDurationMinutes,
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
    const sessions = revisionScheduleEditing ? revisionScheduleSessions : (draft.weeklySessions || []);
    if (sessions.length === 0) return;
    const activePreview = revisionScheduleEditing ? revisionSchedulePreview : proposalPreview;
    const targetDayKey = (activePreview?.mode === 'finite_10_weeks' && activePreview?.courseStartDate)
      || activePreview?.slots?.[0]?.dayKey
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
  }, [draft.weeklySessions, proposalPolicy, proposalPreview, referenceWeekKey, revisionScheduleEditing, revisionSchedulePreview, revisionScheduleSessions]);

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
    setRevisionScheduleStartDate('');
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

  const handleStartRevisionScheduleEdit = useCallback(() => {
    if (!revisionDraft || revisionDraft.status !== 'ChangesRequested') return;
    const seedSessions = sortWeeklySessions(revisionDraft.weeklySessions || []);
    const seedStartDate = revisionDraft.expectedStartDate || '';
    setRevisionScheduleSessions(seedSessions);
    setRevisionScheduleStartDate(seedStartDate);
    setRevisionDrawerOpen(false);
    setRevisionReviewOpen(false);
    setCourseDrawerOpen(false);
    setReviewModalOpen(false);
    setListDrawerOpen(false);
    setInspectedProposal(null);
    setCalendarDisplayMode('calendar');
    setRevisionScheduleEditing(true);
    if (seedSessions.length > 0) {
      triggerFocusToSessions(seedSessions, seedStartDate || null);
    }
  }, [revisionDraft, triggerFocusToSessions]);

  const handleCancelRevisionScheduleEdit = useCallback(() => {
    setRevisionScheduleEditing(false);
    setRevisionScheduleSessions([]);
    setRevisionScheduleStartDate('');
    setRevisionDrawerOpen(true);
  }, []);

  const handleApplyRevisionScheduleEdit = useCallback(() => {
    if (!revisionDraft || !revisionScheduleEditing) return;
    const minPerWeek = Number(proposalPolicy.minSessionsPerWeek ?? 2);
    const maxPerWeek = Number(proposalPolicy.maxSessionsPerWeek ?? 4);
    const count = revisionScheduleSessions.length;
    if (count < minPerWeek || count > maxPerWeek || !revisionScheduleValidation?.step1Valid) {
      return;
    }
    const nextSessions = sortWeeklySessions(revisionScheduleSessions);
    const nextStartDate = resolveAlignedStartDate({
      currentStartDate: revisionScheduleStartDate,
      nextSessions,
      policy: proposalPolicy,
    });

    patchRevisionDraft({
      weeklySessions: nextSessions,
      expectedStartDate: nextStartDate,
    });
    setRevisionScheduleEditing(false);
    setRevisionScheduleSessions([]);
    setRevisionScheduleStartDate('');
    setRevisionDrawerOpen(true);
    setValidateNonce((n) => n + 1);
  }, [
    patchRevisionDraft,
    proposalPolicy,
    revisionDraft,
    revisionScheduleEditing,
    revisionScheduleSessions,
    revisionScheduleStartDate,
    revisionScheduleValidation?.step1Valid,
  ]);

  const closeRevisionFlow = useCallback(() => {
    setRevisionDrawerOpen(false);
    setRevisionReviewOpen(false);
    setRevisionShowErrors(false);
    setRevisionScheduleEditing(false);
    setRevisionScheduleSessions([]);
    setRevisionScheduleStartDate('');
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
      if (proposal.expectedStartDate) {
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
    if (resolved.expectedStartDate && resolved.expectedStartDate >= toVnDateKey(new Date())) {
      setCalendarAnchorKey(resolved.expectedStartDate);
    }
    if ((resolved.weeklySessions || []).length > 0) {
      triggerFocusToSessions(resolved.weeklySessions, resolved.expectedStartDate);
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
      commitments,
      policy: proposalPolicy,
    }) || '';

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

    if (isCapacityExhausted) {
      notify.error(capacityMessage);
      return;
    }

    const levelMatrix = resolveJlptLevelAvailability({
      availableLevels,
      qualifiedLevels,
      mentorVerified,
      mentorVerifiedJlptLevel,
      proposals,
      cohorts,
      currentProposalId: draft.status === 'Draft' ? draft.id : null,
      maxActiveClassesByLevel: proposalPolicy?.maxActiveClassesByLevel,
      maxTotalActiveClassesPerMentor: Number(proposalPolicy?.maxTotalActiveClassesPerMentor || 0),
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
        notify.error(levelInfo.unavailableReason || tr('Cấp độ JLPT này hiện đã đạt giới hạn lớp đang hoạt động.'));
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
    cohorts,
    draft,
    isCapacityExhausted,
    mentorVerified,
    mentorVerifiedJlptLevel,
    proposalPolicy?.maxActiveClassesByLevel,
    proposalPolicy?.maxTotalActiveClassesPerMentor,
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

  const hiddenRevisionProposalId = revisionScheduleEditing && revisionDraft?.id ? Number(revisionDraft.id) : null;

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
      const timeRange = formatTimeRange(startClock, endClock);
      const isNeedsRevision = status === 'ChangesRequested';
      const friendlyStatus = isNeedsRevision ? 'Cần bổ sung' : 'Chờ duyệt';
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
        sourceKind: isNeedsRevision ? 'needsRevisionProposal' : 'pendingProposal',
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
        tone: isNeedsRevision ? 'needsRevision' : 'pending',
        detail: detailParts.join(' · ') || `${weekdayLabelVn(weekday)} · ${timeRange}`,
      });
    };

    for (const c of commitments) {
      if (c.kind !== 'pendingProposal') continue;
      if (hiddenRevisionProposalId && Number(c.proposalId) === hiddenRevisionProposalId) {
        continue;
      }
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
  }, [commitments, draft.courseTitle, draft.id, draft.jlptLevelCode, draft.occurrencesPreview, draft.status, hiddenRevisionProposalId, proposalPolicy.sessionDurationMinutes, proposalPreview.occurrences, tr, trf]);

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
        const timeRange = formatTimeRange(startClock, endClock);
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
    if (!revisionScheduleEditing && isCapacityExhausted) {
      return {
        valid: false,
        code: 'MENTOR_ALL_LEVELS_OCCUPIED',
        reason: capacityMessage,
      };
    }

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
      : (revisionScheduleEditing ? revisionScheduleSessions : (draft.weeklySessions || []));
    const normalizedReplaceKey = replaceKey
      ? (sessionsPool.find((s) => s.key === replaceKey)?.key || weeklySlotKey(weekday, startMin))
      : null;

    const check = validateWeeklySlotAddition({
      weekday,
      startMinute: startMin,
      currentSessions: sessionsPool,
      replaceKey: normalizedReplaceKey,
      expectedStartDate: (revisionScheduleEditing ? revisionScheduleStartDate : draft.expectedStartDate) || null,
      viewAnchorKey: null,
      commitments: revisionScheduleEditing ? revisionCommitments : commitments,
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
  }, [capacityMessage, commitments, draft.expectedStartDate, draft.weeklySessions, isCapacityExhausted, normalizeSessionList, proposalPolicy, revisionCommitments, revisionScheduleEditing, revisionScheduleSessions, revisionScheduleStartDate, tr]);

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
        setRevisionScheduleStartDate('');
        return;
      }
      const nextStartDate = resolveAlignedStartDate({
        currentStartDate: revisionScheduleStartDate,
        nextSessions,
        addedDayKey,
        policy: proposalPolicy,
      });
      if (!nextStartDate && addedDayKey) {
        setReferenceWeekKey(mondayOfDateKey(addedDayKey));
      }
      setRevisionScheduleSessions(nextSessions);
      setRevisionScheduleStartDate(nextStartDate);
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

    const nextStartDate = resolveAlignedStartDate({
      currentStartDate: draft.expectedStartDate,
      nextSessions,
      addedDayKey,
      policy: proposalPolicy,
    });
    if (!nextStartDate && addedDayKey) {
      setReferenceWeekKey(mondayOfDateKey(addedDayKey));
    }

    patchDraft(
      nextStartDate !== (draft.expectedStartDate || '')
        ? { weeklySessions: nextSessions, expectedStartDate: nextStartDate }
        : { weeklySessions: nextSessions }
    );
  }, [
    calendarSelectedSlots,
    draft.expectedStartDate,
    draft.status,
    isCapacityExhausted,
    isEditable,
    patchDraft,
    proposalPolicy,
    requestClearSelection,
    revisionScheduleEditing,
    revisionSchedulePreview?.slots,
    revisionScheduleStartDate,
  ]);

  // Re-fetch proposals/commitments and availability right before applying; throws so the wizard never reports success.
  const revalidateQuickRegistration = useCallback(async () => {
    const [ctxResult] = await Promise.all([
      contextQuery.refetch({ cancelRefetch: true }),
      invalidateScheduling(),
    ]);
    if (ctxResult?.isError) throw ctxResult.error || new Error('refresh failed');
    const freshCtx = ctxResult?.data;
    if (freshCtx) {
      const freshPolicy = normalizeProposalPolicy(freshCtx.policy || proposalPolicy);
      const freshLevels = freshCtx.availableLevels?.length
        ? freshCtx.availableLevels
        : (freshCtx.qualifiedLevels || []);
      const freshProposals = Array.isArray(freshCtx.proposals)
        ? freshCtx.proposals.filter((p) => p && p.status !== 'Withdrawn')
        : [];
      const freshAvailability = resolveJlptLevelAvailability({
        availableLevels: freshLevels,
        qualifiedLevels: freshCtx.qualifiedLevels || [],
        mentorVerified: freshCtx.mentorVerified !== false,
        mentorVerifiedJlptLevel: freshCtx.mentorVerifiedJlptLevel || null,
        proposals: freshProposals,
        cohorts,
        currentProposalId: null,
        maxActiveClassesByLevel: freshPolicy?.maxActiveClassesByLevel,
        maxTotalActiveClassesPerMentor: Number(freshPolicy?.maxTotalActiveClassesPerMentor || 0),
      });
      const freshCapacity = computeMentorRegistrationCapacity({
        levelAvailability: freshAvailability,
        mentorVerified: freshCtx.mentorVerified !== false,
        loaded: true,
        weeklySessionCap: freshPolicy.weeklySessionCap,
        currentWeeklyCommittedCount: Number(freshCtx.workload?.weeklyTotalProjectedSessions ?? 0),
        minSessionsPerWeek: freshPolicy.minSessionsPerWeek,
        maxTotalActiveClassesPerMentor: Number(freshPolicy?.maxTotalActiveClassesPerMentor || 0),
      });
      if (freshCapacity.isCapacityExhausted) {
        setQuickFillOpen(false);
        throw new Error(tr(freshCapacity.message || 'Bạn đã đăng ký đủ các cấp độ giảng dạy.'));
      }
    }
  }, [cohorts, contextQuery, invalidateScheduling, proposalPolicy, tr]);

  const handleApplySmartQuickRegistration = useCallback((preview) => {
    if (!isEditable || draft.status !== 'Draft' || revisionScheduleEditing || isCapacityExhausted) return;
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
        commitments,
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
  }, [commitments, draft.expectedStartDate, draft.status, draft.weeklySessions, isCapacityExhausted, isEditable, patchDraft, proposalPolicy, revisionScheduleEditing, trf, triggerFocusToSessions]);

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

      const submittedLevel = submitted?.jlptLevelCode || draft.jlptLevelCode || null;
      const submittedTitle = submitted?.courseTitle?.trim()
        || (submittedLevel
          ? trf('JLPT {0}', { 0: submittedLevel })
          : tr('mở lớp mới'));
      const submittedWeeklyCount = (submitted?.weeklySessions || draft.weeklySessions || []).length;
      const rawSubmittedStartDate = submitted?.expectedStartDate || draft.expectedStartDate || '';
      const formattedStartDate = formatIsoDateDisplay(String(rawSubmittedStartDate).slice(0, 10));

      const submittedMessage = formattedStartDate
        ? trf('Bạn đã đăng ký mở lớp {0} ({1} buổi/tuần · bắt đầu {2}). Đề xuất đang chờ quản trị viên xét duyệt.', {
          0: submittedTitle,
          1: submittedWeeklyCount,
          2: formattedStartDate,
        })
        : trf('Bạn đã đăng ký mở lớp {0} ({1} buổi/tuần). Đề xuất đang chờ quản trị viên xét duyệt.', {
          0: submittedTitle,
          1: submittedWeeklyCount,
        });

      notify.success(
        tr('Đăng ký mở lớp thành công'),
        submittedMessage,
        {
          key: `mentor-proposal-submitted-${submitted?.id || Date.now()}`,
          replace: true,
          duration: 6000,
        }
      );

      setDraft(createEmptyDraft(proposalPolicy));
      setSearchParams({}, { replace: true });
      if (submitted?.expectedStartDate) {
        setCalendarAnchorKey(String(submitted.expectedStartDate).slice(0, 10));
      }

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
      if (code === 'MENTOR_ALL_LEVELS_OCCUPIED' || status === 409) {
        setCourseDrawerOpen(false);
        setReviewModalOpen(false);
        invalidateProposals();
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
        expectedStartDate: revisionDraft.expectedStartDate || null,
        courseDurationWeeks: revisionDraft.courseDurationWeeks || proposalPolicy.courseDurationWeeks,
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
        tr('Đã gửi lại đề xuất mở lớp'),
        tr('Đề xuất đã được cập nhật và gửi lại quản trị viên xét duyệt.'),
        {
          key: `mentor-proposal-resubmitted-${resubmitted?.id || Date.now()}`,
          replace: true,
          duration: 6000,
        }
      );

      if (resubmitted?.expectedStartDate) {
        setCalendarAnchorKey(String(resubmitted.expectedStartDate).slice(0, 10));
      }

      await Promise.allSettled([
        invalidateProposals(),
        invalidateSidebarCounters(queryClient),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
    onError: (err) => {
      resubmitKeyRef.current = null;
      notify.error(describeApiError(err).message || tr('Chưa thể gửi lại đề xuất. Vui lòng kiểm tra lại thông tin đã cập nhật.'));
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
        tr('Đã hủy đề xuất mở lớp'),
        tr('Các khung giờ tạm giữ đã được giải phóng.'),
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

  const filteredProposalList = useMemo(() => {
    const rank = {
      Draft: 0,
      ChangesRequested: 1,
      PendingReview: 2,
      Approved: 3,
      Rejected: 4,
    };
    return visibleProposals
      .filter((p) => matchesHistoryFilter(p, listFilter))
      .slice()
      .sort((a, b) => {
        const ra = rank[a.status] ?? 9;
        const rb = rank[b.status] ?? 9;
        if (ra !== rb) return ra - rb;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [listFilter, visibleProposals]);

  const selectedLevelObj = useMemo(
    () => availableLevels.find((l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)) || null,
    [availableLevels, draft.certificateLevelId]
  );

  const courseSummaryText = useMemo(() => {
    if ((draft.weeklySessions || []).length === 0) return '';
    const parts = [];
    if (selectedLevelObj?.code || draft.jlptLevelCode) parts.push(selectedLevelObj?.code || draft.jlptLevelCode);
    if (draft.expectedStartDate) parts.push(`${tr('Bắt đầu')} ${formatIsoDateDisplay(draft.expectedStartDate)}`);
    return parts.join(' · ');
  }, [draft.expectedStartDate, draft.jlptLevelCode, draft.weeklySessions, selectedLevelObj?.code, tr]);

  const renderSaveIndicator = () => {
    if (revisionScheduleEditing || !isEditable) return null;
    switch (persistence.saveStatus) {
      case DRAFT_SAVE_STATUS.SAVING:
        return (
          <span className="inline-flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-1.5 text-sm font-semibold text-rp-text-muted">
            <RefreshCw className="h-4.5 w-4.5 shrink-0 animate-spin text-rp-brand" />
            {tr('Đang lưu…')}
          </span>
        );
      case DRAFT_SAVE_STATUS.SAVED:
        return null;
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

  const calendarPolicy = useMemo(() => ({
    ...availabilityPolicy,
    sessionMinutes: proposalPolicy.sessionDurationMinutes,
    restMinutes: proposalPolicy.restMinutes,
  }), [availabilityPolicy, proposalPolicy.restMinutes, proposalPolicy.sessionDurationMinutes]);

  const effectiveBusy = scheduleQuery.isLoading || availabilityQuery.isLoading || cohortsQuery.isLoading;
  const pageRefreshing = (contextQuery.isFetching && !contextQuery.isPending)
    || (availabilityQuery.isFetching && !availabilityQuery.isPending)
    || (cohortsQuery.isFetching && !cohortsQuery.isPending);

  if (contextQuery.isLoading && !ctx) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
        <PageContainer as="div" width="default">
          <SakuraLoader variant="section" context="schedule" delay={140} />
        </PageContainer>
      </MentorShell>
    );
  }

  if ((contextQuery.error && !ctx) || (availabilityQuery.error && slots.length === 0 && !scheduleQuery.data)) {
    return (
      <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
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
    <MentorShell pathname={pathname} breadcrumb={tr('Đăng ký lịch dạy')}>
      <PageContainer as="div" data-page="MentorShiftSchedule" width="default" className="space-y-3.5 text-rp-text">
        <h1 className="sr-only">{tr('Đăng ký lịch dạy')}</h1>

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
            <>
              {isEditable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={CalendarPlus}
                  disabled={isCapacityExhausted}
                  title={isCapacityExhausted ? capacityMessage : undefined}
                  onClick={() => {
                    if (!isCapacityExhausted) setQuickFillOpen(true);
                  }}
                  className="!h-8.5 rounded-xl"
                >
                  {tr('Đăng ký nhanh')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={ListChecks}
                onClick={() => setListDrawerOpen(true)}
                className="!h-8.5 rounded-xl"
              >
                {officialProposalCount > 0
                  ? trf('Lịch sử đăng ký ({0})', { 0: officialProposalCount })
                  : tr('Lịch sử đăng ký')}
              </Button>
            </>
          ) : null}
          proposalMode
          customValidateCandidate={handleValidateProposalCandidate}
          proposalConfig={{
            minPerWeek: proposalPolicy.minSessionsPerWeek,
            maxPerWeek: proposalPolicy.maxSessionsPerWeek,
            durationWeeks: proposalPolicy.courseDurationWeeks,
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
            invalidStartDateWarning: revisionScheduleEditing ? null : (proposalPreview.startDateWarning || null),
            fallbackWeeklyPatterns: revisionScheduleEditing
              ? (revisionSchedulePreview?.mode === 'invalid_start_date' ? revisionScheduleSessions : [])
              : (proposalPreview.mode === 'invalid_start_date' ? (draft.weeklySessions || []) : []),
            courseStartDate: revisionScheduleEditing ? revisionSchedulePreview?.courseStartDate : proposalPreview.courseStartDate,
            courseEndDate: revisionScheduleEditing ? revisionSchedulePreview?.courseEndDate : proposalPreview.courseEndDate,
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
            pendingProposalEvents,
            rejectedProposalEvents,
            slotProposalMetaById,
            registrationRows,
            onWithdrawProposal: handleWithdrawProposalById,
            onReregisterProposal: handleReregisterProposalById,
            onNextStep: () => {
              if (isCapacityExhausted) return;
              const hasInvalidRestoredDate = Boolean(
                draft.expectedStartDate
                && !validateCourseStartDate({
                  dayKey: draft.expectedStartDate,
                  weeklySessions: draft.weeklySessions || [],
                  commitments,
                  policy: proposalPolicy,
                  nowMs: liveNowMs,
                }).valid
              );
              setShowCourseErrors(hasInvalidRestoredDate);
              setCourseDrawerOpen(true);
            },
            onOpenCourseInfo: () => {
              if (isCapacityExhausted) return;
              const hasInvalidRestoredDate = Boolean(
                draft.expectedStartDate
                && !validateCourseStartDate({
                  dayKey: draft.expectedStartDate,
                  weeklySessions: draft.weeklySessions || [],
                  commitments,
                  policy: proposalPolicy,
                  nowMs: liveNowMs,
                }).valid
              );
              if (hasInvalidRestoredDate) setShowCourseErrors(true);
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
            const target = proposals.find((p) => Number(p.id) === Number(proposalId));
            if (target) openProposal(target);
            else {
              setCourseDrawerOpen(false);
              setRevisionDrawerOpen(false);
              setListDrawerOpen(true);
            }
          }}
          onOpenProposalList={() => {
            setCourseDrawerOpen(false);
            setRevisionDrawerOpen(false);
            setListDrawerOpen(true);
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
        />

        {/* Smart Quick Registration Modal (Proposal Mode) */}
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

        {/* Registration History Drawer */}
        <Drawer
          open={listDrawerOpen}
          onClose={() => {
            setListDrawerOpen(false);
            setHighlightedProposalId(null);
          }}
          title={tr('Lịch sử đăng ký')}
          description={tr('Theo dõi các lớp đã gửi duyệt, lịch đang chọn hoặc xem lại chi tiết đề xuất.')}
          width="w-[min(560px,100vw)]"
          padded={false}
        >
          <div className="min-h-full bg-[#F5F4F7] px-5 py-4 space-y-4">
            <CustomSelect
              size="md"
              value={listFilter}
              onChange={setListFilter}
              aria-label={tr('Lọc theo trạng thái đăng ký')}
              triggerClassName="border-[#E8DCE2] bg-white shadow-[0_1px_2px_rgba(24,20,30,0.03)] hover:border-[#E05A7A]/70 focus:border-[#E05A7A]"
              options={PROPOSAL_STATUS_FILTERS.map((f) => ({
                value: f.value,
                label: f.label,
                dotClass: f.dotClass,
                count: visibleProposals.filter((p) => matchesHistoryFilter(p, f.value)).length,
              }))}
            />

            {filteredProposalList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E4D5DC] bg-white p-8 text-center shadow-[0_1px_2px_rgba(24,20,30,0.03)]">
                <p className="m-0 text-sm font-semibold text-rp-text">
                  {listFilter === 'ALL' ? tr('Chưa có đăng ký mở lớp nào') : tr('Chưa có đăng ký nào thuộc trạng thái này')}
                </p>
                <p className="m-0 mt-1 text-xs text-rp-text-muted">
                  {listFilter === 'ALL'
                    ? tr('Chọn trực tiếp các khung giờ 90 phút trên Lịch hoặc dùng "Đăng ký nhanh" để bắt đầu.')
                    : tr('Thử chuyển sang bộ lọc trạng thái khác để xem toàn bộ lịch sử đăng ký.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProposalList.map((item) => {
                  const meta = PROPOSAL_STATUS_META[item.status] || PROPOSAL_STATUS_META.Draft;
                  const weekly = sortWeeklySessions(item.weeklySessions || []);
                  const durationWeeks = Number(item.courseDurationWeeks || proposalPolicy.courseDurationWeeks || 10);
                  const totalSessions = weekly.length * durationWeeks;
                  const isDraftItem = item.status === 'Draft';
                  const isChangesRequested = item.status === 'ChangesRequested';
                  const isPending = item.status === 'PendingReview';
                  const isRejected = item.status === 'Rejected';
                  const isHighlighted = Boolean(
                    highlightedProposalId && item.id && Number(highlightedProposalId) === Number(item.id)
                  );
                  const isCurrentActive = Boolean(
                    isDraftItem && draft.status === 'Draft' && ((item.id && Number(draft.id) === Number(item.id)) || item._isLocalDraft)
                  );
                  const displayTitle = item.courseTitle?.trim()
                    || (item.jlptLevelCode ? trf('JLPT {0}', { 0: item.jlptLevelCode }) : tr('Lịch dạy đang chọn'));

                  return (
                    <div
                      key={item.id ? `proposal-${item.id}` : 'local-draft-selection'}
                      data-history-proposal-id={item.id || undefined}
                      className={`rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(24,20,30,0.04)] transition-colors space-y-3 ${
                        isHighlighted
                          ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20'
                          : isCurrentActive
                            ? 'border-[#E05A7A]/70 ring-1 ring-[#E05A7A]/20'
                            : 'border-[#EFE5EA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          {item.jlptLevelCode && (
                            <span className="inline-flex h-6 items-center rounded-lg border border-[#F2CCD7] bg-[#FFF5F7] px-2 text-xs font-extrabold text-[#B53D5C]">
                              {item.jlptLevelCode}
                            </span>
                          )}
                          <h3 className="m-0 text-sm font-bold text-rp-text truncate">{displayTitle}</h3>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.pillClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: meta.dot }} aria-hidden="true" />
                          {tr(meta.label)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#F2E9ED] bg-[#FAF8F9] px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 text-[11px] text-rp-text-muted">
                            <Clock className="h-3 w-3 shrink-0" />
                            {tr('Tần suất')}
                          </span>
                          <span className="mt-0.5 block font-bold text-rp-text tabular-nums">
                            {trf('{0} buổi/tuần', { 0: weekly.length })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 text-[11px] text-rp-text-muted">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            {tr('Thời lượng')}
                          </span>
                          <span className="mt-0.5 block font-bold text-rp-text tabular-nums">
                            {trf('{0} buổi ({1} tuần)', { 0: totalSessions, 1: durationWeeks })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 text-[11px] text-rp-text-muted">
                            <CalendarDays className="h-3 w-3 shrink-0" />
                            {tr('Ngày bắt đầu')}
                          </span>
                          <span className="mt-0.5 block font-bold text-rp-text tabular-nums">
                            {item.expectedStartDate ? formatIsoDateDisplay(item.expectedStartDate) : tr('Chưa chọn')}
                          </span>
                        </div>
                      </div>

                      {weekly.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {weekly.map((s) => (
                            <span
                              key={s.key || `${s.weekday}-${s.startMinute}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rp-line bg-white px-2 py-1 text-[11px] font-semibold text-rp-text tabular-nums"
                            >
                              {tr(weekdayLabelVn(s.weekday))} · {formatTimeRange(s.startClock, s.endClock)}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.reviewReason && (
                        <div className={`rounded-xl border px-3 py-2 text-xs ${
                          isRejected
                            ? 'border-red-200 bg-red-50/80 text-red-800'
                            : 'border-orange-200 bg-orange-50/85 text-orange-950'
                        }`}>
                          <span className="font-bold">
                            {isChangesRequested ? tr('Yêu cầu từ quản trị viên') : tr('Phản hồi quản trị viên')}:{' '}
                          </span>
                          {item.reviewReason}
                        </div>
                      )}

                      {item.linkedCohortName && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
                          <span className="font-bold">{tr('Lớp nhóm đã tạo')}: </span>
                          {item.linkedCohortName}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F4ECEF] pt-2.5">
                        {isDraftItem && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              icon={Trash2}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setListDrawerOpen(false);
                                requestClearSelection();
                              }}
                            >
                              {tr('Bỏ chọn tất cả')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              iconRight={ArrowRight}
                              disabled={isCapacityExhausted}
                              title={isCapacityExhausted ? capacityMessage : undefined}
                              onClick={() => {
                                if (isCapacityExhausted) return;
                                if (item._isLocalDraft) {
                                  setListDrawerOpen(false);
                                  setCalendarDisplayMode('calendar');
                                  handleJumpToSelectedSchedule();
                                } else {
                                  openProposal(item);
                                }
                              }}
                            >
                              {tr('Tiếp tục đăng ký')}
                            </Button>
                          </>
                        )}

                        {isChangesRequested && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              icon={Trash2}
                              className="hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
                              onClick={() => handleWithdrawProposalById(item.id)}
                            >
                              {tr('Hủy đề xuất')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              icon={Eye}
                              onClick={() => openProposal(item)}
                            >
                              {tr('Xem chi tiết')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              icon={Pencil}
                              onClick={() => startRevisionProposal(item)}
                            >
                              {tr('Chỉnh sửa đề xuất')}
                            </Button>
                          </>
                        )}

                        {isPending && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              icon={Trash2}
                              className="hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
                              onClick={() => handleWithdrawProposalById(item.id)}
                            >
                              {tr('Hủy đề xuất')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              icon={Eye}
                              onClick={() => openProposal(item)}
                            >
                              {tr('Xem chi tiết')}
                            </Button>
                          </>
                        )}

                        {isRejected && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              icon={RotateCcw}
                              disabled={isCapacityExhausted}
                              title={isCapacityExhausted ? capacityMessage : undefined}
                              onClick={() => {
                                if (isCapacityExhausted) return;
                                setListDrawerOpen(false);
                                handleReregisterProposalById(item.id);
                              }}
                            >
                              {tr('Đăng ký lại')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              icon={Eye}
                              onClick={() => openProposal(item)}
                            >
                              {tr('Xem chi tiết')}
                            </Button>
                          </>
                        )}

                        {item.status === 'Approved' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            icon={Eye}
                            onClick={() => openProposal(item)}
                          >
                            {tr('Xem chi tiết')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer>

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
            <Field label={tr('Lý do hủy đề xuất (nếu có)')}>
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
          description={tr('Lịch dạy, cấp độ JLPT, ngày bắt đầu, thông tin lớp và tài liệu đính kèm đang soạn sẽ bị xóa. Các đề xuất đã gửi trước đó sẽ không bị ảnh hưởng.')}
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
