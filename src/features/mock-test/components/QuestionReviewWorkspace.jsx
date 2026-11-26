import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Minus,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ContextualErrorState,
  Drawer,
  EmptyState,
  RichQuestionText,
  Skeleton,
  Tabs,
  cx,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { formatAnswerKey } from '@/features/mock-test/utils/practiceStatusHelpers.js';

function isQuestionAnswered(question) {
  if (typeof question?.isAnswered === 'boolean') return question.isAnswered;
  if (question?.selectedOptionId != null) return true;
  if (question?.response != null) {
    if (Array.isArray(question.response)) return question.response.length > 0;
    if (typeof question.response === 'object') return Object.keys(question.response).length > 0;
    return String(question.response).trim().length > 0;
  }
  return false;
}

function resolveUserSelectedIds(question) {
  const ids = new Set();
  if (question?.selectedOptionId != null) ids.add(Number(question.selectedOptionId));
  const resp = question?.response;
  if (Array.isArray(resp)) {
    for (const v of resp) {
      if (v != null && Number.isFinite(Number(v))) ids.add(Number(v));
    }
  } else if (resp && typeof resp === 'object' && Array.isArray(resp.selectedOptionIds)) {
    for (const v of resp.selectedOptionIds) {
      if (v != null && Number.isFinite(Number(v))) ids.add(Number(v));
    }
  }
  return ids;
}

function questionStatusMeta(question) {
  if (question?.isCorrect) {
    return { key: 'correct', label: 'Đúng', tone: 'success', Icon: CheckCircle2 };
  }
  if (!isQuestionAnswered(question)) {
    return { key: 'blank', label: 'Bỏ trống', tone: 'neutral', Icon: Minus };
  }
  return { key: 'wrong', label: 'Sai', tone: 'danger', Icon: XCircle };
}

function ReviewNavigatorGrid({ items, activeQuestionId, onSelect, tr }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const q = item.question;
        const status = item.status;
        const isCurrent = q.questionId === activeQuestionId;
        const btnStyle = status.key === 'correct'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          : status.key === 'wrong'
            ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
            : 'border-rp-line bg-rp-bg-2 text-rp-text-muted hover:bg-rp-muted';

        return (
          <button
            key={q.questionId}
            type="button"
            onClick={() => onSelect(q.questionId)}
            data-testid={`review-nav-q-${item.number}`}
            aria-label={`${tr('Câu')} ${item.number}: ${tr(status.label)}`}
            aria-current={isCurrent ? 'step' : undefined}
            title={`${tr('Câu')} ${item.number} · ${tr(status.label)}`}
            className={cx(
              'rp-focus rp-press relative flex h-9 items-center justify-center gap-0.5 rounded-lg border text-xs font-bold tabular-nums transition-all',
              btnStyle,
              isCurrent && 'ring-2 ring-rp-brand-strong ring-offset-1',
            )}
          >
            <span>{item.number}</span>
            <status.Icon aria-hidden="true" className="h-3 w-3 shrink-0 opacity-85" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Interactive Two-Column Question Review Workspace:
 * - Left Sidebar: Optional ResultScoreSummaryCard slot (`sidebarHeader`) directly above compact Question Navigator
 *   with integrated filter chips (Tất cả, Đúng, Sai, Bỏ trống) and adaptive 4–5 col scrollable grid.
 * - Right Column: Single focused Question Detail aligned at the exact top Y with `sidebarHeader`, preserving
 *   Kanji/Furigana, shared passages, audio/transcript, answer states, explanation, and Prev/Next navigation.
 * - Tablet/Mobile: Renders `sidebarHeader` compactly above Question Content + collapsible Navigator Drawer.
 */
export default function QuestionReviewWorkspace({
  questions = [],
  loading = false,
  error = null,
  onRetry,
  retrying = false,
  initialFilter = 'all',
  sidebarHeader = null,
}) {
  const { tr, trf } = useLocale();
  const [filter, setFilter] = useState(initialFilter);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const annotated = useMemo(
    () =>
      (Array.isArray(questions) ? questions : []).map((q, idx) => ({
        question: q,
        number: idx + 1,
        status: questionStatusMeta(q),
      })),
    [questions],
  );

  const counts = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    for (const item of annotated) {
      if (item.status.key === 'correct') correct += 1;
      else if (item.status.key === 'wrong') wrong += 1;
      else blank += 1;
    }
    return { all: annotated.length, correct, wrong, blank };
  }, [annotated]);

  const visibleItems = useMemo(() => {
    if (filter === 'all') return annotated;
    return annotated.filter((item) => item.status.key === filter);
  }, [annotated, filter]);

  // Always keep active question strictly synchronized with current filter set
  const activeItem = useMemo(() => {
    if (visibleItems.length === 0) return null;
    const found = visibleItems.find((item) => item.question.questionId === selectedQuestionId);
    return found ?? visibleItems[0];
  }, [visibleItems, selectedQuestionId]);

  const activeVisibleIndex = activeItem
    ? visibleItems.findIndex((item) => item.question.questionId === activeItem.question.questionId)
    : -1;

  function goPrev() {
    if (activeVisibleIndex > 0) {
      setSelectedQuestionId(visibleItems[activeVisibleIndex - 1].question.questionId);
    }
  }

  function goNext() {
    if (activeVisibleIndex >= 0 && activeVisibleIndex < visibleItems.length - 1) {
      setSelectedQuestionId(visibleItems[activeVisibleIndex + 1].question.questionId);
    }
  }

  // Keyboard ArrowLeft / ArrowRight support when not interacting with form or media controls
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'audio') return;
      if (event.key === 'ArrowLeft' && activeVisibleIndex > 0) {
        setSelectedQuestionId(visibleItems[activeVisibleIndex - 1].question.questionId);
      } else if (event.key === 'ArrowRight' && activeVisibleIndex >= 0 && activeVisibleIndex < visibleItems.length - 1) {
        setSelectedQuestionId(visibleItems[activeVisibleIndex + 1].question.questionId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeVisibleIndex, visibleItems]);

  if (loading) {
    return (
      <div
        className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start"
        aria-label={tr('Đang tải câu hỏi xem lại')}
      >
        <div className="min-w-0 space-y-4">
          {sidebarHeader}
          <Skeleton className="hidden h-56 rounded-rp-card lg:block" />
        </div>
        <Skeleton className="h-80 rounded-rp-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx(sidebarHeader ? 'grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start' : '')}>
        {sidebarHeader && <div className="min-w-0">{sidebarHeader}</div>}
        <Card className="min-w-0">
          <ContextualErrorState
            error={error}
            title={tr('Chưa tải được phần xem lại bài làm')}
            onRetry={onRetry}
            retrying={retrying}
          />
        </Card>
      </div>
    );
  }

  if (annotated.length === 0) {
    return (
      <div className={cx(sidebarHeader ? 'grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start' : '')}>
        {sidebarHeader && <div className="min-w-0">{sidebarHeader}</div>}
        <Card className="min-w-0">
          <EmptyState
            illustration="book"
            title={tr('Chưa có dữ liệu câu hỏi để xem lại')}
            description={tr('Đáp án hoặc dữ liệu chi tiết của lượt làm bài này hiện chưa khả dụng.')}
          />
        </Card>
      </div>
    );
  }

  const filterTabs = [
    { value: 'all', label: `${tr('Tất cả')} (${counts.all})` },
    { value: 'correct', label: `${tr('Đúng')} (${counts.correct})` },
    { value: 'wrong', label: `${tr('Sai')} (${counts.wrong})` },
    { value: 'blank', label: `${tr('Bỏ trống')} (${counts.blank})` },
  ];

  const q = activeItem?.question ?? null;
  const qStatus = activeItem?.status ?? null;
  const selectedIds = q ? resolveUserSelectedIds(q) : new Set();
  const isBlank = qStatus?.key === 'blank';
  const answerKeyText = q ? formatAnswerKey(q.answerKey) : '';
  const resolvedPassageText = q
    ? (q.passageText || [q.interactionData?.passage, q.interactionData?.secondPassage]
      .filter((s) => typeof s === 'string' && s.trim())
      .join('\n\n---\n\n'))
    : '';

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setSelectedQuestionId(null);
  };

  return (
    <div className="space-y-4 pb-16 lg:pb-2" data-testid="question-review-workspace">
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start">
        {/* Left Sidebar: Score Summary directly above Question Navigator */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          {sidebarHeader}

          {/* Desktop Question Navigator Card with integrated filter chips */}
          <aside
            data-testid="question-navigator-card"
            className="hidden rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs lg:block"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-rp-text-muted">
                {tr('Danh sách câu hỏi')}
              </p>
              <span className="text-xs font-semibold tabular-nums text-rp-text-2">
                {visibleItems.length > 0 ? activeVisibleIndex + 1 : 0}/{visibleItems.length}
              </span>
            </div>

            {/* Integrated Compact Filter Chips */}
            <div
              role="tablist"
              aria-label={tr('Lọc câu hỏi')}
              className="mb-3 flex flex-wrap gap-1.5"
            >
              {filterTabs.map((tab) => {
                const isActive = filter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleFilterChange(tab.value)}
                    data-testid={`review-filter-${tab.value}`}
                    className={cx(
                      'rp-focus rounded-lg border px-2 py-1 text-[11px] font-semibold leading-4 whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong'
                        : 'border-rp-line bg-rp-bg-2/70 text-rp-text-2 hover:bg-rp-muted hover:text-rp-text',
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {visibleItems.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto pr-0.5">
                <ReviewNavigatorGrid
                  items={visibleItems}
                  activeQuestionId={q?.questionId}
                  onSelect={setSelectedQuestionId}
                  tr={tr}
                />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/40 px-3 py-4 text-center text-xs text-rp-text-muted">
                {tr('Không có câu hỏi phù hợp.')}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-rp-line/70 pt-2.5 text-[11px] text-rp-text-muted">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-emerald-600" />
                {tr('Đúng')}
              </span>
              <span className="inline-flex items-center gap-1">
                <XCircle aria-hidden="true" className="h-3 w-3 text-rose-600" />
                {tr('Sai')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Minus aria-hidden="true" className="h-3 w-3 text-rp-text-muted" />
                {tr('Bỏ trống')}
              </span>
            </div>
          </aside>
        </div>

        {/* Right Column: Question Review Content aligned cleanly from Y = 0 */}
        <div className="min-w-0 space-y-3">
          {/* Tablet / Mobile Compact Quick Navigator Bar + Drawer Button */}
          <div className="flex items-center gap-2 rounded-rp-card border border-rp-line bg-rp-surface px-3 py-2 shadow-rp-xs lg:hidden">
            {visibleItems.length > 0 ? (
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5" aria-label={tr('Chọn nhanh câu hỏi')}>
                {visibleItems.map((item) => {
                  const active = item.question.questionId === q?.questionId;
                  return (
                    <button
                      key={item.question.questionId}
                      type="button"
                      onClick={() => setSelectedQuestionId(item.question.questionId)}
                      className={cx(
                        'rp-focus inline-flex h-8 min-w-[2.25rem] shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-bold tabular-nums',
                        item.status.key === 'correct'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : item.status.key === 'wrong'
                            ? 'border-rose-300 bg-rose-50 text-rose-800'
                            : 'border-rp-line bg-rp-bg-2 text-rp-text-2',
                        active && 'ring-2 ring-rp-brand-strong',
                      )}
                    >
                      {item.number}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="min-w-0 flex-1 truncate text-xs text-rp-text-muted">
                {tr('Không có câu hỏi phù hợp.')}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={LayoutGrid}
              onClick={() => setDrawerOpen(true)}
              className="shrink-0"
            >
              {trf('Danh sách câu ({0})', { 0: visibleItems.length })}
            </Button>
          </div>

          {visibleItems.length === 0 || !q ? (
            <Card>
              <EmptyState
                illustration={filter === 'wrong' || filter === 'blank' ? 'done' : 'search'}
                size="sm"
                title={
                  filter === 'wrong'
                    ? tr('Không có câu trả lời sai')
                    : filter === 'blank'
                      ? tr('Không có câu bỏ trống')
                      : tr('Không có câu hỏi thuộc bộ lọc này')
                }
                description={tr('Chọn bộ lọc khác hoặc xem tất cả câu hỏi trong bài làm.')}
                action={
                  <Button variant="secondary" size="sm" onClick={() => handleFilterChange('all')}>
                    {tr('Xem tất cả câu hỏi')}
                  </Button>
                }
              />
            </Card>
          ) : (

            <Card className="space-y-4" data-testid="review-question-detail" data-translate-scope="allow">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line/70 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-rp-text">
                    {trf('Câu {0}/{1}', { 0: activeItem.number, 1: annotated.length })}
                  </span>
                  {(q.skillName || q.sectionTitle) && (
                    <Badge tone="brand" size="sm" icon={false}>
                      {tr(q.skillName || q.sectionTitle)}
                    </Badge>
                  )}
                  <Badge tone={qStatus.tone} size="sm" icon={false}>
                    {tr(qStatus.label)}
                  </Badge>
                </div>

                {filter !== 'all' && (
                  <span className="text-xs text-rp-text-muted tabular-nums">
                    {trf('Mục lọc {0}/{1}', { 0: activeVisibleIndex + 1, 1: visibleItems.length })}
                  </span>
                )}
              </div>

              {/* Shared Passage / Reading Group */}
              {resolvedPassageText && (
                <details open className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3.5 text-sm">
                  <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-rp-brand-strong">
                    <BookOpenText aria-hidden="true" className="h-4 w-4" />
                    <span>{q.passageTitle || tr('Đoạn văn ngữ cảnh')}</span>
                  </summary>
                  <RichQuestionText
                    as="div"
                    text={resolvedPassageText}
                    className="rp-jp mt-2 whitespace-pre-wrap text-[14px] leading-7 text-rp-text"
                  />
                </details>
              )}

              {/* Shared / Question Audio & Review Transcript */}
              {(q.audioUrl || q.reviewTranscript) && (
                <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2/60 p-3">
                  {q.audioUrl && (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rp-text-2">
                        <Volume2 aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                        {tr('Audio câu hỏi')}
                      </span>
                      <audio controls src={q.audioUrl} className="w-full" />
                    </div>
                  )}
                  {q.reviewTranscript && (
                    <details className="text-xs text-rp-text-2">
                      <summary className="cursor-pointer font-semibold text-rp-brand-strong">
                        {tr('Xem nội dung audio (Transcript)')}
                      </summary>
                      <RichQuestionText
                        as="p"
                        text={q.reviewTranscript}
                        className="rp-jp mt-1.5 whitespace-pre-wrap leading-6 text-rp-text"
                      />
                    </details>
                  )}
                </div>
              )}

              {/* Question Stem (safe HTML/<u>/ruby rendering) */}
              <div className="space-y-2.5">
                <RichQuestionText
                  as="div"
                  text={q.questionText}
                  className="rp-jp whitespace-pre-wrap text-[15.5px] font-semibold leading-7 text-rp-text"
                />
                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    alt={tr('Hình minh họa câu hỏi')}
                    className="max-h-72 max-w-full rounded-xl border border-rp-line/80"
                  />
                )}
              </div>

              {/* Blank Question Callout */}
              {isBlank && (
                <div className="flex items-center gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-xs font-medium text-rp-text-2">
                  <Minus aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
                  <span>{tr('Bạn chưa trả lời câu này.')}</span>
                </div>
              )}

              {/* Options List (Read-only) */}
              {Array.isArray(q.options) && q.options.length > 0 && (
                <ul className="space-y-2" aria-label={tr('Các phương án trả lời')}>
                  {q.options.map((opt, idx) => {
                    const isOptCorrect = Boolean(opt.isCorrect);
                    const isOptChosen = selectedIds.has(Number(opt.optionId));

                    let boxClass = 'border-rp-line bg-rp-surface text-rp-text-2';
                    let StatusIcon = null;
                    let statusTag = null;

                    if (isOptCorrect) {
                      boxClass = 'border-emerald-300 bg-emerald-50/75 text-emerald-950';
                      StatusIcon = <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-600" />;
                      statusTag = isOptChosen ? tr('Bạn chọn đúng') : tr('Đáp án đúng');
                    } else if (isOptChosen) {
                      boxClass = 'border-rose-300 bg-rose-50/75 text-rose-950';
                      StatusIcon = <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-600" />;
                      statusTag = tr('Bạn đã chọn');
                    }

                    return (
                      <li
                        key={opt.optionId ?? idx}
                        className={cx('flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm', boxClass)}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/25 text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <RichQuestionText as="span" text={opt.optionText} className="rp-jp whitespace-pre-wrap leading-6" />
                            {opt.imageUrl && (
                              <img
                                src={opt.imageUrl}
                                alt={trf('Hình đáp án {0}', { 0: idx + 1 })}
                                className="mt-1.5 max-h-40 max-w-full rounded-md"
                              />
                            )}
                          </div>
                        </div>

                        {(StatusIcon || statusTag) && (
                          <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                            {StatusIcon}
                            <span>{statusTag}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Structured Non-MCQ Answer Key (Ordering / FillBlank / Matching) */}
              {answerKeyText && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/75 px-3.5 py-2.5 text-sm text-emerald-950">
                  <span className="font-semibold">{tr('Đáp án đúng ·')}{' '}</span>
                  <RichQuestionText text={answerKeyText} />
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div className="rounded-xl border border-rp-brand-border/60 bg-rp-brand-tint/25 p-3.5 text-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.05em] text-rp-brand-strong">
                    {tr('Giải thích chi tiết')}
                  </p>
                  <RichQuestionText
                    as="div"
                    text={q.explanation}
                    className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-6 text-rp-text-2"
                  />
                </div>
              )}

              {/* Prev / Next Navigation Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-rp-line/70 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={activeVisibleIndex <= 0}
                  onClick={goPrev}
                  data-testid="review-prev-btn"
                >
                  {tr('Câu trước')}
                </Button>
                <span className="text-xs font-semibold tabular-nums text-rp-text-muted">
                  {trf('Câu {0}/{1}', { 0: activeVisibleIndex + 1, 1: visibleItems.length })}
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  iconRight={ChevronRight}
                  disabled={activeVisibleIndex < 0 || activeVisibleIndex >= visibleItems.length - 1}
                  onClick={goNext}
                  data-testid="review-next-btn"
                >
                  {tr('Câu tiếp theo')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Tablet/Mobile Question Navigator Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="right"
        size="sm"
        title={tr('Danh sách câu hỏi')}
      >
        <div className="space-y-4">
          <Tabs
            variant="pill"
            size="sm"
            value={filter}
            onChange={(nextFilter) => {
              setFilter(nextFilter);
              setSelectedQuestionId(null);
            }}
            tabs={filterTabs}
          />
          <ReviewNavigatorGrid
            items={visibleItems}
            activeQuestionId={q?.questionId}
            onSelect={(id) => {
              setSelectedQuestionId(id);
              setDrawerOpen(false);
            }}
            tr={tr}
          />
        </div>
      </Drawer>
    </div>
  );
}
