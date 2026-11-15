import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getLearnerBookings, getMentorRating, rateMentor } from '../../api/mentorBookingApi.js';
import { bookingTime, bookingStatus, bookingExpired } from '../../utils/mentorBooking.js';

function MentorRating({ bookingId }) {
  const [rating, setRating] = useState('');
  const cache = useQueryClient();
  const queryKey = ['mentor-booking-rating', bookingId];
  const existing = useQuery({ queryKey, queryFn: () => getMentorRating(bookingId), retry: false });
  const save = useMutation({
    mutationFn: () => rateMentor(bookingId, Number(rating)),
    onSuccess: value => {
      cache.setQueryData(queryKey, value);
      void cache.invalidateQueries({ queryKey: ['booking-mentors'] });
    },
  });

  if (existing.isPending || existing.error?.status === 404) return null;
  if (existing.isError) return <p role="alert" className="text-sm text-rose-700">{existing.error.message}</p>;
  if (existing.data > 0) return <p className="text-sm">Bạn đã đánh giá {existing.data}/5 sao.</p>;

  return <form className="flex flex-wrap items-end gap-2 border-t border-[#eadfd9] pt-4" onSubmit={event => {
    event.preventDefault();
    if (rating && !save.isPending) save.mutate();
  }}>
    <label className="block text-sm font-semibold">Đánh giá mentor
      <select required className="mt-1 block rounded-lg border border-[#eadfd9] px-3 py-2 font-normal"
        value={rating} onChange={event => setRating(event.target.value)}>
        <option value="">Chọn số sao</option>
        {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} sao</option>)}
      </select>
    </label>
    <button type="submit" disabled={!rating || save.isPending}
      className="rounded-lg bg-[#9E2A4B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {save.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
    </button>
    {save.error && <p role="alert" className="w-full text-sm text-rose-700">{save.error.message}</p>}
  </form>;
}

export default function ConsultationSessionDetail() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId'));
  const query = useQuery({ queryKey: ['learner-mentor-bookings'], queryFn: getLearnerBookings, refetchInterval: 15000 });
  const b = query.data?.find(item => item.id === id);
  return <LearnerShell pathname={pathname} breadcrumb="Chi tiết buổi tư vấn"><div className="mx-auto max-w-3xl p-6 sm:p-8"><Link to="/consultation-center/" className="text-sm text-[#9E2A4B]">← Lịch của tôi</Link><h1 className="mt-5 text-2xl font-bold">Chi tiết booking {id ? `#${id}` : ''}</h1>{query.error && <p role="alert" className="mt-4 text-rose-700">{query.error.message}</p>}{query.isPending ? <p className="mt-5">Đang tải…</p> : b ? <section className="mt-5 space-y-4 rounded-2xl border border-[#eadfd9] bg-white p-6"><h2 className="text-xl font-bold">{b.mentorName || 'Chưa phân công mentor'}</h2><p className="text-sm text-[#9E2A4B]">{bookingStatus(b)}</p><p className="text-sm">Bắt đầu: {bookingTime(b.scheduledAt)} (GMT+7)</p><p className="text-sm">Kết thúc: {bookingTime(b.endsAt)} (GMT+7)</p><p className="whitespace-pre-wrap break-words text-sm">{b.question || 'Chưa gửi câu hỏi.'}</p><div className="flex flex-wrap gap-3">{b.paymentStatus === 'Paid' && <Link to={`/mentor-chat/?bookingId=${b.id}`} className="rounded-full border border-[#eadfd9] px-4 py-2 text-sm">Tin nhắn với Mentor</Link>}{b.paymentStatus === 'Paid' && b.roomId && !bookingExpired(b) && ['Assigned', 'Accepted'].includes(b.status) && <Link to={`/consultation-room/${b.roomId}/`} className="rounded-full bg-[#9E2A4B] px-4 py-2 text-sm font-bold text-white">Vào phòng họp</Link>}<Link to={`/consultation-receipt/?subscriptionId=${b.userSubscriptionId}`} className="rounded-full border border-[#eadfd9] px-4 py-2 text-sm">Trạng thái thanh toán</Link></div>{b.paymentStatus === 'Paid' && bookingExpired(b) && b.status !== 'Cancelled' && <MentorRating key={b.id} bookingId={b.id} />}</section> : <p className="mt-5 text-sm">Không tìm thấy booking trong tài khoản của bạn.</p>}</div></LearnerShell>;
}
