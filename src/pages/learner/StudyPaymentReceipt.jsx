import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { CircleCheck, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import { getStudyPurchaseStatus } from '@/features/checkout/api/subscriptionApi.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { Badge, Banner, Button, Card, EmptyState, ErrorState, SakuraLoader, notify } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

const PENDING_PURCHASE_STORAGE_KEY = 'rikipath.pendingStudyPurchaseId';
const MAX_PENDING_POLLS = 24;
// Bounded backoff while PayOS confirms: quick at first (webhooks usually land within seconds), then slower.
const POLL_DELAYS_MS = [2000, 3000, 5000, 8000, 13000];

function readStoredPurchaseId() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function clearStoredPurchaseId() {
  try {
    window.sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(currentIntlTag(), { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function statusCopy(status, tr) {
  switch (status) {
    case 'Paid':
      return {
        title: tr('Thanh toán thành công'),
        banner: tr('Thanh toán thành công. Gói học của bạn đã được kích hoạt.'),
        tone: 'success',
      };
    case 'Pending':
      return { title: tr('Đang xác nhận thanh toán'), tone: 'warning' };
    case 'Cancelled':
      return {
        title: tr('Bạn đã hủy thanh toán'),
        banner: tr('Đơn hàng đã được hủy trên PayOS. Không có khoản nào được ghi nhận và quyền lợi chưa được cấp.'),
        tone: 'neutral',
      };
    case 'Expired':
      return {
        title: tr('Liên kết thanh toán đã hết hạn'),
        banner: tr('Đơn hàng đã quá thời gian thanh toán. Bạn có thể quay lại danh sách gói để tạo đơn mới.'),
        tone: 'neutral',
      };
    default:
      return {
        title: tr('Thanh toán chưa hoàn tất'),
        banner: tr('Chưa ghi nhận thanh toán thành công cho đơn này. Nếu tài khoản của bạn đã bị trừ tiền, hãy liên hệ hỗ trợ kèm mã đơn.'),
        tone: 'neutral',
      };
  }
}

/**
 * PayOS return for self-study plans. The status always comes from the Backend
 * (`GET /subscriptions/purchases/{id}`, which reconciles server-to-server with PayOS) — redirect query
 * parameters are never trusted, they are stripped by <PaymentReturn> before this page renders.
 */
export default function StudyPaymentReceipt() {
  const { tr, trf } = useLocale();
  const { state } = useLocation();
  const payment = state?.payment;
  const [storedId] = useState(() => readStoredPurchaseId());
  const purchaseId = payment?.kind === 'study' ? payment.id : storedId;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const access = useStudyAccess();
  const pollCountRef = useRef(0);
  const [pollExhausted, setPollExhausted] = useState(false);

  const query = useQuery({
    queryKey: ['study-purchase', user?.userId, purchaseId],
    queryFn: async () => {
      pollCountRef.current += 1;
      return getStudyPurchaseStatus(purchaseId);
    },
    enabled: Boolean(purchaseId),
    refetchOnWindowFocus: (q) => q.state.data === 'Pending',
    refetchInterval: (q) => {
      if (q.state.data !== 'Pending') return false;
      if (pollCountRef.current >= MAX_PENDING_POLLS) {
        setPollExhausted(true);
        return false;
      }
      return POLL_DELAYS_MS[Math.min(pollCountRef.current - 1, POLL_DELAYS_MS.length - 1)] ?? 5000;
    },
  });
  const status = query.data;
  const announcedRef = useRef(null);

  useEffect(() => {
    if (!purchaseId || !status || announcedRef.current === status) return;
    announcedRef.current = status;
    if (status === 'Paid') {
      clearStoredPurchaseId();
      // Entitlements, AI credits and plan locks all read this one cache: refresh it now, no re-login needed.
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['ai-learning-path'] });
      // The verified purchase becomes a server-side Learning Moment (PURCHASE_COMPLETED); refresh the queue so the
      // celebration shows now instead of on the next navigation. Claiming keeps it to one popup across tabs/devices.
      void queryClient.invalidateQueries({ queryKey: ['learning-moments'] });
      notify.success(tr('Thanh toán thành công'), tr('Gói học của bạn đã được kích hoạt.'), {
        key: `study-receipt-${purchaseId}-paid`,
      });
    } else if (status === 'Pending') {
      notify.info(tr('Đang xác nhận thanh toán'), tr('Hệ thống đang đối chiếu kết quả với PayOS…'), {
        key: `study-receipt-${purchaseId}-pending`,
      });
    } else {
      clearStoredPurchaseId();
      notify.warning(tr('Thanh toán chưa hoàn tất'), tr('Chưa ghi nhận thanh toán thành công cho đơn này.'), {
        key: `study-receipt-${purchaseId}-other`,
      });
    }
  }, [status, purchaseId, queryClient, tr]);

  function handleManualRecheck() {
    pollCountRef.current = 0;
    setPollExhausted(false);
    void query.refetch();
  }

  const purchased = status === 'Paid'
    ? (access.data?.purchases || []).find((item) => item.id === purchaseId)
    : null;

  let view;
  if (!purchaseId) {
    view = (
      <EmptyState
        illustration="clock"
        title={tr('Không có giao dịch để kiểm tra')}
        description={tr('Trang biên lai chỉ hiển thị giao dịch do hệ thống tạo. Bạn có thể xem gói tự học hoặc lớp học nhóm của mình.')}
        action={
          <>
            <Link to="/plans/" className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white rp-press">
              {tr('Gói tự học')}
            </Link>
            <Link to="/my-courses/" className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text">
              {tr('Lớp học nhóm')}
            </Link>
          </>
        }
      />
    );
  } else if (query.isPending) {
    view = <SakuraLoader variant="section" context="payment" label={tr('Đang xác minh thanh toán với máy chủ')} />;
  } else if (query.isError) {
    view = (
      <ErrorState
        error={query.error}
        title={tr('Chưa xác nhận được thanh toán')}
        onRetry={handleManualRecheck}
        retrying={query.isFetching}
      />
    );
  } else {
    const paid = status === 'Paid';
    const pending = status === 'Pending';
    const copy = statusCopy(status, tr);
    const StatusIcon = paid ? CircleCheck : pending ? Clock : XCircle;
    view = (
      <div className="text-center">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            paid ? 'bg-rp-success-bg text-rp-success' : pending ? 'bg-rp-warning-bg text-rp-warning' : 'bg-rp-muted text-rp-text-2'
          }`}
        >
          <StatusIcon aria-hidden="true" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-rp-text" aria-live="polite">{copy.title}</h1>
        <div className="mt-2 flex justify-center">
          <Badge tone={paid ? 'success' : pending ? 'warning' : 'neutral'}>
            {trf('Đơn gói tự học #{0}', { 0: purchaseId })}
          </Badge>
        </div>
        {paid && (
          <Banner tone="success" className="mt-5 text-left">
            {copy.banner}
          </Banner>
        )}
        {paid && purchased && (
          <dl className="mt-4 grid gap-2 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-4 text-left text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-rp-text-muted">{tr('Gói học')}</dt>
              <dd className="font-bold text-rp-navy">{purchased.planName}</dd>
            </div>
            {purchased.startDate && (
              <div>
                <dt className="text-xs text-rp-text-muted">{tr('Ngày kích hoạt')}</dt>
                <dd className="font-semibold text-rp-text">{formatDate(purchased.startDate)}</dd>
              </div>
            )}
            {purchased.endDate && (
              <div>
                <dt className="text-xs text-rp-text-muted">{tr('Hiệu lực đến')}</dt>
                <dd className="font-semibold text-rp-text">{formatDate(purchased.endDate)}</dd>
              </div>
            )}
            {purchased.aiUsesRemaining > 0 && (
              <div>
                <dt className="text-xs text-rp-text-muted">{tr('Lượt AI của gói')}</dt>
                <dd className="font-semibold text-rp-text">{trf('{0} lượt', { 0: purchased.aiUsesRemaining })}</dd>
              </div>
            )}
          </dl>
        )}
        {pending && (
          <Banner tone={pollExhausted ? 'warning' : 'info'} className="mt-5 text-left">
            {pollExhausted
              ? tr('PayOS xác nhận chậm hơn bình thường. Vui lòng bấm Kiểm tra lại để cập nhật trạng thái đơn hàng.')
              : tr('Trang sẽ tự kiểm tra lại trong ít giây. Bạn có thể đóng trang; quyền sử dụng sẽ được cấp khi máy chủ xác minh xong.')}
          </Banner>
        )}
        {!paid && !pending ? (
          <Banner tone="warning" className="mt-5 text-left">
            {copy.banner}
          </Banner>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to={paid ? '/app/' : '/plans/'}
            className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press"
          >
            {paid ? tr('Bắt đầu học') : tr('Về gói tự học')}
          </Link>
          {pending && (
            <Button variant="secondary" icon={RefreshCw} onClick={handleManualRecheck} loading={query.isFetching}>
              {tr('Kiểm tra lại')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <LearnerShell breadcrumb={tr('Biên lai thanh toán')}>
      <div className="mx-auto max-w-xl px-4 py-6">
        <Card className="p-5 sm:p-6">{view}</Card>
      </div>
    </LearnerShell>
  );
}
