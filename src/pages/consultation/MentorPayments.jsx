import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getMentorPurchases } from '../../api/mentorBookingApi.js';
import { bookingDate, bookingTime } from '../../utils/mentorBooking.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const labels = { Paid: 'Đã thanh toán', Pending: 'Chờ thanh toán', Failed: 'Thanh toán thất bại', Cancelled: 'Đã hủy' };

const remainingCredits = (order) => (
  order.paymentStatus === 'Paid' && (!order.endDate || bookingDate(order.endDate) > new Date())
    ? Math.max(0, order.meetingSessionsIncluded - order.meetingSessionsUsed)
    : 0
);

export default function MentorPayments() {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['mentor-purchases'], queryFn: getMentorPurchases, refetchInterval: 15000 });
  const orders = useMemo(() => [...(query.data || [])].sort((a, b) => (b.subscriptionId || 0) - (a.subscriptionId || 0)), [query.data]);
  const balance = orders.reduce((total, order) => total + remainingCredits(order), 0);

  return (
    <LearnerShell pathname={pathname} breadcrumb="Thanh toán">
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Thanh toán và lượt tư vấn</h1>
            <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">Các đơn mua gói mentor của bạn.</p>
          </div>
          <Link to="/payments/" className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
            Mua gói 1 hoặc 3 buổi
          </Link>
        </header>

        {!query.isPending && !query.isError && (
          <section className="mb-4 rounded-2xl border border-[#ECD9E2] bg-[#FCEDF4] px-5 py-5">
            <p className="text-[16px] font-semibold text-[#75465B]">Số lượt còn hạn: {balance}</p>
            <p className="mt-1 text-[13px] leading-6 text-[#9A7587]">
              Dùng với mentor bất kỳ. Mỗi tiết 50 phút trừ 1 lượt. Ưu tiên dùng gói hết hạn sớm nhất phù hợp với ngày học.
            </p>
            <Link to="/booking-schedule/" className={`mt-3 inline-block text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>
              Chọn lịch mentor
            </Link>
          </section>
        )}

        {query.error && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {query.isPending && <p role="status" className="text-[13px] text-[#9A8390]">Đang tải số lượt…</p>}
        {!query.isPending && !query.isError && !orders.length && (
          <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
            <p className="text-[15px] font-medium text-[#806371]">Chưa có đơn mua lượt tư vấn</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.subscriptionId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold">Đơn #{order.subscriptionId} · {order.planName}</h2>
                <p className="mt-1 text-[13px] text-[#927B88]">
                  {order.isCheckoutExpired ? 'Đơn thanh toán đã hết hạn' : labels[order.paymentStatus] || order.paymentStatus}
                  {' · '}Còn {remainingCredits(order)}/{order.meetingSessionsIncluded} lượt
                </p>
                {order.endDate && <p className="mt-1 text-[12px] text-[#8C7782]">Hết hạn: {bookingTime(order.endDate)}</p>}
              </div>
              <Link to={`/consultation-receipt/?subscriptionId=${order.subscriptionId}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>
                Xem đơn / thanh toán
              </Link>
            </article>
          ))}
        </div>
      </main>
    </LearnerShell>
  );
}
