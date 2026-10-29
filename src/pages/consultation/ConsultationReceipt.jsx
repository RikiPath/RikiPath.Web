import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { syncMeetingPurchase } from '../../api/mentorBookingApi.js';
import { bookingTime } from '../../utils/mentorBooking.js';
import IncludedMentorBooking from '../../components/consultation/IncludedMentorBooking.jsx';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function ConsultationReceipt() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const id = Number(params.get('subscriptionId') || params.get('orderCode')) || null;
  const query = useQuery({
    queryKey: ['meeting-purchase', id],
    queryFn: () => syncMeetingPurchase(id),
    enabled: Boolean(id),
    refetchInterval: (current) => (
      current.state.data?.paymentStatus === 'Pending' && !current.state.data?.isCheckoutExpired ? 15000 : false
    ),
  });
  const purchase = query.data;
  const paid = purchase?.paymentStatus === 'Paid';
  const pending = purchase?.paymentStatus === 'Pending' && !purchase.isCheckoutExpired;
  const checkoutUrl = id ? sessionStorage.getItem(`mentor-checkout:${user.userId}:${id}`) : null;
  const localCheckout = Boolean(checkoutUrl?.includes('/payment/local/'));
  const title = !id
    ? 'Chưa có giao dịch để xác nhận'
    : query.isPending
      ? 'Đang kiểm tra thanh toán…'
      : query.isError
        ? 'Chưa xác nhận được thanh toán'
        : paid
          ? 'Thanh toán thành công'
          : purchase?.isCheckoutExpired
            ? 'Đơn thanh toán đã hết hạn'
            : pending
              ? 'Đang chờ thanh toán'
              : 'Thanh toán chưa hoàn tất';

  return (
    <LearnerShell pathname={pathname} breadcrumb="Biên lai">
      <main className="mx-auto w-full max-w-[720px] px-4 py-6 text-[#49353F] sm:px-6">
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 sm:px-7">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#AD3155]">PAYOS</p>
          <h1 className="mt-2 text-[25px] font-semibold tracking-tight">{title}</h1>
          {!id && (
            <p className="mt-3 text-[13px] leading-6 text-[#927B88]">
              Trang này cần mã đơn mua. Chọn gói và tạo đơn để thanh toán.
            </p>
          )}
          {query.error && <p role="alert" className="mt-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
          {purchase && (
            <>
              <p className="mt-2 text-[13px] text-[#927B88]">Đơn #{purchase.subscriptionId}</p>
              <dl className="mt-5 space-y-3 rounded-2xl bg-[#FCEDF4] px-4 py-4 text-[13px]">
                <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Gói</dt><dd className="text-right font-medium">{purchase.planName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">Số buổi</dt><dd>{purchase.meetingSessionsIncluded}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#8C7782]">{paid ? 'Đã thanh toán' : 'Giá trị đơn'}</dt><dd className="text-[16px] font-semibold text-[#AD3155]">{money(purchase.amountPaid)}</dd></div>
                {purchase.transactionId && (
                  <div>
                    <dt className="text-[#8C7782]">Mã thanh toán</dt>
                    <dd className="mt-1 break-all font-mono text-[12px]">{purchase.transactionId}</dd>
                  </div>
                )}
              </dl>
              {purchase.bookings.map((booking) => (
                <div key={booking.id} className="mt-3 rounded-2xl border border-[#EADFE5] px-4 py-3 text-[13px]">
                  <p className="font-medium">{booking.mentorName || 'Mentor'} · Buổi #{booking.id}</p>
                  <p className="mt-1 text-[#927B88]">{bookingTime(booking.scheduledAt)} · giờ Việt Nam</p>
                  {paid && <Link to={`/consultation-session/?bookingId=${booking.id}`} className="mt-2 inline-block font-medium text-[#AD3155]">Xem chi tiết buổi</Link>}
                </div>
              ))}
              {paid && <p role="status" className="mt-4 text-[13px] text-[#2F6B45]">Lượt tư vấn đã được cộng vào tài khoản. Chọn lịch để sử dụng lượt.</p>}
              {pending && (
                <p className="mt-4 text-[13px] leading-6 text-[#927B88]">
                  {localCheckout
                    ? 'Xác nhận trên trang thanh toán local để cộng lượt. Không trừ tiền thật.'
                    : 'Hoàn tất thanh toán trên PayOS rồi quay lại đây. Trang kiểm tra trạng thái mỗi 15 giây.'}
                </p>
              )}
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/payments/history/" className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>Danh sách thanh toán</Link>
            {pending && checkoutUrl && (localCheckout
              ? <Link to={`/payment/local/?subscriptionId=${id}`} className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>Xác nhận thanh toán</Link>
              : <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>Mở PayOS để thanh toán</a>)}
            {id && (
              <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] disabled:opacity-40 ${focus}`}>
                {query.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}
              </button>
            )}
            <Link to="/booking-schedule/" className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>
              {paid ? 'Dùng lượt đặt lịch' : 'Về đặt lịch'}
            </Link>
          </div>
          {paid && <IncludedMentorBooking purchase={purchase} />}
        </section>
      </main>
    </LearnerShell>
  );
}
