import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, CreditCard, RotateCcw, TrendingUp, XCircle } from 'lucide-react';
import { useSmartRefresh } from '@/hooks/useSmartRefresh.js';
import { AdminShell } from '@/layouts';
import {
  Button,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataRefreshBoundary,
  DateRangePicker,
  Modal,
  SakuraLoader,
  SearchInput,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatCard,
  AdminStatusBadge,
  AdminToolbar,
  AdminWorkspace,
} from '@/features/admin/components/AdminPrimitives.jsx';
import {
  getAdminPaymentDetail,
  getAdminPayments,
  getPayOsGatewayStatus,
} from '@/features/admin/api/adminApi.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const STATUS_META = {
  Paid: { label: 'Đã thanh toán', tone: 'success' },
  Pending: { label: 'Đang chờ', tone: 'warning' },
  PaymentReview: { label: 'Cần xem xét', tone: 'danger' },
  Failed: { label: 'Thất bại', tone: 'danger' },
  Cancelled: { label: 'Đã hủy', tone: 'neutral' },
  Refunded: { label: 'Hoàn tiền', tone: 'info' },
};

const STREAM_LABELS = {
  subscription: 'Gói tự học & AI',
  study_course: 'Lớp học nhóm',
  ai_topup: 'Nạp lượt AI',
};

const money = (amount) => `${Number(amount || 0).toLocaleString(currentIntlTag())} ₫`;

export default function AdminPaymentsWorkspace() {
  const { tr, trf } = useLocale();

  const [stream, setStream] = useState('all');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [selectedRef, setSelectedRef] = useState(null);

  const gatewayQuery = useQuery({
    queryKey: ['admin-payos-gateway-status'],
    queryFn: getPayOsGatewayStatus,
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', { stream, status, search, fromDate, toDate, page, pageSize }],
    queryFn: () =>
      getAdminPayments({
        stream: stream === 'all' ? undefined : stream,
        status: status === 'All' ? undefined : status,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const unfilteredCountQuery = useQuery({
    queryKey: ['admin-payments-unfiltered-count'],
    queryFn: () => getAdminPayments({ page: 1, pageSize: 1 }),
    staleTime: 60_000,
    enabled: Boolean(stream !== 'all' || status !== 'All' || search.trim() || fromDate || toDate),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-payment-detail', selectedRef?.stream, selectedRef?.recordId],
    queryFn: () => getAdminPaymentDetail(selectedRef.stream, selectedRef.recordId),
    enabled: Boolean(selectedRef),
  });

  const gateway = gatewayQuery.data || null;
  const ledger = paymentsQuery.data || null;
  const items = ledger?.items || [];
  const summary = ledger?.summary || {
    totalCount: 0,
    paidCount: 0,
    pendingCount: 0,
    failedOrCancelledCount: 0,
    reviewCount: 0,
    totalPaidAmount: 0,
  };

  function resetFilters() {
    setStream('all');
    setStatus('All');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  const columns = [
    {
      key: 'orderCode',
      header: tr('Mã đơn'),
      compact: true,
      render: (row) => (
        <div className="min-w-0">
          <span className="font-mono text-xs font-semibold text-rp-text">#{row.orderCode}</span>
          <p className="mt-0.5 whitespace-nowrap text-[11px] text-rp-text-muted">{formatVnDateTime(row.createdAtUtc)}</p>
        </div>
      ),
    },
    {
      key: 'learnerName',
      header: tr('Học viên'),
      render: (row) => (
        <div className="mx-auto min-w-0 max-w-[250px]">
          <p title={row.learnerName} className="truncate font-semibold text-rp-text">{row.learnerName}</p>
          {row.learnerEmail && <p title={row.learnerEmail} className="truncate text-xs text-rp-text-muted">{row.learnerEmail}</p>}
        </div>
      ),
    },
    {
      key: 'itemTitle',
      header: tr('Gói / Khóa học'),
      render: (row) => (
        <div className="mx-auto min-w-0 max-w-[280px]">
          <p title={row.itemTitle} className="truncate font-medium text-rp-text">{row.itemTitle}</p>
          <span className="text-[11px] text-rp-text-muted">
            {tr(STREAM_LABELS[row.stream] || row.stream)}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: tr('Số tiền'),
      compact: true,
      render: (row) => <span className="whitespace-nowrap font-bold tabular-nums text-rp-brand-strong">{money(row.amount)}</span>,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => {
        const meta = STATUS_META[row.status] || { label: row.status, tone: 'neutral' };
        return <AdminStatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
  ];

  const hasActiveFilter = stream !== 'all' || status !== 'All' || search.trim() || fromDate || toDate;
  const hasNoPayments = paymentsQuery.isSuccess && (hasActiveFilter
    ? unfilteredCountQuery.isSuccess && unfilteredCountQuery.data?.totalCount === 0
    : ledger?.totalCount === 0);
  const { refresh: refreshPayments, isRefreshing: paymentsRefreshing } = useSmartRefresh({
    queries: [paymentsQuery, gatewayQuery, unfilteredCountQuery],
  });
  const showToolbar = !hasNoPayments && (Boolean(ledger) || paymentsQuery.isSuccess);

  return (
    <AdminShell breadcrumb={tr('Thanh toán & giao dịch')}>
      <AdminWorkspace viewportLocked page="AdminPaymentsWorkspace">
        <AdminPageHeader
          icon={CreditCard}
          title="Thanh toán & giao dịch"
          className="mb-0 shrink-0"
          badge={
            gateway ? (
              <AdminStatusBadge
                tone={gateway.isReady ? 'success' : 'warning'}
                label={gateway.isReady ? 'Cổng thanh toán sẵn sàng' : 'Chưa sẵn sàng thanh toán'}
              />
            ) : null
          }
        />

        {/* Financial KPI Strip (hidden when system has 0 transactions ever) */}
        {!hasNoPayments && (
          <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard
              icon={TrendingUp}
              tone="brand"
              label="Tổng doanh thu"
              value={money(summary.totalPaidAmount)}
              subtext={trf('{0} đơn đã thanh toán', { 0: summary.paidCount })}
            />
            <AdminStatCard
              icon={CheckCircle2}
              tone="success"
              label="Tổng giao dịch"
              value={summary.totalCount}
              subtext={trf('{0} thành công', { 0: summary.paidCount })}
            />
            <AdminStatCard
              icon={Clock}
              tone="warning"
              label="Đang chờ thanh toán"
              value={summary.pendingCount}
              subtext={tr('Chờ học viên hoàn tất')}
            />
            <AdminStatCard
              icon={XCircle}
              tone="danger"
              label="Cần rà soát / Lỗi / Hủy"
              value={Number(summary.reviewCount || 0) + Number(summary.failedOrCancelledCount || 0)}
              subtext={trf('{0} cần rà soát · {1} lỗi/hủy', { 0: summary.reviewCount, 1: summary.failedOrCancelledCount })}
            />
          </div>
        )}

        {/* Compact Single-Row Filter Bar */}
        {showToolbar && <AdminToolbar refresh={{ onRefresh: refreshPayments, refreshing: paymentsRefreshing }}>
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
            placeholder="Tìm mã đơn, email, tên…"
            aria-label={tr('Tìm kiếm giao dịch')}
            className="w-full sm:w-[235px]"
          />
          <CustomSelect
            fitContent
            value={stream}
            onChange={(val) => {
              setStream(val);
              setPage(1);
            }}
            aria-label={tr('Lọc theo luồng')}
            options={[
              { value: 'all', label: tr('Tất cả nguồn') },
              { value: 'subscription', label: tr('Gói tự học & AI') },
              { value: 'study_course', label: tr('Lớp học nhóm') },
              { value: 'ai_topup', label: tr('Nạp lượt AI') },
            ]}
          />
          <CustomSelect
            fitContent
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            aria-label={tr('Lọc theo trạng thái')}
            options={[
              { value: 'All', label: tr('Tất cả trạng thái') },
              { value: 'Paid', label: tr('Đã thanh toán'), dotClass: 'bg-[#16A34A]' },
              { value: 'Pending', label: tr('Đang chờ'), dotClass: 'bg-[#D97706]' },
              { value: 'PaymentReview', label: tr('Cần xem xét'), dotClass: 'bg-[#DC2626]' },
              { value: 'Failed', label: tr('Thất bại'), dotClass: 'bg-[#DC2626]' },
              { value: 'Cancelled', label: tr('Đã hủy'), dotClass: 'bg-[#94A3B8]' },
            ]}
          />
          <DateRangePicker
            compact
            from={fromDate}
            to={toDate}
            onFromChange={(val) => {
              setFromDate(val);
              setPage(1);
            }}
            onToChange={(val) => {
              setToDate(val);
              setPage(1);
            }}
          />
          {hasActiveFilter && (
            <Button size="sm" variant="ghost" className="h-9" icon={RotateCcw} onClick={resetFilters}>
              {tr('Đặt lại')}
            </Button>
          )}
        </AdminToolbar>}

        <DataRefreshBoundary
          fillHeight
          queries={[paymentsQuery]}
          loading={paymentsQuery.isPending && !ledger}
          refreshing={paymentsRefreshing}
          error={paymentsQuery.error}
          hasData={Boolean(ledger)}
          isEmpty={false}
          loadingContext="payment"
          loadingLabel={tr('Đang tải lịch sử giao dịch…')}
          loadingDelay={120}
          errorTitle={tr('Chưa tải được danh sách giao dịch')}
          onRetry={refreshPayments}
        >
          {hasNoPayments ? (
            <ContextualEmptyState variant="compact" illustration="clock" title={tr('Không có giao dịch nào phù hợp.')} description={tr('Chưa phát sinh đơn hàng nào trên hệ thống.')} />
          ) : paymentsQuery.isSuccess && ledger?.totalCount === 0 && hasActiveFilter ? (
            <ContextualEmptyState variant="search" illustration="clock" title={tr('Không có giao dịch nào phù hợp.')} description={tr('Thử mở rộng khoảng ngày hoặc xóa bộ lọc.')} action={<Button size="sm" variant="outline" onClick={resetFilters}>{tr('Xóa bộ lọc')}</Button>} />
          ) : (
            <AdminDataTable
              fillHeight
              columns={columns}
              rows={items}
              rowKey={(row) => row.key}
              minTableWidth="min-w-[680px]"
              page={ledger?.page ?? page}
              total={ledger?.totalCount ?? 0}
              pageSize={ledger?.pageSize ?? pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
              itemLabel="giao dịch"
              caption={tr('Lịch sử giao dịch')}
              empty={
                <ContextualEmptyState
                  variant={hasActiveFilter ? 'search' : 'compact'}
                  illustration={hasActiveFilter ? 'search' : 'clock'}
                  title={tr('Không có giao dịch nào phù hợp.')}
                  description={hasActiveFilter ? tr('Thử mở rộng khoảng ngày hoặc xóa bộ lọc.') : tr('Chưa phát sinh đơn hàng nào trên hệ thống.')}
                />
              }
              rowActions={(row) => (
                <AdminRowActions>
                  <AdminIconAction
                    kind="view"
                    tooltip="Xem chi tiết giao dịch"
                    onClick={() => setSelectedRef(row)}
                  />
                </AdminRowActions>
              )}
            />
          )}
        </DataRefreshBoundary>
      </AdminWorkspace>

      {/* Clean Read-Only Transaction Detail Modal (No raw JSON / technical secrets) */}
      <Modal
        open={Boolean(selectedRef)}
        onClose={() => setSelectedRef(null)}
        title={selectedRef ? `${tr('Chi tiết giao dịch')} #${selectedRef.orderCode}` : ''}
        description={tr('Đối soát chỉ đọc — hệ thống xác nhận thanh toán tự động.')}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedRef(null)}>
              {tr('Đóng')}
            </Button>
          </div>
        }
      >
        {detailQuery.isPending ? (
          <SakuraLoader variant="section" context="payment" label={tr('Đang tải chi tiết giao dịch…')} delay={100} />
        ) : detailQuery.isError ? (
          <ContextualErrorState
            compact
            error={detailQuery.error}
            title={tr('Không tải được chi tiết giao dịch')}
            onRetry={() => detailQuery.refetch()}
          />
        ) : detailQuery.data ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Mã đơn hàng')}</p>
                <p className="font-mono font-semibold text-rp-text">#{detailQuery.data.orderCode}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Trạng thái')}</p>
                <div className="mt-1">
                  <AdminStatusBadge
                    tone={(STATUS_META[detailQuery.data.status] || { tone: 'neutral' }).tone}
                    label={(STATUS_META[detailQuery.data.status] || { label: detailQuery.data.status }).label}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Học viên')}</p>
                <p className="font-semibold text-rp-text">{detailQuery.data.learnerName}</p>
                <p className="text-xs text-rp-text-muted">{detailQuery.data.learnerEmail}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Số tiền thanh toán')}</p>
                <p className="text-lg font-bold tabular-nums text-rp-brand-strong">{money(detailQuery.data.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Sản phẩm / Gói')}</p>
                <p className="font-medium text-rp-text">{detailQuery.data.itemTitle}</p>
                <p className="text-xs text-rp-text-muted">{tr(STREAM_LABELS[detailQuery.data.stream] || detailQuery.data.stream)}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Mã tham chiếu giao dịch')}</p>
                <p className="font-mono text-xs text-rp-text-2">
                  {detailQuery.data.providerPaymentReference || detailQuery.data.paymentReference || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Thời điểm tạo đơn')}</p>
                <p className="text-xs text-rp-text-2">{formatVnDateTime(detailQuery.data.createdAtUtc)}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Thời điểm xác nhận')}</p>
                <p className="text-xs text-rp-text-2">
                  {detailQuery.data.paidAtUtc ? formatVnDateTime(detailQuery.data.paidAtUtc) : '—'}
                </p>
              </div>
            </div>

            {detailQuery.data.statusReason && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>{tr('Ghi chú trạng thái')}:</strong> {detailQuery.data.statusReason}
              </div>
            )}

            {(detailQuery.data.entitlementStartUtc || detailQuery.data.aiQuota != null || detailQuery.data.durationDaysSnapshot != null) && (
              <div className="rounded-xl border border-rp-line p-4">
                <h4 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.04em] text-rp-text-2">
                  <CreditCard className="h-3.5 w-3.5 text-[#C84666]" />
                  <span>{tr('Quyền lợi ghi nhận khi mua')}</span>
                </h4>
                <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-3">
                  {detailQuery.data.durationDaysSnapshot != null && (
                    <div>
                      <span className="text-rp-text-muted">{tr('Thời hạn sử dụng')}:</span>{' '}
                      <strong>{detailQuery.data.durationDaysSnapshot} {tr('ngày')}</strong>
                    </div>
                  )}
                  {detailQuery.data.aiQuota != null && (
                    <div>
                      <span className="text-rp-text-muted">{tr('Lượt AI')}:</span>{' '}
                      <strong>{detailQuery.data.aiUsed ?? 0} / {detailQuery.data.aiQuota}</strong>
                    </div>
                  )}
                  {detailQuery.data.entitlementStartUtc && (
                    <div>
                      <span className="text-rp-text-muted">{tr('Kích hoạt')}:</span>{' '}
                      <strong>{formatVnDateTime(detailQuery.data.entitlementStartUtc)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
