import { useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Compass,
  FileCheck2,
  GitCompareArrows,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CustomSelect,
  DataTable,
  EmptyState,
  ErrorState,
  IconButton,
  PageContainer,
  Pagination,
  Skeleton,
  Tabs,
  Tooltip,
  UnifiedToolbar,
  cx,
} from '@/components/ui';
import { ControlGroup, IllustratedPageHeader } from '@/features/learner-ui';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import { getMockTestHistory, getMockTestPagedHistory } from '@/features/mock-test/api/mockTestApi.js';
import MockTestProgress from '@/features/mock-test/components/MockTestProgress.jsx';
import {
  formatDurationSeconds,
  formatPercentage,
  formatScaleScore,
  isPracticeKind,
  resolveAttemptTargetRoute,
  resolveMockResultDisplay,
  resolvePracticeResultDisplay,
  resolveStatusMeta,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import {
  captureMainScrollTop,
  captureNavigationOrigin,
  saveListViewState,
} from '@/utils/navigationContext.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

const PAGE_SIZE = 10;

const RANGES = [
  { value: '0', label: 'Tất cả' },
  { value: '7', label: '7 ngày gần đây' },
  { value: '30', label: '30 ngày gần đây' },
  { value: '90', label: '90 ngày gần đây' },
];

const KIND_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PRACTICE', label: 'Luyện tập' },
  { value: 'MOCK', label: 'Thi thử' },
  { value: 'PLACEMENT', label: 'Đánh giá năng lực' },
];

const HISTORY_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'expired', label: 'Hết thời gian' },
  { value: 'in_progress', label: 'Đang làm dở' },
  { value: 'abandoned', label: 'Đã bỏ lượt' },
];

const LEVEL_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
];

function formatAttemptDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

function resolveKindKey(attempt) {
  const kind = String(attempt?.examKind || attempt?.attemptKind || '').toLowerCase();
  if (kind === 'placement') return 'PLACEMENT';
  if (isPracticeKind(kind)) return 'PRACTICE';
  return 'MOCK';
}

function resolveKindBadge(kindKey, tr) {
  if (kindKey === 'PRACTICE') return { label: tr('Luyện tập'), tone: 'info', Icon: Layers };
  if (kindKey === 'PLACEMENT') return { label: tr('Đánh giá năng lực'), tone: 'brand', Icon: Compass };
  return { label: tr('Thi thử JLPT'), tone: 'neutral', Icon: FileCheck2 };
}

function AttemptScoreCell({ attempt, tr }) {
  const status = String(attempt?.attemptStatus || '').toLowerCase();
  if (status === 'in_progress') {
    return <span className="text-xs text-rp-text-muted">{tr('Đang thực hiện')}</span>;
  }
  if (status === 'abandoned') {
    return <span className="text-xs text-rp-text-muted">—</span>;
  }

  const kindKey = resolveKindKey(attempt);
  if (kindKey === 'PLACEMENT') {
    return (
      <div className="space-y-0.5">
        <p className="text-[15px] font-extrabold tabular-nums text-rp-brand-strong">
          {Math.round(Number(attempt.totalScore || 0))}%
        </p>
        {attempt.assessedJlptLevelName && (
          <p className="text-[11px] text-rp-text-muted">{tr('Ước tính:')}{' '}{attempt.assessedJlptLevelName}</p>
        )}
      </div>
    );
  }

  if (kindKey === 'PRACTICE') {
    const p = resolvePracticeResultDisplay(attempt, tr);
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cx('text-[15px] font-extrabold tabular-nums', p.classes.scoreText)}>
          {p.isValid ? `${formatScaleScore(p.score10)}/10` : formatPercentage(p.accuracyPct)}
        </span>
        <Badge tone={p.classes.badgeTone} size="sm" icon={false}>{p.bandLabel}</Badge>
      </div>
    );
  }

  const m = resolveMockResultDisplay(attempt, tr);
  return m.isValid ? (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cx('text-[15px] font-extrabold tabular-nums', m.classes.scoreText)}>
        {formatScaleScore(m.score180, 0)}/{m.max180}
      </span>
      {m.passStatusLabel && (
        <Badge tone={m.classes.badgeTone} size="sm" icon={false}>{m.passStatusLabel}</Badge>
      )}
    </div>
  ) : (
    <span className="text-xs font-semibold text-rp-warning">{tr('Chưa đủ dữ liệu tính điểm')}</span>
  );
}

export default function ExamResult() {
  const { tr, trf } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Persist tab & all filters cleanly in URL search params so returning from Result Detail restores exact state!
  const activeTab = params.get('tab') === 'compare' ? 'compare' : 'history';
  const focusedCompareAttemptId = Number(params.get('attemptId')) || null;
  const kindFilter = params.get('kind') || 'ALL';
  const statusFilter = params.get('status') || 'ALL';
  const levelFilter = params.get('level') || 'ALL';
  const daysFilter = params.get('days') || '0';
  const keyword = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const updateParam = useCallback((updates, { resetPage = true } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === '' || v === 'ALL' && (k === 'kind' || k === 'status' || k === 'level') || (k === 'days' && v === '0')) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      if (resetPage) next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  // Server-paged History list
  const pagedQuery = useQuery({
    queryKey: ['mock-test-history', 'paged', user?.userId, { kindFilter, statusFilter, levelFilter, daysFilter, keyword, page }],
    queryFn: async () => {
      try {
        return await getMockTestPagedHistory({
          kind: kindFilter,
          status: statusFilter,
          level: levelFilter,
          days: Number(daysFilter),
          search: keyword,
          page,
          pageSize: PAGE_SIZE,
        });
      } catch (err) {
        if (err?.status !== 404) throw err;
        // Fallback for older Backend builds without /history/paged
        const list = await getMockTestHistory({
          kind: kindFilter !== 'ALL' ? kindFilter : undefined,
          status: statusFilter,
        });
        const items = Array.isArray(list) ? list : [];
        return {
          items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
          total: items.length,
          page,
          pageSize: PAGE_SIZE,
          hasMore: page * PAGE_SIZE < items.length,
          stats: null,
        };
      }
    },
    enabled: isAuthenticated && activeTab === 'history',
    staleTime: 30_000,
    retry: false,
  });

  // Comparison tab fetches full scored dataset independently of list pagination/filters
  const compareQuery = useQuery({
    queryKey: ['mock-test-history', user?.userId, 'compare-source'],
    queryFn: () => getMockTestHistory({ status: 'ALL' }),
    enabled: isAuthenticated && activeTab === 'compare',
    staleTime: 60_000,
    retry: false,
  });

  const pagedData = pagedQuery.data;
  const rows = pagedData?.items ?? [];
  const totalItems = Number(pagedData?.total ?? 0);
  const stats = pagedData?.stats ?? null;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const hasFilters = kindFilter !== 'ALL' || statusFilter !== 'ALL' || levelFilter !== 'ALL' || daysFilter !== '0' || Boolean(keyword.trim());

  // Unfiltered check when filters return 0 (or stats missing/0) to distinguish DB-empty vs filtered-zero cleanly.
  const hasStats = Boolean(stats && typeof stats.totalAttempts === 'number');
  const unfilteredCountQuery = useQuery({
    queryKey: ['mock-test-history', 'unfiltered-count', user?.userId],
    queryFn: async () => {
      try {
        return await getMockTestPagedHistory({ page: 1, pageSize: 1 });
      } catch (err) {
        if (err?.status !== 404) throw err;
        const list = await getMockTestHistory({ status: 'ALL' });
        return { total: Array.isArray(list) ? list.length : 0 };
      }
    },
    enabled: isAuthenticated && activeTab === 'history' && hasFilters && pagedQuery.isSuccess && (!hasStats || stats.totalAttempts === 0),
    staleTime: 60_000,
    retry: false,
  });

  const hasSourceAttempts = pagedQuery.isSuccess && (
    hasStats && stats.totalAttempts > 0
      ? true
      : hasFilters
        ? (unfilteredCountQuery.isSuccess ? Number(unfilteredCountQuery.data?.total ?? 0) > 0 : rows.length > 0 || unfilteredCountQuery.isPending)
        : totalItems > 0
  );
  const showHistoryToolbar = pagedQuery.isSuccess && hasSourceAttempts;

  function resetAllFilters() {
    setParams((prev) => {
      const next = new URLSearchParams();
      if (prev.get('tab') === 'compare') next.set('tab', 'compare');
      return next;
    }, { replace: true });
  }

  const openAttempt = useCallback((attempt) => {
    if (!attempt || String(attempt.attemptStatus).toLowerCase() === 'abandoned') return;
    saveListViewState('/exam-result', {
      search: location.search,
      scrollTop: captureMainScrollTop(),
    });
    const dest = resolveAttemptTargetRoute(attempt);
    navigate(dest, {
      state: {
        navigationOrigin: captureNavigationOrigin(location, { backLabel: 'Quay lại lịch sử' }),
      },
    });
  }, [location, navigate]);

  const columns = useMemo(() => [
    {
      key: 'title',
      header: tr('Bài làm'),
      render: (attempt) => {
        const meta = resolveKindBadge(resolveKindKey(attempt), tr);
        const duration = formatDurationSeconds(attempt.durationSeconds, trf);
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rp-brand-border/70 bg-rp-brand-tint/40 text-rp-brand-strong">
              <meta.Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="max-w-[280px] truncate font-semibold text-rp-text">{tr(attempt.title)}</p>
              <p className="text-[11px] text-rp-text-muted tabular-nums">
                {attempt.jlptLevelName || 'JLPT'}
                {attempt.totalQuestions > 0 ? ` · ${attempt.totalQuestions} ${tr('câu')}` : ''}
                {duration ? ` · ${duration}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'kind',
      header: tr('Loại bài'),
      align: 'center',
      compact: true,
      render: (attempt) => {
        const meta = resolveKindBadge(resolveKindKey(attempt), tr);
        return <Badge tone={meta.tone} size="sm" icon={false}>{meta.label}</Badge>;
      },
    },
    {
      key: 'submittedAt',
      header: tr('Ngày làm'),
      align: 'center',
      compact: true,
      render: (attempt) => (
        <span className="whitespace-nowrap text-xs text-rp-text-2">
          {formatAttemptDate(attempt.submittedAt || attempt.startedAt)}
        </span>
      ),
    },
    {
      key: 'result',
      header: tr('Kết quả'),
      align: 'left',
      render: (attempt) => <AttemptScoreCell attempt={attempt} tr={tr} />,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      compact: true,
      render: (attempt) => {
        const st = resolveStatusMeta(attempt.attemptStatus, tr);
        return <Badge tone={st.tone} size="sm" icon={false}>{st.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: tr('Thao tác'),
      align: 'center',
      compact: true,
      render: (attempt) => {
        const st = String(attempt.attemptStatus || '').toLowerCase();
        if (st === 'abandoned') {
          return <span className="text-xs text-rp-text-muted">{tr('Đã hủy lượt')}</span>;
        }
        const canCompare = st === 'completed' || st === 'expired' || !st;
        return (
          <div className="inline-flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {canCompare && (
              <Tooltip content={tr('So sánh kết quả')}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  icon={GitCompareArrows}
                  label={tr('So sánh kết quả')}
                  onClick={() => updateParam({ tab: 'compare', attemptId: attempt.attemptId }, { resetPage: false })}
                />
              </Tooltip>
            )}
            <Button
              type="button"
              variant={st === 'in_progress' ? 'primary' : 'outline'}
              size="sm"
              iconRight={ChevronRight}
              onClick={() => openAttempt(attempt)}
            >
              {st === 'in_progress' ? tr('Làm tiếp') : tr('Xem kết quả')}
            </Button>
          </div>
        );
      },
    },
  ], [tr, trf, openAttempt, updateParam]);

  const kindOptions = useMemo(() => KIND_FILTERS.map((o) => ({ value: o.value, label: tr(o.label) })), [tr]);
  const levelOptions = useMemo(() => LEVEL_FILTERS.map((o) => ({ value: o.value, label: tr(o.label) })), [tr]);
  const statusOptions = useMemo(() => HISTORY_STATUS_FILTERS.map((o) => ({ value: o.value, label: tr(o.label) })), [tr]);
  const rangeOptions = useMemo(() => RANGES.map((o) => ({ value: o.value, label: tr(o.label) })), [tr]);

  return (
    <LearnerShell pathname={location.pathname} breadcrumb={tr('Lịch sử & kết quả')}>
      <PageContainer data-page="ExamResult" width="wide" className="space-y-4">
        <IllustratedPageHeader
          icon="mock"
          tone="rose"
          title={tr('Lịch sử & kết quả')}
          description={tr('Xem lại bài làm, điểm số và theo dõi sự tiến bộ của bạn.')}
          actions={
            <ControlGroup>
              <Button as={Link} to="/practice-sets/" variant="outline" size="md" icon={Layers}>
                {tr('Bộ đề luyện tập')}
              </Button>
              <Button as={Link} to="/mock-tests/" variant="primary" size="md" icon={FileCheck2}>
                {tr('Thi thử JLPT')}
              </Button>
            </ControlGroup>
          }
        />

        {/* Primary Workspace Tabs: Lịch sử làm bài | So sánh tiến độ */}
        <Tabs
          variant="line"
          value={activeTab}
          onChange={(nextTab) => updateParam({ tab: nextTab, attemptId: nextTab === 'compare' ? focusedCompareAttemptId : null }, { resetPage: false })}
          tabs={[
            { value: 'history', label: tr('Lịch sử làm bài') },
            { value: 'compare', label: tr('So sánh tiến độ') },
          ]}
        />

        {activeTab === 'history' ? (
          <>
            {/* Compact Horizontal KPI Bar */}
            {stats && stats.totalAttempts > 0 && (
              <div
                data-testid="exam-history-stats-bar"
                className="grid grid-cols-2 gap-3 rounded-rp-card border border-rp-line bg-rp-surface px-4 py-3 shadow-rp-xs lg:grid-cols-4"
              >
                <div>
                  <p className="text-[11px] font-semibold text-rp-text-muted">{tr('Tổng lượt làm')}</p>
                  <p className="mt-0.5 text-lg font-extrabold tabular-nums text-rp-text">{stats.totalAttempts}</p>
                  <p className="text-[11px] text-rp-text-muted tabular-nums">
                    {trf('{0} luyện tập · {1} thi thử · {2} đánh giá', {
                      0: stats.practiceCount,
                      1: stats.mockCount,
                      2: stats.placementCount,
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-rp-text-muted">{tr('Tỷ lệ hoàn thành')}</p>
                  <p className="mt-0.5 text-lg font-extrabold tabular-nums text-rp-text">
                    {stats.completionRatePercent != null ? `${stats.completionRatePercent}%` : '—'}
                  </p>
                  <p className="text-[11px] text-rp-text-muted tabular-nums">
                    {trf('{0}/{1} lượt đã nộp', { 0: stats.completedCount, 1: stats.totalAttempts })}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-rp-text-muted">{tr('TB Luyện tập (thang 10)')}</p>
                  <p className="mt-0.5 text-lg font-extrabold tabular-nums text-rp-brand-strong">
                    {stats.averagePracticeScore10 != null ? `${formatScaleScore(stats.averagePracticeScore10)}/10` : '—'}
                  </p>
                  <p className="text-[11px] text-rp-text-muted">{tr('Tính riêng trên bộ đề luyện tập')}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-rp-text-muted">{tr('Thi thử JLPT (thang 180)')}</p>
                  <p className="mt-0.5 text-lg font-extrabold tabular-nums text-rp-text">
                    {stats.bestMockScore180 != null ? `${formatScaleScore(stats.bestMockScore180, 0)}/180` : '—'}
                  </p>
                  <p className="text-[11px] text-rp-text-muted tabular-nums">
                    {stats.averageMockScore180 != null
                      ? trf('TB: {0}/180', { 0: formatScaleScore(stats.averageMockScore180, 0) })
                      : tr('Chưa có lượt thi thử hợp lệ')}
                  </p>
                </div>
              </div>
            )}

            {/* Single Unified Filter Toolbar (chỉ hiện khi có lịch sử làm bài) */}
            {showHistoryToolbar && (
            <UnifiedToolbar
              ariaLabel={tr('Bộ lọc lịch sử làm bài')}
              search={{
                value: keyword,
                onChange: (val) => updateParam({ q: val }),
                placeholder: tr('Tìm theo tên bài...'),
                size: 'md',
              }}
              filters={
                <div className="flex flex-wrap items-center gap-2">
                  <CustomSelect
                    value={levelFilter}
                    onChange={(val) => updateParam({ level: val })}
                    options={levelOptions}
                    size="md"
                    fitContent
                    aria-label={tr('Cấp độ')}
                  />
                  <CustomSelect
                    value={kindFilter}
                    onChange={(val) => updateParam({ kind: val })}
                    options={kindOptions}
                    size="md"
                    fitContent
                    aria-label={tr('Loại bài')}
                  />
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => updateParam({ status: val })}
                    options={statusOptions}
                    size="md"
                    fitContent
                    aria-label={tr('Trạng thái')}
                  />
                  <CustomSelect
                    value={daysFilter}
                    onChange={(val) => updateParam({ days: val })}
                    options={rangeOptions}
                    size="md"
                    fitContent
                    aria-label={tr('Thời gian')}
                  />
                  {hasFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      icon={RotateCcw}
                      onClick={resetAllFilters}
                    >
                      {tr('Đặt lại')}
                    </Button>
                  )}
                </div>
              }
            />
            )}

            {/* History Content */}
            {pagedQuery.isPending ? (
              <div className="space-y-2.5">
                <Skeleton className="h-14 rounded-rp-card" />
                <Skeleton className="h-14 rounded-rp-card" />
                <Skeleton className="h-14 rounded-rp-card" />
              </div>
            ) : pagedQuery.isError ? (
              <Card>
                <ErrorState
                  error={pagedQuery.error}
                  title={tr('Chưa tải được lịch sử làm bài')}
                  onRetry={() => pagedQuery.refetch()}
                  retrying={pagedQuery.isFetching}
                />
              </Card>
            ) : rows.length === 0 ? (
              <Card>
                <EmptyState
                  illustration={hasFilters && hasSourceAttempts ? 'search' : 'history'}
                  title={hasFilters && hasSourceAttempts ? tr('Không tìm thấy kết quả phù hợp') : tr('Chưa có lượt làm bài nào')}
                  description={
                    hasFilters && hasSourceAttempts
                      ? tr('Thử đổi cấp độ, loại bài, trạng thái hoặc từ khóa tìm kiếm.')
                      : tr('Hoàn thành một bộ đề luyện tập, đề thi thử JLPT hoặc đánh giá năng lực để lưu lịch sử tại đây.')
                  }
                  action={
                    hasFilters && hasSourceAttempts ? (
                      <Button variant="secondary" onClick={resetAllFilters}>
                        {tr('Xóa bộ lọc')}
                      </Button>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button as={Link} to="/practice-sets/" variant="outline" size="sm">
                          {tr('Khám phá bộ đề')}
                        </Button>
                        <Button as={Link} to="/mock-tests/" variant="primary" size="sm">
                          {tr('Thi thử JLPT')}
                        </Button>
                      </div>
                    )
                  }
                />
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable
                    columns={columns}
                    rows={rows}
                    rowKey={(row) => `${resolveKindKey(row)}-${row.attemptId}`}
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={totalItems}
                    onPageChange={(nextPage) => updateParam({ page: nextPage }, { resetPage: false })}
                    onRowClick={(row) => openAttempt(row)}
                    density="compact"
                    minTableWidth="min-w-full"
                    itemLabel={tr('lượt làm bài')}
                  />
                </div>

                {/* Mobile Compact Cards */}
                <div className="space-y-2.5 md:hidden">
                  {rows.map((attempt) => {
                    const meta = resolveKindBadge(resolveKindKey(attempt), tr);
                    const statusMeta = resolveStatusMeta(attempt.attemptStatus, tr);
                    const abandoned = String(attempt.attemptStatus || '').toLowerCase() === 'abandoned';
                    const inProgress = String(attempt.attemptStatus || '').toLowerCase() === 'in_progress';
                    return (
                      <Card key={`${resolveKindKey(attempt)}-${attempt.attemptId}`} className="space-y-2.5 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {attempt.jlptLevelName && <Badge tone="brand" size="sm" icon={false}>{attempt.jlptLevelName}</Badge>}
                              <Badge tone={meta.tone} size="sm" icon={false}>{meta.label}</Badge>
                              <Badge tone={statusMeta.tone} size="sm" icon={false}>{statusMeta.label}</Badge>
                            </div>
                            <h3 className="mt-1.5 font-bold text-rp-text">{tr(attempt.title)}</h3>
                            <p className="text-xs text-rp-text-muted">{formatAttemptDate(attempt.submittedAt || attempt.startedAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-rp-line/70 pt-2">
                          <AttemptScoreCell attempt={attempt} tr={tr} />
                          {!abandoned && (
                            <Button
                              type="button"
                              size="sm"
                              variant={inProgress ? 'primary' : 'outline'}
                              iconRight={ChevronRight}
                              onClick={() => openAttempt(attempt)}
                            >
                              {inProgress ? tr('Làm tiếp') : tr('Xem kết quả')}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  {totalPages > 1 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      pageSize={PAGE_SIZE}
                      totalItems={totalItems}
                      itemLabel={tr('lượt làm bài')}
                      onPageChange={(nextPage) => updateParam({ page: nextPage }, { resetPage: false })}
                    />
                  )}
                </div>
              </>
            )}
          </>
        ) : compareQuery.isPending ? (
          <Skeleton className="h-80 rounded-rp-card" />
        ) : compareQuery.isError ? (
          <Card>
            <ErrorState
              error={compareQuery.error}
              title={tr('Chưa tải được dữ liệu để so sánh')}
              onRetry={() => compareQuery.refetch()}
              retrying={compareQuery.isFetching}
            />
          </Card>
        ) : (
          <MockTestProgress
            attempts={compareQuery.data ?? []}
            userId={user?.userId}
            initialAttemptId={focusedCompareAttemptId}
          />
        )}
      </PageContainer>
    </LearnerShell>
  );
}
