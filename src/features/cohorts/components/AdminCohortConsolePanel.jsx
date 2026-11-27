import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  X,
} from 'lucide-react';
import {
  Button,
  ContextualEmptyState,
  CustomSelect,
  Drawer,
  SearchInput,
  UserAvatar,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatusBadge,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { schedulePatternText } from '@/features/cohorts/utils/cohortCardModel.js';
import OccupancyProgressBar from './OccupancyProgressBar.jsx';
import ProposalDetailedScheduleCard from '@/features/scheduling/components/ProposalDetailedScheduleCard.jsx';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import { mapCohortSessionsToOccurrences } from '@/features/scheduling/utils/proposalScheduleFormatters.js';
import { formatTuitionVnd } from '@/features/scheduling/utils/proposalValidation.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import {
  CLASS_LIFECYCLE_STATUSES,
  computeClassProgress,
  isConfirmedClassEnrollment,
  resolveClassLifecycleStatus,
  resolveWorkScheduleSessionStatus,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import { formatDate } from '@/utils/dateTimeFormat.js';
import { formatVnDateTime, parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const fmtDateOnly = (v) => (v ? formatDate(v, '—') : '—');
const fmtDateTime = (v) => (v ? formatVnDateTime(v, '—') : '—');

function isActivePaymentHold(course, nowMs = Date.now()) {
  if (!course) return false;
  if (course.paymentStatus !== 'Pending' || course.status !== 'PendingPayment') return false;
  if (!course.paymentExpiresAt) return true;
  const expiresMs = parseUtcDate(course.paymentExpiresAt)?.getTime() ?? 0;
  return expiresMs > nowMs;
}

function buildCleanCohortRoster(cohortCourses = [], nowMs = Date.now()) {
  const byLearner = new Map();
  for (const course of cohortCourses) {
    if (!course) continue;
    const confirmed = isConfirmedClassEnrollment(course);
    const pendingHold = !confirmed && isActivePaymentHold(course, nowMs);
    if (!confirmed && !pendingHold) continue;

    const tier = confirmed ? 0 : 1;
    const key = course.learnerId ?? `course-${course.id}`;
    const existing = byLearner.get(key);
    if (!existing) {
      byLearner.set(key, { course, tier });
      continue;
    }

    if (tier < existing.tier || (tier === existing.tier && Number(course.id) > Number(existing.course.id))) {
      byLearner.set(key, { course, tier });
    }
  }

  return [...byLearner.values()]
    .sort((a, b) => a.tier - b.tier || Number(b.course.id) - Number(a.course.id))
    .map((entry) => entry.course);
}

const SESSION_TONE_META = Object.freeze({
  upcoming: { label: 'Sắp diễn ra', tone: 'neutral' },
  session: { label: 'Sắp diễn ra', tone: 'neutral' },
  live: { label: 'Đang diễn ra', tone: 'warning' },
  completed: { label: 'Đã hoàn thành', tone: 'success' },
  present: { label: 'Đã hoàn thành', tone: 'success' },
  overdue_unhandled: { label: 'Chờ xác nhận', tone: 'warning' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
});

function mergeCohortSessions(cohort, enrolledCourses = []) {
  const repCourse = enrolledCourses.find((c) => Array.isArray(c.sessions) && c.sessions.length > 0) || null;
  const repByNumber = new Map(
    (repCourse?.sessions || []).map((s) => [Number(s.number), s]),
  );

  return [...(cohort.sessions || [])]
    .sort((a, b) => Number(a.number) - Number(b.number))
    .map((s) => {
      const rep = repByNumber.get(Number(s.number));
      const status = rep?.status || (cohort.status === 'Cancelled' ? 'Cancelled' : 'Scheduled');
      return {
        ...s,
        scheduledAt: s.startTime || rep?.scheduledAt,
        status,
        sessionCompleted: cohort.status === 'Completed'
          || Boolean(s.sessionCompleted)
          || Boolean(rep?.confirmedAt)
          || status === 'Completed'
          || status === 'Present'
          || status === 'Absent'
          || status === 'ExcusedAbsent',
      };
    });
}

function enrichCohortRow(cohort, allCourses = [], nowMs = Date.now()) {
  const cohortCourses = allCourses.filter((c) => Number(c.cohortId) === Number(cohort.id));
  const rosterCourses = buildCleanCohortRoster(cohortCourses, nowMs);
  const confirmedCourses = rosterCourses.filter(isConfirmedClassEnrollment);
  const activeHoldCourses = rosterCourses.filter((c) => !isConfirmedClassEnrollment(c));

  // Authoritative net tuition collection strictly from paid monetary orders (never seats * price or holds).
  const monetaryOrders = cohortCourses.filter(
    (c) => Number(c.amount || 0) > 0 && !c.retakeOfId && !c.transferredFromCourseId,
  );
  const settledOrders = monetaryOrders.filter(
    (c) => c.status !== 'PaymentReview'
      && (c.paymentStatus === 'Paid' || c.paymentStatus === 'PartiallyRefunded' || c.paymentStatus === 'Refunded'),
  );
  const fallbackGrossCollected = settledOrders.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const fallbackTotalRefunded = settledOrders.reduce((sum, c) => {
    const amt = Number(c.amount || 0);
    const refunded = Number(c.refundedAmount || 0);
    if (c.paymentStatus === 'Refunded') return sum + (refunded > 0 ? Math.min(refunded, amt) : amt);
    if (c.paymentStatus === 'PartiallyRefunded') return sum + Math.max(0, Math.min(refunded, amt));
    return sum;
  }, 0);
  const fallbackNetCollected = Math.max(0, fallbackGrossCollected - fallbackTotalRefunded);

  const mergedSessions = mergeCohortSessions(cohort, confirmedCourses);
  const confirmedCount = cohort.confirmedEnrolledCount ?? confirmedCourses.length;
  const pendingHolds = cohortCourses.length > 0 ? activeHoldCourses.length : (cohort.pendingHoldCount ?? 0);
  const progress = computeClassProgress(mergedSessions, cohort.totalSessions || mergedSessions.length);
  const lifecycle = resolveClassLifecycleStatus({
    cohortStatus: cohort.status,
    confirmedEnrolledCount: confirmedCount,
    enrolledCount: cohort.enrolledCount ?? confirmedCount,
    capacity: cohort.capacitySnapshot || cohort.capacity,
    maxLearners: cohort.capacitySnapshot || cohort.capacity || cohort.maxLearners,
    startsAt: cohort.startsAt,
    enrollmentClosesAtUtc: cohort.enrollmentClosesAtUtc ?? null,
    enrollmentClosedAtUtc: cohort.enrollmentClosedAtUtc ?? null,
    totalSessions: cohort.totalSessions || mergedSessions.length,
    sessions: mergedSessions,
    enrolledCourses: confirmedCourses,
    nowMs,
  });

  return {
    ...cohort,
    lifecycle,
    progress,
    mergedSessions,
    cohortCourses,
    rosterCourses,
    confirmedCourses,
    confirmedCount,
    pendingHolds,
    tuitionPerLearner: cohort.tuitionPerLearner ?? cohort.price ?? 0,
    totalCollectedAmount: cohort.totalCollectedAmount ?? fallbackNetCollected,
    grossCollectedAmount: cohort.grossCollectedAmount ?? fallbackGrossCollected,
    totalRefundedAmount: cohort.totalRefundedAmount ?? fallbackTotalRefunded,
    scheduleSummary: schedulePatternText(cohort.schedulePattern, cohort.sessions),
  };
}

export default function AdminCohortConsolePanel({
  cohorts = [],
  courses = [],
  initialCohortId = null,
  groupPolicy = null,
  toolbarTabs = null,
  onRefresh = null,
  refreshing = false,
  busy = false,
  fillHeight = false,
}) {
  const { tr, trf, fmt } = useLocale();
  const fmtCollectedVnd = (v) => `${Math.max(0, Math.round(Number(v) || 0)).toLocaleString(fmt.tag)} đ`;

  const [cohortSearch, setCohortSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [detailCohortId, setDetailCohortId] = useState(null);
  const [appliedInitialCohortId, setAppliedInitialCohortId] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const expiredSyncedIdsRef = useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Tự động loại bỏ giữ chỗ hết hạn đúng thời điểm trên UI và làm mới dữ liệu từ máy chủ không cần F5.
  useEffect(() => {
    const now = Date.now();
    let hasNewlyExpired = false;
    let earliestExpiryMs = Infinity;

    for (const c of courses) {
      if (!c || c.paymentStatus !== 'Pending' || !c.paymentExpiresAt) continue;
      const expMs = parseUtcDate(c.paymentExpiresAt)?.getTime();
      if (!Number.isFinite(expMs)) continue;
      if (expMs <= now) {
        if (!expiredSyncedIdsRef.current.has(c.id)) {
          expiredSyncedIdsRef.current.add(c.id);
          hasNewlyExpired = true;
        }
      } else if (expMs < earliestExpiryMs) {
        earliestExpiryMs = expMs;
      }
    }

    if (hasNewlyExpired && onRefresh) {
      onRefresh();
    }

    if (!Number.isFinite(earliestExpiryMs)) return undefined;
    const delayMs = Math.max(150, earliestExpiryMs - now + 200);
    const timeoutId = setTimeout(() => {
      setNowMs(Date.now());
      onRefresh?.();
    }, delayMs);
    return () => clearTimeout(timeoutId);
  }, [courses, nowMs, onRefresh]);

  const enrichedCohorts = useMemo(
    () => cohorts.map((c) => enrichCohortRow(c, courses, nowMs)),
    [cohorts, courses, nowMs],
  );

  useEffect(() => {
    if (!initialCohortId || appliedInitialCohortId || cohorts.length === 0) return undefined;
    const match = cohorts.find((c) => String(c.id) === String(initialCohortId));
    if (!match) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setAppliedInitialCohortId(true);
      setDetailCohortId(match.id);
    });
    return () => {
      alive = false;
    };
  }, [initialCohortId, appliedInitialCohortId, cohorts]);

  const detailCohort = useMemo(
    () => (detailCohortId != null ? enrichedCohorts.find((c) => c.id === detailCohortId) || null : null),
    [enrichedCohorts, detailCohortId],
  );

  const detailScheduleOccurrences = useMemo(() => {
    if (!detailCohort || detailCohort.mergedSessions.length === 0) return [];
    return mapCohortSessionsToOccurrences(detailCohort.mergedSessions, {
      fallbackDurationMinutes: detailCohort.sessionMinutes,
      resolveStatus: (s, { startDate, endDate }) => {
        const sessionMeta = resolveWorkScheduleSessionStatus({
          status: s.status,
          cohortStatus: detailCohort.status,
          sessionCompleted: s.sessionCompleted,
          isSessionLive: Boolean(s.isSessionLive),
          sessionStartedAtUtc: s.sessionStartedAtUtc || null,
          startMs: startDate ? startDate.getTime() : NaN,
          endMs: endDate ? endDate.getTime() : NaN,
          nowMs,
        });
        return SESSION_TONE_META[sessionMeta.id] || SESSION_TONE_META.upcoming;
      },
    });
  }, [detailCohort, nowMs]);

  const levelOptions = useMemo(() => {
    const levels = [...new Set(cohorts.map((c) => String(c.level || '').trim()).filter(Boolean))].sort();
    return [
      { value: 'ALL', label: tr('Tất cả') },
      ...levels.map((lvl) => ({ value: lvl, label: formatJlptLevel(lvl) })),
    ];
  }, [cohorts, tr]);

  const mentorOptions = useMemo(() => {
    const byId = new Map();
    for (const c of cohorts) {
      if (!c.mentorId) continue;
      const key = String(c.mentorId);
      if (!byId.has(key)) {
        byId.set(key, c.mentorName || tr('Giáo viên'));
      }
    }
    const sorted = [...byId.entries()]
      .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'vi'))
      .map(([value, label]) => ({ value, label }));
    return [
      { value: 'ALL', label: tr('Tất cả') },
      ...sorted,
    ];
  }, [cohorts, tr]);

  const filteredCohorts = useMemo(() => {
    const q = cohortSearch.trim().toLowerCase();
    return enrichedCohorts.filter((c) => {
      if (lifecycleFilter !== 'ALL' && c.lifecycle?.id !== lifecycleFilter) return false;
      if (levelFilter !== 'ALL' && String(c.level || '').trim().toUpperCase() !== levelFilter.toUpperCase()) return false;
      if (mentorFilter !== 'ALL' && String(c.mentorId || '') !== String(mentorFilter)) return false;
      if (!q) return true;
      return (
        String(c.name || '').toLowerCase().includes(q)
        || String(c.level || '').toLowerCase().includes(q)
        || String(c.mentorName || '').toLowerCase().includes(q)
        || String(c.scheduleSummary || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedCohorts, cohortSearch, lifecycleFilter, levelFilter, mentorFilter]);

  const columns = [
    {
      key: 'name',
      header: tr('Lớp học'),
      sortValue: (row) => row.name || '',
      render: (row) => (
        <div className="min-w-[200px] space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {row.level && (
              <>
                <span className="shrink-0 text-[13px] font-semibold text-rp-text">{row.level}</span>
                <span aria-hidden="true" className="text-rp-text-muted">·</span>
              </>
            )}
            <button
              type="button"
              onClick={() => setDetailCohortId(row.id)}
              title={row.name}
              className="rp-focus block max-w-[260px] truncate rounded text-left text-[14px] font-semibold text-rp-text transition-colors hover:text-[#C84666]"
            >
              {row.name}
            </button>
          </div>
          <div className="text-[12.5px] tabular-nums text-rp-text-muted">
            {fmtDateOnly(row.startsAt)} – {fmtDateOnly(row.endsAt)}
            {row.progress.totalSessions > 0 && ` · ${trf('{0} buổi', { 0: row.progress.totalSessions })}`}
          </div>
        </div>
      ),
    },
    {
      key: 'mentorName',
      header: tr('Giáo viên'),
      align: 'left',
      sortValue: (row) => row.mentorName || '',
      render: (row) => (
        <span className="text-sm font-medium text-rp-text-2">{row.mentorName || tr('Giáo viên')}</span>
      ),
    },
    {
      key: 'schedule',
      header: tr('Lịch học hàng tuần'),
      align: 'center',
      render: (row) => (
        <div className="mx-auto max-w-[300px]">
          <WeeklyScheduleDisplay
            schedulePattern={row.schedulePattern}
            sessions={row.sessions}
            sessionDurationMinutes={row.sessionMinutes}
            variant="compact"
            align="center"
          />
        </div>
      ),
    },
    {
      key: 'capacity',
      header: tr('Sĩ số & giữ chỗ'),
      align: 'center',
      compact: true,
      sortValue: (row) => Number(row.confirmedCount || 0),
      render: (row) => {
        const cap = Number(row.capacitySnapshot || row.capacity || groupPolicy?.maxLearners || 0);
        return (
          <div className="min-w-[108px] space-y-1">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="tabular-nums font-semibold text-rp-text">
                {row.confirmedCount}/{cap || '—'}
              </span>
              {row.pendingHolds > 0 && (
                <span className="rounded-full border border-rp-warning-line bg-rp-warning-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-rp-warning">
                  {trf('+{0} giữ chỗ', { 0: row.pendingHolds })}
                </span>
              )}
            </div>
            <OccupancyProgressBar
              enrolledCount={row.confirmedCount}
              capacity={cap}
              size="sm"
              label={trf('Đã ghi danh: {0}/{1} học viên', { 0: row.confirmedCount, 1: cap })}
            />
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: tr('Tiến trình'),
      align: 'center',
      compact: true,
      sortValue: (row) => Number(row.progress.completedSessions || 0),
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-[13px] font-medium text-rp-text-2">
          {row.progress.completedSessions}/{row.progress.totalSessions || 0} {tr('buổi')}
        </span>
      ),
    },
    {
      key: 'price',
      header: tr('Học phí'),
      align: 'right',
      compact: true,
      sortValue: (row) => Number(row.price || 0),
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-sm font-semibold text-rp-text">
          {formatTuitionVnd(row.price)}
        </span>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      compact: true,
      sortValue: (row) => (row.status === 'Draft' ? 'Chờ mở lớp' : row.lifecycle?.label || ''),
      render: (row) => {
        if (row.status === 'Draft') {
          return <AdminStatusBadge tone="neutral" label={tr('Chờ mở lớp')} />;
        }
        return <AdminStatusBadge tone={row.lifecycle.tone} label={tr(row.lifecycle.label)} />;
      },
    },
  ];

  const hasFilters =
    cohortSearch.trim() !== ''
    || lifecycleFilter !== 'ALL'
    || levelFilter !== 'ALL'
    || mentorFilter !== 'ALL';
  const hasAnyCohorts = cohorts.length > 0;
  const resetFilters = () => {
    setCohortSearch('');
    setLifecycleFilter('ALL');
    setLevelFilter('ALL');
    setMentorFilter('ALL');
  };

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {(toolbarTabs || hasAnyCohorts) && (
        <AdminToolbar
          tabs={toolbarTabs}
          refresh={
            onRefresh
              ? {
                  when: hasAnyCohorts,
                  onRefresh,
                  refreshing,
                  disabled: busy,
                }
              : undefined
          }
        >
          {hasAnyCohorts && (
            <>
              <SearchInput
                value={cohortSearch}
                onChange={(e) => setCohortSearch(e.target.value)}
                onClear={() => setCohortSearch('')}
                placeholder="Tìm lớp, cấp độ, Giáo viên…"
                aria-label={tr('Tìm lớp học')}
                className="w-full sm:w-[245px]"
              />

              <CustomSelect
                fitContent
                value={levelFilter}
                aria-label={tr('Cấp độ')}
                onChange={setLevelFilter}
                options={levelOptions}
              />

              <CustomSelect
                fitContent
                value={mentorFilter}
                aria-label={tr('Giáo viên')}
                onChange={setMentorFilter}
                options={mentorOptions}
              />

              <CustomSelect
                fitContent
                value={lifecycleFilter}
                aria-label={tr('Trạng thái')}
                onChange={setLifecycleFilter}
                options={[
                  { value: 'ALL', label: tr('Tất cả') },
                  ...CLASS_LIFECYCLE_STATUSES.map((st) => ({
                    value: st.id,
                    label: tr(st.label),
                    dotClass:
                      st.tone === 'success'
                        ? 'bg-[#16A34A]'
                        : st.tone === 'info'
                          ? 'bg-[#2563EB]'
                          : st.tone === 'warning'
                            ? 'bg-[#D97706]'
                            : st.tone === 'danger'
                              ? 'bg-[#DC2626]'
                              : 'bg-[#94A3B8]',
                  })),
                ]}
              />

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  icon={X}
                  onClick={resetFilters}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              )}
            </>
          )}
        </AdminToolbar>
      )}

      {filteredCohorts.length === 0 ? (
        <ContextualEmptyState
          variant={hasAnyCohorts && hasFilters ? 'search' : 'default'}
          illustration={hasAnyCohorts && hasFilters ? 'search' : 'classroom'}
          title={hasAnyCohorts && hasFilters ? tr('Không có lớp học nào khớp bộ lọc') : tr('Chưa có lớp học nào')}
          description={
            hasAnyCohorts && hasFilters
              ? tr('Thử thay đổi bộ lọc cấp độ, giáo viên, trạng thái hoặc xóa từ khóa tìm kiếm.')
              : tr('Lớp học sẽ được tạo khi Giáo viên chọn hạn tuyển sinh để mở lớp từ các đề xuất đã được Quản trị viên phê duyệt.')
          }
          action={
            hasAnyCohorts && hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : null
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filteredCohorts}
          rowKey={(r) => r.id}
          itemLabel="lớp học"
          fillHeight={fillHeight}
          rowActions={(row) => (
            <AdminRowActions>
              <AdminIconAction
                kind="view"
                tone="brand"
                tooltip="Xem chi tiết lớp"
                onClick={() => setDetailCohortId(row.id)}
              />
            </AdminRowActions>
          )}
        />
      )}

      {/* Read-only Class & Enrollment Monitoring Drawer */}
      <Drawer
        open={Boolean(detailCohort)}
        onClose={() => setDetailCohortId(null)}
        title={detailCohort ? detailCohort.name : ''}
        titleBadge={
          detailCohort ? (
            <AdminStatusBadge
              tone={detailCohort.status === 'Draft' ? 'neutral' : detailCohort.lifecycle.tone}
              label={detailCohort.status === 'Draft' ? tr('Chờ mở lớp') : tr(detailCohort.lifecycle.label)}
            />
          ) : null
        }
        description={
          detailCohort
            ? `${detailCohort.level ? `${detailCohort.level} · ` : ''}${tr('Giáo viên')}: ${detailCohort.mentorName || '—'}`
            : ''
        }
        width="w-[min(720px,100vw)]"
      >
        {detailCohort && (
          <div className="space-y-5">
            {/* 4 Key Monitoring KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-rp-text-muted">
                  <Users className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                  <span>{tr('Đã ghi danh')}</span>
                </div>
                <div className="mt-1 text-[18px] font-bold tabular-nums text-rp-text">
                  {detailCohort.confirmedCount}/{detailCohort.capacitySnapshot || detailCohort.capacity}
                </div>
                <OccupancyProgressBar
                  enrolledCount={detailCohort.confirmedCount}
                  capacity={detailCohort.capacitySnapshot || detailCohort.capacity || 0}
                  size="sm"
                  className="mt-1.5"
                  label={trf('Sĩ số tối đa: {0} học viên · Đã ghi danh: {1}/{0}', {
                    0: detailCohort.capacitySnapshot || detailCohort.capacity || 0,
                    1: detailCohort.confirmedCount,
                  })}
                />
              </div>

              <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-rp-text-muted">
                  <Clock className="h-3.5 w-3.5 text-rp-warning" aria-hidden="true" />
                  <span>{tr('Đang giữ chỗ')}</span>
                </div>
                <div className="mt-1 text-[18px] font-bold tabular-nums text-rp-text">
                  {detailCohort.pendingHolds}
                </div>
                <div className="mt-0.5 text-[12px] text-rp-text-muted">
                  {tr('Chờ hoàn tất thanh toán')}
                </div>
              </div>

              <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-rp-text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-rp-success" aria-hidden="true" />
                  <span>{tr('Tiến trình học')}</span>
                </div>
                <div className="mt-1 text-[18px] font-bold tabular-nums text-rp-text">
                  {detailCohort.progress.completedSessions}/{detailCohort.progress.totalSessions || 0} {tr('buổi')}
                </div>
                <div className="mt-0.5 text-[12px] tabular-nums text-rp-text-muted">
                  {detailCohort.progress.percent}% {tr('khóa học')}
                </div>
              </div>

              <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-rp-text-muted">
                  <GraduationCap className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                  <span>{tr('Tổng học phí đã thu')}</span>
                </div>
                <div className="mt-1 text-[18px] font-bold tabular-nums text-rp-text">
                  {fmtCollectedVnd(detailCohort.totalCollectedAmount)}
                </div>
                <div className="mt-0.5 text-[12px] tabular-nums text-rp-text-muted">
                  {detailCohort.tuitionPerLearner > 0
                    ? `${formatTuitionVnd(detailCohort.tuitionPerLearner)} / ${tr('học viên')}`
                    : tr('Chưa cấu hình học phí')}
                </div>
                {Number(detailCohort.totalRefundedAmount || 0) > 0 && (
                  <div className="mt-0.5 text-[11.5px] tabular-nums text-rp-text-muted">
                    {trf('Thu {0} · Hoàn {1}', {
                      0: fmtCollectedVnd(detailCohort.grossCollectedAmount),
                      1: fmtCollectedVnd(detailCohort.totalRefundedAmount),
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Course Dates & Teaching Hours */}
            <div className="rounded-xl border border-rp-line bg-rp-surface p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-rp-text">
                  <CalendarClock className="h-4 w-4 text-rp-brand" aria-hidden="true" />
                  <span>{tr('Thông tin khóa học')}</span>
                </h3>
                {Number(detailCohort.totalTeachingHours) > 0 && (
                  <span className="text-[12.5px] font-medium tabular-nums text-rp-text-muted">
                    {trf('{0} giờ giảng dạy', { 0: detailCohort.totalTeachingHours })}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-1 gap-2.5 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-rp-muted/50 px-3 py-2">
                  <dt className="text-rp-text-muted">{tr('Mở tuyển sinh')}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">
                    {fmtDateTime(detailCohort.enrollmentOpensAtUtc || detailCohort.createdAt)}
                  </dd>
                </div>
                <div className="rounded-lg bg-rp-muted/50 px-3 py-2">
                  <dt className="text-rp-text-muted">{tr('Hạn tuyển sinh')}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">
                    {fmtDateTime(detailCohort.enrollmentClosesAtUtc)}
                  </dd>
                </div>
                <div className="rounded-lg bg-rp-muted/50 px-3 py-2">
                  <dt className="text-rp-text-muted">{tr('Ngày bắt đầu')}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">{fmtDateOnly(detailCohort.startsAt)}</dd>
                </div>
                <div className="rounded-lg bg-rp-muted/50 px-3 py-2">
                  <dt className="text-rp-text-muted">{tr('Ngày kết thúc')}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-rp-text">{fmtDateOnly(detailCohort.endsAt)}</dd>
                </div>
              </dl>

              {detailCohort.lifecycle.id === 'Cancelled' && detailCohort.cancellationReason && (
                <div className="rounded-lg border border-rp-danger/25 bg-rp-danger-bg px-3 py-2 text-xs text-rp-danger">
                  <span className="font-semibold">{tr('Lý do hủy lớp')}: </span>
                  <span>{detailCohort.cancellationReason}</span>
                </div>
              )}
            </div>

            {/* Unified Detailed Course Schedule */}
            {detailScheduleOccurrences.length > 0 && (
              <ProposalDetailedScheduleCard
                occurrences={detailScheduleOccurrences}
                durationWeeks={Math.max(1, Number(detailCohort.courseDurationWeeks || 1))}
                projected={false}
                showStatusBadges
                initialVisibleCount={6}
                columns="responsive-3"
                resetKey={`admin-cohort-${detailCohort.id}`}
              />
            )}

            {/* Learners Roster */}
            <div className="rounded-xl border border-rp-line bg-rp-surface p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-rp-text">
                  {trf('Danh sách học viên ({0})', { 0: detailCohort.rosterCourses.length })}
                </h3>
              </div>

              {detailCohort.rosterCourses.length === 0 ? (
                <ContextualEmptyState
                  variant="compact"
                  illustration="classroom"
                  title={tr('Chưa có học viên nào trong lớp')}
                  description={tr('Học viên đã ghi danh hoặc đang giữ chỗ thanh toán hợp lệ sẽ hiển thị tại đây.')}
                />
              ) : (
                <div className="space-y-2">
                  {detailCohort.rosterCourses.map((course) => {
                    const isConfirmed = isConfirmedClassEnrollment(course);
                    const learnerDisplay = course.learnerName || tr('Học viên');

                    return (
                      <div
                        key={course.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-muted/20 px-3.5 py-2.5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <UserAvatar src={course.learnerAvatarUrl} name={learnerDisplay} size={34} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-rp-text">
                                {learnerDisplay}
                              </span>
                              <AdminStatusBadge
                                tone={isConfirmed ? 'success' : 'warning'}
                                label={isConfirmed ? tr('Đã ghi danh') : tr('Chờ thanh toán')}
                              />
                            </div>
                            {!isConfirmed && course.paymentExpiresAt && (
                              <p className="mt-0.5 text-[11.5px] tabular-nums text-rp-warning">
                                {tr('Hết hạn giữ chỗ')}: {fmtDateTime(course.paymentExpiresAt)}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums text-rp-text">
                          {Number(course.amount || 0) > 0
                            ? formatTuitionVnd(course.amount)
                            : tr('Quyền học được phê duyệt')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
