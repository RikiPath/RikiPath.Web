import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import WeekTimeGrid from '../../components/consultation/WeekTimeGrid.jsx';
import { ConsultShell } from '../../components/shells';
import { api } from '../../api/client.js';
import { getMentorBookings } from '../../api/mentorBookingsApi.js';
import { bookingDate, bookingStatus, bookingTime } from '../../utils/mentorBooking.js';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function dayKey(value) {
  const date = bookingDate(value);
  if (!date) return 'Chưa xếp ngày';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayLabel(value) {
  const date = bookingDate(value);
  if (!date) return 'Chưa xếp ngày';
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const slotClock = value => bookingDate(value)?.toLocaleTimeString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
}) || 'Chưa xếp giờ';

function clockParts(value) {
  const date = bookingDate(value);
  if (!date) return { hour: 8, minute: 0 };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  };
}

function thisWeek(weekOffset = 0) {
  const keyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = keyFormat.format(new Date());
  const [year, month, day] = todayKey.split('-').map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
  }).format(noon);
  const index = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() - index + weekOffset * 7);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    const key = keyFormat.format(date);
    return {
      key,
      name: DAY_NAMES[offset],
      date: Number(key.slice(-2)),
      today: key === todayKey,
    };
  });
}

function groupByDay(bookings) {
  const groups = new Map();
  [...bookings]
    .sort((a, b) => (bookingDate(a.scheduledAt)?.getTime() || 0) - (bookingDate(b.scheduledAt)?.getTime() || 0))
    .forEach((booking) => {
      const key = dayKey(booking.scheduledAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
    });
  return [...groups.entries()];
}

export default function WorkSchedule() {
  const { pathname } = useLocation();
  const [weekOffset, setWeekOffset] = useState(0);
  const query = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    refetchInterval: 15000,
    retry: false,
  });

  const bookings = Array.isArray(query.data) ? query.data : [];
  const week = thisWeek(weekOffset);
  const assigned = useQuery({ queryKey: ['mentor-assigned-slots'], queryFn: async () => (await api.get('/mentor/availability')).result || [], refetchInterval: 15000 });
  const scheduleError = query.error || assigned.error;
  const selectedMonth = week[0].key.slice(0, 7);
  const monthLabel = `${Number(selectedMonth.slice(5))}/${selectedMonth.slice(0, 4)}`;
  const grouped = new Map(groupByDay(bookings));
  const weekKeys = new Set(week.map((day) => day.key));
  const later = [...grouped.entries()].filter(([key]) => key.startsWith(selectedMonth) && !weekKeys.has(key));
  const now = clockParts(new Date().toISOString());
  const calendarEvents = week.flatMap((day) => {
    const slots = (assigned.data || [])
      .filter((slot) => dayKey(slot.startTime) === day.key)
      .map((slot) => {
        const start = clockParts(slot.startTime);
        const end = clockParts(slot.endTime);
        return {
          id: `slot-${slot.id}`,
          dayKey: day.key,
          startHour: start.hour,
          startMinute: start.minute,
          endHour: end.hour,
          endMinute: end.minute,
          title: slot.isBooked ? 'Đã có người đặt' : 'Khung trống',
          detail: `${slotClock(slot.startTime)}–${slotClock(slot.endTime)}`,
          tone: slot.isBooked ? 'booked' : 'open',
          z: 1,
        };
      });
    const sessions = (grouped.get(day.key) || []).map((booking) => {
      const start = clockParts(booking.scheduledAt);
      const end = booking.endsAt ? clockParts(booking.endsAt) : null;
      const startMinutes = start.hour * 60 + start.minute;
      const endMinutes = end ? end.hour * 60 + end.minute : startMinutes + 50;
      const finishMinutes = endMinutes > startMinutes ? endMinutes : startMinutes + 50;
      const finish = { hour: Math.floor(finishMinutes / 60), minute: finishMinutes % 60 };
      return {
        id: `booking-${booking.id}`,
        dayKey: day.key,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: finish.hour,
        endMinute: finish.minute,
        title: booking.learnerName || `HV #${booking.learnerId || booking.id}`,
        detail: bookingStatus(booking),
        tone: 'session',
        href: `/consultation-prep?bookingId=${booking.id}`,
        z: 3,
      };
    });
    return [...slots, ...sessions];
  });

  return (
    <ConsultShell pathname={pathname} breadcrumb="Lịch làm việc">
      <div
        data-page="WorkSchedule"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Lịch làm việc</h1>
            <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">
              Buổi đã đặt và khung giờ bạn đã mở. Giờ Việt Nam.
            </p>
          </div>
          <Link
            to="/mentor-availability"
            className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}
          >
            Đăng ký buổi rảnh
          </Link>
        </header>

        {scheduleError ? (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {scheduleError?.message || 'Không tải được lịch làm việc.'}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-[11px] text-[#A0788B]">Tháng {monthLabel}</p>
            <p className="text-[13px] font-medium text-[#79465D]">
              {weekOffset === 0 ? 'Tuần này' : 'Tuần đang xem'} · {week[0].date}/{week[0].key.slice(5, 7)}/{week[0].key.slice(0, 4)} – {week[6].date}/{week[6].key.slice(5, 7)}/{week[6].key.slice(0, 4)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chuyển tuần lịch làm việc">
            <button type="button" onClick={() => setWeekOffset(value => value - 1)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}>
              <span aria-hidden="true">←</span> Tuần trước
            </button>
            <button type="button" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0} className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] disabled:cursor-default disabled:opacity-50 ${focusClass}`}>
              Tuần này
            </button>
            <button type="button" onClick={() => setWeekOffset(value => value + 1)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}>
              Tuần tới <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <WeekTimeGrid
          days={week}
          events={calendarEvents}
          startHour={8}
          endHour={22}
          nowKey={dayKey(new Date().toISOString())}
          nowMinutes={now.hour * 60 + now.minute}
        />

        {later.length > 0 ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
            <h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">
              Lịch khác trong tháng {monthLabel}
            </h2>
            {later.map(([day, items]) => (
              <div key={day} className="border-b border-[#F0E7EC] px-4 py-3 last:border-b-0">
                <p className="text-[12px] capitalize text-[#A18B97]">{dayLabel(items[0].scheduledAt)}</p>
                {items.map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/consultation-request/?bookingId=${booking.id}`}
                    className={`mt-1 block text-[13px] text-[#543E49] hover:text-[#AD3155] ${focusClass} rounded`}
                  >
                    {booking.learnerName || `Học viên #${booking.learnerId || booking.id}`} · {bookingTime(booking.scheduledAt)}
                  </Link>
                ))}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </ConsultShell>
  );
}
