import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { getCohorts, reconcileCoursePayment } from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import {
  Banner,
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Pagination,
  RefreshButton,
  SakuraLoader,
  SearchInput,
  TimeInput,
} from '@/components/ui';
import CohortDetailModal from './CohortDetailModal';
import CohortConfirmEnrollModal from './CohortConfirmEnrollModal';
import CohortDiscoveryCard from './CohortDiscoveryCard';
import { useCohortEnrollmentFlow } from '@/features/cohorts/hooks/useCohortEnrollmentFlow';
import {
  cohortDiscoveryStatusOf,
} from '@/features/cohorts/utils/cohortCardModel';
import { parseBusinessDate } from '@/utils/dateTimeFormat.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import {
  captureMainScrollTop,
  captureNavigationOrigin,
  consumePendingScrollRestore,
  patchListViewState,
  readListViewState,
  saveListViewState,
} from '@/utils/navigationContext.js';
import { useLocale } from '@/locales/locale.js';

const FILTER_DEBOUNCE_MS = 320;
const PAGE_SIZE = 8;

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
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams] = useSearchParams();
  const targetCohortId = Number(initialCohortId || searchParams.get('cohortId') || 0);
  const urlMentorId = /^\d+$/.test(String(initialMentorId || searchParams.get('mentorId') || ''))
    ? String(initialMentorId || searchParams.get('mentorId'))
    : '';
  const hasExplicitUrlFilter = Boolean(targetCohortId || urlMentorId);
  const shouldRestoreOnMount = !hasExplicitUrlFilter && (navigationType === 'POP' || Boolean(location.state?.restoredFromDetail));

  const [initialRestoreSnapshot] = useState(() => (
    shouldRestoreOnMount ? readListViewState('/cohorts') : null
  ));

  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    ...(initialRestoreSnapshot?.filters || {}),
    mentorId: urlMentorId || String(initialRestoreSnapshot?.filters?.mentorId || ''),
  }));
  const [searchTerm, setSearchTerm] = useState(() => String(initialRestoreSnapshot?.searchTerm || ''));
  const [sortBy, setSortBy] = useState(() => String(initialRestoreSnapshot?.sortBy || 'starts_asc'));
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = Number(initialRestoreSnapshot?.currentPage);
    return Number.isInteger(savedPage) && savedPage >= 1 ? savedPage : 1;
  });

  const [filtered, setFiltered] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const pendingScrollRef = useRef(initialRestoreSnapshot?.scrollTop ?? null);
  const autoOpenedCohortRef = useRef(0);
  const reconciledExpiredHoldIdsRef = useRef(new Set());

  // Tiêu thụ cờ khôi phục modal một lần duy nhất khi quay lại từ trang Giáo viên để tránh tự mở lại khi đóng hoặc reload.
  useEffect(() => {
    if (initialRestoreSnapshot?.restoreCohortModalId) {
      patchListViewState('/cohorts', { restoreCohortModalId: null });
    }
  }, [initialRestoreSnapshot]);

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

  const handleRefreshAll = () => {
    setRefreshTick((t) => t + 1);
    return onRefresh?.();
  };

  const {
    statusByCohortId,
    detailCohortId,
    detailCohort,
    detailStatusInfo,
    confirmCohort,
    setConfirmCohort,
    checkingCohortId,
    handleOpenDetail,
    handleCloseDetail,
    handleRequestEnroll,
    handleConfirmEnroll,
  } = useCohortEnrollmentFlow({
    cohorts,
    baseRows,
    enrolledCourses,
    initialDetailCohortId: initialRestoreSnapshot?.restoreCohortModalId || null,
    nowMs,
    onRefresh: handleRefreshAll,
    onRun,
    onEnrolled,
  });

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

  // Khôi phục vị trí cuộn sau khi danh sách lớp và lọc đã tải xong
  useEffect(() => {
    if (loadingFiltered) return;
    const fromPending = consumePendingScrollRestore(location.pathname, location.search);
    const targetTop = fromPending != null ? fromPending : pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (targetTop == null) return;
    const id = requestAnimationFrame(() => {
      const main = document.getElementById('rp-main');
      if (main) main.scrollTop = targetTop;
      else window.scrollTo(0, targetTop);
    });
    return () => cancelAnimationFrame(id);
  }, [loadingFiltered, location.pathname, location.search]);

  // Deep-link highlight & auto-scroll khi đi từ /mentors/:id?cohortId=...
  useEffect(() => {
    if (!targetCohortId || autoOpenedCohortRef.current === targetCohortId) return;
    if (!visibleCohorts.some((c) => Number(c.id) === targetCohortId)) return;
    autoOpenedCohortRef.current = targetCohortId;
    const el = document.getElementById(`cohort-discovery-card-${targetCohortId}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetCohortId, visibleCohorts]);

  const setFilter = (key, value) => setFilters((cur) => ({ ...cur, [key]: value }));

  const saveDiscoveryContextBeforeMentorNav = (modalCohortId = null) => {
    saveListViewState('/cohorts', {
      filters,
      searchTerm,
      sortBy,
      currentPage: safePage,
      search: location.search || '',
      scrollTop: captureMainScrollTop(),
      restoreCohortModalId: modalCohortId ? Number(modalCohortId) : null,
    });
  };

  const levelSelectOptions = [
    { value: '', label: 'Tất cả' },
    ...levelOptions.map((lvl) => ({ value: lvl, label: formatJlptLevel(lvl) })),
  ];
  const frequencySelectOptions = [
    { value: '', label: 'Tất cả' },
    ...frequencyOptions.map((n) => ({
      value: String(n),
      label: trf('{0} buổi/tuần', { 0: n }),
    })),
  ];
  const weekdaySelectOptions = [
    { value: '', label: 'Tất cả' },
    ...WEEKDAYS,
  ];
  const hasDiscoverableSource = useMemo(
    () => cohorts.some((c) => !statusByCohortId.get(Number(c.id))?.isExpiredOrHidden),
    [cohorts, statusByCohortId],
  );
  const isSourceEmpty = !hasDiscoverableSource && !hasServerFilter && !searchTerm.trim();

  return (
    <div className="space-y-4">
      {/* Toolbar tìm kiếm, lọc và sắp xếp (ẩn hoàn toàn khi không có lớp học nào mở đăng ký) */}
      {!isSourceEmpty && (
      <div className="rounded-rp-card border border-rp-line bg-rp-surface p-3.5 shadow-rp-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput
            size="md"
            floatingLabel={false}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder={tr('Tìm tên lớp hoặc Giáo viên…')}
            aria-label={tr('Tìm tên lớp hoặc Giáo viên')}
            className="min-w-[200px] flex-1 basis-[210px]"
          />

          <CustomSelect
            fitContent
            size="md"
            label={tr('Cấp độ')}
            value={filters.level}
            onChange={(val) => setFilter('level', val)}
            options={levelSelectOptions}
            aria-label={tr('Cấp độ')}
          />

          <CustomSelect
            fitContent
            size="md"
            label={tr('Tần suất')}
            value={filters.sessionsPerWeek}
            onChange={(val) => setFilter('sessionsPerWeek', val)}
            options={frequencySelectOptions}
            aria-label={tr('Tần suất')}
          />

          <CustomSelect
            fitContent
            size="md"
            label={tr('Thứ trong tuần')}
            value={filters.weekday}
            onChange={(val) => setFilter('weekday', val)}
            options={weekdaySelectOptions}
            aria-label={tr('Thứ trong tuần')}
          />

          <div className="flex items-center gap-1.5">
            <TimeInput
              size="md"
              fitContent
              label={tr('Từ giờ')}
              value={filters.fromTime}
              onChange={(e) => setFilter('fromTime', e.target.value)}
              aria-label={tr('Từ giờ')}
            />
            <TimeInput
              size="md"
              fitContent
              label={tr('Đến giờ')}
              value={filters.toTime}
              onChange={(e) => setFilter('toTime', e.target.value)}
              aria-label={tr('Đến giờ')}
            />
          </div>

          <CustomSelect
            fitContent
            size="md"
            label={tr('Sắp xếp')}
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            aria-label={tr('Sắp xếp')}
          />

          <div className="ml-auto shrink-0">
            <RefreshButton
              size="md"
              onRefresh={handleRefreshAll}
              refreshing={Boolean(refreshing || loadingFiltered)}
            />
          </div>
        </div>
      </div>
      )}

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
                const isHighlighted = targetCohortId > 0 && Number(cohort.id) === targetCohortId;
                const isCheckingThis = Number(checkingCohortId) === Number(cohort.id);

                return (
                  <CohortDiscoveryCard
                    key={cohort.id}
                    cohort={cohort}
                    statusInfo={statusInfo}
                    busy={busy}
                    checking={isCheckingThis}
                    highlighted={isHighlighted}
                    mentorLinkState={{
                      navigationOrigin: captureNavigationOrigin(location, {
                        backLabel: 'Quay lại Khám phá lớp học',
                      }),
                    }}
                    onBeforeMentorNavigate={() => saveDiscoveryContextBeforeMentorNav(null)}
                    onOpenDetail={handleOpenDetail}
                    onEnroll={handleRequestEnroll}
                    onViewCourse={(courseId, actionKind) => onEnrolled?.(courseId, actionKind)}
                  />
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
        mentorLinkState={{
          navigationOrigin: captureNavigationOrigin(location, {
            backLabel: 'Quay lại chi tiết lớp',
          }),
        }}
        onBeforeMentorNavigate={(c) => saveDiscoveryContextBeforeMentorNav(c?.id || detailCohortId)}
        onClose={handleCloseDetail}
        onEnroll={handleRequestEnroll}
        onViewCourse={(courseId, actionKind) => {
          handleCloseDetail();
          onEnrolled?.(courseId, actionKind);
        }}
      />

      {/* Modal xác nhận ghi danh & chuyển thanh toán PayOS (dùng chung) */}
      <CohortConfirmEnrollModal
        cohort={confirmCohort}
        busy={busy}
        onClose={() => setConfirmCohort(null)}
        onConfirm={handleConfirmEnroll}
      />
    </div>
  );
}
