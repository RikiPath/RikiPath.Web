import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { SakuraLoader } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function KanjiStrokeStrip({ character, active = -1, onLoaded, onError }) {
  const { tr, trf } = useLocale();
  const [result, setResult] = useState({ character: null, strokes: [], failed: false });
  const callbacksRef = useRef({ onLoaded, onError });
  useLayoutEffect(() => {
    callbacksRef.current = { onLoaded, onError };
  });

  const current = result.character === character ? result : { strokes: [], failed: false };
  const { strokes, failed } = current;

  useEffect(() => {
    if (!character) return undefined;
    let live = true;
    HanziWriter.loadCharacterData(character)
      .then((data) => {
        if (!live) return;
        const list = Array.isArray(data?.strokes) ? data.strokes : [];
        const isFailed = list.length === 0;
        setResult({ character, strokes: list, failed: isFailed });
        if (isFailed) callbacksRef.current.onError?.();
        else callbacksRef.current.onLoaded?.(list.length);
      })
      .catch(() => {
        if (!live) return;
        setResult({ character, strokes: [], failed: true });
        callbacksRef.current.onError?.();
      });
    return () => {
      live = false;
    };
  }, [character]);

  if (failed) {
    return (
      <p className="rounded-rp-input border border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-[13px] text-rp-text-2">
        {tr('Chưa tải được thứ tự nét. Kiểm tra mạng rồi thử lại.')}
      </p>
    );
  }
  if (!strokes.length) {
    return <SakuraLoader variant="inline" size={18} context="writing" label={tr('Đang tải thứ tự nét')} delay={160} />;
  }

  const transform = HanziWriter.getScalingTransform(68, 68, 8).transform;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {strokes.map((_, index) => {
          const isCurrent = index === active;
          return (
            <div
              key={index}
              className={`w-[76px] shrink-0 rounded-2xl border bg-rp-surface p-1 transition-colors ${
                isCurrent ? 'border-rp-brand-strong ring-2 ring-rp-brand-strong/20' : 'border-rp-line'
              }`}
            >
              <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
                <g transform={transform}>
                  {strokes.slice(0, index + 1).map((path, pathIndex) => (
                    <path key={pathIndex} d={path} fill={pathIndex === index ? '#B53D5C' : '#E2D4D9'} />
                  ))}
                </g>
              </svg>
              <p className="pb-0.5 text-center text-[11px] font-semibold text-rp-text-muted">{trf('Nét {0}', { 0: index + 1 })}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-rp-text-muted">{tr('Mỗi ô thêm một nét. Nét đang học màu đỏ.')}</p>
    </div>
  );
}
