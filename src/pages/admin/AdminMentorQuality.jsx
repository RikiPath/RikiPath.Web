import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import {
  formatCompletionRatio,
  formatMinutesVi,
  formatTurnaroundVi,
  getAdminMentorKpiList,
} from '@/features/mentor/api/mentorGovernanceApi.js';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader, StaleDataBar } from '@/components/ui';
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
  const [selectedMentorId, setSelectedMentorId] = useState(null);

  const kpiQuery = useQuery({
    queryKey: ['admin-mentor-kpi-list', fromDate, toDate],
    queryFn: () => getAdminMentorKpiList({ from: fromDate, to: toDate, page: 1, pageSize: 50 }),
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

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Chấm công & KPI Cố vấn')}>
      <div className="rp-container rp-cq space-y-[var(--rp-space-section)] py-[var(--rp-space-page-y)] text-rp-text">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="rp-type-page-title">{tr('Chấm công & KPI Cố vấn')}</h1>
            <p className="rp-type-secondary mt-1 max-w-2xl text-rp-text-2">
              {tr('Theo dõi phân công giảng dạy, điểm danh phòng họp, bài tập và phản hồi từ học viên. Không áp dụng trọng số KPI, thưởng/phạt hoặc tính lương.')}
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-end gap-2">
            <label className="text-[12px] text-rp-text-2">
              {tr('Từ ngày')}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="ml-1.5 h-9 rounded-xl border border-rp-line bg-white px-2.5 text-[13px]"
              />
            </label>
            <label className="text-[12px] text-rp-text-2">
              {tr('Đến ngày')}
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="ml-1.5 h-9 rounded-xl border border-rp-line bg-white px-2.5 text-[13px]"
              />
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('Tìm tên hoặc ID cố vấn…')}
              className="h-9 min-w-0 w-full rounded-xl border border-rp-line bg-white px-3 text-[13px] sm:w-52"
            />
          </div>
        </header>

        {kpiQuery.isError && kpiQuery.data && (
          <StaleDataBar onRetry={() => kpiQuery.refetch()} retrying={kpiQuery.isFetching} />
        )}

        {kpiQuery.isError && !kpiQuery.data ? (
          <section className="rounded-2xl border border-rp-line bg-white p-5">
            <ContextualErrorState
              error={kpiQuery.error}
              title={tr('Không tải được dữ liệu KPI Cố vấn')}
              onRetry={() => kpiQuery.refetch()}
              retrying={kpiQuery.isFetching}
            />
          </section>
        ) : kpiQuery.isLoading && !kpiQuery.data ? (
          <section className="rounded-2xl border border-rp-line bg-white p-5">
            <SakuraLoader variant="section" context="dashboard" label={tr('Đang tổng hợp dữ liệu KPI…')} delay={160} />
          </section>
        ) : (
        <>
        <section className="rp-cq-kpis">
          <div className="rounded-2xl border border-rp-line bg-white p-4">
            <p className="text-[12px] text-rp-text-muted">{tr('Tổng buổi phân công')}</p>
            <p className="mt-1.5 text-[24px] font-semibold text-rp-text">{totals.assigned}</p>
            <p className="mt-0.5 text-[11px] text-rp-text-muted">{trf('{0} cố vấn trong bộ lọc', { 0: filteredMentors.length })}</p>
          </div>
          <div className="rounded-2xl border border-rp-line bg-white p-4">
            <p className="text-[12px] text-rp-text-muted">{tr('Hoàn thành hợp lệ')}</p>
            <p className="mt-1.5 text-[24px] font-semibold text-rp-success">{totals.completed}</p>
            <p className="mt-0.5 text-[11px] text-rp-text-muted">
             {trf('Tỷ lệ {0}', { 0: formatCompletionRatio(totals.completed, totals.assigned) })}
            </p>
          </div>
          <div className="rounded-2xl border border-rp-line bg-white p-4">
            <p className="text-[12px] text-rp-text-muted">{tr('Thời lượng xác nhận')}</p>
            <p className="mt-1.5 text-[24px] font-semibold text-rp-brand-strong">
              {formatMinutesVi(totals.confirmedMinutes)}
            </p>
            <p className="mt-0.5 text-[11px] text-rp-text-muted">{tr('Từ điểm danh phòng học & xác nhận buổi học')}</p>
          </div>
          <div className="rounded-2xl border border-rp-line bg-white p-4">
            <p className="text-[12px] text-rp-text-muted">{tr('Tổng khiếu nại phát sinh')}</p>
            <p className="mt-1.5 text-[24px] font-semibold text-[#8A4F08]">{totals.disputes}</p>
            <p className="mt-0.5 text-[11px] text-rp-text-muted">{trf('Trong khoảng {0} → {1}', { 0: fromDate, 1: toDate })}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-rp-line bg-white p-5">
          <h2 className="text-[16px] font-semibold text-rp-text">{tr('Bảng tổng hợp KPI theo Cố vấn')}</h2>
          {filteredMentors.length === 0 ? (
            <ContextualEmptyState compact title={tr('Chưa có dữ liệu cố vấn trong bộ lọc.')} description={tr('Hãy thử đổi khoảng ngày hoặc từ khóa tìm kiếm.')} />
          ) : (
            <div data-density="compact" className="rp-scroll-x mt-3">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-rp-line bg-rp-bg-2/60 text-[11px] uppercase tracking-wider text-rp-text-muted">
                    <th className="px-3 py-2.5">{tr('Cố vấn')}</th>
                    <th className="px-3 py-2.5">{tr('Phân công / Hợp lệ')}</th>
                    <th className="px-3 py-2.5">{tr('Thời lượng')}</th>
                    <th className="px-3 py-2.5">{tr('Hủy / Vắng / Chờ')}</th>
                    <th className="px-3 py-2.5">{tr('Bài tập (giao/nộp/chấm)')}</th>
                    <th className="px-3 py-2.5">{tr('Phản hồi bài tập')}</th>
                    <th className="px-3 py-2.5">{tr('Đánh giá / Khiếu nại')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMentors.map((m) => {
                    const selected = activeMentor?.mentorId === m.mentorId;
                    return (
                      <tr
                        key={m.mentorId}
                        onClick={() => setSelectedMentorId(m.mentorId)}
                        className={`cursor-pointer border-b border-rp-bg-2 transition hover:bg-rp-brand-tint ${
                          selected ? 'bg-rp-brand-tint' : ''
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="font-semibold text-rp-text">
                            #{m.mentorId} · {m.mentorName}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(m.teachingJlptLevels || []).map((lv) => (
                              <span
                                key={lv}
                                className="rounded bg-rp-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-rp-brand-strong"
                              >
                                {lv}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-rp-success">{m.completedValidSessions}</span>
                          {' / '}
                          <span>{m.totalAssignedSessions}</span>
                          <span className="ml-1 text-[11px] text-rp-text-muted">
                            ({formatCompletionRatio(m.completedValidSessions, m.totalAssignedSessions)})
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div>{formatMinutesVi(m.confirmedTeachingMinutes)}</div>
                          <div className="text-[11px] text-rp-text-muted">
                           {trf('Kế hoạch: {0}', { 0: formatMinutesVi(m.scheduledCompletedMinutes) })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                         {trf('{0} hủy · {1} vắng ·  {2} chờ', { 0: m.cancelledSessionsCount, 1: m.missedOrNoShowSessionsCount, 2: m.upcomingOrIncompleteSessionsCount })}
                        </td>
                        <td className="px-3 py-3">
                          {m.homeworkAssignedCount} / {m.homeworkSubmittedCount} / {m.homeworkGradedCount}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-rp-text-2">
                          {formatTurnaroundVi(m.averageFeedbackTurnaroundMinutes)}
                        </td>
                        <td className="px-3 py-3 text-[12px]">
                          <div>
                            {m.averageRating != null ? `${m.averageRating} ★ (${m.totalReviewsCount})` : tr('Chưa có đánh giá')}
                          </div>
                          <div className="text-rp-text-muted">
                           {trf('{0} khiếu nại ({1} đang mở)', { 0: m.totalDisputesCount, 1: m.openDisputesCount })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </>
        )}

        {activeMentor && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-rp-line bg-white p-5">
              <h3 className="text-[15px] font-semibold text-rp-text">
               {trf('Thống kê theo tháng — {0}', { 0: activeMentor.mentorName })}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-rp-line text-[11px] uppercase text-rp-text-muted">
                      <th className="py-2">{tr('Tháng')}</th>
                      <th className="py-2">{tr('Hợp lệ / Giao')}</th>
                      <th className="py-2">{tr('Xác nhận')}</th>
                      <th className="py-2">{tr('Bài tập (chấm/nộp)')}</th>
                      <th className="py-2">Sao / KN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeMentor.monthlyBreakdown || []).map((p) => (
                      <tr key={p.periodKey} className="border-b border-rp-bg-2">
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
                        <td colSpan={5} className="py-4 text-center text-rp-text-muted">
                          {tr('Chưa có hoạt động theo tháng trong kỳ.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-rp-line bg-white p-5">
              <h3 className="text-[15px] font-semibold text-rp-text">
               {trf('Thống kê theo tuần — {0}', { 0: activeMentor.mentorName })}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-rp-line text-[11px] uppercase text-rp-text-muted">
                      <th className="py-2">{tr('Tuần')}</th>
                      <th className="py-2">{tr('Hợp lệ / Giao')}</th>
                      <th className="py-2">{tr('Xác nhận')}</th>
                      <th className="py-2">{tr('Bài tập (chấm/nộp)')}</th>
                      <th className="py-2">{tr('Hủy / Vắng')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeMentor.weeklyBreakdown || []).slice(0, 8).map((p) => (
                      <tr key={p.periodKey} className="border-b border-rp-bg-2">
                        <td className="py-2 font-medium">{p.periodKey}</td>
                        <td className="py-2">{p.completedValidSessions} / {p.totalAssignedSessions}</td>
                        <td className="py-2">{formatMinutesVi(p.confirmedTeachingMinutes)}</td>
                        <td className="py-2">{p.homeworkGradedCount} / {p.homeworkSubmittedCount}</td>
                        <td className="py-2">{p.cancelledSessionsCount} / {p.missedOrNoShowSessionsCount}</td>
                      </tr>
                    ))}
                    {!(activeMentor.weeklyBreakdown || []).length && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-rp-text-muted">
                          {tr('Chưa có hoạt động theo tuần trong kỳ.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
