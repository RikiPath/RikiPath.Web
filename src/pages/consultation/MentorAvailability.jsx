import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { getSession } from '../../auth/session.js';
import { ConsultShell } from '../../components/shells';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const asDate = iso => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`);
function toDayKey(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(asDate(iso));
}

function formatDate(iso) {
  const d = asDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

function formatTime(iso) {
  const d = asDate(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('vi-VN', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
}

function groupByDate(slots) {
  const map = {};
  for (const slot of slots) {
    const day = toDayKey(slot.startTime);
    if (!map[day]) map[day] = [];
    map[day].push(slot);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }
  return map;
}

function previewSlots() {
  return [
    {
      id: 990001,
      mentorName: 'Sensei Aoi',
      startTime: '2026-10-02T09:00:00',
      endTime: '2026-10-02T10:00:00',
      isBooked: true,
    },
    {
      id: 990002,
      mentorName: 'Sensei Aoi',
      startTime: '2026-10-02T19:30:00',
      endTime: '2026-10-02T20:15:00',
      isBooked: false,
    },
    {
      id: 990003,
      mentorName: 'Sensei Aoi',
      startTime: '2026-10-03T14:00:00',
      endTime: '2026-10-03T15:00:00',
      isBooked: false,
    },
  ];
}

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function thisWeek() {
  const todayKey = toDayKey(new Date().toISOString());
  const [year, month, day] = todayKey.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(noon);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() - index);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    const key = toDayKey(date.toISOString());
    return { key, name: DAY_NAMES[offset], date: Number(key.slice(-2)), today: key === todayKey };
  });
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

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

function SlotRow({ slot, onDelete, deleting, light = false }) {
  const booked = Boolean(slot.bookedCount > 0 || slot.isBooked);

  return (
    <article className={`rounded-lg px-1.5 py-1 ${light ? 'bg-white/15' : ''}`}>
      <p className={`text-[12px] font-medium ${light ? 'text-white' : 'text-[#543E49]'}`}>
        {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
      </p>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <p className={`text-[10px] ${light ? 'text-white/75' : 'text-[#947B88]'}`}>{slotStatus(slot)}</p>
        {booked ? null : (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(slot)}
            className={`text-[10px] font-medium disabled:opacity-50 ${light ? 'text-white' : 'text-[#AD3155]'} ${focusClass} rounded`}
          >
            {deleting ? '…' : 'Đóng'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function MentorAvailability() {
  const { pathname } = useLocation();
  const preview = Boolean(getSession()?.isPreview);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ start: '', end: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/mentor/availability');
      const list = res?.result ?? (Array.isArray(res) ? res : []);
      setSlots(Array.isArray(list) ? list : []);
    } catch (err) {
      if (preview) {
        setSlots(previewSlots());
        setError('');
      } else {
        setError(err.message || 'Không tải được lịch khả dụng.');
      }
    } finally {
      setLoading(false);
    }
  }, [preview]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const grouped = useMemo(() => groupByDate(slots), [slots]);
  const week = useMemo(() => thisWeek(), []);
  const weekKeys = new Set(week.map((day) => day.key));
  const laterDays = Object.keys(grouped).filter((day) => !weekKeys.has(day)).sort();
  const booked = slots.filter(s => s.bookedCount > 0 || s.isBooked).length;
  const open = slots.filter(s => s.isApproved !== false && !s.rejectedAt && !s.isBooked && asDate(s.endTime) > new Date()).length;
  const pending = slots.filter(s => s.isApproved === false && !s.rejectedAt).length;

  const createSlot = async (event) => {
    event.preventDefault();
    if (!form.start || !form.end) return;
    setSaving(true);
    setNotice('');
    try {
      let approved = preview;
      const body = { startTime: new Date(form.start).toISOString(), endTime: new Date(form.end).toISOString() };
      if (preview) {
        setSlots((prev) => [
          ...prev,
          {
            id: Date.now(),
            mentorName: getSession()?.fullName || 'Sensei',
            startTime: form.start,
            endTime: form.end,
            isBooked: false,
          },
        ]);
      } else {
        const created = await api.post('/mentor/availability', body);
        approved = created.result?.isApproved;
        await load();
      }
      setForm({ start: '', end: '' });
      setNotice(approved ? 'Đã mở slot mới. Học viên có thể thấy lịch này.' : 'Đã tạo slot mới, đang chờ duyệt trước khi hiển thị cho học viên.');
    } catch (err) {
      setNotice(err.message || 'Không tạo được slot.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (slot) => {
    if (slot.isBooked || slot.bookedCount > 0) return;
    setDeletingId(slot.id);
    setNotice('');
    try {
      if (preview) {
        setSlots((prev) => prev.filter((item) => item.id !== slot.id));
      } else {
        await api.delete(`/mentor/availability/${slot.id}`);
        await load();
      }
      setNotice('Đã đóng slot trống.');
    } catch (err) {
      setNotice(err.message || 'Không xóa được slot.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ConsultShell pathname={pathname} breadcrumb="Lịch khả dụng">
      <div
        data-page="MentorAvailability"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Lịch khả dụng</h1>
            <p className="mt-1.5 text-[13px] text-[#927B88]">
              {loading ? 'Đang tải…' : error
                ? 'Giờ Việt Nam.'
                : `${slots.length} khung · ${open} đang mở · ${booked} đã đặt · ${pending} chờ duyệt`}
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

        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <form onSubmit={createSlot} className="rounded-3xl border border-[#E7C9D6] bg-[#FCF4F8] p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#AD3155] text-white">
              <span className="material-symbols-outlined text-[24px]">event_available</span>
            </span>
            <h2 className="mt-4 text-[18px] font-semibold text-[#79465D]">Mở một khung</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#A0788B]">Học viên chỉ đặt được vào giờ bạn mở.</p>
            <label className="mt-4 block text-[12px] text-[#8C6070]">
              Bắt đầu
              <input
                type="datetime-local"
                required
                value={form.start}
                onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
                className={`mt-1 w-full rounded-xl border border-[#E7C9D6] bg-white px-3 py-2 text-[13px] outline-none ${focusClass}`}
              />
            </label>
            <label className="mt-3 block text-[12px] text-[#8C6070]">
              Kết thúc
              <input
                type="datetime-local"
                required
                value={form.end}
                onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
                className={`mt-1 w-full rounded-xl border border-[#E7C9D6] bg-white px-3 py-2 text-[13px] outline-none ${focusClass}`}
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className={`mt-4 h-10 w-full rounded-xl bg-[#AD3155] text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focusClass}`}
            >
              {saving ? 'Đang mở…' : 'Mở khung giờ'}
            </button>
          </form>

          <div>
            {notice ? (
              <p className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#8A6070]">{notice}</p>
            ) : null}
            {error ? (
              <p role="alert" className="mb-3 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
                {error}
                <button type="button" onClick={load} className={`ml-3 font-medium ${focusClass} rounded`}>Thử lại</button>
              </p>
            ) : null}

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-busy={loading}>
              {week.map((day) => {
                const items = grouped[day.key] || [];
                return (
                  <div
                    key={day.key}
                    className={`min-h-[148px] rounded-2xl border p-2.5 ${
                      day.today
                        ? 'border-[#AD3155] bg-[#AD3155] text-white'
                        : 'border-dashed border-[#E7C9D6] bg-white text-[#49353F]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className={`text-[11px] ${day.today ? 'text-white/80' : 'text-[#B18F9E]'}`}>{day.name}</span>
                      <span className="text-[20px] font-semibold leading-none">{day.date}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {items.map((slot) => (
                        <SlotRow key={slot.id} slot={slot} deleting={deletingId === slot.id} onDelete={deleteSlot} light={day.today} />
                      ))}
                      {!loading && items.length === 0 ? (
                        <p className={`pt-5 text-center text-[11px] ${day.today ? 'text-white/70' : 'text-[#C4AEB8]'}`}>
                          Chưa mở
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>

        {laterDays.length > 0 ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
            <h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">Khung giờ khác</h2>
            {laterDays.map((day) => (
              <div key={day} className="border-b border-[#F0E7EC] last:border-b-0">
                <p className="bg-[#FAF8F7] px-4 py-2 text-[12px] capitalize text-[#8C7782]">
                  {formatDate(grouped[day][0].startTime)}
                </p>
                <div className="divide-y divide-[#F0E7EC]">
                  {grouped[day].map((slot) => (
                    <SlotRow key={slot.id} slot={slot} deleting={deletingId === slot.id} onDelete={deleteSlot} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </ConsultShell>
  );
}
