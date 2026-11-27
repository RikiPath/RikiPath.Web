import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { AlertCircle, BarChart3, CheckCircle2, Clock, Layers, X } from 'lucide-react';
import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getAdminMentorKpiList,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { ADMIN_KEYS } from '@/features/admin/api/adminQueryKeys.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  DateRangePicker,
  Drawer,
  RefreshingIndicator,
  SakuraLoader,
  SearchInput,
  StaleDataBar,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatCard,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { AdminBarChart, AdminDonutChart } from '@/features/admin/components/AdminCharts.jsx';
import { AdminShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
  const toIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: toIso(from), to: toIso(to) };
}

export default function AdminMentorQuality() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const initial = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [search, setSearch] = useState('');
  const [drawerMentor, setDrawerMentor] = useState(null);

  const kpiQuery = useQuery({
    queryKey: [...ADMIN_KEYS.mentorKpis, fromDate, toDate],
    queryFn: () => getAdminMentorKpiList({ from: fromDate, to: toDate, page: 1, pageSize: 100 }),
  });

  const mentors = useMemo(() => kpiQuery.data || [], [kpiQuery.data]);
  const filteredMentors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter(
      (m) => String(m.mentorId).includes(q) || String(m.mentorName || '').toLowerCase().includes(q),
    );
  }, [mentors, search]);

  const totals = useMemo(
    () =>
      filteredMentors.reduce(
        (acc, m) => ({
          assigned: acc.assigned + (m.totalAssignedSessions || 0),
          completed: acc.completed + (m.completedValidSessions || 0),
          cancelled: acc.cancelled + (m.cancelledSessionsCount || 0),
          missed: acc.missed + (m.missedOrNoShowSessionsCount || 0),
          confirmedMinutes: acc.confirmedMinutes + (m.confirmedTeachingMinutes || 0),
          disputes: acc.disputes + (m.totalDisputesCount || 0),
        }),
        { assigned: 0, completed: 0, cancelled: 0, missed: 0, confirmedMinutes: 0, disputes: 0 },
      ),
    [filteredMentors],
  );

  const hasFilters = search.trim() !== '' || fromDate !== initial.from || toDate !== initial.to;
  const isSourceEmpty = kpiQuery.isSuccess && mentors.length === 0 && !hasFilters;
  const showToolbar = kpiQuery.isSuccess && (mentors.length > 0 || hasFilters);
  const resetFilters = () => {
    setSearch('');
    setFromDate(initial.from);
    setToDate(initial.to);
  };

  const columns = [
    {
      key: 'mentorName',
      header: tr('Giáo viên'),
      align: 'left',
      render: (m) => (
        <div>
          <p className="font-semibold text-rp-text">{m.mentorName}</p>
          {m.mentorEmail && <p className="text-xs text-rp-text-muted">{m.mentorEmail}</p>}
        </div>
      ),
    },
    {
      key: 'sessions',
      header: tr('Buổi hợp lệ / giao'),
      align: 'center',
      compact: true,
      render: (m) => (
        <span className="tabular-nums font-medium">
          {m.completedValidSessions} / {m.totalAssignedSessions}{' '}
          <span className="text-xs text-rp-text-muted">({formatCompletionRatio(m.completedValidSessions, m.totalAssignedSessions)})</span>
        </span>
      ),
    },
    {
      key: 'confirmedMinutes',
      header: tr('Thời lượng xác nhận'),
      align: 'center',
      compact: true,
      render: (m) => <span className="text-sm tabular-nums">{formatMinutesVi(m.confirmedTeachingMinutes)}</span>,
    },
    {
      key: 'outcomes',
      header: tr('Hủy · Vắng · Chờ'),
      align: 'center',
      render: (m) => (
        <span className="text-xs tabular-nums text-rp-text-2">
          {trf('{0} hủy · {1} vắng · {2} chờ', {
            0: m.cancelledSessionsCount,
            1: m.missedOrNoShowSessionsCount,
            2: m.upcomingOrIncompleteSessionsCount,
          })}
        </span>
      ),
    },
    {
      key: 'homework',
      header: tr('Bài tập (giao/nộp/chấm)'),
      align: 'center',
      compact: true,
      render: (m) => (
        <span className="tabular-nums text-xs">
          {m.homeworkAssignedCount} / {m.homeworkSubmittedCount} / {m.homeworkGradedCount}
        </span>
      ),
    },
    {
      key: 'rating',
      header: tr('Đánh giá & KN'),
      align: 'center',
      render: (m) => (
        <div className="space-y-0.5 text-xs">
          <p className="font-medium text-rp-text">
            {m.averageRating != null ? `${m.averageRating} ★ (${m.totalReviewsCount})` : tr('Chưa có đánh giá')}
          </p>
          <p className="text-rp-text-muted">
            {trf('{0} khiếu nại ({1} mở)', { 0: m.totalDisputesCount, 1: m.openDisputesCount })}
          </p>
        </div>
      ),
    },
  ];

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Điểm danh & KPI')}>
      <main data-page="AdminMentorQuality" className="rp-container py-[var(--rp-space-page-y)] space-y-4 text-rp-text">
        <AdminPageHeader
          icon={BarChart3}
          title="Điểm danh & KPI"
        />

        {/* Compact Single-Row Filter Toolbar (hidden when source dataset is truly empty) */}
        {showToolbar && (
          <AdminToolbar
            refresh={{
              onRefresh: () => kpiQuery.refetch({ cancelRefetch: true }),
              refreshing: kpiQuery.isFetching && !kpiQuery.isPending,
            }}
          >
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Tìm tên Giáo viên…"
              aria-label={tr('Tìm Giáo viên')}
              className="w-full sm:w-[240px]"
            />

            <DateRangePicker
              compact
              from={fromDate}
              to={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
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
          </AdminToolbar>
        )}

        {kpiQuery.isError && kpiQuery.data && (
          <StaleDataBar onRetry={() => kpiQuery.refetch()} retrying={kpiQuery.isFetching} />
        )}
        {kpiQuery.isFetching && !kpiQuery.isPending && (
          <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-end overflow-visible">
            <div className="mr-1 mt-1">
              <RefreshingIndicator active delay={60} />
            </div>
          </div>
        )}

        {kpiQuery.isPending && !kpiQuery.data ? (
          <SakuraLoader variant="section" context="data" delay={140} />
        ) : kpiQuery.isError && !kpiQuery.data ? (
          <ContextualErrorState
            error={kpiQuery.error}
            title={tr('Không tải được dữ liệu KPI Giáo viên')}
            onRetry={() => kpiQuery.refetch()}
          />
        ) : isSourceEmpty ? (
          <Card className="p-6">
            <ContextualEmptyState
              variant="compact"
              illustration="chart"
              title={tr('Chưa có dữ liệu điểm danh hoặc KPI Giáo viên')}
              description={tr('Dữ liệu buổi dạy, điểm danh và đánh giá sẽ hiển thị khi Giáo viên có lịch giảng dạy.')}
            />
          </Card>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                icon={Layers}
                tone="neutral"
                label="Tổng buổi được giao"
                value={totals.assigned}
              />
              <AdminStatCard
                icon={CheckCircle2}
                tone="success"
                label="Buổi hoàn thành hợp lệ"
                value={totals.completed}
                subtext={formatCompletionRatio(totals.completed, totals.assigned)}
              />
              <AdminStatCard
                icon={Clock}
                tone="brand"
                label="Thời lượng dạy đã xác nhận"
                value={formatMinutesVi(totals.confirmedMinutes)}
              />
              <AdminStatCard
                icon={AlertCircle}
                tone={totals.disputes > 0 ? 'danger' : 'info'}
                label="Tổng khiếu nại trong kỳ"
                value={totals.disputes}
              />
            </section>

            {filteredMentors.length > 0 && (
              <section className="grid gap-4 lg:grid-cols-12">
              <Card className="p-3.5 lg:col-span-5">
                <CardHeader title={tr('Phân bổ trạng thái buổi dạy')} className="mb-1.5" />
                <AdminDonutChart
                  size={132}
                  centerValue={totals.assigned}
                  centerLabel="Tổng buổi"
                  segments={[
                    { label: 'Hoàn thành hợp lệ', value: totals.completed, color: '#16A34A' },
                    { label: 'Hủy ca', value: totals.cancelled, color: '#F59E0B' },
                    { label: 'Vắng / Lỗi buổi', value: totals.missed, color: '#DC2626' },
                  ]}
                />
              </Card>

              <Card className="p-3.5 lg:col-span-7">
                <CardHeader title={tr('Số buổi hợp lệ theo Giáo viên')} className="mb-1.5" />
                <AdminBarChart
                  height={155}
                  data={filteredMentors
                    .slice(0, 8)
                    .map((m) => ({
                      label: (m.mentorName || `#${m.mentorId}`).split(' ').slice(-2).join(' '),
                      value: m.completedValidSessions || 0,
                      color: '#E05A7A',
                    }))}
                />
              </Card>
            </section>
            )}

            {filteredMentors.length === 0 ? (
              <ContextualEmptyState
                variant="search"
                illustration="search"
                title={tr('Không tìm thấy Giáo viên phù hợp')}
                description={tr('Hãy mở rộng khoảng ngày hoặc xóa từ khóa tìm kiếm.')}
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      {tr('Xóa bộ lọc')}
                    </Button>
                  ) : null
                }
              />
            ) : (
              <AdminDataTable
                columns={columns}
                rows={filteredMentors}
                rowKey={(m) => m.mentorId}
                scrollClassName="max-h-[clamp(220px,34vh,340px)]"
                itemLabel="Giáo viên"
                rowActions={(m) => (
                  <AdminRowActions>
                    <AdminIconAction
                      kind="view"
                      tooltip="Xem chi tiết điểm danh & KPI Giáo viên"
                      onClick={() => setDrawerMentor(m)}
                    />
                  </AdminRowActions>
                )}
              />
            )}
          </>
        )}

        {/* Monthly & Weekly KPI Drawer */}
        <Drawer
          open={Boolean(drawerMentor)}
          onClose={() => setDrawerMentor(null)}
          title={drawerMentor ? `${tr('Chi tiết KPI')}: ${drawerMentor.mentorName}` : ''}
          width="w-[min(860px,100vw)]"
        >
          {drawerMentor && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand" size="sm" icon={false}>
                  {tr('Phản hồi bài tập TB')}: {formatTurnaroundVi(drawerMentor.averageFeedbackTurnaroundMinutes)}
                </Badge>
                <Badge tone="neutral" size="sm" icon={false}>
                  {tr('Điểm đánh giá')}: {drawerMentor.averageRating != null ? `${drawerMentor.averageRating} ★` : tr('Chưa có')}
                </Badge>
              </div>

              <Card className="space-y-2 p-4">
                <h3 className="text-sm font-bold text-rp-text">{tr('Thống kê theo tháng')}</h3>
                <DataTable
                  emptyIllustration="chart"
                  rowKey={(p) => p.periodKey}
                  rows={drawerMentor.monthlyBreakdown || []}
                  columns={[
                    { key: 'periodKey', header: tr('Tháng'), align: 'left', render: (p) => <span className="font-semibold">{p.periodKey}</span> },
                    { key: 'sessions', header: tr('Hợp lệ / Giao'), align: 'center', render: (p) => `${p.completedValidSessions} / ${p.totalAssignedSessions}` },
                    { key: 'minutes', header: tr('Xác nhận'), align: 'center', render: (p) => formatMinutesVi(p.confirmedTeachingMinutes) },
                    { key: 'hw', header: tr('Bài tập (chấm/nộp)'), align: 'center', render: (p) => `${p.homeworkGradedCount} / ${p.homeworkSubmittedCount}` },
                    { key: 'rating', header: tr('Sao / KN'), align: 'center', render: (p) => `${p.averageRating != null ? `${p.averageRating}★` : '—'} · ${p.disputesCount}` },
                  ]}
                />
              </Card>

              <Card className="space-y-2 p-4">
                <h3 className="text-sm font-bold text-rp-text">{tr('Thống kê theo tuần')}</h3>
                <DataTable
                  emptyIllustration="chart"
                  rowKey={(p) => p.periodKey}
                  rows={(drawerMentor.weeklyBreakdown || []).slice(0, 12)}
                  columns={[
                    { key: 'periodKey', header: tr('Tuần'), align: 'left', render: (p) => <span className="font-semibold">{p.periodKey}</span> },
                    { key: 'sessions', header: tr('Hợp lệ / Giao'), align: 'center', render: (p) => `${p.completedValidSessions} / ${p.totalAssignedSessions}` },
                    { key: 'minutes', header: tr('Xác nhận'), align: 'center', render: (p) => formatMinutesVi(p.confirmedTeachingMinutes) },
                    { key: 'hw', header: tr('Bài tập (chấm/nộp)'), align: 'center', render: (p) => `${p.homeworkGradedCount} / ${p.homeworkSubmittedCount}` },
                    { key: 'cancel', header: tr('Hủy / Vắng'), align: 'center', render: (p) => `${p.cancelledSessionsCount} / ${p.missedOrNoShowSessionsCount}` },
                  ]}
                />
              </Card>
            </div>
          )}
        </Drawer>
      </main>
    </AdminShell>
  );
}
