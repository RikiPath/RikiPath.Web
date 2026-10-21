import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import { getMentorBooking, acceptMentorBooking } from '../../api/mentorBookingsApi.js';
import { bookingTime, canAcceptBooking, bookingStatus, bookingExpired } from '../../utils/mentorBooking.js';

export default function ConsultationRequestDetail() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId')) || null;
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['mentor-booking', id], queryFn: () => getMentorBooking(id), enabled: Boolean(id), refetchInterval: 30000 });
  const booking = query.data;
  const accept = useMutation({ mutationFn: () => acceptMentorBooking(id), onSuccess: data => {
    client.setQueryData(['mentor-booking', id], data);
    client.invalidateQueries({ queryKey: ['mentor-bookings'] });
  }, onError: () => query.refetch() });
  return <ConsultShell pathname={pathname} breadcrumb="Chi tiết yêu cầu">
    <div className="mx-auto max-w-5xl p-6 sm:p-8" data-page="ConsultationRequestDetail">
      <Link to="/consultation-queue/" className="text-sm font-semibold text-[#9E2A4B]">← Hàng đợi yêu cầu</Link>
      <h1 className="mt-5 text-2xl font-bold">Chi tiết yêu cầu {id ? `#${id}` : ''}</h1>
      {(query.error || accept.error) && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{(query.error || accept.error).message}</p>}
      {!id ? <p className="mt-5 text-[#6F6669]">Chọn một booking từ hàng đợi để xem thông tin.</p> : query.isPending ? <p role="status" className="mt-5">Đang tải yêu cầu…</p> : booking && <>
        <section className="mt-5 rounded-2xl border border-[#eadfd9] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{booking.learnerName || `Học viên #${booking.learnerId}`}</h2><p className="mt-2 text-sm text-[#6F6669]">Mã học viên: {booking.learnerId} · Booking #{booking.id}</p></div><span className="rounded-full bg-[#fff0f5] px-4 py-2 text-sm font-semibold text-[#9E2A4B]">{bookingStatus(booking)}</span></div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">{[['Mentor', booking.mentorName], ['Thanh toán', booking.paymentStatus === 'Paid' ? 'Đã thanh toán' : booking.paymentStatus], ['Bắt đầu (GMT+7)', bookingTime(booking.scheduledAt)], ['Kết thúc (GMT+7)', bookingTime(booking.endsAt)]].map(([label, value]) => <div key={label}><dt className="text-[#8c7f83]">{label}</dt><dd className="mt-1 font-semibold">{value || 'Chưa có thông tin'}</dd></div>)}</dl>
        </section>
        <section className="mt-5 rounded-2xl border border-[#eadfd9] bg-white p-6"><h2 className="font-bold">Câu hỏi của học viên</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#6F6669]">{booking.question || 'Học viên chưa gửi câu hỏi cho buổi tư vấn này.'}</p></section>
        <div className="mt-6 flex flex-wrap gap-3">{canAcceptBooking(booking) && <button disabled={accept.isPending} onClick={() => accept.mutate()} className="rounded-xl bg-[#9E2A4B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{accept.isPending ? 'Đang xác nhận…' : 'Xác nhận tiếp nhận'}</button>}<Link to={`/mentor-chat/?bookingId=${booking.id}`} className="rounded-xl border border-[#eadfd9] bg-white px-5 py-3 text-sm font-semibold">Tin nhắn 1–1</Link>{booking.roomId && !bookingExpired(booking) && ['Assigned', 'Accepted'].includes(booking.status) && <Link to={`/consultation-room/${booking.roomId}/`} className="rounded-xl border border-[#eadfd9] bg-white px-5 py-3 text-sm font-semibold">Vào phòng họp</Link>}</div>
        {booking.status === 'Accepted' && <p role="status" className="mt-4 text-sm text-emerald-700">Yêu cầu đã được tiếp nhận và lưu trên hệ thống.</p>}
        {bookingExpired(booking) && <p className="mt-4 text-sm text-[#6F6669]">Lịch đã hết hạn, bạn chỉ có thể xem lại thông tin.</p>}
      </>}
    </div>
  </ConsultShell>;
}
