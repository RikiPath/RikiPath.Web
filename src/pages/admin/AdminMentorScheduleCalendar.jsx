import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw } from 'lucide-react';
import { getAdminMentorSchedule } from '../../api/admin.js';
import { monday, shiftDate, vietnamDate } from '../../utils/mentorSchedule.js';

const STATES = {
  Available: ['Trống', 'bg-[#51956B]'], Booked: ['Đã đặt', 'bg-[#AD3155]'],
  Held: ['Chờ thanh toán', 'bg-amber-500'], HeldExpired: ['Giữ chỗ hết hạn', 'bg-[#A99AA1]'],
  Draft: ['Chưa công bố', 'bg-amber-500'], Ended: ['Đã kết thúc', 'bg-[#A99AA1]'],
  Cancelled: ['Đã hủy', 'bg-red-500'], Rejected: ['Đã từ chối', 'bg-red-500'],
};
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#E5DDE1] bg-white px-3 text-[12px] text-[#75616C] hover:bg-[#FAF5F7] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/40';
const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const clock = value => asDate(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const activeBookings = slot => slot.bookings.filter(b => b.paymentStatus === 'Paid' && ['Assigned', 'Accepted', 'Completed'].includes(b.status));

export default function AdminMentorScheduleCalendar({ mentorId, mentorName, email, initials, onClose }) {
  const [weekStart, setWeekStart] = useState(() => monday());
  const today = vietnamDate();
  const [dayIndex, setDayIndex] = useState(() => (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7);
  const from = new Date(`${weekStart}T00:00:00+07:00`).toISOString();
  const to = new Date(`${shiftDate(weekStart, 7)}T00:00:00+07:00`).toISOString();
  const query = useQuery({ queryKey: ['admin-mentor-calendar', mentorId, from, to],
    queryFn: () => getAdminMentorSchedule(mentorId, from, to), enabled: Number(mentorId) > 0,
    retry: false, refetchInterval: 15000 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = shiftDate(weekStart, i);
    return { key, label: i === 6 ? 'CN' : `T${i + 2}`, date: `${key.slice(8)}-${key.slice(5, 7)}` };
  });
  const slots = (query.data || []).filter(s => vietnamDate(asDate(s.startTime)) === days[dayIndex].key);
  const bookedCount = slots.reduce((count, slot) => count + activeBookings(slot).length, 0);
  return <>
    <header className="flex items-start justify-between gap-4 border-b border-[#EEE7EA] px-5 py-4">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EAF0] text-[13px] font-medium text-[#AD3155]">{initials}</div>
        <div className="min-w-0"><h2 id="mentor-schedule-title" className="truncate text-[16px] font-semibold">{mentorName}</h2><p className="mt-1 truncate text-[12px] text-[#8C7D84]">{email || 'Lịch tư vấn'}</p></div>
      </div><button type="button" onClick={onClose} aria-label="Đóng lịch" className="rounded-lg p-1.5 text-[#95858D] hover:bg-[#F8F3F5]"><X size={19}/></button>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF5F7] px-5 py-3"><p className="text-[12px] text-[#8C6E7B]">Dữ liệu lịch thực tế · Giờ Việt Nam · Tự cập nhật mỗi 15 giây</p><button type="button" disabled={query.isFetching} onClick={() => query.refetch()} className={button} aria-label="Làm mới lịch mentor"><RefreshCw size={14}/>Làm mới</button></div>
    <div className="overflow-y-auto px-5 pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3"><p className="text-[12px] font-medium text-[#79465D]" aria-live="polite">{weekStart.split('-').reverse().join('/')} – {shiftDate(weekStart, 6).split('-').reverse().join('/')}</p><div className="flex gap-2"><button type="button" className={button} onClick={() => setWeekStart(value => shiftDate(value, -7))}>← Tuần trước</button><button type="button" className={button} onClick={() => { setWeekStart(monday()); setDayIndex((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7); }}>Tuần này</button><button type="button" className={button} onClick={() => setWeekStart(value => shiftDate(value, 7))}>Tuần tới →</button></div></div>
      <div aria-label="Chọn ngày xem lịch" className="grid grid-cols-7 gap-1 border-b border-[#EEE7EA] py-3">{days.map((day, index) => <button key={day.key} type="button" aria-pressed={dayIndex === index} onClick={() => setDayIndex(index)} className={`rounded-lg py-2 text-center transition ${dayIndex === index ? 'bg-[#F8EAF0] text-[#AD3155]' : 'text-[#82737B] hover:bg-[#FAF6F8]'}`}><span className="block text-[11px]">{day.label}{day.key === today ? ' •' : ''}</span><span className="mt-1 block text-[12px] font-medium">{day.date}</span></button>)}</div>
      {query.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{query.error.message}</p>}
      <div className="flex items-center justify-between py-3"><h3 className="text-[13px] font-medium">Lịch ngày {days[dayIndex].date}</h3><span className="text-[12px] text-[#8C7D84]">{query.isPending ? 'Đang tải…' : `${bookedCount} lượt đặt · ${slots.length} tiết`}</span></div>
      <div className="overflow-x-auto" aria-busy={query.isFetching}><table className="w-full min-w-[520px] text-left"><thead className="bg-[#FCFAFB] text-[12px] text-[#8C7D84]"><tr><th className="px-3 py-2.5 font-medium">Khung giờ</th><th className="px-3 py-2.5 font-medium">Người đặt / Nội dung</th><th className="px-3 py-2.5 text-right font-medium">Trạng thái</th></tr></thead>
        <tbody className="divide-y divide-[#F2EDF0]">{!query.isError && slots.map(slot => { const [label, color] = STATES[slot.status] || [slot.status, 'bg-[#A99AA1]']; const paid = activeBookings(slot); const visible = paid.length ? paid : slot.bookings.filter(b => slot.status === 'Held' ? b.status === 'AwaitingPayment' : slot.status === 'Cancelled' && b.status === 'Cancelled'); return <tr key={slot.id}><td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium tabular-nums text-[#62515A]">{clock(slot.startTime)}–{clock(slot.endTime)}</td><td className="px-3 py-3">{visible.length ? visible.map(b => <div key={b.id} className="mb-2 last:mb-0"><p className="text-[13px] font-medium">{b.learnerName || `Học viên #${b.learnerId}`}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] text-[#8C7D84]">{b.question || 'Chưa gửi nội dung tư vấn.'}</p></div>) : <span className="text-[12px] text-[#B4A6AD]">Chưa có người đặt</span>}</td><td className="px-3 py-3 text-right"><span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-[#75616C]"><span className={`h-1.5 w-1.5 rounded-full ${color}`}/>{label}</span></td></tr>; })}
          {query.isPending && <tr><td colSpan={3} className="p-6 text-center text-sm text-[#8C7D84]">Đang tải lịch từ hệ thống…</td></tr>}
          {!query.isPending && !query.isError && !slots.length && <tr><td colSpan={3} className="p-6 text-center text-sm text-[#8C7D84]">Ngày này chưa có tiết được xếp cho mentor.</td></tr>}
        </tbody></table></div>
    </div><footer className="flex justify-end border-t border-[#EEE7EA] px-5 py-3"><button type="button" onClick={onClose} className={button}>Đóng</button></footer>
  </>;
}
