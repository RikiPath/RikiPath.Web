import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import {
  cancelMentorBooking,
  createMentorDispute,
  createMentorReview,
  getCancellationEligibility,
  getLearnerBookings,
  getMentorAvailableSlots,
  rescheduleMentorBooking,
} from '../../api/mentorBookingApi.js';
import { bookingTime, bookingStatus, bookingExpired } from '../../utils/mentorBooking.js';
import { vietnamDate } from '../../utils/vietnamDate.js';

const DISPUTE_CATEGORIES = [
  ['MentorAbsent', 'Cố vấn vắng mặt'],
  ['SessionNotConducted', 'Buổi không diễn ra'],
  ['MediaRoomIssue', 'Lỗi phòng họp'],
  ['QualityIssue', 'Chất lượng buổi học'],
  ['InappropriateBehavior', 'Hành vi không phù hợp'],
  ['PolicyDispute', 'Tranh chấp chính sách'],
  ['Other', 'Khác'],
];

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function ConsultationSessionDetail() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const [params] = useSearchParams();
  const id = Number(params.get('bookingId'));
  const client = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('Other');
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newSlotId, setNewSlotId] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const query = useQuery({ queryKey: ['learner-mentor-bookings'], queryFn: getLearnerBookings, refetchInterval: 15000 });
  const booking = query.data?.find((item) => item.id === id);
  const eligibility = useQuery({
    queryKey: ['cancel-eligibility', id],
    queryFn: () => getCancellationEligibility(id),
    enabled: Boolean(id),
  });
  const slots = useQuery({
    queryKey: ['reschedule-slots', booking?.mentorId],
    queryFn: () => getMentorAvailableSlots(booking.mentorId, vietnamDate(0), vietnamDate(13)),
    enabled: Boolean(booking?.mentorId) && eligibility.data?.canReschedule,
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['learner-mentor-bookings'] });
    client.invalidateQueries({ queryKey: ['cancel-eligibility', id] });
  };
  const review = useMutation({
    mutationFn: () => createMentorReview({ mentorBookingId: id, rating: Number(rating), comment: comment || null }),
    onSuccess: () => { setActionError(''); setActionMessage('Đã gửi đánh giá.'); },
    onError: (err) => setActionError(err.message),
  });
  const dispute = useMutation({
    mutationFn: () => createMentorDispute({
      mentorBookingId: id,
      category,
      reason,
      evidenceUrls: evidenceUrls || null,
    }),
    onSuccess: () => { setActionError(''); setActionMessage('Đã gửi khiếu nại.'); setReason(''); },
    onError: (err) => setActionError(err.message),
  });
  const cancel = useMutation({
    mutationFn: () => cancelMentorBooking(id, { reason: cancelReason || null }),
    onSuccess: (data) => { setActionError(''); setActionMessage(data?.message || 'Đã hủy lịch.'); refresh(); },
    onError: (err) => setActionError(err.message),
  });
  const reschedule = useMutation({
    mutationFn: () => rescheduleMentorBooking(id, { newSlotId: Number(newSlotId), reason: cancelReason || null }),
    onSuccess: (data) => { setActionError(''); setActionMessage(data?.message || 'Đã dời lịch.'); refresh(); },
    onError: (err) => setActionError(err.message),
  });
  const openSlots = (slots.data?.dailySlots || []).flatMap((day) => (day.slots || []).map((slot) => ({
    id: slot.slotId,
    label: `${day.date} · ${String(slot.localStart).slice(0, 5)}–${String(slot.localEnd).slice(0, 5)}`,
  })));

  return (
    <LearnerShell pathname={pathname} breadcrumb="Chi tiết buổi tư vấn">
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <Link to="/consultation-center/" className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>
          {tr('Về lịch của tôi')}
        </Link>
        <header className="mb-5 mt-4">
          <h1 className="text-[25px] font-semibold tracking-tight">{tr('Chi tiết')} {id ? `#${id}` : ''}</h1>
        </header>
        {query.error && <p role="alert" className="rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {query.isPending ? <p role="status" className="text-[13px] text-[#9A8390]">{tr('Đang tải…')}</p> : booking ? (
          <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-[18px] font-semibold">{booking.mentorName || tr('Chưa phân công mentor')}</h2>
              <span className="rounded-full bg-[#FCEEF3] px-3 py-1 text-[12px] font-medium text-[#AD3155]">{bookingStatus(booking)}</span>
            </div>
            <dl className="mt-5 grid gap-4 text-[13px] sm:grid-cols-2">
              <div><dt className="text-[#8C7782]">{tr('Bắt đầu')}</dt><dd className="mt-1 font-medium">{bookingTime(booking.scheduledAt)} · {tr('giờ Việt Nam')}</dd></div>
              <div><dt className="text-[#8C7782]">{tr('Kết thúc')}</dt><dd className="mt-1 font-medium">{bookingTime(booking.endsAt)} · {tr('giờ Việt Nam')}</dd></div>
            </dl>
            <p className="mt-5 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#705261]">{booking.question || tr('Chưa gửi câu hỏi.')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {booking.paymentStatus === 'Paid' && (
                <Link to={`/mentor-chat/?bookingId=${booking.id}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>{tr('Tin nhắn với mentor')}</Link>
              )}
              {booking.paymentStatus === 'Paid' && booking.roomId && !bookingExpired(booking) && ['Assigned', 'Accepted'].includes(booking.status) && (
                <Link to={`/consultation-room/${booking.roomId}/`} className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>{tr('Vào phòng họp')}</Link>
              )}
              <Link to={`/consultation-receipt/?subscriptionId=${booking.userSubscriptionId}`} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focus}`}>{tr('Trạng thái thanh toán')}</Link>
            </div>
            {eligibility.data && (
              <p className="mt-4 rounded-xl bg-[#FAF7F5] px-3 py-2 text-[13px] text-[#705261]">
                {eligibility.data.message} {eligibility.data.eligibleForFullRefund ? 'Hủy lúc này được hoàn vé.' : 'Hủy lúc này không được hoàn vé đầy đủ.'}
              </p>
            )}
            {(actionMessage || actionError) && (
              <p role={actionError ? 'alert' : 'status'} className={`mt-3 rounded-xl px-3 py-2 text-[13px] ${actionError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{actionError || actionMessage}</p>
            )}
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <form className="rounded-xl border border-[#EADFE5] p-4" onSubmit={(event) => { event.preventDefault(); review.mutate(); }}>
                <h3 className="text-[14px] font-semibold">Đánh giá buổi học</h3>
                <label className="mt-2 block text-[12px] text-[#8C7782]">Số sao (1–5)
                  <input type="number" min="1" max="5" value={rating} onChange={(event) => setRating(event.target.value)} className="mt-1 w-full rounded-lg border border-[#EADFE5] px-3 py-2" />
                </label>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Nhận xét" className="mt-2 w-full rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]" />
                <button type="submit" disabled={review.isPending} className={`mt-2 h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white disabled:opacity-50 ${focus}`}>Gửi đánh giá</button>
              </form>
              <form className="rounded-xl border border-[#EADFE5] p-4" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) dispute.mutate(); }}>
                <h3 className="text-[14px] font-semibold">Khiếu nại</h3>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]">
                  {DISPUTE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Lý do khiếu nại" className="mt-2 w-full rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]" />
                <input value={evidenceUrls} onChange={(event) => setEvidenceUrls(event.target.value)} placeholder="Link bằng chứng, cách nhau bởi dấu phẩy" className="mt-2 w-full rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]" />
                <button type="submit" disabled={dispute.isPending || !reason.trim()} className={`mt-2 h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] font-medium disabled:opacity-50 ${focus}`}>Gửi khiếu nại</button>
              </form>
            </div>
            <form className="mt-4 rounded-xl border border-[#EADFE5] p-4" onSubmit={(event) => event.preventDefault()}>
              <h3 className="text-[14px] font-semibold">Hủy hoặc dời lịch</h3>
              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} placeholder="Lý do" className="mt-2 w-full rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={cancel.isPending || eligibility.data?.canCancel === false} onClick={() => cancel.mutate()} className={`h-9 rounded-lg px-3 text-[12px] font-medium text-[#A33357] hover:bg-[#FCF4F8] disabled:opacity-50 ${focus}`}>Hủy lịch</button>
              </div>
              {eligibility.data?.canReschedule && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select value={newSlotId} onChange={(event) => setNewSlotId(event.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-[#EADFE5] px-3 py-2 text-[13px]">
                    <option value="">Chọn khung giờ mới</option>
                    {openSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                  </select>
                  <button type="button" disabled={reschedule.isPending || !newSlotId} onClick={() => reschedule.mutate()} className={`h-9 rounded-lg bg-[#2D282A] px-3 text-[12px] font-medium text-white disabled:opacity-50 ${focus}`}>Dời lịch</button>
                </div>
              )}
            </form>
          </section>
        ) : (
          <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
            <p className="text-[15px] font-medium text-[#806371]">{tr('Không tìm thấy buổi này trong tài khoản của bạn.')}</p>
          </div>
        )}
      </main>
    </LearnerShell>
  );
}
