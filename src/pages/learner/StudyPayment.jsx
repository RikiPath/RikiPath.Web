import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { describeApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  EmptyState,
  PageContainer,
  SakuraLoader,
  notify,
  useSubmitGuard,
} from '@/components/ui';
import { getStudyPlans, purchaseStudyPlan } from '@/features/checkout/api/subscriptionApi.js';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const PENDING_PURCHASE_STORAGE_KEY = 'rikipath.pendingStudyPurchaseId';

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
      const createdId = result.purchaseId ?? result.id ?? result.studyPurchaseId;
      if (createdId) {
        try {
          window.sessionStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, String(createdId));
        } catch {
          // Ignore storage errors in restricted browsers.
        }
      }
      notify.info(
        tr('Đang chuyển sang PayOS'),
        tr('Quyền sử dụng gói chỉ được kích hoạt sau khi máy chủ xác nhận thanh toán.'),
        { key: 'study-payment-create', replace: true },
      );
      window.location.assign(result.checkoutUrl);
    },
    onError: (err) => {
      const msg = describeApiError(err, tr('Không tạo được đơn mua gói.'));
      setError(msg);
      notify.apiError(err, tr('Không tạo được đơn mua gói'), { key: 'study-payment-create', replace: true });
    },
  });

  const submitPurchase = useSubmitGuard(async () => {
    if (!plan || purchase.isPending) return;
    setError('');
    await purchase.mutateAsync();
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Thanh toán')}>
      <PageContainer data-page="StudyPayment" width="reading">
        <Link to="/plans/" className="rp-link text-sm font-semibold">
          {tr('← Quay lại các gói')}
        </Link>

        <h1 className="mt-4 text-[22px] font-bold text-rp-text">{tr('Thanh toán gói học')}</h1>
        <p className="mt-1.5 text-sm leading-6 text-rp-text-muted">
          {tr('Kiểm tra gói đã chọn, rồi chuyển sang PayOS để thanh toán.')}
        </p>

        {planId <= 0 && (
          <Card className="mt-5">
            <EmptyState
              compact
              title={tr('Chưa chọn gói để thanh toán')}
              description={tr('Hãy chọn gói tự học hoặc lượt chấm AI phù hợp từ danh sách gói.')}
              action={
                <Link to="/plans/" className="rp-link text-sm font-semibold">
                  {tr('Xem các gói')}
                </Link>
              }
            />
          </Card>
        )}

        {planId > 0 && plansQuery.isPending && !plan && (
          <SakuraLoader variant="section" context="payment" label={tr('Đang tải thông tin gói')} delay={160} />
        )}

        {planId > 0 && plansQuery.isError && !plan && (
          <Card className="mt-5">
            <ContextualErrorState
              compact
              error={plansQuery.error}
              title={tr('Chưa tải được thông tin gói học')}
              onRetry={() => plansQuery.refetch()}
              retrying={plansQuery.isFetching}
            />
          </Card>
        )}

        {planId > 0 && !plansQuery.isPending && !plansQuery.isError && !plan && (
          <Card className="mt-5">
            <EmptyState
              compact
              title={tr('Gói này không còn mở')}
              action={
                <Link to="/plans/" className="rp-link text-sm font-semibold">
                  {tr('Chọn gói khác')}
                </Link>
              }
            />
          </Card>
        )}

        {plan && (
          <Card className="mt-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rp-brand-strong">
                  {tr('ĐƠN HÀNG')}
                </p>
                <h2 className="mt-1 text-lg font-bold text-rp-text">{plan.name}</h2>
              </div>
              {plan.isPopular && (
                <Badge tone="brand" size="sm" icon={false}>
                  {tr('Phổ biến')}
                </Badge>
              )}
            </div>

            <div>
              <p className="text-[26px] font-bold tabular-nums text-rp-brand-strong">{money(plan.price)}</p>
              <p className="mt-1 text-xs text-rp-text-muted">
                {plan.durationDays > 0
                  ? trf('{0} ngày', { 0: plan.durationDays })
                  : trf('{0} lượt dùng', { 0: plan.aiUses || 1 })}
                {plan.durationDays > 0 && plan.aiUses > 0 ? trf(' · {0} lượt AI', { 0: plan.aiUses }) : ''}
              </p>
            </div>

            {plan.description && (
              <p className="text-sm leading-6 text-rp-text-2">{tr(plan.description)}</p>
            )}

            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <ul className="space-y-1 text-xs text-rp-text-muted">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            )}

            {error && <Banner tone="danger">{error}</Banner>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
              <p className="text-xs text-rp-text-muted">
                {tr('Bạn sẽ được chuyển tới cổng thanh toán PayOS an toàn.')}
              </p>
              <Button
                type="button"
                variant="primary"
                disabled={purchase.isPending || submitPurchase.busy}
                loading={purchase.isPending || submitPurchase.busy}
                onClick={submitPurchase.run}
              >
                {purchase.isPending || submitPurchase.busy ? tr('Đang tạo đơn…') : tr('Thanh toán')}
              </Button>
            </div>
          </Card>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
