import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getStudyPlans, purchaseStudyPlan } from '../../api/subscriptions.js';

function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function StudyPayment() {
  const { pathname, state } = useLocation();
  const { tr } = useLocale();
  const [params] = useSearchParams();
  const planId = Number(params.get('planId'));
  const [error, setError] = useState('');

  const plansQuery = useQuery({
    queryKey: ['study-plans'],
    queryFn: getStudyPlans,
    retry: false,
  });

  const carried = state?.plan?.id === planId ? state.plan : null;
  const plan = (plansQuery.data ?? []).find((item) => item.id === planId) ?? carried;

  const purchase = useMutation({
    mutationFn: () => purchaseStudyPlan(plan.id),
    onSuccess: (result) => {
      if (!result?.checkoutUrl) {
        setError(tr('Chưa nhận được liên kết thanh toán.'));
        return;
      }
      window.location.assign(result.checkoutUrl);
    },
    onError: (err) => {
      setError(err.message || tr('Không tạo được đơn mua gói.'));
    },
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb="Thanh toán">
      <main
        data-page="StudyPayment"
        className="mx-auto max-w-[720px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7"
      >
        <Link
          to="/plans"
          className="text-[13px] font-medium text-[#AD3155] hover:text-[#982B4B]"
        >
          {tr('← Quay lại các gói')}
        </Link>

        <h1 className="mt-4 text-[22px] font-semibold">{tr('Thanh toán gói học')}</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-[#8C7782]">
          {tr('Kiểm tra gói đã chọn, rồi chuyển sang PayOS để thanh toán.')}
        </p>

        {planId <= 0 && (
          <p className="mt-5 text-[13px] text-[#8C7782]">{tr('Chưa chọn gói để thanh toán.')}</p>
        )}

        {planId > 0 && plansQuery.isPending && !plan && (
          <p className="mt-5 text-[13px] text-[#8C7782]">{tr('Đang tải gói…')}</p>
        )}

        {planId > 0 && plansQuery.isError && !plan && (
          <p className="mt-5 text-[13px] text-[#9E2A4B]" role="alert">
            {plansQuery.error.message}
          </p>
        )}

        {planId > 0 && !plansQuery.isPending && !plan && (
          <p className="mt-5 text-[13px] text-[#8C7782]">{tr('Gói này không còn mở.')}</p>
        )}

        {plan && (
          <section className="mt-5 rounded-2xl border border-[#EADFE5] bg-white p-5 sm:p-6">
            <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">
              {tr('ĐƠN HÀNG')}
            </p>
            <h2 className="mt-2 text-[18px] font-semibold">{plan.name}</h2>
            <p className="mt-2 text-[26px] font-semibold text-[#AD3155]">{money(plan.price)}</p>
            <p className="mt-1 text-[12px] text-[#8C7782]">{plan.durationDays} {tr('ngày')}</p>
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

            <button
              type="button"
              disabled={purchase.isPending}
              onClick={() => {
                setError('');
                purchase.mutate();
              }}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-[#AD3155] px-5 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50"
            >
              {purchase.isPending ? tr('Đang tạo đơn…') : tr('Thanh toán')}
            </button>

            {error && (
              <p className="mt-3 text-[13px] text-[#9E2A4B]" role="alert">
                {error}
              </p>
            )}
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
