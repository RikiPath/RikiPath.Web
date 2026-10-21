import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getLearnerBookings } from '../../api/mentorBookingApi.js';
import { bookingTime, bookingStatus } from '../../utils/mentorBooking.js';

export default function ConsultationCenter() {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['learner-mentor-bookings'], queryFn: getLearnerBookings, refetchInterval: 15000 });
  return <LearnerShell pathname={pathname} breadcrumb="Lịch tư vấn"><div className="mx-auto max-w-5xl p-6 sm:p-8"><header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold">Lịch tư vấn của tôi</h1><Link to="/booking-schedule/" className="rounded-full bg-[#9E2A4B] px-5 py-3 text-sm font-bold text-white">Đặt lịch</Link></header>{query.error && <p role="alert" className="mt-5 text-rose-700">{query.error.message}</p>}{query.isPending && <p className="mt-5">Đang tải lịch…</p>}<div className="mt-6 space-y-4">{query.data?.map(b => <section key={b.id} className="rounded-2xl border border-[#eadfd9] bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{b.mentorName || 'Chưa phân công mentor'}</h2><span className="text-sm text-[#9E2A4B]">{bookingStatus(b)}</span></div><p className="mt-2 text-sm text-[#6F6669]">Booking #{b.id} · {bookingTime(b.scheduledAt)} (GMT+7)</p><p className="mt-2 text-sm">Thanh toán: {b.paymentStatus === 'Paid' ? 'Đã thanh toán' : b.paymentStatus}</p><Link to={`/consultation-session/?bookingId=${b.id}`} className="mt-4 inline-block text-sm font-semibold text-[#9E2A4B]">Xem chi tiết →</Link>{b.paymentStatus !== 'Paid' && <Link to={`/consultation-receipt/?subscriptionId=${b.userSubscriptionId}`} className="ml-4 text-sm underline">Kiểm tra thanh toán</Link>}</section>)}{!query.isPending && !query.isError && !query.data?.length && <p className="rounded-2xl bg-white p-6 text-sm">Bạn chưa có booking nào.</p>}</div></div></LearnerShell>;
}
