import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { getMeetingPlans, getMentorSlots, purchaseMeeting } from '../../api/mentorBookingApi.js';
import { bookingTime } from '../../utils/mentorBooking.js';

const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
export default function ConsultationPayment() {
  const { pathname, state } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mentorId = Number(params.get('mentorId'));
  const slotId = Number(params.get('slotId'));
  const [range] = useState(() => new Date());
  const [planId, setPlanId] = useState(null);
  const [question, setQuestion] = useState(() => [state?.goal, state?.note].filter(Boolean).join('\n'));
  const plansQuery = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const slotsQuery = useQuery({ queryKey: ['checkout-slot', mentorId, slotId, range.toISOString()],
    queryFn: () => getMentorSlots(mentorId, range.toISOString(), new Date(range.getTime() + 89 * 86400000).toISOString()),
    enabled: mentorId > 0 && slotId > 0,
  });
  const plans = plansQuery.data || [];
  const plan = plans.find(p => p.id === (planId ?? plans[0]?.id));
  const slot = (slotsQuery.data || []).find(s => s.id === slotId && s.mentorId === mentorId);
  const purchase = useMutation({ mutationFn: () => purchaseMeeting({ subscriptionPlanId: plan.id, mentorAvailabilityId: slot.id, question: question.trim() }),
    onSuccess: result => {
      // Persist only this account's checkout link; receipt status always comes from the server.
      sessionStorage.setItem(`mentor-checkout:${user.userId}:${result.subscriptionId}`, result.checkoutUrl);
      navigate(`/consultation-receipt/?subscriptionId=${result.subscriptionId}`);
    },
  });
  const error = plansQuery.error || slotsQuery.error || purchase.error;
  return <LearnerShell pathname={pathname} breadcrumb="Thanh toán">
    <div className="mx-auto max-w-5xl p-6 sm:p-8" data-page="ConsultationPayment">
      <Link to="/booking-schedule/" className="text-sm font-semibold text-[#9E2A4B]">← Chọn lại lịch</Link>
      <h1 className="mt-5 text-2xl font-bold">Xác nhận lịch & chọn gói</h1>
      <p className="mt-2 text-sm text-[#6F6669]">Tạo đơn và thanh toán qua PayOS để gửi booking tới Mentor.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error.message}</p>}
      {(!mentorId || !slotId) && <p className="mt-5 text-sm">Chưa chọn lịch. Vui lòng quay lại bước đặt lịch.</p>}
      {mentorId > 0 && slotId > 0 && <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5"><h2 className="font-bold">Gói tư vấn</h2>{plansQuery.isPending && <p role="status" className="mt-3 text-sm">Đang tải gói…</p>}{!plansQuery.isPending && !plans.length && <p className="mt-3 text-sm">Chưa có gói tư vấn đang mở.</p>}<div className="mt-4 space-y-3">{plans.map(p => <button key={p.id} disabled={purchase.isPending} aria-pressed={plan?.id === p.id} onClick={() => setPlanId(p.id)} className={`block w-full rounded-2xl border p-4 text-left ${plan?.id === p.id ? 'border-[#D94B68] bg-[#fff0f5]' : 'border-[#eadfd9]'}`}><span className="flex justify-between gap-3"><strong>{p.name}</strong><strong className="text-[#9E2A4B]">{money(p.price)}</strong></span><span className="mt-2 block text-sm text-[#6F6669]">{p.meetingSessionCount} buổi · {p.durationDays} ngày</span>{p.description && <span className="mt-2 block text-sm text-[#6F6669]">{p.description}</span>}</button>)}</div><label className="mt-5 block text-sm font-semibold">Câu hỏi / tài liệu cho Mentor<textarea rows={4} maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} disabled={purchase.isPending} className="mt-2 w-full rounded-xl border border-[#eadfd9] p-3 font-normal" /></label></section>
        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5"><h2 className="font-bold">Thông tin đơn</h2>{slotsQuery.isPending ? <p className="mt-4 text-sm">Đang kiểm tra lịch…</p> : !slot ? <p role="alert" className="mt-4 text-sm text-rose-700">Lịch không còn khả dụng. Vui lòng chọn lại lịch.</p> : <><p className="mt-4 font-semibold">{slot.mentorName}</p><p className="mt-2 text-sm text-[#6F6669]">{bookingTime(slot.startTime)} – {bookingTime(slot.endTime)} (GMT+7)</p></>}<p className="mt-5 text-sm">Gói: {plan?.name || 'Chưa chọn'}</p><p className="mt-3 text-xl font-bold text-[#9E2A4B]">{money(plan?.price)}</p><button disabled={!slot || !plan || purchase.isPending || slotsQuery.isFetching} onClick={() => purchase.mutate()} className="mt-5 w-full rounded-full bg-[#9E2A4B] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{purchase.isPending ? 'Đang tạo đơn…' : 'Tạo đơn thanh toán PayOS'}</button><p className="mt-3 text-xs leading-5 text-[#6F6669]">Booking được gửi vào hàng đợi Mentor sau khi hệ thống xác nhận đã thanh toán.</p></section>
      </div>}
    </div>
  </LearnerShell>;
}
