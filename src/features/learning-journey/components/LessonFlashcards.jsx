import { useState } from 'react';
import { Button, SegmentedControl, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { itemKey } from '../lessonContentModel.js';

// Optional self-check flashcards (moved from the former Lesson Player). Purely local practice:
// nothing here is graded or reported as lesson completion.

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function faceOf(part, item) {
  if (part === 'kanji') {
    return {
      front: item.character,
      large: true,
      answer: item.meaning,
      chips: [
        item.sinoVietnamese && { label: 'Hán Việt', value: item.sinoVietnamese },
        item.onYomi && { label: 'On', value: item.onYomi },
        item.kunYomi && { label: 'Kun', value: item.kunYomi },
        item.strokeCount ? { label: 'Nét', value: String(item.strokeCount) } : null,
      ].filter(Boolean),
      audio: item.audioUrl,
      image: item.strokeOrderImageUrl,
    };
  }
  if (part === 'grammar') {
    const patternIsTitle = item.title && item.title !== item.structure;
    return {
      front: item.structure || item.title,
      answer: patternIsTitle ? item.title : item.usageNotes,
      note: patternIsTitle ? item.usageNotes : '',
      example: item.exampleSentence,
      exampleMeaning: item.exampleSentenceMeaning,
    };
  }
  return {
    front: item.word,
    answer: item.meaning,
    note: item.reading,
    example: item.exampleSentence,
    exampleMeaning: item.exampleSentenceMeaning,
    audio: item.audioUrl,
  };
}

function quizChoices(items, part, current, cursor) {
  const rest = items.filter((item) => itemKey(part, item) !== itemKey(part, current));
  const pool = [...rest];
  const picked = [];
  let seed = cursor + 7;
  while (picked.length < 3 && pool.length) {
    seed = (seed * 13 + 5) % pool.length;
    picked.push(pool.splice(seed, 1)[0]);
  }
  const mixed = [current, ...picked];
  for (let index = mixed.length - 1; index > 0; index -= 1) {
    seed = (seed * 17 + index) % (index + 1);
    [mixed[index], mixed[seed]] = [mixed[seed], mixed[index]];
  }
  return mixed;
}

export default function LessonFlashcards({ part, items, onInteract }) {
  const { tr, trf } = useLocale();
  const [mode, setMode] = useState('learn');
  const [cursor, setCursor] = useState(0);
  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState({});

  const deck = queue || items;
  const current = deck[cursor];
  const knownCount = items.filter((item) => known[itemKey(part, item)] === true).length;
  const missedCount = items.filter((item) => known[itemKey(part, item)] === false).length;

  const reset = (nextQueue = null) => {
    setQueue(nextQueue);
    setCursor(0);
    setRevealed(false);
    setPick(null);
    setDone(false);
  };

  const grade = (remembered) => {
    if (!current) return;
    onInteract?.();
    setKnown((previous) => ({ ...previous, [itemKey(part, current)]: remembered }));
    setRevealed(false);
    setPick(null);
    if (cursor + 1 >= deck.length) setDone(true);
    else setCursor(cursor + 1);
  };

  if (!items.length) return null;
  const face = current ? faceOf(part, current) : null;

  return (
    <div className="mx-auto max-w-[600px] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-rp-text-muted">
          {done ? trf('Đã nhớ {0}/{1}', { 0: knownCount, 1: items.length }) : `${Math.min(cursor + 1, deck.length)}/${deck.length}`}
        </p>
        <SegmentedControl
          size="md"
          label={tr('Chế độ luyện tập')}
          value={mode}
          onChange={(next) => { setMode(next); reset(); }}
          options={[
            { value: 'learn', label: 'Lật thẻ' },
            { value: 'quiz', label: 'Trắc nghiệm', disabled: items.length < 2, title: items.length < 2 ? 'Cần tối thiểu 2 mục để tạo trắc nghiệm' : undefined },
          ]}
        />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-rp-brand-soft">
        <div className="h-full origin-left rounded-full bg-rp-brand-strong transition-transform duration-300" style={{ transform: `scaleX(${items.length ? knownCount / items.length : 0})` }} />
      </div>

      {done ? (
        <div className="rounded-rp-card border border-rp-line bg-white px-6 py-7 text-center">
          <p className="text-[18px] font-semibold">{trf('Bạn nhớ {0}/{1} mục', { 0: knownCount, 1: items.length })}</p>
          <p className="mt-1.5 text-[13px] text-rp-text-muted">
            {missedCount ? trf('{0} mục cần xem lại.', { 0: missedCount }) : tr('Bạn đã nhớ hết phần này.')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {missedCount > 0 && (
              <Button variant="primary" size="md" onClick={() => reset(items.filter((item) => known[itemKey(part, item)] === false))}>
                {trf('Ôn {0} mục chưa nhớ', { 0: missedCount })}
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={() => { setKnown({}); reset(); }}>{tr('Học lại từ đầu')}</Button>
          </div>
        </div>
      ) : mode === 'quiz' && current ? (
        <div className="rounded-rp-card border border-rp-line bg-white px-5 py-6">
          <p className="text-center text-[12px] font-medium text-rp-text-muted">{tr('Chọn đáp án đúng')}</p>
          <p className="mx-auto mt-2 max-w-md text-center text-[18px] font-medium leading-8 text-rp-text">
            {part === 'grammar' ? face.note || face.answer : face.answer}
          </p>
          <div className="mt-5 grid gap-2">
            {quizChoices(items, part, current, cursor).map((choice) => {
              const key = itemKey(part, choice);
              const chosen = Boolean(pick);
              const isCorrect = key === itemKey(part, current);
              const tone = !chosen
                ? 'border-rp-line bg-white text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint'
                : isCorrect
                  ? 'border-rp-success bg-rp-success-bg text-rp-success'
                  : key === pick
                    ? 'border-rp-danger bg-rp-danger-bg text-rp-danger'
                    : 'border-rp-line bg-white text-rp-text-muted';
              return (
                <button key={key} type="button" lang="ja" disabled={chosen} onClick={() => setPick(key)} className={cx('rp-jp min-h-12 rounded-xl border px-4 py-2.5 text-[18px]', tone, focus)}>
                  {faceOf(part, choice).front}
                </button>
              );
            })}
          </div>
          <Button variant="primary" size="lg" className="mt-4 w-full" disabled={!pick} onClick={() => grade(pick === itemKey(part, current))}>
            {tr('Tiếp')}
          </Button>
        </div>
      ) : current && (
        <>
          <div className="overflow-hidden rounded-rp-card border border-rp-line bg-white">
            <button type="button" onClick={() => { setRevealed(true); onInteract?.(); }} className={cx('block w-full px-6 py-7 text-center', focus)}>
              <p className="text-[12px] font-medium text-rp-text-muted">{revealed ? tr('Nghĩa') : tr('Bấm để lật nghĩa')}</p>
              <span lang="ja" className={cx('rp-jp mx-auto mt-4 flex items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong', face.large ? 'h-32 w-32 text-[68px]' : 'min-h-24 px-6 text-[32px] leading-tight')}>
                {face.front}
              </span>
              {face.note && !face.chips ? <p lang={part === 'grammar' ? undefined : 'ja'} className="mt-3 text-[15px] text-rp-brand-strong">{face.note}</p> : null}
              {revealed && (
                <div className="mt-5 border-t border-rp-line pt-4">
                  {face.chips?.length ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {face.chips.map((chip) => (
                        <span key={chip.label} className="rounded-full bg-rp-brand-tint px-3 py-1 text-[12px] text-rp-brand-deep">
                          {tr(chip.label)}: {chip.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {face.answer ? <p className="mt-3 text-[17px] font-medium leading-7 text-rp-text">{face.answer}</p> : null}
                  {face.example ? <p lang="ja" className="rp-jp mt-3 text-[15px] leading-7 text-rp-text">{face.example}</p> : null}
                  {face.exampleMeaning ? <p className="mt-1 text-[13px] leading-6 text-rp-text-muted">{face.exampleMeaning}</p> : null}
                  {face.image ? <img src={face.image} alt="" className="mx-auto mt-3 max-h-28 rounded-xl border border-rp-line" /> : null}
                </div>
              )}
            </button>
            {face.audio ? <div className="px-6 pb-4"><audio className="w-full" controls preload="none" src={face.audio} /></div> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" disabled={!revealed} onClick={() => grade(false)}>{tr('Chưa nhớ')}</Button>
            <Button variant="primary" size="lg" disabled={!revealed} onClick={() => grade(true)}>{tr('Nhớ rồi')}</Button>
          </div>
        </>
      )}
    </div>
  );
}
