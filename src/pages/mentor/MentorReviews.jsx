import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { MentorShell } from '@/layouts';
import {
  ContextualEmptyState,
  ContextualErrorState,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
} from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { getMentorCohortReviewSummary } from '@/features/cohorts/api/cohortApi.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

function when(value) {
  if (!value) return '';
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stars(rating) {
  const count = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}`;
}

function CohortReviewCard({ review, index }) {
  const { trf, tr } = useLocale();
  return (
    <article className="rp-card-hover rounded-2xl border border-rp-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-rp-text">
            {review.cohortName || tr('Học viên lớp nhóm')}
          </p>
          <p className="mt-1 text-[12px] text-rp-text-muted">
            {review.level ? `JLPT ${review.level} · ` : ''}
            {when(review.updatedAtUtc || review.createdAtUtc)}
          </p>
        </div>
        <p className="text-[14px] tracking-wide text-rp-brand-strong" aria-label={trf('{0} trên 5 sao', { 0: review.rating })}>
          {stars(review.rating)}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-rp-text">
        {review.comment || trf('Đánh giá #{0} không có nhận xét chi tiết.', { 0: index + 1 })}
      </p>
    </article>
  );
}

export default function MentorReviews() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const mentorId = Number(user?.userId);

  const summary = useQuery({
    queryKey: ['mentor-cohort-review-summary', mentorId],
    queryFn: () => getMentorCohortReviewSummary(mentorId),
    enabled: mentorId > 0,
  });

  const data = summary.data;
  const rows = Array.isArray(data?.recentReviews) ? data.recentReviews : [];
  const average = Number(data?.averageRating);
  const total = data?.reviewCount ?? rows.length;

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Đánh giá lớp nhóm')}>
      <div className="rp-container-reading py-6 text-rp-text lg:py-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">{tr('Đánh giá từ học viên lớp nhóm')}</h1>
            <p className="mt-1.5 text-[13px] leading-6 text-rp-text-muted">
              {tr('Tổng hợp điểm trung bình và nhận xét ẩn danh từ học viên các khóa học nhóm bạn đã tham gia giảng dạy.')}
            </p>
          </div>
          <Link
            to="/mentor-study-courses/"
            className="inline-flex h-9 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[12px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint"
          >
            {tr('Về lớp phụ trách')}
          </Link>
        </header>

        <RefreshingIndicator active={summary.isFetching && !summary.isPending} className="mb-3" />

        {summary.isError && data && (
          <StaleDataBar onRetry={() => summary.refetch()} retrying={summary.isFetching} />
        )}
        {summary.isPending ? (
          <SakuraLoader variant="section" context="cohort" label={tr('Đang tải đánh giá lớp nhóm')} delay={160} />
        ) : summary.isError && !data ? (
          <div className="rounded-2xl border border-rp-line bg-white px-5">
            <ContextualErrorState
              error={summary.error}
              title={tr('Chưa tải được đánh giá lớp nhóm')}
              onRetry={() => summary.refetch()}
              retrying={summary.isFetching}
            />
          </div>
        ) : (
          <>
            <section className="mb-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Điểm trung bình', Number.isFinite(average) && total > 0 ? `${average.toFixed(1)} / 5` : 'Chưa có'],
                ['Số lượt đánh giá lớp nhóm', total],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-rp-line bg-white px-4 py-4">
                  <p className="text-[12px] text-rp-text-muted">{tr(label)}</p>
                  <p className="mt-1 text-[22px] font-semibold text-rp-brand-strong">{value}</p>
                </div>
              ))}
            </section>

            <div className="space-y-3">
              {rows.map((review, idx) => (
                <CohortReviewCard key={review.id || `${review.createdAtUtc}-${idx}`} review={review} index={idx} />
              ))}
            </div>
            {!rows.length && (
              <div className="rounded-2xl border border-rp-line bg-white px-5">
                <ContextualEmptyState
                  compact
                  title={tr('Chưa có đánh giá lớp nhóm công khai.')}
                  description={tr('Khi học viên hoàn tất đánh giá lớp học nhóm của bạn, nhận xét sẽ hiển thị tại đây.')}
                />
              </div>
            )}
          </>
        )}
      </div>
    </MentorShell>
  );
}
