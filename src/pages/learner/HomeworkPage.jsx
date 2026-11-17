import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AdminShell, ConsultShell, LearnerShell } from '../../components/shells';
import PracticeQuestionFields from '../../components/PracticeQuestionFields.jsx';
import LessonStudyMaterial from '../../components/LessonStudyMaterial.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import {
  createGroupHomework, createHomework, getHomework, getHomeworkBookings, getHomeworkCatalog, getHomeworkLearners, getHomeworkLesson, getHomeworkReport,
  startHomeworkExercise, submitHomework, submitHomeworkAudio, submitHomeworkExercise, submitHomeworkScan,
} from '../../api/homeworkApi.js';
import { BookingHomeworkPanel, HomeworkBatchGrading, HomeworkCorrectionList, HomeworkGrading, HomeworkScan } from './MentorHomeworkPanel.jsx';

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
const homeworkTypes = { Writing: 'Luyện viết', MultipleChoice: 'Trắc nghiệm', Speaking: 'Luyện nói' };
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

function QuestionEditor({ questions, onChange }) {
  function update(index, changes) {
    onChange(questions.map((question, position) => position === index ? { ...question, ...changes } : question));
  }

  return <section className="space-y-3">
    <h3 className="font-semibold">Câu hỏi do mentor soạn</h3>
    {questions.map((row, index) => <fieldset key={index} className="space-y-2 rounded-xl border border-card-border p-3">
      <legend className="px-1 font-medium">Câu {index + 1}</legend>
      <label className="block text-sm">Nội dung câu hỏi
        <textarea required maxLength={1000} className={field} rows={2} value={row.question}
          onChange={event => update(index, { question: event.target.value })} />
      </label>
      {row.options.map((option, optionIndex) => <div key={optionIndex} className="grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="block text-sm">Lựa chọn {optionIndex + 1}
          <input required maxLength={300} className={field} value={option} onChange={event => update(index, {
            options: row.options.map((value, i) => i === optionIndex ? event.target.value : value),
          })} />
        </label>
        <label className="flex items-center gap-1 pb-2 text-sm">
          <input type="radio" required name={`correct-${index}`} checked={row.correctOptionIndex === optionIndex}
            onChange={() => update(index, { correctOptionIndex: optionIndex })} />
          Đúng
        </label>
      </div>)}
      <div className="flex flex-wrap gap-2">
        {row.options.length < 4 && <button type="button" className={outline}
          onClick={() => update(index, { options: [...row.options, ''] })}>Thêm lựa chọn</button>}
        {row.options.length > 2 && <button type="button" className={outline} onClick={() => update(index, {
          options: row.options.slice(0, -1),
          correctOptionIndex: row.correctOptionIndex === row.options.length - 1 ? null : row.correctOptionIndex,
        })}>Bỏ lựa chọn cuối</button>}
        <button type="button" className={outline} onClick={() => onChange(questions.filter((_, i) => i !== index))}>Bỏ câu này</button>
      </div>
      <label className="block text-sm">Giải thích đáp án (dùng khi chấm)
        <textarea maxLength={800} className={field} rows={2} value={row.explanation}
          onChange={event => update(index, { explanation: event.target.value })} />
      </label>
    </fieldset>)}
    <button type="button" className={outline} disabled={questions.length >= 20} onClick={() => onChange([...questions,
      { question: '', options: ['', '', '', ''], correctOptionIndex: null, explanation: '' }])}>Thêm câu hỏi</button>
  </section>;
}

function GroupRecipients({ learners, anchorBookingId, selected, onChange }) {
  const byLearner = new Map();
  for (const booking of learners) {
    const matches = byLearner.get(booking.learnerId) ?? [];
    matches.push(booking);
    byLearner.set(booking.learnerId, matches);
  }

  const anchor = learners.find(booking => booking.bookingId === Number(anchorBookingId));
  const sameSession = anchor?.availabilityId == null ? [] : learners.filter(booking => booking.availabilityId === anchor.availabilityId);
  const sessionRecipients = Object.fromEntries(sameSession.map(booking => [booking.learnerId, booking.bookingId]));
  function toggle(learnerId, defaultBooking) {
    const next = { ...selected };
    if (next[learnerId]) delete next[learnerId];
    else next[learnerId] = defaultBooking;
    onChange(next);
  }

  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">Học viên nhận đề chung ({Object.keys(selected).length} đã chọn)</legend>
    {Object.keys(sessionRecipients).length > 1 && <button type="button" className={outline}
      onClick={() => onChange(sessionRecipients)}>Chọn cả nhóm cùng buổi đã chọn</button>}
    <div className="max-h-60 space-y-2 overflow-auto rounded-lg border border-card-border p-2">
      {Array.from(byLearner, ([learnerId, bookings]) => {
        const first = bookings[0];
        const chosen = selected[learnerId];
        const preferred = bookings.find(booking => booking.bookingId === anchor?.bookingId) ?? first;
        return <div key={learnerId} className="grid items-center gap-2 rounded-md p-1 text-sm sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-primary" checked={Boolean(chosen)}
              onChange={() => toggle(learnerId, preferred.bookingId)} />
            <span className="break-words">{first.learnerName}</span>
          </label>
          {chosen && <select className={field} aria-label={`Lịch ôn luyện của ${first.learnerName}`} value={chosen}
            onChange={event => onChange({ ...selected, [learnerId]: Number(event.target.value) })}>
            {bookings.map(booking => <option key={booking.bookingId} value={booking.bookingId}>{dateLabel(booking.sessionAt)}</option>)}
          </select>}
        </div>;
      })}
    </div>
  </fieldset>;
}

function AssignForm({ learners, userId, onCreated, defaultBookingId }) {
  const [bookingId, setBookingId] = useState(defaultBookingId ?? '');
  const [recipientMode, setRecipientMode] = useState('individual');
  const [groupRecipients, setGroupRecipients] = useState({});
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignmentType, setAssignmentType] = useState('Writing');
  const [assignmentLevel, setAssignmentLevel] = useState('N5');
  const [questions, setQuestions] = useState([]);
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
  const group = recipientMode === 'group';
  const groupBookingIds = Object.values(groupRecipients);
  const canAssign = Boolean(title.trim()) && (group ? groupBookingIds.length >= 2 : Boolean(bookingId)) &&
    (assignmentType === 'MultipleChoice' ? questions.length > 0 : Boolean(instructions.trim()));
  const save = useMutation({
    mutationFn: () => {
      const homework = {
        title: title.trim(), instructions: instructions.trim() || null,
        dueAt: dueAt ? dueAt + ':00+07:00' : null,
        assignmentType, jlptLevel: assignmentLevel, questions: assignmentType === 'MultipleChoice' ? questions : null,
        lessonIds: Object.values(selected).map(item => item.lesson.id),
        practiceExerciseIds: Object.values(selected).flatMap(item => item.exercises.map(exercise => exercise.id)),
      };
      return group
        ? createGroupHomework({ bookingIds: groupBookingIds, homework })
        : createHomework({ bookingId: Number(bookingId), ...homework });
    },
    onSuccess: async () => {
      setTitle('');
      setInstructions('');
      setQuestions([]);
      setDueAt('');
      setSelected({});
      setGroupRecipients({});
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
      <form id="assign-homework" className="space-y-3" onSubmit={event => {
        event.preventDefault();
        if (canAssign && !save.isPending) save.mutate();
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Giao cho
            <select className={field + ' mt-1'} value={recipientMode} disabled={save.isPending} onChange={event => {
              setRecipientMode(event.target.value);
              save.reset();
            }}>
              <option value="individual">Một học viên</option>
              <option value="group">Nhóm học viên</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Hạn nộp (giờ Việt Nam)
            <input type="datetime-local" className={field + ' mt-1'} value={dueAt} onChange={event => setDueAt(event.target.value)} />
          </label>
        </div>
        {group
          ? <GroupRecipients learners={learners} anchorBookingId={bookingId} selected={groupRecipients} onChange={setGroupRecipients} />
          : <label className="block text-sm font-medium">Học viên và lịch ôn luyện
            <select required className={field + ' mt-1'} value={bookingId} onChange={event => setBookingId(event.target.value)}>
              <option value="">Chọn học viên</option>
              {learners.map(item => <option key={item.bookingId} value={item.bookingId}>
                {item.learnerName} · {dateLabel(item.sessionAt)}
              </option>)}
            </select>
          </label>}
        <label className="block text-sm font-medium">Tiêu đề
          <input required maxLength={300} className={field + ' mt-1'} value={title} onChange={event => setTitle(event.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Dạng bài tập
            <select className={field} value={assignmentType} onChange={event => setAssignmentType(event.target.value)}>
              {Object.entries(homeworkTypes).map(([type, name]) => <option key={type} value={type}>{name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Cấp JLPT của bài tập
            <select className={field} value={assignmentLevel} onChange={event => setAssignmentLevel(event.target.value)}>
              {levels.map(code => <option key={code}>{code}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">Đề bài và yêu cầu làm bài
          <textarea rows={4} maxLength={10000} required={assignmentType !== 'MultipleChoice'} className={field + ' mt-1'} value={instructions}
            onChange={event => setInstructions(event.target.value)} />
        </label>
        {assignmentType === 'MultipleChoice' && <QuestionEditor questions={questions} onChange={setQuestions} />}
      </form>
      <details className="space-y-3 rounded-xl border border-card-border p-3">
        <summary className="cursor-pointer font-semibold">Đính kèm học liệu ôn tập</summary>
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
      </details>
      {Object.keys(selected).length > 0 && <ul aria-label="Nội dung đã chọn" className="flex flex-wrap gap-2">
        {Object.values(selected).map(({ lesson, exercises }) => <li key={lesson.id}>
          <button type="button" aria-label={'Bỏ chọn ' + lesson.title}
            className={outline} onClick={() => toggleLesson(lesson)}>
            {lesson.title}{exercises.length ? ' · ' + exercises.length + ' bài luyện tập' : ''} ×
          </button>
        </li>)}
      </ul>}
      <ErrorMessage error={save.error} />
      {save.isSuccess && <p role="status" className="text-sm font-medium text-emerald-800">
        {Array.isArray(save.data) ? `Đã giao đề chung cho ${save.data.length} học viên.` : 'Đã giao bài cho học viên.'}
      </p>}
      <button form="assign-homework" className={button} disabled={save.isPending || !canAssign}>
        {save.isPending ? 'Đang giao…' : group ? 'Giao đề chung' : 'Giao bài'}
      </button>
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

function AuthoredQuestions({ id, questions, responses, onAnswer }) {
  return <div className="space-y-3">
    {questions.map((question, index) => <fieldset key={index} className="space-y-2 rounded-lg border border-card-border p-3">
      <legend className="whitespace-pre-wrap break-words px-1 text-sm font-semibold">{index + 1}. {question.question}</legend>
      {question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-start gap-2 text-sm">
        <input className="mt-1 accent-primary" type="radio" name={`homework-${id}-${index}`}
          checked={responses[index] === optionIndex} disabled={!onAnswer} required={Boolean(onAnswer)}
          onChange={() => onAnswer?.(index, optionIndex)} />
        <span className="break-words">{option}{question.correctOptionIndex === optionIndex && ' · Đáp án đúng'}</span>
      </label>)}
      {question.explanation && <p className={muted + ' whitespace-pre-wrap break-words'}>{question.explanation}</p>}
    </fieldset>)}
  </div>;
}

function HomeworkCard({ item, mentor, admin, userId, refresh, grading }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [answers, setAnswers] = useState({});
  const [now] = useState(() => Date.now());
  const isQuiz = item.assignmentType === 'MultipleChoice';
  const isSpeaking = item.assignmentType === 'Speaking';
  const questions = item.questions ?? [];
  const quizReady = questions.length > 0 && questions.every((_, index) => Number.isInteger(answers[index]));
  const submit = useMutation({
    mutationFn: () => {
      if (isQuiz) return submitHomework(item.id, { selectedOptions: questions.map((_, index) => answers[index]) });
      if (isSpeaking) return submitHomeworkAudio(item.id, file);
      if (mode === 'scan') return submitHomeworkScan(item.id, file);
      return submitHomework(item.id, { textContent: text.trim() || null });
    },
    onSuccess: refresh,
  });
  const submission = item.submission ?? submit.data;
  const due = item.dueAt && asUtc(item.dueAt);
  const late = due && (submission ? asUtc(submission.submittedAt).getTime() : now) > due.getTime();
  const canSubmit = !mentor && !admin && !submission && item.status === 'Assigned';
  const completed = item.exercises.filter(exercise => exercise.scorePercent != null).length;
  const status = submission?.grade ? 'Đã chấm' : submission ? (late ? 'Đã nộp muộn' : 'Chờ chấm')
    : item.status !== 'Assigned' ? 'Đã đóng' : late ? 'Quá hạn' : 'Chưa nộp';
  const attachment = submission?.fileUrl && /^https:\/\//i.test(submission.fileUrl) ? submission.fileUrl : null;
  const gradeDraft = grading?.draft?.submissionId === submission?.id ? grading?.draft : null;
  let answerReady = Boolean(text.trim()) || (item.assignmentType !== 'Writing' && completed > 0);
  if (isQuiz) answerReady = quizReady;
  else if (isSpeaking || mode === 'scan') answerReady = Boolean(file) && file.size <= (isSpeaking ? 5 : 10) * 1024 * 1024;

  return <li className={card}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
      className="flex w-full items-start justify-between gap-3 text-left">
      <span className="min-w-0">
        <span className="block break-words font-semibold">{item.title}</span>
        <span className={muted}>{mentor || admin ? item.learnerName : item.mentorName}
          {item.assignmentType && ` · ${homeworkTypes[item.assignmentType]} · ${item.jlptLevel}`}
          {due ? ' · Hạn ' + dateLabel(item.dueAt) : ''}
          {gradeDraft && ' · Có bản nháp AI'}</span>
      </span>
      <span className={'shrink-0 rounded-full px-3 py-1 text-xs font-semibold ' +
        (late ? 'bg-amber-100 text-amber-800' : submission ? 'bg-emerald-50 text-emerald-800' : 'bg-primary-light text-primary')}>
        {status}
      </span>
    </button>
    {open && <div className="mt-4 space-y-4 border-t border-card-border pt-4">
      {item.instructions && <p className="whitespace-pre-wrap break-words text-sm">{item.instructions}</p>}
      {isQuiz && !canSubmit && <AuthoredQuestions id={item.id} questions={questions} responses={submission?.selectedOptions ?? []} />}
      {item.lessons.length > 0 && <section>
        <h3 className="mb-2 font-semibold">Bài học được giao</h3>
        <ul className="space-y-2">
          {item.lessons.map(lesson => mentor || admin
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
        {submission.hasScan && <HomeworkScan id={item.id} />}
        {submission.hasAudio && <HomeworkScan id={item.id} audio />}
      </section>}
      {submission?.grade && <section className="space-y-2 rounded-xl bg-primary-light p-3">
        <h3 className="font-semibold">Điểm mentor gửi · {percentage.format(submission.grade.score)}/100</h3>
        <p className="whitespace-pre-wrap break-words text-sm">{submission.grade.feedback}</p>
        <HomeworkCorrectionList corrections={submission.grade.corrections} />
      </section>}
      {mentor && submission && <HomeworkGrading key={`${submission.id}-${gradeDraft ? grading.run : 0}`}
        id={item.id} submission={submission} refresh={refresh} draft={gradeDraft} />}
      {canSubmit && <form className="space-y-3 rounded-xl bg-primary-light p-3" onSubmit={event => {
        event.preventDefault();
        submit.mutate();
      }}>
        {isQuiz && <AuthoredQuestions id={item.id} questions={questions} responses={answers}
          onAnswer={(index, option) => setAnswers(current => ({ ...current, [index]: option }))} />}
        {isSpeaking && <label className="block text-sm font-medium">Bản thu âm WAV, MP3, M4A hoặc WEBM tối đa 5 MB
          <input type="file" accept=".wav,.mp3,.m4a,.mp4,.webm,audio/*" required className={field + ' mt-1'}
            onChange={event => setFile(event.target.files[0] ?? null)} />
        </label>}
        {!isQuiz && !isSpeaking && <><label className="block text-sm font-medium">Hình thức nộp
          <select className={field + ' mt-1'} value={mode} onChange={event => { setMode(event.target.value); setFile(null); }}>
            <option value="text">Viết trên hệ thống</option><option value="scan">Ảnh bài làm trên giấy</option>
          </select>
        </label>
          {mode === 'text' ? <label className="block text-sm font-medium">Nội dung bài nộp
            <textarea rows={3} maxLength={20000} className={field + ' mt-1'} value={text} onChange={event => setText(event.target.value)} />
          </label> : <label className="block text-sm font-medium">Chọn ảnh JPG/PNG tối đa 10 MB
            <input type="file" accept="image/jpeg,image/png" required className={field + ' mt-1'} onChange={event => setFile(event.target.files[0] ?? null)} />
          </label>}
        </>}
        {completed < item.exercises.length && <p className={muted}>Hãy hoàn thành tất cả bài luyện tập trước khi nộp bài về nhà.</p>}
        <ErrorMessage error={submit.error} />
        <button className={button} disabled={submit.isPending || completed < item.exercises.length || !answerReady}>
          {submit.isPending ? 'Đang nộp…' : 'Nộp bài về nhà'}
        </button>
      </form>}
    </div>}
  </li>;
}

export default function HomeworkPage({ mentor = false, admin = false }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const userId = user?.userId;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});
  const bookings = useQuery({ queryKey: ['homework', userId, 'bookings'], queryFn: getHomeworkBookings, retry: false });
  const list = (bookings.data ?? []).filter(booking =>
    (filter === '' || (filter === 'moved' ? booking.wasRescheduled : booking.status === filter)) &&
    `${booking.learnerName} ${booking.mentorName} ${booking.bookingId}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = list.find(booking => booking.bookingId === Number(params.get('bookingId'))) ?? (admin ? list[0] : null);
  const bookingId = selected?.bookingId;
  const assignments = useQuery({
    queryKey: ['homework', userId, 'assignments', bookingId],
    queryFn: () => getHomework(undefined, bookingId),
    enabled: !admin || Boolean(bookingId),
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
    await queryClient.invalidateQueries({ queryKey: ['homework', userId] });
  };
  function saveDrafts(results) {
    const run = Date.now();
    setDrafts(previous => ({
      ...previous,
      ...Object.fromEntries(results.filter(item => item.draft).map(item => [item.assignmentId, { draft: item.draft, run }])),
    }));
  }
  const Shell = admin ? AdminShell : mentor ? ConsultShell : LearnerShell;
  return <Shell pathname={pathname} breadcrumb="Bài tập về nhà">
    <main data-page={mentor ? 'MentorHomework' : 'LearnerHomework'} className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 text-[#49353F] sm:px-6">
      <header className={card}><h1 className="text-2xl font-bold">{admin ? 'Theo dõi ôn luyện với mentor' : 'Bài tập về nhà'}</h1></header>
      <section className={card + ' space-y-3'}>
        <h2 className="text-lg font-semibold">Lịch ôn luyện</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm">Tìm theo tên hoặc mã lịch<input type="search" className={field} value={search}
            onChange={event => { setSearch(event.target.value); setParams({}); }} /></label>
          <label className="text-sm">Trạng thái lịch<select className={field} value={filter}
            onChange={event => { setFilter(event.target.value); setParams({}); }}>
            <option value="">Tất cả</option><option value="Assigned">Đã phân công</option><option value="Accepted">Đã xác nhận</option>
            <option value="Completed">Đã hoàn thành</option><option value="moved">Đã chuyển lịch</option><option value="Cancelled">Đã hủy</option>
          </select></label>
          <label className="text-sm">Chọn lịch<select className={field} value={bookingId ?? ''}
            onChange={event => setParams(event.target.value ? { bookingId: event.target.value } : {})}>
            <option value="">{admin ? 'Chọn lịch ôn luyện' : 'Tất cả bài đã giao'}</option>
            {list.map(item => <option key={item.bookingId} value={item.bookingId}>
              #{item.bookingId} · {admin || mentor ? item.learnerName : item.mentorName} · {dateLabel(item.startsAt)}
            </option>)}
          </select></label>
        </div>
        {bookings.isPending && <p role="status" className={muted}>Đang tải lịch ôn luyện…</p>}
        <ErrorMessage error={bookings.error} retry={bookings.refetch} />
        {bookings.isSuccess && list.length === 0 && <p className={muted}>Chưa có lịch phù hợp.</p>}
      </section>
      {selected && <BookingHomeworkPanel key={selected.bookingId} booking={selected} userId={userId} role={admin ? 'admin' : mentor ? 'mentor' : 'learner'} refresh={refresh} />}
      {mentor && learners.isPending && <p role="status" className={muted}>Đang tải danh sách người học…</p>}
      {mentor && <ErrorMessage error={learners.error} retry={learners.refetch} />}
      {mentor && learners.data && <AssignForm key={bookingId ?? 'all'} learners={learners.data} userId={userId} onCreated={refresh}
        defaultBookingId={learners.data.some(item => item.bookingId === bookingId) ? String(bookingId) : ''} />}
      {mentor && assignments.data && <HomeworkBatchGrading items={assignments.data} onDrafts={saveDrafts} />}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{mentor ? 'Bài đã giao' : 'Bài mentor đã giao'}</h2>
        {assignments.isFetching && <p role="status" className={muted}>Đang tải bài tập…</p>}
        <ErrorMessage error={assignments.error} retry={assignments.refetch} />
        {assignments.data?.length === 0 && <p className={card + ' ' + muted}>Chưa có bài tập về nhà.</p>}
        {assignments.data?.length > 0 && <ul className="space-y-3">
          {assignments.data.map(item => <HomeworkCard key={item.id} item={item} mentor={mentor} admin={admin}
            userId={userId} refresh={refresh} grading={drafts[item.id]} />)}
        </ul>}
      </section>
      {!admin && <PeriodReport mentor={mentor} learners={reportLearners} userId={userId} />}
    </main>
  </Shell>;
}
