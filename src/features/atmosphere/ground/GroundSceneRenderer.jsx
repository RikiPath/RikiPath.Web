import { memo, useId } from 'react';
import { GROUND_H, GROUND_W, LAKE_PATH, LAYOUTS } from './groundLayouts.jsx';
import { MeadowTexture, Ridge, TreeLine } from './GroundElements.jsx';
import { rng } from './groundMath.js';
import { FOLIAGE } from './groundScene.js';

/** Fallen petals / leaves / snow drifts on the meadow (static decoration of the season). */
function SeasonalGround({ ground, F }) {
  const r = rng(0.913);
  if (ground.snow > 0.3) {
    return (
      <g fill="#FFFFFF" opacity={0.35 + ground.snow * 0.3}>
        {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx={580 + i * 80 + r() * 30} cy={262 + r() * 50} rx={22 + r() * 20} ry={2.2 + r() * 1.6} />)}
      </g>
    );
  }
  if (ground.foliageKey !== 'sakura' && ground.foliageKey !== 'momiji') return null;
  return (
    <g>
      {Array.from({ length: 34 }, (_, i) => {
        const x = 430 + r() * 770;
        const y = 262 + r() * 56;
        return <ellipse key={i} cx={x} cy={y} rx={2.4 + r() * 1.4} ry={1.3} fill={i % 3 ? F[2] : F[1]} transform={`rotate(${Math.round(r() * 180)} ${x} ${y})`} opacity="0.85" />;
      })}
    </g>
  );
}

/** Sun / moon light, fog and night ambience — the light the sky header casts on the ground. */
function GroundLighting({ ground, ids }) {
  return (
    <g pointerEvents="none">
      {ground.sunOpacity > 0.08 && (
        <ellipse cx={ground.sunX * GROUND_W} cy="178" rx="260" ry="90" fill={`url(#${ids.sun})`} opacity={Math.min(1, ground.sunOpacity * (0.35 + ground.golden * 0.9))} />
      )}
      {ground.water.moonGlint > 0.05 && <ellipse cx={ground.moonX * GROUND_W} cy="150" rx="220" ry="80" fill={`url(#${ids.moon})`} opacity={ground.water.moonGlint * 0.7} />}
      {ground.fog > 0 && <rect x="0" y="140" width={GROUND_W} height="140" fill={`url(#${ids.fog})`} opacity={Math.min(0.85, ground.fog * 0.75)} />}
      {ground.night > 0.2 && <rect width={GROUND_W} height={GROUND_H} fill="#0E1433" opacity={ground.night * 0.12} />}
    </g>
  );
}

function SceneSvg({ ground, title }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = {
    mtnFar: `${uid}mtn`,
    haze: `${uid}haze`,
    water: `${uid}water`,
    meadow: `${uid}meadow`,
    sky: `${uid}sky`,
    sun: `${uid}sun`,
    moon: `${uid}moon`,
    fog: `${uid}fog`,
    lakeClip: `${uid}lake`,
  };
  const P = ground.palette;
  const F = ground.foliage;
  const layout = LAYOUTS[ground.layout] || LAYOUTS.sakura_riverside;
  const greens = ground.foliageKey === 'winter' ? ground.foliage : FOLIAGE.green.map((_, i) => [P.grassShade, P.hillNear, P.grassLight][i] || P.grass);
  const ctx = {
    P,
    F,
    ids,
    greens,
    snow: ground.snow,
    lights: ground.lights,
    water: ground.water,
    richness: ground.richness,
    motion: ground.motion,
    petals: ground.foliageKey === 'sakura' || ground.foliageKey === 'momiji',
    flowersOn: ground.foliageKey !== 'winter' && ground.snow < 0.3,
  };
  return (
    <svg
      viewBox={`0 0 ${GROUND_W} ${GROUND_H}`}
      preserveAspectRatio="xMaxYMax slice"
      className="rp-ground-svg"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ground.sky.top} />
          <stop offset="1" stopColor={ground.sky.bottom} />
        </linearGradient>
        <linearGradient id={ids.mtnFar} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.mtnFar} />
          <stop offset="1" stopColor={P.haze} />
        </linearGradient>
        <linearGradient id={ids.haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.haze} stopOpacity="0" />
          <stop offset="1" stopColor={P.haze} stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={ids.water} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.water} />
          <stop offset="1" stopColor={P.waterDeep} />
        </linearGradient>
        <linearGradient id={ids.meadow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.grassLight} />
          <stop offset="1" stopColor={P.grass} />
        </linearGradient>
        <linearGradient id={ids.fog} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.haze} stopOpacity="0" />
          <stop offset="0.5" stopColor={P.haze} stopOpacity="0.9" />
          <stop offset="1" stopColor={P.haze} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={ids.sun}>
          <stop offset="0" stopColor="#FFE2B8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE2B8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.moon}>
          <stop offset="0" stopColor="#DDE6FF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#DDE6FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rp-g-lantern-glow">
          <stop offset="0" stopColor="#FFD27A" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#FFB45C" stopOpacity="0.32" />
          <stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.lakeClip}>
          <path d={LAKE_PATH} />
        </clipPath>
      </defs>

      {/* Sky continuation: the header's own horizon colours, so the ground sits under the same sky */}
      <rect width={GROUND_W} height={GROUND_H} fill={`url(#${ids.sky})`} />

      {/* 1. Distant mountains */}
      <g className="rp-g-layer rp-g-far">{layout.mountains(ctx)}</g>

      {/* 2. Background landscape: ridges and meadow */}
      <g className="rp-g-layer rp-g-mid">
        <Ridge W={GROUND_W} H={GROUND_H} y={192} amp={8} waves={2.4} fill={P.hillFar} crest={P.hillMidShade} seed={0.17} phase={0.6} />
        <TreeLine P={P} x1={430} x2={1200} y={200} seed={0.33} scale={0.55} density={1.2} foliage={ctx.petals ? F : null} snow={ground.snow} />
        <Ridge W={GROUND_W} H={GROUND_H} y={208} amp={9} waves={3.2} fill={P.hillMid} crest={P.hillMidShade} seed={0.29} phase={1.9} />
        <TreeLine P={P} x1={520} x2={1200} y={220} seed={0.58} scale={0.75} density={0.9} foliage={ctx.petals ? F : null} snow={ground.snow} />
        <Ridge W={GROUND_W} H={GROUND_H} y={226} amp={5} waves={2} fill={`url(#${ids.meadow})`} crest={P.grassShade} seed={0.43} phase={0.2} treeLine={false} />
        <MeadowTexture P={P} snow={ground.snow} flowers={ctx.flowersOn ? (ground.foliageKey === 'momiji' ? ['#F2B544', '#E2663A', '#FFFFFF'] : ['#FFFFFF', F[2], '#F7E58A']) : null} />
        {layout.slope?.(ctx)}
        {layout.street?.(ctx)}
        {/* 3. Midground architecture */}
        {layout.architecture?.(ctx)}
      </g>

      <g className="rp-g-layer rp-g-near">
        {/* 4. Water & terrain */}
        {layout.water?.(ctx)}
        {/* 5. Trees, rocks & vegetation */}
        {layout.vegetation?.(ctx)}
        {layout.lanterns?.(ctx)}
        {/* 6. Seasonal decorations on the ground */}
        <SeasonalGround ground={ground} F={F} />
        {/* 8. Foreground details */}
        {layout.foreground?.(ctx)}
      </g>

      {/* 7. Atmospheric light (drawn over the scene, under the readability overlay) */}
      <GroundLighting ground={ground} ids={ids} />
    </svg>
  );
}

/** Re-renders only when something visible changed (`ground.key` is minute-stable). */
const GroundSceneRenderer = memo(SceneSvg, (a, b) => a.ground.key === b.ground.key && a.title === b.title);
export default GroundSceneRenderer;
