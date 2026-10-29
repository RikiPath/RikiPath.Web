import { Link } from 'react-router-dom';
import { bookingDate, bookingTime } from '../../utils/mentorBooking.js';

export default function IncludedMentorBooking({ purchase }) {
  const remaining = purchase.endDate && bookingDate(purchase.endDate) <= new Date()
    ? 0
    : Math.max(0, purchase.meetingSessionsIncluded - purchase.meetingSessionsUsed);

  return (
    <section className="mt-5 rounded-2xl border border-[#EADFE5] bg-[#FCFAFB] px-4 py-4 text-[13px]">
      <h2 className="font-semibold text-[#49353F]">Lượt tư vấn trong tài khoản</h2>
      <p className="mt-2 text-[#705261]">Còn {remaining}/{purchase.meetingSessionsIncluded} lượt trong gói này.</p>
      {purchase.endDate && <p className="mt-2 text-[#8C7782]">Hết hạn: {bookingTime(purchase.endDate)}</p>}
      {remaining > 0 && (
        <Link to="/booking-schedule/" className="mt-3 inline-block font-medium text-[#AD3155] hover:underline">
          Dùng lượt đặt lịch với mentor
        </Link>
      )}
    </section>
  );
}
