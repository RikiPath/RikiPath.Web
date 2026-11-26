import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Banner,
  Button,
  Checkbox,
  Collapsible,
  CustomSelect,
  Modal,
  Switch,
  Tabs,
  cx,
  formatIsoDateDisplay,
} from '@/components/ui';
import OnboardingStepper from '@/features/auth/components/OnboardingStepper.jsx';
import { clockFromMinutes } from '@/features/scheduling/utils/slotPlannerModel.js';
import {
  assessQuickScheduleDayFeasibility,
  buildProposalQuickFillPreview,
  recommendQuickSchedulePlans,
  resolveQuickScheduleTimeWindows,
  sortWeeklySessions,
  validateCompleteWeeklyPlan,
  validateWeeklySlotAddition,
  weekdayLabelVn,
  weeklySlotKey,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  readQuickSchedulePreferences,
  writeQuickSchedulePreferences,
} from '@/features/scheduling/utils/proposalDraftStorage.js';
import { useLocale } from '@/locales/locale.js';

const WEEKDAYS = [
  { weekday: 1, short: 'T2' },
  { weekday: 2, short: 'T3' },
  { weekday: 3, short: 'T4' },
  { weekday: 4, short: 'T5' },
  { weekday: 5, short: 'T6' },
  { weekday: 6, short: 'T7' },
  { weekday: 0, short: 'CN' },
];

const WIZARD_STEPS = [
  { id: 'frequency', stepNumber: 1, shortTitle: 'Tần suất' },
  { id: 'days', stepNumber: 2, shortTitle: 'Ngày dạy' },
  { id: 'time', stepNumber: 3, shortTitle: 'Thời gian' },
  { id: 'plans', stepNumber: 4, shortTitle: 'Lịch phù hợp' },
];

const WINDOW_TITLES = {
  Morning: 'Buổi sáng',
  Noon: 'Buổi trưa',
  Afternoon: 'Buổi chiều',
  Evening: 'Buổi tối',
};

const PLAN_KIND_LABELS = {
  best: 'Phù hợp nhất',
  alternativeTime: 'Khung giờ thay thế',
  alternativeDays: 'Ngày dạy thay thế',
  alternativeDaysAndTime: 'Ngày và giờ thay thế',
};

/** Short, translatable reasons for a locked time option (full reasons stay on the row). */
const LOCK_REASONS = {
  PROPOSAL_OWN_OVERLAP: 'Trùng buổi đã chọn',
  PROPOSAL_REST_VIOLATION: 'Quá sát lịch đã có',
  PROPOSAL_CONFLICT_PENDING_PROPOSAL: 'Trùng đề xuất đang chờ duyệt',
  PROPOSAL_CONFLICT_APPROVED_SCHEDULE: 'Trùng lịch đã xác nhận',
  PROPOSAL_DAILY_CAP_EXCEEDED: 'Vượt giới hạn buổi trong ngày',
  PROPOSAL_WEEKLY_CAP_EXCEEDED: 'Vượt giới hạn buổi trong tuần',
  PROPOSAL_MAX_SESSIONS_EXCEEDED: 'Đã đủ số buổi tối đa',
  OUT_OF_HOURS: 'Ngoài giờ cho phép',
};

function resolveLockReason(code, policy, tr, trf) {
  if (code === 'PROPOSAL_OWN_REST_VIOLATION') {
    return trf('Cần nghỉ {0} phút giữa hai buổi', { 0: Number(policy?.restMinutes ?? 15) });
  }
  return tr(LOCK_REASONS[code] || 'Không khả dụng');
}

const VISIBLE_PLAN_COUNT = 3;

function emptyPrefs() {
  return {
    targetSessionsPerWeek: null,
    preferredWeekdays: [],
    flexibleDays: false,
    allowMultiplePerDay: false,
    timeWindows: [],
  };
}

function handleRovingKeyDown(event, count, currentIndex, onSelectIndex) {
  if (!count) return;
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (currentIndex + 1) % count;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (currentIndex - 1 + count) % count;
  if (next === null) return;
  event.preventDefault();
  onSelectIndex(next);
  const radios = event.currentTarget.querySelectorAll('[role="radio"]:not([disabled])');
  radios?.[next]?.focus();
}

function ChoiceCard({ role = 'radio', selected, disabled = false, onClick, title, meta, tabIndex, className, children }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cx(
        'rp-focus relative flex w-full flex-col items-start rounded-xl border px-3.5 py-3 text-left transition-colors duration-200',
        selected
          ? 'border-rp-brand bg-rp-brand-tint/70 ring-1 ring-rp-brand-border'
          : 'border-rp-line bg-rp-surface hover:border-rp-brand-border hover:bg-rp-row-hover',
        disabled && 'cursor-not-allowed opacity-55 hover:border-rp-line hover:bg-rp-surface',
        className,
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className={cx('text-sm font-semibold', selected ? 'text-rp-brand-strong' : 'text-rp-text')}>{title}</span>
        <span
          aria-hidden="true"
          className={cx(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-rp-brand-pressed bg-rp-brand-pressed text-white' : 'border-rp-line-strong bg-rp-surface',
          )}
        >
          {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
      </span>
      {meta && <span className="mt-1 text-xs text-rp-text-muted">{meta}</span>}
      {children}
    </button>
  );
}

function StepHeading({ headingRef, title, description }) {
  return (
    <div className="mb-4">
      <h3 ref={headingRef} tabIndex={-1} className="text-[17px] font-bold leading-7 text-rp-text outline-none">{title}</h3>
      {description && <p className="mt-0.5 text-[13px] leading-5 text-rp-text-muted">{description}</p>}
    </div>
  );
}

/**
 * Smart Scheduling Wizard ("Đăng ký lịch dạy nhanh") for 10-week class proposals.
 * Three short questions → the Scheduling Core searches, validates and ranks complete weekly plans → the teacher
 * picks one, optionally adjusts it, and applies it to the current "Đang chọn" selection only after re-checking
 * the latest availability. Closing the wizard never touches the selection.
 */
export default function SmartQuickRegistrationModal({
  open,
  onClose,
  currentSessions = [],
  expectedStartDate = null,
  commitments = [],
  policy,
  availabilityReady = true,
  availabilityError = false,
  onRetryAvailability,
  onRevalidate,
  onApply,
  nowMs,
  userId = null,
  proposalId = null,
}) {
  const { tr, trf } = useLocale();
  const headingRef = useRef(null);

  const allowedCounts = useMemo(() => {
    if (Array.isArray(policy?.allowedSessionsPerWeek) && policy.allowedSessionsPerWeek.length > 0) {
      return policy.allowedSessionsPerWeek;
    }
    const min = Number(policy?.minSessionsPerWeek ?? 0);
    const max = Number(policy?.maxSessionsPerWeek ?? 0);
    if (min > 0 && max >= min) {
      return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    }
    return [];
  }, [policy?.allowedSessionsPerWeek, policy?.maxSessionsPerWeek, policy?.minSessionsPerWeek]);
  const timeWindowOptions = useMemo(() => resolveQuickScheduleTimeWindows(policy), [policy]);
  const hasExistingSelection = currentSessions.length > 0;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [prefs, setPrefs] = useState(emptyPrefs);
  const [applyMode, setApplyMode] = useState('append');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showRelaxed, setShowRelaxed] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editedEntries, setEditedEntries] = useState(null);
  const [countConfirmed, setCountConfirmed] = useState(false);
  const [applyPhase, setApplyPhase] = useState('idle'); // idle | refreshing | verified | error

  const effectiveMode = hasExistingSelection ? applyMode : 'replace';
  const keptSessions = useMemo(
    () => (effectiveMode === 'append' ? sortWeeklySessions(currentSessions) : []),
    [currentSessions, effectiveMode],
  );

  const resetResults = () => {
    setSelectedPlanId(null);
    setShowAllPlans(false);
    setShowRelaxed(false);
    setEditorOpen(false);
    setEditedEntries(null);
    setCountConfirmed(false);
    setApplyPhase('idle');
  };

  // Restore remembered answers (same teacher + proposal) every time the wizard opens; results always start fresh.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    const saved = readQuickSchedulePreferences(userId, proposalId);
    const restored = emptyPrefs();
    if (saved) {
      restored.targetSessionsPerWeek = allowedCounts.includes(saved.targetSessionsPerWeek) ? saved.targetSessionsPerWeek : null;
      restored.preferredWeekdays = saved.preferredWeekdays;
      restored.flexibleDays = saved.flexibleDays;
      restored.allowMultiplePerDay = saved.allowMultiplePerDay;
      const validIds = new Set(['any', ...timeWindowOptions.map((w) => w.id)]);
      const windows = saved.timeWindows.filter((w) => validIds.has(w));
      restored.timeWindows = windows.includes('any') ? ['any'] : windows;
    }
    setPrefs(restored);
    setApplyMode(currentSessions.length > 0 ? (saved?.applyMode || 'append') : 'replace');
    setStep(0);
    setDirection('forward');
    setSelectedPlanId(null);
    setShowAllPlans(false);
    setShowRelaxed(false);
    setEditorOpen(false);
    setEditedEntries(null);
    setCountConfirmed(false);
    setApplyPhase('idle');
  } else if (!open && wasOpen) {
    setWasOpen(false);
    setApplyPhase('idle');
  }

  useEffect(() => {
    if (!open) return;
    writeQuickSchedulePreferences(userId, proposalId, { ...prefs, applyMode });
  }, [applyMode, open, prefs, proposalId, userId]);

  useEffect(() => {
    if (open) headingRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  const updatePrefs = (patch) => {
    setPrefs((cur) => ({ ...cur, ...patch }));
    resetResults();
  };

  const changeApplyMode = (mode) => {
    setApplyMode(mode);
    resetResults();
  };

  const target = prefs.targetSessionsPerWeek;
  const neededCount = target ? Math.max(0, target - keptSessions.length) : 0;
  const totalWeeks = policy.courseDurationWeeks;
  const hoursFor = (n) => Math.round(((n * totalWeeks * policy.sessionDurationMinutes) / 60) * 10) / 10;

  const dayFeasibility = useMemo(
    () => (target
      ? assessQuickScheduleDayFeasibility({
        targetSessionsPerWeek: target,
        preferredWeekdays: prefs.preferredWeekdays,
        flexibleDays: prefs.flexibleDays,
        allowMultiplePerDay: prefs.allowMultiplePerDay,
        currentSessions,
        mode: effectiveMode,
        policy,
      })
      : null),
    [currentSessions, effectiveMode, policy, prefs.allowMultiplePerDay, prefs.flexibleDays, prefs.preferredWeekdays, target],
  );

  const stepValidity = [
    { valid: Boolean(target) && neededCount > 0 },
    { valid: Boolean(dayFeasibility?.feasible) },
    { valid: prefs.timeWindows.length > 0 },
    { valid: false },
  ];
  let furthestAccessibleStep = 0;
  while (furthestAccessibleStep < WIZARD_STEPS.length - 1 && stepValidity[furthestAccessibleStep].valid) {
    furthestAccessibleStep += 1;
  }

  const searchEnabled = open && step === 3 && availabilityReady && !availabilityError && furthestAccessibleStep >= 3;
  const searchInput = {
    targetSessionsPerWeek: target,
    preferredWeekdays: prefs.preferredWeekdays,
    flexibleDays: prefs.flexibleDays,
    allowMultiplePerDay: prefs.allowMultiplePerDay,
    timeWindows: prefs.timeWindows,
    currentSessions,
    mode: effectiveMode,
    expectedStartDate: expectedStartDate || null,
    commitments,
    policy,
    nowMs,
  };
  const searchKey = JSON.stringify({ ...searchInput, commitments: commitments.length, policy: null });
  const results = useMemo(
    () => (searchEnabled ? recommendQuickSchedulePlans(searchInput) : null),
    // searchKey captures every primitive input; commitments/policy are compared by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchEnabled, searchKey, commitments, policy],
  );
  const relaxedResults = useMemo(
    () => (searchEnabled && showRelaxed && results?.status === 'no_match'
      ? recommendQuickSchedulePlans({ ...searchInput, relaxPreferences: true })
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchEnabled, showRelaxed, results, searchKey, commitments, policy],
  );

  const activePlans = (results?.status === 'ok' ? results.plans : relaxedResults?.plans) || [];
  const showingRelaxed = results?.status !== 'ok' && Boolean(relaxedResults?.plans?.length);
  const selectedPlan = activePlans.find((p) => p.id === selectedPlanId) || null;
  const selectionLost = Boolean(selectedPlanId) && !selectedPlan && !editedEntries;
  const customized = Boolean(editedEntries);
  const entries = useMemo(
    () => editedEntries || (selectedPlan ? selectedPlan.addedSessions.map((s) => ({ weekday: s.weekday, startMinute: s.startMinute })) : []),
    [editedEntries, selectedPlan],
  );

  const finalPreview = useMemo(() => {
    if (!open || entries.length === 0) return null;
    return buildProposalQuickFillPreview({
      candidateInputs: entries,
      currentSessions,
      expectedStartDate: expectedStartDate || null,
      commitments,
      policy,
      mode: effectiveMode,
      nowMs,
    });
  }, [commitments, currentSessions, effectiveMode, entries, expectedStartDate, nowMs, open, policy]);

  const finalWhole = useMemo(
    () => (finalPreview
      ? validateCompleteWeeklyPlan({
        weeklySessions: finalPreview.resultingSessions,
        expectedStartDate: expectedStartDate || null,
        commitments,
        policy,
        nowMs,
      })
      : null),
    [commitments, expectedStartDate, finalPreview, nowMs, policy],
  );

  const finalCount = finalPreview?.resultingCount ?? 0;
  const countDiffers = Boolean(finalPreview) && finalCount !== target;
  const finalValid = Boolean(
    finalPreview?.canApply
    && finalWhole?.valid
    && availabilityReady
    && !availabilityError
    && (!countDiffers || countConfirmed),
  );

  // Apply only after the latest availability has been fetched and the final plan re-validated against it.
  useEffect(() => {
    if (!open || applyPhase !== 'verified' || !finalValid || !finalPreview) return;
    onApply(finalPreview);
  }, [applyPhase, finalPreview, finalValid, onApply, open]);

  const handleApply = async () => {
    if (!finalValid) return;
    setApplyPhase('refreshing');
    try {
      if (onRevalidate) await onRevalidate();
      setApplyPhase('verified');
    } catch {
      setApplyPhase('error');
    }
  };

  // Advanced customization ---------------------------------------------------------------------
  const editEntries = (mutator) => {
    setEditedEntries((cur) => mutator([...(cur || entries)]));
    setCountConfirmed(false);
    setApplyPhase('idle');
  };

  const othersFor = (index) => sortWeeklySessions([
    ...keptSessions,
    ...entries.filter((_, i) => i !== index),
  ]);

  const timeOptionsFor = (index) => {
    const entry = entries[index];
    const others = othersFor(index);
    const opts = [];
    const step15 = policy.gridStepMinutes || 15;
    for (let m = policy.operatingStartMinute; m + policy.sessionDurationMinutes <= policy.operatingEndMinute; m += step15) {
      const res = validateWeeklySlotAddition({
        weekday: entry.weekday,
        startMinute: m,
        currentSessions: others,
        expectedStartDate: expectedStartDate || null,
        commitments,
        policy,
        nowMs,
      });
      const isCurrent = m === entry.startMinute;
      opts.push({
        value: String(m),
        label: `${clockFromMinutes(m)}–${clockFromMinutes(m + policy.sessionDurationMinutes)}`,
        disabled: !res.valid && !isCurrent,
        description: res.valid ? undefined : resolveLockReason(res.code, policy, tr, trf),
      });
    }
    return opts;
  };

  const findNextFreeSlot = () => {
    const others = sortWeeklySessions([...keptSessions, ...entries]);
    const usualStart = entries[0]?.startMinute ?? keptSessions[0]?.startMinute ?? timeWindowOptions[0]?.defaultStartMin;
    const usedDays = new Set(others.map((s) => s.weekday));
    const prefSet = new Set(prefs.preferredWeekdays);
    const dayOrder = [
      ...WEEKDAYS.filter((d) => prefSet.has(d.weekday) && !usedDays.has(d.weekday)),
      ...WEEKDAYS.filter((d) => !prefSet.has(d.weekday) && !usedDays.has(d.weekday)),
      ...WEEKDAYS.filter((d) => usedDays.has(d.weekday)),
    ].map((d) => d.weekday);
    const starts = [];
    for (let m = policy.operatingStartMinute; m + policy.sessionDurationMinutes <= policy.operatingEndMinute; m += policy.gridStepMinutes || 15) starts.push(m);
    starts.sort((a, b) => Math.abs(a - usualStart) - Math.abs(b - usualStart));
    for (const wd of dayOrder) {
      for (const m of starts) {
        const res = validateWeeklySlotAddition({
          weekday: wd,
          startMinute: m,
          currentSessions: others,
          expectedStartDate: expectedStartDate || null,
          commitments,
          policy,
          nowMs,
        });
        if (res.valid) return { weekday: wd, startMinute: m };
      }
    }
    return null;
  };

  const rejectedByKey = useMemo(() => {
    const map = new Map();
    for (const r of finalPreview?.rejectedCandidates || []) map.set(r.key, r);
    for (const f of finalWhole?.failures || []) if (!map.has(f.key)) map.set(f.key, { ...f, alternatives: [] });
    return map;
  }, [finalPreview, finalWhole]);

  // Navigation --------------------------------------------------------------------------------
  const goToStep = (index) => {
    if (index === step || index > furthestAccessibleStep) return;
    setDirection(index > step ? 'forward' : 'backward');
    setStep(index);
  };
  const goNext = () => {
    if (!stepValidity[step]?.valid) return;
    goToStep(step + 1);
  };
  const goBack = () => goToStep(Math.max(0, step - 1));

  // Render helpers ----------------------------------------------------------------------------
  const dayName = (wd) => tr(weekdayLabelVn(wd));

  const renderFrequencyStep = () => {
    const enabledCounts = allowedCounts.filter((n) => n > keptSessions.length);
    const selectedIdx = allowedCounts.indexOf(target);
    return (
      <>
        <StepHeading
          headingRef={headingRef}
          title={tr('Bạn muốn dạy bao nhiêu buổi mỗi tuần?')}
          description={tr('Chọn tần suất phù hợp với thời gian của bạn.')}
        />
        {hasExistingSelection && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Tabs
              variant="pill"
              size="sm"
              value={applyMode}
              onChange={changeApplyMode}
              label={tr('Cách áp dụng với lịch đang chọn')}
              tabs={[
                { value: 'append', label: tr('Thêm vào lịch đang chọn') },
                { value: 'replace', label: tr('Thay thế lịch đang chọn') },
              ]}
            />
            <span className="text-xs text-rp-text-muted">
              {applyMode === 'append'
                ? trf('Đang có {0} buổi. Số buổi bạn chọn là tổng số buổi mỗi tuần sau khi áp dụng.', { 0: currentSessions.length })
                : trf('{0} buổi đang chọn sẽ được thay bằng lịch mới.', { 0: currentSessions.length })}
            </span>
          </div>
        )}
        <div
          role="radiogroup"
          aria-label={tr('Số buổi mỗi tuần')}
          className={cx(
            'grid gap-2.5',
            allowedCounts.length > 6
              ? 'max-h-[300px] grid-cols-2 overflow-y-auto pr-1 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3',
          )}
          onKeyDown={(e) => handleRovingKeyDown(e, enabledCounts.length, Math.max(0, enabledCounts.indexOf(target)), (i) => updatePrefs({ targetSessionsPerWeek: enabledCounts[i] }))}
        >
          {allowedCounts.map((n) => {
            const disabled = n <= keptSessions.length;
            return (
              <ChoiceCard
                key={n}
                selected={target === n}
                disabled={disabled}
                tabIndex={target === n || (selectedIdx < 0 && n === enabledCounts[0]) ? 0 : -1}
                onClick={() => updatePrefs({
                  targetSessionsPerWeek: n,
                  ...(n > 7 ? { allowMultiplePerDay: true } : {}),
                })}
                title={trf('{0} buổi/tuần', { 0: n })}
                meta={disabled
                  ? trf('Lịch đang chọn đã có {0} buổi', { 0: keptSessions.length })
                  : trf('{0} buổi/khóa · {1} giờ giảng dạy', { 0: n * totalWeeks, 1: hoursFor(n) })}
                className="py-3.5"
              />
            );
          })}
        </div>
        {enabledCounts.length === 0 && (
          <Banner tone="info" className="mt-4">
            {trf('Lịch đang chọn đã đủ {0} buổi/tuần. Chọn "Thay thế lịch đang chọn" để tìm lịch mới.', { 0: keptSessions.length })}
          </Banner>
        )}
        {effectiveMode === 'append' && target && neededCount > 0 && (
          <p className="mt-3 text-xs text-rp-text-2">
            {trf('Hệ thống sẽ tìm thêm {0} buổi và giữ nguyên {1} buổi đang chọn.', { 0: neededCount, 1: keptSessions.length })}
          </p>
        )}
      </>
    );
  };

  const renderDaysStep = () => {
    const selectedSet = new Set(prefs.preferredWeekdays);
    const toggleDay = (wd) => updatePrefs({
      preferredWeekdays: selectedSet.has(wd) ? prefs.preferredWeekdays.filter((d) => d !== wd) : [...prefs.preferredWeekdays, wd],
    });
    return (
      <>
        <StepHeading
          headingRef={headingRef}
          title={tr('Bạn muốn dạy vào những ngày nào?')}
          description={prefs.flexibleDays
            ? tr('Ngày đã chọn được ưu tiên. Hệ thống có thể đề xuất thêm ngày khác khi cần.')
            : tr('Hệ thống chỉ tìm lịch trong các ngày bạn chọn. Có thể chọn nhiều ngày hơn số buổi để có thêm phương án.')}
        />
        <div role="group" aria-label={tr('Ngày giảng dạy')} className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((d) => {
            const active = selectedSet.has(d.weekday);
            return (
              <button
                key={d.weekday}
                type="button"
                aria-pressed={active}
                aria-label={dayName(d.weekday)}
                onClick={() => toggleDay(d.weekday)}
                className={cx(
                  'rp-focus flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors duration-200',
                  active
                    ? 'border-rp-brand bg-rp-brand-tint/70 text-rp-brand-strong ring-1 ring-rp-brand-border'
                    : 'border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-row-hover',
                )}
              >
                {tr(d.short)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 divide-y divide-rp-line rounded-xl border border-rp-line px-3.5">
          <Switch
            fullWidth
            checked={prefs.flexibleDays}
            onCheckedChange={(v) => updatePrefs({ flexibleDays: v })}
            label="Linh hoạt ngày dạy"
            description="Cho phép đề xuất ngày khác nếu các ngày đã chọn không đủ chỗ trống."
          />
          <Switch
            fullWidth
            checked={prefs.allowMultiplePerDay}
            onCheckedChange={(v) => updatePrefs({ allowMultiplePerDay: v })}
            label="Cho phép nhiều buổi trong cùng một ngày"
            description="Mặc định mỗi ngày một buổi để phân bổ đều trong tuần."
          />
        </div>

        {dayFeasibility && !dayFeasibility.feasible && dayFeasibility.code === 'NOT_ENOUGH_DAYS' && (
          <Banner tone="warning" className="mt-4">
            {trf('Cần xếp {0} buổi nhưng các ngày đã chọn chỉ đủ cho {1} buổi. Hãy chọn thêm ngày, cho phép nhiều buổi cùng ngày hoặc bật linh hoạt ngày dạy.', {
              0: dayFeasibility.neededCount,
              1: dayFeasibility.capacity,
            })}
          </Banner>
        )}
      </>
    );
  };

  const renderTimeStep = () => {
    const toggleWindow = (id) => {
      if (id === 'any') {
        updatePrefs({ timeWindows: prefs.timeWindows.includes('any') ? [] : ['any'] });
        return;
      }
      const specific = prefs.timeWindows.filter((w) => w !== 'any');
      updatePrefs({ timeWindows: specific.includes(id) ? specific.filter((w) => w !== id) : [...specific, id] });
    };
    const flexibleRange = `${clockFromMinutes(policy.operatingStartMinute)}–${clockFromMinutes(policy.operatingEndMinute)}`;
    return (
      <>
        <StepHeading
          headingRef={headingRef}
          title={tr('Bạn thường rảnh vào thời gian nào?')}
          description={tr('Có thể chọn nhiều khoảng thời gian.')}
        />
        <div role="group" aria-label={tr('Thời gian giảng dạy')} className="grid gap-2.5 sm:grid-cols-2">
          <ChoiceCard
            role="checkbox"
            selected={prefs.timeWindows.includes('any')}
            onClick={() => toggleWindow('any')}
            title={tr('Linh hoạt')}
            meta={trf('Tìm trong mọi khung giờ được phép · {0}', { 0: flexibleRange })}
            className="sm:col-span-2"
          />
          {timeWindowOptions.map((w) => (
            <ChoiceCard
              key={w.id}
              role="checkbox"
              selected={prefs.timeWindows.includes(w.id)}
              onClick={() => toggleWindow(w.id)}
              title={tr(WINDOW_TITLES[w.id])}
              meta={w.rangeLabel}
            />
          ))}
        </div>
      </>
    );
  };

  const renderSummary = () => {
    const count = finalPreview ? finalCount : target;
    const addCount = finalPreview ? finalPreview.validCandidates.length : neededCount;
    return (
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-rp-bg-2 px-3.5 py-2.5 text-[13px]">
        <span className="font-semibold text-rp-text">
          {trf('{0} buổi/tuần · {1} buổi/khóa · {2} giờ giảng dạy', { 0: count, 1: count * totalWeeks, 2: hoursFor(count) })}
        </span>
        {effectiveMode === 'append' && keptSessions.length > 0 && (
          <span className="text-rp-text-2">{trf('Giữ {0} buổi đang chọn · thêm {1} buổi', { 0: keptSessions.length, 1: addCount })}</span>
        )}
        {effectiveMode === 'replace' && hasExistingSelection && (
          <span className="text-rp-text-2">{trf('Thay thế {0} buổi đang chọn', { 0: currentSessions.length })}</span>
        )}
      </div>
    );
  };

  const renderAvailabilityNote = (plans) => {
    if (!plans.length) return null;
    const scopePlan = selectedPlan || plans[0];
    const full = (finalWhole ? finalWhole.validationScope : scopePlan.validationScope) === 'full';
    return (
      <p className="mb-3 flex items-start gap-1.5 text-xs text-rp-text-2">
        <CalendarCheck aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0 text-rp-success" />
        <span>
          {full
            ? trf('Đã kiểm tra trùng lịch cho cả {0} tuần từ ngày bắt đầu {1}.', { 0: totalWeeks, 1: formatIsoDateDisplay(expectedStartDate) })
            : trf('Khả dụng sơ bộ theo lịch tuần. Chọn ngày bắt đầu trong thông tin lớp để kiểm tra đủ {0} tuần.', { 0: totalWeeks })}
        </span>
      </p>
    );
  };

  const renderPlanCard = (plan, index, list) => {
    const selected = plan.id === selectedPlanId;
    const added = new Set(plan.addedSessions.map((s) => s.key));
    const selectedIndex = list.findIndex((p) => p.id === selectedPlanId);
    return (
      <ChoiceCard
        key={plan.id}
        selected={selected}
        tabIndex={selected || (selectedIndex < 0 && index === 0) ? 0 : -1}
        onClick={() => {
          setSelectedPlanId(plan.id);
          setEditedEntries(null);
          setCountConfirmed(false);
          setApplyPhase('idle');
        }}
        title={(
          <span className="flex flex-col">
            <span>{trf('Phương án {0}', { 0: index + 1 })}</span>
            <span className="text-xs font-medium text-rp-text-muted">{tr(PLAN_KIND_LABELS[plan.kind] || PLAN_KIND_LABELS.alternativeDaysAndTime)}</span>
          </span>
        )}
      >
        <ul className="mt-2.5 w-full space-y-1">
          {plan.resultingSessions.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2 text-[13px]">
              <span className={cx('font-medium', added.has(s.key) ? 'text-rp-text' : 'text-rp-text-muted')}>{dayName(s.weekday)}</span>
              <span className={cx('tabular-nums', added.has(s.key) ? 'text-rp-text' : 'text-rp-text-muted')}>
                {s.startClock}–{s.endClock}
                {!added.has(s.key) && <span className="ml-1 text-[11px]">{tr('(đang chọn)')}</span>}
              </span>
            </li>
          ))}
        </ul>
        {(plan.differences.offPreferenceDays.length > 0 || plan.differences.offPreferenceTimes.length > 0) && (
          <span className="mt-2 block text-xs text-rp-warning">
            {plan.differences.offPreferenceDays.length > 0 && (
              <span className="block">{trf('Ngoài ngày bạn chọn: {0}', { 0: plan.differences.offPreferenceDays.map(dayName).join(', ') })}</span>
            )}
            {plan.differences.offPreferenceTimes.length > 0 && (
              <span className="block">{trf('Ngoài khung giờ bạn chọn: {0}', { 0: plan.differences.offPreferenceTimes.map((t) => `${dayName(t.weekday)} ${t.startClock}`).join(', ') })}</span>
            )}
          </span>
        )}
        {plan.startDateMismatch && (
          <span className="mt-2 block text-xs text-rp-text-muted">
            {trf('Ngày bắt đầu {0} không rơi vào ngày dạy của phương án này nên mới kiểm tra sơ bộ.', { 0: formatIsoDateDisplay(expectedStartDate) })}
          </span>
        )}
      </ChoiceCard>
    );
  };

  const renderNoMatch = () => {
    const relaxations = results?.relaxations || [];
    const fewer = relaxations.find((r) => r.startsWith('fewerSessions:'));
    return (
      <div className="rounded-xl border border-dashed border-rp-line-strong px-4 py-5 text-center">
        <p className="text-sm font-semibold text-rp-text">{tr('Chưa tìm được lịch phù hợp với tất cả lựa chọn của bạn.')}</p>
        <p className="mx-auto mt-1 max-w-[520px] text-[13px] text-rp-text-muted">
          {tr('Các khung giờ trống không đáp ứng đủ số buổi, ngày dạy và thời gian bạn chọn. Hãy thử một trong các cách sau.')}
        </p>
        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          {relaxations.includes('flexibleDays') && (
            <Button size="sm" variant="outline" onClick={() => updatePrefs({ flexibleDays: true })}>{tr('Linh hoạt ngày dạy')}</Button>
          )}
          {relaxations.includes('anyTime') && (
            <Button size="sm" variant="outline" onClick={() => updatePrefs({ timeWindows: ['any'] })}>{tr('Mở rộng thời gian giảng dạy')}</Button>
          )}
          {relaxations.includes('allowMultiplePerDay') && (
            <Button size="sm" variant="outline" onClick={() => updatePrefs({ allowMultiplePerDay: true })}>{tr('Cho phép nhiều buổi cùng ngày')}</Button>
          )}
          {fewer && (
            <Button size="sm" variant="outline" onClick={() => updatePrefs({ targetSessionsPerWeek: Number(fewer.split(':')[1]) })}>
              {trf('Đổi thành {0} buổi/tuần', { 0: Number(fewer.split(':')[1]) })}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => goToStep(1)}>{tr('Điều chỉnh ngày ưu tiên')}</Button>
          <Button size="sm" variant="ghost" onClick={() => goToStep(2)}>{tr('Điều chỉnh thời gian')}</Button>
          {!showRelaxed && (
            <Button size="sm" variant="ghost" onClick={() => setShowRelaxed(true)}>{tr('Xem các phương án linh hoạt')}</Button>
          )}
        </div>
        {showRelaxed && relaxedResults && relaxedResults.plans.length === 0 && (
          <p className="mt-3 text-xs text-rp-text-muted">{tr('Tuần này không còn đủ khung giờ trống cho số buổi đã chọn, kể cả khi đổi ngày và giờ.')}</p>
        )}
      </div>
    );
  };

  const renderEditor = () => {
    const canAddMore = finalCount < policy.maxSessionsPerWeek;
    const nextFree = canAddMore ? findNextFreeSlot() : null;
    return (
      <div className="mt-3 space-y-2 border-t border-rp-line pt-3">
        {entries.map((entry, index) => {
          const key = weeklySlotKey(entry.weekday, entry.startMinute);
          const rejected = rejectedByKey.get(key);
          return (
            <div key={`${index}-${key}`} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-[132px]">
                  <CustomSelect
                    size="sm"
                    value={String(entry.weekday)}
                    aria-label={trf('Ngày dạy của ca {0}', { 0: index + 1 })}
                    onChange={(val) => editEntries((list) => list.map((e, i) => (i === index ? { ...e, weekday: Number(val) } : e)))}
                    options={WEEKDAYS.map((d) => ({ value: String(d.weekday), label: dayName(d.weekday) }))}
                  />
                </div>
                <div className="w-[176px]">
                  <CustomSelect
                    size="sm"
                    value={String(entry.startMinute)}
                    aria-label={trf('Giờ dạy của ca {0}', { 0: index + 1 })}
                    onChange={(val) => editEntries((list) => list.map((e, i) => (i === index ? { ...e, startMinute: Number(val) } : e)))}
                    options={timeOptionsFor(index)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  aria-label={trf('Bỏ ca {0}', { 0: index + 1 })}
                  onClick={() => editEntries((list) => list.filter((_, i) => i !== index))}
                />
              </div>
              {rejected && rejected.code !== 'ALREADY_SELECTED' && (
                <div className="text-xs text-rp-danger">
                  <p>{resolveLockReason(rejected.code, policy, tr, trf)}{rejected.reason ? ` — ${rejected.reason}` : ''}</p>
                  {rejected.alternatives?.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-rp-text-2">{tr('Khung giờ thay thế:')}</span>
                      {rejected.alternatives.slice(0, 3).map((alt) => (
                        <button
                          key={alt.key}
                          type="button"
                          onClick={() => editEntries((list) => list.map((e, i) => (i === index ? { weekday: alt.weekday, startMinute: alt.startMinute } : e)))}
                          className="rp-focus rounded-lg border border-rp-success-line bg-rp-success-bg px-2 py-0.5 font-semibold text-rp-success hover:brightness-95"
                        >
                          {alt.sameDay ? alt.label : `${dayName(alt.weekday)} · ${alt.startClock}–${alt.endClock}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {rejected?.code === 'ALREADY_SELECTED' && (
                <p className="text-xs text-rp-text-muted">{tr('Khung giờ này đã có trong lịch đang chọn.')}</p>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            disabled={!nextFree}
            onClick={() => nextFree && editEntries((list) => [...list, nextFree])}
          >
            {tr('Thêm ca')}
          </Button>
          {customized && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setEditedEntries(null); setCountConfirmed(false); }}>
              {tr('Khôi phục phương án')}
            </Button>
          )}
          {!canAddMore && (
            <span className="text-xs text-rp-text-muted">{trf('Đã đạt tối đa {0} buổi/tuần.', { 0: policy.maxSessionsPerWeek })}</span>
          )}
          {canAddMore && !nextFree && (
            <span className="text-xs text-rp-text-muted">{tr('Không còn khung giờ trống để thêm ca.')}</span>
          )}
        </div>
      </div>
    );
  };

  const renderPlansStep = () => {
    if (availabilityError) {
      return (
        <>
          <StepHeading headingRef={headingRef} title={tr('Lịch dạy phù hợp')} />
          <Banner
            tone="danger"
            title="Không thể tải lịch bận để kiểm tra"
            actions={onRetryAvailability ? <Button size="sm" variant="outline" onClick={onRetryAvailability}>{tr('Thử lại')}</Button> : null}
          >
            {tr('Các lựa chọn của bạn vẫn được giữ. Vui lòng thử lại để xem lịch phù hợp.')}
          </Banner>
        </>
      );
    }
    if (!availabilityReady || !results) {
      return (
        <>
          <StepHeading headingRef={headingRef} title={tr('Lịch dạy phù hợp')} />
          <Banner tone="info">{tr('Đang kiểm tra lịch bận của bạn…')}</Banner>
        </>
      );
    }
    const visiblePlans = showAllPlans ? activePlans : activePlans.slice(0, VISIBLE_PLAN_COUNT);
    const hasMore = activePlans.length > VISIBLE_PLAN_COUNT && !showAllPlans;
    return (
      <>
        <StepHeading
          headingRef={headingRef}
          title={tr('Lịch dạy phù hợp')}
          description={activePlans.length > 0 ? tr('Chọn một phương án. Bạn có thể điều chỉnh từng ca trước khi áp dụng.') : null}
        />
        {renderSummary()}

        {selectionLost && (
          <Banner tone="warning" className="mb-3">
            {tr('Phương án bạn chọn vừa có khung giờ không còn trống. Hãy chọn lại một phương án bên dưới.')}
          </Banner>
        )}
        {applyPhase === 'verified' && !finalValid && (
          <Banner tone="warning" className="mb-3">
            {tr('Lịch vừa thay đổi nên phương án này không còn hợp lệ. Hãy chọn phương án khác hoặc điều chỉnh lịch.')}
          </Banner>
        )}
        {applyPhase === 'error' && (
          <Banner tone="danger" className="mb-3">
            {tr('Không thể kiểm tra lại lịch mới nhất. Lịch chưa được áp dụng, vui lòng thử lại.')}
          </Banner>
        )}

        {results.status === 'ok' || showingRelaxed ? (
          <>
            {showingRelaxed && (
              <p className="mb-3 text-xs text-rp-warning">
                {tr('Không có lịch khớp hoàn toàn. Các phương án dưới đây khác một phần lựa chọn của bạn — hãy xem kỹ trước khi chọn.')}
              </p>
            )}
            {renderAvailabilityNote(activePlans)}
            <div
              role="radiogroup"
              aria-label={tr('Phương án lịch dạy')}
              className="grid gap-2.5 sm:grid-cols-3"
              onKeyDown={(e) => handleRovingKeyDown(e, visiblePlans.length, Math.max(0, visiblePlans.findIndex((p) => p.id === selectedPlanId)), (i) => {
                setSelectedPlanId(visiblePlans[i].id);
                setEditedEntries(null);
                setCountConfirmed(false);
                setApplyPhase('idle');
              })}
            >
              {visiblePlans.map((plan, i) => renderPlanCard(plan, i, visiblePlans))}
            </div>
            {hasMore && (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowAllPlans(true)}>
                {trf('Xem thêm phương án ({0})', { 0: activePlans.length - VISIBLE_PLAN_COUNT })}
              </Button>
            )}

            {(selectedPlan || customized) && (
              <div className="mt-4 rounded-xl border border-rp-line px-3.5 py-2.5">
                <button
                  type="button"
                  aria-expanded={editorOpen}
                  onClick={() => setEditorOpen((v) => !v)}
                  className="rp-focus flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-sm font-semibold text-rp-text"
                >
                  <span>
                    {tr('Điều chỉnh lịch')}
                    {customized && <span className="ml-2 text-xs font-medium text-rp-text-muted">{tr('Đã điều chỉnh')}</span>}
                  </span>
                  <ChevronDown aria-hidden="true" className={cx('h-4 w-4 text-rp-text-muted transition-transform duration-200', editorOpen && 'rotate-180')} />
                </button>
                <Collapsible open={editorOpen}>{renderEditor()}</Collapsible>
              </div>
            )}

            {countDiffers && finalCount > 0 && (
              <div className="mt-3 space-y-2">
                <Banner tone="warning">
                  {trf('Lịch sau điều chỉnh có {0} buổi/tuần, khác với {1} buổi/tuần bạn chọn ban đầu.', { 0: finalCount, 1: target })}
                </Banner>
                {allowedCounts.includes(finalCount) ? (
                  <Checkbox
                    checked={countConfirmed}
                    onChange={(e) => setCountConfirmed(e.target.checked)}
                    label={trf('Tôi muốn áp dụng {0} buổi/tuần', { 0: finalCount })}
                  />
                ) : (
                  <p className="text-xs text-rp-danger">{trf('Đề xuất mở lớp cần từ {0} đến {1} buổi/tuần.', { 0: policy.minSessionsPerWeek, 1: policy.maxSessionsPerWeek })}</p>
                )}
              </div>
            )}
          </>
        ) : renderNoMatch()}
      </>
    );
  };

  const stepContent = [renderFrequencyStep, renderDaysStep, renderTimeStep, renderPlansStep][step]();

  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      {step === 0 ? (
        <Button variant="secondary" onClick={onClose}>{tr('Hủy')}</Button>
      ) : (
        <Button variant="secondary" icon={ArrowLeft} disabled={applyPhase === 'refreshing'} onClick={goBack}>{tr('Quay lại')}</Button>
      )}
      {step < 2 && (
        <Button size="lg" iconRight={ArrowRight} disabled={!stepValidity[step].valid} onClick={goNext}>{tr('Tiếp tục')}</Button>
      )}
      {step === 2 && (
        <Button size="lg" iconRight={ArrowRight} disabled={!stepValidity[2].valid} onClick={goNext}>{tr('Tìm lịch phù hợp')}</Button>
      )}
      {step === 3 && (
        <Button
          size="lg"
          icon={CalendarCheck}
          loading={applyPhase === 'refreshing'}
          disabled={!finalValid || applyPhase === 'refreshing'}
          onClick={handleApply}
        >
          {tr('Áp dụng lịch dạy')}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="wizard"
      title={tr('Đăng ký lịch dạy nhanh')}
      footer={footer}
      subheader={(
        <OnboardingStepper
          steps={WIZARD_STEPS}
          currentStepIndex={step}
          furthestAccessibleStep={furthestAccessibleStep}
          stepValidity={stepValidity}
          onSelectStep={goToStep}
          progressLabel="Tiến trình đăng ký lịch dạy"
          navLabel="Các bước đăng ký lịch dạy"
        />
      )}
    >
      <div className="min-h-[min(380px,52vh)] overflow-x-hidden">
        <div key={step} className={direction === 'forward' ? 'rp-onboarding-step-forward' : 'rp-onboarding-step-backward'}>
          {stepContent}
        </div>
      </div>
    </Modal>
  );
}
