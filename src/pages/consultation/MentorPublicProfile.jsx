import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getMentorAvailableSlots, getMentorRatingSummary, getPublicMentorProfile } from '../../api/mentorBookingApi.js';
import { vietnamDate } from '../../utils/vietnamDate.js';

export default function MentorPublicProfile() {
  const { pathname } = useLocation();
  const { mentorId } = useParams();
  const id = Number(mentorId);
  const startDate = vietnamDate(0);
  const endDate = vietnamDate(13);

  const profileQuery = useQuery({
    queryKey: ['public-mentor', id],
    queryFn: () => getPublicMentorProfile(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const ratingQuery = useQuery({
    queryKey: ['mentor-rating', id],
    queryFn: () => getMentorRatingSummary(id),
    enabled: Number.isInteger(id) && id > 0,
  });
  const slotQuery = useQuery({
    queryKey: ['public-mentor-slots', id, startDate, endDate],
    queryFn: () => getMentorAvailableSlots(id, startDate, endDate),
    enabled: Number.isInteger(id) && id > 0,
  });

  const profile = profileQuery.data;
  const days = slotQuery.data?.dailySlots || [];

  return (
    <LearnerShell pathname={pathname} breadcrumb="Hồ sơ cố vấn">
      <main className="mx-auto w-full max-w-[860px] px-4 py-6 text-[#2D282A] sm:px-6">
        <Link to="/booking-schedule/" className="text-sm font-semibold text-[#D94B68]">Về đặt lịch</Link>
        {profileQuery.isPending && <p className="mt-4 text-sm">Đang tải hồ sơ…</p>}
        {profileQuery.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{profileQuery.error.message}</p>}
        {profile && (
          <header className="mt-4 rounded-2xl border border-[#eadfd9] bg-white p-5">
            <h1 className="text-2xl font-extrabold">{profile.name}</h1>
            <p className="mt-1 text-sm text-[#6F6669]">{profile.expertise || 'Chưa cập nhật chuyên môn'} · JLPT {profile.jlptLevel || '—'}</p>
            <p className="mt-1 text-sm text-[#6F6669]">{profile.workplace || 'Chưa cập nhật nơi công tác'} · {profile.yearsOfExperience ?? '—'} năm kinh nghiệm</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{profile.bio || 'Chưa có giới thiệu.'}</p>
            <p className="mt-3 text-sm">Điểm trung bình: {ratingQuery.data ? `${ratingQuery.data.averageRating} / 5 (${ratingQuery.data.totalReviews} đánh giá)` : 'Đang tải đánh giá…'}</p>
            <p className="mt-1 text-sm">{profile.isBookable ? 'Đang nhận lịch.' : 'Hiện chưa mở nhận lịch.'}</p>
            <Link to={`/booking-schedule/?mentorId=${profile.mentorId}`} className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-4 py-2 text-sm font-semibold text-white">Chọn khung giờ</Link>
          </header>
        )}
        <section className="mt-4 rounded-2xl border border-[#eadfd9] bg-white p-5">
          <h2 className="text-sm font-bold">Khung giờ 14 ngày tới</h2>
          {slotQuery.isPending && <p className="mt-3 text-sm">Đang tải khung giờ…</p>}
          {slotQuery.error && <p className="mt-3 text-sm text-red-700">{slotQuery.error.message}</p>}
          {!slotQuery.isPending && !days.length && <p className="mt-3 text-sm text-[#6F6669]">Chưa có khung giờ trống.</p>}
          <ul className="mt-3 space-y-3">
            {days.map((day) => (
              <li key={day.date}>
                <p className="text-sm font-semibold">{day.date}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(day.slots || []).map((slot) => (
                    <span key={slot.slotId} className="rounded-full bg-[#FAF7F5] px-3 py-1 text-xs font-semibold">
                      {String(slot.localStart).slice(0, 5)}–{String(slot.localEnd).slice(0, 5)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </LearnerShell>
  );
}
