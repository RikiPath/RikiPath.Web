import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ListChecks, Send, Timer } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import {
  getMockTestAttempt,
  getMockTestLevels,
  getMockTestQuestions,
  getMockTestReview,
  getMockTestsByLevel,
  saveMockTestAnswers,
  startMockTest,
  submitMockTestAttempt,
} from '@/features/mock-test/api/mockTestApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  BlockingOverlay,
  Button,
  Card,
  Checkbox,
  ContextualErrorState,
  CustomSelect,
  EmptyState,
  Input,
  PageContainer,
  PageHeader,
  Radio,
  SakuraLoader,
  StaleDataBar,
  Tabs,
  confirmAction,
  notify,
  useOnlineStatus,
  useUnsavedGuard,
} from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

function formatPercent(v) {
  return new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 2 }).format(v);
}

function answerItem(questionId, value) {
  return typeof value === 'number' ? { questionId, selectedOptionId: value } : { questionId, response: value };
}

function hasAnswerValue(value) {
  if (value == null) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => item != null && String(item).trim().length > 0);
  if (typeof value === 'object') {
    return Object.values(value).some((item) => item != null && String(item).trim().length > 0);
  }
  return false;
}

function formatAnswerKey(answerKey) {
  if (answerKey == null) return '';
  if (typeof answerKey === 'string' || typeof answerKey === 'number') return String(answerKey);
  if (Array.isArray(answerKey)) {
    return answerKey
      .map((item) => (typeof item === 'object' && item !== null ? item.text ?? item.label ?? item.content ?? '' : String(item)))
      .filter(Boolean)
      .join(' · ');
  }
  if (typeof answerKey === 'object') {
    if (Array.isArray(answerKey.tokens)) return answerKey.tokens.join(' ');
    if (Array.isArray(answerKey.blanks)) return answerKey.blanks.join(' / ');
    return Object.entries(answerKey)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return '';
}

function optionContent(option, label) {
  return (
    <span className="min-w-0 whitespace-pre-wrap">
      {option.content ?? option.optionText}
      {option.imageUrl && <img src={option.imageUrl} alt={label} className="mt-1 max-h-44 max-w-full rounded-md" />}
    </span>
  );
}

function MockAnswer({ question, value, onChange }) {
  const { tr, trf } = useLocale();
  const type = question.questionType?.toLowerCase();
  const data = question.interactionData;

  if (type === 'ordering') return <OrderingAnswer question={question} value={value} onChange={onChange} />;

  if (question.options?.length) {
    const multiple = type === 'multiplechoice';
    const choices = multiple && Array.isArray(value) ? value : [];
    return (
      <div className="mt-3 grid gap-2">
        {multiple && <p className="text-xs text-rp-text-2">{tr('Chọn tất cả đáp án phù hợp.')}</p>}
        {question.options.map((option, index) => {
          const id = option.optionId;
          const checked = multiple ? choices.includes(id) : value === id;
          const imgLabel = trf('Hình đáp án {0}', { 0: index + 1 });
          return multiple ? (
            <div
              key={id}
              className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                checked ? 'border-rp-brand bg-rp-brand-tint' : 'border-rp-line hover:bg-rp-brand-tint/40'
              }`}
            >
              <Checkbox
                checked={checked}
                onChange={() =>
                  onChange(multiple ? (checked ? choices.filter((item) => item !== id) : [...choices, id]) : id)
                }
                label={optionContent(option, imgLabel)}
              />
            </div>
          ) : (
            <div
              key={id}
              className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                checked ? 'border-rp-brand bg-rp-brand-tint' : 'border-rp-line hover:bg-rp-brand-tint/40'
              }`}
            >
              <Radio
                name={`mock-${question.questionId}`}
                checked={checked}
                onChange={() => onChange(id)}
                label={optionContent(option, imgLabel)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'matching') {
    const validChoice = (item) => item != null && ['string', 'number'].includes(typeof (item.id ?? item));
    const left = Array.isArray(data?.left) ? data.left.filter(validChoice) : [];
    const right = Array.isArray(data?.right) ? data.right.filter(validChoice) : [];
    if (!left.length || !right.length) {
      return <p className="mt-3 text-sm text-rp-text-muted">{tr('Câu ghép cặp chưa có dữ liệu lựa chọn để hiển thị.')}</p>;
    }
    const rightOptions = [
      { value: '', label: tr('Chọn vế tương ứng') },
      ...right.map((option) => ({
        value: String(option.id ?? option),
        label: String(option.text ?? option.label ?? option.id ?? option),
      })),
    ];
    return (
      <div className="mt-3 grid gap-2.5">
        {left.map((item) => {
          const key = String(item.id ?? item);
          return (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-medium text-rp-text">{item.text ?? item.label ?? key}</span>
              <div className="w-60 max-w-full">
                <CustomSelect
                  size="sm"
                  value={value?.[key] != null ? String(value[key]) : ''}
                  onChange={(selected) => {
                    const next = { ...value };
                    const match = right.find((option) => String(option.id ?? option) === selected);
                    if (match === undefined) delete next[key];
                    else next[key] = match.id ?? match;
                    onChange(next);
                  }}
                  options={rightOptions}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const blanks = type === 'fillblank' && Array.isArray(data?.blanks) ? data.blanks : null;
  if (blanks?.length) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {blanks.map((_, index) => (
          <div key={index} className="w-40 max-w-full">
            <Input
              aria-label={trf('Ô trống {0}', { 0: index + 1 })}
              placeholder={trf('Ô trống {0}', { 0: index + 1 })}
              value={value?.[index] ?? ''}
              onChange={(event) =>
                onChange(blanks.map((_, position) => (position === index ? event.target.value : value?.[position] ?? '')))
              }
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <label className="mt-3 block space-y-1.5 text-sm">
      <span className="text-xs font-semibold text-rp-text-muted">{tr('Câu trả lời')}</span>
      <Input value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function MockAttempt({ attempt, onComplete }) {
  const { tr, trf } = useLocale();
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(
      attempt.questions
        .filter((question) => question.selectedOptionId != null || question.response != null)
        .map((question) => [question.questionId, question.selectedOptionId ?? question.response]),
    ),
  );
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const submission = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const autoSubmitted = useRef(false);
  const deadline = attempt.localDeadline;
  const remaining = useCallback(
    () => (deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
    [deadline],
  );
  const [seconds, setSeconds] = useState(remaining);

  useUnsavedGuard(!pending && seconds !== 0);

  useEffect(() => {
    if (deadline == null) return undefined;
    const timer = setInterval(() => setSeconds(remaining()), 250);
    return () => clearInterval(timer);
  }, [deadline, remaining]);

  function choose(questionId, value) {
    if (submission.current || remaining() === 0) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setError('');
    setSaveState('saving');
    saveQueue.current = saveQueue.current
      .then(() => saveMockTestAnswers(attempt.attemptId, [answerItem(questionId, value)]))
      .then(() => {
        setSaveState('saved');
      })
      .catch((err) => {
        if (!['MOCK_TEST_EXPIRED', 'MOCK_TEST_COMPLETED'].includes(err?.data?.errorCode)) {
          setSaveState('error');
          setError(describeApiError(err, tr('Chưa lưu được câu trả lời.')));
        }
      });
  }

  const submit = useCallback(async () => {
    if (submission.current) return;
    submission.current = true;
    setPending(true);
    setError('');
    const toastKey = `mock-submit-${attempt.attemptId}`;
    notify.loading(tr('Đang nộp bài thi thử…'), '', { key: toastKey, maxWaitMs: 30000 });
    try {
      await saveQueue.current;
      const items = Object.entries(answers).map(([questionId, value]) => answerItem(Number(questionId), value));
      const result = await submitMockTestAttempt(attempt.attemptId, items).catch((err) => {
        if (err?.data?.errorCode === 'MOCK_TEST_COMPLETED') return getMockTestAttempt(attempt.attemptId);
        throw err;
      });
      notify.success(tr('Đã nộp bài thi thử thành công!'), '', { key: toastKey, replace: true });
      onComplete(result);
    } catch (err) {
      setError(describeApiError(err, tr('Chưa nộp được bài thi thử.')));
      notify.apiError(err, tr('Chưa nộp được bài thi thử'), { key: toastKey, replace: true });
    } finally {
      submission.current = false;
      setPending(false);
    }
  }, [answers, attempt.attemptId, onComplete, tr]);

  const online = useOnlineStatus();
  const answeredCount = attempt.questions.filter((q) => hasAnswerValue(answers[q.questionId])).length;
  const unanswered = attempt.questions.length - answeredCount;

  async function askSubmit() {
    const ok = await confirmAction({
      title: tr('Nộp bài thi thử?'),
      description:
        unanswered > 0
          ? trf('Bạn còn {0} câu chưa trả lời. Sau khi nộp, bạn không thể sửa bài.', { 0: unanswered })
          : tr('Bạn đã trả lời tất cả câu hỏi. Sau khi nộp, bạn không thể sửa bài.'),
      confirmLabel: tr('Nộp bài'),
      cancelLabel: tr('Tiếp tục làm bài'),
      tone: unanswered > 0 ? 'warning' : 'info',
    });
    if (ok) void submit();
  }

  useEffect(() => {
    if (seconds !== 0 || autoSubmitted.current || pending || !online) return;
    autoSubmitted.current = true;
    void submit();
  }, [online, pending, seconds, submit]);

  return (
    <>
      <Card>
        <h2 className="text-lg font-bold text-rp-text">
          {attempt.title ? tr(attempt.title) : trf('Đề thi thử {0}', { 0: attempt.jlptLevelName })}
        </h2>
        <p className="mt-1 text-sm text-rp-text-2">
          {trf('{0} câu', { 0: attempt.questions.length })}
          {attempt.timeLimitMinutes > 0 && ` · ${trf('{0} phút', { 0: attempt.timeLimitMinutes })}`}
        </p>
      </Card>

      <BlockingOverlay open={pending} label={tr('Đang nộp bài, vui lòng không đóng trang')} />

      {!online && (
        <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')}>
          {seconds === 0
            ? tr('Hết giờ làm bài nhưng đang mất mạng. Hãy kết nối mạng rồi bấm Nộp bài đã hết giờ.')
            : tr('Câu trả lời mới chưa được lưu lên máy chủ. Hãy kết nối mạng trước khi nộp bài.')}
        </Banner>
      )}

      <div
        className="sticky top-[calc(var(--spacing-rp-topbar)+8px)] z-10 flex flex-wrap items-center justify-between gap-3 rounded-rp-card border border-rp-line bg-rp-surface/95 px-4 py-2.5 text-sm shadow-rp-card backdrop-blur"
        role="status"
        aria-live="off"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-rp-text-2">
            <ListChecks aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
            {tr('Đã làm')}{' '}
            <strong className="tabular-nums text-rp-text">
              {answeredCount}/{attempt.questions.length}
            </strong>
            {unanswered > 0 && <span className="text-rp-warning">{trf('· còn {0} câu', { 0: unanswered })}</span>}
          </span>
          {saveState === 'saving' && (
            <Badge tone="neutral" size="sm" icon={false}>
              {tr('Đang lưu…')}
            </Badge>
          )}
          {saveState === 'saved' && (
            <Badge tone="success" size="sm" icon={false}>
              {tr('Đã lưu')}
            </Badge>
          )}
        </div>

        {seconds != null && (
          <span className={`flex items-center gap-2 ${seconds <= 300 ? 'text-rp-danger' : 'text-rp-text-2'}`}>
            <Timer aria-hidden="true" className="h-4 w-4" />
            {tr('Thời gian còn lại')}
            <strong className="tabular-nums text-base">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </strong>
          </span>
        )}
      </div>

      <details className="rounded-rp-card border border-rp-line bg-rp-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-rp-text">{tr('Chuyển đến câu hỏi')}</summary>
        <nav aria-label={tr('Danh sách câu hỏi thi thử')} className="mt-3 flex flex-wrap gap-2">
          {attempt.questions.map((question, index) => {
            const done = hasAnswerValue(answers[question.questionId]);
            return (
              <a
                key={question.questionId}
                href={`#mock-question-${question.questionId}`}
                aria-label={trf('Câu {0}{1}', { 0: index + 1, 1: done ? tr(' (đã làm)') : tr(' (chưa làm)') })}
                className={`rp-focus rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  done
                    ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                    : 'border-dashed border-rp-line text-rp-text-2 hover:bg-rp-brand-tint/40'
                }`}
              >
                {index + 1}
              </a>
            );
          })}
        </nav>
        <p className="mt-2 text-xs text-rp-text-muted">{tr('Ô tô màu: đã trả lời · Ô viền đứt: chưa trả lời')}</p>
      </details>

      {attempt.questions.map((question, index) => (
        <div key={question.questionId} className="space-y-2">
          {(index === 0 || attempt.questions[index - 1].mockTestSectionId !== question.mockTestSectionId) && (
            <h3 className="mt-4 text-base font-bold text-rp-text">{question.sectionTitle}</h3>
          )}
          <fieldset
            id={`mock-question-${question.questionId}`}
            className="scroll-mt-28 rounded-rp-card border border-rp-line bg-rp-surface p-5"
            disabled={pending || seconds === 0}
          >
            <legend className="px-2 text-xs font-semibold text-rp-brand-strong">
              {trf('Câu {0}', { 0: index + 1 })}
            </legend>
            <p className="whitespace-pre-wrap text-sm font-medium text-rp-text">{question.content}</p>
            {question.imageUrl && (
              <img src={question.imageUrl} alt={tr('Hình minh họa câu hỏi')} className="mt-3 max-h-80 max-w-full rounded-lg" />
            )}
            {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mt-3 w-full" />}
            <MockAnswer
              question={question}
              value={answers[question.questionId]}
              onChange={(value) => choose(question.questionId, value)}
            />
          </fieldset>
        </div>
      ))}

      {error && (
        <Banner tone="danger" title={tr('Chưa lưu/nộp được bài')}>
          {error}
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {seconds === 0 ? (
          <Button type="button" variant="primary" loading={pending} disabled={pending || !online} onClick={submit}>
            {pending ? tr('Đang nộp bài…') : tr('Nộp bài đã hết giờ')}
          </Button>
        ) : (
          <Button type="button" icon={Send} loading={pending} disabled={!online} onClick={askSubmit}>
            {tr('Nộp bài thi thử')}
          </Button>
        )}
      </div>
    </>
  );
}

function MockResult({ result, userId, returnToList }) {
  const { tr, trf } = useLocale();
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('wrong');

  const review = useQuery({
    queryKey: ['mock-test-review', userId, result.attemptId],
    queryFn: () => getMockTestReview(result.attemptId),
    enabled: showReview,
    retry: false,
  });

  const allQuestions = review.data?.questions ?? [];
  const wrong = allQuestions.filter((question) => !question.isCorrect);
  const visibleQuestions = reviewFilter === 'wrong' ? wrong : allQuestions;

  return (
    <>
      <Card>
        <h2 className="text-base font-bold text-rp-text">{tr('Kết quả thi thử')}</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums text-rp-brand-strong">{formatPercent(result.totalScore)}%</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {result.sections?.map((section) => (
            <li key={section.mockTestSectionId} className="rounded-xl border border-rp-line bg-rp-brand-tint p-3">
              {trf('{0} · {1}/{2} câu đúng', { 0: section.sectionTitle, 1: section.correctCount, 2: section.totalCount })}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => setShowReview((value) => !value)}>
            {showReview ? tr('Ẩn xem lại đáp án') : tr('Xem lại câu làm')}
          </Button>
          <Link className="rp-link text-sm font-semibold" to="/exam-result/">
            {tr('Lịch sử và so sánh')}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={returnToList}>
            {tr('Chọn đề khác')}
          </Button>
        </div>
      </Card>

      {showReview && (
        <div className="space-y-4">
          {review.isSuccess && allQuestions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                variant="pill"
                value={reviewFilter}
                onChange={setReviewFilter}
                tabs={[
                  { value: 'wrong', label: `${tr('Câu sai')} (${wrong.length})` },
                  { value: 'all', label: `${tr('Tất cả')} (${allQuestions.length})` },
                ]}
              />
            </div>
          )}

          {review.isPending && <SakuraLoader variant="section" context="mocktest" delay={160} />}

          {review.isError && (
            <ContextualErrorState
              variant="inline"
              compact
              error={review.error}
              title={tr('Chưa tải được phần xem lại câu hỏi')}
              onRetry={() => review.refetch()}
              retrying={review.isFetching}
            />
          )}

          {review.isSuccess && reviewFilter === 'wrong' && wrong.length === 0 && (
            <Card>
              <p className="text-sm font-medium text-rp-success">{tr('Bạn đã làm đúng tất cả các câu.')}</p>
            </Card>
          )}

          {visibleQuestions.map((question, idx) => {
            const answerKeyText = formatAnswerKey(question.answerKey);
            return (
              <Card key={question.questionId} className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={question.isCorrect ? 'success' : 'danger'} size="sm" icon={false}>
                    {question.isCorrect ? tr('Đúng') : tr('Sai')}
                  </Badge>
                  <span className="text-xs text-rp-text-muted">#{idx + 1}</span>
                </div>
                <p className="whitespace-pre-wrap font-semibold text-rp-text">{question.questionText}</p>
                {question.options
                  ?.filter((option) => option.isCorrect)
                  .map((option) => (
                    <div key={option.optionId} className="text-rp-success">
                      <span className="font-semibold">{tr('Đáp án đúng ·')}{' '}</span>
                      {optionContent(option, tr('Hình đáp án đúng'))}
                    </div>
                  ))}
                {answerKeyText && (
                  <p className="text-rp-success">
                    <span className="font-semibold">{tr('Đáp án đúng ·')}{' '}</span>
                    {answerKeyText}
                  </p>
                )}
                {question.explanation && <p className="whitespace-pre-wrap text-rp-text-2">{question.explanation}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
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
  const activeLevel = levels.data?.find((level) => level.code === levelCode) ?? levels.data?.[0];
  const tests = useQuery({
    queryKey: ['mock-tests-by-level', activeLevel?.id],
    queryFn: () => getMockTestsByLevel(activeLevel.id),
    enabled: !attemptId && Boolean(activeLevel),
  });

  const current = useQuery({
    queryKey: attemptKey,
    enabled: Boolean(attemptId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      try {
        return { attempt: await getMockTestQuestions(attemptId) };
      } catch (err) {
        if (err?.data?.errorCode !== 'MOCK_TEST_COMPLETED') throw err;
        return { result: await getMockTestAttempt(attemptId) };
      }
    },
  });

  const start = useMutation({
    mutationFn: startMockTest,
    onSuccess: (attempt) => {
      queryClient.setQueryData(['mock-test-page', user?.userId, attempt.attemptId], { attempt });
      setParams({ level: activeLevel?.code || '', attemptId: String(attempt.attemptId) });
    },
    onError: (err) => notify.apiError(err, tr('Không thể bắt đầu bài thi thử'), { key: 'mock-start-err' }),
  });

  const complete = useCallback(
    (result) => {
      queryClient.setQueryData(['mock-test-page', user?.userId, result.attemptId], { result });
      void queryClient.invalidateQueries({ queryKey: ['mock-test-history', user?.userId] });
    },
    [queryClient, user?.userId],
  );

  const returnToList = () => {
    start.reset();
    setParams(levelCode ? { level: levelCode } : {});
  };

  const blockingError = !attemptId
    ? levels.isError
      ? levels.error
      : tests.isError
        ? tests.error
        : null
    : !current.data && current.isError
      ? current.error
      : null;

  const retryBlocking = () => {
    if (attemptId) return current.refetch();
    if (levels.isError) return levels.refetch();
    return tests.refetch();
  };

  return (
    <LearnerShell breadcrumb={tr('Thi thử')}>
      <PageContainer data-page="MockTestPage" width="default" className="space-y-4">
        <PageHeader
          eyebrow="JLPT N5 – N1"
          title={tr('Thi thử JLPT')}
          description={tr('Làm bài theo thời gian thực để đo mức độ sẵn sàng từng kỹ năng.')}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link className="rp-link text-sm font-semibold" to="/exam-result/">
                {tr('Lịch sử & kết quả')}
              </Link>
              <Link className="rp-link text-sm font-semibold" to="/app/placement-test/">
                {tr('Đánh giá năng lực')}
              </Link>
            </div>
          }
        />

        {start.error && (
          <Banner tone="danger">{describeApiError(start.error, tr('Không thể bắt đầu bài thi thử.'))}</Banner>
        )}

        {blockingError && (
          <Card>
            <ContextualErrorState
              compact
              error={blockingError}
              title={attemptId ? tr('Chưa tải được bài thi thử') : tr('Chưa tải được danh sách đề thi thử')}
              onRetry={retryBlocking}
              retrying={attemptId ? current.isFetching : levels.isFetching || tests.isFetching}
              action={
                attemptId ? (
                  <Button variant="ghost" size="sm" onClick={returnToList}>
                    {tr('Về danh sách đề')}
                  </Button>
                ) : null
              }
            />
          </Card>
        )}

        {attemptId && current.isPending && !current.data && <SakuraLoader variant="section" context="mocktest" delay={160} />}

        {current.data?.attempt && current.isError && (
          <StaleDataBar onRetry={() => current.refetch()} retrying={current.isFetching} />
        )}

        {current.data?.attempt && <MockAttempt key={attemptId} attempt={current.data.attempt} onComplete={complete} />}
        {current.data?.result && (
          <MockResult key={attemptId} result={current.data.result} userId={user?.userId} returnToList={returnToList} />
        )}

        {!attemptId && (
          <>
            <Card>
              <h2 className="text-sm font-semibold text-rp-text">{tr('Chọn cấp độ JLPT')}</h2>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={tr('Cấp độ thi thử')}>
                {levels.data?.map((level) => {
                  const active = activeLevel?.id === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      aria-pressed={active}
                      disabled={start.isPending}
                      className={`rp-focus rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                          : 'border-rp-line bg-rp-surface text-rp-text-2 hover:bg-rp-brand-tint/40'
                      }`}
                      onClick={() => {
                        start.reset();
                        setParams({ level: level.code });
                      }}
                    >
                      {level.code}
                    </button>
                  );
                })}
              </div>
              {(levels.isPending || (activeLevel && tests.isLoading)) && (
                <SakuraLoader variant="section" context="mocktest" delay={160} className="mt-3" />
              )}
              {levels.isSuccess && levels.data.length === 0 && (
                <p className="mt-3 text-sm text-rp-text-muted">{tr('Chưa có cấp độ thi thử.')}</p>
              )}
            </Card>

            {tests.isSuccess &&
              (tests.data.length ? (
                <ul className="space-y-3">
                  {tests.data.map((test) => (
                    <li key={test.mockTestId}>
                      <Card className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-rp-text">{tr(test.title)}</h3>
                            {test.timeLimitMinutes > 0 && (
                              <Badge tone="neutral" size="sm" icon={false}>
                                {trf('{0} phút', { 0: test.timeLimitMinutes })}
                              </Badge>
                            )}
                            {test.questionCount > 0 && (
                              <Badge tone="neutral" size="sm" icon={false}>
                                {trf('{0} câu', { 0: test.questionCount })}
                              </Badge>
                            )}
                          </div>
                          {test.description && <p className="text-sm text-rp-text-2">{tr(test.description)}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={start.isPending}
                          loading={start.isPending && start.variables === test.mockTestId}
                          onClick={() => start.mutate(test.mockTestId)}
                        >
                          {start.isPending && start.variables === test.mockTestId
                            ? tr('Đang mở đề…')
                            : tr('Bắt đầu thi thử')}
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : (
                <Card>
                  <EmptyState
                    compact
                    title={trf('Chưa có đề thi thử {0}.', { 0: activeLevel?.code || '' })}
                    description={tr('Hãy chọn một cấp độ JLPT khác hoặc làm bài đánh giá năng lực.')}
                  />
                </Card>
              ))}
          </>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
