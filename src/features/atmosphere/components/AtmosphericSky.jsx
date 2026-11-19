import { memo, useEffect, useState } from 'react';
import { effectBudget, sceneKey } from '../atmosphereLogic.js';

// Decorative, aria-hidden header sky. Pure CSS/SVG: animations use transform/opacity only, never React state per frame.
// A scene change (time of day / weather) crossfades the new layer over the old one; the old one is dropped afterwards.

const CLOUD_PATH =
  'M22 38c-8.3 0-15-5.6-15-12.5S13.7 13 22 13c1.3 0 2.6.1 3.8.4C28.6 6.6 35.6 2 43.8 2c9.6 0 17.6 6.3 19.4 14.7.9-.1 1.8-.2 2.8-.2 8.3 0 15 5.4 15 12s-6.7 12-15 12H22z';
const PETAL_PATH = 'M6 0C9 2.5 11 5.6 11 8.6 11 11.6 8.8 13.4 6 13.4S1 11.6 1 8.6C1 5.6 3 2.5 6 0z';

// Stable pseudo-random layout so positions don't jump between renders.
const spread = (i, n, offset = 0) => `${Math.round(((i + 0.5) / n) * 100 * 0.92 + 4 + offset) % 100}%`;

function Clouds({ count, period }) {
  return Array.from({ length: count }, (_, i) => (
    <svg
      key={i}
      className="rp-sky-cloud"
      data-night={period === 'night' ? 'true' : undefined}
      viewBox="0 0 84 40"
      style={{
        left: spread(i, count, i % 2 ? 9 : -3),
        top: `${8 + ((i * 37) % 34)}%`,
        width: `${86 + ((i * 29) % 56)}px`,
        '--rp-drift-dur': `${70 + i * 17}s`,
        '--rp-drift-delay': `${-i * 13}s`,
      }}
    >
      <path d={CLOUD_PATH} />
    </svg>
  ));
}

function Stars({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="rp-sky-stars" data-set={i % 3} style={{ '--rp-twinkle-delay': `${-i * 1.7}s` }} />
  ));
}

function Petals({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <svg
      key={i}
      className="rp-sky-petal"
      viewBox="0 0 12 14"
      style={{
        left: spread(i, count, 5),
        '--rp-petal-dur': `${11 + (i % 3) * 3}s`,
        '--rp-petal-delay': `${-i * 2.3}s`,
        '--rp-petal-sway': `${i % 2 ? 26 : -22}px`,
      }}
    >
      <path d={PETAL_PATH} />
    </svg>
  ));
}

function Flakes({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className="rp-sky-flake"
      style={{ left: spread(i, count, 2), '--rp-flake-dur': `${7 + (i % 4) * 1.5}s`, '--rp-flake-delay': `${-i * 0.9}s` }}
    />
  ));
}

function Silhouette({ period }) {
  // Fuji + small torii, very faint; sits in the empty centre band (hidden on narrow screens).
  return (
    <svg className="rp-sky-fuji" data-period={period} viewBox="0 0 360 64" preserveAspectRatio="xMidYMax meet">
      <path d="M0 64 L118 64 L168 18 Q180 9 192 18 L246 64 L360 64 Z" className="rp-sky-fuji-body" />
      <path d="M160 25 Q170 19 176 22 L180 27 L184 22 Q190 19 200 25 L192 18 Q180 9 168 18 Z" className="rp-sky-fuji-snow" />
      <g className="rp-sky-torii" transform="translate(286 34)">
        <rect x="0" y="0" width="34" height="3.4" rx="1.2" />
        <rect x="3" y="6.5" width="28" height="2.4" />
        <rect x="6" y="2" width="3" height="28" />
        <rect x="25" y="2" width="3" height="28" />
      </g>
    </svg>
  );
}

const SkyLayer = memo(function SkyLayer({ scene, budget, state, onDone }) {
  const { period, condition } = scene;
  const daylight = scene.daylight !== false;
  return (
    <div
      className="rp-sky-layer"
      data-period={period}
      data-condition={condition}
      data-state={state}
      onAnimationEnd={state === 'in' ? (e) => e.target === e.currentTarget && onDone?.() : undefined}
    >
      {(period === 'morning' || period === 'afternoon') && condition !== 'thunder' && <span className="rp-sky-sun" />}
      {period === 'evening' && daylight && <span className="rp-sky-sun" data-low="true" />}
      {(period === 'night' || (period === 'evening' && !daylight)) && <span className="rp-sky-moon" />}
      {budget.stars > 0 && <Stars count={budget.stars} />}
      <Silhouette period={period} />
      <Clouds count={budget.clouds} period={period} />
      {budget.fog && (
        <>
          <span className="rp-sky-mist" />
          <span className="rp-sky-mist" data-second="true" />
        </>
      )}
      {budget.rain > 0 && Array.from({ length: budget.rain }, (_, i) => <span key={i} className="rp-sky-rain" data-layer={i} />)}
      {budget.flakes > 0 && <Flakes count={budget.flakes} />}
      {budget.petals > 0 && <Petals count={budget.petals} />}
      {budget.lightning && <span className="rp-sky-lightning" />}
      <span className="rp-sky-scrim" />
    </div>
  );
});

function usePageHidden() {
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.hidden : false));
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

export default function AtmosphericSky({ scene, intensity, decoration, reducedMotion }) {
  const key = sceneKey(scene);
  const [layers, setLayers] = useState(() => [{ key, scene, initial: true }]);
  const hidden = usePageHidden();
  // Derived-state update during render (no effect): a new scene key appends a fading-in layer; at most 2 layers live.
  if (layers[layers.length - 1].key !== key) {
    setLayers((prev) => [...prev.filter((l) => l.key !== key).slice(-1), { key, scene, initial: false }]);
  }
  return (
    <div
      className="rp-sky"
      aria-hidden="true"
      data-intensity={intensity}
      data-decoration={decoration}
      data-paused={hidden ? 'true' : 'false'}
      data-reduced={reducedMotion ? 'true' : 'false'}
    >
      {layers.map((layer, i) => {
        const last = i === layers.length - 1;
        const budget = effectBudget({ intensity, decoration, reducedMotion, condition: layer.scene.condition, period: layer.scene.period });
        return (
          <SkyLayer
            key={layer.key}
            scene={layer.scene}
            budget={budget}
            state={last ? (layer.initial ? 'static' : 'in') : 'out'}
            onDone={() => setLayers((prev) => prev.slice(-1))}
          />
        );
      })}
    </div>
  );
}
