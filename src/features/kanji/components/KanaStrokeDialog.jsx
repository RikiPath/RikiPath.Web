import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lightbulb, PenLine, PlayCircle, RotateCcw, TriangleAlert, Undo2 } from 'lucide-react';
import kanaStrokes from '@/data/kanaStrokes.json';
import { Modal, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import KanaAudioButton from './KanaAudioButton.jsx';
import KanjiWritingCanvas from './KanjiWritingCanvas.jsx';
import { hasKanaStrokeData, loadKanaCharData } from '../utils/kanaCharData.js';

const emptyStrokes = [];
const BRAND = '#B52F55';
const KANA_FONT = { fontFamily: '"Yu Gothic", "Hiragino Sans", sans-serif' };

/* ------------------------------------------------------------------ Mode A — stroke guide */

function StrokeGuide({ item, strokes, onStartPractice }) {
  const { tr, trf } = useLocale();
  const paths = useRef([]);
  const [playback, setPlayback] = useState({ index: 0, all: true, run: 0 });
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let animation;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const frame = requestAnimationFrame(async () => {
      setPlaying(true);
      for (let index = 0; index < paths.current.length; index++) {
        const path = paths.current[index];
        if (!path) continue;
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = index < playback.index ? '0' : `${length}`;
      }
      for (let index = playback.index; index < strokes.length; index++) {
        if (cancelled) return;
        setCurrent(index);
        const path = paths.current[index];
        if (!path) continue;
        animation = path.animate(
          [{ strokeDashoffset: path.getTotalLength() }, { strokeDashoffset: 0 }],
          { duration: reduced ? 1 : 900, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
        );
        try { await animation.finished; } catch { return; }
        if (cancelled) return;
        path.style.strokeDashoffset = '0';
        animation.cancel();
        if (!playback.all) break;
      }
      if (!cancelled) setPlaying(false);
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); animation?.cancel(); };
  }, [playback, strokes]);

  const play = (index = 0, all = true) => setPlayback((previous) => ({ index, all, run: previous.run + 1 }));

  if (!strokes.length) {
    return <p className="rounded-2xl bg-rp-bg-2 p-4 text-sm text-rp-text-2">{tr('Chưa có dữ liệu hướng dẫn nét cho ký tự này.')}</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] sm:items-start">
      <div>
        <div className="mx-auto max-w-[320px] overflow-hidden rounded-[24px] border border-rp-line bg-[#FFFCFA] shadow-rp-xs">
          <svg viewBox="0 0 109 109" role="img" aria-label={trf('Hướng dẫn {0} nét của chữ {1}', { 0: strokes.length, 1: item.character })} className="block aspect-square w-full">
            <path d="M54.5 0V109 M0 54.5H109 M0 0L109 109 M109 0L0 109" fill="none" stroke="#eadfd9" strokeWidth="0.35" strokeDasharray="2 2" />
            <g fill="none" stroke="#f1e6e9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">{strokes.map((d, index) => <path key={index} d={d} />)}</g>
            <g fill="none" stroke={BRAND} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              {strokes.map((d, index) => (
                <path key={index} ref={(element) => { paths.current[index] = element; }} d={d} style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }} />
              ))}
            </g>
            {strokes.map((d, index) => {
              const point = d.match(/^M\s*([\d.-]+)[,\s]+([\d.-]+)/);
              return point ? (
                <g key={index}>
                  <circle cx={Number(point[1]) - 5} cy={Number(point[2]) - 5} r="4" fill={current === index ? BRAND : '#fff'} stroke={BRAND} strokeWidth="0.4" />
                  <text x={Number(point[1]) - 5} y={Number(point[2]) - 3.5} textAnchor="middle" fontSize="4.5" fill={current === index ? '#fff' : BRAND}>{index + 1}</text>
                </g>
              ) : null;
            })}
          </svg>
        </div>
        <p role="status" className="mt-3 text-center text-sm font-semibold text-rp-brand-strong">
          {playing
            ? trf('Đang viết nét {0} / {1}', { 0: current + 1, 1: strokes.length })
            : playback.all ? trf('Hoàn thành {0} nét', { 0: strokes.length }) : trf('Nét {0} / {1}', { 0: current + 1, 1: strokes.length })}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => play()} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border border-rp-line bg-white px-3.5 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
            <PlayCircle aria-hidden="true" className="h-4 w-4 text-tone-reading" /> {tr('Xem lại toàn bộ')}
          </button>
          <KanaAudioButton audioUrl={item.audioUrl} character={item.character} />
        </div>
        <p className="mt-4 text-[13px] font-semibold text-rp-text-2">{tr('Chọn một nét để xem riêng:')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {strokes.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => play(index, false)}
              aria-pressed={current === index}
              className={cx('rp-focus h-9 rounded-xl border px-3 text-sm transition-colors', current === index ? 'border-rp-brand-strong bg-rp-brand-tint font-semibold text-rp-brand-strong' : 'border-rp-line text-rp-text-2 hover:border-rp-brand-border')}
            >
              {trf('Nét {0}', { 0: index + 1 })}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-rp-text-muted">{tr('Theo dõi nét hồng và số thứ tự để biết điểm bắt đầu, hướng đi và thứ tự viết.')}</p>
        <button
          type="button"
          onClick={onStartPractice}
          disabled={!hasKanaStrokeData(item.character)}
          className="rp-focus rp-press mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-[15px] font-semibold text-white shadow-rp-brand transition-colors hover:bg-rp-brand-strong disabled:opacity-50 sm:w-auto"
        >
          <PenLine aria-hidden="true" className="h-4 w-4" /> {tr('Bắt đầu luyện viết')}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Mode B — writing practice */

function useSquareSize(ref, { min = 220, max = 340 } = {}) {
  const [size, setSize] = useState(300);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Rounded to 20px buckets so small layout jitter never recreates the writer mid-stroke.
    const measure = () => {
      const next = Math.max(min, Math.min(max, Math.floor(el.clientWidth / 20) * 20));
      setSize((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min, max]);
  return size;
}

function WritingPractice({ item, total, onSubmitResult, lastResult, saveError, onNext }) {
  const { tr, trf, locale } = useLocale();
  const boxRef = useRef(null);
  const writerRef = useRef(null);
  const size = useSquareSize(boxRef);
  const [attempt, setAttempt] = useState(0);
  const [outline, setOutline] = useState(true);
  const [progress, setProgress] = useState({ done: 0, mistakes: 0, event: null });
  const [result, setResult] = useState(null); // { mistakes, saving }

  const restart = () => {
    setAttempt((n) => n + 1);
    setProgress({ done: 0, mistakes: 0, event: null });
    setResult(null);
  };

  const hint = () => {
    const writer = writerRef.current;
    if (!writer || result) return;
    writer.highlightStroke(progress.done);
  };

  const complete = async (mistakes) => {
    setResult({ mistakes, saving: true });
    try {
      await onSubmitResult?.(mistakes);
    } finally {
      setResult((r) => (r ? { ...r, saving: false } : r));
    }
  };

  const event = progress.event;
  let feedback;
  if (result) {
    feedback = {
      tone: 'success',
      icon: CheckCircle2,
      text: result.mistakes === 0
        ? tr('Hoàn thành, không sai nét nào!')
        : trf('Hoàn thành với {0} lần viết chưa đúng.', { 0: result.mistakes }),
    };
  } else if (event?.type === 'mistake') {
    feedback = {
      tone: 'warn',
      icon: TriangleAlert,
      text: event.backwards
        ? trf('Nét {0} đang viết ngược chiều. Hãy bắt đầu từ điểm có số thứ tự.', { 0: event.stroke })
        : trf('Nét {0} chưa khớp hình hoặc thứ tự. Thử lại, hoặc bấm Gợi ý.', { 0: event.stroke }),
    };
  } else if (event?.type === 'correct') {
    feedback = { tone: 'ok', icon: CheckCircle2, text: trf('Nét {0} / {1} chính xác.', { 0: event.stroke, 1: total }) };
  } else {
    feedback = { tone: 'idle', icon: PenLine, text: trf('Viết nét {0} / {1} trong ô luyện viết.', { 0: 1, 1: total }) };
  }

  const nextReview = lastResult?.nextReviewDate ? new Date(lastResult.nextReviewDate) : null;

  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] sm:items-start">
      <div ref={boxRef} className="mx-auto w-full max-w-[340px]">
        <div className="relative">
          <KanjiWritingCanvas
            key={`${item.character}-${attempt}-${size}`}
            character={item.character}
            charDataLoader={loadKanaCharData}
            mode="guided"
            showCharacter={false}
            outline={outline}
            size={size}
            guides
            ariaLabel={trf('Ô luyện viết chữ {0}', { 0: item.character })}
            className="mx-auto shadow-rp-xs"
            quizOptions={{ showHintAfterMisses: 2, leniency: 1.15 }}
            onReady={(writer) => { writerRef.current = writer; }}
            onCorrectStroke={(strokeNum, data) => setProgress({ done: strokeNum + 1, mistakes: data?.totalMistakes ?? 0, event: { type: 'correct', stroke: strokeNum + 1 } })}
            onMistake={(data) => setProgress((p) => ({ ...p, mistakes: data.totalMistakes, event: { type: 'mistake', stroke: data.strokeNum + 1, backwards: data.isBackwards } }))}
            onComplete={complete}
          />
        </div>
        <ol aria-label={tr('Tiến độ các nét')} className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <li key={i} className={cx('h-1.5 w-7 rounded-full transition-colors duration-300', i < progress.done ? 'bg-rp-brand' : 'bg-rp-line')} />
          ))}
        </ol>
      </div>

      <div className="min-w-0">
        <div role="toolbar" aria-label={tr('Công cụ luyện viết')} className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOutline((v) => !v)} aria-pressed={outline} className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-[13px] font-semibold text-rp-text hover:border-rp-brand-border">
            {outline ? <Eye aria-hidden="true" className="h-4 w-4 text-tone-reading" /> : <EyeOff aria-hidden="true" className="h-4 w-4 text-rp-text-muted" />}
            {outline ? tr('Ẩn chữ mẫu') : tr('Hiện chữ mẫu')}
          </button>
          <button type="button" onClick={hint} disabled={Boolean(result)} className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-[13px] font-semibold text-rp-text hover:border-rp-brand-border disabled:opacity-45">
            <Lightbulb aria-hidden="true" className="h-4 w-4 text-tone-grammar" /> {tr('Gợi ý')}
          </button>
          <button type="button" onClick={restart} className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-xl border border-rp-line bg-white px-3 text-[13px] font-semibold text-rp-text hover:border-rp-brand-border">
            <RotateCcw aria-hidden="true" className="h-4 w-4 text-tone-vocab" /> {tr('Viết lại')}
          </button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-5 text-rp-text-muted">
          <Undo2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {tr('Chỉ nét viết đúng mới được giữ lại; nét sai tự biến mất để bạn viết lại.')}
        </p>

        <p
          role="status"
          aria-live="polite"
          className={cx(
            'mt-4 flex items-start gap-2 rounded-2xl px-3.5 py-3 text-[13.5px] font-medium leading-5 transition-colors duration-200',
            feedback.tone === 'success' && 'bg-[#E7F6EC] text-[#0A6B33]',
            feedback.tone === 'ok' && 'bg-[#EEF6F2] text-[#1E6B47]',
            feedback.tone === 'warn' && 'bg-[#FFF4E5] text-[#8A4B06]',
            feedback.tone === 'idle' && 'bg-rp-bg-2 text-rp-text-2',
          )}
        >
          <feedback.icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {feedback.text}
        </p>

        {result && (
          <div className="mt-3 text-[12.5px] leading-5 text-rp-text-2">
            {result.saving && <p>{tr('Đang lưu kết quả luyện viết…')}</p>}
            {!result.saving && nextReview && !Number.isNaN(nextReview.getTime()) && (
              <p>{trf('Đã lưu. Lần ôn kế: {0}', { 0: nextReview.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'vi-VN') })}</p>
            )}
            {!result.saving && saveError && <p role="alert" className="text-rp-danger">{saveError}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {result && (
            <button type="button" onClick={restart} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input border border-rp-line bg-white px-4 text-sm font-semibold text-rp-text hover:border-rp-brand-border">
              <RotateCcw aria-hidden="true" className="h-4 w-4" /> {tr('Luyện lại')}
            </button>
          )}
          {onNext && (
            <button type="button" onClick={onNext} className={cx('rp-focus rp-press inline-flex h-10 items-center gap-2 rounded-rp-input px-4 text-sm font-semibold transition-colors', result ? 'bg-rp-brand-pressed text-white shadow-rp-brand hover:bg-rp-brand-strong' : 'border border-rp-line bg-white text-rp-text hover:border-rp-brand-border')}>
              {tr('Chữ tiếp theo')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Dialog */

/**
 * Kana writing workspace: "Hướng dẫn" (animated stroke order) → "Luyện viết" (learner writes; HanziWriter checks
 * shape, order and direction of every stroke) → result saved via the real kana-writing submit API → next character.
 * Uses the shared Modal (neutral backdrop, focus trap, Escape).
 */
export default function KanaStrokeDialog({ item, type, onClose, tab = 'guide', onTabChange, onNext, onSubmitResult, lastResult, saveError }) {
  const { tr } = useLocale();
  const strokes = kanaStrokes[item.character] || emptyStrokes;
  const [localTab, setLocalTab] = useState(tab);
  const activeTab = onTabChange ? tab : localTab;
  const setTab = onTabChange || setLocalTab;
  const canPractice = hasKanaStrokeData(item.character);
  const tabs = [
    { id: 'guide', label: tr('Hướng dẫn') },
    { id: 'practice', label: tr('Luyện viết'), disabled: !canPractice },
  ];

  const onTabKey = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = activeTab === 'guide' ? 'practice' : 'guide';
    if (next === 'practice' && !canPractice) return;
    setTab(next);
    event.currentTarget.parentElement?.querySelector(`[data-tab="${next}"]`)?.focus();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${tr('Cách viết')} ${item.character}`}
      description={`${type} · / ${item.romaji} /`}
    >
      <div className="flex items-center justify-between gap-3">
        <p lang="ja" aria-hidden="true" className="text-[56px] leading-none text-rp-text" style={KANA_FONT}>{item.character}</p>
        <div role="tablist" aria-label={tr('Chế độ luyện viết')} className="inline-flex rounded-full bg-rp-bg-2 p-1 ring-1 ring-rp-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              data-tab={t.id}
              id={`kana-tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls={`kana-panel-${t.id}`}
              tabIndex={activeTab === t.id ? 0 : -1}
              disabled={t.disabled}
              onKeyDown={onTabKey}
              onClick={() => setTab(t.id)}
              className={cx(
                'rp-focus h-9 rounded-full px-4 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200 disabled:opacity-40',
                activeTab === t.id ? 'bg-white text-rp-brand-strong shadow-rp-xs' : 'text-rp-text-muted hover:text-rp-text',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div id={`kana-panel-${activeTab}`} role="tabpanel" aria-labelledby={`kana-tab-${activeTab}`} key={activeTab} className="rp-anim-fade mt-5">
        {activeTab === 'guide' ? (
          <StrokeGuide item={item} strokes={strokes} onStartPractice={() => setTab('practice')} />
        ) : (
          <WritingPractice
            item={item}
            total={strokes.length}
            onSubmitResult={onSubmitResult}
            lastResult={lastResult}
            saveError={saveError}
            onNext={onNext}
          />
        )}
      </div>

      <p className="mt-6 border-t border-rp-line pt-3 text-[11px] text-rp-text-muted">
        {tr('Dữ liệu nét:')}{' '}
        <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer" className="underline">KanjiVG · Ulrich Apel</a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className="underline">CC BY-SA 3.0</a>
      </p>
    </Modal>
  );
}
