import { useRef } from 'react';

const tokenClass = 'rounded-lg border border-[#E6B7C6] bg-white px-3 py-2 text-sm text-[#49353F] hover:bg-[#FFF0F5]';

export default function OrderingAnswer({ question, value, onChange }) {
  const root = useRef(null);
  const drag = useRef(null);
  const touch = useRef(null);
  const suppressTap = useRef(false);
  const tokens = question.interactionData?.tokens ?? [];
  const star = question.interactionData?.starPosition;
  const chosen = Array.isArray(value) ? value : [];
  const remaining = [...chosen];
  const available = tokens.map((token, index) => {
    const used = remaining.indexOf(token);
    if (used < 0) return { token, index };
    remaining.splice(used, 1);
    return null;
  }).filter(Boolean);
  const unknown = question.options?.find(option => option.optionId === 0);

  function move(source, target) {
    const next = [...chosen];
    if (source.from === 'chosen') next.splice(source.index, 1);
    else if (target === 'bank') return;
    if (target !== 'bank') next.splice(Number(target), 0, source.token);
    onChange(next);
  }

  function handleDrop(event) {
    const source = drag.current;
    if (!source) return;
    event.preventDefault();
    drag.current = null;
    const target = event.target.closest('[data-ordering-target]');
    if (target) move(source, target.dataset.orderingTarget);
  }

  function dragToken(source) {
    return {
      draggable: true,
      onDragStart: event => {
        drag.current = source;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', source.token);
      },
      onDragEnd: () => { drag.current = null; },
      onPointerDown: event => {
        if (event.pointerType === 'mouse') return;
        touch.current = { source, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerCancel: () => { touch.current = null; },
      onPointerUp: event => {
        const start = touch.current;
        touch.current = null;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
        suppressTap.current = true;
        setTimeout(() => { suppressTap.current = false; }, 0);
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-ordering-target]');
        if (target && root.current?.contains(target)) move(start.source, target.dataset.orderingTarget);
      },
    };
  }

  function tap(action) {
    if (!suppressTap.current) action();
  }

  return <div ref={root} className="mt-4 space-y-3"
    onDragOver={event => { if (drag.current) event.preventDefault(); }} onDrop={handleDrop}>
    <p className="text-sm text-[#765E6B]">
      {star ? 'Kéo các cụm vào đúng thứ tự. Dấu ★ đánh dấu vị trí được chấm điểm.' : 'Kéo hoặc bấm để sắp xếp các cụm từ.'}
    </p>
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-[#EADFE5] bg-[#FCF8FA] p-2"
      role="group" aria-label="Câu đã sắp xếp" data-ordering-target={chosen.length}>
      {Array.from({ length: star ? tokens.length : chosen.length }, (_, index) => {
        const token = chosen[index];
        const source = { from: 'chosen', index, token };
        return <div key={index} data-ordering-target={index}
          className={'flex min-h-12 min-w-12 items-center gap-1 rounded-lg p-1 ' + (star === index + 1 ? 'border border-[#AD3155] bg-[#FFF0F5]' : 'border border-dashed border-[#EADFE5]')}>
          {star === index + 1 && <span className="px-1 text-[#AD3155]" aria-label="Vị trí dấu sao">★</span>}
          {token ? <>
            <button type="button" className={tokenClass + ' touch-none cursor-grab'} {...dragToken(source)}
              aria-label={'Bỏ cụm ' + (index + 1) + ' ' + token}
              onClick={() => tap(() => move(source, 'bank'))}>{token}</button>
            {[-1, 1].map(offset => <button key={offset} type="button"
              className="rounded px-1 text-[#AD3155] hover:bg-white disabled:opacity-30"
              aria-label={'Chuyển ' + token + (offset < 0 ? ' sang trái' : ' sang phải')}
              disabled={index + offset < 0 || index + offset >= chosen.length}
              onClick={() => move(source, index + offset)}>{offset < 0 ? '←' : '→'}</button>)}
          </> : <span className="px-1 text-sm text-[#826773]">{index + 1}</span>}
        </div>;
      })}
      {!star && !chosen.length && <span className="text-sm text-[#826773]">Thả cụm từ vào đây</span>}
    </div>
    <div className="flex min-h-10 flex-wrap gap-2" role="group" aria-label="Các cụm để sắp xếp" data-ordering-target="bank">
      {available.map(({ token, index }) => {
        const source = { from: 'bank', index, token };
        return <button type="button" key={index} className={tokenClass + ' touch-none cursor-grab'}
          {...dragToken(source)} onClick={() => tap(() => move(source, chosen.length))}>{token}</button>;
      })}
    </div>
    {unknown && <button type="button" aria-pressed={value === unknown.optionId}
      className={tokenClass + (value === unknown.optionId ? ' !border-[#AD3155] !bg-[#FFF0F5]' : '')}
      onClick={() => onChange(value === unknown.optionId ? [] : unknown.optionId)}>{unknown.content}</button>}
  </div>;
}
