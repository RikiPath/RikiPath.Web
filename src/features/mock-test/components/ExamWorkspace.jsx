import { useRef, useState } from 'react';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Layers,
  LayoutGrid,
  ListChecks,
  Send,
  Volume2,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  Drawer,
  ProgressBar,
  Tabs,
  cx,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Enforces JLPT audio playback policy (maxReplays, allowPause, allowSeek) when configured.
 */
function ListeningPolicyAudio({ src, policy }) {
  const { tr, trf } = useLocale();
  const audioRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [playCount, setPlayCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

  const maxReplays = policy?.maxReplays ?? null;
  const allowPause = policy?.allowPause ?? true;
  const allowSeek = policy?.allowSeek ?? true;

  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-rp-line bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rp-text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-rp-text">
          <Volume2 className="h-3.5 w-3.5 text-rp-brand-strong" />
          <span>{tr('File nghe JLPT')}</span>
        </span>
        {maxReplays != null && maxReplays > 0 && (
          <span>
            {trf('Lượt nghe: {0}/{1}', { 0: Math.min(playCount, maxReplays), 1: maxReplays })}
          </span>
        )}
      </div>

      <audio
        ref={audioRef}
        controls={!limitReached}
        preload="none"
        src={src}
        className="w-full"
        onPlay={(e) => {
          if (maxReplays != null && maxReplays > 0 && playCount >= maxReplays) {
            e.currentTarget.pause();
            setLimitReached(true);
          }
        }}
        onTimeUpdate={(e) => {
          lastTimeRef.current = e.currentTarget.currentTime;
        }}
        onSeeking={(e) => {
          if (!allowSeek && Math.abs(e.currentTarget.currentTime - lastTimeRef.current) > 1.5) {
            e.currentTarget.currentTime = lastTimeRef.current;
          }
        }}
        onPause={(e) => {
          if (!allowPause && !e.currentTarget.ended && !limitReached) {
            void e.currentTarget.play().catch(() => {});
          }
        }}
        onEnded={() => {
          lastTimeRef.current = 0;
          setPlayCount((prev) => {
            const next = prev + 1;
            if (maxReplays != null && maxReplays > 0 && next >= maxReplays) {
              setLimitReached(true);
            }
            return next;
          });
        }}
      />

      {limitReached && (
        <p className="text-xs font-medium text-amber-700">
          {tr('Bạn đã sử dụng hết số lượt nghe cho phép của câu hỏi này.')}
        </p>
      )}
    </div>
  );
}

/**
 * Unified Dual-Mode Exam & Assessment Workspace.
 * Shares exact live `questions`, `isAnswered`, timer, save status, flags, and submit
 * across 'scroll' (Danh sách cuộn) and 'single' (Từng câu một) modes without losing state.
 */
export default function ExamWorkspace({
  title,
  subtitle,
  questions = [],
  isAnswered,
  renderQuestionBody,
  clockLabel,
  secondsLeft,
  urgentSecondsThreshold = 60,
  saveState = 'idle',
  pending = false,
  expired = false,
  offline = false,
  errorMessage = '',
  onRetrySave,
  submitLabel,
  expiredSubmitLabel,
  onRequestSubmit,
  onExpiredSubmit,
  initialMode = 'scroll',
}) {
  const { tr, trf } = useLocale();
  const [mode, setMode] = useState(initialMode === 'single' ? 'single' : 'scroll');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flaggedIds, setFlaggedIds] = useState(() => new Set());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const total = questions.length;
  const safeIndex = total > 0 ? Math.max(0, Math.min(total - 1, currentIndex)) : 0;
  const currentQuestion = questions[safeIndex] || null;
  const answeredCount = questions.filter((q) => isAnswered(q)).length;
  const unansweredCount = Math.max(0, total - answeredCount);
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const isUrgent = secondsLeft != null && secondsLeft <= urgentSecondsThreshold;
  const resolvedSubmitLabel = submitLabel || tr('Nộp bài');
  const resolvedExpiredSubmitLabel = expiredSubmitLabel || tr('Nộp bài đã hết giờ');

  function toggleFlag(questionId) {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function jumpToQuestion(index, questionId) {
    setCurrentIndex(index);
    setMobileNavOpen(false);
    if (mode === 'scroll') {
      requestAnimationFrame(() => {
        document.getElementById(`exam-question-${questionId}`)?.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function renderQuestionCard(question, index) {
    const flagged = flaggedIds.has(question.questionId);
    const resolvedPassageText =
      question.passageText ||
      [question.interactionData?.passage, question.interactionData?.secondPassage]
        .filter((s) => typeof s === 'string' && s.trim())
        .join('\n\n---\n\n') ||
      '';
    const metaParts = [question.jlptLevelName, question.languageSkillName, question.sectionTitle]
      .map((s) => (s ? String(s).trim() : ''))
      .filter(Boolean);
    const metaLabel = [...new Set(metaParts)].slice(0, 2).join(' · ');

    return (
      <fieldset
        id={`exam-question-${question.questionId}`}
        key={question.questionId}
        disabled={pending || expired}
        className="scroll-mt-32 rounded-rp-card border border-rp-line bg-rp-surface p-5 shadow-rp-card"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-rp-line/70 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-rp-brand-tint px-2.5 text-xs font-bold text-rp-brand-strong">
              {trf('Câu {0}', { 0: index + 1 })}
              {mode === 'single' && total > 0 ? ` / ${total}` : ''}
            </span>
            {metaLabel && (
              <span className="text-xs font-medium text-rp-text-muted">{metaLabel}</span>
            )}
          </div>

          <button
            type="button"
            disabled={pending || expired}
            aria-pressed={flagged}
            onClick={() => toggleFlag(question.questionId)}
            className={cx(
              'rp-focus inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              flagged
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-rp-line bg-white text-rp-text-muted hover:border-rp-brand-border hover:text-rp-text',
            )}
          >
            <Flag aria-hidden="true" className={cx('h-3.5 w-3.5', flagged && 'fill-amber-400 text-amber-600')} />
            {flagged ? tr('Đã đánh dấu') : tr('Đánh dấu')}
          </button>
        </div>

        {resolvedPassageText && (
          <details open className="mb-3 rounded-xl border border-rp-line bg-slate-50/70 p-3.5">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-rp-brand-strong">
              <BookOpenText className="h-4 w-4" />
              <span>{question.passageTitle || tr('Đoạn đọc hiểu')}</span>
            </summary>
            {question.passageInstructions && (
              <p className="mt-2 text-xs italic text-rp-text-muted">{question.passageInstructions}</p>
            )}
            <div className="rp-jp mt-2 whitespace-pre-wrap text-[14.5px] leading-7 text-rp-text">
              {resolvedPassageText}
            </div>
            {question.passageImageUrl && (
              <img
                src={question.passageImageUrl}
                alt={question.passageTitle || tr('Hình minh họa đoạn đọc')}
                className="mt-2.5 max-h-72 max-w-full rounded-lg border border-rp-line/70"
              />
            )}
          </details>
        )}

        <p className="whitespace-pre-wrap text-[15px] font-medium leading-7 text-rp-text">
          {question.content}
        </p>

        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt={tr('Hình minh họa câu hỏi')}
            className="mt-3 max-h-80 max-w-full rounded-xl border border-rp-line/70"
          />
        )}

        {question.audioUrl && (
          <ListeningPolicyAudio
            src={question.audioUrl}
            policy={question.playbackPolicy}
          />
        )}

        <div className="mt-4">
          {renderQuestionBody(question, index)}
        </div>
      </fieldset>
    );
  }

  function renderQuestionGrid({ compact = false } = {}) {
    return (
      <div className="space-y-3">
        <nav
          aria-label={tr('Chuyển đến câu hỏi')}
          className={cx(
            'grid gap-1.5',
            compact
              ? 'grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))]'
              : 'grid-cols-5',
          )}
        >
          {questions.map((question, index) => {
            const done = isAnswered(question);
            const flagged = flaggedIds.has(question.questionId);
            const isCurrent = mode === 'single' && index === safeIndex;
            return (
              <button
                key={question.questionId}
                type="button"
                aria-label={trf('Câu {0}, {1}', {
                  0: index + 1,
                  1: done ? tr('đã trả lời') : tr('chưa trả lời'),
                })}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => jumpToQuestion(index, question.questionId)}
                className={cx(
                  'rp-focus relative flex h-9 min-w-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-all',
                  done
                    ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                    : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/35',
                  isCurrent && 'ring-2 ring-rp-brand-strong ring-offset-1',
                )}
              >
                <span>{index + 1}</span>
                {flagged && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-rp-line pt-2.5 text-[11px] text-rp-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-rp-brand bg-rp-brand-tint" />
            {tr('Đã chọn')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-rp-line bg-white" />
            {tr('Chưa chọn')}
          </span>
          {flaggedIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              {tr('Xem lại')}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderSubmitButton({ size = 'md', fullWidth = true } = {}) {
    if (expired) {
      return (
        <Button
          type="button"
          variant="primary"
          size={size}
          icon={Send}
          loading={pending}
          disabled={pending || offline}
          onClick={onExpiredSubmit || onRequestSubmit}
          className={fullWidth ? 'w-full' : undefined}
        >
          {pending ? tr('Đang nộp bài…') : resolvedExpiredSubmitLabel}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        variant="primary"
        size={size}
        icon={Send}
        loading={pending}
        disabled={pending || offline}
          onClick={() => onRequestSubmit({ flaggedCount: flaggedIds.size })}
        className={fullWidth ? 'w-full' : undefined}
      >
        {resolvedSubmitLabel}
      </Button>
    );
  }

  return (
    <div className="space-y-4" data-exam-attempt-active={total > 0 ? 'true' : undefined}>
      {/* Exam Header + Mode Switcher */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-rp-text sm:text-lg">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
            <span>{subtitle}</span>
            {saveState === 'saving' && (
              <Badge tone="neutral" size="sm" icon={false}>{tr('Đang lưu…')}</Badge>
            )}
            {saveState === 'saved' && (
              <Badge tone="success" size="sm" icon={false}>{tr('Đã lưu đáp án')}</Badge>
            )}
            {saveState === 'error' && (
              <Badge tone="danger" size="sm" icon={false}>{tr('Chưa lưu được đáp án')}</Badge>
            )}
          </div>
        </div>

        {/* Sliding Mode Toggle: Danh sách cuộn vs Từng câu một */}
        <Tabs
          variant="pill"
          tone="segmented"
          size="md"
          label={tr('Chế độ làm bài')}
          value={mode}
          onChange={setMode}
          tabs={[
            { value: 'scroll', label: 'Danh sách cuộn', icon: ListChecks },
            { value: 'single', label: 'Từng câu một', icon: Layers },
          ]}
        />
      </Card>

      {/* Mobile Compact Sticky Bar (< lg) */}
      <div className="sticky top-[calc(var(--spacing-rp-topbar)+6px)] z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-surface/95 px-3 py-2 shadow-rp-card backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5 text-xs font-semibold tabular-nums">
          {clockLabel != null && (
            <Badge tone={isUrgent ? 'danger' : 'brand'} icon={Clock} size="sm" className="tabular-nums">
              {clockLabel}
            </Badge>
          )}
          <span className="text-rp-text-2">
            {answeredCount}/{total} {tr('câu')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={LayoutGrid}
            onClick={() => setMobileNavOpen(true)}
          >
            {tr('Bảng câu hỏi')}
          </Button>
          {renderSubmitButton({ size: 'sm', fullWidth: false })}
        </div>
      </div>

      {errorMessage && (
        <Banner tone="danger">{errorMessage}{onRetrySave && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetrySave} className="ml-3">
            {tr('Thử lưu lại')}
          </Button>
        )}</Banner>
      )}
      {expired && total > 0 && (
        <Banner tone="warning">
          {pending ? tr('Đã hết giờ. Đang tự động nộp bài…') : tr('Đã hết thời gian làm bài.')}
        </Banner>
      )}

      {/* Main Responsive Split Workspace */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        {/* Left: Question Area */}
        <div className="min-w-0 space-y-4">
          {mode === 'scroll' ? (
            <>
              {questions.map((question, index) => {
                const showSectionHeader =
                  question.sectionTitle &&
                  (index === 0 || questions[index - 1]?.sectionTitle !== question.sectionTitle);
                return (
                  <div key={question.questionId} className="space-y-2.5">
                    {showSectionHeader && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <h3 className="text-sm font-bold text-rp-text">{tr(question.sectionTitle)}</h3>
                        {question.jlptLevelName && (
                          <Badge tone="brand" icon={false} size="sm">{question.jlptLevelName}</Badge>
                        )}
                      </div>
                    )}
                    {renderQuestionCard(question, index)}
                  </div>
                );
              })}
            </>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <div className="space-y-1.5 rounded-xl border border-rp-line bg-rp-surface px-4 py-3">
                <div className="flex items-center justify-between text-xs font-semibold text-rp-text-2">
                  <span>{trf('Câu {0} trên {1}', { 0: safeIndex + 1, 1: total })}</span>
                  <span className="tabular-nums text-rp-brand-strong">
                    {trf('Đã trả lời {0}/{1}', { 0: answeredCount, 1: total })}
                  </span>
                </div>
                <ProgressBar value={progressPct} max={100} label={tr('Tiến độ làm bài')} />
              </div>

              {renderQuestionCard(currentQuestion, safeIndex)}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-surface px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  icon={ChevronLeft}
                  disabled={safeIndex === 0}
                  onClick={() => jumpToQuestion(safeIndex - 1, questions[safeIndex - 1]?.questionId)}
                >
                  {tr('Câu trước')}
                </Button>

                {safeIndex < total - 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    iconRight={ChevronRight}
                    onClick={() => jumpToQuestion(safeIndex + 1, questions[safeIndex + 1]?.questionId)}
                  >
                    {tr('Câu tiếp')}
                  </Button>
                ) : (
                  renderSubmitButton({ size: 'md', fullWidth: false })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Sticky Navigator + Prominent Submit CTA */}
        <Card
          as="aside"
          aria-label={tr('Thông tin lượt làm bài')}
          className="hidden space-y-4 lg:sticky lg:top-[calc(var(--spacing-rp-topbar)+1rem)] lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          {clockLabel != null && (
            <div className="flex items-center justify-between gap-2 border-b border-rp-line pb-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                <Clock aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
                {tr('Thời gian còn lại')}
              </span>
              <Badge
                tone={isUrgent ? 'danger' : 'brand'}
                icon={false}
                size="md"
                aria-label={tr('Thời gian còn lại')}
                className="tabular-nums font-bold"
              >
                {clockLabel}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rp-text-2">
              <span>{tr('Đã trả lời')}</span>
              <span className="tabular-nums text-rp-text">
                {answeredCount}/{total}
                {unansweredCount > 0 && (
                  <span className="font-normal text-rp-text-muted"> · {trf('còn {0}', { 0: unansweredCount })}</span>
                )}
              </span>
            </div>
            <ProgressBar value={progressPct} max={100} label={tr('Tiến độ trả lời')} />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
              {tr('Danh sách câu hỏi')}
            </p>
            {renderQuestionGrid()}
          </div>

          <div className="border-t border-rp-line pt-3">
            {renderSubmitButton({ size: 'md', fullWidth: true })}
          </div>
        </Card>
      </div>

      {/* Mobile Question Grid Drawer */}
      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="bottom"
        title={tr('Bảng câu hỏi')}
      >
        <div className="space-y-4 pb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-rp-text-2">
            <span>{tr('Đã trả lời')} {answeredCount}/{total}</span>
            {clockLabel != null && (
              <Badge tone={isUrgent ? 'danger' : 'brand'} icon={Clock} size="sm" className="tabular-nums">
                {clockLabel}
              </Badge>
            )}
          </div>
          {renderQuestionGrid({ compact: true })}
          <div className="pt-2">
            {renderSubmitButton({ size: 'md', fullWidth: true })}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
