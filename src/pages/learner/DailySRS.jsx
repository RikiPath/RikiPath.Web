import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getDailyReviewQueue, submitReviewResult } from '@/features/srs/api/reviewApi.js';
import { checkTypedReading, getAcceptedReadings } from '@/features/srs/utils/srsTypedAnswer.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';

function getContentTypeLabel(contentType) {
  const value = String(contentType ?? '').toLowerCase();
  if (value === '1' || value === 'kanji') return 'Kanji';
  if (value === '2' || value === 'grammar') return 'Ngữ pháp';
  return 'Từ vựng';
}

function formatToday(locale) {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());
}

export default function DailySRS() {
  const { pathname } = useLocation();
  const { trf, locale, tr } = useLocale();
  const [queue, setQueue] = useState([]);
  const [studyMode, setStudyMode] = useState('flip');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typedResult, setTypedResult] = useState(null);
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCards, setSessionCards] = useState([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, attempts: 0 });

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getDailyReviewQueue();
      setQueue(result.items || []);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadQueue(); }, 0);
    return () => clearTimeout(timer);
  }, [loadQueue]);

  const currentCard = sessionCards[sessionIndex] ?? null;
  const typingCurrentCard = studyMode === 'type' && getAcceptedReadings(currentCard).length > 0;
  const isSessionComplete = sessionStarted && sessionIndex >= sessionCards.length;

  function startSession() {
    if (queue.length === 0) return;
    setTypedAnswer('');
    setTypedResult(null);
    setSessionCards([...queue]);
    setSessionIndex(0);
    setSessionStats({ correct: 0, incorrect: 0, attempts: 0 });
    setSubmitError('');
    setRevealed(false);
    setSessionStarted(true);
  }

  async function submitAnswer(quality) {
    if (!currentCard || !revealed || submitting.current) return;
    if (typingCurrentCard && !typedResult) return;
    submitting.current = true;
    if (typingCurrentCard) quality = typedResult.correct ? 4 : 1;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitReviewResult(currentCard.reviewCardId, quality);
      const shouldRepeat = result?.shouldRepeatInSession ?? quality <= 2;

      if (shouldRepeat) {
        // Add missed cards after the cards already in this session.
        setSessionCards((cards) => [...cards, currentCard]);
      }
      setSessionStats((stats) => ({
        correct: stats.correct + (shouldRepeat ? 0 : 1),
        incorrect: stats.incorrect + (shouldRepeat ? 1 : 0),
        attempts: stats.attempts + 1,
      }));
      const nextIndex = sessionIndex + 1;
      setSessionIndex(nextIndex);
      setRevealed(false);
      setTypedAnswer('');
      setTypedResult(null);
      const totalInDeck = shouldRepeat ? sessionCards.length + 1 : sessionCards.length;
      if (nextIndex >= totalInDeck) {
        notify.success(tr('Hoàn thành phiên ôn tập SRS!'), '', { key: 'srs-session-done' });
      }
    } catch (error) {
      setSubmitError(describeApiError(error).message || tr('Không lưu được kết quả ôn tập.'));
      notify.apiError(error, tr('Không lưu được kết quả ôn tập'), { key: 'srs-submit-err' });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  function checkAnswer(event) {
    event.preventDefault();
    if (!currentCard || !typingCurrentCard || revealed || !typedAnswer.trim()) return;
    setTypedResult(checkTypedReading(currentCard, typedAnswer));
    setRevealed(true);
  }

  async function returnToQueue() {
    if (submitting.current) return;
    setTypedAnswer('');
    setTypedResult(null);
    setSessionStarted(false);
    setSessionCards([]);
    setSessionIndex(0);
    setRevealed(false);
    await loadQueue();
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Ôn SRS')}>
      <div className="min-h-dvh bg-background text-on-surface" data-page="DailySRS">
        <main className="rp-container rp-cq flex flex-col gap-[var(--rp-space-section)] py-[var(--rp-space-page-y)]">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Icon name="timelapse" className="text-[18px]" />
                <span>{tr('Spaced Repetition • Ôn đúng thời điểm')}</span>
              </div>
              <h1 className="rp-type-page-title mt-1">{tr('Ôn tập SRS')}</h1>
              <p className="rp-type-body mt-2 max-w-2xl text-on-surface-variant">
                {studyMode === 'type' ? tr('Ôn các thẻ đã đến hạn bằng cách nhập cách đọc, kiểm tra rồi tiếp tục.') : tr('Ôn các thẻ đã đến hạn. Xem mặt trước, tự nhớ đáp án rồi lật thẻ để kiểm tra.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-sm text-on-surface-variant shadow-sm">
                <Icon name="calendar_today" className="text-[18px] text-primary" />
                <span className="capitalize">{locale === 'ja' ? `今日: ${formatToday(locale)}` : trf('Hôm nay: {0}', { 0: formatToday(locale) })}</span>
              </div>
              {!sessionStarted && (
                <button
                  type="button"
                  onClick={loadQueue}
                  disabled={isLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm transition hover:bg-surface-container disabled:opacity-50"
                  aria-label={tr('Tải lại hàng ôn')}
                  title={tr('Tải lại hàng ôn')}
                >
                  {isLoading ? <SakuraLoader variant="inline" size={18} /> : <Icon name="refresh" />}
                </button>
              )}
            </div>
          </header>

          {!sessionStarted && <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm" aria-label={tr('Chọn cách học SRS')}>
            <h2 className="text-sm font-semibold">{tr('Chọn cách học')}</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={() => setStudyMode('flip')} aria-pressed={studyMode === 'flip'} className={`rounded-xl border px-5 py-3 text-sm font-semibold ${studyMode === 'flip' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface'}`}>{tr('Lật thẻ')}</button>
              <button type="button" onClick={() => setStudyMode('type')} aria-pressed={studyMode === 'type'} className={`rounded-xl border px-5 py-3 text-sm font-semibold ${studyMode === 'type' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface'}`}>{tr('Gõ đáp án')}</button>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">{studyMode === 'type' ? tr('Gõ cách đọc bằng Kana hoặc Romaji. Thẻ thiếu cách đọc và thẻ ngữ pháp sẽ dùng lật thẻ, tự đánh giá.') : tr('Tự nhớ đáp án rồi lật thẻ và đánh giá mức ghi nhớ.')}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{tr('Hai cách học dùng chung thẻ và lịch ôn SRS.')}</p>
          </section>}

          {isLoading && !sessionStarted && queue.length === 0 ? (
            <SakuraLoader variant="section" context="srs" delay={160} />
          ) : sessionStarted ? (
            <section className="mx-auto w-full max-w-4xl rounded-3xl bg-surface-container-lowest p-5 shadow-sm md:p-9">
              {isSessionComplete ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
                    <Icon name="task_alt" className="text-4xl" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold">{tr('Bạn đã hoàn thành phiên ôn!')}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {locale === 'ja'
                      ? `${sessionStats.attempts} 回回答: 覚えた ${sessionStats.correct}、再復習 ${sessionStats.incorrect}`
                      : trf('Đã trả lời {0} lượt: nhớ {1}, cần ôn lại {2} lượt.', { 0: sessionStats.attempts, 1: sessionStats.correct, 2: sessionStats.incorrect })}
                  </p>
                  <button
                    type="button"
                    onClick={returnToQueue}
                    className="mt-7 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition hover:bg-primary-hover"
                  >
                    {tr('Xem hàng ôn hôm nay')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tr('Phiên ôn tập')}</p>
                      <h2 className="mt-1 text-lg font-bold">{locale === 'ja' ? `カード ${sessionIndex + 1} / ${sessionCards.length}` : trf('Thẻ {0} / {1}', { 0: sessionIndex + 1, 1: sessionCards.length })}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={returnToQueue}
                      disabled={isSubmitting}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container"
                    >
                      {tr('Kết thúc phiên')}
                    </button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container" aria-label={tr('Tiến độ phiên ôn')}>
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (sessionIndex / sessionCards.length) * 100)}%` }}
                    />
                  </div>

                  <div className="my-7 min-h-[280px] rounded-2xl border border-outline-variant/50 bg-gradient-to-br from-surface-container-lowest to-surface-container-low px-5 py-10 text-center md:px-10">
                    <span className="inline-flex rounded-full bg-secondary-container/40 px-3 py-1 text-xs font-semibold text-primary">
                      {tr(getContentTypeLabel(currentCard?.contentType))}
                    </span>
                    <p className="mt-8 break-words text-4xl font-bold leading-tight text-on-surface md:text-6xl" lang="ja">
                      {currentCard?.term || '—'}
                    </p>
                    {revealed ? (
                      <div className="mx-auto mt-7 max-w-2xl border-t border-outline-variant/50 pt-6">
                        {currentCard?.reading && <p className="text-lg font-medium text-secondary" lang="ja">{currentCard.reading}</p>}
                        <p className="mt-2 whitespace-pre-wrap text-xl font-semibold text-primary">{currentCard?.meaning || tr('Chưa có nghĩa cho thẻ này.')}</p>
                        {currentCard?.note && <p className="mt-3 text-sm text-on-surface-variant">{tr('Ghi chú:')} {tr(currentCard.note)}</p>}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-on-surface-variant">{typingCurrentCard ? tr('Nhập cách đọc của thẻ bằng Kana hoặc Romaji.') : tr('Hãy tự nhớ nghĩa trước khi lật thẻ.')}</p>
                    )}
                  </div>

                  {typingCurrentCard ? (
                    !revealed ? <form onSubmit={checkAnswer} className="mx-auto max-w-xl">
                      <label htmlFor="srs-typed-answer" className="text-sm font-semibold">{tr('Cách đọc của bạn')}</label>
                      <input id="srs-typed-answer" value={typedAnswer} onChange={event => setTypedAnswer(event.target.value)}
                        onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }}
                        autoComplete="off" autoCapitalize="none" spellCheck={false}
                        placeholder={tr('Ví dụ: みず hoặc mizu')} maxLength={200}
                        className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-lg outline-none focus:border-primary" />
                      <button type="submit" disabled={!typedAnswer.trim()} className="mt-4 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-40">{tr('Kiểm tra')}</button>
                    </form> : <div className="mx-auto max-w-xl">
                      <div role="status" className={`rounded-xl border p-4 ${typedResult.correct ? 'border-tertiary/30 bg-tertiary/10 text-tertiary' : 'border-error/30 bg-error-container/40 text-error'}`}>
                        <p className="font-semibold">{typedResult.correct ? tr('Đúng rồi!') : tr('Chưa đúng. Thẻ sẽ được ôn lại cuối phiên.')}</p>
                        <p className="mt-1 text-sm">{trf('Bạn đã nhập: {0}', { 0: typedAnswer })}</p>
                        <p className="mt-1 text-sm">{trf('Cách đọc: {0}', { 0: currentCard.reading })}</p>
                      </div>
                      <button type="button" disabled={isSubmitting} onClick={() => submitAnswer(typedResult.correct ? 4 : 1)} className="mt-4 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-40">{isSubmitting ? tr('Đang lưu…') : tr('Tiếp tục')}</button>
                    </div>
                  ) : !revealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 font-semibold text-on-primary shadow-sm transition hover:bg-primary-hover"
                    >
                      <Icon name="flip" />
                      {tr('Lật thẻ xem đáp án')}
                    </button>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => submitAnswer(1)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-error/30 bg-error-container/40 px-5 py-3 font-semibold text-error transition hover:bg-error-container disabled:cursor-wait disabled:opacity-60"
                      >
                        <Icon name="replay" />
                        {tr('Chưa nhớ · lặp cuối phiên')}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => submitAnswer(4)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-tertiary px-5 py-3 font-semibold text-on-tertiary transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Icon name="check_circle" />
                        {tr('Đã nhớ · thẻ tiếp theo')}
                      </button>
                    </div>
                  )}
                  {isSubmitting && <p className="mt-4 text-center text-sm text-on-surface-variant">{tr('Đang lưu kết quả…')}</p>}
                  {submitError && (
                    <p role="alert" className="mt-4 rounded-lg bg-error-container/40 px-4 py-3 text-center text-sm text-error">
                      {submitError}
                    </p>
                  )}
                  <p className="mt-5 text-center text-xs leading-5 text-on-surface-variant">
                    {studyMode === 'type' && !typingCurrentCard ? tr('Thẻ này chưa có cách đọc phù hợp để chấm tự động. Hãy lật thẻ và tự đánh giá.') : tr('Thẻ chưa nhớ sẽ được xếp lại sau các thẻ còn lại trong phiên. Lịch ôn tiếp theo vẫn được cập nhật theo SRS.')}
                  </p>
                </>
              )}
            </section>
          ) : loadError ? (
            <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
              <ContextualErrorState
                error={loadError}
                title={tr('Không tải được hàng ôn')}
                onRetry={loadQueue}
                retrying={isLoading}
              />
            </section>
          ) : (
            <>
              <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm md:p-9">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary-container/25 blur-3xl" />
                <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container/40 px-4 py-2 text-sm font-semibold text-primary">
                      <Icon name="notifications_active" className="text-[18px]" />
                      {tr('Hàng đợi ôn tập hôm nay')}
                    </span>
                    <h2 className="mt-5 text-2xl font-bold leading-snug md:text-3xl">
                      {queue.length > 0 ? (
                        <>{locale === 'ja' ? '今日は' : tr('Hôm nay có')} <span className="text-primary">{queue.length} {locale === 'ja' ? '枚' : tr('thẻ')}</span> {locale === 'ja' ? 'が復習期限です。' : tr('đến hạn ôn.')}</>
                      ) : tr('Bạn không có thẻ nào đến hạn hôm nay.')}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                      {studyMode === 'type' ? tr('Nhập cách đọc bằng Kana hoặc Romaji, xem kết quả rồi bấm Tiếp tục để lưu lịch ôn.') : tr('Phiên ôn hiển thị từng thẻ, cho xem đáp án rồi ghi nhận bạn đã nhớ hay cần ôn lại.')}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="rounded-xl bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-medium text-on-surface-variant">{tr('Thẻ đến hạn')}</p>
                        <p className="mt-1 text-2xl font-bold text-primary">{queue.length}</p>
                      </div>
                      <div className="rounded-xl bg-surface-container-low px-4 py-3">
                        <p className="text-xs font-medium text-on-surface-variant">{tr('Thời gian dự kiến')}</p>
                        <p className="mt-1 text-sm font-semibold text-on-surface">{tr('Tùy tốc độ ôn của bạn')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full rounded-2xl bg-surface-container-low p-6 text-center shadow-sm lg:max-w-xs">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-md">
                      <Icon name="style" className="text-3xl" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{tr('Sẵn sàng ôn tập?')}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">{tr('Thẻ sai được đưa về cuối phiên để thử lại.')}</p>
                    <button
                      type="button"
                      onClick={startSession}
                      disabled={queue.length === 0 || isLoading}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {locale === 'ja' ? `復習を始める（${queue.length} 枚）` : trf('Bắt đầu phiên ôn ({0} thẻ)', { 0: queue.length })}
                      <Icon name="arrow_forward" />
                    </button>
                  </div>
                </div>
              </section>

              <div className="rp-cq-two-col">
                <section className="rounded-2xl bg-surface-container-lowest p-[var(--rp-space-card-pad)] shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name="view_carousel" className="text-2xl text-primary" />
                      <h3 className="text-lg font-bold">{tr('Thẻ ưu tiên trong hàng ôn')}</h3>
                    </div>
                    <span className="text-sm text-on-surface-variant">{locale === 'ja' ? `${queue.length} 枚が期限` : trf('{0} thẻ đến hạn', { 0: queue.length })}</span>
                  </div>
                  {queue.length === 0 ? (
                    <div className="mt-5 rounded-xl bg-surface-container-low px-5 py-8 text-center">
                      <Icon name="task_alt" className="text-3xl text-tertiary" />
                      <p className="mt-2 font-semibold">{tr('Hàng ôn hôm nay đã trống')}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">{tr('Thẻ sẽ quay lại hàng ôn khi đến lịch tiếp theo.')}</p>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-col gap-2">
                      {queue.slice(0, 5).map((card, index) => (
                        <div key={card.reviewCardId} className="flex items-center justify-between gap-4 rounded-xl bg-surface-container-low px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container/50 text-sm font-bold text-primary">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold" lang="ja">{card.term || '—'}</p>
                              <p className="truncate text-xs text-on-surface-variant">{card.reading || tr(getContentTypeLabel(card.contentType))}</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{tr('Đến hạn')}</span>
                        </div>
                      ))}
                      {queue.length > 5 && <p className="pt-1 text-sm text-on-surface-variant">{locale === 'ja' ? `セッションにあと ${queue.length - 5} 枚` : trf('Còn {0} thẻ trong phiên ôn.', { 0: queue.length - 5 })}</p>}
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Icon name="psychology" className="text-2xl text-primary" />
                    <h3 className="text-lg font-bold">{tr('Cách phiên ôn hoạt động')}</h3>
                  </div>
                  <ol className="mt-5 space-y-4 text-sm leading-6 text-on-surface-variant">
                    <li className="flex gap-3"><span className="font-bold text-primary">1.</span><span>{studyMode === 'type' ? tr('Nhìn thẻ và nhập cách đọc bằng Kana hoặc Romaji.') : tr('Nhìn từ hoặc cấu trúc và tự nhớ đáp án.')}</span></li>
                    <li className="flex gap-3"><span className="font-bold text-primary">2.</span><span>{studyMode === 'type' ? tr('Bấm Kiểm tra để xem đúng/sai và đáp án.') : tr('Lật thẻ để xem cách đọc, nghĩa và ghi chú.')}</span></li>
                    <li className="flex gap-3"><span className="font-bold text-primary">3.</span><span>{studyMode === 'type' ? tr('Bấm Tiếp tục để lưu kết quả vào lịch SRS.') : tr('Chọn “Đã nhớ” để sang thẻ tiếp theo.')}</span></li>
                    <li className="flex gap-3"><span className="font-bold text-primary">4.</span><span>{studyMode === 'type' ? tr('Thẻ trả lời sai sẽ xuất hiện lại ở cuối phiên.') : tr('Chọn “Chưa nhớ” để gặp lại thẻ ở cuối phiên.')}</span></li>
                  </ol>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </LearnerShell>
  );
}
