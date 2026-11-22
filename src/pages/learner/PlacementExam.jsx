import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getActivePlacement, savePlacementAnswer, submitPlacement } from '@/features/placement/api/placementApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { recordDiagnostic } from '@/api/diagnostics.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function remainingSeconds(expiresAt) {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function clock(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PlacementExam() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const { tr } = useLocale();
  const seeded = state?.attempt || null;
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(() => remainingSeconds(seeded?.expiresAt));
  const [error, setError] = useState('');
  const autoSubmitted = useRef(false);
  const submitRef = useRef(null);

  const uid = getSession()?.userId ?? 'anon';
  const activeQuery = useQuery({
    queryKey: ['placement-active', uid],
    queryFn: getActivePlacement,
    enabled: !seeded,
  });

  const attempt = seeded || activeQuery.data;
  const questions = useMemo(() => attempt?.questions || [], [attempt]);

  // Restore saved answers and the server deadline whenever a (new) attempt arrives.
  const [syncedAttempt, setSyncedAttempt] = useState(null);
  if (attempt?.questions && attempt !== syncedAttempt) {
    setSyncedAttempt(attempt);
    const saved = {};
    attempt.questions.forEach((question) => {
      if (question.selectedOptionId) saved[question.questionId] = question.selectedOptionId;
    });
    setAnswers(saved);
    setLeft(remainingSeconds(attempt.expiresAt));
  }

  // One ticking interval while a deadline exists (restarted only when the timer starts/stops).
  const hasDeadline = left != null;
  useEffect(() => {
    if (!hasDeadline) return undefined;
    const timer = window.setInterval(() => {
      setLeft((value) => (value == null ? value : Math.max(0, value - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasDeadline]);

  useEffect(() => {
    if (left !== 0 || !attempt?.attemptId || autoSubmitted.current) return;
    autoSubmitted.current = true;
    submitRef.current?.mutate();
  }, [left, attempt?.attemptId]);

  const sections = useMemo(() => {
    const groups = [];
    questions.forEach((question) => {
      const last = groups[groups.length - 1];
      if (!last || last.title !== question.sectionTitle) {
        groups.push({ title: question.sectionTitle, level: question.jlptLevelName, items: [question] });
      } else {
        last.items.push(question);
      }
    });
    return groups;
  }, [questions]);

  const payload = () => questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionId: answers[question.questionId] ?? null,
  }));

  const submit = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang nộp bài đánh giá…'), '', { key: 'placement-submit', maxWaitMs: 30000 });
      return submitPlacement(attempt.attemptId, payload());
    },
    onSuccess: (result) => {
      notify.success(tr('Đã hoàn thành bài đánh giá năng lực!'), '', { key: 'placement-submit', replace: true });
      navigate(`/placement/result/${result.attemptId}`, { replace: true });
    },
    onError: (err) => {
      setError(describeApiError(err).message);
      notify.apiError(err, tr('Chưa nộp được bài đánh giá'), { key: 'placement-submit', replace: true });
    },
  });
  useLayoutEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  const choose = (question, optionId) => {
    setAnswers((current) => ({ ...current, [question.questionId]: optionId }));
    savePlacementAnswer(attempt.attemptId, {
      questionId: question.questionId,
      selectedOptionId: optionId,
    }).catch((err) => {
      recordDiagnostic({ source: 'PlacementExam', operation: 'savePlacementAnswer', error: err });
      notify.apiError(err, tr('Chưa tự động lưu đáp án vừa chọn'), { key: 'placement-autosave-err' });
    });
  };

  const answered = Object.keys(answers).length;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Đánh giá năng lực')}>
      <main
        data-page="PlacementExam"
        className="rp-container-reading py-6 text-rp-text lg:py-8"
      >
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">
              {tr('ĐANG LÀM BÀI')}
            </p>
            <h1 className="mt-2 text-[24px] font-semibold tracking-tight">
              {tr('Bài đánh giá năng lực')}
            </h1>
            <p className="mt-1 text-[13px] text-rp-text-muted">
              {answered}/{questions.length || attempt?.totalQuestions || 0} {tr('câu đã chọn')}
            </p>
          </div>
          {left != null && (
            <p className="rounded-xl bg-rp-brand-tint px-3 py-2 text-[14px] font-semibold text-rp-brand-strong">
              {clock(left)}
            </p>
          )}
        </header>

        {activeQuery.isPending && !seeded && (
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
        )}
        {activeQuery.isError && !attempt && (
          <ContextualErrorState
            className="mb-4 rounded-2xl border border-rp-line bg-white px-5"
            compact
            error={activeQuery.error}
            title={tr('Chưa tải được bài đánh giá')}
            onRetry={() => activeQuery.refetch()}
            retrying={activeQuery.isFetching}
          />
        )}
        {!activeQuery.isPending && !activeQuery.isError && !attempt && (
          <p className="rounded-2xl border border-rp-line bg-white px-5 py-6 text-[13px] text-rp-text-muted">
            {tr('Không có lượt đang làm. Hãy bắt đầu từ trang đánh giá.')}
          </p>
        )}

        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-rp-line bg-white px-5 py-4">
              <h2 className="text-[14px] font-semibold">
                {tr(section.title)}
                {section.level ? <span className="ml-2 text-[12px] font-medium text-rp-brand-strong">{section.level}</span> : null}
              </h2>
              <ol className="mt-3 space-y-5">
                {section.items.map((question, index) => (
                  <li key={question.questionId}>
                    <p className="text-[14px] leading-6">
                      <span className="mr-2 text-rp-brand-strong">{index + 1}.</span>
                      {question.content}
                    </p>
                    {question.audioUrl && <audio className="mt-2 w-full" controls src={question.audioUrl} />}
                    {question.imageUrl && (
                      <img alt="" src={question.imageUrl} className="mt-2 max-h-48 rounded-xl" />
                    )}
                    <div className="mt-2 space-y-2">
                      {question.options.map((option) => {
                        const selected = answers[question.questionId] === option.optionId;
                        return (
                          <label
                            key={option.optionId}
                            className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-[13px] leading-5 ${
                              selected ? 'border-rp-brand-strong bg-rp-brand-tint' : 'border-rp-line'
                            }`}
                          >
                            <input
                              type="radio"
                              className="mt-1"
                              name={`q-${question.questionId}`}
                              checked={selected}
                              onChange={() => choose(question, option.optionId)}
                            />
                            <span>{option.content}</span>
                          </label>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        {attempt && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {error && <p role="alert" className="text-[13px] text-rp-brand-strong">{error}</p>}
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => {
                setError('');
                submit.mutate();
              }}
              className={`h-11 rounded-xl bg-rp-brand-strong px-5 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}
            >
              {submit.isPending ? tr('Đang nộp bài…') : tr('Nộp bài')}
            </button>
          </div>
        )}
      </main>
    </LearnerShell>
  );
}
