import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  getAdminDashboard,
  getAdminMentorVerifications,
  getAdminPayments,
  getAdminUsers,
  unwrapApiList,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS } from '@/features/admin/api/adminQueryKeys.js';
import { courseGet, getCohorts } from '@/features/cohorts/api/cohortApi.js';
import { getAdminMentorKpiList } from '@/features/mentor/api/mentorGovernanceApi.js';
import { useSmartRefresh } from '@/hooks/useSmartRefresh.js';
import { AdminShell } from '@/layouts';
import {
  Button,
  Card,
  CardHeader,
  CustomSelect,
  DataRefreshBoundary,
  RefreshButton,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminStatCard, AdminStatusBadge } from '@/features/admin/components/AdminPrimitives.jsx';
import {
  AdminBarChart,
  AdminDonutChart,
  AdminLineAreaChart,
  AdminProgressList,
  AdminStackedBar,
} from '@/features/admin/components/AdminCharts.jsx';
import {
  DASHBOARD_RANGES,
  buildActionQueueItems,
  buildJlptDistribution,
  buildRevenueSeries,
  buildUserRegistrationSeries,
  buildUserRoleDistribution,
  computeDateWindow,
  summarizeMentorKpis,
} from '@/features/admin/utils/dashboardAnalytics.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const formatMoney = (value) => `${Number(value || 0).toLocaleString(currentIntlTag())} ₫`;

const SEVERITY_STYLE = {
  critical: {
    border: 'border-[#F8B4B4] bg-[#FEF2F2]/75 hover:border-[#F05252]',
    badge: 'bg-[#DC2626] text-white',
    dot: 'bg-[#DC2626]',
  },
  high: {
    border: 'border-[#FCD34D] bg-[#FFFBEB]/80 hover:border-[#F59E0B]',
    badge: 'bg-[#D97706] text-white',
    dot: 'bg-[#F59E0B]',
  },
  medium: {
    border: 'border-[#F2CCD7] bg-[#FDF1F4]/70 hover:border-rp-brand',
    badge: 'bg-[#C84666] text-white',
    dot: 'bg-[#E05A7A]',
  },
  normal: {
    border: 'border-rp-line bg-rp-surface hover:border-rp-brand-border',
    badge: 'bg-rp-brand-tint text-rp-brand-strong',
    dot: 'bg-rp-brand',
  },
};

export default function AdminDashboard() {
  const { tr, trf } = useLocale();
  const [rangeId, setRangeId] = useState('30d');
  const [jlptMetric, setJlptMetric] = useState('learners');

  const windowInfo = useMemo(() => computeDateWindow(rangeId), [rangeId]);

  const dashboardQuery = useQuery({
    queryKey: ADMIN_KEYS.dashboard,
    queryFn: getAdminDashboard,
  });

  const usersQuery = useQuery({
    queryKey: ADMIN_KEYS.users,
    queryFn: async () => unwrapApiList(await getAdminUsers({ includeInactive: true, includeDisabled: true })),
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-dashboard-payments', windowInfo.fromDate, windowInfo.toDate],
    queryFn: () =>
      getAdminPayments({
        fromDate: windowInfo.fromDate || undefined,
        toDate: windowInfo.toDate || undefined,
        page: 1,
        pageSize: 100,
      }),
  });

  const cohortsQuery = useQuery({
    queryKey: ['admin-dashboard-cohorts'],
    queryFn: () => getCohorts().catch(() => []),
  });

  const coursesQuery = useQuery({
    queryKey: ['admin-dashboard-courses'],
    queryFn: () => courseGet().catch(() => []),
  });

  const kpiQuery = useQuery({
    queryKey: ['admin-dashboard-mentor-kpi', windowInfo.fromDate, windowInfo.toDate],
    queryFn: () =>
      getAdminMentorKpiList({
        from: windowInfo.fromDate || undefined,
        to: windowInfo.toDate || undefined,
        page: 1,
        pageSize: 100,
      }).catch(() => []),
  });

  const verificationsQuery = useQuery({
    queryKey: ADMIN_KEYS.mentorVerifications,
    queryFn: async () => unwrapApiList(await getAdminMentorVerifications()).catch(() => []),
  });

  const stats = useMemo(() => dashboardQuery.data || {}, [dashboardQuery.data]);
  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const cohorts = useMemo(() => cohortsQuery.data || [], [cohortsQuery.data]);
  const courses = useMemo(() => coursesQuery.data || [], [coursesQuery.data]);
  const paymentsData = paymentsQuery.data || {};
  const paymentItems = useMemo(() => paymentsData.items || [], [paymentsData.items]);
  const paymentSummary = paymentsData.summary || {};

  const pendingRetakes = useMemo(
    () => courses.reduce((sum, c) => sum + (c.requests || []).filter((r) => r.status === 'Pending').length, 0),
    [courses],
  );

  const actionItems = useMemo(
    () => buildActionQueueItems(stats, { pendingRetakes }),
    [stats, pendingRetakes],
  );
  const activeBacklogTotal = useMemo(
    () => actionItems.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [actionItems],
  );
  // Items with work first (queue order kept); zero-count categories stay one click away instead of filling the page.
  const [showAllActions, setShowAllActions] = useState(false);
  const visibleActionItems = showAllActions ? actionItems : actionItems.filter((item) => Number(item.count || 0) > 0);
  const hiddenActionCount = actionItems.length - visibleActionItems.length;

  const userDist = useMemo(() => buildUserRoleDistribution(users), [users]);
  const userGrowthSeries = useMemo(
    () => buildUserRegistrationSeries(users, windowInfo.startMs),
    [users, windowInfo.startMs],
  );
  const revenueSeries = useMemo(
    () => buildRevenueSeries(paymentItems, windowInfo.days),
    [paymentItems, windowInfo.days],
  );
  const jlptDist = useMemo(() => buildJlptDistribution(cohorts, courses), [cohorts, courses]);
  const mentorSummary = useMemo(() => summarizeMentorKpis(kpiQuery.data || []), [kpiQuery.data]);

  const cohortCapacityItems = useMemo(() => {
    const published = (cohorts || []).filter((c) => c.status === 'Published');
    return published
      .map((c) => ({
        id: c.id,
        label: `${c.name} (${c.level})`,
        value: Number(c.enrolledCount || 0),
        max: Math.max(1, Number(c.capacity || 1)),
        display: `${c.enrolledCount ?? 0}/${c.capacity}`,
        color: Number(c.enrolledCount || 0) >= Number(c.capacity || 1) ? '#16A34A' : '#E05A7A',
      }))
      .sort((a, b) => (b.value / b.max) - (a.value / a.max))
      .slice(0, 5);
  }, [cohorts]);

  const totalSeats = cohorts.filter((c) => c.status === 'Published').reduce((s, c) => s + Number(c.capacity || 0), 0);
  const usedSeats = cohorts.filter((c) => c.status === 'Published').reduce((s, c) => s + Number(c.enrolledCount || 0), 0);
  const occupancyPct = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

  const verificationSegments = useMemo(() => {
    const list = verificationsQuery.data || [];
    const counts = { Pending: 0, Approved: 0, Returned: 0, Rejected: 0 };
    for (const v of list) {
      const key = String(v.status || 'Pending');
      counts[key] = (counts[key] || 0) + 1;
    }
    return [
      { label: 'Đã duyệt', value: counts.Approved, color: '#16A34A' },
      { label: 'Chờ duyệt', value: counts.Pending, color: '#F59E0B' },
      { label: 'Yêu cầu bổ sung', value: counts.Returned, color: '#3B82F6' },
      { label: 'Từ chối', value: counts.Rejected, color: '#DC2626' },
    ];
  }, [verificationsQuery.data]);

  const { refresh: refreshAll, isRefreshing } = useSmartRefresh({
    queries: [
      dashboardQuery,
      paymentsQuery,
      usersQuery,
      cohortsQuery,
      coursesQuery,
      kpiQuery,
      verificationsQuery,
    ],
  });

  return (
    <AdminShell breadcrumb={tr('Tổng quan')}>
      <main data-page="AdminDashboard" className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <AdminPageHeader
          icon={LayoutDashboard}
          title="Tổng quan"
          badge={
            activeBacklogTotal > 0 ? (
              <AdminStatusBadge
                tone="warning"
                label={trf('{0} việc cần xử lý', { 0: activeBacklogTotal })}
              />
            ) : !dashboardQuery.isPending ? (
              <AdminStatusBadge tone="success" label="Hệ thống ổn định" />
            ) : null
          }
          actions={
            <div className="rp-admin-filterbar flex flex-wrap items-center gap-2">
              <CustomSelect
                fitContent
                size="md"
                value={rangeId}
                onChange={setRangeId}
                aria-label={tr('Khoảng thời gian thống kê')}
                options={DASHBOARD_RANGES.map((r) => ({ value: r.id, label: tr(r.label) }))}
              />
              {dashboardQuery.isSuccess && Boolean(dashboardQuery.data) && (
                <RefreshButton
                  onRefresh={refreshAll}
                  refreshing={isRefreshing}
                  disabled={dashboardQuery.isPending}
                />
              )}
            </div>
          }
        />

        <DataRefreshBoundary
          queries={[dashboardQuery]}
          loading={dashboardQuery.isPending}
          refreshing={isRefreshing && !dashboardQuery.isPending}
          error={dashboardQuery.isError ? dashboardQuery.error : null}
          hasData={Boolean(dashboardQuery.data)}
          loadingContext="dashboard"
          loadingDelay={140}
          errorTitle={tr('Chưa tải được dữ liệu tổng quan hệ thống')}
          onRetry={refreshAll}
        >
          <div className="space-y-5">
            {/* 1. PRIORITY ACTION QUEUE: CẦN XỬ LÝ */}
            <section aria-labelledby="admin-action-heading" className="space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#C84666]" aria-hidden="true" />
                <h2 id="admin-action-heading" className="text-[15px] font-bold text-rp-text">
                  {tr('Cần xử lý')}
                </h2>
              </div>

              {activeBacklogTotal === 0 && !showAllActions ? (
                // Nothing pending: one compact, honest summary line instead of eight empty cards.
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-success-line bg-rp-success-bg/60 px-3.5 py-2.5">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-rp-text">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-rp-success" />
                    {trf('Không có việc nào cần xử lý trong {0} hạng mục theo dõi.', { 0: actionItems.length })}
                  </p>
                  <Button variant="ghost" size="xs" onClick={() => setShowAllActions(true)} aria-expanded={false}>
                    {tr('Xem từng hạng mục')}
                  </Button>
                </div>
              ) : (
              <>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {visibleActionItems.map((item) => {
                  const hasWork = item.count > 0;
                  const sev = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.normal;
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      className={`rp-focus group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                        hasWork
                          ? `${sev.border} shadow-rp-xs`
                          : 'border-rp-line/80 bg-rp-surface/70 opacity-75 hover:opacity-100 hover:border-rp-line'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${hasWork ? sev.dot : 'bg-rp-line'}`}
                          />
                          <p className="truncate text-[13px] font-semibold text-rp-text">{tr(item.label)}</p>
                        </div>
                        <p className="mt-0.5 truncate pl-3.5 text-[11px] text-rp-text-muted">{tr(item.hint)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`inline-flex min-w-[26px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                            hasWork ? sev.badge : 'bg-rp-muted text-rp-text-muted'
                          }`}
                        >
                          {item.count}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-rp-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-rp-brand-strong" />
                      </div>
                    </Link>
                  );
                })}
              </div>
              {hiddenActionCount > 0 && (
                <Button variant="ghost" size="xs" onClick={() => setShowAllActions(true)} aria-expanded={false}>
                  {trf('Xem thêm {0} hạng mục không có việc', { 0: hiddenActionCount })}
                </Button>
              )}
              {showAllActions && (
                <Button variant="ghost" size="xs" onClick={() => setShowAllActions(false)} aria-expanded>
                  {tr('Thu gọn')}
                </Button>
              )}
              </>
              )}
            </section>

            {/* 2. TOP REAL KPI CARDS */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Link to="/admin/payments/" className="block rp-focus rounded-rp-card">
                <AdminStatCard
                  icon={CreditCard}
                  tone="brand"
                  label="Doanh thu thành công"
                  value={formatMoney(paymentSummary.totalPaidAmount || 0)}
                  subtext={trf('{0} đơn thanh toán thành công', { 0: paymentSummary.paidCount ?? 0 })}
                />
              </Link>
              <Link to="/admin/users/" className="block rp-focus rounded-rp-card">
                <AdminStatCard
                  icon={Users}
                  tone="info"
                  label="Tổng người dùng"
                  value={users.length || stats.totalUsers || 0}
                  subtext={trf('{0} hoạt động · {1} xác thực email', { 0: userDist.active || stats.totalUsers || 0, 1: userDist.verified || 0 })}
                />
              </Link>
              <Link to="/admin/study-courses/" className="block rp-focus rounded-rp-card">
                <AdminStatCard
                  icon={GraduationCap}
                  tone="success"
                  label="Lớp học đang mở"
                  value={stats.publishedCohorts ?? 0}
                  subtext={trf('Lấp đầy {0}% ({1}/{2} chỗ)', { 0: occupancyPct, 1: usedSeats, 2: totalSeats })}
                />
              </Link>
              <Link to="/admin/plans/" className="block rp-focus rounded-rp-card">
                <AdminStatCard
                  icon={TrendingUp}
                  tone="warning"
                  label="Gói học đã bán"
                  value={stats.paidSubscriptions ?? 0}
                  subtext={trf('{0} gói đang mở bán', { 0: stats.activePlans ?? 0 })}
                />
              </Link>
              <Link to="/admin/mentor-quality/" className="block rp-focus rounded-rp-card">
                <AdminStatCard
                  icon={Star}
                  tone="neutral"
                  label="Chất lượng buổi dạy"
                  value={mentorSummary.completionRate != null ? `${mentorSummary.completionRate}%` : '—'}
                  subtext={
                    mentorSummary.avgRating != null
                      ? trf('{0}/5 ★ · {1} buổi hợp lệ', { 0: mentorSummary.avgRating, 1: mentorSummary.completed })
                      : trf('{0} buổi hợp lệ trong kỳ', { 0: mentorSummary.completed })
                  }
                />
              </Link>
            </section>

            {/* 3. PRIMARY ANALYTICS ROW: REVENUE TREND + USER ROLE DONUT */}
            <section className="grid gap-4 lg:grid-cols-12">
              <Card className="p-4 lg:col-span-7">
                <CardHeader
                  title={tr('Xu hướng doanh thu thực thu (VND)')}
                  description={trf('{0} giao dịch thành công', { 0: paymentSummary.paidCount ?? 0 })}
                  actions={
                    <Button as={Link} to="/admin/payments/" variant="ghost" size="xs">
                      {tr('Chi tiết')}
                    </Button>
                  }
                />
                <AdminLineAreaChart
                  data={revenueSeries}
                  formatValue={formatMoney}
                  emptyText={tr('Chưa có giao dịch thành công trong khoảng thời gian đã chọn.')}
                />
              </Card>

              <Card className="p-4 lg:col-span-5">
                <CardHeader
                  title={tr('Cơ cấu người dùng theo vai trò')}
                  description={trf('{0} tài khoản · {1} bị khóa', { 0: userDist.total, 1: userDist.locked })}
                  actions={
                    <Button as={Link} to="/admin/users/" variant="ghost" size="xs">
                      {tr('Quản lý')}
                    </Button>
                  }
                />
                <AdminDonutChart
                  segments={userDist.segments}
                  centerValue={userDist.total}
                  centerLabel="Tài khoản"
                />
              </Card>
            </section>

            {/* 4. SECONDARY ANALYTICS ROW: JLPT BREAKDOWN + PAYMENT/CAPACITY HEALTH */}
            <section className="grid gap-4 lg:grid-cols-12">
              <Card className="p-4 lg:col-span-6">
                <CardHeader
                  title={tr('Phân bổ theo cấp độ JLPT (N5–N1)')}
                  actions={
                    <div className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setJlptMetric('learners')}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${jlptMetric === 'learners' ? 'bg-white text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-muted hover:text-rp-text'}`}
                      >
                        {tr('Học viên')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setJlptMetric('cohorts')}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${jlptMetric === 'cohorts' ? 'bg-white text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-muted hover:text-rp-text'}`}
                      >
                        {tr('Lớp học')}
                      </button>
                    </div>
                  }
                />
                <AdminBarChart
                  data={jlptDist.map((item) => ({
                    label: item.level,
                    value: jlptMetric === 'cohorts' ? item.cohorts : item.learners,
                    color: jlptMetric === 'cohorts' ? '#2563EB' : '#E05A7A',
                  }))}
                />
              </Card>

              <Card className="p-4 lg:col-span-6 space-y-5">
                <div>
                  <CardHeader
                    title={tr('Trạng thái giao dịch thanh toán')}
                    description={trf('Tổng {0} giao dịch', { 0: paymentSummary.totalCount ?? 0 })}
                    className="mb-2"
                  />
                  <AdminStackedBar
                    segments={[
                      { label: 'Thành công', value: paymentSummary.paidCount ?? 0, color: '#16A34A' },
                      { label: 'Đang chờ', value: paymentSummary.pendingCount ?? 0, color: '#F59E0B' },
                      { label: 'Rà soát', value: paymentSummary.reviewCount ?? 0, color: '#2563EB' },
                      { label: 'Thất bại / Hủy', value: paymentSummary.failedOrCancelledCount ?? 0, color: '#94A3B8' },
                    ]}
                  />
                </div>

                <div className="border-t border-rp-line pt-4">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-rp-text">{tr('Tỷ lệ lấp đầy lớp nhóm đang mở')}</h3>
                    <Link to="/admin/study-courses/" className="rp-link text-xs font-semibold">
                      {tr('Xem tất cả lớp')}
                    </Link>
                  </div>
                  <AdminProgressList
                    items={cohortCapacityItems}
                    emptyText={tr('Chưa có lớp học nhóm nào đang mở.')}
                  />
                </div>
              </Card>
            </section>

            {/* 5. GROWTH & QUALITY ROW */}
            <section className="grid gap-4 lg:grid-cols-12">
              <Card className="p-4 lg:col-span-7">
                <CardHeader
                  title={tr('Tài khoản đăng ký mới theo ngày')}
                />
                <AdminLineAreaChart
                  data={userGrowthSeries}
                  color="#2563EB"
                  formatValue={(v) => trf('{0} tài khoản', { 0: v })}
                  emptyText={tr('Chưa phát sinh tài khoản mới trong khoảng thời gian đã chọn.')}
                />
              </Card>

              <Card className="p-4 lg:col-span-5">
                <CardHeader
                  title={tr('Tình trạng hồ sơ Giáo viên')}
                  description={trf('{0} hồ sơ', { 0: (verificationsQuery.data || []).length })}
                  actions={
                    <Button as={Link} to="/admin/mentor-verifications/" variant="ghost" size="xs" icon={CheckCircle2}>
                      {tr('Xét duyệt')}
                    </Button>
                  }
                />
                <AdminDonutChart
                  segments={verificationSegments}
                  centerValue={(verificationsQuery.data || []).length}
                  centerLabel="Hồ sơ"
                />
              </Card>
            </section>
          </div>
        </DataRefreshBoundary>
      </main>
    </AdminShell>
  );
}
