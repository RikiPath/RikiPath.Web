import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ConsultShell } from '../../components/shells';
import { getMentorBookings } from '../../api/mentorBookingsApi.js';
import {
  bookingExpired,
  bookingStatus,
  bookingTime,
} from '../../utils/mentorBooking.js';

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function Icon({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

function upcoming(bookings) {
  return bookings
    .filter((booking) => (
      ['Assigned', 'Accepted'].includes(booking.status) && !bookingExpired(booking)
    ))
    .sort((a, b) => (
      (new Date(a.scheduledAt || 0)).getTime() - (new Date(b.scheduledAt || 0)).getTime()
    ));
}

function SessionNotes({ bookingId }) {
  const [note, setNote] = useState('');

  return (
    <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white p-5">
      <h2 className="text-[14px] font-semibold text-[#705261]">Ghi chú trước buổi</h2>
      <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
        Ghi chú chỉ giữ trên trang này, chưa được lưu lên hệ thống.
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Việc cần xem lại với học viên…"
        className={`mt-3 w-full resize-y rounded-xl border border-[#EADFE5] px-3 py-2 text-[13px] leading-6 text-[#49353F] outline-none ${focusClass}`}
      />
      <p className="mt-2 text-[11px] text-[#B099A4]">{note.length}/2000 · Buổi #{bookingId}</p>
    </section>
  );
}

export default function ConsultationPrep() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const bookingId = Number(params.get('bookingId')) || null;

  const query = useQuery({
    queryKey: ['mentor-bookings'],
    queryFn: getMentorBookings,
    retry: false,
  });

  const bookings = Array.isArray(query.data) ? query.data : [];
  const sessions = upcoming(bookings);
  const selected = bookings.find((booking) => booking.id === bookingId) || null;

  return (
    <ConsultShell pathname={pathname} breadcrumb="Chuẩn bị buổi">
      <div
        data-page="ConsultationPrep"
        className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8"
      >
        <header className="mb-5">
          <h1 className="text-[25px] font-semibold tracking-tight">Chuẩn bị buổi</h1>
          <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">
            Chọn một buổi sắp tới để xem học viên và ghi chú trước giờ.
          </p>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section
            aria-labelledby="session-list-title"
            className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white"
          >
            <h2 id="session-list-title" className="border-b border-[#F0E7EC] px-4 py-3 text-[14px] font-semibold text-[#705261]">
              Buổi sắp tới
            </h2>
            {query.isPending ? (
              <p role="status" className="px-4 py-8 text-center text-[13px] text-[#9A8390]">
                Đang tải lịch…
              </p>
            ) : query.isError ? (
              <p role="alert" className="px-4 py-6 text-[13px] leading-6 text-[#A33357]">
                {query.error?.message || 'Không tải được lịch tư vấn.'}
              </p>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-[14px] font-medium text-[#806371]">Chưa có buổi để chuẩn bị</p>
                <Link to="/consultation-queue" className={`mt-3 inline-flex text-[12px] font-medium text-[#AD3155] ${focusClass} rounded`}>
                  Xem hàng đợi
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#F0E7EC]">
                {sessions.map((booking) => {
                  const active = booking.id === bookingId;
                  return (
                    <Link
                      key={booking.id}
                      to={`/consultation-prep?bookingId=${booking.id}`}
                      aria-current={active ? 'true' : undefined}
                      className={`block px-4 py-3.5 ${active ? 'bg-[#FCEEF4]' : 'hover:bg-[#FFF7FA]'} ${focusClass}`}
                    >
                      <span className="block text-[14px] font-medium text-[#543E49]">
                        {booking.learnerName || `Học viên #${booking.learnerId || booking.id}`}
                      </span>
                      <span className="mt-1 block text-[12px] text-[#947B88]">
                        {bookingTime(booking.scheduledAt)} · {bookingStatus(booking)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <div>
            {!bookingId && (
              <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6">
                <p className="text-[14px] font-medium text-[#806371]">Chọn một buổi ở cột bên trái</p>
                <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
                  Thông tin học viên và ghi chú sẽ hiện sau khi chọn.
                </p>
              </div>
            )}

            {bookingId && query.isPending && (
              <p role="status" className="text-[13px] text-[#9A8390]">Đang tải buổi…</p>
            )}

            {bookingId && !query.isPending && !query.isError && !selected && (
              <p className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 text-[13px] text-[#806371]">
                Buổi này không có trong lịch của bạn.
              </p>
            )}

            {selected && (
              <>
                <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
                  <p className="text-[11px] font-medium tracking-[0.12em] text-[#AD3155]">BUỔI #{selected.id}</p>
                  <h2 className="mt-2 text-[18px] font-semibold text-[#5A3E4C]">
                    {selected.learnerName || `Học viên #${selected.learnerId || selected.id}`}
                  </h2>
                  <p className="mt-2 text-[13px] text-[#8D7481]">
                    {bookingTime(selected.scheduledAt)}
                  </p>
                  <p className="mt-1 text-[12px] text-[#A36680]">{bookingStatus(selected)}</p>
                  {selected.question && (
                    <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-[#6F5C66]">
                      {selected.question}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/consultation-request/?bookingId=${selected.id}`}
                      className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
                    >
                      Xem chi tiết
                    </Link>
                    <Link
                      to={`/mentor-chat/?bookingId=${selected.id}`}
                      className={`inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}
                    >
                      Tin nhắn
                    </Link>
                    {selected.meetingLink && (
                      <a
                        href={selected.meetingLink}
                        className={`inline-flex h-9 items-center gap-1 rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#866777] hover:bg-[#FFF6FA] ${focusClass}`}
                      >
                        <Icon name="video_call" className="text-[16px]" />
                        Mở phòng họp
                      </a>
                    )}
                  </div>
                </section>
                <SessionNotes key={selected.id} bookingId={selected.id} />
              </>
            )}
          </div>
        </div>
      </div>
    </ConsultShell>
  );
}
