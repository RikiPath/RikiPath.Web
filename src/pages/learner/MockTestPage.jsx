import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import OrderingAnswer from '../../components/OrderingAnswer.jsx';
import {
  getMockTestAttempt, getMockTestLevels, getMockTestQuestions, getMockTestReview,
  getMockTestsByLevel, saveMockTestAnswers, startMockTest, submitMockTestAttempt,
} from '../../api/mockTestApi.js';

const card = 'rounded-xl border border-[#EADFE5] bg-white p-5';
const button = 'inline-flex rounded-lg bg-[#AD3155] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';
const linkClass = 'text-sm font-semibold text-[#AD3155] underline';
const input = 'rounded-lg border border-[#EADFE5] bg-white px-3 py-2 text-sm';
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

function answerItem(questionId, value) {
  return typeof value === 'number' ? { questionId, selectedOptionId: value } : { questionId, response: value };
}

function optionContent(option, label) {
  return <span className="min-w-0 whitespace-pre-wrap">
    {option.content ?? option.optionText}
    {option.imageUrl && <img src={option.imageUrl} alt={label} className="mt-1 max-h-44 max-w-full rounded-md" />}
  </span>;
}

function MockAnswer({ question, value, onChange }) {
  const type = question.questionType?.toLowerCase();
  const data = question.interactionData;
  if (type === 'ordering') return <OrderingAnswer question={question} value={value} onChange={onChange} />;
  if (question.options?.length) {
    const multiple = type === 'multiplechoice';
    const choices = multiple && Array.isArray(value) ? value : [];
    return <div className="mt-3 grid gap-2">
      {multiple && <p className="text-sm text-[#765E6B]">Chọn tất cả đáp án phù hợp.</p>}
      {question.options.map((option, index) => {
        const id = option.optionId;
        const checked = multiple ? choices.includes(id) : value === id;
        return <label key={id} className="flex cursor-pointer gap-3 rounded-lg border border-[#EADFE5] px-3 py-2.5 text-sm has-checked:border-[#AD3155] has-checked:bg-[#FFF0F5]">
          <input type={multiple ? 'checkbox' : 'radio'} name={'mock-' + question.questionId} checked={checked}
            className="mt-1 accent-[#AD3155]"
            onChange={() => onChange(multiple ? (checked ? choices.filter(item => item !== id) : [...choices, id]) : id)} />
          {optionContent(option, 'Hình đáp án ' + (index + 1))}
        </label>;
      })}
    </div>;
  }
  if (type === 'matching') {
    const validChoice = item => item != null && ['string', 'number'].includes(typeof (item.id ?? item));
    const left = Array.isArray(data?.left) ? data.left.filter(validChoice) : [];
    const right = Array.isArray(data?.right) ? data.right.filter(validChoice) : [];
    if (!left.length || !right.length) return <p className="mt-3 text-sm">Câu ghép cặp chưa có dữ liệu lựa chọn để hiển thị.</p>;
    return <div className="mt-3 grid gap-2">
      {left.map(item => {
        const key = String(item.id ?? item);
        return <label key={key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>{item.text ?? item.label ?? key}</span>
          <select className={input} value={value?.[key] ?? ''} onChange={event => {
            const next = { ...value };
            const match = right.find(option => String(option.id ?? option) === event.target.value);
            if (match === undefined) delete next[key];
            else next[key] = match.id ?? match;
            onChange(next);
          }}>
            <option value="">Chọn vế tương ứng</option>
            {right.map(option => <option key={option.id ?? option} value={option.id ?? option}>{option.text ?? option.label ?? option.id ?? option}</option>)}
          </select>
        </label>;
      })}
    </div>;
  }
  const blanks = type === 'fillblank' && Array.isArray(data?.blanks) ? data.blanks : null;
  if (blanks?.length) return <div className="mt-3 flex flex-wrap gap-2">
    {blanks.map((_, index) => <input key={index} className={input} aria-label={'Ô trống ' + (index + 1)}
      value={value?.[index] ?? ''} onChange={event => onChange(blanks.map((_, position) =>
        position === index ? event.target.value : value?.[position] ?? ''))} />)}
  </div>;
  return <label className="mt-3 block space-y-1 text-sm">
    <span>Câu trả lời</span>
    <input className={input + ' block w-full'} value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} />
  </label>;
}

function MockAttempt({ attempt, onComplete }) {
  const [answers, setAnswers] = useState(() => Object.fromEntries(attempt.questions
    .filter(question => question.selectedOptionId != null || question.response != null)
    .map(question => [question.questionId, question.selectedOptionId ?? question.response])));
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submission = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const autoSubmitted = useRef(false);
  const deadline = attempt.localDeadline;
  const remaining = useCallback(() => deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000)), [deadline]);
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    if (deadline == null) return;
    const timer = setInterval(() => setSeconds(remaining()), 250);
    return () => clearInterval(timer);
  }, [deadline, remaining]);

  function choose(questionId, value) {
    if (submission.current || remaining() === 0) return;
    setAnswers(current => ({ ...current, [questionId]: value }));
    setError('');
    saveQueue.current = saveQueue.current.then(() => saveMockTestAnswers(attempt.attemptId, [answerItem(questionId, value)]))
      .catch(error => {
        if (!['MOCK_TEST_EXPIRED', 'MOCK_TEST_COMPLETED'].includes(error.data?.errorCode)) setError(error.message);
      });
  }

  const submit = useCallback(async () => {
    if (submission.current) return;
    submission.current = true;
    setPending(true);
    setError('');
    try {
      await saveQueue.current;
      const items = Object.entries(answers).map(([questionId, value]) => answerItem(Number(questionId), value));
      const result = await submitMockTestAttempt(attempt.attemptId, items).catch(error => {
        if (error.data?.errorCode === 'MOCK_TEST_COMPLETED') return getMockTestAttempt(attempt.attemptId);
        throw error;
      });
      onComplete(result);
    } catch (error) {
      setError(error.message);
    } finally {
      submission.current = false;
      setPending(false);
    }
  }, [answers, attempt.attemptId, onComplete]);

  useEffect(() => {
    if (seconds !== 0 || autoSubmitted.current || pending) return;
    autoSubmitted.current = true;
    void submit();
  }, [pending, seconds, submit]);

  return <>
    <section className={card}>
      <h2 className="font-bold">{attempt.title || 'Đề thi thử ' + attempt.jlptLevelName}</h2>
      <p className="mt-1 text-sm text-[#765E6B]">{attempt.questions.length} câu{attempt.timeLimitMinutes > 0 && ' · ' + attempt.timeLimitMinutes + ' phút'}</p>
    </section>
    {seconds != null && <div className="sticky top-2 z-10 rounded-xl border border-[#EADFE5] bg-white px-4 py-2 text-sm shadow-sm">
      Thời gian còn lại <strong className="ml-2 tabular-nums text-[#AD3155]">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>
    </div>}
    <details className={card}>
      <summary className="cursor-pointer text-sm font-semibold">Chuyển đến câu hỏi</summary>
      <nav aria-label="Danh sách câu hỏi thi thử" className="mt-3 flex flex-wrap gap-2">
        {attempt.questions.map((question, index) => <a key={question.questionId} href={'#mock-question-' + question.questionId}
          className={input + (answers[question.questionId] != null ? ' border-[#D28DA4] bg-[#FFF0F5]' : '')}>{index + 1}</a>)}
      </nav>
    </details>
    {attempt.questions.map((question, index) => <div key={question.questionId} className="space-y-2">
      {(index === 0 || attempt.questions[index - 1].mockTestSectionId !== question.mockTestSectionId) &&
        <h3 className="mt-4 text-lg font-semibold">{question.sectionTitle}</h3>}
      <fieldset id={'mock-question-' + question.questionId} className={card + ' scroll-mt-28'} disabled={pending || seconds === 0}>
        <legend className="px-2 text-xs font-semibold text-[#AD3155]">Câu {index + 1}</legend>
        <p className="whitespace-pre-wrap text-sm font-medium">{question.content}</p>
        {question.imageUrl && <img src={question.imageUrl} alt="Hình minh họa câu hỏi" className="mt-3 max-h-80 max-w-full rounded-lg" />}
        {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mt-3 w-full" />}
        <MockAnswer question={question} value={answers[question.questionId]} onChange={value => choose(question.questionId, value)} />
      </fieldset>
    </div>)}
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-3">
      {seconds === 0 ? <button className={button} disabled={pending} type="button" onClick={submit}>
        {pending ? 'Đang nộp bài…' : 'Nộp bài đã hết giờ'}
      </button> : confirm ? <>
        <button className={linkClass} disabled={pending} type="button" onClick={() => setConfirm(false)}>Tiếp tục làm bài</button>
        <button className={button} disabled={pending} type="button" onClick={submit}>{pending ? 'Đang nộp…' : 'Xác nhận nộp bài'}</button>
      </> : <button className={button} type="button" onClick={() => setConfirm(true)}>Nộp bài thi thử</button>}
    </div>
  </>;
}

function MockResult({ result, userId, returnToList }) {
  const [showReview, setShowReview] = useState(false);
  const review = useQuery({
    queryKey: ['mock-test-review', userId, result.attemptId], queryFn: () => getMockTestReview(result.attemptId),
    enabled: showReview, retry: false,
  });
  const wrong = review.data?.questions?.filter(question => !question.isCorrect) ?? [];
  return <>
    <section className={card}>
      <h2 className="font-bold">Kết quả thi thử</h2>
      <p className="mt-2 text-3xl font-bold text-[#AD3155]">{percent.format(result.totalScore)}%</p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {result.sections?.map(section => <li key={section.mockTestSectionId} className="rounded-lg bg-[#FAF4F7] p-3">
          {section.sectionTitle} · {section.correctCount}/{section.totalCount} câu đúng
        </li>)}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={button} type="button" onClick={() => setShowReview(value => !value)}>{showReview ? 'Ẩn câu sai' : 'Xem câu sai'}</button>
        <Link className={linkClass} to="/exam-result/">Lịch sử thi thử</Link>
        <button className={linkClass} type="button" onClick={returnToList}>Chọn đề khác</button>
      </div>
    </section>
    {showReview && <>
      {review.isPending && <p role="status">Đang tải câu sai…</p>}
      {review.isError && <p role="alert">{review.error.message}</p>}
      {review.isSuccess && wrong.length === 0 && <p className={card}>Bạn đã làm đúng tất cả các câu.</p>}
      {wrong.map(question => <article key={question.questionId} className={card + ' space-y-2 text-sm'}>
        <p className="whitespace-pre-wrap font-semibold">{question.questionText}</p>
        {question.options?.filter(option => option.isCorrect).map(option => <div key={option.optionId} className="text-emerald-800">
          <span>Đáp án đúng · </span>{optionContent(option, 'Hình đáp án đúng')}
        </div>)}
        {question.answerKey != null && <p>Đáp án đúng · {Array.isArray(question.answerKey) && question.answerKey.every(value => typeof value === 'string')
          ? question.answerKey.join(' / ') : typeof question.answerKey === 'string' ? question.answerKey : JSON.stringify(question.answerKey)}</p>}
        {question.explanation && <p className="whitespace-pre-wrap text-[#765E6B]">{question.explanation}</p>}
      </article>)}
    </>}
  </>;
}

export default function MockTestPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const attemptId = Number(params.get('attemptId')) || null;
  const levelCode = params.get('level');
  const attemptKey = ['mock-test-page', user?.userId, attemptId];
  const levels = useQuery({ queryKey: ['mock-test-levels'], queryFn: getMockTestLevels, enabled: !attemptId, retry: false });
  const activeLevel = levels.data?.find(level => level.code === levelCode) ?? levels.data?.[0];
  const tests = useQuery({
    queryKey: ['mock-tests-by-level', activeLevel?.id], queryFn: () => getMockTestsByLevel(activeLevel.id),
    enabled: !attemptId && Boolean(activeLevel), retry: false,
  });
  const current = useQuery({
    queryKey: attemptKey, enabled: Boolean(attemptId), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
    queryFn: async () => {
      try { return { attempt: await getMockTestQuestions(attemptId) }; }
      catch (error) {
        if (error.data?.errorCode !== 'MOCK_TEST_COMPLETED') throw error;
        return { result: await getMockTestAttempt(attemptId) };
      }
    },
  });
  const start = useMutation({
    mutationFn: startMockTest,
    onSuccess: attempt => {
      queryClient.setQueryData(['mock-test-page', user?.userId, attempt.attemptId], { attempt });
      setParams({ level: activeLevel.code, attemptId: String(attempt.attemptId) });
    },
  });
  const complete = useCallback(result => {
    queryClient.setQueryData(['mock-test-page', user?.userId, result.attemptId], { result });
    void queryClient.invalidateQueries({ queryKey: ['mock-test-history', user?.userId] });
  }, [queryClient, user?.userId]);
  const returnToList = () => {
    start.reset();
    setParams(levelCode ? { level: levelCode } : {});
  };
  const error = current.error ?? levels.error ?? tests.error ?? start.error;

  return <LearnerShell breadcrumb="Thi thử">
    <main data-page="MockTestPage" className="mx-auto max-w-4xl space-y-4 px-4 py-6 text-[#49353F]">
      <header className={card + ' flex flex-wrap items-center justify-between gap-3'}>
        <h1 className="text-xl font-bold">Thi thử JLPT</h1>
        <Link className={linkClass} to="/app/placement-test/">Đánh giá năng lực</Link>
      </header>
      {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
        {error.message} {attemptId && <button className="ml-2 underline" type="button" onClick={returnToList}>Về danh sách đề</button>}
      </div>}
      {attemptId && current.isFetching && !current.data?.result && <p role="status">Đang tải lượt thi thử…</p>}
      {current.data?.attempt && !current.isFetching && <MockAttempt key={attemptId} attempt={current.data.attempt} onComplete={complete} />}
      {current.data?.result && <MockResult key={attemptId} result={current.data.result} userId={user?.userId} returnToList={returnToList} />}
      {!attemptId && <>
        <section className={card}>
          <h2 className="font-semibold">Chọn cấp độ và đề thi</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cấp độ thi thử">
            {levels.data?.map(level => <button key={level.id} type="button" aria-pressed={activeLevel?.id === level.id}
              disabled={start.isPending} className={input + (activeLevel?.id === level.id ? ' border-[#AD3155] bg-[#FFF0F5] text-[#AD3155]' : '')}
              onClick={() => { start.reset(); setParams({ level: level.code }); }}>{level.code}</button>)}
          </div>
          {levels.isPending || (activeLevel && tests.isPending) ? <p role="status" className="mt-3 text-sm">Đang tải đề thi…</p> : null}
          {levels.isSuccess && levels.data.length === 0 && <p className="mt-3 text-sm">Chưa có cấp độ thi thử.</p>}
        </section>
        {tests.isSuccess && (tests.data.length ? <ul className="space-y-3">
          {tests.data.map(test => <li key={test.mockTestId} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0">
              <h3 className="font-semibold">{test.title}</h3>
              {test.timeLimitMinutes > 0 && <p className="text-sm text-[#765E6B]">{test.timeLimitMinutes} phút</p>}
              {test.description && <p className="mt-1 text-sm text-[#765E6B]">{test.description}</p>}
            </div>
            <button className={button} type="button" disabled={start.isPending} onClick={() => start.mutate(test.mockTestId)}>
              {start.isPending && start.variables === test.mockTestId ? 'Đang mở đề…' : 'Bắt đầu thi thử'}
            </button>
          </li>)}
        </ul> : <p className={card}>Chưa có đề thi thử {activeLevel?.code}.</p>)}
      </>}
    </main>
  </LearnerShell>;
}
