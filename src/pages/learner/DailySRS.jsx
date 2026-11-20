import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  Layers,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Timer,
} from 'lucide-react';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { getDailyReviewQueue, submitReviewResult } from '@/features/srs/api/reviewApi.js';
import { checkTypedReading, getAcceptedReadings } from '@/features/srs/utils/srsTypedAnswer.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ContextualEmptyState,
  ContextualErrorState,
  Field,
  Input,
  PageContainer,
  PageHeader,
  Popover,
  ProgressBar,
  SakuraLoader,
  SegmentedControl,
  notify,
} from '@/components/ui';

function getContentTypeLabel(contentType) {
  const value = String(contentType ?? '').toLowerCase();
  if (value === '1' || value === 'kanji') return 'Kanji';
  if (value === '2' || value === 'grammar') return 'Ngữ pháp';
  return 'Từ vựng';
}

function formatToday() {
  return new Intl.DateTimeFormat(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
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
      const raw = Array.isArray(result?.items) ? result.items : [];
      const seen = new Set();
      const unique = raw.filter((item) => {
        if (!item?.reviewCardId || seen.has(item.reviewCardId)) return false;
        seen.add(item.reviewCardId);
        return true;
      });
      setQueue(unique);
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

      let appended = false;
      if (shouldRepeat) {
        setSessionCards((cards) => {
          const remaining = cards.slice(sessionIndex + 1);
          if (remaining.some((c) => c.reviewCardId === currentCard.reviewCardId)) {
            return cards;
          }
          appended = true;
          return [...cards, currentCard];
        });
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
      const totalInDeck = appended ? sessionCards.length + 1 : sessionCards.length;
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
    <LearnerShell pathname={pathname} breadcrumb={tr('Ôn tập SRS')}>
      <PageContainer data-page="DailySRS" width="default" density="comfortable" className="space-y-[var(--rp-space-section)] text-rp-text">
        <PageHeader
          eyebrow="Spaced Repetition · Ôn đúng thời điểm"
          title="Ôn tập SRS"
          description={studyMode === 'type'
            ? 'Ôn các thẻ đã đến hạn bằng cách nhập cách đọc Kana/Romaji, kiểm tra rồi tiếp tục.'
            : 'Ôn các thẻ đã đến hạn. Xem mặt trước, tự nhớ đáp án rồi lật thẻ để kiểm tra.'}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" icon={CalendarDays} size="md">
                {locale === 'ja' ? `今日: ${formatToday()}` : trf('Hôm nay: {0}', { 0: formatToday() })}
              </Badge>
              <Popover
                align="end"
                label={tr('Cách phiên ôn hoạt động')}
                panelClassName="w-[min(340px,calc(100vw-32px))] p-4 text-xs text-rp-text-2"
                trigger={({ toggle, props }) => (
                  <Button variant="secondary" size="sm" icon={HelpCircle} onClick={toggle} {...props}>
                    {tr('Hướng dẫn')}
                  </Button>
                )}
              >
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-rp-text">{tr('Cách phiên ôn hoạt động')}</p>
                  <ol className="space-y-2 leading-relaxed">
                    <li className="flex gap-2">
                      <strong className="text-rp-brand-strong">1.</strong>
                      <span>{studyMode === 'type' ? tr('Nhìn thẻ và nhập cách đọc bằng Kana hoặc Romaji.') : tr('Nhìn từ hoặc cấu trúc và tự nhớ đáp án.')}</span>
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-rp-brand-strong">2.</strong>
                      <span>{studyMode === 'type' ? tr('Bấm Kiểm tra để xem đúng/sai và đáp án.') : tr('Lật thẻ để xem cách đọc, nghĩa và ghi chú.')}</span>
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-rp-brand-strong">3.</strong>
                      <span>{studyMode === 'type' ? tr('Bấm Tiếp tục để lưu kết quả vào lịch SRS.') : tr('Chọn “Đã nhớ” để sang thẻ tiếp theo.')}</span>
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-rp-brand-strong">4.</strong>
                      <span>{studyMode === 'type' ? tr('Thẻ trả lời sai sẽ xuất hiện lại ở cuối phiên.') : tr('Chọn “Chưa nhớ” để gặp lại thẻ ở cuối phiên.')}</span>
                    </li>
                  </ol>
                </div>
              </Popover>
              {!sessionStarted && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  loading={isLoading}
                  onClick={loadQueue}
                  aria-label={tr('Tải lại hàng ôn')}
                >
                  {tr('Tải lại')}
                </Button>
              )}
            </div>
          )}
        />

        {!sessionStarted && (
          <Card density="compact" className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-rp-text">{tr('Chọn chế độ ôn tập')}</h2>
              <p className="text-xs text-rp-text-muted">
                {studyMode === 'type'
                  ? tr('Gõ cách đọc bằng Kana hoặc Romaji. Thẻ thiếu cách đọc và thẻ ngữ pháp sẽ dùng lật thẻ.')
                  : tr('Tự nhớ đáp án rồi lật thẻ và đánh giá mức ghi nhớ.')}
              </p>
            </div>
            <SegmentedControl
              label={tr('Chọn cách học SRS')}
              value={studyMode}
              onChange={setStudyMode}
              options={[
                { value: 'flip', label: 'Lật thẻ' },
                { value: 'type', label: 'Gõ đáp án' },
              ]}
            />
          </Card>
        )}

        {isLoading && !sessionStarted && queue.length === 0 ? (
          <SakuraLoader variant="section" context="srs" delay={160} />
        ) : sessionStarted ? (
          <Card className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-8">
            {isSessionComplete ? (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rp-success-bg text-rp-success">
                  <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-rp-text">{tr('Bạn đã hoàn thành phiên ôn!')}</h2>
                <p className="text-sm text-rp-text-2">
                  {locale === 'ja'
                    ? `${sessionStats.attempts} 回回答: 覚えた ${sessionStats.correct}、再復習 ${sessionStats.incorrect}`
                    : trf('Đã trả lời {0} lượt: nhớ {1}, cần ôn lại {2} lượt.', {
                        0: sessionStats.attempts,
                        1: sessionStats.correct,
                        2: sessionStats.incorrect,
                      })}
                </p>
                <div className="pt-2">
                  <Button variant="primary" onClick={returnToQueue}>
                    {tr('Xem hàng ôn hôm nay')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rp-brand-strong">{tr('Phiên ôn tập')}</p>
                    <h2 className="mt-1 text-lg font-bold text-rp-text">
                      {locale === 'ja'
                        ? `カード ${sessionIndex + 1} / ${sessionCards.length}`
                        : trf('Thẻ {0} / {1}', { 0: sessionIndex + 1, 1: sessionCards.length })}
                    </h2>
                  </div>
                  <Button variant="secondary" size="sm" onClick={returnToQueue} disabled={isSubmitting}>
                    {tr('Kết thúc phiên')}
                  </Button>
                </div>

                <ProgressBar
                  value={sessionIndex}
                  max={sessionCards.length || 1}
                  label={tr('Tiến độ phiên ôn')}
                />

                <div className="min-h-[260px] rounded-2xl border border-rp-line bg-rp-bg-2 px-5 py-10 text-center md:px-10">
                  <Badge tone="brand" icon={false} size="sm">
                    {tr(getContentTypeLabel(currentCard?.contentType))}
                  </Badge>
                  <p className="rp-jp mt-7 break-words text-4xl font-bold leading-tight text-rp-text md:text-6xl" lang="ja">
                    {currentCard?.term || '—'}
                  </p>
                  {revealed ? (
                    <div className="mx-auto mt-7 max-w-2xl border-t border-rp-line pt-6 space-y-2">
                      {currentCard?.reading && <p className="rp-jp text-lg font-medium text-rp-brand-strong" lang="ja">{currentCard.reading}</p>}
                      <p className="whitespace-pre-wrap text-xl font-semibold text-rp-text">{currentCard?.meaning || tr('Chưa có nghĩa cho thẻ này.')}</p>
                      {currentCard?.note && <p className="text-sm text-rp-text-2">{tr('Ghi chú:')} {currentCard.note}</p>}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-rp-text-muted">
                      {typingCurrentCard ? tr('Nhập cách đọc của thẻ bằng Kana hoặc Romaji.') : tr('Hãy tự nhớ nghĩa trước khi lật thẻ.')}
                    </p>
                  )}
                </div>

                {typingCurrentCard ? (
                  !revealed ? (
                    <form onSubmit={checkAnswer} className="mx-auto max-w-xl space-y-3">
                      <Field label="Cách đọc của bạn" htmlFor="srs-typed-answer">
                        <Input
                          id="srs-typed-answer"
                          value={typedAnswer}
                          onChange={(event) => setTypedAnswer(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
                          }}
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder={tr('Ví dụ: みず hoặc mizu')}
                          maxLength={200}
                        />
                      </Field>
                      <Button type="submit" variant="primary" className="w-full" disabled={!typedAnswer.trim()}>
                        {tr('Kiểm tra')}
                      </Button>
                    </form>
                  ) : (
                    <div className="mx-auto max-w-xl space-y-3">
                      <Banner
                        tone={typedResult.correct ? 'success' : 'danger'}
                        role="status"
                        title={typedResult.correct ? 'Đúng rồi!' : 'Chưa đúng. Thẻ sẽ được ôn lại cuối phiên.'}
                      >
                        <p className="text-xs">{trf('Bạn đã nhập: {0}', { 0: typedAnswer })}</p>
                        <p className="mt-0.5 text-xs">{trf('Cách đọc: {0}', { 0: currentCard.reading })}</p>
                      </Banner>
                      <Button
                        variant="primary"
                        className="w-full"
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        onClick={() => submitAnswer(typedResult.correct ? 4 : 1)}
                      >
                        {tr('Tiếp tục')}
                      </Button>
                    </div>
                  )
                ) : !revealed ? (
                  <div className="flex justify-center">
                    <Button variant="primary" icon={Sparkles} onClick={() => setRevealed(true)}>
                      {tr('Lật thẻ xem đáp án')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      icon={RotateCcw}
                      disabled={isSubmitting}
                      onClick={() => submitAnswer(1)}
                    >
                      {tr('Chưa nhớ · lặp cuối phiên')}
                    </Button>
                    <Button
                      variant="primary"
                      icon={CheckCircle2}
                      loading={isSubmitting}
                      disabled={isSubmitting}
                      onClick={() => submitAnswer(4)}
                    >
                      {tr('Đã nhớ · thẻ tiếp theo')}
                    </Button>
                  </div>
                )}

                {submitError && <Banner tone="danger">{submitError}</Banner>}

                <p className="text-center text-xs leading-5 text-rp-text-muted">
                  {studyMode === 'type' && !typingCurrentCard
                    ? tr('Thẻ này chưa có cách đọc phù hợp để chấm tự động. Hãy lật thẻ và tự đánh giá.')
                    : tr('Thẻ chưa nhớ sẽ được xếp lại sau các thẻ còn lại trong phiên. Lịch ôn tiếp theo vẫn được cập nhật theo SRS.')}
                </p>
              </>
            )}
          </Card>
        ) : loadError ? (
          <Card>
            <ContextualErrorState
              error={loadError}
              title={tr('Không tải được hàng ôn')}
              onRetry={loadQueue}
              retrying={isLoading}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <Badge tone="brand" icon={Bell} size="sm">{tr('Hàng đợi ôn tập hôm nay')}</Badge>
                <h2 className="text-2xl font-bold leading-snug text-rp-text md:text-[26px]">
                  {queue.length > 0 ? (
                    <>
                      {locale === 'ja' ? '今日は' : tr('Hôm nay có')}{' '}
                      <span className="text-rp-brand-strong">{queue.length} {locale === 'ja' ? '枚' : tr('thẻ')}</span>{' '}
                      {locale === 'ja' ? 'が復習期限です。' : tr('đến hạn ôn.')}
                    </>
                  ) : tr('Bạn không có thẻ nào đến hạn hôm nay.')}
                </h2>
                <p className="text-sm leading-6 text-rp-text-muted">
                  {studyMode === 'type'
                    ? tr('Nhập cách đọc bằng Kana hoặc Romaji, xem kết quả rồi bấm Tiếp tục để lưu lịch ôn.')
                    : tr('Phiên ôn hiển thị từng thẻ, cho xem đáp án rồi ghi nhận bạn đã nhớ hay cần ôn lại.')}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-2.5">
                    <p className="text-xs font-medium text-rp-text-muted">{tr('Thẻ đến hạn')}</p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-rp-brand-strong">{queue.length}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-2.5">
                    <Timer aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
                    <div>
                      <p className="text-xs font-medium text-rp-text-muted">{tr('Nhịp ôn tập')}</p>
                      <p className="mt-0.5 text-sm font-semibold text-rp-text">{tr('Tùy tốc độ ôn của bạn')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full rounded-2xl border border-rp-line bg-rp-bg-2 p-5 text-center lg:max-w-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rp-brand-tint text-rp-brand-strong">
                  <Layers aria-hidden="true" className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-rp-text">{tr('Sẵn sàng ôn tập?')}</h3>
                <p className="mt-1 text-xs leading-5 text-rp-text-muted">{tr('Thẻ sai được đưa về cuối phiên để thử lại.')}</p>
                <Button
                  variant="primary"
                  iconRight={ArrowRight}
                  className="mt-4 w-full"
                  disabled={queue.length === 0 || isLoading}
                  onClick={startSession}
                >
                  {locale === 'ja' ? `復習を始める（${queue.length} 枚）` : trf('Bắt đầu phiên ôn ({0} thẻ)', { 0: queue.length })}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Thẻ ưu tiên trong hàng ôn"
                description={locale === 'ja' ? `${queue.length} 枚が期限` : trf('{0} thẻ đến hạn', { 0: queue.length })}
              />
              {queue.length === 0 ? (
                <div className="mt-3">
                  <ContextualEmptyState
                    compact
                    context="srs"
                    title="Hàng ôn hôm nay đã trống"
                    message="Thẻ sẽ quay lại hàng ôn khi đến lịch tiếp theo. Bạn có thể lưu thêm từ từ bài học hoặc Sổ tay."
                    action={(
                      <div className="flex flex-wrap justify-center gap-2">
                        <Link to="/vocabulary/"><Button variant="primary" size="sm">{tr('Mở sổ từ vựng')}</Button></Link>
                        <Link to="/lessons/"><Button variant="secondary" size="sm">{tr('Học bài mới')}</Button></Link>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {queue.slice(0, 8).map((card, index) => (
                    <div key={card.reviewCardId} className="flex items-center justify-between gap-4 rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rp-brand-tint text-sm font-bold text-rp-brand-strong">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="rp-jp truncate font-semibold text-rp-text" lang="ja">{card.term || '—'}</p>
                          <p className="truncate text-xs text-rp-text-muted">{card.reading || tr(getContentTypeLabel(card.contentType))}</p>
                        </div>
                      </div>
                      <Badge tone="brand" icon={false} size="sm">{tr('Đến hạn')}</Badge>
                    </div>
                  ))}
                  {queue.length > 8 && (
                    <p className="pt-1 text-xs text-rp-text-muted">
                      {locale === 'ja' ? `セッションにあと ${queue.length - 8} 枚` : trf('Còn {0} thẻ nữa trong hàng ôn.', { 0: queue.length - 8 })}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
