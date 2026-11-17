import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getMentorRecommendations, getMentorPurchases, bookMeetingWithCredit, getMeetingPlans, purchaseMeeting } from '../../api/mentorBookingApi.js';

import { useLearnerProfile } from '../../hooks/useLearnerHome.js';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2'];
const GOALS = ['Đánh giá Dokkai & lộ trình học', 'Chữa phát âm & Kaiwa phỏng vấn', 'Chiến thuật thi JLPT', 'Chỉnh luận văn / CV tiếng Nhật'];
const ZONE = 'Asia/Ho_Chi_Minh';
const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(asDate(value));
const dayTitle = id => id ? new Date(`${id}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: ZONE, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa chọn ngày';
const clock = value => asDate(value).toLocaleTimeString('vi-VN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const panel = 'rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm';

export default function BookingSchedule({ purchasePlanId } = {}) {
  const { pathname } = useLocation(); const navigate = useNavigate(); const cache = useQueryClient();
  const [params] = useSearchParams();
  const presetMentorId = Number(params.get('mentorId')) || null;
  const { data: profile } = useLearnerProfile();
  const [selectedLevel, setSelectedLevel] = useState('');
  const profileLevel = profile?.targetJlptLevelName;
  const [selectedPlanId, setPlanId] = useState(null);
  const planQuery = useQuery({ queryKey: ['meeting-plans'], queryFn: getMeetingPlans });
  const plan = planQuery.data?.find(item => item.id === (purchasePlanId ?? selectedPlanId));
  const jlptLevel = plan?.jlptLevel || selectedLevel || (JLPT_LEVELS.includes(profileLevel) ? profileLevel : '');
  const wallet = useQuery({ queryKey: ['mentor-purchases'], queryFn: getMentorPurchases, refetchInterval: 15000 });
  const [selectedMentorId, setMentorId] = useState(null);
  const [selectedDayId, setDayId] = useState('');
  const [slotId, setSlotId] = useState(null);
  const [goal, setGoal] = useState(GOALS[0]);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [range, setRange] = useState(() => {
    const now = new Date();
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + 89);
    return { from: dayKey(now.toISOString()), to: dayKey(end.toISOString()) };
  });
  const from = new Date(range.from + 'T00:00:00+07:00');
  const through = new Date(range.to + 'T00:00:00+07:00');
  through.setUTCDate(through.getUTCDate() + 1);
  const validRange = Boolean(range.from && range.to && through > from && through.getTime() > now
    && through.getTime() - from.getTime() <= 90 * 86400000);
  const mentorQuery = useQuery({
    queryKey: ['booking-mentors', range.from, range.to],
    queryFn: () => getMentorRecommendations(from.toISOString(), through.toISOString()),
    enabled: validRange,
    refetchInterval: 30_000,
    retry: false,
  });
  const mentors = mentorQuery.data ?? [];
  const mentor = mentors.find(item => item.id === (selectedMentorId ?? presetMentorId));
  const mentorId = mentor?.id;
  const availableSlots = (mentor?.slots ?? [])
    .filter(item => !item.isBooked && asDate(item.startTime).getTime() > now)
    .map(item => ({ ...item, day: dayKey(item.startTime), label: `${clock(item.startTime)} – ${clock(item.endTime)}` }));
  const days = [...new Set(availableSlots.map(item => item.day))].sort();
  const dayId = days.includes(selectedDayId) ? selectedDayId : days[0] || '';
  const slots = availableSlots.filter(item => item.day === dayId);
  const slot = slots.find(item => item.id === slotId);
  const ready = Boolean(mentor && slot && !mentorQuery.isFetching && !mentorQuery.isError);
  const eligible = (wallet.data || []).filter(p => p.paymentStatus === 'Paid' && (!p.jlptLevel || p.jlptLevel === jlptLevel) && p.meetingSessionsUsed < p.meetingSessionsIncluded && (!p.endDate || asDate(p.endDate) >= (slot ? asDate(slot.endTime) : new Date(now))));
  const balance = (wallet.data || []).filter(p => p.paymentStatus === 'Paid' && (!p.endDate || asDate(p.endDate).getTime() > now)).reduce((n,p) => n + Math.max(0,p.meetingSessionsIncluded-p.meetingSessionsUsed),0);
  const book = useMutation({ mutationFn: () => bookMeetingWithCredit({ mentorAvailabilityId: slot.id, jlptLevel, question: [goal,note].filter(Boolean).join('\n') }), onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['mentor-purchases'] }), cache.invalidateQueries({ queryKey: ['learner-mentor-bookings'] }), cache.invalidateQueries({ queryKey: ['booking-mentors'] })]);
    navigate('/consultation-center/');
  }, onError: () => { wallet.refetch(); mentorQuery.refetch(); } });
  const purchase = useMutation({
    mutationFn: () => purchaseMeeting({
      subscriptionPlanId: plan.id,
      mentorAvailabilityId: slot.id,
      jlptLevel,
      frontendOrigin: window.location.origin,
      question: [goal, note].filter(Boolean).join('\n'),
    }),
    onSuccess: result => {
      if (!result?.checkoutUrl) throw new Error('Chưa nhận được liên kết PayOS.');
      window.location.assign(result.checkoutUrl);
    },
    onError: () => { mentorQuery.refetch(); },
  });
  const canPay = ready && Boolean(plan && jlptLevel) && asDate(slot.endTime) <= new Date(now + plan.durationDays * 86400000);
  const error = mentorQuery.error || wallet.error || planQuery.error || book.error || purchase.error;
  const initial = name => (name || '?').slice(0, 1).toUpperCase();

  return (
    <LearnerShell pathname={pathname} breadcrumb="Đặt lịch">
      <div className="px-6 py-8 sm:px-8" data-page="BookingSchedule">
        <div className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Tư vấn trực tuyến</p><h1 className="mt-1 text-2xl font-extrabold text-[#2D282A]">Đặt lịch video 1–1</h1><p className="mt-1 text-sm text-[#6F6669]">Chọn Mentor, ngày và giờ phù hợp với lịch của bạn.</p></div>
        {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error.message}<button type="button" onClick={() => { if (validRange) mentorQuery.refetch(); }} className="ml-3 underline">Thử lại</button></div>}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <section className={panel}>
              <h2 className="mb-4 text-sm font-bold">Mentor phù hợp <span className="font-normal text-[#A59B9E]">({mentors.length})</span></h2>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                {[['from', 'Từ ngày'], ['to', 'Đến ngày']].map(([key, label]) => <label key={key} className="text-sm font-semibold">
                  {label}
                  <input type="date" value={range[key]} min={key === 'to' ? range.from : undefined}
                    onChange={event => {
                      setRange({ ...range, [key]: event.target.value });
                      setMentorId(null);
                      setDayId('');
                      setSlotId(null);
                    }}
                    className="mt-1 w-full rounded-xl border border-[#eadfd9] px-3 py-2 font-normal" />
                </label>)}
              </div>
              {!validRange && <p role="status" className="text-sm text-rose-700">Hãy chọn khoảng ngày còn hiệu lực, tối đa 90 ngày.</p>}
              {validRange && mentorQuery.isPending && <p role="status" className="text-sm text-[#6F6669]">Đang tìm mentor có lịch trống…</p>}
              {mentorQuery.isSuccess && !mentors.length && <p className="text-sm text-[#6F6669]">Không có lịch trống trong khoảng này. Hãy chọn khoảng ngày khác.</p>}
              {mentors.length > 0 && !mentors.some(item => item.isRecommended) && <p className="mb-3 text-sm text-[#6F6669]">
                Chưa có mentor được đánh giá từ 4 sao trong khoảng này. Bạn có thể xem các lịch trống bên dưới.
              </p>}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mentors.map(item => <button key={item.id} type="button" aria-pressed={item.id === mentorId} onClick={() => { setMentorId(item.id); setDayId(''); setSlotId(null); }} className={`rounded-2xl border p-4 text-left ${item.id === mentorId ? 'border-[#D94B68] bg-[#fff8f8]' : 'border-[#eadfd9] bg-[#FAF7F5]'}`}>
                  <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white font-bold text-[#D94B68]">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial(item.name)}</span><div><p className="text-sm font-bold">{item.name || `Mentor #${item.id}`}</p><p className="mt-1 text-xs text-[#D94B68]">Mentor</p></div></div>
                  <p className="mt-3 text-xs leading-relaxed text-[#6F6669]">
                    {item.averageRating == null ? 'Chưa có đánh giá' : `${item.averageRating.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/5 sao · ${item.reviewCount} đánh giá`}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#9E2A4B]">{item.isRecommended ? 'Đề xuất · ' : ''}{item.slots.length} khung giờ trống</p>
                </button>)}
              </div>
            </section>
            <section className={panel}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Chọn ngày và giờ</h2>
                <span className="text-xs text-[#6F6669]">Giờ Việt Nam (GMT+7)</span>
              </div>
              {!mentor && <p className="py-4 text-sm text-[#6F6669]">Chọn mentor để xem lịch.</p>}
              {mentor && !days.length && <p className="py-4 text-sm text-[#6F6669]">Các khung giờ này đã qua. Hãy chọn mentor hoặc khoảng ngày khác.</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {days.map(id => <button key={id} type="button" aria-pressed={id === dayId} onClick={() => { setDayId(id); setSlotId(null); }} className={`rounded-2xl px-2 py-3 text-center ${id === dayId ? 'bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white' : 'bg-[#FAF7F5]'}`}>
                  <span className="block text-xs">{new Date(`${id}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: ZONE, weekday: 'short' })}</span><span className="mt-1 block text-lg font-bold">{id.slice(8)}/{id.slice(5, 7)}</span><span className="mt-1 block text-[10px]">{availableSlots.filter(s => s.day === id).length} khung giờ</span>
                </button>)}
              </div>
              {dayId && <p className="mt-5 text-sm font-bold">{dayTitle(dayId)}</p>}
              <div className="mt-3 grid gap-2">{slots.map(item => <button key={item.id} type="button" aria-pressed={item.id === slotId} onClick={() => setSlotId(item.id)} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${item.id === slotId ? 'bg-[#2D282A] text-white' : 'bg-[#FAF7F5]'}`}><span>{item.label}</span><span className="text-xs">{item.id === slotId ? 'Đang chọn' : 'Sẵn sàng'}</span></button>)}</div>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-bold">Chủ đề buổi học</h2>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">Mục tiêu<select value={goal} onChange={e => setGoal(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm">{GOALS.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="mt-3 block text-xs font-semibold text-[#6F6669]">Tài liệu (tuỳ chọn)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Link Drive, bài mock test…" className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm" /></label>
            </section>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className={panel}>
              <h2 className="text-sm font-bold">Tóm tắt lịch hẹn</h2>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FAF7F5] p-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#D94B68]">{initial(mentor?.name)}</span><div><p className="text-sm font-bold">{mentor?.name || 'Chưa chọn mentor'}</p><p className="text-xs text-[#6F6669]">Mentor</p></div></div>
              <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Thời gian</dt><dd className="text-right font-semibold">{slot ? `${dayTitle(dayId)} · ${slot.label}` : 'Chưa chọn khung giờ'}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Nền tảng</dt><dd className="text-right font-semibold">Phòng họp RikiPath</dd></div><div className="flex justify-between gap-3"><dt className="text-[#A59B9E]">Mục tiêu</dt><dd className="text-right font-semibold">{goal}</dd></div></dl>
              <label className="mt-4 block text-sm font-semibold">
                Cấp độ JLPT
                <select value={jlptLevel} disabled={Boolean(plan?.jlptLevel)} onChange={event => setSelectedLevel(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#eadfd9] px-3 py-2 font-normal">
                  <option value="">Chọn cấp độ</option>
                  {JLPT_LEVELS.map(level => <option key={level}>{level}</option>)}
                </select>
              </label>
              <p className="mt-4 text-sm font-semibold">Lượt còn hạn trong tài khoản: {wallet.isPending ? 'Đang tải…' : balance}</p>
              <button disabled={!ready || !jlptLevel || !eligible.length || wallet.isFetching || book.isPending || purchase.isPending} onClick={() => book.mutate()} className="mt-5 w-full rounded-full bg-[#9E2A4B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{book.isPending ? 'Đang đặt lịch…' : 'Xác nhận đặt lịch · Trừ 1 lượt'}</button>
              {(purchasePlanId || (ready && wallet.isSuccess && !eligible.length)) && <div className="mt-4 space-y-2 border-t border-[#eadfd9] pt-4">
                {!purchasePlanId && <label className="block text-sm font-semibold">Gói để đặt lịch này
                  <select value={selectedPlanId ?? ''} onChange={event => setPlanId(Number(event.target.value) || null)}
                    className="mt-1 block w-full rounded-lg border border-[#eadfd9] px-3 py-2 font-normal">
                    <option value="">Chọn gói</option>
                    {planQuery.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>}
                {plan && <p className="text-sm">{plan.name} · {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(plan.price)}</p>}
                {purchasePlanId && planQuery.isSuccess && !plan && <p className="text-sm text-rose-700">Gói mentor này không còn mở bán.</p>}
                {ready && plan && !canPay && <p className="text-sm text-rose-700">Hãy chọn khung giờ trong thời hạn {plan.durationDays} ngày của gói.</p>}
                <button type="button" disabled={!canPay || purchase.isPending || book.isPending}
                  onClick={() => purchase.mutate()} className="mt-3 w-full rounded-full bg-[#9E2A4B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
                  {purchase.isPending ? 'Đang giữ lịch…' : 'Thanh toán lịch đã chọn'}
                </button>
              </div>}
              {!purchasePlanId && ready && wallet.isSuccess && !eligible.length &&
                <p className="mt-3 text-xs text-[#6F6669]">Bạn có thể mua gói để giữ khung giờ này.</p>}
              <p className="mt-3 text-center text-xs leading-5 text-[#A59B9E]">Chỉ trừ 1 lượt khi đặt lịch thành công. Hủy trước ít nhất 24 tiếng được hoàn lượt theo hạn gói.</p>
            </section>
            <section className={panel}><h3 className="text-sm font-bold">Trước giờ học</h3><ul className="mt-2 space-y-2 text-xs text-[#6F6669]"><li>Kiểm tra micro và camera trước 5 phút.</li><li>Chuẩn bị tài liệu cần hỏi.</li><li>Vào đúng giờ theo khung lịch đã chọn.</li></ul></section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
