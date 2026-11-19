import { useState } from 'react';
import {
  getCohortMentorReviews,
  submitCohortMentorReview,
  updateCohortMentorReview,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { COMPLETION_NOTE, reviewableMentors } from '@/features/cohorts/utils/completionHelpers';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const ATTENDANCE = {
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Mentor hủy',
  Cancelled: 'Đã hủy',
};

function ReviewForm({ courseId, mentor, existing, busy, onRun, onSaved }) {
  const { tr } = useLocale();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [error, setError] = useState('');
  return (
    <form
      className="course-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        onRun(async () => {
          try {
            if (existing?.id) await updateCohortMentorReview(courseId, existing.id, { rating, comment });
            else await submitCohortMentorReview(courseId, { mentorId: mentor.mentorId, rating, comment });
          } catch (err) {
            setError(describeApiError(err).message);
            throw err;
          }
          onSaved();
        }, existing?.id ? 'Đã cập nhật đánh giá Mentor.' : 'Cảm ơn bạn đã đánh giá Mentor.');
      }}
    >
      <h3>{existing?.id ? tr('Sửa đánh giá') : tr('Đánh giá')} Mentor {mentor.mentorName}</h3>
      <fieldset disabled={busy}>
        <label className="course-field" style={{ maxWidth: 160 }}>
          <span>{tr('Số sao (1–5)')}</span>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>{tr('Nhận xét')}</span>
          <textarea maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tr('Điều bạn thấy hữu ích hoặc cần cải thiện…')} />
        </label>
        <button className="course-primary" type="submit">{existing?.id ? tr('Cập nhật đánh giá') : tr('Gửi đánh giá')}</button>
      </fieldset>
      {error && <p role="alert" className="course-error">{error}</p>}
    </form>
  );
}

export default function CohortCompletionSummary({ courseId, summary, error = '', busy = false, onRun }) {
  const { tr, trf } = useLocale();
  const reviewsQuery = useAsyncResource(
    () => getCohortMentorReviews(courseId),
    [courseId],
    { enabled: Boolean(courseId) },
  );
  const reviews = Array.isArray(reviewsQuery.data) ? reviewsQuery.data : [];

  if (error) {
    return (
      <section className="course-box">
        <h2>{tr('Tổng kết khóa học')}</h2>
        <ContextualErrorState compact error={typeof error === 'string' ? { message: error } : error} />
      </section>
    );
  }
  if (!summary) return null;

  const s = summary.sessions || {};
  const hw = summary.homework || {};
  const reviewable = reviewableMentors(summary);

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>{tr('Tổng kết khóa học')}{summary.cohortName ? ` · ${summary.cohortName}` : ''}</h2>
        <div>
          {summary.level && <span className="course-badge">{summary.level}</span>}{' '}
          {summary.intensityLabel && <span className="course-badge">{summary.intensityLabel}</span>}{' '}
          <span className={`course-badge ${summary.isCompleted ? 'ok' : 'warn'}`}>{summary.isCompleted ? tr('Đã hoàn thành') : tr('Đang diễn ra')}</span>
        </div>
      </div>
      <p className="course-notice" role="note">{summary.note || COMPLETION_NOTE}</p>

      <h3>{tr('Mentor phụ trách')}</h3>
      {(summary.mentors || []).length === 0 ? (
        <p className="course-meta">{tr('Chưa có dữ liệu Mentor.')}</p>
      ) : (
        <ul>
          {summary.mentors.map((m) => (
            <li key={m.mentorId} className="course-meta">
              <strong>{m.mentorName}</strong>
              {m.isPrimary ? tr(' (Mentor chính)') : ''}{' '}{tr('· Buổi:')}{' '}{(m.sessionNumbers || []).join(', ') || '—'}
            </li>
          ))}
        </ul>
      )}

      <h3>{tr('Buổi học & điểm danh')}</h3>
      <p className="course-meta">
        {tr('Tổng')}{' '}{s.total ?? 0}{' '}{tr('buổi · Đã diễn ra')}{' '}{s.delivered ?? 0}{' '}{tr('· Vắng')}{' '}{s.absent ?? 0}{' '}{tr('· Hủy')}{' '}{s.cancelled ?? 0}{' '}{tr('· Sắp tới')}{' '}{s.upcoming ?? 0}
      </p>
      {(summary.attendance || []).length > 0 && (
        <details>
          <summary>{trf('Chi tiết điểm danh ({0} buổi)', { 0: summary.attendance.length })}</summary>
          <ul>
            {summary.attendance.map((a) => (
              <li key={a.number} className="course-meta">{tr('Buổi')}{' '}{a.number} · {date(a.scheduledAt)} · {ATTENDANCE[a.status] || a.status}</li>
            ))}
          </ul>
        </details>
      )}

      <h3>{tr('Bài tập về nhà')}</h3>
      <p className="course-meta">
        {tr('Được giao')}{' '}{hw.assigned ?? 0}{' '}{tr('· Đã nộp')}{' '}{hw.submitted ?? 0}{' '}{tr('· Đã chấm')}{' '}{hw.graded ?? 0}{' '}{tr('· Còn thiếu')}{' '}{hw.outstanding ?? 0}
      </p>

      <h3>{tr('Nhận xét của Mentor')}</h3>
      {(summary.mentorFeedback || []).length === 0 ? (
        <p className="course-meta">{tr('Chưa có nhận xét nào được công bố.')}</p>
      ) : (
        summary.mentorFeedback.map((f, i) => (
          <article className="course-row" key={`${f.publishedAtUtc}-${i}`}>
            <strong>{tr(f.title)}</strong>
            {f.score != null ? <span className="course-badge" style={{ marginLeft: 6 }}>{trf('Điểm {0}', { 0: f.score })}</span> : null}
            <p className="course-pre">{f.feedback}</p>
            <p className="course-meta">{date(f.publishedAtUtc)}</p>
          </article>
        ))
      )}

      {summary.skillProgressAvailable && summary.skillProgress && Array.isArray(summary.skillProgress.skills) && (
        <>
          <h3>{tr('Tiến bộ kỹ năng')}</h3>
          <div className="course-buttons">
            {summary.skillProgress.skills.map((sk) => (
              <span className="course-badge" key={sk.skill}>
                {sk.skill}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : tr('Chưa có mẫu')}
              </span>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginTop: 12 }}>{tr('Đánh giá Mentor')}</h3>
      {reviewsQuery.isPending ? (
        <SakuraLoader variant="section" size={28} context="cohort" className="min-h-[80px] py-2" delay={160} />
      ) : reviewsQuery.isError ? (
        <ContextualErrorState
          variant="inline"
          error={reviewsQuery.error}
          title={tr('Chưa tải được đánh giá Mentor đã gửi')}
          onRetry={reviewsQuery.refetch}
          retrying={reviewsQuery.isFetching}
        />
      ) : reviewable.length === 0 ? (
        <p className="course-meta">{tr('Bạn có thể đánh giá Mentor sau khi đã học ít nhất một buổi do Mentor đó trực tiếp dạy.')}</p>
      ) : (
        reviewable.map((m) => {
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
        })
      )}
    </section>
  );
}
