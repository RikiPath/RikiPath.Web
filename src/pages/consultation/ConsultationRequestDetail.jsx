import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import { getMentorBooking, getMentorBookings, acceptMentorBooking } from '../../api/mentorBookingsApi.js';
import { bookingTime, canAcceptBooking, bookingStatus, bookingExpired } from '../../utils/mentorBooking.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function ConsultationRequestDetail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId')) || null;
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    enabled: !id,
  });

  useEffect(() => {
    if (id || !list.isSuccess) return;
    const rows = list.data || [];
    const next = rows.find(canAcceptBooking) || rows[0];
    if (next?.id) navigate(`/consultation-request/?bookingId=${next.id}`, { replace: true });
  }, [id, list.isSuccess, list.data, navigate]);

  const query = useQuery({
    queryKey: ['mentor-booking', id],
    queryFn: () => getMentorBooking(id),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });
  const booking = query.data;
  const accept = useMutation({
    mutationFn: () => acceptMentorBooking(id),
    onSuccess: (data) => {
      client.setQueryData(['mentor-booking', id], data);
      client.invalidateQueries({ queryKey: ['mentor-bookings'] });
    },
  });

  return (
    <ConsultShell pathname={pathname} breadcrumb="Chi tiết yêu cầu">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8" data-page="ConsultationRequestDetail">
        <Link to="/consultation-queue/" className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>Về hàng đợi</Link>
        <header className="mb-5 mt-4">
          <h1 className="text-[25px] font-semibold tracking-tight">Chi tiết yêu cầu {id ? `#${id}` : ''}</h1>
        </header>
        {(query.error || accept.error) && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{(query.error || accept.error).message}</p>}
        {!id ? (
          list.isError
            ? <p role="alert" className="rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{list.error.message}</p>
            : list.isSuccess && !(list.data || []).length
              ? <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8"><p className="text-[15px] font-medium text-[#806371]">Chưa có yêu cầu trong hàng đợi.</p></div>
              : <p role="status" className="text-[13px] text-[#9A8390]">Đang mở yêu cầu…</p>
        ) : query.isPending ? <p role="status" className="text-[13px] text-[#9A8390]">Đang tải yêu cầu…</p> : booking && (
          <>
            <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold">{booking.learnerName || `Học viên #${booking.learnerId}`}</h2>
                  <p className="mt-1 text-[13px] text-[#927B88]">Học viên {booking.learnerId} · Buổi #{booking.id}</p>
                </div>
                <span className="rounded-full bg-[#FCEEF3] px-3 py-1 text-[12px] font-medium text-[#AD3155]">{bookingStatus(booking)}</span>
              </div>
              <dl className="mt-5 grid gap-4 text-[13px] sm:grid-cols-2">
                {[['Mentor', booking.mentorName], ['Thanh toán', booking.paymentStatus === 'Paid' ? 'Đã thanh toán' : booking.paymentStatus], ['Bắt đầu', bookingTime(booking.scheduledAt)], ['Kết thúc', bookingTime(booking.endsAt)]].map(([label, value]) => (
                  <div key={label}><dt className="text-[#8C7782]">{label}</dt><dd className="mt-1 font-medium">{value || 'Chưa có thông tin'}</dd></div>
                ))}
              </dl>
            </section>
            <section className="mt-3 rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
              <h2 className="text-[15px] font-semibold">Câu hỏi của học viên</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#705261]">{booking.question || 'Học viên chưa gửi câu hỏi cho buổi tư vấn này.'}</p>
            </section>
            <div className="mt-4 flex flex-wrap gap-2">
              {canAcceptBooking(booking) && (
                <button type="button" disabled={accept.isPending} onClick={() => accept.mutate()} className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}>
                  {accept.isPending ? 'Đang xác nhận…' : 'Xác nhận tiếp nhận'}
                </button>
              )}
              <Link to={`/mentor-chat/?bookingId=${booking.id}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Tin nhắn 1–1</Link>
              {booking.meetingLink && <a href={booking.meetingLink} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Link phòng họp</a>}
              {booking.roomId && !bookingExpired(booking) && ['Assigned', 'Accepted', 'Confirmed'].includes(booking.status) && (
                <Link to={`/consultation-room/${booking.roomId}/`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Vào phòng họp</Link>
              )}
            </div>
            {booking.status === 'Accepted' && <p role="status" className="mt-4 text-[13px] text-[#2F6B45]">Yêu cầu đã được tiếp nhận và lưu trên hệ thống.</p>}
            {bookingExpired(booking) && <p className="mt-4 text-[13px] text-[#927B88]">Lịch đã hết hạn, bạn chỉ có thể xem lại thông tin.</p>}
          </>
        )}
      </div>
    </ConsultShell>
  );
}
