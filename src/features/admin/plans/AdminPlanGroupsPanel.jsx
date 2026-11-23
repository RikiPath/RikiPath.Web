import { useState } from 'react';
import { ChevronDown, GraduationCap, Mic, PenLine, Plus, Route, Sparkles } from 'lucide-react';

import { Badge, Button, Card, Collapsible, Modal, cx } from '@/components/ui';
import { AdminIconAction, AdminRowActions } from '@/features/admin/components/AdminPrimitives.jsx';
import { featureDisplayName, formatVnd } from '@/features/checkout/planGroups.js';
import { useLocale } from '@/locales/locale.js';
import { adminVariantLabel, priceRangeLabel } from './adminPlansModel.js';

const GROUP_ICONS = { study: GraduationCap, speaking: Mic, writing: PenLine, credit: Sparkles, path: Route };

function PlanDetailModal({ plan, features, onClose }) {
  const { tr, trf } = useLocale();
  const featureIds = new Set((plan?.featureIds || []).map(String));
  const includedFeatures = features.filter((feature) => featureIds.has(String(feature.id)));

  return (
    <Modal
      open={Boolean(plan)}
      onClose={onClose}
      title={plan?.name}
      size="md"
      footer={<Button variant="outline" onClick={onClose}>{tr('Đóng')}</Button>}
    >
      {plan && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={plan.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
              {plan.isActive ? tr('Đang mở bán') : tr('Đã ngừng bán')}
            </Badge>
            {plan.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
          </div>
          {plan.description && <p className="leading-6 text-rp-text-2">{plan.description}</p>}
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl border border-rp-line bg-rp-bg-2/50 p-4">
            <div><dt className="text-xs text-rp-text-muted">{tr('Giá bán')}</dt><dd className="mt-1 font-bold tabular-nums text-rp-brand-strong">{formatVnd(plan.price)}</dd></div>
            <div><dt className="text-xs text-rp-text-muted">{tr('Thời hạn sử dụng')}</dt><dd className="mt-1 font-semibold text-rp-text">{adminVariantLabel(plan, { tr, trf })}</dd></div>
            <div><dt className="text-xs text-rp-text-muted">{tr('Số lượt AI đi kèm')}</dt><dd className="mt-1 font-semibold tabular-nums text-rp-text">{Number(plan.aiGradingQuota) || 0}</dd></div>
            <div><dt className="text-xs text-rp-text-muted">{tr('Đơn đã thanh toán')}</dt><dd className="mt-1 font-semibold tabular-nums text-rp-text">{plan.paidPurchaseCount ?? 0}</dd></div>
          </dl>
          {includedFeatures.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-rp-text">{tr('Quyền lợi của gói học')}</h3>
              <ul className="list-inside list-disc space-y-1 text-rp-text-2">
                {includedFeatures.map((feature) => <li key={feature.id}>{tr(featureDisplayName(feature))}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * "Gói học & Lượt AI": one expandable row per plan group (same grouping as the Learner catalog),
 * each listing its duration variants. Every variant keeps its own plan id, price, orders and sale status.
 */
export default function AdminPlanGroupsPanel({ groups, features, onEdit, onCreateInGroup, onToggleSale, savingPlanId }) {
  const { tr, trf } = useLocale();
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [detailPlan, setDetailPlan] = useState(null);

  const toggle = (key) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" data-testid="admin-plan-groups">
      {groups.map((group) => {
        const open = !collapsed.has(group.key);
        const Icon = GROUP_ICONS[group.meta?.icon] ?? Sparkles;
        const panelId = `plan-group-${group.key}`;
        const title = group.meta ? tr(group.meta.title) : (group.variants[0]?.name ?? group.key);
        const range = priceRangeLabel(group);
        return (
          <Card key={group.key} padded={false} className="overflow-hidden" data-plan-group={group.key}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={open}
                aria-controls={panelId}
                className="rp-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
              >
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-rp-text">{title}</span>
                    <Badge tone="neutral" size="sm" icon={false}>{trf('{0} biến thể', { 0: group.variants.length })}</Badge>
                    <Badge tone={group.sellingCount > 0 ? 'success' : 'neutral'} size="sm" icon={false}>
                      {group.sellingCount > 0
                        ? trf('{0}/{1} đang mở bán', { 0: group.sellingCount, 1: group.variants.length })
                        : tr('Đã ngừng bán')}
                    </Badge>
                  </span>
                  {group.meta?.description && (
                    <span className="mt-0.5 block truncate text-xs text-rp-text-muted">{tr(group.meta.description)}</span>
                  )}
                </span>
                {range && <span className="hidden shrink-0 text-sm font-bold tabular-nums text-rp-brand-strong sm:inline">{range}</span>}
                <ChevronDown
                  aria-hidden="true"
                  className={cx('h-4 w-4 shrink-0 text-rp-text-muted transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
                />
              </button>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => onCreateInGroup(group.kind)}>
                {tr('Thêm thời hạn')}
              </Button>
            </div>

            <Collapsible open={open} id={panelId}>
              <ul className="divide-y divide-rp-line border-t border-rp-line">
                {group.variants.map((plan) => (
                  <li key={plan.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-5" data-plan-variant={plan.id}>
                    <span className="inline-flex h-7 min-w-[72px] items-center justify-center rounded-full border border-rp-line bg-rp-bg-2/70 px-2.5 text-xs font-semibold text-rp-text-2">
                      {adminVariantLabel(plan, { tr, trf })}
                    </span>
                    <div className="min-w-[180px] flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-rp-text">
                        {plan.name}
                        {plan.isPopular && <Badge tone="brand" size="sm" icon={false}>{tr('Phổ biến')}</Badge>}
                      </p>
                      <p className="text-xs text-rp-text-muted">
                        {Number(plan.durationDays) > 0 ? trf('{0} ngày', { 0: plan.durationDays }) : tr('Theo lượt')}
                        {Number(plan.aiGradingQuota) > 0 ? ` · ${trf('{0} lượt AI', { 0: plan.aiGradingQuota })}` : ''}
                        {` · ${trf('{0} đơn đã thanh toán', { 0: plan.paidPurchaseCount ?? 0 })}`}
                      </p>
                    </div>
                    <span className="w-[96px] text-right text-sm font-bold tabular-nums text-rp-brand-strong">{formatVnd(plan.price)}</span>
                    <Badge tone={plan.isActive ? 'success' : 'neutral'} size="sm" icon={false}>
                      {plan.isActive ? tr('Đang mở bán') : tr('Đã ngừng bán')}
                    </Badge>
                    <AdminRowActions>
                      <AdminIconAction kind="view" tooltip="Xem chi tiết" onClick={() => setDetailPlan(plan)} />
                      <AdminIconAction kind="edit" tone="brand" tooltip="Chỉnh sửa gói học" onClick={() => onEdit(plan)} />
                      <AdminIconAction
                        kind={plan.isActive ? 'lock' : 'unlock'}
                        tone={plan.isActive ? 'warning' : 'success'}
                        tooltip={plan.isActive ? 'Ngừng bán gói' : 'Mở bán trở lại'}
                        disabled={savingPlanId === plan.id}
                        onClick={() => onToggleSale(plan)}
                      />
                    </AdminRowActions>
                  </li>
                ))}
              </ul>
            </Collapsible>
          </Card>
        );
      })}
      <PlanDetailModal plan={detailPlan} features={features} onClose={() => setDetailPlan(null)} />
    </div>
  );
}
