import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, History } from 'lucide-react';
import { exportExamFile, triggerBlobDownload } from '@/features/content-author/api/contentAuthoringV2Api.js';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import ExamWorkspace from '@/features/mock-test/components/ExamWorkspace.jsx';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import {
  getMockTestAttempt,
  getMockTestLevels,
  getMockTestInfo,
  getMockTestQuestions,
  getMockTestReview,
  getMockTestsByLevel,
  saveMockTestAnswers,
  startMockTest,
  submitMockTestAttempt,
} from '@/features/mock-test/api/mockTestApi.js';
import { errorMessage as formatApiError } from '@/api/apiErrors.js';
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
  ProgressBar,
  Radio,
  SakuraLoader,
  StaleDataBar,
  Tabs,
  confirmAction,
  notify,
  useOnlineStatus,
  useUnsavedGuard,
} from '@/components/ui';
import { ControlGroup, filterSupportedJlptLevels, IllustratedPageHeader, LevelTabs } from '@/features/learner-ui';
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
              <Checkbox
                key={id}
                className={`min-h-12 w-full rounded-xl border px-3.5 py-2.5 transition-colors ${
                  checked ? 'border-rp-brand bg-rp-brand-tint' : 'border-rp-line hover:bg-rp-brand-tint/40'
                }`}
                checked={checked}
                onChange={() =>
                  onChange(multiple ? (checked ? choices.filter((item) => item !== id) : [...choices, id]) : id)
                }
                label={optionContent(option, imgLabel)}
              />
          ) : (
              <Radio
                key={id}
                className={`min-h-12 w-full rounded-xl border px-3.5 py-2.5 transition-colors ${
                  checked ? 'border-rp-brand bg-rp-brand-tint' : 'border-rp-line hover:bg-rp-brand-tint/40'
                }`}
                name={`mock-${question.questionId}`}
                checked={checked}
                onChange={() => onChange(id)}
                label={optionContent(option, imgLabel)}
              />
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
  const failedAnswers = useRef(new Map());
  const queuedSaves = useRef(0);
  const autoSubmitted = useRef(false);
  const [deadline, setDeadline] = useState(attempt.monotonicDeadline);
  const remaining = useCallback(
    () => (deadline == null ? null : Math.max(0, Math.ceil((deadline - performance.now()) / 1000))),
    [deadline],
  );
  const [seconds, setSeconds] = useState(remaining);

  useUnsavedGuard(!pending && seconds !== 0);

  useEffect(() => {
    if (deadline == null) return undefined;
    const timer = setInterval(() => setSeconds(remaining()), 250);
    return () => clearInterval(timer);
  }, [deadline, remaining]);

  useEffect(() => {
    const syncDeadline = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const latest = await getMockTestQuestions(attempt.attemptId);
        if (latest?.monotonicDeadline != null) setDeadline(latest.monotonicDeadline);
      } catch {
        // The next answer or submit request still enforces the server deadline.
      }
    };
    document.addEventListener('visibilitychange', syncDeadline);
    window.addEventListener('pageshow', syncDeadline);
    return () => {
      document.removeEventListener('visibilitychange', syncDeadline);
      window.removeEventListener('pageshow', syncDeadline);
    };
  }, [attempt.attemptId]);

  function choose(questionId, value) {
    if (submission.current || remaining() === 0) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    queueAnswer(questionId, value);
  }

  function queueAnswer(questionId, value) {
    setError('');
    setSaveState('saving');
    queuedSaves.current += 1;
    saveQueue.current = saveQueue.current
      .then(() => saveMockTestAnswers(attempt.attemptId, [answerItem(questionId, value)]))
      .then(() => {
        failedAnswers.current.delete(questionId);
      })
      .catch((err) => {
        if (!['MOCK_TEST_EXPIRED', 'MOCK_TEST_COMPLETED'].includes(err?.data?.errorCode)) {
          failedAnswers.current.set(questionId, value);
          setError(formatApiError(err, tr('Chưa lưu được câu trả lời.')));
        }
      })
      .finally(() => {
        queuedSaves.current -= 1;
        setSaveState(failedAnswers.current.size ? 'error' : queuedSaves.current ? 'saving' : 'saved');
      });
  }

  function retrySave() {
    for (const [questionId, value] of failedAnswers.current) queueAnswer(questionId, value);
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
      setError(formatApiError(err, tr('Chưa nộp được bài thi thử.')));
      notify.apiError(err, tr('Chưa nộp được bài thi thử'), { key: toastKey, replace: true });
    } finally {
      submission.current = false;
      setPending(false);
    }
  }, [answers, attempt.attemptId, onComplete, tr]);

  const online = useOnlineStatus();
  const answeredCount = attempt.questions.filter((q) => hasAnswerValue(answers[q.questionId])).length;
  const unanswered = attempt.questions.length - answeredCount;

  async function askSubmit({ flaggedCount = 0 } = {}) {
    const ok = await confirmAction({
      title: tr('Bạn đã sẵn sàng nộp bài?'),
      description: trf('Tổng {0} câu · đã làm {1} · chưa làm {2} · đánh dấu {3}. Sau khi nộp, bạn không thể sửa bài.', {
        0: attempt.questions.length, 1: answeredCount, 2: unanswered, 3: flaggedCount,
      }),
      confirmLabel: tr('Xác nhận nộp bài'),
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

  const clockLabel =
    seconds != null
      ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      : null;

  return (
    <>
      <BlockingOverlay open={pending} label={tr('Đang nộp bài, vui lòng không đóng trang')} />

      {!online && (
        <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')}>
          {seconds === 0
            ? tr('Hết giờ làm bài nhưng đang mất mạng. Hãy kết nối mạng rồi bấm Nộp bài đã hết giờ.')
            : tr('Câu trả lời mới chưa được lưu lên máy chủ. Hãy kết nối mạng trước khi nộp bài.')}
        </Banner>
      )}

      <ExamWorkspace
        title={attempt.title ? tr(attempt.title) : trf('Đề thi thử {0}', { 0: attempt.jlptLevelName })}
        subtitle={
          attempt.timeLimitMinutes > 0
            ? `${trf('{0} câu', { 0: attempt.questions.length })} · ${trf('{0} phút', { 0: attempt.timeLimitMinutes })}`
            : trf('{0} câu', { 0: attempt.questions.length })
        }
        questions={attempt.questions}
        isAnswered={(question) => hasAnswerValue(answers[question.questionId])}
        clockLabel={clockLabel}
        secondsLeft={seconds}
        urgentSecondsThreshold={300}
        saveState={saveState}
        pending={pending}
        expired={seconds === 0}
        offline={!online}
        errorMessage={error}
        onRetrySave={failedAnswers.current.size ? retrySave : undefined}
        submitLabel={tr('Nộp bài thi thử')}
        expiredSubmitLabel={tr('Nộp bài đã hết giờ')}
        onRequestSubmit={askSubmit}
        onExpiredSubmit={submit}
        renderQuestionBody={(question) => (
          <MockAnswer
            question={question}
            value={answers[question.questionId]}
            onChange={(value) => choose(question.questionId, value)}
          />
        )}
      />
    </>
  );
}

function MockResult({ result, userId, returnToList }) {
  const { tr } = useLocale();
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
  const weakestSection = result.sections?.filter((section) => Number(section.totalCount) > 0)
    .reduce((weakest, section) => !weakest || Number(section.score) < Number(weakest.score) ? section : weakest, null);

  return (
    <>
      <Card className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-rp-text">{tr('Kết quả thi thử (Simulated JLPT)')}</h2>
            {result.mockTestId && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                icon={Download}
                onClick={async () => {
                  try {
                    const { blob, fileName } = await exportExamFile(result.mockTestId, 'pdf', false);
                    triggerBlobDownload(blob, fileName);
                  } catch (err) {
                    notify.apiError(err, tr('Không tải được đề PDF'), { key: 'mock-pdf-err' });
                  }
                }}
              >
                {tr('Tải đề PDF')}
              </Button>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-rp-brand">{formatPercent(result.totalScore)}%</p>
        </div>
        <ProgressBar value={Number(result.totalScore) || 0} max={100} label={tr('Tổng điểm thi thử')} />
        <ul className="grid gap-2.5 text-sm sm:grid-cols-2">
          {result.sections?.map((section) => {
            const total = Number(section.totalCount) || 0;
            const correct = Number(section.correctCount) || 0;
            const pct = total > 0 ? Math.round((correct / total) * 100) : null;
            return (
              <li key={section.mockTestSectionId} className="space-y-1.5 rounded-rp-input border border-rp-line bg-rp-bg-2/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-rp-text">{section.sectionTitle}</span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-rp-text-muted">
                    {total > 0 ? `${correct}/${total} ${tr('câu đúng')}` : tr('Chưa đánh giá')}
                  </span>
                </div>
                {pct != null && <ProgressBar value={pct} max={100} label={section.sectionTitle} />}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" variant="primary" size="sm" onClick={() => setShowReview((value) => !value)}>
            {showReview ? tr('Ẩn xem lại đáp án') : tr('Xem lại câu làm')}
          </Button>
          <Link className="rp-focus rp-link text-sm font-semibold" to="/exam-result/">
            {tr('Lịch sử và so sánh')}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={returnToList}>
            {tr('Chọn đề khác')}
          </Button>
        </div>
      </Card>

      {weakestSection && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rp-brand-strong">{tr('Ưu tiên ôn tập')}</p>
            <p className="mt-1 font-semibold text-rp-text">{tr(weakestSection.sectionTitle)}</p>
            <p className="text-sm text-rp-text-muted">{tr('Ôn lại phần này để cải thiện kết quả ở lần luyện tập tiếp theo.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/lessons/" variant="secondary" size="sm">{tr('Khám phá bài học')}</Button>
            <Button as={Link} to="/roadmap/" variant="secondary" size="sm">{tr('Xem lộ trình học')}</Button>
          </div>
        </Card>
      )}

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
              <EmptyState
                variant="inline"
                size="sm"
                illustration="done"
                title={tr('Bạn đã làm đúng tất cả các câu.')}
              />
            </Card>
          )}

          {visibleQuestions.map((question, idx) => {
            const answerKeyText = formatAnswerKey(question.answerKey);
            const resolvedPassageText =
              question.passageText ||
              [question.interactionData?.passage, question.interactionData?.secondPassage]
                .filter((s) => typeof s === 'string' && s.trim())
                .join('\n\n---\n\n') ||
              '';
            return (
              <Card key={question.questionId} className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={question.isCorrect ? 'success' : 'danger'} size="sm" icon={false}>
                    {question.isCorrect ? tr('Đúng') : tr('Sai')}
                  </Badge>
                  <span className="text-xs text-rp-text-muted">#{idx + 1}</span>
                </div>
                {resolvedPassageText && (
                  <div className="rounded-lg border border-rp-line bg-slate-50 p-2.5 text-xs">
                    <p className="font-semibold text-rp-text">{question.passageTitle || tr('Đoạn đọc')}</p>
                    <p className="rp-jp mt-1 whitespace-pre-wrap">{resolvedPassageText}</p>
                  </div>
                )}
                <p className="whitespace-pre-wrap font-semibold text-rp-text">{question.questionText}</p>
                {question.reviewTranscript && (
                  <div className="rounded-lg border border-rp-line bg-slate-50 p-2.5 text-xs text-rp-text-2">
                    <strong>{tr('Transcript (mở sau nộp bài)')}:</strong>{' '}
                    <span className="rp-jp whitespace-pre-wrap">{question.reviewTranscript}</span>
                  </div>
                )}
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
  const selectedTestId = Number(params.get('testId')) || null;
  const levelCode = params.get('level');
  const attemptKey = ['mock-test-page', user?.userId, attemptId];

  const levels = useQuery({ queryKey: ['mock-test-levels'], queryFn: getMockTestLevels, enabled: !attemptId });
  const supportedLevels = filterSupportedJlptLevels(levels.data || []);
  const activeLevel = supportedLevels.find((level) => level.code === levelCode) ?? supportedLevels[0];
  const tests = useQuery({
    queryKey: ['mock-tests-by-level', activeLevel?.id],
    queryFn: () => getMockTestsByLevel(activeLevel.id),
    enabled: !attemptId && Boolean(activeLevel),
  });
  const testInfo = useQuery({
    queryKey: ['mock-test-info', selectedTestId],
    queryFn: () => getMockTestInfo(selectedTestId),
    enabled: !attemptId && Boolean(selectedTestId),
    retry: false,
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
        {(!attemptId || current.data?.result) && <IllustratedPageHeader
          icon="mock"
          tone="navy"
          eyebrow="JLPT N5 – N2"
          title={tr('Thi thử JLPT')}
          description={tr('Làm bài theo thời gian thực để đo mức độ sẵn sàng từng kỹ năng.')}
          actions={
            <ControlGroup>
              {!attemptId && !selectedTestId && levels.data?.length > 0 && (
                <LevelTabs
                  label={tr('Cấp độ thi thử')}
                  value={activeLevel?.code ?? ''}
                  onChange={(code) => {
                    if (start.isPending) return;
                    start.reset();
                    setParams({ level: code });
                  }}
                  levels={supportedLevels}
                />
              )}
              <Button as={Link} to="/exam-result/" variant="primary" size="md" icon={History}>
                {tr('Lịch sử & kết quả')}
              </Button>
            </ControlGroup>
          }
        />}

        {!attemptId && selectedTestId && (
          testInfo.isPending ? <SakuraLoader variant="section" context="mocktest" delay={160} /> :
          testInfo.isError ? (
            <Card><ContextualErrorState error={testInfo.error} onRetry={() => testInfo.refetch()}
              retrying={testInfo.isFetching} compact /></Card>
          ) : (
            <Card className="space-y-5">
              <div>
                <Badge tone="brand" icon={false}>{testInfo.data.jlptLevelName}</Badge>
                <h2 className="mt-2 text-xl font-bold text-rp-text">{tr(testInfo.data.title)}</h2>
                {testInfo.data.description && <p className="mt-1 text-sm text-rp-text-2">{tr(testInfo.data.description)}</p>}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-rp-text-2">
                <span>{trf('{0} phút', { 0: testInfo.data.timeLimitMinutes })}</span>
                <span>{trf('{0} câu', { 0: testInfo.data.questionCount })}</span>
              </div>
              <ul className="divide-y divide-rp-line rounded-xl border border-rp-line">
                {testInfo.data.sections.map((section, index) => (
                  <li key={`${section.title}-${index}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-rp-text">{tr(section.title)}</span>
                    <span className="text-rp-text-muted">{trf('{0} câu', { 0: section.questionCount })}{section.requiresAudio ? ` · ${tr('Cần nghe audio')}` : ''}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-rp-text-2">{tr('Đồng hồ bắt đầu khi bạn xác nhận làm bài. Tải lại trang sẽ tiếp tục lượt thi đang làm; hết giờ, máy chủ chấm các đáp án đã lưu.')}</p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="secondary" size="md" onClick={() => setParams({ level: levelCode || testInfo.data.jlptLevelName })}>{tr('Về danh sách đề')}</Button>
                <Button variant="primary" size="md" disabled={start.isPending} loading={start.isPending}
                  onClick={() => start.mutate(selectedTestId)}>{tr('Bắt đầu thi thử')}</Button>
              </div>
            </Card>
          )
        )}

        {start.error && (
          <Banner tone="danger">{formatApiError(start.error, tr('Không thể bắt đầu bài thi thử.'))}</Banner>
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

        {!attemptId && !selectedTestId && (
          <>
            {(levels.isPending || (activeLevel && tests.isLoading)) && (
              <SakuraLoader variant="section" context="mocktest" delay={160} />
            )}

            {levels.isSuccess && levels.data.length === 0 && (
              <Card>
                <EmptyState
                  variant="compact"
                  illustration="certificate"
                  title={tr('Chưa có cấp độ thi thử.')}
                  description={tr('Đề thi thử sẽ hiển thị tại đây ngay khi được Quản trị viên phê duyệt.')}
                />
              </Card>
            )}

            {tests.isSuccess &&
              (tests.data.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {tests.data.map((test) => (
                    <li key={test.mockTestId}>
                      <Card className="flex h-full flex-col justify-between gap-4">
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
                          size="md"
                          onClick={() => setParams({ level: activeLevel?.code || '', testId: String(test.mockTestId) })}
                        >
                          {tr('Xem thông tin đề')}
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : (
                <Card>
                  <EmptyState
                    variant="compact"
                    illustration="certificate"
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
