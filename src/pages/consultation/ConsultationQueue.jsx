import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import Pagination from '../../components/Pagination.jsx';
import { getMentorBookings } from '../../api/mentorBookingsApi.js';
import { bookingDate, bookingTime, bookingExpired, canAcceptBooking, bookingStatus } from '../../utils/mentorBooking.js';

export default function ConsultationQueue() {
  const { pathname } = useLocation();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('schedule');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useQuery({ queryKey: ['mentor-bookings'], queryFn: getMentorBookings, refetchInterval: 30000 });
  const bookings = query.data || [];
  const isLive = (booking) => ['Accepted', 'Confirmed'].includes(booking.status) && !bookingExpired(booking);
  const pending = bookings.filter(canAcceptBooking);
  const accepted = bookings.filter(isLive);
  const urgent = accepted.filter(b => bookingDate(b.scheduledAt) >= new Date(query.dataUpdatedAt) && bookingDate(b.scheduledAt) <= new Date(query.dataUpdatedAt + 2 * 3600000));
  const history = bookings.filter(b => bookingExpired(b) || ['Completed', 'Cancelled'].includes(b.status));
  const filtered = bookings.filter(b => {
    const matches = filter === 'all' || (filter === 'pending' && canAcceptBooking(b)) || (filter === 'accepted' && isLive(b)) || (filter === 'history' && (bookingExpired(b) || ['Completed', 'Cancelled'].includes(b.status)));
    return matches && `${b.learnerName || ''} ${b.learnerId || ''} ${b.id} ${b.question || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => sort === 'newest' ? (bookingDate(b.createdAt) || 0) - (bookingDate(a.createdAt) || 0) : (bookingDate(a.scheduledAt) || 0) - (bookingDate(b.scheduledAt) || 0));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <ConsultShell pathname={pathname} breadcrumb="Hàng đợi">
    <div className="mx-auto max-w-[1600px] space-y-5 p-6 sm:p-8" data-page="ConsultationQueue">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Hàng đợi yêu cầu tư vấn</h1><p className="mt-2 text-sm text-[#6F6669]">Các booking đã thanh toán được phân công cho bạn. Thời gian hiển thị theo GMT+7.</p></div><button disabled={query.isFetching} onClick={() => query.refetch()} className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm disabled:opacity-50">Làm mới</button></header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Chờ tiếp nhận', pending.length], ['Bắt đầu trong 2 giờ', urgent.length], ['Đã tiếp nhận', accepted.length], ['Lịch sử', history.length]].map(([label, count]) => <div key={label} className="rounded-2xl border border-[#eadfd9] bg-white p-5"><p className="text-xs font-semibold text-[#6F6669]">{label}</p><p className="mt-2 text-3xl font-bold text-[#9E2A4B]">{query.isPending ? '—' : count}</p></div>)}</div>
      <section className="rounded-2xl border border-[#eadfd9] bg-white p-4"><div className="flex flex-wrap gap-2">{[['all', 'Tất cả', bookings.length], ['pending', 'Chờ tiếp nhận', pending.length], ['accepted', 'Đã tiếp nhận', accepted.length], ['history', 'Lịch sử', history.length]].map(([key, label, count]) => <button key={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === key ? 'bg-[#9E2A4B] text-white' : 'bg-[#FAF7F5]'}`}>{label} ({count})</button>)}</div><div className="mt-4 flex flex-wrap gap-3"><input aria-label="Tìm yêu cầu tư vấn" placeholder="Tìm học viên, mã booking hoặc câu hỏi…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-[#eadfd9] px-3 py-2 text-sm" /><select aria-label="Sắp xếp yêu cầu" value={sort} onChange={e => setSort(e.target.value)} className="rounded-xl border border-[#eadfd9] px-3 py-2 text-sm"><option value="schedule">Lịch hẹn sớm nhất</option><option value="newest">Yêu cầu mới nhất</option></select></div></section>
      {query.error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{query.error.message}</p>}
      <section className="overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#FAF7F5] text-xs uppercase text-[#8c7f83]"><tr>{['Học viên & mã số', 'Chủ đề / câu hỏi', 'Lịch hẹn', 'Trạng thái', 'Thao tác'].map(label => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead><tbody>
          {rows.map(booking => <tr key={booking.id} className="border-t border-[#eadfd9]"><td className="px-5 py-5"><p className="font-bold">{booking.learnerName || `Học viên #${booking.learnerId}`}</p><p className="mt-1 text-xs text-[#6F6669]">ID học viên: {booking.learnerId} · Booking #{booking.id}</p></td><td className="max-w-xs px-5 py-5"><p className="whitespace-pre-wrap break-words">{booking.question || 'Học viên chưa gửi câu hỏi.'}</p><p className="mt-2 text-xs text-[#6F6669]">{booking.paymentStatus === 'Paid' ? 'Đã thanh toán' : (booking.paymentStatus || 'Chưa có trạng thái thanh toán')}</p></td><td className="px-5 py-5"><p>{bookingTime(booking.scheduledAt)}</p>{booking.endsAt ? <p className="mt-1 text-xs text-[#6F6669]">Kết thúc: {bookingTime(booking.endsAt)}</p> : null}</td><td className="px-5 py-5"><span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${canAcceptBooking(booking) ? 'bg-amber-50 text-amber-800' : ['Accepted', 'Confirmed'].includes(booking.status) && !bookingExpired(booking) ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{bookingStatus(booking)}</span></td><td className="px-5 py-5"><div className="flex flex-col items-start gap-2"><Link to={`/consultation-request/?bookingId=${booking.id}`} className="font-semibold text-[#9E2A4B]">Xem chi tiết →</Link><Link to={`/mentor-chat/?bookingId=${booking.id}`} className="text-xs text-[#6F6669] underline">Tin nhắn 1–1</Link></div></td></tr>)}
          {!rows.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-[#6F6669]">{query.isPending ? 'Đang tải yêu cầu…' : query.isError ? 'Không tải được hàng đợi.' : 'Không có yêu cầu phù hợp.'}</td></tr>}
        </tbody></table></div>
        <div className="border-t border-[#eadfd9] p-4"><Pagination currentPage={currentPage} totalPages={pages} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} itemLabel="yêu cầu" /></div>
      </section>
    </div>
  </ConsultShell>;
}
