import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { getMeetingPlans, purchaseMeeting } from '../../api/mentorBookingApi.js';
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
export default function ConsultationPayment() {
  const { pathname } = useLocation(); const navigate = useNavigate(); const { user } = useAuth();
  const [planId, setPlanId] = useState(null);
  const query = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const plans = query.data || []; const plan = plans.find(p => p.id === (planId ?? plans[0]?.id));
  const purchase = useMutation({ mutationFn: () => purchaseMeeting({ subscriptionPlanId: plan.id }), onSuccess: result => {
    sessionStorage.setItem(`mentor-checkout:${user.userId}:${result.subscriptionId}`, result.checkoutUrl);
    navigate(`/consultation-receipt/?subscriptionId=${result.subscriptionId}`);
  } });
  return <LearnerShell pathname={pathname} breadcrumb="Thanh toán"><main className="mx-auto max-w-4xl space-y-5 p-6 sm:p-8">
    <Link to="/payments/history/" className="text-sm text-[#AD3155]">Xem số lượt & lịch sử thanh toán →</Link><h1 className="text-2xl font-semibold">Mua lượt tư vấn mentor</h1>
    <p className="text-sm leading-6 text-[#927B88]">Mua gói 1 hoặc 3 buổi. Sau khi PayOS xác nhận thanh toán, lượt được cộng vào tài khoản để đặt lịch với mentor bất kỳ. Mỗi tiết sử dụng 1 lượt.</p>
    {(query.error || purchase.error) && <p role="alert" className="text-rose-700">{(query.error || purchase.error).message}</p>}
    {query.isPending && <p role="status">Đang tải gói…</p>}{!query.isPending && !plans.length && <p>Chưa có gói tư vấn đang mở.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{plans.map(p => <button key={p.id} disabled={purchase.isPending} aria-pressed={plan?.id === p.id} onClick={() => setPlanId(p.id)} className={`rounded-2xl border bg-white p-5 text-left ${plan?.id === p.id ? 'border-[#AD3155] ring-1 ring-[#AD3155]' : 'border-[#EADFE5]'}`}><h2 className="font-semibold">{p.name}</h2><p className="mt-3 text-lg font-semibold text-[#AD3155]">{money(p.price)}</p><p className="mt-2 text-sm">{p.meetingSessionCount} lượt · Có hạn {p.durationDays} ngày kể từ khi thanh toán</p>{p.description && <p className="mt-2 text-sm text-[#927B88]">{p.description}</p>}</button>)}</div>
    <button disabled={!plan || purchase.isPending} onClick={() => purchase.mutate()} className="rounded-xl bg-[#AD3155] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{purchase.isPending ? 'Đang tạo đơn…' : `Thanh toán PayOS · ${money(plan?.price)}`}</button>
    <p className="text-xs text-[#927B88]">Chưa chọn hoặc giữ tiết khi mua gói. Chỉ trừ lượt sau khi đặt lịch thành công.</p>
  </main></LearnerShell>;
}
