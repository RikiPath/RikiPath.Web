import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LearnerShell } from '../../components/shells';
import { completeLesson, getLessonDetail } from '../../api/lessons.js';
import { useLocale } from '../../i18n/locale.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const jp = { fontFamily: '"Yu Gothic", "Yu Gothic UI", "Segoe UI", sans-serif' };
const vi = { fontFamily: '"Segoe UI", Nunito, sans-serif' };

const PARTS = [
  { id: 'vocab', label: 'Từ vựng', key: 'vocabularies' },
  { id: 'kanji', label: 'Kanji', key: 'kanjis' },
  { id: 'grammar', label: 'Ngữ pháp', key: 'grammars' },
];

function itemKey(part, item) {
  const id = item.vocabularyId ?? item.kanjiId ?? item.grammarPatternId ?? item.word ?? item.character ?? item.title;
  return `${part}:${id}`;
}

function faceOf(part, item) {
  if (part === 'kanji') {
    return {
      front: item.character,
      large: true,
      answer: item.meaning,
      answerVi: true,
      chips: [
        item.sinoVietnamese && { label: 'Hán Việt', value: item.sinoVietnamese, vi: true },
        item.onYomi && { label: 'On', value: item.onYomi },
        item.kunYomi && { label: 'Kun', value: item.kunYomi },
        item.strokeCount ? { label: 'Nét', value: String(item.strokeCount), vi: true } : null,
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
      answerVi: !patternIsTitle,
      note: patternIsTitle ? item.usageNotes : '',
      noteVi: true,
      example: item.exampleSentence,
      exampleMeaning: item.exampleSentenceMeaning,
    };
  }
  return {
    front: item.word,
    answer: item.meaning,
    answerVi: true,
    note: item.reading,
    example: item.exampleSentence,
    exampleMeaning: item.exampleSentenceMeaning,
    audio: item.audioUrl,
  };
}

function quizPrompt(part, item) {
  const face = faceOf(part, item);
  if (part === 'grammar') return face.note || face.answer;
  return face.answer;
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

function StudyCard({ part, item, revealed, onReveal }) {
  const { tr } = useLocale();
  const face = faceOf(part, item);
  return (
    <div className="overflow-hidden rounded-3xl border border-[#F0E4EA] bg-white shadow-[0_12px_32px_rgba(90,40,60,0.06)]">
      <button type="button" onClick={onReveal} className={`block w-full px-6 py-8 text-center ${focus}`}>
        <p className="text-[12px] font-medium text-[#A08B96]">{revealed ? tr('Nghĩa') : tr('Bấm để lật nghĩa')}</p>
        <span className={`mx-auto mt-5 flex items-center justify-center rounded-3xl bg-[#FCF4F8] text-[#AD3155] ${face.large ? 'h-36 w-36 text-[76px]' : 'min-h-28 px-6 text-[36px] leading-tight'}`} style={jp}>
          {face.front}
        </span>
        {face.note && !face.chips ? <p className="mt-4 text-[15px] text-[#AD3155]" style={face.noteVi ? vi : jp}>{face.note}</p> : null}
        {revealed && (
          <div className="mt-6 border-t border-[#F6EEF2] pt-5">
            {face.chips?.length ? (
              <div className="flex flex-wrap justify-center gap-2">
                {face.chips.map((chip) => (
                  <span key={chip.label} className="rounded-full bg-[#FCF4F8] px-3 py-1 text-[12px] text-[#8B2344]">
                    {tr(chip.label)}: <span style={chip.vi ? vi : jp}>{chip.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
            {face.answer ? <p className="mt-3 text-[18px] font-medium leading-7 text-[#3F3038]" style={face.answerVi ? vi : jp}>{face.answer}</p> : null}
            {part === 'grammar' && face.note ? <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#8C7782]" style={vi}>{face.note}</p> : null}
            {face.example ? <p className="mt-4 text-[15px] leading-7 text-[#3F3038]" style={jp}>{face.example}</p> : null}
            {face.exampleMeaning ? <p className="mt-1 text-[13px] leading-6 text-[#95828C]" style={vi}>{face.exampleMeaning}</p> : null}
            {face.image ? <img src={face.image} alt="" className="mx-auto mt-4 max-h-28 rounded-xl border border-[#F0E7EC]" /> : null}
          </div>
        )}
      </button>
      {face.audio ? <div className="px-6 pb-5"><audio className="w-full" controls src={face.audio} /></div> : null}
    </div>
  );
}

function QuizCard({ part, item, items, cursor, pick, onPick }) {
  const { tr } = useLocale();
  const prompt = quizPrompt(part, item);
  const choices = quizChoices(items, part, item, cursor);
  const correct = itemKey(part, item);
  return (
    <div className="rounded-3xl border border-[#F0E4EA] bg-white px-6 py-7 shadow-[0_12px_32px_rgba(90,40,60,0.06)]">
      <p className="text-center text-[12px] font-medium text-[#A08B96]">{tr('Chọn đáp án đúng')}</p>
      <p className="mx-auto mt-3 max-w-md text-center text-[20px] font-medium leading-8 text-[#3F3038]" style={vi}>{prompt}</p>
      <div className="mt-6 grid gap-2">
        {choices.map((choice) => {
          const key = itemKey(part, choice);
          const chosen = Boolean(pick);
          const isCorrect = key === correct;
          const isPick = key === pick;
          const tone = !chosen
            ? 'border-[#EADFE5] bg-white text-[#49353F] hover:border-[#E7C9D6] hover:bg-[#FCF8FA]'
            : isCorrect
              ? 'border-[#2F6B45] bg-[#E7F6EC] text-[#1E5C36]'
              : isPick
                ? 'border-[#C45B78] bg-[#FCEEF3] text-[#8B2344]'
                : 'border-[#F3EDF0] bg-white text-[#C4B4BC]';
          return (
            <button
              key={key}
              type="button"
              disabled={chosen}
              onClick={() => onPick(key)}
              className={`min-h-12 rounded-2xl border px-4 py-3 text-[18px] ${tone} ${focus}`}
              style={jp}
            >
              {faceOf(part, choice).front}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LessonPlayer() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const lessonId = Number(params.get('lessonId')) || null;
  const { locale, tr } = useLocale();
  const [part, setPart] = useState('vocab');
  const [mode, setMode] = useState('learn');
  const [pick, setPick] = useState(null);
  const [showList, setShowList] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState({});
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['lesson-detail', lessonId],
    queryFn: () => getLessonDetail(lessonId),
    enabled: Boolean(lessonId),
  });
  const complete = useMutation({
    mutationFn: () => completeLesson(lessonId),
    onSuccess: (data) => {
      client.setQueryData(['lesson-detail', lessonId], data);
      client.invalidateQueries({ queryKey: ['learning-lessons'] });
    },
  });
  const lesson = query.data;
  const items = lesson?.[PARTS.find((item) => item.id === part).key] || [];
  const deck = queue || items;
  const current = deck[cursor];

  useEffect(() => {
    setCursor(0);
    setQueue(null);
    setRevealed(false);
    setDone(false);
    setShowList(false);
    setKnown({});
    setPick(null);
  }, [part, lessonId]);

  const grade = (remembered) => {
    if (!current) return;
    const key = itemKey(part, current);
    setKnown((previous) => ({ ...previous, [key]: remembered }));
    setRevealed(false);
    setPick(null);
    if (cursor + 1 >= deck.length) setDone(true);
    else setCursor(cursor + 1);
  };

  const reviewMissed = () => {
    const missed = items.filter((item) => known[itemKey(part, item)] === false);
    setQueue(missed);
    setCursor(0);
    setRevealed(false);
    setDone(false);
    setShowList(false);
  };

  const restart = () => {
    setQueue(null);
    setCursor(0);
    setRevealed(false);
    setDone(false);
    setKnown({});
    setShowList(false);
  };

  const openAt = (index) => {
    setMode('learn');
    setQueue(null);
    setCursor(index);
    setRevealed(false);
    setDone(false);
    setShowList(false);
  };

  const knownCount = items.filter((item) => known[itemKey(part, item)] === true).length;
  const missedCount = items.filter((item) => known[itemKey(part, item)] === false).length;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Bài học">
      <div className="min-h-screen bg-[#FAF8F7] font-['Nunito',sans-serif] text-[#3F3038]">
        <main className="mx-auto w-full max-w-[1120px] px-5 py-6 lg:px-7">
          <Link to="/lessons/" className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>{tr('Về danh sách bài')}</Link>
          {!lessonId && (
            <div className="mt-5 rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
              <p className="text-[15px] font-medium text-[#806371]">{tr('Chọn một bài từ danh sách')}</p>
              <p className="mt-1 text-[13px] leading-6 text-[#A18B97]">{tr('Mỗi bài mở ra từ vựng, Kanji và ngữ pháp đã được duyệt cùng nhau.')}</p>
            </div>
          )}
          {query.isPending && lessonId && <p className="mt-5 text-[13px] text-[#9A8390]">{tr('Đang tải bài…')}</p>}
          {query.isError && <p role="alert" className="mt-5 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
          {lesson && (
            <>
              <header className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[#AD3155]">{lesson.levelCode}</p>
                  <h1 className="mt-1 text-[26px] font-medium leading-tight">{lesson.title}</h1>
                  {lesson.content && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#95828C]">{lesson.content}</p>}
                </div>
                <button
                  type="button"
                  disabled={complete.isPending || lesson.isCompleted}
                  onClick={() => complete.mutate()}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-medium ${lesson.isCompleted ? 'bg-[#F3F8F4] text-[#2F6B45]' : 'bg-[#AD3155] text-white hover:bg-[#982B4B]'} disabled:opacity-70 ${focus}`}
                >
                  {lesson.isCompleted ? tr('Đã hoàn thành') : complete.isPending ? tr('Đang lưu…') : tr('Đánh dấu đã học')}
                </button>
              </header>
              {complete.isError && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{complete.error.message}</p>}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {PARTS.map((item) => {
                  const count = lesson[item.key]?.length || 0;
                  const active = part === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPart(item.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-[#AD3155] text-white' : 'border border-[#EADFE5] bg-white text-[#826271] hover:bg-[#FCF3F7]'} ${focus}`}
                    >
                      {tr(item.label)} ({count})
                    </button>
                  );
                })}
              </div>
              {items.length > 0 && (
                <div className="flex rounded-xl bg-[#F6EEF2] p-1">
                  {[{ id: 'learn', label: tr('Học') }, { id: 'quiz', label: tr('Ôn') }].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={mode === item.id}
                      onClick={() => { setMode(item.id); setPick(null); setRevealed(false); setDone(false); setCursor(0); setQueue(null); setShowList(false); }}
                      className={`h-8 rounded-lg px-3 text-[12px] font-medium ${mode === item.id ? 'bg-white text-[#AD3155] shadow-sm' : 'text-[#8C7782]'} ${focus}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              </div>
              {!items.length ? (
                <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
                  <p className="text-[15px] font-medium text-[#806371]">{tr('Phần này chưa có nội dung trong bài')}</p>
                </div>
              ) : showList ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-[#8C7782]">{locale === 'ja' ? `${knownCount}/${items.length} 覚えた` : `Đã nhớ ${knownCount}/${items.length}`}</p>
                    <button type="button" onClick={() => openAt(0)} className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>{tr('Học từ đầu')}</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item, index) => {
                      const key = itemKey(part, item);
                      const state = known[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => openAt(index)}
                          className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left hover:border-[#E7C9D6] ${focus} ${state === true ? 'border-[#D7E8DC]' : 'border-[#EADFE5]'}`}
                        >
                          <span className="truncate text-[18px] text-[#593B48]" style={jp}>{faceOf(part, item).front}</span>
                          <span className={`shrink-0 text-[11px] ${state === true ? 'text-[#2F6B45]' : state === false ? 'text-[#8A5A10]' : 'text-[#A08B96]'}`}>
                            {state === true ? tr('Đã nhớ') : state === false ? tr('Học lại') : tr('Học')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[640px]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-[#8C7782]">
                      {done ? (locale === 'ja' ? `${knownCount}/${items.length} 覚えた` : `Đã nhớ ${knownCount}/${items.length}`) : `${Math.min(cursor + 1, deck.length)}/${deck.length}`}
                    </p>
                    <button type="button" onClick={() => setShowList(true)} className={`h-9 rounded-lg px-3 text-[12px] text-[#8C6070] hover:bg-white ${focus}`}>{tr('Danh sách')}</button>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#F3E8ED]">
                    <div className="h-full rounded-full bg-[#AD3155]" style={{ width: `${items.length ? (knownCount / items.length) * 100 : 0}%` }} />
                  </div>
                  {done ? (
                    <div className="rounded-3xl border border-[#EADFE5] bg-white px-6 py-8 text-center">
                      <p className="text-[20px] font-medium">{locale === 'ja' ? `${knownCount}/${items.length} 覚えました` : `Bạn nhớ ${knownCount}/${items.length} mục`}</p>
                      <p className="mt-2 text-[13px] leading-6 text-[#8C7782]">
                        {missedCount ? (locale === 'ja' ? `${missedCount} 項目を見直します。` : `${missedCount} mục cần xem lại.`) : tr('Bạn đã nhớ hết phần này.')}
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {missedCount > 0 && (
                          <button type="button" onClick={reviewMissed} className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}>
                            {locale === 'ja' ? `未習得 ${missedCount} 項目を復習` : `Ôn ${missedCount} mục chưa nhớ`}
                          </button>
                        )}
                        <button type="button" onClick={restart} className={`h-10 rounded-xl border border-[#E7DAE1] bg-white px-4 text-[13px] text-[#6E5360] ${focus}`}>{tr('Học lại từ đầu')}</button>
                      </div>
                    </div>
                  ) : current && mode === 'quiz' ? (
                    <>
                      <QuizCard part={part} item={current} items={items} cursor={cursor} pick={pick} onPick={setPick} />
                      <button
                        type="button"
                        disabled={!pick}
                        onClick={() => grade(pick === itemKey(part, current))}
                        className={`mt-4 h-11 w-full rounded-xl bg-[#AD3155] text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
                      >
                        {tr('Tiếp')}
                      </button>
                    </>
                  ) : current && (
                    <>
                      <StudyCard part={part} item={current} revealed={revealed} onReveal={() => setRevealed(true)} />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!revealed}
                          onClick={() => grade(false)}
                          className={`h-11 rounded-xl border border-[#E7DAE1] bg-white text-[13px] font-medium text-[#8A5A10] hover:bg-[#FFF6E8] disabled:opacity-40 ${focus}`}
                        >
                          {tr('Chưa nhớ')}
                        </button>
                        <button
                          type="button"
                          disabled={!revealed}
                          onClick={() => grade(true)}
                          className={`h-11 rounded-xl bg-[#AD3155] text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
                        >
                          {tr('Nhớ rồi')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </LearnerShell>
  );
}
