import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { getSession } from '@/app/auth/session.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { SakuraLoader } from '@/components/ui';
import {
  getPlacementResultActions,
  loadAssessment,
  placementAssessmentKey,
  getPlacementStatus,
  savePlacementAnswers,
  startPlacementAttempt,
  submitPlacementAttempt,
} from '@/features/placement/api/placementApi.js';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const buttonClass = 'inline-flex items-center justify-center rounded-lg bg-rp-brand-strong px-4 py-2.5 text-sm font-semibold text-white hover:bg-rp-brand-deep disabled:opacity-50';
const cardClass = 'rounded-xl border border-rp-line bg-white p-5';
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
  const deadline = attempt.localDeadline;
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 250);
    return () => clearInterval(interval);
  }, [deadline]);

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

  return <>
    <section className={cardClass}>
      <div>
        <h2 className="font-semibold">
          {[attempt.isShortenedAssessment ? 'Bài đánh giá rút gọn' : 'Bài đánh giá năng lực', levels.join(' + ')].filter(Boolean).join(' ')}
        </h2>
        <p className="mt-1 text-xs text-rp-text-muted">{attempt.totalQuestions}{' '}{tr('câu ·')}{' '}{attempt.timeLimitMinutes}{' '}{tr('phút · Đã trả lời')}{' '}{answeredCount}/{attempt.totalQuestions}{saving && tr(' · Đang lưu đáp án…')}</p>
      </div>
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <aside aria-label={tr('Thông tin lượt làm bài')} className={`${cardClass} lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}>
        <div className="flex items-center justify-between gap-2 border-b border-rp-line pb-3">
          <span className="text-sm font-semibold">{tr('Thời gian còn lại')}</span>
        <span className="rounded-lg bg-rp-brand-tint px-3 py-2 font-semibold tabular-nums text-rp-brand-strong" aria-label={tr('Thời gian còn lại')}>{clock}</span>
        </div>
        <p className="mt-3 text-sm font-semibold">{tr('Danh sách câu hỏi')}</p>
        <nav aria-label={tr('Chuyển đến câu hỏi')} className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
          {questions.map((question, index) => (
            <button key={question.questionId} type="button" aria-label={trf('Câu {0}, {1}', { 0: index + 1, 1: isAnswered(question) ? 'đã trả lời' : 'chưa trả lời' })}
              onClick={() => document.getElementById(`placement-question-${question.questionId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
              className={`h-9 min-w-0 rounded-lg border text-sm ${isAnswered(question) ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong' : 'border-rp-line'}`}>{index + 1}</button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
        {questions.map((question, index) => (
          <fieldset id={`placement-question-${question.questionId}`} key={question.questionId} disabled={pending || seconds === 0} className={`${cardClass} scroll-mt-36`}>
            <legend className="px-2 text-xs font-semibold text-rp-brand-strong">{trf('Câu {0}', { 0: index + 1 })}</legend>
            <p className="whitespace-pre-wrap text-sm font-medium">{question.content}</p>
            {question.imageUrl && <img src={question.imageUrl} alt={tr('Hình minh họa câu hỏi')} className="mt-3 max-h-80 max-w-full rounded-lg" />}
            {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mt-3 w-full" />}
            {question.questionType === 'Ordering'
              ? <OrderingAnswer question={question} value={answers[question.questionId]}
                  onChange={value => choose(question.questionId, value)} />
              : <div className="mt-4 grid gap-2">
              {question.options.map((option, optionIndex) => (
                <label key={option.optionId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-rp-line px-3 py-2.5 text-sm has-checked:border-rp-brand-strong has-checked:bg-rp-brand-tint">
                  <input type="radio" className="mt-1" name={`question-${question.questionId}`} checked={answers[question.questionId] === option.optionId} onChange={() => choose(question.questionId, option.optionId)} />
                  <span className="min-w-0 whitespace-pre-wrap">
                    {option.content}
                    {option.imageUrl && <img src={option.imageUrl} alt={trf('Hình đáp án {0}', { 0: optionIndex + 1 })} className="max-h-48 max-w-full rounded-md" />}
                  </span>
                </label>
              ))}
            </div>}
          </fieldset>
        ))}
        <div className="flex items-center justify-end gap-3">
          {seconds === 0 ? <>
            <p role="status" className="text-sm text-rp-text-muted">
              {pending ? tr('Đã hết giờ. Đang tự động nộp bài…') : tr('Đã hết thời gian làm bài.')}
            </p>
            {!pending && <button type="button" className={buttonClass} onClick={submit}>{tr('Thử nộp lại')}</button>}
          </> : confirmSubmit ? <>
            <span className="text-sm">{trf('Bạn đã trả lời {0}/{1} câu.', { 0: answeredCount, 1: attempt.totalQuestions })}</span>
            <button type="button" onClick={() => setConfirmSubmit(false)} className="text-sm text-rp-brand-strong underline">{tr('Quay lại')}</button>
            <button type="button" className={buttonClass} disabled={pending} onClick={submit}>{tr('Xác nhận nộp bài')}</button>
          </> : <button type="button" className={buttonClass} disabled={pending} onClick={() => setConfirmSubmit(true)}>{pending ? tr('Đang xử lý…') : tr('Nộp bài đánh giá')}</button>}
        </div>
      </div>
    </div>
  </>;
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
    <main className="min-h-full bg-rp-brand-tint py-6 text-rp-text lg:py-8">
      <div className={`${attempt ? 'rp-container' : 'rp-container-reading'} space-y-4`}>
        <header className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
          <h1 className="text-xl font-semibold">{tr('Đánh giá năng lực JLPT')}</h1>
          <Link to="/onboarding" className="text-sm font-semibold text-rp-brand-strong underline">{tr('Đổi mục tiêu học tập')}</Link>
        </header>
        {!session?.accessToken && <Link to="/auth" className={buttonClass}>{tr('Đăng nhập để làm bài')}</Link>}
        {visibleError && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {visibleError}
          {(query.error || (result && !status)) && <button type="button" disabled={pending || query.isFetching} onClick={() => { setError(''); query.refetch(); }} className="ml-3 font-semibold underline">{tr('Thử tải lại')}</button>}
        </div>}
        {state?.placementMessage && <p className={cardClass}>{state.placementMessage}</p>}
        {notice && <p className={cardClass}>{notice}</p>}
        {query.isLoading && (
          <div className={cardClass}>
            <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
          </div>
        )}
        {attempt && <AttemptForm key={attempt.attemptId} attempt={attempt} pending={pending} onSubmit={submit} reportError={setError} />}
        {result && <section className={cardClass}>
          <h2 className="text-lg font-semibold">
            {tr('Kết quả')}{' '}{result.isShortenedAssessment ? tr('đánh giá rút gọn') : tr('đánh giá năng lực')} {result.levelBreakdowns?.map(level => level.jlptLevelName).filter(Boolean).join(' + ') || result.screeningLevelName}
          </h2>
          <p className="mt-2 text-2xl font-bold text-rp-brand-strong">{Number(result.totalScore).toLocaleString(currentIntlTag(), { maximumFractionDigits: 2 })}%</p>
          <p className="mt-1 text-sm">{trf('{0}/{1} câu đúng', { 0: result.correctCount, 1: result.totalQuestions })}</p>
          {allowance && matchesTarget && <p className="mt-1 text-sm text-rp-text-2">
            {trf('Còn {0}/{1} lượt đánh giá cho mục tiêu {2}', { 0: allowance.remaining, 1: allowance.limit, 2: target })}
          </p>}
          {result.notStudiedCount > 0 && <p className="mt-1 text-sm text-rp-text-2">
            {trf('Chưa học hoặc không biết · {0} câu', { 0: result.notStudiedCount })}
          </p>}
          <SkillAssessmentChart key={result.attemptId} result={result} targetLevel={chartTarget}
            visibleLevels={chartLevelsByTarget[chartTarget]} />
          {result.sections?.length > 0 && <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {result.sections.map((section, index) => <li key={section.mockTestSectionId ?? index} className="rounded-lg bg-rp-brand-tint p-2">{section.sectionTitle || section.sectionName || section.languageSkillName} · {section.correctCount}/{section.totalQuestions ?? section.totalCount}{' '}{tr('câu')}</li>)}
          </ul>}
          {canStartUpdatedAssessment && <>
            <p className="mt-3 text-sm">{trf('Bạn có thể làm lượt đánh giá mới cho mục tiêu {0}.', { 0: target })}</p>
            <button type="button" className={`${buttonClass} mt-4 mr-2`} disabled={pending} onClick={() => start()}>{trf('Bắt đầu bài đánh giá {0} mới', { 0: target })}</button>
          </>}
          {result.assessmentMessage && <p className="mt-3 text-sm">{result.assessmentMessage}</p>}
          {isDifferentGoal && <p className="mt-3 rounded-lg bg-rp-brand-tint p-3 text-sm">
            {tr('Kết quả này thuộc bài đánh giá trước đó. Hãy quay về bài đánh giá dành cho thiết lập mục tiêu')}{' '}<strong>{target}</strong>{' '}{tr('hiện tại để tiếp tục.')}
          </p>}
          {!showCurrentAssessment && (canSelfStudy || canRetake) && <div className="mt-4 flex flex-wrap items-center gap-3">
            {canSelfStudy && <>
              <Link className={buttonClass} to="/roadmap/#self-study-roadmap-title">{tr('Xem lộ trình tự học')}</Link>
              <Link className="text-sm font-semibold text-rp-brand-strong underline"
                to={studyLevel ? '/riki/listening/?level=' + studyLevel : '/riki/listening/'}>{tr('Tự ôn với audio')}</Link>
              <Link className="text-sm font-semibold text-rp-brand-strong underline" to="/mentors/">{tr('Tìm lớp nhóm cùng Mentor')}</Link>
            </>}
            {canRetake && <button type="button" className="text-sm font-semibold text-rp-brand-strong underline" disabled={pending} onClick={() => start(true)}>
              {trf('Làm lại bài đánh giá {0}', { 0: resultTarget })}
            </button>}
          </div>}
          {showCurrentAssessment && <button type="button" className={`${buttonClass} mt-4`} disabled={pending} onClick={returnToCurrentAssessment}>{isDifferentGoal && status?.targetJlptLevelName ? trf('Quay về đánh giá {0}', { 0: target }) : tr('Quay về đánh giá hiện tại')}</button>}
          {isLatest && matchesTarget && !showCurrentAssessment && !canSelfStudy && !canStartUpdatedAssessment && <Link className="mt-4 inline-block text-sm font-semibold text-rp-brand-strong underline" to="/onboarding">{tr('Kiểm tra mục tiêu học tập')}</Link>}
        </section>}
        {result && <LearnerFeedbackPanel type="placement" id={result.attemptId} label="Phản hồi về bài đánh giá năng lực" />}
        {status && !attempt && !result && <section className={cardClass}>
          <h2 className="font-semibold">{trf('Mục tiêu {0}', { 0: target })}</h2>
          <p className="mt-2 text-sm">{tr('Bài đánh giá gồm từ vựng, ngữ pháp, đọc hiểu và nghe hiểu.')}</p>
          {allowance && <p className="mt-2 text-sm">{trf('Còn {0}/{1} lượt đánh giá.', { 0: allowance.remaining, 1: allowance.limit })}</p>}
          {status.canStartNewAttempt !== false
            ? <button type="button" className={`${buttonClass} mt-4`} disabled={pending} onClick={() => start()}>{tr('Bắt đầu bài đánh giá')}</button>
            : allowance?.remaining === 0 ? <p className="mt-2 text-sm">{tr('Bạn đã dùng hết lượt cho mục tiêu này.')}</p>
              : <Link className={`${buttonClass} mt-4 inline-block`} to="/onboarding">{tr('Chọn mục tiêu và ngày thi')}</Link>}
        </section>}
      </div>
    </main>
  </LearnerShell>;
}
