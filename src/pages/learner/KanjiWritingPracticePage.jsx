import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import KanjiWritingCanvas from '../../components/kanji_writer/KanjiWritingCanvas';
import { useKanjiWritingPractice } from '../../hooks/useKanjiWritingPractice.js';

const panelClass = 'rounded-3xl border border-[#eadfd9] bg-white shadow-sm';

const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

export default function KanjiWritingPracticePage() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const isKana = requestedType === 'hiragana' || requestedType === 'katakana';
  const kanaLabel = requestedType === 'katakana' ? 'Katakana' : 'Hiragana';
  const kanaChart = requestedType === 'katakana' ? KATAKANA : HIRAGANA;
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [mode, setMode] = useState('guided');
  const practice = useKanjiWritingPractice(10, { enabled: !isKana });
  const {
    queue, loading, error, lastResult, submitResult, selectItem, reload,
  } = practice;

  const selectedItem = selectedIndex === null ? null : queue[selectedIndex];
  const activeItem = selectedItem;

  useEffect(() => {
    setSelectedIndex(null);
    setMode('guided');
  }, [requestedType]);

  const chooseItem = (index) => {
    setSelectedIndex(index);
    selectItem(index);
    setMode('guided');
  };

  const handleComplete = (totalMistakes) => {
    const strokeCount = activeItem?.strokeCount || 1;
    const score = Math.max(0, Math.round(100 - (totalMistakes / strokeCount) * 40));
    submitResult({
      totalMistakes,
      score,
      practiceMode: mode,
    });
  };

  let content;
  if (isKana) {
    content = (
      <section className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-3xl font-bold text-[#2D282A]">Luyện {kanaLabel}</h1>
        <p className="mt-2 text-sm text-[#6F6669]">Chọn từng ký tự để bắt đầu luyện viết bảng chữ cái.</p>
        <div className="mt-6 rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {kanaChart.split('').map((character) => (
              <div key={character} className="flex h-14 items-center justify-center rounded-xl border border-[#eadfd9] bg-[#FAF7F5] text-2xl text-[#2D282A]">
                {character}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  } else if (loading) {
    content = <div className="mx-auto max-w-3xl px-6 py-16 text-center text-[#6F6669]">Đang tải Kanji cần luyện hôm nay...</div>;
  } else if (error) {
    content = (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={reload} className="mt-4 rounded-full bg-[#B52F55] px-5 py-2.5 text-sm font-bold text-white">Thử lại</button>
      </div>
    );
  } else if (!activeItem) {
    content = (
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C43D67]">Riki · Kanji</p>
          <h1 className="mt-2 text-3xl font-bold text-[#2D282A]">Chọn Kanji để luyện viết</h1>
          <p className="mt-2 text-sm text-[#6F6669]">Danh sách ưu tiên chữ đến hạn ôn, rồi bổ sung chữ mới.</p>
        </div>
        {queue.length === 0 ? (
          <div className={`${panelClass} p-8 text-center text-[#6F6669]`}>Hôm nay chưa có Kanji cần luyện.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {queue.map((item, index) => (
              <button key={item.kanjiId} type="button" onClick={() => chooseItem(index)} className={`${panelClass} group p-5 text-left transition hover:-translate-y-1 hover:border-[#e5a5b8] hover:shadow-md`}>
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-light text-[#2D282A]">{item.character}</span>
                  <span className="material-symbols-outlined text-[#C43D67] opacity-60 group-hover:opacity-100">edit</span>
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-semibold text-[#2D282A]">{item.meaning || 'Chưa có nghĩa'}</p>
                <p className="mt-2 text-xs text-[#8A6570]">{item.strokeCount || '?'} nét · {item.writingScore == null ? 'Chưa luyện' : `Điểm gần nhất: ${item.writingScore}/100`}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  } else {
    content = (
      <section className="mx-auto max-w-6xl px-6 py-8">
        <button type="button" onClick={() => setSelectedIndex(null)} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8A6570] hover:text-[#C43D67]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Danh sách Kanji
        </button>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${panelClass} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f0e5e1] pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C43D67]">Riki · Luyện viết</p>
                <h1 className="mt-2 text-3xl font-bold text-[#2D282A]">{activeItem.character}</h1>
                <p className="mt-1 text-sm text-[#6F6669]">{activeItem.meaning || 'Chưa có nghĩa'} · {activeItem.strokeCount || '?'} nét</p>
                {activeItem.writingScore != null && <p className="mt-1 text-xs font-semibold text-[#C43D67]">Điểm gần nhất: {activeItem.writingScore}/100</p>}
              </div>
              <div className="flex rounded-xl bg-[#FAF7F5] p-1">
                <button type="button" onClick={() => setMode('guided')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'guided' ? 'bg-white text-[#C43D67] shadow-sm' : 'text-[#8A6570]'}`}>Vẽ theo dấu</button>
                <button type="button" onClick={() => setMode('free')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'free' ? 'bg-white text-[#C43D67] shadow-sm' : 'text-[#8A6570]'}`}>Tự viết</button>
              </div>
            </div>
            <div className="mt-6 flex justify-center rounded-2xl bg-[#FAF7F5] p-4">
              <KanjiWritingCanvas key={`${activeItem.kanjiId}-${mode}`} character={activeItem.character} isNew={mode === 'guided'} mode={mode} onComplete={handleComplete} />
            </div>
            <p className="mt-4 text-center text-xs text-[#8A6570]">
              {mode === 'guided' ? 'Nét mờ và animation mẫu đang bật. Hãy vẽ theo từng nét.' : 'Mẫu đã ẩn. Hãy tự viết theo đúng thứ tự và hướng nét.'}
            </p>
            {lastResult && (
              <div className="mt-5 rounded-2xl border border-[#b7e3ce] bg-[#effaf3] p-4 text-center">
                <p className="text-sm font-bold text-[#167346]">Đã lưu điểm lần gần nhất: {lastResult.score ?? 0}/100</p>
                <p className="mt-1 text-xs text-[#4b7560]">Điểm mới sẽ ghi đè điểm cũ của Kanji này.</p>
              </div>
            )}
          </div>
          <aside className={`${panelClass} h-fit p-5`}>
            <h2 className="flex items-center gap-2 font-bold text-[#2D282A]"><span className="material-symbols-outlined text-[#C43D67]">translate</span>Thông tin ngôn ngữ</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div><p className="text-xs uppercase tracking-wider text-[#8A6570]">Âm On</p><p className="mt-1 font-semibold text-[#2D282A]">{activeItem.onYomi || 'Chưa cập nhật'}</p></div>
              <div><p className="text-xs uppercase tracking-wider text-[#8A6570]">Âm Kun</p><p className="mt-1 font-semibold text-[#2D282A]">{activeItem.kunYomi || 'Chưa cập nhật'}</p></div>
              <div className="rounded-2xl bg-[#FAF7F5] p-4"><p className="text-xs leading-5 text-[#6F6669]">Điểm được tính dựa trên độ lệch khi vẽ qua cơ chế kiểm tra nét của HanziWriter. Phiên bản này chưa dùng AI.</p></div>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb="Riki - Viết">
      <div className="min-h-[calc(100vh-4rem)] bg-[#FAF7F5]">{content}</div>
    </LearnerShell>
  );
}
