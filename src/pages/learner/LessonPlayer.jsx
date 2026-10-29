import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LearnerShell } from '../../components/shells';
import { completeLesson, getLessonDetail } from '../../api/lessons.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

const PARTS = [
  { id: 'vocab', label: 'Từ vựng', key: 'vocabularies' },
  { id: 'kanji', label: 'Kanji', key: 'kanjis' },
  { id: 'grammar', label: 'Ngữ pháp', key: 'grammars' },
];

function VocabularyCard({ item }) {
  return (
    <article className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[18px] font-medium text-[#593B48]">{item.word}</h3>
        <p className="text-[13px] text-[#AD3155]">{item.reading}</p>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-[#705261]">{item.meaning}</p>
      {item.exampleSentence && <p className="mt-3 text-[13px] leading-6 text-[#3F3038]">{item.exampleSentence}</p>}
      {item.exampleSentenceMeaning && <p className="mt-1 text-[12px] leading-6 text-[#95828C]">{item.exampleSentenceMeaning}</p>}
      {item.audioUrl && <audio className="mt-3 w-full" controls src={item.audioUrl} />}
    </article>
  );
}

function KanjiCard({ item }) {
  return (
    <article className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
      <div className="flex items-start gap-4">
        <p className="font-['Noto_Serif_JP',serif] text-[42px] leading-none text-[#AD3155]">{item.character}</p>
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[#593B48]">{item.meaning}</p>
          <p className="mt-1 text-[12px] leading-6 text-[#95828C]">
            {[item.sinoVietnamese && `Hán Việt: ${item.sinoVietnamese}`, item.onYomi && `On: ${item.onYomi}`, item.kunYomi && `Kun: ${item.kunYomi}`, item.strokeCount ? `${item.strokeCount} nét` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      {item.strokeOrderImageUrl && <img src={item.strokeOrderImageUrl} alt="" className="mt-3 max-h-28 rounded-xl border border-[#F0E7EC]" />}
      {item.audioUrl && <audio className="mt-3 w-full" controls src={item.audioUrl} />}
    </article>
  );
}

function GrammarCard({ item }) {
  return (
    <article className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
      <h3 className="text-[16px] font-medium text-[#593B48]">{item.title}</h3>
      {item.structure && <p className="mt-2 text-[13px] text-[#AD3155]">{item.structure}</p>}
      {item.usageNotes && <p className="mt-2 text-[13px] leading-6 text-[#705261]">{item.usageNotes}</p>}
      {item.exampleSentence && <p className="mt-3 text-[13px] leading-6 text-[#3F3038]">{item.exampleSentence}</p>}
      {item.exampleSentenceMeaning && <p className="mt-1 text-[12px] leading-6 text-[#95828C]">{item.exampleSentenceMeaning}</p>}
    </article>
  );
}

const CARD = { vocab: VocabularyCard, kanji: KanjiCard, grammar: GrammarCard };

export default function LessonPlayer() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const lessonId = Number(params.get('lessonId')) || null;
  const [part, setPart] = useState('vocab');
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
  const Card = CARD[part];

  return (
    <LearnerShell pathname={pathname} breadcrumb="Bài học">
      <div className="min-h-screen bg-[#FAF8F7] font-['Nunito',sans-serif] text-[#3F3038]">
        <main className="mx-auto w-full max-w-[1120px] px-5 py-6 lg:px-7">
          <Link to="/lessons/" className={`text-[13px] font-medium text-[#AD3155] hover:underline ${focus}`}>Về danh sách bài</Link>
          {!lessonId && (
            <div className="mt-5 rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
              <p className="text-[15px] font-medium text-[#806371]">Chọn một bài từ danh sách</p>
              <p className="mt-1 text-[13px] leading-6 text-[#A18B97]">Mỗi bài mở ra từ vựng, Kanji và ngữ pháp đã được duyệt cùng nhau.</p>
            </div>
          )}
          {query.isPending && lessonId && <p className="mt-5 text-[13px] text-[#9A8390]">Đang tải bài…</p>}
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
                  {lesson.isCompleted ? 'Đã hoàn thành' : complete.isPending ? 'Đang lưu…' : 'Đánh dấu đã học'}
                </button>
              </header>
              {complete.isError && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{complete.error.message}</p>}
              <div className="mb-4 flex flex-wrap gap-2">
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
                      {item.label} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3">
                {items.map((item) => <Card key={item.vocabularyId || item.kanjiId || item.grammarPatternId} item={item} />)}
                {!items.length && (
                  <div className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-8">
                    <p className="text-[15px] font-medium text-[#806371]">Phần này chưa có nội dung trong bài</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </LearnerShell>
  );
}
