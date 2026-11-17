import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';
import { getPendingMentorSlots, reviewMentorSlot, reviewMentorSlotCancels, reviewMentorSlots } from '../../api/admin.js';
import WeekTimeGrid from '../../components/consultation/WeekTimeGrid.jsx';
import { getWeeklyAvailability } from '../../api/mentorScheduleApi.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MENTOR_COLORS = [
  'border-l-4 border-[#AD3155] bg-[#FCE8F0] text-[#8B2344]',
  'border-l-4 border-[#2F6B45] bg-[#E7F6EC] text-[#1E5C36]',
  'border-l-4 border-[#315AAD] bg-[#E8F0FC] text-[#23448B]',
  'border-l-4 border-[#C47B16] bg-[#FFF6E8] text-[#8A5A10]',
];

function rows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

function asUtcDate(value) {
  if (value instanceof Date) return value;
  const text = String(value ?? '');
  if (!text) return new Date(NaN);
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(text) ? text : `${text}Z`);
}

function vnDayKey(value) {
  const date = asUtcDate(value);
  if (Number.isNaN(date.getTime())) return String(value || '').slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function vnClock(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(asUtcDate(value));
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  };
}

function vnHour(value) {
  return vnClock(value).hour;
}

function mondayKey(offset) {
  const today = vnDayKey(new Date().toISOString());
  const [year, month, day] = today.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(noon);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  noon.setUTCDate(noon.getUTCDate() - index + offset * 7);
  return vnDayKey(noon.toISOString());
}

function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return vnDayKey(date.toISOString());
}

function pretty(key) {
  const [year, month, day] = String(key).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function formatRange(startIso, endIso) {
  const start = vnClock(startIso);
  const end = vnClock(endIso);
  return `${pretty(vnDayKey(startIso))} · ${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}–${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`;
}

export default function AdminMentorSchedules({ embedded = false }) {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [mentorId, setMentorId] = useState('');
  const [picked, setPicked] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const weekStart = mondayKey(weekOffset);
  const weekEnd = addDays(weekStart, 6);
  const historicalWeekly = useQuery({
    queryKey: ['admin-weekly-availability', weekStart],
    queryFn: () => getWeeklyAvailability(weekStart),
  });
  const pendingSlotsQuery = useQuery({
    queryKey: ['admin-pending-slots'],
    queryFn: getPendingMentorSlots,
  });
  const slots = useQuery({
    queryKey: ['admin-mentor-availabilities'],
    queryFn: async () => rows(await api.get('/admin/mentor-availabilities')),
  });
  const weekSlots = useMemo(() => (slots.data || []).filter((slot) => {
    const day = vnDayKey(slot.startTime);
    return day >= weekStart && day <= weekEnd && (!mentorId || String(slot.mentorId) === String(mentorId));
  }), [slots.data, weekStart, weekEnd, mentorId]);
  const pendingSlots = useMemo(() => (Array.isArray(pendingSlotsQuery.data) ? pendingSlotsQuery.data : [])
    .filter((slot) => !mentorId || String(slot.mentorId) === String(mentorId)), [pendingSlotsQuery.data, mentorId]);
  const cancelRequests = useMemo(() => (slots.data || [])
    .filter((slot) => slot.cancelRequestedAt && !slot.cancelRejectedAt && (!mentorId || String(slot.mentorId) === String(mentorId))),
  [slots.data, mentorId]);
  const mentorOptions = useMemo(() => {
    const map = new Map();
    [...(slots.data || []), ...(Array.isArray(pendingSlotsQuery.data) ? pendingSlotsQuery.data : [])].forEach((row) => {
      if (row.mentorId && !map.has(String(row.mentorId))) {
        map.set(String(row.mentorId), row.mentorName || `Cố vấn #${row.mentorId}`);
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [slots.data, pendingSlotsQuery.data]);
  const refresh = async () => {
    setPicked([]);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['admin-pending-slots'] }),
      client.invalidateQueries({ queryKey: ['admin-mentor-availabilities'] }),
    ]);
  };
  const reviewOne = useMutation({
    mutationFn: ({ id, approve }) => reviewMentorSlot(id, approve, approve ? undefined : rejectReason.trim()),
    onSuccess: async () => {
      setError('');
      setNotice('Đã cập nhật trạng thái duyệt khung giờ.');
      setRejectReason('');
      await refresh();
    },
    onError: (err) => setError(err.message || 'Không duyệt được khung giờ.'),
  });
  const reviewBulk = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlots(ids, approve, approve ? undefined : rejectReason.trim()),
    onSuccess: async () => {
      setError('');
      setNotice('Đã xử lý hàng loạt khung giờ chờ duyệt.');
      setRejectReason('');
      await refresh();
    },
    onError: (err) => setError(err.message || 'Không xử lý được khung giờ.'),
  });
  const reviewCancel = useMutation({
    mutationFn: ({ ids, approve }) => reviewMentorSlotCancels(ids, approve, approve ? undefined : rejectReason.trim()),
    onSuccess: async () => {
      setError('');
      setNotice('Đã xử lý yêu cầu hủy khung giờ.');
      setRejectReason('');
      await refresh();
    },
    onError: (err) => setError(err.message || 'Không xử lý được yêu cầu hủy.'),
  });
  const togglePick = (id) => setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const busy = reviewOne.isPending || reviewBulk.isPending || reviewCancel.isPending;

  const body = (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Duyệt & theo dõi lịch cố vấn</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#82737B]">
            Cố vấn thiết lập ca dạy lặp theo chính sách Admin và gửi khung giờ chờ duyệt tại nguồn lịch chuẩn duy nhất.
          </p>
        </div>
        <Link
          to="/admin/slot-review"
          className={`inline-flex h-10 items-center rounded-xl border border-[#E7DAE1] bg-white px-4 text-[13px] font-medium text-[#705261] hover:bg-[#FFF6FA] ${focus}`}
        >
          Mở hàng chờ xử lý ({pendingSlots.length})
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-[#6E5360]">{pretty(weekStart)} – {pretty(weekEnd)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setWeekOffset((value) => value - 1)} className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focus}`}>← Tuần trước</button>
          <button type="button" onClick={() => setWeekOffset(0)} className={`h-9 rounded-full px-3 text-[12px] ${focus} ${weekOffset === 0 ? 'bg-[#AD3155] text-white' : 'border border-[#E7DAE1] bg-white text-[#866777]'}`}>Tuần này</button>
          <button type="button" onClick={() => setWeekOffset((value) => value + 1)} className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focus}`}>Tuần tới →</button>
        </div>
      </div>

      <label className="block max-w-xs text-[12px] text-[#8C7782]">
        Cố vấn
        <select value={mentorId} onChange={(event) => setMentorId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px]">
          <option value="">Tất cả</option>
          {mentorOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>

      {(error || pendingSlotsQuery.error || slots.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
          {error || pendingSlotsQuery.error?.message || slots.error?.message}
        </p>
      )}
      {notice && <p className="rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0E7EC] px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">Khung giờ chờ Admin duyệt</h2>
            <p className="mt-0.5 text-[12px] text-[#82737B]">Duyệt khung giờ theo chính sách Admin trước khi dùng cho tư vấn 1-1 hoặc lớp nhóm.</p>
          </div>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => reviewBulk.mutate({ ids: picked, approve: true })} className="h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white disabled:opacity-50">
                Duyệt {picked.length} khung
              </button>
              <button type="button" disabled={busy || !rejectReason.trim()} onClick={() => reviewBulk.mutate({ ids: picked, approve: false })} className="h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">
                Từ chối {picked.length} khung
              </button>
            </div>
          )}
        </div>
        {pendingSlotsQuery.isPending && <p className="px-4 py-4 text-[13px] text-[#82737B]">Đang tải khung giờ chờ duyệt…</p>}
        {!pendingSlotsQuery.isPending && pendingSlots.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-[#82737B]">Không có khung giờ chờ duyệt.</p>
        )}
        {pendingSlots.map((slot) => (
          <div key={slot.id} className="flex flex-wrap items-center gap-3 border-b border-[#F3EDF0] px-4 py-3 last:border-b-0">
            <input type="checkbox" checked={picked.includes(slot.id)} onChange={() => togglePick(slot.id)} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{slot.mentorName || `Cố vấn #${slot.mentorId}`}</p>
              <p className="text-[12px] text-[#82737B]">{formatRange(slot.startTime, slot.endTime)} · Sức chứa tối đa {slot.maxLearners ?? 1}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => reviewOne.mutate({ id: slot.id, approve: true })} className="h-8 rounded-lg bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50">Duyệt</button>
              <button type="button" disabled={busy || !rejectReason.trim()} onClick={() => reviewOne.mutate({ id: slot.id, approve: false })} className="h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Từ chối</button>
            </div>
          </div>
        ))}
        {pendingSlots.length > 0 && (
          <div className="border-t border-[#F0E7EC] bg-[#FFF8FB] px-4 py-3">
            <label className="block text-[12px] text-[#6E5360]">
              Lý do từ chối (nếu từ chối)
              <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={1000} placeholder="Nhập lý do từ chối..." className="mt-1 h-9 w-full rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px]" />
            </label>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
        <div className="border-b border-[#F0E7EC] px-4 py-3">
          <h2 className="text-[15px] font-semibold">Yêu cầu hủy khung giờ chờ Admin duyệt ({cancelRequests.length})</h2>
          <p className="mt-0.5 text-[12px] text-[#82737B]">Mentor chỉ gửi yêu cầu hủy đối với lịch đang mở chưa gắn lớp nhóm hoặc học viên.</p>
        </div>
        {cancelRequests.length === 0 ? (
          <p className="px-4 py-5 text-[13px] text-[#82737B]">Không có yêu cầu hủy khung giờ nào đang chờ duyệt.</p>
        ) : (
          cancelRequests.map((slot) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-3 border-b border-[#F3EDF0] px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{slot.mentorName || `Cố vấn #${slot.mentorId}`}</p>
                <p className="text-[12px] text-[#82737B]">{formatRange(slot.startTime, slot.endTime)}{slot.cancelReason ? ` · Lý do: ${slot.cancelReason}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => reviewCancel.mutate({ ids: [slot.id], approve: true })} className="h-8 rounded-lg bg-[#AD3155] px-3 text-[12px] text-white disabled:opacity-50">Duyệt hủy</button>
                <button type="button" disabled={busy || !rejectReason.trim()} onClick={() => reviewCancel.mutate({ ids: [slot.id], approve: false })} className="h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50">Từ chối hủy</button>
              </div>
            </div>
          ))
        )}
      </section>

      {Array.isArray(historicalWeekly.data) && historicalWeekly.data.length > 0 && (
        <section className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[#6E5360]">Dữ liệu lịch tuần lịch sử (chỉ đọc)</h2>
          <p className="mt-0.5 text-[12px] text-[#82737B]">{historicalWeekly.data.length} bản ghi lịch tuần cũ được giữ nguyên để đối chiếu; không tạo ca 50 phút mới.</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">Tiết đã xếp trong tuần</h2>
        {slots.isPending ? <p className="text-[13px] text-[#82737B]">Đang tải khung giờ…</p> : weekSlots.length ? (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              {[...new Map(weekSlots.map((slot) => [slot.mentorId, slot.mentorName || 'Cố vấn chưa cập nhật tên'])).entries()].map(([id, name], index) => (
                <span key={id} className={`rounded-full px-2.5 py-1 text-[11px] ${MENTOR_COLORS[index % MENTOR_COLORS.length]}`}>{name}</span>
              ))}
            </div>
            <WeekTimeGrid
              days={Array.from({ length: 7 }, (_, index) => {
                const key = addDays(weekStart, index);
                return { key, name: DAY_NAMES[index], date: Number(key.slice(-2)), today: key === vnDayKey(new Date().toISOString()) };
              })}
              events={(() => {
                const mentors = [...new Set(weekSlots.map((item) => item.mentorId))];
                return weekSlots.map((slot) => {
                  const start = vnClock(slot.startTime);
                  const end = vnClock(slot.endTime);
                  return {
                    id: slot.id,
                    dayKey: vnDayKey(slot.startTime),
                    startHour: start.hour,
                    startMinute: start.minute,
                    endHour: end.hour,
                    endMinute: end.minute,
                    title: slot.mentorName || 'Cố vấn chưa cập nhật tên',
                    detail: slot.isInCohort
                      ? `Lớp #${slot.cohortId}`
                      : slot.cancelRequestedAt && !slot.cancelRejectedAt
                        ? 'Xin hủy'
                        : slot.isBooked
                          ? 'Đã có buổi'
                          : slot.isApproved
                            ? 'Đang mở'
                            : 'Nháp',
                    className: MENTOR_COLORS[Math.max(mentors.indexOf(slot.mentorId), 0) % MENTOR_COLORS.length],
                  };
                });
              })()}
              startHour={Math.min(8, ...weekSlots.map((slot) => vnHour(slot.startTime)))}
              endHour={22}
              nowKey={vnDayKey(new Date().toISOString())}
              nowMinutes={(() => {
                const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
                return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
              })()}
            />
          </>
        ) : <p className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-6 text-[13px] text-[#8C7D84]">Tuần này chưa có tiết nào được xếp.</p>}
      </section>
    </div>
  );
  if (embedded) return body;
  return <AdminShell pathname={pathname} breadcrumb="Lịch cố vấn">{body}</AdminShell>;
}
