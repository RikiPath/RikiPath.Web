import { useEffect, useRef, useState } from 'react';
import { recognizeDrawnKanji } from '../../api/kanjiWritingApi.js';

export default function KanjiRecognitionPad({ onCandidates }) {
  const canvas = useRef(null);
  const strokes = useRef([]);
  const drawing = useRef(false);
  const request = useRef(0);
  const mounted = useRef(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function redraw() {
    const context = canvas.current.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, 480, 480);
    context.strokeStyle = '#30272b'; context.lineWidth = 9;
    context.lineCap = 'round'; context.lineJoin = 'round';
    for (const points of strokes.current) {
      context.beginPath(); context.moveTo(...points[0]);
      if (points.length === 1) context.lineTo(points[0][0] + 0.1, points[0][1]);
      else for (const point of points.slice(1)) context.lineTo(...point);
      context.stroke();
    }
  }

  useEffect(() => {
    mounted.current = true;
    redraw();
    return () => { mounted.current = false; };
  }, []);

  function position(event) {
    const rect = canvas.current.getBoundingClientRect();
    return [(event.clientX - rect.left) * 480 / rect.width, (event.clientY - rect.top) * 480 / rect.height];
  }

  function start(event) {
    if (busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); canvas.current.setPointerCapture(event.pointerId);
    drawing.current = true; strokes.current.push([position(event)]);
    setCount(strokes.current.length); setError(''); onCandidates(null); redraw();
  }

  function move(event) {
    if (!drawing.current) return;
    strokes.current.at(-1).push(position(event)); redraw();
  }

  function clear(undo = false) {
    request.current++; drawing.current = false;
    if (undo) strokes.current.pop(); else strokes.current = [];
    setCount(strokes.current.length); setBusy(false); setError(''); onCandidates(null); redraw();
  }

  async function recognize() {
    if (!count || busy) return;
    const current = ++request.current; setBusy(true); setError('');
    try {
      const blob = await new Promise(resolve => canvas.current.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Không tạo được ảnh chữ vẽ. Hãy thử lại.');
      const result = await recognizeDrawnKanji(blob);
      if (mounted.current && request.current === current) onCandidates(Array.isArray(result) ? result : []);
    } catch (err) {
      if (mounted.current && request.current === current) setError(err.message || 'Không thể nhận dạng. Hãy thử lại.');
    } finally { if (mounted.current && request.current === current) setBusy(false); }
  }

  return <div>
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#eadfd9] bg-white">
      <canvas ref={canvas} width={480} height={480} aria-label="Vùng vẽ một chữ Kanji để tìm kiếm"
        className="block aspect-square w-full touch-none cursor-crosshair"
        onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }}
        onPointerCancel={() => { drawing.current = false; }} onLostPointerCapture={() => { drawing.current = false; }} />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[#eadfd9]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-[#eadfd9]" />
      {!count && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#a78d96]">Vẽ một chữ tại đây</span>}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={!count || busy} onClick={() => clear(true)} className="rounded-xl border border-[#eadfd9] px-3 py-2 text-sm disabled:opacity-40">Hoàn tác</button>
      <button type="button" disabled={!count && !busy} onClick={() => clear()} className="rounded-xl border border-[#eadfd9] px-3 py-2 text-sm disabled:opacity-40">Xóa nét</button>
      <button type="button" disabled={!count || busy} onClick={recognize} className="ml-auto rounded-xl bg-[#B52F55] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Đang nhận dạng…' : 'Nhận dạng'}</button>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#8A6570]">Vẽ một chữ rõ nét rồi bấm Nhận dạng. Ảnh chữ vẽ được gửi tới dịch vụ OCR, không lưu thành bài viết.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>;
}
