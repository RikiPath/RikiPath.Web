import { useState } from 'react';
import {
  getCohortMentorReviews,
  submitCohortMentorReview,
  updateCohortMentorReview,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  CustomSelect,
  Field,
  SakuraLoader,
  Textarea,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { COMPLETION_NOTE, reviewableMentors } from '@/features/cohorts/utils/completionHelpers';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const formatDate = (v) => (v ? formatVnDateTime(v, '—') : '—');
const ATTENDANCE = {
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Giáo viên hủy',
  Cancelled: 'Đã hủy',
};

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
              setError(describeApiError(err, tr('Chưa gửi được đánh giá.')));
              throw err;
            }
            onSaved();
          },
          existing?.id ? 'Đã cập nhật đánh giá Giáo viên.' : 'Cảm ơn bạn đã đánh giá Giáo viên.',
        );
      }}
    >
      <h3 className="text-sm font-semibold text-rp-text">
        {existing?.id ? tr('Sửa đánh giá') : tr('Đánh giá')} {tr('Giáo viên')} {mentor.mentorName}
      </h3>
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

export default function CohortCompletionSummary({
  courseId,
  summary,
  error = null,
  onRetry,
  retrying = false,
  busy = false,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const reviewsQuery = useAsyncResource(
    () => getCohortMentorReviews(courseId),
    [courseId],
    { enabled: Boolean(courseId) },
  );
  const reviews = Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [];

  if (error) {
    return (
      <Card className="space-y-3 p-5">
        <h2 className="text-base font-bold text-rp-text">{tr('Tổng kết khóa học')}</h2>
        <ContextualErrorState
          compact
          error={typeof error === 'string' ? { message: error } : error}
          onRetry={onRetry}
          retrying={retrying}
        />
      </Card>
    );
  }
  if (!summary) return null;

  const s = summary.sessions || {};
  const hw = summary.homework || {};
  const reviewable = reviewableMentors(summary);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-rp-text">
          {tr('Tổng kết khóa học')}
          {summary.cohortName ? ` · ${summary.cohortName}` : ''}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {summary.level && (
            <Badge tone="neutral" size="sm">
              {summary.level}
            </Badge>
          )}
          {summary.intensityLabel && (
            <Badge tone="neutral" size="sm">
              {tr(summary.intensityLabel)}
            </Badge>
          )}
          <Badge tone={summary.isCompleted ? 'success' : 'warning'} size="sm">
            {summary.isCompleted ? tr('Đã hoàn thành') : tr('Đang diễn ra')}
          </Badge>
        </div>
      </div>

      <Banner tone="info">{tr(summary.note || COMPLETION_NOTE)}</Banner>

      <div className="space-y-2 text-xs">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Giáo viên phụ trách')}</h3>
        {(summary.mentors || []).length === 0 ? (
          <p className="text-rp-text-muted">{tr('Chưa có dữ liệu Giáo viên.')}</p>
        ) : (
          <ul className="space-y-1 text-rp-text-2">
            {summary.mentors.map((m) => (
              <li key={m.mentorId}>
                <strong className="text-rp-text">{m.mentorName}</strong>
                {m.isPrimary ? tr(' (Giáo viên chính)') : ''}{' '}
                {tr('· Buổi:')}{' '}
                {(m.sessionNumbers || []).join(', ') || '—'}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Buổi học & điểm danh')}</h3>
        <p className="text-rp-text-2">
          {tr('Tổng')}{' '}{s.total ?? 0}{' '}{tr('buổi · Đã diễn ra')}{' '}{s.delivered ?? 0}{' '}
          {tr('· Vắng')}{' '}{s.absent ?? 0}{' '}{tr('· Hủy')}{' '}{s.cancelled ?? 0}{' '}
          {tr('· Sắp tới')}{' '}{s.upcoming ?? 0}
        </p>
        {(summary.attendance || []).length > 0 && (
          <details className="text-rp-text-muted">
            <summary className="cursor-pointer font-medium">
              {trf('Chi tiết điểm danh ({0} buổi)', { 0: summary.attendance.length })}
            </summary>
            <ul className="mt-1.5 space-y-1 pl-4">
              {summary.attendance.map((a) => (
                <li key={a.number}>
                  {tr('Buổi')}{' '}{a.number} · {formatDate(a.scheduledAt)} · {tr(ATTENDANCE[a.status] || a.status)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Bài tập về nhà')}</h3>
        <p className="text-rp-text-2">
          {tr('Được giao')}{' '}{hw.assigned ?? 0}{' '}{tr('· Đã nộp')}{' '}{hw.submitted ?? 0}{' '}
          {tr('· Đã chấm')}{' '}{hw.graded ?? 0}{' '}{tr('· Còn thiếu')}{' '}{hw.outstanding ?? 0}
        </p>
      </div>

      <div className="space-y-2 text-xs">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Nhận xét của Giáo viên')}</h3>
        {(summary.mentorFeedback || []).length === 0 ? (
          <p className="text-rp-text-muted">{tr('Chưa có nhận xét nào được công bố.')}</p>
        ) : (
          <div className="space-y-2">
            {summary.mentorFeedback.map((f, i) => (
              <article className="rounded-xl border border-rp-line bg-rp-bg-2/50 p-3" key={`${f.publishedAtUtc}-${i}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-rp-text">{tr(f.title)}</strong>
                  {f.score != null && (
                    <Badge tone="brand" size="sm">
                      {trf('Điểm {0}', { 0: f.score })}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-rp-text-2">{f.feedback}</p>
                <p className="mt-1 text-[11px] text-rp-text-muted">{formatDate(f.publishedAtUtc)}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {summary.skillProgressAvailable && summary.skillProgress && Array.isArray(summary.skillProgress.skills) && (
        <div className="space-y-2 text-xs">
          <h3 className="text-sm font-semibold text-rp-text">{tr('Tiến bộ kỹ năng')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {summary.skillProgress.skills.map((sk) => (
              <Badge key={sk.skill} tone="neutral" size="sm">
                {tr(sk.skill)}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-rp-line pt-4">
        <h3 className="text-sm font-semibold text-rp-text">{tr('Đánh giá Giáo viên')}</h3>
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
          <p className="text-xs text-rp-text-muted">
            {tr('Bạn có thể đánh giá Giáo viên sau khi đã học ít nhất một buổi do Giáo viên đó trực tiếp dạy.')}
          </p>
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
      </div>
    </Card>
  );
}
