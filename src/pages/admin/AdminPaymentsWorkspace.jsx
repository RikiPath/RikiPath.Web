import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Field,
  Input,
  Modal,
  SakuraLoader,
  SearchInput,
  Textarea,
  notify,
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
  refundStudyCoursePayment,
} from '@/features/admin/api/adminApi.js';
import { ADMIN_KEYS } from '@/features/admin/api/adminQueryKeys.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const STATUS_META = {
  Paid: { label: 'Đã thanh toán', tone: 'success' },
  PartiallyRefunded: { label: 'Đã hoàn một phần', tone: 'warning' },
  Pending: { label: 'Đang chờ', tone: 'warning' },
  Expired: { label: 'Hết hạn giữ chỗ', tone: 'neutral' },
  PaymentReview: { label: 'Cần xem xét', tone: 'danger' },
  Failed: { label: 'Thất bại', tone: 'danger' },
  Cancelled: { label: 'Đã hủy', tone: 'neutral' },
  Refunded: { label: 'Đã hoàn tiền', tone: 'info' },
};

const STREAM_LABELS = {
  subscription: 'Gói tự học & AI',
  study_course: 'Lớp học nhóm',
  ai_topup: 'Nạp lượt AI',
};

const money = (amount) => `${Number(amount || 0).toLocaleString(currentIntlTag())} ₫`;

export default function AdminPaymentsWorkspace() {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [stream, setStream] = useState('all');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [selectedRef, setSelectedRef] = useState(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmountInput, setRefundAmountInput] = useState('');

  const refundMutation = useMutation({
    mutationFn: ({ id, reason, refundAmount }) => refundStudyCoursePayment(id, reason, refundAmount),
    onSuccess: async () => {
      notify.success(tr('Đã xác nhận hoàn học phí cho giao dịch này.'));
      setShowRefundForm(false);
      setRefundReason('');
      setRefundAmountInput('');
      window.dispatchEvent(new CustomEvent('rikipath:payment-updated'));
      try {
        window.localStorage.setItem('rikipath:payment-updated', String(Date.now()));
      } catch {
        // ignore storage restrictions
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-payments-unfiltered-count'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-payment-detail'] }),
        queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.dashboard }),
        invalidateSidebarCounters(queryClient),
      ]);
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa thể xác nhận hoàn học phí'));
    },
  });

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
      align: 'left',
      compact: true,
      render: (row) => (
        <div className="min-w-0">
          <span className="text-[13px] font-semibold tabular-nums text-rp-text">#{row.orderCode}</span>
          <p className="mt-0.5 whitespace-nowrap text-[11.5px] tabular-nums text-rp-text-muted">{formatVnDateTime(row.createdAtUtc)}</p>
        </div>
      ),
    },
    {
      key: 'learnerName',
      header: tr('Học viên'),
      align: 'left',
      render: (row) => (
        <div className="min-w-0 max-w-[260px]">
          <p title={row.learnerName} className="truncate font-semibold text-rp-text">{row.learnerName}</p>
          {row.learnerEmail && <p title={row.learnerEmail} className="truncate text-xs text-rp-text-muted">{row.learnerEmail}</p>}
        </div>
      ),
    },
    {
      key: 'itemTitle',
      header: tr('Gói / Khóa học'),
      align: 'left',
      render: (row) => (
        <div className="min-w-0 max-w-[280px]">
          <p title={row.itemTitle} className="truncate font-medium text-rp-text">{row.itemTitle}</p>
          <span className="text-[11.5px] text-rp-text-muted">
            {tr(STREAM_LABELS[row.stream] || 'Thanh toán khác')}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: tr('Số tiền'),
      align: 'right',
      compact: true,
      render: (row) => (
        <div className="whitespace-nowrap text-right">
          <span className="font-bold tabular-nums text-rp-brand-strong">{money(row.amount)}</span>
          {Number(row.refundedAmount || 0) > 0 && (
            <p className="mt-0.5 text-[11px] tabular-nums text-rp-warning">
              {tr('Hoàn')}: {money(row.refundedAmount)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
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
              label="Thực thu hệ thống"
              value={money(summary.netCollectedAmount ?? summary.totalPaidAmount)}
              subtext={trf('{0} đơn thanh toán thành công', { 0: summary.paidCount })}
            />
            <AdminStatCard
              icon={CheckCircle2}
              tone="success"
              label="Học phí lớp học"
              value={money(summary.courseTuitionRevenue || 0)}
              subtext={trf('Gói dịch vụ: {0}', { 0: money(summary.subscriptionRevenue || 0) })}
            />
            <AdminStatCard
              icon={Clock}
              tone="warning"
              label="Đang chờ thanh toán"
              value={summary.pendingCount}
              subtext={
                Number(summary.expiredCount || 0) > 0
                  ? trf('{0} hết hạn giữ chỗ', { 0: summary.expiredCount })
                  : tr('Chờ học viên hoàn tất')
              }
            />
            <AdminStatCard
              icon={XCircle}
              tone="danger"
              label="Cần rà soát / Hoàn tiền"
              value={Number(summary.reviewCount || 0) + Number(summary.refundedCount || 0)}
              subtext={
                Number(summary.totalRefundedAmount || 0) > 0
                  ? trf('{0} rà soát · Hoàn: {1}', { 0: summary.reviewCount || 0, 1: money(summary.totalRefundedAmount) })
                  : trf('{0} cần rà soát · {1} lỗi/hủy', { 0: summary.reviewCount || 0, 1: summary.failedOrCancelledCount || 0 })
              }
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
            aria-label={tr('Nguồn')}
            options={[
              { value: 'all', label: tr('Tất cả') },
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
            aria-label={tr('Trạng thái')}
            options={[
              { value: 'All', label: tr('Tất cả') },
              { value: 'Paid', label: tr('Đã thanh toán'), dotClass: 'bg-[#16A34A]' },
              { value: 'Pending', label: tr('Đang chờ'), dotClass: 'bg-[#D97706]' },
              { value: 'Expired', label: tr('Hết hạn giữ chỗ'), dotClass: 'bg-[#94A3B8]' },
              { value: 'PaymentReview', label: tr('Cần xem xét'), dotClass: 'bg-[#DC2626]' },
              { value: 'PartiallyRefunded', label: tr('Đã hoàn một phần'), dotClass: 'bg-[#D97706]' },
              { value: 'Refunded', label: tr('Đã hoàn tiền'), dotClass: 'bg-[#2563EB]' },
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

      {/* Transaction Detail & Refund Verification Modal */}
      {(() => {
        const detail = detailQuery.data;
        const detailRefunded = Number(detail?.refundedAmount || 0);
        const detailRemaining = Math.max(0, Number(detail?.amount || 0) - detailRefunded);
        const canRefundCourse = Boolean(
          detail?.stream === 'study_course'
          && detailRemaining > 0
          && ['PaymentReview', 'Paid', 'PartiallyRefunded'].includes(detail.status),
        );
        const parsedRefundAmount = Number(refundAmountInput);
        const isRefundAmountValid = Number.isFinite(parsedRefundAmount)
          && Math.trunc(parsedRefundAmount) > 0
          && Math.trunc(parsedRefundAmount) <= detailRemaining;

        const closeDetailModal = () => {
          if (refundMutation.isPending) return;
          setSelectedRef(null);
          setShowRefundForm(false);
          setRefundReason('');
          setRefundAmountInput('');
        };

        return (
          <Modal
            open={Boolean(selectedRef)}
            onClose={closeDetailModal}
            title={selectedRef ? `${tr('Chi tiết giao dịch')} #${selectedRef.orderCode}` : ''}
            description={tr('Đối soát thanh toán tự động và xác nhận hoàn tiền khi đủ điều kiện.')}
            size="lg"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                {canRefundCourse && !showRefundForm ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setShowRefundForm(true);
                      setRefundAmountInput(String(Math.trunc(detailRemaining)));
                    }}
                  >
                    {tr('Xác nhận hoàn học phí')}
                  </Button>
                ) : <span />}
                <Button
                  variant="outline"
                  disabled={refundMutation.isPending}
                  onClick={closeDetailModal}
                >
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
            ) : detail ? (
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Mã đơn hàng')}</p>
                    <p className="font-mono font-semibold text-rp-text">#{detail.orderCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Trạng thái')}</p>
                    <div className="mt-1">
                      <AdminStatusBadge
                        tone={(STATUS_META[detail.status] || { tone: 'neutral' }).tone}
                        label={(STATUS_META[detail.status] || { label: detail.status }).label}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Học viên')}</p>
                    <p className="font-semibold text-rp-text">{detail.learnerName}</p>
                    <p className="text-xs text-rp-text-muted">{detail.learnerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Số tiền thanh toán')}</p>
                    <p className="text-lg font-bold tabular-nums text-rp-brand-strong">{money(detail.amount)}</p>
                    {detailRefunded > 0 && (
                      <p className="mt-0.5 text-xs tabular-nums text-rp-warning">
                        {tr('Đã hoàn')}: {money(detailRefunded)} · {tr('Thực thu')}: {money(detailRemaining)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Sản phẩm / Gói')}</p>
                    <p className="font-medium text-rp-text">{detail.itemTitle}</p>
                    <p className="text-xs text-rp-text-muted">{tr(STREAM_LABELS[detail.stream] || 'Thanh toán khác')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Mã tham chiếu giao dịch')}</p>
                    <p className="font-mono text-xs text-rp-text-2">
                      {detail.providerPaymentReference || detail.paymentReference || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Thời điểm tạo đơn')}</p>
                    <p className="text-xs text-rp-text-2">{formatVnDateTime(detail.createdAtUtc)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rp-text-muted">{tr('Thời điểm xác nhận')}</p>
                    <p className="text-xs text-rp-text-2">
                      {detail.paidAtUtc ? formatVnDateTime(detail.paidAtUtc) : '—'}
                    </p>
                  </div>
                </div>

                {detail.statusReason && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <strong>{tr('Ghi chú trạng thái')}:</strong> {detail.statusReason}
                  </div>
                )}

                {(detail.entitlementStartUtc || detail.aiQuota != null || detail.durationDaysSnapshot != null) && (
                  <div className="rounded-xl border border-rp-line p-4">
                    <h4 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.04em] text-rp-text-2">
                      <CreditCard className="h-3.5 w-3.5 text-[#C84666]" />
                      <span>{tr('Quyền lợi ghi nhận khi mua')}</span>
                    </h4>
                    <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-3">
                      {detail.durationDaysSnapshot != null && (
                        <div>
                          <span className="text-rp-text-muted">{tr('Thời hạn sử dụng')}:</span>{' '}
                          <strong>{detail.durationDaysSnapshot} {tr('ngày')}</strong>
                        </div>
                      )}
                      {detail.aiQuota != null && (
                        <div>
                          <span className="text-rp-text-muted">{tr('Lượt AI')}:</span>{' '}
                          <strong>{detail.aiUsed ?? 0} / {detail.aiQuota}</strong>
                        </div>
                      )}
                      {detail.entitlementStartUtc && (
                        <div>
                          <span className="text-rp-text-muted">{tr('Kích hoạt')}:</span>{' '}
                          <strong>{formatVnDateTime(detail.entitlementStartUtc)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showRefundForm && detail.stream === 'study_course' && (
                  <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.04em] text-red-900">
                        {tr('Xác nhận hoàn học phí')}
                      </h4>
                      <p className="mt-1 text-xs text-red-900/80">
                        {tr('Hoàn toàn phần sẽ đánh dấu Đã hoàn tiền và hủy suất ghi danh; hoàn một phần sẽ cập nhật số tiền thực thu của lớp.')}
                      </p>
                    </div>
                    <Field label={tr('Số tiền hoàn (VND)')} required hint={trf('Tối đa còn lại: {0}', { 0: money(detailRemaining) })}>
                      <Input
                        type="number"
                        min={1}
                        max={Math.trunc(detailRemaining)}
                        step={1000}
                        disabled={refundMutation.isPending}
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                      />
                    </Field>
                    <Field label={tr('Lý do hoàn tiền')} required>
                      <Textarea
                        rows={3}
                        maxLength={1000}
                        disabled={refundMutation.isPending}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder={tr('Ví dụ: Lớp hủy trước ngày bắt đầu / Hoàn chênh lệch học phí…')}
                      />
                    </Field>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={refundMutation.isPending}
                        onClick={() => {
                          setShowRefundForm(false);
                          setRefundReason('');
                          setRefundAmountInput('');
                        }}
                      >
                        {tr('Hủy')}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        loading={refundMutation.isPending}
                        disabled={refundMutation.isPending || !refundReason.trim() || !isRefundAmountValid}
                        onClick={() =>
                          refundMutation.mutate({
                            id: detail.recordId,
                            reason: refundReason.trim(),
                            refundAmount: Math.trunc(parsedRefundAmount),
                          })
                        }
                      >
                        {tr('Xác nhận đã hoàn tiền')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Modal>
        );
      })()}
    </AdminShell>
  );
}
