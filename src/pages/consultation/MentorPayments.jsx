import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getMentorPurchases } from '../../api/mentorBookingApi.js';
import { bookingDate, bookingTime } from '../../utils/mentorBooking.js';
const labels = { Paid: 'Đã thanh toán', Pending: 'Chờ thanh toán', Failed: 'Thanh toán thất bại', Cancelled: 'Đã hủy' };
const remainingCredits = order => order.paymentStatus === 'Paid' && (!order.endDate || bookingDate(order.endDate) > new Date()) ? Math.max(0, order.meetingSessionsIncluded - order.meetingSessionsUsed) : 0;
export default function MentorPayments() {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['mentor-purchases'], queryFn: getMentorPurchases, refetchInterval: 15000 });
  const orders = query.data || []; const balance = orders.reduce((total, p) => total + remainingCredits(p), 0);
  return <LearnerShell pathname={pathname} breadcrumb="Thanh toán"><main className="mx-auto max-w-5xl space-y-5 p-6 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Thanh toán & lượt tư vấn</h1><Link to="/payments/" className="rounded-xl bg-[#AD3155] px-5 py-3 text-sm text-white">Mua gói 1 hoặc 3 buổi</Link></header>
    {!query.isPending && !query.isError && <section className="rounded-2xl border border-[#EADFE5] bg-[#FCEDF4] p-5"><p className="text-lg font-semibold">Số lượt còn hạn: {balance}</p><p className="mt-2 text-sm">Dùng với mentor bất kỳ. Mỗi tiết 50 phút trừ 1 lượt. Ưu tiên dùng gói hết hạn sớm nhất phù hợp với ngày học.</p><Link to="/booking-schedule/" className="mt-3 inline-block font-semibold text-[#AD3155]">Chọn lịch mentor →</Link></section>}
    {query.error && <p role="alert" className="text-rose-700">{query.error.message}</p>}{query.isPending && <p role="status">Đang tải số lượt…</p>}
    {!query.isPending && !query.isError && !orders.length && <p>Chưa có đơn mua lượt tư vấn.</p>}
    {orders.map(order => <article key={order.subscriptionId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EADFE5] bg-white p-5"><div><h2 className="font-semibold">Đơn #{order.subscriptionId} · {order.planName}</h2><p className="mt-2 text-sm text-[#927B88]">{order.isCheckoutExpired ? 'Đơn thanh toán đã hết hạn' : labels[order.paymentStatus] || order.paymentStatus} · Còn {remainingCredits(order)}/{order.meetingSessionsIncluded} lượt</p>{order.endDate && <p className="mt-1 text-xs text-[#927B88]">Hết hạn: {bookingTime(order.endDate)}</p>}</div><Link to={`/consultation-receipt/?subscriptionId=${order.subscriptionId}`} className="rounded-lg border border-[#E7DAE1] px-4 py-2 text-sm text-[#AD3155]">Xem đơn / thanh toán</Link></article>)}
  </main></LearnerShell>;
}
