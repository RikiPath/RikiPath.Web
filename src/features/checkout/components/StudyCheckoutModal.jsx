import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, TicketCheck } from 'lucide-react';

import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import { getSession } from '@/app/auth/session.js';
import { Banner, Button, Modal, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { getStudyPlans, purchaseStudyPlan } from '../api/subscriptionApi.js';
import {
  CHECKOUT_PLAN_PARAM,
  PLAN_GROUP_META,
  featureDisplayName,
  formatVnd,
  isTrustedCheckoutUrl,
  isUsageBased,
  planCommercialSnapshot,
  planKind,
  sameCommercialTerms,
  variantDurationLabel,
} from '../planGroups.js';

// Read by the payment receipt page as a fallback when the return URL carries no purchase id.
const PENDING_PURCHASE_STORAGE_KEY = 'rikipath.pendingStudyPurchaseId';

function featureLabel(feature) {
  return featureDisplayName(feature);
}

/**
 * Confirmation step before PayOS. Shows the selected plan as the catalog has it, re-reads the catalog
 * right before paying (stale/inactive/changed plans are caught and re-confirmed), then calls the
 * existing purchase API with the plan id only — the Backend prices the order and creates the PayOS link.
 * Rendered only while open (the parent mounts it per checkout), so state starts fresh each time.
 */
export default function StudyCheckoutModal({ open = true, plan, onClose }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState('idle'); // idle | verifying | creating | redirecting
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmed, setConfirmed] = useState(() => (plan ? planCommercialSnapshot(plan) : null));
  const busy = phase !== 'idle';

  if (!open || !plan) return null;

  const kind = planKind(plan);
  const meta = PLAN_GROUP_META[kind];
  const usageBased = isUsageBased(plan);
  const features = (Array.isArray(plan.features) ? plan.features : []).filter((f) => featureLabel(f));
  const activation = usageBased
    ? tr('Lượt AI được cộng vào tài khoản sau khi thanh toán thành công.')
    : tr('Gói học sẽ được kích hoạt sau khi thanh toán thành công. Nếu bạn đang có gói cùng loại còn hạn, thời hạn mới được cộng nối tiếp.');

  async function handlePay() {
    if (busy) return;
    setError('');
    setNotice('');
    if (!getSession()?.accessToken) {
      navigate('/auth/', {
        state: { from: { pathname: '/plans/', search: `?${CHECKOUT_PLAN_PARAM}=${plan.id}` } },
      });
      return;
    }

    setPhase('verifying');
    let fresh;
    try {
      const catalog = await queryClient.fetchQuery({ queryKey: ['study-plans'], queryFn: getStudyPlans, staleTime: 0 });
      fresh = catalog.find((item) => item.id === plan.id) ?? null;
    } catch (err) {
      setError(formatApiError(err, tr('Chưa kiểm tra được thông tin gói. Vui lòng thử lại.')));
      setPhase('idle');
      return;
    }
    if (!fresh) {
      setError(tr('Gói này hiện không còn mở bán. Vui lòng đóng cửa sổ và chọn gói khác.'));
      setPhase('idle');
      return;
    }
    const latest = planCommercialSnapshot(fresh);
    if (!sameCommercialTerms(latest, confirmed)) {
      // The modal re-renders with the fresh plan from the catalog cache; ask for a new confirmation.
      setConfirmed(latest);
      setNotice(tr('Thông tin gói vừa được cập nhật. Vui lòng kiểm tra lại giá và quyền lợi trước khi thanh toán.'));
      setPhase('idle');
      return;
    }

    setPhase('creating');
    try {
      const result = await purchaseStudyPlan(plan.id);
      if (!isTrustedCheckoutUrl(result?.checkoutUrl)) {
        setError(tr('Chưa nhận được liên kết thanh toán hợp lệ. Vui lòng thử lại.'));
        setPhase('idle');
        return;
      }
      const createdId = result.purchaseId ?? result.id;
      if (createdId) {
        try {
          window.sessionStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, String(createdId));
        } catch {
          // Storage can be unavailable (private mode); the return URL still carries the purchase id.
        }
      }
      // Stay busy while the browser leaves for PayOS, so the button cannot be pressed twice.
      setPhase('redirecting');
      notify.info(
        tr('Đang chuyển đến trang thanh toán…'),
        '',
        { key: 'study-payment-create', replace: true },
      );
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(formatApiError(err, tr('Không tạo được đơn mua gói. Vui lòng thử lại.')));
      setPhase('idle');
    }
  }

  const payLabel = phase === 'verifying'
    ? tr('Đang kiểm tra gói…')
    : phase === 'creating'
      ? tr('Đang tạo liên kết thanh toán…')
      : phase === 'redirecting'
        ? tr('Đang chuyển đến trang thanh toán…')
        : tr('Thanh toán ngay');

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      dismissible={!busy}
      size="lg"
      title={tr('Xác nhận gói học')}
      description={tr('Kiểm tra thông tin gói trước khi thanh toán.')}
      className="sm:max-w-[600px] [&>div:last-child]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tr('Quay lại')}
          </Button>
          <Button variant="primary" onClick={handlePay} loading={busy} disabled={busy} iconRight={busy ? undefined : ArrowRight} data-testid="checkout-pay-btn">
            {payLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-checkout-plan={plan.id}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">
              {meta ? tr(meta.title) : tr('Gói học')}
            </p>
            <p className="mt-0.5 break-words text-lg font-bold leading-6 text-rp-navy">{plan.name}</p>
          </div>
          <p className="shrink-0 text-[28px] font-extrabold leading-8 tabular-nums text-rp-brand-strong">
            {formatVnd(plan.price)}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-3" aria-label={tr('Thông số gói')}>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2.5">
            <dt className="text-xs text-rp-text-muted">{tr('Thời hạn')}</dt>
            <dd className="mt-0.5 font-bold text-rp-text">{variantDurationLabel(plan, { tr, trf })}</dd>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2.5">
            <dt className="text-xs text-rp-text-muted">{tr('Số ngày truy cập')}</dt>
            <dd className="mt-0.5 font-bold text-rp-text">
              {usageBased ? tr('Không giới hạn ngày') : trf('{0} ngày', { 0: plan.durationDays })}
            </dd>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3 py-2.5">
            <dt className="text-xs text-rp-text-muted">{tr('Lượt AI được cấp')}</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-rp-text">
              {plan.aiUses > 0 && <TicketCheck aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />}
              <span>{plan.aiUses > 0 ? trf('{0} lượt', { 0: plan.aiUses }) : tr('Không kèm lượt AI')}</span>
            </dd>
          </div>
        </dl>

        {(plan.description || features.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-rp-text-2">{tr('Quyền lợi chính')}</p>
            {plan.description && <p className="mt-1 text-[13px] leading-5 text-rp-text-2">{tr(plan.description)}</p>}
            {features.length > 0 && (
              <ul className="mt-2 grid gap-1.5 text-[13px] text-rp-text-2 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <li key={typeof feature === 'object' ? (feature.id ?? feature.code ?? index) : feature} className="flex items-start gap-2">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                    <span>{tr(featureLabel(feature))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="flex items-start gap-2 rounded-xl bg-rp-bg-2 px-3 py-2.5 text-xs leading-5 text-rp-text-2 ring-1 ring-inset ring-rp-line/70">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-text-muted" />
          <span>{activation}</span>
        </p>

        {notice && <Banner tone="warning">{notice}</Banner>}
        {error && (
          <div role="alert">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}
      </div>
    </Modal>
  );
}
