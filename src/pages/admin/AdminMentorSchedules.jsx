import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';

const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const format = value => asDate(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const stateOf = slot => slot.rejectedAt ? 'rejected' : slot.isApproved ? 'approved' : 'pending';
const labels = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối' };
const tones = { pending: 'bg-amber-50 text-amber-800', approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700' };

export default function AdminMentorSchedules() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['admin-mentor-schedules'],
    queryFn: async () => (await api.get('/admin/mentor-availabilities')).result || [],
    refetchInterval: 30000,
  });
  const slots = query.data || [];
  const visible = slots.filter(slot => filter === 'all' || stateOf(slot) === filter);
  const selected = slots.find(slot => slot.id === selectedId);
  const review = useMutation({
    mutationFn: ({ id, approve }) => api.post(`/admin/mentor-availabilities/${id}/review`, { approve, reason: approve ? null : reason.trim() }),
    onSuccess: (_, variables) => {
      setNotice(`Đã ${variables.approve ? 'duyệt' : 'từ chối'} lịch #${variables.id}.${variables.approve ? ' Lịch còn chỗ sẽ hiển thị cho học viên.' : ''}`);
      setSelectedId(null); setReason('');
      client.invalidateQueries({ queryKey: ['admin-mentor-schedules'] });
      client.invalidateQueries({ queryKey: ['booking-slots'] });
    },
    onError: () => client.invalidateQueries({ queryKey: ['admin-mentor-schedules'] }),
  });
  const canReview = selected && stateOf(selected) === 'pending' && asDate(selected.startTime) > new Date();
  const choose = slot => { setSelectedId(slot.id); setReason(''); setNotice(''); review.reset(); };

  return <AdminShell pathname={pathname} breadcrumb="Duyệt lịch Mentor">
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Duyệt lịch Mentor</h1><p className="mt-2 text-sm text-[#6F6669]">Lịch mới chỉ hiển thị cho Learner sau khi Admin duyệt. Giờ Việt Nam (GMT+7).</p></div><button onClick={() => query.refetch()} disabled={query.isFetching} className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm disabled:opacity-50">Làm mới</button></header>
      <div className="mb-5 flex flex-wrap gap-2">{[['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Đã từ chối'], ['all', 'Tất cả']].map(([key, text]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === key ? 'bg-[#9E2A4B] text-white' : 'border border-[#eadfd9] bg-white'}`}>{text} ({key === 'all' ? slots.length : slots.filter(slot => stateOf(slot) === key).length})</button>)}</div>
      {(query.error || review.error) && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{(query.error || review.error).message}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
          <h2 className="border-b border-[#eadfd9] p-5 font-bold">Danh sách lịch · {visible.length}</h2>
          {query.isPending && <p role="status" className="p-5 text-sm">Đang tải lịch…</p>}
          {!query.isPending && !visible.length && <p className="p-5 text-sm text-[#6F6669]">Không có lịch trong trạng thái này.</p>}
          <div className="max-h-[65vh] divide-y divide-[#eadfd9] overflow-auto">{visible.map(slot => <button key={slot.id} onClick={() => choose(slot)} className={`block w-full p-5 text-left hover:bg-[#fff8f8] ${selectedId === slot.id ? 'bg-[#fff0f5]' : ''}`}><span className="flex flex-wrap items-center justify-between gap-2"><strong>{slot.mentorName || `Mentor #${slot.mentorId}`}</strong><span className={`rounded-full px-3 py-1 text-xs ${tones[stateOf(slot)]}`}>{labels[stateOf(slot)]}</span></span><span className="mt-2 block text-sm">{format(slot.startTime)} – {format(slot.endTime)}</span><span className="mt-2 block text-xs text-[#6F6669]">Lịch #{slot.id} · {slot.bookedCount}/{slot.maxLearners} học viên{asDate(slot.startTime) <= new Date() ? ' · Đã bắt đầu / hết hạn' : ''}</span></button>)}</div>
        </section>
        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5">
          <h2 className="font-bold">{selected ? `Xét duyệt lịch #${selected.id}` : 'Chọn lịch cần duyệt'}</h2>
          {selected ? <><p className="mt-3 text-sm font-semibold">{selected.mentorName}</p><p className="mt-2 text-sm text-[#6F6669]">{format(selected.startTime)} – {format(selected.endTime)}</p><p className="mt-3 text-sm">Trạng thái: {labels[stateOf(selected)]}</p>{selected.adminName && <p className="mt-2 text-sm">Người xử lý: {selected.adminName}</p>}{selected.rejectionReason && <p className="mt-2 text-sm text-rose-700">Lý do: {selected.rejectionReason}</p>}{canReview ? <><label className="mt-5 block text-sm font-semibold">Lý do từ chối (bắt buộc khi từ chối)<textarea rows={4} maxLength={1000} value={reason} disabled={review.isPending} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-[#eadfd9] p-3 text-sm font-normal" /></label><div className="mt-4 flex flex-wrap gap-3"><button disabled={review.isPending} onClick={() => review.mutate({ id: selected.id, approve: true })} className="rounded-xl bg-[#9E2A4B] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Duyệt lịch</button><button disabled={review.isPending || !reason.trim()} onClick={() => review.mutate({ id: selected.id, approve: false })} className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-50">Từ chối</button></div></> : <p className="mt-4 text-sm text-[#6F6669]">Lịch đã xử lý hoặc đã bắt đầu, không thể duyệt lại.</p>}</> : <p className="mt-3 text-sm text-[#6F6669]">Chọn một lịch trong danh sách để xem thời gian và duyệt hoặc từ chối.</p>}
        </section>
      </div>
    </div>
  </AdminShell>;
}
