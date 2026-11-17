import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { getAdminMentorQualityMetrics, unwrapApiList } from '../../api/admin.js';
import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getAdminBookingAttendanceDetail,
  getAdminMentorKpiList,
} from '../../api/mentorGovernanceApi.js';
import { AdminShell } from '../../components/shells';

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
  const toIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: toIso(from), to: toIso(to) };
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function AdminMentorQuality() {
  const { pathname } = useLocation();
  const initial = useMemo(() => defaultRange(), []);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [search, setSearch] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState(null);
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [lookupBookingId, setLookupBookingId] = useState(null);

  const kpiQuery = useQuery({
    queryKey: ['admin-mentor-kpi-list', fromDate, toDate],
    queryFn: () => getAdminMentorKpiList({ from: fromDate, to: toDate, page: 1, pageSize: 50 }),
  });

  const legacyQualityQuery = useQuery({
    queryKey: ['admin-mentor-quality'],
    queryFn: async () => unwrapApiList(await getAdminMentorQualityMetrics({ page: 1, pageSize: 50 })),
  });

  const attendanceLookupQuery = useQuery({
    queryKey: ['admin-booking-attendance-detail', lookupBookingId],
    queryFn: () => getAdminBookingAttendanceDetail(lookupBookingId),
    enabled: Boolean(lookupBookingId),
    retry: false,
  });

  const mentors = useMemo(() => kpiQuery.data || [], [kpiQuery.data]);
  const filteredMentors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter(
      (m) =>
        String(m.mentorId).includes(q) ||
        String(m.mentorName || '').toLowerCase().includes(q),
    );
  }, [mentors, search]);

  const activeMentor = useMemo(() => {
    if (!filteredMentors.length) return null;
    return (
      filteredMentors.find((m) => m.mentorId === selectedMentorId) ||
      filteredMentors[0]
    );
  }, [filteredMentors, selectedMentorId]);

  const totals = useMemo(() => {
    return filteredMentors.reduce(
      (acc, m) => ({
        assigned: acc.assigned + (m.totalAssignedSessions || 0),
        completed: acc.completed + (m.completedValidSessions || 0),
        confirmedMinutes: acc.confirmedMinutes + (m.confirmedTeachingMinutes || 0),
        disputes: acc.disputes + (m.totalDisputesCount || 0),
      }),
      { assigned: 0, completed: 0, confirmedMinutes: 0, disputes: 0 },
    );
  }, [filteredMentors]);

  const legacyRows = legacyQualityQuery.data || [];

  return (
    <AdminShell pathname={pathname} breadcrumb="Chấm công & KPI Cố vấn">
      <div className="mx-auto max-w-[1320px] space-y-5 px-4 py-6 text-[#352C31] sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">Chấm công &amp; KPI Cố vấn</h1>
            <p className="mt-1 text-[13px] text-[#7D6C74]">
              Theo dõi phân công giảng dạy, điểm danh phòng họp, bài tập và phản hồi từ học viên.
              Không áp dụng trọng số KPI, thưởng/phạt hoặc tính lương.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] text-[#6E5360]">
              Từ ngày
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="ml-1.5 h-9 rounded-xl border border-[#E7DAE1] bg-white px-2.5 text-[13px]"
              />
            </label>
            <label className="text-[12px] text-[#6E5360]">
              Đến ngày
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="ml-1.5 h-9 rounded-xl border border-[#E7DAE1] bg-white px-2.5 text-[13px]"
              />
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc ID cố vấn…"
              className="h-9 w-52 rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px]"
            />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#EADFE5] bg-white p-4">
            <p className="text-[12px] text-[#8B7A83]">Tổng buổi phân công</p>
            <p className="mt-1.5 text-[24px] font-semibold text-[#352C31]">{totals.assigned}</p>
            <p className="mt-0.5 text-[11px] text-[#98878F]">{filteredMentors.length} cố vấn trong bộ lọc</p>
          </div>
          <div className="rounded-2xl border border-[#EADFE5] bg-white p-4">
            <p className="text-[12px] text-[#8B7A83]">Hoàn thành hợp lệ</p>
            <p className="mt-1.5 text-[24px] font-semibold text-[#1E5C36]">{totals.completed}</p>
            <p className="mt-0.5 text-[11px] text-[#98878F]">
              Tỷ lệ {formatCompletionRatio(totals.completed, totals.assigned)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#EADFE5] bg-white p-4">
            <p className="text-[12px] text-[#8B7A83]">Thời lượng xác nhận</p>
            <p className="mt-1.5 text-[24px] font-semibold text-[#AD3155]">
              {formatMinutesVi(totals.confirmedMinutes)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#98878F]">Từ điểm danh WebRTC &amp; xác nhận buổi học</p>
          </div>
          <div className="rounded-2xl border border-[#EADFE5] bg-white p-4">
            <p className="text-[12px] text-[#8B7A83]">Tổng khiếu nại phát sinh</p>
            <p className="mt-1.5 text-[24px] font-semibold text-[#8A4F08]">{totals.disputes}</p>
            <p className="mt-0.5 text-[11px] text-[#98878F]">Trong khoảng {fromDate} → {toDate}</p>
          </div>
        </section>

        {kpiQuery.isError && (
          <div className="rounded-2xl border border-[#F2C0CD] bg-[#FFF2F5] px-4 py-3 text-[13px] text-[#A32145]">
            {kpiQuery.error?.message || 'Không tải được dữ liệu KPI Cố vấn.'}
          </div>
        )}

        <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#352C31]">Bảng tổng hợp KPI theo Cố vấn</h2>
          {kpiQuery.isLoading ? (
            <p className="mt-4 text-[13px] text-[#7D6C74]">Đang tổng hợp dữ liệu KPI…</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#EADFE5] text-[11px] uppercase tracking-wider text-[#8C7A83]">
                    <th className="py-2">Cố vấn</th>
                    <th className="py-2">Phân công / Hợp lệ</th>
                    <th className="py-2">Thời lượng</th>
                    <th className="py-2">Hủy / Vắng / Chờ</th>
                    <th className="py-2">BTVN (Giao/Nộp/Chấm)</th>
                    <th className="py-2">Phản hồi BTVN</th>
                    <th className="py-2">Đánh giá / Khiếu nại</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMentors.map((m) => {
                    const selected = activeMentor?.mentorId === m.mentorId;
                    return (
                      <tr
                        key={m.mentorId}
                        onClick={() => setSelectedMentorId(m.mentorId)}
                        className={`cursor-pointer border-b border-[#F8F3F5] transition hover:bg-[#FCF6F9] ${
                          selected ? 'bg-[#FCF4F8]' : ''
                        }`}
                      >
                        <td className="py-2.5">
                          <div className="font-semibold text-[#352C31]">
                            #{m.mentorId} · {m.mentorName}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(m.teachingJlptLevels || []).map((lv) => (
                              <span
                                key={lv}
                                className="rounded bg-[#F6E9EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#942B49]"
                              >
                                {lv}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className="font-semibold text-[#1E5C36]">{m.completedValidSessions}</span>
                          {' / '}
                          <span>{m.totalAssignedSessions}</span>
                          <span className="ml-1 text-[11px] text-[#8B7A83]">
                            ({formatCompletionRatio(m.completedValidSessions, m.totalAssignedSessions)})
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div>{formatMinutesVi(m.confirmedTeachingMinutes)}</div>
                          <div className="text-[11px] text-[#8B7A83]">
                            Kế hoạch: {formatMinutesVi(m.scheduledCompletedMinutes)}
                          </div>
                        </td>
                        <td className="py-2.5 text-[12px]">
                          {m.cancelledSessionsCount} hủy · {m.missedOrNoShowSessionsCount} vắng ·{' '}
                          {m.upcomingOrIncompleteSessionsCount} chờ
                        </td>
                        <td className="py-2.5">
                          {m.homeworkAssignedCount} / {m.homeworkSubmittedCount} / {m.homeworkGradedCount}
                        </td>
                        <td className="py-2.5 text-[12px] text-[#5F4E56]">
                          {formatTurnaroundVi(m.averageFeedbackTurnaroundMinutes)}
                        </td>
                        <td className="py-2.5 text-[12px]">
                          <div>
                            {m.averageRating != null ? `${m.averageRating} ★ (${m.totalReviewsCount})` : 'Chưa có đánh giá'}
                          </div>
                          <div className="text-[#8B7A83]">
                            {m.totalDisputesCount} khiếu nại ({m.openDisputesCount} đang mở)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMentors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#8B7A83]">
                        Chưa có dữ liệu cố vấn trong bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {activeMentor && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#EADFE5] bg-white p-5">
              <h3 className="text-[15px] font-semibold text-[#352C31]">
                Thống kê theo tháng — {activeMentor.mentorName}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#EADFE5] text-[11px] uppercase text-[#8C7A83]">
                      <th className="py-2">Tháng</th>
                      <th className="py-2">Hợp lệ / Giao</th>
                      <th className="py-2">Xác nhận</th>
                      <th className="py-2">BTVN Chấm/Nộp</th>
                      <th className="py-2">Sao / KN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeMentor.monthlyBreakdown || []).map((p) => (
                      <tr key={p.periodKey} className="border-b border-[#F8F3F5]">
                        <td className="py-2 font-medium">{p.periodKey}</td>
                        <td className="py-2">{p.completedValidSessions} / {p.totalAssignedSessions}</td>
                        <td className="py-2">{formatMinutesVi(p.confirmedTeachingMinutes)}</td>
                        <td className="py-2">{p.homeworkGradedCount} / {p.homeworkSubmittedCount}</td>
                        <td className="py-2">
                          {p.averageRating != null ? `${p.averageRating}★` : '—'} · {p.disputesCount}
                        </td>
                      </tr>
                    ))}
                    {!(activeMentor.monthlyBreakdown || []).length && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[#8B7A83]">
                          Chưa có hoạt động theo tháng trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EADFE5] bg-white p-5">
              <h3 className="text-[15px] font-semibold text-[#352C31]">
                Thống kê theo tuần — {activeMentor.mentorName}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#EADFE5] text-[11px] uppercase text-[#8C7A83]">
                      <th className="py-2">Tuần</th>
                      <th className="py-2">Hợp lệ / Giao</th>
                      <th className="py-2">Xác nhận</th>
                      <th className="py-2">BTVN Chấm/Nộp</th>
                      <th className="py-2">Hủy / Vắng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeMentor.weeklyBreakdown || []).slice(0, 8).map((p) => (
                      <tr key={p.periodKey} className="border-b border-[#F8F3F5]">
                        <td className="py-2 font-medium">{p.periodKey}</td>
                        <td className="py-2">{p.completedValidSessions} / {p.totalAssignedSessions}</td>
                        <td className="py-2">{formatMinutesVi(p.confirmedTeachingMinutes)}</td>
                        <td className="py-2">{p.homeworkGradedCount} / {p.homeworkSubmittedCount}</td>
                        <td className="py-2">{p.cancelledSessionsCount} / {p.missedOrNoShowSessionsCount}</td>
                      </tr>
                    ))}
                    {!(activeMentor.weeklyBreakdown || []).length && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[#8B7A83]">
                          Chưa có hoạt động theo tuần trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Tra cứu điểm danh từng buổi (Phi tài chính) */}
        <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#352C31]">
                Tra cứu hồ sơ điểm danh buổi tư vấn 1-1
              </h3>
              <p className="mt-0.5 text-[12px] text-[#7D6C74]">
                Kiểm tra thời lượng tham gia thực tế của Cố vấn và Học viên từ phòng học trực tuyến.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Number(bookingIdInput);
                if (parsed > 0) setLookupBookingId(parsed);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="number"
                min={1}
                value={bookingIdInput}
                onChange={(e) => setBookingIdInput(e.target.value)}
                placeholder="Nhập Booking ID…"
                className="h-9 w-40 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
              />
              <button
                type="submit"
                className="h-9 rounded-xl bg-[#AD3155] px-3.5 text-[12px] font-medium text-white hover:bg-[#982B4B]"
              >
                Tra cứu
              </button>
            </form>
          </div>

          {attendanceLookupQuery.isError && (
            <p className="mt-3 text-[13px] text-[#A32145]">
              {attendanceLookupQuery.error?.message || 'Không tìm thấy lịch hẹn.'}
            </p>
          )}

          {attendanceLookupQuery.data && (
            <div className="mt-4 space-y-3 rounded-xl border border-[#F0E4E9] bg-[#FDFAFC] p-4 text-[13px]">
              <div className="flex flex-wrap gap-4">
                <span>
                  <strong>Booking #{attendanceLookupQuery.data.bookingId}</strong> ({attendanceLookupQuery.data.jlptLevel || '—'})
                </span>
                <span>Cố vấn: <strong>{attendanceLookupQuery.data.mentorName}</strong> ({formatMinutesVi(Math.round((attendanceLookupQuery.data.mentorObservedSeconds || 0) / 60))})</span>
                <span>Học viên: <strong>{attendanceLookupQuery.data.learnerName}</strong> ({formatMinutesVi(Math.round((attendanceLookupQuery.data.learnerObservedSeconds || 0) / 60))})</span>
                <span>Trạng thái: <strong>{attendanceLookupQuery.data.bookingStatus}</strong></span>
                <span>Điểm danh cả 2 phía ≥1p: <strong>{attendanceLookupQuery.data.bothJoinedAtLeastOneMinute ? 'Đạt' : 'Chưa đủ'}</strong></span>
              </div>
              <p className="text-[12px] text-[#7D6C74]">
                Bắt đầu: {fmtDate(attendanceLookupQuery.data.scheduledStartUtc)} · Kế hoạch: {attendanceLookupQuery.data.scheduledMinutes} phút
              </p>
            </div>
          )}
        </section>

        {legacyRows.length > 0 && (
          <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
            <h3 className="text-[15px] font-semibold text-[#352C31]">Chỉ số kiểm soát chất lượng vận hành</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {legacyRows.map((row, idx) => (
                <div key={row.mentorId || idx} className="rounded-xl border border-[#F2E6EB] p-3 text-[12px]">
                  <p className="font-semibold text-[#352C31]">{row.mentorName || `Mentor #${row.mentorId}`}</p>
                  <p className="mt-1 text-[#75646C]">
                    Trạng thái đánh giá: {row.averageRating != null ? `${row.averageRating}★` : '—'} · Hoàn tiền tranh chấp: {row.refundRatePercent ?? row.refundCount ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
