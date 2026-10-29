import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import Pagination from '../../components/Pagination.jsx';
import { getMentorBookings, acceptMentorBooking } from '../../api/mentorBookingsApi.js';
import { bookingDate, bookingTime, bookingExpired, canAcceptBooking, bookingStatus } from '../../utils/mentorBooking.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function ConsultationQueue() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('schedule');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useQuery({ queryKey: ['mentor-bookings'], queryFn: getMentorBookings, refetchInterval: 30000 });
  const accept = useMutation({
    mutationFn: acceptMentorBooking,
    onSuccess: (booking) => {
      client.invalidateQueries({ queryKey: ['mentor-bookings'] });
      navigate(`/consultation-request/?bookingId=${booking.id}`);
    },
  });
  const bookings = query.data || [];
  const isLive = (booking) => ['Accepted', 'Confirmed'].includes(booking.status) && !bookingExpired(booking);
  const pending = bookings.filter(canAcceptBooking);
  const accepted = bookings.filter(isLive);
  const urgent = accepted.filter((booking) => bookingDate(booking.scheduledAt) >= new Date(query.dataUpdatedAt) && bookingDate(booking.scheduledAt) <= new Date(query.dataUpdatedAt + 2 * 3600000));
  const history = bookings.filter((booking) => bookingExpired(booking) || ['Completed', 'Cancelled'].includes(booking.status));
  const filtered = bookings.filter((booking) => {
    const matches = filter === 'all'
      || (filter === 'pending' && canAcceptBooking(booking))
      || (filter === 'accepted' && isLive(booking))
      || (filter === 'history' && (bookingExpired(booking) || ['Completed', 'Cancelled'].includes(booking.status)));
    return matches && `${booking.learnerName || ''} ${booking.learnerId || ''} ${booking.id} ${booking.question || ''}`.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => (
    sort === 'newest'
      ? (bookingDate(b.createdAt) || 0) - (bookingDate(a.createdAt) || 0)
      : (bookingDate(a.scheduledAt) || 0) - (bookingDate(b.scheduledAt) || 0)
  ));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const counts = [
    ['Chờ tiếp nhận', pending.length],
    ['Bắt đầu trong 2 giờ', urgent.length],
    ['Đã tiếp nhận', accepted.length],
    ['Lịch sử', history.length],
  ];
  const filters = [
    ['all', 'Tất cả', bookings.length],
    ['pending', 'Chờ tiếp nhận', pending.length],
    ['accepted', 'Đã tiếp nhận', accepted.length],
    ['history', 'Lịch sử', history.length],
  ];

  return (
    <ConsultShell pathname={pathname} breadcrumb="Hàng đợi">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8" data-page="ConsultationQueue">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Hàng đợi yêu cầu</h1>
            <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">Các buổi đã thanh toán được phân cho bạn. Giờ Việt Nam.</p>
          </div>
          <button type="button" disabled={query.isFetching} onClick={() => query.refetch()} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] disabled:opacity-50 ${focus}`}>
            Làm mới
          </button>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {counts.map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
              <p className="text-[12px] text-[#967F8A]">{label}</p>
              <p className="mt-1 text-[22px] font-semibold text-[#A33357]">{query.isPending ? '—' : count}</p>
            </div>
          ))}
        </div>

        <section className="mb-4 rounded-2xl border border-[#EADFE5] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {filters.map(([key, label, count]) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${filter === key ? 'bg-[#AD3155] text-white' : 'bg-[#FCFAFB] text-[#705261]'} ${focus}`}>
                {label} ({count})
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input aria-label="Tìm yêu cầu tư vấn" placeholder="Tìm học viên, mã buổi hoặc câu hỏi…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-10 min-w-0 flex-1 rounded-xl border border-[#E7DAE1] px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30" />
            <select aria-label="Sắp xếp yêu cầu" value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-[#E7DAE1] px-3 text-[13px]">
              <option value="schedule">Lịch hẹn sớm nhất</option>
              <option value="newest">Yêu cầu mới nhất</option>
            </select>
          </div>
        </section>

        {query.error && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {accept.error && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{accept.error.message}</p>}

        <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-[13px]">
              <thead className="bg-[#FCFAFB] text-[11px] uppercase tracking-[0.04em] text-[#8C7782]">
                <tr>{['Học viên', 'Câu hỏi', 'Lịch hẹn', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((booking) => (
                  <tr key={booking.id} className="border-t border-[#F0E7EC]">
                    <td className="px-4 py-4">
                      <p className="font-medium">{booking.learnerName || `Học viên #${booking.learnerId}`}</p>
                      <p className="mt-1 text-[12px] text-[#8C7782]">Học viên {booking.learnerId} · Buổi #{booking.id}</p>
                    </td>
                    <td className="max-w-xs px-4 py-4">
                      <p className="whitespace-pre-wrap break-words">{booking.question || 'Học viên chưa gửi câu hỏi.'}</p>
                      <p className="mt-2 text-[12px] text-[#8C7782]">{booking.paymentStatus === 'Paid' ? 'Đã thanh toán' : (booking.paymentStatus || 'Chưa có trạng thái thanh toán')}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{bookingTime(booking.scheduledAt)}</p>
                      {booking.endsAt ? <p className="mt-1 text-[12px] text-[#8C7782]">Kết thúc: {bookingTime(booking.endsAt)}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-medium ${canAcceptBooking(booking) ? 'bg-[#FCF4F8] text-[#A33357]' : isLive(booking) ? 'bg-[#F3F8F4] text-[#2F6B45]' : 'bg-[#FCFAFB] text-[#8C7782]'}`}>
                        {bookingStatus(booking)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {canAcceptBooking(booking) && (
                          <button type="button" disabled={accept.isPending} onClick={() => accept.mutate(booking.id)} className={`rounded-lg bg-[#AD3155] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50 ${focus}`}>
                            {accept.isPending && accept.variables === booking.id ? 'Đang tiếp nhận…' : 'Tiếp nhận'}
                          </button>
                        )}
                        <Link to={`/consultation-request/?bookingId=${booking.id}`} className="text-[13px] font-medium text-[#AD3155]">Xem chi tiết</Link>
                        <Link to={`/mentor-chat/?bookingId=${booking.id}`} className="text-[12px] text-[#8C7782] underline">Tin nhắn 1–1</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px] text-[#8C7782]">{query.isPending ? 'Đang tải yêu cầu…' : query.isError ? 'Không tải được hàng đợi.' : 'Không có yêu cầu phù hợp.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#F0E7EC] p-4">
            <Pagination currentPage={currentPage} totalPages={pages} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemLabel="yêu cầu" />
          </div>
        </section>
      </div>
    </ConsultShell>
  );
}
