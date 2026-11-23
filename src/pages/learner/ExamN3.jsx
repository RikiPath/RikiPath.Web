import AssessmentResultDashboard from '@/features/mock-test/components/AssessmentResultDashboard.jsx';
import ExamWorkspace from '@/features/mock-test/components/ExamWorkspace.jsx';
import OrderingAnswer from '@/features/mock-test/components/OrderingAnswer.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { getSession } from '@/app/auth/session.js';
import { notify } from '@/components/ui/feedbackStore.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Modal,
  PageContainer,
  Radio,
  SakuraLoader,
} from '@/components/ui';
import {
  getPlacementResultActions,
  loadAssessment,
  placementAssessmentKey,
  getPlacementStatus,
  getActivePlacementAttempt,
  savePlacementAnswers,
  skipStandardPlacement,
  startPlacementAttempt,
  submitPlacementAttempt,
} from '@/features/placement/api/placementApi.js';
import { useLocale } from '@/locales/locale.js';
import { IllustratedPageHeader, WebClayIcon, resolveSurfaceTone } from '@/features/learner-ui';

const PLACEMENT_SKILLS_PREVIEW = [
  { key: 'vocabulary', label: 'Từ vựng', tone: 'mint' },
  { key: 'grammar', label: 'Ngữ pháp', tone: 'peach' },
  { key: 'reading', label: 'Đọc hiểu', tone: 'navy' },
  { key: 'listening', label: 'Nghe hiểu', tone: 'sky' },
];

const assessmentUrl = '/app/placement-test';
const chartLevelsByTarget = {
  N5: ['N5'],
  N4: ['N5', 'N4'],
  N3: ['N4', 'N3'],
  N2: ['N3', 'N2'],
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
                          {option.content}
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
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)} disabled={pending}>
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
  const keyFor = (id) => placementAssessmentKey(session, id);
  const query = useQuery({
    queryKey: keyFor(requestedId),
    queryFn: () => loadAssessment(requestedId),
    enabled: Boolean(session?.accessToken),
    retry: false,
    staleTime: 10_000,
  });
  const { status, attempt, result, active, notice } = query.data ?? {};
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const visibleError = error || query.error?.message;
  const target = status?.targetJlptLevelName || 'cấp độ mục tiêu';
  const { isLatest, matchesTarget, isDifferentGoal, canStartUpdatedAssessment, canRetake } = getPlacementResultActions(status, result);
  const canSelfStudy = Boolean(result && status?.targetJlptLevelId && isLatest && matchesTarget && !result.isMiniAssessment);
  const resultTarget = result?.screeningLevelName
    || result?.levelBreakdowns?.find((level) => level.jlptLevelId === result.assessmentTargetLevelId)?.jlptLevelName
    || 'cấp độ của bài này';
  const chartTarget = Object.hasOwn(chartLevelsByTarget, resultTarget)
    ? resultTarget
    : Object.keys(chartLevelsByTarget).findLast(level => result?.levelBreakdowns?.some(item => item.jlptLevelName === level))
      ?? status?.targetJlptLevelName;
  const showCurrentAssessment = isDifferentGoal || Boolean(active) || Boolean(status && !isLatest);
  const allowance = status?.attemptAllowance;
  const studyLevel = result?.skillAssessments?.find(item => item.skillCode === 'listening')?.recommendedStudyLevelCode
    ?? chartLevelsByTarget[chartTarget]?.[0] ?? chartTarget;
  const resultLevelSummary = result?.levelBreakdowns?.map((level) => level.jlptLevelName).filter(Boolean).join(' + ')
    || result?.screeningLevelName
    || '';


  function openAttempt(id, data) {
    void queryClient.invalidateQueries({ queryKey: keyFor(null), exact: true, refetchType: 'none' });
    queryClient.setQueryData(keyFor(id), data);
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
      openAttempt(next.attemptId, { status, attempt: next });
    }, { errorTitle: 'Không thể bắt đầu bài đánh giá', toastKey: 'placement-n3-start' });
  }

  function skipAssessment() {
    return run(async () => {
      await skipStandardPlacement();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['learner', 'placement-status'] }),
        queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] }),
        queryClient.invalidateQueries({ queryKey: ['learner', 'profile'] }),
      ]);
      navigate('/roadmap/');
    }, {
      successMessage: 'Đã tạm bỏ qua bài đánh giá năng lực',
      errorTitle: 'Không thể bỏ qua bài đánh giá',
      toastKey: 'placement-n3-skip',
    });
  }

  function returnToCurrentAssessment() {
    return run(async () => {
      const current = await loadAssessment(null);
      queryClient.setQueryData(keyFor(null), current);
      navigate(assessmentUrl, { replace: true });
    }, { errorTitle: 'Không tải được lượt đánh giá hiện tại', toastKey: 'placement-n3-resume' });
  }

  function submit(id, saved, answers) {
    return run(async () => {
      await saved;
      const completed = await submitPlacementAttempt(id, answers);
      openAttempt(completed.attemptId, { result: completed });
      void queryClient.invalidateQueries({ queryKey: ['assessment-roadmap'] });
      void queryClient.invalidateQueries({ queryKey: ['learner', 'placement-status'] });
      // Refresh eligibility separately so a status failure never loses a submitted result.
      const latestStatus = await getPlacementStatus();
      queryClient.setQueryData(keyFor(completed.attemptId), { status: latestStatus, result: completed });
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
        description={tr('Kiểm tra trình độ hiện tại theo từng kỹ năng để nhận lộ trình học phù hợp.')}
        actions={(
          <Button as={Link} to="/onboarding" variant="secondary" size="md">
            {tr('Đổi mục tiêu học tập')}
          </Button>
        )}
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
          {canStartUpdatedAssessment && (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-rp-text-2">{trf('Bạn có thể làm lượt đánh giá mới cho mục tiêu {0}.', { 0: target })}</p>
              <Button variant="primary" size="sm" disabled={pending} onClick={() => start()}>
                {trf('Bắt đầu bài đánh giá {0} mới', { 0: target })}
              </Button>
            </Card>
          )}

          {isDifferentGoal && (
            <Banner tone="info">
              {tr('Kết quả này thuộc bài đánh giá trước đó. Hãy quay về bài đánh giá dành cho thiết lập mục tiêu')}{' '}<strong>{target}</strong>{' '}{tr('hiện tại để tiếp tục.')}
            </Banner>
          )}

          <AssessmentResultDashboard
            result={result}
            onceKey={result.attemptId ? `assessment-${result.attemptId}` : undefined}
            badgeText={
              resultLevelSummary
                ? `${result.isShortenedAssessment ? tr('Đánh giá rút gọn') : tr('Đánh giá năng lực')} · ${resultLevelSummary}`
                : tr('Đánh giá năng lực')
            }
            targetLevelLabel={status?.targetJlptLevelName}
            chartTarget={chartTarget}
            visibleLevels={chartLevelsByTarget[chartTarget]}
            allowanceText={
              allowance && matchesTarget
                ? trf('Còn {0}/{1} lượt đánh giá cho mục tiêu {2}', { 0: allowance.remaining, 1: allowance.limit, 2: target })
                : undefined
            }
            showAiCta={!showCurrentAssessment && canSelfStudy}
            primaryCtaTo="/roadmap/?generateAi=1"
            primaryCtaLabel={tr('Tạo lộ trình học với AI')}
            footerActions={
              <>
                {!showCurrentAssessment && (canSelfStudy || canRetake) && (
                  <>
                    {canSelfStudy && (
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
                    {canRetake && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => start(true)}
                      >
                        {trf('Làm lại bài đánh giá {0}', { 0: resultTarget })}
                      </Button>
                    )}
                  </>
                )}

                {showCurrentAssessment && (
                  <Button variant="primary" size="sm" disabled={pending} onClick={returnToCurrentAssessment}>
                    {isDifferentGoal && status?.targetJlptLevelName ? trf('Quay về đánh giá {0}', { 0: target }) : tr('Quay về đánh giá hiện tại')}
                  </Button>
                )}

                {isLatest && matchesTarget && !showCurrentAssessment && !canSelfStudy && !canStartUpdatedAssessment && (
                  <Link className="rp-focus rp-link inline-block text-sm font-semibold" to="/onboarding">
                    {tr('Kiểm tra mục tiêu học tập')}
                  </Link>
                )}
              </>
            }
          />
        </div>
      )}

      {status && !attempt && !result && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {allowance && (
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rp-brand-strong">
                  {trf('Còn {0}/{1} lượt đánh giá.', { 0: allowance.remaining, 1: allowance.limit })}
                </p>
              )}
              <h2 className="text-lg font-extrabold text-rp-navy">{trf('Mục tiêu {0}', { 0: target })}</h2>
              <p className="text-xs leading-5 text-rp-text-2">{tr('Bài đánh giá gồm từ vựng, ngữ pháp, đọc hiểu và nghe hiểu.')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {status.canStartNewAttempt !== false ? (
                <>
                  <Button variant="primary" size="md" disabled={pending} onClick={() => start()} iconRight={ArrowRight}>
                    {tr('Bắt đầu bài đánh giá')}
                  </Button>
                  <Button type="button" variant="secondary" size="md" disabled={pending} onClick={skipAssessment}>
                    {tr('Bỏ qua bài đánh giá năng lực')}
                  </Button>
                </>
              ) : allowance?.remaining === 0 ? (
                <Badge tone="warning" size="sm" icon={false}>{tr('Bạn đã dùng hết lượt cho mục tiêu này.')}</Badge>
              ) : (
                <Button as={Link} to="/onboarding" variant="primary" size="md">
                  {tr('Chọn mục tiêu và ngày thi')}
                </Button>
              )}
            </div>
          </Card>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLACEMENT_SKILLS_PREVIEW.map(({ key, label, tone }) => {
              const palette = resolveSurfaceTone(tone);
              return (
                <li key={key} className={`flex items-center gap-3.5 rounded-2xl border p-3.5 shadow-rp-xs ${palette.card}`}>
                  <WebClayIcon name={key} size="md" tone={tone} hover />
                  <span className="text-sm font-extrabold text-rp-navy">{tr(label)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageContainer>
  </LearnerShell>;
}
