import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { CircleCheck, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import { getStudyPurchaseStatus } from '@/features/checkout/api/subscriptionApi.js';
import { Badge, Banner, Button, Card, EmptyState, ErrorState, SakuraLoader, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * PayOS return for self-study plans. The status always comes from the Backend
 * (`GET /subscriptions/purchases/{id}`) — redirect query parameters are never
 * trusted, they are stripped by <PaymentReturn> before this page renders.
 */
export default function StudyPaymentReceipt() {
  const { tr, trf } = useLocale();
  const { state } = useLocation();
  const payment = state?.payment;
  const purchaseId = payment?.kind === 'study' ? payment.id : null;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['study-purchase', user?.userId, purchaseId],
    queryFn: () => getStudyPurchaseStatus(purchaseId),
    enabled: Boolean(purchaseId),
    refetchInterval: (q) => (q.state.data === 'Pending' ? 5000 : false),
  });
  const status = query.data;
  const announcedRef = useRef(null);

  useEffect(() => {
    if (!purchaseId || !status || announcedRef.current === status) return;
    announcedRef.current = status;
    if (status === 'Paid') {
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
      notify.success('Thanh toán thành công', 'Quyền sử dụng gói tự học đã được kích hoạt.', {
        key: `study-receipt-${purchaseId}-paid`,
      });
    } else if (status === 'Pending') {
      notify.info('Đang xác nhận thanh toán', 'Hệ thống đang đối chiếu kết quả với PayOS…', {
        key: `study-receipt-${purchaseId}-pending`,
      });
    } else {
      notify.warning('Thanh toán chưa hoàn tất', 'Chưa ghi nhận thanh toán thành công cho đơn này.', {
        key: `study-receipt-${purchaseId}-other`,
      });
    }
  }, [status, purchaseId, queryClient]);

  let view;
  if (!purchaseId) {
    view = (
      <EmptyState
        art="search"
        title={tr('Không có giao dịch để kiểm tra')}
        description={tr('Trang biên lai chỉ hiển thị giao dịch do hệ thống tạo. Bạn có thể xem gói tự học hoặc lớp học nhóm của mình.')}
        action={
          <>
            <Link to="/plans/" className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white rp-press">{tr('Gói tự học')}</Link>
            <Link to="/my-courses/" className="rp-focus inline-flex h-10 items-center rounded-rp-input border border-rp-line bg-rp-surface px-4 text-sm font-semibold text-rp-text">{tr('Lớp học nhóm')}</Link>
          </>
        }
      />
    );
  } else if (query.isPending) {
    view = <SakuraLoader variant="section" context="payment" label={tr('Đang xác minh thanh toán với máy chủ')} />;
  } else if (query.isError) {
    view = <ErrorState error={query.error} title={tr('Chưa xác nhận được thanh toán')} onRetry={() => query.refetch()} retrying={query.isFetching} />;
  } else {
    const paid = status === 'Paid';
    const pending = status === 'Pending';
    const Icon = paid ? CircleCheck : pending ? Clock : XCircle;
    view = (
      <div className="text-center">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${paid ? 'bg-rp-success-bg text-rp-success' : pending ? 'bg-rp-warning-bg text-rp-warning' : 'bg-rp-muted text-rp-text-2'}`}>
          <Icon aria-hidden="true" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-rp-text">
          {paid ? tr('Thanh toán thành công') : pending ? tr('Đang chờ PayOS xác nhận') : tr('Thanh toán chưa hoàn tất')}
        </h1>
        <div className="mt-2 flex justify-center">
          <Badge tone={paid ? 'success' : pending ? 'warning' : 'neutral'}>{trf('Đơn gói tự học #{0}', { 0: purchaseId })}</Badge>
        </div>
        {paid && <Banner tone="success" className="mt-5 text-left">{tr('Quyền sử dụng gói đã được cấp vào tài khoản của bạn.')}</Banner>}
        {pending && <Banner tone="info" className="mt-5 text-left">{tr('Trang tự kiểm tra lại mỗi 5 giây. Bạn có thể đóng trang; quyền sử dụng sẽ được cấp khi máy chủ xác minh xong.')}</Banner>}
        {!paid && !pending && <Banner tone="warning" className="mt-5 text-left">{tr('Bạn đã hủy hoặc chưa hoàn tất thanh toán. Không có khoản nào được ghi nhận cho đơn này.')}</Banner>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to={paid ? '/app/' : '/plans/'} className="rp-focus inline-flex h-10 items-center rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press">
            {paid ? tr('Bắt đầu học') : tr('Về gói tự học')}
          </Link>
          {!paid && (
            <Button variant="secondary" icon={RefreshCw} onClick={() => query.refetch()} loading={query.isFetching}>{tr('Kiểm tra lại')}</Button>
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
