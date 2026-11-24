import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CLASSIC_CLOUD_PATH, buildCloudField, visibleCount } from '../engine/clouds.js';
import { createParticleEngine, particleBudget } from '../engine/particles.js';

// RikiPath Dynamic Sky 2.0 — decorative, aria-hidden, pointer-events: none.
// The ORIGINAL sky is the base: its four painted periods + weather veils (crossfaded), stars, sun glow, Fuji & torii,
// classic cloud silhouette, CSS rain sheet and SVG sakura petals. 2.0 only adds layers on top of it:
// depth-layered drifting clouds, a clearer moon, near rain/snow drops (canvas), mist, storm glow and a seasonal branch.

const PETAL_PATH = 'M6 0C9 2.5 11 5.6 11 8.6 11 11.6 8.8 13.4 6 13.4S1 11.6 1 8.6C1 5.6 3 2.5 6 0z';
const PETAL_SLOTS = 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Stable layout so positions don't jump between renders (original helper).
const spread = (i, n, offset = 0) => `${Math.round(((i + 0.5) / n) * 100 * 0.92 + 4 + offset) % 100}%`;

function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener?.('change', cb);
      return () => mq?.removeEventListener?.('change', cb);
    },
    () => Boolean(window.matchMedia?.(query).matches),
    () => false,
  );
}

function usePageHidden() {
  const [hidden, setHidden] = useState(() => (typeof document !== 'undefined' ? document.hidden : false));
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

/* ------------------------------------------------------------------ original base sky (crossfaded on change) */
const BaseLayer = memo(function BaseLayer({ period, condition, state, onDone }) {
  return (
    <div
      className="rp-sky-layer"
      data-period={period}
      data-condition={condition}
      data-state={state}
      onAnimationEnd={state === 'in' ? (e) => e.target === e.currentTarget && onDone?.() : undefined}
    />
  );
});

function useBaseLayers(key, visual) {
  const [layers, setLayers] = useState(() => [{ key, ...visual, initial: true }]);
  // Derived-state update during render (original pattern): a new key appends a fading-in layer; at most 2 live.
  if (layers[layers.length - 1].key !== key) {
    setLayers((prev) => [...prev.filter((l) => l.key !== key).slice(-1), { key, ...visual, initial: false }]);
  }
  return [layers, () => setLayers((prev) => prev.slice(-1))];
}

function Stars({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className="rp-sky-stars" data-set={i % 3} style={{ '--rp-twinkle-delay': `${-i * 1.7}s` }} />
  ));
}

function Silhouette({ period }) {
  // Original Fuji + small torii, very faint; sits in the empty centre band (hidden on narrow screens).
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

/* ------------------------------------------------------------------ clouds */
const Cloud = memo(function Cloud({ slot, layer, on }) {
  const { shape } = slot;
  const style = {
    top: `${slot.top}%`,
    '--rp-cloud-dur': `${slot.duration}s`,
    '--rp-cloud-delay': `${slot.delay}s`,
    '--rp-cloud-rest': `${Math.round((-slot.delay / slot.duration) * 100) - 8}vw`,
  };
  const common = {
    className: 'rp-sky-cloud',
    'data-layer': layer,
    'data-on': on ? 'true' : 'false',
    'data-mobile-hidden': slot.mobileHidden ? 'true' : undefined,
    width: shape.width,
    height: shape.height,
    style,
  };
  if (shape.classic) {
    // Original silhouette with a soft underside shade and a lit top rim.
    const mirror = shape.flip ? 'translate(84 0) scale(-1 1)' : undefined;
    return (
      <svg {...common} viewBox="0 0 84 40" preserveAspectRatio="none">
        <g transform={mirror}>
          <path d={CLASSIC_CLOUD_PATH} className="rp-cloud-shade" transform="translate(0 2.2)" />
          <path d={CLASSIC_CLOUD_PATH} className="rp-cloud-body" />
          <path d={CLASSIC_CLOUD_PATH} className="rp-cloud-rim" transform="translate(4.2 1.6) scale(0.9 0.84)" />
        </g>
      </svg>
    );
  }
  const body = (
    <>
      {shape.circles.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
      <rect x={shape.baseRect.x} y={shape.baseRect.y} width={shape.baseRect.w} height={shape.baseRect.h} rx={shape.baseRect.r} />
    </>
  );
  return (
    <svg {...common} viewBox={`0 0 ${shape.width} ${shape.height}`}>
      <g className="rp-cloud-shade" transform="translate(0 2.4)">{body}</g>
      <g className="rp-cloud-body">{body}</g>
    </svg>
  );
});

/* ------------------------------------------------------------------ moon */
function MoonDisc({ phase }) {
  // Lit limb + terminator ellipse; waxing lights the right side (northern view), mirrored south of the equator.
  const r = 10;
  const rx = Math.abs(Math.cos(2 * Math.PI * phase)) * r;
  const waxing = phase < 0.5;
  const crescent = phase < 0.25 || phase > 0.75;
  const limb = waxing ? `M0 ${-r} A${r} ${r} 0 0 1 0 ${r}` : `M0 ${-r} A${r} ${r} 0 0 0 0 ${r}`;
  const sweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  return (
    <svg viewBox="-13 -13 26 26" width="26" height="26" className="rp-sky-moon-disc">
      <circle r={r} className="rp-sky-moon-dark" />
      <path d={`${limb} A${rx.toFixed(2)} ${r} 0 0 ${sweep} 0 ${-r}Z`} className="rp-sky-moon-lit" />
    </svg>
  );
}

/* ------------------------------------------------------------------ original sakura petals (SVG), wind-aware */
function Petals({ visible, windX, intensity }) {
  const slow = intensity === 'low' ? 3 : 0;
  return Array.from({ length: PETAL_SLOTS }, (_, i) => {
    const depth = (i * 7) % 3; // 0 far … 2 near
    const base = i % 2 ? 26 : -22;
    // With wind every petal drifts downwind; without it they sway both ways like the original.
    const sway = Math.abs(windX) > 0.2 ? Math.round(windX * 46 + (i % 2 ? 12 : -4)) : base;
    return (
      <svg
        key={i}
        className="rp-sky-petal"
        data-on={i < visible ? 'true' : 'false'}
        data-depth={depth}
        viewBox="0 0 12 14"
        style={{
          left: spread(i, PETAL_SLOTS, 5),
          '--rp-petal-dur': `${11 + (i % 3) * 3 + slow - depth}s`,
          '--rp-petal-delay': `${-i * 2.3}s`,
          '--rp-petal-sway': `${sway}px`,
          '--rp-petal-scale': (0.75 + depth * 0.2).toFixed(2),
        }}
      >
        <path d={PETAL_PATH} />
      </svg>
    );
  });
}

function SakuraBranch() {
  const blossom = (x, y, s = 1, k = 0) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s}) rotate(${k * 17})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-3.1" rx="2.3" ry="3.2" transform={`rotate(${a})`} className="rp-branch-petal" />
      ))}
      <circle r="1.2" className="rp-branch-heart" />
    </g>
  );
  return (
    <svg className="rp-sky-branch" viewBox="0 0 120 56" width="120" height="56">
      <path d="M120 2 C96 6 80 10 64 20 S36 34 14 38" className="rp-branch-wood" strokeWidth="2.4" />
      <path d="M78 13 C74 22 70 28 62 33" className="rp-branch-wood" strokeWidth="1.5" />
      <path d="M44 28 C42 34 40 40 34 46" className="rp-branch-wood" strokeWidth="1.2" />
      {blossom(102, 7, 1.05, 0)}
      {blossom(86, 14, 0.9, 1)}
      {blossom(68, 30, 1, 2)}
      {blossom(52, 26, 0.82, 3)}
      {blossom(36, 45, 0.9, 4)}
      {blossom(20, 37, 0.72, 1)}
      <circle cx="60" cy="36" r="1.7" className="rp-branch-bud" />
      <circle cx="28" cy="40" r="1.5" className="rp-branch-bud" />
    </svg>
  );
}

/** Cloud drift speed/direction from wind; capped so strong wind never makes the header frantic. */
function cloudRate(scene, intensity) {
  const { speed, x } = scene.wind;
  const factor = speed === null ? 1 : clamp(0.7 + speed / 22, 0.7, 3.2);
  const cross = 0.5 + 0.5 * Math.min(1, Math.abs(x));
  const sign = x < -0.15 ? -1 : 1;
  const pace = intensity === 'low' ? 0.8 : intensity === 'high' ? 1.1 : 1;
  return Math.round(sign * factor * cross * pace * 100) / 100;
}

const STAR_SETS = { low: 1, medium: 2, high: 3 };
const bandX = (p) => `(var(--rp-band-start, 33vw) + (var(--rp-band-end, 47vw) - var(--rp-band-start, 33vw)) * ${p})`;

export default function AtmosphericSky({ scene, intensity = 'low', reducedMotion = false, lowPower = false }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const hidden = usePageHidden();
  const compact = useMedia('(max-width: 639px)');
  const field = useMemo(() => buildCloudField(intensity), [intensity]);
  const { visual } = scene;
  const [baseLayers, dropOldLayer] = useBaseLayers(`${visual.period}:${visual.condition}`, visual);
  const tone = scene.isDark ? 'dark' : 'light';

  const rate = cloudRate(scene, intensity);
  // Wind changes speed/direction without restarting the drift (position kept; playbackRate only).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    root.querySelectorAll('.rp-sky-cloud').forEach((el) => {
      el.getAnimations?.().forEach((a) => {
        try {
          if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(rate);
          else a.playbackRate = rate;
        } catch {
          // Older engines: keep the default drift.
        }
      });
    });
  }, [rate, reducedMotion, field]);

  // Open band for sun/moon = gap between the breadcrumb's last item and the search field (written as CSS vars;
  // no React state). Falls back to 33–47vw when the header has no marked band.
  useEffect(() => {
    const root = rootRef.current;
    const band = root?.parentElement?.querySelector('[data-sky-open-band]');
    if (!root || !band || typeof ResizeObserver === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const sky = root.getBoundingClientRect();
      const box = band.getBoundingClientRect();
      const items = band.querySelectorAll('li');
      const textEnd = items.length ? items[items.length - 1].getBoundingClientRect().right : box.left;
      const end = box.right - 24 - sky.left;
      const free = end - (textEnd + 32 - sky.left);
      const start = Math.min(textEnd + 32 - sky.left, end - 40);
      // No open sky between breadcrumb and search (narrow header): hide the sun/moon discs instead of covering controls.
      root.dataset.band = free < 36 ? 'tight' : 'open';
      root.style.setProperty('--rp-band-start', `${Math.round(start)}px`);
      root.style.setProperty('--rp-band-end', `${Math.round(end)}px`);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(band);
    ro.observe(root);
    const mo = new MutationObserver(schedule);
    mo.observe(band, { childList: true, subtree: true, characterData: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  // One particle engine for the lifetime of the sky (never re-created on re-render).
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const engine = createParticleEngine(canvasRef.current);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const precipKind = scene.precip?.kind || '';
  const precipLevel = scene.precip?.level || '';
  const budget = useMemo(
    () =>
      particleBudget({
        precip: precipKind ? { kind: precipKind, level: precipLevel } : null,
        decoration: scene.decoration,
        decorationFactor: scene.decorationFactor,
        intensity,
        compact,
        reduced: reducedMotion,
      }),
    [precipKind, precipLevel, scene.decoration, scene.decorationFactor, intensity, compact, reducedMotion],
  );
  const windX = clamp(scene.wind.x * (scene.wind.speed === null ? 0.5 : clamp(scene.wind.speed / 18, 0.3, 2.6)), -2.6, 2.6);
  useEffect(() => {
    engineRef.current?.setConfig({
      rain: budget.rain,
      snow: budget.snow,
      leaves: budget.leaves,
      petals: 0,
      windX,
      tone,
      rainBoost: precipLevel === 'heavy' ? 1.25 : 1,
      fps: intensity === 'low' || compact || lowPower ? 30 : 60,
      reduced: reducedMotion,
    });
  }, [budget, windX, tone, precipLevel, intensity, compact, lowPower, reducedMotion]);

  const { sun, moonView } = scene;
  const showBranch = scene.season.decoration === 'sakura' && scene.decorationFactor > 0;
  const rainSheets = precipKind === 'rain' ? (precipLevel === 'light' ? 1 : 2) : 0;

  return (
    <div
      ref={rootRef}
      className="rp-sky"
      aria-hidden="true"
      data-intensity={intensity}
      data-period={visual.period}
      data-condition={visual.condition}
      data-tone={tone}
      data-paused={hidden ? 'true' : 'false'}
      data-reduced={reducedMotion ? 'true' : 'false'}
      style={{ '--rp-cloud-hi': scene.palette.vars['--rp-cloud-hi'], '--rp-cloud-lo': scene.palette.vars['--rp-cloud-lo'] }}
    >
      {baseLayers.map((layer, i) => {
        const last = i === baseLayers.length - 1;
        return <BaseLayer key={layer.key} period={layer.period} condition={layer.condition} state={last ? (layer.initial ? 'static' : 'in') : 'out'} onDone={dropOldLayer} />;
      })}
      <span className="rp-sky-starfield" style={{ opacity: scene.starsOpacity }}>
        <Stars count={STAR_SETS[intensity] || 1} />
      </span>
      <span
        className="rp-sky-sun"
        data-low={scene.solar.elevation < 8 ? 'true' : undefined}
        style={{ opacity: sun.opacity, transform: `translate3d(calc(${bandX(sun.p)} - 60px), ${sun.y - 60}px, 0)` }}
      />
      <span
        className="rp-sky-moon"
        style={{ opacity: moonView.opacity, transform: `translate3d(calc(${bandX(moonView.p)} - 13px), ${moonView.y - 13}px, 0)${moonView.southern ? ' scaleX(-1)' : ''}` }}
      >
        {moonView.opacity > 0 && <MoonDisc phase={scene.moon.phase} />}
      </span>
      <Silhouette period={visual.period} />
      {['far', 'mid'].map((layer) => {
        const slots = field[layer];
        const on = visibleCount(layer, slots.length, scene.cloudFraction);
        return slots.map((slot, i) => <Cloud key={slot.id} slot={slot} layer={layer} on={i < on} />);
      })}
      <span className="rp-sky-deck" style={{ opacity: clamp((scene.overcast - 0.35) / 0.6, 0, 1) }} />
      {field.near.map((slot, i) => (
        <Cloud key={slot.id} slot={slot} layer="near" on={i < visibleCount('near', field.near.length, scene.cloudFraction)} />
      ))}
      {scene.lightning && intensity !== 'low' && !reducedMotion && <span className="rp-sky-lightning" />}
      {Array.from({ length: 2 }, (_, i) => (
        <span key={i} className="rp-sky-rain" data-layer={i} data-level={precipLevel || undefined} data-on={i < rainSheets ? 'true' : 'false'} />
      ))}
      <canvas ref={canvasRef} className="rp-sky-particles" />
      <span className="rp-sky-mist" style={{ opacity: scene.fog }} />
      <span className="rp-sky-mist" data-second="true" style={{ opacity: scene.fog * 0.75 }} />
      <span className="rp-sky-petals" style={{ opacity: budget.petals > 0 && !reducedMotion ? 1 : 0 }}>
        <Petals visible={reducedMotion ? 0 : budget.petals} windX={windX} intensity={intensity} />
      </span>
      <span className="rp-sky-branch-wrap" style={{ opacity: showBranch ? (visual.period === 'night' ? 0.55 : 0.92) : 0 }}>
        {scene.season.decoration === 'sakura' && <SakuraBranch />}
      </span>
      <span className="rp-sky-scrim" />
    </div>
  );
}
