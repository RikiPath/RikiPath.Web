import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { getStudyPurchaseStatus } from '../../api/subscriptions.js';
import { syncMeetingPurchase } from '../../api/mentorBookingApi.js';
import { bookingTime } from '../../utils/mentorBooking.js';
import IncludedMentorBooking from '../../components/consultation/IncludedMentorBooking.jsx';

export default function ConsultationReceipt() {
  const { state } = useLocation();
  const payment = state?.payment;
  return payment?.kind === 'study'
    ? <StudyReceipt purchaseId={payment.id} />
    : <MentorReceipt id={payment?.id} />;
}

function StudyReceipt({ purchaseId }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCancel = pathname.replace(/\/$/, '') === '/payment/cancel';
  const query = useQuery({
    queryKey: ['study-purchase', user?.userId, purchaseId],
    queryFn: () => getStudyPurchaseStatus(purchaseId),
    refetchInterval: q => q.state.data === 'Pending' ? 5000 : false,
  });
  const status = query.data;
  useEffect(() => {
    if (status === 'Paid') void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
  }, [status, queryClient]);

  let title = 'Đang kiểm tra thanh toán…';
  if (query.isError) title = 'Chưa xác nhận được thanh toán';
  else if (status === 'Paid') title = 'Thanh toán thành công';
  else if (status && isCancel) title = 'Đã hủy thao tác thanh toán';
  else if (status === 'Pending') title = 'Đang chờ PayOS xác nhận';
  else if (status) title = 'Thanh toán chưa hoàn tất';

  return <LearnerShell pathname={pathname} breadcrumb="Biên lai">
    <main className="mx-auto max-w-2xl p-6 sm:p-10">
      <section className="rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-[#6F6669]">Đơn gói ôn luyện #{purchaseId} · PayOS</p>
        {query.error && <p role="alert" className="mt-3 text-sm text-rose-700">{query.error.message}</p>}
        {status === 'Paid' && <p className="mt-3 text-sm text-emerald-700">Quyền sử dụng đã được cấp vào tài khoản.</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/plans" className="rounded-full bg-[#9E2A4B] px-5 py-3 text-sm font-semibold text-white">Về gói ôn luyện</Link>
          {status !== 'Paid' && <button type="button" onClick={() => query.refetch()} disabled={query.isFetching}
            className="rounded-full border border-[#eadfd9] px-5 py-3 text-sm font-semibold disabled:opacity-40">Kiểm tra thanh toán</button>}
        </div>
      </section>
    </main>
  </LearnerShell>;
}

function MentorReceipt({ id }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['meeting-purchase', user?.userId, id], queryFn: () => syncMeetingPurchase(id), enabled: Boolean(id),
    refetchInterval: q => q.state.data?.paymentStatus === 'Pending' && !q.state.data?.isCheckoutExpired ? 15000 : false,
  });
  const purchase = query.data;
  const isCancel = pathname.replace(/\/$/, '') === '/payment/cancel';
  const paid = purchase?.paymentStatus === 'Paid';
  const confirmed = paid;
  const hasConfirmedBooking = paid && (purchase.bookings ?? []).some(booking => booking.status !== 'Cancelled');
  const pending = purchase?.paymentStatus === 'Pending' && !purchase.isCheckoutExpired;
  const checkoutUrl = id ? sessionStorage.getItem(`mentor-checkout:${user?.userId}:${id}`) : null;
  const title = !id ? 'Chưa có giao dịch để xác nhận' : query.isPending ? 'Đang kiểm tra thanh toán…' : query.isError ? 'Chưa xác nhận được thanh toán' : confirmed ? 'Thanh toán thành công' : isCancel ? 'Đã hủy thao tác thanh toán' : purchase?.isCheckoutExpired ? 'Đơn thanh toán đã hết hạn' : pending ? 'Đang chờ thanh toán' : 'Thanh toán chưa hoàn tất';
  return <LearnerShell pathname={pathname} breadcrumb="Biên lai">
    <div className="mx-auto max-w-2xl p-6 sm:p-10" data-page="ConsultationReceipt"><section className="rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm sm:p-8"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${confirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}><span className="material-symbols-outlined text-3xl">{confirmed ? 'check_circle' : 'schedule'}</span></div><h1 className="mt-5 text-center text-2xl font-bold">{title}</h1>
      {!id && <p className="mt-4 text-sm leading-6 text-[#6F6669]">Trang này cần mã đơn mua từ backend. Vui lòng chọn lịch và tạo đơn để thanh toán; biên lai không được xác nhận chỉ từ đường dẫn.</p>}
      {query.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{query.error.message}</p>}
      {purchase && <><p className="mt-3 text-center text-sm text-[#6F6669]">Đơn #{purchase.subscriptionId} · PayOS</p><dl className="mt-6 space-y-4 rounded-2xl bg-[#fff8f8] p-5 text-sm"><div className="flex justify-between gap-3"><dt>Gói</dt><dd className="text-right font-semibold">{purchase.planName}</dd></div><div className="flex justify-between gap-3"><dt>Số buổi</dt><dd>{purchase.meetingSessionsIncluded}</dd></div><div className="flex justify-between gap-3"><dt>{paid ? 'Đã thanh toán' : 'Giá trị đơn'}</dt><dd className="text-lg font-bold text-[#9E2A4B]">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(purchase.amountPaid)}</dd></div>{purchase.transactionId && <div><dt className="text-[#6F6669]">Mã thanh toán</dt><dd className="mt-1 break-all font-mono text-xs">{purchase.transactionId}</dd></div>}</dl>
      {(purchase.bookings ?? []).map(b => <div key={b.id} className="mt-4 rounded-2xl border border-[#eadfd9] p-4 text-sm"><p className="font-bold">{b.mentorName || 'Mentor'} · Booking #{b.id}</p><p className="mt-2 text-[#6F6669]">{bookingTime(b.scheduledAt)} (GMT+7)</p>{confirmed && <Link to={`/consultation-session/?bookingId=${b.id}`} className="mt-3 inline-block font-semibold text-[#9E2A4B]">Xem chi tiết buổi →</Link>}</div>)}
      {confirmed && <p role="status" className="mt-4 text-sm text-emerald-700">{hasConfirmedBooking ? 'Buổi ôn luyện đã được xác nhận theo khung giờ đã chọn.' : 'Lượt tư vấn đã được cộng vào tài khoản. Chọn lịch để sử dụng lượt.'}</p>}{pending && <p className="mt-4 text-sm leading-6 text-[#6F6669]">Hoàn tất thanh toán trên PayOS rồi quay lại đây. Trang kiểm tra trạng thái từ backend mỗi 15 giây.</p>}{paid && !confirmed && <p role="alert" className="mt-4 text-sm text-amber-800">Tiền đã được ghi nhận nhưng lịch chưa được xác nhận. Vui lòng liên hệ quản trị viên với mã đơn ở trên.</p>}</>}
      <div className="mt-6 flex flex-wrap gap-3"><Link to="/payments/history/" className="rounded-full border border-[#eadfd9] px-5 py-3 text-sm font-semibold">Danh sách thanh toán</Link>{pending && checkoutUrl && <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#9E2A4B] px-5 py-3 text-sm font-bold text-white">Mở PayOS để thanh toán</a>}{id && <button onClick={() => query.refetch()} disabled={query.isFetching} className="rounded-full border border-[#eadfd9] px-5 py-3 text-sm font-semibold disabled:opacity-40">{query.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra thanh toán'}</button>}<Link to={paid ? '/booking-schedule/' : '/booking-schedule/'} className="rounded-full border border-[#eadfd9] px-5 py-3 text-sm font-semibold">{paid ? 'Dùng lượt đặt lịch' : 'Về đặt lịch'}</Link></div>
      {paid && <IncludedMentorBooking purchase={purchase} onBooked={() => query.refetch()} />}
    </section></div>
  </LearnerShell>;
}
