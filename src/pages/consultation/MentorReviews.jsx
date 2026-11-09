import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { ConsultShell } from '../../components/shells';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getMentorRatingSummary, getMentorReviews, replyMentorReview } from '../../api/mentorBookingApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stars(rating) {
  const count = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}`;
}

function ReviewCard({ review }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(!review.mentorReply);
  const [draft, setDraft] = useState(review.mentorReply || '');
  const [error, setError] = useState('');

  const reply = useMutation({
    mutationFn: () => replyMentorReview(review.id, { reply: draft.trim() }),
    onSuccess: () => {
      setError('');
      setOpen(false);
      client.invalidateQueries({ queryKey: ['mentor-own-reviews'] });
      client.invalidateQueries({ queryKey: ['mentor-rating-summary'] });
    },
    onError: (err) => setError(err.message || 'Không gửi được phản hồi.'),
  });

  return (
    <article className="rounded-2xl border border-[#EADFE5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-[#543E49]">{review.learnerName || 'Học viên'}</p>
          <p className="mt-1 text-[12px] text-[#967F8A]">
            Buổi #{review.mentorBookingId} · {when(review.createdAtUtc)}
          </p>
        </div>
        <p className="text-[14px] tracking-wide text-[#AD3155]" aria-label={`${review.rating} trên 5 sao`}>
          {stars(review.rating)}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[#49353F]">
        {review.comment || 'Học viên không để lại lời nhận xét.'}
      </p>

      {review.mentorReply && !open && (
        <div className="mt-4 rounded-xl bg-[#FCF4F8] px-4 py-3">
          <p className="text-[12px] font-medium text-[#A36680]">
            Phản hồi của bạn{review.mentorRepliedAtUtc ? ` · ${when(review.mentorRepliedAtUtc)}` : ''}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[#5A3E4C]">{review.mentorReply}</p>
          <button
            type="button"
            onClick={() => { setDraft(review.mentorReply || ''); setOpen(true); }}
            className={`mt-2 text-[12px] font-medium text-[#AD3155] ${focus} rounded`}
          >
            Sửa phản hồi
          </button>
        </div>
      )}

      {open && (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text || text.length > 1000) return;
            reply.mutate();
          }}
        >
          <label className="block text-[12px] font-medium text-[#705261]" htmlFor={`reply-${review.id}`}>
            {review.mentorReply ? 'Sửa phản hồi' : 'Phản hồi học viên'}
          </label>
          <textarea
            id={`reply-${review.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
            rows={4}
            maxLength={1000}
            placeholder="Cảm ơn em đã góp ý. Buổi sau mình sẽ…"
            className={`mt-2 w-full resize-y rounded-xl border border-[#EADFE5] px-3 py-2 text-[13px] leading-6 outline-none ${focus}`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#B099A4]">{draft.trim().length}/1000</span>
            <div className="flex gap-2">
              {review.mentorReply && (
                <button
                  type="button"
                  onClick={() => { setDraft(review.mentorReply || ''); setOpen(false); setError(''); }}
                  className={`h-9 rounded-lg px-3 text-[12px] text-[#866777] ${focus}`}
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={reply.isPending || !draft.trim()}
                className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
              >
                {reply.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="mt-2 text-[12px] text-[#A33357]">{error}</p>}
        </form>
      )}
    </article>
  );
}

export default function MentorReviews() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mentorId = Number(user?.userId);

  const summary = useQuery({
    queryKey: ['mentor-rating-summary', mentorId],
    queryFn: () => getMentorRatingSummary(mentorId),
    enabled: mentorId > 0,
    retry: false,
  });
  const reviews = useQuery({
    queryKey: ['mentor-own-reviews', mentorId],
    queryFn: async () => (await getMentorReviews(mentorId, { page: 1, pageSize: 50 })) ?? [],
    enabled: mentorId > 0,
    retry: false,
  });

  const rows = Array.isArray(reviews.data) ? reviews.data : [];
  const average = Number(summary.data?.averageRating);
  const total = summary.data?.totalReviews;

  return (
    <ConsultShell pathname={pathname} breadcrumb="Đánh giá">
      <div className="mx-auto w-full max-w-[860px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5">
          <h1 className="text-[25px] font-semibold tracking-tight">Đánh giá của học viên</h1>
          <p className="mt-1.5 text-[13px] leading-6 text-[#927B88]">
            Chỉ hiện đánh giá đã được duyệt và công khai. Phản hồi dài tối đa 1.000 ký tự.
          </p>
        </header>

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Điểm trung bình', summary.isPending ? '—' : (Number.isFinite(average) ? average.toFixed(1) : '0.0')],
            ['Số đánh giá', summary.isPending ? '—' : (total ?? 0)],
            ['Tỷ lệ tích cực', summary.isPending ? '—' : `${Math.round(Number(summary.data?.positiveRatePercent) || 0)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
              <p className="text-[12px] text-[#967F8A]">{label}</p>
              <p className="mt-1 text-[22px] font-semibold text-[#A33357]">{value}</p>
            </div>
          ))}
        </section>

        {summary.error && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {summary.error.message}
          </p>
        )}
        {reviews.error && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {reviews.error.message}
          </p>
        )}
        {reviews.isPending && <p className="text-[13px] text-[#9A8390]">Đang tải đánh giá…</p>}

        <div className="space-y-3">
          {rows.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
        {!reviews.isPending && !reviews.error && !rows.length && (
          <p className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8 text-[14px] text-[#806371]">
            Chưa có đánh giá công khai.
          </p>
        )}
      </div>
    </ConsultShell>
  );
}
