import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import {
  disableMentorSlot,
  getMyMentorSchedule,
  previewMentorSlots,
  publishMentorSlots,
  updateMyMentorSchedule,
} from '../../api/mentorScheduleManageApi.js';
import { vietnamDate } from '../../utils/vietnamDate.js';

const WEEKDAYS = [
  { id: 1, short: 'T2', label: 'Thứ hai' },
  { id: 2, short: 'T3', label: 'Thứ ba' },
  { id: 3, short: 'T4', label: 'Thứ tư' },
  { id: 4, short: 'T5', label: 'Thứ năm' },
  { id: 5, short: 'T6', label: 'Thứ sáu' },
  { id: 6, short: 'T7', label: 'Thứ bảy' },
  { id: 0, short: 'CN', label: 'Chủ nhật' },
];

const DAYPARTS = [
  { code: 'Morning', label: 'Sáng', start: '07:00:00', end: '11:00:00', tone: 'border-[#AD3155] bg-[#FCE8F0] text-[#8B2344]', dot: 'bg-[#AD3155]' },
  { code: 'Noon', label: 'Trưa', start: '11:00:00', end: '13:00:00', tone: 'border-[#C47B16] bg-[#FFF6E8] text-[#8A5A10]', dot: 'bg-[#C47B16]' },
  { code: 'Afternoon', label: 'Chiều', start: '13:00:00', end: '18:00:00', tone: 'border-[#2F6B45] bg-[#E7F6EC] text-[#1E5C36]', dot: 'bg-[#2F6B45]' },
  { code: 'Evening', label: 'Tối', start: '18:00:00', end: '22:00:00', tone: 'border-[#7A3E98] bg-[#F4E9F8] text-[#5C2E73]', dot: 'bg-[#7A3E98]' },
];

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 52;
const keyOf = (weekday, code) => `${weekday}-${code}`;

function addIsoDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function mondayOf(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addIsoDays(iso, weekday === 0 ? -6 : 1 - weekday);
}

function minutesOf(value) {
  const [hour, minute] = String(value).slice(0, 5).split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function clock(value) {
  return String(value).slice(0, 5);
}

function weekTitle(days) {
  const first = days[0];
  const last = days[6];
  if (first.month === last.month) return `${first.date} – ${last.date} tháng ${first.month}, ${first.year}`;
  return `${first.date} thg ${first.month} – ${last.date} thg ${last.month}, ${last.year}`;
}

export default function MentorShiftSchedule() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [selected, setSelected] = useState(() => new Set());
  const [weekOffset, setWeekOffset] = useState(0);
  const [preview, setPreview] = useState(null);
  const [published, setPublished] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [activeSlotId, setActiveSlotId] = useState(null);

  const query = useQuery({
    queryKey: ['my-mentor-schedule'],
    queryFn: getMyMentorSchedule,
    retry: false,
  });

  useEffect(() => {
    const today = vietnamDate(0);
    const rules = (query.data?.rules || []).filter((rule) => !rule.effectiveTo || rule.effectiveTo >= today);
    setSelected(new Set(rules.map((rule) => keyOf(rule.weekday, rule.daypartCode))));
  }, [query.data]);

  const weekStart = addIsoDays(mondayOf(vietnamDate(0)), weekOffset * 7);
  const days = WEEKDAYS.map((day, index) => {
    const iso = addIsoDays(weekStart, index);
    const [year, month, date] = iso.split('-').map(Number);
    return { ...day, iso, year, month, date, today: iso === vietnamDate(0) };
  });
  const weekEnd = days[6].iso;

  const rules = useMemo(() => {
    const effectiveFrom = vietnamDate(0);
    return WEEKDAYS.flatMap((day) => DAYPARTS
      .filter((part) => selected.has(keyOf(day.id, part.code)))
      .map((part) => ({
        weekday: day.id,
        daypartCode: part.code,
        localStart: part.start,
        localEnd: part.end,
        effectiveFrom,
      })));
  }, [selected]);

  const toggle = (weekday, code) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = keyOf(weekday, code);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => updateMyMentorSchedule({
      timeZoneId: 'Asia/Ho_Chi_Minh',
      autoPublish: true,
      effectiveFrom: vietnamDate(0),
      rules,
    }),
    onSuccess: (schedule) => {
      client.setQueryData(['my-mentor-schedule'], schedule);
      setError('');
      setMessage('Đã lưu ca làm việc lặp theo tuần.');
    },
    onError: (err) => setError(err.message),
  });

  const previewMutation = useMutation({
    mutationFn: () => previewMentorSlots({ startDate: weekStart, endDate: weekEnd }),
    onSuccess: (data) => { setPreview(data); setError(''); setMessage('Đã xem trước khung 90 phút của tuần này.'); },
    onError: (err) => setError(err.message),
  });

  const publish = useMutation({
    mutationFn: () => publishMentorSlots({ startDate: weekStart, endDate: weekEnd }),
    onSuccess: (data) => {
      setPublished(data);
      setError('');
      setMessage(`Đã công bố ${data.createdCount} khung giờ. Bỏ qua ${data.skippedExistingCount} khung đã có.`);
    },
    onError: (err) => setError(err.message),
  });

  const disable = useMutation({
    mutationFn: (slotId) => disableMentorSlot(slotId, { reason: disableReason || null }),
    onSuccess: () => { setError(''); setActiveSlotId(null); setMessage('Đã đóng khung giờ.'); },
    onError: (err) => setError(err.message),
  });

  const previewByDay = useMemo(() => {
    const map = new Map();
    (preview?.slots || []).forEach((slot) => {
      const list = map.get(slot.localDate) || [];
      list.push(slot);
      map.set(slot.localDate, list);
    });
    return map;
  }, [preview]);

  const publishedByKey = useMemo(() => {
    const map = new Map();
    (published?.publishedSlots || []).forEach((slot) => {
      map.set(`${slot.localDate}-${clock(slot.localStart)}`, slot);
    });
    return map;
  }, [published]);

  const activeSlot = (published?.publishedSlots || []).find((slot) => slot.availabilityId === activeSlotId);
  const missing = query.error?.status === 404;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const buttonClass = 'inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35';

  return (
    <ConsultShell pathname={pathname} breadcrumb="Ca làm việc">
      <div className="box-border flex h-[calc(100vh-64px)] min-w-0 max-w-full flex-col overflow-hidden px-4 py-4 text-[#49353F] sm:px-6">
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-semibold tracking-tight">Ca làm việc</h1>
          <button type="button" onClick={() => setWeekOffset(0)} className={buttonClass}>Hôm nay</button>
          <button type="button" aria-label="Tuần trước" onClick={() => setWeekOffset((value) => value - 1)} className={`${buttonClass} w-9 px-0`}>‹</button>
          <button type="button" aria-label="Tuần tới" onClick={() => setWeekOffset((value) => value + 1)} className={`${buttonClass} w-9 px-0`}>›</button>
          <p className="text-[14px] font-medium text-[#79465D]">{weekTitle(days)}</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={save.isPending} onClick={() => { setMessage(''); setError(''); save.mutate(); }} className={buttonClass}>
              {save.isPending ? 'Đang lưu…' : `Lưu ${rules.length} ca`}
            </button>
            <button type="button" disabled={previewMutation.isPending} onClick={() => { setMessage(''); setError(''); previewMutation.mutate(); }} className={buttonClass}>
              {previewMutation.isPending ? 'Đang xem…' : 'Xem trước'}
            </button>
            <button type="button" disabled={publish.isPending} onClick={() => { setMessage(''); setError(''); publish.mutate(); }} className="inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35">
              {publish.isPending ? 'Đang công bố…' : 'Công bố tuần này'}
            </button>
          </div>
        </div>

        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#927B88]">
          <span>Bấm một ca để bật hoặc tắt. Ca lặp mỗi tuần. Giờ Việt Nam.</span>
          {DAYPARTS.map((part) => (
            <span key={part.code} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${part.dot}`} />
              {part.label} {clock(part.start)}–{clock(part.end)}
            </span>
          ))}
          {query.isPending && <span>Đang tải mẫu lịch…</span>}
          {missing && <span>Chưa có mẫu lịch.</span>}
          {preview && <span>{preview.newSlotsCount} khung mới · {preview.conflictSlotsCount} xung đột</span>}
        </div>
        {query.error && !missing && <p role="alert" className="mb-2 rounded-xl bg-[#FCF4F8] px-4 py-2 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {(message || error) && (
          <p role={error ? 'alert' : 'status'} className={`mb-2 rounded-xl px-4 py-2 text-[13px] ${error ? 'bg-[#FCF4F8] text-[#A33357]' : 'bg-[#E7F6EC] text-[#1E5C36]'}`}>
            {error || message}
          </p>
        )}

        {activeSlot && (
          <div className="mb-3 w-full max-w-sm rounded-2xl border border-[#EADFE5] bg-white p-3">
            <p className="text-[13px] font-medium">{activeSlot.localDate} · {clock(activeSlot.localStart)}–{clock(activeSlot.localEnd)}</p>
            <input value={disableReason} onChange={(event) => setDisableReason(event.target.value)} maxLength={500} placeholder="Lý do đóng khung" className="mt-2 w-full rounded-lg border border-[#E7DAE1] px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-[#AD3155]/35" />
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={disable.isPending} onClick={() => disable.mutate(activeSlot.availabilityId)} className="rounded-lg bg-[#AD3155] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Đóng khung</button>
              <button type="button" onClick={() => setActiveSlotId(null)} className={buttonClass}>Hủy</button>
            </div>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl border border-[#E6E0E4] bg-white">
          <div className="min-w-0">
            <div className="sticky top-0 z-20 grid border-b border-[#E6E0E4] bg-white" style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}>
              <div className="px-2 py-2 text-right text-[10px] text-[#A08B96]">GMT+7</div>
              {days.map((day) => (
                <div key={day.iso} className="overflow-hidden border-l border-[#F0E7EC] px-1 py-2 text-center">
                  <p className={`text-[11px] uppercase tracking-wide ${day.today ? 'text-[#AD3155]' : 'text-[#A08B96]'}`}>{day.short}</p>
                  <p className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[16px] font-semibold ${day.today ? 'bg-[#AD3155] text-white' : 'text-[#49353F]'}`}>{day.date}</p>
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}>
              <div className="relative overflow-hidden" style={{ height: gridHeight }}>
                {hours.map((hour) => (
                  <span key={hour} className="absolute right-2 text-[11px] leading-none text-[#B09AA4]" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + 8 }}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {days.map((day) => (
                <div key={day.iso} className={`relative overflow-hidden border-l border-[#F0E7EC] ${day.today ? 'bg-[#FFF8FB]' : ''}`} style={{ height: gridHeight }}>
                  {hours.map((hour) => (
                    <div key={hour} className="absolute inset-x-0 border-t border-[#F3EDF0]" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {DAYPARTS.map((part) => {
                    const on = selected.has(keyOf(day.id, part.code));
                    const top = ((minutesOf(part.start) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = ((minutesOf(part.end) - minutesOf(part.start)) / 60) * HOUR_HEIGHT;
                    return (
                      <button
                        key={part.code}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${on ? 'Tắt' : 'Bật'} ca ${part.label} ${day.label}`}
                        onClick={() => toggle(day.id, part.code)}
                        className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 text-left ${on ? part.tone : 'border-transparent hover:bg-[#FFF6FA]'}`}
                        style={{ top: top + 2, height: Math.max(height - 4, 20) }}
                      >
                        <span className={`block truncate px-1.5 pt-1 text-[11px] font-semibold ${on ? '' : 'text-[#B09AA4] opacity-0 hover:opacity-100'}`}>
                          {part.label}
                        </span>
                        {on && height > 36 && <span className="block truncate px-1.5 text-[10px] opacity-80">{clock(part.start)}–{clock(part.end)}</span>}
                      </button>
                    );
                  })}
                  {(previewByDay.get(day.iso) || []).map((slot) => {
                    const publishedSlot = publishedByKey.get(`${slot.localDate}-${clock(slot.localStart)}`);
                    const top = ((minutesOf(slot.localStart) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((minutesOf(slot.localEnd) - minutesOf(slot.localStart)) / 60) * HOUR_HEIGHT - 2, 18);
                    const conflict = slot.hasConflict;
                    const tone = DAYPARTS.find((part) => part.code === slot.daypartCode)?.tone || DAYPARTS[0].tone;
                    return (
                      <button
                        key={slot.generationKey}
                        type="button"
                        onClick={() => publishedSlot && setActiveSlotId(publishedSlot.availabilityId)}
                        className={`absolute inset-x-1.5 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left ${conflict ? 'border-[#A33357] bg-[#FCF4F8] text-[#A33357]' : tone}`}
                        style={{ top: top + 2, height }}
                      >
                        <span className="block truncate text-[11px] font-semibold">{clock(slot.localStart)}–{clock(slot.localEnd)}</span>
                        {height > 28 && <span className="block truncate text-[10px] opacity-80">{conflict ? (slot.conflictReason || 'Xung đột') : slot.isExisting ? 'Đã có' : 'Khung 90 phút'}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ConsultShell>
  );
}
