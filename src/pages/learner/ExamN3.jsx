import AssessmentResultDashboard from '@/features/mock-test/components/AssessmentResultDashboard.jsx';
import ExamWorkspace from '@/features/mock-test/components/ExamWorkspace.jsx';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, PlayCircle, Target } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { getSession } from '@/app/auth/session.js';
import { notify } from '@/components/ui/feedbackStore.js';
import {
  Banner,
  Button,
  Card,
  Modal,
  PageContainer,
  Radio,
  RichQuestionText,
  SakuraLoader,
} from '@/components/ui';
import {
  getPlacementResultActions,
  loadAssessment,
  placementAssessmentKey,
  getPlacementStatus,
  getActivePlacementAttempt,
  savePlacementAnswers,
  startPlacementAttempt,
  submitPlacementAttempt,
} from '@/features/placement/api/placementApi.js';
import { useLocale } from '@/locales/locale.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { IllustratedPageHeader } from '@/features/learner-ui';
import { invalidateLearnerSetupQueries } from '@/features/learning-path/useLearningPathAccess.js';
import { resolveFeatureLock } from '@/features/learning-path/learningPathFlow.js';
import { SetupGuideArt, SetupGuideSteps } from '@/features/entitlements/components/FeatureAccessModal.jsx';

const assessmentUrl = '/app/placement-test';
const chartLevelsByTarget = {
  N5: ['N5'],
  N4: ['N5', 'N4'],
  N3: ['N4', 'N3'],
  N2: ['N3', 'N2'],
};

const SKILL_LABELS = {
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
  reading: 'Đọc hiểu',
  listening: 'Nghe hiểu',
};

function placementAnswer(questionId, value) {
  return Array.isArray(value) ? { questionId, response: value } : { questionId, selectedOptionId: value };
}

function AttemptForm({ attempt, pending, onSubmit, reportError }) {
  const { tr, trf } = useLocale();
  const [answers, setAnswers] = useState(() => Object.fromEntries(attempt.questions
    .filter(question => question.selectedOptionId != null || Array.isArray(question.response))
    .map(question => [question.questionId, question.selectedOptionId ?? question.response])));
  const savedQueue = useRef(Promise.resolve());
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const revision = useRef(0);
  const autoSubmitted = useRef(false);
  const [deadline, setDeadline] = useState(attempt.monotonicDeadline);
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => setSeconds(Math.max(0, Math.ceil((deadline - performance.now()) / 1000))), 250);
    return () => clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    const syncDeadline = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const latest = await getActivePlacementAttempt();
        if (latest?.attemptId === attempt.attemptId) setDeadline(latest.monotonicDeadline);
      } catch {
        // The API remains authoritative when saving or submitting answers.
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
    if (pending || seconds === 0) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setSaving(true);
    reportError('');
    const version = ++revision.current;
    savedQueue.current = savedQueue.current
      .then(() => savePlacementAnswers(attempt.attemptId, [placementAnswer(questionId, value)]))
      .catch(error => {
        if (error.data?.errorCode !== 'PLACEMENT_ATTEMPT_EXPIRED') reportError(error.message);
      })
      .finally(() => { if (revision.current === version) setSaving(false); });
  }

  const submit = useCallback(() => {
    setConfirmSubmit(false);
    onSubmit(attempt.attemptId, savedQueue.current, Object.entries(answers)
      .map(([questionId, value]) => placementAnswer(Number(questionId), value)));
  }, [answers, attempt.attemptId, onSubmit]);

  useEffect(() => {
    if (seconds !== 0 || pending || autoSubmitted.current) return;
    autoSubmitted.current = true;
    submit();
  }, [seconds, pending, submit]);

  const levels = [...new Set(attempt.questions.map((question) => question.jlptLevelName).filter(Boolean))];
  const minutes = Math.floor(seconds / 60);
  const clock = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  const questions = [...attempt.questions].sort((a, b) => a.order - b.order);
  function isAnswered(question) {
    const value = answers[question.questionId];
    return Array.isArray(value)
      ? value.length > 0 && value.length === question.interactionData?.tokens?.length
      : value != null;
  }
  const answeredCount = questions.filter(isAnswered).length;

  return (
    <>
      <ExamWorkspace
        title={[
          attempt.isShortenedAssessment ? tr('Bài đánh giá rút gọn') : tr('Bài đánh giá năng lực'),
          levels.join(' + '),
        ].filter(Boolean).join(' ')}
        subtitle={`${attempt.totalQuestions} ${tr('câu')} · ${attempt.timeLimitMinutes} ${tr('phút')}`}
        questions={questions}
        isAnswered={isAnswered}
        clockLabel={clock}
        secondsLeft={seconds}
        urgentSecondsThreshold={60}
        saveState={saving ? 'saving' : answeredCount > 0 ? 'saved' : 'idle'}
        pending={pending}
        expired={seconds === 0}
        submitLabel={tr('Nộp bài đánh giá')}
        onRequestSubmit={() => setConfirmSubmit(true)}
        onExpiredSubmit={submit}
        renderQuestionBody={(question) => (
          question.questionType === 'Ordering' ? (
            <OrderingAnswer
              question={question}
              value={answers[question.questionId]}
              onChange={(value) => choose(question.questionId, value)}
            />
          ) : (
            <div className="grid gap-2">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.questionId] === option.optionId;
                return (
                  <div
                    key={option.optionId}
                    className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                      selected
                        ? 'border-rp-brand bg-rp-brand-tint/65'
                        : 'border-rp-line bg-rp-surface hover:border-rp-brand-border hover:bg-rp-brand-tint/30'
                    }`}
                  >
                    <Radio
                      name={`question-${question.questionId}`}
                      checked={selected}
                      onChange={() => choose(question.questionId, option.optionId)}
                      label={(
                        <span className="min-w-0 whitespace-pre-wrap">
                          <RichQuestionText text={option.content} />
                          {option.imageUrl && (
                            <img
                              src={option.imageUrl}
                              alt={trf('Hình đáp án {0}', { 0: optionIndex + 1 })}
                              className="mt-1 max-h-48 max-w-full rounded-md"
                            />
                          )}
                        </span>
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )
        )}
      />

      <Modal
        open={confirmSubmit}
        onClose={() => !pending && setConfirmSubmit(false)}
        title="Xác nhận nộp bài đánh giá?"
        description={trf('Bạn đã trả lời {0}/{1} câu.', { 0: answeredCount, 1: attempt.totalQuestions })}
        size="sm"
        footer={(
          <>
            <Button variant="neutral" onClick={() => setConfirmSubmit(false)} disabled={pending}>
              {tr('Quay lại')}
            </Button>
            <Button variant="primary" loading={pending} disabled={pending} onClick={submit}>
              {tr('Xác nhận nộp bài')}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-rp-text-2">
          {answeredCount < attempt.totalQuestions
            ? tr('Vẫn còn câu chưa trả lời. Sau khi nộp, hệ thống sẽ chấm điểm và hiển thị kết quả ngay.')
            : tr('Bạn đã hoàn thành toàn bộ câu hỏi. Bấm xác nhận để nhận kết quả.')}
        </p>
      </Modal>
    </>
  );
}

export default function ExamN3() {
  const { tr, trf } = useLocale();
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getSession();
  const requestedId = Number(new URLSearchParams(search).get('attemptId')) || null;

  // One general assessment for the confirmed goal (the server picks the scope from the goal + question bank).
  const scopeParams = useMemo(() => ({}), []);

  const keyFor = (id, scope = '') => [...placementAssessmentKey(session, id), scope];
  const scopeKey = 'goal';
  const query = useQuery({
    queryKey: keyFor(requestedId, scopeKey),
    queryFn: () => loadAssessment(requestedId, scopeParams),
    enabled: Boolean(session?.accessToken),
    retry: false,
    staleTime: 10_000,
  });
  const { status, attempt, result, active, notice } = query.data ?? {};
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const visibleError = error || query.error?.message;
  const hasGoal = Boolean(status?.isGoalConfirmed && status?.targetJlptLevelId);
  const target = status?.targetJlptLevelName || 'cấp độ mục tiêu';

  const {
    isLatest,
    matchesTarget,
    isDifferentGoal,
    isInsufficientForTarget,
    canPlan,
    canSetGoal,
    canSupplement,
    canRetake,
  } = getPlacementResultActions(status, result);
  const canSelfStudy = Boolean(result && canPlan && !result.isMiniAssessment);
  const resultTarget = result?.screeningLevelName
    || result?.levelBreakdowns?.find((level) => level.jlptLevelId === result.assessmentTargetLevelId)?.jlptLevelName
    || (result?.isComprehensiveAssessment ? tr('Tổng hợp N5–N3') : tr('cấp độ của bài này'));
  const chartTarget = Object.hasOwn(chartLevelsByTarget, resultTarget)
    ? resultTarget
    : Object.keys(chartLevelsByTarget).findLast(level => result?.levelBreakdowns?.some(item => item.jlptLevelName === level))
      ?? status?.targetJlptLevelName;
  const showCurrentAssessment = Boolean(active) || Boolean(status && result && !isLatest);
  const allowance = status?.attemptAllowance ?? null;
  const plannedLevels = Array.isArray(status?.plannedAssessmentLevelCodes) ? status.plannedAssessmentLevelCodes : [];
  const plannedSkills = Array.isArray(status?.plannedSkillCodes) ? status.plannedSkillCodes : [];
  // Direct URL without a goal shows the same guide as the locked Sidebar item.
  const goalGate = resolveFeatureLock({ hasConfirmedGoal: false }, 'placement');
  const quotaInitialized = Boolean(status?.quotaInitialized ?? allowance);
  const pendingSubmissionId = allowance?.pendingSubmissionAttemptId ?? null;
  // "Out of attempts" only from a loaded status with a confirmed goal — never for a missing goal or while loading.
  const quotaExhausted = Boolean(
    status &&
    hasGoal &&
    quotaInitialized &&
    !status.hasActiveAttempt &&
    !pendingSubmissionId &&
    (status.cannotStartReason === 'PLACEMENT_ATTEMPT_LIMIT_REACHED' || allowance?.remaining === 0),
  );
  const studyLevel = result?.skillAssessments?.find(item => item.skillCode === 'listening')?.recommendedStudyLevelCode
    ?? chartLevelsByTarget[chartTarget]?.[0] ?? chartTarget;
  const resultLevelSummary = result?.levelBreakdowns?.map((level) => level.jlptLevelName).filter(Boolean).join(' + ')
    || result?.screeningLevelName
    || '';

  function openAttempt(id, data) {
    void queryClient.invalidateQueries({ queryKey: keyFor(null, scopeKey), exact: true, refetchType: 'none' });
    queryClient.setQueryData(keyFor(id, scopeKey), data);
    navigate(`${assessmentUrl}?attemptId=${id}`, { replace: true });
  }

  async function run(action, { loadingMessage, successMessage, errorTitle, toastKey } = {}) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    if (loadingMessage) {
      notify.loading(loadingMessage, '', { key: toastKey || 'placement-n3-action', maxWaitMs: 30000 });
    }
    try {
      await action();
      if (successMessage) {
        notify.success(successMessage, '', { key: toastKey || 'placement-n3-action', replace: Boolean(loadingMessage) });
      }
    } catch (err) {
      const msg = err.message || 'Chưa thực hiện được. Vui lòng thử lại.';
      setError(msg);
      notify.apiError(err, errorTitle || 'Chưa thực hiện được', {
        key: toastKey || 'placement-n3-action',
        replace: Boolean(loadingMessage),
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function start(retakeTargetAssessment = false) {
    return run(async () => {
      const next = await startPlacementAttempt({ retakeTargetAssessment });
      await invalidateLearnerSetupQueries(queryClient);
      openAttempt(next.attemptId, { status, attempt: next });
    }, { errorTitle: 'Không thể bắt đầu bài đánh giá', toastKey: 'placement-n3-start' });
  }

  function submitExpiredAttempt() {
    if (!pendingSubmissionId) return undefined;
    return run(async () => {
      const completed = await submitPlacementAttempt(pendingSubmissionId, []);
      await invalidateLearnerSetupQueries(queryClient);
      const latestStatus = await getPlacementStatus(scopeParams).catch(() => status);
      openAttempt(completed.attemptId, { status: latestStatus, result: completed });
    }, {
      loadingMessage: 'Đang nộp lượt đã hết giờ…',
      successMessage: 'Đã hoàn tất lượt đánh giá!',
      errorTitle: 'Chưa nộp được lượt đánh giá',
      toastKey: 'placement-n3-submit-expired',
    });
  }

  function returnToCurrentAssessment() {
    return run(async () => {
      const current = await loadAssessment(null, scopeParams);
      queryClient.setQueryData(keyFor(null, scopeKey), current);
      navigate(assessmentUrl, { replace: true });
    }, { errorTitle: 'Không tải được lượt đánh giá hiện tại', toastKey: 'placement-n3-resume' });
  }

  function submit(id, saved, answers) {
    return run(async () => {
      await saved;
      const completed = await submitPlacementAttempt(id, answers);
      await invalidateLearnerSetupQueries(queryClient);
      openAttempt(completed.attemptId, { result: completed });
      const latestStatus = await getPlacementStatus(scopeParams);
      queryClient.setQueryData(keyFor(completed.attemptId, scopeKey), { status: latestStatus, result: completed });
    }, {
      loadingMessage: 'Đang nộp bài đánh giá…',
      successMessage: 'Đã nộp bài đánh giá thành công!',
      errorTitle: 'Chưa nộp được bài đánh giá',
      toastKey: `placement-n3-submit-${id}`,
    });
  }

  return <LearnerShell pathname={pathname} breadcrumb={tr('Đánh giá năng lực')}>
    <PageContainer data-page="PlacementAssessment" width={result ? 'wide' : 'default'} density="comfortable" className="space-y-4 text-rp-text">
      <IllustratedPageHeader
        icon="placement"
        tone="navy"
        eyebrow="JLPT N5 – N2"
        title={tr('Đánh giá năng lực JLPT')}
        description={tr('Kiểm tra trình độ hiện tại để RikiPath xây dựng lộ trình học phù hợp với mục tiêu của bạn.')}
        actions={hasGoal ? (
          <Button as={Link} to="/onboarding" variant="secondary" size="md">
            {tr('Đổi mục tiêu học tập')}
          </Button>
        ) : null}
      />

      {!session?.accessToken && (
        <Banner
          tone="info"
          actions={
            <Button as={Link} to="/auth" variant="primary" size="sm">
              {tr('Đăng nhập để làm bài')}
            </Button>
          }
        >
          {tr('Đăng nhập để bắt đầu hoặc xem lại kết quả đánh giá năng lực JLPT của bạn.')}
        </Banner>
      )}

      {visibleError && (
        <Banner
          tone="danger"
          actions={(query.error || (result && !status)) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending || query.isFetching}
              onClick={() => { setError(''); query.refetch(); }}
            >
              {tr('Thử tải lại')}
            </Button>
          )}
        >
          {visibleError}
        </Banner>
      )}

      {state?.placementMessage && <Banner tone="info">{state.placementMessage}</Banner>}
      {notice && <Banner tone="info">{notice}</Banner>}

      {query.isLoading && (
        <Card>
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
        </Card>
      )}

      {attempt && <AttemptForm key={attempt.attemptId} attempt={attempt} pending={pending} onSubmit={submit} reportError={setError} />}

      {result && (
        <div className="space-y-4">
          {isInsufficientForTarget && status?.placementCompatibilityReason && (
            <Banner
              tone="warning"
              title={trf('Cần đánh giá bổ sung cho mục tiêu JLPT {0}', { 0: target })}
              actions={
                canSupplement && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={pending}
                    onClick={() => start(false)}
                  >
                    {trf('Đánh giá bổ sung {0}', { 0: target })}
                  </Button>
                )
              }
            >
              {status.placementCompatibilityReason}
            </Banner>
          )}

          {!hasGoal && (
            <Banner
              tone="info"
              title={tr('Bạn chưa thiết lập mục tiêu JLPT')}
              actions={(
                <div className="flex flex-wrap gap-2">
                  <Button as={Link} to="/onboarding/" variant="primary" size="sm" icon={Target}>
                    {tr('Thiết lập mục tiêu JLPT')}
                  </Button>
                  <Button as={Link} to="/app/" variant="secondary" size="sm">
                    {tr('Để sau')}
                  </Button>
                </div>
              )}
            >
              {tr('Kết quả đánh giá đã được lưu. Hãy chọn mục tiêu JLPT cho hành trình tiếp theo.')}
            </Banner>
          )}

          <AssessmentResultDashboard
            result={result}
            onceKey={result.attemptId ? `assessment-${result.attemptId}` : undefined}
            badgeText={
              resultLevelSummary
                ? `${result.isComprehensiveAssessment ? tr('Đánh giá tổng hợp') : tr('Đánh giá năng lực')} · ${resultLevelSummary}`
                : tr('Đánh giá năng lực')
            }
            targetLevelLabel={status?.targetJlptLevelName}
            chartTarget={chartTarget}
            visibleLevels={chartLevelsByTarget[chartTarget]}
            allowanceText={
              allowance && quotaInitialized && matchesTarget
                ? trf('Còn {0}/{1} lượt đánh giá cho phạm vi này', { 0: allowance.remaining, 1: allowance.limit })
                : undefined
            }
            showAiCta={!showCurrentAssessment && (canSelfStudy || canSetGoal)}
            primaryCtaTo={canSetGoal ? '/onboarding/' : '/roadmap/'}
            primaryCtaLabel={canSetGoal ? tr('Thiết lập mục tiêu JLPT') : tr('Tạo lộ trình học')}
            footerActions={
              <>
                {!showCurrentAssessment && canSelfStudy && (
                  <>
                    <Button as={Link} to="/roadmap/" variant="secondary" size="sm" iconRight={ArrowRight}>
                      {tr('Xem lộ trình học')}
                    </Button>
                    <Button
                      as={Link}
                      to={studyLevel ? '/riki/listening/?level=' + studyLevel : '/riki/listening/'}
                      variant="ghost"
                      size="sm"
                    >
                      {tr('Tự ôn với audio')}
                    </Button>
                    <Button as={Link} to="/cohorts/" variant="ghost" size="sm">
                      {tr('Tìm lớp nhóm cùng Giáo viên')}
                    </Button>
                  </>
                )}

                {canRetake && !isInsufficientForTarget && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => start(true)}
                  >
                    {trf('Đánh giá lại {0}', { 0: resultTarget })}
                  </Button>
                )}

                {showCurrentAssessment && (
                  <Button variant="primary" size="sm" disabled={pending} onClick={returnToCurrentAssessment}>
                    {isDifferentGoal && status?.targetJlptLevelName ? trf('Quay về đánh giá {0}', { 0: target }) : tr('Quay về đánh giá hiện tại')}
                  </Button>
                )}

                <Button as={Link} to="/app/" variant="ghost" size="sm">
                  {tr('Để sau')}
                </Button>
              </>
            }
          />
        </div>
      )}

      {status && !attempt && !result && !hasGoal && !status.hasActiveAttempt && !pendingSubmissionId && (
        <Card className="mx-auto max-w-[480px] text-center" data-gate="placement-goal-required">
          {/* Same guide as the Sidebar/search lock for this feature and state (one resolver). */}
          <SetupGuideArt art={goalGate.art} />
          <p className="mt-3 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-rp-brand-strong">{tr(goalGate.category)}</p>
          <h2 className="mt-1.5 text-[20px] font-extrabold leading-7 text-rp-text">{tr(goalGate.title)}</h2>
          <p className="mt-1.5 text-sm leading-6 text-rp-text-2">{tr(goalGate.description)}</p>
          <div className="mt-4"><SetupGuideSteps steps={goalGate.steps} /></div>
          <div className="mt-5 space-y-1.5">
            <Button as={Link} to={goalGate.primary.to} variant="primary" size="lg" className="rp-guide-cta w-full" iconRight={ArrowRight}>
              {tr(goalGate.primary.label)}
            </Button>
            <Button as={Link} to="/app/" variant="ghost" size="md" className="w-full">
              {tr('Để sau')}
            </Button>
          </div>
        </Card>
      )}

      {status && !attempt && !result && (hasGoal || status.hasActiveAttempt || pendingSubmissionId) && (
        <div className="space-y-4">
          {!status.hasActiveAttempt && pendingSubmissionId && (
            <Banner tone="warning" title={tr('Bài đánh giá đã hết giờ')}>
              {tr('Hãy nộp bài để xem kết quả. Sau đó bạn có thể làm lượt mới nếu còn lượt.')}
            </Banner>
          )}

          {quotaExhausted && (
            <Banner tone="warning" title={tr('Bạn đã dùng hết lượt đánh giá')}>
              {trf('Bạn đã dùng {0}/{1} lượt đánh giá năng lực.', { 0: allowance?.started ?? 0, 1: allowance?.limit ?? 0 })}
            </Banner>
          )}

          <Card className="space-y-4" data-section="PlacementStartCard">
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-extrabold text-rp-navy">{tr('Bài đánh giá năng lực')}</h2>
              <p className="text-sm leading-6 text-rp-text-2">
                {tr('Bài đánh giá giúp xác định trình độ hiện tại của bạn, không phụ thuộc vào cấp độ mục tiêu.')}
              </p>
            </div>

            <dl className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {hasGoal && (
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5">
                  <dt className="text-[12px] font-semibold text-rp-text-muted">{tr('Mục tiêu JLPT')}</dt>
                  <dd className="mt-0.5 text-sm font-extrabold text-rp-navy">{formatJlptLevel(target)}</dd>
                </div>
              )}
              {allowance && quotaInitialized && hasGoal && (
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5">
                  <dt className="text-[12px] font-semibold text-rp-text-muted">{tr('Lượt đánh giá còn lại')}</dt>
                  <dd className="mt-0.5 text-sm font-extrabold tabular-nums text-rp-navy">{trf('{0}/{1} lượt', { 0: allowance.remaining, 1: allowance.limit })}</dd>
                </div>
              )}
              {plannedLevels.length > 0 && (
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5">
                  <dt className="text-[12px] font-semibold text-rp-text-muted">{tr('Phạm vi đánh giá')}</dt>
                  <dd className="mt-0.5 text-sm font-extrabold text-rp-navy">{plannedLevels.map((code) => formatJlptLevel(code)).join(' · ')}</dd>
                </div>
              )}
              {plannedSkills.length > 0 && (
                <div className="rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2.5 sm:col-span-2 lg:col-span-3">
                  <dt className="text-[12px] font-semibold text-rp-text-muted">{tr('Kỹ năng được đánh giá')}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-rp-navy">{plannedSkills.map((code) => tr(SKILL_LABELS[code] || code)).join(' · ')}</dd>
                </div>
              )}
            </dl>
            <p className="text-[12.5px] leading-5 text-rp-text-muted">
              {tr('Số câu và thời gian làm bài được chuẩn bị từ ngân hàng câu hỏi khi bạn bắt đầu, và hiển thị ngay trên bài làm.')}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {status.hasActiveAttempt ? (
                <Button variant="primary" size="md" disabled={pending} icon={PlayCircle} onClick={returnToCurrentAssessment}>
                  {tr('Tiếp tục bài đánh giá')}
                </Button>
              ) : pendingSubmissionId ? (
                <Button variant="primary" size="md" disabled={pending} onClick={submitExpiredAttempt}>
                  {tr('Nộp bài đánh giá')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={pending || quotaExhausted || !hasGoal}
                  onClick={() => start(false)}
                  iconRight={ArrowRight}
                >
                  {tr('Bắt đầu đánh giá')}
                </Button>
              )}
              <Button as={Link} to="/app/" variant="ghost" size="md">
                {tr('Để sau')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  </LearnerShell>;
}
