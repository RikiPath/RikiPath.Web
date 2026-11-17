import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ExamSkillRadar from '../../components/ExamSkillRadar.jsx';
import { summarizeSkills } from '../../utils/examSkillScores.js';
import {
  answerHomeworkDispute, closeHomeworkDispute, createHomeworkDispute, draftHomeworkGrades, evaluateHomeworkBooking,
  getHomeworkDisputes, getMentorPracticeProgress, loadHomeworkAudio, loadHomeworkScan, publishHomeworkGrade, recordMentorPractice,
  saveHomeworkMentorReview, saveMentorReviewPlan,
} from '../../api/homeworkApi.js';

const card = 'space-y-3 rounded-xl border border-card-border bg-white p-4';
const field = 'block w-full rounded-lg border border-card-border bg-white p-2 text-sm';
const button = 'rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
const outline = 'rounded-lg border border-card-border px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50';
const muted = 'text-sm text-[#765E6B]';
const format = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const utc = value => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z';
const date = value => value ? format.format(new Date(utc(value))) : '';
const toPicker = value => value ? new Date(Date.parse(utc(value)) + 7 * 3_600_000).toISOString().slice(0, 16) : '';
const decisions = {
  Passed: 'Đạt bài thi thử cuối kỳ', ReviewEligible: 'Chưa đạt bài thi thử · Đủ điều kiện kèm lại',
  HomeworkIncomplete: 'Chưa đạt bài thi thử · Tỷ lệ nộp bài chưa vượt 90%',
  NoHomework: 'Chưa đạt bài thi thử · Chưa có bài tập để xét kèm lại',
};
const disputeStatuses = { Submitted: 'Đã gửi', UnderReview: 'Đang xem xét', AwaitingResponse: 'Chờ phản hồi',
  Resolved: 'Đã xử lý', Rejected: 'Đã từ chối', Closed: 'Đã đóng' };

function ErrorLine({ error }) {
  return error ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error.message}</p> : null;
}

function Field({ label, children }) {
  return <label className="block space-y-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}

function SaveForm({ label, save, onSaved, children, reset = false }) {
  const action = useMutation({ mutationFn: save, onSuccess: onSaved });
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    action.mutate(new FormData(form), { onSuccess: () => { if (reset) form.reset(); } });
  }
  return <form className="space-y-2" onSubmit={submit}>
    <fieldset className="space-y-2" disabled={action.isPending}>{children}</fieldset>
    <ErrorLine error={action.error} />
    <button className={button} disabled={action.isPending}>{action.isPending ? 'Đang lưu…' : label}</button>
  </form>;
}

export function HomeworkScan({ id, audio = false }) {
  const [url, setUrl] = useState(null);
  const file = useMutation({
    mutationFn: () => audio ? loadHomeworkAudio(id) : loadHomeworkScan(id),
    onSuccess: blob => setUrl(URL.createObjectURL(blob)),
  });
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <>
    <button type="button" disabled={file.isPending} className={outline} onClick={() => file.mutate()}>
      {file.isPending ? 'Đang tải…' : audio ? 'Mở bản thu âm' : 'Mở ảnh bài nộp'}
    </button>
    <ErrorLine error={file.error} />
    {url && (audio
      ? <audio src={url} controls className="w-full max-w-lg" aria-label="Bản thu âm bài nói" />
      : <img src={url} className="max-h-96 rounded-lg object-contain" alt="Ảnh bài làm viết tay" />)}
  </>;
}

export function HomeworkCorrectionList({ corrections }) {
  if (!corrections?.length) return null;
  return <div className="space-y-2">
    <h4 className="font-semibold">Lỗi và cách sửa</h4>
    <ol className="space-y-2">
      {corrections.map((item, index) => <li key={index} className="space-y-2 rounded-lg border border-card-border bg-white p-3 text-sm">
        <h5 className="font-semibold">{index + 1}. {item.category}</h5>
        {item.location && <p className={muted + ' break-words'}>{item.location}</p>}
        <dl className="space-y-2 whitespace-pre-wrap break-words">
          <div><dt className="font-semibold">Bài làm của học viên</dt><dd>{item.original}</dd></div>
          <div><dt className="font-semibold">Vì sao sai</dt><dd>{item.reason}</dd></div>
          <div><dt className="font-semibold">Cách sửa hoặc đáp án đúng</dt><dd>{item.correction}</dd></div>
        </dl>
      </li>)}
    </ol>
  </div>;
}

export function HomeworkBatchGrading({ items, onDrafts }) {
  const [learnerId, setLearnerId] = useState(null);
  const [assignmentIds, setAssignmentIds] = useState([]);
  const [mentorPrompt, setMentorPrompt] = useState('');
  const [jlptLevel, setJlptLevel] = useState('');
  const submitted = items.filter(item => item.submission);
  const learners = Array.from(new Map(submitted.map(item => [item.learnerId, item])).values());
  const activeLearner = learners.find(item => item.learnerId === learnerId) ?? learners[0];
  const candidates = submitted.filter(item => item.learnerId === activeLearner?.learnerId);
  const selected = assignmentIds.filter(id => candidates.some(item => item.id === id));
  const draft = useMutation({ mutationFn: draftHomeworkGrades, onSuccess: onDrafts });
  if (submitted.length === 0) return null;

  function toggle(id) {
    setAssignmentIds(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  }

  return <section className={card}>
    <h3 className="text-lg font-semibold">AI chấm bài tập</h3>
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      draft.mutate({ assignmentIds: selected, mentorPrompt: mentorPrompt.trim(), jlptLevel: jlptLevel || null });
    }}>
      <fieldset disabled={draft.isPending} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Học viên">
            <select className={field} value={activeLearner?.learnerId ?? ''} onChange={event => {
              setLearnerId(Number(event.target.value));
              setAssignmentIds([]);
              draft.reset();
            }}>
              {learners.map(item => <option key={item.learnerId} value={item.learnerId}>{item.learnerName}</option>)}
            </select>
          </Field>
          <Field label="Cấp JLPT của phần viết hoặc nói">
            <select className={field} value={jlptLevel} onChange={event => setJlptLevel(event.target.value)}>
              <option value="">Tự lấy từ bài được giao</option>
              {['N5', 'N4', 'N3', 'N2'].map(level => <option key={level}>{level}</option>)}
            </select>
          </Field>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Bài đã nộp ({selected.length}/4 bài mỗi lần)</legend>
          <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-card-border p-2">
            {candidates.map(item => <label key={item.id} className="flex items-start gap-2 p-1 text-sm">
              <input className="mt-1 accent-primary" type="checkbox" checked={selected.includes(item.id)}
                disabled={selected.length >= 4 && !selected.includes(item.id)} onChange={() => toggle(item.id)} />
              <span>{item.title}{item.jlptLevel && ` · ${item.jlptLevel}`}</span>
            </label>)}
          </div>
        </fieldset>
        <Field label="Yêu cầu AI chấm và nhận xét">
          <textarea className={field} rows={4} maxLength={1200} required value={mentorPrompt}
            placeholder="Ví dụ: Ưu tiên lỗi trợ từ. Giải thích bằng tiếng Việt và cho mỗi lỗi một ví dụ tiếng Nhật."
            onChange={event => setMentorPrompt(event.target.value)} />
        </Field>
        <p className={muted}>{mentorPrompt.length}/1.200 ký tự</p>
      </fieldset>
      <button className={button} disabled={draft.isPending || !selected.length || !mentorPrompt.trim()}>
        {draft.isPending ? 'AI đang chấm…' : `Tạo bản nháp cho ${selected.length} bài`}
      </button>
    </form>
    <ErrorLine error={draft.error} />
    {draft.data?.length > 0 && <ul className="space-y-1 text-sm" aria-live="polite">
      {draft.data.map(item => <li key={item.assignmentId} className={item.draft ? 'text-emerald-800' : 'text-rose-800'}>
        {items.find(value => value.id === item.assignmentId)?.title ?? '#' + item.assignmentId}
        {' · '}{item.draft ? 'Có bản nháp trong bài đã giao' : item.errorMessage}
      </li>)}
    </ul>}
  </section>;
}

export function HomeworkGrading({ id, submission, refresh, draft }) {
  const [score, setScore] = useState(draft?.score ?? submission.grade?.score ?? '');
  const [feedback, setFeedback] = useState(draft?.feedback ?? submission.grade?.feedback ?? '');
  const [corrections, setCorrections] = useState(draft?.corrections ?? submission.grade?.corrections ?? []);
  function editCorrection(index, fieldName, value) {
    setCorrections(items => items.map((item, position) => position === index ? { ...item, [fieldName]: value } : item));
  }

  return <section className={card}>
    <h3 className="font-semibold">Chấm bài nộp</h3>
    {draft?.transcription && <details>
      <summary className={muted + ' cursor-pointer'}>{submission.hasAudio ? 'Đối chiếu bản chép lời với bản thu' : 'Đối chiếu phần chữ AI đọc từ ảnh'}</summary>
      <p className="whitespace-pre-wrap break-words text-sm">{draft.transcription}</p>
    </details>}
    {draft && <p role="status" className={muted}>
      {draft.gradingLevels?.length > 0 && `AI đã chấm theo ${draft.gradingLevels.join(', ')}. `}
      Hãy đối chiếu bản nháp với bài nộp trước khi gửi.
    </p>}
    {draft?.hasUnlistedQuizErrors && <p className={muted}>Một số câu trắc nghiệm sai chưa có giải thích trong bản nháp. Mentor có thể bổ sung bên dưới.</p>}
    <SaveForm label="Gửi điểm và nhận xét cho học viên" save={() => publishHomeworkGrade(id, {
      submissionId: submission.id, score: Number(score), feedback, corrections,
    })} onSaved={refresh}>
      <Field label="Điểm trên 100"><input type="number" min="0" max="100" step="0.01" className={field} required
        value={score} onChange={event => setScore(event.target.value)} /></Field>
      <Field label="Nhận xét"><textarea className={field} rows={4} maxLength={2000} required
        value={feedback} onChange={event => setFeedback(event.target.value)} /></Field>
      <div className="space-y-3">
        {corrections.map((item, index) => <section key={index} className="space-y-2 rounded-lg border border-card-border bg-primary-light p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">Lỗi {index + 1}</h4>
            <button type="button" className={outline} onClick={() => setCorrections(items => items.filter((_, position) => position !== index))}>Bỏ lỗi này</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Loại lỗi"><input type="text" className={field} maxLength={80} required
              value={item.category} onChange={event => editCorrection(index, 'category', event.target.value)} /></Field>
            <Field label="Vị trí hoặc câu hỏi"><input type="text" className={field} maxLength={300}
              value={item.location ?? ''} onChange={event => editCorrection(index, 'location', event.target.value)} /></Field>
          </div>
          {[
            ['original', 'Bài làm của học viên', 800],
            ['reason', 'Vì sao sai', 1200],
            ['correction', 'Cách sửa hoặc đáp án đúng', 800],
          ].map(([name, label, length]) => <Field key={name} label={label}>
            <textarea className={field} rows={2} maxLength={length} required value={item[name]}
              onChange={event => editCorrection(index, name, event.target.value)} />
          </Field>)}
        </section>)}
        <button type="button" className={outline} disabled={corrections.length >= 20} onClick={() => setCorrections(items => [
          ...items, { category: '', original: '', reason: '', correction: '', location: '' },
        ])}>Thêm lỗi</button>
      </div>
    </SaveForm>
  </section>;
}

function ReviewPlan({ bookingId, progress, refresh }) {
  return <div className="space-y-2 rounded-lg bg-primary-light p-3">
    <h4 className="font-semibold">Kèm lại với mentor</h4>
    {progress.mentorReviewPlan ? <p className="whitespace-pre-wrap text-sm">{progress.mentorReviewPlan}</p>
      : <p className={muted}>Đang chờ mentor lập kế hoạch.</p>}
    {progress.mentorReviewSessionAt && <p className={muted}>Lịch kèm dự kiến {date(progress.mentorReviewSessionAt)}</p>}
    {progress.mentorReviewCompletedAt && <p className={muted}>Đã kèm lại · {date(progress.mentorReviewCompletedAt)}</p>}
    {progress.canPlanReview && !progress.mentorReviewCompletedAt && <>
      <SaveForm label="Gửi kế hoạch kèm lại" onSaved={refresh} save={form => {
        const at = form.get('at');
        return saveMentorReviewPlan(bookingId, { plan: form.get('plan'), sessionAt: at ? new Date(at + ':00+07:00').toISOString() : null });
      }}>
        <Field label="Kế hoạch ôn"><textarea name="plan" className={field} required maxLength={6000} rows={3} defaultValue={progress.mentorReviewPlan ?? ''} /></Field>
        <Field label="Giờ kèm dự kiến (giờ Việt Nam)"><input name="at" type="datetime-local" className={field} defaultValue={toPicker(progress.mentorReviewSessionAt)} /></Field>
      </SaveForm>
      {progress.mentorReviewPlan && <SaveForm label="Xác nhận đã kèm lại" onSaved={refresh}
        save={() => saveMentorReviewPlan(bookingId, { plan: progress.mentorReviewPlan, completed: true })} />}
    </>}
  </div>;
}

function PracticeProgress({ booking, userId, role, refresh }) {
  const id = booking.bookingId;
  const query = useQuery({ queryKey: ['homework', userId, 'progress', id], queryFn: () => getMentorPracticeProgress(id), retry: false });
  if (query.isPending) return <p role="status" className={muted}>Đang tải tiến độ gói ôn luyện…</p>;
  if (query.isError) return <ErrorLine error={query.error} />;
  const progress = query.data;
  const { baseline, outcome, waitingReason, level, attempts, passPercent } = progress;
  const series = [baseline && { label: 'Trước khi ôn', scores: summarizeSkills(baseline.sections) },
    outcome && { label: 'Cuối kỳ', scores: summarizeSkills(outcome.after.sections) }].filter(Boolean);

  return <section className={card}>
    <h3 className="text-lg font-semibold">Tiến độ gói ôn luyện và thi thử cuối kỳ</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      <p className="rounded-lg bg-primary-light p-2 text-sm"><strong>{progress.submittedCount}/{progress.assignedCount}</strong> bài đã nộp
        {progress.assignedCount > 0 && ` · ${percent.format(100 * progress.submittedCount / progress.assignedCount)}%`}</p>
      <p className="rounded-lg bg-primary-light p-2 text-sm"><strong>{progress.attendedSessions}/{progress.trackedSessions}</strong> buổi có tham gia
        {progress.trackedSessions > 0 && ` · ${percent.format(100 * progress.attendedSessions / progress.trackedSessions)}%`}</p>
    </div>
    {baseline ? <p className={muted}>Mốc trước khi ôn · {baseline.kind === 'Placement' ? 'Đánh giá năng lực' : 'Thi thử'} · {date(baseline.submittedAt)}</p>
      : <p className={muted}>Chưa có kết quả cùng cấp được nộp trước buổi ôn đầu.</p>}
    {series.length > 0 && <ExamSkillRadar series={series} compare={series.length === 2} />}
    {!outcome && <>
      {waitingReason && <p className={muted}>{waitingReason}</p>}
      {role === 'learner' && level && (!waitingReason || (!baseline && Date.parse(utc(booking.startsAt)) > query.dataUpdatedAt)) &&
        <Link className="text-sm font-semibold text-primary underline" to={`/mock-tests/?level=${encodeURIComponent(level)}`}>
          {waitingReason ? 'Làm thi thử trước khi ôn' : 'Làm thi thử cuối kỳ'} {level}</Link>}
      {role === 'learner' && attempts?.length > 0 && <SaveForm label="Chốt lượt thi thử đã chọn" onSaved={refresh}
        save={form => recordMentorPractice(id, Number(form.get('attempt')))}>
        <Field label="Lượt thi sau buổi ôn cuối"><select name="attempt" className={field} required>{attempts.map(item =>
          <option key={item.attemptId} value={item.attemptId}>#{item.attemptId} · {date(item.submittedAt)} · {percent.format(item.totalScore)}%</option>)}</select></Field>
      </SaveForm>}
      <p className={muted}>Ngưỡng đạt thi thử nội bộ {passPercent}%. Kèm lại khi chưa đạt và đã nộp hơn 90% bài đã giao.</p>
    </>}
    {outcome && <>
      <p className="font-semibold">{decisions[outcome.decision]}</p>
      <p className={muted}>Thi thử cuối kỳ {percent.format(outcome.after.percent)}% · {outcome.submittedCount}/{outcome.assignedCount} bài đã nộp tại lúc chốt.</p>
      {outcome.decision === 'ReviewEligible' && <ReviewPlan bookingId={id} progress={progress} refresh={refresh} />}
    </>}
  </section>;
}

function BookingDisputes({ booking, userId, role, refresh }) {
  const id = booking.bookingId;
  const disputes = useQuery({ queryKey: ['homework', userId, 'disputes', role, id], queryFn: () => getHomeworkDisputes(role, id), retry: false });
  const items = disputes.data?.filter(item => item.mentorBookingId === id) ?? [];
  const closed = item => ['Resolved', 'Rejected', 'Closed', 4, 5, 6].includes(item.status);
  return <div className="space-y-2">
    <ErrorLine error={disputes.error} />
    {role === 'learner' && ['Assigned', 'Accepted', 'Completed', 'Cancelled'].includes(booking.status) && !items.some(item => !closed(item)) &&
      <details className="space-y-2"><summary className="cursor-pointer text-sm font-semibold text-primary">Gửi khiếu nại</summary>
        <SaveForm label="Gửi khiếu nại cho admin" onSaved={refresh} reset save={form => createHomeworkDispute(id, form.get('reason'))}>
          <Field label="Lý do và bài tập liên quan"><textarea name="reason" className={field} rows={3} maxLength={2000} required /></Field>
        </SaveForm>
      </details>}
    {items.map(item => <div key={item.id} className="space-y-2 rounded-lg border border-card-border p-3">
      <p className="font-semibold text-sm">Khiếu nại #{item.id} · {disputeStatuses[item.status] ?? item.status}</p>
      <p className="whitespace-pre-wrap text-sm">{item.reason}</p>
      {item.mentorResponse && <p className={muted}>Mentor · {item.mentorResponse}</p>}
      {item.adminNotes && <p className={muted}>Admin · {item.adminNotes}</p>}
      {role === 'mentor' && !closed(item) && <SaveForm label="Phản hồi khiếu nại" onSaved={refresh}
        save={form => answerHomeworkDispute(item.id, form.get('reply'))}>
        <Field label="Giải trình của mentor"><textarea name="reply" className={field} required rows={3} maxLength={2000} /></Field>
      </SaveForm>}
      {role === 'admin' && !closed(item) && <SaveForm label="Chốt xử lý khiếu nại" onSaved={refresh} save={form => closeHomeworkDispute(item.id, {
        approveRefund: false, adminDecision: form.get('decision'), adminNotes: form.get('reply'),
      })}>
        <Field label="Quyết định"><select name="decision" className={field}><option value="WarningIssued">Ghi nhận vấn đề và nhắc mentor</option><option value="DisputeRejected">Bác khiếu nại</option></select></Field>
        <Field label="Kết luận"><textarea name="reply" className={field} required rows={3} maxLength={2000} /></Field>
      </SaveForm>}
    </div>)}
  </div>;
}

export function BookingHomeworkPanel({ booking, userId, role, refresh }) {
  const ended = booking.hasEnded && ['Assigned', 'Accepted', 'Completed'].includes(booking.status);
  return <>
    <section className={card}>
      <h3 className="text-lg font-semibold">Buổi ôn luyện · {date(booking.startsAt)}</h3>
      <p className={muted}>{booking.learnerName} · Mentor {booking.mentorName}{booking.wasRescheduled && ' · Đã chuyển lịch'}</p>
      {booking.cancellationReason && <p className={muted}>{booking.cancellationReason}</p>}
      {booking.practiceFeedback && <p className="whitespace-pre-wrap text-sm"><strong>{booking.practiceScore}/100</strong> · {booking.practiceFeedback}</p>}
      {role === 'mentor' && ended && <SaveForm label="Gửi đánh giá buổi học" onSaved={refresh} save={form => evaluateHomeworkBooking(booking.bookingId, {
        score: Number(form.get('score')), feedback: form.get('feedback'),
      })}>
        <Field label="Điểm buổi học"><input name="score" type="number" className={field} min="0" max="100" required defaultValue={booking.practiceScore ?? ''} /></Field>
        <Field label="Nhận xét của mentor"><textarea name="feedback" className={field} maxLength={2000} rows={3} required defaultValue={booking.practiceFeedback ?? ''} /></Field>
      </SaveForm>}
      {booking.review && <p className="whitespace-pre-wrap text-sm">Học viên đánh giá <strong>{booking.review.rating}/5 sao</strong> · {booking.review.comment}</p>}
      {role === 'learner' && (ended || booking.review) && <details className="space-y-2"><summary className="cursor-pointer text-sm font-semibold text-primary">Đánh giá mentor</summary>
        <SaveForm label="Lưu đánh giá mentor" onSaved={refresh} save={form => saveHomeworkMentorReview(booking, {
          rating: Number(form.get('rating')), comment: form.get('comment'),
        })}>
          <Field label="Số sao"><select name="rating" className={field} defaultValue={booking.review?.rating ?? 5}>
            {[5, 4, 3, 2, 1].map(stars => <option key={stars}>{stars}</option>)}</select></Field>
          <Field label="Nhận xét"><textarea name="comment" className={field} rows={3} maxLength={1000} defaultValue={booking.review?.comment ?? ''} /></Field>
        </SaveForm>
      </details>}
      <BookingDisputes booking={booking} userId={userId} role={role} refresh={refresh} />
    </section>
    <PracticeProgress booking={booking} userId={userId} role={role} refresh={refresh} />
  </>;
}
