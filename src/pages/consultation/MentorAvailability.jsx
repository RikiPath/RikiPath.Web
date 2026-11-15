import { useState, useCallback } from 'react';
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
const DAY_NAMES = ['T2','T3','T4','T5','T6','T7','CN'];
const DAY_FULL = ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
/** Tính Monday của tuần chứa (hôm nay + 1 tháng lịch) */
function calcMinWeek() {
  const today = vietnamDate();
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const iso = d.toISOString().slice(0, 10);
  const dow = d.getUTCDay();
  return shiftDate(iso, -((dow + 6) % 7));
}
function status(slot) {
  if (slot.rejectedAt) return 'Đã từ chối';
  if (!slot.isApproved) return 'Chưa công bố';
  if (asDate(slot.endTime) <= new Date()) return 'Đã kết thúc';
  return slot.bookedCount > 0 ? 'Đã đặt / giữ chỗ' : 'Đang mở';
}

/* ─────────────────────────────────────────────────────────────
   Modal: Đăng ký lịch trước ≥ 1 tháng
───────────────────────────────────────────────────────────── */
function RegisterModal({ onClose, onSaved }) {
  const cache = useQueryClient();
  const minWeek = calcMinWeek();
  const minDateLabel = new Date(`${minWeek}T12:00:00Z`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
  const [modalWeek, setModalWeek] = useState(minWeek);
  const [picks, setPicks] = useState([]);
  const [modalMsg, setModalMsg] = useState('');

  const modalDays = Array.from({ length: 7 }, (_, i) => ({
    key: shiftDate(modalWeek, i),
    short: DAY_NAMES[i],
    full: DAY_FULL[i],
  }));

  const weekLabel = w => {
    const end = shiftDate(w, 6);
    return `${w.split('-').reverse().join('/')} \u2013 ${end.split('-').reverse().join('/')}`;
  };

  const toggle = useCallback(key => {
    setPicks(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  const canPrev = shiftDate(modalWeek, -7) >= minWeek;
  const prevWeek = () => { if (canPrev) setModalWeek(shiftDate(modalWeek, -7)); };
  const nextWeek = () => setModalWeek(shiftDate(modalWeek, 7));

  const save = useMutation({
    mutationFn: () => saveWeeklyAvailability({
      weekStart: modalWeek,
      periods: picks.map(k => { const [date, period] = k.split('|'); return { date, period }; }),
    }),
    onSuccess: async () => {
      setModalMsg('\u2713 \u0110\u00e3 l\u01b0u \u0111\u0103ng k\u00fd. Admin s\u1ebd x\u1ebfp ti\u1ebft v\u00e0 th\u00f4ng b\u00e1o cho b\u1ea1n.');
      setPicks([]);
      await cache.invalidateQueries({ queryKey: ['mentor-week'] });
      setTimeout(() => { onSaved(); onClose(); }, 1800);
    },
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="\u0110\u0103ng k\u00fd l\u1ecbch tr\u01b0\u1edbc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,10,20,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0E7EC] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#AD3155] text-white">
              <span className="material-symbols-outlined text-[22px]">calendar_add_on</span>
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-[#49353F]">Đăng ký lịch trước</h2>
              <p className="text-[12px] text-[#A0788B]">Chỉ đăng ký từ <strong className="text-[#AD3155]">{minDateLabel}</strong> trở đi (≥ 1 tháng từ hôm nay)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className={`flex h-8 w-8 items-center justify-center rounded-full text-[#A0788B] hover:bg-[#F7EFF3] transition-colors ${focus}`}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between gap-2 border-b border-[#F7EEF3] bg-[#FCF4F8] px-6 py-3">
          <button type="button" onClick={prevWeek} disabled={!canPrev} className={`${button} px-2.5`}>← Tuần trước</button>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#79465D]">{weekLabel(modalWeek)}</p>
            <p className="text-[11px] text-[#B08899]">
              Tuần thứ {Math.round((new Date(`${modalWeek}T12:00:00Z`) - new Date(`${monday(0)}T12:00:00Z`)) / 604800000)} kể từ tuần hiện tại
            </p>
          </div>
          <button type="button" onClick={nextWeek} className={`${button} px-2.5`}>Tuần tới →</button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-[12px] text-[#8C7080]">Tick ch&#x1ECD;n c&#xE1;c bu&#x1ED5;i b&#x1EA1;n <strong>r&#x1EA3;nh</strong>. T&#x1ED1;i thi&#x1EC3;u <strong>3 bu&#x1ED5;i</strong>. Admin s&#x1EBD; x&#x1EBF;p ti&#x1EBF;t 50 ph&#xFA;t v&#xE0; th&#xF4;ng b&#xE1;o.</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7C9D6] bg-[#FDF2F6] px-3 py-1 text-[11px] text-[#79465D]">
                <span className="font-semibold">{p.name}</span>
                <span className="text-[#B08899]">{p.timeRange}</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {modalDays.map(day => {
              const active = PERIODS.some(p => picks.includes(`${day.key}|${p.id}`));
              return (
                <div key={day.key} className={`rounded-2xl border p-3 transition-all duration-200 ${active ? 'border-[#AD3155] bg-[#FDF2F6] shadow-sm' : 'border-[#EDE0E7] bg-[#FAFAFA]'}`}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[10px] font-medium text-[#B08899]">{day.short}</span>
                    <span className="text-[18px] font-bold leading-none text-[#49353F]">{Number(day.key.slice(-2))}</span>
                  </div>
                  <div className="space-y-2">
                    {PERIODS.map(p => {
                      const k = `${day.key}|${p.id}`;
                      const checked = picks.includes(k);
                      return (
                        <label key={p.id} className={`flex cursor-pointer flex-col rounded-lg px-2 py-1.5 text-[11px] transition-colors ${checked ? 'bg-[#AD3155] text-white' : 'bg-white text-[#705261] hover:bg-[#F7EEF3]'}`}>
                          <span className="flex items-center gap-1.5">
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(k)} aria-label={`${p.name} ${p.timeRange} ${day.full} ${day.key}`} />
                            <span className={`material-symbols-outlined text-[13px] leading-none ${checked ? 'text-white' : 'text-[#C4A0B0]'}`}>{checked ? 'check_circle' : 'radio_button_unchecked'}</span>
                            <span className="font-medium">{p.name}</span>
                          </span>
                          <span className={`mt-0.5 pl-[22px] text-[9px] leading-none ${checked ? 'text-white/80' : 'text-[#B08899]'}`}>{p.timeRange}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {picks.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[#E7C9D6] bg-[#FDF2F6] p-4">
              <p className="mb-2 text-[12px] font-semibold text-[#79465D]">
                Đã chọn {picks.length} buổi {picks.length < 3 && <span className="font-normal text-[#C0566E]">(cần thêm {3 - picks.length} buổi nữa)</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...picks].sort().map(k => {
                  const [date, period] = k.split('|');
                  const p = PERIODS.find(x => x.id === period);
                  const d = new Date(date + 'T12:00:00+07:00');
                  const label = `${DAY_NAMES[(d.getUTCDay() + 6) % 7]} ${Number(date.slice(-2))}/${date.slice(5,7)} ${p?.name}`;
                  return (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-[#AD3155] px-2.5 py-0.5 text-[11px] text-white">
                      {label}
                      <button type="button" onClick={() => toggle(k)} aria-label={`Bỏ chọn ${label}`} className="ml-0.5 hover:text-white/70">×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {save.error && <p role="alert" className="mt-4 rounded-xl bg-[#FDE8EE] px-4 py-3 text-[12px] text-[#A33357]">{save.error.message}</p>}
          {modalMsg && <p role="status" className="mt-4 rounded-xl bg-[#EBF7ED] px-4 py-3 text-[12px] text-[#2E7D32]">{modalMsg}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#F0E7EC] bg-[#FDFBFC] px-6 py-4">
          <button type="button" onClick={onClose} className={button}>Huỷ</button>
          <button
            type="button"
            disabled={picks.length < 3 || save.isPending}
            onClick={() => save.mutate()}
            className={`flex items-center gap-2 rounded-xl bg-[#AD3155] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#952A48] active:scale-[0.97] transition-all duration-150 disabled:opacity-40 ${focus}`}
          >
            {save.isPending
              ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Đang lưu…</>
              : <><span className="material-symbols-outlined text-[16px]">save</span> Lưu đăng ký ({picks.length} buổi)</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MentorAvailability() {
  const { pathname } = useLocation(); const cache = useQueryClient();
  const [week, setWeek] = useState(() => monday(1));
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState(''); const [change, setChange] = useState(null); const [reason, setReason] = useState('');
  const [showModal, setShowModal] = useState(false);
  const registrations = useQuery({ queryKey: ['mentor-week', week], queryFn: () => getWeeklyAvailability(week) });
  const slots = useQuery({ queryKey: ['mentor-assigned-slots'], queryFn: async () => (await api.get('/mentor/availability')).result || [], refetchInterval: 15000 });
  const selected = draft?.week === week ? draft.periods : (registrations.data || []).map(r => `${r.date}|${r.period}`);
  const cutoff = new Date(`${shiftDate(week, -3)}T18:00:00+07:00`);
  const canEdit = week === monday(1) && new Date() < cutoff;
  const mutate = useMutation({ mutationFn: saveWeeklyAvailability, onSuccess: async () => { setDraft(null); setMessage('Đã lưu đăng ký buổi rảnh. Admin sẽ xếp lịch riêng cho bạn.'); await cache.invalidateQueries({ queryKey: ['mentor-week'] }); } });
  const request = useMutation({ mutationFn: () => requestSlotChange(change, reason), onSuccess: async () => { setChange(null); setReason(''); setMessage('Đã gửi yêu cầu điều chỉnh. Lịch hiện tại vẫn có hiệu lực đến khi admin xử lý.'); await cache.invalidateQueries({ queryKey: ['mentor-assigned-slots'] }); } });
  const allSlots = slots.data || []; const days = Array.from({ length: 7 }, (_, i) => ({ key: shiftDate(week, i), name: DAY_NAMES[i] }));
  const later = allSlots.filter(s => keyOf(s) >= shiftDate(week, 7)).sort((a,b) => asDate(a.startTime) - asDate(b.startTime));
  const laterDays = [...new Set(later.map(keyOf))];
  const error = registrations.error || slots.error || mutate.error || request.error;
  const refresh = () => { registrations.refetch(); slots.refetch(); };
  const row = (slot, light = false) => <article key={slot.id} className={`flex flex-wrap items-center justify-between gap-1 rounded-lg p-2 text-[12px] ${light ? 'bg-white/15' : ''}`}><div><p className="font-medium">{clock(slot.startTime)}–{clock(slot.endTime)}</p><p className={light ? 'text-white/75' : 'text-[#A0788B]'}>{status(slot)}</p>{slot.changeRequestedAt && <p>Chờ admin điều chỉnh</p>}{slot.changeResolution && <p>{slot.changeResolution}</p>}</div><button type="button" className={`${focus} rounded ${light ? 'text-white' : 'text-[#AD3155]'}`} disabled={!!slot.changeRequestedAt || asDate(slot.startTime) <= new Date()} onClick={() => { setChange(slot.id); setReason(''); }}>Yêu cầu sửa</button></article>;
  return <ConsultShell pathname={pathname} breadcrumb="Lịch khả dụng"><main data-page="MentorAvailability" className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[25px] font-semibold tracking-tight">Lịch khả dụng</h1><p className="mt-1.5 text-[13px] text-[#927B88]">{allSlots.length} tiết · {allSlots.filter(s => s.isApproved && !s.bookedCount && asDate(s.endTime) > new Date()).length} đang mở · {allSlots.filter(s => s.bookedCount > 0).length} đã đặt / giữ chỗ · Giờ Việt Nam</p></div><div className="flex items-center gap-2"><button type="button" className={button} disabled={slots.isFetching || registrations.isFetching} onClick={refresh}>Làm mới</button><button type="button" id="btn-dang-ky-lich" className={`flex items-center gap-1.5 h-9 rounded-lg bg-[#AD3155] px-4 text-[12px] font-semibold text-white shadow-sm hover:bg-[#952A48] active:scale-[0.97] transition-all duration-150 ${focus}`} onClick={() => setShowModal(true)}><span className="material-symbols-outlined text-[16px] leading-none">calendar_add_on</span>Đăng ký lịch</button></div></header>
    <div className="mb-4 flex flex-wrap justify-end items-center gap-2"><span className="mr-auto text-[13px] text-[#79465D]">{week.split('-').reverse().join('/')} – {shiftDate(week, 6).split('-').reverse().join('/')}</span><button type="button" className={button} onClick={() => setWeek(shiftDate(week, -7))}>← Tuần trước</button><button type="button" className={button} onClick={() => setWeek(monday())}>Tuần này</button><button type="button" className={button} onClick={() => setWeek(shiftDate(week, 7))}>Tuần tới →</button></div>
    <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <form id="form-dang-ky" className="rounded-3xl border border-[#E7C9D6] bg-[#FCF4F8] p-5" onSubmit={e => { e.preventDefault(); if (canEdit && selected.length >= 3 && !mutate.isPending) mutate.mutate({ weekStart: week, periods: selected.map(k => { const [date, period] = k.split('|'); return { date, period }; }) }); }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#AD3155] text-white"><span className="material-symbols-outlined text-[24px]">event_available</span></span>
        <h2 className="mt-4 text-[18px] font-semibold text-[#79465D]">Đăng ký buổi rảnh</h2><p className="mt-1 text-[12px] leading-5 text-[#A0788B]">Đăng ký tối thiểu 3 buổi rảnh mỗi tuần. Admin xếp tiết 50 phút, nghỉ 10 phút.</p>
        <div className="mt-3 space-y-1 rounded-xl bg-white/70 px-3 py-2">
          {PERIODS.map(p => (
            <div key={p.id} className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#79465D]">{p.name}</span>
              <span className="tabular-nums text-[#A0788B]">{p.timeRange}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-[#8C6070]">Tích chọn trực tiếp buổi rảnh trên lịch 7 ngày bên cạnh.</p>
        <p className="mt-4 text-[12px] leading-5 text-[#A0788B]">Đã chọn {selected.length}/3 buổi tối thiểu trong tuần. Hạn đăng ký: 18:00 thứ Sáu trước tuần học.</p>
        <button type="submit" disabled={!canEdit || selected.length < 3 || mutate.isPending || registrations.isPending} className={`mt-4 w-full rounded-xl bg-[#AD3155] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-50 ${focus}`}>Lưu đăng ký tuần</button>
        <div className="mt-4 border-t border-[#EDD8E4] pt-4">
          <p className="text-[11px] leading-5 text-[#A0788B]">Muốn đăng ký lịch trước <strong>1 tháng trở lên</strong>?</p>
          <button type="button" onClick={() => setShowModal(true)} className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E7C9D6] bg-white px-4 py-2.5 text-[12px] font-medium text-[#AD3155] hover:bg-[#FDF2F6] transition-colors ${focus}`}><span className="material-symbols-outlined text-[15px]">calendar_add_on</span>Đăng ký lịch trước</button>
        </div>
        {!canEdit && <><p className="mt-3 text-[12px] leading-5 text-[#8C6070]">Chỉ sửa đăng ký tuần sau trước hạn. Tiết đã xếp cần gửi yêu cầu điều chỉnh.</p><button type="button" className="mt-3 text-[12px] text-[#AD3155] underline" onClick={() => setWeek(monday(1))}>Đăng ký cho tuần sau</button></>}
      </form>
      <div>{message && <p role="status" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#8A6070]">{message}</p>}{error && <p role="alert" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-busy={slots.isFetching}>{days.map(day => { const today = day.key === vietnamDate(); const items = allSlots.filter(s => keyOf(s) === day.key); return <div key={day.key} className={`min-h-[148px] rounded-2xl border p-2.5 ${today ? 'border-[#AD3155] bg-[#AD3155] text-white' : 'border-dashed border-[#E7C9D6] bg-white text-[#49353F]'}`}><div className={`flex w-full items-baseline justify-between rounded ${focus}`} aria-label={`${day.name} ${day.key}`}><span className={`text-[11px] ${today ? 'text-white/80' : 'text-[#B18F9E]'}`}>{day.name}</span><span className="text-[20px] font-semibold leading-none">{Number(day.key.slice(-2))}</span></div><div className="mt-2 space-y-1.5"><fieldset disabled={!canEdit || mutate.isPending || registrations.isPending} className="space-y-2 py-2"><legend className="sr-only">Buổi rảnh {day.name} {day.key}</legend>{PERIODS.map(p => { const key = `${day.key}|${p.id}`; return <label key={p.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg py-1 text-[12px]"><input type="checkbox" aria-label={`${p.name} ${day.key}`} className="accent-[#AD3155]" checked={selected.includes(key)} onChange={e => setDraft({ week, periods: e.target.checked ? [...selected, key] : selected.filter(k => k !== key) })}/>{p.name}</label>; })}</fieldset>{items.map(s => row(s,today))}{!slots.isPending && !items.length && <p className={`pt-5 text-center text-[11px] ${today ? 'text-white/70' : 'text-[#C4AEB8]'}`}>Chưa xếp tiết</p>}</div></div>; })}</section>
      </div>
    </div>
    {laterDays.length > 0 && <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white"><h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">Khung giờ khác</h2>{laterDays.map(day => <div key={day} className="border-b border-[#F0E7EC] last:border-b-0"><p className="bg-[#FAF8F7] px-4 py-2 text-[12px] text-[#8C7782]">{dateTitle(day)}</p><div className="divide-y divide-[#F0E7EC]">{later.filter(s => keyOf(s) === day).map(s => row(s))}</div></div>)}</section>}
    {change && <section role="dialog" aria-label="Yêu cầu điều chỉnh" className="mt-4 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Lý do và lịch thay thế mong muốn</h2><textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="mt-3 w-full rounded-lg border p-3"/><button type="button" disabled={!reason.trim() || request.isPending} onClick={() => request.mutate()} className="mr-4 text-[#AD3155]">Gửi admin</button><button type="button" onClick={() => setChange(null)}>Đóng</button></section>}
    {showModal && <RegisterModal onClose={() => setShowModal(false)} onSaved={() => setMessage('Đã lưu đăng ký lịch trước. Admin sẽ xếp tiết và thông báo cho bạn.')} />}
  </main></ConsultShell>;
}