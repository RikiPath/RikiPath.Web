import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import { getMentorBooking, getMentorBookings, acceptMentorBooking } from '../../api/mentorBookingsApi.js';
import { cancelMentorBooking } from '../../api/mentorBookingApi.js';
import { bookingTime, canAcceptBooking, bookingStatus, bookingExpired, paymentStatusLabel } from '../../utils/mentorBooking.js';

export default function ConsultationRequestDetail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId')) || null;
  const client = useQueryClient();
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const list = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    enabled: !id,
  });

  useEffect(() => {
    if (id || !list.isSuccess) return;
    const rows = list.data || [];
    const next = rows.find(canAcceptBooking) || rows[0];
    if (next?.id) {
      navigate(`/consultation-request/?bookingId=${next.id}`, { replace: true });
    }
  }, [id, list.isSuccess, list.data, navigate]);

  const query = useQuery({ queryKey: ['mentor-booking', id], queryFn: () => getMentorBooking(id), enabled: Boolean(id), refetchInterval: 30000 });
  const booking = query.data;

  const accept = useMutation({
    mutationFn: () => acceptMentorBooking(id),
    onSuccess: data => {
      client.setQueryData(['mentor-booking', id], data);
      client.invalidateQueries({ queryKey: ['mentor-bookings'] });
    },
    onError: () => query.refetch(),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelMentorBooking(id, { reason: cancelReason }),
    onSuccess: () => {
      setShowCancelPrompt(false);
      setCancelReason('');
      query.refetch();
      client.invalidateQueries({ queryKey: ['mentor-bookings'] });
    },
    onError: () => {
        setCancelError('Không thể hủy lịch. Vui lòng kiểm tra trạng thái mới nhất và thử lại.');
    },
  });

  const canCancel = booking && ['Assigned', 'Accepted'].includes(booking.status) && !bookingExpired(booking);

  return (
    <ConsultShell pathname={pathname} breadcrumb="Chi tiết yêu cầu">
      <div className="mx-auto max-w-5xl p-6 sm:p-8" data-page="ConsultationRequestDetail">
        <Link to="/consultation-queue/" className="text-sm font-semibold text-[#9E2A4B]">← Hàng đợi yêu cầu</Link>
        <h1 className="mt-5 text-2xl font-bold">Chi tiết yêu cầu tư vấn</h1>
        {(query.error || accept.error || cancelError) && (
          <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {cancelError || 'Không tải được yêu cầu tư vấn. Vui lòng thử lại.'}
          </p>
        )}
        {!id ? (
          list.isError ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Không tải được danh sách yêu cầu. Vui lòng thử lại.</p>
          : list.isSuccess && !(list.data || []).length ? <p className="mt-5 text-[#6F6669]">Chưa có yêu cầu trong hàng đợi.</p>
          : <p role="status" className="mt-5 text-[#6F6669]">Đang mở yêu cầu…</p>
        ) : query.isPending ? <p role="status" className="mt-5">Đang tải yêu cầu…</p> : booking && <>
          <section className="mt-5 rounded-2xl border border-[#eadfd9] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{booking.learnerName || 'Học viên'}</h2>
                <p className="mt-2 text-sm text-[#6F6669]">Thông tin buổi tư vấn</p>
              </div>
              <span className="rounded-full bg-[#fff0f5] px-4 py-2 text-sm font-semibold text-[#9E2A4B]">{bookingStatus(booking)}</span>
            </div>
            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
              {[['Cố vấn', booking.mentorName], ['Thanh toán', paymentStatusLabel(booking.paymentStatus)], ['Bắt đầu (GMT+7)', bookingTime(booking.scheduledAt)], ['Kết thúc (GMT+7)', bookingTime(booking.endsAt)]].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[#8c7f83]">{label}</dt>
                  <dd className="mt-1 font-semibold">{value || 'Chưa có thông tin'}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="mt-5 rounded-2xl border border-[#eadfd9] bg-white p-6">
            <h2 className="font-bold">Câu hỏi của học viên</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#6F6669]">{booking.question || 'Học viên chưa gửi câu hỏi cho buổi tư vấn này.'}</p>
          </section>

          {showCancelPrompt && (
            <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
              <h3 className="font-bold text-rose-900">Xác nhận hủy buổi tư vấn</h3>
              <p className="mt-1 text-xs text-rose-700">Việc hoàn vé tư vấn sẽ được xử lý theo chính sách áp dụng cho buổi này.</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy lịch hẹn…"
                rows={3}
                className="mt-3 w-full rounded-xl border border-rose-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={cancelMutation.isPending || !cancelReason.trim()}
                  onClick={() => cancelMutation.mutate()}
                  className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Đang hủy…' : 'Xác nhận hủy lịch'}
                </button>
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={() => { setShowCancelPrompt(false); setCancelReason(''); }}
                  className="rounded-xl border border-[#eadfd9] bg-white px-4 py-2 text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            </section>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canAcceptBooking(booking) && (
              <button disabled={accept.isPending} onClick={() => accept.mutate()} className="rounded-xl bg-[#9E2A4B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                {accept.isPending ? 'Đang xác nhận…' : 'Xác nhận tiếp nhận'}
              </button>
            )}
            <Link to={`/mentor-chat/?bookingId=${booking.id}`} className="rounded-xl border border-[#eadfd9] bg-white px-5 py-3 text-sm font-semibold">
              Tin nhắn 1–1
            </Link>
            {booking.roomId && !bookingExpired(booking) && ['Assigned', 'Accepted'].includes(booking.status) && (
              <Link to={`/consultation-room/${booking.roomId}/`} className="rounded-xl border border-[#eadfd9] bg-white px-5 py-3 text-sm font-semibold">
                Vào phòng họp
              </Link>
            )}
            {canCancel && !showCancelPrompt && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Hủy lịch hẹn
              </button>
            )}
          </div>
          {booking.status === 'Accepted' && <p role="status" className="mt-4 text-sm text-emerald-700">Yêu cầu đã được tiếp nhận và lưu trên hệ thống.</p>}
          {booking.status === 'Cancelled' && <p role="status" className="mt-4 text-sm text-rose-700">Lịch hẹn này đã bị hủy. Vui lòng xem lịch sử vé tư vấn để biết kết quả hoàn vé.</p>}
          {bookingExpired(booking) && booking.status !== 'Cancelled' && <p className="mt-4 text-sm text-[#6F6669]">Lịch đã hết hạn, bạn chỉ có thể xem lại thông tin.</p>}
        </>}
      </div>
    </ConsultShell>
  );
}
