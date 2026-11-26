import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, Clock, Eye, Lock, Repeat, Star } from 'lucide-react';
import { enrollCohort, getCohorts, reconcileCoursePayment } from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import {
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Modal,
  Pagination,
  RefreshButton,
  SakuraLoader,
  SearchInput,
  TimeInput,
  UserAvatar,
  notify,
} from '@/components/ui';
import { StatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import CohortDetailModal from './CohortDetailModal';
import OccupancyProgressBar from './OccupancyProgressBar.jsx';
import {
  cohortDiscoveryStatusOf,
  cohortWeeksOf,
  fmtDate,
  fmtDateOnly,
  frequencyLabelOf,
  money,
  schedulePatternText,
  weeklyScheduleLinesOf,
} from '@/features/cohorts/utils/cohortCardModel';
import { parseBusinessDate } from '@/utils/dateTimeFormat.js';
import { useLocale } from '@/locales/locale.js';

const FILTER_DEBOUNCE_MS = 320;
const PAGE_SIZE = 8;
const MAX_CARD_WEEKLY_LINES = 4;

const WEEKDAYS = [
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '0', label: 'Chủ nhật' },
];

const SORT_OPTIONS = [
  { value: 'starts_asc', label: 'Ngày bắt đầu gần nhất' },
  { value: 'price_asc', label: 'Học phí thấp đến cao' },
  { value: 'price_desc', label: 'Học phí cao đến thấp' },
  { value: 'newest', label: 'Lớp mới nhất' },
];

const LEVEL_SORT_ORDER = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

const EMPTY_FILTERS = {
  mentorId: '',
  level: '',
  sessionsPerWeek: '',
  weekday: '',
  fromTime: '',
  toTime: '',
};

export default function LearnerCohortDiscoveryPanel({
  cohorts = [],
  enrolledCourses = [],
  busy = false,
  refreshing = false,
  onRefresh,
  onRun,
  onEnrolled,
  initialMentorId = '',
  initialCohortId = '',
  onVisibleCountChange,
}) {
  const { tr, trf } = useLocale();
  const [searchParams] = useSearchParams();
  const targetCohortId = Number(initialCohortId || searchParams.get('cohortId') || 0);

  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    mentorId: /^\d+$/.test(String(initialMentorId)) ? String(initialMentorId) : '',
  }));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('starts_asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [detailCohortId, setDetailCohortId] = useState(null);
  const [detailCohortSnapshot, setDetailCohortSnapshot] = useState(null);
  const [confirmCohort, setConfirmCohort] = useState(null);
  const [checkingCohortId, setCheckingCohortId] = useState(null);

  const [filtered, setFiltered] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const idempotencyKeys = useRef({});
  const inFlight = useRef(false);
  const autoOpenedCohortRef = useRef(0);
  const reconciledExpiredHoldIdsRef = useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Cập nhật đúng thời điểm giữ chỗ của người học kết thúc để giải phóng UI và cho phép đăng ký lại không cần reload.
  useEffect(() => {
    const now = Date.now();
    const expiredPendingCohorts = [];
    let earliestExpiryMs = Infinity;

    for (const c of cohorts) {
      if (c?.myEnrollmentPaymentState !== 'AwaitingPayment' || !c?.myEnrollmentPaymentExpiresAtUtc) continue;
      const expMs = parseBusinessDate(c.myEnrollmentPaymentExpiresAtUtc)?.getTime();
      if (!Number.isFinite(expMs)) continue;
      if (expMs <= now) {
        if (c.myEnrollmentCourseId && !reconciledExpiredHoldIdsRef.current.has(c.myEnrollmentCourseId)) {
          expiredPendingCohorts.push(c.myEnrollmentCourseId);
        }
      } else if (expMs < earliestExpiryMs) {
        earliestExpiryMs = expMs;
      }
    }

    if (expiredPendingCohorts.length > 0) {
      expiredPendingCohorts.forEach((id) => reconciledExpiredHoldIdsRef.current.add(id));
      Promise.all(expiredPendingCohorts.map((id) => reconcileCoursePayment(id).catch(() => null)))
        .finally(() => onRefresh?.());
    }

    if (!Number.isFinite(earliestExpiryMs)) return undefined;
    const delayMs = Math.max(150, earliestExpiryMs - now + 150);
    const timeoutId = setTimeout(() => setNowMs(Date.now()), delayMs);
    return () => clearTimeout(timeoutId);
  }, [cohorts, nowMs, onRefresh]);

  // Tùy chọn bộ lọc động hoàn toàn từ dữ liệu lớp đang tuyển sinh
  const levelOptions = useMemo(() => {
    const set = new Set();
    cohorts.forEach((c) => {
      const code = String(c.level || '').toUpperCase().trim();
      if (code) set.add(code);
    });
    return [...set].sort((a, b) => (LEVEL_SORT_ORDER[a] ?? 99) - (LEVEL_SORT_ORDER[b] ?? 99) || a.localeCompare(b));
  }, [cohorts]);

  const frequencyOptions = useMemo(() => {
    const set = new Set();
    cohorts.forEach((c) => {
      const n = Number(c.sessionsPerWeek || 0);
      if (n > 0) set.add(n);
    });
    return [...set].sort((a, b) => a - b);
  }, [cohorts]);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const hasServerFilter = Object.values(filters).some((v) => v !== '');
  const timeRangeInvalid = Boolean(filters.fromTime && filters.toTime && filters.fromTime >= filters.toTime);

  useEffect(() => {
    if (!hasServerFilter || timeRangeInvalid) return undefined;
    let alive = true;
    const key = `${filterKey}#${refreshTick}`;
    const timer = setTimeout(() => {
      getCohorts(JSON.parse(filterKey))
        .then((rows) => alive && setFiltered({ key, rows, error: '', errorObj: null }))
        .catch((err) => alive && setFiltered({ key, rows: [], error: describeApiError(err).message, errorObj: err }));
    }, FILTER_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [filterKey, hasServerFilter, timeRangeInvalid, refreshTick]);

  const activeFiltered = hasServerFilter && filtered?.key === `${filterKey}#${refreshTick}` ? filtered : null;
  const loadingFiltered = hasServerFilter && !timeRangeInvalid && !activeFiltered;

  const baseRows = useMemo(
    () => (hasServerFilter ? (timeRangeInvalid ? [] : activeFiltered?.rows || []) : cohorts),
    [hasServerFilter, timeRangeInvalid, activeFiltered, cohorts],
  );

  const activeEnrolledWindows = useMemo(() => {
    const out = [];
    const fallbackName = tr('Lớp hiện tại');
    for (const c of enrolledCourses || []) {
      if (!c || c.status === 'Cancelled' || c.status === 'TransferredOut') continue;
      if (c.paymentStatus !== 'Paid' && c.paymentState !== 'AwaitingPayment' && c.paymentStatus !== 'Pending') continue;
      const mins = Number(c.sessionMinutes) || 0;
      for (const s of c.sessions || []) {
        if (s.status && s.status !== 'Scheduled' && s.status !== 'Confirmed' && s.status !== 'Assigned') continue;
        const start = parseBusinessDate(s.scheduledAt || s.startTime);
        if (!start) continue;
        const end = parseBusinessDate(s.endTime) || (mins > 0 ? new Date(start.getTime() + mins * 60000) : null);
        if (!end) continue;
        out.push({ cohortId: c.cohortId, name: c.cohortName || c.name || fallbackName, startMs: start.getTime(), endMs: end.getTime() });
      }
    }
    return out;
  }, [enrolledCourses, tr]);

  const scheduleConflictByCohortId = useMemo(() => {
    const map = new Map();
    if (!activeEnrolledWindows.length) return map;
    const sources = new Map();
    cohorts.forEach((c) => sources.set(Number(c.id), c));
    baseRows.forEach((c) => sources.set(Number(c.id), c));
    const fallbackName = tr('lớp học hiện tại');
    for (const cohort of sources.values()) {
      if (!cohort?.sessions?.length || cohort.myEnrollmentCourseId) continue;
      const mins = Number(cohort.sessionMinutes) || 0;
      const conflict = cohort.sessions.find((s) => {
        const sStart = parseBusinessDate(s.startTime || s.scheduledAt)?.getTime();
        const sEnd = parseBusinessDate(s.endTime)?.getTime() || (sStart && mins > 0 ? sStart + mins * 60000 : 0);
        if (!sStart || !sEnd) return false;
        return activeEnrolledWindows.some((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
      });
      if (conflict) {
        const sStart = parseBusinessDate(conflict.startTime || conflict.scheduledAt)?.getTime() || 0;
        const sEnd = parseBusinessDate(conflict.endTime)?.getTime() || (mins > 0 ? sStart + mins * 60000 : sStart);
        const hit = activeEnrolledWindows.find((w) => w.cohortId !== cohort.id && w.startMs < sEnd && sStart < w.endMs);
        map.set(cohort.id, hit?.name || fallbackName);
      }
    }
    return map;
  }, [cohorts, baseRows, activeEnrolledWindows, tr]);

  const statusByCohortId = useMemo(() => {
    const map = new Map();
    const sources = new Map();
    cohorts.forEach((c) => sources.set(Number(c.id), c));
    baseRows.forEach((c) => sources.set(Number(c.id), c));
    for (const cohort of sources.values()) {
      map.set(
        Number(cohort.id),
        cohortDiscoveryStatusOf(cohort, {
          conflictCourseName: scheduleConflictByCohortId.get(cohort.id) || '',
          nowMs,
        }),
      );
    }
    return map;
  }, [cohorts, baseRows, scheduleConflictByCohortId, nowMs]);

  const visibleCohorts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matched = baseRows.filter((c) => {
      const st = statusByCohortId.get(Number(c.id));
      if (st?.isExpiredOrHidden) return false;
      if (!q) return true;
      return (
        (c.name || '').toLowerCase().includes(q)
        || (c.mentorName || '').toLowerCase().includes(q)
      );
    });

    matched.sort((a, b) => {
      const aFull = statusByCohortId.get(Number(a.id))?.isFull ? 1 : 0;
      const bFull = statusByCohortId.get(Number(b.id))?.isFull ? 1 : 0;
      if (aFull !== bFull) return aFull - bFull;

      if (sortBy === 'price_asc') {
        const diff = Number(a.price || 0) - Number(b.price || 0);
        if (diff !== 0) return diff;
      } else if (sortBy === 'price_desc') {
        const diff = Number(b.price || 0) - Number(a.price || 0);
        if (diff !== 0) return diff;
      } else if (sortBy === 'newest') {
        const bCreated = parseBusinessDate(b.createdAtUtc)?.getTime() || 0;
        const aCreated = parseBusinessDate(a.createdAtUtc)?.getTime() || 0;
        if (bCreated !== aCreated) return bCreated - aCreated;
        return Number(b.id || 0) - Number(a.id || 0);
      }
      const aStart = parseBusinessDate(a.startsAt)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bStart = parseBusinessDate(b.startsAt)?.getTime() || Number.MAX_SAFE_INTEGER;
      if (aStart !== bStart) return aStart - bStart;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    return matched;
  }, [baseRows, searchTerm, sortBy, statusByCohortId]);

  useEffect(() => {
    onVisibleCountChange?.(visibleCohorts.length);
  }, [visibleCohorts.length, onVisibleCountChange]);

  // Reset trang về 1 khi thay đổi điều kiện tìm kiếm, lọc hoặc sắp xếp
  const filterSignature = `${filterKey}|${searchTerm}|${sortBy}`;
  const [prevSig, setPrevSig] = useState(filterSignature);
  if (filterSignature !== prevSig) {
    setPrevSig(filterSignature);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(visibleCohorts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCohorts = useMemo(() => {
    const startIdx = (safePage - 1) * PAGE_SIZE;
    return visibleCohorts.slice(startIdx, startIdx + PAGE_SIZE);
  }, [visibleCohorts, safePage]);

  // Deep-link highlight & auto-open detail modal khi đi từ /mentors/:id?cohortId=...
  useEffect(() => {
    if (!targetCohortId || autoOpenedCohortRef.current === targetCohortId) return;
    if (!visibleCohorts.some((c) => Number(c.id) === targetCohortId)) return;
    autoOpenedCohortRef.current = targetCohortId;
    const el = document.getElementById(`cohort-discovery-card-${targetCohortId}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetCohortId, visibleCohorts]);

  const detailCohort = useMemo(() => {
    if (!detailCohortId) return null;
    const liveMatch = baseRows.find((c) => Number(c.id) === Number(detailCohortId))
      || cohorts.find((c) => Number(c.id) === Number(detailCohortId));
    if (liveMatch) return liveMatch;
    if (detailCohortSnapshot && Number(detailCohortSnapshot.id) === Number(detailCohortId)) {
      return {
        ...detailCohortSnapshot,
        isEnrollmentWindowOpen: false,
        enrollmentOpen: false,
      };
    }
    return null;
  }, [detailCohortId, baseRows, cohorts, detailCohortSnapshot]);

  const detailStatusInfo = detailCohort
    ? (statusByCohortId.get(Number(detailCohort.id))
      || cohortDiscoveryStatusOf(detailCohort, {
        conflictCourseName: scheduleConflictByCohortId.get(detailCohort.id) || '',
        nowMs,
      }))
    : null;

  const setFilter = (key, value) => setFilters((cur) => ({ ...cur, [key]: value }));

  const handleRefreshAll = () => {
    setRefreshTick((t) => t + 1);
    return onRefresh?.();
  };

  const handleOpenDetail = (cohort) => {
    if (!cohort) return;
    setDetailCohortId(cohort.id);
    setDetailCohortSnapshot(cohort);
    Promise.resolve(handleRefreshAll()).catch(() => {});
  };

  const handleCloseDetail = () => {
    setDetailCohortId(null);
    setDetailCohortSnapshot(null);
  };

  // Kiểm tra lại khả năng đăng ký thực tế từ Backend trước khi mở xác nhận thanh toán
  const handleRequestEnroll = async (cohort) => {
    if (!cohort || inFlight.current || checkingCohortId) return;
    setCheckingCohortId(cohort.id);
    try {
      const latestList = await getCohorts();
      const freshCohort = (latestList || []).find((x) => Number(x.id) === Number(cohort.id));
      if (!freshCohort) {
        await handleRefreshAll();
        notify.warning(tr('Lớp không còn mở đăng ký'), tr('Lớp học này vừa đóng tuyển sinh hoặc đã kết thúc thời hạn đăng ký.'));
        return;
      }
      const conflictCourseName = scheduleConflictByCohortId.get(freshCohort.id) || '';
      const freshStatus = cohortDiscoveryStatusOf(freshCohort, { conflictCourseName });
      if (freshStatus.actionKind === 'view_course' || freshStatus.actionKind === 'resume_payment') {
        onEnrolled?.(freshCohort.myEnrollmentCourseId, freshStatus.actionKind);
        return;
      }
      if (!freshStatus.canEnroll) {
        await handleRefreshAll();
        notify.warning(tr('Chưa thể đăng ký lớp'), tr(freshStatus.disabledReason || 'Lớp đã đủ sĩ số hoặc trạng thái vừa thay đổi.'));
        return;
      }
      handleCloseDetail();
      setConfirmCohort(freshCohort);
    } catch (err) {
      notify.apiError(err, tr('Không kiểm tra được trạng thái lớp'));
    } finally {
      setCheckingCohortId(null);
    }
  };

  const handleConfirmEnroll = () => {
    if (!confirmCohort || inFlight.current) return;
    const cohort = confirmCohort;
    inFlight.current = true;
    const key = (idempotencyKeys.current[cohort.id] ||= crypto.randomUUID());
    const body = { idempotencyKey: key };
    if (cohort.hasApprovedEntitlement && cohort.entitlementReference) {
      body.entitlementReference = cohort.entitlementReference;
    }
    Promise.resolve(
      onRun(
        async () => {
          let res;
          try {
            res = await enrollCohort(cohort.id, body);
          } catch (err) {
            const status = err?.status ?? err?.response?.status;
            if (err?.errorCode || err?.response?.data?.errorCode || (status >= 400 && status < 500)) {
              delete idempotencyKeys.current[cohort.id];
            }
            if (['COHORT_FULL', 'COHORT_ENROLLMENT_CLOSED', 'COHORT_SCHEDULE_CONFLICT'].includes(err?.errorCode)) {
              setConfirmCohort(null);
            }
            throw err;
          }
          setConfirmCohort(null);
          delete idempotencyKeys.current[cohort.id];
          if (res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid') {
            if (onEnrolled) onEnrolled(res.id, 'view_course');
          } else if (typeof res?.checkoutUrl === 'string' && res.checkoutUrl.startsWith('https://')) {
            window.location.assign(res.checkoutUrl);
          } else if (onEnrolled) {
            onEnrolled(res?.id, 'resume_payment');
          }
          return res;
        },
        (res) =>
          res?.paymentState === 'Confirmed' || res?.paymentStatus === 'Paid'
            ? 'Ghi danh lớp học nhóm thành công!'
            : 'Đã giữ chỗ và chuyển đến trang thanh toán. Ghi danh chỉ hoàn tất khi hệ thống xác nhận thanh toán.',
      ),
    ).finally(() => {
      inFlight.current = false;
      setRefreshTick((t) => t + 1);
    });
  };

  const levelSelectOptions = [
    { value: '', label: 'Tất cả cấp độ' },
    ...levelOptions.map((lvl) => ({ value: lvl, label: lvl })),
  ];
  const frequencySelectOptions = [
    { value: '', label: 'Tất cả tần suất' },
    ...frequencyOptions.map((n) => ({
      value: String(n),
      label: trf('{0} buổi/tuần', { 0: n }),
    })),
  ];
  const weekdaySelectOptions = [
    { value: '', label: 'Tất cả các thứ' },
    ...WEEKDAYS,
  ];
  const isSourceEmpty = cohorts.length === 0 && !hasServerFilter && !searchTerm.trim();

  return (
    <div className="space-y-4">
      {/* Toolbar tìm kiếm, lọc và sắp xếp */}
      <div className="rounded-rp-card border border-rp-line bg-rp-surface p-3.5 shadow-rp-xs">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-0 flex-1 basis-[210px] space-y-1">
            <span className="block text-[11.5px] font-semibold text-rp-text-muted">
              {tr('Tìm tên lớp hoặc Giáo viên')}
            </span>
            <SearchInput
              size="md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder={tr('Ví dụ: JLPT N4, cô Lan…')}
            />
          </div>

          <div className="min-w-0 space-y-1">
            <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Cấp độ JLPT')}</span>
            <CustomSelect
              fitContent
              size="md"
              value={filters.level}
              onChange={(val) => setFilter('level', val)}
              options={levelSelectOptions}
              aria-label={tr('Cấp độ JLPT')}
            />
          </div>

          <div className="min-w-0 space-y-1">
            <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Tần suất học')}</span>
            <CustomSelect
              fitContent
              size="md"
              value={filters.sessionsPerWeek}
              onChange={(val) => setFilter('sessionsPerWeek', val)}
              options={frequencySelectOptions}
              aria-label={tr('Tần suất học')}
            />
          </div>

          <div className="min-w-0 space-y-1">
            <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Thứ trong tuần')}</span>
            <CustomSelect
              fitContent
              size="md"
              value={filters.weekday}
              onChange={(val) => setFilter('weekday', val)}
              options={weekdaySelectOptions}
              aria-label={tr('Thứ trong tuần')}
            />
          </div>

          <div className="flex items-end gap-1.5">
            <div className="space-y-1">
              <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Từ giờ')}</span>
              <TimeInput
                size="md"
                fitContent
                value={filters.fromTime}
                onChange={(e) => setFilter('fromTime', e.target.value)}
                aria-label={tr('Từ giờ')}
              />
            </div>
            <div className="space-y-1">
              <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Đến giờ')}</span>
              <TimeInput
                size="md"
                fitContent
                value={filters.toTime}
                onChange={(e) => setFilter('toTime', e.target.value)}
                aria-label={tr('Đến giờ')}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <span className="block text-[11.5px] font-semibold text-rp-text-muted">{tr('Sắp xếp')}</span>
            <CustomSelect
              fitContent
              size="md"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              aria-label={tr('Sắp xếp')}
            />
          </div>

          <div className="ml-auto shrink-0">
            <RefreshButton
              size="md"
              onRefresh={handleRefreshAll}
              refreshing={Boolean(refreshing || loadingFiltered)}
            />
          </div>
        </div>
      </div>

      {/* Số lượng kết quả & nút xóa bộ lọc */}
      {!loadingFiltered && !activeFiltered?.errorObj && !timeRangeInvalid && (visibleCohorts.length > 0 || hasServerFilter || searchTerm) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="m-0 text-sm font-semibold text-rp-text">
            {trf('Có {0} lớp học phù hợp', { 0: visibleCohorts.length })}
          </p>
          {(hasServerFilter || searchTerm) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setSearchTerm('');
              }}
            >
              {tr('Xóa bộ lọc')}
            </Button>
          )}
        </div>
      )}

      {timeRangeInvalid && <Banner tone="warning">{tr('Giờ bắt đầu phải sớm hơn giờ kết thúc.')}</Banner>}

      {loadingFiltered ? (
        <SakuraLoader
          variant="section"
          size={32}
          context="cohort"
          label={tr('Đang tìm lớp phù hợp')}
          className="min-h-[140px] py-4"
          delay={160}
        />
      ) : activeFiltered?.errorObj ? (
        <ContextualErrorState
          compact
          error={activeFiltered.errorObj}
          title={tr('Chưa lọc được danh sách lớp')}
          onRetry={handleRefreshAll}
        />
      ) : visibleCohorts.length === 0 ? (
        <div className="mx-auto max-w-md py-6">
          <ContextualEmptyState
            variant={isSourceEmpty ? 'compact' : 'search'}
            size="md"
            illustration={isSourceEmpty ? 'classroom' : 'search'}
            title={
              isSourceEmpty
                ? tr('Hiện chưa có lớp học nhóm nào đang mở đăng ký')
                : tr('Không tìm thấy lớp học phù hợp')
            }
            description={
              isSourceEmpty
                ? tr('Các lớp học mới sẽ hiển thị tại đây ngay khi được công bố.')
                : tr('Thử thay đổi bộ lọc, khung giờ hoặc từ khóa tìm kiếm.')
            }
            action={(hasServerFilter || searchTerm) ? (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearchTerm('');
                }}
              >
                {tr('Xóa bộ lọc')}
              </Button>
            ) : (
              <Button as={Link} to="/mentors" variant="soft" size="sm">
                {tr('Xem danh sách Giáo viên')}
              </Button>
            )}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="@container">
            <div className="grid grid-cols-1 gap-4 @[940px]:grid-cols-2">
              {pagedCohorts.map((cohort) => {
                const statusInfo = statusByCohortId.get(Number(cohort.id)) || cohortDiscoveryStatusOf(cohort, { nowMs });
                const weeklyLines = weeklyScheduleLinesOf(cohort);
                const visibleWeeklyLines = weeklyLines.slice(0, MAX_CARD_WEEKLY_LINES);
                const hiddenWeeklyCount = Math.max(0, weeklyLines.length - MAX_CARD_WEEKLY_LINES);
                const weeks = cohortWeeksOf(cohort);
                const totalSessions = Number(cohort.totalSessions ?? cohort.sessions?.length ?? 0);
                const sessionMinutes = Number(cohort.sessionMinutes || 0);
                const hasRealRating = Number(cohort.mentorReviewCount || 0) > 0 && cohort.mentorRatingAverage != null;
                const isHighlighted = targetCohortId > 0 && Number(cohort.id) === targetCohortId;
                const isCheckingThis = Number(checkingCohortId) === Number(cohort.id);

                return (
                  <Card
                    key={cohort.id}
                    id={`cohort-discovery-card-${cohort.id}`}
                    data-testid={`cohort-card-${cohort.id}`}
                    padded={false}
                    className={`flex h-full flex-col p-5 transition-colors hover:border-rp-brand-border/75 ${isHighlighted ? 'ring-2 ring-rp-brand ring-offset-2' : ''}`}
                  >
                    {/* Header: Cấp độ JLPT, tên lớp, giáo viên và badge trạng thái */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {cohort.level && (
                          <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint px-3 py-1.5 text-sm font-bold text-rp-brand-strong">
                            {cohort.level}
                          </span>
                        )}
                        <div className="min-w-0 space-y-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(cohort)}
                            className="rp-focus block max-w-full truncate rounded text-left text-[17px] font-bold leading-snug text-rp-text transition-colors hover:text-rp-brand-strong"
                            title={cohort.name}
                          >
                            {cohort.name}
                          </button>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <Link
                              to={`/mentors/${cohort.mentorId}`}
                              className="group inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-rp-text-2 transition-colors hover:text-rp-brand-strong"
                            >
                              <UserAvatar
                                src={cohort.mentorAvatarUrl}
                                name={cohort.mentorName}
                                size={22}
                              />
                              <span className="truncate group-hover:underline">
                                {cohort.mentorName || tr('Giáo viên')}
                              </span>
                            </Link>
                            {hasRealRating && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-600">
                                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                {Number(cohort.mentorRatingAverage).toFixed(1)}
                                <span className="font-normal text-rp-text-muted">({cohort.mentorReviewCount})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <StatusBadge
                        tone={statusInfo.tone}
                        label={tr(statusInfo.label)}
                        className="shrink-0"
                      />
                    </div>

                    {/* Hàng thông số buổi học, số tuần, thời lượng mỗi buổi */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-rp-line/70 pb-3 text-[13px] font-medium tabular-nums text-rp-text-2">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
                        {totalSessions > 0 ? trf('{0} buổi học', { 0: totalSessions }) : '—'}
                      </span>
                      {weeks ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
                          {trf('{0} tuần', { 0: weeks })}
                        </span>
                      ) : null}
                      {sessionMinutes > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
                          {trf('{0} phút mỗi buổi', { 0: sessionMinutes })}
                        </span>
                      )}
                    </div>

                    {/* Phần giữa: Lịch học hằng tuần bên trái & các mốc ngày bên phải */}
                    <div className="grid flex-1 grid-cols-1 gap-4 py-3.5 sm:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                      <div className="@container min-w-0 space-y-2">
                        <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-bold text-rp-text">
                          <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand" />
                          {tr('Lịch học hằng tuần')}
                        </p>
                        {weeklyLines.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-1 gap-1.5 @[290px]:grid-cols-2">
                              {visibleWeeklyLines.map((line) => (
                                <div
                                  key={line.key}
                                  className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-rp-bg-2/85 px-2.5 py-1.5 text-[12px]"
                                >
                                  <span className="truncate font-medium text-rp-text-2">{line.weekdayLabel}</span>
                                  <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-rp-text">{line.timeRange}</span>
                                </div>
                              ))}
                            </div>
                            {hiddenWeeklyCount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(cohort)}
                                className="text-xs font-semibold text-rp-brand-strong hover:underline"
                              >
                                {trf('+ {0} khung giờ khác (xem chi tiết)', { 0: hiddenWeeklyCount })}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="m-0 text-[12.5px] text-rp-text-muted">{tr('Chưa có lịch học hằng tuần')}</p>
                        )}
                      </div>

                      <div className="min-w-0 space-y-2 text-[12.5px] text-rp-text-2 sm:border-l sm:border-rp-line/70 sm:pl-4">
                        {cohort.enrollmentClosesAtUtc && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-rp-text-muted">
                              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                              <span>{tr('Hạn tuyển sinh')}</span>
                            </span>
                            <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDate(cohort.enrollmentClosesAtUtc)}</strong>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-rp-text-muted">
                            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                            <span>{tr('Ngày bắt đầu')}</span>
                          </span>
                          <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDateOnly(cohort.startsAt)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-rp-text-muted">
                            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                            <span>{tr('Ngày kết thúc')}</span>
                          </span>
                          <strong className="shrink-0 font-semibold tabular-nums text-rp-text">{fmtDateOnly(cohort.endsAt)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer cố định xuống đáy: Học phí, sĩ số + progress bar, nút hành động */}
                    <div className="mt-auto border-t border-rp-line/70 pt-3.5">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="m-0 text-[11.5px] font-medium text-rp-text-muted">{tr('Học phí trọn khóa')}</p>
                          <div className="flex items-baseline gap-1">
                            <strong className="text-[19px] font-extrabold leading-tight tabular-nums text-rp-brand-strong">
                              {money(cohort.price)}
                            </strong>
                          </div>
                          {cohort.hasApprovedEntitlement && (
                            <p className="m-0 mt-0.5 text-[11px] font-semibold text-rp-success">
                              {tr('Miễn phí bằng quyền ghi danh')}
                            </p>
                          )}
                        </div>

                        <div className="min-w-[136px] max-w-[190px] flex-1 space-y-1.5 sm:border-l sm:border-rp-line/70 sm:pl-3">
                          <p className="m-0 text-[12px] font-medium tabular-nums text-rp-text-2">
                            {trf('Đã ghi danh: {0}/{1} học viên', {
                              0: statusInfo.confirmedCount,
                              1: statusInfo.capacity,
                            })}
                          </p>
                          <OccupancyProgressBar
                            enrolledCount={statusInfo.confirmedCount}
                            capacity={statusInfo.capacity}
                            size="sm"
                            label={trf('Sĩ số đã ghi danh {0}/{1} học viên', {
                              0: statusInfo.confirmedCount,
                              1: statusInfo.capacity,
                            })}
                          />
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon={Eye}
                            onClick={() => handleOpenDetail(cohort)}
                          >
                            {tr('Xem chi tiết')}
                          </Button>

                          {statusInfo.actionKind === 'view_course' ? (
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              disabled={busy}
                              onClick={() => onEnrolled?.(cohort.myEnrollmentCourseId)}
                            >
                              {tr('Xem lớp học')}
                            </Button>
                          ) : statusInfo.actionKind === 'resume_payment' ? (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={busy}
                              onClick={() => onEnrolled?.(cohort.myEnrollmentCourseId, 'resume_payment')}
                            >
                              {tr('Tiếp tục thanh toán')}
                            </Button>
                          ) : statusInfo.actionKind === 'full' ? (
                            <Button type="button" variant="secondary" size="sm" icon={Lock} disabled>
                              {tr('Đã đủ sĩ số')}
                            </Button>
                          ) : statusInfo.actionKind === 'held' ? (
                            <Button type="button" variant="secondary" size="sm" icon={Clock} disabled>
                              {tr('Đang giữ chỗ')}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant={statusInfo.canEnroll ? 'primary' : 'secondary'}
                              size="sm"
                              loading={isCheckingThis}
                              disabled={busy || isCheckingThis || !statusInfo.canEnroll}
                              onClick={() => handleRequestEnroll(cohort)}
                            >
                              {tr(statusInfo.actionLabel)}
                            </Button>
                          )}
                        </div>
                      </div>

                      {(statusInfo.isAllHeld || statusInfo.actionKind === 'conflict') && statusInfo.disabledReason && (
                        <p className="m-0 mt-2 text-[11.5px] font-medium text-rp-warning">
                          {tr(statusInfo.disabledReason)}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={visibleCohorts.length}
            onPageChange={setCurrentPage}
            showPageSize={false}
            itemLabel="lớp học"
          />
        </div>
      )}

      {/* Modal chi tiết lớp học */}
      <CohortDetailModal
        cohort={detailCohort}
        statusInfo={detailStatusInfo}
        busy={busy}
        checkingEligibility={Boolean(detailCohort && Number(checkingCohortId) === Number(detailCohort.id))}
        onClose={handleCloseDetail}
        onEnroll={handleRequestEnroll}
        onViewCourse={(courseId) => {
          handleCloseDetail();
          onEnrolled?.(courseId);
        }}
      />

      {/* Modal xác nhận ghi danh & chuyển thanh toán PayOS (giữ nguyên flow hiện có) */}
      <Modal
        open={Boolean(confirmCohort)}
        onClose={() => { if (!busy) setConfirmCohort(null); }}
        title={tr('Xác nhận đăng ký')}
        size="lg"
        footer={confirmCohort ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="danger-soft" size="md" disabled={busy} onClick={() => setConfirmCohort(null)}>
              {tr('Hủy')}
            </Button>
            <Button type="button" variant="primary" size="md" disabled={busy} loading={busy} onClick={handleConfirmEnroll}>
              {confirmCohort.hasApprovedEntitlement ? tr('Xác nhận ghi danh') : tr('Thanh toán ngay')}
            </Button>
          </div>
        ) : undefined}
      >
        {confirmCohort && (() => {
          const confirmWeeklyLines = weeklyScheduleLinesOf(confirmCohort);
          const confirmTotalSessions = confirmCohort.totalSessions ?? confirmCohort.sessions?.length ?? 0;
          const holdMinutes = Number(confirmCohort.checkoutHoldMinutes) || 10;
          return (
            <div className="space-y-4">
              {/* Identity Row: Level + Class Name | Mentor */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {confirmCohort.level && (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-[#F2CCD7] bg-[#FFF2F6] px-2.5 py-0.5 text-xs font-extrabold text-[#B53D5C]">
                      {confirmCohort.level}
                    </span>
                  )}
                  <span className="truncate text-base font-extrabold text-rp-text">{confirmCohort.name}</span>
                </div>
                <span className="hidden h-5 w-px bg-rp-line sm:inline-block" aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <UserAvatar
                    src={confirmCohort.mentorAvatarUrl}
                    name={confirmCohort.mentorName}
                    size={28}
                    className="shrink-0"
                  />
                  <span className="text-sm font-semibold text-rp-text">{confirmCohort.mentorName}</span>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
                  <p className="m-0 flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                    <span>{tr('Ngày bắt đầu')}</span>
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                    {fmtDateOnly(confirmCohort.startsAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
                  <p className="m-0 flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
                    <Repeat className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                    <span>{tr('Tần suất')}</span>
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                    {frequencyLabelOf(confirmCohort)}
                  </p>
                </div>
                <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
                  <p className="m-0 flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                    <span>{tr('Tổng số buổi')}</span>
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                    {trf('{0} buổi', { 0: confirmTotalSessions })}
                  </p>
                </div>
                <div className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2.5">
                  <p className="m-0 flex items-center gap-1.5 text-[11.5px] font-medium text-rp-text-muted">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-rp-brand" aria-hidden="true" />
                    <span>{tr('Thời lượng mỗi buổi')}</span>
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold tabular-nums text-rp-text">
                    {confirmCohort.sessionMinutes ? trf('{0} phút', { 0: confirmCohort.sessionMinutes }) : '—'}
                  </p>
                </div>
              </div>

              {/* Weekly Schedule Grid */}
              <div className="space-y-2">
                <p className="m-0 flex items-center gap-1.5 text-[13px] font-bold text-rp-text">
                  <CalendarDays className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
                  <span>{tr('Lịch học hằng tuần')}</span>
                </p>
                {confirmWeeklyLines.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {confirmWeeklyLines.map((line) => (
                      <div
                        key={line.key}
                        className="rounded-xl border border-rp-line bg-rp-surface px-3 py-2"
                      >
                        <p className="m-0 text-[11.5px] font-medium text-rp-text-muted">{line.weekdayLabel}</p>
                        <p className="m-0 mt-0.5 text-sm font-bold tabular-nums text-rp-text">{line.timeRange}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-xs text-rp-text-muted">
                    {schedulePatternText(confirmCohort.schedulePattern, confirmCohort.sessions)}
                  </p>
                )}
              </div>

              {/* Tuition & Hold Notice */}
              {confirmCohort.hasApprovedEntitlement ? (
                <Banner tone="success">
                  {tr('Ghi danh bằng quyền học đã được Quản trị viên cấp · Không phát sinh thanh toán.')}
                </Banner>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rp-brand-soft bg-rp-brand-tint/75 px-4 py-2.5">
                    <span className="text-[13px] font-semibold text-rp-text-2">{tr('Học phí trọn khóa')}</span>
                    <span className="h-4 w-px bg-rp-brand-border" aria-hidden="true" />
                    <strong className="text-lg font-extrabold tabular-nums text-rp-brand-strong">
                      {money(confirmCohort.price)}
                    </strong>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-rp-warning-line/70 bg-rp-warning-bg/55 px-3.5 py-2.5 text-xs leading-5 text-rp-text-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" aria-hidden="true" />
                    <p className="m-0">
                      {trf('Giữ chỗ {0} phút trong lúc thanh toán. Ghi danh được xác nhận sau khi thanh toán thành công.', {
                        0: holdMinutes,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
