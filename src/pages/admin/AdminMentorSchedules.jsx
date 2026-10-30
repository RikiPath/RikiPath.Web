import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/shells';
import { api } from '../../api/client.js';
import WeekTimeGrid from '../../components/consultation/WeekTimeGrid.jsx';
import { assignWeeklySlots, getWeeklyAvailability, publishWeeklySchedule } from '../../api/mentorScheduleApi.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const PERIODS = {
  Morning: { label: 'Sáng', hour: 8 },
  Afternoon: { label: 'Chiều', hour: 13 },
  Evening: { label: 'Tối', hour: 18 },
};
const PERIOD_ORDER = ['Morning', 'Afternoon', 'Evening'];
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

function slotHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function dayName(key) {
  const [year, month, day] = String(key).slice(0, 10).split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(noon);
  return { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' }[weekday] || '';
}

function byDate(periods) {
  const map = new Map();
  periods.forEach((row) => {
    const key = String(row.date).slice(0, 10);
    map.set(key, [...(map.get(key) || []), row]);
  });
  return [...map.entries()];
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
    mutationFn: async (jobs) => {
      for (const job of jobs) {
        await assignWeeklySlots({ weeklyAvailabilityId: job.id, slotIndexes: job.slotIndexes });
      }
    },
    onSuccess: async (_, jobs) => {
      setPicks((current) => {
        const next = { ...current };
        jobs.forEach((job) => { next[job.id] = []; });
        return next;
      });
      setError('');
      setNotice('Đã xếp tiết. Tiết đang ở trạng thái nháp cho đến khi công bố tuần.');
      await refresh();
    },
    onError: async (err) => {
      setError(err.message || 'Không xếp được tiết.');
      await refresh();
    },
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

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold">Chọn tiết trong buổi rảnh</h2>
            <p className="mt-1 text-[12px] text-[#82737B]">Bấm ô giờ để chọn. Mỗi ô là 50 phút. Công bố khi mỗi mentor có ít nhất 5 tiết.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-[#8C7782]">
            <span className="rounded-lg border border-[#E7DAE1] bg-white px-2 py-1">Trống</span>
            <span className="rounded-lg bg-[#AD3155] px-2 py-1 text-white">Sẽ xếp</span>
            <span className="rounded-lg bg-[#F3E4EA] px-2 py-1 text-[#8B2344]">Đã xếp</span>
          </div>
        </div>
        {registrations.isPending && <p className="text-[13px] text-[#82737B]">Đang tải buổi rảnh…</p>}
        {!registrations.isPending && !groups.length && (
          <p className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-6 text-[13px] text-[#82737B]">Chưa có mentor đăng ký buổi rảnh trong tuần này.</p>
        )}
        <div className="space-y-4">
          {groups.map((group) => {
            const placed = assignedCount(group.id);
            const pending = group.periods.reduce((sum, row) => sum + (picks[row.id]?.length || 0), 0);
            const jobs = group.periods
              .map((row) => ({ id: row.id, slotIndexes: picks[row.id] || [] }))
              .filter((job) => job.slotIndexes.length);
            const saving = assign.isPending && assign.variables?.some((job) => jobs.some((item) => item.id === job.id));
            return (
              <article key={group.id} className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E7EC] px-4 py-3">
                  <div>
                    <h3 className="text-[16px] font-semibold">{group.name}</h3>
                    <p className={`mt-0.5 text-[12px] ${placed >= 5 ? 'text-[#2F6B45]' : 'text-[#8A5A10]'}`}>
                      {placed} tiết đã xếp{placed >= 5 ? ' · đủ để công bố' : ` · còn thiếu ${5 - placed}`}
                      {pending ? ` · đang chọn ${pending}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={assign.isPending || !jobs.length}
                    onClick={() => { setNotice(''); setError(''); assign.mutate(jobs); }}
                    className={`h-10 rounded-xl px-4 text-[13px] font-medium ${focus} ${jobs.length ? 'bg-[#AD3155] text-white hover:bg-[#982B4B]' : 'bg-[#F6F1F3] text-[#B09AA4]'}`}
                  >
                    {saving ? 'Đang xếp…' : pending ? `Xếp ${pending} tiết` : 'Chưa chọn tiết'}
                  </button>
                </div>
                <div className="divide-y divide-[#F3EDF0]">
                  {byDate(group.periods).map(([date, rows]) => (
                    <div key={date} className="grid gap-3 px-4 py-3 sm:grid-cols-[92px_minmax(0,1fr)] sm:items-start">
                      <div>
                        <p className="text-[13px] font-semibold">{dayName(date)} {pretty(date).slice(0, 5)}</p>
                      </div>
                      <div className="space-y-3">
                        {rows.map((row) => {
                          const period = PERIODS[row.period] || { label: row.period, hour: 8 };
                          const taken = assignedIndexes(row);
                          const selected = picks[row.id] || [];
                          return (
                            <div key={row.id} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <p className="text-[12px] text-[#8C7782]">{period.label}</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[0, 1, 2, 3].map((index) => {
                                  const locked = taken.has(index);
                                  const on = selected.includes(index);
                                  return (
                                    <button
                                      key={index}
                                      type="button"
                                      disabled={locked || assign.isPending}
                                      aria-pressed={locked || on}
                                      onClick={() => toggle(row.id, index, locked)}
                                      className={`h-10 rounded-lg text-[13px] font-medium ${focus} ${locked ? 'bg-[#F3E4EA] text-[#8B2344]' : on ? 'bg-[#AD3155] text-white' : 'border border-[#E7DAE1] bg-white text-[#49353F] hover:border-[#AD3155]'}`}
                                    >
                                      {slotHour(period.hour + index)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">Tiết đã xếp trong tuần</h2>
        {slots.isPending ? <p className="text-[13px] text-[#82737B]">Đang tải khung giờ…</p> : weekSlots.length ? (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              {[...new Map(weekSlots.map((slot) => [slot.mentorId, slot.mentorName || `Mentor #${slot.mentorId}`])).entries()].map(([id, name], index) => (
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
                    title: slot.mentorName || `Mentor #${slot.mentorId}`,
                    detail: slot.isBooked ? 'Đã có buổi' : slot.isApproved ? 'Đang mở' : 'Nháp',
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
  return <AdminShell pathname={pathname} breadcrumb="Lịch mentor">{body}</AdminShell>;
}
