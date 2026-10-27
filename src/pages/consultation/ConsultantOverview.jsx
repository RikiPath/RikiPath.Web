import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ConsultShell } from '../../components/shells';
import { getMentorBookings } from '../../api/mentorBookingsApi.js';
import {
  bookingExpired,
  bookingStatus,
  bookingTime,
  canAcceptBooking,
} from '../../utils/mentorBooking.js';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const SHORTCUTS = [
  { to: '/consultation-queue', label: 'Hàng đợi' },
  { to: '/work-schedule', label: 'Lịch làm việc' },
  { to: '/mentor-availability', label: 'Lịch khả dụng' },
  { to: '/consultation-prep', label: 'Chuẩn bị buổi' },
  { to: '/mentor-chat', label: 'Tin nhắn' },
];

function upcoming(bookings) {
  return bookings
    .filter((booking) => (
      ['Assigned', 'Accepted'].includes(booking.status) && !bookingExpired(booking)
    ))
    .sort((a, b) => (
      (new Date(a.scheduledAt || 0)).getTime() - (new Date(b.scheduledAt || 0)).getTime()
    ));
}

function learnerName(booking) {
  return booking.learnerName || `Học viên #${booking.learnerId || booking.id}`;
}

export default function ConsultantOverview() {
  const { pathname } = useLocation();
  const query = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    retry: false,
  });

  const bookings = Array.isArray(query.data) ? query.data : [];
  const nextSessions = upcoming(bookings);
  const [next, ...later] = nextSessions;
  const counts = query.isPending || query.isError
    ? null
    : [
      ['Chờ tiếp nhận', bookings.filter(canAcceptBooking).length],
      ['Đã tiếp nhận', bookings.filter((booking) => (
        booking.status === 'Accepted' && !bookingExpired(booking)
      )).length],
      ['Sắp diễn ra', nextSessions.length],
    ];

  return (
    <ConsultShell pathname={pathname} breadcrumb="Tổng quan">
      <div
        data-page="ConsultantOverview"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5">
          <h1 className="text-[25px] font-semibold tracking-tight">Tổng quan</h1>
          <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">
            Buổi tư vấn gần nhất được phân cho bạn.
          </p>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section aria-labelledby="next-title" aria-busy={query.isFetching}>
            <h2 id="next-title" className="mb-2.5 px-1 text-[14px] font-semibold text-[#705261]">
              Buổi gần nhất
            </h2>

            {query.isPending ? (
              <p role="status" className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-10 text-center text-[13px] text-[#9A8390]">
                Đang tải lịch…
              </p>
            ) : query.isError ? (
              <p role="alert" className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 text-[13px] leading-6 text-[#A33357]">
                {query.error?.message || 'Không tải được lịch tư vấn.'}
              </p>
            ) : !next ? (
              <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
                <p className="text-[15px] font-medium text-[#806371]">Chưa có buổi sắp tới</p>
                <p className="mt-1 max-w-md text-[12px] leading-6 text-[#A18B97]">
                  Buổi mới sẽ hiện ở đây sau khi học viên thanh toán và được phân cho bạn.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#E7C9D6] bg-[#FCF4F8]">
                <div className="px-5 py-5">
                  <p className="text-[11px] font-medium tracking-[0.12em] text-[#AD3155]">
                    {bookingStatus(next)}
                  </p>
                  <h3 className="mt-2 text-[20px] font-semibold text-[#5A3E4C]">
                    {learnerName(next)}
                  </h3>
                  <p className="mt-1 text-[13px] text-[#8D7481]">
                    {bookingTime(next.scheduledAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/consultation-prep?bookingId=${next.id}`}
                      className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
                    >
                      Chuẩn bị buổi này
                    </Link>
                    <Link
                      to={`/consultation-request/?bookingId=${next.id}`}
                      className={`inline-flex h-9 items-center rounded-lg bg-white px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>

                {later.length > 0 && (
                  <div className="border-t border-[#F0E0E8] bg-white">
                    <p className="px-5 pt-3 text-[12px] text-[#A18B97]">Các buổi sau</p>
                    <div className="divide-y divide-[#F0E7EC]">
                      {later.map((booking) => (
                        <Link
                          key={booking.id}
                          to={`/consultation-prep?bookingId=${booking.id}`}
                          className={`flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#FFF7FA] ${focusClass}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium text-[#543E49]">
                              {learnerName(booking)}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-[#947B88]">
                              {bookingTime(booking.scheduledAt)} · {bookingStatus(booking)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[12px] text-[#A36680]">Chuẩn bị</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
            <h2 className="text-[13px] font-semibold text-[#705261]">Trong lịch</h2>
            <dl className="mt-3 space-y-2">
              {(counts || [
                ['Chờ tiếp nhận', '—'],
                ['Đã tiếp nhận', '—'],
                ['Sắp diễn ra', '—'],
              ]).map(([label, count]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[12px] text-[#967F8A]">{label}</dt>
                  <dd className="text-[16px] font-semibold text-[#A33357]">{count}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-5 text-[13px] font-semibold text-[#705261]">Đi tới</h2>
            <nav className="mt-2 flex flex-col">
              {SHORTCUTS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-1 py-1.5 text-[13px] text-[#8A6070] hover:text-[#AD3155] ${focusClass}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </ConsultShell>
  );
}
