import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { confirmLocalPurchase, getPurchaseStatus } from '../../api/mentorBookingApi.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function LocalCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const id = Number(params.get('subscriptionId')) || null;
  const query = useQuery({
    queryKey: ['meeting-purchase', id],
    queryFn: () => getPurchaseStatus(id),
    enabled: Boolean(id),
  });
  const purchase = query.data;
  const pending = purchase?.paymentStatus === 'Pending' && !purchase.isCheckoutExpired;
  const confirm = useMutation({
    mutationFn: () => confirmLocalPurchase(id),
    onSuccess: async (result) => {
      cache.setQueryData(['meeting-purchase', id], result);
      await cache.invalidateQueries({ queryKey: ['mentor-purchases'] });
      navigate(`/consultation-receipt/?subscriptionId=${id}`);
    },
  });

  return (
    <LearnerShell breadcrumb="Thanh toán">
      <main className="mx-auto w-full max-w-[720px] px-4 py-6 text-[#49353F] sm:px-6">
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 sm:px-7">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#AD3155]">THANH TOÁN LOCAL</p>
          <h1 className="mt-2 text-[25px] font-semibold tracking-tight">Xác nhận mua gói</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#927B88]">
            Máy này chưa có khóa PayOS. Bấm xác nhận để cộng lượt trên môi trường Development. Không trừ tiền thật.
          </p>
          {!id && <p className="mt-4 text-[13px] text-[#927B88]">Thiếu mã đơn.</p>}
          {query.error && <p role="alert" className="mt-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
          {confirm.error && <p role="alert" className="mt-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{confirm.error.message}</p>}
          {query.isPending && id && <p className="mt-4 text-[13px] text-[#9A8390]">Đang tải đơn…</p>}
          {purchase && (
            <dl className="mt-5 space-y-3 rounded-2xl bg-[#FCEDF4] px-4 py-4 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Đơn</dt><dd>#{purchase.subscriptionId}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Gói</dt><dd className="text-right font-medium">{purchase.planName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Số buổi</dt><dd>{purchase.meetingSessionsIncluded}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Số tiền</dt><dd className="text-[16px] font-semibold text-[#AD3155]">{money(purchase.amountPaid)}</dd></div>
            </dl>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {pending && (
              <button
                type="button"
                disabled={confirm.isPending}
                onClick={() => confirm.mutate()}
                className={`inline-flex h-10 items-center rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
              >
                {confirm.isPending ? 'Đang xác nhận…' : 'Xác nhận thanh toán'}
              </button>
            )}
            {purchase?.paymentStatus === 'Paid' && (
              <Link to={`/consultation-receipt/?subscriptionId=${id}`} className={`inline-flex h-10 items-center rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
                Xem biên lai
              </Link>
            )}
            <Link to="/payments/" className={`inline-flex h-10 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>
              Về danh sách gói
            </Link>
          </div>
        </section>
      </main>
    </LearnerShell>
  );
}
