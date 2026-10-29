import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getLearnerBookings } from '../../api/mentorBookingApi.js';
import { cancelMentorBooking } from '../../api/mentorScheduleApi.js';
import { bookingDate, bookingTime, bookingStatus } from '../../utils/mentorBooking.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const canCancel = (booking) => {
  const start = bookingDate(booking.scheduledAt);
  return ['Assigned', 'Accepted'].includes(booking.status)
    && booking.paymentStatus === 'Paid'
    && start
    && start.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
};

export default function ConsultationCenter() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['learner-mentor-bookings'], queryFn: getLearnerBookings, refetchInterval: 15000 });
  const cancel = useMutation({
    mutationFn: cancelMentorBooking,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['learner-mentor-bookings'] });
      client.invalidateQueries({ queryKey: ['mentor-purchases'] });
    },
  });
  const bookings = query.data || [];

  return (
    <LearnerShell pathname={pathname} breadcrumb="Lịch tư vấn">
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Lịch tư vấn của tôi</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">
              Các buổi đã đặt. Hủy trước giờ bắt đầu ít nhất 24 tiếng thì được trả lại 1 lượt.
            </p>
          </div>
          <Link to="/booking-schedule/" className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
            Đặt lịch
          </Link>
        </header>

        {(query.error || cancel.error) && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {(query.error || cancel.error).message}
          </p>
        )}
        {query.isPending && <p role="status" className="text-[13px] text-[#9A8390]">Đang tải…</p>}

        <div className="space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold">{booking.mentorName || 'Mentor'}</h2>
                  <p className="mt-1 text-[13px] text-[#927B88]">
                    #{booking.id} · {bookingTime(booking.scheduledAt)} · giờ Việt Nam
                  </p>
                </div>
                <span className="rounded-full bg-[#FCEEF3] px-3 py-1 text-[12px] font-medium text-[#AD3155]">
                  {bookingStatus(booking)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/consultation-session/?bookingId=${booking.id}`} className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>Chi tiết</Link>
                {booking.userSubscriptionId && (
                  <Link to={`/consultation-receipt/?subscriptionId=${booking.userSubscriptionId}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Gói / số lượt còn lại</Link>
                )}
                {booking.paymentStatus === 'Paid' && (
                  <Link to={`/mentor-chat/?bookingId=${booking.id}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Chat với mentor</Link>
                )}
                {booking.meetingLink && (
                  <a href={booking.meetingLink} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Link phòng họp</a>
                )}
                {canCancel(booking) && (
                  <button
                    type="button"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(booking.id)}
                    className={`inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-medium text-[#A33357] hover:bg-[#FCF4F8] disabled:opacity-50 ${focus}`}
                  >
                    {cancel.isPending && cancel.variables === booking.id ? 'Đang hủy…' : 'Hủy buổi'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>

        {!query.isPending && !bookings.length && (
          <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
            <p className="text-[15px] font-medium text-[#806371]">Chưa có buổi tư vấn</p>
            <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">Buổi đã đặt sẽ hiện ở đây.</p>
          </div>
        )}
      </main>
    </LearnerShell>
  );
}
