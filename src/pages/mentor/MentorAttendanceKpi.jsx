import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Info, Star } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { AdminShell, MentorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  DataTable,
  DateRangePicker,
  PageContainer,
  PageHeader,
  Popover,
  RefreshButton,
  RefreshingIndicator,
  SakuraLoader,
  SegmentedControl,
  StaleDataBar,
  Tabs,
} from '@/components/ui';
import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getMentorKpiSummary,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function presetRange(preset) {
  const now = new Date();
  const to = isoDate(now);
  if (preset === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { from: isoDate(start), to };
  }
  if (preset === 'month') {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to };
}

function fmtDate(value) {
  return formatVnDateTime(value, '—');
}

const KPI_RULES = [
  'Buổi hợp lệ: buổi học nhóm của lớp đã thanh toán và có điểm danh.',
  'Thời lượng xác nhận: thời gian Giáo viên có mặt trong phòng học, so với thời lượng theo lịch.',
  'Hủy / vắng: buổi bị hủy hoặc không diễn ra trong kỳ.',
  'Bài tập: số bài đã giao, đã nộp và đã chấm trong kỳ.',
  'Đánh giá và khiếu nại: tính theo thời điểm học viên gửi.',
];

const KPI_SESSION_STATUS = {
  Present: 'Đã dạy',
  Completed: 'Đã hoàn thành',
  Scheduled: 'Đã lên lịch',
  InProgress: 'Đang diễn ra',
  Cancelled: 'Đã hủy',
  Absent: 'Vắng',
  Missed: 'Không diễn ra',
  NoShow: 'Không diễn ra',
  Rescheduled: 'Đã dời lịch',
};

const PRESET_OPTIONS = [
  { id: 'month', label: 'Tháng này' },
  { id: '30d', label: '30 ngày' },
  { id: '90d', label: '3 tháng' },
];

export default function MentorAttendanceKpi() {
  const { tr, trf, fmt } = useLocale();
  const { pathname } = useLocation();
  const session = getSession();
  const isAdminViewer = session?.primaryRole === 'Admin';
  const initial = useMemo(() => presetRange('90d'), []);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [activePreset, setActivePreset] = useState('90d');
  const [mainTab, setMainTab] = useState('overview');
  const [periodTab, setPeriodTab] = useState('monthly');

  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const uid = session?.userId ?? 'anon';
  const kpiQuery = useQuery({
    queryKey: ['mentor-kpi-summary', uid, fromDate, toDate],
    queryFn: () => getMentorKpiSummary({ from: fromDate, to: toDate }),
    enabled: !isAdminViewer && !invalidRange,
  });

  const kpi = kpiQuery.data;
  const levelChips = kpi?.teachingJlptLevels?.length ? kpi.teachingJlptLevels : [];
  const periods = periodTab === 'weekly' ? kpi?.weeklyBreakdown || [] : kpi?.monthlyBreakdown || [];
  const recentSessions = kpi?.recentSessions || [];

  const applyPreset = (id) => {
    const next = presetRange(id);
    setFromDate(next.from);
    setToDate(next.to);
    setActivePreset(id);
  };

  if (isAdminViewer) {
    return (
      <AdminShell pathname={pathname} breadcrumb={tr('Điểm danh & KPI')}>
        <PageContainer width="default" density="comfortable" className="text-rp-text">
          <PageHeader
            eyebrow="Quản trị hệ thống"
            title="Điểm danh & KPI"
            description="Trang này dành cho Giáo viên theo dõi lịch sử giảng dạy cá nhân. Quản trị viên có thể xem thống kê chất lượng toàn đội ngũ tại mục Chất lượng Giáo viên."
          />
          <Banner
            tone="info"
            title="Chuyển đến bảng điều khiển Quản trị"
            actions={(
              <Button as={Link} to="/admin/mentor-quality/" variant="primary" size="sm">
                {tr('Mở Chất lượng Giáo viên')}
              </Button>
            )}
          >
            {tr('Tài khoản Quản trị viên xem tổng hợp KPI và điểm danh của từng Giáo viên từ trung tâm quản trị.')}
          </Banner>
        </PageContainer>
      </AdminShell>
    );
  }

  const periodColumns = [
    {
      key: 'periodKey',
      header: 'Kỳ',
      sortValue: (p) => p.periodKey,
      render: (p) => <span className="font-medium text-rp-text">{p.periodKey}</span>,
    },
    {
      key: 'sessions',
      header: 'Hợp lệ / Phân công',
      sortValue: (p) => p.completedValidSessions ?? 0,
      render: (p) => `${p.completedValidSessions} / ${p.totalAssignedSessions}`,
    },
    {
      key: 'confirmed',
      header: 'Xác nhận dạy',
      sortValue: (p) => p.confirmedTeachingMinutes ?? 0,
      render: (p) => formatMinutesVi(p.confirmedTeachingMinutes),
    },
    {
      key: 'missed',
      header: 'Hủy / Vắng',
      render: (p) => `${p.cancelledSessionsCount} / ${p.missedOrNoShowSessionsCount}`,
    },
    {
      key: 'homework',
      header: 'Bài tập (chấm/nộp)',
      render: (p) => `${p.homeworkGradedCount} / ${p.homeworkSubmittedCount}`,
    },
    {
      key: 'feedback',
      header: 'Đánh giá / khiếu nại',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          {p.averageRating != null ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-rp-brand-strong">
              {p.averageRating}
              <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
            </span>
          ) : '—'}
          <span className="text-rp-text-muted">·</span>
          <span>{trf('{0} khiếu nại', { 0: p.disputesCount ?? 0 })}</span>
        </span>
      ),
    },
  ];

  const sessionColumns = [
    {
      key: 'type',
      header: 'Hình thức',
      render: () => <span className="font-medium text-rp-text">{tr('Buổi học nhóm')}</span>,
    },
    {
      key: 'learner',
      header: 'Học viên',
      sortValue: (s) => s.learnerName || '',
      render: (s) => s.learnerName || tr('Học viên'),
    },
    {
      key: 'level',
      header: 'JLPT',
      compact: true,
      render: (s) => (s.jlptLevel ? <Badge tone="brand" icon={false} size="sm">{s.jlptLevel}</Badge> : '—'),
    },
    {
      key: 'time',
      header: 'Thời gian',
      compact: true,
      sortValue: (s) => s.scheduledStartUtc || '',
      render: (s) => <span className="whitespace-nowrap text-xs text-rp-text-2">{fmtDate(s.scheduledStartUtc)}</span>,
    },
    {
      key: 'duration',
      header: 'Thời lượng (xác nhận / kế hoạch)',
      render: (s) => `${fmt.duration(s.observedMentorMinutes)} / ${fmt.duration(s.scheduledMinutes)}`,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      compact: true,
      render: (s) => (
        <Badge tone={s.isValidCompleted ? 'success' : 'neutral'} size="sm">
          {tr(KPI_SESSION_STATUS[s.status] || 'Khác')}
        </Badge>
      ),
    },
  ];

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Điểm danh & KPI')}>
      <PageContainer width="default" density="comfortable" className="space-y-[var(--rp-space-section)] text-rp-text">
        <h1 className="sr-only">{tr('Điểm danh & KPI')}</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Popover
            align="end"
            label={tr('Cách tính chỉ số')}
            panelClassName="w-[min(360px,calc(100vw-32px))] p-4 text-xs text-rp-text-2"
            trigger={({ toggle, props }) => (
              <Button variant="secondary" size="sm" icon={Info} onClick={toggle} {...props}>
                {tr('Cách tính chỉ số')}
              </Button>
            )}
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-rp-text">{tr('Cách tính chỉ số')}</p>
              <ul className="list-disc space-y-1.5 pl-4 leading-relaxed">
                {KPI_RULES.map((text) => (
                  <li key={text}>{tr(text)}</li>
                ))}
              </ul>
            </div>
          </Popover>
        </div>

        {/* Bộ lọc khoảng thời gian + phân quyền JLPT */}
        <Card density="compact" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_OPTIONS.map((p) => (
                <Button
                  key={p.id}
                  variant={activePreset === p.id ? 'soft' : 'secondary'}
                  size="sm"
                  onClick={() => applyPreset(p.id)}
                >
                  {tr(p.label)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onFromChange={(val) => {
                  setFromDate(val);
                  setActivePreset('');
                }}
                onToChange={(val) => {
                  setToDate(val);
                  setActivePreset('');
                }}
              />
              {Boolean(kpi) && !kpiQuery.isError && !kpiQuery.isPending && (
                <RefreshButton
                  onRefresh={() => kpiQuery.refetch({ cancelRefetch: true })}
                  refreshing={kpiQuery.isFetching && !kpiQuery.isPending}
                  disabled={kpiQuery.isPending || invalidRange}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rp-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-rp-text-2">
                {tr('Trình độ JLPT được phân quyền:')}
              </span>
              {levelChips.length > 0 ? (
                levelChips.map((lv) => (
                  <Badge key={lv} tone="brand" icon={false} size="sm">
                    {lv}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-rp-text-muted">{tr('Chưa có trình độ JLPT được phân quyền')}</span>
              )}
            </div>
            <span className="text-xs text-rp-text-muted">
              {tr('Múi giờ thống kê: Asia/Ho_Chi_Minh (UTC+7)')}
            </span>
          </div>
        </Card>

        {kpiQuery.isFetching && !kpiQuery.isLoading && (
          <div className="pointer-events-none sticky top-2 z-20 h-0 overflow-visible">
            <div className="flex justify-end">
              <div className="pointer-events-auto">
                <RefreshingIndicator active delay={60} />
              </div>
            </div>
          </div>
        )}
        {kpiQuery.isLoading && !invalidRange && (
          <SakuraLoader
            variant="section"
            context="dashboard"
            label={tr('Đang tổng hợp dữ liệu Chấm công & KPI')}
            delay={160}
          />
        )}

        {kpiQuery.isError && !kpi && (
          <Card>
            <ContextualErrorState
              error={kpiQuery.error}
              title={tr('Không tải được dữ liệu Chấm công & KPI')}
              onRetry={() => kpiQuery.refetch()}
              retrying={kpiQuery.isFetching}
            />
          </Card>
        )}
        {kpiQuery.isError && kpi && (
          <StaleDataBar onRetry={() => kpiQuery.refetch()} retrying={kpiQuery.isFetching} />
        )}

        {kpi && (
          <>
            <Tabs
              variant="pill"
              label={tr('Danh mục thống kê')}
              value={mainTab}
              onChange={setMainTab}
              tabs={[
                { value: 'overview', label: 'Tổng quan & Chu kỳ' },
                { value: 'sessions', label: 'Nhật ký buổi dạy', count: recentSessions.length },
              ]}
            />

            {mainTab === 'overview' && (
              <div className="space-y-[var(--rp-space-section)]">
                {/* 4 thẻ chỉ số chính */}
                <section className="rp-cq-kpis">
                  <Card interactive className="p-4">
                    <p className="text-xs text-rp-text-muted">{tr('Buổi được phân công')}</p>
                    <p className="mt-1.5 text-[26px] font-semibold tabular-nums text-rp-text">
                      {kpi.totalAssignedSessions}
                    </p>
                    <p className="mt-1 text-xs text-rp-text-muted">
                      {tr('Buổi lớp học:')} {kpi.assignedCourseSessionsCount ?? kpi.totalAssignedSessions}
                    </p>
                  </Card>

                  <Card interactive className="p-4">
                    <p className="text-xs text-rp-text-muted">{tr('Hoàn thành hợp lệ')}</p>
                    <p className="mt-1.5 text-[26px] font-semibold tabular-nums text-rp-success">
                      {kpi.completedValidSessions}
                    </p>
                    <p className="mt-1 text-xs text-rp-text-muted">
                      {trf('Tỷ lệ hoàn thành: {0}', { 0: formatCompletionRatio(kpi.completedValidSessions, kpi.totalAssignedSessions) })}
                    </p>
                  </Card>

                  <Card interactive className="p-4">
                    <p className="text-xs text-rp-text-muted">{tr('Thời lượng dạy được xác nhận')}</p>
                    <p className="mt-1.5 text-[26px] font-semibold tabular-nums text-rp-brand-strong">
                      {formatMinutesVi(kpi.confirmedTeachingMinutes)}
                    </p>
                    <p className="mt-1 text-xs text-rp-text-muted">
                      {trf('Kế hoạch các buổi đạt: {0}', { 0: formatMinutesVi(kpi.scheduledCompletedMinutes) })}
                    </p>
                  </Card>

                  <Card interactive className="p-4">
                    <p className="text-xs text-rp-text-muted">{tr('Hủy / Vắng / Chờ xử lý')}</p>
                    <p className="mt-1.5 text-[26px] font-semibold tabular-nums text-rp-warning">
                      {kpi.cancelledSessionsCount + kpi.missedOrNoShowSessionsCount}
                    </p>
                    <p className="mt-1 text-xs text-rp-text-muted">
                      {trf('Hủy: {0} (Giáo viên {1}) · Vắng/Quá giờ: {2} · Sắp tới: {3}', {
                        0: kpi.cancelledSessionsCount,
                        1: kpi.cancelledByMentorCount,
                        2: kpi.missedOrNoShowSessionsCount,
                        3: kpi.upcomingOrIncompleteSessionsCount,
                      })}
                    </p>
                  </Card>
                </section>

                {/* Bài tập & Đánh giá */}
                <section className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader title="Bài tập & Thời gian phản hồi" />
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                      <div className="rounded-xl bg-rp-bg-2 p-3">
                        <dt className="text-xs text-rp-text-muted">{tr('Đã giao / Đã nộp')}</dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums text-rp-text">
                          {kpi.homeworkAssignedCount} / {kpi.homeworkSubmittedCount}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-rp-bg-2 p-3">
                        <dt className="text-xs text-rp-text-muted">{tr('Đã chấm & nhận xét')}</dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums text-rp-success">
                          {kpi.homeworkGradedCount}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line px-3.5 py-2.5 text-xs">
                      <span className="text-rp-text-2">{tr('Thời gian phản hồi trung bình')}</span>
                      <span className="font-semibold text-rp-text">
                        {formatTurnaroundVi(kpi.averageFeedbackTurnaroundMinutes)}
                        {kpi.feedbackTurnaroundSampleCount > 0 ? trf(' ({0} mẫu)', { 0: kpi.feedbackTurnaroundSampleCount }) : ''}
                      </span>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Đánh giá & Khiếu nại" />
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                      <div className="rounded-xl bg-rp-bg-2 p-3">
                        <dt className="text-xs text-rp-text-muted">{tr('Điểm đánh giá trung bình')}</dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums text-rp-brand-strong">
                          {kpi.averageRating != null ? (
                            <span className="inline-flex items-center gap-1">
                              {kpi.averageRating}
                              <Star aria-hidden="true" className="h-4 w-4 fill-current" />
                            </span>
                          ) : tr('Chưa có đánh giá')}
                        </dd>
                        <dd className="mt-0.5 text-xs text-rp-text-muted">
                          {trf('{0} đánh giá đã duyệt', { 0: kpi.totalReviewsCount })}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-rp-bg-2 p-3">
                        <dt className="text-xs text-rp-text-muted">{tr('Khiếu nại trong kỳ')}</dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums text-rp-text">
                          {kpi.totalDisputesCount}
                        </dd>
                        <dd className="mt-0.5 text-xs text-rp-text-muted">
                          {trf('Đang xử lý: {0} · Đã hoàn tiền: {1}', { 0: kpi.openDisputesCount, 1: kpi.resolvedRefundCount })}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </section>

                {/* Chi tiết theo chu kỳ */}
                <Card>
                  <CardHeader
                    title="Chi tiết theo chu kỳ"
                    actions={(
                      <SegmentedControl
                        label={tr('Chọn chu kỳ thống kê')}
                        value={periodTab}
                        onChange={setPeriodTab}
                        options={[
                          { value: 'monthly', label: 'Theo tháng' },
                          { value: 'weekly', label: 'Theo tuần' },
                        ]}
                      />
                    )}
                  />
                  <div className="mt-4 hidden md:block">
                    <DataTable
                      columns={periodColumns}
                      rows={periods}
                      rowKey={(p) => p.periodKey}
                      empty={{ illustration: 'chart', context: 'analytics', title: 'Chưa có dữ liệu theo chu kỳ', description: 'Chưa có dữ liệu trong khoảng thời gian đã chọn.' }}
                      density="compact"
                      itemLabel="chu kỳ"
                    />
                  </div>
                  <div className="mt-3 space-y-2.5 md:hidden">
                    {periods.length === 0 ? (
                      <ContextualEmptyState
                        variant="inline"
                        size="sm"
                        illustration="chart"
                        title={tr('Chưa có dữ liệu trong khoảng thời gian đã chọn.')}
                      />
                    ) : periods.map((p) => (
                      <div key={p.periodKey} className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-rp-text">{p.periodKey}</span>
                          <Badge tone="brand" icon={false} size="sm">
                            {formatMinutesVi(p.confirmedTeachingMinutes)}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-rp-text-2">
                          <span>{tr('Hợp lệ / Phân công')}: {p.completedValidSessions}/{p.totalAssignedSessions}</span>
                          <span>{tr('Hủy / Vắng')}: {p.cancelledSessionsCount}/{p.missedOrNoShowSessionsCount}</span>
                          <span>{tr('Bài tập')}: {p.homeworkGradedCount}/{p.homeworkSubmittedCount}</span>
                          <span>{trf('{0} khiếu nại', { 0: p.disputesCount ?? 0 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {mainTab === 'sessions' && (
              <Card>
                <CardHeader
                  title={trf('Nhật ký buổi dạy & điểm danh gần đây ({0})', { 0: recentSessions.length })}
                />
                <div className="mt-4 hidden md:block">
                  <DataTable
                    columns={sessionColumns}
                    rows={recentSessions}
                    rowKey={(s) => `${s.sourceType}-${s.bookingOrSessionId}`}
                    empty={{ illustration: 'clock', context: 'history', title: 'Chưa có buổi dạy nào', description: 'Chưa có buổi dạy nào trong khoảng thời gian đã chọn.' }}
                    density="compact"
                    itemLabel="buổi dạy"
                  />
                </div>
                <div className="mt-3 space-y-2.5 md:hidden">
                  {recentSessions.length === 0 ? (
                    <ContextualEmptyState
                      variant="inline"
                      size="sm"
                      illustration="clock"
                      title={tr('Chưa có buổi dạy nào trong khoảng thời gian đã chọn.')}
                    />
                  ) : recentSessions.map((s) => (
                    <div
                      key={`${s.sourceType}-${s.bookingOrSessionId}`}
                      className="rounded-xl border border-rp-line bg-rp-bg-2 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-rp-text">{s.learnerName || tr('Học viên')}</p>
                          <p className="mt-0.5 text-rp-text-muted">{fmtDate(s.scheduledStartUtc)}</p>
                        </div>
                        <Badge tone={s.isValidCompleted ? 'success' : 'neutral'} size="sm">
                          {tr(KPI_SESSION_STATUS[s.status] || 'Khác')}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-rp-text-2">
                        {s.jlptLevel && <Badge tone="brand" icon={false} size="sm">{s.jlptLevel}</Badge>}
                        <span>{fmt.duration(s.observedMentorMinutes)} / {fmt.duration(s.scheduledMinutes)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </MentorShell>
  );
}
