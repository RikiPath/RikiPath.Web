import { useState } from 'react';
import {
  getCohortMentorReviews,
  submitCohortMentorReview,
  updateCohortMentorReview,
} from '@/features/cohorts/api/cohortApi';
import { errorMessage as formatApiError } from '@/api/apiErrors';
import {
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  SakuraLoader,
  Textarea,
  UserAvatar,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { reviewableMentors } from '@/features/cohorts/utils/completionHelpers';
import { useLocale } from '@/locales/locale.js';

function ReviewForm({ courseId, mentor, existing, busy, onRun, onSaved }) {
  const { tr } = useLocale();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState('');

  const ratingOptions = [5, 4, 3, 2, 1].map((n) => ({
    value: String(n),
    label: `${'★'.repeat(n)} (${n})`,
  }));

  return (
    <form
      className="space-y-3 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        onRun(
          async () => {
            try {
              if (existing?.id) await updateCohortMentorReview(courseId, existing.id, { rating, comment });
              else await submitCohortMentorReview(courseId, { mentorId: mentor.mentorId, rating, comment });
            } catch (err) {
              setError(formatApiError(err, tr('Chưa gửi được đánh giá.')));
              throw err;
            }
            onSaved();
          },
          existing?.id ? 'Đã cập nhật đánh giá Giáo viên.' : 'Cảm ơn bạn đã đánh giá Giáo viên.',
        );
      }}
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar src={mentor.mentorAvatarUrl} name={mentor.mentorName || tr('Giáo viên')} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-rp-text">
            {existing?.id ? tr('Sửa đánh giá') : tr('Đánh giá')} · {mentor.mentorName || tr('Giáo viên')}
          </p>
        </div>
      </div>
      <div className="max-w-[200px]">
        <Field label={tr('Số sao (1–5)')}>
          <CustomSelect
            value={String(rating)}
            disabled={busy}
            onChange={(val) => setRating(Number(val))}
            options={ratingOptions}
          />
        </Field>
      </div>
      <Field label={tr('Nhận xét')}>
        <Textarea
          maxLength={2000}
          rows={3}
          disabled={busy}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={tr('Điều bạn thấy hữu ích hoặc cần cải thiện…')}
        />
      </Field>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="sm" disabled={busy} loading={busy}>
          {existing?.id ? tr('Cập nhật đánh giá') : tr('Gửi đánh giá')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Dedicated Mentor Review section hosted inside Tab "Đánh giá & hỗ trợ".
 * Enforces strict business eligibility (learner can only rate a mentor who directly delivered >= 1 session).
 */
export default function CohortMentorReviewSection({
  courseId,
  summary = null,
  busy = false,
  onRun,
}) {
  const { tr } = useLocale();
  const reviewsQuery = useAsyncResource(
    () => getCohortMentorReviews(courseId),
    [courseId],
    { enabled: Boolean(courseId) },
  );
  const reviews = Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [];
  const reviewable = reviewableMentors(summary);

  return (
    <Card className="space-y-4 p-5">
      <CardHeader
        title={tr('Đánh giá Giáo viên')}
        description={tr('Phản hồi chất lượng giảng dạy dành cho Giáo viên đã trực tiếp hướng dẫn bạn trong lớp học này.')}
      />

      {reviewsQuery.isPending ? (
        <SakuraLoader variant="section" size={28} context="cohort" className="min-h-[80px] py-2" delay={160} />
      ) : reviewsQuery.isError ? (
        <ContextualErrorState
          variant="inline"
          error={reviewsQuery.error}
          title={tr('Chưa tải được đánh giá Giáo viên đã gửi')}
          onRetry={reviewsQuery.refetch}
          retrying={reviewsQuery.isFetching}
        />
      ) : reviewable.length === 0 ? (
        <ContextualEmptyState
          variant="inline"
          size="sm"
          illustration="review"
          title={tr('Bạn có thể đánh giá Giáo viên sau khi đã học ít nhất một buổi do Giáo viên đó trực tiếp dạy.')}
        />
      ) : (
        <div className="space-y-3">
          {reviewable.map((m) => {
            const existing = reviews.find((r) => Number(r.mentorId) === Number(m.mentorId)) || null;
            return (
              <ReviewForm
                key={`${m.mentorId}-${existing?.id ?? 'new'}`}
                courseId={courseId}
                mentor={m}
                existing={existing}
                busy={busy}
                onRun={onRun}
                onSaved={() => reviewsQuery.refetch()}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
