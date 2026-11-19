import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import {
  getMockTestAttempt, getMockTestLevels, getMockTestQuestions, getMockTestReview,
  getMockTestsByLevel, saveMockTestAnswers, startMockTest, submitMockTestAttempt,
} from '@/features/mock-test/api/mockTestApi.js';
import { ListChecks, Send, Timer } from 'lucide-react';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Banner,
  BlockingOverlay,
  Button,
  ContextualErrorState,
  SakuraLoader,
  StaleDataBar,
  confirmAction,
  notify,
  useOnlineStatus,
} from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const card = 'rounded-xl border border-rp-line bg-white p-5';
const button = 'inline-flex rounded-lg bg-rp-brand-strong px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';
const linkClass = 'text-sm font-semibold text-rp-brand-strong underline';
const input = 'rounded-lg border border-rp-line bg-white px-3 py-2 text-sm';
const percent = { format: (v) => new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 2 }).format(v) };

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
  const { tr } = useLocale();
  const type = question.questionType?.toLowerCase();
  const data = question.interactionData;
  if (type === 'ordering') return <OrderingAnswer question={question} value={value} onChange={onChange} />;
  if (question.options?.length) {
    const multiple = type === 'multiplechoice';
    const choices = multiple && Array.isArray(value) ? value : [];
    return <div className="mt-3 grid gap-2">
      {multiple && <p className="text-sm text-rp-text-2">{tr('Chọn tất cả đáp án phù hợp.')}</p>}
      {question.options.map((option, index) => {
        const id = option.optionId;
        const checked = multiple ? choices.includes(id) : value === id;
        return <label key={id} className="flex cursor-pointer gap-3 rounded-lg border border-rp-line px-3 py-2.5 text-sm has-checked:border-rp-brand-strong has-checked:bg-rp-brand-tint">
          <input type={multiple ? 'checkbox' : 'radio'} name={'mock-' + question.questionId} checked={checked}
            className="mt-1"
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
    if (!left.length || !right.length) return <p className="mt-3 text-sm">{tr('Câu ghép cặp chưa có dữ liệu lựa chọn để hiển thị.')}</p>;
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
            <option value="">{tr('Chọn vế tương ứng')}</option>
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
    <span>{tr('Câu trả lời')}</span>
    <input className={input + ' block w-full'} value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} />
  </label>;
}

function MockAttempt({ attempt, onComplete }) {
  const { tr, trf } = useLocale();
  const [answers, setAnswers] = useState(() => Object.fromEntries(attempt.questions
    .filter(question => question.selectedOptionId != null || question.response != null)
    .map(question => [question.questionId, question.selectedOptionId ?? question.response])));
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
    const toastKey = `mock-submit-${attempt.attemptId}`;
    notify.loading('Đang nộp bài thi thử…', '', { key: toastKey, maxWaitMs: 30000 });
    try {
      await saveQueue.current;
      const items = Object.entries(answers).map(([questionId, value]) => answerItem(Number(questionId), value));
      const result = await submitMockTestAttempt(attempt.attemptId, items).catch(error => {
        if (error.data?.errorCode === 'MOCK_TEST_COMPLETED') return getMockTestAttempt(attempt.attemptId);
        throw error;
      });
      notify.success('Đã nộp bài thi thử thành công!', '', { key: toastKey, replace: true });
      onComplete(result);
    } catch (error) {
      setError(error.message);
      notify.apiError(error, 'Chưa nộp được bài thi thử', { key: toastKey, replace: true });
    } finally {
      submission.current = false;
      setPending(false);
    }
  }, [answers, attempt.attemptId, onComplete]);

  const online = useOnlineStatus();
  const answeredCount = attempt.questions.filter((q) => answers[q.questionId] != null && answers[q.questionId] !== '').length;
  const unanswered = attempt.questions.length - answeredCount;

  // Warn before closing the tab while the attempt is in progress (answers are also saved per question).
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (submission.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  async function askSubmit() {
    const ok = await confirmAction({
      title: 'Nộp bài thi thử?',
      description: unanswered > 0
        ? trf('Bạn còn {0} câu chưa trả lời. Sau khi nộp, bạn không thể sửa bài.', { 0: unanswered })
        : 'Bạn đã trả lời tất cả câu hỏi. Sau khi nộp, bạn không thể sửa bài.',
      confirmLabel: 'Nộp bài',
      cancelLabel: 'Tiếp tục làm bài',
      tone: unanswered > 0 ? 'warning' : 'info',
    });
    if (ok) void submit();
  }

  useEffect(() => {
    if (seconds !== 0 || autoSubmitted.current || pending) return;
    autoSubmitted.current = true;
    void submit();
  }, [pending, seconds, submit]);

  return <>
    <section className={card}>
      <h2 className="font-bold">{attempt.title || 'Đề thi thử ' + attempt.jlptLevelName}</h2>
      <p className="mt-1 text-sm text-rp-text-2">{attempt.questions.length}{' '}{tr('câu')}{attempt.timeLimitMinutes > 0 && ' · ' + attempt.timeLimitMinutes + ' phút'}</p>
    </section>
    <BlockingOverlay open={pending} label={tr('Đang nộp bài, vui lòng không đóng trang')} />
    {!online && <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')}>{tr('Câu trả lời mới chưa được lưu lên máy chủ. Hãy kết nối mạng trước khi nộp bài.')}</Banner>}
    <div className="sticky top-[72px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-rp-input border border-rp-line bg-rp-surface/95 px-4 py-2.5 text-sm shadow-rp-card backdrop-blur" role="status" aria-live="off">
      <span className="flex items-center gap-2 text-rp-text-2">
        <ListChecks aria-hidden="true" className="h-4 w-4 text-tone-mock" />
        {tr('Đã làm')}{' '}<strong className="tabular-nums text-rp-text">{answeredCount}/{attempt.questions.length}</strong>
        {unanswered > 0 && <span className="text-rp-warning">{trf('· còn {0} câu', { 0: unanswered })}</span>}
      </span>
      {seconds != null && (
        <span className={`flex items-center gap-2 ${seconds <= 300 ? 'text-rp-danger' : 'text-rp-text-2'}`}>
          <Timer aria-hidden="true" className="h-4 w-4" />
          {tr('Thời gian còn lại')}
          <strong className="tabular-nums text-base">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>
        </span>
      )}
    </div>
    <details className={card}>
      <summary className="cursor-pointer text-sm font-semibold">{tr('Chuyển đến câu hỏi')}</summary>
      <nav aria-label={tr('Danh sách câu hỏi thi thử')} className="mt-3 flex flex-wrap gap-2">
        {attempt.questions.map((question, index) => <a key={question.questionId} href={'#mock-question-' + question.questionId}
          aria-label={trf('Câu {0}{1}', { 0: index + 1, 1: answers[question.questionId] != null ? ' (đã làm)' : ' (chưa làm)' })}
          className={input + (answers[question.questionId] != null ? ' border-rp-brand-border bg-rp-brand-tint font-semibold text-rp-brand-strong' : ' border-dashed')}>{index + 1}</a>)}
      </nav>
      <p className="mt-2 text-xs text-rp-text-muted">{tr('Ô tô màu: đã trả lời · Ô viền đứt: chưa trả lời')}</p>
    </details>
    {attempt.questions.map((question, index) => <div key={question.questionId} className="space-y-2">
      {(index === 0 || attempt.questions[index - 1].mockTestSectionId !== question.mockTestSectionId) &&
        <h3 className="mt-4 text-lg font-semibold">{question.sectionTitle}</h3>}
      <fieldset id={'mock-question-' + question.questionId} className={card + ' scroll-mt-28'} disabled={pending || seconds === 0}>
        <legend className="px-2 text-xs font-semibold text-rp-brand-strong">{trf('Câu {0}', { 0: index + 1 })}</legend>
        <p className="whitespace-pre-wrap text-sm font-medium">{question.content}</p>
        {question.imageUrl && <img src={question.imageUrl} alt={tr('Hình minh họa câu hỏi')} className="mt-3 max-h-80 max-w-full rounded-lg" />}
        {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mt-3 w-full" />}
        <MockAnswer question={question} value={answers[question.questionId]} onChange={value => choose(question.questionId, value)} />
      </fieldset>
    </div>)}
    {error && <Banner tone="danger" title={tr('Chưa lưu/nộp được bài')}>{error}</Banner>}
    <div className="flex flex-wrap items-center justify-end gap-3">
      {seconds === 0 ? <button className={button} disabled={pending} type="button" onClick={submit}>
        {pending ? tr('Đang nộp bài…') : tr('Nộp bài đã hết giờ')}
      </button> : <Button type="button" icon={Send} loading={pending} disabled={!online} onClick={askSubmit}>{tr('Nộp bài thi thử')}</Button>}
    </div>
  </>;
}

function MockResult({ result, userId, returnToList }) {
  const { tr, trf } = useLocale();
  const [showReview, setShowReview] = useState(false);
  const review = useQuery({
    queryKey: ['mock-test-review', userId, result.attemptId], queryFn: () => getMockTestReview(result.attemptId),
    enabled: showReview, retry: false,
  });
  const wrong = review.data?.questions?.filter(question => !question.isCorrect) ?? [];
  return <>
    <section className={card}>
      <h2 className="font-bold">{tr('Kết quả thi thử')}</h2>
      <p className="mt-2 text-3xl font-bold text-rp-brand-strong">{percent.format(result.totalScore)}%</p>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {result.sections?.map(section => <li key={section.mockTestSectionId} className="rounded-lg bg-rp-brand-tint p-3">
          {trf('{0} · {1}/{2} câu đúng', { 0: section.sectionTitle, 1: section.correctCount, 2: section.totalCount })}
        </li>)}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={button} type="button" onClick={() => setShowReview(value => !value)}>{showReview ? tr('Ẩn câu sai') : tr('Xem câu sai')}</button>
        <Link className={linkClass} to="/exam-result/">{tr('Lịch sử và so sánh')}</Link>
        <button className={linkClass} type="button" onClick={returnToList}>{tr('Chọn đề khác')}</button>
      </div>
    </section>
    {showReview && <>
      {review.isPending && <SakuraLoader variant="section" context="mocktest" delay={160} />}
      {review.isError && (
        <ContextualErrorState
          variant="inline"
          compact
          error={review.error}
          title={tr('Chưa tải được phần xem câu sai')}
          onRetry={() => review.refetch()}
          retrying={review.isFetching}
        />
      )}
      {review.isSuccess && wrong.length === 0 && <p className={card}>{tr('Bạn đã làm đúng tất cả các câu.')}</p>}
      {wrong.map(question => <article key={question.questionId} className={card + ' space-y-2 text-sm'}>
        <p className="whitespace-pre-wrap font-semibold">{question.questionText}</p>
        {question.options?.filter(option => option.isCorrect).map(option => <div key={option.optionId} className="text-emerald-800">
          <span>{tr('Đáp án đúng ·')}{' '}</span>{optionContent(option, 'Hình đáp án đúng')}
        </div>)}
        {question.answerKey != null && <p>{tr('Đáp án đúng ·')}{' '}{Array.isArray(question.answerKey) && question.answerKey.every(value => typeof value === 'string')
          ? question.answerKey.join(' / ') : typeof question.answerKey === 'string' ? question.answerKey : JSON.stringify(question.answerKey)}</p>}
        {question.explanation && <p className="whitespace-pre-wrap text-rp-text-2">{question.explanation}</p>}
      </article>)}
    </>}
  </>;
}

export default function MockTestPage() {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const attemptId = Number(params.get('attemptId')) || null;
  const levelCode = params.get('level');
  const attemptKey = ['mock-test-page', user?.userId, attemptId];
  const levels = useQuery({ queryKey: ['mock-test-levels'], queryFn: getMockTestLevels, enabled: !attemptId });
  const activeLevel = levels.data?.find(level => level.code === levelCode) ?? levels.data?.[0];
  const tests = useQuery({
    queryKey: ['mock-tests-by-level', activeLevel?.id], queryFn: () => getMockTestsByLevel(activeLevel.id),
    enabled: !attemptId && Boolean(activeLevel),
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
    onError: err => notify.apiError(err, 'Không thể bắt đầu bài thi thử', { key: 'mock-start-err' }),
  });
  const complete = useCallback(result => {
    queryClient.setQueryData(['mock-test-page', user?.userId, result.attemptId], { result });
    void queryClient.invalidateQueries({ queryKey: ['mock-test-history', user?.userId] });
  }, [queryClient, user?.userId]);
  const returnToList = () => {
    start.reset();
    setParams(levelCode ? { level: levelCode } : {});
  };
  const blockingError = !attemptId
    ? (levels.isError ? levels.error : tests.isError ? tests.error : null)
    : (!current.data && current.isError ? current.error : null);
  const retryBlocking = () => {
    if (attemptId) return current.refetch();
    if (levels.isError) return levels.refetch();
    return tests.refetch();
  };

  return <LearnerShell breadcrumb={tr('Thi thử')}>
    <main data-page="MockTestPage" className="rp-container-reading space-y-4 py-6 text-rp-text lg:py-8">
      <header className={card + ' flex flex-wrap items-center justify-between gap-3'}>
        <h1 className="text-xl font-bold">{tr('Thi thử JLPT')}</h1>
        <Link className={linkClass} to="/app/placement-test/">{tr('Đánh giá năng lực')}</Link>
      </header>
      {start.error && (
        <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {tr(describeApiError(start.error).message)}
        </div>
      )}
      {blockingError && (
        <div className={card}>
          <ContextualErrorState
            compact
            error={blockingError}
            title={attemptId ? tr('Chưa tải được bài thi thử') : tr('Chưa tải được danh sách đề thi thử')}
            onRetry={retryBlocking}
            retrying={attemptId ? current.isFetching : levels.isFetching || tests.isFetching}
            action={attemptId ? <Button variant="ghost" size="sm" onClick={returnToList}>{tr('Về danh sách đề')}</Button> : null}
          />
        </div>
      )}
      {attemptId && current.isPending && !current.data && (
        <SakuraLoader variant="section" context="mocktest" delay={160} />
      )}
      {current.data?.attempt && current.isError && (
        <StaleDataBar onRetry={() => current.refetch()} retrying={current.isFetching} />
      )}
      {current.data?.attempt && <MockAttempt key={attemptId} attempt={current.data.attempt} onComplete={complete} />}
      {current.data?.result && <MockResult key={attemptId} result={current.data.result} userId={user?.userId} returnToList={returnToList} />}
      {!attemptId && <>
        <section className={card}>
          <h2 className="font-semibold">{tr('Chọn cấp độ và đề thi')}</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={tr('Cấp độ thi thử')}>
            {levels.data?.map(level => <button key={level.id} type="button" aria-pressed={activeLevel?.id === level.id}
              disabled={start.isPending} className={input + (activeLevel?.id === level.id ? ' border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong' : '')}
              onClick={() => { start.reset(); setParams({ level: level.code }); }}>{level.code}</button>)}
          </div>
          {levels.isPending || (activeLevel && tests.isLoading) ? (
          <SakuraLoader variant="section" context="mocktest" delay={160} className="mt-3" />
        ) : null}
          {levels.isSuccess && levels.data.length === 0 && <p className="mt-3 text-sm">{tr('Chưa có cấp độ thi thử.')}</p>}
        </section>
        {tests.isSuccess && (tests.data.length ? <ul className="space-y-3">
          {tests.data.map(test => <li key={test.mockTestId} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
            <div className="min-w-0">
              <h3 className="font-semibold">{tr(test.title)}</h3>
              {test.timeLimitMinutes > 0 && <p className="text-sm text-rp-text-2">{trf('{0} phút', { 0: test.timeLimitMinutes })}</p>}
              {test.description && <p className="mt-1 text-sm text-rp-text-2">{tr(test.description)}</p>}
            </div>
            <button className={button} type="button" disabled={start.isPending} onClick={() => start.mutate(test.mockTestId)}>
              {start.isPending && start.variables === test.mockTestId ? tr('Đang mở đề…') : tr('Bắt đầu thi thử')}
            </button>
          </li>)}
        </ul> : <p className={card}>{trf('Chưa có đề thi thử {0}.', { 0: activeLevel?.code })}</p>)}
      </>}
    </main>
  </LearnerShell>;
}
