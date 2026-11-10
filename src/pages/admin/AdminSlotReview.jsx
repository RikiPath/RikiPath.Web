import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAdminMentorAvailabilities, getPendingMentorSlots, reviewMentorSlot, reviewMentorSlotCancels, reviewMentorSlots, unwrapApiList } from '../../api/admin.js';
import { resolveSlotChange } from '../../api/mentorScheduleApi.js';
import { AdminShell } from '../../components/shells';

const TABS = [
  { id: 'review', label: 'Chờ duyệt' },
  { id: 'cancel', label: 'Xin hủy' },
  { id: 'change', label: 'Xin đổi tiết' },
];

function when(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSlotReview() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('review');
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useQuery({ queryKey: ['admin-pending-slots'], queryFn: getPendingMentorSlots });
  const all = useQuery({
    queryKey: ['admin-mentor-slots'],
    queryFn: async () => unwrapApiList(await getAdminMentorAvailabilities()),
  });
  const refresh = () => {
    setPicked([]);
    queryClient.invalidateQueries({ queryKey: ['admin-pending-slots'] });
    queryClient.invalidateQueries({ queryKey: ['admin-mentor-slots'] });
  };
  const reviewOne = useMutation({
    mutationFn: ({ id, approve }) => reviewMentorSlot(id, approve, approve ? undefined : reason.trim()),
    onSuccess: () => { setNotice('Đã xử lý một khung giờ.'); setReason(''); refresh(); },
  });
  const review = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlots(ids, approve, approve ? undefined : reason.trim()),
    onSuccess: () => { setNotice('Đã xử lý khung giờ chờ duyệt.'); setReason(''); refresh(); },
  });
  const cancel = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlotCancels(ids, approve, approve ? undefined : reason.trim()),
    onSuccess: () => { setNotice('Đã xử lý yêu cầu hủy.'); setReason(''); refresh(); },
  });
  const change = useMutation({
    mutationFn: ({ id, cancelSlot }) => resolveSlotChange(id, { cancelSlot, reason: reason.trim() }),
    onSuccess: () => { setNotice('Đã xử lý yêu cầu đổi tiết.'); setReason(''); refresh(); },
  });
  const pendingRows = (Array.isArray(pending.data) ? pending.data : []).filter((row) => !row.mentorWeeklyAvailabilityId);
  const weeklyCount = (Array.isArray(pending.data) ? pending.data : []).filter((row) => row.mentorWeeklyAvailabilityId).length;
  const cancelRows = (Array.isArray(pending.data) ? pending.data : []).filter((row) => row.cancelRequestedAt && !row.cancelRejectedAt);
  const changeRows = (Array.isArray(all.data) ? all.data : []).filter((row) => row.changeRequestedAt && !row.changeResolution);
  const rows = tab === 'review' ? pendingRows : tab === 'cancel' ? cancelRows : changeRows;
  const counts = { review: pendingRows.length, cancel: cancelRows.length, change: changeRows.length };
  const busy = review.isPending || reviewOne.isPending || cancel.isPending || change.isPending;
  const error = pending.error || all.error || review.error || reviewOne.error || cancel.error || change.error;
  const toggle = (id) => setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <AdminShell pathname={pathname} breadcrumb="Duyệt khung giờ">
      <main className="mx-auto max-w-[860px] px-4 py-6 text-[#352C31] sm:px-6">
        <h1 className="text-[25px] font-semibold tracking-tight">Duyệt khung giờ</h1>
        <p className="mt-1 text-[13px] text-[#82737B]">Khung lẻ của cố vấn. Lịch tuần được công bố ở trang xếp lịch.</p>

        <div className="mt-4 flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); setPicked([]); setReason(''); }}
              className={`h-9 rounded-lg px-3 text-[13px] ${tab === item.id ? 'bg-[#FCE8F0] font-medium text-[#AD3155]' : 'bg-white text-[#705261] hover:bg-[#FFF6FA]'}`}
            >
              {item.label}
              <span className="ml-1.5 text-[12px]">{counts[item.id]}</span>
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}
        {notice && <p className="mt-4 rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}
        {tab === 'review' && weeklyCount > 0 && (
          <p className="mt-4 rounded-xl border border-[#EADFE5] bg-white px-4 py-3 text-[13px] text-[#705261]">
            {weeklyCount} khung thuộc lịch tuần.{' '}
            <Link to="/admin/mentor-schedules" className="font-medium text-[#AD3155]">Mở xếp lịch tuần</Link>
          </p>
        )}

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          {(pending.isLoading || all.isLoading) && <p className="px-5 py-6 text-[13px] text-[#A08B96]">Đang tải…</p>}
          {!pending.isLoading && rows.length === 0 && <p className="px-5 py-8 text-[13px] text-[#A08B96]">Không có yêu cầu trong mục này.</p>}
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 border-b border-[#F6F0F3] px-5 py-3 last:border-b-0">
              {tab !== 'change' && (
                <input type="checkbox" className="mt-1" checked={picked.includes(row.id)} onChange={() => toggle(row.id)} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{row.mentorName || `Cố vấn #${row.mentorId}`}</span>
                <span className="mt-0.5 block text-[12px] text-[#A08B96]">{when(row.startTime)} – {when(row.endTime)}</span>
                {(row.cancelReason || row.changeRequestReason) && (
                  <span className="mt-1 block text-[12px] leading-5 text-[#705261]">{row.cancelReason || row.changeRequestReason}</span>
                )}
              </span>
              {tab === 'review' && (
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy} onClick={() => reviewOne.mutate({ id: row.id, approve: true })} className="h-8 rounded-lg bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50">Duyệt</button>
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => reviewOne.mutate({ id: row.id, approve: false })} className="h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Từ chối</button>
                </span>
              )}
              {tab === 'change' && (
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => change.mutate({ id: row.id, cancelSlot: false })} className="h-8 rounded-lg bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50">Giữ</button>
                  <button type="button" disabled={busy || !reason.trim()} onClick={() => change.mutate({ id: row.id, cancelSlot: true })} className="h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Hủy tiết</button>
                </span>
              )}
            </div>
          ))}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-end gap-2 border-t border-[#F3EDF0] bg-[#FFF8FB] px-5 py-3">
              <label className="min-w-[220px] flex-1 text-[12px] font-medium text-[#6E5360]">
                {tab === 'change' ? 'Lý do xử lý' : 'Lý do khi từ chối'}
                <input maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px] font-normal outline-none focus:border-[#AD3155]" />
              </label>
              {tab !== 'change' && (
                <>
                  <button type="button" disabled={busy || picked.length === 0} onClick={() => (tab === 'review' ? review : cancel).mutate({ ids: picked, approve: true })} className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white disabled:opacity-50">
                    Duyệt {picked.length || ''}
                  </button>
                  <button type="button" disabled={busy || picked.length === 0 || !reason.trim()} onClick={() => (tab === 'review' ? review : cancel).mutate({ ids: picked, approve: false })} className="h-10 rounded-lg border border-[#E7DAE1] bg-white px-4 text-[13px] disabled:opacity-50">
                    Từ chối
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
