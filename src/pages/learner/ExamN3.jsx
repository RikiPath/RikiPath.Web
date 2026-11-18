import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import OrderingAnswer from '../../components/OrderingAnswer.jsx';
import SkillAssessmentChart from '../../components/SkillAssessmentChart.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { getSession } from '../../auth/session.js';
import {
  getPlacementResultActions,
  loadAssessment,
  placementAssessmentKey,
  getPlacementStatus,
  savePlacementAnswers,
  startPlacementAttempt,
  submitPlacementAttempt,
} from '../../api/placementApi.js';

const buttonClass = 'inline-flex items-center justify-center rounded-lg bg-[#AD3155] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#982B4B] disabled:opacity-50';
const cardClass = 'rounded-xl border border-[#EADFE5] bg-white p-5';
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
        <p className="mt-1 text-xs text-[#967F8A]">{attempt.totalQuestions} câu · {attempt.timeLimitMinutes} phút · Đã trả lời {answeredCount}/{attempt.totalQuestions}{saving && ' · Đang lưu đáp án…'}</p>
      </div>
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <aside aria-label="Thông tin lượt làm bài" className={`${cardClass} lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}>
        <div className="flex items-center justify-between gap-2 border-b border-[#EADFE5] pb-3">
          <span className="text-sm font-semibold">Thời gian còn lại</span>
        <span className="rounded-lg bg-[#FFF0F5] px-3 py-2 font-semibold tabular-nums text-[#AD3155]" aria-label="Thời gian còn lại">{clock}</span>
        </div>
        <p className="mt-3 text-sm font-semibold">Danh sách câu hỏi</p>
        <nav aria-label="Chuyển đến câu hỏi" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
          {questions.map((question, index) => (
            <button key={question.questionId} type="button" aria-label={`Câu ${index + 1}, ${isAnswered(question) ? 'đã trả lời' : 'chưa trả lời'}`}
              onClick={() => document.getElementById(`placement-question-${question.questionId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
              className={`h-9 min-w-0 rounded-lg border text-sm ${isAnswered(question) ? 'border-[#D28DA4] bg-[#FFF0F5] text-[#AD3155]' : 'border-[#EADFE5]'}`}>{index + 1}</button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
        {questions.map((question, index) => (
          <fieldset id={`placement-question-${question.questionId}`} key={question.questionId} disabled={pending || seconds === 0} className={`${cardClass} scroll-mt-36`}>
            <legend className="px-2 text-xs font-semibold text-[#AD3155]">Câu {index + 1}</legend>
            <p className="whitespace-pre-wrap text-sm font-medium">{question.content}</p>
            {question.imageUrl && <img src={question.imageUrl} alt="Hình minh họa câu hỏi" className="mt-3 max-h-80 max-w-full rounded-lg" />}
            {question.audioUrl && <audio controls preload="none" src={question.audioUrl} className="mt-3 w-full" />}
            {question.questionType === 'Ordering'
              ? <OrderingAnswer question={question} value={answers[question.questionId]}
                  onChange={value => choose(question.questionId, value)} />
              : <div className="mt-4 grid gap-2">
              {question.options.map((option, optionIndex) => (
                <label key={option.optionId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#EADFE5] px-3 py-2.5 text-sm has-checked:border-[#AD3155] has-checked:bg-[#FFF0F5]">
                  <input type="radio" className="mt-1 accent-[#AD3155]" name={`question-${question.questionId}`} checked={answers[question.questionId] === option.optionId} onChange={() => choose(question.questionId, option.optionId)} />
                  <span className="min-w-0 whitespace-pre-wrap">
                    {option.content}
                    {option.imageUrl && <img src={option.imageUrl} alt={`Hình đáp án ${optionIndex + 1}`} className="max-h-48 max-w-full rounded-md" />}
                  </span>
                </label>
              ))}
            </div>}
          </fieldset>
        ))}
        <div className="flex items-center justify-end gap-3">
          {seconds === 0 ? <>
            <p role="status" className="text-sm text-[#967F8A]">
              {pending ? 'Đã hết giờ. Đang tự động nộp bài…' : 'Đã hết thời gian làm bài.'}
            </p>
            {!pending && <button type="button" className={buttonClass} onClick={submit}>Thử nộp lại</button>}
          </> : confirmSubmit ? <>
            <span className="text-sm">Bạn đã trả lời {answeredCount}/{attempt.totalQuestions} câu.</span>
            <button type="button" onClick={() => setConfirmSubmit(false)} className="text-sm text-[#AD3155] underline">Quay lại</button>
            <button type="button" className={buttonClass} disabled={pending} onClick={submit}>Xác nhận nộp bài</button>
          </> : <button type="button" className={buttonClass} disabled={pending} onClick={() => setConfirmSubmit(true)}>{pending ? 'Đang xử lý…' : 'Nộp bài đánh giá'}</button>}
        </div>
      </div>
    </div>
  </>;
}

export default function ExamN3() {
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

  async function run(action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Chưa thực hiện được. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function start(retakeTargetAssessment = false) {
    return run(async () => {
      const next = await startPlacementAttempt({ retakeTargetAssessment });
      openAttempt(next.attemptId, { status, attempt: next });
    });
  }

  function returnToCurrentAssessment() {
    return run(async () => {
      const current = await loadAssessment(null);
      queryClient.setQueryData(keyFor(null), current);
      navigate(assessmentUrl, { replace: true });
    });
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
    });
  }

  return <LearnerShell pathname={pathname} breadcrumb="Đánh giá năng lực">
    <main className="min-h-full bg-[#FCF8FA] px-4 py-6 text-[#49353F]">
      <div className={`mx-auto space-y-4 ${attempt ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <header className={`${cardClass} flex flex-wrap items-center justify-between gap-3`}>
          <h1 className="text-xl font-semibold">Đánh giá năng lực JLPT</h1>
          <Link to="/onboarding" className="text-sm font-semibold text-[#AD3155] underline">Đổi mục tiêu học tập</Link>
        </header>
        {!session?.accessToken && <Link to="/auth" className={buttonClass}>Đăng nhập để làm bài</Link>}
        {visibleError && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {visibleError}
          {(query.error || (result && !status)) && <button type="button" disabled={pending || query.isFetching} onClick={() => { setError(''); query.refetch(); }} className="ml-3 font-semibold underline">Thử tải lại</button>}
        </div>}
        {state?.placementMessage && <p className={cardClass}>{state.placementMessage}</p>}
        {notice && <p className={cardClass}>{notice}</p>}
        {query.isLoading && <p className={cardClass}>Đang tải trạng thái đánh giá…</p>}
        {attempt && <AttemptForm key={attempt.attemptId} attempt={attempt} pending={pending} onSubmit={submit} reportError={setError} />}
        {result && <section className={cardClass}>
          <h2 className="text-lg font-semibold">
            Kết quả {result.isShortenedAssessment ? 'đánh giá rút gọn' : 'đánh giá năng lực'} {result.levelBreakdowns?.map(level => level.jlptLevelName).filter(Boolean).join(' + ') || result.screeningLevelName}
          </h2>
          <p className="mt-2 text-2xl font-bold text-[#AD3155]">{Number(result.totalScore).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</p>
          <p className="mt-1 text-sm">{result.correctCount}/{result.totalQuestions} câu đúng</p>
          {allowance && matchesTarget && <p className="mt-1 text-sm text-[#765E6B]">
            Còn {allowance.remaining}/{allowance.limit} lượt đánh giá cho mục tiêu {target}
          </p>}
          {result.notStudiedCount > 0 && <p className="mt-1 text-sm text-[#765E6B]">
            Chưa học hoặc không biết · {result.notStudiedCount} câu
          </p>}
          <SkillAssessmentChart key={result.attemptId} result={result} targetLevel={chartTarget}
            visibleLevels={chartLevelsByTarget[chartTarget]} />
          {result.sections?.length > 0 && <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {result.sections.map((section, index) => <li key={section.mockTestSectionId ?? index} className="rounded-lg bg-[#FAF4F7] p-2">{section.sectionTitle || section.sectionName || section.languageSkillName} · {section.correctCount}/{section.totalQuestions ?? section.totalCount} câu</li>)}
          </ul>}
          {canStartUpdatedAssessment && <>
            <p className="mt-3 text-sm">Bạn có thể làm lượt đánh giá mới cho mục tiêu {target}.</p>
            <button type="button" className={`${buttonClass} mt-4 mr-2`} disabled={pending} onClick={() => start()}>Bắt đầu bài đánh giá {target} mới</button>
          </>}
          {result.assessmentMessage && <p className="mt-3 text-sm">{result.assessmentMessage}</p>}
          {isDifferentGoal && <p className="mt-3 rounded-lg bg-[#FAF4F7] p-3 text-sm">
            Kết quả này thuộc bài đánh giá trước đó. Hãy quay về bài đánh giá dành cho thiết lập mục tiêu <strong>{target}</strong> hiện tại để tiếp tục.
          </p>}
          {!showCurrentAssessment && (canSelfStudy || canRetake) && <div className="mt-4 flex flex-wrap items-center gap-3">
            {canSelfStudy && <>
              <Link className={buttonClass} to="/roadmap/#self-study-roadmap-title">Xem lộ trình tự học</Link>
              <Link className="text-sm font-semibold text-[#AD3155] underline"
                to={studyLevel ? '/riki/listening/?level=' + studyLevel : '/riki/listening/'}>Tự ôn với audio</Link>
              <Link className="text-sm font-semibold text-[#AD3155] underline" to="/booking-schedule/">Tìm mentor phù hợp</Link>
            </>}
            {canRetake && <button type="button" className="text-sm font-semibold text-[#AD3155] underline" disabled={pending} onClick={() => start(true)}>
              Làm lại bài đánh giá {resultTarget}
            </button>}
          </div>}
          {showCurrentAssessment && <button type="button" className={`${buttonClass} mt-4`} disabled={pending} onClick={returnToCurrentAssessment}>{isDifferentGoal && status?.targetJlptLevelName ? `Quay về đánh giá ${target}` : 'Quay về đánh giá hiện tại'}</button>}
          {isLatest && matchesTarget && !showCurrentAssessment && !canSelfStudy && !canStartUpdatedAssessment && <Link className="mt-4 inline-block text-sm font-semibold text-[#AD3155] underline" to="/onboarding">Kiểm tra mục tiêu học tập</Link>}
        </section>}
        {result && <LearnerFeedbackPanel type="placement" id={result.attemptId} label="Phản hồi về bài đánh giá năng lực" />}
        {status && !attempt && !result && <section className={cardClass}>
          <h2 className="font-semibold">Mục tiêu {target}</h2>
          <p className="mt-2 text-sm">Bài đánh giá gồm từ vựng, ngữ pháp, đọc hiểu và nghe hiểu.</p>
          {allowance && <p className="mt-2 text-sm">Còn {allowance.remaining}/{allowance.limit} lượt đánh giá.</p>}
          {status.canStartNewAttempt !== false
            ? <button type="button" className={`${buttonClass} mt-4`} disabled={pending} onClick={() => start()}>Bắt đầu bài đánh giá</button>
            : allowance?.remaining === 0 ? <p className="mt-2 text-sm">Bạn đã dùng hết lượt cho mục tiêu này.</p>
              : <Link className={`${buttonClass} mt-4 inline-block`} to="/onboarding">Chọn mục tiêu và ngày thi</Link>}
        </section>}
      </div>
    </main>
  </LearnerShell>;
}
