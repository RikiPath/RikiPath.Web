import { useEffect, useState } from 'react';
import {
  getCohortMentorReviews,
  submitCohortMentorReview,
  updateCohortMentorReview,
} from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import { COMPLETION_NOTE, reviewableMentors } from './completionHelpers';

const date = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const ATTENDANCE = {
  Scheduled: 'Chờ học',
  Present: 'Có mặt',
  Absent: 'Vắng',
  ExcusedAbsent: 'Vắng có phép',
  CancelledByMentor: 'Mentor hủy',
  Cancelled: 'Đã hủy',
};

function ReviewForm({ courseId, mentor, existing, busy, onRun, onSaved }) {
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
      <h3>{existing?.id ? 'Sửa đánh giá' : 'Đánh giá'} Mentor {mentor.mentorName}</h3>
      <fieldset disabled={busy}>
        <label className="course-field" style={{ maxWidth: 160 }}>
          <span>Số sao (1–5)</span>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
          </select>
        </label>
        <label className="course-field">
          <span>Nhận xét</span>
          <textarea maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Điều bạn thấy hữu ích hoặc cần cải thiện…" />
        </label>
        <button className="course-primary" type="submit">{existing?.id ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</button>
      </fieldset>
      {error && <p role="alert" className="course-error">{error}</p>}
    </form>
  );
}

export default function CohortCompletionSummary({ courseId, summary, error = '', busy = false, onRun }) {
  const [reviews, setReviews] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!courseId) return undefined;
    let alive = true;
    getCohortMentorReviews(courseId)
      .then((r) => alive && setReviews(r))
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, [courseId, tick]);

  if (error) {
    return (
      <section className="course-box">
        <h2>Tổng kết khóa học</h2>
        <p className="course-meta">{error}</p>
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
        <h2>Tổng kết khóa học{summary.cohortName ? ` · ${summary.cohortName}` : ''}</h2>
        <div>
          {summary.level && <span className="course-badge">{summary.level}</span>}{' '}
          {summary.intensityLabel && <span className="course-badge">{summary.intensityLabel}</span>}{' '}
          <span className={`course-badge ${summary.isCompleted ? 'ok' : 'warn'}`}>{summary.isCompleted ? 'Đã hoàn thành' : 'Đang diễn ra'}</span>
        </div>
      </div>
      <p className="course-notice" role="note">{summary.note || COMPLETION_NOTE}</p>

      <h3>Mentor phụ trách</h3>
      {(summary.mentors || []).length === 0 ? (
        <p className="course-meta">Chưa có dữ liệu Mentor.</p>
      ) : (
        <ul>
          {summary.mentors.map((m) => (
            <li key={m.mentorId} className="course-meta">
              <strong>{m.mentorName}</strong>
              {m.isPrimary ? ' (Mentor chính)' : ''} · Buổi: {(m.sessionNumbers || []).join(', ') || '—'}
            </li>
          ))}
        </ul>
      )}

      <h3>Buổi học & điểm danh</h3>
      <p className="course-meta">
        Tổng {s.total ?? 0} buổi · Đã diễn ra {s.delivered ?? 0} · Vắng {s.absent ?? 0} · Hủy {s.cancelled ?? 0} · Sắp tới {s.upcoming ?? 0}
      </p>
      {(summary.attendance || []).length > 0 && (
        <details>
          <summary>Chi tiết điểm danh ({summary.attendance.length} buổi)</summary>
          <ul>
            {summary.attendance.map((a) => (
              <li key={a.number} className="course-meta">Buổi {a.number} · {date(a.scheduledAt)} · {ATTENDANCE[a.status] || a.status}</li>
            ))}
          </ul>
        </details>
      )}

      <h3>Bài tập về nhà</h3>
      <p className="course-meta">
        Được giao {hw.assigned ?? 0} · Đã nộp {hw.submitted ?? 0} · Đã chấm {hw.graded ?? 0} · Còn thiếu {hw.outstanding ?? 0}
      </p>

      <h3>Nhận xét của Mentor</h3>
      {(summary.mentorFeedback || []).length === 0 ? (
        <p className="course-meta">Chưa có nhận xét nào được công bố.</p>
      ) : (
        summary.mentorFeedback.map((f, i) => (
          <article className="course-row" key={`${f.publishedAtUtc}-${i}`}>
            <strong>{f.title}</strong>
            {f.score != null ? <span className="course-badge" style={{ marginLeft: 6 }}>Điểm {f.score}</span> : null}
            <p className="course-pre">{f.feedback}</p>
            <p className="course-meta">{date(f.publishedAtUtc)}</p>
          </article>
        ))
      )}

      {summary.skillProgressAvailable && summary.skillProgress && Array.isArray(summary.skillProgress.skills) && (
        <>
          <h3>Tiến bộ kỹ năng</h3>
          <div className="course-buttons">
            {summary.skillProgress.skills.map((sk) => (
              <span className="course-badge" key={sk.skill}>
                {sk.skill}: {sk.averageScorePercent != null ? `${sk.averageScorePercent}%` : 'Chưa có mẫu'}
              </span>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginTop: 12 }}>Đánh giá Mentor</h3>
      {reviewable.length === 0 ? (
        <p className="course-meta">Bạn có thể đánh giá Mentor sau khi đã học ít nhất một buổi do Mentor đó trực tiếp dạy.</p>
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
              onSaved={() => setTick((t) => t + 1)}
            />
          );
        })
      )}
    </section>
  );
}
