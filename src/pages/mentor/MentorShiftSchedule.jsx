import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CloudOff,
  Copy,
  History,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  Drawer,
  FeatureIcon,
  Field,
  Modal,
  PageContainer,
  PageHeader,
  SakuraLoader,
  Textarea,
  notify,
} from '@/components/ui';
import { useMentorScheduleWorkspace } from '@/features/scheduling/hooks/useMentorScheduleWorkspace.js';
import {
  cloneTeachingProposalDraft,
  deleteTeachingProposalDraft,
  getMyTeachingProposal,
  getTeachingProposalContext,
  submitTeachingProposal,
  validateTeachingProposal,
  withdrawTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  buildProposalCommitments,
  buildProposalQuickFillPreview,
  calendarSlotToWeeklySlot,
  dayKeyToWeekday,
  DEFAULT_PROPOSAL_POLICY,
  normalizeProposalPolicy,
  PROPOSAL_STATUS_META,
  QUICK_FILL_PRESETS,
  sortWeeklySessions,
  validateProposalState,
  validateWeeklySlotAddition,
  weekdayLabelVn,
  weeklySessionsToCalendarSlots,
  weeklySlotKey,
} from '@/features/scheduling/utils/proposalValidation.js';
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
import TeachingProposalCourseInfoDrawer from '@/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx';
import TeachingProposalReviewModal from '@/features/scheduling/components/TeachingProposalReviewModal.jsx';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const PROPOSAL_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Draft', label: 'Bản nháp' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'ChangesRequested', label: 'Cần bổ sung' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Bị từ chối' },
  { value: 'Withdrawn', label: 'Đã rút' },
];

const QUICK_FILL_WEEKDAYS = [
  { weekday: 1, short: 'T2', full: 'Thứ 2' },
  { weekday: 2, short: 'T3', full: 'Thứ 3' },
  { weekday: 3, short: 'T4', full: 'Thứ 4' },
  { weekday: 4, short: 'T5', full: 'Thứ 5' },
  { weekday: 5, short: 'T6', full: 'Thứ 6' },
  { weekday: 6, short: 'T7', full: 'Thứ 7' },
  { weekday: 0, short: 'CN', full: 'Chủ nhật' },
];

const PROPOSAL_QUICK_DAYPARTS = [
  { id: 'Morning', label: 'Sáng (07:00–11:00)' },
  { id: 'Afternoon', label: 'Chiều (13:30–17:30)' },
  { id: 'Evening', label: 'Tối (18:00–22:00)' },
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

function normalizeServerProposalToDraft(p, policy) {
  if (!p) return createEmptyDraft(policy);
  return {
    ...p,
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
  const coursePlans = useMemo(() => ctx?.coursePlans || [], [ctx?.coursePlans]);
  const proposals = useMemo(() => ctx?.proposals || [], [ctx?.proposals]);
  const mentorVerified = ctx?.mentorVerified !== false;
  const mentorDeclaredJlptLevel = ctx?.mentorDeclaredJlptLevel || null;

  // Registration mode: 'proposal' (Mở lớp 10 tuần, mặc định) | 'availability' (Giờ rảnh đơn lẻ)
  const [registrationMode, setRegistrationMode] = useState('proposal');
  const [calendarAnchorKey, setCalendarAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [availSelectedSlots, setAvailSelectedSlots] = useState([]);

  const [draft, setDraft] = useState(() => createEmptyDraft(DEFAULT_PROPOSAL_POLICY));
  const [initialized, setInitialized] = useState(false);

  // Focus Drawers & Modals (calendar remains the primary workspace at all times)
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);
  const [showCourseErrors, setShowCourseErrors] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listFilter, setListFilter] = useState('ALL');
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [detailHistory, setDetailHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [quickFillTab, setQuickFillTab] = useState('presets'); // 'presets' | 'custom'
  const [selectedPresetId, setSelectedPresetId] = useState(QUICK_FILL_PRESETS[0].id);
  const [customDayparts, setCustomDayparts] = useState(() => new Set(['1-Evening', '3-Evening', '5-Evening']));
  const [quickFillMode, setQuickFillMode] = useState('append'); // 'append' | 'replace'
  const [availQuickRules, setAvailQuickRules] = useState(() => new Set(['1-Evening', '3-Evening', '5-Evening']));

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        notify.info(tr('Đã khôi phục thay đổi bản nháp chưa đồng bộ trên thiết bị này.'));
      }
    },
  });

  // Initial load hydration (URL ?proposalId=X -> latest editable draft -> blank draft)
  useEffect(() => {
    if (!ctx || initialized) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setInitialized(true);
      const paramId = Number(searchParams.get('proposalId') || 0);
      const fromUrl = paramId ? proposals.find((p) => Number(p.id) === paramId) : null;
      const latestEditable = proposals.find((p) => p.status === 'ChangesRequested' || p.status === 'Draft') || null;
      const initial = fromUrl || latestEditable;

      if (initial) {
        const normalized = normalizeServerProposalToDraft(initial, proposalPolicy);
        const hydrated = persistence.hydrateFromServer(normalized);
        const targetDraft = normalizeServerProposalToDraft(hydrated || normalized, proposalPolicy);
        setDraft(targetDraft);
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
        }
      } else {
        const blank = createEmptyDraft(proposalPolicy);
        const hydrated = persistence.hydrateFromServer(blank);
        const targetDraft = normalizeServerProposalToDraft(hydrated || blank, proposalPolicy);
        setDraft(targetDraft);
        if (targetDraft.expectedStartDate && targetDraft.expectedStartDate >= toVnDateKey(new Date())) {
          setCalendarAnchorKey(targetDraft.expectedStartDate);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, [ctx, initialized, persistence, proposalPolicy, proposals, searchParams]);

  // Normalized commitments across existing cohorts, availabilities, and other PendingReview proposals
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

  const clientValidation = useMemo(
    () => validateProposalState({
      proposal: draft,
      availableLevels,
      qualifiedLevels,
      coursePlans,
      commitments,
      policy: proposalPolicy,
    }),
    [draft, availableLevels, qualifiedLevels, coursePlans, commitments, proposalPolicy]
  );

  // Live debounced backend validation whenever draft has start date + weekly sessions
  const [serverValidationState, setServerValidationState] = useState(null);
  const serverValidatePayload = useMemo(() => {
    if (!isEditable || registrationMode !== 'proposal') return null;
    if (!draft.expectedStartDate || (draft.weeklySessions || []).length === 0) return null;
    return {
      proposalId: draft.id || null,
      certificateLevelId: draft.certificateLevelId ? Number(draft.certificateLevelId) : null,
      programType: draft.programType || 'StandardJlpt',
      coursePlanId: draft.coursePlanId ? Number(draft.coursePlanId) : null,
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

  const serverValidateKey = serverValidatePayload ? JSON.stringify(serverValidatePayload) : '';
  useEffect(() => {
    if (!serverValidateKey) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      validateTeachingProposal(JSON.parse(serverValidateKey))
        .then((res) => alive && setServerValidationState({ key: serverValidateKey, data: res }))
        .catch(() => alive && setServerValidationState({ key: serverValidateKey, data: null }));
    }, VALIDATE_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [serverValidateKey]);

  const activeServerValidation = serverValidateKey && serverValidationState?.key === serverValidateKey
    ? serverValidationState.data
    : null;
  const serverValidating = Boolean(serverValidateKey) && !activeServerValidation;

  const patchDraft = useCallback((patch) => {
    submitKeyRef.current = null;
    setDraft((cur) => ({ ...cur, ...patch }));
  }, []);

  const openProposal = useCallback((proposal) => {
    submitKeyRef.current = null;
    setRegistrationMode('proposal');
    setShowCourseErrors(false);
    const normalized = normalizeServerProposalToDraft(proposal, proposalPolicy);
    const hydrated = proposal.status === 'Draft' || proposal.status === 'ChangesRequested'
      ? persistence.hydrateFromServer(normalized)
      : normalized;
    const resolved = normalizeServerProposalToDraft(hydrated || normalized, proposalPolicy);
    setDraft(resolved);
    if (resolved.expectedStartDate && resolved.expectedStartDate >= toVnDateKey(new Date())) {
      setCalendarAnchorKey(resolved.expectedStartDate);
    }
    setListDrawerOpen(false);
    if (proposal.id) {
      setSearchParams({ proposalId: String(proposal.id) }, { replace: true });
    }
  }, [persistence, proposalPolicy, setSearchParams]);

  const startNewProposal = useCallback(() => {
    submitKeyRef.current = null;
    setRegistrationMode('proposal');
    setShowCourseErrors(false);
    clearLocalDraft(uid, 'new');
    setDraft(createEmptyDraft(proposalPolicy));
    setListDrawerOpen(false);
    setReviewModalOpen(false);
    setSearchParams({}, { replace: true });
    notify.info(tr('Đã tạo biểu mẫu đề xuất mở lớp mới. Các đề xuất đang chờ duyệt khác vẫn được giữ nguyên.'));
  }, [proposalPolicy, setSearchParams, tr, uid]);

  // Project draft's weekly pattern onto the currently visible week in InteractiveSlotCalendar
  const calendarSelectedSlots = useMemo(
    () => weeklySessionsToCalendarSlots({
      weeklySessions: draft.weeklySessions || [],
      anchorKey: calendarAnchorKey,
      policy: proposalPolicy,
    }),
    [draft.weeklySessions, calendarAnchorKey, proposalPolicy]
  );

  // Project other PendingReview proposals onto the calendar so Mentors visually see reserved windows
  const pendingProposalEvents = useMemo(() => {
    const items = [];
    for (const c of commitments) {
      if (c.kind !== 'pendingProposal') continue;
      const startMin = Number.isFinite(Number(c.startMin))
        ? Number(c.startMin)
        : (c.startMs ? (((Math.floor((c.startMs + 7 * 3600_000) / 60_000)) % 1440) + 1440) % 1440 : NaN);
      const endMin = Number.isFinite(Number(c.endMin))
        ? Number(c.endMin)
        : (c.endMs ? (((Math.floor((c.endMs + 7 * 3600_000) / 60_000)) % 1440) + 1440) % 1440 : NaN);
      if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) continue;
      const startClock = clockFromMinutes(startMin);
      const endClock = clockFromMinutes(endMin);
      const timeRange = `${startClock}–${endClock}`;
      items.push({
        id: c.id,
        sourceKind: 'pendingProposal',
        draggable: false,
        locked: true,
        dayKey: c.dayKey,
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
        fullTitle: `${c.label || 'Đề xuất đang chờ duyệt'} (${timeRange})`,
        statusLabel: 'Đề xuất chờ duyệt',
        tone: 'pending',
        detail: c.label ? `${c.label} · ${weekdayLabelVn(c.weekday)}` : `${weekdayLabelVn(c.weekday)} · ${timeRange}`,
      });
    }
    return items;
  }, [commitments]);

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
      commitments,
      policy: proposalPolicy,
    });

    if (!check.valid) return check;

    const startClock = clockFromMinutes(startMin);
    const endMin = startMin + proposalPolicy.sessionDurationMinutes;
    return {
      valid: true,
      key: check.slot.key,
      weekday,
      endMin,
      startClock,
      endClock: clockFromMinutes(endMin),
      startUtcIso: vnLocalToUtcIso(dayKey, startMin),
      endUtcIso: vnLocalToUtcIso(dayKey, endMin),
      slot: check.slot,
    };
  }, [commitments, draft.expectedStartDate, draft.weeklySessions, normalizeSessionList, proposalPolicy]);

  const handleProposalCalendarSelectionChange = useCallback((nextOrUpdater) => {
    if (!isEditable) return;
    const resolved = typeof nextOrUpdater === 'function' ? nextOrUpdater(calendarSelectedSlots) : nextOrUpdater;
    const dedup = new Map();
    for (const item of resolved || []) {
      const ws = calendarSlotToWeeklySlot({
        dayKey: item.dayKey,
        startMin: Number(item.startMin ?? item.startMinute),
        policy: proposalPolicy,
      });
      dedup.set(ws.key, ws);
    }
    patchDraft({ weeklySessions: sortWeeklySessions([...dedup.values()]) });
  }, [calendarSelectedSlots, isEditable, patchDraft, proposalPolicy]);

  // Quick Fill preview (Proposal Mode)
  const proposalQuickFillPreview = useMemo(() => {
    if (!quickFillOpen || registrationMode !== 'proposal') return null;
    if (quickFillTab === 'presets') {
      const preset = QUICK_FILL_PRESETS.find((p) => p.id === selectedPresetId) || QUICK_FILL_PRESETS[0];
      return buildProposalQuickFillPreview({
        candidateInputs: preset.slots,
        currentSessions: draft.weeklySessions || [],
        expectedStartDate: draft.expectedStartDate || null,
        commitments,
        policy: proposalPolicy,
        mode: quickFillMode,
      });
    }
    return buildProposalQuickFillPreview({
      selectedDaypartRules: customDayparts,
      currentSessions: draft.weeklySessions || [],
      expectedStartDate: draft.expectedStartDate || null,
      commitments,
      policy: proposalPolicy,
      mode: quickFillMode,
    });
  }, [
    commitments,
    customDayparts,
    draft.expectedStartDate,
    draft.weeklySessions,
    proposalPolicy,
    quickFillMode,
    quickFillOpen,
    quickFillTab,
    registrationMode,
    selectedPresetId,
  ]);

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

  const toggleProposalDaypart = (weekday, daypartId) => {
    const k = `${weekday}-${daypartId}`;
    setCustomDayparts((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAvailRule = (weekday, daypartCode) => {
    const k = `${weekday}-${daypartCode}`;
    setAvailQuickRules((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const applyQuickFill = () => {
    if (registrationMode === 'proposal') {
      if (!proposalQuickFillPreview || proposalQuickFillPreview.validCandidates.length === 0) return;
      patchDraft({ weeklySessions: proposalQuickFillPreview.resultingSessions });
      setQuickFillOpen(false);
      notify.success(trf('Đã áp dụng {0} khung giờ vào lịch đề xuất hàng tuần.', {
        0: proposalQuickFillPreview.validCandidates.length,
      }));
      return;
    }

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

  // Submit mutation (syncs server draft first, then submits idempotently)
  const submitMutation = useMutation({
    mutationFn: async () => {
      let target = draft;
      const synced = await persistence.syncNow();
      if (synced?.id) {
        target = synced;
      } else if (!target.id) {
        throw new Error(tr('Vui lòng đợi bản nháp được lưu lên máy chủ trước khi gửi duyệt.'));
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
      setDraft(normalizeServerProposalToDraft(submitted, proposalPolicy));
      setReviewModalOpen(false);
      if (submitted?.id) setSearchParams({ proposalId: String(submitted.id) }, { replace: true });
      await invalidateProposals();
      notify.success(tr('Đã gửi đề xuất mở lớp lên Admin chờ phê duyệt! Bạn có thể tạo thêm đề xuất mở lớp khác nếu muốn.'));
    },
    onError: (err) => {
      notify.error(describeApiError(err).message || tr('Chưa thể gửi duyệt đề xuất. Vui lòng kiểm tra lại lịch dạy.'));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => withdrawTeachingProposal(draft.id, {
      reason: withdrawReason.trim() || null,
      expectedRevision: draft.revision,
    }),
    onSuccess: async (updated) => {
      setWithdrawModalOpen(false);
      setWithdrawReason('');
      setDraft(normalizeServerProposalToDraft(updated, proposalPolicy));
      await invalidateProposals();
      notify.success(tr('Đã rút đề xuất mở lớp. Các khung giờ tạm giữ đã được giải phóng.'));
    },
    onError: (err) => notify.error(describeApiError(err).message),
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => cloneTeachingProposalDraft(id),
    onSuccess: async (cloned) => {
      await invalidateProposals();
      openProposal(cloned);
      notify.success(tr('Đã tạo bản nháp mới từ đề xuất trước đó.'));
    },
    onError: (err) => notify.error(describeApiError(err).message),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id) => deleteTeachingProposalDraft(id),
    onSuccess: async (_, deletedId) => {
      clearLocalDraft(uid, deletedId);
      setDeleteTarget(null);
      await invalidateProposals();
      if (Number(draft.id) === Number(deletedId)) {
        startNewProposal();
      }
      notify.success(tr('Đã xóa bản nháp đề xuất.'));
    },
    onError: (err) => notify.error(describeApiError(err).message),
  });

  const openHistoryDrawer = async () => {
    if (!draft.id) return;
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const full = await getMyTeachingProposal(draft.id);
      setDetailHistory(full?.history || []);
    } catch {
      setDetailHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReloadServerForConflict = async () => {
    if (!draft.id) return;
    try {
      const latest = await getMyTeachingProposal(draft.id);
      persistence.resolveKeepServer(latest);
      await invalidateProposals();
      notify.info(tr('Đã đồng bộ theo bản mới nhất từ máy chủ.'));
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

  const statusMeta = PROPOSAL_STATUS_META[draft.status] || PROPOSAL_STATUS_META.Draft;

  const filteredProposalList = useMemo(() => {
    if (listFilter === 'ALL') return proposals;
    return proposals.filter((p) => p.status === listFilter);
  }, [listFilter, proposals]);

  const selectedLevelObj = useMemo(
    () => availableLevels.find((l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)) || null,
    [availableLevels, draft.certificateLevelId]
  );

  const courseSummaryText = useMemo(() => {
    const parts = [];
    if (selectedLevelObj?.code || draft.jlptLevelCode) parts.push(selectedLevelObj?.code || draft.jlptLevelCode);
    if (draft.expectedStartDate) parts.push(`${tr('Khai giảng')} ${draft.expectedStartDate}`);
    return parts.join(' · ') || tr('Chưa điền thông tin lớp');
  }, [draft.expectedStartDate, draft.jlptLevelCode, selectedLevelObj?.code, tr]);

  const renderSaveIndicator = () => {
    if (!isEditable || registrationMode !== 'proposal') return null;
    switch (persistence.saveStatus) {
      case DRAFT_SAVE_STATUS.SAVING:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-rp-brand" />
            {tr('Đang lưu...')}
          </span>
        );
      case DRAFT_SAVE_STATUS.SAVED:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {tr('Đã lưu')}
          </span>
        );
      case DRAFT_SAVE_STATUS.OFFLINE_PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <CloudOff className="h-3.5 w-3.5" />
            {tr('Ngoại tuyến — chờ đồng bộ')}
          </span>
        );
      case DRAFT_SAVE_STATUS.SYNC_FAILED:
        return (
          <button
            type="button"
            onClick={() => persistence.syncNow()}
            className="rp-link inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {tr('Lưu thất bại — thử lại')}
          </button>
        );
      case DRAFT_SAVE_STATUS.CONFLICT:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {tr('Phát hiện xung đột')}
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
        <PageHeader
          eyebrow={tr('Giảng dạy & Lịch nhóm JLPT')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="calendar" icon={CalendarClock} size="lg" />
              <span>{tr('Đăng ký lịch dạy')}</span>
            </span>
          }
          description={
            registrationMode === 'proposal'
              ? tr('Chọn 2–4 buổi/tuần (90 phút/buổi) trực tiếp trên lịch để đề xuất mở lớp 10 tuần gửi Admin phê duyệt.')
              : tr('Đăng ký khung giờ rảnh đơn lẻ trên lịch. Khung giờ cần nghỉ ít nhất 15 phút giữa các ca.')
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {renderSaveIndicator()}

              <div className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2/70 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setRegistrationMode('proposal')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                    registrationMode === 'proposal'
                      ? 'bg-white text-rp-brand shadow-2xs'
                      : 'text-rp-text-2 hover:text-rp-text'
                  }`}
                >
                  {tr('Đề xuất mở lớp')}
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode('availability')}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${
                    registrationMode === 'availability'
                      ? 'bg-white text-rp-brand shadow-2xs'
                      : 'text-rp-text-2 hover:text-rp-text'
                  }`}
                >
                  {tr('Giờ rảnh đơn lẻ')}
                </button>
              </div>

              {registrationMode === 'proposal' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={ListChecks}
                    onClick={() => setListDrawerOpen(true)}
                  >
                    {trf('Đề xuất của tôi ({0})', { 0: proposals.length })}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    icon={Plus}
                    onClick={startNewProposal}
                  >
                    {tr('Tạo mới')}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Slim Contextual Proposal Strip (keeps InteractiveSlotCalendar immediately above the fold) */}
        {registrationMode === 'proposal' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-rp-line bg-white px-3.5 py-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge tone={statusMeta.tone} size="sm" icon={false}>
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: statusMeta.dot }}
                />
                {tr(statusMeta.label)}
              </Badge>
              <button
                type="button"
                onClick={() => setCourseDrawerOpen(true)}
                className="rp-link truncate text-sm font-bold text-rp-text hover:text-rp-brand"
                title={tr('Mở Thông tin lớp dự kiến')}
              >
                {draft.courseTitle?.trim()
                  || (draft.id ? trf('Đề xuất mở lớp #{0}', { 0: draft.id }) : tr('Đề xuất mở lớp mới'))}
              </button>
              <span className="hidden text-xs text-rp-text-muted md:inline">
                · {courseSummaryText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isEditable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Sparkles}
                  onClick={() => setQuickFillOpen(true)}
                >
                  {tr('Điền nhanh')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={BookOpen}
                onClick={() => setCourseDrawerOpen(true)}
              >
                {tr('Thông tin lớp')}
              </Button>
              {isEditable && draft.id && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={Save}
                  disabled={persistence.saveStatus === DRAFT_SAVE_STATUS.SAVING}
                  onClick={() => persistence.syncNow()}
                >
                  {tr('Lưu nháp')}
                </Button>
              )}
              {draft.id && (
                <Button type="button" size="sm" variant="ghost" icon={History} onClick={openHistoryDrawer}>
                  {tr('Lịch sử')}
                </Button>
              )}
              {(draft.status === 'PendingReview' || draft.status === 'ChangesRequested') && draft.id && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Undo2}
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  {tr('Rút đề xuất')}
                </Button>
              )}
              {(draft.status === 'Rejected' || draft.status === 'Withdrawn') && draft.id && (
                <Button
                  type="button"
                  size="sm"
                  icon={Copy}
                  loading={cloneMutation.isPending}
                  onClick={() => cloneMutation.mutate(draft.id)}
                >
                  {tr('Nhân bản bản nháp')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Conditional Alerts (Conflict / Admin Feedback / Read-Only State) */}
        {registrationMode === 'proposal' && persistence.conflictState && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Phát hiện xung đột bản nháp giữa nhiều phiên làm việc')}
            action={
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleReloadServerForConflict}>
                  {tr('Giữ bản máy chủ')}
                </Button>
                <Button type="button" size="sm" onClick={handleOverwriteConflictWithLocal}>
                  {tr('Ghi đè bản trên máy này')}
                </Button>
              </div>
            }
          >
            {tr('Bản nháp này đã được cập nhật từ tab hoặc thiết bị khác. Hãy chọn bản muốn giữ lại.')}
          </Banner>
        )}

        {registrationMode === 'proposal' && draft.reviewReason && (draft.status === 'ChangesRequested' || draft.status === 'Rejected' || draft.status === 'Approved') && (
          <Banner
            tone={draft.status === 'Approved' ? 'success' : draft.status === 'Rejected' ? 'danger' : 'warning'}
            title={
              draft.status === 'Approved'
                ? tr('Ghi chú phê duyệt từ Admin')
                : draft.status === 'Rejected'
                  ? tr('Lý do Admin từ chối đề xuất')
                  : tr('Admin yêu cầu chỉnh sửa bổ sung')
            }
          >
            {draft.reviewReason}
          </Banner>
        )}

        {registrationMode === 'proposal' && !isEditable && (
          <Banner
            tone="info"
            action={
              <Button type="button" size="sm" variant="outline" icon={Plus} onClick={startNewProposal}>
                {tr('Tạo thêm đề xuất mới')}
              </Button>
            }
          >
            {draft.status === 'PendingReview'
              ? tr('Đề xuất đang chờ Admin phê duyệt nên tạm khóa chỉnh sửa trên lịch. Bạn có thể rút đề xuất hoặc tạo đề xuất khác song song.')
              : draft.status === 'Approved'
                ? trf('Đề xuất đã được phê duyệt ({0} buổi đã ghi nhận sẵn sàng mở lớp).', {
                  0: draft.generatedAvailabilityIds?.length || draft.totalSessions || 0,
                })
                : tr('Đề xuất này đã đóng. Bạn có thể nhân bản thành bản nháp mới nếu muốn gửi lại.')}
          </Banner>
        )}

        {/* PRIMARY INTERACTIVE CALENDAR WORKSPACE — RESTORED ORIGINAL UX */}
        <InteractiveSlotCalendar
          slots={slots}
          cohortSessions={cohortSessions}
          externalBusyEvents={externalBusyEvents}
          policy={calendarPolicy}
          anchorKey={calendarAnchorKey}
          onAnchorChange={setCalendarAnchorKey}
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
          renderCustomHeaderActions={registrationMode === 'availability' ? () => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={Sparkles}
              onClick={() => setQuickFillOpen(true)}
            >
              {tr('Điền nhanh')}
            </Button>
          ) : undefined}
          proposalMode={registrationMode === 'proposal'}
          customValidateCandidate={registrationMode === 'proposal' ? handleValidateProposalCandidate : null}
          proposalConfig={registrationMode === 'proposal' ? {
            minPerWeek: proposalPolicy.minSessionsPerWeek,
            maxPerWeek: proposalPolicy.maxSessionsPerWeek,
            durationWeeks: proposalPolicy.courseDurationWeeks,
            readOnly: !isEditable,
            hasCourseInfoReady: clientValidation.step1Valid,
            courseSummaryText,
            pendingProposalEvents,
            onOpenCourseInfo: () => setCourseDrawerOpen(true),
            onOpenReview: () => {
              setShowCourseErrors(true);
              setReviewModalOpen(true);
            },
          } : null}
        />

        {/* Course Info Drawer */}
        <TeachingProposalCourseInfoDrawer
          open={courseDrawerOpen}
          onClose={() => setCourseDrawerOpen(false)}
          draft={draft}
          onChange={patchDraft}
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          coursePlans={coursePlans}
          policy={proposalPolicy}
          validation={clientValidation}
          readOnly={!isEditable}
          mentorVerified={mentorVerified}
          mentorDeclaredJlptLevel={mentorDeclaredJlptLevel}
          showAllErrors={showCourseErrors}
          onProceedToReview={() => {
            setShowCourseErrors(true);
            setCourseDrawerOpen(false);
            setReviewModalOpen(true);
          }}
        />

        {/* Review & Idempotent Submit Modal */}
        <TeachingProposalReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          draft={draft}
          availableLevels={availableLevels}
          qualifiedLevels={qualifiedLevels}
          coursePlans={coursePlans}
          policy={proposalPolicy}
          validation={clientValidation}
          serverValidation={activeServerValidation}
          serverValidating={serverValidating}
          workload={ctx?.workload}
          readOnly={!isEditable}
          mentorVerified={mentorVerified}
          submitting={submitMutation.isPending}
          onEditCourseInfo={() => {
            setReviewModalOpen(false);
            setShowCourseErrors(true);
            setCourseDrawerOpen(true);
          }}
          onBackToCalendar={() => setReviewModalOpen(false)}
          onSubmit={() => submitMutation.mutate()}
        />

        {/* Quick Fill Modal (Supports both 2-4 weekly proposal patterns & single-slot availability quick fill) */}
        <Modal
          open={quickFillOpen}
          onClose={() => setQuickFillOpen(false)}
          size="lg"
          title={registrationMode === 'proposal' ? tr('Điền nhanh lịch dạy hàng tuần') : tr('Điền nhanh khung giờ rảnh trong tuần')}
          description={
            registrationMode === 'proposal'
              ? trf('Hệ thống tự đối chiếu giới hạn {0}–{1} buổi/tuần, khoảng nghỉ {2} phút và lịch bận 10 tuần trước khi xác nhận.', {
                0: proposalPolicy.minSessionsPerWeek,
                1: proposalPolicy.maxSessionsPerWeek,
                2: proposalPolicy.restMinutes,
              })
              : tr('Chọn thứ và buổi trong tuần hiện tại, xem trước khung hợp lệ trước khi thêm vào danh sách chọn.')
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-rp-text-muted">
                {registrationMode === 'proposal'
                  ? trf('Còn có thể thêm: {0}/{1} buổi/tuần', {
                    0: Math.max(0, proposalPolicy.maxSessionsPerWeek - (draft.weeklySessions || []).length),
                    1: proposalPolicy.maxSessionsPerWeek,
                  })
                  : trf('Sẽ thêm {0} khung giờ hợp lệ', { 0: availQuickFillPreview?.validSlots.length ?? 0 })}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setQuickFillOpen(false)}>
                  {tr('Hủy')}
                </Button>
                <Button
                  type="button"
                  disabled={
                    registrationMode === 'proposal'
                      ? !proposalQuickFillPreview || proposalQuickFillPreview.validCandidates.length === 0
                      : !availQuickFillPreview || availQuickFillPreview.validSlots.length === 0
                  }
                  onClick={applyQuickFill}
                >
                  {trf('Xác nhận áp dụng ({0} buổi)', {
                    0: registrationMode === 'proposal'
                      ? (proposalQuickFillPreview?.validCandidates.length ?? 0)
                      : (availQuickFillPreview?.validSlots.length ?? 0),
                  })}
                </Button>
              </div>
            </div>
          }
        >
          {registrationMode === 'proposal' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2/50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickFillTab('presets')}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      quickFillTab === 'presets' ? 'bg-white text-rp-brand shadow-2xs' : 'text-rp-text-2 hover:text-rp-text'
                    }`}
                  >
                    {tr('Mẫu phổ biến (2–4 buổi)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFillTab('custom')}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      quickFillTab === 'custom' ? 'bg-white text-rp-brand shadow-2xs' : 'text-rp-text-2 hover:text-rp-text'
                    }`}
                  >
                    {tr('Chọn Thứ × Khung giờ')}
                  </button>
                </div>

                <div className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2/50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickFillMode('append')}
                    className={`rounded-lg px-2.5 py-1 font-medium ${
                      quickFillMode === 'append' ? 'bg-white text-rp-text shadow-2xs' : 'text-rp-text-muted'
                    }`}
                  >
                    {tr('Thêm vào lịch hiện tại')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFillMode('replace')}
                    className={`rounded-lg px-2.5 py-1 font-medium ${
                      quickFillMode === 'replace' ? 'bg-white text-rp-text shadow-2xs' : 'text-rp-text-muted'
                    }`}
                  >
                    {tr('Thay thế lịch đã chọn')}
                  </button>
                </div>
              </div>

              {quickFillTab === 'presets' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_FILL_PRESETS.map((preset) => {
                    const active = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          active
                            ? 'border-[#E05A7A] bg-[#FFF5F7]'
                            : 'border-rp-line bg-white hover:border-[#F2CCD7]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-rp-text">{tr(preset.label)}</span>
                          <Badge tone={active ? 'brand' : 'neutral'} size="sm" icon={false}>
                            {trf('{0} buổi/tuần', { 0: preset.sessionsPerWeek })}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
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
                      {PROPOSAL_QUICK_DAYPARTS.map((dp) => (
                        <tr key={dp.id} className="border-b border-rp-line last:border-b-0">
                          <td className="px-2.5 py-2 font-medium text-rp-text">{tr(dp.label)}</td>
                          {QUICK_FILL_WEEKDAYS.map((d) => {
                            const k = `${d.weekday}-${dp.id}`;
                            const checked = customDayparts.has(k);
                            return (
                              <td key={k} className="px-1 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleProposalDaypart(d.weekday, dp.id)}
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
              )}

              {proposalQuickFillPreview && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                    <p className="m-0 text-xs font-bold text-emerald-800">
                      {trf('Khung giờ hợp lệ sẽ được thêm ({0})', { 0: proposalQuickFillPreview.validCandidates.length })}
                    </p>
                    {proposalQuickFillPreview.validCandidates.length === 0 ? (
                      <p className="m-0 text-xs text-emerald-700/80">
                        {tr('Không có khung giờ mới nào thỏa mãn quy định để thêm.')}
                      </p>
                    ) : (
                      <ul className="m-0 list-none space-y-1 p-0 text-xs text-emerald-900">
                        {proposalQuickFillPreview.validCandidates.map((c) => (
                          <li key={c.key} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span className="font-semibold">{weekdayLabelVn(c.weekday)}</span>
                            <span className="tabular-nums">{c.startClock}–{c.endClock}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                    <p className="m-0 text-xs font-bold text-amber-900">
                      {trf('Khung giờ bị bỏ qua / từ chối ({0})', { 0: proposalQuickFillPreview.rejectedCandidates.length })}
                    </p>
                    {proposalQuickFillPreview.rejectedCandidates.length === 0 ? (
                      <p className="m-0 text-xs text-amber-800/80">
                        {tr('Tất cả ứng viên đều hợp lệ.')}
                      </p>
                    ) : (
                      <ul className="m-0 max-h-40 list-none space-y-1.5 overflow-y-auto p-0 pr-1 text-xs text-amber-950">
                        {proposalQuickFillPreview.rejectedCandidates.slice(0, 10).map((r, idx) => (
                          <li key={`${r.key}-${idx}`} className="rounded-lg bg-white/80 px-2 py-1">
                            <div className="font-semibold">
                              {weekdayLabelVn(r.weekday)} · {r.startClock}–{r.endClock}
                            </div>
                            <div className="text-[11px] text-amber-800">{r.reason}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
                      {availQuickFillPreview.validSlots.slice(0, 6).map((s) => `${s.dayKey} ${s.startClock}`).join(', ') || tr('Không có khung phù hợp.')}
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
          )}
        </Modal>

        {/* Proposal Switcher & Status Filter Drawer */}
        <Drawer
          open={listDrawerOpen}
          onClose={() => setListDrawerOpen(false)}
          title={tr('Danh sách đề xuất mở lớp của bạn')}
          description={tr('Theo dõi trạng thái, tiếp tục bản nháp hoặc tạo thêm đề xuất song song.')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {PROPOSAL_STATUS_FILTERS.map((f) => {
                  const active = listFilter === f.value;
                  const count = f.value === 'ALL'
                    ? proposals.length
                    : proposals.filter((p) => p.status === f.value).length;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setListFilter(f.value)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#E05A7A] bg-[#FFF5F7] text-[#B53D5C]'
                          : 'border-rp-line bg-white text-rp-text-2 hover:border-[#F2CCD7]'
                      }`}
                    >
                      {tr(f.label)} ({count})
                    </button>
                  );
                })}
              </div>
              <Button type="button" size="sm" icon={Plus} onClick={startNewProposal}>
                {tr('Tạo mới')}
              </Button>
            </div>

            {filteredProposalList.length === 0 ? (
              <Card className="p-6 text-center text-sm text-rp-text-muted">
                {tr('Chưa có đề xuất nào thuộc bộ lọc này.')}
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filteredProposalList.map((item) => {
                  const meta = PROPOSAL_STATUS_META[item.status] || PROPOSAL_STATUS_META.Draft;
                  const isCurrent = Number(item.id) === Number(draft.id);
                  return (
                    <Card
                      key={item.id}
                      className={`p-3.5 transition-colors ${
                        isCurrent ? 'border-[#E05A7A] bg-[#FFF5F7]/40' : 'hover:border-[#F2CCD7]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={meta.tone} size="sm" icon={false}>
                              <span
                                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: meta.dot }}
                              />
                              {tr(meta.label)}
                            </Badge>
                            {item.jlptLevelCode && (
                              <Badge tone="neutral" size="sm" icon={false}>{item.jlptLevelCode}</Badge>
                            )}
                            <span className="truncate text-sm font-bold text-rp-text">
                              {item.courseTitle?.trim() || trf('Đề xuất #{0}', { 0: item.id })}
                            </span>
                          </div>
                          <div className="text-xs text-rp-text-2">
                            {trf('{0} buổi/tuần · {1} tuần', {
                              0: item.weeklySessionCount,
                              1: item.courseDurationWeeks,
                            })}
                            {item.expectedStartDate ? ` · ${tr('Khai giảng')}: ${item.expectedStartDate}` : ''}
                          </div>
                          {item.weeklySessions?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {sortWeeklySessions(item.weeklySessions).map((s) => (
                                <span
                                  key={s.key}
                                  className="rounded border border-rp-line bg-white px-1.5 py-0.5 text-[11px] text-rp-text-2"
                                >
                                  {weekdayLabelVn(s.weekday)} {s.startClock}–{s.endClock}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.reviewReason && (
                            <p className="m-0 text-xs text-rp-brand-strong">
                              {tr('Phản hồi Admin')}: {item.reviewReason}
                            </p>
                          )}
                          {item.linkedCohortName && (
                            <p className="m-0 text-xs font-medium text-emerald-700">
                              {tr('Đã gắn lớp nhóm')}: {item.linkedCohortName}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button type="button" size="sm" variant={isCurrent ? 'outline' : 'primary'} onClick={() => openProposal(item)}>
                            {item.status === 'Draft' || item.status === 'ChangesRequested' ? tr('Tiếp tục') : tr('Xem')}
                          </Button>
                          {item.status === 'Draft' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              icon={Trash2}
                              aria-label={tr('Xóa bản nháp')}
                              onClick={() => setDeleteTarget(item)}
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer>

        {/* Proposal History Drawer */}
        <Drawer
          open={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          title={trf('Lịch sử xử lý đề xuất #{0}', { 0: draft.id || '' })}
          size="md"
        >
          {historyLoading ? (
            <SakuraLoader variant="section" delay={100} />
          ) : detailHistory.length === 0 ? (
            <p className="text-sm text-rp-text-muted">{tr('Chưa có lịch sử cập nhật trạng thái.')}</p>
          ) : (
            <ol className="m-0 list-none space-y-2.5 p-0">
              {detailHistory.map((ev) => (
                <li key={ev.id} className="rounded-xl border border-rp-line bg-white p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rp-text">{ev.action}</span>
                    <span className="text-rp-text-muted">{formatVnDateTime(ev.createdAtUtc, '—')}</span>
                  </div>
                  <div className="text-rp-text-2">
                    {ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}
                  </div>
                  {ev.reason && <p className="m-0 text-rp-text-muted">{ev.reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </Drawer>

        {/* Withdraw Confirmation Modal */}
        <Modal
          open={withdrawModalOpen}
          onClose={() => !withdrawMutation.isPending && setWithdrawModalOpen(false)}
          title={tr('Rút đề xuất mở lớp')}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={withdrawMutation.isPending} onClick={() => setWithdrawModalOpen(false)}>
                {tr('Hủy')}
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate()}
              >
                {tr('Xác nhận rút đề xuất')}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="m-0 text-rp-text-2">
              {tr('Sau khi rút, đề xuất sẽ không còn nằm trong hàng đợi duyệt của Admin và các khung giờ tạm giữ sẽ được giải phóng ngay lập tức.')}
            </p>
            <Field label={tr('Lý do rút đề xuất (không bắt buộc)')}>
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

        {/* Delete Draft Confirmation */}
        <AlertDialog
          open={Boolean(deleteTarget)}
          onClose={() => !deleteDraftMutation.isPending && setDeleteTarget(null)}
          title={tr('Xóa bản nháp đề xuất?')}
          description={tr('Bản nháp này chưa từng gửi duyệt và sẽ bị xóa vĩnh viễn.')}
          confirmLabel={tr('Xóa bản nháp')}
          cancelLabel={tr('Hủy')}
          tone="danger"
          loading={deleteDraftMutation.isPending}
          onConfirm={() => deleteTarget && deleteDraftMutation.mutate(deleteTarget.id)}
        />
      </PageContainer>
    </MentorShell>
  );
}
