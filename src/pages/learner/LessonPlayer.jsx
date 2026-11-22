import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LearnerShell } from '@/layouts';
import { completeLesson, getLessonDetail, updatePlaybackPosition } from '@/features/lessons/api/lessonApi.js';
import { bookmarkGrammar } from '@/features/notebook/api/notebookApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import HighlightableText from '@/features/notebook/components/HighlightableText.jsx';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';
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
      image: item.imageUrl ?? item.strokeOrderImageUrl,
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
      image: item.imageUrl,
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
    image: item.imageUrl,
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

function StudyCard({ part, item, revealed, onReveal, onBookmark, bookmarkState }) {
  const { tr } = useLocale();
  const face = faceOf(part, item);
  return (
    <div className="overflow-hidden rounded-3xl border border-rp-line bg-white shadow-[0_12px_32px_rgba(90,40,60,0.06)]">
      <button type="button" onClick={onReveal} className={`block w-full px-6 py-8 text-center ${focus}`}>
        <p className="text-[12px] font-medium text-rp-text-muted">{revealed ? tr('Nghĩa') : tr('Bấm để lật nghĩa')}</p>
        <span className={`mx-auto mt-5 flex items-center justify-center rounded-3xl bg-rp-brand-tint text-rp-brand-strong ${face.large ? 'h-36 w-36 text-[76px]' : 'min-h-28 px-6 text-[36px] leading-tight'}`} style={jp}>
          {face.front}
        </span>
        {face.note && !face.chips ? <p className="mt-4 text-[15px] text-rp-brand-strong" style={face.noteVi ? vi : jp}>{tr(face.note)}</p> : null}
        {revealed && (
          <div className="mt-6 border-t border-rp-line pt-5">
            {face.chips?.length ? (
              <div className="flex flex-wrap justify-center gap-2">
                {face.chips.map((chip) => (
                  <span key={chip.label} className="rounded-full bg-rp-brand-tint px-3 py-1 text-[12px] text-rp-brand-deep">
                    {tr(chip.label)}: <span style={chip.vi ? vi : jp}>{chip.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
            {face.answer ? <p className="mt-3 text-[18px] font-medium leading-7 text-rp-text" style={face.answerVi ? vi : jp}>{tr(face.answer)}</p> : null}
            {part === 'grammar' && face.note ? <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-rp-text-muted" style={vi}>{tr(face.note)}</p> : null}
            {face.example ? <p className="mt-4 text-[15px] leading-7 text-rp-text" style={jp}>{face.example}</p> : null}
            {face.exampleMeaning ? <p className="mt-1 text-[13px] leading-6 text-rp-text-muted" style={vi}>{face.exampleMeaning}</p> : null}
            {face.image ? <img src={face.image} alt="" className="mx-auto mt-4 max-h-28 rounded-xl border border-rp-line" /> : null}
          </div>
        )}
      </button>
      {face.audio ? <div className="px-6 pb-5"><audio className="w-full" controls src={face.audio} /></div> : null}
      {part === 'grammar' && item.grammarPatternId ? (
        <div className="border-t border-rp-line px-6 py-3">
          <button
            type="button"
            disabled={bookmarkState === 'saving' || bookmarkState === 'saved'}
            onClick={onBookmark}
            className={`text-[12px] font-medium text-rp-brand-strong disabled:text-rp-text-muted ${focus}`}
          >
            {bookmarkState === 'saved' ? tr('Đã đưa vào ôn SRS') : bookmarkState === 'saving' ? tr('Đang lưu…') : tr('Đưa ngữ pháp vào ôn SRS')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QuizCard({ part, item, items, cursor, pick, onPick }) {
  const { tr } = useLocale();
  const prompt = quizPrompt(part, item);
  const choices = quizChoices(items, part, item, cursor);
  const correct = itemKey(part, item);
  return (
    <div className="rounded-3xl border border-rp-line bg-white px-6 py-7 shadow-[0_12px_32px_rgba(90,40,60,0.06)]">
      <p className="text-center text-[12px] font-medium text-rp-text-muted">{tr('Chọn đáp án đúng')}</p>
      <p className="mx-auto mt-3 max-w-md text-center text-[20px] font-medium leading-8 text-rp-text" style={vi}>{prompt}</p>
      <div className="mt-6 grid gap-2">
        {choices.map((choice) => {
          const key = itemKey(part, choice);
          const chosen = Boolean(pick);
          const isCorrect = key === correct;
          const isPick = key === pick;
          const tone = !chosen
            ? 'border-rp-line bg-white text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint'
            : isCorrect
              ? 'border-rp-success bg-rp-success-bg text-rp-success'
              : isPick
                ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-deep'
                : 'border-rp-line bg-white text-rp-text-muted';
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
  const { trf, locale, tr } = useLocale();
  const [part, setPart] = useState('vocab');
  const [mode, setMode] = useState('learn');
  const [pick, setPick] = useState(null);
  const [showList, setShowList] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState({});
  const [bookmarkStates, setBookmarkStates] = useState({});
  const lastSent = useRef(-1);
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
      notify.success(tr('Đã đánh dấu hoàn thành bài học!'), '', { key: `lesson-complete-${lessonId}` });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu tiến độ bài học'), { key: `lesson-complete-err-${lessonId}` }),
  });
  const playback = useMutation({
    mutationFn: (body) => updatePlaybackPosition(lessonId, body),
  });
  const saveGrammar = useMutation({
    mutationFn: ({ id }) => bookmarkGrammar(id),
    onMutate: ({ key }) => setBookmarkStates((cur) => ({ ...cur, [key]: 'saving' })),
    onSuccess: (res, { key }) => {
      setBookmarkStates((cur) => ({ ...cur, [key]: 'saved' }));
      if (res?.alreadyExists || res?.isExisting) {
        notify.info(tr('Mẫu ngữ pháp đã có trong sổ tay.'), '', { key: 'lesson-grammar-bm-dup' });
      } else {
        notify.success(tr('Đã lưu mẫu ngữ pháp vào sổ tay.'), '', { key: 'lesson-grammar-bm' });
      }
    },
    onError: (err, { key }) => {
      setBookmarkStates((cur) => ({ ...cur, [key]: 'error' }));
      notify.apiError(err, tr('Chưa lưu được mẫu ngữ pháp'), { key: 'lesson-grammar-bm-err' });
    },
  });
  const lesson = query.data;
  const items = lesson?.[PARTS.find((item) => item.id === part).key] || [];
  const deck = queue || items;
  const current = deck[cursor];
  const currentCardKey = current ? itemKey(part, current) : '';
  const currentBookmarkState = bookmarkStates[currentCardKey] || '';

  // Switching lesson or part restarts the deck (state adjusted during render, not in an effect).
  const deckKey = `${lessonId}|${part}`;
  const [activeDeckKey, setActiveDeckKey] = useState(deckKey);
  if (activeDeckKey !== deckKey) {
    setActiveDeckKey(deckKey);
    setCursor(0);
    setQueue(null);
    setRevealed(false);
    setDone(false);
    setShowList(false);
    setKnown({});
    setPick(null);
  }
  useEffect(() => {
    lastSent.current = -1;
  }, [deckKey]);

  const rememberVideo = (video) => {
    const duration = Math.floor(video.duration || 0);
    const position = Math.floor(video.currentTime || 0);
    if (duration <= 0 || position < 1) return;
    if (lastSent.current >= 0 && position - lastSent.current < 8) return;
    lastSent.current = position;
    playback.mutate({ positionSeconds: position, durationSeconds: duration });
  };

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
    <LearnerShell pathname={pathname} breadcrumb={tr('Bài học')}>
      <div className="min-h-dvh bg-rp-bg-2 text-rp-text">
        <main className="rp-container rp-cq py-[var(--rp-space-page-y)]">
          <Link to="/lessons/" className={`text-[13px] font-medium rp-link ${focus}`}>{tr('Về danh sách bài')}</Link>
          {!lessonId && (
            <div className="mt-5 rounded-2xl border border-rp-line bg-white px-5 py-8">
              <p className="text-[15px] font-medium text-rp-text-2">{tr('Chọn một bài từ danh sách')}</p>
              <p className="mt-1 text-[13px] leading-6 text-rp-text-muted">{tr('Mỗi bài mở ra từ vựng, Kanji và ngữ pháp đã được duyệt cùng nhau.')}</p>
            </div>
          )}
          {query.isPending && lessonId && <SakuraLoader variant="section" context="lesson" delay={160} />}
          {query.isError && (
            <ContextualErrorState
              className="mt-5 rounded-2xl border border-rp-line bg-white px-5"
              compact
              error={query.error}
              title={tr('Chưa tải được nội dung bài học')}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          )}
          {lesson && (
            <>
              <header className="mb-5 mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-rp-brand-strong">{lesson.levelCode}</p>
                  <h1 className="mt-1 text-[26px] font-medium leading-tight">{tr(lesson.title)}</h1>
                  {lesson.content && (
                    <p className="mt-2 max-w-2xl text-[13px] leading-6 text-rp-text-muted">
                      <HighlightableText
                        text={lesson.content}
                        contentId={`lesson-player-${lesson.lessonId}-intro`}
                        sourceTitle={tr(lesson.title)}
                      />
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                <Link
                  to={`/lesson-practice/?lessonId=${lessonId}`}
                  className={`inline-flex h-9 items-center rounded-lg border border-rp-line px-3 text-[12px] font-medium text-rp-brand-strong hover:bg-rp-brand-tint ${focus}`}
                >
                  {tr('Làm bài tập')}
                </Link>
                <button
                  type="button"
                  disabled={complete.isPending || lesson.isCompleted}
                  onClick={() => complete.mutate()}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-medium ${lesson.isCompleted ? 'bg-[#F3F8F4] text-rp-success' : 'bg-rp-brand-strong text-white hover:bg-rp-brand-deep'} disabled:opacity-70 ${focus}`}
                >
                  {lesson.isCompleted ? tr('Đã hoàn thành') : complete.isPending ? tr('Đang lưu…') : tr('Đánh dấu đã học')}
                </button>
                </div>
              </header>
              {lesson.videoUrl && (
                <video
                  key={lesson.lessonId}
                  className="mb-4 w-full rounded-2xl bg-black"
                  controls
                  src={lesson.videoUrl}
                  onLoadedMetadata={(event) => {
                    const resume = lesson.resumePositionSeconds || 0;
                    if (resume > 0) event.currentTarget.currentTime = resume;
                  }}
                  onTimeUpdate={(event) => rememberVideo(event.currentTarget)}
                  onPause={(event) => {
                    lastSent.current = -1;
                    rememberVideo(event.currentTarget);
                  }}
                />
              )}
              {complete.isError && <p role="alert" className="mb-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{tr(describeApiError(complete.error).message)}</p>}
              {saveGrammar.isError && <p role="alert" className="mb-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">{tr(describeApiError(saveGrammar.error).message)}</p>}
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
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-rp-brand-strong text-white' : 'border border-rp-line bg-white text-rp-text-2 hover:bg-rp-brand-tint'} ${focus}`}
                    >
                      {tr(item.label)} ({count})
                    </button>
                  );
                })}
              </div>
              {items.length > 0 && (
                <div className="flex rounded-xl bg-rp-brand-soft p-1">
                  {[{ id: 'learn', label: tr('Học'), disabled: false }, { id: 'quiz', label: tr('Ôn'), disabled: items.length < 2 }].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.disabled}
                      title={item.disabled ? tr('Cần tối thiểu 2 mục để tạo trắc nghiệm') : undefined}
                      aria-pressed={mode === item.id}
                      onClick={() => { setMode(item.id); setPick(null); setRevealed(false); setDone(false); setCursor(0); setQueue(null); setShowList(false); }}
                      className={`h-8 rounded-lg px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-45 ${mode === item.id ? 'bg-white text-rp-brand-strong shadow-sm' : 'text-rp-text-muted'} ${focus}`}
                    >
                      {tr(item.label)}
                    </button>
                  ))}
                </div>
              )}
              </div>
              {!items.length ? (
                <div className="rounded-2xl border border-rp-line bg-white px-5 py-8">
                  <p className="text-[15px] font-medium text-rp-text-2">{tr('Phần này chưa có nội dung trong bài')}</p>
                </div>
              ) : showList ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-rp-text-muted">{locale === 'ja' ? `${knownCount}/${items.length} 覚えた` : trf('Đã nhớ {0}/{1}', { 0: knownCount, 1: items.length })}</p>
                    <button type="button" onClick={() => openAt(0)} className={`h-9 rounded-lg bg-rp-brand-strong px-3 text-[12px] font-medium text-white hover:bg-rp-brand-deep ${focus}`}>{tr('Học từ đầu')}</button>
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
                          className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left hover:border-rp-brand-border ${focus} ${state === true ? 'border-[#D7E8DC]' : 'border-rp-line'}`}
                        >
                          <span className="truncate text-[18px] text-rp-brand-deep" style={jp}>{faceOf(part, item).front}</span>
                          <span className={`shrink-0 text-[11px] ${state === true ? 'text-rp-success' : state === false ? 'text-rp-warning' : 'text-rp-text-muted'}`}>
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
                    <p className="text-[13px] text-rp-text-muted">
                      {done ? (locale === 'ja' ? `${knownCount}/${items.length} 覚えた` : trf('Đã nhớ {0}/{1}', { 0: knownCount, 1: items.length })) : `${Math.min(cursor + 1, deck.length)}/${deck.length}`}
                    </p>
                    <button type="button" onClick={() => setShowList(true)} className={`h-9 rounded-lg px-3 text-[12px] text-rp-brand-strong hover:bg-white ${focus}`}>{tr('Danh sách')}</button>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-rp-brand-soft">
                    <div className="h-full rounded-full bg-rp-brand-strong" style={{ width: `${items.length ? (knownCount / items.length) * 100 : 0}%` }} />
                  </div>
                  {done ? (
                    <div className="rounded-3xl border border-rp-line bg-white px-6 py-8 text-center">
                      <p className="text-[20px] font-medium">{locale === 'ja' ? `${knownCount}/${items.length} 覚えました` : trf('Bạn nhớ {0}/{1} mục', { 0: knownCount, 1: items.length })}</p>
                      <p className="mt-2 text-[13px] leading-6 text-rp-text-muted">
                        {missedCount ? (locale === 'ja' ? `${missedCount} 項目を見直します。` : trf('{0} mục cần xem lại.', { 0: missedCount })) : tr('Bạn đã nhớ hết phần này.')}
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {missedCount > 0 && (
                          <button type="button" onClick={reviewMissed} className={`h-10 rounded-xl bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep ${focus}`}>
                            {locale === 'ja' ? `未習得 ${missedCount} 項目を復習` : trf('Ôn {0} mục chưa nhớ', { 0: missedCount })}
                          </button>
                        )}
                        <button type="button" onClick={restart} className={`h-10 rounded-xl border border-rp-line bg-white px-4 text-[13px] text-rp-text-2 ${focus}`}>{tr('Học lại từ đầu')}</button>
                      </div>
                    </div>
                  ) : current && mode === 'quiz' ? (
                    <>
                      <QuizCard part={part} item={current} items={items} cursor={cursor} pick={pick} onPick={setPick} />
                      <button
                        type="button"
                        disabled={!pick}
                        onClick={() => grade(pick === itemKey(part, current))}
                        className={`mt-4 h-11 w-full rounded-xl bg-rp-brand-strong text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-40 ${focus}`}
                      >
                        {tr('Tiếp')}
                      </button>
                    </>
                  ) : current && (
                    <>
                      <StudyCard
                        part={part}
                        item={current}
                        revealed={revealed}
                        onReveal={() => setRevealed(true)}
                        bookmarkState={currentBookmarkState}
                        onBookmark={() => current.grammarPatternId && saveGrammar.mutate({ id: current.grammarPatternId, key: currentCardKey })}
                      />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!revealed}
                          onClick={() => grade(false)}
                          className={`h-11 rounded-xl border border-rp-line bg-white text-[13px] font-medium text-rp-warning hover:bg-rp-warning-bg disabled:opacity-40 ${focus}`}
                        >
                          {tr('Chưa nhớ')}
                        </button>
                        <button
                          type="button"
                          disabled={!revealed}
                          onClick={() => grade(true)}
                          className={`h-11 rounded-xl bg-rp-brand-strong text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-40 ${focus}`}
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
          {lesson && <LearnerFeedbackPanel type="lesson" id={lessonId} label="Phản hồi về bài học" />}
        </main>
      </div>
    </LearnerShell>
  );
}
