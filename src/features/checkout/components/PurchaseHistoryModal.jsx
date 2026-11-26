import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Skeleton,
  cx,
} from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { useLocale } from '@/locales/locale.js';
import { parseBusinessDate } from '@/utils/dateTimeFormat.js';
import { getStudyPurchaseHistory } from '../api/subscriptionApi.js';
import {
  formatPlanDate,
  formatPlanTime,
  formatVnd,
  orderQuantityLabel,
  paymentStatusMeta,
  productAccentOf,
  purchaseValidityLines,
} from '../planGroups.js';
import { PLAN_KIND_ICONS } from '../planIcons.js';

const PAGE_SIZE = 8;

function hasMeaningfulConfirmationDelta(purchasedAt, confirmedAt) {
  const p = parseBusinessDate(purchasedAt);
  const c = parseBusinessDate(confirmedAt);
  if (!p || !c) return false;
  return Math.abs(c.getTime() - p.getTime()) >= 120_000;
}

function TableLoadingSkeleton() {
  return (
    <div aria-hidden="true" data-testid="purchase-history-loading">
      <div className="hidden overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface md:block">
        <div className="grid grid-cols-[2.2fr_1.15fr_1.45fr_1.1fr_0.95fr] gap-4 border-b border-rp-line bg-rp-table-head px-4 py-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3.5 w-24" rounded="rounded-md" />
          ))}
        </div>
        <div className="divide-y divide-rp-line/70">
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="grid grid-cols-[2.2fr_1.15fr_1.45fr_1.1fr_0.95fr] items-center gap-4 px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-xl" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-44" rounded="rounded-md" />
                  <Skeleton className="h-3 w-20" rounded="rounded-md" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" rounded="rounded-md" />
                <Skeleton className="h-3 w-16" rounded="rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" rounded="rounded-md" />
                <Skeleton className="h-3 w-28" rounded="rounded-md" />
              </div>
              <div className="flex flex-col items-end space-y-1.5">
                <Skeleton className="h-3.5 w-20" rounded="rounded-md" />
                <Skeleton className="h-3 w-16" rounded="rounded-md" />
              </div>
              <div className="flex justify-center">
                <Skeleton className="h-6 w-20" rounded="rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 md:hidden">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-28 w-full" rounded="rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact, horizontal "Lịch sử mua gói" modal:
 * - Single self-contained view (no filters, no detail sub-modal, no re-buy CTAs, no technical codes).
 * - Desktop: 5-column compact DataTable (Gói đã mua | Thời gian tạo đơn | Hiệu lực sử dụng | Thanh toán | Trạng thái).
 * - Tablet / Mobile: clean responsive compact list without horizontal table overflow.
 */
export default function PurchaseHistoryModal({ open, onClose }) {
  const { user } = useAuth();
  const { tr, trf } = useLocale();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['study-subscription', 'history', user?.userId, page],
    queryFn: () => getStudyPurchaseHistory({ page, pageSize: PAGE_SIZE }),
    enabled: Boolean(open && user?.userId),
    staleTime: 30_000,
  });

  const data = query.data;
  const items = data?.items ?? [];
  const total = Number(data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = useMemo(() => [
    {
      key: 'planName',
      header: tr('Gói đã mua'),
      align: 'left',
      width: 'w-[32%]',
      render: (order) => {
        const kind = String(order.kind || 'self_study').toLowerCase();
        const accent = productAccentOf(kind);
        const Icon = PLAN_KIND_ICONS[kind] ?? PLAN_KIND_ICONS.self_study;
        const quantity = orderQuantityLabel(order, { tr, trf });
        return (
          <div className="flex items-center gap-3 py-0.5">
            <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', accent.iconTile)}>
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold leading-5 text-rp-text" title={order.planName}>
                {order.planName}
              </p>
              <p className="mt-0.5 text-xs leading-4 text-rp-text-muted">{quantity}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'purchasedAt',
      header: tr('Thời gian tạo đơn'),
      align: 'left',
      width: 'w-[17%]',
      render: (order) => {
        const createdRaw = order.purchasedAt || order.startDate;
        const dateText = formatPlanDate(createdRaw);
        const timeText = formatPlanTime(createdRaw);
        const isPaid = String(order.paymentStatus || '').toLowerCase() === 'paid';
        const showPaidAt = isPaid && order.purchasedAt && order.startDate
          && hasMeaningfulConfirmationDelta(order.purchasedAt, order.startDate);
        return (
          <div className="whitespace-nowrap">
            <p className="text-[13px] font-medium leading-5 text-rp-text">{dateText}</p>
            {timeText && <p className="text-xs leading-4 text-rp-text-muted">{timeText}</p>}
            {showPaidAt && (
              <p className="mt-0.5 text-[11px] leading-4 text-rp-text-muted">
                {trf('Xác nhận: {0}', { 0: formatPlanTime(order.startDate) })}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'validity',
      header: tr('Hiệu lực sử dụng'),
      align: 'left',
      width: 'w-[21%]',
      render: (order) => {
        const validity = purchaseValidityLines(order, { tr, trf });
        return (
          <div className="whitespace-nowrap">
            <p className={cx('text-[13px] leading-5', validity.muted ? 'text-rp-text-muted' : 'font-medium text-rp-text')}>
              {validity.primary}
            </p>
            {validity.secondary && (
              <p className="text-xs leading-4 text-rp-text-muted">{validity.secondary}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'payment',
      header: tr('Thanh toán'),
      align: 'right',
      width: 'w-[16%]',
      render: (order) => (
        <div className="whitespace-nowrap text-right">
          <p className="text-[13.5px] font-bold leading-5 tabular-nums text-rp-text">
            {formatVnd(order.amountPaid)}
          </p>
          <p className="text-xs leading-4 text-rp-text-muted">
            {order.paymentMethod ? tr(order.paymentMethod) : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      width: 'w-[14%]',
      render: (order) => {
        const meta = paymentStatusMeta(order, { tr });
        return (
          <div className="flex justify-center">
            <Badge tone={meta.tone} size="sm" icon={false}>
              {meta.label}
            </Badge>
          </div>
        );
      },
    },
  ], [tr, trf]);

  const modalTitle = (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rp-brand-border/80 bg-rp-brand-tint text-rp-brand-strong"
      >
        <History className="h-4 w-4" />
      </span>
      <span>{tr('Lịch sử mua gói')}</span>
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="3xl"
      title={modalTitle}
      description={tr('Xem lại các giao dịch mua gói và bổ sung lượt AI.')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium text-rp-text-muted">
            {!query.isPending && !query.isError && total > 0
              ? trf('{0} giao dịch', { 0: total })
              : ''}
          </span>
          <Button variant="secondary" onClick={onClose}>
            {tr('Đóng')}
          </Button>
        </div>
      }
    >
      <div data-testid="purchase-history-modal">
        {query.isPending ? (
          <TableLoadingSkeleton />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title={tr('Không thể tải lịch sử mua gói.')}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustration="card"
            title={tr('Bạn chưa có giao dịch nào')}
            description={tr('Các gói học và lượt AI bạn mua sẽ xuất hiện tại đây.')}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                rows={items}
                rowKey={(row) => row.id}
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                density="compact"
                stickyHeader
                scrollClassName="max-h-[58vh]"
                minTableWidth="min-w-full"
                itemLabel={tr('giao dịch')}
              />
            </div>

            <div className="space-y-2.5 md:hidden" data-testid="purchase-history-mobile-list">
              {items.map((order) => {
                const kind = String(order.kind || 'self_study').toLowerCase();
                const accent = productAccentOf(kind);
                const Icon = PLAN_KIND_ICONS[kind] ?? PLAN_KIND_ICONS.self_study;
                const quantity = orderQuantityLabel(order, { tr, trf });
                const createdRaw = order.purchasedAt || order.startDate;
                const validity = purchaseValidityLines(order, { tr, trf });
                const statusMeta = paymentStatusMeta(order, { tr });
                const validityDisplay = validity.secondary
                  ? `${validity.primary} · ${validity.secondary}`
                  : validity.primary;

                return (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-rp-line bg-rp-surface p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', accent.iconTile)}>
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-rp-text">{order.planName}</p>
                          <p className="text-xs text-rp-text-muted">{quantity}</p>
                        </div>
                      </div>
                      <Badge tone={statusMeta.tone} size="sm" icon={false} className="shrink-0">
                        {statusMeta.label}
                      </Badge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-rp-line/70 pt-2.5 text-xs">
                      <div>
                        <dt className="text-[11px] text-rp-text-muted">{tr('Thời gian tạo đơn')}</dt>
                        <dd className="mt-0.5 font-medium text-rp-text">
                          {formatPlanDate(createdRaw)}
                          {formatPlanTime(createdRaw) ? ` · ${formatPlanTime(createdRaw)}` : ''}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[11px] text-rp-text-muted">{tr('Thanh toán')}</dt>
                        <dd className="mt-0.5 font-bold tabular-nums text-rp-text">
                          {formatVnd(order.amountPaid)}
                        </dd>
                        <dd className="text-[11px] text-rp-text-muted">
                          {order.paymentMethod ? tr(order.paymentMethod) : '—'}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[11px] text-rp-text-muted">{tr('Hiệu lực sử dụng')}</dt>
                        <dd className={cx('mt-0.5', validity.muted ? 'text-rp-text-muted' : 'font-medium text-rp-text')}>
                          {validityDisplay}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}

              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  totalItems={total}
                  itemLabel={tr('giao dịch')}
                  onPageChange={setPage}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
