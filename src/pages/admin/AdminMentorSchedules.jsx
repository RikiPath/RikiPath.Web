import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';
import { assignWeeklySlots, getWeeklyAvailability, publishWeeklySchedule } from '../../api/mentorScheduleApi.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const PERIODS = {
  Morning: { label: 'Sáng', hour: 8 },
  Afternoon: { label: 'Chiều', hour: 13 },
  Evening: { label: 'Tối', hour: 18 },
};
const PERIOD_ORDER = ['Morning', 'Afternoon', 'Evening'];

function rows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

function vnDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '').slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function vnHour(value) {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return Number(hour);
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

function clock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có giờ';
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slotLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00–${String(hour).padStart(2, '0')}:50`;
}

export default function AdminMentorSchedules({ embedded = false }) {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(1);
  const [mentorId, setMentorId] = useState('');
  const [picks, setPicks] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const weekStart = mondayKey(weekOffset);
  const weekEnd = addDays(weekStart, 6);
  const registrations = useQuery({
    queryKey: ['admin-weekly-availability', weekStart],
    queryFn: () => getWeeklyAvailability(weekStart),
  });
  const slots = useQuery({
    queryKey: ['admin-mentor-availabilities'],
    queryFn: async () => rows(await api.get('/admin/mentor-availabilities')),
  });
  const weekSlots = useMemo(() => (slots.data || []).filter((slot) => {
    const day = vnDayKey(slot.startTime);
    return day >= weekStart && day <= weekEnd && (!mentorId || String(slot.mentorId) === String(mentorId));
  }), [slots.data, weekStart, weekEnd, mentorId]);
  const visibleRegistrations = (registrations.data || []).filter((row) => !mentorId || String(row.mentorId) === String(mentorId));
  const groups = useMemo(() => {
    const map = new Map();
    for (const row of visibleRegistrations) {
      const list = map.get(row.mentorId) || [];
      list.push(row);
      map.set(row.mentorId, list);
    }
    return [...map.entries()].map(([id, periods]) => ({
      id,
      name: periods[0]?.mentorName || `Mentor #${id}`,
      periods: periods.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)) || PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period)),
    }));
  }, [visibleRegistrations]);
  const assignedCount = (mentor) => weekSlots.filter((slot) => String(slot.mentorId) === String(mentor)).length;
  const assignedIndexes = (row) => {
    const hour = PERIODS[row.period]?.hour;
    if (hour == null) return new Set();
    return new Set(weekSlots
      .filter((slot) => slot.mentorWeeklyAvailabilityId === row.id || (String(slot.mentorId) === String(row.mentorId) && vnDayKey(slot.startTime) === String(row.date).slice(0, 10)))
      .map((slot) => vnHour(slot.startTime) - hour)
      .filter((index) => index >= 0 && index <= 3));
  };
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['admin-weekly-availability', weekStart] }),
      client.invalidateQueries({ queryKey: ['admin-mentor-availabilities'] }),
    ]);
  };
  const assign = useMutation({
    mutationFn: ({ id, slotIndexes }) => assignWeeklySlots({ weeklyAvailabilityId: id, slotIndexes }),
    onSuccess: async (_, variables) => {
      setPicks((current) => ({ ...current, [variables.id]: [] }));
      setError('');
      setNotice('Đã xếp tiết. Tiết đang ở trạng thái nháp cho đến khi công bố tuần.');
      await refresh();
    },
    onError: (err) => setError(err.message || 'Không xếp được tiết.'),
  });
  const publish = useMutation({
    mutationFn: () => publishWeeklySchedule(weekStart),
    onSuccess: async () => {
      setError('');
      setNotice('Đã công bố lịch tuần. Mentor thấy các tiết đã mở.');
      await refresh();
    },
    onError: (err) => setError(err.message || 'Không công bố được lịch.'),
  });
  const toggle = (id, index, locked) => {
    if (locked) return;
    setPicks((current) => {
      const selected = new Set(current[id] || []);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      return { ...current, [id]: [...selected] };
    });
  };

  const body = (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Xếp tiết cho mentor</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[#82737B]">
            Mentor đăng ký buổi rảnh. Tại đây chọn tiết 50 phút trong từng buổi, rồi công bố tuần. Giờ Việt Nam.
          </p>
        </div>
        <button
          type="button"
          disabled={publish.isPending || registrations.isPending}
          onClick={() => { setNotice(''); setError(''); publish.mutate(); }}
          className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
        >
          {publish.isPending ? 'Đang công bố…' : 'Công bố lịch tuần'}
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-[#6E5360]">{pretty(weekStart)} – {pretty(weekEnd)}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setWeekOffset((value) => value - 1); setPicks({}); }} className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focus}`}>← Tuần trước</button>
          <button type="button" onClick={() => { setWeekOffset(1); setPicks({}); }} className={`h-9 rounded-full px-3 text-[12px] ${focus} ${weekOffset === 1 ? 'bg-[#AD3155] text-white' : 'border border-[#E7DAE1] bg-white text-[#866777]'}`}>Tuần sau</button>
          <button type="button" onClick={() => { setWeekOffset((value) => value + 1); setPicks({}); }} className={`h-9 rounded-full border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] ${focus}`}>Tuần tới →</button>
        </div>
      </div>

      <label className="block max-w-xs text-[12px] text-[#8C7782]">
        Mentor
        <select value={mentorId} onChange={(event) => setMentorId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px]">
          <option value="">Tất cả</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>

      {(error || registrations.error || slots.error) && (
        <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{error || registrations.error?.message || slots.error?.message}</p>
      )}
      {notice && <p className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#2F6B45]">{notice}</p>}

      <section className="rounded-2xl border border-[#E7C9D6] bg-[#FCF4F8] p-4">
        <h2 className="text-[15px] font-semibold text-[#79465D]">Buổi rảnh cần xếp tiết</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#A0788B]">Mỗi buổi có 4 tiết. Công bố tuần khi mỗi mentor đã có ít nhất 5 tiết.</p>
        {registrations.isPending && <p className="mt-3 text-[13px] text-[#82737B]">Đang tải buổi rảnh…</p>}
        {!registrations.isPending && !groups.length && (
          <p className="mt-3 text-[13px] text-[#82737B]">Chưa có mentor đăng ký buổi rảnh trong tuần này.</p>
        )}
        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-2xl border border-[#EADFE5] bg-white p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{group.name}</h3>
                <p className="text-[12px] text-[#8C7782]">{group.periods.length} buổi rảnh · đã xếp {assignedCount(group.id)} tiết</p>
              </div>
              <div className="space-y-3">
                {group.periods.map((row) => {
                  const period = PERIODS[row.period] || { label: row.period, hour: 8 };
                  const taken = assignedIndexes(row);
                  const selected = picks[row.id] || [];
                  return (
                    <div key={row.id} className="rounded-xl bg-[#FCFAFB] px-3 py-3">
                      <p className="text-[13px] font-medium">{pretty(row.date)} · {period.label}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {[0, 1, 2, 3].map((index) => {
                          const locked = taken.has(index);
                          const on = locked || selected.includes(index);
                          return (
                            <label key={index} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] ${locked ? 'border-[#E7DAE1] text-[#A99AA1]' : on ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]' : 'border-[#E7DAE1] bg-white text-[#6E5360]'}`}>
                              <input type="checkbox" checked={on} disabled={locked || assign.isPending} onChange={() => toggle(row.id, index, locked)} className="h-3.5 w-3.5 accent-[#AD3155]" />
                              {slotLabel(period.hour + index)}
                              {locked ? <span>đã xếp</span> : null}
                            </label>
                          );
                        })}
                        <button
                          type="button"
                          disabled={assign.isPending || !selected.length}
                          onClick={() => { setNotice(''); setError(''); assign.mutate({ id: row.id, slotIndexes: selected }); }}
                          className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
                        >
                          {assign.isPending && assign.variables?.id === row.id ? 'Đang xếp…' : 'Xếp tiết đã chọn'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">Tiết đã xếp trong tuần</h2>
        {slots.isPending ? <p className="text-[13px] text-[#82737B]">Đang tải khung giờ…</p> : (
          <div className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FCFAFB] text-[#8C7D84]">
                <tr>
                  <th className="px-4 py-3 font-medium">Mentor</th>
                  <th className="px-4 py-3 font-medium">Khung giờ</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {weekSlots.map((slot) => (
                  <tr key={slot.id} className="border-t border-[#F2EDF0]">
                    <td className="px-4 py-3">{slot.mentorName || `Mentor #${slot.mentorId}`}</td>
                    <td className="px-4 py-3 tabular-nums">{clock(slot.startTime)} – {clock(slot.endTime)}</td>
                    <td className="px-4 py-3">{slot.isBooked ? 'Đã có buổi' : slot.rejectedAt ? 'Đã từ chối' : slot.isApproved ? 'Đang mở' : 'Nháp, chưa công bố'}</td>
                  </tr>
                ))}
                {!slots.isError && !weekSlots.length && (
                  <tr><td colSpan={3} className="px-4 py-6 text-[#8C7D84]">Tuần này chưa có tiết nào được xếp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
  if (embedded) return body;
  return <AdminShell pathname={pathname} breadcrumb="Lịch mentor">{body}</AdminShell>;
}
