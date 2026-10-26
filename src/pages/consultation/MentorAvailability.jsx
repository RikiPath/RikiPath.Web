import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ConsultShell } from '../../components/shells';
import { api } from '../../api/client.js';
import { getWeeklyAvailability, saveWeeklyAvailability, requestSlotChange } from '../../api/mentorScheduleApi.js';
import { REGISTRATION_PERIODS as PERIODS, monday, shiftDate, vietnamDate } from '../../utils/mentorSchedule.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const button = `h-9 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] disabled:opacity-50 ${focus}`;
const asDate = iso => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : iso + 'Z');
const clock = iso => asDate(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const keyOf = slot => vietnamDate(asDate(slot.startTime));
const dateTitle = key => new Date(key + 'T12:00:00+07:00').toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
function status(slot) {
  if (slot.rejectedAt) return 'Đã từ chối';
  if (!slot.isApproved) return 'Chưa công bố';
  if (asDate(slot.endTime) <= new Date()) return 'Đã kết thúc';
  return slot.bookedCount > 0 ? 'Đã đặt / giữ chỗ' : 'Đang mở';
}

export default function MentorAvailability() {
  const { pathname } = useLocation(); const cache = useQueryClient();
  const [week, setWeek] = useState(() => monday(1));
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState(''); const [change, setChange] = useState(null); const [reason, setReason] = useState('');
  const registrations = useQuery({ queryKey: ['mentor-week', week], queryFn: () => getWeeklyAvailability(week) });
  const slots = useQuery({ queryKey: ['mentor-assigned-slots'], queryFn: async () => (await api.get('/mentor/availability')).result || [], refetchInterval: 15000 });
  const selected = draft?.week === week ? draft.periods : (registrations.data || []).map(r => `${r.date}|${r.period}`);
  const cutoff = new Date(`${shiftDate(week, -3)}T18:00:00+07:00`);
  const canEdit = week === monday(1) && new Date() < cutoff;
  const mutate = useMutation({ mutationFn: saveWeeklyAvailability, onSuccess: async () => { setDraft(null); setMessage('Đã lưu đăng ký buổi rảnh. Admin sẽ xếp lịch riêng cho bạn.'); await cache.invalidateQueries({ queryKey: ['mentor-week'] }); } });
  const request = useMutation({ mutationFn: () => requestSlotChange(change, reason), onSuccess: async () => { setChange(null); setReason(''); setMessage('Đã gửi yêu cầu điều chỉnh. Lịch hiện tại vẫn có hiệu lực đến khi admin xử lý.'); await cache.invalidateQueries({ queryKey: ['mentor-assigned-slots'] }); } });
  const allSlots = slots.data || []; const days = Array.from({ length: 7 }, (_, i) => ({ key: shiftDate(week, i), name: ['T2','T3','T4','T5','T6','T7','CN'][i] }));
  const later = allSlots.filter(s => keyOf(s) >= shiftDate(week, 7)).sort((a,b) => asDate(a.startTime) - asDate(b.startTime));
  const laterDays = [...new Set(later.map(keyOf))];
  const error = registrations.error || slots.error || mutate.error || request.error;
  const refresh = () => { registrations.refetch(); slots.refetch(); };
  const row = (slot, light = false) => <article key={slot.id} className={`flex flex-wrap items-center justify-between gap-1 rounded-lg p-2 text-[12px] ${light ? 'bg-white/15' : ''}`}><div><p className="font-medium">{clock(slot.startTime)}–{clock(slot.endTime)}</p><p className={light ? 'text-white/75' : 'text-[#A0788B]'}>{status(slot)}</p>{slot.changeRequestedAt && <p>Chờ admin điều chỉnh</p>}{slot.changeResolution && <p>{slot.changeResolution}</p>}</div><button type="button" className={`${focus} rounded ${light ? 'text-white' : 'text-[#AD3155]'}`} disabled={!!slot.changeRequestedAt || asDate(slot.startTime) <= new Date()} onClick={() => { setChange(slot.id); setReason(''); }}>Yêu cầu sửa</button></article>;
  return <ConsultShell pathname={pathname} breadcrumb="Lịch khả dụng"><main data-page="MentorAvailability" className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[25px] font-semibold tracking-tight">Lịch khả dụng</h1><p className="mt-1.5 text-[13px] text-[#927B88]">{allSlots.length} tiết · {allSlots.filter(s => s.isApproved && !s.bookedCount && asDate(s.endTime) > new Date()).length} đang mở · {allSlots.filter(s => s.bookedCount > 0).length} đã đặt / giữ chỗ · Giờ Việt Nam</p></div><button type="button" className={button} disabled={slots.isFetching || registrations.isFetching} onClick={refresh}>Làm mới</button></header>
    <div className="mb-4 flex flex-wrap justify-end items-center gap-2"><span className="mr-auto text-[13px] text-[#79465D]">{week.split('-').reverse().join('/')} – {shiftDate(week, 6).split('-').reverse().join('/')}</span><button type="button" className={button} onClick={() => setWeek(shiftDate(week, -7))}>← Tuần trước</button><button type="button" className={button} onClick={() => setWeek(monday())}>Tuần này</button><button type="button" className={button} onClick={() => setWeek(shiftDate(week, 7))}>Tuần tới →</button></div>
    <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <form className="rounded-3xl border border-[#E7C9D6] bg-[#FCF4F8] p-5" onSubmit={e => { e.preventDefault(); if (canEdit && selected.length >= 3 && !mutate.isPending) mutate.mutate({ weekStart: week, periods: selected.map(k => { const [date, period] = k.split('|'); return { date, period }; }) }); }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#AD3155] text-white"><span className="material-symbols-outlined text-[24px]">event_available</span></span>
        <h2 className="mt-4 text-[18px] font-semibold text-[#79465D]">Đăng ký buổi rảnh</h2><p className="mt-1 text-[12px] leading-5 text-[#A0788B]">Đăng ký tối thiểu 3 buổi sáng, chiều hoặc tối mỗi tuần. Admin xếp tiết 50 phút, nghỉ 10 phút.</p>
        <p className="mt-4 text-[12px] leading-5 text-[#8C6070]">Tích chọn trực tiếp buổi rảnh trên lịch 7 ngày bên cạnh.</p>
        <p className="mt-4 text-[12px] leading-5 text-[#A0788B]">Đã chọn {selected.length}/3 buổi tối thiểu trong tuần. Hạn đăng ký: 18:00 thứ Sáu trước tuần học.</p>
        <button type="submit" disabled={!canEdit || selected.length < 3 || mutate.isPending || registrations.isPending} className={`mt-4 w-full rounded-xl bg-[#AD3155] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-50 ${focus}`}>Lưu đăng ký tuần</button>
        {!canEdit && <><p className="mt-3 text-[12px] leading-5 text-[#8C6070]">Chỉ sửa đăng ký tuần sau trước hạn. Tiết đã xếp cần gửi yêu cầu điều chỉnh.</p><button type="button" className="mt-3 text-[12px] text-[#AD3155] underline" onClick={() => setWeek(monday(1))}>Đăng ký cho tuần sau</button></>}
      </form>
      <div>{message && <p role="status" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#8A6070]">{message}</p>}{error && <p role="alert" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-busy={slots.isFetching}>{days.map(day => { const today = day.key === vietnamDate(); const items = allSlots.filter(s => keyOf(s) === day.key); return <div key={day.key} className={`min-h-[148px] rounded-2xl border p-2.5 ${today ? 'border-[#AD3155] bg-[#AD3155] text-white' : 'border-dashed border-[#E7C9D6] bg-white text-[#49353F]'}`}><div className={`flex w-full items-baseline justify-between rounded ${focus}`} aria-label={`${day.name} ${day.key}`}><span className={`text-[11px] ${today ? 'text-white/80' : 'text-[#B18F9E]'}`}>{day.name}</span><span className="text-[20px] font-semibold leading-none">{Number(day.key.slice(-2))}</span></div><div className="mt-2 space-y-1.5"><fieldset disabled={!canEdit || mutate.isPending || registrations.isPending} className="space-y-2 py-2"><legend className="sr-only">Buổi rảnh {day.name} {day.key}</legend>{PERIODS.map(p => { const key = `${day.key}|${p.id}`; return <label key={p.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg py-1 text-[12px]"><input type="checkbox" aria-label={`${p.name} ${day.key}`} className="accent-[#AD3155]" checked={selected.includes(key)} onChange={e => setDraft({ week, periods: e.target.checked ? [...selected, key] : selected.filter(k => k !== key) })}/>{p.name}</label>; })}</fieldset>{items.map(s => row(s,today))}{!slots.isPending && !items.length && <p className={`pt-5 text-center text-[11px] ${today ? 'text-white/70' : 'text-[#C4AEB8]'}`}>Chưa xếp tiết</p>}</div></div>; })}</section>
      </div>
    </div>
    {laterDays.length > 0 && <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white"><h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">Khung giờ khác</h2>{laterDays.map(day => <div key={day} className="border-b border-[#F0E7EC] last:border-b-0"><p className="bg-[#FAF8F7] px-4 py-2 text-[12px] text-[#8C7782]">{dateTitle(day)}</p><div className="divide-y divide-[#F0E7EC]">{later.filter(s => keyOf(s) === day).map(s => row(s))}</div></div>)}</section>}
    {change && <section role="dialog" aria-label="Yêu cầu điều chỉnh" className="mt-4 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Lý do và lịch thay thế mong muốn</h2><textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="mt-3 w-full rounded-lg border p-3"/><button type="button" disabled={!reason.trim() || request.isPending} onClick={() => request.mutate()} className="mr-4 text-[#AD3155]">Gửi admin</button><button type="button" onClick={() => setChange(null)}>Đóng</button></section>}
  </main></ConsultShell>;
}