import { useEffect, useRef, useState } from 'react';
import kanaStrokes from '../../data/kanaStrokes.json';
import KanaAudioButton from './KanaAudioButton.jsx';

const emptyStrokes = [];

export default function KanaStrokeDialog({ item, type, onClose }) {
  const dialog = useRef(null);
  const paths = useRef([]);
  const [playback, setPlayback] = useState({ index: 0, all: true, run: 0 });
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const strokes = kanaStrokes[item.character] || emptyStrokes;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let animation;
    const frame = requestAnimationFrame(async () => {
      setPlaying(true);
      for (let index = 0; index < paths.current.length; index++) {
        const path = paths.current[index];
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = index < playback.index ? '0' : `${length}`;
      }
      for (let index = playback.index; index < strokes.length; index++) {
        if (cancelled) return;
        setCurrent(index);
        const path = paths.current[index];
        animation = path.animate([
          { strokeDashoffset: path.getTotalLength() }, { strokeDashoffset: 0 },
        ], { duration: 1000, easing: 'linear', fill: 'forwards' });
        try { await animation.finished; } catch { return; }
        if (cancelled) return;
        path.style.strokeDashoffset = '0'; animation.cancel();
        if (!playback.all) break;
      }
      if (!cancelled) setPlaying(false);
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); animation?.cancel(); };
  }, [playback, strokes]);

  function play(index = 0, all = true) {
    setPlayback(previous => ({ index, all, run: previous.run + 1 }));
  }

  return <dialog ref={dialog} onClose={onClose}
    onClick={event => {
      if (event.target !== dialog.current) return;
      const rect = dialog.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close();
    }}
    aria-labelledby="kana-stroke-title"
    className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[#eadfd9] bg-white p-6 text-[#2D282A] shadow-2xl backdrop:bg-[#2d1825]/45">
    <header className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#B52F55]">{type} · Thứ tự nét</p>
        <h2 id="kana-stroke-title" className="mt-2 text-2xl font-bold">Cách viết {item.character} <span className="text-lg font-normal text-[#8A6570]">/ {item.romaji} /</span></h2>
      </div>
      <button type="button" autoFocus aria-label="Đóng hướng dẫn viết chữ" onClick={() => dialog.current.close()} className="rounded-full p-2 text-[#8A6570] hover:bg-[#fff0f5] focus-visible:outline-2 focus-visible:outline-[#B52F55]"><span className="material-symbols-outlined">close</span></button>
    </header>
    <div className="mt-4"><KanaAudioButton audioUrl={item.audioUrl} character={item.character} /></div>
    {strokes.length ? <>
      <div className="mx-auto mt-5 max-w-[320px] overflow-hidden rounded-2xl border border-[#eadfd9] bg-[#fffcfd]">
        <svg viewBox="0 0 109 109" role="img" aria-label={`Hướng dẫn ${strokes.length} nét của chữ ${item.character}`} className="block aspect-square w-full">
          <path d="M54.5 0V109 M0 54.5H109 M0 0L109 109 M109 0L0 109" fill="none" stroke="#eadfd9" strokeWidth="0.35" strokeDasharray="2 2" />
          <g fill="none" stroke="#f0e5e8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">{strokes.map((d, index) => <path key={index} d={d} />)}</g>
          <g fill="none" stroke="#B52F55" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">{strokes.map((d, index) => <path key={index} ref={element => { paths.current[index] = element; }} d={d} style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }} />)}</g>
          {strokes.map((d, index) => {
            const point = d.match(/^M\s*([\d.-]+)[,\s]+([\d.-]+)/);
            return point ? <g key={index}>
              <circle cx={Number(point[1]) - 5} cy={Number(point[2]) - 5} r="4" fill={current === index ? '#B52F55' : '#fff'} stroke="#B52F55" strokeWidth="0.4" />
              <text x={Number(point[1]) - 5} y={Number(point[2]) - 3.5} textAnchor="middle" fontSize="4.5" fill={current === index ? '#fff' : '#B52F55'}>{index + 1}</text>
            </g> : null;
          })}
        </svg>
      </div>
      <p role="status" className="mt-4 text-center text-sm font-semibold text-[#B52F55]">{playing ? `Đang viết nét ${current + 1} / ${strokes.length}` : playback.all ? `Hoàn thành ${strokes.length} nét` : `Nét ${current + 1} / ${strokes.length}`}</p>
      <div className="mt-4 flex justify-center"><button type="button" onClick={() => play()} className="inline-flex items-center gap-2 rounded-xl bg-[#B52F55] px-4 py-2.5 text-sm font-semibold text-white"><span className="material-symbols-outlined text-lg">replay</span>Xem lại toàn bộ</button></div>
      <p className="mt-5 text-sm text-[#6F6669]">Chọn một nét để xem riêng:</p>
      <div className="mt-2 flex flex-wrap gap-2">{strokes.map((_, index) => <button key={index} type="button" onClick={() => play(index, false)} aria-pressed={current === index} className={`rounded-xl border px-3 py-2 text-sm ${current === index ? 'border-[#B52F55] bg-[#fff0f5] text-[#B52F55]' : 'border-[#eadfd9] text-[#6F6669]'}`}>Nét {index + 1}</button>)}</div>
      <p className="mt-4 text-xs leading-5 text-[#8A6570]">Theo dõi nét hồng và số thứ tự để biết điểm bắt đầu, hướng đi và thứ tự viết.</p>
    </> : <p className="mt-6 rounded-2xl bg-[#fff0f5] p-4 text-sm">Chưa có dữ liệu hướng dẫn nét cho ký tự này.</p>}
    <p className="mt-5 border-t border-[#f0e5e1] pt-3 text-[11px] text-[#8A6570]">Dữ liệu nét: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer" className="underline">KanjiVG · Ulrich Apel</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer" className="underline">CC BY-SA 3.0</a></p>
  </dialog>;
}
