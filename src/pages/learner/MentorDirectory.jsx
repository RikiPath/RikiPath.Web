import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpDown,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarClock,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  captureMainScrollTop,
  captureNavigationOrigin,
  consumePendingScrollRestore,
  readListViewState,
  saveListViewState,
} from '@/utils/navigationContext.js';
import { LearnerShell } from '@/layouts';
import { searchMentors } from '@/features/mentor/api/mentorProfileApi.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import {
  Avatar,
  Button,
  CountBadge,
  CustomSelect,
  EmptyState,
  ErrorState,
  PageContainer,
  Popover,
  RatingStars,
  RefreshingIndicator,
  SakuraLoader,
  Switch,
  TimeInput,
  UnifiedToolbar,
  useDebouncedValue,
} from '@/components/ui';
import { IllustratedPageHeader } from '@/features/learner-ui';
import Pagination from '@/components/ui/Pagination.jsx';
import { useLocale } from '@/locales/locale.js';

const LEVELS = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 9;
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Phù hợp nhất' },
  { value: 'rating_desc', label: 'Đánh giá cao nhất' },
  { value: 'experience_desc', label: 'Kinh nghiệm nhiều nhất' },
];

function toClockMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return h * 60 + m;
}

/**
 * Group Learning entry: Mentor -> Profile -> Published Cohorts -> Cohort detail -> checkout.
 * Uses `GET /api/mentors` (MentorDiscoveryController); paging is server-side.
 */
export default function MentorDirectory() {
  const { tr, trf } = useLocale();
  const location = useLocation();
  const navigationType = useNavigationType();
  const shouldRestoreOnMount = navigationType === 'POP' || Boolean(location.state?.restoredFromDetail);
  const savedState = shouldRestoreOnMount ? readListViewState('/mentors') : null;

  const [term, setTerm] = useState(() => String(savedState?.term ?? ''));
  const [level, setLevel] = useState(() => String(savedState?.level ?? ''));
  const [weekdays, setWeekdays] = useState(() =>
    Array.isArray(savedState?.weekdays) ? savedState.weekdays.map(Number).filter((d) => d >= 0 && d <= 6) : [],
  );
  const [fromTime, setFromTime] = useState(() => String(savedState?.fromTime ?? ''));
  const [toTime, setToTime] = useState(() => String(savedState?.toTime ?? ''));
  const [onlyRecruiting, setOnlyRecruiting] = useState(() => Boolean(savedState?.onlyRecruiting));
  const [sortBy, setSortBy] = useState(() => String(savedState?.sortBy || 'relevance'));
  const [page, setPage] = useState(() => {
    const savedPage = Number(savedState?.page);
    return Number.isInteger(savedPage) && savedPage >= 1 ? savedPage : 1;
  });
  const pendingScrollRef = useRef(savedState?.scrollTop ?? null);
  const search = useDebouncedValue(term.trim(), 350);

  const timeRangeInvalid = useMemo(() => {
    const startMin = toClockMinutes(fromTime);
    const endMin = toClockMinutes(toTime);
    return startMin != null && endMin != null && startMin >= endMin;
  }, [fromTime, toTime]);

  const effectiveFromTime = !timeRangeInvalid && fromTime ? fromTime : undefined;
  const effectiveToTime = !timeRangeInvalid && toTime ? toTime : undefined;
  const weekdaysParam = weekdays.length > 0 ? weekdays.join(',') : undefined;

  const persistDirectoryState = (overrideScrollTop = null) => {
    saveListViewState('/mentors', {
      term,
      level,
      weekdays,
      fromTime,
      toTime,
      onlyRecruiting,
      sortBy,
      page,
      search: location.search || '',
      scrollTop: overrideScrollTop != null ? overrideScrollTop : captureMainScrollTop(),
    });
  };

  const query = useQuery({
    queryKey: [
      'mentor-directory',
      search,
      level,
      weekdaysParam || '',
      effectiveFromTime || '',
      effectiveToTime || '',
      onlyRecruiting,
      sortBy,
      page,
    ],
    queryFn: () =>
      searchMentors({
        searchTerm: search || undefined,
        teachingJlptLevel: level || undefined,
        weekdays: weekdaysParam,
        fromTime: effectiveFromTime,
        toTime: effectiveToTime,
        onlyRecruiting: onlyRecruiting || undefined,
        sortBy,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const hasFilters = Boolean(
    term.trim() || level || weekdays.length > 0 || fromTime || toTime || onlyRecruiting || sortBy !== 'relevance',
  );
  const hasFilterQuery = Boolean(
    search || level || weekdaysParam || effectiveFromTime || effectiveToTime || onlyRecruiting,
  );

  const unfilteredCountQuery = useQuery({
    queryKey: ['mentor-directory-unfiltered-count'],
    queryFn: () => searchMentors({ page: 1, pageSize: 1 }),
    staleTime: 60_000,
    enabled: hasFilterQuery,
  });

  const items = query.data?.items || [];
  const total = query.data?.totalCount ?? items.length;
  const hasNoMentors = query.isSuccess && (hasFilterQuery
    ? unfilteredCountQuery.isSuccess && unfilteredCountQuery.data?.totalCount === 0
    : total === 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!query.isSuccess) return;
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
  }, [query.isSuccess, location.pathname, location.search]);

  const levelOptions = LEVELS.map((l) => ({
    value: l,
    label: l ? formatJlptLevel(l) : tr('Tất cả'),
  }));

  const sortOptions = SORT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: tr(opt.label),
  }));

  const resetAllFilters = () => {
    setTerm('');
    setLevel('');
    setWeekdays([]);
    setFromTime('');
    setToTime('');
    setOnlyRecruiting(false);
    setSortBy('relevance');
    setPage(1);
  };

  const toggleWeekday = (day) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day],
    );
    setPage(1);
  };

  const scheduleFilterCount =
    (weekdays.length > 0 ? 1 : 0) + (fromTime || toTime ? 1 : 0) + (onlyRecruiting ? 1 : 0);

  const showDirectoryToolbar = !query.isPending && !query.isError && !hasNoMentors;

  return (
    <LearnerShell breadcrumb={tr('Tìm Giáo viên')}>
      <PageContainer width="default" className="relative space-y-4">
        <IllustratedPageHeader
          icon="group"
          tone="sakura"
          eyebrow={tr('Học cùng Giáo viên')}
          title={tr('Tìm Giáo viên')}
          description={tr('Tìm Giáo viên phù hợp với mục tiêu và lịch học của bạn.')}
        />

        {showDirectoryToolbar && (
          <div className="space-y-2.5">
            <UnifiedToolbar
              search={{
                value: term,
                onChange: (e) => {
                  setTerm(e.target.value);
                  setPage(1);
                },
                onClear: () => {
                  setTerm('');
                  setPage(1);
                },
                placeholder: 'Tìm theo tên hoặc chuyên môn…',
                ariaLabel: tr('Tìm theo tên hoặc chuyên môn'),
              }}
              filters={
                <div className="flex flex-wrap items-center gap-2">
                  <CustomSelect
                    fitContent
                    size="md"
                    value={level}
                    onChange={(nextLevel) => {
                      setLevel(nextLevel);
                      setPage(1);
                    }}
                    options={levelOptions}
                    aria-label={tr('Cấp độ')}
                  />
                  <Popover
                    align="start"
                    label={tr('Bộ lọc lịch học')}
                    panelClassName="w-[340px] p-4 space-y-4"
                    trigger={({ open, toggle, props }) => (
                      <button
                        type="button"
                        onClick={toggle}
                        {...props}
                        className={`rp-focus inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                          open || scheduleFilterCount > 0
                            ? 'border-rp-brand-border bg-rp-brand-soft/60 text-rp-brand-strong'
                            : 'border-rp-line bg-rp-surface text-rp-text hover:border-rp-line-strong'
                        }`}
                      >
                        <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
                        <span>{tr('Lịch học')}</span>
                        <CountBadge count={scheduleFilterCount} size="sm" />
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 text-rp-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-rp-text">
                          {tr('Ngày có thể tham gia học')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WEEKDAY_OPTIONS.map((day) => {
                            const selected = weekdays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleWeekday(day.value)}
                                className={`rp-focus rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  selected
                                    ? 'border-rp-brand bg-rp-brand text-white'
                                    : 'border-rp-line bg-rp-surface-2 text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text'
                                }`}
                              >
                                {tr(day.label)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-rp-text">
                          {tr('Khung giờ học mong muốn')}
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                          <TimeInput
                            size="sm"
                            step={900}
                            label={tr('Từ giờ')}
                            value={fromTime}
                            onChange={(e) => {
                              setFromTime(e.target.value);
                              setPage(1);
                            }}
                          />
                          <TimeInput
                            size="sm"
                            step={900}
                            label={tr('Đến giờ')}
                            value={toTime}
                            onChange={(e) => {
                              setToTime(e.target.value);
                              setPage(1);
                            }}
                          />
                        </div>
                        {timeRangeInvalid && (
                          <p className="mt-1.5 text-xs font-medium text-rp-danger" role="alert">
                            {tr('Giờ bắt đầu phải sớm hơn giờ kết thúc.')}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-rp-line pt-3">
                        <Switch
                          checked={onlyRecruiting}
                          onCheckedChange={(checked) => {
                            setOnlyRecruiting(checked);
                            setPage(1);
                          }}
                          label={tr('Chỉ xem Giáo viên có lớp đang tuyển sinh')}
                          className="min-h-0 py-0 text-xs font-medium"
                        />
                      </div>

                      {scheduleFilterCount > 0 && (
                        <div className="flex justify-end border-t border-rp-line pt-2.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setWeekdays([]);
                              setFromTime('');
                              setToTime('');
                              setOnlyRecruiting(false);
                              setPage(1);
                            }}
                          >
                            {tr('Đặt lại lịch')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Popover>
                </div>
              }
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <CustomSelect
                    fitContent
                    size="md"
                    icon={ArrowUpDown}
                    label={tr('Sắp xếp')}
                    value={sortBy}
                    onChange={(nextSort) => {
                      setSortBy(nextSort);
                      setPage(1);
                    }}
                    options={sortOptions}
                    aria-label={tr('Sắp xếp danh sách Giáo viên')}
                  />
                  {hasFilters && (
                    <Button
                      size="md"
                      variant="ghost"
                      icon={X}
                      onClick={resetAllFilters}
                    >
                      {tr('Xóa bộ lọc')}
                    </Button>
                  )}
                </div>
              }
            />

            {(weekdays.length > 0 || fromTime || toTime || onlyRecruiting) && (
              <div className="flex flex-wrap items-center gap-2 px-1">
                {weekdays
                  .slice()
                  .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                  .map((day) => {
                    const label = WEEKDAY_OPTIONS.find((item) => item.value === day)?.label || '';
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        className="rp-focus inline-flex items-center gap-1 rounded-full border border-rp-brand-border bg-rp-brand-soft/60 px-2.5 py-1 text-xs font-medium text-rp-brand-strong hover:bg-rp-brand-soft"
                      >
                        <span>{tr(label)}</span>
                        <X aria-hidden="true" className="h-3 w-3" />
                      </button>
                    );
                  })}
                {(fromTime || toTime) && !timeRangeInvalid && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromTime('');
                      setToTime('');
                      setPage(1);
                    }}
                    className="rp-focus inline-flex items-center gap-1 rounded-full border border-rp-line bg-rp-surface px-2.5 py-1 text-xs font-medium text-rp-text-2 hover:border-rp-line-strong"
                  >
                    <span>
                      {fromTime && toTime
                        ? `${fromTime} – ${toTime}`
                        : fromTime
                          ? trf('Từ {0}', { 0: fromTime })
                          : trf('Đến {0}', { 0: toTime })}
                    </span>
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                )}
                {onlyRecruiting && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyRecruiting(false);
                      setPage(1);
                    }}
                    className="rp-focus inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <span>{tr('Đang tuyển sinh')}</span>
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {query.isFetching && !query.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}

        {query.isPending ? (
          <SakuraLoader variant="section" context="profile" label={tr('Đang tải danh sách Giáo viên')} delay={160} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
        ) : items.length === 0 ? (
          <EmptyState
            variant={!hasNoMentors && hasFilterQuery ? 'search' : 'default'}
            illustration={!hasNoMentors && hasFilterQuery ? 'search' : 'mentor'}
            title={!hasNoMentors && hasFilterQuery ? tr('Không tìm thấy Giáo viên phù hợp') : tr('Chưa có Giáo viên công khai')}
            description={
              !hasNoMentors && hasFilterQuery
                ? tr('Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.')
                : tr('Danh sách sẽ hiển thị khi Giáo viên được duyệt hồ sơ.')
            }
            action={
              !hasNoMentors && hasFilters ? (
                <Button size="sm" variant="outline" onClick={resetAllFilters}>
                  {tr('Xóa bộ lọc')}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="@container">
            <ul
              className={`grid grid-cols-1 gap-4 @[640px]:grid-cols-2 @[980px]:grid-cols-3 ${query.isFetching ? 'opacity-70' : ''}`}
              aria-busy={query.isFetching}
            >
              {items.map((m) => {
                const recruitingCount = m.recruitingCohortCount ?? 0;
                const matchingCount = m.matchingRecruitingCohortCount ?? 0;
                const hasRecruiting = recruitingCount > 0;
                const showScheduleMatchNote =
                  hasRecruiting &&
                  (weekdays.length > 0 || Boolean(effectiveFromTime) || Boolean(effectiveToTime)) &&
                  matchingCount > 0;
                return (
                  <li key={m.mentorId}>
                    <Link
                      to={`/mentors/${m.mentorId}/`}
                      state={{
                        navigationOrigin: captureNavigationOrigin(location, {
                          backLabel: 'Quay lại danh sách giáo viên',
                        }),
                      }}
                      onClick={() => persistDirectoryState()}
                      className="rp-focus group flex h-full flex-col rounded-rp-card border border-rp-line bg-rp-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-rp-brand-border hover:shadow-rp-card"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar src={m.avatarUrl} name={m.name} size={48} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[15px] font-bold text-rp-text">{m.name}</p>
                            {m.isBookable && (
                              <BadgeCheck
                                aria-label={tr('Đã xác minh')}
                                title={tr('Đã xác minh')}
                                className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-rp-text-muted">
                            {m.expertise || tr('Giáo viên tiếng Nhật')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <RatingStars
                          rating={m.averageRating}
                          reviewCount={m.reviewCount}
                          size="sm"
                          showScore
                          showCount
                          countSuffix="đánh giá"
                          emptyLabel="Chưa có đánh giá"
                        />
                      </div>

                      <p className="mt-2.5 line-clamp-2 min-h-[44px] text-[13px] leading-[22px] text-rp-text-2">
                        {m.bio || tr('Giáo viên đồng hành cùng học viên qua các lớp nhóm trực tiếp và lộ trình luyện thi JLPT.')}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {m.jlptLevel && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rp-line bg-rp-surface-2 px-2.5 py-1 text-xs font-medium text-rp-text">
                              <Award aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
                              {trf('Chứng chỉ JLPT {0}', { 0: m.jlptLevel })}
                            </span>
                          )}
                          {Array.isArray(m.teachingJlptLevels) && m.teachingJlptLevels.length > 0 && (
                            <span className="inline-flex items-center rounded-lg border border-rp-line/80 bg-rp-surface px-2 py-1 text-xs text-rp-text-2">
                              {trf('Giảng dạy: {0}', { 0: m.teachingJlptLevels.join(', ') })}
                            </span>
                          )}
                        </div>
                        <p className="inline-flex items-center gap-1.5 text-xs text-rp-text-muted">
                          <Briefcase aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          {m.yearsOfExperience != null
                            ? trf('{0} năm kinh nghiệm', { 0: m.yearsOfExperience })
                            : tr('Chưa cập nhật kinh nghiệm')}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-rp-line/60 pt-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            hasRecruiting
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-rp-line bg-rp-surface-2 text-rp-text-muted'
                          }`}
                        >
                          <BookOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          {showScheduleMatchNote
                            ? trf('{0} lớp hợp lịch', { 0: matchingCount })
                            : hasRecruiting
                              ? recruitingCount === 1
                                ? tr('1 lớp đang tuyển sinh')
                                : trf('{0} lớp đang tuyển sinh', { 0: recruitingCount })
                              : tr('Chưa có lớp đang tuyển sinh')}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-rp-brand-strong">
                          {tr('Xem hồ sơ')}{' '}
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  totalItems={total}
                  onPageChange={setPage}
                  showPageSize={false}
                  itemLabel={tr('Giáo viên')}
                  variant="neutral"
                />
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
