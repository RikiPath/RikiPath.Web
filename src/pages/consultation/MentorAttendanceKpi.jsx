import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { ConsultShell } from '../../components/shells';
import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getMentorKpiSummary,
  getMentorQualifications,
} from '../../api/mentorGovernanceApi.js';

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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MentorAttendanceKpi() {
  const { pathname } = useLocation();
  const initial = useMemo(() => presetRange('90d'), []);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [periodTab, setPeriodTab] = useState('monthly');

  const kpiQuery = useQuery({
    queryKey: ['mentor-kpi-summary', fromDate, toDate],
    queryFn: () => getMentorKpiSummary({ from: fromDate, to: toDate }),
  });

  const qualsQuery = useQuery({
    queryKey: ['mentor-own-qualifications'],
    queryFn: getMentorQualifications,
  });

  const kpi = kpiQuery.data;
  const activeQuals = (qualsQuery.data || []).filter((q) => q.isActive);
  const levelChips = kpi?.teachingJlptLevels?.length
    ? kpi.teachingJlptLevels
    : activeQuals.map((q) => q.jlptLevel).filter(Boolean);

  const periods = periodTab === 'weekly' ? kpi?.weeklyBreakdown || [] : kpi?.monthlyBreakdown || [];

  return (
    <ConsultShell pathname={pathname} breadcrumb="Chấm công & KPI">
      <div className="mx-auto w-full max-w-[1120px] space-y-6 px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight text-[#352C31]">
              Chấm công &amp; KPI giảng dạy
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#8C7380]">
              Tổng hợp lịch giảng dạy được phân công, thời lượng điểm danh thực tế, tình trạng bài tập
              và đánh giá từ học viên theo kỳ. Hệ thống không quản lý bảng lương hay thanh toán thù lao.
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
                className="h-9 rounded-xl border border-[#E7DAE1] bg-white px-3 text-[12px] font-medium text-[#543E49] hover:border-[#D49BAE]"
              >
                {p.label}
              </button>
            ))}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-xl border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-xl border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
            />
          </div>
        </header>

        {/* Phân quyền JLPT */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-[#FDFAFC] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-[#5E4B54]">
              Trình độ JLPT được phân quyền:
            </span>
            {levelChips.length > 0 ? (
              levelChips.map((lv) => (
                <span
                  key={lv}
                  className="rounded-lg bg-[#F9E7EE] px-2.5 py-0.5 text-[12px] font-semibold text-[#942B49]"
                >
                  {lv}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-[#8B7A83]">Chưa được cấp quyền JLPT N5–N2</span>
            )}
          </div>
          <span className="text-[11px] text-[#8B7A83]">
            Múi giờ thống kê: Asia/Ho_Chi_Minh (UTC+7)
          </span>
        </section>

        {kpiQuery.isLoading && (
          <div className="rounded-2xl border border-[#EADFE5] bg-white p-6 text-[13px] text-[#82737B]">
            Đang tổng hợp dữ liệu Chấm công &amp; KPI…
          </div>
        )}

        {kpiQuery.isError && (
          <div className="rounded-2xl border border-[#F2C0CD] bg-[#FFF2F5] p-4 text-[13px] text-[#A32145]">
            {kpiQuery.error?.message || 'Không tải được dữ liệu KPI.'}
          </div>
        )}

        {kpi && (
          <>
            {/* 4 thẻ chỉ số chính */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                <p className="text-[12px] text-[#8C7380]">Buổi được phân công</p>
                <p className="mt-1.5 text-[26px] font-semibold text-[#352C31]">
                  {kpi.totalAssignedSessions}
                </p>
                <p className="mt-1 text-[11px] text-[#8C7380]">
                  1-1: {kpi.assignedBookingsCount} · Khóa học: {kpi.assignedCourseSessionsCount}
                </p>
              </article>

              <article className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                <p className="text-[12px] text-[#8C7380]">Hoàn thành hợp lệ</p>
                <p className="mt-1.5 text-[26px] font-semibold text-[#1E5C36]">
                  {kpi.completedValidSessions}
                </p>
                <p className="mt-1 text-[11px] text-[#8C7380]">
                  Tỷ lệ hoàn thành: {formatCompletionRatio(kpi.completedValidSessions, kpi.totalAssignedSessions)}
                </p>
              </article>

              <article className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                <p className="text-[12px] text-[#8C7380]">Thời lượng dạy được xác nhận</p>
                <p className="mt-1.5 text-[26px] font-semibold text-[#AD3155]">
                  {formatMinutesVi(kpi.confirmedTeachingMinutes)}
                </p>
                <p className="mt-1 text-[11px] text-[#8C7380]">
                  Kế hoạch các buổi đạt: {formatMinutesVi(kpi.scheduledCompletedMinutes)}
                </p>
              </article>

              <article className="rounded-2xl border border-[#EADFE5] bg-white p-4">
                <p className="text-[12px] text-[#8C7380]">Hủy / Vắng / Chờ xử lý</p>
                <p className="mt-1.5 text-[26px] font-semibold text-[#8A4F08]">
                  {kpi.cancelledSessionsCount + kpi.missedOrNoShowSessionsCount}
                </p>
                <p className="mt-1 text-[11px] text-[#8C7380]">
                  Hủy: {kpi.cancelledSessionsCount} (Mentor {kpi.cancelledByMentorCount}) · Vắng/Quá giờ: {kpi.missedOrNoShowSessionsCount} · Sắp tới: {kpi.upcomingOrIncompleteSessionsCount}
                </p>
              </article>
            </section>

            {/* Bài tập & Đánh giá */}
            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-[#EADFE5] bg-white p-5">
                <h2 className="text-[15px] font-semibold text-[#352C31]">Bài tập &amp; Thời gian phản hồi</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-[#FDFAFC] p-3">
                    <dt className="text-[11px] text-[#8C7380]">Đã giao / Đã nộp</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-[#352C31]">
                      {kpi.homeworkAssignedCount} / {kpi.homeworkSubmittedCount}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[#FDFAFC] p-3">
                    <dt className="text-[11px] text-[#8C7380]">Đã chấm &amp; nhận xét</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-[#1E5C36]">
                      {kpi.homeworkGradedCount}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F0E4E9] px-3.5 py-2.5 text-[12px]">
                  <span className="text-[#6E5360]">Thời gian phản hồi trung bình</span>
                  <span className="font-semibold text-[#352C31]">
                    {formatTurnaroundVi(kpi.averageFeedbackTurnaroundMinutes)}
                    {kpi.feedbackTurnaroundSampleCount > 0 ? ` (${kpi.feedbackTurnaroundSampleCount} mẫu)` : ''}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[#8C7380]">
                  1-1 Booking: giao {kpi.bookingHomeworkAssignedCount}, nộp {kpi.bookingHomeworkSubmittedCount}, chấm {kpi.bookingHomeworkGradedCount} · Khóa học: giao {kpi.courseHomeworkAssignedCount}, nộp {kpi.courseHomeworkSubmittedCount}, chấm {kpi.courseHomeworkGradedCount}.
                </p>
              </article>

              <article className="rounded-2xl border border-[#EADFE5] bg-white p-5">
                <h2 className="text-[15px] font-semibold text-[#352C31]">Đánh giá &amp; Khiếu nại</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-[#FDFAFC] p-3">
                    <dt className="text-[11px] text-[#8C7380]">Điểm đánh giá TB</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-[#AD3155]">
                      {kpi.averageRating != null ? `${kpi.averageRating} ★` : 'Chưa có đánh giá'}
                    </dd>
                    <span className="text-[11px] text-[#8C7380]">
                      {kpi.totalReviewsCount} đánh giá đã duyệt
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#FDFAFC] p-3">
                    <dt className="text-[11px] text-[#8C7380]">Khiếu nại trong kỳ</dt>
                    <dd className="mt-1 text-[18px] font-semibold text-[#352C31]">
                      {kpi.totalDisputesCount}
                    </dd>
                    <span className="text-[11px] text-[#8C7380]">
                      Đang xử lý: {kpi.openDisputesCount} · Hoàn vé: {kpi.resolvedRefundCount}
                    </span>
                  </div>
                </dl>
              </article>
            </section>

            {/* Thống kê theo tuần / theo tháng */}
            <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-[#352C31]">Chi tiết theo chu kỳ</h2>
                <div className="inline-flex rounded-xl border border-[#E7DAE1] bg-[#FDFAFC] p-1">
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
                          ? 'bg-[#AD3155] text-white'
                          : 'text-[#6E5360] hover:text-[#352C31]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EADFE5] text-[11px] uppercase tracking-wider text-[#8C7A83]">
                      <th className="py-2">Kỳ</th>
                      <th className="py-2">Hợp lệ / Phân công</th>
                      <th className="py-2">Xác nhận dạy</th>
                      <th className="py-2">Hủy / Vắng</th>
                      <th className="py-2">BTVN Chấm/Nộp</th>
                      <th className="py-2">Đánh giá / KN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.periodKey} className="border-b border-[#F8F3F5]">
                        <td className="py-2 font-medium text-[#352C31]">{p.periodKey}</td>
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
                          {p.averageRating != null ? `${p.averageRating}★` : '—'} · {p.disputesCount} KN
                        </td>
                      </tr>
                    ))}
                    {periods.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#8B7A83]">
                          Chưa có dữ liệu trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Lịch sử buổi dạy & điểm danh gần đây */}
            <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
              <h2 className="text-[15px] font-semibold text-[#352C31]">
                Nhật ký buổi dạy &amp; điểm danh gần đây ({(kpi.recentSessions || []).length})
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EADFE5] text-[11px] uppercase tracking-wider text-[#8C7A83]">
                      <th className="py-2">Loại</th>
                      <th className="py-2">Học viên</th>
                      <th className="py-2">JLPT</th>
                      <th className="py-2">Thời gian</th>
                      <th className="py-2">Thời lượng (Xác nhận / KH)</th>
                      <th className="py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpi.recentSessions || []).map((s) => (
                      <tr key={`${s.sourceType}-${s.bookingOrSessionId}`} className="border-b border-[#F8F3F5]">
                        <td className="py-2 text-[12px] font-medium">
                          {s.sourceType === 'StudyCourse' ? 'Khóa học' : 'Tư vấn 1-1'} #{s.bookingOrSessionId}
                        </td>
                        <td className="py-2">{s.learnerName || 'Học viên'}</td>
                        <td className="py-2">{s.jlptLevel || '—'}</td>
                        <td className="py-2 text-[12px] text-[#75646C]">{fmtDate(s.scheduledStartUtc)}</td>
                        <td className="py-2">
                          {s.observedMentorMinutes}p / {s.scheduledMinutes}p
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              s.isValidCompleted
                                ? 'bg-[#E7F6EC] text-[#1E5C36]'
                                : 'bg-[#F4EEF1] text-[#6E5A64]'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!(kpi.recentSessions || []).length && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#8B7A83]">
                          Chưa có buổi dạy nào trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Minh bạch nguồn dữ liệu */}
            {kpi.metricSources && (
              <section className="rounded-2xl border border-[#EADFE5] bg-[#FDFAFC] p-4 text-[12px] text-[#6E5360]">
                <p className="font-semibold text-[#352C31]">Nguồn dữ liệu &amp; Quy tắc tổng hợp</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(kpi.metricSources).map(([key, text]) => (
                    <li key={key}>{text}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </ConsultShell>
  );
}
