import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  Input,
  ProgressBar,
  cx,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import {
  finishSrsSession,
  getSrsSummary,
  submitReviewResult,
} from '@/features/srs/api/reviewApi.js';
import { invalidateSrsAndCalendarCaches } from '@/features/srs/utils/srsCacheSync.js';
import { formatSrsStudyMode } from '@/features/srs/utils/srsLabels.js';

let activeAudioElement = null;
let activePlayToken = 0;

function emitSrsAudioEvent(detail) {
  if (typeof window === 'undefined') return;
  try {
    const prev = Array.isArray(window.__RIKI_SRS_AUDIO_LOG__) ? window.__RIKI_SRS_AUDIO_LOG__ : [];
    window.__RIKI_SRS_AUDIO_LOG__ = [...prev.slice(-19), { ts: Date.now(), ...detail }];
    window.dispatchEvent(new CustomEvent('rikipath:srs-audio', { detail }));
  } catch {
    // Non-blocking runtime telemetry only
  }
}

function stopActiveAudio() {
  activePlayToken += 1;
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // Ignore media pause errors
    }
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore speechSynthesis cancel errors
    }
  }
}

function hasSpeechSynthesisSupport() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined');
}

function canPlayCardAudio(card) {
  if (!card) return false;
  if (card.audioUrl) return true;
  return Boolean(card.term) && hasSpeechSynthesisSupport();
}

function playCardAudio(card, { trigger = 'manual', onBlocked } = {}) {
  stopActiveAudio();
  if (!card) return;
  const playToken = activePlayToken;

  if (card.audioUrl && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(card.audioUrl);
      activeAudioElement = audio;
      audio.onplay = () => {
        if (playToken !== activePlayToken) return;
        emitSrsAudioEvent({ trigger, method: 'audio', status: 'started', cardId: card.reviewCardId });
      };
      audio.onerror = () => {
        if (activeAudioElement === audio) activeAudioElement = null;
        if (playToken !== activePlayToken) return;
        emitSrsAudioEvent({ trigger, method: 'audio', status: 'asset-error-fallback', cardId: card.reviewCardId });
        speakFallback(card.term, playToken, { trigger, cardId: card.reviewCardId, onBlocked });
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          if (activeAudioElement === audio) activeAudioElement = null;
          if (playToken !== activePlayToken) return;
          if (err?.name === 'AbortError') return;
          if (err?.name === 'NotAllowedError') {
            emitSrsAudioEvent({ trigger, method: 'audio', status: 'blocked', cardId: card.reviewCardId });
            onBlocked?.();
            return;
          }
          emitSrsAudioEvent({ trigger, method: 'audio', status: 'play-error-fallback', cardId: card.reviewCardId });
          speakFallback(card.term, playToken, { trigger, cardId: card.reviewCardId, onBlocked });
        });
      }
      return;
    } catch {
      // Fallback to SpeechSynthesis
    }
  }
  speakFallback(card.term, playToken, { trigger, cardId: card.reviewCardId, onBlocked });
}

function speakFallback(text, playToken, { trigger = 'manual', cardId = null, onBlocked } = {}) {
  if (playToken !== activePlayToken) return;
  if (typeof window === 'undefined' || !text) return;
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    emitSrsAudioEvent({ trigger, method: 'tts', status: 'unavailable', cardId });
    onBlocked?.();
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'ja-JP';
    const voices = typeof window.speechSynthesis.getVoices === 'function'
      ? window.speechSynthesis.getVoices()
      : [];
    const jaVoice = Array.isArray(voices)
      ? voices.find((v) => String(v?.lang || '').toLowerCase().startsWith('ja'))
      : null;
    if (jaVoice) u.voice = jaVoice;
    u.onstart = () => {
      if (playToken !== activePlayToken) return;
      emitSrsAudioEvent({ trigger, method: 'tts', status: 'started', cardId });
    };
    u.onerror = (ev) => {
      if (playToken !== activePlayToken) return;
      const code = String(ev?.error || '');
      if (code === 'not-allowed' || code === 'audio-busy' || code === 'synthesis-unavailable' || code === 'language-unavailable') {
        emitSrsAudioEvent({ trigger, method: 'tts', status: `blocked:${code}`, cardId });
        onBlocked?.();
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    emitSrsAudioEvent({ trigger, method: 'tts', status: 'queued', cardId, hasVoices: Array.isArray(voices) && voices.length > 0 });
  } catch {
    if (playToken === activePlayToken) {
      emitSrsAudioEvent({ trigger, method: 'tts', status: 'threw', cardId });
      onBlocked?.();
    }
  }
}

function normalizeChoiceText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function resolveEffectiveModeForCard(sessionMode, card, idx) {
  if (sessionMode !== 'mixed') return sessionMode;
  const assigned = String(card?.assignedStudyMode || '').trim().toLowerCase();
  if (assigned === 'flip' || assigned === 'typing' || assigned === 'mcq') {
    if (assigned === 'mcq' && (!Array.isArray(card?.mcqOptions) || card.mcqOptions.length < 4)) {
      return Array.isArray(card?.eligibleModes) && card.eligibleModes.includes('typing') ? 'typing' : 'flip';
    }
    return assigned;
  }
  if (Array.isArray(card?.mcqOptions) && card.mcqOptions.length >= 4 && idx % 3 === 1) return 'mcq';
  if (idx % 3 === 2) return 'typing';
  return 'flip';
}

function getTypingPromptHint(kind, tr) {
  if (kind === 'reading_only') return tr('Nhập cách đọc (Kana hoặc Romaji)');
  if (kind === 'meaning_only') return tr('Nhập nghĩa tiếng Việt chính xác');
  return tr('Nhập cách đọc (Kana/Romaji) hoặc nghĩa tiếng Việt');
}

function getTypingPlaceholder(kind, tr) {
  if (kind === 'reading_only') return tr('Gõ Hiragana, Katakana hoặc Romaji…');
  if (kind === 'meaning_only') return tr('Gõ nghĩa tiếng Việt…');
  return tr('Gõ Kana, Romaji hoặc nghĩa…');
}

function formatClockSeconds(totalSec) {
  const safe = Math.max(0, Math.floor(Number(totalSec) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseUtcMillis(isoValue) {
  if (!isoValue) return null;
  const raw = String(isoValue).trim();
  if (!raw) return null;
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function SrsReviewPlayer({
  session,
  preferences,
  onSessionCompleted,
  onExitSession,
  onRetryPractice,
  retryPending = false,
  toolbarActions = null,
  exitLabel,
  completedExitLabel,
}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();
  const isPractice = String(session?.sessionKind || '').toLowerCase() === 'practice';
  const [queue, setQueue] = useState(() => (session?.pendingItems || []).map((item) => ({ ...item, _pass: 1 })));
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const [manualReadingRevealed, setManualReadingRevealed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedIds, setCompletedIds] = useState(() => new Set(session?.completedCardIds || []));
  const [stats, setStats] = useState(() => ({
    reviewed: session?.reviewedCount || 0,
    remembered: session?.rememberedCount || 0,
    forgot: session?.forgotCount || 0,
    retryCount: (session?.retryCardIds || []).length,
    totalInitial: session?.totalInitialCards || (session?.pendingItems || []).length,
  }));
  const [completedSummary, setCompletedSummary] = useState(null);

  const startedAtMs = useMemo(() => parseUtcMillis(session?.startedAtUtc), [session?.startedAtUtc]);
  const deadlineAtMs = useMemo(() => parseUtcMillis(session?.deadlineAtUtc), [session?.deadlineAtUtc]);

  const [serverClockOffsetMs] = useState(() => {
    const srvMs = parseUtcMillis(session?.serverUtcNow);
    return srvMs != null ? (srvMs - Date.now()) : 0;
  });

  const [timerState, setTimerState] = useState(() => {
    const nowAdjusted = Date.now() + serverClockOffsetMs;
    const elapsed = startedAtMs != null ? Math.max(0, Math.floor((nowAdjusted - startedAtMs) / 1000)) : (session?.elapsedSeconds || 0);
    const remaining = deadlineAtMs != null ? Math.max(0, Math.floor((deadlineAtMs - nowAdjusted) / 1000)) : null;
    return { elapsedSeconds: elapsed, remainingSeconds: remaining };
  });

  const submittingRef = useRef(false);
  const cardShownAtRef = useRef(0);
  const lastAutoPlayedKeyRef = useRef('');
  const lastCompositionEndRef = useRef(0);
  const stepIdempotencyRef = useRef({ token: '', key: '' });
  const appliedStatsStepsRef = useRef(new Set());
  const finalizeStartedRef = useRef(false);
  const statsRef = useRef(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const currentCard = queue[cursor] || null;
  const activeMode = currentCard
    ? resolveEffectiveModeForCard(session?.studyMode || 'flip', currentCard, cursor)
    : (session?.studyMode || 'flip');

  const showFuriganaHint = preferences?.showFuriganaHint ?? true;
  const autoPlayAudio = preferences?.autoPlayAudio ?? true;
  const audioSupported = canPlayCardAudio(currentCard);

  useEffect(() => {
    const handleVisibilityOrPageHide = () => {
      if (document.visibilityState === 'hidden') {
        stopActiveAudio();
      }
    };
    const handlePageHide = () => stopActiveAudio();
    document.addEventListener('visibilitychange', handleVisibilityOrPageHide);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrPageHide);
      window.removeEventListener('pagehide', handlePageHide);
      stopActiveAudio();
    };
  }, []);

  useEffect(() => {
    if (!currentCard || !preferences) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const stepKey = `${session?.sessionKey || 's'}:${cursor}:${currentCard.reviewCardId}:p${currentCard._pass || 1}`;
    if (lastAutoPlayedKeyRef.current === stepKey) return;
    lastAutoPlayedKeyRef.current = stepKey;
    cardShownAtRef.current = Date.now();
    if (autoPlayAudio) {
      playCardAudio(currentCard, {
        trigger: 'autoplay',
        onBlocked: () => setAutoplayBlocked(true),
      });
    } else {
      stopActiveAudio();
    }
  }, [currentCard, cursor, session?.sessionKey, autoPlayAudio, preferences]);

  const totalInitial = Math.max(
    1,
    Number(stats.totalInitial || 0)
      || (Array.isArray(session?.queueCardIds) ? session.queueCardIds.length : 0)
      || queue.length,
  );
  const completedCount = Math.min(totalInitial, completedIds.size);

  const progressPercent = useMemo(() => {
    const total = Math.max(1, totalInitial);
    return Math.min(100, Math.max(0, Math.round((completedCount / total) * 100)));
  }, [completedCount, totalInitial]);

  function resolveStepToken(card = currentCard, idx = cursor) {
    if (!card) return '';
    return `${session?.sessionKey || 's'}:${idx}:${card.reviewCardId}:p${card._pass || 1}`;
  }

  function applyResultToProgress(res, stepToken) {
    if (!res || !currentCard) return stats;

    const cardId = currentCard.reviewCardId;
    if (!appliedStatsStepsRef.current.has(stepToken)) {
      appliedStatsStepsRef.current.add(stepToken);

      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (res.isCorrect || !res.shouldRepeatInSession) next.add(cardId);
        else next.delete(cardId);
        return next;
      });

      const isRetryTurn = (currentCard._pass || 1) > 1;
      const nextStats = {
        ...stats,
        reviewed: (res.deduplicated || isRetryTurn) ? stats.reviewed : stats.reviewed + 1,
        remembered: (!isRetryTurn && res.isCorrect) ? stats.remembered + 1 : stats.remembered,
        forgot: (!isRetryTurn && !res.isCorrect) ? stats.forgot + 1 : stats.forgot,
        retryCount: res.shouldRepeatInSession ? stats.retryCount + 1 : stats.retryCount,
      };
      setStats(nextStats);
      return nextStats;
    }

    return stats;
  }

  async function finalizeNow(latestStats, { timedOut = false } = {}) {
    if (finalizeStartedRef.current) return;
    finalizeStartedRef.current = true;
    stopActiveAudio();
    try {
      const finished = await finishSrsSession(session.sessionKey);
      let latestSummary = null;
      if (!isPractice) {
        try {
          latestSummary = await queryClient.fetchQuery({ queryKey: ['srs-summary'], queryFn: getSrsSummary });
        } catch {
          latestSummary = queryClient.getQueryData(['srs-summary']) || null;
        }
      }
      const totalInitialCards = finished?.totalInitialCards ?? latestStats.totalInitial ?? totalInitial;
      const reviewedCount = finished?.reviewedCount ?? latestStats.reviewed;
      const skippedCount = finished?.skippedCount ?? Math.max(0, totalInitialCards - reviewedCount);
      setCompletedSummary({
        totalInitial: totalInitialCards,
        reviewed: reviewedCount,
        remembered: finished?.rememberedCount ?? latestStats.remembered,
        forgot: finished?.forgotCount ?? latestStats.forgot,
        skipped: skippedCount,
        elapsedSeconds: finished?.elapsedSeconds ?? timerState.elapsedSeconds,
        timedOut: Boolean(timedOut || finished?.isExpired),
        retryCount: latestStats.retryCount,
        session: finished,
        reviewedTodayCount: latestSummary?.reviewedTodayCount ?? null,
        dailyReviewGoal: latestSummary?.dailyReviewLimit ?? preferences?.dailyReviewLimit ?? null,
      });
      if (isPractice) {
        await queryClient.invalidateQueries({ queryKey: ['srs-active-session', 'Practice'] });
        await queryClient.invalidateQueries({ queryKey: ['srs-summary'] });
      } else {
        await invalidateSrsAndCalendarCaches(queryClient);
      }
      onSessionCompleted?.(finished);
    } catch {
      const fallbackReviewed = latestStats.reviewed;
      const fallbackTotal = latestStats.totalInitial ?? totalInitial;
      setCompletedSummary({
        totalInitial: fallbackTotal,
        reviewed: fallbackReviewed,
        remembered: latestStats.remembered,
        forgot: latestStats.forgot,
        skipped: Math.max(0, fallbackTotal - fallbackReviewed),
        elapsedSeconds: timerState.elapsedSeconds,
        timedOut,
      });
      onSessionCompleted?.(null);
    }
  }

  useEffect(() => {
    if (completedSummary || !session?.sessionKey) return undefined;
    const tick = () => {
      const nowAdjusted = Date.now() + serverClockOffsetMs;
      const nextElapsed = startedAtMs != null
        ? Math.max(0, Math.floor((nowAdjusted - startedAtMs) / 1000))
        : 0;
      const nextRemaining = deadlineAtMs != null
        ? Math.max(0, Math.floor((deadlineAtMs - nowAdjusted) / 1000))
        : null;
      setTimerState({ elapsedSeconds: nextElapsed, remainingSeconds: nextRemaining });
      if (deadlineAtMs != null && nextRemaining === 0 && !finalizeStartedRef.current) {
        notify.info(tr('Đã hết thời gian của phiên. Đang tổng kết kết quả của bạn.'));
        finalizeNow(statsRef.current, { timedOut: true });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSummary, session?.sessionKey, startedAtMs, deadlineAtMs, serverClockOffsetMs]);

  async function submitCardOutcome(payload) {
    if (!currentCard || submittingRef.current) return null;
    submittingRef.current = true;
    setIsSubmitting(true);

    const stepToken = resolveStepToken();
    if (stepIdempotencyRef.current.token !== stepToken) {
      const generatedKey = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${String(session?.sessionKey || 'srs').slice(0, 12)}:${currentCard.reviewCardId}:p${currentCard._pass || 1}:${Date.now()}`;
      stepIdempotencyRef.current = { token: stepToken, key: generatedKey };
    }

    const idempotencyKey = stepIdempotencyRef.current.key;
    const responseTimeMs = Math.max(100, Date.now() - cardShownAtRef.current);

    try {
      const res = await submitReviewResult({
        reviewCardId: currentCard.reviewCardId,
        sessionKey: session.sessionKey,
        studyMode: activeMode,
        idempotencyKey,
        responseTimeMs,
        ...payload,
      });
      const updatedStats = applyResultToProgress(res, stepToken);
      if (!isPractice) {
        queryClient.invalidateQueries({ queryKey: ['srs-summary'] });
        queryClient.invalidateQueries({ queryKey: ['workspace-calendar'] });
        queryClient.invalidateQueries({ queryKey: ['srs-calendar'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
      return { ...res, _updatedStats: updatedStats };
    } catch (err) {
      const code = err?.response?.data?.errorCode || err?.errorCode;
      if (code === 'SRS_SESSION_TIME_EXPIRED' || code === 'SRS_SESSION_CLOSED') {
        await finalizeNow(statsRef.current, { timedOut: code === 'SRS_SESSION_TIME_EXPIRED' });
        return null;
      }
      notify.apiError(err, tr('Chưa lưu được kết quả ôn tập'), { key: 'srs-submit-err' });
      return null;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function advanceToNextCard(res) {
    const latestStats = res?._updatedStats || stats;

    let updatedQueue = queue;
    if (res?.shouldRepeatInSession && currentCard) {
      const occurrences = queue.filter((x) => x.reviewCardId === currentCard.reviewCardId).length;
      if (occurrences < 3) {
        const insertAt = Math.min(queue.length, cursor + 3);
        const retryCard = {
          ...currentCard,
          _pass: (currentCard._pass || 1) + 1,
        };
        updatedQueue = [
          ...queue.slice(0, insertAt),
          retryCard,
          ...queue.slice(insertAt),
        ];
        setQueue(updatedQueue);
      }
    }

    const nextIdx = cursor + 1;
    setRevealed(false);
    setHasFlippedOnce(false);
    setManualReadingRevealed(false);
    setAutoplayBlocked(false);
    setTypedAnswer('');
    setSelectedChoice('');
    setFeedback(null);

    if (nextIdx >= updatedQueue.length) {
      stopActiveAudio();
      finalizeNow(latestStats);
    } else {
      setCursor(nextIdx);
    }
  }

  function toggleFlip() {
    setRevealed((prev) => {
      const next = !prev;
      if (next) setHasFlippedOnce(true);
      return next;
    });
  }

  // Flashcards 2-button grading (ONLY Chưa nhớ | Đã nhớ, only after flip)
  async function handleFlipGrade(remembered) {
    if (!revealed || !currentCard || isSubmitting) return;
    const rating = remembered ? 'Good' : 'Again';
    const quality = remembered ? 4 : 0;
    const res = await submitCardOutcome({ rating, quality });
    if (res) advanceToNextCard(res);
  }

  // Free Practice flashcards: Quizlet-style navigation, no self-rating. "Next" records the card as seen in
  // the practice session only (backend never touches due date / SM-2 / review history for practice).
  function resetCardUi() {
    setRevealed(false);
    setHasFlippedOnce(false);
    setManualReadingRevealed(false);
    setAutoplayBlocked(false);
    setTypedAnswer('');
    setSelectedChoice('');
    setFeedback(null);
  }

  async function handlePracticeNext() {
    if (!currentCard || isSubmitting) return;
    if (completedIds.has(currentCard.reviewCardId)) {
      if (cursor + 1 >= queue.length) {
        stopActiveAudio();
        finalizeNow(statsRef.current);
      } else {
        resetCardUi();
        setCursor(cursor + 1);
      }
      return;
    }
    const res = await submitCardOutcome({ rating: 'Good', quality: 4 });
    if (res) advanceToNextCard(res);
  }

  function handlePracticePrev() {
    if (cursor <= 0 || isSubmitting) return;
    resetCardUi();
    setCursor(cursor - 1);
  }

  async function handleTypingSubmit(e) {
    e?.preventDefault?.();
    const justEndedIme = Date.now() - lastCompositionEndRef.current < 80;
    if (isComposing || justEndedIme || !typedAnswer.trim() || !currentCard || isSubmitting || feedback) return;
    const res = await submitCardOutcome({ userAnswer: typedAnswer.trim() });
    if (res) {
      setFeedback(res);
    }
  }

  async function handleMcqPick(optionText) {
    if (!currentCard || isSubmitting || feedback) return;
    setSelectedChoice(optionText);
    const res = await submitCardOutcome({ userAnswer: optionText });
    if (res) {
      setFeedback(res);
    }
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!currentCard || completedSummary) return;
      if (activeMode === 'flip') {
        if (e.code === 'Space' && !e.repeat && !e.target?.closest?.('button, input, textarea, select, [role="tab"]')) {
          e.preventDefault();
          toggleFlip();
        } else if (isPractice && !isSubmitting && !e.target?.closest?.('input, textarea, select')) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handlePracticePrev();
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            handlePracticeNext();
          }
        } else if (revealed && !isSubmitting) {
          if (e.key === '1' || e.key === 'ArrowLeft') {
            e.preventDefault();
            handleFlipGrade(false);
          } else if (e.key === '2' || e.key === 'ArrowRight') {
            e.preventDefault();
            handleFlipGrade(true);
          }
        }
      } else if (activeMode === 'mcq' && !feedback && !isSubmitting) {
        const idx = Number(e.key) - 1;
        const opt = currentCard.mcqOptions?.[idx];
        if (opt) {
          e.preventDefault();
          handleMcqPick(opt.text);
        }
      } else if ((activeMode === 'typing' || activeMode === 'mcq') && feedback && e.key === 'Enter' && !e.nativeEvent?.isComposing) {
        e.preventDefault();
        advanceToNextCard(feedback);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (completedSummary) {
    if (isPractice) {
      return (
        <Card padding="lg" className="mx-auto max-w-2xl border border-[#EAE3E4] bg-[#FFFCF8] text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-rp-navy">
            {completedSummary.timedOut ? tr('Hết giờ — Hoàn thành phiên luyện tập!') : tr('Hoàn thành phiên ôn tập tự do!')}
          </h2>
          <p className="mt-1.5 text-sm text-rp-text-muted">
            {tr('Kết quả luyện tập đã được ghi nhận. Lịch ôn tập SRS theo chu kỳ của bạn không thay đổi.')}
          </p>

          <div className={cx('mt-6 grid grid-cols-2 gap-3', session?.studyMode === 'flip' ? 'sm:grid-cols-3' : 'sm:grid-cols-5')}>
            <div className="rounded-2xl border border-[#EAE3E4] bg-white p-3">
              <p className="text-[11px] font-bold uppercase text-rp-text-muted">{tr('Tổng thẻ')}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-rp-navy">{completedSummary.totalInitial ?? totalInitial}</p>
            </div>
            <div className="rounded-2xl border border-[#EAE3E4] bg-white p-3">
              <p className="text-[11px] font-bold uppercase text-rp-text-muted">{session?.studyMode === 'flip' ? tr('Đã xem') : tr('Đã luyện')}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-rp-navy">{completedSummary.reviewed}</p>
            </div>
            {session?.studyMode !== 'flip' && (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <p className="text-[11px] font-bold uppercase text-emerald-700">{tr('Đúng')}</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700">{completedSummary.remembered}</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3">
                  <p className="text-[11px] font-bold uppercase text-rose-700">{tr('Chưa đúng')}</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-rose-700">{completedSummary.forgot}</p>
                </div>
              </>
            )}
            <div className="col-span-2 rounded-2xl border border-[#EAE3E4] bg-white p-3 sm:col-span-1">
              <p className="text-[11px] font-bold uppercase text-rp-text-muted">{tr('Bỏ qua')}</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-rp-text-2">{completedSummary.skipped ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-rp-text-2">
            <span className="rounded-xl border border-[#EAE3E4] bg-white px-3 py-1.5">
              {tr('Chế độ')}: <strong className="text-rp-navy">{formatSrsStudyMode(session?.studyMode, tr)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE3E4] bg-white px-3 py-1.5 tabular-nums">
              <Clock className="h-3.5 w-3.5 text-rp-text-muted" />
              <span>{tr('Thời gian luyện')}: <strong className="text-rp-navy">{formatClockSeconds(completedSummary.elapsedSeconds)}</strong></span>
            </span>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onRetryPractice && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={RotateCcw}
                loading={retryPending}
                onClick={() => onRetryPractice(completedSummary.session || session)}
              >
                {tr('Luyện lại')}
              </Button>
            )}
            <Button type="button" variant="primary" size="md" onClick={onExitSession}>
              {completedExitLabel || tr('Về Thẻ của tôi')}
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card padding="lg" className="mx-auto max-w-2xl border border-[#EAE3E4] bg-[#FFFCF8] text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-rp-navy">{tr('Hoàn thành phiên ôn tập!')}</h2>
        <p className="mt-1.5 text-sm text-rp-text-muted">
          {tr('Kết quả và lịch ôn tiếp theo đã được cập nhật.')}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#EAE3E4] bg-white p-3">
            <p className="text-[11px] font-bold uppercase text-rp-text-muted">{tr('Đã ôn')}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-rp-navy">{completedSummary.reviewed}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
            <p className="text-[11px] font-bold uppercase text-emerald-700">{tr('Đã nhớ')}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-700">{completedSummary.remembered}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3">
            <p className="text-[11px] font-bold uppercase text-rose-700">{tr('Cần ôn lại')}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-rose-700">{completedSummary.forgot}</p>
          </div>
        </div>

        {completedSummary.dailyReviewGoal > 0 && completedSummary.reviewedTodayCount != null && (
          <div
            className={cx(
              'mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold',
              completedSummary.reviewedTodayCount >= completedSummary.dailyReviewGoal
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-[#EAE3E4] bg-white text-rp-text-2',
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              {completedSummary.reviewedTodayCount >= completedSummary.dailyReviewGoal
                ? trf('Hoàn thành mục tiêu ôn hôm nay ({0}/{1} lượt)! Bạn vẫn có thể tiếp tục ôn nếu muốn.', {
                  0: completedSummary.reviewedTodayCount,
                  1: completedSummary.dailyReviewGoal,
                })
                : trf('Tiến độ mục tiêu hôm nay: {0}/{1} lượt', {
                  0: completedSummary.reviewedTodayCount,
                  1: completedSummary.dailyReviewGoal,
                })}
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="primary" size="md" onClick={onExitSession}>
            {tr('Hoàn tất')}
          </Button>
        </div>
      </Card>
    );
  }

  if (!currentCard) {
    return null;
  }

  const willFinishAfterThis = cursor + 1 >= queue.length && !feedback?.shouldRepeatInSession;
  const expectedMeaningText = feedback?.expectedAnswer || currentCard.meaning || currentCard.backText || '';
  const expectedReadingText = feedback?.expectedReading || currentCard.reading || '';

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 sm:pb-16">
      {/* Top progress strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAE3E4] bg-white px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isPractice && (
            <Badge tone="brand" size="sm" icon={false}>
              {tr('Ôn tập tự do')}
            </Badge>
          )}
          <span className="shrink-0 text-xs font-bold tabular-nums text-rp-navy">
            {trf('{0} / {1} thẻ', { 0: completedCount, 1: totalInitial })}
          </span>
          <div className="min-w-[80px] flex-1">
            <ProgressBar value={progressPercent} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {timerState.remainingSeconds != null ? (
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-extrabold tabular-nums',
                timerState.remainingSeconds <= 60
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-[#EAE3E4] bg-[#FFFCF8] text-rp-navy',
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatClockSeconds(timerState.remainingSeconds)}
            </span>
          ) : null /* No time limit → no clock: an ever-increasing elapsed timer adds pressure without value. */}
          {toolbarActions}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              stopActiveAudio();
              onExitSession?.();
            }}
          >
            {exitLabel || tr('Thoát phiên')}
          </Button>
        </div>
      </div>

      {session?.removedMidSessionCount > 0 && (
        <Banner tone="info" title={tr('Hàng ôn đã được cập nhật')}>
          {trf('{0} thẻ vừa bị xóa khỏi Thẻ của tôi nên đã được bỏ qua.', { 0: session.removedMidSessionCount })}
        </Banner>
      )}

      {session?.excludedMcqCards?.length > 0 && session?.studyMode === 'mcq' && (
        <Banner tone="warning" title={tr('Một số thẻ không đủ phương án trắc nghiệm')}>
          {trf('{0} thẻ thiếu 3 đáp án nhiễu hợp lệ từ học liệu đã xuất bản nên được bỏ qua ở chế độ Trắc nghiệm.', {
            0: session.excludedMcqCards.length,
          })}
        </Banner>
      )}

      {/* MODE A: FLASHCARDS (3D flip + ONLY 2 evaluation buttons AFTER flip) */}
      {activeMode === 'flip' && (
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label={revealed ? tr('Thẻ đang mở mặt sau') : tr('Nhấn để lật xem đáp án')}
            onClick={toggleFlip}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                toggleFlip();
              }
            }}
            className="rp-focus group relative min-h-[280px] cursor-pointer select-none rounded-3xl [perspective:1200px]"
          >
            <div
              className={cx(
                'relative min-h-[280px] w-full rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none',
                revealed && '[transform:rotateY(180deg)]',
              )}
            >
              {/* Front Face */}
              <div className={cx(
                'absolute inset-0 flex flex-col justify-between rounded-3xl border border-[#EAE3E4] bg-white p-6 shadow-sm [backface-visibility:hidden] sm:p-8',
                revealed && 'pointer-events-none',
              )}>
                <div className="flex min-h-[36px] items-center justify-between gap-2">
                  {autoplayBlocked ? (
                    <span className="text-[11px] font-medium text-rp-text-muted">
                      {tr('Nhấn loa để nghe phát âm')}
                    </span>
                  ) : <span />}
                  {audioSupported && (
                    <button
                      type="button"
                      aria-label={tr('Phát âm')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoplayBlocked(false);
                        playCardAudio(currentCard);
                      }}
                      className="rp-focus flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-navy hover:bg-[#FFF0F4]"
                    >
                      <Volume2 className="h-4 w-4 text-rp-brand-strong" />
                    </button>
                  )}
                </div>

                <div className="my-auto text-center">
                  <p className="rp-jp text-4xl font-extrabold tracking-wide text-rp-navy sm:text-5xl">
                    {currentCard.term}
                  </p>
                </div>

                <p className="text-center text-xs font-semibold text-rp-brand-strong">
                  {tr('Chạm để lật')}
                </p>
              </div>

              {/* Back Face */}
              <div className={cx(
                'absolute inset-0 flex flex-col justify-between rounded-3xl border border-[#EAE3E4] bg-white p-6 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8',
                !revealed && 'pointer-events-none',
              )}>
                <div className="flex min-h-[36px] items-center justify-between gap-2">
                  <div>
                    <p className="rp-jp text-lg font-extrabold text-rp-navy">{currentCard.term}</p>
                    {currentCard.reading && (
                      (showFuriganaHint || manualReadingRevealed) ? (
                        <p className="rp-jp text-sm font-semibold text-rp-brand-strong">{currentCard.reading}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManualReadingRevealed(true);
                          }}
                          className="rp-focus mt-0.5 inline-flex items-center gap-1 rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2 py-0.5 text-xs font-semibold text-rp-brand-strong hover:bg-rp-brand-soft"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{tr('Hiện cách đọc')}</span>
                        </button>
                      )
                    )}
                  </div>
                  {audioSupported && (
                    <button
                      type="button"
                      aria-label={tr('Phát âm')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoplayBlocked(false);
                        playCardAudio(currentCard);
                      }}
                      className="rp-focus flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] text-rp-navy hover:bg-[#FFF0F4]"
                    >
                      <Volume2 className="h-4 w-4 text-rp-brand-strong" />
                    </button>
                  )}
                </div>

                <div className="my-auto text-center">
                  <p className="text-xl font-bold text-rp-navy sm:text-2xl">
                    {currentCard.meaning || currentCard.backText}
                  </p>
                </div>

                <p className="text-center text-xs font-semibold text-rp-brand-strong">
                  {tr('Chạm để lật lại')}
                </p>
              </div>
            </div>
          </div>

          {isPractice ? (
            /* FREE PRACTICE: navigate like Quizlet — no remembered/forgot rating, no scheduling */
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={ChevronLeft}
                disabled={cursor === 0 || isSubmitting}
                onClick={handlePracticePrev}
              >
                {tr('Thẻ trước')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                iconRight={ChevronRight}
                loading={isSubmitting}
                onClick={handlePracticeNext}
              >
                {cursor + 1 >= queue.length ? tr('Hoàn thành') : tr('Thẻ tiếp theo')}
              </Button>
            </div>
          ) : !revealed ? (
            <div className="flex justify-center">
              <Button type="button" variant="primary" size="md" icon={Eye} onClick={toggleFlip}>
                {hasFlippedOnce ? tr('Lật xem mặt sau') : tr('Lật thẻ')}
              </Button>
            </div>
          ) : (
            /* STRICT 2-BUTTON GRADING: ONLY Chưa nhớ | Đã nhớ, ZERO interval numbers */
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFlipGrade(false)}
                className="rp-focus flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <RotateCcw className="h-4.5 w-4.5" aria-hidden="true" />
                <span>{tr('Chưa nhớ')}</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFlipGrade(true)}
                className="rp-focus flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <Check className="h-4.5 w-4.5" aria-hidden="true" />
                <span>{tr('Đã nhớ')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE B: WRITTEN RECALL (Server-checked + IME composition safe + no pre-submit answer leak) */}
      {activeMode === 'typing' && (
        <Card padding="lg" className="space-y-5 border border-[#EAE3E4] bg-[#FFFCF8] shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-rp-text-muted">
                {getTypingPromptHint(currentCard.typingPromptKind, tr)}
              </p>
              <p className="rp-jp mt-2 text-3xl font-extrabold text-rp-navy sm:text-4xl">{currentCard.term}</p>
            </div>
            {audioSupported && (
              <button
                type="button"
                aria-label={tr('Phát âm')}
                onClick={() => {
                  setAutoplayBlocked(false);
                  playCardAudio(currentCard);
                }}
                className="rp-focus flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-navy hover:bg-[#FFF0F4]"
              >
                <Volume2 className="h-4 w-4 text-rp-brand-strong" />
              </button>
            )}
          </div>

          <form onSubmit={handleTypingSubmit} className="space-y-3">
            <Input
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => {
                setIsComposing(false);
                lastCompositionEndRef.current = Date.now();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.nativeEvent?.isComposing || isComposing)) {
                  e.stopPropagation();
                }
              }}
              disabled={Boolean(feedback) || isSubmitting}
              placeholder={getTypingPlaceholder(currentCard.typingPromptKind, tr)}
              autoFocus
            />

            {!feedback ? (
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={!typedAnswer.trim()}>
                  {tr('Kiểm tra')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={cx(
                    'rounded-2xl border p-4 text-sm',
                    feedback.isCorrect
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800',
                  )}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {feedback.isCorrect ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
                    <span>{feedback.isCorrect ? tr('Chính xác!') : tr('Chưa đúng.')}</span>
                  </div>
                  {(expectedMeaningText || expectedReadingText) && (
                    <p className="mt-1.5 text-xs">
                      <strong>{tr('Đáp án')}:</strong>{' '}
                      {expectedReadingText && (
                        <span className="rp-jp font-semibold">
                          {expectedReadingText}
                          {expectedMeaningText ? ' · ' : ''}
                        </span>
                      )}
                      {expectedMeaningText}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="primary" size="md" iconRight={ArrowRight} onClick={() => advanceToNextCard(feedback)}>
                    {willFinishAfterThis ? tr('Hoàn thành phiên') : tr('Tiếp theo')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* MODE C: MULTIPLE CHOICE (Server-graded + full-row clickable + no leaked answer) */}
      {activeMode === 'mcq' && (
        <Card padding="lg" className="space-y-5 border border-[#EAE3E4] bg-[#FFFCF8] shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-rp-text-muted">{tr('Chọn nghĩa chính xác cho thẻ sau')}</p>
              <p className="rp-jp mt-2 text-3xl font-extrabold text-rp-navy sm:text-4xl">{currentCard.term}</p>
              {feedback && expectedReadingText && (
                <p className="rp-jp mt-1 text-sm font-semibold text-rp-brand-strong">
                  {expectedReadingText}
                </p>
              )}
            </div>
            {audioSupported && (
              <button
                type="button"
                aria-label={tr('Phát âm')}
                onClick={() => {
                  setAutoplayBlocked(false);
                  playCardAudio(currentCard);
                }}
                className="rp-focus flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-navy hover:bg-[#FFF0F4]"
              >
                <Volume2 className="h-4 w-4 text-rp-brand-strong" />
              </button>
            )}
          </div>

          {Array.isArray(currentCard.mcqOptions) && currentCard.mcqOptions.length >= 4 ? (
            <div className="grid gap-2.5">
              {currentCard.mcqOptions.map((opt, idx) => {
                const isSelected = selectedChoice === opt.text;
                const isExpectedAnswer = Boolean(feedback) && (
                  (feedback.expectedAnswer && normalizeChoiceText(opt.text) === normalizeChoiceText(feedback.expectedAnswer))
                  || (feedback.isCorrect && isSelected)
                );
                const isWrongSelected = Boolean(feedback) && isSelected && !feedback.isCorrect;

                return (
                  <button
                    key={opt.optionKey || idx}
                    type="button"
                    disabled={Boolean(feedback) || isSubmitting}
                    onClick={() => handleMcqPick(opt.text)}
                    className={cx(
                      'rp-focus flex min-h-[50px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-default',
                      isExpectedAnswer
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : isWrongSelected
                          ? 'border-rose-300 bg-rose-50 text-rose-800'
                          : isSelected && isSubmitting
                            ? 'border-rp-brand bg-[#FFF5F7] text-rp-navy'
                            : 'border-[#EAE3E4] bg-white text-rp-navy hover:border-rp-brand-border hover:bg-[#FFF9FA]',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#EAE3E4] bg-[#FFFCF8] text-xs font-bold text-rp-text-muted">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
              <p>{tr('Thẻ này chưa đủ 4 phương án trắc nghiệm hợp lệ từ học liệu đã xuất bản.')}</p>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  iconRight={ArrowRight}
                  onClick={() => advanceToNextCard(null)}
                >
                  {tr('Bỏ qua thẻ này')}
                </Button>
              </div>
            </div>
          )}

          {feedback && (
            <div className="space-y-3 pt-1">
              <div
                className={cx(
                  'rounded-2xl border p-3.5 text-sm',
                  feedback.isCorrect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800',
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  {feedback.isCorrect ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
                  <span>{feedback.isCorrect ? tr('Chính xác!') : tr('Chưa đúng.')}</span>
                </div>
                {expectedMeaningText && (
                  <p className="mt-1 text-xs">
                    <strong>{tr('Đáp án')}:</strong>{' '}
                    {expectedReadingText && (
                      <span className="rp-jp font-semibold">{expectedReadingText} · </span>
                    )}
                    {expectedMeaningText}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="primary" size="md" iconRight={ArrowRight} onClick={() => advanceToNextCard(feedback)}>
                  {willFinishAfterThis ? tr('Hoàn thành phiên') : tr('Tiếp theo')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
