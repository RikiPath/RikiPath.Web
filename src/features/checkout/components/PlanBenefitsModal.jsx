import { Calendar, CheckCircle2, Info, Ticket } from 'lucide-react';
import { Badge, Button, Modal, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  featureDisplayName,
  formatVnd,
  isUsageBased,
  productAccentOf,
  variantDurationLabel,
} from '../planGroups.js';
import { AI_CREDIT_ICON, PLAN_GROUP_ICONS } from '../planIcons.js';

/**
 * Product Benefits Preview Modal for the currently selected plan variant.
 * Closes cleanly before opening checkout so modals never stack on top of each other.
 */
export default function PlanBenefitsModal({
  open,
  onClose,
  group,
  plan,
  onBuy,
  ctaLabel,
  readOnly = false,
}) {
  const { tr, trf } = useLocale();
  if (!open || !group || !plan) return null;

  const meta = group.meta;
  const accent = productAccentOf(group.kind);
  const Icon = PLAN_GROUP_ICONS[meta?.icon] ?? AI_CREDIT_ICON;
  const title = group.customTitle ? group.title : (meta ? tr(meta.title) : plan.name);
  const description = (group.customTitle ? plan.description : (meta?.description || plan.description)) || '';
  const usageBased = isUsageBased(plan);
  const variantLabel = variantDurationLabel(plan, { tr, trf });
  const features = Array.isArray(plan.features) ? plan.features.filter((f) => featureDisplayName(f)) : [];

  function handleBuyClick() {
    onClose?.();
    onBuy?.(plan.id);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={title}
      description={description ? tr(description) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tr('Đóng')}
          </Button>
          {!readOnly && onBuy && (
            <Button variant="primary" onClick={handleBuyClick} data-testid={`modal-buy-plan-${plan.id}`}>
              {ctaLabel || tr('Chọn mua gói')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Selected Variant Snapshot */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rp-line bg-rp-bg-2/70 p-3.5">
          <div className="flex items-center gap-3">
            <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', accent.iconTile)}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-bold text-rp-text">{plan.name}</p>
                <Badge tone="brand" size="sm" icon={false}>{variantLabel}</Badge>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
                {!usageBased && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                    {trf('{0} ngày truy cập', { 0: plan.durationDays })}
                  </span>
                )}
                {plan.aiUses > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rp-brand-border/70 bg-rp-brand-tint/60 px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong">
                    <Ticket aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                    {trf('+{0} lượt AI', { 0: plan.aiUses })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xl font-extrabold tabular-nums text-rp-brand-strong">
            {formatVnd(plan.price)}
          </p>
        </div>

        {/* Real Benefits */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.05em] text-rp-text-muted">
            {tr('Quyền lợi chi tiết')}
          </h4>
          {features.length > 0 ? (
            <ul className="space-y-2 text-sm text-rp-text-2">
              {features.map((feature, index) => (
                <li
                  key={typeof feature === 'object' ? (feature.id ?? feature.code ?? index) : feature}
                  className="flex items-start gap-2.5 rounded-xl border border-rp-line/70 bg-rp-surface px-3 py-2"
                >
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-success" />
                  <div className="min-w-0">
                    <p className="font-semibold text-rp-text">{tr(featureDisplayName(feature))}</p>
                    {feature.description && (
                      <p className="mt-0.5 text-xs text-rp-text-muted">{tr(feature.description)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-rp-line/70 bg-rp-surface px-3.5 py-2.5 text-sm text-rp-text-2">
              {usageBased
                ? trf('Cộng trực tiếp {0} lượt sử dụng vào Ví lượt AI của bạn ngay sau khi thanh toán.', { 0: Math.max(1, Number(plan.aiUses) || 1) })
                : trf('Kích hoạt quyền sử dụng gói trong {0} ngày kể từ thời điểm thanh toán thành công.', { 0: plan.durationDays })}
            </div>
          )}
        </div>

        {/* Conditions / Usage Limits */}
        <div className="rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3.5 py-2.5 text-xs leading-5 text-rp-text-2">
          <p className="inline-flex items-center gap-1.5 font-semibold text-rp-text">
            <Info aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
            {tr('Điều kiện áp dụng')}
          </p>
          <p className="mt-1">
            {usageBased
              ? tr('Lượt AI được cộng dồn theo số dư hiệu lực và không bị giới hạn thời gian theo ngày sử dụng gói.')
              : tr('Khi gia hạn cùng nhóm gói đang hiệu lực, thời hạn mới được cộng nối tiếp sau ngày hết hạn hiện tại.')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
