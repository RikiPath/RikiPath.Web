import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ConsultShell, LearnerShell } from '../../components/shells';
import PracticeQuestionFields from '../../components/PracticeQuestionFields.jsx';
import LessonStudyMaterial from '../../components/LessonStudyMaterial.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  createHomework, getHomework, getHomeworkCatalog, getHomeworkLearners, getHomeworkLesson, getHomeworkReport,
  startHomeworkExercise, submitHomework, submitHomeworkExercise,
} from '../../api/homeworkApi.js';

const card = 'rounded-2xl border border-card-border bg-white p-4 sm:p-5';
const field = 'w-full rounded-xl border border-card-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none';
const button = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50';
const outline = 'rounded-xl border border-card-border px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-50';
const muted = 'text-sm text-[#765E6B]';
const skillNames = {
  Vocabulary: 'Từ vựng', Grammar: 'Ngữ pháp', Kanji: 'Hán tự', Reading: 'Đọc hiểu',
  Listening: 'Nghe hiểu', Writing: 'Luyện viết', Speaking: 'Luyện nói',
};
const levels = ['N5', 'N4', 'N3', 'N2'];
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});
const localDateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
});
const percentage = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const asUtc = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z');

function dateLabel(value) {
  return value ? localDateTime.format(asUtc(value)) : '';
}

function ErrorMessage({ error, retry }) {
  if (!error) return null;
  return <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
    {error.message}
    {retry && <button className="ml-2 underline" type="button" onClick={retry}>Thử lại</button>}
  </div>;
}

function PeriodReport({ mentor, learners, userId }) {
  const today = localDate.format(new Date());
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [learner, setLearner] = useState('');
  const [range, setRange] = useState(() => mentor ? null : { from: today.slice(0, 7) + '-01', to: today });
  const learnerId = learner || learners?.[0]?.learnerId || '';
  const report = useQuery({
    queryKey: ['homework', userId, 'report', range],
    queryFn: () => getHomeworkReport(range),
    enabled: Boolean(range),
    retry: false,
  });

  return <section className={card + ' space-y-4'}>
    <h2 className="text-lg font-semibold">Báo cáo cuối kỳ</h2>
    <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end" onSubmit={event => {
      event.preventDefault();
      const next = { from, to, ...(mentor ? { learnerId: Number(learnerId) } : {}) };
      if (range?.from === next.from && range?.to === next.to && range?.learnerId === next.learnerId) report.refetch();
      else setRange(next);
    }}>
      {mentor && <label className="block text-sm font-medium lg:flex-1">Người học
        <select required className={field + ' mt-1'} value={learnerId} onChange={event => {
          setLearner(event.target.value);
          setRange(null);
        }}>
          {learners.length === 0 && <option value="">Chưa có người học</option>}
          {learners.map(item => <option key={item.learnerId} value={item.learnerId}>{item.learnerName}</option>)}
        </select>
      </label>}
      <label className="block text-sm font-medium">Từ ngày
        <input required type="date" max={to || undefined} className={field + ' mt-1'} value={from}
          onChange={event => setFrom(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">Đến ngày
        <input required type="date" min={from || undefined} className={field + ' mt-1'} value={to}
          onChange={event => setTo(event.target.value)} />
      </label>
      <button className={button} disabled={report.isFetching || (mentor && !learnerId)}>Xem báo cáo</button>
    </form>
    {range && report.isFetching && <p role="status" className={muted}>Đang tải báo cáo…</p>}
    <ErrorMessage error={report.error} retry={report.refetch} />
    {report.data && <div className="grid gap-3 sm:grid-cols-2">
      {[
        ['Bài tập đã nộp', report.data.submittedCount, report.data.assignedCount, report.data.homeworkPercent, 'bài'],
        ['Buổi ôn luyện đã tham gia', report.data.attendedCount, report.data.sessionCount, report.data.attendancePercent, 'buổi'],
      ].map(([label, done, total, percent, unit]) => <div key={label} className="rounded-xl bg-primary-light p-3">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xl font-bold text-primary">{percent == null ? '—' : percentage.format(percent) + '%'}</p>
        <p className={muted}>{done}/{total} {unit}</p>
      </div>)}
    </div>}
    <p className={muted}>Bài tập được tính theo ngày giao và hạn chốt báo cáo. Điểm danh ghi nhận khi mentor và người học cùng vào phòng. Tỷ lệ chỉ tính các buổi đã kết thúc có hỗ trợ điểm danh.</p>
    {report.data?.untrackedSessionCount > 0 && <p className={muted}>{report.data.untrackedSessionCount} buổi diễn ra trước khi có điểm danh.</p>}
  </section>;
}

function AssignForm({ learners, userId, onCreated }) {
  const [bookingId, setBookingId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [level, setLevel] = useState('N5');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ level: 'N5', search: '', page: 1 });
  const [selected, setSelected] = useState({});
  const catalog = useQuery({
    queryKey: ['homework', userId, 'catalog', filter],
    queryFn: () => getHomeworkCatalog(filter),
    retry: false,
  });
  const save = useMutation({
    mutationFn: () => createHomework({
      bookingId: Number(bookingId), title: title.trim(), instructions: instructions.trim() || null,
      dueAt: dueAt ? dueAt + ':00+07:00' : null,
      lessonIds: Object.values(selected).map(item => item.lesson.id),
      practiceExerciseIds: Object.values(selected).flatMap(item => item.exercises.map(exercise => exercise.id)),
    }),
    onSuccess: async () => {
      setTitle('');
      setInstructions('');
      setDueAt('');
      setSelected({});
      await onCreated();
    },
  });

  function toggleLesson(lesson) {
    setSelected(previous => {
      const next = { ...previous };
      if (next[lesson.id]) delete next[lesson.id];
      else next[lesson.id] = { lesson, exercises: [] };
      return next;
    });
  }

  function toggleExercise(lesson, exercise) {
    setSelected(previous => {
      const exercises = previous[lesson.id]?.exercises ?? [];
      const next = exercises.some(item => item.id === exercise.id)
        ? exercises.filter(item => item.id !== exercise.id)
        : [...exercises, exercise];
      return { ...previous, [lesson.id]: { lesson, exercises: next } };
    });
  }

  return <section className={card + ' space-y-4'}>
    <h2 className="text-lg font-semibold">Giao bài tập</h2>
    {learners.length === 0 ? <p className={muted}>Bạn cần có lịch ôn luyện đã xác nhận với người học để giao bài.</p> : <>
      <form id="assign-homework" className="space-y-3" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Người học
            <select required className={field + ' mt-1'} value={bookingId} onChange={event => setBookingId(event.target.value)}>
              <option value="">Chọn người học</option>
              {learners.map(item => <option key={item.bookingId} value={item.bookingId}>
                {item.learnerName} · {dateLabel(item.sessionAt)}
              </option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Hạn nộp (giờ Việt Nam)
            <input type="datetime-local" className={field + ' mt-1'} value={dueAt} onChange={event => setDueAt(event.target.value)} />
          </label>
        </div>
        <label className="block text-sm font-medium">Tiêu đề
          <input required maxLength={300} className={field + ' mt-1'} value={title} onChange={event => setTitle(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Yêu cầu làm bài
          <textarea rows={4} maxLength={10000} className={field + ' mt-1'} value={instructions}
            onChange={event => setInstructions(event.target.value)} />
        </label>
      </form>
      <div className="space-y-3 rounded-xl border border-card-border p-3">
        <h3 className="font-semibold">Đính kèm bài học và bài luyện tập</h3>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault();
          setFilter({ level, search: search.trim(), page: 1 });
        }}>
          <label className="text-sm font-medium">Cấp độ
            <select className={field + ' mt-1'} value={level} onChange={event => {
              setLevel(event.target.value);
              setFilter({ level: event.target.value, search: search.trim(), page: 1 });
            }}>
              {levels.map(code => <option key={code}>{code}</option>)}
            </select>
          </label>
          <label className="min-w-40 flex-1 text-sm font-medium">Tên bài học
            <input className={field + ' mt-1'} type="search" maxLength={300} value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <button className={outline}>Tìm bài học</button>
        </form>
        {catalog.isFetching && <p role="status" className={muted}>Đang tải bài học…</p>}
        <ErrorMessage error={catalog.error} retry={catalog.refetch} />
        {catalog.data?.length === 0 && <p className={muted}>Không tìm thấy bài học ở trang này.</p>}
        <ul className="max-h-72 divide-y divide-card-border overflow-auto">
          {catalog.data?.map(({ lesson, exercises }) => <li key={lesson.id} className="space-y-2 py-2">
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input type="checkbox" className="mt-1 accent-primary" checked={Boolean(selected[lesson.id])}
                onChange={() => toggleLesson(lesson)} />
              <span>{lesson.title} <span className={muted}>· {lesson.level} · {skillNames[lesson.skill] || lesson.skill}</span></span>
            </label>
            {exercises.map(exercise => <label key={exercise.id} className="ml-5 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-primary"
                checked={selected[lesson.id]?.exercises.some(item => item.id === exercise.id) ?? false}
                onChange={() => toggleExercise(lesson, exercise)} />
              <span>{exercise.title} <span className={muted}>· {exercise.questionCount} câu</span></span>
            </label>)}
          </li>)}
        </ul>
        {(filter.page > 1 || catalog.data?.length === 20) && <div className="flex items-center justify-end gap-2">
          <button type="button" className={outline} disabled={catalog.isFetching || filter.page === 1}
            onClick={() => setFilter(value => ({ ...value, page: value.page - 1 }))}>Trước</button>
          <span className={muted}>Trang {filter.page}</span>
          <button type="button" className={outline} disabled={catalog.isFetching || catalog.data?.length !== 20}
            onClick={() => setFilter(value => ({ ...value, page: value.page + 1 }))}>Sau</button>
        </div>}
      </div>
      {Object.keys(selected).length > 0 && <ul aria-label="Nội dung đã chọn" className="flex flex-wrap gap-2">
        {Object.values(selected).map(({ lesson, exercises }) => <li key={lesson.id}>
          <button type="button" aria-label={'Bỏ chọn ' + lesson.title}
            className={outline} onClick={() => toggleLesson(lesson)}>
            {lesson.title}{exercises.length ? ' · ' + exercises.length + ' bài luyện tập' : ''} ×
          </button>
        </li>)}
      </ul>}
      <ErrorMessage error={save.error} />
      {save.isSuccess && <p role="status" className="text-sm font-medium text-emerald-800">Đã giao bài cho người học.</p>}
      <button form="assign-homework" className={button} disabled={save.isPending || !title.trim() || !bookingId ||
        (!instructions.trim() && !Object.keys(selected).length)}>{save.isPending ? 'Đang giao…' : 'Giao bài'}</button>
    </>}
  </section>;
}

function AssignedLesson({ lesson, assignmentId, userId }) {
  const [open, setOpen] = useState(false);
  const detail = useQuery({
    queryKey: ['homework', userId, 'lesson', assignmentId, lesson.id],
    queryFn: () => getHomeworkLesson(assignmentId, lesson.id),
    enabled: open,
    retry: false,
  });
  return <li className="rounded-xl border border-card-border">
    <button type="button" aria-expanded={open} className="w-full px-3 py-2 text-left text-sm font-semibold text-primary"
      onClick={() => setOpen(value => !value)}>{lesson.title} · {lesson.level}</button>
    {open && <div className="space-y-2 border-t border-card-border p-3">
      {detail.isPending && <p role="status" className={muted}>Đang tải nội dung…</p>}
      <ErrorMessage error={detail.error} retry={detail.refetch} />
      {detail.data && <LessonStudyMaterial detail={detail.data} />}
    </div>}
  </li>;
}

function ExercisePlayer({ assignmentId, exercise, onCompleted }) {
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const start = useMutation({
    mutationFn: () => startHomeworkExercise(assignmentId, exercise.id),
    onSuccess: setAttempt,
    onError: error => {
      if (error.data?.errorCode === 'PRACTICE_ATTEMPT_ALREADY_SUBMITTED') onCompleted();
    },
  });
  const grade = useMutation({
    mutationFn: () => submitHomeworkExercise(assignmentId, attempt.attemptId, attempt.questions.map(question => ({
      questionId: question.questionId,
      selectedOptionId: answers[question.questionId],
    }))),
    onSuccess: async () => {
      setAttempt(null);
      await onCompleted();
    },
    onError: error => {
      if (error.data?.errorCode === 'PRACTICE_ATTEMPT_ALREADY_SUBMITTED') onCompleted();
    },
  });

  return <li className="space-y-3 rounded-xl border border-card-border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="font-semibold">{exercise.title}</h4>
        {exercise.description && <p className={muted}>{exercise.description}</p>}
        <p className={muted}>{exercise.questionCount} câu</p>
      </div>
      {exercise.scorePercent != null
        ? <p className="text-sm font-semibold text-primary">Đã làm · {percentage.format(exercise.scorePercent)}%</p>
        : !attempt && <button type="button" className={outline} disabled={start.isPending || grade.isPending}
          onClick={() => start.mutate()}>{start.isPending ? 'Đang mở…' : 'Làm bài luyện tập'}</button>}
    </div>
    {attempt && exercise.scorePercent == null && <div className="space-y-3 text-sm">
      <PracticeQuestionFields name={'homework-' + attempt.attemptId} questions={attempt.questions} answers={answers}
        disabled={grade.isPending}
        onAnswer={(questionId, optionId) => setAnswers(value => ({ ...value, [questionId]: optionId }))} />
      <button type="button" className={button} disabled={grade.isPending ||
        attempt.questions.some(question => !answers[question.questionId])}
        onClick={() => grade.mutate()}>{grade.isPending ? 'Đang chấm…' : 'Nộp bài luyện tập'}</button>
    </div>}
    <ErrorMessage error={exercise.scorePercent == null ? (start.error || grade.error) : null} />
  </li>;
}

function HomeworkCard({ item, mentor, userId, refresh }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const submit = useMutation({
    mutationFn: () => submitHomework(item.id, { textContent: text.trim() || null, fileUrl: link.trim() || null }),
    onSuccess: refresh,
  });
  const submission = item.submission ?? submit.data;
  const due = item.dueAt && asUtc(item.dueAt);
  const late = due && (submission ? asUtc(submission.submittedAt) : new Date()) > due;
  const canSubmit = !mentor && !submission && item.status === 'Assigned';
  const completed = item.exercises.filter(exercise => exercise.scorePercent != null).length;
  const status = submission ? (late ? 'Đã nộp muộn' : 'Đã nộp')
    : item.status !== 'Assigned' ? 'Đã đóng' : late ? 'Quá hạn' : 'Chưa nộp';
  const attachment = submission?.fileUrl && /^https:\/\//i.test(submission.fileUrl) ? submission.fileUrl : null;

  return <li className={card}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="flex w-full items-start justify-between gap-3 text-left">
      <span className="min-w-0">
        <span className="block break-words font-semibold">{item.title}</span>
        <span className={muted}>{mentor ? item.learnerName : item.mentorName}{due ? ' · Hạn ' + dateLabel(item.dueAt) : ''}</span>
      </span>
      <span className={'shrink-0 rounded-full px-3 py-1 text-xs font-semibold ' +
        (late ? 'bg-amber-100 text-amber-800' : submission ? 'bg-emerald-50 text-emerald-800' : 'bg-primary-light text-primary')}>
        {status}
      </span>
    </button>
    {open && <div className="mt-4 space-y-4 border-t border-card-border pt-4">
      {item.instructions && <p className="whitespace-pre-wrap break-words text-sm">{item.instructions}</p>}
      {item.lessons.length > 0 && <section>
        <h3 className="mb-2 font-semibold">Bài học được giao</h3>
        <ul className="space-y-2">
          {item.lessons.map(lesson => mentor
            ? <li className={muted} key={lesson.id}>{lesson.title} · {lesson.level}</li>
            : <AssignedLesson key={lesson.id} lesson={lesson} assignmentId={item.id} userId={userId} />)}
        </ul>
      </section>}
      {item.exercises.length > 0 && <section>
        <h3 className="mb-2 font-semibold">Bài luyện tập <span className={muted}>· {completed}/{item.exercises.length} đã làm</span></h3>
        <ul className="space-y-2">
          {item.exercises.map(exercise => canSubmit
            ? <ExercisePlayer key={exercise.id} exercise={exercise} assignmentId={item.id} onCompleted={refresh} />
            : <li key={exercise.id} className={muted}>{exercise.title} · {exercise.scorePercent == null
              ? 'Chưa làm' : percentage.format(exercise.scorePercent) + '%'}</li>)}
        </ul>
      </section>}
      {submission && <section className="space-y-2 rounded-xl bg-primary-light p-3">
        <h3 className="font-semibold">Bài nộp</h3>
        <p className={muted}>Đã nộp lúc {dateLabel(submission.submittedAt)}</p>
        {submission.textContent && <p className="whitespace-pre-wrap break-words text-sm">{submission.textContent}</p>}
        {attachment && <a href={attachment} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline">Mở liên kết bài nộp</a>}
      </section>}
      {canSubmit && <form className="space-y-3 rounded-xl bg-primary-light p-3" onSubmit={event => {
        event.preventDefault();
        submit.mutate();
      }}>
        <label className="block text-sm font-medium">Nội dung bài nộp
          <textarea rows={3} maxLength={20000} className={field + ' mt-1'} value={text} onChange={event => setText(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Đường dẫn bài nộp (HTTPS)
          <input type="url" pattern="https://.+" maxLength={2000} className={field + ' mt-1'} value={link}
            onChange={event => setLink(event.target.value)} />
        </label>
        {completed < item.exercises.length && <p className={muted}>Hãy hoàn thành tất cả bài luyện tập trước khi nộp bài về nhà.</p>}
        <ErrorMessage error={submit.error} />
        <button className={button} disabled={submit.isPending || completed < item.exercises.length ||
          (completed === 0 && !text.trim() && !link.trim())}>{submit.isPending ? 'Đang nộp…' : 'Nộp bài về nhà'}</button>
      </form>}
    </div>}
  </li>;
}

export default function HomeworkPage({ mentor = false }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const userId = user?.userId;
  const queryClient = useQueryClient();
  const assignments = useQuery({
    queryKey: ['homework', userId, 'assignments'],
    queryFn: () => getHomework(),
    retry: false,
  });
  const learners = useQuery({
    queryKey: ['homework', userId, 'learners'],
    queryFn: getHomeworkLearners,
    enabled: mentor,
    retry: false,
  });
  const reportLearners = Array.from(new Map([
    ...(assignments.data ?? []).map(item => [item.learnerId, item]),
    ...(learners.data ?? []).map(item => [item.learnerId, item]),
  ]).values()).sort((left, right) => left.learnerName.localeCompare(right.learnerName, 'vi'));
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['homework', userId, 'assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['homework', userId, 'report'] }),
    ]);
  };
  const Shell = mentor ? ConsultShell : LearnerShell;
  return <Shell pathname={pathname} breadcrumb="Bài tập về nhà">
    <main data-page={mentor ? 'MentorHomework' : 'LearnerHomework'} className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 text-[#49353F] sm:px-6">
      <header className={card}><h1 className="text-2xl font-bold">Bài tập về nhà</h1></header>
      {mentor && learners.isPending && <p role="status" className={muted}>Đang tải danh sách người học…</p>}
      {mentor && <ErrorMessage error={learners.error} retry={learners.refetch} />}
      {mentor && learners.data && <AssignForm learners={learners.data} userId={userId} onCreated={refresh} />}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{mentor ? 'Bài đã giao' : 'Bài mentor đã giao'}</h2>
        {assignments.isPending && <p role="status" className={muted}>Đang tải bài tập…</p>}
        <ErrorMessage error={assignments.error} retry={assignments.refetch} />
        {assignments.data?.length === 0 && <p className={card + ' ' + muted}>Chưa có bài tập về nhà.</p>}
        {assignments.data?.length > 0 && <ul className="space-y-3">
          {assignments.data.map(item => <HomeworkCard key={item.id} item={item} mentor={mentor} userId={userId} refresh={refresh} />)}
        </ul>}
      </section>
      <PeriodReport mentor={mentor} learners={reportLearners} userId={userId} />
    </main>
  </Shell>;
}
