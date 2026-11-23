import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
  PenLine,
  Play,
  Repeat,
  RotateCcw,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import KanjiWritingCanvas from './KanjiWritingCanvas.jsx';
import KanjiStrokeStrip from './KanjiStrokeStrip.jsx';
import { getKanji, searchVocabulary } from '@/features/content-author/api/sharedBankApi.js';
import { bookmarkKanji, createNotebookList, getNotebookLists } from '@/features/notebook/api/notebookApi.js';
import SrsEnrollButton from '@/features/srs/components/SrsEnrollButton.jsx';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualErrorState,
  CustomSelect,
  EmptyState,
  Field,
  IconButton,
  Modal,
  ProgressBar,
  SakuraLoader,
  SegmentedControl,
  Tabs,
  cx,
  notify,
} from '@/components/ui';
import { currentIntlTag, translateTemplate, translateText, useLocale } from '@/locales/locale.js';

const QUIZ_FILLERS = ['mặt trời', 'nước', 'lửa', 'người', 'núi', 'cây', 'vàng', 'đất'];

function shuffleDeterministic(list, seed) {
  const copy = [...list];
  let state = Math.abs(seed) || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function buildQuickQuiz(item, catalog) {
  const others = catalog.filter((row) => row.kanjiId !== item.kanjiId);
  const meaning = item.meaning || item.sinoVietnamese;
  if (!meaning || others.length === 0) return null;

  const characterQuiz = item.kanjiId % 2 === 1 && others.length >= 1;
  if (characterQuiz) {
    const cards = shuffleDeterministic([item, ...shuffleDeterministic(others, item.kanjiId).slice(0, 3)], item.kanjiId + 1);
    return {
      prompt: item.meaning
        ? translateTemplate('Chữ nào nghĩa là “{0}”?', { 0: item.meaning })
        : translateTemplate('Chữ nào đọc là “{0}”?', { 0: item.sinoVietnamese }),
      options: cards.map((row) => ({ id: String(row.kanjiId), label: row.character, big: true })),
      answer: String(item.kanjiId),
      showCharacter: false,
    };
  }

  const pool = others.map((row) => row.meaning || row.sinoVietnamese).filter((v) => v && v !== meaning);
  const extras = QUIZ_FILLERS.filter((v) => v !== meaning && !pool.includes(v));
  const labels = shuffleDeterministic([meaning, ...pool, ...extras].filter(Boolean).slice(0, 4), item.kanjiId + 3);
  return {
    prompt: item.meaning ? translateText('Chữ này nghĩa là gì?') : translateText('Âm Hán Việt của chữ này là gì?'),
    options: labels.map((label) => ({ id: label, label, big: false })),
    answer: meaning,
    showCharacter: true,
  };
}

function speakOrPlayKanji({ audioUrl, character, kunYomi, onYomi }) {
  if (audioUrl && typeof Audio !== 'undefined') {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
    return;
  }
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const reading = String(kunYomi || onYomi || character || '').split(/[,、/\s]+/)[0];
  if (!reading) return;
  const utterance = new SpeechSynthesisUtterance(reading);
  utterance.lang = 'ja-JP';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function useCanvasSquareSize(ref, max = 280, min = 200) {
  const [size, setSize] = useState(Math.min(264, max));
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;
    const measure = () => {
      const width = Math.floor(el.clientWidth || max);
      if (width > 0) setSize(Math.max(min, Math.min(max, width)));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, min, max]);
  return size;
}

function KanjiPracticePane({
  item,
  strokeTotal,
  onSubmitWriting,
  submittingWriting,
  lastResult,
  saveError,
  onNext,
  hasNext,
  onCharDataUnavailable,
}) {
  const { tr, trf, locale } = useLocale();
  const boxRef = useRef(null);
  const writerRef = useRef(null);
  const squareSize = useCanvasSquareSize(boxRef, 248, 196);
  const [writeMode, setWriteMode] = useState('guided');
  const [outline, setOutline] = useState(true);
  const [guideOnce, setGuideOnce] = useState(() => Boolean(item.isNew));
  const [attempt, setAttempt] = useState(0);
  const [strokeCountResolved, setStrokeCountResolved] = useState(strokeTotal || item.strokeCount || 1);
  const [charDataFailed, setCharDataFailed] = useState(false);
  const [progress, setProgress] = useState({ done: 0, mistakes: 0, event: null });
  const [completed, setCompleted] = useState(null);

  const effectiveTotal = Math.max(1, strokeCountResolved || item.strokeCount || 1);

  const switchMode = (nextMode) => {
    setWriteMode(nextMode);
    setOutline(nextMode === 'guided');
    setGuideOnce(false);
    setAttempt((n) => n + 1);
    setProgress({ done: 0, mistakes: 0, event: null });
    setCompleted(null);
  };

  const restart = (withGuide = false) => {
    setGuideOnce(withGuide);
    setAttempt((n) => n + 1);
    setProgress({ done: 0, mistakes: 0, event: null });
    setCompleted(null);
  };

  const hint = () => {
    const writer = writerRef.current;
    if (!writer || completed || charDataFailed) return;
    writer.highlightStroke(progress.done);
  };

  const handleComplete = async (mistakes) => {
    setCompleted({ mistakes });
    await onSubmitWriting?.({
      item,
      totalMistakes: mistakes,
      practiceMode: writeMode,
    });
  };

  const event = progress.event;
  let feedback;
  if (completed) {
    feedback = {
      tone: 'success',
      icon: CheckCircle2,
      text:
        completed.mistakes === 0
          ? tr('Hoàn thành, không sai nét nào!')
          : trf('Hoàn thành với {0} lần viết chưa đúng.', { 0: completed.mistakes }),
    };
  } else if (event?.type === 'mistake') {
    feedback = {
      tone: 'warn',
      icon: TriangleAlert,
      text: event.backwards
        ? tr('Ngược chiều nét. Hãy thử lại.')
        : tr('Nét chưa đúng. Hãy thử lại.'),
    };
  } else if (event?.type === 'correct') {
    feedback = {
      tone: 'ok',
      icon: CheckCircle2,
      text: trf('Tốt lắm! Nét {0}/{1}', { 0: event.stroke, 1: effectiveTotal }),
    };
  } else {
    feedback = {
      tone: 'idle',
      icon: PenLine,
      text: trf('Nét {0}/{1}', { 0: Math.min(progress.done + 1, effectiveTotal), 1: effectiveTotal }),
    };
  }

  const syncedResult = lastResult?.kanjiId === item.kanjiId ? lastResult : null;
  const nextReview = syncedResult?.nextReviewDate ? new Date(syncedResult.nextReviewDate) : null;
  const FeedbackIcon = feedback.icon;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label={tr('Chế độ luyện viết')}
          value={writeMode}
          onChange={switchMode}
          options={[
            { value: 'guided', label: 'Hướng dẫn nét' },
            { value: 'free', label: 'Tự viết' },
          ]}
        />
        <span className="text-xs font-medium text-rp-text-muted">
          {progress.done}/{effectiveTotal} {tr('nét')}
        </span>
      </div>

      {charDataFailed ? (
        <Banner tone="warning" title={tr('Chưa có dữ liệu mô phỏng nét')}>
          {tr('Chưa thể mở bảng luyện viết tương tác cho chữ này (chữ chưa có dữ liệu nét hoặc ngoại tuyến). Bạn vẫn có thể xem nghĩa, âm đọc và làm kiểm tra nhanh.')}
        </Banner>
      ) : (
        <>
          <div ref={boxRef} className="mx-auto w-full max-w-[248px]">
            <KanjiWritingCanvas
              key={`${item.kanjiId}-${writeMode}-${attempt}-${squareSize}-${guideOnce ? 'demo' : 'quiz'}`}
              character={item.character}
              isNew={item.isNew}
              mode={writeMode}
              guideFirst={guideOnce}
              showCharacter={false}
              outline={outline}
              size={squareSize}
              guides
              ariaLabel={trf('Ô luyện viết chữ {0}', { 0: item.character })}
              className="mx-auto shadow-rp-xs"
              quizOptions={{ showHintAfterMisses: 2, leniency: 1.15 }}
              onLoadCharDataSuccess={(data) => {
                setCharDataFailed(false);
                if (Array.isArray(data?.strokes) && data.strokes.length > 0) {
                  setStrokeCountResolved(data.strokes.length);
                }
              }}
              onLoadCharDataError={() => {
                setCharDataFailed(true);
                onCharDataUnavailable?.();
              }}
              onReady={(writer) => {
                writerRef.current = writer;
              }}
              onCorrectStroke={(strokeNum, data) => {
                setProgress({
                  done: strokeNum + 1,
                  mistakes: data?.totalMistakes ?? 0,
                  event: { type: 'correct', stroke: strokeNum + 1 },
                });
              }}
              onMistake={(data) => {
                setProgress((prev) => ({
                  ...prev,
                  mistakes: data.totalMistakes,
                  event: {
                    type: 'mistake',
                    stroke: data.strokeNum + 1,
                    backwards: data.isBackwards,
                  },
                }));
              }}
              onComplete={handleComplete}
            />
          </div>

          <ProgressBar
            value={progress.done}
            max={effectiveTotal}
            tone={completed ? 'success' : 'brand'}
            size="sm"
            label={tr('Tiến độ các nét')}
          />

          <div
            role="status"
            className={cx(
              'flex items-start gap-2.5 rounded-rp-input border px-3.5 py-2.5 text-[13px] leading-5',
              feedback.tone === 'success' && 'border-rp-success-line bg-rp-success-bg text-rp-success',
              feedback.tone === 'warn' && 'border-rp-warning-line bg-rp-warning-bg text-rp-warning',
              feedback.tone === 'ok' && 'border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong',
              feedback.tone === 'idle' && 'border-rp-line bg-rp-bg-2 text-rp-text-2',
            )}
          >
            <FeedbackIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{feedback.text}</span>
          </div>

          <div role="toolbar" aria-label={tr('Công cụ luyện viết')} className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOutline((v) => !v)}
              aria-pressed={outline}
              icon={outline ? EyeOff : Eye}
            >
              {outline ? tr('Ẩn mẫu') : tr('Hiện mẫu')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={Boolean(completed)}
              onClick={hint}
              icon={Lightbulb}
            >
              {tr('Gợi ý')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => restart(false)} icon={RotateCcw}>
              {tr('Viết lại')}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => restart(true)} icon={Play}>
              {tr('Xem mẫu')}
            </Button>
          </div>

          {submittingWriting && (
            <SakuraLoader variant="inline" size={16} context="writing" label={tr('Đang lưu kết quả luyện viết…')} delay={160} />
          )}

          {completed && !submittingWriting && syncedResult && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-rp-input border border-rp-success-line bg-rp-success-bg px-3.5 py-2.5 text-xs text-rp-success">
              <div className="space-y-0.5">
                <p className="font-semibold">
                  {trf('Điểm: {0}/100', { 0: syncedResult.score })}
                  {nextReview && !Number.isNaN(nextReview.getTime())
                    ? ` · ${trf('Đã lưu. Lần ôn kế: {0}', {
                        0: nextReview.toLocaleDateString(currentIntlTag(locale)),
                      })}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="soft" size="sm" onClick={() => restart(false)}>
                  {tr('Luyện lại')}
                </Button>
                {hasNext && (
                  <Button type="button" variant="primary" size="sm" onClick={onNext} iconRight={ChevronRight}>
                    {tr('Chữ tiếp theo')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {saveError && (
            <ContextualErrorState
              variant="inline"
              compact
              error={saveError}
              title={tr('Chưa lưu được tiến độ luyện viết')}
            />
          )}
        </>
      )}
    </div>
  );
}

function KanjiQuickQuizPane({ item, libraryItems, onOpenPractice }) {
  const { tr, trf } = useLocale();
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);

  const quiz = useMemo(() => buildQuickQuiz(item, libraryItems), [item, libraryItems]);

  if (!quiz) {
    return (
      <EmptyState
        variant="inline"
        title={tr('Chưa đủ dữ liệu để tạo câu kiểm tra nhanh')}
        description={tr('Hãy mở tab Chi tiết hoặc Luyện viết để tiếp tục học chữ này.')}
        action={
          <Button variant="soft" size="sm" onClick={onOpenPractice}>
            {tr('Luyện viết')}
          </Button>
        }
      />
    );
  }

  const isCorrect = checked && picked === quiz.answer;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-bold text-rp-text">{quiz.prompt}</p>
        {quiz.showCharacter && (
          <p lang="ja" className="rp-kanji mt-3 text-center text-[64px] leading-none text-rp-text">
            {item.character}
          </p>
        )}
      </div>

      <div className={`grid gap-2.5 ${quiz.options.some((opt) => opt.big) ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {quiz.options.map((opt) => {
          const selected = picked === opt.id;
          const showCorrect = checked && opt.id === quiz.answer;
          const showWrong = checked && selected && !showCorrect;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={checked}
              onClick={() => setPicked(opt.id)}
              className={cx(
                'rp-focus rounded-rp-input border-2 px-4 py-3 text-left font-semibold transition-colors',
                opt.big ? 'rp-kanji grid h-20 place-items-center text-[34px]' : 'text-sm',
                showCorrect && 'border-rp-success bg-rp-success-bg text-rp-success',
                showWrong && 'border-rp-danger bg-rp-danger-bg text-rp-danger',
                !checked && selected && 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong',
                !checked && !selected && 'border-rp-line bg-rp-surface text-rp-text hover:border-rp-brand-border',
                checked && !showCorrect && !showWrong && 'border-rp-line bg-rp-bg-2 text-rp-text-muted opacity-70',
              )}
              lang={opt.big ? 'ja' : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {checked && (
        <Banner tone={isCorrect ? 'success' : 'danger'} title={isCorrect ? tr('Chính xác') : tr('Chưa đúng')}>
          {!isCorrect && (
            <p className="text-xs">
              {quiz.showCharacter
                ? trf('Nghĩa đúng: {0}', { 0: quiz.answer })
                : trf('Chữ đúng là {0}.', { 0: item.character })}
            </p>
          )}
        </Banner>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {checked ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPicked(null);
              setChecked(false);
            }}
          >
            {tr('Làm lại')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            disabled={!picked}
            onClick={() => setChecked(true)}
          >
            {tr('Kiểm tra')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function KanjiDetailStudio({
  item,
  libraryItems = [],
  tab = 'learn',
  onTabChange,
  signedIn = false,
  onSubmitWriting,
  submittingWriting = false,
  lastResult = null,
  saveError = null,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  inDrawer = false,
}) {
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [strokeCountFromData, setStrokeCountFromData] = useState(null);
  const [demoAttempt, setDemoAttempt] = useState(0);
  const [demoFailed, setDemoFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');

  const detailQuery = useQuery({
    queryKey: ['kanji-detail', item.kanjiId],
    queryFn: () => getKanji(item.kanjiId),
    enabled: item.kanjiId > 0,
    staleTime: 5 * 60 * 1000,
  });

  const vocabQuery = useQuery({
    queryKey: ['kanji-vocab', item.character],
    queryFn: () => searchVocabulary(item.character),
    enabled: Boolean(item.character),
    staleTime: 5 * 60 * 1000,
  });

  const listsQuery = useQuery({
    queryKey: ['notebook-lists', signedIn ? 'user' : 'anon'],
    queryFn: getNotebookLists,
    enabled: signedIn && pickerOpen,
  });

  const saveBookmark = useMutation({
    mutationFn: async (chosenListId) => {
      let learnerNoteId = chosenListId ? Number(chosenListId) : 0;
      if (!learnerNoteId) {
        const lists = await getNotebookLists();
        if (lists.length > 1) {
          return { needsPicker: true, lists };
        }
        learnerNoteId = lists[0]?.id || (await createNotebookList({ name: 'Hán tự' }))?.id;
      }
      const res = await bookmarkKanji({ learnerNoteId, kanjiId: item.kanjiId });
      return { res };
    },
    onSuccess: (payload) => {
      if (payload?.needsPicker) {
        setSelectedListId(String(payload.lists[0]?.id || ''));
        setPickerOpen(true);
        return;
      }
      setPickerOpen(false);
      const res = payload?.res;
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Chữ này đã có trong sổ tay'), '', { key: 'kanji-bm-dup' });
      } else {
        notify.success(tr('Đã lưu vào sổ tay'), tr('Chữ Hán tự đã được thêm vào Sổ tay của bạn.'), {
          key: 'kanji-bm-ok',
          action: { label: tr('Mở sổ tay'), onClick: () => navigate('/kanji-notebook/') },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['notebook-lists'] });
      queryClient.invalidateQueries({ queryKey: ['notebook-tree'] });
      queryClient.invalidateQueries({ queryKey: ['notebook-saved-items'] });
    },
    onError: (err) => {
      const code = err?.data?.errorCode || err?.errorCode;
      notify.apiError(
        err,
        tr('Chưa lưu được chữ này'),
        code === 'SELF_STUDY_PACKAGE_REQUIRED' || err?.status === 403
          ? {
              action: {
                label: tr('Xem gói tự học'),
                onClick: () =>
                  navigate('/plans/', {
                    state: { from: { pathname: '/kanji-writing/' }, requiredFeatureLabel: tr('Sổ tay Hán tự') },
                  }),
              },
            }
          : undefined,
      );
    },
  });

  const detail = detailQuery.data;
  const resolved = {
    character: item.character,
    meaning: item.meaning || detail?.meaning || '',
    sinoVietnamese: item.sinoVietnamese || detail?.sinoVietnamese || '',
    onYomi: item.onYomi || detail?.onYomi || '',
    kunYomi: item.kunYomi || detail?.kunYomi || '',
    strokeCount: strokeCountFromData || item.strokeCount || detail?.strokeCount || 0,
    audioUrl: item.audioUrl || detail?.audioUrl || null,
    jlptLevels: item.jlptLevels?.length ? item.jlptLevels : detail?.jlptLevelName ? [detail.jlptLevelName] : [],
  };

  const examples = (vocabQuery.data?.items || [])
    .filter((row) => row.word?.includes(item.character) && row.word !== item.character)
    .slice(0, 6);

  const notebookLists = listsQuery.data || [];

  const body = (
    <div className="space-y-5">
      {/* Header identity */}
      <div className="flex items-start gap-4">
        <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-rp-card border border-rp-brand-border bg-rp-brand-tint/45 shadow-rp-xs">
          <span lang="ja" className="rp-kanji text-[48px] font-semibold leading-none text-rp-text">
            {resolved.character}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {resolved.jlptLevels.map((lvl) => (
              <Badge key={lvl} tone="brand" icon={false} size="sm">
                {lvl}
              </Badge>
            ))}
            <Badge tone="neutral" icon={false} size="sm">
              {resolved.strokeCount || '?'} {tr('nét')}
            </Badge>
            {item.writingScore != null && (
              <Badge tone={item.mastered ? 'success' : 'brand'} size="sm">
                {trf('Đã luyện · {0}%', { 0: item.writingScore })}
              </Badge>
            )}
            {item.isDueForWriting && (
              <Badge tone="warning" size="sm">
                {tr('Cần ôn viết')}
              </Badge>
            )}
          </div>

          <h2 className="mt-2 text-lg font-bold leading-snug text-rp-text">
            {resolved.meaning || tr('Chưa có nghĩa')}
          </h2>
          {resolved.sinoVietnamese && (
            <p className="mt-0.5 text-sm font-semibold text-rp-brand-strong">
              {tr('Hán Việt')}: {resolved.sinoVietnamese}
            </p>
          )}
        </div>
      </div>

      {/* Quick utility row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-rp-line py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Volume2}
            onClick={() => speakOrPlayKanji(resolved)}
          >
            {tr('Phát âm')}
          </Button>
          {signedIn && (
            <>
              <SrsEnrollButton
                kanjiId={item.kanjiId}
                cardType="Kanji"
                sourceType="KanjiBank"
                sourceId={item.kanjiId}
                sourceLabel={resolved.character}
                frontText={resolved.character}
                backText={resolved.meaning || resolved.sinoVietnamese}
                reading={[resolved.kunYomi, resolved.onYomi].filter(Boolean).join(' · ')}
                meaning={resolved.meaning || resolved.sinoVietnamese}
                jlptLevel={resolved.jlptLevels?.[0]}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Bookmark}
                loading={saveBookmark.isPending}
                onClick={() => saveBookmark.mutate('')}
              >
                {tr('Lưu vào Sổ tay')}
              </Button>
            </>
          )}
        </div>
        {(hasPrev || hasNext) && (
          <div className="flex items-center gap-1">
            <IconButton
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={onPrev}
              label={tr('Chữ trước')}
              icon={ChevronLeft}
            />
            <IconButton
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={onNext}
              label={tr('Chữ tiếp theo')}
              icon={ChevronRight}
            />
          </div>
        )}
      </div>

      {/* Mode switcher */}
      <Tabs
        variant="pill"
        label={tr('Chế độ học Hán tự')}
        value={tab}
        onChange={onTabChange}
        tabs={[
          { value: 'learn', label: 'Chi tiết & Ghi nhớ' },
          { value: 'write', label: 'Luyện viết' },
          { value: 'quiz', label: 'Kiểm tra' },
        ]}
      />

      {tab === 'learn' && (
        <div className="space-y-5">
          {/* Readings & Stroke Count */}
          <dl className="grid grid-cols-2 gap-2.5">
            <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-brand-strong">
                {tr('Hán Việt')}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rp-text">{resolved.sinoVietnamese || '—'}</dd>
            </div>
            <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-brand-strong">
                {tr('Số nét')}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rp-text">
                {resolved.strokeCount ? `${resolved.strokeCount} ${tr('nét')}` : '—'}
              </dd>
            </div>
            <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-brand-strong">
                {tr('Onyomi')}
              </dt>
              <dd lang="ja" className="mt-1 text-sm text-rp-text">{resolved.onYomi || '—'}</dd>
            </div>
            <div className="rounded-rp-input border border-rp-line bg-rp-bg-2 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-brand-strong">
                {tr('Kunyomi')}
              </dt>
              <dd lang="ja" className="mt-1 text-sm text-rp-text">{resolved.kunYomi || '—'}</dd>
            </div>
          </dl>

          {/* Animated preview + stroke steps */}
          <section aria-labelledby={`stroke-sec-${item.kanjiId}`} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`stroke-sec-${item.kanjiId}`} className="text-sm font-bold text-rp-text">
                {tr('Thứ tự viết từng nét')}
              </h3>
              <div className="flex items-center gap-2">
                {!demoFailed && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    icon={Play}
                    onClick={() => setDemoAttempt((n) => n + 1)}
                  >
                    {tr('Xem nét viết')}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={PenLine}
                  onClick={() => onTabChange?.('write')}
                >
                  {tr('Luyện viết')}
                </Button>
              </div>
            </div>

            {!demoFailed && (
              <div className="flex justify-center rounded-rp-card border border-rp-line bg-rp-bg-2 p-3">
                <KanjiWritingCanvas
                  key={`${item.kanjiId}-learn-demo-${demoAttempt}`}
                  character={item.character}
                  mode="guided"
                  demo
                  outline
                  guides
                  showCharacter={false}
                  size={156}
                  ariaLabel={trf('Minh họa thứ tự nét chữ {0}', { 0: item.character })}
                  onLoadCharDataSuccess={() => setDemoFailed(false)}
                  onLoadCharDataError={() => setDemoFailed(true)}
                />
              </div>
            )}

            <KanjiStrokeStrip
              character={item.character}
              onLoaded={(count) => setStrokeCountFromData(count)}
            />
          </section>

          {/* Example words */}
          <section aria-labelledby={`vocab-sec-${item.kanjiId}`} className="space-y-2.5 border-t border-rp-line pt-4">
            <h3 id={`vocab-sec-${item.kanjiId}`} className="text-sm font-bold text-rp-text">
              {tr('Từ vựng ví dụ')}
            </h3>
            {vocabQuery.isPending && examples.length === 0 && (
              <SakuraLoader variant="inline" size={16} context="vocabulary" label={tr('Đang tìm từ có chữ này…')} delay={160} />
            )}
            {vocabQuery.isError && (
              <ContextualErrorState
                variant="inline"
                compact
                error={vocabQuery.error}
                title={tr('Chưa tải được từ ví dụ')}
                onRetry={() => vocabQuery.refetch()}
                retrying={vocabQuery.isFetching}
              />
            )}
            {!vocabQuery.isPending && !vocabQuery.isError && examples.length === 0 && (
              <p className="rounded-rp-input border border-dashed border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-[13px] text-rp-text-muted">
                {tr('Chưa có từ ví dụ cho chữ này trong kho từ vựng.')}
              </p>
            )}
            {examples.length > 0 && (
              <ul className="space-y-2">
                {examples.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={`/vocabulary-detail/?id=${row.id}`}
                      className="rp-focus block rounded-rp-input border border-rp-line bg-rp-surface px-3.5 py-2.5 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/30"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span lang="ja" className="rp-kanji text-base font-semibold text-rp-text">{row.word}</span>
                          {row.reading && <span lang="ja" className="text-xs text-rp-text-muted">{row.reading}</span>}
                        </div>
                        {row.jlptLevelName && (
                          <Badge tone="neutral" icon={false} size="sm">{row.jlptLevelName}</Badge>
                        )}
                      </div>
                      {row.meaning && <p className="mt-1 text-[13px] text-rp-text-2">{row.meaning}</p>}
                      {row.exampleSentence && <p lang="ja" className="mt-1 text-xs text-rp-text-muted">{row.exampleSentence}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Subtle SRS boundary link */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-rp-input border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-xs text-rp-text-2">
            <span className="flex items-center gap-1.5">
              <Repeat aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
              {tr('Ôn tập theo lịch lặp lại ngắt quãng nằm tại Ôn tập SRS.')}
            </span>
            <Link to="/daily-srs/" className="rp-link inline-flex items-center gap-1 font-semibold">
              {tr('Mở Ôn tập SRS')}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {tab === 'write' && (
        <KanjiPracticePane
          key={`write-${item.kanjiId}`}
          item={item}
          strokeTotal={resolved.strokeCount}
          onSubmitWriting={onSubmitWriting}
          submittingWriting={submittingWriting}
          lastResult={lastResult}
          saveError={saveError}
          onNext={onNext}
          hasNext={hasNext}
        />
      )}

      {tab === 'quiz' && (
        <KanjiQuickQuizPane
          key={`quiz-${item.kanjiId}`}
          item={item}
          libraryItems={libraryItems}
          onOpenPractice={() => onTabChange?.('write')}
        />
      )}

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Chọn sổ tay để lưu Hán tự"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              {tr('Hủy')}
            </Button>
            <Button
              variant="primary"
              loading={saveBookmark.isPending}
              disabled={!selectedListId}
              onClick={() => saveBookmark.mutate(selectedListId)}
            >
              {tr('Lưu vào sổ tay')}
            </Button>
          </div>
        }
      >
        <Field label="Sổ tay cá nhân">
          <CustomSelect
            value={selectedListId}
            onChange={(val) => setSelectedListId(String(val))}
            options={notebookLists.map((list) => ({ value: String(list.id), label: list.name }))}
          />
        </Field>
      </Modal>
    </div>
  );

  if (inDrawer) return body;

  return (
    <Card density="comfortable" className="border-rp-line shadow-rp-sm">
      {body}
    </Card>
  );
}
