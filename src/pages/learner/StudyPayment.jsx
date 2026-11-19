import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { LearnerShell } from '@/layouts';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { getStudyPlans, purchaseStudyPlan } from '@/features/checkout/api/subscriptionApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState, SakuraLoader, notify } from '@/components/ui';

function money(value) {
  return new Intl.NumberFormat(currentIntlTag(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function StudyPayment() {
  const { pathname, state } = useLocation();
  const { trf, tr } = useLocale();
  const [params] = useSearchParams();
  const planId = Number(params.get('planId'));
  const [error, setError] = useState('');

  const plansQuery = useQuery({
    queryKey: ['study-plans'],
    queryFn: getStudyPlans,
  });

  const carried = state?.plan?.id === planId ? state.plan : null;
  const plan = (plansQuery.data ?? []).find((item) => item.id === planId) ?? carried;

  const purchase = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang tạo liên kết thanh toán PayOS…'), '', { key: 'study-payment-create' });
      return purchaseStudyPlan(plan.id);
    },
    onSuccess: (result) => {
      if (!result?.checkoutUrl) {
        const msg = tr('Chưa nhận được liên kết thanh toán.');
        setError(msg);
        notify.error(msg, '', { key: 'study-payment-create', replace: true });
        return;
      }
      notify.info(
        tr('Đang chuyển sang PayOS'),
        tr('Quyền sử dụng gói chỉ được kích hoạt sau khi máy chủ xác nhận thanh toán.'),
        { key: 'study-payment-create', replace: true },
      );
      window.location.assign(result.checkoutUrl);
    },
    onError: (err) => {
      const msg = describeApiError(err).message || tr('Không tạo được đơn mua gói.');
      setError(msg);
      notify.apiError(err, tr('Không tạo được đơn mua gói'), { key: 'study-payment-create', replace: true });
    },
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Thanh toán')}>
      <main
        data-page="StudyPayment"
        className="rp-container-reading py-6 text-rp-text lg:py-8"
      >
        <Link
          to="/plans"
          className="text-[13px] font-medium text-rp-brand-strong hover:text-rp-brand-deep"
        >
          {tr('← Quay lại các gói')}
        </Link>

        <h1 className="mt-4 text-[22px] font-semibold">{tr('Thanh toán gói học')}</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-rp-text-muted">
          {tr('Kiểm tra gói đã chọn, rồi chuyển sang PayOS để thanh toán.')}
        </p>

        {planId <= 0 && (
          <p className="mt-5 text-[13px] text-rp-text-muted">{tr('Chưa chọn gói để thanh toán.')}</p>
        )}

        {planId > 0 && plansQuery.isPending && !plan && (
          <SakuraLoader variant="section" context="payment" label={tr('Đang tải thông tin gói')} delay={160} />
        )}

        {planId > 0 && plansQuery.isError && !plan && (
          <ContextualErrorState
            className="mt-5 rounded-2xl border border-rp-line bg-white p-5"
            compact
            error={plansQuery.error}
            title={tr('Chưa tải được thông tin gói học')}
            onRetry={() => plansQuery.refetch()}
            retrying={plansQuery.isFetching}
          />
        )}

        {planId > 0 && !plansQuery.isPending && !plansQuery.isError && !plan && (
          <p className="mt-5 text-[13px] text-rp-text-muted">{tr('Gói này không còn mở.')}</p>
        )}

        {plan && (
          <section className="mt-5 rounded-2xl border border-rp-line bg-white p-5 sm:p-6">
            <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">
              {tr('ĐƠN HÀNG')}
            </p>
            <h2 className="mt-2 text-[18px] font-semibold">{plan.name}</h2>
            <p className="mt-2 text-[26px] font-semibold text-rp-brand-strong">{money(plan.price)}</p>
            <p className="mt-1 text-[12px] text-rp-text-muted">{plan.durationDays > 0 ? trf('{0} ngày', { 0: plan.durationDays }) : tr('1 lượt dùng')}</p>
            {plan.description && (
              <p className="mt-3 text-[13px] leading-6 text-rp-text-2">{tr(plan.description)}</p>
            )}
            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <ul className="mt-3 space-y-1 text-[12px] text-rp-text-muted">
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
              className="mt-5 inline-flex h-10 items-center rounded-full bg-rp-brand-strong px-5 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 rp-press"
            >
              {purchase.isPending ? tr('Đang tạo đơn…') : tr('Thanh toán')}
            </button>

            {error && (
              <p className="mt-3 text-[13px] text-rp-brand-strong" role="alert">
                {error}
              </p>
            )}
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
