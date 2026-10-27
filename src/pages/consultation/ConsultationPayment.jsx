import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { getMeetingPlans, getMentorSlots, purchaseMeeting } from '../../api/mentorBookingApi.js';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const clock = (value) => new Date(value).toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ConsultationPayment() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [planId, setPlanId] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const query = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const slotsQuery = useQuery({
    queryKey: ['payment-slots'],
    queryFn: () => {
      const from = new Date();
      const to = new Date(from.getTime() + 14 * 86400000);
      return getMentorSlots(null, from.toISOString(), to.toISOString());
    },
  });
  const plans = query.data || [];
  const plan = plans.find((item) => item.id === (planId ?? plans[0]?.id));
  const openSlots = (slotsQuery.data || []).filter((slot) => !slot.isBooked && new Date(slot.startTime) > new Date());
  const slot = openSlots.find((item) => item.id === slotId);
  const purchase = useMutation({
    mutationFn: () => purchaseMeeting({ subscriptionPlanId: plan.id, mentorAvailabilityId: slot.id }),
    onSuccess: (result) => {
      sessionStorage.setItem(`mentor-checkout:${user.userId}:${result.subscriptionId}`, result.checkoutUrl);
      navigate(`/consultation-receipt/?subscriptionId=${result.subscriptionId}`);
    },
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb="Thanh toán">
      <main className="mx-auto max-w-4xl space-y-5 p-6 sm:p-8">
        <Link to="/payments/history/" className="text-sm text-[#AD3155]">Xem số lượt & lịch sử thanh toán →</Link>
        <h1 className="text-2xl font-semibold">Mua lượt tư vấn mentor</h1>
        <p className="text-sm leading-6 text-[#927B88]">
          Chọn gói và một khung giờ còn trống. Thanh toán sẽ giữ khung này; buổi đầu nằm trong gói.
        </p>
        {(query.error || slotsQuery.error || purchase.error) && (
          <p role="alert" className="text-rose-700">{(query.error || slotsQuery.error || purchase.error).message}</p>
        )}
        {query.isPending && <p role="status">Đang tải gói…</p>}
        {!query.isPending && !plans.length && <p>Chưa có gói tư vấn đang mở.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={purchase.isPending}
              aria-pressed={plan?.id === item.id}
              onClick={() => setPlanId(item.id)}
              className={`rounded-2xl border bg-white p-5 text-left ${plan?.id === item.id ? 'border-[#AD3155] ring-1 ring-[#AD3155]' : 'border-[#EADFE5]'}`}
            >
              <h2 className="font-semibold">{item.name}</h2>
              <p className="mt-3 text-lg font-semibold text-[#AD3155]">{money(item.price)}</p>
              <p className="mt-2 text-sm">{item.meetingSessionCount} lượt · Có hạn {item.durationDays} ngày kể từ khi thanh toán</p>
              {item.description && <p className="mt-2 text-sm text-[#927B88]">{item.description}</p>}
            </button>
          ))}
        </div>
        <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
          <h2 className="text-sm font-semibold">Khung giờ còn trống · 14 ngày tới</h2>
          {slotsQuery.isPending && <p className="mt-3 text-sm text-[#927B88]">Đang tải khung giờ…</p>}
          {!slotsQuery.isPending && !slotsQuery.isError && !openSlots.length && (
            <p className="mt-3 text-sm text-[#927B88]">Chưa có khung giờ trống để giữ chỗ.</p>
          )}
          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto">
            {openSlots.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === slotId}
                onClick={() => setSlotId(item.id)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${item.id === slotId ? 'bg-[#2D282A] text-white' : 'bg-[#FAF7F5]'}`}
              >
                <span>{item.mentorName || `Mentor #${item.mentorId}`}</span>
                <span className="tabular-nums">{clock(item.startTime)} – {clock(item.endTime)}</span>
              </button>
            ))}
          </div>
        </section>
        <button
          type="button"
          disabled={!plan || !slot || purchase.isPending}
          onClick={() => purchase.mutate()}
          className="rounded-xl bg-[#AD3155] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {purchase.isPending ? 'Đang tạo đơn…' : `Thanh toán PayOS · ${money(plan?.price)}`}
        </button>
      </main>
    </LearnerShell>
  );
}
