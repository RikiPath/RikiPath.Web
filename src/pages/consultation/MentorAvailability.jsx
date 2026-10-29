import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { getSession } from '../../auth/session.js';
import { ConsultShell } from '../../components/shells';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const PERIODS = [
  { id: 'morning', label: 'Sáng', start: '08:00', end: '08:50', from: 5, to: 12 },
  { id: 'afternoon', label: 'Chiều', start: '13:00', end: '13:50', from: 12, to: 17 },
  { id: 'evening', label: 'Tối', start: '19:00', end: '19:50', from: 17, to: 24 },
];

const asDate = (iso) => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`);

function toDayKey(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(asDate(iso));
}

function hourInZone(iso) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(asDate(iso));
  return Number(hour);
}

function periodOf(slot) {
  const hour = hourInZone(slot.startTime);
  return PERIODS.find((period) => hour >= period.from && hour < period.to)?.id || null;
}

function formatTime(iso) {
  const date = asDate(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('vi-VN', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const date = asDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

function groupByDate(slots) {
  const map = {};
  for (const slot of slots) {
    const day = toDayKey(slot.startTime);
    if (!map[day]) map[day] = [];
    map[day].push(slot);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => asDate(a.startTime) - asDate(b.startTime));
  }
  return map;
}

function weekDays(offset) {
  const todayKey = toDayKey(new Date().toISOString());
  const [year, month, day] = todayKey.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(noon);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() - index + offset * 7);
  return Array.from({ length: 7 }, (_, step) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + step);
    const key = toDayKey(date.toISOString());
    return {
      key,
      name: DAY_NAMES[step],
      date: Number(key.slice(-2)),
      today: key === todayKey,
      past: key < todayKey,
    };
  });
}

function rangeLabel(week) {
  const text = (key) => {
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
  };
  return `${text(week[0].key)} – ${text(week[6].key)}`;
}

function slotStatus(slot) {
  const rejected = Boolean(slot.rejectedAt);
  const pending = slot.isApproved === false && !rejected;
  const expired = asDate(slot.endTime) <= new Date();
  if (rejected) return 'Đã từ chối';
  if (pending) return 'Chờ duyệt';
  if (expired) return 'Đã kết thúc';
  if (slot.bookedCount > 0 || slot.isBooked) return 'Đã đặt';
  return 'Đang mở';
}

function isBooked(slot) {
  return Boolean(slot.bookedCount > 0 || slot.isBooked);
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function MentorAvailability() {
  const { pathname } = useLocation();
  const preview = Boolean(getSession()?.isPreview);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [picks, setPicks] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/mentor/availability');
      const list = res?.result ?? (Array.isArray(res) ? res : []);
      setSlots(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Không tải được lịch khả dụng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const grouped = useMemo(() => groupByDate(slots), [slots]);
  const week = useMemo(() => weekDays(weekOffset), [weekOffset]);
  const weekKeys = new Set(week.map((day) => day.key));
  const laterDays = Object.keys(grouped).filter((day) => !weekKeys.has(day)).sort();
  const weekSlots = week.flatMap((day) => grouped[day.key] || []);
  const booked = weekSlots.filter(isBooked).length;
  const open = weekSlots.filter((slot) => slotStatus(slot) === 'Đang mở').length;

  const checked = (dayKey, periodId) => {
    const key = `${dayKey}:${periodId}`;
    if (Object.prototype.hasOwnProperty.call(picks, key)) return picks[key];
    return (grouped[dayKey] || []).some((slot) => periodOf(slot) === periodId);
  };

  const selectedCount = week.reduce(
    (count, day) => count + PERIODS.filter((period) => checked(day.key, period.id)).length,
    0,
  );

  const toggle = (day, periodId) => {
    if (day.past) return;
    const existing = (grouped[day.key] || []).filter((slot) => periodOf(slot) === periodId);
    if (existing.some(isBooked)) return;
    const key = `${day.key}:${periodId}`;
    setPicks((prev) => ({ ...prev, [key]: !checked(day.key, periodId) }));
  };

  const createSlot = async (dayKey, period) => {
    const start = new Date(`${dayKey}T${period.start}:00+07:00`);
    const end = new Date(`${dayKey}T${period.end}:00+07:00`);
    if (preview) {
      setSlots((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          isBooked: false,
        },
      ]);
      return;
    }
    await api.post('/mentor/availability', {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  };

  const removeSlot = async (slot) => {
    if (isBooked(slot)) return;
    if (preview) {
      setSlots((prev) => prev.filter((item) => item.id !== slot.id));
      return;
    }
    await api.post('/mentor/availability/request-cancel', { ids: [slot.id] });
  };

  const saveWeek = async () => {
    setSaving(true);
    setNotice('');
    try {
      for (const day of week) {
        if (day.past) continue;
        for (const period of PERIODS) {
          const existing = (grouped[day.key] || []).filter((slot) => periodOf(slot) === period.id);
          const on = checked(day.key, period.id);
          if (on && existing.length === 0) await createSlot(day.key, period);
          if (!on) {
            for (const slot of existing) await removeSlot(slot);
          }
        }
      }
      setPicks({});
      if (!preview) await load();
      setNotice('Đã lưu buổi rảnh của tuần này.');
    } catch (err) {
      setNotice(err.message || 'Không lưu được buổi rảnh.');
      if (!preview) await load();
    } finally {
      setSaving(false);
    }
  };

  const closeSlot = async (slot) => {
    setDeletingId(slot.id);
    setNotice('');
    try {
      await removeSlot(slot);
      if (!preview) await load();
      setNotice('Đã đóng khung giờ trống.');
    } catch (err) {
      setNotice(err.message || 'Không đóng được khung giờ.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ConsultShell pathname={pathname} breadcrumb="Lịch khả dụng">
      <div
        data-page="MentorAvailability"
        className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-6 text-[#49353F] sm:px-6"
      >
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Lịch khả dụng</h1>
            <p className="mt-1.5 text-[13px] text-[#927B88]">
              {loading
                ? 'Đang tải…'
                : `${weekSlots.length} tiết · ${open} đang mở · ${booked} đã đặt · Giờ Việt Nam`}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={`h-9 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] disabled:opacity-50 ${focusClass}`}
          >
            Làm mới
          </button>
        </header>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-medium text-[#6E5360]">{rangeLabel(week)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setWeekOffset((value) => value - 1); setPicks({}); }}
              className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focusClass}`}
            >
              ← Tuần trước
            </button>
            <button
              type="button"
              onClick={() => { setWeekOffset(0); setPicks({}); }}
              className={`h-9 rounded-full px-3 text-[12px] ${focusClass} ${
                weekOffset === 0 ? 'bg-[#AD3155] text-white' : 'border border-[#E7DAE1] bg-white text-[#866777]'
              }`}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => { setWeekOffset((value) => value + 1); setPicks({}); }}
              className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focusClass}`}
            >
              Tuần tới →
            </button>
          </div>
        </div>

        <section className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7C9D6] bg-[#FCF4F8] px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#AD3155] text-white">
            <span className="material-symbols-outlined text-[20px]">event_available</span>
          </span>
          <div className="min-w-[180px] flex-1">
            <h2 className="text-[14px] font-semibold text-[#79465D]">Đăng ký buổi rảnh</h2>
            <p className="text-[12px] leading-5 text-[#A0788B]">
              Chọn Sáng, Chiều hoặc Tối trên lịch. Mỗi tiết 50 phút.
            </p>
          </div>
          <p className="text-[12px] text-[#8C6070]">Đã chọn {selectedCount} buổi</p>
          <button
            type="button"
            onClick={saveWeek}
            disabled={saving || loading}
            className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focusClass}`}
          >
            {saving ? 'Đang lưu…' : 'Lưu đăng ký tuần'}
          </button>
        </section>

        {notice ? (
          <p className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#8A6070]">{notice}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
            {error}
            <button type="button" onClick={load} className={`ml-3 font-medium ${focusClass} rounded`}>Thử lại</button>
          </p>
        ) : null}

        <div className="min-w-0">
          <section className="grid grid-cols-7 items-start gap-2" aria-busy={loading}>
            {week.map((day) => {
              const items = grouped[day.key] || [];
              return (
                <article
                  key={day.key}
                  className={`flex min-w-0 flex-col rounded-2xl border bg-white px-2 py-2.5 ${
                    day.today ? 'border-[#AD3155]' : 'border-[#E7C9D6]'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={`text-[13px] ${day.today ? 'font-medium text-[#AD3155]' : 'text-[#B18F9E]'}`}>
                      {day.name}
                    </span>
                    <span className={`text-[22px] font-semibold leading-none ${day.today ? 'text-[#AD3155]' : 'text-[#49353F]'}`}>
                      {day.date}
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {PERIODS.map((period) => {
                      const on = checked(day.key, period.id);
                      const locked = day.past || (grouped[day.key] || []).some((slot) => periodOf(slot) === period.id && isBooked(slot));
                      return (
                        <label key={period.id} className={`flex items-center gap-1.5 text-[12px] ${locked ? 'text-[#C4AEB8]' : 'text-[#6E5360]'}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={locked || saving}
                            onChange={() => toggle(day, period.id)}
                            className="h-3.5 w-3.5 shrink-0 accent-[#AD3155]"
                          />
                          {period.label}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {items.length === 0 && !PERIODS.some((period) => checked(day.key, period.id) && !(grouped[day.key] || []).some((slot) => periodOf(slot) === period.id)) ? (
                      <p className="pt-1 text-[12px] text-[#C4AEB8]">Chưa xếp tiết</p>
                    ) : null}
                    {PERIODS.filter((period) => checked(day.key, period.id) && !items.some((slot) => periodOf(slot) === period.id)).map((period) => (
                      <p key={period.id} className="text-[12px] leading-5 text-[#B07A8C]">
                        {period.start}–{period.end}
                        <span className="mt-0.5 block text-[12px]">Chưa lưu</span>
                      </p>
                    ))}
                    {items.map((slot) => (
                      <div key={slot.id}>
                        <p className="text-[12px] font-medium leading-5 text-[#543E49]">
                          {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#AD3155]">{slotStatus(slot)}</p>
                        {isBooked(slot) ? null : (
                          <button
                            type="button"
                            disabled={deletingId === slot.id}
                            onClick={() => closeSlot(slot)}
                            className={`mt-0.5 text-[12px] font-medium text-[#AD3155] disabled:opacity-50 ${focusClass} rounded`}
                          >
                            {deletingId === slot.id ? '…' : 'Đóng'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {laterDays.length > 0 ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
            <h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">Khung giờ khác</h2>
            {laterDays.map((day) => (
              <div key={day} className="border-b border-[#F0E7EC] px-4 py-3 last:border-b-0">
                <p className="text-[12px] capitalize text-[#8C7782]">{formatDate(grouped[day][0].startTime)}</p>
                {grouped[day].map((slot) => (
                  <p key={slot.id} className="mt-1 text-[13px] text-[#543E49]">
                    {formatTime(slot.startTime)}–{formatTime(slot.endTime)} · {slotStatus(slot)}
                  </p>
                ))}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </ConsultShell>
  );
}
