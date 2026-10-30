import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getLearnerBookings } from '../../api/mentorBookingApi.js';
import { bookingTime, bookingStatus, bookingExpired } from '../../utils/mentorBooking.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function ConsultationSessionDetail() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId'));
  const query = useQuery({ queryKey: ['learner-mentor-bookings'], queryFn: getLearnerBookings, refetchInterval: 15000 });
  const booking = query.data?.find((item) => item.id === id);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Chi tiết buổi tư vấn">
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <Link to="/consultation-center/" className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>
          {tr('Về lịch của tôi')}
        </Link>
        <header className="mb-5 mt-4">
          <h1 className="text-[25px] font-semibold tracking-tight">{tr('Chi tiết')} {id ? `#${id}` : ''}</h1>
        </header>
        {query.error && <p role="alert" className="rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {query.isPending ? <p role="status" className="text-[13px] text-[#9A8390]">{tr('Đang tải…')}</p> : booking ? (
          <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-[18px] font-semibold">{booking.mentorName || tr('Chưa phân công mentor')}</h2>
              <span className="rounded-full bg-[#FCEEF3] px-3 py-1 text-[12px] font-medium text-[#AD3155]">{bookingStatus(booking)}</span>
            </div>
            <dl className="mt-5 grid gap-4 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[#8C7782]">{tr('Bắt đầu')}</dt><dd className="mt-1 font-medium">{bookingTime(booking.scheduledAt)} · {tr('giờ Việt Nam')}</dd></div>
              <div><dt className="text-[#8C7782]">{tr('Kết thúc')}</dt><dd className="mt-1 font-medium">{bookingTime(booking.endsAt)} · {tr('giờ Việt Nam')}</dd></div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#705261]">{booking.question || tr('Chưa gửi câu hỏi.')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {booking.paymentStatus === 'Paid' && (
                <Link to={`/mentor-chat/?bookingId=${booking.id}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>{tr('Tin nhắn với mentor')}</Link>
              )}
              {booking.paymentStatus === 'Paid' && booking.roomId && !bookingExpired(booking) && ['Assigned', 'Accepted'].includes(booking.status) && (
                <Link to={`/consultation-room/${booking.roomId}/`} className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>{tr('Vào phòng họp')}</Link>
              )}
              <Link to={`/consultation-receipt/?subscriptionId=${booking.userSubscriptionId}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>{tr('Trạng thái thanh toán')}</Link>
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
            <p className="text-[15px] font-medium text-[#806371]">{tr('Không tìm thấy buổi này trong tài khoản của bạn.')}</p>
          </div>
        )}
      </main>
    </LearnerShell>
  );
}
