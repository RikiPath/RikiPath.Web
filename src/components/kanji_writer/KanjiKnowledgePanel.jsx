import { useEffect, useState } from 'react';
import KanjiWritingCanvas from './KanjiWritingCanvas.jsx';
import KanjiRecognitionPad from './KanjiRecognitionPad.jsx';
import { filterKanjiLibrary, matchRecognizedKanji } from '../../utils/kanjiLibrary.js';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#AD3155]';

export default function KanjiKnowledgePanel({ practice, scope = 'due', onScope, scores = [] }) {
  const { queue, loading, error, reload, selectItem } = practice;
  const [keyword, setKeyword] = useState('');
  const [recognized, setRecognized] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('guided');
  const [drawing, setDrawing] = useState(false);
  const selected = queue.find((item) => item.kanjiId === selectedId) || null;
  const filtered = filterKanjiLibrary(queue, keyword);
  const candidates = recognized === null ? null : matchRecognizedKanji(queue, recognized);
  const shown = candidates ?? filtered;

  useEffect(() => {
    if (!queue.length) return;
    if (queue.some((item) => item.kanjiId === selectedId)) return;
    const first = queue[0];
    setSelectedId(first.kanjiId);
    setMode('guided');
    selectItem(queue.findIndex((row) => row.kanjiId === first.kanjiId));
  }, [queue, selectedId, selectItem]);

  function choose(item) {
    setSelectedId(item.kanjiId);
    setMode('guided');
    selectItem(queue.findIndex((row) => row.kanjiId === item.kanjiId));
  }

  const recent = scores.slice(0, 4).map((item) => ({
    ...item,
    character: queue.find((row) => row.kanjiId === item.kanjiId)?.character,
  }));

  return (
    <section className="mx-auto max-w-6xl px-5 pb-10 pt-5 sm:px-7">
      <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#C4476A_0%,#AD3155_46%,#7C2340_100%)] text-white shadow-[0_16px_40px_rgba(173,49,85,0.22)]">
        <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="relative grid h-[108px] w-[108px] place-items-center rounded-[24px] bg-white text-[64px] leading-none text-[#AD3155] shadow-[0_10px_24px_rgba(80,16,36,0.18)]" style={{ fontFamily: '"Yu Gothic", sans-serif' }}>
            {selected?.character || '漢'}
            {selected?.isNew && (
              <span className="absolute -right-2 -top-2 rounded-full bg-[#2D282A] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">Mới</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70">LUYỆN VIẾT</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight">
              {selected ? (selected.sinoVietnamese || selected.meaning || 'Hán tự') : 'Chọn một chữ'}
            </h1>
            <p className="mt-1 text-[14px] text-white/80">
              {selected
                ? `${selected.meaning || 'Chưa có nghĩa'} · ${selected.strokeCount || '?'} nét`
                : 'Bảng chữ theo cấp độ mục tiêu của bạn.'}
            </p>
            {selected && (
              <dl className="mt-4 flex flex-wrap gap-2">
                {[
                  ['On', selected.onYomi],
                  ['Kun', selected.kunYomi],
                  ['HV', selected.sinoVietnamese],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-[92px] rounded-2xl bg-white/15 px-3 py-2">
                    <dt className="text-[10px] font-semibold tracking-[0.14em] text-white/65">{label}</dt>
                    <dd className="mt-0.5 text-[13px]">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {onScope && (
              <div className="inline-flex rounded-full bg-black/15 p-1">
                {[['due', 'Hôm nay'], ['all', 'Cả bảng']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onScope(value)}
                    className={`h-8 rounded-full px-3 text-[12px] ${scope === value ? 'bg-white font-semibold text-[#AD3155]' : 'text-white/80'} ${focus}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {recent.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <span key={`${item.kanjiId}-${item.completedAt}`} className="rounded-full bg-white/15 px-2.5 py-1 text-[12px]">
                    {item.character ? `${item.character} ` : ''}{item.score}
                    <span className="text-white/65"> · {item.correctStrokeCount}/{item.totalStrokeCount}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.15fr)]">
        <aside className="rounded-[24px] border border-[#E7DAE1] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#49353F]">Bảng chữ</h2>
            {!loading && !error && (
              <span className="text-[12px] text-[#8C7782]">{shown.length}/{queue.length}</span>
            )}
          </div>
          <label className="relative mt-3 block">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-[18px] text-[#AD3155]">search</span>
            <input
              id="kanji-library-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Kanji, nghĩa, âm đọc…"
              className="h-10 w-full rounded-xl border border-[#E7DAE1] bg-[#FFF8FA] pl-10 pr-3 text-[13px] text-[#49353F] outline-none focus:border-[#AD3155]"
            />
          </label>
          <button
            type="button"
            onClick={() => setDrawing((open) => !open)}
            className="mt-3 inline-flex h-8 items-center gap-1.5 text-[12px] font-medium text-[#AD3155]"
          >
            <span className="material-symbols-outlined text-[16px]">draw</span>
            {drawing ? 'Đóng ô vẽ tìm' : 'Tìm bằng nét vẽ'}
          </button>
          {drawing && (
            <div className="mt-2">
              <KanjiRecognitionPad onCandidates={setRecognized} />
              {candidates !== null && (
                <p className="mt-3 text-[12px] leading-5 text-[#8C7782]" aria-live="polite">
                  {candidates.length
                    ? 'Các chữ khớp nằm trong bảng bên dưới.'
                    : recognized.length
                      ? 'Chưa có chữ này trong cấp độ của bạn.'
                      : 'Chưa nhận ra chữ. Vẽ rõ một chữ rồi thử lại.'}
                </p>
              )}
            </div>
          )}
          <div className="mt-4">
            {loading ? (
              <p role="status" className="py-8 text-center text-[13px] text-[#8C7782]">Đang tải bảng chữ…</p>
            ) : error ? (
              <div role="alert" className="py-4">
                <p className="text-[13px] text-[#A33357]">{error}</p>
                <button type="button" onClick={reload} className="mt-2 text-[13px] font-semibold text-[#AD3155]">Thử lại</button>
              </div>
            ) : shown.length ? (
              <div className="grid max-h-[420px] grid-cols-5 gap-2 overflow-y-auto pr-1">
                {shown.map((item) => {
                  const active = selectedId === item.kanjiId;
                  return (
                    <button
                      key={item.kanjiId}
                      type="button"
                      onClick={() => choose(item)}
                      aria-label={`${item.character} · ${item.sinoVietnamese || item.meaning || 'Hán tự'}`}
                      aria-pressed={active}
                      title={[item.sinoVietnamese, item.meaning].filter(Boolean).join(' · ')}
                      className={`relative grid aspect-square place-items-center rounded-2xl border text-[26px] transition ${
                        active
                          ? 'border-[#AD3155] bg-[#AD3155] text-white shadow-[0_8px_16px_rgba(173,49,85,0.25)]'
                          : 'border-[#F0E4E9] bg-[#FFF8FA] text-[#49353F] hover:border-[#AD3155]'
                      }`}
                      style={{ fontFamily: '"Yu Gothic", sans-serif' }}
                    >
                      {item.character}
                      {item.isNew && !active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#AD3155]" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] leading-6 text-[#8C7782]">
                {queue.length ? 'Không có chữ khớp. Thử từ khóa khác.' : 'Chưa có Hán tự cho cấp độ này.'}
              </p>
            )}
          </div>
        </aside>

        <div className="rounded-[24px] border border-[#E7DAE1] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">VỞ VIẾT</p>
              <h2 className="mt-1 text-[18px] font-semibold text-[#49353F]">
                {selected ? `${selected.character} · ${mode === 'guided' ? 'vẽ theo dấu' : 'tự viết'}` : 'Chưa chọn chữ'}
              </h2>
            </div>
            {selected && (
              <div className="inline-flex rounded-full bg-[#F7F1F3] p-1">
                {[['guided', 'Theo dấu'], ['free', 'Tự viết']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={`h-8 rounded-full px-3 text-[12px] ${mode === value ? 'bg-[#AD3155] font-medium text-white' : 'text-[#8C7782]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected ? (
            <div
              className="mt-4 flex justify-center rounded-[22px] border border-[#F0E4E9] bg-[#FFF8FA] py-6"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(173,49,85,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(173,49,85,0.08) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            >
              <KanjiWritingCanvas key={`${selected.kanjiId}-${mode}`} character={selected.character} isNew={mode === 'guided'} mode={mode} />
            </div>
          ) : (
            <p className="mt-8 py-16 text-center text-[13px] text-[#8C7782]">Chọn một chữ ở bảng bên cạnh để mở vở.</p>
          )}
          <p className="mt-3 text-[12px] leading-5 text-[#8C7782]">
            {mode === 'guided' ? 'Nét mẫu chạy trước, sau đó bạn viết đúng thứ tự.' : 'Không hiện nét mẫu. Viết đúng hình và đúng hướng.'}
          </p>
        </div>
      </div>
    </section>
  );
}
