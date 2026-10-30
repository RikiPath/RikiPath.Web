import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getMeetingPlans, purchaseMeeting } from '../../api/mentorBookingApi.js';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function ConsultationPayment() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const requestedPlanId = Number(params.get('planId'));
  const [planId, setPlanId] = useState(Number.isInteger(requestedPlanId) && requestedPlanId > 0 ? requestedPlanId : null);
  const query = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const plans = query.data || [];
  const plan = plans.find((item) => item.id === planId) || plans[0];
  const purchase = useMutation({
    mutationFn: () => purchaseMeeting({
      subscriptionPlanId: plan.id,
      frontendOrigin: window.location.origin,
    }),
    onSuccess: (result) => {
      sessionStorage.setItem(`mentor-checkout:${user.userId}:${result.subscriptionId}`, result.checkoutUrl);
      navigate(`/consultation-receipt/?subscriptionId=${result.subscriptionId}`);
    },
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Thanh toán")}>
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">{tr('Mua lượt tư vấn mentor')}</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">{tr('Thanh toán gói không giữ khung giờ. Sau khi PayOS xác nhận, dùng lượt để đặt lịch.')}</p>
          </div>
          <Link to="/payments/history/" className={`text-[13px] text-[#AD3155] hover:underline ${focus}`}>{tr('Xem số lượt và lịch sử')}</Link>
        </header>

        {(query.error || purchase.error) && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {(query.error || purchase.error).message}
          </p>
        )}

        {query.isPending && <p role="status" className="text-[13px] text-[#9A8390]">{tr("Đang tải gói…")}</p>}
        {!query.isPending && !plans.length && (
          <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
            <p className="text-[15px] font-medium text-[#806371]">{tr("Chưa có gói tư vấn đang mở")}</p>
            <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">{tr("Bạn có thể quay lại kiểm tra sau.")}</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((item) => {
            const selected = plan?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={purchase.isPending}
                aria-pressed={selected}
                onClick={() => setPlanId(item.id)}
                className={`rounded-2xl border bg-white p-5 text-left ${selected ? 'border-[#AD3155] bg-[#FCEEF3]' : 'border-[#EADFE5] hover:bg-[#FDFAFC]'} ${focus}`}
              >
                <h2 className="text-[16px] font-semibold">{item.name}</h2>
                <p className="mt-3 text-[18px] font-semibold text-[#AD3155]">{money(item.price)}</p>
                <p className="mt-2 text-[13px] text-[#8C7782]">{locale === 'ja'
                  ? `${item.meetingSessionCount}回 · 支払いから${item.durationDays}日間`
                  : `${item.meetingSessionCount} lượt · Có hạn ${item.durationDays} ngày kể từ khi thanh toán`}</p>
                {item.description && <p className="mt-2 text-[13px] leading-6 text-[#927B88]">{item.description}</p>}
              </button>
            );
          })}
        </div>

        {plan && (
          <button
            type="button"
            disabled={purchase.isPending}
            onClick={() => purchase.mutate()}
            className={`mt-5 inline-flex h-10 items-center rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
          >
            {purchase.isPending ? tr('Đang tạo đơn…') : (locale === 'ja' ? `PayOSで支払う · ${money(plan.price)}` : `Thanh toán PayOS · ${money(plan.price)}`)}
          </button>
        )}
      </main>
    </LearnerShell>
  );
}
