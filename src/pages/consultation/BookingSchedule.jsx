import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getBookingMentors, getMentorSlots } from '../../api/mentorBookingApi.js';

const GOALS = ['Đánh giá Dokkai & lộ trình học', 'Chữa phát âm & Kaiwa phỏng vấn', 'Chiến thuật thi JLPT', 'Chỉnh luận văn / CV tiếng Nhật'];
const ZONE = 'Asia/Ho_Chi_Minh';
const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(asDate(value));
const dayTitle = id => id ? new Date(`${id}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: ZONE, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa chọn ngày';
const clock = value => asDate(value).toLocaleTimeString('vi-VN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' });
const panel = 'rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm';

export default function BookingSchedule() {
  const { pathname } = useLocation();
  const [selectedMentorId, setMentorId] = useState(null);
  const [selectedDayId, setDayId] = useState('');
  const [slotId, setSlotId] = useState(null);
  const [goal, setGoal] = useState(GOALS[0]);
  const [note, setNote] = useState('');
  const [range, setRange] = useState(() => new Date());
  const mentorQuery = useQuery({ queryKey: ['booking-mentors'], queryFn: getBookingMentors });
  const mentors = mentorQuery.data || [];
  const mentorId = selectedMentorId ?? mentors[0]?.id;
  const mentor = mentors.find(item => item.id === mentorId);
  const slotQuery = useQuery({
    queryKey: ['booking-slots', mentorId, range.toISOString()],
    queryFn: () => getMentorSlots(mentorId, range.toISOString(), new Date(range.getTime() + 89 * 86400000).toISOString()),
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
  const ready = Boolean(mentor && slot && !slotQuery.isFetching && !slotQuery.isError);
  const error = mentorQuery.error || slotQuery.error;
  const initial = name => (name || '?').slice(0, 1).toUpperCase();

  return (
    <LearnerShell pathname={pathname} breadcrumb="Đặt lịch">
      <div className="px-6 py-8 sm:px-8" data-page="BookingSchedule">
        <div className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Tư vấn trực tuyến</p><h1 className="mt-1 text-2xl font-extrabold text-[#2D282A]">Đặt lịch video 1–1</h1><p className="mt-1 text-sm text-[#6F6669]">Chọn Mentor, ngày và giờ phù hợp với lịch của bạn.</p></div>
        {error && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error.message}<button type="button" onClick={() => { mentorQuery.refetch(); if (mentor) slotQuery.refetch(); }} className="ml-3 underline">Thử lại</button></div>}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <section className={panel}>
              <h2 className="mb-4 text-sm font-bold">Chuyên gia <span className="font-normal text-[#A59B9E]">({mentors.length})</span></h2>
              {mentorQuery.isPending && <p role="status" className="text-sm text-[#6F6669]">Đang tải danh sách mentor…</p>}
              {!mentorQuery.isPending && !mentorQuery.isError && !mentors.length && <p className="text-sm text-[#6F6669]">Chưa có mentor đang hoạt động.</p>}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mentors.map(item => <button key={item.id} type="button" aria-pressed={item.id === mentorId} onClick={() => { setMentorId(item.id); setDayId(''); setSlotId(null); }} className={`rounded-2xl border p-4 text-left ${item.id === mentorId ? 'border-[#D94B68] bg-[#fff8f8]' : 'border-[#eadfd9] bg-[#FAF7F5]'}`}>
                  <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white font-bold text-[#D94B68]">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial(item.name)}</span><div><p className="text-sm font-bold">{item.name || `Mentor #${item.id}`}</p><p className="mt-1 text-xs text-[#D94B68]">Mentor</p></div></div>
                  <p className="mt-3 text-xs leading-relaxed text-[#6F6669]">Chọn để xem lịch trống.</p>
                </button>)}
              </div>
            </section>
            <section className={panel}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Ngày rảnh · 89 ngày tới</h2><div className="flex items-center gap-3"><span className="text-xs text-[#A59B9E]">GMT+7</span><button type="button" onClick={() => setRange(new Date())} className="text-xs font-semibold text-[#D94B68]">Làm mới lịch</button></div></div>
              {slotQuery.isPending && mentor && <p role="status" className="py-4 text-sm text-[#6F6669]">Đang tải lịch trống của {mentor.name}…</p>}
              {!mentor && <p className="py-4 text-sm text-[#6F6669]">Chọn mentor để xem lịch.</p>}
              {mentor && !slotQuery.isPending && !slotQuery.isError && !days.length && <p className="rounded-2xl bg-[#FAF7F5] p-5 text-sm text-[#6F6669]">{mentor.name} chưa có lịch trống được duyệt trong 89 ngày tới. Bạn có thể chọn mentor khác hoặc quay lại sau.</p>}
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
              <Link to={ready ? `/consultation-payment/?mentorId=${mentor.id}&slotId=${slot.id}` : '#'} state={ready ? { mentor, slot, goal, note } : null} aria-disabled={!ready} tabIndex={ready ? 0 : -1} className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-white ${ready ? 'bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]' : 'pointer-events-none bg-[#C4B8BA]'}`}>Tiếp tục</Link>
              <p className="mt-3 text-center text-xs leading-5 text-[#A59B9E]">Lịch chỉ được xác nhận sau khi hoàn tất đặt lịch và thanh toán.</p>
            </section>
            <section className={panel}><h3 className="text-sm font-bold">Trước giờ học</h3><ul className="mt-2 space-y-2 text-xs text-[#6F6669]"><li>Kiểm tra micro và camera trước 5 phút.</li><li>Chuẩn bị tài liệu cần hỏi.</li><li>Vào đúng giờ theo khung lịch đã chọn.</li></ul></section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
