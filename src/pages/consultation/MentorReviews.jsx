import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getMentorRatingSummary } from '../../api/mentorBookingApi.js';

export default function MentorReviews() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mentorId = Number(user?.userId);
  const query = useQuery({
    queryKey: ['mentor-rating-summary', mentorId],
    queryFn: () => getMentorRatingSummary(mentorId),
    enabled: mentorId > 0,
    retry: false,
  });
  const average = query.data?.averageRating;

  return <ConsultShell pathname={pathname} breadcrumb="Đánh giá">
    <main className="mx-auto w-full max-w-3xl px-4 py-6 text-[#49353F] sm:px-6">
      <h1 className="text-2xl font-semibold">Điểm đánh giá trung bình</h1>
      <section className="mt-4 rounded-2xl border border-card-border bg-white p-5">
        {query.isPending && <p role="status">Đang tải điểm đánh giá…</p>}
        {query.isError && <p role="alert" className="text-rose-700">Chưa tải được điểm đánh giá.{' '}
          <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Thử lại</button>
        </p>}
        {query.isSuccess && (average == null ? <p>Chưa có điểm đánh giá.</p>
          : <p className="text-3xl font-semibold text-primary">{average.toLocaleString('vi-VN')}/5 sao</p>)}
      </section>
    </main>
  </ConsultShell>;
}
