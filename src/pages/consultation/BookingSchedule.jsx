import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getBookingMentors, getMentorSlots, getCreditBalance, bookMeetingWithCredit } from '../../api/mentorBookingApi.js';
import { BOOKING_HORIZON_DAYS, bookingErrorMessage } from '../../utils/mentorBooking.js';

const GOALS = ['Đánh giá Dokkai & lộ trình học', 'Chữa phát âm & Kaiwa phỏng vấn', 'Chiến thuật thi JLPT', 'Chỉnh luận văn / CV tiếng Nhật'];
const ZONE = 'Asia/Ho_Chi_Minh';
const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(asDate(value));
const dayTitle = id => id ? new Date(`${id}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: ZONE, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa chọn ngày';
const clock = value => asDate(value).toLocaleTimeString('vi-VN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const panel = 'rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm';
const initial = name => (name || '?').slice(0, 1).toUpperCase();

function MentorAvatar({ name, avatarUrl, sizeClass = 'h-11 w-11' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);
  return <span className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white font-bold text-[#D94B68]`}>
    {showImage ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(avatarUrl)} /> : initial(name)}
  </span>;
}

export default function BookingSchedule() {
  const { pathname } = useLocation();
  const [selectedMentorId, setMentorId] = useState(null);
  const [selectedDayId, setDayId] = useState('');
  const [slotId, setSlotId] = useState(null);
  const [goal, setGoal] = useState(GOALS[0]);
  const [note, setNote] = useState('');
  const [range, setRange] = useState(() => new Date());
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  const mentorQuery = useQuery({ queryKey: ['booking-mentors'], queryFn: getBookingMentors });
  const mentors = mentorQuery.data || [];
  const mentorId = selectedMentorId ?? mentors[0]?.id;
  const mentor = mentors.find(item => item.id === mentorId);

  const creditQuery = useQuery({
    queryKey: ['mentor-credit-balance'],
    queryFn: getCreditBalance,
    refetchInterval: 30000,
  });
  const creditBalance = creditQuery.data?.totalAvailableCredits ?? creditQuery.data?.balance;
  const creditReady = !creditQuery.isPending && !creditQuery.isError && Number.isFinite(creditBalance);

  const slotQuery = useQuery({
    queryKey: ['booking-slots', mentorId, range.toISOString()],
    queryFn: () => getMentorSlots(mentorId, range.toISOString(), new Date(range.getTime() + BOOKING_HORIZON_DAYS * 86400000).toISOString()),
    enabled: Boolean(mentor),
    refetchInterval: 30000,
  });

  const availableSlots = (slotQuery.data || [])
    .filter(item => item.mentorId === mentorId && !item.isBooked && asDate(item.startTime) > new Date())
    .map(item => ({ ...item, day: dayKey(item.startTime), label: `${clock(item.startTime)} – ${clock(item.endTime)}` }));
  const days = [...new Set(availableSlots.map(item => item.day))].sort();
  const dayId = days.includes(selectedDayId) ? selectedDayId : days[0] || '';
  const slots = availableSlots.filter(item => item.day === dayId);
  const slot = slots.find(item => item.id === slotId);
  const ready = Boolean(mentor && slot && !slotQuery.isFetching && !slotQuery.error && creditReady);
  const error = mentorQuery.error || slotQuery.error || creditQuery.error;

  const bookWithCreditMutation = useMutation({
    mutationFn: async () => {
      setBookingError('');
      return await bookMeetingWithCredit({
        mentorAvailabilityId: slot.id,
        question: `${goal}. ${note}`.trim(),
      });
    },
    onSuccess: (data) => {
      setBookingSuccess(data);
      slotQuery.refetch();
      creditQuery.refetch();
    },
    onError: (err) => {
      setBookingError(bookingErrorMessage(err));
    },
  });

  return (
    <LearnerShell pathname={pathname} breadcrumb="Đặt lịch">
      <div className="px-6 py-8 sm:px-8" data-page="BookingSchedule">
        <div className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Tư vấn trực tuyến</p><h1 className="mt-1 text-2xl font-extrabold text-[#2D282A]">Đặt lịch video 1–1</h1><p className="mt-1 text-sm text-[#6F6669]">Chọn Cố vấn, ngày và giờ phù hợp với lịch của bạn.</p></div>
        {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">Không tải được thông tin lịch tư vấn. Vui lòng thử lại.<button type="button" onClick={() => { mentorQuery.refetch(); creditQuery.refetch(); if (mentor) slotQuery.refetch(); }} className="ml-3 underline">Thử lại</button></div>}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <section className={panel}>
              <h2 className="mb-4 text-sm font-bold">Cố vấn <span className="font-normal text-[#A59B9E]">({mentors.length})</span></h2>
              {mentorQuery.isPending && <p role="status" className="text-sm text-[#6F6669]">Đang tải danh sách Cố vấn…</p>}
              {!mentorQuery.isPending && !mentorQuery.isError && !mentors.length && <p className="text-sm text-[#6F6669]">Chưa có Cố vấn đang hoạt động.</p>}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mentors.map(item => <button key={item.id} type="button" aria-pressed={item.id === mentorId} onClick={() => { setMentorId(item.id); setDayId(''); setSlotId(null); setBookingSuccess(null); }} className={`rounded-2xl border p-4 text-left ${item.id === mentorId ? 'border-[#D94B68] bg-[#fff8f8]' : 'border-[#eadfd9] bg-[#FAF7F5]'}`}>
                  <div className="flex items-center gap-3"><MentorAvatar name={item.name} avatarUrl={item.avatarUrl} /><div><p className="text-sm font-bold">{item.name || 'Cố vấn chưa cập nhật tên'}</p><p className="mt-1 text-xs text-[#D94B68]">Cố vấn</p></div></div>
                  <p className="mt-3 text-xs leading-relaxed text-[#6F6669]">Chọn để xem lịch trống.</p>
                </button>)}
              </div>
            </section>
            <section className={panel}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Ngày rảnh · 30 ngày tới</h2><div className="flex items-center gap-3"><span className="text-xs text-[#A59B9E]">GMT+7</span><button type="button" onClick={() => setRange(new Date())} className="text-xs font-semibold text-[#D94B68]">Làm mới lịch</button></div></div>
              {slotQuery.isPending && mentor && <p role="status" className="py-4 text-sm text-[#6F6669]">Đang tải lịch trống của {mentor.name}…</p>}
              {!mentor && <p className="py-4 text-sm text-[#6F6669]">Chọn Cố vấn để xem lịch.</p>}
              {mentor && !slotQuery.isPending && !slotQuery.isError && !days.length && <p className="rounded-2xl bg-[#FAF7F5] p-5 text-sm text-[#6F6669]">{mentor.name} chưa có lịch trống trong 30 ngày tới. Bạn có thể chọn Cố vấn khác hoặc quay lại sau.</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {days.map(id => <button key={id} type="button" aria-pressed={id === dayId} onClick={() => { setDayId(id); setSlotId(null); setBookingSuccess(null); }} className={`rounded-2xl px-2 py-3 text-center ${id === dayId ? 'bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white' : 'bg-[#FAF7F5]'}`}>
                  <span className="block text-xs">{new Date(`${id}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: ZONE, weekday: 'short' })}</span><span className="mt-1 block text-lg font-bold">{id.slice(8)}/{id.slice(5, 7)}</span><span className="mt-1 block text-[10px]">{availableSlots.filter(s => s.day === id).length} khung giờ</span>
                </button>)}
              </div>
              {dayId && <p className="mt-5 text-sm font-bold">{dayTitle(dayId)}</p>}
              <div className="mt-3 grid gap-2">{slots.map(item => <button key={item.id} type="button" aria-pressed={item.id === slotId} onClick={() => { setSlotId(item.id); setBookingSuccess(null); }} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${item.id === slotId ? 'bg-[#2D282A] text-white' : 'bg-[#FAF7F5]'}`}><span>{item.label}</span><span className="text-xs">{item.id === slotId ? 'Đang chọn' : 'Sẵn sàng'}</span></button>)}</div>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-bold">Chủ đề cần hỗ trợ</h2>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">Mục tiêu<select value={goal} onChange={e => setGoal(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm">{GOALS.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">Tài liệu (tuỳ chọn)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Link Drive, bài mock test…" className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm" /></label>
            </section>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className={panel}>
              <h2 className="text-sm font-bold">Tóm tắt lịch hẹn</h2>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAF7F5] p-3"><MentorAvatar name={mentor?.name} avatarUrl={mentor?.avatarUrl} sizeClass="h-12 w-12" /><div><p className="text-sm font-bold">{mentor?.name || 'Chưa chọn Cố vấn'}</p><p className="text-xs text-[#6F6669]">Cố vấn</p></div></div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#FAF7F5] px-3.5 py-2.5 text-xs font-semibold">
                <span className="text-[#6F6669]">Vé tư vấn khả dụng:</span>
                <span className="font-bold text-emerald-700">{creditReady ? `${creditBalance} vé` : 'Đang cập nhật'}</span>
              </div>
              <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Thời gian</dt><dd className="text-right font-semibold">{slot ? `${dayTitle(dayId)} · ${slot.label}` : 'Chưa chọn khung giờ'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Nền tảng</dt><dd className="text-right font-semibold">Phòng tư vấn RikiPath</dd></div><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Mục tiêu</dt><dd className="text-right font-semibold">{goal}</dd></div></dl>

              {bookingSuccess ? (
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center">
                  <p className="text-sm font-bold text-emerald-800">Đặt lịch thành công!</p>
                  <p className="mt-1 text-xs text-emerald-700">Lịch tư vấn đã được lưu vào danh sách của bạn.</p>
                  <Link to="/consultation-center/" className="mt-3 inline-block rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">Xem lịch hẹn của bạn</Link>
                </div>
              ) : (
                <>
                  {bookingError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{bookingError}</p>}
                  {creditBalance > 0 ? (
                    <button
                      type="button"
                      disabled={!ready || bookWithCreditMutation.isPending}
                      onClick={() => bookWithCreditMutation.mutate()}
                      className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white ${ready ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95' : 'pointer-events-none bg-[#C4B8BA]'}`}
                    >
                      {bookWithCreditMutation.isPending ? 'Đang xác nhận đặt lịch…' : 'Đặt lịch bằng 1 vé tư vấn'}
                    </button>
                  ) : (
                    <Link
                      to={ready ? `/consultation-payment/?mentorId=${mentor.id}&slotId=${slot.id}` : '#'}
                      state={ready ? { mentor, slot, goal, note } : null}
                      aria-disabled={!ready}
                      tabIndex={ready ? 0 : -1}
                      className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white ${ready ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]' : 'pointer-events-none bg-[#C4B8BA]'}`}
                    >
                      Mua gói & Tiếp tục
                    </Link>
                  )}
                  <p className="mt-3 text-center text-xs leading-5 text-[#A59B9E]">Lịch chỉ được xác nhận sau khi hoàn tất đặt lịch.</p>
                </>
              )}
            </section>
            <section className={panel}><h3 className="text-sm font-bold">Trước buổi tư vấn</h3><ul className="mt-2 space-y-2 text-xs text-[#6F6669]"><li>Kiểm tra micro và camera trước 5 phút.</li><li>Chuẩn bị tài liệu cần hỏi.</li><li>Vào đúng giờ theo khung lịch đã chọn.</li></ul></section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
