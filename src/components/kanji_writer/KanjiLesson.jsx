import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import HanziWriter from 'hanzi-writer';
import KanjiWritingCanvas from './KanjiWritingCanvas.jsx';
import { getKanji, searchVocabulary } from '../../api/sharedBankApi.js';

function MemoryNote({ item }) {
  const detail = useQuery({
    queryKey: ['kanji-detail', item.kanjiId],
    queryFn: () => getKanji(item.kanjiId),
    enabled: item.kanjiId > 0,
  });
  const related = useQuery({
    queryKey: ['kanji-vocab', item.character],
    queryFn: () => searchVocabulary(item.character),
    enabled: Boolean(item.character),
  });
  const card = detail.data;
  const examples = (related.data?.items || [])
    .filter((row) => row.word?.includes(item.character) && row.word !== item.character)
    .slice(0, 2);
  const facts = [
    ['On', card?.onYomi || item.onYomi],
    ['Kun', card?.kunYomi || item.kunYomi],
    ['HV', card?.sinoVietnamese || item.sinoVietnamese],
  ];

  function play() {
    if (!card?.audioUrl) return;
    const sound = new Audio(card.audioUrl);
    sound.play().catch(() => {});
  }

  return (
    <aside className="rounded-[22px] border border-[#E7DAE1] bg-white px-4 py-4 lg:sticky lg:top-4">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">ĐỂ NHỚ</p>
      <p className="mt-2 text-[18px] font-semibold text-[#3C2A33]">{item.meaning || card?.meaning || 'Chưa có nghĩa'}</p>
      <dl className="mt-3 grid gap-2">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#FFF8FA] px-3 py-2">
            <dt className="text-[10px] font-semibold tracking-[0.12em] text-[#AD3155]">{label}</dt>
            <dd className="mt-0.5 text-[13px] text-[#3C2A33]">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#8C7782]">
        <span>{item.strokeCount || card?.strokeCount || '?'} nét</span>
        {card?.jlptLevelName ? <span className="rounded-full bg-[#F7F1F3] px-2 py-0.5">{card.jlptLevelName}</span> : null}
        {card?.audioUrl ? (
          <button type="button" onClick={play} className="font-semibold text-[#AD3155]">Nghe</button>
        ) : null}
      </div>
      {examples.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[#F0E4E9] pt-3">
          {examples.map((row) => (
            <li key={row.id}>
              <p className="text-[16px] text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>
                {row.word}
                {row.reading ? <span className="ml-2 text-[12px] text-[#8C7782]">{row.reading}</span> : null}
              </p>
              {row.meaning ? <p className="text-[13px] text-[#6F5C66]">{row.meaning}</p> : null}
              {row.exampleSentence ? <p className="text-[13px] text-[#8C7782]">{row.exampleSentence}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {related.isFetching && examples.length === 0 ? (
        <p className="mt-3 text-[12px] text-[#8C7782]">Đang tìm từ có chữ này…</p>
      ) : null}
    </aside>
  );
}

function StrokeOrder({ character, active = 0 }) {
  const [strokes, setStrokes] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setStrokes([]);
    setFailed(false);
    HanziWriter.loadCharacterData(character)
      .then((data) => {
        if (!live) return;
        if (!data?.strokes?.length) setFailed(true);
        else setStrokes(data.strokes);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [character]);

  if (failed) {
    return <p className="text-[13px] text-[#A33357]">Chưa tải được thứ tự nét. Kiểm tra mạng rồi thử lại.</p>;
  }
  if (!strokes.length) {
    return <p className="text-[13px] text-[#8C7782]">Đang tải thứ tự nét…</p>;
  }

  const transform = HanziWriter.getScalingTransform(76, 76, 8).transform;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {strokes.map((_, index) => (
          <div key={index} className={`w-[84px] shrink-0 rounded-2xl border bg-white p-1 ${index === active ? 'border-[#AD3155] ring-2 ring-[#AD3155]/25' : 'border-[#E7DAE1]'}`}>
            <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
              <g transform={transform}>
                {strokes.slice(0, index + 1).map((path, pathIndex) => (
                  <path key={pathIndex} d={path} fill={pathIndex === index ? '#AD3155' : '#E4D0D8'} />
                ))}
              </g>
            </svg>
            <p className="pb-1 text-center text-[11px] font-semibold text-[#8C7782]">Nét {index + 1}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[#8C7782]">Mỗi ô thêm một nét. Nét đang học màu đỏ.</p>
    </div>
  );
}

const FILLERS = ['mặt trời', 'nước', 'lửa', 'người', 'núi', 'cây', 'vàng', 'đất'];

const ROUNDS = 3;

function stepsFor(item, roundIndex) {
  const steps = roundIndex === 0 ? ['guide', 'write'] : ['write'];
  if (item?.meaning || item?.sinoVietnamese) steps.push('quiz');
  return steps;
}

function shuffle(list, seed) {
  const copy = [...list];
  let state = Math.abs(seed) || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const swap = state % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function buildQuiz(item, queue) {
  const others = queue.filter((row) => row.kanjiId !== item.kanjiId);
  const meaning = item.meaning || item.sinoVietnamese;
  const characterQuiz = Boolean(meaning && others.length >= 1 && item.kanjiId % 2 === 1);
  if (characterQuiz) {
    const cards = shuffle([item, ...shuffle(others, item.kanjiId).slice(0, 3)], item.kanjiId + 1);
    return {
      prompt: item.meaning ? `Chữ nào nghĩa là “${item.meaning}”?` : `Chữ nào đọc là “${item.sinoVietnamese}”?`,
      options: cards.map((row) => ({ id: String(row.kanjiId), label: row.character, big: true })),
      answer: String(item.kanjiId),
      showCharacter: false,
    };
  }
  const pool = others
    .map((row) => row.meaning || row.sinoVietnamese)
    .filter((value) => value && value !== meaning);
  const extras = FILLERS.filter((value) => value !== meaning && !pool.includes(value));
  const labels = shuffle([meaning, ...pool, ...extras].filter(Boolean).slice(0, 4), item.kanjiId + 3);
  return {
    prompt: item.meaning ? 'Chữ này nghĩa là gì?' : 'Âm Hán Việt của chữ này là gì?',
    options: labels.map((label) => ({ id: label, label, big: false })),
    answer: meaning,
    showCharacter: true,
  };
}

function ActionButton({ tone = 'ready', disabled, children, onClick }) {
  const face = {
    ready: 'bg-[#AD3155] text-white shadow-[0_4px_0_#7C2340]',
    wait: 'bg-[#E6E6E6] text-[#A6A6A6] shadow-[0_4px_0_#D4D4D4]',
    right: 'bg-[#58A700] text-white shadow-[0_4px_0_#3E7C00]',
    wrong: 'bg-[#AD3155] text-white shadow-[0_4px_0_#7C2340]',
  }[disabled ? 'wait' : tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-[52px] w-full rounded-2xl text-[16px] font-bold transition active:translate-y-[2px] active:shadow-none disabled:pointer-events-none ${face}`}
    >
      {children}
    </button>
  );
}

export default function KanjiLesson({ practice, scope, onScope }) {
  const { queue, loading, error, reload, selectItem, submitResult } = practice;
  const [phase, setPhase] = useState('pick');
  const [counts, setCounts] = useState({});
  const [cursor, setCursor] = useState(0);
  const [step, setStep] = useState('guide');
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const [writeMistakes, setWriteMistakes] = useState(null);
  const [activeStroke, setActiveStroke] = useState(0);
  const item = queue[cursor] || null;
  const quiz = useMemo(() => (item ? buildQuiz(item, queue) : null), [item, queue]);
  const remembered = queue.filter((row) => (counts[row.kanjiId] || 0) >= ROUNDS).length;
  const progress = queue.length ? remembered / queue.length : 0;
  const correct = checked && picked === quiz?.answer;

  useEffect(() => {
    setPhase('pick');
    setCounts({});
    setCursor(0);
    setStep('guide');
    setPicked(null);
    setChecked(false);
    setWriteMistakes(null);
    setActiveStroke(0);
  }, [queue]);

  function resetRound() {
    setPicked(null);
    setChecked(false);
    setWriteMistakes(null);
    setActiveStroke(0);
  }

  function choose(index) {
    const row = queue[index];
    const count = counts[row?.kanjiId] || 0;
    setCursor(index);
    setPhase('practice');
    setStep(count > 0 && count < ROUNDS ? 'write' : 'guide');
    resetRound();
    selectItem(index);
  }

  function advance() {
    if (!item) return;
    const roundIndex = counts[item.kanjiId] || 0;
    const order = stepsFor(item, roundIndex >= ROUNDS ? 0 : roundIndex);
    const nextStep = order[order.indexOf(step) + 1];
    if (nextStep) {
      setStep(nextStep);
      resetRound();
      return;
    }
    const nextCount = Math.min(ROUNDS, roundIndex + 1);
    setCounts({ ...counts, [item.kanjiId]: nextCount });
    resetRound();
    setPhase('pick');
    setStep('guide');
  }

  let tone = 'ready';
  let label = step === 'guide' ? 'Viết theo nét' : 'Tiếp tục';
  let disabled = false;
  let onClick = advance;
  if (phase === 'practice' && step === 'write' && writeMistakes === null) {
    tone = 'wait';
    label = 'Viết hết các nét';
    disabled = true;
  } else if (phase === 'practice' && step === 'quiz' && !checked) {
    label = 'Kiểm tra';
    disabled = !picked;
    tone = picked ? 'ready' : 'wait';
    onClick = () => setChecked(true);
  } else if (correct || (step === 'write' && writeMistakes === 0)) {
    tone = 'right';
  } else if (checked && !correct) {
    tone = 'wrong';
  }

  const beside = phase === 'practice' && (step === 'guide' || step === 'write');
  const banner = phase !== 'practice'
    ? null
    : step === 'write' && writeMistakes === 0
      ? { tone: 'right', title: 'Chuẩn từng nét' }
      : step === 'write' && writeMistakes > 0
        ? { tone: 'wrong', title: `Lệch ${writeMistakes} nét`, detail: 'Thứ tự và hướng nét vẫn được ghi lại.' }
        : correct
          ? { tone: 'right', title: 'Chính xác' }
          : checked
            ? { tone: 'wrong', title: 'Chưa đúng', detail: quiz?.showCharacter ? `Nghĩa đúng: ${quiz.answer}` : 'Xem lại chữ vừa học.' }
            : null;

  return (
    <section className={`mx-auto flex min-h-[calc(100vh-7.5rem)] w-full flex-col px-5 py-4 sm:px-6 ${beside ? 'max-w-5xl' : 'max-w-[640px]'}`}>
      <div className="flex items-center gap-3">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#E7E4E2]">
          <div className="h-full rounded-full bg-[#AD3155] transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <span className="w-10 text-right text-[12px] font-semibold text-[#8C7782]">{remembered}/{queue.length || 0}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
        <div className="inline-flex rounded-full bg-white p-1">
          {[['due', 'Hôm nay'], ['all', 'Cả bảng']].map(([value, name]) => (
            <button
              key={value}
              type="button"
              onClick={() => onScope?.(value)}
              className={`h-8 rounded-full px-3 ${scope === value ? 'bg-[#AD3155] font-semibold text-white' : 'text-[#8C7782]'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPhase('pick')} className="font-semibold text-[#AD3155]">Bảng chữ</button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        {loading && <p className="text-center text-[15px] text-[#8C7782]">Đang mở bài luyện…</p>}
        {!loading && error && !queue.length && (
          <div className="text-center">
            <p className="text-[15px] text-[#A33357]">{error}</p>
            <button type="button" onClick={reload} className="mt-4 font-semibold text-[#AD3155]">Thử lại</button>
          </div>
        )}
        {!loading && !error && !queue.length && (
          <div className="text-center">
            <p className="text-[28px]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>漢</p>
            <h1 className="mt-3 text-[22px] font-bold text-[#3C2A33]">Hôm nay chưa có chữ đến hạn</h1>
            <p className="mt-2 text-[14px] text-[#8C7782]">Mở cả bảng nếu bạn vẫn muốn luyện thêm.</p>
          </div>
        )}
        {!loading && phase === 'done' && (
          <div className="text-center">
            <p className="text-[13px] font-semibold tracking-[0.16em] text-[#58A700]">XONG BÀI</p>
            <h1 className="mt-2 text-[28px] font-bold text-[#3C2A33]">Bạn vừa luyện {queue.length} chữ</h1>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {queue.slice(0, 8).map((row) => (
                <span key={row.kanjiId} className="grid h-14 w-14 place-items-center rounded-2xl border border-[#B7DDAA] bg-[#E8F7E4] text-[28px] text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{row.character}</span>
              ))}
            </div>
          </div>
        )}
        {!loading && phase === 'pick' && queue.length > 0 && (
          <div>
            <h1 className="text-[26px] font-bold text-[#3C2A33]">Chọn chữ muốn ôn</h1>
            <p className="mt-1 text-[14px] text-[#8C7782]">Bấm một chữ để xem nét rồi viết. Thanh dưới ô đầy thì ô chuyển xanh.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {queue.map((row, index) => {
                const count = counts[row.kanjiId] || 0;
                const studied = count >= ROUNDS;
                return (
                  <button
                    key={row.kanjiId}
                    type="button"
                    onClick={() => choose(index)}
                    className={`rounded-2xl border px-2 py-3 text-center ${studied ? 'border-[#B7DDAA] bg-[#E8F7E4]' : 'border-[#E7DAE1] bg-white hover:border-[#AD3155]'}`}
                  >
                    <span className="block text-[36px] leading-none text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{row.character}</span>
                    <span className="mt-2 block truncate text-[12px] text-[#8C7782]">{row.meaning || row.sinoVietnamese || 'Hán tự'}</span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#E7E4E2]">
                      <span
                        className={`block h-full rounded-full ${studied ? 'bg-[#7BC96F]' : 'bg-[#AD3155]'}`}
                        style={{ width: `${(count / ROUNDS) * 100}%` }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!loading && phase === 'practice' && item && step === 'guide' && (
          <div>
            <button type="button" onClick={() => setPhase('pick')} className="text-[13px] font-semibold text-[#AD3155]">Đổi chữ</button>
            <h2 className="mt-3 text-[22px] font-bold text-[#3C2A33]">Xem thứ tự nét</h2>
            <p className="mt-1 text-[14px] text-[#8C7782]">{item.character} · {item.meaning || item.sinoVietnamese || 'Hán tự'} · {item.strokeCount || '?'} nét</p>
            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <div className="flex justify-center">
                  <KanjiWritingCanvas key={`${item.kanjiId}-demo`} character={item.character} mode="guided" demo size={280} showCharacter={false} />
                </div>
                <div className="mt-4">
                  <StrokeOrder character={item.character} active={0} />
                </div>
              </div>
              <MemoryNote item={item} />
            </div>
          </div>
        )}
        {!loading && phase === 'practice' && item && step === 'write' && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-bold text-[#3C2A33]">Viết theo nét</h2>
              <button type="button" onClick={() => { setStep('guide'); setWriteMistakes(null); setActiveStroke(0); }} className="text-[13px] font-semibold text-[#AD3155]">Xem lại nét</button>
            </div>
            <p className="mt-1 text-[14px] text-[#8C7782]">{item.character} · {item.meaning || item.sinoVietnamese || 'Viết đúng thứ tự.'}</p>
            <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <div className="flex justify-center">
                  <KanjiWritingCanvas
                    key={`${item.kanjiId}-write-${counts[item.kanjiId] || 0}`}
                    character={item.character}
                    mode="guided"
                    guideFirst
                    showCharacter={false}
                    size={320}
                    onCorrectStroke={(strokeNum) => setActiveStroke(strokeNum + 1)}
                    onComplete={(mistakes) => {
                      setWriteMistakes(mistakes);
                      submitResult({ totalMistakes: mistakes, practiceMode: 'guided' });
                    }}
                  />
                </div>
                <div className="mt-4">
                  <StrokeOrder character={item.character} active={activeStroke} />
                </div>
              </div>
              <MemoryNote item={item} />
            </div>
          </div>
        )}
        {!loading && phase === 'practice' && item && step === 'quiz' && quiz && (
          <div>
            <h2 className="text-[22px] font-bold text-[#3C2A33]">{quiz.prompt}</h2>
            {quiz.showCharacter && (
              <p className="mt-4 text-center text-[72px] leading-none text-[#3C2A33]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>{item.character}</p>
            )}
            <div className={`mt-5 grid gap-3 ${quiz.options.some((option) => option.big) ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {quiz.options.map((option) => {
                const selected = picked === option.id;
                const isAnswer = checked && option.id === quiz.answer;
                const isWrongPick = checked && selected && !isAnswer;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={checked}
                    onClick={() => setPicked(option.id)}
                    className={`rounded-2xl border-2 bg-white px-4 py-3 text-left font-semibold text-[#3C2A33] ${
                      isAnswer ? 'border-[#58A700] bg-[#F3FBEA]' : isWrongPick ? 'border-[#AD3155] bg-[#FDECEF]' : selected ? 'border-[#AD3155] bg-[#FFF5F8]' : 'border-[#E6E1DE]'
                    } ${option.big ? 'grid h-24 place-items-center text-[40px]' : 'text-[16px]'}`}
                    style={option.big ? { fontFamily: '"Yu Gothic", sans-serif' } : undefined}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {banner && (
        <div className={`-mx-5 mb-3 rounded-t-3xl px-5 py-4 sm:-mx-6 sm:px-6 ${banner.tone === 'right' ? 'bg-[#D7F5C8] text-[#3E7C00]' : 'bg-[#F8D5DE] text-[#8E2746]'}`}>
          <p className="text-[18px] font-bold">{banner.title}</p>
          {banner.detail && <p className="mt-1 text-[14px]">{banner.detail}</p>}
        </div>
      )}
      {!loading && phase === 'practice' && (
        <ActionButton tone={tone} disabled={disabled} onClick={onClick}>
          {label}
        </ActionButton>
      )}
      {!loading && phase === 'done' && (
        <ActionButton tone="right" onClick={() => setPhase('pick')}>
          Xem các chữ
        </ActionButton>
      )}
      {error && queue.length > 0 && <p className="mt-3 text-center text-[12px] text-[#A33357]">{error}</p>}
    </section>
  );
}
