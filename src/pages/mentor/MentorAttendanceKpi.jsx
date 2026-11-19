import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getSession } from '@/app/auth/session.js';

import { MentorShell } from '@/layouts';
import { ContextualErrorState, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getMentorKpiSummary,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

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
  if (!value) return '—';
  const d = parseUtcDate(value);
  if (!d || Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export default function MentorAttendanceKpi() {
  const { tr, trf, fmt } = useLocale();
  const { pathname } = useLocation();
  const initial = useMemo(() => presetRange('90d'), []);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [periodTab, setPeriodTab] = useState('monthly');

  const uid = getSession()?.userId ?? 'anon';
  const kpiQuery = useQuery({
    queryKey: ['mentor-kpi-summary', uid, fromDate, toDate],
    queryFn: () => getMentorKpiSummary({ from: fromDate, to: toDate }),
  });

  const kpi = kpiQuery.data;
  const levelChips = kpi?.teachingJlptLevels?.length ? kpi.teachingJlptLevels : [];

  const periods = periodTab === 'weekly' ? kpi?.weeklyBreakdown || [] : kpi?.monthlyBreakdown || [];

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Chấm công & KPI')}>
      <div className="rp-container rp-cq space-y-[var(--rp-space-section)] py-[var(--rp-space-page-y)] text-rp-text">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="rp-type-page-title text-rp-text">
              {tr('Chấm công & KPI giảng dạy')}
            </h1>
            <p className="rp-type-secondary mt-1.5 max-w-2xl text-rp-text-muted">
              {tr('Tổng hợp lịch giảng dạy được phân công, thời lượng điểm danh thực tế, tình trạng bài tập và đánh giá từ học viên theo kỳ. Hệ thống không quản lý bảng lương hay thanh toán thù lao.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'month', label: 'Tháng này' },
              { id: '30d', label: '30 ngày' },
              { id: '90d', label: '3 tháng' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const next = presetRange(p.id);
                  setFromDate(next.from);
                  setToDate(next.to);
                }}
                className="h-9 rounded-xl border border-rp-line bg-white px-3 text-[12px] font-medium text-rp-text hover:border-rp-brand-border"
              >
                {tr(p.label)}
              </button>
            ))}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-xl border border-rp-line bg-white px-2.5 text-[12px]"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-xl border border-rp-line bg-white px-2.5 text-[12px]"
            />
          </div>
        </header>

        {/* Phân quyền JLPT */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-rp-bg-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-rp-text-2">
              {tr('Trình độ JLPT được phân quyền:')}
            </span>
            {levelChips.length > 0 ? (
              levelChips.map((lv) => (
                <span
                  key={lv}
                  className="rounded-lg bg-rp-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-rp-brand-strong"
                >
                  {lv}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-rp-text-muted">{tr('Chưa được cấp quyền JLPT N5–N2')}</span>
            )}
          </div>
          <span className="text-[11px] text-rp-text-muted">
            {tr('Múi giờ thống kê: Asia/Ho_Chi_Minh (UTC+7)')}
          </span>
        </section>

        <RefreshingIndicator active={kpiQuery.isFetching && !kpiQuery.isLoading} className="mb-2" />
        {kpiQuery.isLoading && (
          <SakuraLoader
            variant="section"
            context="dashboard"
            label={tr('Đang tổng hợp dữ liệu Chấm công & KPI')}
            delay={160}
          />
        )}

        {kpiQuery.isError && !kpi && (
          <div className="rounded-2xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              error={kpiQuery.error}
              title={tr('Không tải được dữ liệu Chấm công & KPI')}
              onRetry={() => kpiQuery.refetch()}
              retrying={kpiQuery.isFetching}
            />
          </div>
        )}
        {kpiQuery.isError && kpi && (
          <StaleDataBar onRetry={() => kpiQuery.refetch()} retrying={kpiQuery.isFetching} />
        )}

        {kpi && (
          <>
            {/* 4 thẻ chỉ số chính */}
            <section className="rp-cq-kpis">
              <article className="rp-card-hover rounded-2xl border border-rp-line bg-white p-4">
                <p className="text-[12px] text-rp-text-muted">{tr('Buổi được phân công')}</p>
                <p className="mt-1.5 text-[26px] font-semibold text-rp-text">
                  {kpi.totalAssignedSessions}
                </p>
                <p className="mt-1 text-[11px] text-rp-text-muted">
                  {tr('Buổi lớp học:')}{' '}{kpi.assignedCourseSessionsCount ?? kpi.totalAssignedSessions}
                </p>
              </article>

              <article className="rp-card-hover rounded-2xl border border-rp-line bg-white p-4">
                <p className="text-[12px] text-rp-text-muted">{tr('Hoàn thành hợp lệ')}</p>
                <p className="mt-1.5 text-[26px] font-semibold text-rp-success">
                  {kpi.completedValidSessions}
                </p>
                <p className="mt-1 text-[11px] text-rp-text-muted">
                 {trf('Tỷ lệ hoàn thành: {0}', { 0: formatCompletionRatio(kpi.completedValidSessions, kpi.totalAssignedSessions) })}
                </p>
              </article>

              <article className="rp-card-hover rounded-2xl border border-rp-line bg-white p-4">
                <p className="text-[12px] text-rp-text-muted">{tr('Thời lượng dạy được xác nhận')}</p>
                <p className="mt-1.5 text-[26px] font-semibold text-rp-brand-strong">
                  {formatMinutesVi(kpi.confirmedTeachingMinutes)}
                </p>
                <p className="mt-1 text-[11px] text-rp-text-muted">
                 {trf('Kế hoạch các buổi đạt: {0}', { 0: formatMinutesVi(kpi.scheduledCompletedMinutes) })}
                </p>
              </article>

              <article className="rp-card-hover rounded-2xl border border-rp-line bg-white p-4">
                <p className="text-[12px] text-rp-text-muted">{tr('Hủy / Vắng / Chờ xử lý')}</p>
                <p className="mt-1.5 text-[26px] font-semibold text-[#8A4F08]">
                  {kpi.cancelledSessionsCount + kpi.missedOrNoShowSessionsCount}
                </p>
                <p className="mt-1 text-[11px] text-rp-text-muted">
                 {trf('Hủy: {0} (Giáo viên {1}) · Vắng/Quá giờ: {2} · Sắp tới: {3}', { 0: kpi.cancelledSessionsCount, 1: kpi.cancelledByMentorCount, 2: kpi.missedOrNoShowSessionsCount, 3: kpi.upcomingOrIncompleteSessionsCount })}
                </p>
              </article>
            </section>

            {/* Bài tập & Đánh giá */}
            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-rp-line bg-white p-5">
                <h2 className="text-[15px] font-semibold text-rp-text">{tr('Bài tập & Thời gian phản hồi')}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-rp-bg-2 p-3">
                    <dt className="text-[11px] text-rp-text-muted">{tr('Đã giao / Đã nộp')}</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-rp-text">
                      {kpi.homeworkAssignedCount} / {kpi.homeworkSubmittedCount}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-rp-bg-2 p-3">
                    <dt className="text-[11px] text-rp-text-muted">{tr('Đã chấm & nhận xét')}</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-rp-success">
                      {kpi.homeworkGradedCount}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line px-3.5 py-2.5 text-[12px]">
                  <span className="text-rp-text-2">{tr('Thời gian phản hồi trung bình')}</span>
                  <span className="font-semibold text-rp-text">
                    {formatTurnaroundVi(kpi.averageFeedbackTurnaroundMinutes)}
                    {kpi.feedbackTurnaroundSampleCount > 0 ? trf(' ({0} mẫu)', { 0: kpi.feedbackTurnaroundSampleCount }) : ''}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-rp-text-muted">
                  {tr('Khóa học nhóm: giao')}{' '}{kpi.courseHomeworkAssignedCount ?? kpi.homeworkAssignedCount}{tr(', nộp')}{' '}{kpi.courseHomeworkSubmittedCount ?? kpi.homeworkSubmittedCount}{tr(', chấm')}{' '}{kpi.courseHomeworkGradedCount ?? kpi.homeworkGradedCount}.
                </p>
              </article>

              <article className="rounded-2xl border border-rp-line bg-white p-5">
                <h2 className="text-[15px] font-semibold text-rp-text">{tr('Đánh giá & Khiếu nại')}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-rp-bg-2 p-3">
                    <dt className="text-[11px] text-rp-text-muted">{tr('Điểm đánh giá TB')}</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-rp-brand-strong">
                      {kpi.averageRating != null ? `${kpi.averageRating} ★` : tr('Chưa có đánh giá')}
                    </dd>
                    <span className="text-[11px] text-rp-text-muted">
                     {trf('{0} đánh giá đã duyệt', { 0: kpi.totalReviewsCount })}
                    </span>
                  </div>
                  <div className="rounded-xl bg-rp-bg-2 p-3">
                    <dt className="text-[11px] text-rp-text-muted">{tr('Khiếu nại trong kỳ')}</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-rp-text">
                      {kpi.totalDisputesCount}
                    </dd>
                    <span className="text-[11px] text-rp-text-muted">
                     {trf('Đang xử lý: {0} · Đã hoàn tiền: {1}', { 0: kpi.openDisputesCount, 1: kpi.resolvedRefundCount })}
                    </span>
                  </div>
                </dl>
              </article>
            </section>

            {/* Thống kê theo tuần / theo tháng */}
            <section className="rounded-2xl border border-rp-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-rp-text">{tr('Chi tiết theo chu kỳ')}</h2>
                <div className="inline-flex rounded-xl border border-rp-line bg-rp-bg-2 p-1">
                  {[
                    { id: 'monthly', label: 'Theo tháng' },
                    { id: 'weekly', label: 'Theo tuần' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPeriodTab(t.id)}
                      className={`rounded-lg px-3 py-1 text-[12px] font-medium transition ${
                        periodTab === t.id
                          ? 'bg-rp-brand-strong text-white'
                          : 'text-rp-text-2 hover:text-rp-text'
                      }`}
                    >
                      {tr(t.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div data-density="compact" className="rp-scroll-x mt-3">
                <table className="w-full min-w-[680px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-rp-line text-[11px] uppercase tracking-wider text-rp-text-muted">
                      <th className="py-2">{tr('Kỳ')}</th>
                      <th className="py-2">{tr('Hợp lệ / Phân công')}</th>
                      <th className="py-2">{tr('Xác nhận dạy')}</th>
                      <th className="py-2">{tr('Hủy / Vắng')}</th>
                      <th className="py-2">{tr('Bài tập (chấm/nộp)')}</th>
                      <th className="py-2">{tr('Đánh giá / khiếu nại')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.periodKey} className="border-b border-rp-bg-2">
                        <td className="py-2 font-medium text-rp-text">{p.periodKey}</td>
                        <td className="py-2">
                          {p.completedValidSessions} / {p.totalAssignedSessions}
                        </td>
                        <td className="py-2">{formatMinutesVi(p.confirmedTeachingMinutes)}</td>
                        <td className="py-2">
                          {p.cancelledSessionsCount} / {p.missedOrNoShowSessionsCount}
                        </td>
                        <td className="py-2">
                          {p.homeworkGradedCount} / {p.homeworkSubmittedCount}
                        </td>
                        <td className="py-2">
                          {p.averageRating != null ? `${p.averageRating}★` : '—'} · {trf('{0} khiếu nại', { 0: p.disputesCount ?? 0 })}
                        </td>
                      </tr>
                    ))}
                    {periods.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-rp-text-muted">
                          {tr('Chưa có dữ liệu trong khoảng thời gian đã chọn.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Lịch sử buổi dạy & điểm danh gần đây */}
            <section className="rounded-2xl border border-rp-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-rp-text">
               {trf('Nhật ký buổi dạy & điểm danh gần đây ({0})', { 0: (kpi.recentSessions || []).length })}
              </h2>
              <div data-density="compact" className="rp-scroll-x mt-3">
                <table className="w-full min-w-[700px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-rp-line text-[11px] uppercase tracking-wider text-rp-text-muted">
                      <th className="py-2">{tr('Loại')}</th>
                      <th className="py-2">{tr('Học viên')}</th>
                      <th className="py-2">JLPT</th>
                      <th className="py-2">{tr('Thời gian')}</th>
                      <th className="py-2">{tr('Thời lượng (xác nhận / kế hoạch)')}</th>
                      <th className="py-2">{tr('Trạng thái')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpi.recentSessions || []).map((s) => (
                      <tr key={`${s.sourceType}-${s.bookingOrSessionId}`} className="border-b border-rp-bg-2">
                        <td className="py-2 text-[12px] font-medium">
                         {tr('Buổi học nhóm')}
                        </td>
                        <td className="py-2">{s.learnerName || tr('Học viên')}</td>
                        <td className="py-2">{s.jlptLevel || '—'}</td>
                        <td className="py-2 text-[12px] text-rp-text-2">{fmtDate(s.scheduledStartUtc)}</td>
                        <td className="py-2">
                          {fmt.duration(s.observedMentorMinutes)} / {fmt.duration(s.scheduledMinutes)}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              s.isValidCompleted
                                ? 'bg-rp-success-bg text-rp-success'
                                : 'bg-rp-brand-soft text-rp-text-2'
                            }`}
                          >
                            {tr(KPI_SESSION_STATUS[s.status] || 'Khác')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!(kpi.recentSessions || []).length && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-rp-text-muted">
                          {tr('Chưa có buổi dạy nào trong khoảng thời gian đã chọn.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Minh bạch nguồn dữ liệu */}
            {kpi.metricSources && (
              <section className="rounded-2xl border border-rp-line bg-rp-bg-2 p-4 text-[12px] text-rp-text-2">
                <p className="font-semibold text-rp-text">{tr('Cách tính chỉ số')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {KPI_RULES.map((text) => (
                    <li key={text}>{tr(text)}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </MentorShell>
  );
}
