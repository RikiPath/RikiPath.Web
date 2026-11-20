import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { BarChart3, Eye, Search, X } from 'lucide-react';
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
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  DateInput,
  Drawer,
  FeatureIcon,
  IconButton,
  Input,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
} from '@/components/ui';
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
          confirmedMinutes: acc.confirmedMinutes + (m.confirmedTeachingMinutes || 0),
          disputes: acc.disputes + (m.totalDisputesCount || 0),
        }),
        { assigned: 0, completed: 0, confirmedMinutes: 0, disputes: 0 },
      ),
    [filteredMentors],
  );

  const hasFilters = search.trim() !== '' || fromDate !== initial.from || toDate !== initial.to;

  const columns = [
    {
      key: 'mentorName',
      header: tr('Giáo viên'),
      render: (m) => (
        <div>
          <p className="font-semibold text-rp-text">{m.mentorName}</p>
          <p className="text-xs text-rp-text-muted">#{m.mentorId}</p>
        </div>
      ),
    },
    {
      key: 'sessions',
      header: tr('Buổi hợp lệ / giao'),
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
      render: (m) => <span className="text-sm">{formatMinutesVi(m.confirmedTeachingMinutes)}</span>,
    },
    {
      key: 'outcomes',
      header: tr('Hủy · Vắng · Chờ'),
      render: (m) => (
        <span className="text-xs text-rp-text-2">
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
      render: (m) => (
        <span className="tabular-nums text-xs">
          {m.homeworkAssignedCount} / {m.homeworkSubmittedCount} / {m.homeworkGradedCount}
        </span>
      ),
    },
    {
      key: 'rating',
      header: tr('Đánh giá & KN'),
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
      <main data-page="AdminMentorQuality" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Vận hành & lịch dạy')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="stats" icon={BarChart3} size="lg" />
              <span>{tr('Điểm danh & KPI Giáo viên')}</span>
            </span>
          }
          description={tr('Theo dõi buổi giảng dạy thực tế (GMT+7), tỷ lệ chấm bài tập và phản hồi học viên. Không sử dụng để tính lương hay thưởng/phạt.')}
          actions={<RefreshingIndicator active={kpiQuery.isFetching && !kpiQuery.isPending} />}
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                type="search"
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Tìm tên hoặc mã Giáo viên…')}
                aria-label={tr('Tìm Giáo viên')}
              />
            </div>

            <div className="w-full sm:w-[175px]">
              <DateInput
                label={tr('Từ ngày')}
                value={fromDate}
                onChange={setFromDate}
              />
            </div>

            <div className="w-full sm:w-[175px]">
              <DateInput
                label={tr('Đến ngày')}
                value={toDate}
                onChange={setToDate}
              />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => {
                  setSearch('');
                  setFromDate(initial.from);
                  setToDate(initial.to);
                }}
              >
                {tr('Mặc định')}
              </Button>
            )}
          </div>
        </Card>

        {kpiQuery.isError && kpiQuery.data && (
          <StaleDataBar onRetry={() => kpiQuery.refetch()} retrying={kpiQuery.isFetching} />
        )}

        {kpiQuery.isPending && !kpiQuery.data ? (
          <SakuraLoader variant="section" context="data" delay={140} />
        ) : kpiQuery.isError && !kpiQuery.data ? (
          <ContextualErrorState
            error={kpiQuery.error}
            title={tr('Không tải được dữ liệu KPI Giáo viên')}
            onRetry={() => kpiQuery.refetch()}
          />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng buổi được giao')}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rp-text">{totals.assigned}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Buổi hoàn thành hợp lệ')}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                  {totals.completed}{' '}
                  <span className="text-sm font-semibold text-rp-text-muted">
                    ({formatCompletionRatio(totals.completed, totals.assigned)})
                  </span>
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Thời lượng dạy đã xác nhận')}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rp-brand-strong">{formatMinutesVi(totals.confirmedMinutes)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng khiếu nại trong kỳ')}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rp-text">{totals.disputes}</p>
              </Card>
            </section>

            {filteredMentors.length === 0 ? (
              <ContextualEmptyState
                title={tr('Chưa có dữ liệu điểm danh hoặc KPI trong khoảng thời gian này')}
                description={tr('Hãy mở rộng khoảng ngày hoặc xóa từ khóa tìm kiếm.')}
              />
            ) : (
              <DataTable
                columns={columns}
                rows={filteredMentors}
                rowKey={(m) => m.mentorId}
                rowActions={(m) => (
                  <IconButton
                    icon={Eye}
                    size="sm"
                    variant="ghost"
                    label={tr('Xem chi tiết tháng & tuần')}
                    onClick={() => setDrawerMentor(m)}
                  />
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
                  rowKey={(p) => p.periodKey}
                  rows={drawerMentor.monthlyBreakdown || []}
                  columns={[
                    { key: 'periodKey', header: tr('Tháng'), render: (p) => <span className="font-semibold">{p.periodKey}</span> },
                    { key: 'sessions', header: tr('Hợp lệ / Giao'), render: (p) => `${p.completedValidSessions} / ${p.totalAssignedSessions}` },
                    { key: 'minutes', header: tr('Xác nhận'), render: (p) => formatMinutesVi(p.confirmedTeachingMinutes) },
                    { key: 'hw', header: tr('Bài tập (chấm/nộp)'), render: (p) => `${p.homeworkGradedCount} / ${p.homeworkSubmittedCount}` },
                    { key: 'rating', header: tr('Sao / KN'), render: (p) => `${p.averageRating != null ? `${p.averageRating}★` : '—'} · ${p.disputesCount}` },
                  ]}
                />
              </Card>

              <Card className="space-y-2 p-4">
                <h3 className="text-sm font-bold text-rp-text">{tr('Thống kê theo tuần')}</h3>
                <DataTable
                  rowKey={(p) => p.periodKey}
                  rows={(drawerMentor.weeklyBreakdown || []).slice(0, 12)}
                  columns={[
                    { key: 'periodKey', header: tr('Tuần'), render: (p) => <span className="font-semibold">{p.periodKey}</span> },
                    { key: 'sessions', header: tr('Hợp lệ / Giao'), render: (p) => `${p.completedValidSessions} / ${p.totalAssignedSessions}` },
                    { key: 'minutes', header: tr('Xác nhận'), render: (p) => formatMinutesVi(p.confirmedTeachingMinutes) },
                    { key: 'hw', header: tr('Bài tập (chấm/nộp)'), render: (p) => `${p.homeworkGradedCount} / ${p.homeworkSubmittedCount}` },
                    { key: 'cancel', header: tr('Hủy / Vắng'), render: (p) => `${p.cancelledSessionsCount} / ${p.missedOrNoShowSessionsCount}` },
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
