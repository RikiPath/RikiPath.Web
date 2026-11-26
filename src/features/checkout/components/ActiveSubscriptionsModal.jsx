import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Ticket,
} from 'lucide-react';
import {
  Badge,
  Button,
  Collapsible,
  EmptyState,
  ErrorState,
  Modal,
  Skeleton,
  cx,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  computeRemainingDays,
  featureDisplayName,
  formatPlanDate,
  isUnlimitedSubscription,
  orderDurationLabel,
  productAccentOf,
} from '../planGroups.js';
import { PLAN_KIND_ICONS } from '../planIcons.js';

function resolveOrderFeatures(order, catalogByPlanId, access) {
  if (Array.isArray(order?.grantedFeatures) && order.grantedFeatures.length > 0) {
    return order.grantedFeatures.map((f) => featureDisplayName(f)).filter(Boolean);
  }
  const matchedPlan = catalogByPlanId.get(order?.planId);
  if (Array.isArray(matchedPlan?.features) && matchedPlan.features.length > 0) {
    return matchedPlan.features.map((f) => featureDisplayName(f)).filter(Boolean);
  }
  if (Array.isArray(access?.features)) {
    return access.features
      .filter((f) => f.allowed && !f.isCoreFree && (!order?.planName || f.grantedByPlanName === order.planName))
      .map((f) => f.name)
      .filter(Boolean);
  }
  return [];
}

function ActiveOrderCard({ order, isUpcoming, sellable, features, expanded, onToggleExpand, onRenew, tr, trf }) {
  const kind = String(order.kind || 'self_study').toLowerCase();
  const accent = productAccentOf(kind);
  const Icon = PLAN_KIND_ICONS[kind] ?? PLAN_KIND_ICONS.self_study;
  const unlimited = !isUpcoming && isUnlimitedSubscription(order.endDate, undefined);
  const remainingDays = isUpcoming ? null : computeRemainingDays(order.endDate);
  const expiringSoon = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
  const variantLabel = orderDurationLabel(order, { tr, trf });

  const statusBadge = isUpcoming
    ? { tone: 'info', label: tr('Chờ kích hoạt') }
    : unlimited
      ? { tone: 'brand', label: tr('Không giới hạn') }
      : expiringSoon
        ? { tone: 'warning', label: tr('Sắp hết hạn') }
        : { tone: 'success', label: tr('Đang hiệu lực') };

  return (
    <article
      className={cx(
        'rounded-2xl border border-rp-line bg-rp-surface px-3.5 pt-3.5 transition-colors hover:border-rp-brand-border/70',
        expanded ? 'pb-3.5' : 'pb-2',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', accent.iconTile)}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14.5px] font-bold text-rp-text">{order.planName}</h3>
              {variantLabel && (
                <Badge tone="neutral" size="sm" icon={false}>{variantLabel}</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rp-text-2">
              {order.startDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
                  {isUpcoming ? tr('Bắt đầu:') : tr('Ngày kích hoạt:')} {formatPlanDate(order.startDate)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="h-3.5 w-3.5 text-rp-text-muted" />
                {order.endDate
                  ? (unlimited ? tr('Không giới hạn thời hạn') : `${tr('Hết hạn:')} ${formatPlanDate(order.endDate)}`)
                  : tr('Theo lượt sử dụng')}
              </span>
              {remainingDays !== null && (
                <span className={cx('font-semibold', expiringSoon ? 'text-rp-warning' : 'text-rp-brand-strong')}>
                  {remainingDays <= 0 ? tr('Còn dưới 1 ngày') : trf('Còn {0} ngày', { 0: remainingDays })}
                </span>
              )}
              {Number(order.aiUsesRemaining || 0) > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-rp-brand-strong">
                  <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
                  {trf('Còn {0} lượt AI', { 0: order.aiUsesRemaining })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={statusBadge.tone} size="sm" icon={false}>{statusBadge.label}</Badge>
        </div>
      </div>

      {/* Collapsed-by-default per-plan entitlements + inline renew action */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-rp-line/70 pt-1.5">
        <button
          type="button"
          onClick={() => onToggleExpand(order.id)}
          aria-expanded={expanded}
          data-testid={`toggle-order-benefits-${order.id}`}
          className="rp-focus inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-rp-text-2 transition-colors hover:text-rp-brand-strong"
        >
          <span>{expanded ? tr('Thu gọn quyền lợi') : tr('Xem quyền lợi')}</span>
          <ChevronDown
            aria-hidden="true"
            className={cx('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>

        {sellable && onRenew && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs"
            onClick={() => onRenew(order.planId)}
            data-testid={`renew-active-plan-${order.id}`}
          >
            {order.kind === 'ai_grading' || order.kind === 'learning_path' ? tr('Mua thêm lượt') : tr('Gia hạn gói')}
          </Button>
        )}
      </div>

      <Collapsible open={expanded}>
        <div className="pt-2">
          <div className="rounded-xl bg-rp-bg-2/65 p-3">
            {features.length > 0 ? (
              <ul className="grid gap-1.5 text-xs text-rp-text-2 sm:grid-cols-2">
                {features.map((name) => (
                  <li key={name} className="flex items-start gap-2">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-success" />
                    <span>{tr(name)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-rp-text-2">
                {Number(order.aiUsesGranted || order.aiUsesRemaining || 0) > 0
                  ? trf('Bao gồm {0} lượt sử dụng AI theo quy định của gói.', { 0: order.aiUsesGranted || order.aiUsesRemaining })
                  : tr('Kích hoạt quyền truy cập đầy đủ các tính năng thuộc gói này.')}
              </p>
            )}
          </div>
        </div>
      </Collapsible>
    </article>
  );
}

/**
 * Dedicated "Gói đang sử dụng" Modal (no mascot, strict single modal focus, collapsed-by-default benefits per order).
 */
export default function ActiveSubscriptionsModal({
  open,
  onClose,
  access,
  summary,
  accessQuery,
  catalogByPlanId,
  sellablePlanIds,
  onRenewPlan,
  onOpenHistory,
}) {
  const { tr, trf } = useLocale();
  const [expandedIds, setExpandedIds] = useState({});

  const activeOrders = summary?.activeOrders || [];
  const upcomingOrders = summary?.upcomingOrders || [];
  const hasAnyPlan = activeOrders.length > 0 || upcomingOrders.length > 0;

  const totalAiCredits = useMemo(() => (
    Number(access?.aiGradingUsesRemaining || 0)
    + Number(access?.learningPathUsesRemaining || 0)
    + Number(access?.speakingUsesRemaining || 0)
    + Number(access?.writingUsesRemaining || 0)
  ), [access]);

  function toggleOrder(id) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleRenew(planId) {
    onClose?.();
    onRenewPlan?.(planId);
  }

  function handleSwitchToHistory() {
    onClose?.();
    onOpenHistory?.();
  }

  let body;
  if (accessQuery?.isPending && !accessQuery?.data) {
    body = (
      <div className="space-y-3" aria-label={tr('Đang tải gói đang sử dụng')}>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  } else if (accessQuery?.isError) {
    body = (
      <ErrorState
        error={accessQuery.error}
        title={tr('Chưa tải được thông tin gói đang sử dụng')}
        onRetry={() => accessQuery.refetch()}
        retrying={accessQuery.isFetching}
      />
    );
  } else if (!hasAnyPlan) {
    body = (
      <EmptyState
        illustration="card"
        title={tr('Bạn chưa có gói học nào')}
        description={
          totalAiCredits > 0
            ? trf('Bạn hiện đang sử dụng gói miễn phí cơ bản và có {0} lượt AI khả dụng trong ví.', { 0: totalAiCredits })
            : tr('Khám phá các gói tự học JLPT, luyện nói/viết với AI hoặc gói kết hợp phù hợp với mục tiêu của bạn.')
        }
        action={
          <Button variant="primary" onClick={onClose}>
            {tr('Khám phá gói học')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="space-y-3">
        {activeOrders.map((order) => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            isUpcoming={false}
            sellable={Boolean(sellablePlanIds?.has(order.planId))}
            features={resolveOrderFeatures(order, catalogByPlanId, access)}
            expanded={Boolean(expandedIds[order.id])}
            onToggleExpand={toggleOrder}
            onRenew={handleRenew}
            tr={tr}
            trf={trf}
          />
        ))}
        {upcomingOrders.map((order) => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            isUpcoming
            sellable={Boolean(sellablePlanIds?.has(order.planId))}
            features={resolveOrderFeatures(order, catalogByPlanId, access)}
            expanded={Boolean(expandedIds[order.id])}
            onToggleExpand={toggleOrder}
            onRenew={handleRenew}
            tr={tr}
            trf={trf}
          />
        ))}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('Gói đang sử dụng')}
      description={
        hasAnyPlan
          ? trf('Thông tin các gói học và quyền lợi bạn đang sở hữu ({0} gói).', { 0: activeOrders.length + upcomingOrders.length })
          : tr('Theo dõi thời hạn hiệu lực, quyền lợi và số lượt AI thuộc từng gói đã kích hoạt.')
      }
      footer={
        <>
          {onOpenHistory && (
            <Button variant="ghost" onClick={handleSwitchToHistory}>
              {tr('Xem lịch sử mua gói')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {tr('Đóng')}
          </Button>
        </>
      }
    >
      {body}
    </Modal>
  );
}
