import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import OrderingAnswer from '../../components/OrderingAnswer.jsx';
import {
  getMockQuestionExplanation, getMockTestAttempt, getMockTestHistory, getMockTestLevels, getMockTestQuestions, getMockTestReview,
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

function MockQuestionContext({ question }) {
  const { passage, secondPassage } = question.interactionData ?? {};
  const passages = [passage, secondPassage].filter(text => typeof text === 'string' && text.trim());
  return <>
    {passages.length > 0 && <div className={'mb-3 grid gap-3 ' + (passages.length > 1 ? 'lg:grid-cols-2' : '')}
      aria-label="Ngữ liệu câu hỏi">
      {passages.map((text, index) => <section key={index} className="rounded-lg border border-[#EADFE5] bg-[#FCF8FA] p-3">
        {passages.length > 1 && <h4 className="mb-1 text-sm font-semibold">Văn bản {index + 1}</h4>}
        <p lang="ja" className="whitespace-pre-wrap break-words text-sm leading-7">{text}</p>
      </section>)}
    </div>}
    {question.imageUrl && <img src={question.imageUrl} alt="Hình minh họa câu hỏi" className="mb-3 max-h-80 max-w-full rounded-lg object-contain" />}
    {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mb-3 w-full" aria-label="Âm thanh câu hỏi" />}
  </>;
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
    const visual = question.options.some(option => option.imageUrl);
    const audioChoices = data?.optionsInAudio;
    return <div className={'mt-3 grid gap-2 ' + (visual ? 'sm:grid-cols-2' : '')}>
      {multiple && <p className="text-sm text-[#765E6B] sm:col-span-full">Chọn tất cả đáp án phù hợp.</p>}
      {audioChoices && <p className="text-sm text-[#765E6B]">Nghe các lựa chọn và chọn số đáp án.</p>}
      {question.options.map((option, index) => {
        const id = option.optionId;
        const checked = multiple ? choices.includes(id) : value === id;
        return <label key={id} className="flex cursor-pointer gap-3 rounded-lg border border-[#EADFE5] px-3 py-2.5 text-sm has-checked:border-[#AD3155] has-checked:bg-[#FFF0F5]">
          <input type={multiple ? 'checkbox' : 'radio'} name={'mock-' + question.questionId} checked={checked}
            className="mt-1 accent-[#AD3155]"
            onChange={() => onChange(multiple ? (checked ? choices.filter(item => item !== id) : [...choices, id]) : id)} />
          {audioChoices ? <span>Đáp án {index + 1}</span> : <>
            <span className="font-semibold text-[#765E6B]">{index + 1}.</span>
            {optionContent(option, 'Hình đáp án ' + (index + 1))}
          </>}
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
        <MockQuestionContext question={question} />
        {question.content && <p className="whitespace-pre-wrap text-sm font-medium">{question.content}</p>}
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

function MockReviewQuestion({ attemptId, question, number }) {
  const queryClient = useQueryClient();
  const ai = useMutation({
    mutationFn: () => getMockQuestionExplanation(attemptId, question.questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-subscription'] }),
  });
  const selectedOptions = new Set(question.questionType?.toLowerCase() === 'multiplechoice' && Array.isArray(question.response)
    ? question.response : [question.selectedOptionId]);
  const reasons = new Map((ai.data?.options ?? []).map(option => [option.optionId, option.reason]));
  const star = question.interactionData?.starPosition;
  const hasStarAnswer = Boolean(star && Array.isArray(question.answerKey));

  return <article className={card + ' space-y-3 text-sm'}>
    <h3 className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-semibold">Câu {number}</span>
      <span className={question.isCorrect ? 'font-semibold text-emerald-800' : 'font-semibold text-rose-800'}>
        {question.isCorrect ? 'Đúng' : 'Sai hoặc bỏ trống'}
      </span>
    </h3>
    <MockQuestionContext question={question} />
    {question.questionText && <p className="whitespace-pre-wrap font-semibold">{question.questionText}</p>}
    {hasStarAnswer && <>
      <p><strong>Dấu ★</strong> · {question.answerKey[star - 1]}</p>
      <p><strong>Thứ tự đúng</strong> · {question.answerKey.join(' / ')}</p>
      {Array.isArray(question.response) && question.response.length > 0 &&
        <p><strong>Thứ tự bạn chọn</strong> · {question.response.join(' / ')}</p>}
    </>}
    {question.answerKey != null && !hasStarAnswer && !question.options?.length && <p>
      <strong>Đáp án đúng</strong> · {Array.isArray(question.answerKey) && question.answerKey.every(value => typeof value === 'string')
        ? question.answerKey.join(' / ') : typeof question.answerKey === 'string' ? question.answerKey : JSON.stringify(question.answerKey)}
    </p>}
    {question.explanation && <p className="whitespace-pre-wrap text-[#765E6B]">{question.explanation}</p>}
    {ai.data && <div className="space-y-2 rounded-lg border border-[#EADFE5] bg-[#FCF8FA] p-3" aria-live="polite">
      <h4 className="font-semibold text-[#AD3155]">Giải thích của AI</h4>
      <p className="font-medium">Điểm câu hỏi · {ai.data.score}/{ai.data.maxScore}</p>
      <p className="whitespace-pre-wrap">{ai.data.explanation}</p>
    </div>}
    {Boolean(question.options?.length) && <ul className="grid gap-2">
      {question.options.map((option, index) => <li key={option.optionId}
        className={'space-y-2 rounded-lg border p-3 ' + (option.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-[#EADFE5]')}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold">Đáp án {index + 1}</span>
          {option.isCorrect && <span className="text-emerald-800">Đáp án đúng</span>}
          {selectedOptions.has(option.optionId) && <span className="text-[#AD3155]">Bạn chọn</span>}
        </div>
        {!question.interactionData?.optionsInAudio && optionContent(option, 'Hình đáp án ' + (index + 1))}
        {reasons.has(option.optionId) && <p className="whitespace-pre-wrap">{reasons.get(option.optionId)}</p>}
      </li>)}
    </ul>}
    {!ai.data && <button className={button} type="button" disabled={ai.isPending} onClick={() => ai.mutate()}>
      {ai.isPending ? 'AI đang phân tích…' : 'Chấm và giải thích câu này · 1 lượt khi tạo'}
    </button>}
    {ai.isError && <p role="alert" className="text-rose-800">
      {ai.error.message}{' '}
      {ai.error.data?.errorCode === 'AI_CREDIT_REQUIRED' && <Link className={linkClass} to="/plans/">Xem gói ôn luyện</Link>}
    </p>}
  </article>;
}

function MockResult({ result, userId, returnToList }) {
  const [reviewMode, setReviewMode] = useState(null);
  const review = useQuery({
    queryKey: ['mock-test-review', userId, result.attemptId], queryFn: () => getMockTestReview(result.attemptId),
    enabled: Boolean(reviewMode), retry: false,
  });
  const questions = (review.data?.questions ?? []).map((question, index) => ({ question, number: index + 1 }));
  const visibleQuestions = reviewMode === 'wrong' ? questions.filter(item => !item.question.isCorrect) : questions;
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
        <button className={button} type="button" aria-pressed={reviewMode === 'all'}
          onClick={() => setReviewMode(mode => mode === 'all' ? null : 'all')}>
          {reviewMode === 'all' ? 'Ẩn danh sách câu hỏi' : 'AI chấm và giải thích'}
        </button>
        <button className={linkClass} type="button" aria-pressed={reviewMode === 'wrong'}
          onClick={() => setReviewMode(mode => mode === 'wrong' ? null : 'wrong')}>
          {reviewMode === 'wrong' ? 'Ẩn câu sai' : 'Xem câu sai'}
        </button>
        <Link className={linkClass} to="/exam-result/">Lịch sử và so sánh</Link>
        <button className={linkClass} type="button" onClick={returnToList}>Chọn đề khác</button>
      </div>
    </section>
    <LearnerFeedbackPanel type="mock-test" id={result.attemptId} label="Phản hồi về đề thi thử" />
    {reviewMode && <>
      {reviewMode === 'all' && <p className="text-sm text-[#765E6B]">Chọn một câu để AI giải thích từng lựa chọn.</p>}
      {review.isPending && <p role="status">Đang tải câu hỏi đã chấm…</p>}
      {review.isError && <p role="alert">{review.error.message}</p>}
      {review.isSuccess && visibleQuestions.length === 0 && <p className={card}>
        {reviewMode === 'wrong' ? 'Bạn đã làm đúng tất cả các câu.' : 'Lượt thi này chưa có câu hỏi để xem lại.'}
      </p>}
      {visibleQuestions.map(({ question, number }) =>
        <MockReviewQuestion key={question.questionId} attemptId={result.attemptId} question={question} number={number} />)}
    </>}
  </>;
}

export default function MockTestPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const attemptId = Number(params.get('attemptId')) || null;
  const levelCode = params.get('level');
  const unfinished = params.get('view') === 'unfinished';
  const viewParams = unfinished ? { view: 'unfinished' } : {};
  const attemptKey = ['mock-test-page', user?.userId, attemptId];
  const levels = useQuery({ queryKey: ['mock-test-levels'], queryFn: getMockTestLevels, enabled: !attemptId, retry: false });
  const activeLevel = levels.data?.find(level => level.code === levelCode) ?? levels.data?.[0];
  const tests = useQuery({
    queryKey: ['mock-tests-by-level', activeLevel?.id], queryFn: () => getMockTestsByLevel(activeLevel.id),
    enabled: !attemptId && Boolean(activeLevel), retry: false,
  });
  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId],
    queryFn: getMockTestHistory,
    enabled: !attemptId && unfinished && Boolean(activeLevel),
    retry: false,
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
      setParams({ ...viewParams, level: activeLevel.code, attemptId: String(attempt.attemptId) });
    },
  });
  const complete = useCallback(result => {
    queryClient.setQueryData(['mock-test-page', user?.userId, result.attemptId], { result });
    void queryClient.invalidateQueries({ queryKey: ['mock-test-history', user?.userId] });
  }, [queryClient, user?.userId]);
  const returnToList = () => {
    start.reset();
    setParams({ ...viewParams, ...(levelCode ? { level: levelCode } : {}) });
  };
  const error = current.error ?? levels.error ?? tests.error ?? start.error;
  const completedIds = new Set((history.data ?? []).map(attempt => attempt.mockTestId));
  const visibleTests = (tests.data ?? []).filter(test => !unfinished || !completedIds.has(test.mockTestId));
  const waitingForHistory = unfinished && Boolean(activeLevel) && (history.isPending || history.isFetching);
  const showTests = tests.isSuccess && (!unfinished || (history.isSuccess && !waitingForHistory));

  function changeView(showUnfinished) {
    start.reset();
    setParams({
      ...(activeLevel ? { level: activeLevel.code } : {}),
      ...(showUnfinished ? { view: 'unfinished' } : {}),
    });
  }

  return <LearnerShell breadcrumb="Thi thử">
    <main data-page="MockTestPage" className="mx-auto max-w-4xl space-y-4 px-4 py-6 text-[#49353F]">
      <header className={card + ' flex flex-wrap items-center justify-between gap-3'}>
        <h1 className="text-xl font-bold">Thi thử JLPT</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link className={linkClass} to="/exam-result/">Lịch sử điểm thi</Link>
          <Link className={linkClass} to="/app/placement-test/">Đánh giá năng lực</Link>
        </div>
      </header>
      {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
        {error.message} {attemptId && <button className="ml-2 underline" type="button" onClick={returnToList}>Về danh sách đề</button>}
      </div>}
      {attemptId && current.isFetching && !current.data?.result && <p role="status">Đang tải lượt thi thử…</p>}
      {current.data?.attempt && !current.isFetching && <MockAttempt key={attemptId} attempt={current.data.attempt} onComplete={complete} />}
      {current.data?.result && <MockResult key={attemptId} result={current.data.result} userId={user?.userId} returnToList={returnToList} />}
      {!attemptId && <>
        <section className={card}>
          <h2 className="font-semibold">{unfinished ? 'Đề thi thử chưa hoàn thành' : 'Tất cả đề thi thử'}</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Trạng thái đề thi">
            {[{ label: 'Chưa làm', value: true }, { label: 'Tất cả đề', value: false }].map(view =>
              <button key={view.label} type="button" aria-pressed={unfinished === view.value}
                disabled={start.isPending} className={input + (unfinished === view.value ? ' border-[#AD3155] bg-[#FFF0F5] text-[#AD3155]' : '')}
                onClick={() => changeView(view.value)}>{view.label}</button>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cấp độ thi thử">
            {levels.data?.map(level => <button key={level.id} type="button" aria-pressed={activeLevel?.id === level.id}
              disabled={start.isPending} className={input + (activeLevel?.id === level.id ? ' border-[#AD3155] bg-[#FFF0F5] text-[#AD3155]' : '')}
              onClick={() => { start.reset(); setParams({ ...viewParams, level: level.code }); }}>{level.code}</button>)}
          </div>
          {levels.isPending || (activeLevel && tests.isPending) || waitingForHistory ? <p role="status" className="mt-3 text-sm">Đang tải đề thi…</p> : null}
          {levels.isSuccess && levels.data.length === 0 && <p className="mt-3 text-sm">Chưa có cấp độ thi thử.</p>}
        </section>
        {unfinished && activeLevel && history.isError && <p role="alert" className={card}>
          Không tải được trạng thái đề thi.{' '}
          <button className={linkClass} type="button" onClick={() => history.refetch()}>Thử lại</button>
        </p>}
        {showTests && (visibleTests.length ? <ul className="space-y-3">
          {visibleTests.map(test => <li key={test.mockTestId} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0">
              <h3 className="font-semibold">{test.title}</h3>
              {test.timeLimitMinutes > 0 && <p className="text-sm text-[#765E6B]">{test.timeLimitMinutes} phút</p>}
              {test.description && <p className="mt-1 text-sm text-[#765E6B]">{test.description}</p>}
            </div>
            <button className={button} type="button" disabled={start.isPending} onClick={() => start.mutate(test.mockTestId)}>
              {start.isPending && start.variables === test.mockTestId ? 'Đang mở đề…' : 'Bắt đầu thi thử'}
            </button>
          </li>)}
        </ul> : <p className={card}>{unfinished && tests.data.length > 0
          ? 'Bạn đã hoàn thành tất cả đề thi thử ' + activeLevel.code + '.'
          : 'Chưa có đề thi thử ' + activeLevel?.code + '.'}</p>)}
      </>}
    </main>
  </LearnerShell>;
}
