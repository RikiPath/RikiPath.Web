import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  GripVertical,
  List,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { AlertDialog, Modal, Popover, Tabs } from '@/components/ui/overlay.jsx';
import { TimeInput, Input } from '@/components/ui/core.jsx';
import { CountBadge, DatePicker, formatIsoDateDisplay } from '@/components/ui';
import { RefreshButton } from '@/components/ui/RefreshButton.jsx';
import { RefreshingIndicator } from '@/components/ui/SakuraLoader.jsx';
import { ContextualEmptyState } from '@/components/ui/SmartDataBoundary.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { useLocale } from '@/locales/locale.js';
import { previewTeachingConflicts } from '@/features/scheduling/api/mentorScheduleManageApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { backendUtcDate } from '@/utils/mentorSchedule.js';
import {
  buildMonthMatrix,
  buildWeekDays,
  formatCleanCohortTitle,
  formatFullDayVn,
  formatFullDayWithYearVn,
  formatShortDateVn,
  getToneMeta,
  getViewDateRange,
  minutesOfEvent,
  mondayOfDateKey,
  packDayEvents,
  shiftDateKey,
  stepAnchorKey,
  toVnDateKey,
  toVnTimeParts,
  weekdayOfDateKey,
} from '@/features/scheduling/utils/calendarGeometry.js';
import {
  REGISTRATION_EVENT_TYPE_OPTIONS,
  REGISTRATION_STATUS_OPTIONS,
  SCHEDULE_EVENT_TYPE_OPTIONS,
  SCHEDULE_STATUS_OPTIONS,
  buildOccupiedItems,
  buildVisibleRestWindowSources,
  classifyRegistrationEvent,
  classifyScheduleEvent,
  clockFromMinutes,
  computeDayRestWindows,
  filterRegistrationEvents,
  filterScheduleEvents,
  minutesFromClock,
  slotDurationMinutes,
  snapMinutesToGrid,
  sortScheduleEvents,
  validateCandidateSlot,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import {
  REGISTRATION_TABLE_SORT_OPTIONS,
  REGISTRATION_TABLE_STATUS_OPTIONS,
  computeRegistrationRowCounts,
  filterRegistrationRows,
  sortRegistrationRows,
} from '@/features/scheduling/utils/registrationTableModel.js';
import {
  ActiveScheduleFilterBar,
  ScheduleMoreFiltersPopover,
  StatusDotListbox,
} from '@/features/scheduling/components/ScheduleFilterControls.jsx';
import ExpandableRegistrationTable from '@/features/scheduling/components/ExpandableRegistrationTable.jsx';

const CALENDAR_SUBVIEWS = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

const DAY_SHORT_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_SHORT_JA = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_LABEL_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function ListRowActionMenu({ items = [], triggerLabel }) {
  if (!items || items.length === 0) return null;
  return (
    <Popover
      align="end"
      label={triggerLabel}
      panelClassName="w-52 p-1.5"
      trigger={({ props, toggle }) => (
        <button
          {...props}
          type="button"
          aria-label={triggerLabel}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-rp-line bg-white text-rp-text-muted transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            if (item.to) {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  role="menuitem"
                  onClick={() => close()}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-rp-text transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  item.danger
                    ? 'text-red-700 hover:bg-red-50'
                    : 'text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

const HOUR_HEIGHT = 64;
const CONFLICT_DEBOUNCE_MS = 250;

function slotStatusMeta(s, conflictIds, restConflictIds, cohortMeta = null) {
  if (s.isDeleted || s.status === 'Cancelled') {
    return { kind: 'cancelled', label: 'Đã hủy', tone: 'cancelled', draggable: false, locked: true };
  }
  if (s.rejectedAt || s.status === 'Rejected') {
    return { kind: 'rejected', label: 'Bị từ chối', tone: 'rejected', draggable: false, locked: false };
  }
  if (s.cancelRequestedAt && !s.cancelRejectedAt) {
    return { kind: 'pending', label: 'Chờ duyệt hủy', tone: 'pending', draggable: false, locked: true };
  }
  if (s.changeRequestedAt && !s.changeResolution) {
    return { kind: 'pending', label: 'Chờ duyệt đổi giờ', tone: 'pending', draggable: false, locked: true };
  }
  if (conflictIds?.has(s.id) || restConflictIds?.has(s.id)) {
    return {
      kind: 'conflict',
      label: 'Trùng lịch',
      tone: 'conflict',
      draggable: false,
      locked: true,
    };
  }
  const inCohort = Boolean(s.isInCohort || cohortMeta);
  const isCompletedByLifecycle = Boolean(
    cohortMeta?.sessionCompleted ||
    s.sessionCompleted ||
    (inCohort && s.status === 'Completed')
  );
  if (isCompletedByLifecycle) {
    return { kind: 'present', label: 'Đã hoàn thành', tone: 'present', draggable: false, locked: true };
  }
  if (inCohort || s.isBooked || s.status === 'Booked' || (s.bookedCount ?? 0) > 0) {
    return { kind: 'session', label: 'Đã xếp lớp', tone: 'session', draggable: false, locked: true };
  }
  if (!s.isApproved || s.status === 'Pending') {
    // Status-based interaction lock: submitted Pending slots are LOCKED on the Calendar grid.
    return { kind: 'pending', label: 'Chờ duyệt', tone: 'pending', draggable: false, locked: true };
  }
  // Admin-approved slots not yet assigned to a cohort use canonical Teal 'Đã duyệt' (no separate 'Đã công bố' label).
  return { kind: 'approved', label: 'Đã duyệt', tone: 'approved', draggable: false, locked: true };
}

function findOverlappingAndRestSlotIds(slots, restMinutes) {
  const overlapIds = new Set();
  const restIds = new Set();
  const active = slots
    .filter((s) => s && !s.isDeleted && !s.rejectedAt)
    .map((s) => ({
      id: s.id,
      start: backendUtcDate(s.startTime)?.getTime() || 0,
      end: backendUtcDate(s.endTime)?.getTime() || 0,
    }))
    .filter((x) => x.end > x.start)
    .sort((a, b) => a.start - b.start);

  const restMs = Math.max(0, restMinutes) * 60000;
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (b.start >= a.end + restMs) break;
      if (b.start < a.end) {
        overlapIds.add(a.id);
        overlapIds.add(b.id);
      } else if (restMs > 0 && b.start - a.end < restMs) {
        restIds.add(a.id);
        restIds.add(b.id);
      }
    }
  }
  return { overlapIds, restIds };
}

function MiniDateJump({ anchorKey, todayKey, eventsByDay, onPickDay }) {
  const { locale, tr, fmt } = useLocale();
  const [cursorKey, setCursorKey] = useState(anchorKey);
  const matrix = useMemo(() => buildMonthMatrix(cursorKey, todayKey), [cursorKey, todayKey]);
  const headers = locale === 'ja' ? ['月', '火', '水', '木', '金', '土', '日'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="w-[252px] select-none p-2">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={tr('Tháng trước')}
          onClick={() => setCursorKey((k) => stepAnchorKey(k, 'month', -1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[12.5px] font-semibold text-rp-text">
          {locale === 'vi' ? matrix.title : fmt.monthYear(new Date(`${cursorKey}T12:00:00+07:00`))}
        </span>
        <button
          type="button"
          aria-label={tr('Tháng sau')}
          onClick={() => setCursorKey((k) => stepAnchorKey(k, 'month', 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10.5px] font-semibold text-rp-text-muted">
        {headers.map((h) => <span key={h} className="py-0.5">{h}</span>)}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {matrix.cells.map((cell) => {
          const isSelected = cell.key === anchorKey;
          const hasEvents = (eventsByDay.get(cell.key)?.length || 0) > 0;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onPickDay(cell.key)}
              className={`relative flex h-7 flex-col items-center justify-center rounded-lg text-[11.5px] transition-colors ${
                isSelected && cell.isToday
                  ? 'bg-rp-brand-pressed font-bold text-white shadow-xs ring-2 ring-rp-brand-border/70'
                  : isSelected
                    ? 'bg-rp-brand-pressed font-bold text-white shadow-xs'
                    : cell.isToday
                      ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                      : cell.inCurrentMonth
                        ? 'text-rp-text hover:bg-rp-brand-tint/70'
                        : 'text-rp-text-muted/50 hover:bg-rp-bg-2'
              }`}
            >
              <span>{cell.dateNum}</span>
              {hasEvents && (
                <span aria-hidden="true" className={`mt-0.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rp-brand'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Clean White Interactive 90-Minute Mentor Calendar with:
 * - Multi-select 90-minute slots (green cards = selected, click again to deselect, drag to move)
 * - Persistent selection across Day/Week/Month and Calendar/List view switches
 * - Calendar | List (Table) view toggle in toolbar with 3-dot row action popover
 * - Confirmation Modal ("Xác nhận lịch dạy") & batch/sequential submission with per-slot result resilience
 */
export default function InteractiveSlotCalendar({
  slots = [],
  cohorts = [],
  cohortSessions = [],
  externalBusyEvents = [],
  previewGeneratedSlots = [],
  policy,
  anchorKey: controlledAnchorKey,
  onAnchorChange,
  displayMode: controlledDisplayMode,
  onDisplayModeChange,
  selectedSlots: controlledSelectedSlots,
  onSelectedSlotsChange,
  busy = false,
  onCreateAvailability,
  onCreateAvailabilityBatch,
  onMovePendingSlot,
  onDeletePendingSlot,
  onRequestCancelSlot,
  onRequestChangeSlot,
  onRefresh,
  refreshing = false,
  renderCustomHeaderActions,
  headerTopRight = null,
  proposalMode = false,
  templateMode = false,
  proposalConfig = null,
  customValidateCandidate = null,
  focusRequest = null,
  onVisibleRangeChange = null,
  nowMs: controlledNowMs = null,
}) {
  const { locale, tr, trf, fmt } = useLocale();
  const dayLabels = locale === 'ja' ? DAY_SHORT_JA : DAY_SHORT_VI;
  const [internalNowMs, setInternalNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (controlledNowMs != null) return undefined;
    const refreshNow = () => setInternalNowMs(Date.now());
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
  }, [controlledNowMs]);
  const nowMs = controlledNowMs ?? internalNowMs;
  const todayKey = useMemo(() => toVnDateKey(new Date(nowMs)), [nowMs]);
  const [invalidFlash, setInvalidFlash] = useState(null);
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [feedbackBannerHovered, setFeedbackBannerHovered] = useState(false);
  const [uncontrolledAnchor, setUncontrolledAnchor] = useState(() => toVnDateKey(new Date()));
  const anchorKey = controlledAnchorKey ?? uncontrolledAnchor;
  const setAnchor = useCallback((next) => {
    setInvalidFlash(null);
    setFeedbackBanner(null);
    setFeedbackBannerHovered(false);
    if (onAnchorChange) onAnchorChange(next);
    else setUncontrolledAnchor(next);
  }, [onAnchorChange]);

  // Primary display mode: 'calendar' vs 'list' (Lịch | Danh sách)
  const [uncontrolledDisplayMode, setUncontrolledDisplayMode] = useState('calendar');
  const displayMode = templateMode ? 'calendar' : (controlledDisplayMode ?? uncontrolledDisplayMode);
  const setDisplayModeState = useCallback((nextMode) => {
    if (templateMode) return;
    if (onDisplayModeChange) onDisplayModeChange(nextMode);
    else setUncontrolledDisplayMode(nextMode);
  }, [onDisplayModeChange, templateMode]);
  // Calendar sub-view defaults to 'day' on mobile viewports (<768px) per Rule 11, 'week' on tablet/desktop
  const [calendarSubView, setCalendarSubView] = useState(() => (
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week'
  ));
  const view = templateMode ? 'week' : (displayMode === 'list' ? 'week' : calendarSubView);

  // Unified Advanced Filtering & Smart Sorting state (persisted across Calendar <-> List switches)
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [jlptLevelFilter, setJlptLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState('view'); // 'view' | 'upcoming' | 'past' | 'today' | 'week' | 'month' | 'custom'
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [timeFilterCode, setTimeFilterCode] = useState('ALL'); // 'ALL' | daypart.code | 'CUSTOM'
  const [customStartTime, setCustomStartTime] = useState('07:00');
  const [customEndTime, setCustomEndTime] = useState('22:00');
  const [sortBy, setSortBy] = useState('smart');
  const [sortDirection, setSortDirection] = useState('asc');
  const [regSortBy, setRegSortBy] = useState('default');
  const [regSortDirection, setRegSortDirection] = useState('asc');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [cancelingEvent, setCancelingEvent] = useState(null); // Dedicated Cancel Confirmation Modal
  const [cancelModalReason, setCancelModalReason] = useState('');
  const [cancelModalError, setCancelModalError] = useState('');
  const [localFocusRequest, setLocalFocusRequest] = useState(null);

  const handleDisplayModeChange = useCallback((nextMode) => {
    setDisplayModeState(nextMode);
    if (nextMode === 'calendar') {
      if (statusFilter === 'selected') setStatusFilter('ALL');
      if (dateFilterMode === 'upcoming' || dateFilterMode === 'past') setDateFilterMode('view');
    } else {
      setTablePage(1);
    }
  }, [dateFilterMode, setDisplayModeState, statusFilter]);

  // Multi-select 90-minute slots: array of { key, dayKey, startMin, endMin, startClock, endClock, startUtcIso, endUtcIso, submitError? }
  const [internalSelectedSlots, setInternalSelectedSlots] = useState([]);
  const selectedSlots = controlledSelectedSlots ?? internalSelectedSlots;
  const setSelectedSlots = useCallback((updater) => {
    if (onSelectedSlotsChange) {
      onSelectedSlotsChange(updater);
    } else {
      setInternalSelectedSlots(updater);
    }
  }, [onSelectedSlotsChange]);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const [pendingMove, setPendingMove] = useState(null);
  const [dragVisual, setDragVisual] = useState(null);
  const [touchPickerDay, setTouchPickerDay] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const onInspectProposal = proposalConfig?.onInspectProposal;
  const openEventDetail = useCallback((ev) => {
    if (ev?.proposalId && onInspectProposal) {
      onInspectProposal(ev.proposalId);
      return;
    }
    setSelectedEvent(ev);
  }, [onInspectProposal]);
  const statusOptions = useMemo(
    () => (proposalMode
      ? (displayMode === 'list' ? REGISTRATION_TABLE_STATUS_OPTIONS : REGISTRATION_STATUS_OPTIONS)
      : SCHEDULE_STATUS_OPTIONS),
    [displayMode, proposalMode]
  );
  const eventTypeOptions = useMemo(
    () => (proposalMode ? REGISTRATION_EVENT_TYPE_OPTIONS : SCHEDULE_EVENT_TYPE_OPTIONS),
    [proposalMode]
  );
  const [adjustingEvent, setAdjustingEvent] = useState(null); // For "Điều chỉnh giờ" modal from List/Calendar
  const [adjustDateKey, setAdjustDateKey] = useState('');
  const [adjustTimeClock, setAdjustTimeClock] = useState('08:00');
  const [adjustError, setAdjustError] = useState('');

  const [monthDayModal, setMonthDayModal] = useState(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');

  const gridScrollRef = useRef(null);
  const dayColsRef = useRef({});
  const dragSessionRef = useRef(null);

  const durationMinutes = policy?.sessionMinutes || 90;
  const restMinutes = policy?.restMinutes ?? 15;
  const effectiveStep = policy?.defaultStepMinutes || 15;
  const proposalReadOnly = Boolean(proposalMode && proposalConfig?.readOnly);
  const isRevisionScheduleEditing = Boolean(proposalMode && proposalConfig?.revisionEditing);
  const proposalCapacityLocked = Boolean(proposalMode && proposalConfig?.capacityLocked && !isRevisionScheduleEditing);
  const proposalCapacityMessage = proposalConfig?.capacityLockedMessage || tr('Bạn đã đăng ký đủ các cấp độ giảng dạy.');
  const proposalSelectionBlocked = proposalReadOnly || proposalCapacityLocked;

  useEffect(() => {
    if (proposalSelectionBlocked) {
      setTouchPickerDay(null);
    }
  }, [proposalSelectionBlocked]);

  useEffect(() => {
    if (!invalidFlash) return undefined;
    const t = setTimeout(() => setInvalidFlash(null), 2800);
    return () => clearTimeout(t);
  }, [invalidFlash]);

  useEffect(() => {
    if (!feedbackBanner || feedbackBannerHovered) return undefined;
    const t = setTimeout(() => setFeedbackBanner(null), 4500);
    return () => clearTimeout(t);
  }, [feedbackBanner, feedbackBannerHovered]);

  const effectiveFocusRequest = useMemo(() => {
    if (localFocusRequest?.id && (!focusRequest?.id || localFocusRequest.id >= focusRequest.id)) {
      return localFocusRequest;
    }
    return focusRequest;
  }, [focusRequest, localFocusRequest]);

  const [prevFocusId, setPrevFocusId] = useState(null);
  const [highlightedKeys, setHighlightedKeys] = useState([]);
  if (effectiveFocusRequest?.id && effectiveFocusRequest.id !== prevFocusId) {
    setPrevFocusId(effectiveFocusRequest.id);
    if (!effectiveFocusRequest.preserveSubView) {
      setDisplayModeState('calendar');
      setCalendarSubView((cur) => (typeof window !== 'undefined' && window.innerWidth < 768 ? cur : 'week'));
    } else if (displayMode === 'list') {
      setDisplayModeState('calendar');
    }
    setHighlightedKeys(Array.isArray(effectiveFocusRequest.highlightKeys) ? effectiveFocusRequest.highlightKeys : []);
  }
  const highlightedKeySet = useMemo(() => new Set(highlightedKeys), [highlightedKeys]);

  useEffect(() => {
    if (highlightedKeys.length === 0) return undefined;
    const t = setTimeout(() => setHighlightedKeys([]), 2200);
    return () => clearTimeout(t);
  }, [highlightedKeys]);

  const weekDays = useMemo(
    () => (view === 'day'
      ? buildWeekDays(anchorKey, todayKey).filter((d) => d.key === anchorKey)
      : buildWeekDays(anchorKey, todayKey)),
    [anchorKey, todayKey, view]
  );

  const range = useMemo(() => getViewDateRange(anchorKey, view), [anchorKey, view]);

  useEffect(() => {
    if (typeof onVisibleRangeChange !== 'function') return;
    onVisibleRangeChange({
      startKey: range.startKey,
      endKey: range.endKey,
      view,
      anchorKey,
    });
  }, [onVisibleRangeChange, range.startKey, range.endKey, view, anchorKey]);

  const { overlapIds, restIds } = useMemo(
    () => findOverlappingAndRestSlotIds(slots, restMinutes),
    [slots, restMinutes]
  );

  const cohortByAvailabilityId = useMemo(() => {
    const map = new Map();
    for (const cs of cohortSessions) {
      if (cs?.availabilityId) map.set(cs.availabilityId, cs);
    }
    return map;
  }, [cohortSessions]);

  const activeIgnoreId = dragVisual?.slotId ?? pendingMove?.slot?.id ?? null;
  const occupiedItems = useMemo(
    () => buildOccupiedItems({
      slots,
      cohortSessions,
      externalBusyEvents,
      cohorts,
      ignoreSlotId: activeIgnoreId,
    }),
    [slots, cohortSessions, externalBusyEvents, cohorts, activeIgnoreId]
  );

  // Convert currently selected multi-slots into proposed items for validation (excluding an actively dragged selectedKey)
  const buildProposedFromSelection = useCallback((excludeKey = null) => (
    selectedSlots
      .filter((s) => s.key !== excludeKey)
      .map((s) => ({
        id: `selected-${s.key}`,
        dayKey: s.dayKey,
        startMin: s.startMin,
        endMin: s.endMin,
        startMs: new Date(s.startUtcIso).getTime(),
        endMs: new Date(s.endUtcIso).getTime(),
        label: `${s.startClock}–${s.endClock}`,
        title: 'Khung đang chọn',
        blocksOverlap: true,
        blocksRest: true,
      }))
  ), [selectedSlots]);

  // Re-validate each selected slot against current occupiedItems + other selectedSlots.
  // In proposalMode, validation is strictly authoritative from Business State (proposalConfig),
  // completely independent of Calendar viewport navigation.
  const validatedSelections = useMemo(() => {
    const results = [];
    const accepted = [];
    const sorted = [...selectedSlots].sort((a, b) => (
      a.dayKey === b.dayKey ? a.startMin - b.startMin : a.dayKey.localeCompare(b.dayKey)
    ));
    if (proposalMode) {
      const invalidWeeklyMap = proposalConfig?.invalidWeeklyMap;
      const invalidOccurrenceMap = proposalConfig?.invalidOccurrenceMap;
      for (const item of sorted) {
        const occKey = `${item.dayKey}_${item.startMin}`;
        const wkKey = item.weeklyKey || item.key;
        const occErr = invalidOccurrenceMap instanceof Map
          ? invalidOccurrenceMap.get(occKey)
          : invalidOccurrenceMap?.[occKey];
        const wkErr = invalidWeeklyMap instanceof Map
          ? invalidWeeklyMap.get(wkKey)
          : invalidWeeklyMap?.[wkKey];
        const reason = item.submitError || occErr || wkErr || '';
        results.push({
          ...item,
          valid: !reason,
          reason,
          code: reason ? 'PROPOSAL_CONFLICT' : null,
        });
      }
      return results;
    }

    for (const item of sorted) {
      const check = customValidateCandidate
        ? customValidateCandidate({
          dayKey: item.dayKey,
          startMin: item.startMin,
          replaceKey: item.key,
          currentOverride: accepted,
        })
        : validateCandidateSlot({
          dayKey: item.dayKey,
          startMin: item.startMin,
          policy,
          occupiedItems,
          extraProposedItems: accepted,
          nowMs,
          stepMinutes: effectiveStep,
        });
      const entry = {
        ...item,
        valid: check.valid,
        reason: item.submitError || check.reason || '',
        code: check.code,
      };
      results.push(entry);
      if (check.valid) {
        if (customValidateCandidate) {
          accepted.push(item);
        } else {
          accepted.push({
            id: `selected-${item.key}`,
            dayKey: item.dayKey,
            startMin: item.startMin,
            endMin: item.endMin,
            startMs: new Date(item.startUtcIso).getTime(),
            endMs: new Date(item.endUtcIso).getTime(),
            label: `${item.startClock}–${item.endClock}`,
            title: 'Khung đang chọn',
            blocksOverlap: true,
            blocksRest: true,
          });
        }
      }
    }
    return results;
  }, [selectedSlots, proposalMode, proposalConfig?.invalidWeeklyMap, proposalConfig?.invalidOccurrenceMap, customValidateCandidate, policy, occupiedItems, nowMs, effectiveStep]);

  const validSelectedSlots = useMemo(
    () => validatedSelections.filter((s) => s.valid),
    [validatedSelections]
  );

  const invalidSelectedSlots = useMemo(
    () => validatedSelections.filter((s) => !s.valid),
    [validatedSelections]
  );

  // Group selected slots by dayKey for Confirmation Modal
  const selectedGroupsByDay = useMemo(() => {
    const map = new Map();
    for (const s of validatedSelections) {
      if (!map.has(s.dayKey)) map.set(s.dayKey, []);
      map.get(s.dayKey).push(s);
    }
    return [...map.entries()].map(([dayKey, items]) => ({
      dayKey,
      items: items.sort((a, b) => a.startMin - b.startMin),
    }));
  }, [validatedSelections]);

  // Debounced server-side teaching conflict verification (skipped in proposalMode where 10-week validation runs at proposal level)
  const proposedIntervalsForServer = useMemo(() => {
    if (pendingMove) {
      return [{ startUtc: pendingMove.startUtcIso, endUtc: pendingMove.endUtcIso }];
    }
    if (!proposalMode && validSelectedSlots.length > 0) {
      return validSelectedSlots.map((s) => ({
        startUtc: s.startUtcIso,
        endUtc: s.endUtcIso,
      }));
    }
    return [];
  }, [pendingMove, proposalMode, validSelectedSlots]);

  const serverCheckKey = useMemo(() => JSON.stringify(proposedIntervalsForServer), [proposedIntervalsForServer]);
  const [serverConflictState, setServerConflictState] = useState(null);

  useEffect(() => {
    const parsed = JSON.parse(serverCheckKey);
    if (!parsed.length) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      previewTeachingConflicts(parsed)
        .then((report) => {
          if (!alive) return;
          setServerConflictState({
            key: serverCheckKey,
            isValid: report?.isValid !== false,
            conflicts: report?.conflicts || [],
            error: '',
          });
        })
        .catch((err) => {
          if (!alive) return;
          setServerConflictState({
            key: serverCheckKey,
            isValid: true,
            conflicts: [],
            error: describeApiError(err).message,
          });
        });
    }, CONFLICT_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [serverCheckKey]);

  const activeServerCheck = proposedIntervalsForServer.length > 0 && serverConflictState?.key === serverCheckKey
    ? serverConflictState
    : null;
  const checkingServer = proposedIntervalsForServer.length > 0 && !activeServerCheck;
  const serverConflicts = activeServerCheck?.conflicts || [];
  const hasServerConflict = serverConflicts.length > 0 || activeServerCheck?.isValid === false;

  // Summary metrics for slot limits in 1-1 / standalone modes
  const maxSlotsPerSubmission = proposalMode
    ? 9999
    : (policy?.maxSlotsPerSubmission || 14);
  const maxPendingSlots = proposalMode ? 0 : (policy?.maxPendingSlots || 24);

  const currentPendingCount = useMemo(
    () => slots.filter((s) => s && !s.isDeleted && !s.isApproved && !s.rejectedAt && (backendUtcDate(s.startTime)?.getTime() || 0) > nowMs).length,
    [slots, nowMs]
  );

  const viewedWeekStats = useMemo(() => {
    const weekMon = mondayOfDateKey(anchorKey);
    const weekEnd = shiftDateKey(weekMon, 7);
    const weekOccupied = occupiedItems.filter((it) => it.dayKey >= weekMon && it.dayKey < weekEnd);
    const weekPending = slots.filter((s) => {
      if (!s || s.isDeleted || s.isApproved || s.rejectedAt) return false;
      const dk = toVnDateKey(s.startTime);
      return dk >= weekMon && dk < weekEnd;
    }).length;
    const weekSelected = selectedSlots.filter((s) => s.dayKey >= weekMon && s.dayKey < weekEnd).length;
    const totalRegistered = weekOccupied.length;
    return {
      totalRegistered,
      weekPending,
      weekSelected,
    };
  }, [anchorKey, occupiedItems, slots, selectedSlots]);

  const isPastSlotOccurrence = useCallback((dayKey, startMin, refNowMs = nowMs) => {
    if (templateMode) return false;
    if (!dayKey) return false;
    const currentTodayKey = toVnDateKey(new Date(refNowMs));
    if (dayKey < currentTodayKey) return true;
    if (dayKey > currentTodayKey) return false;
    const startMs = new Date(`${dayKey}T${clockFromMinutes(startMin)}:00+07:00`).getTime();
    return Number.isFinite(startMs) && startMs <= refNowMs;
  }, [nowMs, templateMode]);

  // Toggle or add a 90-minute slot in multi-select
  const toggleOrSelectSlot = useCallback((dayKey, startMin, replaceKey = null) => {
    if (proposalSelectionBlocked) return false;
    const rawTargetKey = `${dayKey}_${startMin}`;
    const targetWeekday = weekdayOfDateKey(dayKey);
    const targetWeeklyKey = `w${targetWeekday}_${Number(startMin)}`;
    const existingItem = selectedSlots.find((s) => (
      s.key === rawTargetKey
      || (s.dayKey === dayKey && Number(s.startMin) === Number(startMin))
      || (proposalMode && (s.weeklyKey === targetWeeklyKey || (Number(s.weekday) === targetWeekday && Number(s.startMin) === Number(startMin))))
    ));
    const matchKey = existingItem?.key || rawTargetKey;
    const matchWeeklyKey = existingItem?.weeklyKey || (proposalMode ? targetWeeklyKey : null);
    if (existingItem && !replaceKey) {
      setSelectedSlots((cur) => cur.filter((s) => (
        proposalMode && matchWeeklyKey
          ? s.weeklyKey !== matchWeeklyKey && s.key !== matchKey
          : s.key !== matchKey
      )));
      setFeedbackBanner(null);
      return true;
    }

    if (isPastSlotOccurrence(dayKey, startMin, Date.now())) {
      setInvalidFlash({
        dayKey,
        startMin,
        reason: tr('Đã quá thời gian này.'),
        suggestedStartMin: null,
      });
      return false;
    }

    if (customValidateCandidate) {
      const replaceTargetItem = replaceKey
        ? selectedSlots.find((s) => s.key === replaceKey || s.weeklyKey === replaceKey)
        : null;
      const replaceWeeklyKey = replaceTargetItem?.weeklyKey || replaceKey || null;

      const check = customValidateCandidate({
        dayKey,
        startMin,
        replaceKey: replaceWeeklyKey,
      });
      if (!check.valid) {
        setInvalidFlash({
          dayKey,
          startMin,
          reason: check.reason,
          suggestedStartMin: check.suggestedStartMin ?? null,
        });
        setFeedbackBanner({
          tone: 'error',
          text: check.reason,
          suggestion: check.suggestedStartMin != null
            ? { dayKey, startMin: check.suggestedStartMin }
            : null,
        });
        return false;
      }

      const finalKey = check.key || rawTargetKey;
      const finalWeeklyKey = check.slot?.key || finalKey;
      const newItem = {
        key: finalKey,
        weeklyKey: finalWeeklyKey,
        dayKey,
        startMin,
        endMin: check.endMin ?? (startMin + durationMinutes),
        startClock: check.startClock ?? clockFromMinutes(startMin),
        endClock: check.endClock ?? clockFromMinutes(startMin + durationMinutes),
        startUtcIso: check.startUtcIso,
        endUtcIso: check.endUtcIso,
        weekday: check.weekday,
        justAdded: true,
      };
      setSelectedSlots((cur) => {
        const filtered = cur.filter((s) => {
          if (replaceKey && (s.key === replaceKey || (replaceWeeklyKey && s.weeklyKey === replaceWeeklyKey))) {
            return false;
          }
          if (s.key === finalKey || (proposalMode && finalWeeklyKey && s.weeklyKey === finalWeeklyKey)) {
            return false;
          }
          return true;
        });
        return [...filtered, newItem];
      });
      setInvalidFlash(null);
      setFeedbackBanner(null);
      return true;
    }

    const activeCountExcludingTarget = selectedSlots.filter((s) => s.key !== replaceKey && s.key !== matchKey).length;
    if (activeCountExcludingTarget + 1 > maxSlotsPerSubmission) {
      setFeedbackBanner({
        tone: 'error',
        text: trf('Mỗi lần chỉ được chọn tối đa {0} khung giờ để gửi đăng ký. Vui lòng gửi đợt hiện tại trước khi chọn thêm.', {
          0: maxSlotsPerSubmission,
        }),
      });
      return false;
    }

    if (maxPendingSlots > 0 && currentPendingCount + activeCountExcludingTarget + 1 > maxPendingSlots) {
      setFeedbackBanner({
        tone: 'error',
        text: trf('Bạn đã đạt giới hạn {0} khung giờ chờ duyệt cùng lúc (hiện có {1} khung chờ duyệt). Vui lòng chờ quản trị viên duyệt trước khi đăng ký thêm.', {
          0: maxPendingSlots,
          1: currentPendingCount,
        }),
      });
      return false;
    }

    const extraProposed = buildProposedFromSelection(replaceKey || matchKey);
    const check = validateCandidateSlot({
      dayKey,
      startMin,
      policy,
      occupiedItems,
      extraProposedItems: extraProposed,
      nowMs: Date.now(),
      stepMinutes: effectiveStep,
    });

    if (!check.valid) {
      setInvalidFlash({
        dayKey,
        startMin,
        reason: check.reason,
        suggestedStartMin: check.suggestedStartMin ?? null,
      });
      setFeedbackBanner({
        tone: 'error',
        text: check.reason,
        suggestion: check.suggestedStartMin != null
          ? { dayKey, startMin: check.suggestedStartMin }
          : null,
      });
      return false;
    }

    const newItem = {
      key: matchKey,
      dayKey,
      startMin,
      endMin: check.endMin,
      startClock: check.startClock,
      endClock: check.endClock,
      startUtcIso: check.startUtcIso,
      endUtcIso: check.endUtcIso,
    };

    setSelectedSlots((cur) => {
      const filtered = cur.filter((s) => s.key !== replaceKey && s.key !== matchKey);
      return [...filtered, newItem];
    });
    setInvalidFlash(null);
    setFeedbackBanner(null);
    return true;
  }, [buildProposedFromSelection, currentPendingCount, customValidateCandidate, durationMinutes, effectiveStep, isPastSlotOccurrence, maxPendingSlots, maxSlotsPerSubmission, occupiedItems, policy, proposalMode, proposalSelectionBlocked, selectedSlots, setSelectedSlots, tr, trf]);

  const removeSelectedSlotByKey = useCallback((key) => {
    if (proposalMode && proposalSelectionBlocked) return;
    setSelectedSlots((cur) => {
      if (!proposalMode) return cur.filter((s) => s.key !== key);
      const target = cur.find((s) => s.key === key || s.weeklyKey === key);
      const targetWeeklyKey = target?.weeklyKey || key;
      return cur.filter((s) => s.key !== key && s.weeklyKey !== targetWeeklyKey);
    });
    setFeedbackBanner(null);
    setInvalidFlash(null);
  }, [proposalMode, proposalSelectionBlocked, setSelectedSlots]);

  const clearAllSelectedSlots = useCallback(() => {
    setSelectedSlots([]);
    setConfirmModalOpen(false);
    setFeedbackBanner(null);
    setInvalidFlash(null);
  }, [setSelectedSlots]);

  // Build normalized Calendar events
  const calendarEvents = useMemo(() => {
    const events = [];
    const coveredAvailabilityIds = new Set();

    const buildCohortRows = ({ meta, slotObj, mins, statusText }) => {
      const cap = Number(meta?.capacity ?? (slotObj?.isInCohort ? slotObj?.maxLearners : 0) ?? 0);
      const enrolled = Number(meta?.enrolledCount ?? slotObj?.bookedCount ?? 0);
      const sessionNum = meta?.sessionNumber ?? slotObj?.sessionNumber ?? null;
      const totalSess = Number(meta?.totalSessions || 0);
      const sessionLabel = sessionNum
        ? (totalSess > 0
          ? trf('Buổi {0}/{1}', { 0: sessionNum, 1: totalSess })
          : trf('Buổi {0}', { 0: sessionNum }))
        : null;
      const headcountLabel = cap > 0 ? trf('{0}/{1} học viên', { 0: enrolled, 1: cap }) : null;
      const att = meta?.attendanceSummary;
      const attendanceLabel = att && att.confirmedCount > 0
        ? trf('{0}/{1} có mặt', { 0: att.presentCount, 1: att.totalRecords || att.confirmedCount })
        : slotObj?.attendanceConfirmedCount > 0
          ? trf('Đã điểm danh {0} lượt', { 0: slotObj.attendanceConfirmedCount })
          : null;
      const learnerListText = meta?.learnerNames?.length > 0 ? meta.learnerNames.join(', ') : null;
      const cohortDisplayName = meta?.cohortName || slotObj?.cohortName || null;

      return {
        sessionLabel,
        headcountLabel,
        rows: [
          { label: 'Trạng thái', value: tr(statusText) },
          cohortDisplayName && { label: 'Lớp học', value: cohortDisplayName },
          sessionLabel && { label: 'Thứ tự buổi', value: sessionLabel },
          headcountLabel && { label: 'Sĩ số', value: headcountLabel },
          learnerListText && { label: 'Học viên', value: learnerListText },
          attendanceLabel && { label: 'Kết quả điểm danh', value: attendanceLabel },
          { label: 'Thời lượng', value: fmt.duration(mins) },
        ].filter(Boolean),
      };
    };

    const slotProposalMetaById = proposalConfig?.slotProposalMetaById || null;

    for (const s of slots) {
      if (!s) continue;
      if (pendingMove?.slot?.id === s.id) continue;
      if (proposalMode && (s.isDeleted || s.status === 'Cancelled' || s.rejectedAt || s.status === 'Rejected')) continue;
      const startParts = toVnTimeParts(s.startTime);
      const endParts = toVnTimeParts(s.endTime);
      const endDate = backendUtcDate(s.endTime);
      const dk = toVnDateKey(s.startTime);
      const mins = slotDurationMinutes(s.startTime, s.endTime);
      const cohortMeta = cohortByAvailabilityId.get(s.id);
      const st = slotStatusMeta(s, overlapIds, restIds, cohortMeta);
      if (proposalMode && (st.kind === 'cancelled' || st.kind === 'rejected' || st.kind === 'rescheduled')) {
        continue;
      }
      if (proposalMode && st.kind === 'pending' && isPastSlotOccurrence(dk, startParts.hour * 60 + startParts.minute, nowMs)) {
        continue;
      }
      if (s.id) coveredAvailabilityIds.add(s.id);

      const propMeta = slotProposalMetaById?.get(Number(s.id)) || null;
      const resolvedProposalId = s.teachingProposalId ?? propMeta?.proposalId ?? null;
      const resolvedLevelCode = propMeta?.jlptLevelCode || cohortMeta?.level || null;

      const isLegacyLong = mins > durationMinutes;
      const conflictNote = overlapIds.has(s.id)
        ? 'Trùng khung giờ khác — hãy xóa hoặc xin điều chỉnh.'
        : restIds.has(s.id)
          ? `Cách khung lân cận dưới ${restMinutes} phút nghỉ.`
          : '';

      const cohortName = cohortMeta?.cohortName || s.cohortName || null;
      const sessionNum = cohortMeta?.sessionNumber ?? s.sessionNumber ?? propMeta?.sessionNumber ?? null;
      const totalSess = cohortMeta?.totalSessions ?? propMeta?.totalSessions ?? null;
      const cleanCohortTitle = cohortName
        ? formatCleanCohortTitle(cohortName, sessionNum)
        : null;
      const inCohort = Boolean(s.isInCohort || cohortMeta);
      const isOccupiedFuture = Boolean(endDate && endDate.getTime() > nowMs);

      // On the Teaching Registration Calendar (proposalMode), approved slots that progressed
      // into recruiting/upcoming/ongoing/completed classes map cleanly to official 'Đã duyệt' (green).
      const effectiveTone = proposalMode && (st.kind === 'session' || st.kind === 'present' || st.kind === 'approved')
        ? 'approved'
        : st.tone;
      const effectiveStatusLabel = proposalMode && (st.kind === 'session' || st.kind === 'present' || st.kind === 'approved')
        ? 'Đã duyệt'
        : st.label;
      const effectiveLocked = st.kind === 'rejected'
        ? false
        : (proposalMode && st.kind === 'present' ? isOccupiedFuture : st.locked);

      const cohortInfo = inCohort
        ? buildCohortRows({ meta: cohortMeta, slotObj: s, mins, statusText: effectiveStatusLabel })
        : null;
      const registeredAtLabel = s.createdAt
        ? fmt.dateTime(backendUtcDate(s.createdAt))
        : `${formatShortDateVn(dk)} · ${startParts.hhmm}–${endParts.hhmm}`;

      const timeRange = `${startParts.hhmm}–${endParts.hhmm}`;
      const sessionBadge = sessionNum && totalSess
        ? trf('Buổi {0}/{1}', { 0: sessionNum, 1: totalSess })
        : sessionNum
          ? trf('Buổi {0}', { 0: sessionNum })
          : null;

      const detailSummary = conflictNote
        ? tr(conflictNote)
        : proposalMode
          ? [sessionBadge, tr(effectiveStatusLabel)].filter(Boolean).join(' · ')
          : inCohort
            ? [cohortInfo?.sessionLabel, cohortInfo?.headcountLabel].filter(Boolean).join(' · ') || tr(st.label)
            : st.kind === 'approved'
              ? tr('Chưa xếp lớp')
              : tr(st.label);

      events.push({
        id: `av-${s.id}`,
        slotId: s.id,
        availabilityId: s.id,
        proposalId: resolvedProposalId,
        jlptLevelCode: resolvedLevelCode,
        courseTitle: cohortName || propMeta?.courseTitle || null,
        sessionNumber: sessionNum || null,
        totalSessions: totalSess || null,
        slot: s,
        cohortId: cohortMeta?.cohortId ?? s.cohortId ?? null,
        sessionCompleted: st.kind === 'present',
        attendanceStatus: st.kind === 'present' ? 'Present' : undefined,
        sourceKind: proposalMode && effectiveTone === 'approved' ? 'approved' : st.kind,
        draggable: st.draggable,
        locked: effectiveLocked,
        dayKey: dk,
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        timeLabel: timeRange,
        title: proposalMode
          ? timeRange
          : (cleanCohortTitle || (isLegacyLong ? trf('Khung gộp cũ ({0}p)', { 0: mins }) : timeRange)),
        fullTitle: cohortName
          ? `${cohortName}${sessionNum ? ` · Buổi ${sessionNum}` : ''}`
          : propMeta?.courseTitle
            ? `${propMeta.courseTitle} (${timeRange})`
            : timeRange,
        detail: detailSummary,
        statusLabel: effectiveStatusLabel,
        tone: effectiveTone,
        href: inCohort && (cohortMeta?.cohortId ?? s.cohortId) ? `/mentor-study-courses/${cohortMeta?.cohortId ?? s.cohortId}/` : undefined,
        hrefLabel: inCohort ? 'Mở lớp phụ trách' : undefined,
        metaRows: inCohort
          ? [
              ...cohortInfo.rows,
              s.changeResolution && { label: 'Kết quả điều chỉnh', value: s.changeResolution },
              conflictNote && { label: 'Lưu ý', value: tr(conflictNote) },
            ].filter(Boolean)
          : [
              { label: 'Trạng thái', value: st.kind === 'approved' ? tr('Đã duyệt bởi quản trị viên') : tr(effectiveStatusLabel) },
              st.kind === 'approved' && { label: 'Ghi chú', value: tr('Chưa xếp lớp') },
              { label: 'Thời gian đăng ký', value: registeredAtLabel },
              { label: 'Thời lượng', value: fmt.duration(mins) },
              s.rejectionReason && { label: 'Lý do từ chối', value: s.rejectionReason },
              s.cancelRejectedAt && s.cancelRejectionReason && { label: 'Không duyệt hủy', value: s.cancelRejectionReason },
              s.changeResolution && { label: 'Kết quả điều chỉnh', value: s.changeResolution },
              conflictNote && { label: 'Lưu ý', value: tr(conflictNote) },
            ].filter(Boolean),
      });
    }

    for (const cs of cohortSessions) {
      if (!cs || cs.status === 'Cancelled' || cs.status === 'CancelledByMentor' || cs.status === 'CancelledByLearner' || cs.status === 'TransferredOut') continue;
      if (cs.availabilityId && coveredAvailabilityIds.has(cs.availabilityId)) continue;
      const startIso = cs.scheduledAt || cs.startTime;
      const startDate = backendUtcDate(startIso);
      if (!startDate) continue;
      const mins = Number(cs.sessionMinutes) || durationMinutes;
      const endDate = backendUtcDate(cs.endsAt || cs.endTime) || new Date(startDate.getTime() + mins * 60000);
      const startParts = toVnTimeParts(startDate);
      const endParts = toVnTimeParts(endDate);
      const timeRange = `${startParts.hhmm}–${endParts.hhmm}`;
      const cleanTitle = formatCleanCohortTitle(cs.cohortName, cs.sessionNumber);
      const isCompleted = Boolean(cs.sessionCompleted || cs.status === 'Completed');
      const isOccupiedFuture = endDate.getTime() > nowMs;
      const statusText = proposalMode ? 'Đã duyệt' : (isCompleted ? 'Đã hoàn thành' : 'Đã xếp lớp');
      const cohortInfo = buildCohortRows({ meta: cs, slotObj: null, mins, statusText });
      const sessionBadge = cs.sessionNumber && cs.totalSessions
        ? trf('Buổi {0}/{1}', { 0: cs.sessionNumber, 1: cs.totalSessions })
        : cs.sessionNumber
          ? trf('Buổi {0}', { 0: cs.sessionNumber })
          : null;

      events.push({
        id: `cohort-${cs.id || cs.availabilityId || startIso}`,
        availabilityId: cs.availabilityId ?? null,
        cohortId: cs.cohortId ?? null,
        jlptLevelCode: cs.level || null,
        courseTitle: cs.cohortName || cleanTitle,
        sessionNumber: cs.sessionNumber || null,
        totalSessions: cs.totalSessions || null,
        sessionCompleted: isCompleted,
        attendanceStatus: isCompleted ? 'Present' : 'Scheduled',
        sourceKind: proposalMode ? 'approved' : (isCompleted ? 'present' : 'session'),
        draggable: false,
        locked: proposalMode ? isOccupiedFuture : true,
        dayKey: toVnDateKey(startDate),
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        timeLabel: timeRange,
        title: proposalMode ? timeRange : cleanTitle,
        fullTitle: cs.cohortName ? `${cs.cohortName}${cs.sessionNumber ? ` · Buổi ${cs.sessionNumber}` : ''}` : cleanTitle,
        detail: proposalMode
          ? [sessionBadge, tr('Đã duyệt')].filter(Boolean).join(' · ')
          : [cohortInfo.sessionLabel, cohortInfo.headcountLabel].filter(Boolean).join(' · ') || tr(statusText),
        statusLabel: statusText,
        tone: proposalMode ? 'approved' : (isCompleted ? 'present' : 'session'),
        href: cs.cohortId ? `/mentor-study-courses/${cs.cohortId}/` : '/mentor-study-courses/',
        hrefLabel: 'Mở lớp phụ trách',
        metaRows: cohortInfo.rows,
      });
    }

    for (const ext of externalBusyEvents) {
      const sDate = backendUtcDate(ext?.startTime || ext?.startUtc);
      const eDate = backendUtcDate(ext?.endTime || ext?.endUtc);
      if (!sDate || !eDate || eDate <= sDate) continue;
      const sp = toVnTimeParts(sDate);
      const ep = toVnTimeParts(eDate);
      events.push({
        id: `gcal-${ext.id || sDate.toISOString()}`,
        sourceKind: 'externalBusy',
        draggable: false,
        locked: true,
        dayKey: toVnDateKey(sDate),
        startHour: sp.hour,
        startMinute: sp.minute,
        endHour: ep.hour,
        endMinute: ep.minute,
        timeLabel: `${sp.hhmm}–${ep.hhmm}`,
        title: ext.title || 'Google Calendar bận',
        fullTitle: ext.title || 'Google Calendar bận',
        detail: 'Sự kiện đồng bộ từ Google Calendar',
        statusLabel: 'Lịch bận ngoài',
        tone: 'cancelled',
      });
    }

    if (Array.isArray(proposalConfig?.pendingProposalEvents)) {
      for (const pev of proposalConfig.pendingProposalEvents) {
        if (!pev) continue;
        const pevStartMin = Number.isFinite(Number(pev.startMin))
          ? Number(pev.startMin)
          : (Number(pev.startHour || 0) * 60 + Number(pev.startMinute || 0));
        if (isPastSlotOccurrence(pev.dayKey, pevStartMin, nowMs)) continue;
        events.push(pev);
      }
    }

    for (const pv of previewGeneratedSlots) {
      if (!pv || pv.isExisting) continue;
      const sp = { hour: Number(String(pv.localStart).slice(0, 2)), minute: Number(String(pv.localStart).slice(3, 5)) };
      const ep = { hour: Number(String(pv.localEnd).slice(0, 2)), minute: Number(String(pv.localEnd).slice(3, 5)) };
      const timeRange = `${String(pv.localStart).slice(0, 5)}–${String(pv.localEnd).slice(0, 5)}`;
      events.push({
        id: `pv-${pv.generationKey || `${pv.localDate}-${pv.localStart}`}`,
        sourceKind: pv.hasConflict ? 'conflict' : 'draftGhost',
        draggable: false,
        locked: false,
        dayKey: pv.localDate,
        startHour: sp.hour,
        startMinute: sp.minute,
        endHour: ep.hour,
        endMinute: ep.minute,
        timeLabel: timeRange,
        title: timeRange,
        fullTitle: timeRange,
        detail: pv.hasConflict ? (pv.conflictReason || tr('Trùng lịch')) : trf('Gợi ý {0} phút theo ca mẫu', { 0: durationMinutes }),
        statusLabel: pv.hasConflict ? 'Trùng lịch' : 'Dự kiến từ ca mẫu',
        tone: pv.hasConflict ? 'conflict' : 'ghost',
      });
    }

    if (pendingMove) {
      const startParts = { hour: Math.floor(pendingMove.targetStartMin / 60), minute: pendingMove.targetStartMin % 60 };
      const endMin = pendingMove.targetStartMin + durationMinutes;
      const endParts = { hour: Math.floor(endMin / 60), minute: endMin % 60 };
      const timeRange = `${clockFromMinutes(pendingMove.targetStartMin)}–${clockFromMinutes(endMin)}`;
      events.push({
        id: `pending-move-${pendingMove.slot.id}`,
        slotId: pendingMove.slot.id,
        slot: pendingMove.slot,
        sourceKind: 'pendingMove',
        draggable: true,
        locked: false,
        dayKey: pendingMove.targetDayKey,
        startHour: startParts.hour,
        startMinute: startParts.minute,
        endHour: endParts.hour,
        endMinute: endParts.minute,
        timeLabel: timeRange,
        title: timeRange,
        fullTitle: timeRange,
        detail: `Dời từ ${pendingMove.fromLabel} (chưa lưu)`,
        statusLabel: 'Đang dời lịch',
        tone: 'selected',
      });
    }

    // Multi-selected unsent 90-minute slots (Green valid cards / Red conflict cards)
    for (const sel of validatedSelections) {
      if (isPastSlotOccurrence(sel.dayKey, sel.startMin, nowMs)) continue;
      const startH = Math.floor(sel.startMin / 60);
      const startM = sel.startMin % 60;
      const endH = Math.floor(sel.endMin / 60);
      const endM = sel.endMin % 60;
      const timeRange = `${sel.startClock}–${sel.endClock}`;
      const finiteSessionText = sel.sessionNumber && sel.totalSessions
        ? trf('Buổi {0}/{1}', { 0: sel.sessionNumber, 1: sel.totalSessions })
        : null;
      const isRep = Boolean(sel.isRepresentativeProjection || (!sel.isFiniteOccurrence && proposalMode));
      const validDetail = proposalMode
        ? (finiteSessionText
          ? `${finiteSessionText} · ${tr('Nhấn để bỏ chọn')}`
          : tr('Khung giờ đang chọn'))
        : tr('Đã chọn · Nhấn để bỏ chọn');
      const validStatusLabel = tr('Đã chọn');
      events.push({
        id: `selected-${sel.key}`,
        selectedKey: sel.key,
        weeklyKey: sel.weeklyKey || sel.key,
        weekday: sel.weekday ?? weekdayOfDateKey(sel.dayKey),
        jlptLevelCode: proposalConfig?.jlptLevelCode || null,
        courseTitle: proposalConfig?.courseTitle || null,
        sessionNumber: isRep ? null : (sel.sessionNumber || null),
        totalSessions: isRep ? null : (sel.totalSessions || null),
        isFiniteOccurrence: Boolean(sel.isFiniteOccurrence),
        isRepresentativeProjection: isRep,
        isWeeklyPattern: isRep,
        hasVisibleDateConflict: Boolean(sel.hasVisibleDateConflict),
        visibleConflictTooltip: sel.visibleConflictTooltip || null,
        selectedItem: sel,
        sourceKind: 'selected',
        isSelectedDraft: true,
        draggable: !proposalSelectionBlocked,
        locked: proposalSelectionBlocked,
        dayKey: sel.dayKey,
        startHour: startH,
        startMinute: startM,
        endHour: endH,
        endMinute: endM,
        timeLabel: timeRange,
        title: timeRange,
        fullTitle: finiteSessionText
          ? `${finiteSessionText} · ${timeRange} (${durationMinutes} phút)`
          : `${timeRange} (${durationMinutes} phút)`,
        detail: sel.valid ? validDetail : sel.reason,
        statusLabel: sel.valid ? validStatusLabel : 'Cần điều chỉnh',
        tone: sel.valid ? 'selected' : 'conflict',
        metaRows: [
          { label: 'Trạng thái', value: sel.valid ? tr('Đang chọn (chưa gửi)') : tr('Cần điều chỉnh') },
          finiteSessionText && { label: 'Buổi học', value: finiteSessionText },
          { label: 'Thời lượng', value: fmt.duration(durationMinutes) },
          !sel.valid && sel.reason && { label: 'Lý do', value: sel.reason },
        ].filter(Boolean),
      });
    }

    return events;
  }, [slots, pendingMove, overlapIds, restIds, cohortByAvailabilityId, durationMinutes, restMinutes, tr, trf, fmt, cohortSessions, externalBusyEvents, previewGeneratedSlots, validatedSelections, proposalConfig, proposalMode, proposalSelectionBlocked, nowMs, isPastSlotOccurrence]);

  const rawRegistrationRows = proposalConfig?.registrationRows;
  const registrationRows = useMemo(
    () => (Array.isArray(rawRegistrationRows) ? rawRegistrationRows : []),
    [rawRegistrationRows]
  );

  // Independent View Scope:
  // - List View defaults to ALL TIME (`null`) so it never inherits Calendar's visible week/month!
  // - Calendar View follows Calendar's visible date range unless an explicit date filter is active.
  const effectiveDateRange = useMemo(() => {
    if (dateFilterMode === 'upcoming') {
      return { startKey: todayKey, endKey: '' };
    }
    if (dateFilterMode === 'past') {
      return { startKey: '', endKey: shiftDateKey(todayKey, -1) };
    }
    if (dateFilterMode === 'today') {
      return { startKey: todayKey, endKey: todayKey };
    }
    if (dateFilterMode === 'week') {
      const refKey = displayMode === 'list' ? todayKey : anchorKey;
      const r = getViewDateRange(refKey, 'week');
      return { startKey: r.startKey, endKey: r.endKey };
    }
    if (dateFilterMode === 'month') {
      const refKey = displayMode === 'list' ? todayKey : anchorKey;
      const r = getViewDateRange(refKey, 'month');
      return { startKey: r.startKey, endKey: r.endKey };
    }
    if (dateFilterMode === 'custom') {
      return {
        startKey: customFromDate || '',
        endKey: customToDate || '',
      };
    }
    // Default 'view' mode: ALL TIME (`null`) in List View; visible calendar range in Calendar View
    if (displayMode === 'list') return null;
    return { startKey: range.startKey, endKey: range.endKey };
  }, [dateFilterMode, displayMode, todayKey, anchorKey, customFromDate, customToDate, range.startKey, range.endKey]);

  // Effective time-of-day range in GMT+7 minutes
  const effectiveTimeRange = useMemo(() => {
    if (!timeFilterCode || timeFilterCode === 'ALL') return null;
    if (timeFilterCode === 'CUSTOM') {
      const s = minutesFromClock(customStartTime);
      const e = minutesFromClock(customEndTime);
      if (e <= s) return null;
      return { startMin: s, endMin: e, label: `${customStartTime}–${customEndTime}` };
    }
    const dp = (policy?.dayparts || []).find((d) => d.code === timeFilterCode);
    if (!dp) return null;
    const sClock = dp.localStart || clockFromMinutes(dp.startMin);
    const eClock = dp.localEnd || clockFromMinutes(dp.endMin);
    return {
      startMin: dp.startMin ?? minutesFromClock(sClock),
      endMin: dp.endMin ?? minutesFromClock(eClock),
      label: `${tr(dp.label)} (${sClock}–${eClock})`,
    };
  }, [timeFilterCode, customStartTime, customEndTime, policy?.dayparts, tr]);

  const countsByStatus = useMemo(() => {
    const scopeDateRange = dateFilterMode !== 'view' ? effectiveDateRange : null;
    if (proposalMode) {
      // Count unique official proposals (excluding Draft/Withdrawn) consistently across Calendar & List Views
      // so status filter numbers never inflate by occurrence count or shift during navigation.
      const sourceRows = displayMode === 'list'
        ? registrationRows
        : registrationRows.filter((r) => !r.isSelectedDraft);
      return computeRegistrationRowCounts(sourceRows, {
        jlptLevelFilter,
        dateFilterMode: displayMode === 'list' ? dateFilterMode : 'view',
        customFromDate,
        customToDate,
        searchQuery,
        todayKey,
        nowMs,
      });
    }
    const counts = { ALL: 0 };
    SCHEDULE_STATUS_OPTIONS.forEach((o) => { if (o.id !== 'ALL') counts[o.id] = 0; });
    const baseFiltered = filterScheduleEvents(calendarEvents, {
      statusFilter: 'ALL',
      eventTypeFilter,
      dateRange: scopeDateRange,
      timeRange: effectiveTimeRange,
      searchQuery,
      nowMs,
    }).filter((ev) => !(ev.isSelectedDraft || ev.sourceKind === 'selected'));
    counts.ALL = baseFiltered.length;
    for (const ev of baseFiltered) {
      const { statusKey } = classifyScheduleEvent(ev, nowMs);
      counts[statusKey] = (counts[statusKey] || 0) + 1;
    }
    return counts;
  }, [proposalMode, displayMode, registrationRows, calendarEvents, eventTypeFilter, jlptLevelFilter, dateFilterMode, customFromDate, customToDate, effectiveDateRange, effectiveTimeRange, searchQuery, todayKey, nowMs]);

  const filteredRegistrationRows = useMemo(() => {
    if (!proposalMode) return [];
    const filtered = filterRegistrationRows(registrationRows, {
      statusFilter,
      jlptLevelFilter,
      dateFilterMode,
      customFromDate,
      customToDate,
      searchQuery,
      todayKey,
      nowMs,
    });
    return sortRegistrationRows(filtered, {
      sortBy: regSortBy,
      sortDirection: regSortDirection,
    });
  }, [proposalMode, registrationRows, statusFilter, jlptLevelFilter, dateFilterMode, customFromDate, customToDate, searchQuery, todayKey, nowMs, regSortBy, regSortDirection]);

  const filteredEvents = useMemo(
    () => (proposalMode
      ? filterRegistrationEvents(calendarEvents, {
        statusFilter: statusFilter === 'selected' ? 'ALL' : statusFilter,
        eventTypeFilter,
        jlptLevelFilter,
        dateRange: dateFilterMode !== 'view' ? effectiveDateRange : null,
        timeRange: effectiveTimeRange,
        searchQuery,
        nowMs,
        keepSelectedVisible: false,
      })
      : filterScheduleEvents(calendarEvents, {
        statusFilter,
        eventTypeFilter,
        dateRange: dateFilterMode !== 'view' ? effectiveDateRange : null,
        timeRange: effectiveTimeRange,
        searchQuery,
        nowMs,
      })),
    [proposalMode, calendarEvents, statusFilter, eventTypeFilter, jlptLevelFilter, dateFilterMode, effectiveDateRange, effectiveTimeRange, searchQuery, nowMs]
  );

  const activeExtraFilterCount = useMemo(() => {
    let c = 0;
    if (!proposalMode && eventTypeFilter !== 'ALL') c += 1;
    if (proposalMode && jlptLevelFilter !== 'ALL') c += 1;
    if (String(searchQuery || '').trim()) c += 1;
    if (dateFilterMode !== 'view') c += 1;
    if ((!proposalMode || displayMode === 'calendar') && timeFilterCode !== 'ALL') c += 1;
    return c;
  }, [eventTypeFilter, proposalMode, displayMode, jlptLevelFilter, searchQuery, dateFilterMode, timeFilterCode]);

  const resetAllFilters = useCallback(() => {
    setStatusFilter('ALL');
    setEventTypeFilter('ALL');
    setJlptLevelFilter('ALL');
    setSearchQuery('');
    setDateFilterMode('view');
    setCustomFromDate('');
    setCustomToDate('');
    setTimeFilterCode('ALL');
    setSortBy('smart');
    setSortDirection('asc');
    setRegSortBy('default');
    setRegSortDirection('asc');
    setTablePage(1);
  }, []);

  const jumpToCalendarTarget = useCallback(({
    dayKey,
    startMin = 8 * 60,
    highlightKeys = [],
    statusGroup = null,
    jlptCode = null,
  }) => {
    if (!dayKey) return;
    setDisplayModeState('calendar');
    if (calendarSubView === 'month') {
      setCalendarSubView(typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week');
    }
    if (statusFilter === 'selected') {
      setStatusFilter('ALL');
    } else if (statusFilter !== 'ALL' && statusGroup && statusGroup !== 'selected' && statusGroup !== statusFilter) {
      setStatusFilter('ALL');
    }
    if (eventTypeFilter !== 'ALL') {
      setEventTypeFilter('ALL');
    }
    if (jlptLevelFilter !== 'ALL' && jlptCode && String(jlptCode).toUpperCase() !== jlptLevelFilter) {
      setJlptLevelFilter('ALL');
    }
    if (String(searchQuery || '').trim()) {
      setSearchQuery('');
    }
    if (dateFilterMode !== 'view') {
      setDateFilterMode('view');
    }
    if (timeFilterCode !== 'ALL') {
      setTimeFilterCode('ALL');
    }
    setAnchor(dayKey);
    setLocalFocusRequest({
      id: Date.now(),
      targetDayKey: dayKey,
      targetStartMin: startMin,
      highlightKeys: highlightKeys.filter(Boolean),
      preserveSubView: true,
    });
  }, [calendarSubView, dateFilterMode, eventTypeFilter, jlptLevelFilter, searchQuery, setAnchor, setDisplayModeState, statusFilter, timeFilterCode]);

  const handleViewOnCalendar = useCallback((ev) => {
    if (!ev || !ev.dayKey) return;
    const startMin = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
    const statusGroup = ev.isSelectedDraft ? 'selected' : classifyRegistrationEvent(ev);
    jumpToCalendarTarget({
      dayKey: ev.dayKey,
      startMin,
      highlightKeys: [ev.id, ev.selectedKey, ev.weeklyKey],
      statusGroup,
      jlptCode: ev.jlptLevelCode,
    });
  }, [jumpToCalendarTarget]);

  // Unsent working selections (isSelectedDraft / pendingMove / draftGhost) stay visible on the
  // Interactive Calendar grid regardless of saved statusFilter unless EventType or JLPT filter excludes them.
  const calendarDisplayEvents = useMemo(() => {
    const allowDraftsOnGrid = eventTypeFilter === 'ALL' || eventTypeFilter === 'Draft';
    if (!allowDraftsOnGrid) return filteredEvents;
    const seen = new Set(filteredEvents.map((e) => e.id));
    const activeWorkItems = calendarEvents.filter((ev) => {
      if (seen.has(ev.id)) return false;
      if (!(ev.isSelectedDraft || ev.sourceKind === 'pendingMove' || ev.sourceKind === 'draftGhost')) {
        return false;
      }
      if (proposalMode && jlptLevelFilter !== 'ALL') {
        const code = String(ev.jlptLevelCode || '').trim().toUpperCase();
        if (code !== String(jlptLevelFilter).trim().toUpperCase()) return false;
      }
      if (dateFilterMode !== 'view') {
        if (effectiveDateRange?.startKey && ev.dayKey < effectiveDateRange.startKey) return false;
        if (effectiveDateRange?.endKey && ev.dayKey > effectiveDateRange.endKey) return false;
      }
      if (effectiveTimeRange && (effectiveTimeRange.startMin != null || effectiveTimeRange.endMin != null)) {
        const fStart = effectiveTimeRange.startMin ?? 0;
        const fEnd = effectiveTimeRange.endMin ?? 24 * 60;
        const evStart = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
        let evEnd = (ev.endHour || 0) * 60 + (ev.endMinute || 0);
        if (evEnd <= evStart) evEnd = Math.min(24 * 60, evStart + 90);
        if (!(evStart < fEnd && evEnd > fStart)) return false;
      }
      return true;
    });
    return activeWorkItems.length > 0 ? [...filteredEvents, ...activeWorkItems] : filteredEvents;
  }, [filteredEvents, calendarEvents, eventTypeFilter, proposalMode, jlptLevelFilter, dateFilterMode, effectiveDateRange, effectiveTimeRange]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of calendarDisplayEvents) {
      if (!ev.dayKey) continue;
      if (!map.has(ev.dayKey)) map.set(ev.dayKey, []);
      map.get(ev.dayKey).push(ev);
    }
    return map;
  }, [calendarDisplayEvents]);

  const packedByDay = useMemo(() => {
    const out = new Map();
    for (const day of weekDays) {
      const raw = eventsByDay.get(day.key) || [];
      // If a newly selected draft card overlaps a non-blocking historical rejected card on the same time slot,
      // prioritize the selected card so historical cards never obstruct active selection.
      const selectedIntervals = proposalMode
        ? raw.filter((e) => e.isSelectedDraft).map((e) => minutesOfEvent(e))
        : [];
      const prioritized = (selectedIntervals.length > 0
        ? raw.filter((e) => {
          if (e.tone !== 'rejected') return true;
          const m = minutesOfEvent(e);
          return !selectedIntervals.some((s) => s.start < m.end && m.start < s.end);
        })
        : raw)
        .slice()
        .sort((a, b) => (a.isRepresentativeProjection ? 1 : 0) - (b.isRepresentativeProjection ? 1 : 0));
      out.set(day.key, packDayEvents(prioritized));
    }
    return out;
  }, [weekDays, eventsByDay, proposalMode]);

  const visibleColKeys = useMemo(() => new Set(weekDays.map((d) => d.key)), [weekDays]);
  const { firstHour, hours, gridHeight } = useMemo(() => {
    let minH = policy?.gridStartHour ?? 7;
    let maxH = policy?.gridEndHour ?? 22;
    for (const ev of calendarDisplayEvents) {
      if (!visibleColKeys.has(ev.dayKey)) continue;
      const { start, end } = minutesOfEvent(ev);
      minH = Math.min(minH, Math.floor(start / 60));
      maxH = Math.max(maxH, Math.ceil(end / 60));
    }
    const clampedFirst = Math.max(0, Math.min(minH, 23));
    const clampedLast = Math.max(clampedFirst + 1, Math.min(maxH, 24));
    const arr = Array.from({ length: clampedLast - clampedFirst }, (_, idx) => clampedFirst + idx);
    return { firstHour: clampedFirst, hours: arr, gridHeight: arr.length * HOUR_HEIGHT };
  }, [calendarDisplayEvents, visibleColKeys, policy?.gridStartHour, policy?.gridEndHour]);

  const handledFocusScrollIdRef = useRef(null);
  useEffect(() => {
    if (!effectiveFocusRequest?.id || handledFocusScrollIdRef.current === effectiveFocusRequest.id) return undefined;
    handledFocusScrollIdRef.current = effectiveFocusRequest.id;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (effectiveFocusRequest.targetDayKey && !onAnchorChange) {
          setUncontrolledAnchor(effectiveFocusRequest.targetDayKey);
        }
        const scrollEl = gridScrollRef.current;
        if (scrollEl && Number.isFinite(Number(effectiveFocusRequest.targetStartMin))) {
          const targetTop = Math.max(
            0,
            ((Number(effectiveFocusRequest.targetStartMin) - firstHour * 60) / 60) * HOUR_HEIGHT - 56
          );
          const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
          scrollEl.scrollTo({ top: targetTop, behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      });
    });
    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [firstHour, effectiveFocusRequest, onAnchorChange]);

  // Cached column layout geometry during an active drag session (zero getBoundingClientRect thrashing per frame)
  const dragMetricsCacheRef = useRef(null);
  const rafIdRef = useRef(0);

  const measureColumnsSnapshot = useCallback(() => {
    const scrollEl = gridScrollRef.current;
    const cols = [];
    for (const [dk, el] of Object.entries(dayColsRef.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      cols.push({ dayKey: dk, left: r.left, right: r.right, top: r.top, width: r.width, height: r.height });
    }
    dragMetricsCacheRef.current = {
      cols,
      scrollTop: scrollEl ? scrollEl.scrollTop : 0,
      scrollLeft: scrollEl ? scrollEl.scrollLeft : 0,
      scrollRect: scrollEl ? scrollEl.getBoundingClientRect() : null,
    };
    return dragMetricsCacheRef.current;
  }, []);

  const findHoveredDayAndStartMin = useCallback((clientX, clientY, offsetMinutes = 0, snapMode = 'round') => {
    const scrollEl = gridScrollRef.current;
    let cache = dragMetricsCacheRef.current;
    const curScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const curScrollLeft = scrollEl ? scrollEl.scrollLeft : 0;
    if (!cache || cache.scrollTop !== curScrollTop || cache.scrollLeft !== curScrollLeft) {
      cache = measureColumnsSnapshot();
    }
    let hitCol = null;
    for (let i = 0; i < cache.cols.length; i += 1) {
      const c = cache.cols[i];
      if (clientX >= c.left && clientX <= c.right) {
        hitCol = c;
        break;
      }
    }
    if (!hitCol) return null;
    const relY = Math.max(0, clientY - hitCol.top);
    const rawMin = firstHour * 60 + (relY / HOUR_HEIGHT) * 60 - offsetMinutes;
    const snapped = snapMinutesToGrid({
      rawMinutes: rawMin,
      stepMinutes: effectiveStep,
      mode: snapMode,
      minMinutes: firstHour * 60,
      maxEndMinutes: (firstHour + hours.length) * 60,
      durationMinutes,
    });
    return { dayKey: hitCol.dayKey, startMin: snapped, rawMin };
  }, [firstHour, hours.length, effectiveStep, durationMinutes, measureColumnsSnapshot]);

  // Global window pointer tracking with requestAnimationFrame throttling & snap-delta memoization (~60 FPS)
  useEffect(() => {
    const processDragFrame = () => {
      rafIdRef.current = 0;
      const ds = dragSessionRef.current;
      if (!ds) return;
      const { latestX, latestY } = ds;
      const dist = Math.hypot(latestX - ds.startX, latestY - ds.startY);
      if (!ds.active && dist < 6) return;

      if (!ds.active) {
        ds.active = true;
        measureColumnsSnapshot();
      }

      // Edge auto-scroll when dragging near top/bottom of scroll container
      const scrollEl = gridScrollRef.current;
      const scrollRect = dragMetricsCacheRef.current?.scrollRect;
      if (scrollEl && scrollRect) {
        const edgeBand = 38;
        if (latestY < scrollRect.top + edgeBand && scrollEl.scrollTop > 0) {
          scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop - 14);
        } else if (latestY > scrollRect.bottom - edgeBand) {
          scrollEl.scrollTop += 14;
        }
      }

      const hit = findHoveredDayAndStartMin(latestX, latestY, ds.offsetMinutes, 'round');
      const targetDayKey = hit?.dayKey || ds.currentDayKey || ds.originDayKey;
      const targetStartMin = hit?.startMin ?? ds.currentStartMin ?? ds.originStartMin;

      // Skip React state update & conflict validation when the snapped 15m slot has NOT changed!
      if (ds.lastRenderedDayKey === targetDayKey && ds.lastRenderedStartMin === targetStartMin) {
        return;
      }

      ds.currentDayKey = targetDayKey;
      ds.currentStartMin = targetStartMin;
      ds.lastRenderedDayKey = targetDayKey;
      ds.lastRenderedStartMin = targetStartMin;

      const isPastDragTarget = isPastSlotOccurrence(targetDayKey, targetStartMin, Date.now());
      const check = isPastDragTarget
        ? { valid: false, code: 'PAST_SCHEDULE_SLOT', reason: tr('Đã quá thời gian này.') }
        : customValidateCandidate
          ? customValidateCandidate({
            dayKey: targetDayKey,
            startMin: targetStartMin,
            replaceKey: proposalMode ? (ds.weeklyKey ?? ds.selectedKey ?? null) : (ds.selectedKey ?? null),
          })
          : validateCandidateSlot({
            dayKey: targetDayKey,
            startMin: targetStartMin,
            policy,
            occupiedItems: ds.cachedOccupied || occupiedItems,
            extraProposedItems: ds.cachedExtraProposed || [],
            nowMs: Date.now(),
            stepMinutes: effectiveStep,
          });

      setDragVisual({
        mode: ds.mode,
        selectedKey: ds.selectedKey ?? null,
        originDayKey: ds.originDayKey,
        originStartMin: ds.originStartMin,
        dayKey: targetDayKey,
        startMin: targetStartMin,
        valid: check.valid,
        reason: check.reason,
        suggestedStartMin: check.suggestedStartMin ?? null,
      });
    };

    const handlePointerMove = (e) => {
      const ds = dragSessionRef.current;
      if (!ds) return;
      ds.latestX = e.clientX;
      ds.latestY = e.clientY;
      if (!rafIdRef.current) {
        rafIdRef.current = window.requestAnimationFrame(processDragFrame);
      }
    };

    const handlePointerUp = (e) => {
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      const ds = dragSessionRef.current;
      if (!ds) return;
      dragSessionRef.current = null;
      dragMetricsCacheRef.current = null;
      setDragVisual(null);

      // Click without dragging
      if (!ds.active) {
        if (ds.mode === 'create') {
          if (ds.pointerType === 'touch') {
            setTouchPickerDay({ dayKey: ds.originDayKey, rawStartMin: ds.originStartMin });
            return;
          }
          toggleOrSelectSlot(ds.originDayKey, ds.originStartMin);
          return;
        }
        // Clicked an already selected green Draft card -> deselect it immediately!
        if (ds.mode === 'move-selected' && ds.selectedKey) {
          removeSelectedSlotByKey(ds.selectedKey);
        }
        return;
      }

      // Drag finished
      const finalHit = findHoveredDayAndStartMin(e.clientX, e.clientY, ds.offsetMinutes, 'round');
      const targetDayKey = finalHit?.dayKey || ds.currentDayKey || ds.originDayKey;
      const targetStartMin = finalHit?.startMin ?? ds.currentStartMin ?? ds.originStartMin;

      if (targetDayKey === ds.originDayKey && targetStartMin === ds.originStartMin && ds.mode !== 'create') {
        return;
      }

      if (ds.mode === 'create') {
        toggleOrSelectSlot(targetDayKey, targetStartMin);
        return;
      }

      if (ds.mode === 'move-selected' && ds.selectedKey) {
        toggleOrSelectSlot(targetDayKey, targetStartMin, ds.selectedKey);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      if (rafIdRef.current) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    effectiveStep,
    customValidateCandidate,
    findHoveredDayAndStartMin,
    isPastSlotOccurrence,
    measureColumnsSnapshot,
    occupiedItems,
    policy,
    proposalMode,
    removeSelectedSlotByKey,
    toggleOrSelectSlot,
    tr,
  ]);

  // Escape key cancels active drag / modal / pendingMove
  useEffect(() => {
    const cancelActiveDrag = () => {
      if (dragSessionRef.current) {
        if (rafIdRef.current) {
          window.cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = 0;
        }
        dragSessionRef.current = null;
        dragMetricsCacheRef.current = null;
        setDragVisual(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (dragSessionRef.current) {
        cancelActiveDrag();
      } else if (pendingMove) {
        setPendingMove(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', cancelActiveDrag);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', cancelActiveDrag);
    };
  }, [pendingMove]);

  const [hoveredSlotState, setHoveredSlotState] = useState(null);

  const handleEmptyColumnPointerMove = useCallback((dayKey, e) => {
    if (dragSessionRef.current || busy || submittingBatch || proposalSelectionBlocked) {
      if (hoveredSlotState) setHoveredSlotState(null);
      return;
    }
    if (e.target?.closest?.('[data-slot-tone], [data-past-time-overlay], [data-capacity-locked-overlay]')) {
      if (hoveredSlotState) setHoveredSlotState(null);
      return;
    }
    const colEl = dayColsRef.current[dayKey];
    if (!colEl) return;
    const rect = colEl.getBoundingClientRect();
    const relY = Math.max(0, e.clientY - rect.top);
    const rawMin = firstHour * 60 + (relY / HOUR_HEIGHT) * 60;
    const snappedFloor = snapMinutesToGrid({
      rawMinutes: rawMin,
      stepMinutes: effectiveStep,
      mode: 'floor',
      minMinutes: firstHour * 60,
      maxEndMinutes: (firstHour + hours.length) * 60,
      durationMinutes,
    });
    if (hoveredSlotState && hoveredSlotState.dayKey === dayKey && hoveredSlotState.startMin === snappedFloor) {
      return;
    }
    const now = Math.max(nowMs, Date.now());
    if (isPastSlotOccurrence(dayKey, snappedFloor, now)) {
      setHoveredSlotState({ dayKey, startMin: snappedFloor, valid: false, reason: tr('Đã quá thời gian này.') });
      return;
    }
    const check = customValidateCandidate
      ? customValidateCandidate({ dayKey, startMin: snappedFloor })
      : validateCandidateSlot({
        dayKey,
        startMin: snappedFloor,
        policy,
        occupiedItems,
        extraProposedItems: buildProposedFromSelection(null),
        nowMs: now,
        stepMinutes: effectiveStep,
      });
    setHoveredSlotState({
      dayKey,
      startMin: snappedFloor,
      valid: Boolean(check?.valid),
      reason: check?.valid ? '' : (check?.reason || ''),
    });
  }, [
    buildProposedFromSelection,
    busy,
    customValidateCandidate,
    durationMinutes,
    effectiveStep,
    firstHour,
    hours.length,
    hoveredSlotState,
    isPastSlotOccurrence,
    nowMs,
    occupiedItems,
    policy,
    proposalSelectionBlocked,
    submittingBatch,
    tr,
  ]);

  const startEmptyColumnPointerDown = (dayKey, e) => {
    if (e.button !== 0 || busy || submittingBatch || proposalSelectionBlocked) return;
    const colEl = dayColsRef.current[dayKey];
    if (!colEl) return;
    measureColumnsSnapshot();
    const rect = colEl.getBoundingClientRect();
    const relY = Math.max(0, e.clientY - rect.top);
    const rawMin = firstHour * 60 + (relY / HOUR_HEIGHT) * 60;
    const snappedFloor = snapMinutesToGrid({
      rawMinutes: rawMin,
      stepMinutes: effectiveStep,
      mode: 'floor',
      minMinutes: firstHour * 60,
      maxEndMinutes: (firstHour + hours.length) * 60,
      durationMinutes,
    });
    // Chặn tuyệt đối click/drag tại ngày quá khứ hoặc khung giờ đã bắt đầu / đã trôi qua
    if (isPastSlotOccurrence(dayKey, snappedFloor, Math.max(nowMs, Date.now()))) {
      return;
    }
    setInvalidFlash(null);
    dragSessionRef.current = {
      mode: 'create',
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      latestX: e.clientX,
      latestY: e.clientY,
      offsetMinutes: 0,
      originDayKey: dayKey,
      originStartMin: snappedFloor,
      lastRenderedDayKey: null,
      lastRenderedStartMin: null,
      cachedOccupied: occupiedItems,
      cachedExtraProposed: buildProposedFromSelection(null),
      active: false,
    };
  };

  // Status-based interaction lock: ONLY unsent Draft cards (ev.isSelectedDraft) can be dragged on the Calendar grid!
  const startCardPointerDown = (ev, e) => {
    if (e.button !== 0 || busy || submittingBatch) return;
    if (!ev.isSelectedDraft || !ev.draggable || ev.locked) return;
    e.stopPropagation();
    measureColumnsSnapshot();
    const startMin = ev.startHour * 60 + ev.startMinute;
    const colEl = dayColsRef.current[ev.dayKey];
    let offsetMinutes = 0;
    if (colEl) {
      const rect = colEl.getBoundingClientRect();
      const pointerMin = firstHour * 60 + ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
      offsetMinutes = Math.max(0, Math.min(durationMinutes, pointerMin - startMin));
    }
    dragSessionRef.current = {
      mode: 'move-selected',
      selectedKey: ev.selectedKey ?? null,
      weeklyKey: ev.weeklyKey ?? ev.selectedKey ?? null,
      eventObj: ev,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      latestX: e.clientX,
      latestY: e.clientY,
      offsetMinutes,
      originDayKey: ev.dayKey,
      originStartMin: startMin,
      lastRenderedDayKey: null,
      lastRenderedStartMin: null,
      cachedOccupied: occupiedItems,
      cachedExtraProposed: buildProposedFromSelection(ev.selectedKey ?? null),
      active: false,
    };
  };

  // Batch submit all valid selected slots atomically (or sequentially as fallback) with idempotency key protection
  const submitAllSelectedSlots = async () => {
    if (
      validSelectedSlots.length === 0 ||
      hasServerConflict ||
      checkingServer ||
      busy ||
      submittingBatch ||
      (!onCreateAvailabilityBatch && !onCreateAvailability)
    ) {
      return;
    }
    setSubmittingBatch(true);
    setFeedbackBanner(null);

    const toSubmit = [...validSelectedSlots].sort((a, b) => (
      a.dayKey === b.dayKey ? a.startMin - b.startMin : a.dayKey.localeCompare(b.dayKey)
    ));
    const attemptNonce = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const idempotencyKey = `batch-${attemptNonce}`;

    if (onCreateAvailabilityBatch) {
      try {
        await onCreateAvailabilityBatch({
          slots: toSubmit.map((item) => ({
            startTime: item.startUtcIso,
            endTime: item.endUtcIso,
          })),
          idempotencyKey,
          count: toSubmit.length,
        });
        const submittedKeySet = new Set(toSubmit.map((s) => s.key));
        setSelectedSlots((cur) => cur.filter((s) => !submittedKeySet.has(s.key)));
        setSubmittingBatch(false);
        setConfirmModalOpen(false);
        setFeedbackBanner({
          tone: 'success',
          text: trf('Đã gửi đăng ký {0} khung giờ {1} phút chờ duyệt.', { 0: toSubmit.length, 1: durationMinutes }),
        });
      } catch (err) {
        const msg = describeApiError(err).message || tr('Không gửi được đợt đăng ký này.');
        setSubmittingBatch(false);
        setFeedbackBanner({
          tone: 'error',
          text: msg,
        });
      }
      return;
    }

    const succeededKeys = new Set();
    const errorByKey = new Map();

    for (const item of toSubmit) {
      try {
        await onCreateAvailability({
          startTime: item.startUtcIso,
          endTime: item.endUtcIso,
          repeatUntil: null,
          weekdays: null,
          idempotencyKey: `${idempotencyKey}:${item.key}`,
          count: 1,
          silentToast: toSubmit.length > 1,
        });
        succeededKeys.add(item.key);
      } catch (err) {
        errorByKey.set(item.key, describeApiError(err).message || tr('Không gửi được khung giờ này.'));
      }
    }

    setSelectedSlots((cur) => cur
      .filter((s) => !succeededKeys.has(s.key))
      .map((s) => (errorByKey.has(s.key) ? { ...s, submitError: errorByKey.get(s.key) } : s)));

    setSubmittingBatch(false);

    if (errorByKey.size === 0) {
      setConfirmModalOpen(false);
      setFeedbackBanner({
        tone: 'success',
        text: trf('Đã gửi đăng ký {0} khung giờ {1} phút chờ duyệt.', { 0: succeededKeys.size, 1: durationMinutes }),
      });
    } else {
      setFeedbackBanner({
        tone: 'error',
        text: trf('Đã gửi {0}/{1} khung giờ. Còn {2} khung giờ cần kiểm tra lại.', {
          0: succeededKeys.size,
          1: toSubmit.length,
          2: errorByKey.size,
        }),
      });
    }
  };

  const confirmMovePending = async () => {
    if (!pendingMove || hasServerConflict || checkingServer || busy || !onMovePendingSlot) return;
    const moving = pendingMove;
    await onMovePendingSlot(moving);
    setPendingMove(null);
    setFeedbackBanner({
      tone: 'success',
      text: trf('Đã dời khung chờ duyệt sang {0}.', { 0: moving.toLabel }),
    });
  };

  const openAdjustTimeModal = (ev) => {
    const startMin = ev.startHour * 60 + (ev.startMinute || 0);
    setAdjustingEvent(ev);
    setAdjustDateKey(ev.dayKey);
    setAdjustTimeClock(clockFromMinutes(startMin));
    setAdjustError('');
  };

  const handleConfirmAdjustTime = async (e) => {
    e.preventDefault();
    if (!adjustingEvent) return;
    const nextMin = snapMinutesToGrid({
      rawMinutes: minutesFromClock(adjustTimeClock),
      stepMinutes: effectiveStep,
      mode: 'round',
      minMinutes: firstHour * 60,
      maxEndMinutes: (firstHour + hours.length) * 60,
      durationMinutes,
    });

    if (adjustingEvent.isSelectedDraft && adjustingEvent.selectedKey) {
      const ok = toggleOrSelectSlot(adjustDateKey, nextMin, adjustingEvent.selectedKey);
      if (!ok) {
        setAdjustError(trf('Khung giờ mới bị trùng hoặc chưa đủ {0} phút nghỉ giữa buổi.', { 0: restMinutes }));
        return;
      }
      setAdjustingEvent(null);
      return;
    }

    if (adjustingEvent.slot && !adjustingEvent.slot.isApproved) {
      const localOccupied = buildOccupiedItems({
        slots,
        cohortSessions,
        externalBusyEvents,
        ignoreSlotId: adjustingEvent.slot.id,
      });
      const check = validateCandidateSlot({
        dayKey: adjustDateKey,
        startMin: nextMin,
        policy,
        occupiedItems: localOccupied,
        extraProposedItems: buildProposedFromSelection(null),
        nowMs: Date.now(),
        stepMinutes: effectiveStep,
      });
      if (!check.valid) {
        setAdjustError(check.reason);
        return;
      }
      if (onMovePendingSlot) {
        await onMovePendingSlot({
          slot: adjustingEvent.slot,
          startUtcIso: check.startUtcIso,
          endUtcIso: check.endUtcIso,
        });
      }
      setAdjustingEvent(null);
    }
  };

  // Touch / Quick-pick candidates for a chosen day
  const touchCandidates = useMemo(() => {
    if (!touchPickerDay) return [];
    const dk = touchPickerDay.dayKey;
    const list = [];
    const minM = (policy?.gridStartHour ?? 7) * 60;
    const maxStart = (policy?.gridEndHour ?? 22) * 60 - durationMinutes;
    const extraProposed = buildProposedFromSelection(null);
    for (let m = minM; m <= maxStart; m += effectiveStep) {
      const isSelected = selectedSlots.some((s) => s.dayKey === dk && Number(s.startMin) === m);
      const check = customValidateCandidate
        ? {
          dayKey: dk,
          startMin: m,
          endMin: m + durationMinutes,
          startClock: clockFromMinutes(m),
          endClock: clockFromMinutes(m + durationMinutes),
          ...customValidateCandidate({ dayKey: dk, startMin: m }),
        }
        : validateCandidateSlot({
          dayKey: dk,
          startMin: m,
          policy,
          occupiedItems,
          extraProposedItems: extraProposed,
          nowMs,
          stepMinutes: effectiveStep,
        });
      if (check.code !== 'PAST_TIME' && check.code !== 'PAST_SCHEDULE_SLOT' && !isPastSlotOccurrence(dk, m, nowMs)) {
        list.push({ ...check, isSelected });
      }
    }
    return list;
  }, [touchPickerDay, durationMinutes, effectiveStep, policy, occupiedItems, buildProposedFromSelection, selectedSlots, nowMs, customValidateCandidate, isPastSlotOccurrence]);

  const monthMatrix = useMemo(
    () => (calendarSubView === 'month' ? buildMonthMatrix(anchorKey, todayKey) : null),
    [anchorKey, todayKey, calendarSubView]
  );

  // Legacy flat List View dataset (single-slot availability mode only; proposalMode uses ExpandableRegistrationTable)
  const listTableRows = useMemo(() => {
    if (proposalMode) return [];
    const scopeDateRange = dateFilterMode !== 'view' ? effectiveDateRange : null;
    const base = filterScheduleEvents(calendarEvents, {
      statusFilter,
      eventTypeFilter,
      dateRange: scopeDateRange,
      timeRange: effectiveTimeRange,
      searchQuery,
      nowMs,
    });
    return sortScheduleEvents(base, {
      sortBy,
      sortDirection,
      todayKey,
      nowMs,
    });
  }, [proposalMode, calendarEvents, statusFilter, eventTypeFilter, dateFilterMode, effectiveDateRange, effectiveTimeRange, searchQuery, sortBy, sortDirection, todayKey, nowMs]);

  const listScopeLabel = useMemo(() => {
    if (dateFilterMode === 'upcoming') return tr('Sắp diễn ra');
    if (dateFilterMode === 'past') return tr('Lịch sử');
    if (dateFilterMode === 'today') return tr('Hôm nay');
    if (dateFilterMode === 'week') return tr('Tuần này');
    if (dateFilterMode === 'month') return tr('Tháng này');
    if (dateFilterMode === 'custom') {
      const fromText = customFromDate ? formatIsoDateDisplay(customFromDate) : '…';
      const toText = customToDate ? formatIsoDateDisplay(customToDate) : '…';
      return `${fromText} – ${toText}`;
    }
    return tr('Toàn bộ thời gian');
  }, [customFromDate, customToDate, dateFilterMode, tr]);

  const totalTablePages = Math.max(1, Math.ceil(listTableRows.length / tablePageSize));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedTableRows = useMemo(
    () => listTableRows.slice((safeTablePage - 1) * tablePageSize, safeTablePage * tablePageSize),
    [listTableRows, safeTablePage, tablePageSize]
  );

  const toggleTableSort = (columnSortBy) => {
    if (sortBy === columnSortBy) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnSortBy);
      setSortDirection('asc');
    }
    setTablePage(1);
  };

  const openCancelConfirmModal = (ev) => {
    setCancelingEvent(ev);
    setCancelModalReason('');
    setCancelModalError('');
  };

  const handleConfirmCancelEvent = async (e) => {
    e?.preventDefault();
    if (!cancelingEvent) return;
    setCancelModalError('');
    try {
      if (cancelingEvent.isSelectedDraft && cancelingEvent.selectedKey) {
        removeSelectedSlotByKey(cancelingEvent.selectedKey);
        setCancelingEvent(null);
        return;
      }
      const s = cancelingEvent.slot;
      if (!s) return;
      if (!s.isApproved && onDeletePendingSlot) {
        await onDeletePendingSlot(s.id);
        setCancelingEvent(null);
        return;
      }
      if (s.isApproved && onRequestCancelSlot) {
        if (!cancelModalReason.trim()) {
          setCancelModalError(tr('Vui lòng nhập lý do xin hủy để Quản trị viên xem xét.'));
          return;
        }
        await onRequestCancelSlot(s.id, cancelModalReason.trim());
        setCancelingEvent(null);
      }
    } catch (err) {
      setCancelModalError(describeApiError(err).message || tr('Không thể hủy khung giờ này.'));
    }
  };

  const rangeTitle = locale === 'vi'
    ? range.title
    : view === 'day'
      ? fmt.weekdayDate(new Date(`${anchorKey}T12:00:00+07:00`))
      : `${fmt.date(new Date(`${range.startKey}T12:00:00+07:00`))} – ${fmt.date(new Date(`${range.endKey}T12:00:00+07:00`))}`;

  const nowParts = toVnTimeParts(new Date(nowMs));
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const showNowLine = nowMinutes >= firstHour * 60 && nowMinutes <= (firstHour + hours.length) * 60;

  const proposalDurationWeeks = Math.max(1, Number(proposalConfig?.durationWeeks ?? 1));
  const proposalWeeklyCount = proposalMode
    ? Number(proposalConfig?.weeklyPatternCount ?? selectedSlots.length)
    : selectedSlots.length;
  const proposalWeeklyHours = Math.round(((proposalWeeklyCount * durationMinutes) / 60) * 10) / 10;
  const proposalInvalidPatternCount = proposalMode
    ? Number(proposalConfig?.invalidPatternCount ?? 0)
    : invalidSelectedSlots.length;
  const proposalHasConflict = proposalMode
    ? Boolean(proposalInvalidPatternCount > 0 || proposalConfig?.hasScheduleErrors)
    : Boolean(invalidSelectedSlots.length > 0);
  const proposalHasErrors = proposalHasConflict;
  const proposalScheduleReady = Boolean(
    !proposalHasErrors && proposalWeeklyCount >= 1
  );
  const showSelectionActionBar = proposalMode
    ? (isRevisionScheduleEditing || proposalCapacityLocked || proposalWeeklyCount > 0)
    : selectedSlots.length > 0;
  const proposalBarContainerClass = (proposalCapacityLocked && !isRevisionScheduleEditing)
    ? 'flex flex-wrap items-center justify-between gap-2.5 border-b border-rp-line bg-slate-50/95 px-4 py-2.5'
    : proposalHasErrors
      ? 'flex flex-wrap items-center justify-between gap-2.5 border-b border-red-200 bg-red-50/90 px-4 py-2.5'
      : proposalScheduleReady
        ? 'flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-200/90 bg-emerald-50/85 px-4 py-2.5'
        : 'flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-200/90 bg-amber-50/90 px-4 py-2.5';
  const proposalNextDisabled = !proposalReadOnly && (proposalCapacityLocked || !proposalScheduleReady || submittingBatch || busy);
  const proposalNextTooltip = isRevisionScheduleEditing
    ? (proposalHasConflict
      ? tr('Cần điều chỉnh khung giờ không hợp lệ trước khi áp dụng')
      : proposalWeeklyCount < 1
        ? tr('Vui lòng chọn ít nhất một khung giờ.')
        : tr('Áp dụng lịch này cho đề xuất đang chỉnh sửa'))
    : proposalCapacityLocked
      ? proposalCapacityMessage
      : proposalReadOnly
        ? tr('Xem chi tiết đề xuất')
        : proposalHasConflict
          ? tr('Cần điều chỉnh khung giờ không hợp lệ trước khi tiếp tục')
          : proposalWeeklyCount < 1
            ? tr('Vui lòng chọn ít nhất một khung giờ.')
            : tr('Bước tiếp theo: Thông tin lớp dự kiến');

  return (
    <div className="space-y-2.5" data-interactive-slot-calendar="true">
      {/* Main Calendar / List Container */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-rp-line bg-white shadow-2xs">
        {/* Container-Aware Responsive Unified Toolbar: 1 row when wide, auto-wraps to 2+ rows when narrow */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-rp-line bg-white px-4 py-2.5">
          {/* Left Group: Calendar Time Navigation OR Template Heading OR List View Title/Scope */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {templateMode ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2.5" data-testid="template-calendar-header-title">
                <h2 className="m-0 text-[15px] font-bold tracking-tight text-rp-text">
                  {tr('Mẫu lịch giảng dạy hằng tuần (Thứ 2 – Chủ nhật)')}
                </h2>
              </div>
            ) : displayMode === 'calendar' ? (
              <>
                <button
                  type="button"
                  onClick={() => setAnchor(todayKey)}
                  className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-xl border border-rp-line bg-white px-3 text-[12.5px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  {tr('Hôm nay')}
                </button>
                <div className="inline-flex shrink-0 items-center rounded-xl border border-rp-line bg-white p-0.5">
                  <button
                    type="button"
                    aria-label={tr('Khoảng thời gian trước')}
                    onClick={() => setAnchor(stepAnchorKey(anchorKey, view, -1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={tr('Khoảng thời gian sau')}
                    onClick={() => setAnchor(stepAnchorKey(anchorKey, view, 1))}
                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Popover
                  open={miniOpen}
                  onOpenChange={setMiniOpen}
                  align="start"
                  label={tr('Chọn ngày nhanh')}
                  trigger={({ props, toggle }) => (
                    <button
                      {...props}
                      type="button"
                      onClick={toggle}
                      className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-1 text-left hover:bg-rp-brand-tint"
                    >
                      <span className="text-[14.5px] font-bold tracking-tight text-rp-text">
                        {rangeTitle}
                      </span>
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                    </button>
                  )}
                >
                  <MiniDateJump
                    anchorKey={anchorKey}
                    todayKey={todayKey}
                    eventsByDay={eventsByDay}
                    onPickDay={(picked) => { setAnchor(picked); setMiniOpen(false); }}
                  />
                </Popover>
              </>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-2.5" data-testid="list-view-header-title">
                <h2 className="m-0 whitespace-nowrap text-[15px] font-bold tracking-tight text-rp-text">
                  {proposalMode ? tr('Danh sách lịch đăng ký') : tr('Danh sách lịch dạy')}
                </h2>
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rp-line bg-[#FAF7F9] px-2.5 py-0.5 text-[11.5px] font-semibold text-rp-text-2">
                  <CalendarDays className="h-3 w-3 text-rp-brand-strong" aria-hidden="true" />
                  <span>{listScopeLabel}</span>
                </span>
                <span className="whitespace-nowrap text-[12px] font-medium tabular-nums text-rp-text-muted">
                  {proposalMode
                    ? trf('{0} đăng ký', { 0: filteredRegistrationRows.length })
                    : trf('{0} dòng lịch', { 0: listTableRows.length })}
                </span>
              </div>
            )}
          </div>

          {/* Right Group: Mode Switcher, Sub-view, Status Filter, More Filters & Primary Actions */}
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            {!templateMode && (
              <>
                {/* Primary Mode Toggle: Lịch | Danh sách — shared Tabs (sliding active pill) */}
                <Tabs
                  variant="pill"
                  tone="segmented"
                  size="sm"
                  className="shrink-0 !h-9 [&>button]:!h-7 [&>button]:!rounded-[9px]"
                  label={tr('Chế độ hiển thị')}
                  value={displayMode}
                  onChange={handleDisplayModeChange}
                  tabs={[
                    { value: 'calendar', label: 'Lịch', icon: CalendarIcon, testId: 'view-mode-calendar' },
                    { value: 'list', label: 'Danh sách', icon: List, testId: 'view-mode-list' },
                  ]}
                />

                {/* Sub-view pills (Ngày | Tuần | Tháng) when in Calendar mode */}
                {displayMode === 'calendar' && (
                  <Tabs
                    variant="pill"
                    tone="segmented"
                    size="sm"
                    className="shrink-0 !h-9 [&>button]:!h-7 [&>button]:!rounded-[9px]"
                    label={tr('Khung thời gian lịch')}
                    value={calendarSubView}
                    onChange={setCalendarSubView}
                    tabs={CALENDAR_SUBVIEWS.map((v) => ({
                      value: v.id,
                      label: v.label,
                      testId: `calendar-subview-${v.id}`,
                    }))}
                  />
                )}

                {/* Custom Status Filter Listbox with Semantic Color Dots */}
                <div
                  className="shrink-0"
                  title={proposalMode
                    ? tr('Đếm số đề xuất mở lớp theo từng trạng thái (không phụ thuộc tuần/tháng đang xem).')
                    : undefined}
                >
                  <StatusDotListbox
                    value={statusFilter}
                    options={statusOptions}
                    onChange={(nextStatus) => {
                      setStatusFilter(nextStatus);
                      setTablePage(1);
                    }}
                    countsByStatus={countsByStatus}
                  />
                </div>
              </>
            )}

            {/* Filters Popover:
                - In templateMode: hidden (only drafting 1-week pattern).
                - In proposalMode: shown ONLY in List View (registration-level filters: Status, JLPT, Date, Search, Registration Sort)
                  so Calendar View stays clean and uncluttered.
                - In legacy availability mode (!proposalMode): shown in both views with legacy options. */}
            {!templateMode && (!proposalMode || displayMode === 'list') && (
              <ScheduleMoreFiltersPopover
                policy={policy}
                proposalMode={proposalMode}
                displayMode={displayMode}
                statusFilter={statusFilter}
                statusOptions={statusOptions}
                countsByStatus={countsByStatus}
                onStatusChange={proposalMode ? (nextStatus) => {
                  setStatusFilter(nextStatus);
                  setTablePage(1);
                } : undefined}
                jlptLevelFilter={jlptLevelFilter}
                onJlptLevelChange={proposalMode ? (nextLevel) => {
                  setJlptLevelFilter(nextLevel);
                  setTablePage(1);
                } : undefined}
                searchQuery={searchQuery}
                onSearchChange={proposalMode ? (q) => {
                  setSearchQuery(q);
                  setTablePage(1);
                } : undefined}
                eventTypeOptions={eventTypeOptions}
                dateFilterMode={dateFilterMode}
                customFromDate={customFromDate}
                customToDate={customToDate}
                onDateFilterChange={({ mode, from, to }) => {
                  setDateFilterMode(mode);
                  setCustomFromDate(from ?? '');
                  setCustomToDate(to ?? '');
                  if (mode === 'today' && displayMode === 'calendar') setAnchor(todayKey);
                  setTablePage(1);
                }}
                showTimeFilter={!proposalMode}
                timeFilterCode={timeFilterCode}
                customStartTime={customStartTime}
                customEndTime={customEndTime}
                onTimeFilterChange={({ code, start, end }) => {
                  setTimeFilterCode(code);
                  if (start) setCustomStartTime(start);
                  if (end) setCustomEndTime(end);
                  setTablePage(1);
                }}
                eventTypeFilter={eventTypeFilter}
                onEventTypeChange={(nextType) => {
                  setEventTypeFilter(nextType);
                  setTablePage(1);
                }}
                sortBy={proposalMode ? regSortBy : sortBy}
                sortDirection={proposalMode ? regSortDirection : sortDirection}
                sortOptions={proposalMode ? REGISTRATION_TABLE_SORT_OPTIONS : undefined}
                onSortChange={({ sortBy: nextSort, sortDirection: nextDir }) => {
                  if (proposalMode) {
                    setRegSortBy(nextSort);
                    setRegSortDirection(nextDir);
                  } else {
                    setSortBy(nextSort);
                    setSortDirection(nextDir);
                  }
                  setTablePage(1);
                }}
                onResetAll={resetAllFilters}
                activeFilterCount={activeExtraFilterCount}
              />
            )}

            {/* Custom Toolbar Actions (e.g., "Danh sách đăng ký") */}
            {renderCustomHeaderActions}

            {headerTopRight}

            {onRefresh && (
              <RefreshButton
                iconOnly
                size="sm"
                onRefresh={onRefresh}
                refreshing={refreshing}
                tooltip={tr('Làm mới lịch')}
                aria-label={tr('Làm mới dữ liệu lịch')}
                className="!h-9 !w-9 rounded-xl"
              />
            )}
          </div>
        </div>

        {refreshing && (
          <div className="pointer-events-none sticky top-2 z-30 h-0 overflow-visible px-3">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} label={tr('Đang cập nhật lịch…')} />
              </div>
            </div>
          </div>
        )}

        {/* Compact Top Selection Action Bar — hidden when 0 slots selected */}
        {showSelectionActionBar && (
          <div
            data-testid={isRevisionScheduleEditing ? 'revision-schedule-toolbar' : 'multi-select-action-bar'}
            className={
              proposalMode
                ? proposalBarContainerClass
                : 'flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-200/90 bg-[#F2FBF6] px-4 py-2'
            }
          >
            {proposalMode && isRevisionScheduleEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => proposalConfig?.onJumpToSelected?.()}
                  title={tr('Nhấn để đi tới lịch đang chỉnh sửa')}
                  className="group flex flex-wrap items-center gap-2 rounded-lg py-0.5 text-left text-[12.5px] font-semibold text-rp-text transition-opacity hover:opacity-85 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#C2410C]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" aria-hidden="true" />
                    {proposalConfig?.revisionLevelCode
                      ? trf('Chỉnh sửa lịch lớp JLPT {0}', { 0: proposalConfig.revisionLevelCode })
                      : (proposalConfig?.revisionTitle || tr('Chỉnh sửa lịch giảng dạy'))}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white shadow-2xs ${
                      proposalHasErrors
                        ? 'bg-red-700'
                        : proposalScheduleReady
                          ? 'bg-emerald-700'
                          : 'bg-amber-700'
                    }`}
                  >
                    {trf('{0} buổi mỗi tuần · {1} giờ/tuần', {
                      0: proposalWeeklyCount,
                      1: proposalWeeklyHours,
                    })}
                  </span>

                  {proposalHasConflict ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
                      {trf('{0} khung cần điều chỉnh', { 0: Math.max(1, proposalInvalidPatternCount) })}
                    </span>
                  ) : proposalWeeklyCount < 1 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
                      {tr('Vui lòng chọn ít nhất một khung giờ.')}
                    </span>
                  ) : null}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="cancel-revision-schedule-btn"
                    disabled={submittingBatch || busy}
                    onClick={() => proposalConfig?.onCancelRevisionSchedule?.()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 transition-colors hover:border-[#E5B8C5] hover:bg-[#FFF5F7] hover:text-rp-brand-strong disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{tr('Hủy thay đổi')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="apply-revision-schedule-btn"
                    disabled={proposalNextDisabled}
                    title={proposalNextTooltip}
                    onClick={() => proposalConfig?.onApplyRevisionSchedule?.()}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-4 text-[12.5px] font-bold shadow-sm transition-all ${
                      proposalNextDisabled
                        ? 'border-slate-300 bg-white/95 text-slate-500 cursor-not-allowed'
                        : 'border-transparent bg-rp-brand-pressed text-white hover:bg-rp-brand-strong hover:shadow-md'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{tr('Áp dụng lịch')}</span>
                  </button>
                </div>
              </>
            ) : proposalMode && proposalCapacityLocked ? (
              <div
                data-testid="capacity-exhausted-bar"
                className="flex w-full flex-wrap items-center justify-between gap-2.5"
              >
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-rp-text-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                  <span>{proposalCapacityMessage}</span>
                  {proposalWeeklyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => proposalConfig?.onJumpToSelected?.()}
                      title={tr('Nhấn để xem các khung giờ đang chọn tồn đọng')}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                    >
                      <span>{trf('{0} khung đang chọn tồn đọng', { 0: proposalWeeklyCount })}</span>
                    </button>
                  )}
                </div>
                {proposalWeeklyCount > 0 && (
                  <button
                    type="button"
                    data-testid="clear-all-selected-btn"
                    disabled={submittingBatch || busy}
                    onClick={() => (proposalConfig?.onClearAll ? proposalConfig.onClearAll() : clearAllSelectedSlots())}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{tr('Bỏ chọn tất cả')}</span>
                  </button>
                )}
              </div>
            ) : proposalMode ? (
              <>
                <button
                  type="button"
                  onClick={() => proposalConfig?.onJumpToSelected?.()}
                  title={tr('Nhấn để đi tới lịch đang chọn')}
                  className="group flex flex-wrap items-center gap-2 rounded-lg py-0.5 text-left text-[12.5px] font-semibold text-rp-text transition-opacity hover:opacity-85 cursor-pointer"
                >
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white shadow-2xs ${
                      proposalHasErrors
                        ? 'bg-red-700'
                        : proposalScheduleReady
                          ? 'bg-emerald-700'
                          : 'bg-amber-700'
                    }`}
                  >
                    {trf('{0} buổi mỗi tuần · {1} giờ/tuần', {
                      0: proposalWeeklyCount,
                      1: proposalWeeklyHours,
                    })}
                  </span>

                  {proposalHasConflict ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
                      {trf('{0} khung cần điều chỉnh', { 0: Math.max(1, proposalInvalidPatternCount) })}
                    </span>
                  ) : proposalWeeklyCount < 1 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
                      {tr('Vui lòng chọn ít nhất một khung giờ.')}
                    </span>
                  ) : null}

                  {proposalConfig?.courseSummaryText && (
                    <span className="hidden text-[11.5px] font-normal text-rp-text-2 transition-colors group-hover:text-rp-text sm:inline">
                      · {proposalConfig.courseSummaryText}
                    </span>
                  )}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {proposalWeeklyCount > 0 && !proposalReadOnly && (
                    <button
                      type="button"
                      data-testid="clear-all-selected-btn"
                      disabled={submittingBatch || busy}
                      onClick={() => (proposalConfig?.onClearAll ? proposalConfig.onClearAll() : clearAllSelectedSlots())}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{tr('Bỏ chọn tất cả')}</span>
                    </button>
                  )}
                  {(proposalConfig?.onNextStep || proposalConfig?.onOpenReview) && (
                    <button
                      type="button"
                      data-testid="open-confirm-modal-btn"
                      disabled={proposalNextDisabled}
                      title={proposalNextTooltip}
                      onClick={
                        proposalReadOnly
                          ? (proposalConfig?.onOpenReview || proposalConfig?.onNextStep)
                          : (proposalConfig?.onNextStep || proposalConfig?.onOpenReview)
                      }
                      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-4 text-[12.5px] font-bold shadow-sm transition-all ${
                        proposalNextDisabled
                          ? 'border-slate-300 bg-white/95 text-slate-500 cursor-not-allowed'
                          : 'border-transparent bg-rp-brand-pressed text-white hover:bg-rp-brand-strong hover:shadow-md'
                      }`}
                    >
                      <span>{proposalReadOnly ? tr('Xem đề xuất') : tr('Bước tiếp theo')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-emerald-950">
                  <CountBadge count={selectedSlots.length} size="md" />
                  <span>{trf('Đã chọn {0} khung giờ', { 0: selectedSlots.length })}</span>
                  <span className="text-emerald-700/80" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    {tr('Chưa gửi đăng ký')}
                  </span>
                  <span className="hidden text-[11.5px] font-normal text-emerald-900/80 sm:inline">
                    {trf('{0} buổi trong tuần · {1} khung chờ duyệt', {
                      0: viewedWeekStats.totalRegistered,
                      1: currentPendingCount,
                    })}
                  </span>
                  {invalidSelectedSlots.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                      {trf('{0} khung cần kiểm tra', { 0: invalidSelectedSlots.length })}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="clear-all-selected-btn"
                    disabled={submittingBatch || busy}
                    onClick={clearAllSelectedSlots}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-[12px] font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{tr('Bỏ chọn tất cả')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="open-confirm-modal-btn"
                    disabled={submittingBatch || busy}
                    onClick={() => setConfirmModalOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white shadow-2xs transition-colors hover:bg-rp-brand-strong disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{trf('Xem & gửi đăng ký ({0})', { 0: selectedSlots.length })}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Active Filter Chips Bar (only shown when filters are active) */}
        <ActiveScheduleFilterBar
          statusFilter={statusFilter}
          statusOptions={statusOptions}
          onClearStatus={() => { setStatusFilter('ALL'); setTablePage(1); }}
          eventTypeFilter={proposalMode ? 'ALL' : eventTypeFilter}
          eventTypeOptions={eventTypeOptions}
          onClearEventType={() => { setEventTypeFilter('ALL'); setTablePage(1); }}
          jlptLevelFilter={proposalMode ? jlptLevelFilter : 'ALL'}
          onClearJlptLevel={() => { setJlptLevelFilter('ALL'); setTablePage(1); }}
          searchQuery={searchQuery}
          onClearSearch={() => { setSearchQuery(''); setTablePage(1); }}
          dateFilterMode={dateFilterMode}
          customFromDate={customFromDate}
          customToDate={customToDate}
          onClearDate={() => { setDateFilterMode('view'); setCustomFromDate(''); setCustomToDate(''); setTablePage(1); }}
          timeFilterCode={proposalMode && displayMode === 'list' ? 'ALL' : timeFilterCode}
          timeFilterLabel={effectiveTimeRange?.label || ''}
          onClearTime={() => { setTimeFilterCode('ALL'); setTablePage(1); }}
          onResetAll={resetAllFilters}
          totalFilteredCount={displayMode === 'list'
            ? (proposalMode ? filteredRegistrationRows.length : listTableRows.length)
            : filteredEvents.length}
        />

        {/* Inline Feedback / Validation Notice (auto-dismisses after 4.5s of inactivity, pauses on hover) */}
        {feedbackBanner && (
          <div
            role={feedbackBanner.tone === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => setFeedbackBannerHovered(true)}
            onMouseLeave={() => setFeedbackBannerHovered(false)}
            className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-[12.5px] font-medium ${
              feedbackBanner.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : feedbackBanner.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rp-brand-border bg-rp-brand-tint/60 text-rp-brand-deep'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {feedbackBanner.tone === 'error' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{feedbackBanner.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {feedbackBanner.suggestion && (
                <button
                  type="button"
                  onClick={() => toggleOrSelectSlot(feedbackBanner.suggestion.dayKey, feedbackBanner.suggestion.startMin)}
                  className="rounded-lg bg-white px-2.5 py-1 text-[11.5px] font-semibold text-rp-brand-strong shadow-2xs hover:bg-rp-brand-tint"
                >
                  {trf('Chọn {0}', { 0: clockFromMinutes(feedbackBanner.suggestion.startMin) })}
                </button>
              )}
              <button
                type="button"
                aria-label={tr('Đóng thông báo')}
                onClick={() => {
                  setFeedbackBanner(null);
                  setFeedbackBannerHovered(false);
                }}
                className="rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Pending Single-Slot Move Confirmation Bar */}
        {pendingMove && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-brand-border bg-[#FFF4F8] px-4 py-2 text-[12.5px]">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-rp-brand-strong" />
              <span>
                {tr('Dời khung chờ duyệt:')}{' '}
                <strong className="line-through opacity-65">{pendingMove.fromLabel}</strong>
                {' → '}
                <strong className="text-rp-brand-strong">{pendingMove.toLabel}</strong>
              </span>
              {hasServerConflict && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                  <ShieldAlert className="h-3 w-3" /> {serverConflicts[0]?.message || tr('Trùng lịch')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingMove(null)}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-rp-line bg-white px-3 text-[12px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
              >
                <Undo2 className="h-3.5 w-3.5" /> {tr('Hoàn tác')}
              </button>
              <button
                type="button"
                disabled={busy || hasServerConflict || checkingServer}
                onClick={confirmMovePending}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? tr('Đang lưu…') : tr('Lưu giờ mới')}
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Stage (One Primary View at a Time: Calendar OR List Table) */}
        <div className="rp-cal-stage bg-white">
          {displayMode === 'calendar' && (view === 'week' || view === 'day') && (
            <div className="overflow-x-auto bg-white">
              <div className={view === 'week' ? 'min-w-[740px]' : 'min-w-full'}>
                {/* Fixed Day Header Row — sits OUTSIDE the vertical scroll container and shares stable scrollbar-gutter */}
                <div
                  data-testid="calendar-header-grid"
                  className="rp-cal-scroll grid border-b border-rp-line bg-white"
                  style={{
                    gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))`,
                    scrollbarGutter: 'stable',
                    overflowY: 'scroll',
                  }}
                >
                  <div className="flex items-end justify-end bg-white px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-rp-text-muted" />
                  {weekDays.map((day) => {
                    const isSelectedDay = !templateMode && day.key === anchorKey;
                    const selectedOnDay = selectedSlots.filter((s) => s.dayKey === day.key).length;
                    const dayEventCount = (eventsByDay.get(day.key) || []).length;
                    const weekdayIdx = new Date(`${day.key}T12:00:00+07:00`).getUTCDay();
                    if (templateMode) {
                      return (
                        <div
                          key={day.key}
                          data-day-header={day.key}
                          className="relative flex items-center justify-center gap-1.5 border-l border-rp-line bg-white px-2 py-2.5 text-center"
                        >
                          <span className="text-[12px] font-bold text-rp-text">
                            {tr(WEEKDAY_LABEL_VI[weekdayIdx])}
                          </span>
                          {selectedOnDay > 0 && (
                            <span
                              title={trf('Đang chọn {0} khung giờ chưa gửi trong ngày này', { 0: selectedOnDay })}
                              className="rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-bold text-emerald-800"
                            >
                              +{selectedOnDay}
                            </span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <button
                        key={day.key}
                        type="button"
                        data-day-header={day.key}
                        data-is-today={day.isToday ? 'true' : 'false'}
                        data-is-selected={isSelectedDay ? 'true' : 'false'}
                        title={trf('{0} · {1} buổi trong ngày', {
                          0: day.fullName,
                          1: dayEventCount,
                        })}
                        onClick={() => {
                          if (day.key === anchorKey && calendarSubView === 'week') {
                            setCalendarSubView('day');
                          } else {
                            setAnchor(day.key);
                          }
                        }}
                        className={`relative border-l border-rp-line px-2 py-2 text-center transition-colors ${
                          isSelectedDay
                            ? 'bg-rp-brand-tint/35'
                            : 'bg-white hover:bg-rp-bg-2/50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-[11px] font-semibold uppercase ${
                            day.isToday || isSelectedDay ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                          }`}>
                            {calendarSubView === 'day' ? day.fullName : dayLabels[weekdayIdx]}
                          </span>
                          {selectedOnDay > 0 && (
                            <span
                              title={trf('Đang chọn {0} khung giờ chưa gửi trong ngày này', { 0: selectedOnDay })}
                              className="rounded-full bg-emerald-100 px-1.5 py-px text-[9.5px] font-bold text-emerald-800"
                            >
                              +{selectedOnDay}
                            </span>
                          )}
                        </div>
                        <span className={`mx-auto mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-full text-[14px] font-bold transition-all ${
                          day.isToday && isSelectedDay
                            ? 'bg-rp-brand-pressed text-white ring-2 ring-rp-brand-border ring-offset-1 shadow-2xs'
                            : day.isToday
                              ? 'bg-rp-brand-pressed text-white shadow-2xs'
                              : isSelectedDay
                                ? 'border border-rp-brand-border bg-rp-brand-tint font-bold text-rp-brand-strong'
                                : 'text-rp-text'
                        }`}>
                          {day.dateNum}
                        </span>
                        {isSelectedDay && (
                          <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-rp-brand" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Time-Grid Canvas — ONLY the Body scrolls vertically; shares scrollbarGutter: stable with Header */}
                <div
                  ref={gridScrollRef}
                  data-testid="calendar-body-grid"
                  className={`rp-cal-scroll grid bg-white select-none overflow-y-scroll ${
                    showSelectionActionBar
                      ? 'max-h-[calc(100dvh-286px)] min-h-[466px]'
                      : 'max-h-[calc(100dvh-242px)] min-h-[510px]'
                  }`}
                  style={{
                    gridTemplateColumns: `64px repeat(${weekDays.length}, minmax(0, 1fr))`,
                    scrollbarGutter: 'stable',
                  }}
                >
                  {/* Hour Gutter */}
                  <div className="relative bg-white" style={{ height: gridHeight }}>
                    {hours.map((hour) => (
                      <span
                        key={hour}
                        className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-rp-text-muted"
                        style={{ top: Math.max((hour - firstHour) * HOUR_HEIGHT, 8) }}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>

                  {/* Clean Uniform White Day Columns (Mon–Sun share identical white surface) */}
                  {weekDays.map((day, colIndex) => {
                    const isSingleDayView = weekDays.length === 1;
                    const overlayInsetClass = isSingleDayView ? 'inset-x-3' : 'inset-x-1.5';
                    const colInsetPx = isSingleDayView ? 12 : 3;
                    const dayEvents = packedByDay.get(day.key) || [];
                    const restBands = computeDayRestWindows({
                      dayKey: day.key,
                      occupiedItems: buildVisibleRestWindowSources(dayEvents),
                      policy,
                    });
                    const isDragTargetCol = dragVisual?.dayKey === day.key;
                    const isHoveredBlocked = Boolean(
                      hoveredSlotState
                      && hoveredSlotState.dayKey === day.key
                      && !hoveredSlotState.valid
                    );

                    return (
                      <div
                        key={day.key}
                        ref={(el) => {
                          if (el) dayColsRef.current[day.key] = el;
                          else delete dayColsRef.current[day.key];
                        }}
                        data-day-col={day.key}
                        title={isHoveredBlocked ? hoveredSlotState.reason : undefined}
                        onPointerMove={(e) => handleEmptyColumnPointerMove(day.key, e)}
                        onPointerLeave={() => {
                          if (hoveredSlotState?.dayKey === day.key) setHoveredSlotState(null);
                        }}
                        onPointerDown={(e) => startEmptyColumnPointerDown(day.key, e)}
                        className={`relative border-l border-rp-line bg-white ${
                          (!templateMode && day.key < todayKey) || proposalCapacityLocked || isHoveredBlocked
                            ? 'cursor-not-allowed'
                            : 'cursor-cell'
                        }`}
                        style={{ height: gridHeight }}
                      >
                        {/* Disabled Past-Time Overlay: omitted in weekly templateMode */}
                        {!templateMode && (day.key < todayKey || (day.isToday && nowMinutes > firstHour * 60)) && (
                          <div
                            data-past-time-overlay="true"
                            title={tr('Đã quá thời gian này.')}
                            aria-label={tr('Đã quá thời gian này.')}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-x-0 top-0 z-[5] cursor-not-allowed bg-gray-100/80"
                            style={{
                              height: day.key < todayKey
                                ? gridHeight
                                : Math.min(gridHeight, Math.max(0, ((nowMinutes - firstHour * 60) / 60) * HOUR_HEIGHT)),
                            }}
                          />
                        )}
                        {proposalCapacityLocked && (templateMode || day.key >= todayKey) && (() => {
                          const pastOverlayHeight = !templateMode && day.isToday && nowMinutes > firstHour * 60
                            ? Math.min(gridHeight, Math.max(0, ((nowMinutes - firstHour * 60) / 60) * HOUR_HEIGHT))
                            : 0;
                          const remainingHeight = Math.max(0, gridHeight - pastOverlayHeight);
                          if (remainingHeight <= 0) return null;
                          return (
                            <div
                              data-capacity-locked-overlay="true"
                              title={proposalCapacityMessage}
                              aria-label={proposalCapacityMessage}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-x-0 z-[4] cursor-not-allowed bg-slate-100/55"
                              style={{ top: pastOverlayHeight, height: remainingHeight }}
                            />
                          );
                        })()}
                        {/* Subtle neutral daypart text label in first column only (NO colored background bands!) */}
                        {colIndex === 0 && (policy?.dayparts || []).map((dp) => {
                          const top = ((dp.startMin - firstHour * 60) / 60) * HOUR_HEIGHT;
                          if (top < 0 || top >= gridHeight) return null;
                          return (
                            <span
                              key={dp.code}
                              aria-hidden="true"
                              className="pointer-events-none absolute left-1.5 z-[2] pt-0.5 text-[9.5px] font-medium uppercase tracking-wider text-rp-text-muted/60"
                              style={{ top }}
                            >
                              {tr(dp.label)}
                            </span>
                          );
                        })}

                        {/* Subtle 15-Minute Rest Margin Indicator (delicate dashed border, no yellow stripe fill) */}
                        {restBands.map((band, idx) => {
                          const top = ((band.startMin - firstHour * 60) / 60) * HOUR_HEIGHT;
                          const h = ((band.endMin - band.startMin) / 60) * HOUR_HEIGHT;
                          if (h <= 2) return null;
                          return (
                            <div
                              key={`rest-${idx}`}
                              aria-hidden="true"
                              title={trf('Khoảng nghỉ {0} phút giữa hai buổi dạy', { 0: restMinutes })}
                              className={`pointer-events-none absolute ${overlayInsetClass} z-[3] flex items-center justify-end rounded border border-dashed border-rp-line/80 bg-rp-bg-2/25 px-1.5`}
                              style={{ top, height: h }}
                            >
                              {h >= 15 && (
                                <span className="text-[8.5px] leading-none font-medium text-rp-text-muted/75">
                                  {trf('Nghỉ {0} phút', { 0: restMinutes })}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* Clean Light-Gray Hour & Half-Hour Gridlines */}
                        {hours.map((hour) => (
                          <div key={hour}>
                            <div
                              className="pointer-events-none absolute inset-x-0 border-t border-gray-200/80"
                              style={{ top: (hour - firstHour) * HOUR_HEIGHT }}
                            />
                            <div
                              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gray-100"
                              style={{ top: (hour - firstHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                            />
                          </div>
                        ))}

                        {/* Live Now Line */}
                        {!templateMode && showNowLine && day.isToday && (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-rp-brand"
                            style={{ top: ((nowMinutes - firstHour * 60) / 60) * HOUR_HEIGHT }}
                          >
                            <span className="absolute -left-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-rp-brand ring-2 ring-white" />
                          </div>
                        )}

                        {/* Invalid Drop Flash Overlay */}
                        {invalidFlash && invalidFlash.dayKey === day.key && (
                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute ${overlayInsetClass} z-40 flex flex-col justify-between rounded-xl border border-red-400 bg-red-50/95 p-2 text-red-900 shadow-sm`}
                            style={{
                              top: ((invalidFlash.startMin - firstHour * 60) / 60) * HOUR_HEIGHT + 1,
                              height: Math.max((durationMinutes / 60) * HOUR_HEIGHT - 3, 30),
                            }}
                          >
                            <span className="text-[11px] font-bold">
                              {clockFromMinutes(invalidFlash.startMin)}–{clockFromMinutes(invalidFlash.startMin + durationMinutes)} · {tr('Không hợp lệ')}
                            </span>
                            <span className="line-clamp-2 text-[10px] font-medium">{invalidFlash.reason}</span>
                          </div>
                        )}

                        {/* Origin Placeholder While Dragging */}
                        {dragVisual && dragVisual.originDayKey === day.key && dragVisual.mode !== 'create' && (
                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute ${overlayInsetClass} z-[6] rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-2 text-[10px] text-rp-text-muted`}
                            style={{
                              top: ((dragVisual.originStartMin - firstHour * 60) / 60) * HOUR_HEIGHT + 1,
                              height: Math.max((durationMinutes / 60) * HOUR_HEIGHT - 3, 28),
                            }}
                          >
                            {clockFromMinutes(dragVisual.originStartMin)}–{clockFromMinutes(dragVisual.originStartMin + durationMinutes)}
                          </div>
                        )}

                        {/* Live Ghost Preview During Drag (GPU-accelerated via transform: translate3d, zero layout reflow) */}
                        {isDragTargetCol && (
                          <div
                            data-testid="calendar-drag-ghost"
                            className={`pointer-events-none absolute ${overlayInsetClass} top-0 z-40 flex flex-col justify-between rounded-xl border-2 px-2.5 py-1.5 shadow-lg will-change-transform ${
                              dragVisual.valid
                                ? 'border-emerald-500 bg-[#F0FDF4]/95 text-emerald-950'
                                : 'border-red-400 bg-red-50/95 text-red-900'
                            }`}
                            style={{
                              transform: `translate3d(0, ${((dragVisual.startMin - firstHour * 60) / 60) * HOUR_HEIGHT + 1}px, 0)`,
                              height: Math.max((durationMinutes / 60) * HOUR_HEIGHT - 3, 30),
                            }}
                          >
                            <div className="flex items-center justify-between gap-1 text-[11.5px] font-bold tabular-nums">
                              <span>
                                {clockFromMinutes(dragVisual.startMin)}–{clockFromMinutes(dragVisual.startMin + durationMinutes)}
                              </span>
                              <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px]">
                                {trf('{0} phút', { 0: durationMinutes })}
                              </span>
                            </div>
                            <span className="line-clamp-2 text-[10.5px] font-medium">
                              {dragVisual.valid ? tr('Vị trí hợp lệ · Thả để chọn') : dragVisual.reason}
                            </span>
                          </div>
                        )}

                        {/* Render 90-Minute Cards */}
                        {dayEvents.map((ev) => {
                          const isBeingDragged = dragVisual && (
                            (ev.isSelectedDraft && ev.selectedKey === dragVisual.selectedKey && dragVisual.mode === 'move-selected') ||
                            (ev.slotId != null && ev.slotId === dragVisual.slotId && dragVisual.mode === 'move-pending')
                          );
                          if (isBeingDragged) return null;

                          const meta = getToneMeta(ev.tone);
                          const { start, end } = minutesOfEvent(ev);
                          const top = ((start - firstHour * 60) / 60) * HOUR_HEIGHT + 1;
                          const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 30);
                          const cols = ev.totalCols || 1;
                          const col = ev.col || 0;
                          const width = `calc((100% - ${colInsetPx * 2}px) / ${cols}${cols > 1 ? ' - 4px' : ''})`;
                          const left = `calc(${colInsetPx}px + (${col} / ${cols}) * (100% - ${colInsetPx * 2}px)${cols > 1 ? ' + 2px' : ''})`;
                          const z = ev.isSelectedDraft
                            ? (ev.hasVisibleDateConflict ? 15 : 35)
                            : (ev.z || 1) + 20 + col;

                          const isWeeklyPendingPattern = Boolean(
                            ev.isWeeklyPattern
                            && !ev.isSelectedDraft
                            && (ev.tone === 'pending' || ev.tone === 'needsRevision')
                          );
                          const cardTitle = ev.tone === 'needsRevision'
                            ? tr('Lịch đã được giữ chỗ. Mở đề xuất để chỉnh sửa.')
                            : isWeeklyPendingPattern
                              ? `${ev.fullTitle || ev.title} · ${tr('Lịch hằng tuần đang chờ duyệt — ngày khai giảng sẽ xác lập khi Quản trị viên phê duyệt')}`
                              : ev.isSelectedDraft && ev.hasVisibleDateConflict
                                ? (ev.visibleConflictTooltip || tr('Khung giờ này đã có lịch vào ngày đang xem. Hệ thống sẽ kiểm tra lại khi chọn ngày bắt đầu.'))
                                : ev.isSelectedDraft && ev.isRepresentativeProjection
                                  ? tr('Nhấn để bỏ chọn khung giờ hằng tuần.')
                                  : `${ev.fullTitle || ev.title} · ${ev.timeLabel || ''} · ${tr(ev.statusLabel || meta.label)}`;

                          return (
                            <div
                              key={ev.id}
                              role="button"
                              tabIndex={0}
                              title={cardTitle}
                              data-slot-card={ev.isSelectedDraft ? `selected-${ev.selectedKey}` : ev.slotId ? `slot-${ev.slotId}` : ev.id}
                              data-slot-tone={ev.tone}
                              data-draggable={ev.draggable ? 'true' : 'false'}
                              onPointerDown={(e) => {
                                if (ev.draggable) {
                                  startCardPointerDown(ev, e);
                                } else {
                                  e.stopPropagation();
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((ev.locked || !ev.isSelectedDraft) && !ev.draggable && ev.sourceKind !== 'draftGhost') {
                                  openEventDetail(ev);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  if (ev.isSelectedDraft && !ev.locked && ev.selectedKey) {
                                    removeSelectedSlotByKey(ev.selectedKey);
                                  } else if (ev.sourceKind !== 'draftGhost') {
                                    openEventDetail(ev);
                                  }
                                } else if ((e.key === 'Delete' || e.key === 'Backspace') && ev.isSelectedDraft && !ev.locked && ev.selectedKey) {
                                  e.preventDefault();
                                  removeSelectedSlotByKey(ev.selectedKey);
                                }
                              }}
                              aria-label={`${tr(ev.title)} ${ev.detail || ''}`}
                              style={{ top, height, width, left, zIndex: z, touchAction: ev.draggable ? 'none' : 'auto' }}
                              className={`group absolute flex flex-col justify-between overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/50 ${
                                ev.draggable
                                  ? `cursor-pointer active:cursor-grabbing hover:shadow-md ${meta.card}`
                                  : `cursor-pointer hover:shadow-md ${meta.card}`
                              } ${isWeeklyPendingPattern ? 'border-dashed' : ''} ${
                                highlightedKeySet.has(ev.id)
                                || (ev.isSelectedDraft && (highlightedKeySet.has(ev.selectedKey) || (ev.weeklyKey && highlightedKeySet.has(ev.weeklyKey))))
                                  ? 'ring-2 ring-rp-brand ring-offset-1 shadow-md'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    {ev.isSelectedDraft ? (
                                      ev.tone === 'conflict' ? (
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                                      )
                                    ) : ev.tone === 'needsRevision' ? (
                                      <Lock className="h-3 w-3 shrink-0 text-[#C2410C]" aria-hidden="true" />
                                    ) : ev.draggable ? (
                                      <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                                    ) : ev.locked ? (
                                      <Lock className="h-3 w-3 shrink-0 opacity-55" aria-hidden="true" />
                                    ) : (
                                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                                    )}
                                    <span className={`line-clamp-2 text-[11.5px] font-bold leading-snug ${ev.tone === 'cancelled' ? 'line-through' : ''}`}>
                                      {tr(ev.title)}
                                    </span>
                                  </div>
                                  {ev.timeLabel && ev.title !== ev.timeLabel && height >= 52 && (
                                    <span className="mt-0.5 block text-[10px] font-semibold tabular-nums opacity-80">
                                      {ev.timeLabel}
                                    </span>
                                  )}
                                </div>
                                {ev.isSelectedDraft ? (
                                  ev.tone === 'conflict' ? (
                                    <span className="shrink-0 rounded-md bg-red-100/90 px-1.5 py-0.5 text-[9.5px] font-bold text-red-800">
                                      {tr('Cần điều chỉnh')}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 rounded-md bg-emerald-100/90 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800">
                                      {tr('Đã chọn')}
                                    </span>
                                  )
                                ) : ev.jlptLevelCode ? (
                                  <span className="shrink-0 rounded-md bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold tracking-tight">
                                    {ev.jlptLevelCode}
                                  </span>
                                ) : null}
                              </div>
                              {height >= 42 && (ev.detail || ev.statusLabel) && (
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`min-w-0 ${isSingleDayView ? 'line-clamp-1' : 'truncate'} text-[10px] font-medium opacity-85`}>
                                    {isSingleDayView && !ev.isSelectedDraft && ev.courseTitle && !String(ev.detail || '').includes(ev.courseTitle)
                                      ? `${ev.courseTitle} · ${ev.detail || tr(ev.statusLabel)}`
                                      : (ev.detail || tr(ev.statusLabel))}
                                  </span>
                                  {proposalMode && ev.tone === 'rejected' && !proposalSelectionBlocked && ev.dayKey >= todayKey && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const startM = (ev.startHour || 0) * 60 + (ev.startMinute || 0);
                                        toggleOrSelectSlot(ev.dayKey, startM);
                                      }}
                                      className="shrink-0 rounded bg-white/95 px-1.5 py-0.5 text-[9.5px] font-bold text-[#B42318] shadow-2xs ring-1 ring-[#F5C2C7] transition-colors hover:bg-[#FFF5F7] hover:text-[#CE476D]"
                                    >
                                      {tr('Chọn lại')}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Month View */}
          {displayMode === 'calendar' && calendarSubView === 'month' && monthMatrix && (
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-rp-line bg-rp-line">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wd) => (
                  <div key={wd} className="bg-rp-bg-2 px-2 py-2 text-center text-[11px] font-bold uppercase text-rp-text-muted">{wd}</div>
                ))}
                {monthMatrix.cells.map((cell) => {
                  const isSelectedCell = cell.key === anchorKey;
                  const isPastDay = cell.key < todayKey;
                  const maxStartToday = (policy?.gridEndHour ?? 22) * 60 - durationMinutes;
                  const isTodayExhausted = cell.key === todayKey && isPastSlotOccurrence(cell.key, maxStartToday, nowMs);
                  const isPastOrExhaustedDay = isPastDay || isTodayExhausted;
                  const isCapacityDisabledDay = !isPastOrExhaustedDay && proposalCapacityLocked;
                  const canPickDay = !isPastOrExhaustedDay && !proposalSelectionBlocked;
                  const items = (eventsByDay.get(cell.key) || []).slice().sort((a, b) => minutesOfEvent(a).start - minutesOfEvent(b).start);
                  const visible = items.slice(0, 3);
                  const overflow = items.length - visible.length;
                  const nextTodayStartMin = cell.key === todayKey
                    ? (() => {
                        const minM = (policy?.gridStartHour ?? 7) * 60;
                        for (let m = minM; m <= maxStartToday; m += effectiveStep) {
                          if (!isPastSlotOccurrence(cell.key, m, nowMs)) return m;
                        }
                        return minM;
                      })()
                    : 8 * 60;
                  return (
                    <div
                      key={cell.key}
                      title={
                        isPastOrExhaustedDay
                          ? tr('Đã quá thời gian này.')
                          : isCapacityDisabledDay
                            ? proposalCapacityMessage
                            : undefined
                      }
                      onClick={canPickDay ? () => setTouchPickerDay({ dayKey: cell.key, rawStartMin: nextTodayStartMin }) : undefined}
                      className={`flex min-h-[92px] flex-col p-1.5 transition-colors ${
                        isSelectedCell
                          ? 'bg-rp-brand-tint/30 ring-1 ring-inset ring-rp-brand-border'
                          : isPastOrExhaustedDay
                            ? 'bg-gray-100/75 text-rp-text-muted/70'
                            : isCapacityDisabledDay
                              ? 'bg-slate-50/80'
                              : 'bg-white'
                      } ${canPickDay ? 'cursor-pointer hover:bg-[#FFF9FA]' : isPastOrExhaustedDay || isCapacityDisabledDay ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cell.key === anchorKey) {
                              setCalendarSubView('day');
                            } else {
                              setAnchor(cell.key);
                            }
                          }}
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11.5px] font-bold transition-all ${
                            cell.isToday && isSelectedCell
                              ? 'bg-rp-brand-pressed text-white ring-2 ring-rp-brand-border ring-offset-1'
                              : cell.isToday
                                ? 'bg-rp-brand-pressed text-white'
                                : isSelectedCell
                                  ? 'border border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                                  : cell.inCurrentMonth
                                    ? 'text-rp-text hover:bg-rp-brand-tint'
                                    : 'text-rp-text-muted hover:bg-rp-brand-tint'
                          }`}
                        >
                          {cell.dateNum}
                        </button>
                        {canPickDay && (
                          <button
                            type="button"
                            aria-label={trf('Đăng ký giờ ngày {0}', { 0: formatShortDateVn(cell.key) })}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTouchPickerDay({ dayKey: cell.key, rawStartMin: 8 * 60 });
                            }}
                            className="rounded p-0.5 text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {visible.map((ev) => {
                          const meta = getToneMeta(ev.tone);
                          const isWeeklyPendingPattern = Boolean(
                            ev.isWeeklyPattern
                            && !ev.isSelectedDraft
                            && (ev.tone === 'pending' || ev.tone === 'needsRevision')
                          );
                          const monthCardTooltip = ev.tone === 'needsRevision'
                            ? tr('Lịch đã được giữ chỗ. Mở đề xuất để chỉnh sửa.')
                            : isWeeklyPendingPattern
                              ? `${ev.fullTitle || ev.title} · ${tr('Lịch hằng tuần đang chờ duyệt — ngày khai giảng sẽ xác lập khi Quản trị viên phê duyệt')}`
                              : ev.isSelectedDraft && ev.hasVisibleDateConflict
                                ? (ev.visibleConflictTooltip || tr('Khung giờ này đã có lịch vào ngày đang xem. Hệ thống sẽ kiểm tra lại khi chọn ngày bắt đầu.'))
                                : ev.isSelectedDraft && ev.isRepresentativeProjection
                                  ? tr('Nhấn để bỏ chọn khung giờ hằng tuần.')
                                  : `${ev.fullTitle || ev.title} · ${tr(ev.statusLabel || meta.label)}`;
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              title={monthCardTooltip}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (ev.isSelectedDraft && !ev.locked) removeSelectedSlotByKey(ev.selectedKey);
                                else openEventDetail(ev);
                              }}
                              className={`flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10.5px] font-semibold ${meta.pill} ${isWeeklyPendingPattern ? 'border border-dashed' : ''}`}
                            >
                              {isWeeklyPendingPattern ? (
                                <Lock className="h-2.5 w-2.5 shrink-0 opacity-75" aria-hidden="true" />
                              ) : (
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                              )}
                              <span className="min-w-0 flex-1 truncate">{tr(ev.title)}</span>
                              {isWeeklyPendingPattern && ev.jlptLevelCode ? (
                                <span className="shrink-0 rounded bg-white/80 px-1 text-[9px] font-bold leading-tight">
                                  {ev.jlptLevelCode}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                        {overflow > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMonthDayModal({ dayKey: cell.key, items });
                            }}
                            className="block w-full px-1.5 text-left text-[10.5px] font-semibold text-rp-brand-strong"
                          >
                            {trf('+{0} lịch khác', { 0: overflow })}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST VIEW (Danh sách — Unified Registration Table with Status-Based Actions & Pagination) */}
          {displayMode === 'list' && (
            <div data-testid="schedule-list-table-view" className="bg-white">
              {/* Focused Invalid Start-Date Warning Banner (when current selection has expired start date) */}
              {proposalMode && proposalConfig?.invalidStartDateWarning && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 text-[12.5px] text-amber-950"
                >
                  <div className="flex min-w-0 items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>{tr(proposalConfig.invalidStartDateWarning.message)}</span>
                  </div>
                  {proposalConfig?.onOpenCourseInfo && (
                    <button
                      type="button"
                      onClick={() => proposalConfig.onOpenCourseInfo()}
                      className="inline-flex h-8 items-center rounded-lg border border-amber-300 bg-white px-3 text-[12px] font-semibold text-amber-900 hover:bg-amber-100/70"
                    >
                      {tr('Chọn ngày bắt đầu mới')}
                    </button>
                  )}
                </div>
              )}

              {proposalMode ? (
                <ExpandableRegistrationTable
                  rows={filteredRegistrationRows}
                  totalUnfilteredCount={registrationRows.length}
                  sortBy={regSortBy}
                  onToggleSort={(nextSortKey) => {
                    if (regSortBy === nextSortKey) {
                      setRegSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setRegSortBy(nextSortKey);
                      setRegSortDirection('asc');
                    }
                    setTablePage(1);
                  }}
                  page={tablePage}
                  pageSize={tablePageSize}
                  onPageChange={setTablePage}
                  onPageSizeChange={(nextSize) => {
                    setTablePageSize(nextSize);
                    setTablePage(1);
                  }}
                  busy={busy}
                  onContinueSelection={() => proposalConfig?.onNextStep?.()}
                  onEditSelectionSchedule={(row) => {
                    const firstOcc = row?.occurrences?.[0];
                    const firstPat = row?.weeklyPatterns?.[0];
                    const targetDay = firstOcc?.dayKey || firstPat?.dayKeyHint || row?.expectedStartDate || todayKey;
                    const targetStart = firstOcc?.startMinute ?? firstPat?.startMinute ?? 8 * 60;
                    jumpToCalendarTarget({
                      dayKey: targetDay,
                      startMin: targetStart,
                      highlightKeys: (row?.weeklyPatterns || []).map((p) => p.key),
                      statusGroup: 'selected',
                      jlptCode: row?.jlptLevelCode,
                    });
                  }}
                  capacityLocked={proposalCapacityLocked}
                  capacityLockedMessage={proposalCapacityMessage}
                  onOpenCourseInfo={() => proposalConfig?.onOpenCourseInfo?.()}
                  onClearSelection={() => (proposalConfig?.onClearAll ? proposalConfig.onClearAll() : clearAllSelectedSlots())}
                  onInspectProposal={(proposalId) => proposalConfig?.onInspectProposal?.(proposalId)}
                  onEditRevisionProposal={(proposalId) => proposalConfig?.onEditRevisionProposal?.(proposalId)}
                  onWithdrawProposal={(proposalId) => proposalConfig?.onWithdrawProposal?.(proposalId)}
                  onReregisterProposal={(proposalId) => proposalConfig?.onReregisterProposal?.(proposalId)}
                  onRequestApprovedSlotAction={(slotObj) => {
                    if (!slotObj) return;
                    const ev = calendarEvents.find((e) => Number(e.slotId) === Number(slotObj.id));
                    if (ev) setSelectedEvent(ev);
                  }}
                  onEditWeeklyPattern={(row, pat) => {
                    if (proposalSelectionBlocked || !pat) return;
                    openAdjustTimeModal({
                      isSelectedDraft: true,
                      selectedKey: pat.selectedKey || pat.key,
                      weeklyKey: pat.key,
                      dayKey: pat.dayKeyHint || todayKey,
                      startHour: Math.floor(pat.startMinute / 60),
                      startMinute: pat.startMinute % 60,
                    });
                  }}
                  onDeselectWeeklyPattern={(row, pat) => {
                    if (proposalSelectionBlocked || !pat) return;
                    const keyToRemove = pat.selectedKey || pat.key;
                    if (row?.hasValidStartDate && pat.affectedOccurrenceCount > 1) {
                      openCancelConfirmModal({
                        isSelectedDraft: true,
                        isFiniteOccurrence: true,
                        selectedKey: keyToRemove,
                        weeklyKey: pat.key,
                        weekday: pat.weekday,
                        dayKey: pat.dayKeyHint || todayKey,
                        startHour: Math.floor(pat.startMinute / 60),
                        startMinute: pat.startMinute % 60,
                        endHour: Math.floor(pat.endMinute / 60),
                        endMinute: pat.endMinute % 60,
                      });
                    } else {
                      removeSelectedSlotByKey(keyToRemove);
                    }
                  }}
                  onJumpToRegistrationOnCalendar={(row) => {
                    if (!row) return;
                    const firstOcc = row.occurrences?.[0];
                    const firstPat = row.weeklyPatterns?.[0];
                    const matchedEv = firstOcc
                      ? calendarEvents.find(
                        (e) => e.dayKey === firstOcc.dayKey
                          && (e.startHour * 60 + (e.startMinute || 0)) === firstOcc.startMinute
                          && (row.isSelectedDraft ? e.isSelectedDraft : Number(e.proposalId) === Number(row.proposalId))
                      )
                      : null;
                    jumpToCalendarTarget({
                      dayKey: firstOcc?.dayKey || firstPat?.dayKeyHint || row.expectedStartDate || todayKey,
                      startMin: firstOcc?.startMinute ?? firstPat?.startMinute ?? 8 * 60,
                      highlightKeys: row.isSelectedDraft
                        ? (row.weeklyPatterns || []).map((p) => p.key)
                        : [matchedEv?.id].filter(Boolean),
                      statusGroup: row.statusGroup,
                      jlptCode: row.jlptLevelCode,
                    });
                  }}
                  onJumpToPatternOnCalendar={(row, pat) => {
                    if (!pat) return;
                    const isUnapprovedRow = Boolean(
                      row?.isSelectedDraft || row?.status === 'PendingReview' || row?.status === 'ChangesRequested'
                    );
                    const matchingOcc = isUnapprovedRow
                      ? null
                      : (row?.occurrences || []).find((o) => o.weeklyKey === pat.key);
                    const matchedEv = matchingOcc
                      ? calendarEvents.find(
                        (e) => e.dayKey === matchingOcc.dayKey
                          && (e.startHour * 60 + (e.startMinute || 0)) === matchingOcc.startMinute
                          && (row.isSelectedDraft ? e.isSelectedDraft : Number(e.proposalId) === Number(row.proposalId))
                      )
                      : null;
                    jumpToCalendarTarget({
                      dayKey: isUnapprovedRow
                        ? (pat.dayKeyHint || todayKey)
                        : (matchingOcc?.dayKey || pat.dayKeyHint || row?.expectedStartDate || todayKey),
                      startMin: pat.startMinute,
                      highlightKeys: [matchedEv?.id, pat.key, pat.selectedKey].filter(Boolean),
                      statusGroup: row?.statusGroup,
                      jlptCode: row?.jlptLevelCode,
                    });
                  }}
                  onJumpToOccurrenceOnCalendar={(row, occ) => {
                    if (!occ) return;
                    const matchedEv = calendarEvents.find(
                      (e) => e.dayKey === occ.dayKey
                        && (e.startHour * 60 + (e.startMinute || 0)) === occ.startMinute
                        && (row?.isSelectedDraft ? e.isSelectedDraft : Number(e.proposalId) === Number(row?.proposalId))
                    );
                    jumpToCalendarTarget({
                      dayKey: occ.dayKey,
                      startMin: occ.startMinute,
                      highlightKeys: [matchedEv?.id, occ.selectedKey, occ.weeklyKey].filter(Boolean),
                      statusGroup: row?.statusGroup,
                      jlptCode: row?.jlptLevelCode,
                    });
                  }}
                />
              ) : listTableRows.length === 0 ? (
                <div className="p-8">
                  <ContextualEmptyState
                    variant="compact"
                    context="calendar"
                    illustration="calendar"
                    title={tr('Chưa có lịch đăng ký nào khớp điều kiện đang xem')}
                    description={trf('Nhấn "Đăng ký giờ", "Điền nhanh", điều chỉnh bộ lọc hoặc chuyển sang chế độ Lịch để chọn trực tiếp các khung giờ {0} phút.', { 0: durationMinutes })}
                  />
                </div>
              ) : (() => {
                const buildLegacyListRowModel = (ev) => {
                  const meta = getToneMeta(ev.tone);
                  const { eventType, eventTypeLabel, statusKey } = classifyScheduleEvent(ev, nowMs);
                  const { start, end } = minutesOfEvent(ev);
                  const mins = Math.max(end - start, durationMinutes);
                  const s = ev.slot;
                  const isFuture = s ? (backendUtcDate(s.startTime)?.getTime() || 0) > nowMs : true;

                  const canEditDirect = Boolean(ev.isSelectedDraft);
                  const canRequestChange = Boolean(
                    !proposalMode && !ev.isSelectedDraft && s && s.isApproved && !s.isDeleted && !s.isInCohort && !s.changeRequestedAt && !s.cancelRequestedAt && isFuture && onRequestChangeSlot
                  );
                  const canRequestApprovedCancel = Boolean(
                    !proposalMode && !ev.isSelectedDraft && s && s.isApproved && !s.isDeleted && !s.isInCohort && (s.bookedCount ?? 0) === 0 && !s.cancelRequestedAt && isFuture && onRequestCancelSlot
                  );
                  const canLegacyDeletePending = Boolean(
                    s && !s.isApproved && !s.rejectedAt && !s.isDeleted && (s.bookedCount ?? 0) === 0 && !s.isInCohort && onDeletePendingSlot
                  );

                  const dayPrimaryText = formatFullDayWithYearVn(ev.dayKey, todayKey);
                  const statusDisplayLabel = tr(ev.statusLabel || meta.label);

                  const primaryAction = {
                    id: 'view',
                    testId: `row-action-view-${ev.id}`,
                    label: tr('Xem'),
                    icon: Eye,
                    onClick: () => openEventDetail(ev),
                  };
                  const menuItems = [
                    {
                      id: 'view-on-calendar',
                      label: tr('Xem trên lịch'),
                      icon: CalendarDays,
                      onClick: () => handleViewOnCalendar(ev),
                    },
                  ];
                  if (canEditDirect) {
                    menuItems.push({
                      id: 'edit-time',
                      label: tr('Sửa giờ'),
                      icon: Pencil,
                      onClick: () => openAdjustTimeModal(ev),
                    });
                  }
                  if (canRequestChange) {
                    menuItems.push({
                      id: 'request-change',
                      label: tr('Yêu cầu đổi giờ'),
                      icon: Clock,
                      onClick: () => setSelectedEvent(ev),
                    });
                  }
                  if (ev.isSelectedDraft || canLegacyDeletePending || canRequestApprovedCancel) {
                    menuItems.push({
                      id: 'cancel',
                      label: ev.isSelectedDraft ? tr('Bỏ chọn') : tr('Hủy'),
                      icon: Trash2,
                      danger: true,
                      onClick: () => openCancelConfirmModal(ev),
                    });
                  }

                  return {
                    meta,
                    eventType,
                    eventTypeLabel,
                    statusKey,
                    start,
                    end,
                    mins,
                    dayPrimaryText,
                    statusDisplayLabel,
                    statusPillClass: meta.pill,
                    statusDotClass: meta.dot,
                    primaryAction,
                    menuItems,
                  };
                };

                return (
                  <>
                    {/* Mobile Compact Card List */}
                    <div className="divide-y divide-rp-line md:hidden">
                      {pagedTableRows.map((ev) => {
                        const row = buildLegacyListRowModel(ev);
                        const PrimaryIcon = row.primaryAction?.icon;
                        return (
                          <div key={`m-${ev.id}`} className="space-y-2 p-3.5 text-[13px]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-rp-text">{row.dayPrimaryText}</span>
                              <span data-status-key={row.statusKey} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.statusPillClass}`}>
                                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${row.statusDotClass}`} />
                                {row.statusDisplayLabel}
                              </span>
                            </div>
                            <p className="m-0 font-bold tabular-nums text-rp-text">
                              {clockFromMinutes(row.start)}–{clockFromMinutes(row.end)}{' '}
                              <span className="text-xs font-normal text-rp-text-muted">({trf('{0} phút', { 0: row.mins })})</span>
                            </p>
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              {row.primaryAction && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={row.primaryAction.onClick}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rp-line bg-white px-2.5 text-xs font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
                                >
                                  {PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5" />}
                                  <span>{row.primaryAction.label}</span>
                                </button>
                              )}
                              <ListRowActionMenu
                                items={row.menuItems}
                                triggerLabel={tr('Thao tác khác')}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop 5-Column Compact Table (Legacy Single-Slot Mode) */}
                    <div className="hidden max-h-[calc(100dvh-250px)] overflow-auto md:block">
                      <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
                        <thead className="sticky top-0 z-10 border-b border-rp-brand-border/80 bg-rp-table-head text-[12.5px] font-semibold text-rp-brand-strong">
                          <tr>
                            <th className="px-4 py-2.5 text-left align-middle">
                              <button
                                type="button"
                                onClick={() => toggleTableSort('nearest')}
                                className="inline-flex items-center gap-1 font-semibold text-rp-brand-strong hover:text-rp-brand-deep"
                              >
                                <span>{tr('Ngày')}</span>
                                <ArrowDownUp className="h-3 w-3 opacity-70" />
                              </button>
                            </th>
                            <th className="px-4 py-2.5 text-left align-middle">
                              <button
                                type="button"
                                onClick={() => toggleTableSort('startTime')}
                                className="inline-flex items-center gap-1 font-semibold text-rp-brand-strong hover:text-rp-brand-deep"
                              >
                                <span>{tr('Giờ dạy')}</span>
                                <ArrowDownUp className="h-3 w-3 opacity-70" />
                              </button>
                            </th>
                            <th className="px-4 py-2.5 text-center align-middle whitespace-nowrap">{tr('Loại lịch')}</th>
                            <th className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => toggleTableSort('status')}
                                className="inline-flex items-center justify-center gap-1 font-semibold text-rp-brand-strong hover:text-rp-brand-deep"
                              >
                                <span>{tr('Trạng thái')}</span>
                                <ArrowDownUp className="h-3 w-3 opacity-70" />
                              </button>
                            </th>
                            <th className="px-4 py-2.5 text-center align-middle whitespace-nowrap">{tr('Thao tác')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rp-line/70">
                          {pagedTableRows.map((ev) => {
                            const row = buildLegacyListRowModel(ev);
                            const PrimaryIcon = row.primaryAction?.icon;
                            const typeBadgeClass =
                              row.eventType === 'CohortSession'
                                ? 'border-[#F2CCD7] bg-[#FFF5F7] text-[#9E3350]'
                                : row.eventType === 'Draft'
                                  ? 'border-[#86EFAC] bg-[#F3FEF6] text-[#15803D]'
                                  : 'border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]';
                            const typeDotClass =
                              row.eventType === 'CohortSession'
                                ? 'bg-[#CE476D]'
                                : row.eventType === 'Draft'
                                  ? 'bg-[#22C55E]'
                                  : 'bg-[#0D9488]';

                            return (
                              <tr key={ev.id} data-testid={`schedule-table-row-${ev.id}`} className="transition-colors hover:bg-rp-bg-2/40">
                                <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                                  <div className="font-medium text-rp-text">{row.dayPrimaryText}</div>
                                </td>
                                <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                                  <span className="font-bold tabular-nums text-rp-text">
                                    {clockFromMinutes(row.start)}–{clockFromMinutes(row.end)}
                                  </span>
                                  <span className="ml-1.5 text-[11.5px] font-normal text-rp-text-muted">
                                    ({trf('{0} phút', { 0: row.mins })})
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeBadgeClass}`}>
                                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${typeDotClass}`} />
                                    {tr(row.eventTypeLabel)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                                  <span
                                    data-status-key={row.statusKey}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${row.statusPillClass}`}
                                  >
                                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${row.statusDotClass}`} />
                                    {row.statusDisplayLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center align-middle whitespace-nowrap">
                                  <div className="inline-flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap">
                                    {row.primaryAction && (
                                      <button
                                        type="button"
                                        data-testid={`row-action-view-${ev.id}`}
                                        disabled={busy}
                                        onClick={row.primaryAction.onClick}
                                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-rp-line bg-white px-2.5 text-[11.5px] font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
                                      >
                                        {PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5" />}
                                        <span>{row.primaryAction.label}</span>
                                      </button>
                                    )}
                                    <ListRowActionMenu
                                      items={row.menuItems}
                                      triggerLabel={tr('Thao tác khác')}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {listTableRows.length > tablePageSize && (
                      <Pagination
                        variant="sakura"
                        currentPage={safeTablePage}
                        totalPages={totalTablePages}
                        totalItems={listTableRows.length}
                        pageSize={tablePageSize}
                        pageSizeOptions={[10, 20, 50]}
                        onPageChange={setTablePage}
                        onPageSizeChange={(nextSize) => {
                          setTablePageSize(nextSize);
                          setTablePage(1);
                        }}
                        itemLabel={tr('dòng lịch')}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal ("Xác nhận lịch dạy") */}
      {confirmModalOpen && (
        <Modal
          open={confirmModalOpen}
          onClose={() => !submittingBatch && setConfirmModalOpen(false)}
          title={tr('Xác nhận lịch dạy')}
          description={trf('Kiểm tra danh sách các khung giờ {0} phút đã chọn trước khi gửi duyệt.', { 0: durationMinutes })}
          size="lg"
          footer={(
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={submittingBatch || busy || selectedSlots.length === 0}
                onClick={clearAllSelectedSlots}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{tr('Bỏ chọn tất cả')}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submittingBatch}
                  onClick={() => setConfirmModalOpen(false)}
                  className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
                >
                  {tr('Đóng')}
                </button>
                <button
                  type="button"
                  data-testid="confirm-submit-selected-slots"
                  disabled={
                    submittingBatch ||
                    busy ||
                    validSelectedSlots.length === 0 ||
                    invalidSelectedSlots.length > 0 ||
                    hasServerConflict ||
                    checkingServer
                  }
                  onClick={submitAllSelectedSlots}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {submittingBatch
                      ? tr('Đang gửi đăng ký…')
                      : trf('Gửi đăng ký ({0})', { 0: validSelectedSlots.length })}
                  </span>
                </button>
              </div>
            </div>
          )}
        >
          <div className="space-y-4">
            {/* Summary banner */}
            <div className={`rounded-xl border px-3.5 py-2.5 text-[12.5px] ${
              invalidSelectedSlots.length > 0 || hasServerConflict
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-[#F0FDF4] text-emerald-950'
            }`}>
              {invalidSelectedSlots.length > 0 ? (
                <p className="font-semibold">
                  {trf('Có {0} khung giờ bị trùng hoặc chưa đủ {1} phút nghỉ. Vui lòng xóa hoặc chỉnh lại trước khi gửi.', {
                    0: invalidSelectedSlots.length,
                    1: restMinutes,
                  })}
                </p>
              ) : hasServerConflict ? (
                <p className="font-semibold">
                  {serverConflicts[0]?.message || tr('Phát hiện trùng lịch với dữ liệu hiện tại. Vui lòng kiểm tra lại.')}
                </p>
              ) : (
                <p className="font-semibold">
                  {trf('Tất cả {0} khung giờ đã chọn đều hợp lệ (mỗi buổi {1} phút · nghỉ tối thiểu {2} phút).', {
                    0: validSelectedSlots.length,
                    1: durationMinutes,
                    2: restMinutes,
                  })}
                </p>
              )}
            </div>

            {selectedGroupsByDay.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-rp-text-muted">
                {tr('Chưa có khung giờ nào được chọn.')}
              </p>
            ) : (
              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {selectedGroupsByDay.map((group) => (
                  <div key={group.dayKey} className="rounded-xl border border-rp-line bg-white">
                    <div className="flex items-center justify-between border-b border-rp-line/70 bg-[#FAF7F9] px-3.5 py-2">
                      <span className="text-[12.5px] font-bold text-rp-text">
                        {formatFullDayVn(group.dayKey, todayKey)}
                      </span>
                      <span className="text-[11px] font-semibold text-rp-text-muted">
                        {trf('{0} khung giờ', { 0: group.items.length })}
                      </span>
                    </div>
                    <div className="divide-y divide-rp-line/60">
                      {group.items.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[12.5px]">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold tabular-nums text-rp-text">
                                {item.startClock} – {item.endClock}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                                item.valid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.valid ? tr('Hợp lệ') : tr('Cần chỉnh sửa')}
                              </span>
                            </div>
                            {!item.valid && item.reason && (
                              <p className="mt-0.5 text-[11.5px] text-red-700">{item.reason}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={trf('Xóa khung {0}', { 0: `${item.startClock}–${item.endClock}` })}
                            disabled={submittingBatch}
                            onClick={() => removeSelectedSlotByKey(item.key)}
                            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-rp-line text-rp-text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Adjust Time Modal ("Điều chỉnh giờ") */}
      {adjustingEvent && (
        <Modal
          open={Boolean(adjustingEvent)}
          onClose={() => setAdjustingEvent(null)}
          title={trf('Điều chỉnh khung giờ {0} phút', { 0: durationMinutes })}
          size="sm"
        >
          <form onSubmit={handleConfirmAdjustTime} className="space-y-4">
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <DatePicker
                size="sm"
                fullWidth
                clearable={false}
                label={tr('Ngày dạy')}
                min={todayKey}
                value={adjustDateKey}
                onChange={(iso) => { if (iso) { setAdjustDateKey(iso); setAdjustError(''); } }}
              />
              <TimeInput
                size="sm"
                required
                label={trf('Giờ bắt đầu ({0} phút)', { 0: durationMinutes })}
                value={adjustTimeClock}
                onChange={(e) => { setAdjustTimeClock(e.target.value); setAdjustError(''); }}
              />
            </div>
            {adjustError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-800">
                {adjustError}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-rp-line pt-3">
              <button
                type="button"
                onClick={() => setAdjustingEvent(null)}
                className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-bg-2"
              >
                {tr('Hủy')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-9 items-center rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
              >
                {tr('Lưu thay đổi')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Confirmation Modal ("Xác nhận hủy khung giờ") — Reads cancellationLeadHours from policy */}
      {cancelingEvent && (() => {
        const s = cancelingEvent.slot;
        const isApprovedSlot = Boolean(s?.isApproved);
        const leadHours = Number(policy?.cancellationLeadHours) || 168;
        const leadDays = Math.max(1, Math.round(leadHours / 24));
        const cancelDaysLeadOk = s
          ? ((backendUtcDate(s.startTime)?.getTime() || 0) - nowMs) >= leadHours * 3600_000
          : true;
        const wkKey = cancelingEvent.weeklyKey || cancelingEvent.selectedKey;
        const affectedRecurringCount = cancelingEvent.isSelectedDraft && proposalMode
          ? Math.max(
            1,
            selectedSlots.filter((x) => (x.weeklyKey || x.key) === wkKey).length,
            cancelingEvent.isFiniteOccurrence ? proposalDurationWeeks : 1,
          )
          : 1;
        const isRecurringDeselect = Boolean(cancelingEvent.isSelectedDraft && proposalMode && affectedRecurringCount > 1);
        const weekdayIdx = Number.isFinite(Number(cancelingEvent.weekday))
          ? Number(cancelingEvent.weekday)
          : weekdayOfDateKey(cancelingEvent.dayKey);

        return (
          <AlertDialog
            open={Boolean(cancelingEvent)}
            busy={busy}
            tone="danger"
            onCancel={() => !busy && setCancelingEvent(null)}
            onConfirm={() => {
              if (isApprovedSlot && !cancelDaysLeadOk) return;
              handleConfirmCancelEvent();
            }}
            cancelLabel="Giữ lại"
            confirmLabel={
              isRecurringDeselect
                ? trf('Bỏ chọn ({0} buổi)', { 0: affectedRecurringCount })
                : cancelingEvent.isSelectedDraft
                  ? 'Bỏ chọn'
                  : isApprovedSlot
                    ? 'Gửi yêu cầu hủy'
                    : 'Xác nhận hủy'
            }
            title={
              isRecurringDeselect
                ? 'Bỏ chọn khung giờ lặp hàng tuần?'
                : cancelingEvent.isSelectedDraft
                  ? 'Bỏ chọn khung giờ?'
                  : isApprovedSlot
                    ? 'Gửi yêu cầu hủy khung giờ đã duyệt'
                    : 'Hủy khung giờ đang chờ duyệt?'
            }
            description={
              isRecurringDeselect
                ? trf('Khung giờ này thuộc lịch lặp hàng tuần. Bỏ chọn sẽ xóa toàn bộ {0} buổi dự kiến tương ứng trong khóa học để giữ lịch {1} tuần nhất quán.', { 0: affectedRecurringCount, 1: proposalDurationWeeks })
                : cancelingEvent.isSelectedDraft
                  ? 'Khung giờ này mới đang được chọn tạm trên lịch và chưa gửi lên hệ thống. Sau khi bỏ chọn, bạn có thể chọn lại bất cứ lúc nào.'
                  : isApprovedSlot
                    ? trf('Khung giờ này đã được quản trị viên phê duyệt. Yêu cầu hủy sẽ được gửi để xem xét (cần gửi trước giờ bắt đầu ít nhất {0} ngày).', { 0: leadDays })
                    : 'Khung giờ đang chờ duyệt sẽ bị thu hồi khỏi danh sách gửi duyệt và khoảng thời gian này sẽ trống trở lại.'
            }
          >
            <div className="space-y-3 text-[13px]">
              <p className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2 font-bold text-rp-text">
                {isRecurringDeselect
                  ? `${WEEKDAY_LABEL_VI[weekdayIdx] || formatFullDayWithYearVn(cancelingEvent.dayKey, todayKey)} · ${ClockRangeText(cancelingEvent)} (${trf('{0} buổi dự kiến', { 0: affectedRecurringCount })})`
                  : `${formatFullDayWithYearVn(cancelingEvent.dayKey, todayKey)} · ${ClockRangeText(cancelingEvent)}`}
              </p>

              {isApprovedSlot && (
                <div className="pt-1">
                  <Input
                    size="sm"
                    label={tr('Lý do xin hủy (gửi quản trị viên)')}
                    value={cancelModalReason}
                    onChange={(e) => setCancelModalReason(e.target.value)}
                    maxLength={1000}
                    placeholder={tr('Nhập lý do cần hủy khung giờ này…')}
                  />
                </div>
              )}

              {isApprovedSlot && !cancelDaysLeadOk && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
                  {trf('Yêu cầu hủy lịch đã duyệt chỉ áp dụng cho các buổi cách thời điểm hiện tại ít nhất {0} ngày.', { 0: leadDays })}
                </p>
              )}

              {cancelModalError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-800">
                  {cancelModalError}
                </p>
              )}
            </div>
          </AlertDialog>
        );
      })()}

      {/* Quick Hour Picker Modal */}
      {touchPickerDay && (
        <Modal
          open={Boolean(touchPickerDay)}
          onClose={() => setTouchPickerDay(null)}
          title={trf('Chọn khung {0} phút · {1}', { 0: durationMinutes, 1: formatFullDayVn(touchPickerDay.dayKey, todayKey) })}
          description={trf('Mỗi buổi {0} phút · Nghỉ tối thiểu {1} phút giữa hai buổi', { 0: durationMinutes, 1: restMinutes })}
          size="md"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DatePicker
                size="sm"
                compact
                clearable={false}
                min={todayKey}
                value={touchPickerDay.dayKey}
                placeholder={tr('DD/MM/YYYY')}
                triggerClassName="bg-white border-rp-line shadow-2xs hover:border-[#E5B8C5]"
                onChange={(iso) => {
                  if (iso) setTouchPickerDay((cur) => ({ ...cur, dayKey: iso }));
                }}
              />
              {proposalMode && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white shadow-2xs ${
                      proposalHasErrors
                        ? 'bg-red-700'
                        : proposalScheduleReady
                          ? 'bg-emerald-700'
                          : 'bg-amber-700'
                    }`}
                  >
                    {trf('{0} buổi mỗi tuần · {1} giờ/tuần', {
                      0: proposalWeeklyCount,
                      1: proposalWeeklyHours,
                    })}
                  </span>
                  {proposalHasConflict ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
                      {trf('{0} khung cần điều chỉnh', { 0: Math.max(1, proposalInvalidPatternCount) })}
                    </span>
                  ) : proposalWeeklyCount < 1 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
                      {tr('Vui lòng chọn ít nhất một khung giờ.')}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {touchCandidates.length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-rp-line bg-[#FCF9FB] p-5 text-center text-[12.5px] text-rp-text-2">
                  <span>{trf('Ngày này không còn khung giờ {0} phút khả dụng.', { 0: durationMinutes })}</span>
                  <button
                    type="button"
                    onClick={() => setTouchPickerDay((cur) => ({ ...cur, dayKey: shiftDateKey(cur.dayKey, 1) }))}
                    className="inline-flex h-8 items-center rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong"
                  >
                    {trf('Xem ngày tiếp theo ({0})', { 0: formatShortDateVn(shiftDateKey(touchPickerDay.dayKey, 1)) })}
                  </button>
                </div>
              ) : touchCandidates.map((cand) => (
                <button
                  key={cand.startMin}
                  type="button"
                  disabled={!cand.valid && !cand.isSelected}
                  title={cand.valid ? `${cand.startClock}–${cand.endClock}` : cand.reason}
                  onClick={() => {
                    toggleOrSelectSlot(cand.dayKey, cand.startMin);
                  }}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                    cand.isSelected
                      ? 'border-emerald-500 bg-[#F0FDF4] text-emerald-950'
                      : cand.valid
                        ? 'border-rp-line bg-white hover:border-rp-brand-strong hover:bg-rp-brand-tint'
                        : 'cursor-not-allowed border-rp-line/60 bg-rp-bg-2 text-rp-text-muted opacity-55'
                  }`}
                >
                  <span className="text-[12.5px] font-bold tabular-nums">{cand.startClock}–{cand.endClock}</span>
                  <span className="mt-0.5 line-clamp-1 text-[10px]">
                    {cand.isSelected
                      ? tr('Đã chọn · Nhấn để bỏ')
                      : cand.valid
                        ? tr('Khả dụng')
                        : cand.code === 'REST_GAP'
                          ? trf('Cần nghỉ {0} phút', { 0: restMinutes })
                          : tr('Đã kín')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Month Overflow Modal */}
      {monthDayModal && (
        <Modal
          open={Boolean(monthDayModal)}
          onClose={() => setMonthDayModal(null)}
          title={formatFullDayVn(monthDayModal.dayKey, todayKey)}
          size="md"
        >
          <div className="space-y-2">
            {monthDayModal.items.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  setMonthDayModal(null);
                  if (ev.isSelectedDraft && !ev.locked) removeSelectedSlotByKey(ev.selectedKey);
                  else openEventDetail(ev);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${getToneMeta(ev.tone).card} ${
                  ev.isWeeklyPattern && !ev.isSelectedDraft && (ev.tone === 'pending' || ev.tone === 'needsRevision')
                    ? 'border-dashed'
                    : ''
                }`}
              >
                <span className="text-[13px] font-semibold">{tr(ev.title)}</span>
                <span className="text-[11px]">{tr(ev.statusLabel || '')}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Event Details Modal (with workflow-guarded actions) */}
      {selectedEvent && (
        <Modal
          open={Boolean(selectedEvent)}
          onClose={() => { setSelectedEvent(null); setActionReason(''); }}
          title={tr(selectedEvent.fullTitle || selectedEvent.title)}
          size="md"
        >
          {(() => {
            const meta = getToneMeta(selectedEvent.tone);
            const s = selectedEvent.slot;
            const isFuture = s ? (backendUtcDate(s.startTime)?.getTime() || 0) > nowMs : true;
            const canDeletePending = Boolean(!proposalMode && s && !s.isApproved && !s.rejectedAt && (s.bookedCount ?? 0) === 0 && !s.isInCohort && onDeletePendingSlot);
            const canRequestChange = Boolean(!proposalMode && s && s.isApproved && !s.isInCohort && !s.changeRequestedAt && !s.cancelRequestedAt && isFuture && onRequestChangeSlot);
            const canRequestCancel = Boolean(!proposalMode && s && s.isApproved && !s.isInCohort && (s.bookedCount ?? 0) === 0 && !s.cancelRequestedAt && isFuture && onRequestCancelSlot);
            const leadHours = Number(policy?.cancellationLeadHours) || 168;
            const leadDays = Math.max(1, Math.round(leadHours / 24));
            const cancelDaysLeadOk = s ? ((backendUtcDate(s.startTime)?.getTime() || 0) - nowMs) >= leadHours * 3600_000 : false;

            return (
              <div className="space-y-4">
                <div className={`rounded-xl p-3.5 ${meta.card}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {tr(selectedEvent.statusLabel || meta.label)}
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums">
                      {formatFullDayVn(selectedEvent.dayKey, todayKey)} · {ClockRangeText(selectedEvent)}
                    </span>
                  </div>
                  {selectedEvent.detail && <p className="mt-2 text-[12.5px]">{selectedEvent.detail}</p>}
                </div>

                {Array.isArray(selectedEvent.metaRows) && selectedEvent.metaRows.length > 0 && (
                  <dl className="grid gap-2 rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 text-[12.5px]">
                    {selectedEvent.metaRows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-3">
                        <dt className="text-rp-text-muted">{tr(row.label)}</dt>
                        <dd className="text-right font-medium text-rp-text">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {selectedEvent.locked && (
                  <p className="flex items-center gap-1.5 rounded-lg bg-rp-bg-2 px-3 py-2 text-[12px] text-rp-text-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                    {s?.isInCohort
                      ? tr('Buổi học đã xếp vào lớp nhóm. Để đổi lịch, vui lòng gửi yêu cầu dời buổi trong trang lớp phụ trách.')
                      : s?.isApproved
                        ? tr('Khung giờ đã được duyệt — bạn có thể gửi yêu cầu điều chỉnh hoặc hủy bên dưới.')
                        : tr('Thẻ lịch này đã khóa chỉnh sửa trực tiếp.')}
                  </p>
                )}

                {selectedEvent.href && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={selectedEvent.href}
                      onClick={() => { setSelectedEvent(null); setActionReason(''); }}
                      className="inline-flex h-9 items-center rounded-xl bg-rp-brand-pressed px-4 text-[12.5px] font-semibold text-white hover:bg-rp-brand-strong"
                    >
                      {tr(selectedEvent.hrefLabel || 'Mở lớp')}
                    </Link>
                  </div>
                )}

                {selectedEvent.isSelectedDraft && selectedEvent.selectedKey && !selectedEvent.locked && !proposalSelectionBlocked && (
                  <div className="flex flex-wrap gap-2 border-t border-rp-line pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        const ev = selectedEvent;
                        setSelectedEvent(null);
                        openAdjustTimeModal(ev);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                    >
                      <Clock className="h-4 w-4" /> {tr('Điều chỉnh giờ')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeSelectedSlotByKey(selectedEvent.selectedKey);
                        setSelectedEvent(null);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-[12px] font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> {tr('Bỏ chọn khung này')}
                    </button>
                  </div>
                )}

                {canDeletePending && (
                  <div className="flex flex-wrap gap-2 border-t border-rp-line pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await onDeletePendingSlot(s.id);
                        setSelectedEvent(null);
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> {tr('Hủy yêu cầu chờ duyệt')}
                    </button>
                  </div>
                )}

                {(canRequestChange || canRequestCancel) && (
                  <div className="space-y-2.5 border-t border-rp-line pt-3.5">
                    <Input
                      size="sm"
                      label={tr('Lý do gửi quản trị viên')}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      maxLength={1000}
                      placeholder={tr('Nhập lý do cần điều chỉnh hoặc hủy khung giờ…')}
                    />
                    <div className="flex flex-wrap gap-2">
                      {canRequestChange && (
                        <button
                          type="button"
                          disabled={busy || !actionReason.trim()}
                          onClick={async () => {
                            await onRequestChangeSlot(s.id, actionReason.trim());
                            setSelectedEvent(null);
                            setActionReason('');
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rp-brand-pressed px-3.5 text-[12px] font-semibold text-white hover:bg-rp-brand-strong disabled:opacity-50"
                        >
                          {tr('Gửi yêu cầu điều chỉnh')}
                        </button>
                      )}
                      {canRequestCancel && (
                        <button
                          type="button"
                          disabled={busy || !cancelDaysLeadOk || !actionReason.trim()}
                          title={!cancelDaysLeadOk ? trf('Yêu cầu hủy cần gửi trước giờ bắt đầu ít nhất {0} ngày.', { 0: leadDays }) : undefined}
                          onClick={async () => {
                            await onRequestCancelSlot(s.id, actionReason.trim());
                            setSelectedEvent(null);
                            setActionReason('');
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint disabled:opacity-50"
                        >
                          {cancelDaysLeadOk ? tr('Gửi yêu cầu hủy') : trf('Hủy (cần trước ≥ {0} ngày)', { 0: leadDays })}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t border-rp-line pt-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedEvent(null); setActionReason(''); }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3.5 text-[12.5px] font-semibold text-rp-text-2 hover:bg-rp-brand-tint"
                  >
                    <X className="h-3.5 w-3.5" /> {tr('Đóng')}
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

function ClockRangeText(ev) {
  const s = ev.startHour * 60 + (ev.startMinute || 0);
  const e = ev.endHour * 60 + (ev.endMinute || 0);
  return `${clockFromMinutes(s)}–${clockFromMinutes(e)}`;
}
