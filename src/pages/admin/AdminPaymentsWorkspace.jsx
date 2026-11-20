import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, Eye, RotateCcw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DataTable,
  DateInput,
  FeatureIcon,
  Input,
  Modal,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
} from '@/components/ui';
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
  const { tr } = useLocale();

  const [stream, setStream] = useState('all');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

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
        <div className="min-w-0 max-w-[165px]">
          <p className="truncate font-medium text-rp-text">{row.learnerName}</p>
          {row.learnerEmail && <p className="truncate text-xs text-rp-text-muted">{row.learnerEmail}</p>}
        </div>
      ),
    },
    {
      key: 'itemTitle',
      header: tr('Gói / Khóa học'),
      render: (row) => (
        <div className="min-w-0 max-w-[180px]">
          <p className="truncate font-medium text-rp-text">{row.itemTitle}</p>
          <span className="text-[11px] text-rp-text-muted">
            {tr(STREAM_LABELS[row.stream] || row.stream)}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: tr('Số tiền'),
      align: 'right',
      render: (row) => <span className="whitespace-nowrap font-bold tabular-nums text-rp-brand-strong">{money(row.amount)}</span>,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (row) => {
        const meta = STATUS_META[row.status] || { label: row.status, tone: 'neutral' };
        return <Badge tone={meta.tone} size="sm" icon={false}>{tr(meta.label)}</Badge>;
      },
    },
  ];

  const hasActiveFilter = stream !== 'all' || status !== 'All' || search.trim() || fromDate || toDate;

  return (
    <AdminShell breadcrumb={tr('Thanh toán & giao dịch')}>
      <main className="rp-container py-[var(--rp-space-page-y)] space-y-5 text-rp-text">
        <PageHeader
          eyebrow={tr('Điều hành & đối soát')}
          title={
            <span className="inline-flex items-center gap-2.5">
              <FeatureIcon feature="payment" size="lg" />
              <span>{tr('Thanh toán & giao dịch')}</span>
            </span>
          }
          description={tr('Theo dõi toàn bộ giao dịch PayOS từ gói tự học, lượt AI và khóa học nhóm. Chỉ đối soát tự động qua webhook có chữ ký xác thực.')}
          actions={<RefreshingIndicator active={paymentsQuery.isFetching || gatewayQuery.isFetching} />}
        />

        {/* PayOS Readiness Card (strictly non-sensitive) */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-rp-brand-strong">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-rp-text">{tr('Trạng thái cổng thanh toán PayOS')}</h2>
                  {gateway && (
                    <Badge tone={gateway.isReady ? 'success' : 'warning'} size="sm" icon={false}>
                      {gateway.isReady ? tr('Sẵn sàng nhận thanh toán') : tr('Chưa đủ cấu hình URL/Key')}
                    </Badge>
                  )}
                </div>
                {gateway && (
                  <p className="mt-0.5 break-all text-xs text-rp-text-muted">
                    {tr('Webhook')}: <code className="rounded bg-rp-bg-2 px-1.5 py-0.5">{gateway.webhookEndpointPath}</code>
                    {gateway.webReturnUrl ? ` · Return: ${gateway.webReturnUrl}` : ''}
                  </p>
                )}
              </div>
            </div>

            {gateway && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  ['Client ID', gateway.clientIdConfigured],
                  ['API Key', gateway.apiKeyConfigured],
                  ['Checksum Key', gateway.checksumKeyConfigured],
                  [tr('Chữ ký Webhook'), gateway.webhookSignatureVerificationEnabled],
                ].map(([label, ok]) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium ${
                      ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Summary KPI Strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng giao dịch trong bộ lọc')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rp-text">{summary.totalCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Đã thanh toán')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{summary.paidCount}</p>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-rp-text-2">{money(summary.totalPaidAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Đang chờ thanh toán')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{summary.pendingCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Cần xem xét / Lỗi / Hủy')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rp-brand-strong">
              {summary.reviewCount} / {summary.failedOrCancelledCount}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[220px] flex-1">
              <Input
                type="search"
                icon={Search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={tr('Tìm mã đơn, email, tên học viên, tên gói…')}
                aria-label={tr('Tìm kiếm giao dịch')}
              />
            </div>
            <div className="w-full sm:w-[175px]">
              <CustomSelect
                value={stream}
                onChange={(val) => {
                  setStream(val);
                  setPage(1);
                }}
                aria-label={tr('Lọc theo luồng')}
                options={[
                  { value: 'all', label: tr('Tất cả luồng') },
                  { value: 'subscription', label: tr('Gói tự học & AI') },
                  { value: 'study_course', label: tr('Lớp học nhóm') },
                  { value: 'ai_topup', label: tr('Nạp lượt AI') },
                ]}
              />
            </div>
            <div className="w-full sm:w-[170px]">
              <CustomSelect
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPage(1);
                }}
                aria-label={tr('Lọc theo trạng thái')}
                options={[
                  { value: 'All', label: tr('Tất cả trạng thái') },
                  { value: 'Paid', label: tr('Đã thanh toán') },
                  { value: 'Pending', label: tr('Đang chờ') },
                  { value: 'PaymentReview', label: tr('Cần xem xét') },
                  { value: 'Failed', label: tr('Thất bại') },
                  { value: 'Cancelled', label: tr('Đã hủy') },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateInput
                aria-label={tr('Từ ngày')}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[140px]"
              />
              <span className="hidden text-xs text-rp-text-muted sm:inline">→</span>
              <DateInput
                aria-label={tr('Đến ngày')}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[140px]"
              />
            </div>
            {hasActiveFilter && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetFilters}>
                {tr('Đặt lại')}
              </Button>
            )}
          </div>
        </Card>

        {paymentsQuery.isPending && !ledger ? (
          <SakuraLoader variant="section" context="payment" label={tr('Đang tải lịch sử giao dịch…')} delay={120} />
        ) : paymentsQuery.isError && !ledger ? (
          <Card>
            <ContextualErrorState
              error={paymentsQuery.error}
              title={tr('Chưa tải được danh sách giao dịch')}
              onRetry={() => paymentsQuery.refetch()}
              retrying={paymentsQuery.isFetching}
            />
          </Card>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(row) => row.key}
            minTableWidth="min-w-full"
            page={ledger?.page ?? page}
            total={ledger?.totalCount ?? 0}
            pageSize={ledger?.pageSize ?? pageSize}
            onPageChange={setPage}
            itemLabel={tr('giao dịch')}
            caption={tr('Lịch sử giao dịch PayOS')}
            empty={
              <ContextualEmptyState
                compact
                title={tr('Không có giao dịch nào phù hợp.')}
                description={hasActiveFilter ? tr('Thử mở rộng khoảng ngày hoặc xóa bộ lọc.') : tr('Chưa phát sinh đơn hàng nào trên hệ thống.')}
              />
            }
            rowActions={(row) => (
              <Button
                size="sm"
                variant="outline"
                icon={Eye}
                className="whitespace-nowrap"
                onClick={() => setSelectedRef(row)}
                data-testid={`payment-detail-${row.key}`}
              >
                {tr('Chi tiết')}
              </Button>
            )}
          />
        )}
      </main>

      {/* Transaction Detail Modal */}
      <Modal
        open={Boolean(selectedRef)}
        onClose={() => setSelectedRef(null)}
        title={selectedRef ? `${tr('Chi tiết giao dịch')} #${selectedRef.orderCode}` : ''}
        description={tr('Thông tin đối soát chỉ đọc — không cho phép chỉnh sửa thủ công trạng thái thanh toán.')}
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
                <p className="text-xs text-rp-text-muted">{tr('Mã đơn PayOS')}</p>
                <p className="font-mono font-semibold text-rp-text">#{detailQuery.data.orderCode}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Trạng thái')}</p>
                <div className="mt-0.5">
                  <Badge
                    tone={(STATUS_META[detailQuery.data.status] || { tone: 'neutral' }).tone}
                    size="sm"
                    icon={false}
                  >
                    {tr((STATUS_META[detailQuery.data.status] || { label: detailQuery.data.status }).label)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Học viên')}</p>
                <p className="font-medium text-rp-text">{detailQuery.data.learnerName}</p>
                <p className="text-xs text-rp-text-muted">{detailQuery.data.learnerEmail}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Số tiền thanh toán')}</p>
                <p className="text-lg font-bold tabular-nums text-rp-brand-strong">{money(detailQuery.data.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Sản phẩm / Gói')}</p>
                <p className="font-medium text-rp-text">{detailQuery.data.itemTitle}</p>
              </div>
              <div>
                <p className="text-xs text-rp-text-muted">{tr('Mã tham chiếu PayOS')}</p>
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
                <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{tr('Ảnh chụp quyền lợi đơn hàng (Snapshot)')}</span>
                </h4>
                <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-3">
                  {detailQuery.data.durationDaysSnapshot != null && (
                    <div>
                      <span className="text-rp-text-muted">{tr('Thời hạn chốt')}:</span>{' '}
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

            {detailQuery.data.orderSnapshotJson && (
              <details className="rounded-xl border border-rp-line bg-rp-bg-2/60 p-3 text-xs">
                <summary className="cursor-pointer font-medium text-rp-brand-strong">{tr('OrderSnapshot JSON (bất biến)')}</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-rp-text-2">
                  {detailQuery.data.orderSnapshotJson}
                </pre>
              </details>
            )}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
