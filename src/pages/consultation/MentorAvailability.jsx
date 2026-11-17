import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { getSession } from '../../auth/session.js';
import WeekTimeGrid from '../../components/consultation/WeekTimeGrid.jsx';
import { ConsultShell } from '../../components/shells';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const asDate = (iso) => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`);

function toDayKey(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(asDate(iso));
}

function clockParts(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(asDate(iso));
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  };
}

function hourInZone(iso) {
  return clockParts(iso).hour;
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
  const [deletingId, setDeletingId] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

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

  const removeSlot = async (slot) => {
    if (isBooked(slot)) return;
    if (preview) {
      setSlots((prev) => prev.filter((item) => item.id !== slot.id));
      return;
    }
    await api.post('/mentor/availability/request-cancel', { ids: [slot.id] });
  };

  const nowParts = clockParts(new Date().toISOString());
  const calendarEvents = week.flatMap((day) => {
    const daySlots = grouped[day.key] || [];
    return daySlots.map((slot) => {
      const start = clockParts(slot.startTime);
      const end = clockParts(slot.endTime);
      return {
        id: `slot-${slot.id}`,
        dayKey: day.key,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        title: `${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`,
        detail: slotStatus(slot),
        tone: isBooked(slot) ? 'booked' : slot.isApproved === false ? 'pending' : 'open',
        onClick: isBooked(slot) ? undefined : () => closeSlot(slot),
        disabled: deletingId === slot.id,
        z: 3,
      };
    });
  });

  const closeSlot = async (slot) => {
    setDeletingId(slot.id);
    setNotice('');
    try {
      await removeSlot(slot);
      if (!preview) await load();
      setNotice('Đã gửi yêu cầu đóng khung giờ trống.');
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
              onClick={() => setWeekOffset((value) => value - 1)}
              className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focusClass}`}
            >
              ← Tuần trước
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`h-9 rounded-full px-3 text-[12px] ${focusClass} ${
                weekOffset === 0 ? 'bg-[#AD3155] text-white' : 'border border-[#E7DAE1] bg-white text-[#866777]'
              }`}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((value) => value + 1)}
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
            <h2 className="text-[14px] font-semibold text-[#79465D]">Đăng ký ca dạy lặp theo chính sách Admin</h2>
            <p className="text-[12px] leading-5 text-[#A0788B]">
              Hệ thống tạo khung giờ giảng dạy từ lịch ca lặp tuần và gửi Admin duyệt trên nguồn lịch chuẩn duy nhất.
            </p>
          </div>
          <Link
            to="/mentor-shift-schedule"
            className={`inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
          >
            Mở ca làm việc
          </Link>
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

        <WeekTimeGrid
          days={week}
          events={calendarEvents}
          startHour={8}
          endHour={22}
          nowKey={toDayKey(new Date().toISOString())}
          nowMinutes={nowParts.hour * 60 + nowParts.minute}
        />

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
