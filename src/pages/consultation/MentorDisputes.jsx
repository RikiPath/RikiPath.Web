import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { ConsultShell } from '../../components/shells';
import { getDisputeDetail, getMentorDisputes, respondMentorDispute } from '../../api/mentorBookingApi.js';

const CATEGORY = {
  MentorAbsent: 'Cố vấn vắng',
  SessionNotConducted: 'Buổi không diễn ra',
  MediaRoomIssue: 'Lỗi phòng họp',
  QualityIssue: 'Chất lượng buổi',
  InappropriateBehavior: 'Hành vi không phù hợp',
  PolicyDispute: 'Chính sách',
  Other: 'Khác',
};

const STATUS = {
  Submitted: 'Mới gửi',
  UnderReview: 'Đang xem',
  AwaitingResponse: 'Chờ giải trình',
  Resolved: 'Đã xử lý',
  Rejected: 'Từ chối',
  Closed: 'Đã đóng',
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function Fact({ label, value, note }) {
  return (
    <div className="min-h-[88px] rounded-2xl bg-[#FDF2F5] px-4 py-3">
      <p className="text-[11px] text-[#967F8A]">{label}</p>
      <p className="mt-1 text-[14px] font-semibold leading-5">{value}</p>
      {note && <p className="mt-1 text-[12px] leading-5 text-[#705261]">{note}</p>}
    </div>
  );
}

export default function MentorDisputes() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');

  const query = useQuery({
    queryKey: ['mentor-disputes'],
    queryFn: () => getMentorDisputes({ page: 1, pageSize: 20 }),
  });
  const rows = Array.isArray(query.data) ? query.data : query.data?.items || [];
  const activeId = rows.some((item) => item.id === selectedId) ? selectedId : rows[0]?.id;
  const detail = useQuery({
    queryKey: ['mentor-dispute', activeId],
    queryFn: () => getDisputeDetail(activeId),
    enabled: Boolean(activeId),
  });
  const dispute = detail.data?.dispute;
  const respond = useMutation({
    mutationFn: () => respondMentorDispute(activeId, { responseText: draft.trim() }),
    onSuccess: () => {
      setDraft('');
      client.invalidateQueries({ queryKey: ['mentor-disputes'] });
      client.invalidateQueries({ queryKey: ['mentor-dispute', activeId] });
    },
  });

  return (
    <ConsultShell pathname={pathname} breadcrumb="Khiếu nại">
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">GIẢI TRÌNH</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Khiếu nại của học viên</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#8C7782]">
            Chọn một đơn bên trái. Hồ sơ bên phải giữ cùng bốn ô: loại, trạng thái, điểm danh và hủy buổi.
          </p>
        </header>

        {(query.error || detail.error || respond.error) && (
          <p role="alert" className="mb-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {(query.error || detail.error || respond.error).message}
          </p>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[22px] border border-[#F0E4E9] bg-white shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
            {query.isPending && <p className="px-4 py-6 text-[13px] text-[#A08B96]">Đang tải…</p>}
            {!query.isPending && !rows.length && <p className="px-4 py-10 text-center text-[13px] text-[#A08B96]">Chưa có khiếu nại.</p>}
            {rows.map((item) => {
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelectedId(item.id); setDraft(''); }}
                  className={`flex min-h-[76px] w-full items-center gap-3 border-b border-[#F6F0F3] px-4 py-3 text-left last:border-b-0 ${active ? 'bg-[#FDF2F5]' : 'hover:bg-[#FFFBFC]'} ${focus}`}
                >
                  <span className={`h-8 w-1 shrink-0 rounded-full ${active ? 'bg-[#AD3155]' : 'bg-[#F3E4EA]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{item.learnerName || `Học viên #${item.learnerId}`}</span>
                    <span className="mt-1 block text-[12px] text-[#967F8A]">Buổi #{item.mentorBookingId}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#AD3155]">
                    {STATUS[item.status] || item.status}
                  </span>
                </button>
              );
            })}
          </section>

          {activeId && (
            <section className="rounded-[22px] border border-[#F0E4E9] bg-white p-5 shadow-[0_10px_30px_rgba(90,40,58,0.04)]">
              {detail.isPending && <p className="text-[13px] text-[#A08B96]">Đang tải hồ sơ…</p>}
              {dispute && (
                <>
                  <p className="text-[12px] text-[#8C7782]">
                    Buổi #{dispute.mentorBookingId}
                    {detail.data?.bookingScheduledAt ? ` · ${when(detail.data.bookingScheduledAt)}` : ''}
                  </p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-tight">{dispute.learnerName || 'Học viên'}</h2>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Fact label="Loại" value={CATEGORY[dispute.category] || dispute.category} />
                    <Fact label="Trạng thái" value={STATUS[dispute.status] || dispute.status} />
                    <Fact
                      label="Điểm danh"
                      value={`${Math.round((detail.data?.attendanceTotalDurationSeconds || 0) / 60)} phút`}
                      note={`Kết nối lại ${detail.data?.attendanceReconnectionCount || 0} lần`}
                    />
                    <Fact
                      label="Hủy buổi"
                      value={detail.data?.isCancelled ? 'Đã hủy' : 'Chưa hủy'}
                      note={detail.data?.cancellationReason || (detail.data?.creditAlreadyRefunded ? 'Đã hoàn lượt' : '')}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#FFFBFC] px-4 py-3">
                    <p className="text-[11px] text-[#967F8A]">Lý do của học viên</p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6">{dispute.reason}</p>
                  </div>

                  {(detail.data?.histories || []).length > 0 && (
                    <ol className="mt-4 space-y-2">
                      {detail.data.histories.map((item) => (
                        <li key={item.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-[12px]">
                          <span className="text-[#A08B96]">{when(item.createdAtUtc)}</span>
                          <span className="text-[#705261]">
                            {item.actorRole} · {STATUS[item.newStatus] || item.newStatus}
                            {item.notes ? ` · ${item.notes}` : ''}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {dispute.mentorResponse ? (
                    <p className="mt-4 rounded-2xl bg-[#F7F2F4] px-4 py-3 text-[13px] leading-6">Đã giải trình: {dispute.mentorResponse}</p>
                  ) : (
                    <form className="mt-4" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) respond.mutate(); }}>
                      <label className="block text-[12px] font-medium text-[#6E5360]">
                        Giải trình
                        <textarea
                          required
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          rows={4}
                          className={`mt-1.5 w-full rounded-2xl border border-[#EADFE5] px-3 py-2 text-[13px] ${focus}`}
                        />
                      </label>
                      <button type="submit" disabled={respond.isPending || !draft.trim()} className={`mt-3 h-10 rounded-full bg-[#AD3155] px-5 text-[13px] font-semibold text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
                        {respond.isPending ? 'Đang gửi…' : 'Gửi giải trình'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </ConsultShell>
  );
}
