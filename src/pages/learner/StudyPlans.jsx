import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { getMySubscription, getStudyPlans } from '../../api/subscriptions.js';

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function StudyPlans() {
  const { pathname } = useLocation();

  const plansQuery = useQuery({
    queryKey: ['study-plans'],
    queryFn: getStudyPlans,
    retry: false,
  });

  const mineQuery = useQuery({
    queryKey: ['study-subscription'],
    queryFn: getMySubscription,
    retry: false,
  });

  const plans = plansQuery.data ?? [];
  const current = mineQuery.data;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Mua gói">
      <main
        data-page="StudyPlans"
        className="mx-auto max-w-[980px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7"
      >
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5 sm:px-6">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">
            GÓI TỰ HỌC
          </p>
          <h1 className="mt-2 text-[22px] font-semibold">Chọn gói để vào các trang ôn luyện</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#8C7782]">
            Tài khoản chưa có gói đang hiệu lực sẽ được đưa về trang này khi mở bài học, thi thử, sổ từ và các trang luyện tập.
          </p>
          {current?.active && (
            <p className="mt-4 rounded-xl bg-[#FCEEF4] px-4 py-3 text-[13px] text-[#9E2A4B]">
              Bạn đang dùng {current.planName || 'một gói'}.
              <Link to="/app" className="ml-2 font-medium underline">
                Vào trang ôn luyện
              </Link>
            </p>
          )}
        </section>

        {plansQuery.isPending && (
          <p className="mt-4 text-[13px] text-[#8C7782]">Đang tải các gói…</p>
        )}
        {plansQuery.isError && (
          <p className="mt-4 text-[13px] text-[#9E2A4B]" role="alert">
            {plansQuery.error.message}
          </p>
        )}
        {!plansQuery.isPending && !plansQuery.isError && plans.length === 0 && (
          <p className="mt-4 text-[13px] text-[#8C7782]">Chưa có gói tự học đang mở.</p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border bg-white p-5 ${
                plan.isPopular ? 'border-[#AD3155]' : 'border-[#EADFE5]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[16px] font-semibold">{plan.name}</h2>
                {plan.isPopular && (
                  <span className="rounded-full bg-[#FCEEF4] px-2 py-0.5 text-[11px] font-medium text-[#AD3155]">
                    Phổ biến
                  </span>
                )}
              </div>
              <p className="mt-2 text-[22px] font-semibold text-[#AD3155]">{money(plan.price)}</p>
              <p className="mt-1 text-[12px] text-[#8C7782]">{plan.durationDays} ngày</p>
              {plan.description && (
                <p className="mt-3 text-[13px] leading-6 text-[#6F5C66]">{plan.description}</p>
              )}
              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-3 space-y-1 text-[12px] text-[#8C7782]">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
              {current?.active ? (
                <button
                  type="button"
                  disabled
                  className="mt-4 h-10 rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white opacity-50"
                >
                  Mua gói
                </button>
              ) : (
                <Link
                  to={`/study-payment?planId=${plan.id}`}
                  state={{ plan }}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B]"
                >
                  Mua gói
                </Link>
              )}
            </article>
          ))}
        </div>

      </main>
    </LearnerShell>
  );
}
