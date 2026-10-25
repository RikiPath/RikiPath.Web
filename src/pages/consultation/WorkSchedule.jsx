import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ConsultShell } from '../../components/shells';
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

function thisWeek() {
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
  monday.setUTCDate(noon.getUTCDate() - index);

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
  const query = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    retry: false,
  });

  const bookings = Array.isArray(query.data) ? query.data : [];
  const week = thisWeek();
  const grouped = new Map(groupByDay(bookings));
  const weekKeys = new Set(week.map((day) => day.key));
  const later = [...grouped.entries()].filter(([key]) => !weekKeys.has(key));

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
              Buổi đã được phân. Giờ Việt Nam.
            </p>
          </div>
          <Link
            to="/mentor-availability"
            className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}
          >
            Mở khung giờ
          </Link>
        </header>

        {query.isError ? (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {query.error?.message || 'Không tải được lịch làm việc.'}
          </p>
        ) : null}

        <section
          aria-busy={query.isFetching}
          className="overflow-hidden rounded-3xl border border-[#E7C9D6] bg-[#FCF4F8] p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-[13px] font-medium text-[#79465D]">
              Tuần này · {week[0].date}/{week[0].key.slice(5, 7)} – {week[6].date}/{week[6].key.slice(5, 7)}
            </p>
            {query.isPending ? <p className="text-[12px] text-[#A0788B]">Đang tải…</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {week.map((day) => {
              const items = grouped.get(day.key) || [];
              return (
                <div
                  key={day.key}
                  className={`min-h-[148px] rounded-2xl p-2.5 ${
                    day.today ? 'bg-[#AD3155] text-white' : 'bg-white text-[#49353F]'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={`text-[11px] ${day.today ? 'text-white/80' : 'text-[#B18F9E]'}`}>{day.name}</span>
                    <span className="text-[20px] font-semibold leading-none">{day.date}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {items.map((booking) => (
                      <Link
                        key={booking.id}
                        to={`/consultation-prep?bookingId=${booking.id}`}
                        className={`block rounded-lg px-2 py-1.5 ${focusClass} ${
                          day.today ? 'bg-white/15 hover:bg-white/25' : 'bg-[#FCEEF4] hover:bg-[#FADDE8]'
                        }`}
                      >
                        <span className="block truncate text-[12px] font-medium">
                          {booking.learnerName || `HV #${booking.learnerId || booking.id}`}
                        </span>
                        <span className={`block text-[10px] ${day.today ? 'text-white/75' : 'text-[#A36680]'}`}>
                          {bookingTime(booking.scheduledAt).split(' ').slice(-1)} · {bookingStatus(booking)}
                        </span>
                      </Link>
                    ))}
                    {!query.isPending && items.length === 0 ? (
                      <p className={`pt-4 text-center text-[11px] ${day.today ? 'text-white/70' : 'text-[#C4AEB8]'}`}>
                        Trống
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {later.length > 0 ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
            <h2 className="border-b border-[#F0E7EC] px-4 py-2.5 text-[13px] font-medium text-[#705261]">
              Ngoài tuần này
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
