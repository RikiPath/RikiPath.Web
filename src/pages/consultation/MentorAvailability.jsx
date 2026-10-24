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

function SlotCard({ slot, onDelete, deleting }) {
  const booked = Boolean(slot.bookedCount > 0 || slot.isBooked);
  const rejected = Boolean(slot.rejectedAt);
  const pending = slot.isApproved === false && !rejected;
  const expired = asDate(slot.endTime) <= new Date();
  const status = rejected ? 'Đã từ chối' : pending ? 'Chờ duyệt' : expired ? 'Đã kết thúc' : slot.isBooked ? 'Đã đầy' : 'Đang mở';

  return (
    <article
      className={`rounded-[22px] border p-5 shadow-sm ${
        booked ? 'border-[#f8bbd0] bg-[#fff8f8]' : 'border-[#eadfd9] bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            booked ? 'bg-white text-[#D94B68]' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {status}
        </span>
        <span className="font-mono text-[11px] text-[#A59B9E]">#{slot.id}</span>
      </div>
      <p className="mt-3 text-lg font-extrabold text-[#2D282A]">
        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
      </p>
      {slot.mentorName ? (
        <p className="mt-1 text-xs text-[#6F6669]">{slot.mentorName}</p>
      ) : null}
      {pending && <p className="mt-2 text-xs text-amber-700">Lịch chưa hiển thị cho học viên vì đang chờ duyệt.</p>}
      {rejected && <p className="mt-2 text-xs text-rose-700">{slot.rejectionReason || 'Lịch không được duyệt.'}</p>}
      {!pending && !rejected && !expired && <p className="mt-2 text-xs text-[#6F6669]">{slot.bookedCount || 0}/{slot.maxLearners || 4} học viên đã đặt</p>}
      <div className="mt-4 flex items-center justify-between">
        {booked ? (
          <p className="text-xs text-[#A59B9E]">Link phòng sẽ cập nhật sau khi học viên vào buổi.</p>
        ) : (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(slot)}
            className="text-xs font-semibold text-[#D94B68] hover:underline disabled:opacity-50"
          >
            {deleting ? 'Đang xóa…' : 'Đóng slot'}
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
  const days = Object.keys(grouped).sort();
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
      <div className="px-6 py-8 sm:px-8" data-page="MentorAvailability">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">Lịch mentor</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2D282A]">Lịch khả dụng</h1>
            <p className="mt-1 text-sm text-[#6F6669]">Quản lý khung giờ và trạng thái hiển thị cho học viên. Giờ Việt Nam (GMT+7).</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-[#eadfd9] bg-white px-4 py-2 text-sm font-semibold text-[#6F6669] disabled:opacity-50"
          >
            Làm mới
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tổng slot', value: slots.length, tone: 'text-[#2D282A]', bg: 'bg-white' },
            { label: 'Đã đặt', value: booked, tone: 'text-[#D94B68]', bg: 'bg-[#fff8f8]' },
            { label: 'Đang mở', value: open, tone: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Chờ duyệt', value: pending, tone: 'text-amber-700', bg: 'bg-amber-50' },
          ].map((item) => (
            <div key={item.label} className={`rounded-[22px] border border-[#eadfd9] ${item.bg} px-5 py-4 shadow-sm`}>
              <p className={`text-3xl font-extrabold ${item.tone}`}>{loading ? '—' : item.value}</p>
              <p className="mt-1 text-xs font-semibold text-[#A59B9E]">{item.label}</p>
            </div>
          ))}
        </div>

        <form onSubmit={createSlot} className="mb-6 rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#2D282A]">Mở slot mới</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-semibold text-[#6F6669]">
              Bắt đầu
              <input
                type="datetime-local"
                required
                value={form.start}
                onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#2D282A] outline-none focus:border-[#D94B68]"
              />
            </label>
            <label className="text-xs font-semibold text-[#6F6669]">
              Kết thúc
              <input
                type="datetime-local"
                required
                value={form.end}
                onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[#eadfd9] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#2D282A] outline-none focus:border-[#D94B68]"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="self-end rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Đang mở…' : 'Thêm slot'}
            </button>
          </div>
        </form>

        {notice ? (
          <p className="mb-4 rounded-2xl border border-[#eadfd9] bg-white px-4 py-3 text-sm font-semibold text-[#2D282A]">{notice}</p>
        ) : null}

        {loading ? (
          <p className="py-16 text-center text-sm text-[#A59B9E]">Đang tải lịch khả dụng…</p>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[22px] border border-[#f8bbd0] bg-[#fff8f8] p-5">
            <p className="font-bold text-[#9E2A4B]">Không tải được dữ liệu</p>
            <p className="mt-1 text-sm text-[#6F6669]">{error}</p>
            <button type="button" onClick={load} className="mt-3 text-sm font-semibold text-[#D94B68]">
              Thử lại
            </button>
          </div>
        ) : null}

        {!loading && !error && days.length === 0 ? (
          <div className="rounded-[22px] border border-[#eadfd9] bg-white py-16 text-center shadow-sm">
            <p className="text-lg font-bold text-[#2D282A]">Chưa có lịch nào</p>
            <p className="mt-1 text-sm text-[#6F6669]">Mở slot ở form phía trên để học viên bắt đầu đặt.</p>
          </div>
        ) : null}

        {!loading && !error && days.length > 0 ? (
          <div className="space-y-6">
            {days.map((day) => (
              <section key={day}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold capitalize text-[#2D282A]">{formatDate(grouped[day][0].startTime)}</h2>
                  <span className="rounded-full bg-[#fff0f5] px-2 py-0.5 text-[11px] font-bold text-[#D94B68]">
                    {grouped[day].length} slot
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {grouped[day].map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      deleting={deletingId === slot.id}
                      onDelete={deleteSlot}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </ConsultShell>
  );
}
