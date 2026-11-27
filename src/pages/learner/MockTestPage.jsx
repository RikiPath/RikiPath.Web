import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  History,
  Layers,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/api/client.js';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import {
  captureMainScrollTop,
  captureNavigationOrigin,
  saveListViewState,
} from '@/utils/navigationContext.js';
import AttemptResultDashboard from '@/features/mock-test/components/AttemptResultDashboard.jsx';
import ExamCatalogCard, { ExamCatalogCardSkeleton } from '@/features/mock-test/components/ExamCatalogCard.jsx';
import ExamFilterToolbar from '@/features/mock-test/components/ExamFilterToolbar.jsx';
import ExamWorkspace from '@/features/mock-test/components/ExamWorkspace.jsx';
import MockExamRegulationsModal from '@/features/mock-test/components/MockExamRegulationsModal.jsx';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import PracticeExitModal from '@/features/mock-test/components/PracticeExitModal.jsx';
import {
  finalizeExpiredMockTestAttempt,
  getFullMockTests,
  getMockTestAttempt,
  getMockTestInfo,
  getMockTestQuestions,
  pauseMockTestAttempt,
  saveMockTestAnswers,
  startMockTest,
  submitMockTestAttempt,
} from '@/features/mock-test/api/mockTestApi.js';
import {
  formatRemainingShort,
  isPracticeKind,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
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
  Modal,
  PageContainer,
  Radio,
  RichQuestionText,
  SakuraLoader,
  StaleDataBar,
  confirmAction,
  notify,
  useOnlineStatus,
  useUnsavedGuard,
} from '@/components/ui';
import { ControlGroup, filterSupportedJlptLevels, IllustratedPageHeader } from '@/features/learner-ui';
import { useLocale } from '@/locales/locale.js';

const MOCK_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'IN_PROGRESS', label: 'Đang làm dở' },
  { value: 'NOT_STARTED', label: 'Chưa làm' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'EXPIRED', label: 'Hết thời gian' },
];

function formatClockSeconds(totalSec) {
  if (totalSec == null || !Number.isFinite(Number(totalSec))) return null;
  const s = Math.max(0, Math.floor(Number(totalSec)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function answerItem(questionId, value, clientSequence) {
  const base = typeof value === 'number' ? { questionId, selectedOptionId: value } : { questionId, response: value };
  return clientSequence != null ? { ...base, clientSequence } : base;
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

function optionContent(option, label) {
  return (
    <span className="min-w-0 whitespace-pre-wrap">
      <RichQuestionText text={option.content ?? option.optionText} />
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
    const rightOptions = right.map((option) => ({
      value: String(option.id ?? option),
      label: String(option.text ?? option.label ?? option.id ?? option),
    }));
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
                  clearable
                  label={tr('Đáp án ghép')}
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
    <div className="mt-3">
      <Input
        label={tr('Câu trả lời')}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function MockAttempt({ attempt, onComplete }) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isPractice = !attempt.enforceStrictTimer || isPracticeKind(attempt.examKind);

  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(
      attempt.questions
        .filter((question) => question.selectedOptionId != null || question.response != null)
        .map((question) => [question.questionId, question.selectedOptionId ?? question.response]),
    ),
  );
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState(attempt.isResumed ? 'saved' : 'idle');
  const [hasUnsyncedError, setHasUnsyncedError] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [practiceExitOpen, setPracticeExitOpen] = useState(false);
  const [exitingPractice, setExitingPractice] = useState(false);
  const [submitModalMeta, setSubmitModalMeta] = useState(null);
  const [multiTabConflict, setMultiTabConflict] = useState(false);

  const submission = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const failedAnswers = useRef(new Map());
  const queuedSaves = useRef(0);
  const autoSubmitted = useRef(false);
  const seqRef = useRef(Number(attempt.latestAnswerSequence || 0));
  const debounceTimers = useRef(new Map());
  const pendingDebouncedValues = useRef(new Map());

  // For strict MockTest -> countdown to server deadline; for Practice -> pause-safe active stopwatch
  const [deadline, setDeadline] = useState(isPractice ? null : attempt.monotonicDeadline);
  const remaining = useCallback(
    () => (deadline == null ? null : Math.max(0, Math.ceil((deadline - performance.now()) / 1000))),
    [deadline],
  );
  const [seconds, setSeconds] = useState(remaining);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Number(attempt.elapsedSeconds || 0)));

  useUnsavedGuard(!pending && (isPractice || seconds !== 0));

  useEffect(() => {
    if (isPractice) {
      const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
    if (deadline == null) return undefined;
    const timer = setInterval(() => setSeconds(remaining()), 250);
    return () => clearInterval(timer);
  }, [deadline, isPractice, remaining]);

  // Multi-tab detection for same attempt via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(`rikipath-attempt-${attempt.attemptId}`);
    const tabId = `${Date.now()}-${Math.random()}`;
    channel.postMessage({ type: 'OPENED', tabId });
    channel.onmessage = (event) => {
      if (event.data?.tabId && event.data.tabId !== tabId) {
        if (event.data.type === 'OPENED') {
          setMultiTabConflict(true);
          channel.postMessage({ type: 'ACK', tabId });
        } else if (event.data.type === 'ACK') {
          setMultiTabConflict(true);
        }
      }
    };
    return () => channel.close();
  }, [attempt.attemptId]);

  useEffect(() => {
    if (isPractice) return undefined;
    const syncDeadline = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const latest = await getMockTestQuestions(attempt.attemptId);
        if (latest?.monotonicDeadline != null) setDeadline(latest.monotonicDeadline);
      } catch (err) {
        if (['MOCK_TEST_EXPIRED', 'MOCK_TEST_COMPLETED'].includes(err?.data?.errorCode)) {
          try {
            const finalized = await getMockTestAttempt(attempt.attemptId);
            onComplete(finalized);
          } catch {
            // Query layer recovers cleanly
          }
        }
      }
    };
    document.addEventListener('visibilitychange', syncDeadline);
    window.addEventListener('pageshow', syncDeadline);
    return () => {
      document.removeEventListener('visibilitychange', syncDeadline);
      window.removeEventListener('pageshow', syncDeadline);
    };
  }, [attempt.attemptId, isPractice, onComplete]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const queueAnswer = useCallback(
    (questionId, value) => {
      setError('');
      setSaveState('saving');
      setSyncPending(true);
      queuedSaves.current += 1;
      seqRef.current += 1;
      const clientSequence = seqRef.current;

      saveQueue.current = saveQueue.current
        .then(() =>
          saveMockTestAnswers(
            attempt.attemptId,
            [answerItem(questionId, value, clientSequence)],
            {
              clientSequence,
              activeElapsedSeconds: isPractice ? elapsedSeconds : undefined,
            },
          ),
        )
        .then(() => {
          failedAnswers.current.delete(questionId);
          setHasUnsyncedError(failedAnswers.current.size > 0);
        })
        .catch((err) => {
          if (err?.data?.errorCode === 'MOCK_TEST_ABANDONED') {
            setError(formatApiError(err, tr('Lượt làm bài đã kết thúc.')));
            return;
          }
          if (!['MOCK_TEST_EXPIRED', 'MOCK_TEST_COMPLETED'].includes(err?.data?.errorCode)) {
            failedAnswers.current.set(questionId, value);
            setHasUnsyncedError(true);
            setError(formatApiError(err, tr('Chưa lưu được câu trả lời.')));
          }
        })
        .finally(() => {
          queuedSaves.current -= 1;
          setSyncPending(queuedSaves.current > 0);
          const nextFailed = failedAnswers.current.size > 0;
          setHasUnsyncedError(nextFailed);
          setSaveState(nextFailed ? 'error' : queuedSaves.current ? 'saving' : 'saved');
        });
    },
    [attempt.attemptId, elapsedSeconds, isPractice, tr],
  );

  function choose(questionId, value) {
    if (submission.current || (!isPractice && remaining() === 0)) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setSaveState('saving');
    pendingDebouncedValues.current.set(questionId, value);
    const existing = debounceTimers.current.get(questionId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceTimers.current.delete(questionId);
      const latestVal = pendingDebouncedValues.current.get(questionId);
      pendingDebouncedValues.current.delete(questionId);
      queueAnswer(questionId, latestVal);
    }, 240);
    debounceTimers.current.set(questionId, timer);
  }

  const flushDebouncedAnswers = useCallback(async () => {
    for (const [qId, timer] of debounceTimers.current.entries()) {
      clearTimeout(timer);
      debounceTimers.current.delete(qId);
      if (pendingDebouncedValues.current.has(qId)) {
        const val = pendingDebouncedValues.current.get(qId);
        pendingDebouncedValues.current.delete(qId);
        queueAnswer(qId, val);
      }
    }
    await saveQueue.current;
  }, [queueAnswer]);

  async function retrySave() {
    for (const [questionId, value] of failedAnswers.current) {
      queueAnswer(questionId, value);
    }
    await saveQueue.current;
  }

  const submit = useCallback(async () => {
    if (submission.current) return;
    submission.current = true;
    setPending(true);
    setError('');
    setSubmitModalMeta(null);
    const toastKey = `mock-submit-${attempt.attemptId}`;
    notify.loading(isPractice ? tr('Đang chấm điểm bài luyện tập…') : tr('Đang nộp bài thi thử…'), '', {
      key: toastKey,
      maxWaitMs: 30000,
    });
    try {
      await flushDebouncedAnswers();
      seqRef.current += 1;
      const items = Object.entries(answers).map(([questionId, value]) => answerItem(Number(questionId), value, seqRef.current));
      const result = await submitMockTestAttempt(attempt.attemptId, items, {
        clientSequence: seqRef.current,
        activeElapsedSeconds: isPractice ? elapsedSeconds : undefined,
      }).catch((err) => {
        if (['MOCK_TEST_COMPLETED', 'MOCK_TEST_EXPIRED'].includes(err?.data?.errorCode)) {
          return getMockTestAttempt(attempt.attemptId);
        }
        throw err;
      });
      notify.success(isPractice ? tr('Đã hoàn thành bài luyện tập!') : tr('Đã nộp bài thi thử thành công!'), '', {
        key: toastKey,
        replace: true,
      });
      onComplete(result);
    } catch (err) {
      setError(formatApiError(err, tr('Chưa nộp được bài làm.')));
      notify.apiError(err, tr('Chưa nộp được bài làm'), { key: toastKey, replace: true });
    } finally {
      submission.current = false;
      setPending(false);
    }
  }, [answers, attempt.attemptId, elapsedSeconds, flushDebouncedAnswers, isPractice, onComplete, tr]);

  const online = useOnlineStatus();
  const answeredCount = attempt.questions.filter((q) => hasAnswerValue(answers[q.questionId])).length;
  const unanswered = Math.max(0, attempt.questions.length - answeredCount);

  function askSubmit({ flaggedCount = 0 } = {}) {
    setSubmitModalMeta({
      total: attempt.questions.length,
      answered: answeredCount,
      unanswered,
      flagged: flaggedCount,
    });
  }

  async function handleExitRequest() {
    if (isPractice) {
      await flushDebouncedAnswers();
      setPracticeExitOpen(true);
      return;
    }
    const ok = await confirmAction({
      title: tr('Rời khỏi bài thi thử JLPT?'),
      description: tr('Đồng hồ thi thử vẫn tiếp tục tính giờ theo máy chủ nếu bạn rời trang. Các đáp án đã lưu vẫn được giữ nguyên nếu bạn quay lại trước khi hết giờ.'),
      confirmLabel: tr('Rời phòng thi'),
      cancelLabel: tr('Tiếp tục làm bài'),
      tone: 'warning',
    });
    if (ok) {
      await flushDebouncedAnswers();
      navigate('/mock-tests/');
    }
  }

  async function handleConfirmPracticeExit() {
    if (exitingPractice) return;
    setExitingPractice(true);
    try {
      await flushDebouncedAnswers();
      if (failedAnswers.current.size > 0) {
        await retrySave();
      }
      if (failedAnswers.current.size > 0) {
        notify.error(tr('Chưa đồng bộ được hết đáp án lên máy chủ. Vui lòng kiểm tra kết nối và thử lại.'), '', {
          key: 'practice-exit-sync-err',
        });
        return;
      }
      seqRef.current += 1;
      const items = Object.entries(answers).map(([questionId, value]) => answerItem(Number(questionId), value, seqRef.current));
      await pauseMockTestAttempt(attempt.attemptId, {
        answers: items,
        clientSequence: seqRef.current,
        activeElapsedSeconds: elapsedSeconds,
      });
      void queryClient.invalidateQueries({ queryKey: ['learner-practice-sets'] });
      void queryClient.invalidateQueries({ queryKey: ['mock-test-history'] });
      notify.success(tr('Đã lưu tiến độ bài luyện tập.'), '', { key: 'practice-pause-ok' });
      setPracticeExitOpen(false);
      navigate('/practice-sets/');
    } catch (err) {
      notify.apiError(err, tr('Chưa lưu được tiến độ luyện tập'), { key: 'practice-pause-err' });
    } finally {
      setExitingPractice(false);
    }
  }

  useEffect(() => {
    if (isPractice || seconds !== 0 || autoSubmitted.current || pending || !online) return;
    autoSubmitted.current = true;
    void submit();
  }, [isPractice, online, pending, seconds, submit]);

  const clockLabel = isPractice
    ? `${formatClockSeconds(elapsedSeconds)}${attempt.timeLimitMinutes > 0 ? ` / ${attempt.timeLimitMinutes}:00` : ''}`
    : formatClockSeconds(seconds);

  return (
    <>
      <BlockingOverlay open={pending} label={tr('Đang nộp và chấm bài, vui lòng không đóng trang')} />

      {!online && (
        <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')}>
          {!isPractice && seconds === 0
            ? tr('Hết giờ làm bài nhưng đang mất mạng. Hãy kết nối mạng rồi bấm Nộp bài đã hết giờ.')
            : tr('Câu trả lời mới chưa được lưu lên máy chủ. Hãy kết nối mạng để tiếp tục đồng bộ.')}
        </Banner>
      )}

      <ExamWorkspace
        title={attempt.title ? tr(attempt.title) : trf('Bài làm {0}', { 0: attempt.jlptLevelName })}
        subtitle={
          isPractice
            ? `${tr('Luyện tập')} · ${trf('{0} câu', { 0: attempt.questions.length })}${
                attempt.timeLimitMinutes > 0 ? ` · ${trf('Ước tính {0} phút', { 0: attempt.timeLimitMinutes })}` : ''
              }`
            : `${tr('Thi thử JLPT')} · ${trf('{0} câu', { 0: attempt.questions.length })} · ${trf('{0} phút', { 0: attempt.timeLimitMinutes })}`
        }
        questions={attempt.questions}
        isAnswered={(question) => hasAnswerValue(answers[question.questionId])}
        clockLabel={clockLabel}
        timerMode={isPractice ? 'advisory' : 'strict'}
        secondsLeft={isPractice ? null : seconds}
        urgentSecondsThreshold={300}
        saveState={saveState}
        pending={pending}
        expired={!isPractice && seconds === 0}
        offline={!online}
        errorMessage={error}
        onRetrySave={hasUnsyncedError ? retrySave : undefined}
        submitLabel={isPractice ? tr('Nộp bài luyện tập') : tr('Nộp bài thi thử')}
        expiredSubmitLabel={tr('Nộp bài đã hết giờ')}
        onRequestSubmit={askSubmit}
        onExpiredSubmit={submit}
        onRequestExit={handleExitRequest}
        exitLabel={isPractice ? tr('Thoát & lưu') : tr('Rời phòng thi')}
        extraBanner={
          multiTabConflict ? (
            <Banner tone="warning" title={tr('Phát hiện mở lượt làm bài trên nhiều tab')}>
              {tr('Lượt làm bài này đang mở ở một tab khác. Hãy chỉ thao tác trên một tab để tránh ghi đè đáp án.')}
            </Banner>
          ) : null
        }
        renderQuestionBody={(question) => (
          <MockAnswer
            question={question}
            value={answers[question.questionId]}
            onChange={(value) => choose(question.questionId, value)}
          />
        )}
      />

      <PracticeExitModal
        open={practiceExitOpen}
        onClose={() => setPracticeExitOpen(false)}
        onConfirmExit={handleConfirmPracticeExit}
        onRetrySync={retrySave}
        syncPending={syncPending}
        hasUnsyncedError={hasUnsyncedError}
        exiting={exitingPractice}
      />

      <Modal
        open={Boolean(submitModalMeta)}
        onClose={() => !pending && setSubmitModalMeta(null)}
        size="sm"
        title={tr('Bạn có chắc chắn muốn nộp bài?')}
        description={tr('Hãy kiểm tra lại tổng quan số câu đã hoàn thành trước khi gửi chấm điểm.')}
        footer={
          <>
            <Button type="button" variant="neutral" size="md" disabled={pending} onClick={() => setSubmitModalMeta(null)}>
              {tr('Tiếp tục làm bài')}
            </Button>
            <Button type="button" variant="primary" size="md" icon={Send} loading={pending} onClick={() => void submit()}>
              {tr('Nộp bài')}
            </Button>
          </>
        }
      >
        {submitModalMeta && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="rounded-xl border border-rp-line bg-rp-bg-2/75 p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Tổng số câu')}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-rp-text">{submitModalMeta.total}</dd>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <dt className="text-xs text-emerald-800">{tr('Đã trả lời')}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-emerald-900">{submitModalMeta.answered}</dd>
              </div>
              <div className={`rounded-xl border p-3 ${submitModalMeta.unanswered > 0 ? 'border-amber-200 bg-amber-50/75' : 'border-rp-line bg-rp-bg-2/75'}`}>
                <dt className="text-xs text-rp-text-muted">{tr('Chưa trả lời')}</dt>
                <dd className={`mt-0.5 text-lg font-bold tabular-nums ${submitModalMeta.unanswered > 0 ? 'text-amber-800' : 'text-rp-text'}`}>
                  {submitModalMeta.unanswered}
                </dd>
              </div>
              <div className="rounded-xl border border-rp-line bg-rp-bg-2/75 p-3">
                <dt className="text-xs text-rp-text-muted">{tr('Đánh dấu xem lại')}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-rp-text">{submitModalMeta.flagged}</dd>
              </div>
            </dl>
            {!isPractice && clockLabel && (
              <p className="text-xs font-medium text-rp-text-muted">
                {trf('Thời gian còn lại: {0}', { 0: clockLabel })}
              </p>
            )}
            {submitModalMeta.unanswered > 0 && (
              <Banner tone="warning">
                {trf('Bạn vẫn còn {0} câu chưa chọn đáp án. Hệ thống vẫn cho phép nộp bài và sẽ tính các câu trống là chưa trả lời.', {
                  0: submitModalMeta.unanswered,
                })}
              </Banner>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function MockTestPage({ routeMode = null, resultOnly = false }) {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeParams = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  function openMockAttempt(targetAttemptId, { result = false } = {}) {
    if (!targetAttemptId) return;
    saveListViewState('/mock-tests', {
      search: location.search,
      scrollTop: captureMainScrollTop(),
    });
    const dest = result
      ? `/mock-tests/result/${targetAttemptId}/`
      : `/mock-tests/attempt/${targetAttemptId}/`;
    navigate(dest, {
      state: {
        navigationOrigin: captureNavigationOrigin(location, { backLabel: 'Quay lại thi thử' }),
      },
    });
  }

  const attemptId = Number(routeParams.attemptId) || Number(params.get('attemptId')) || null;
  const deepLinkTestId = Number(params.get('testId')) || null;
  const levelCode = params.get('level') || 'ALL';

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regulationsExam, setRegulationsExam] = useState(null);
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);

  const attemptKey = ['mock-test-page', user?.userId, attemptId];

  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels-supported'],
    enabled: !attemptId,
    queryFn: async () => {
      const { result } = await api.get('/CertificateLevel/jlpt');
      return filterSupportedJlptLevels(result || []);
    },
  });

  const supportedLevels = useMemo(() => levelsQuery.data || [], [levelsQuery.data]);
  const activeLevelObj = supportedLevels.find((l) => l.code === levelCode) || null;

  const mockExamsQuery = useQuery({
    queryKey: ['mock-exams-catalog', user?.userId, activeLevelObj?.id, statusFilter],
    enabled: !attemptId,
    queryFn: () =>
      getFullMockTests({
        levelId: activeLevelObj?.id || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  // Resolve ?testId= deep-link directly into the Exam Regulations modal (no intermediate detail page!)
  const deepLinkInfoQuery = useQuery({
    queryKey: ['mock-test-info', deepLinkTestId],
    queryFn: () => getMockTestInfo(deepLinkTestId),
    enabled: Boolean(!attemptId && deepLinkTestId),
    retry: false,
  });

  const activeRegulationsExam = regulationsExam || (!attemptId && deepLinkTestId && !deepLinkDismissed ? deepLinkInfoQuery.data : null);

  const isExplicitResultRoute = resultOnly || location.pathname.includes('/result/');
  const current = useQuery({
    queryKey: attemptKey,
    enabled: Boolean(attemptId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (isExplicitResultRoute) {
        return { result: await getMockTestAttempt(attemptId) };
      }
      try {
        return { attempt: await getMockTestQuestions(attemptId) };
      } catch (err) {
        const code = err?.data?.errorCode;
        if (code === 'MOCK_TEST_EXPIRED') {
          try {
            const finalized = await finalizeExpiredMockTestAttempt(attemptId);
            return { result: finalized };
          } catch {
            return { result: await getMockTestAttempt(attemptId) };
          }
        }
        if (code === 'MOCK_TEST_COMPLETED') {
          return { result: await getMockTestAttempt(attemptId) };
        }
        throw err;
      }
    },
  });

  const start = useMutation({
    mutationFn: ({ testId, forceNew }) => startMockTest(testId, { forceNew }),
    onSuccess: (attempt) => {
      setRegulationsExam(null);
      queryClient.setQueryData(['mock-test-page', user?.userId, attempt.attemptId], { attempt });
      void queryClient.invalidateQueries({ queryKey: ['mock-exams-catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['learner-practice-sets'] });
      const targetPath = isPracticeKind(attempt.examKind)
        ? `/practice-sets/attempt/${attempt.attemptId}/`
        : `/mock-tests/attempt/${attempt.attemptId}/`;
      navigate(targetPath, { state: location.state });
    },
    onError: (err) => notify.apiError(err, tr('Không thể bắt đầu bài thi thử'), { key: 'mock-start-err' }),
  });

  const complete = useCallback(
    (result) => {
      queryClient.setQueryData(['mock-test-page', user?.userId, result.attemptId], { result });
      void queryClient.invalidateQueries({ queryKey: ['mock-test-history', user?.userId] });
      void queryClient.invalidateQueries({ queryKey: ['mock-exams-catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['learner-practice-sets'] });
      const resultPath = isPracticeKind(result.examKind)
        ? `/practice-sets/result/${result.attemptId}/`
        : `/mock-tests/result/${result.attemptId}/`;
      navigate(resultPath, { replace: true, state: location.state });
    },
    [location.state, navigate, queryClient, user?.userId],
  );

  // Enforce classification route parity: PracticeSet attempts must always live under /practice-sets/
  // and FullMockTest attempts under /mock-tests/, auto-correcting mismatched URLs after loading truth from Backend.
  const resolvedLoadedExamKind = current.data?.attempt?.examKind ?? current.data?.result?.examKind ?? null;
  const resolvedIsResult = Boolean(current.data?.result);
  useEffect(() => {
    if (!attemptId || !resolvedLoadedExamKind) return;
    const isPractice = isPracticeKind(resolvedLoadedExamKind);
    if (isPractice && routeMode !== 'practice') {
      navigate(resolvedIsResult ? `/practice-sets/result/${attemptId}/` : `/practice-sets/attempt/${attemptId}/`, {
        replace: true,
        state: location.state,
      });
      return;
    }
    if (!isPractice && routeMode === 'practice') {
      navigate(resolvedIsResult ? `/mock-tests/result/${attemptId}/` : `/mock-tests/attempt/${attemptId}/`, {
        replace: true,
        state: location.state,
      });
      return;
    }
    if (resolvedIsResult && !resultOnly) {
      navigate(isPractice ? `/practice-sets/result/${attemptId}/` : `/mock-tests/result/${attemptId}/`, {
        replace: true,
        state: location.state,
      });
    }
  }, [attemptId, location.state, navigate, resolvedIsResult, resolvedLoadedExamKind, resultOnly, routeMode]);

  const returnToList = () => {
    start.reset();
    setRegulationsExam(null);
    if (routeMode === 'practice') {
      navigate('/practice-sets/');
      return;
    }
    setParams(levelCode && levelCode !== 'ALL' ? { level: levelCode } : {});
  };

  function closeRegulationsModal() {
    setRegulationsExam(null);
    setDeepLinkDismissed(true);
    if (deepLinkTestId) {
      const next = new URLSearchParams(params);
      next.delete('testId');
      setParams(next, { replace: true });
    }
  }

  const allMockTests = useMemo(() => mockExamsQuery.data || [], [mockExamsQuery.data]);
  const hasServerFilter = levelCode !== 'ALL' || statusFilter !== 'ALL';

  const unfilteredMockQuery = useQuery({
    queryKey: ['mock-exams-catalog', user?.userId, 'unfiltered-check'],
    enabled: Boolean(!attemptId && hasServerFilter && mockExamsQuery.isSuccess && allMockTests.length === 0),
    queryFn: () => getFullMockTests({}),
    staleTime: 60_000,
  });

  const hasUnderlyingMockCatalog = mockExamsQuery.isSuccess && (
    allMockTests.length > 0 || (hasServerFilter && (unfilteredMockQuery.data?.length ?? 0) > 0)
  );
  const showMockFilterToolbar = mockExamsQuery.isSuccess && !levelsQuery.isError && (
    allMockTests.length > 0 || (hasServerFilter && (unfilteredMockQuery.isPending || (unfilteredMockQuery.data?.length ?? 0) > 0))
  );
  const visibleMockTests = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return allMockTests;
    return allMockTests.filter(
      (test) =>
        String(test.title || '').toLowerCase().includes(q) ||
        String(test.description || '').toLowerCase().includes(q) ||
        String(test.jlptLevelName || '').toLowerCase().includes(q),
    );
  }, [allMockTests, keyword]);

  const inProgressMockTests = useMemo(
    () => allMockTests.filter((t) => t.userStatus === 'IN_PROGRESS' && t.activeAttemptId),
    [allMockTests],
  );

  const hasActiveFilters =
    levelCode !== 'ALL' || statusFilter !== 'ALL' || keyword.trim().length > 0;

  function handleResetFilters() {
    setKeyword('');
    setStatusFilter('ALL');
    setParams({});
  }

  const levelOptions = useMemo(
    () => [{ code: 'ALL', label: 'Tất cả' }, ...supportedLevels.map((l) => ({ code: l.code, label: l.code }))],
    [supportedLevels],
  );

  const blockingError = !attemptId
    ? levelsQuery.isError
      ? levelsQuery.error
      : mockExamsQuery.isError
        ? mockExamsQuery.error
        : null
    : !current.data && current.isError
      ? current.error
      : null;

  const retryBlocking = () => {
    if (attemptId) return current.refetch();
    if (levelsQuery.isError) return levelsQuery.refetch();
    return mockExamsQuery.refetch();
  };

  const pageTitle = (() => {
    if (!attemptId) return tr('Thi thử JLPT');
    const isPracticeCtx = resolvedLoadedExamKind ? isPracticeKind(resolvedLoadedExamKind) : routeMode === 'practice';
    if (resolvedIsResult || resultOnly) {
      return isPracticeCtx ? tr('Kết quả luyện tập') : tr('Kết quả thi thử');
    }
    return isPracticeCtx ? tr('Làm bài luyện tập') : tr('Làm bài thi thử JLPT');
  })();

  return (
    <LearnerShell breadcrumb={pageTitle}>
      <PageContainer data-page="MockTestPage" width={attemptId && current.data?.result ? 'wide' : 'default'} className="space-y-4">
        {!attemptId && (
          <IllustratedPageHeader
            icon="mock"
            tone="navy"
            eyebrow="JLPT N5 – N2"
            title={tr('Thi thử JLPT')}
            description={tr('Đề thi mô phỏng nghiêm túc theo cấu trúc, thời lượng và quy chế làm bài từng cấp độ JLPT.')}
            actions={
              <ControlGroup>
                <Button as={Link} to="/practice-sets/" variant="outline" size="md" icon={Layers}>
                  {tr('Bộ đề luyện tập')}
                </Button>
                <Button as={Link} to="/exam-result/" variant="primary" size="md" icon={History}>
                  {tr('Lịch sử & kết quả')}
                </Button>
              </ControlGroup>
            }
          />
        )}

        {!attemptId && (
          <>
            {showMockFilterToolbar && (
            <ExamFilterToolbar
              searchValue={keyword}
              onSearchChange={setKeyword}
              searchPlaceholder="Tìm đề thi thử…"
              levels={levelOptions}
              activeLevel={levelCode}
              onLevelChange={(code) => {
                const next = new URLSearchParams(params);
                if (code && code !== 'ALL') next.set('level', code);
                else next.delete('level');
                setParams(next);
              }}
              selects={[
                { key: 'status', label: 'Trạng thái', value: statusFilter, onChange: setStatusFilter, options: MOCK_STATUS_FILTER_OPTIONS },
              ]}
              hasActiveFilters={hasActiveFilters}
              onReset={handleResetFilters}
            />
            )}

            {inProgressMockTests.length > 0 && (
              <Card className="rp-resume-strip border-amber-200/80 bg-amber-50/55 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="warning" size="sm" icon={Clock}>{tr('Bài thi thử đang tính giờ')}</Badge>
                    <span className="text-xs text-rp-text-muted">
                      {tr('Đồng hồ vẫn chạy theo máy chủ. Hãy tiếp tục để hoàn thành trước khi hết hạn.')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {inProgressMockTests.map((active) => {
                    const answered = active.activeAnsweredCount ?? 0;
                    const total = active.activeTotalQuestions ?? active.questionCount ?? 0;
                    return (
                      <div key={active.mockTestId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3.5 py-2.5">
                        <div className="min-w-[200px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="brand" size="sm" icon={false}>{active.jlptLevelName}</Badge>
                            <p className="text-sm font-bold text-rp-text">{tr(active.title)}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-rp-text-muted tabular-nums">
                            {trf('Đã trả lời {0}/{1} câu', { 0: answered, 1: total })}
                            {active.activeRemainingSeconds != null && ` · ${formatRemainingShort(active.activeRemainingSeconds, trf)}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          iconRight={ChevronRight}
                          onClick={() => openMockAttempt(active.activeAttemptId)}
                        >
                          {tr('Tiếp tục bài thi')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {start.error && (
          <Banner tone="danger">{formatApiError(start.error, tr('Không thể bắt đầu bài thi thử.'))}</Banner>
        )}

        {blockingError && (
          <Card>
            <ContextualErrorState
              compact
              error={blockingError}
              title={attemptId ? tr('Chưa tải được bài làm') : tr('Chưa tải được danh sách đề thi thử')}
              onRetry={retryBlocking}
              retrying={attemptId ? current.isFetching : levelsQuery.isFetching || mockExamsQuery.isFetching}
              action={
                attemptId ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={returnToList}>
                      {tr('Về Thi thử JLPT')}
                    </Button>
                    <Button as={Link} to="/practice-sets/" variant="ghost" size="sm">
                      {tr('Về Bộ đề luyện tập')}
                    </Button>
                  </div>
                ) : null
              }
            />
          </Card>
        )}

        {attemptId && current.isPending && !current.data && (
          <SakuraLoader variant="section" context="mocktest" delay={160} />
        )}

        {current.data?.attempt && current.isError && (
          <StaleDataBar onRetry={() => current.refetch()} retrying={current.isFetching} />
        )}

        {current.data?.attempt && <MockAttempt key={attemptId} attempt={current.data.attempt} onComplete={complete} />}
        {current.data?.result && (
          <AttemptResultDashboard
            key={attemptId}
            result={current.data.result}
            userId={user?.userId}
            restarting={start.isPending}
            onRestart={
              current.data.result.mockTestId
                ? () => start.mutate({ testId: current.data.result.mockTestId, forceNew: true })
                : undefined
            }
          />
        )}

        {!attemptId && (
          <>
            {(levelsQuery.isPending || mockExamsQuery.isPending) && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <ExamCatalogCardSkeleton key={n} />
                ))}
              </div>
            )}

            {mockExamsQuery.isSuccess && visibleMockTests.length === 0 && (
              <Card>
                <EmptyState
                  variant={hasActiveFilters && hasUnderlyingMockCatalog ? 'search' : 'compact'}
                  illustration={hasActiveFilters && hasUnderlyingMockCatalog ? 'search' : 'certificate'}
                  title={hasActiveFilters && hasUnderlyingMockCatalog ? tr('Không tìm thấy kết quả phù hợp') : tr('Chưa có đề thi thử JLPT nào.')}
                  description={
                    hasActiveFilters && hasUnderlyingMockCatalog
                      ? tr('Hãy thử đổi cấp độ JLPT, trạng thái hoặc xóa bộ lọc.')
                      : tr('Các đề thi thử JLPT sẽ hiển thị tại đây khi được phát hành.')
                  }
                  action={
                    hasActiveFilters && hasUnderlyingMockCatalog ? (
                      <Button type="button" variant="outline" size="sm" icon={RotateCcw} onClick={handleResetFilters}>
                        {tr('Xóa bộ lọc')}
                      </Button>
                    ) : null
                  }
                />
              </Card>
            )}

            {mockExamsQuery.isSuccess && visibleMockTests.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-rp-text-muted">
                  <span>{trf('Hiển thị {0} đề thi thử JLPT', { 0: visibleMockTests.length })}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                    {tr('Không xem trước câu hỏi đề thi thử để đảm bảo công bằng')}
                  </span>
                </div>

                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleMockTests.map((test) => (
                    <li key={test.mockTestId} className="min-w-0">
                      <ExamCatalogCard
                        item={test}
                        variant="mock"
                        pending={start.isPending}
                        onViewInfo={(target) => setRegulationsExam(target)}
                        onViewResult={(target) => openMockAttempt(target.latestCompletedAttemptId, { result: true })}
                        onPrimaryAction={(target) => {
                          if (target.userStatus === 'IN_PROGRESS' && target.activeAttemptId) {
                            openMockAttempt(target.activeAttemptId);
                            return;
                          }
                          setRegulationsExam(target);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <MockExamRegulationsModal
          open={Boolean(activeRegulationsExam)}
          exam={activeRegulationsExam}
          onClose={closeRegulationsModal}
          starting={start.isPending}
          onConfirmStart={(exam) => {
            if (exam.userStatus === 'IN_PROGRESS' && exam.activeAttemptId) {
              closeRegulationsModal();
              openMockAttempt(exam.activeAttemptId);
              return;
            }
            start.mutate({ testId: exam.mockTestId, forceNew: false });
          }}
        />
      </PageContainer>
    </LearnerShell>
  );
}
