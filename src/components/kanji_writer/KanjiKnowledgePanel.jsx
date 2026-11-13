import { useState } from 'react';
import KanjiWritingCanvas from './KanjiWritingCanvas.jsx';
import KanjiRecognitionPad from './KanjiRecognitionPad.jsx';
import { filterKanjiLibrary, matchRecognizedKanji } from '../../utils/kanjiLibrary.js';

const panel = 'rounded-3xl border border-[#eadfd9] bg-white shadow-sm';

export default function KanjiKnowledgePanel({ practice }) {
  const { queue, loading, error, reload, selectItem } = practice;
  const [keyword, setKeyword] = useState('');
  const [recognized, setRecognized] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [practicing, setPracticing] = useState(false);
  const [mode, setMode] = useState('guided');
  const selected = queue.find(item => item.kanjiId === selectedId);
  const filtered = filterKanjiLibrary(queue, keyword);
  const candidates = recognized === null ? null : matchRecognizedKanji(queue, recognized);

  function choose(item) {
    setSelectedId(item.kanjiId); setPracticing(false); setMode('guided');
    selectItem(queue.findIndex(row => row.kanjiId === item.kanjiId));
  }

  const characterButton = item => <button key={item.kanjiId} type="button" onClick={() => choose(item)}
    aria-label={`${item.character} · ${item.sinoVietnamese || item.meaning || 'Thông tin Kanji'}`}
    aria-pressed={selectedId === item.kanjiId}
    title={[item.sinoVietnamese, item.meaning].filter(Boolean).join(' · ')}
    className={`flex aspect-square items-center justify-center rounded-xl border text-3xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B52F55] ${selectedId === item.kanjiId ? 'border-[#B52F55] bg-[#B52F55] text-white' : 'border-[#efcbd5] bg-[#fff5f8] text-[#AD3155] hover:border-[#B52F55] hover:bg-[#fbe4ec]'}`}>
    {item.character}
  </button>;

  return <section className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7">
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B52F55]">Kho kiến thức · Kanji</p>
      <h1 className="mt-2 text-3xl font-bold text-[#2D282A]">Khám phá Hán tự</h1>
      <p className="mt-2 text-sm text-[#8A6570]">Tra cứu, xem thông tin và luyện viết Kanji thuộc cấp độ JLPT mục tiêu của bạn.</p>
    </header>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
      <aside className={`${panel} p-5 sm:p-6`}>
        <label htmlFor="kanji-library-search" className="text-lg font-bold text-[#2D282A]">Tìm kiếm Kanji</label>
        <div className="relative mt-3">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-3 text-[#B52F55]">search</span>
          <input id="kanji-library-search" value={keyword} onChange={event => setKeyword(event.target.value)}
            placeholder="Nhập Kanji hoặc âm Hán Việt…" className="w-full rounded-xl border border-[#eadfd9] bg-[#fffcfd] py-3 pl-11 pr-3 text-sm outline-none focus:border-[#B52F55]" />
        </div>
        <p className="mt-2 text-xs text-[#8A6570]">Có thể tìm bằng nghĩa, âm On/Kun hoặc Hán Việt không dấu.</p>
        <h2 className="mt-7 text-lg font-bold text-[#2D282A]">Hoặc vẽ Kanji</h2>
        <KanjiRecognitionPad onCandidates={setRecognized} />
        {candidates !== null && <div className="mt-5" aria-live="polite">
          <h3 className="text-sm font-semibold text-[#2D282A]">Kết quả nhận dạng trong cấp độ của bạn</h3>
          {candidates.length > 0 ? <div className="mt-3 grid grid-cols-5 gap-2">{candidates.map(characterButton)}</div>
            : <p className="mt-2 text-sm leading-6 text-[#8A6570]">{recognized.length ? 'Chữ nhận dạng chưa có trong danh sách cấp độ này. Hãy thử vẽ lại hoặc tìm bằng ô tìm kiếm.' : 'Chưa nhận dạng được chữ. Hãy vẽ rõ một chữ rồi thử lại.'}</p>}
        </div>}
      </aside>
      <div className="min-w-0 space-y-5">
        <div className={`${panel} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#2D282A]"><span aria-hidden="true" className="material-symbols-outlined text-[#B52F55]">translate</span>Kanji cùng cấp độ</h2>
            {!loading && !error && <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-semibold text-[#AD3155]">{filtered.length} / {queue.length} chữ</span>}
          </div>
          {loading ? <p role="status" className="py-10 text-center text-sm text-[#8A6570]">Đang tải danh sách Kanji…</p>
            : error ? <div role="alert" className="py-5"><p className="text-sm text-red-600">{error}</p><button type="button" onClick={reload} className="mt-3 text-sm font-semibold text-[#B52F55] underline">Thử lại</button></div>
              : filtered.length ? <div className="grid max-h-[480px] grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2 overflow-y-auto p-1">{filtered.map(characterButton)}</div>
                : <p className="py-10 text-center text-sm leading-6 text-[#8A6570]">{queue.length ? 'Không có Kanji phù hợp. Hãy thử từ khóa khác.' : 'Chưa có Kanji cho cấp độ mục tiêu. Hãy kiểm tra cài đặt tài khoản.'}</p>}
          <p className="mt-4 text-xs text-[#8A6570]">Chọn một chữ để xem nghĩa, âm đọc và số nét trước khi luyện viết.</p>
        </div>
        {selected && <section className={`${panel} p-5 sm:p-6`} aria-label={`Thông tin Kanji ${selected.character}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f5] text-6xl text-[#AD3155]">{selected.character}</span>
              <div><h2 className="text-xl font-bold text-[#2D282A]">{selected.sinoVietnamese || 'Thông tin Kanji'}</h2><p className="mt-2 text-sm text-[#6F6669]">{selected.meaning || 'Chưa có nghĩa'}</p><p className="mt-2 text-xs text-[#8A6570]">{selected.strokeCount || '?'} nét</p></div>
            </div>
            <button type="button" aria-label="Đóng thông tin Kanji" onClick={() => { setSelectedId(null); setPracticing(false); }} className="rounded-lg p-1 text-[#8A6570] hover:bg-[#fff0f5]"><span className="material-symbols-outlined">close</span></button>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-[#f0e5e1] pt-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-[#8A6570]">Âm On</dt><dd className="mt-1 text-base text-[#2D282A]">{selected.onYomi || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-[#8A6570]">Âm Kun</dt><dd className="mt-1 text-base text-[#2D282A]">{selected.kunYomi || 'Chưa cập nhật'}</dd></div>
          </dl>
          {!practicing ? <button type="button" onClick={() => setPracticing(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B52F55] px-4 py-2.5 text-sm font-semibold text-white"><span className="material-symbols-outlined text-lg">edit</span>Luyện viết chữ này</button>
            : <div className="mt-6 border-t border-[#f0e5e1] pt-5">
              <div className="flex flex-wrap items-center gap-2">
                {['guided', 'free'].map(option => <button key={option} type="button" onClick={() => setMode(option)} aria-pressed={mode === option} className={`rounded-xl px-3 py-2 text-sm ${mode === option ? 'bg-[#B52F55] text-white' : 'bg-[#fff0f5] text-[#AD3155]'}`}>{option === 'guided' ? 'Vẽ theo dấu' : 'Tự viết'}</button>)}
                <button type="button" onClick={() => setPracticing(false)} className="ml-auto text-sm text-[#8A6570] underline">Đóng luyện viết</button>
              </div>
              <div className="mt-5 flex justify-center overflow-x-auto"><KanjiWritingCanvas key={`${selected.kanjiId}-${mode}`} character={selected.character} isNew={mode === 'guided'} mode={mode} /></div>
            </div>}
        </section>}
      </div>
    </div>
  </section>;
}
