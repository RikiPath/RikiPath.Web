// Reusable 2.5D vector elements of the Dynamic Ground Scene. Every element is drawn at its ground anchor (x, y),
// takes graded colours from the palette `P` (never hard-coded daylight colours), and uses faceted light/shade faces
// so the scene reads with depth. Deterministic: the same props always draw the same shapes.

import { rng } from './groundMath.js';

const f1 = (n) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ terrain */

/** Distant range: overlapping peaks with lit/shaded faces; optional snow-capped hero peak. */
export function MountainRange({ P, ids, W, base, peaks = [], hero = null, layer = 'far' }) {
  const fill = layer === 'far' ? `url(#${ids.mtnFar})` : P.mtnMid;
  const shade = layer === 'far' ? P.mtnFarShade : P.mtnMidShade;
  return (
    <g>
      {peaks.map((pk, i) => {
        const l = pk.x - pk.w / 2;
        const r = pk.x + pk.w / 2;
        const top = base - pk.h;
        const sx = pk.x + pk.w * 0.04;
        return (
          <g key={i}>
            <path d={`M${l} ${base} C ${l + pk.w * 0.22} ${base - pk.h * 0.35}, ${pk.x - pk.w * 0.12} ${top + pk.h * 0.08}, ${pk.x} ${top} C ${pk.x + pk.w * 0.12} ${top + pk.h * 0.1}, ${r - pk.w * 0.2} ${base - pk.h * 0.32}, ${r} ${base} Z`} fill={fill} />
            <path d={`M${sx} ${top + 2} C ${pk.x + pk.w * 0.14} ${top + pk.h * 0.16}, ${r - pk.w * 0.22} ${base - pk.h * 0.3}, ${r} ${base} L ${pk.x + pk.w * 0.1} ${base} C ${pk.x + pk.w * 0.12} ${base - pk.h * 0.4}, ${pk.x + pk.w * 0.02} ${top + pk.h * 0.4}, ${sx} ${top + 2} Z`} fill={shade} opacity="0.45" />
          </g>
        );
      })}
      {hero && <HeroPeak P={P} ids={ids} base={base} {...hero} />}
      {layer === 'far' && <rect x="0" y={base - 26} width={W} height="30" fill={`url(#${ids.haze})`} />}
    </g>
  );
}

/** Conical snow-capped peak (Fuji-like) with a jagged snow line and a shaded east face. */
function HeroPeak({ P, ids, base, x, h, w }) {
  const top = base - h;
  const capY = top + h * 0.3;
  const capL = x - w * 0.16;
  const capR = x + w * 0.17;
  return (
    <g>
      <path d={`M${x - w / 2} ${base} C ${x - w * 0.3} ${base - h * 0.25}, ${x - w * 0.1} ${top + h * 0.1}, ${x - w * 0.05} ${top} L ${x + w * 0.05} ${top} C ${x + w * 0.1} ${top + h * 0.1}, ${x + w * 0.3} ${base - h * 0.25}, ${x + w / 2} ${base} Z`} fill={`url(#${ids.mtnFar})`} />
      <path d={`M${x + w * 0.02} ${top} L ${x + w * 0.05} ${top} C ${x + w * 0.1} ${top + h * 0.1}, ${x + w * 0.3} ${base - h * 0.25}, ${x + w / 2} ${base} L ${x + w * 0.12} ${base} C ${x + w * 0.1} ${base - h * 0.4}, ${x + w * 0.05} ${top + h * 0.4}, ${x + w * 0.02} ${top} Z`} fill={P.mtnFarShade} opacity="0.5" />
      <path d={`M${x - w * 0.05} ${top} L ${x + w * 0.05} ${top} C ${x + w * 0.08} ${top + h * 0.12}, ${x + w * 0.13} ${capY - 4}, ${capR} ${capY} l -${f1(w * 0.03)} 7 -${f1(w * 0.035)} -9 -${f1(w * 0.03)} 11 -${f1(w * 0.04)} -10 -${f1(w * 0.03)} 12 -${f1(w * 0.035)} -11 -${f1(w * 0.03)} 9 -${f1(w * 0.03)} -8 L ${capL} ${capY} C ${x - w * 0.12} ${capY - 6}, ${x - w * 0.08} ${top + h * 0.12}, ${x - w * 0.05} ${top} Z`} fill={P.mtnSnow} />
      <path d={`M${x + w * 0.02} ${top + 1} L ${x + w * 0.05} ${top} C ${x + w * 0.08} ${top + h * 0.12}, ${x + w * 0.13} ${capY - 4}, ${capR} ${capY} l -${f1(w * 0.03)} 7 -${f1(w * 0.035)} -9 L ${x + w * 0.06} ${capY + 2} C ${x + w * 0.05} ${top + h * 0.2}, ${x + w * 0.03} ${top + h * 0.1}, ${x + w * 0.02} ${top + 1} Z`} fill={P.mtnSnowShade} />
    </g>
  );
}

/** Rolling ridge with a soft tree-line texture along its crest. */
export function Ridge({ W, H, y, amp = 14, waves = 3, fill, crest, seed = 0.3, phase = 0, treeLine = true }) {
  const r = rng(seed);
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const x = (W / steps) * i;
    const yy = y + Math.sin((i / steps) * Math.PI * waves + phase) * amp + Math.sin((i / steps) * Math.PI * waves * 2.3 + phase * 2) * amp * 0.3;
    pts.push([x, yy]);
  }
  let d = `M0 ${H} L0 ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q ${f1(x0 + (x1 - x0) / 2)} ${f1(y0)}, ${f1(x1)} ${f1(y1)}`;
  }
  d += ` L${W} ${H} Z`;
  const bumps = [];
  if (treeLine) {
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x, yy] = pts[i];
      for (let k = 0; k < 3; k += 1) {
        const bx = x + r() * (W / steps);
        bumps.push(<ellipse key={`${i}-${k}`} cx={f1(bx)} cy={f1(yy + 3)} rx={f1(6 + r() * 7)} ry={f1(4 + r() * 4)} fill={crest} opacity="0.55" />);
      }
    }
  }
  return (
    <g>
      {bumps}
      <path d={d} fill={fill} />
    </g>
  );
}

/**
 * Mid-ground tree line: a band of small conifers and rounded broadleaf crowns (two tones each) along a ridge,
 * giving the landscape depth between the mountains and the village.
 */
export function TreeLine({ P, x1, x2, y, density = 1, seed = 0.5, foliage = null, scale = 1, snow = 0 }) {
  const r = rng(seed);
  const items = [];
  let x = x1;
  let i = 0;
  while (x < x2) {
    const conifer = r() < 0.55;
    const s = (0.7 + r() * 0.5) * scale;
    const yy = y + (r() - 0.5) * 6;
    items.push({ x, y: yy, s, conifer, blossom: foliage && !conifer && r() < 0.4, i });
    x += (14 + r() * 16) / density;
    i += 1;
  }
  return (
    <g>
      {items.map((t) => (t.conifer ? (
        <g key={t.i} transform={`translate(${f1(t.x)} ${f1(t.y)}) scale(${f1(t.s)})`}>
          <path d="M0 -30 L 9 -4 L -9 -4 Z" fill={P.pine} />
          <path d="M0 -30 L 9 -4 L 2 -4 Z" fill={P.pineShade} />
          <path d="M0 -20 L 11 4 L -11 4 Z" fill={P.pine} />
          <path d="M0 -20 L 11 4 L 2 4 Z" fill={P.pineShade} />
          {snow > 0.3 && <path d="M0 -30 L 5 -16 L -5 -16 Z" fill="#F4F8FC" />}
        </g>
      ) : (
        <g key={t.i} transform={`translate(${f1(t.x)} ${f1(t.y)}) scale(${f1(t.s)})`}>
          <circle cx="2" cy="-10" r="11" fill={t.blossom ? foliage[0] : P.hillMidShade} />
          <circle cx="0" cy="-12" r="10" fill={t.blossom ? foliage[1] : P.hillMid} />
          <circle cx="-3" cy="-15" r="4.5" fill={t.blossom ? foliage[2] : P.grassLight} opacity="0.8" />
          {snow > 0.3 && <ellipse cx="0" cy="-20" rx="8" ry="3" fill="#F4F8FC" />}
        </g>
      )))}
    </g>
  );
}

/** Meadow texture: soft mown stripes and scattered wildflowers so the ground never reads as a flat fill. */
export function MeadowTexture({ P, flowers = null, seed = 0.71, x1 = 380, snow = 0 }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={`s${i}`} cx={x1 + 60 + i * 120 + r() * 40} cy={244 + (i % 3) * 22 + r() * 8} rx={70 + r() * 50} ry={5 + r() * 3} fill={snow > 0.3 ? '#FFFFFF' : P.grassLight} opacity="0.45" />
      ))}
      {flowers && Array.from({ length: 40 }, (_, i) => (
        <circle key={`f${i}`} cx={x1 + r() * (1200 - x1)} cy={238 + r() * 78} r={1.2 + r() * 1.3} fill={flowers[i % flowers.length]} opacity="0.85" />
      ))}
    </g>
  );
}

/** Winding river from the far bank to the bottom edge: banks, body, deep channel, glints and rain ripples. */
export function River({ P, ids, d, width = 60, glint = 0.5, moon = 0, ripples = 0, shimmer = true }) {
  return (
    <g>
      <path d={d} stroke={P.bankShade} strokeWidth={width + 16} strokeLinecap="round" fill="none" opacity="0.65" />
      <path d={d} stroke={P.bank} strokeWidth={width + 9} strokeLinecap="round" fill="none" />
      <path d={d} stroke={`url(#${ids.water})`} strokeWidth={width} strokeLinecap="round" fill="none" />
      <path d={d} stroke={P.waterDeep} strokeWidth={width * 0.34} strokeLinecap="round" fill="none" opacity="0.45" />
      {glint > 0.05 && (
        <g className={shimmer ? 'rp-g-shimmer' : undefined} opacity={0.35 + glint * 0.5}>
          <path d={d} stroke={P.waterHi} strokeWidth="2" strokeDasharray="14 30" strokeLinecap="round" fill="none" />
          <path d={d} stroke={P.waterHi} strokeWidth="1.4" strokeDasharray="6 44" strokeDashoffset="22" strokeLinecap="round" fill="none" transform="translate(9 3)" />
        </g>
      )}
      {moon > 0.05 && <path d={d} stroke="#FFF3C9" strokeWidth="2.4" strokeDasharray="4 18" strokeLinecap="round" fill="none" opacity={moon * 0.8} className={shimmer ? 'rp-g-shimmer' : undefined} />}
      {ripples > 0 && (
        <path d={d} stroke={P.waterHi} strokeWidth={width * 0.6} strokeDasharray="1.5 9" strokeLinecap="round" fill="none" opacity={0.25 + ripples * 0.3} className={shimmer ? 'rp-g-ripple' : undefined} />
      )}
    </g>
  );
}

/** Lake with a mirrored hero-peak reflection, sky tint and drifting glints. */
export function Lake({ P, ids, d, reflect = null, glint = 0.5, moon = 0, ripples = 0, shimmer = true, glintY = 0 }) {
  return (
    <g>
      <path d={d} fill={P.bank} transform="translate(0 4)" />
      <path d={d} fill={`url(#${ids.water})`} />
      {reflect && (
        <g clipPath={`url(#${ids.lakeClip})`} opacity="0.28">
          <path d={`M${reflect.x - reflect.w / 2} ${reflect.y} L ${reflect.x - reflect.w * 0.05} ${reflect.y + reflect.h} L ${reflect.x + reflect.w * 0.05} ${reflect.y + reflect.h} L ${reflect.x + reflect.w / 2} ${reflect.y} Z`} fill={P.mtnFar} />
          <path d={`M${reflect.x - reflect.w * 0.16} ${reflect.y + reflect.h * 0.7} L ${reflect.x - reflect.w * 0.05} ${reflect.y + reflect.h} L ${reflect.x + reflect.w * 0.05} ${reflect.y + reflect.h} L ${reflect.x + reflect.w * 0.17} ${reflect.y + reflect.h * 0.7} Z`} fill={P.mtnSnow} />
        </g>
      )}
      <g clipPath={`url(#${ids.lakeClip})`}>
        {glint > 0.05 && (
          <g className={shimmer ? 'rp-g-shimmer' : undefined} opacity={0.3 + glint * 0.55} stroke={P.waterHi} strokeLinecap="round">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${560 + i * 104 + (i % 2) * 30} ${glintY + 8 + (i % 3) * 12} h ${28 + (i % 3) * 16}`} strokeWidth="2" />
            ))}
          </g>
        )}
        {moon > 0.05 && (
          <g opacity={moon * 0.85} className={shimmer ? 'rp-g-shimmer' : undefined}>
            {[0, 1, 2, 3].map((i) => <path key={i} d={`M${740 - i * 6} ${glintY + 6 + i * 9} h ${46 - i * 8}`} stroke="#FFF3C9" strokeWidth="2.2" strokeLinecap="round" />)}
          </g>
        )}
        {ripples > 0 && (
          <g fill="none" stroke={P.waterHi} opacity={0.25 + ripples * 0.35} className={shimmer ? 'rp-g-ripple' : undefined}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <ellipse key={i} cx={500 + i * 88 + (i % 2) * 40} cy={glintY + 10 + (i % 3) * 14} rx="9" ry="2.6" strokeWidth="1.2" />)}
          </g>
        )}
      </g>
    </g>
  );
}

/** Flat stepping-stone / paved path following a list of points. */
export function StonePath({ P, points = [], size = 1 }) {
  return (
    <g>
      {points.map(([x, y, s = 1], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s * size})`}>
          <ellipse cx="0" cy="2.4" rx="17" ry="6.4" fill={P.pathShade} />
          <ellipse cx="0" cy="0" rx="16" ry="5.6" fill={P.path} />
          <ellipse cx="-4" cy="-1.4" rx="7" ry="1.8" fill={P.waterHi} opacity="0.35" />
        </g>
      ))}
    </g>
  );
}

export function GrassTufts({ P, items = [] }) {
  return (
    <g stroke={P.tuft} strokeLinecap="round" fill="none" strokeWidth="1.6">
      {items.map(([x, y, s = 1], i) => (
        <path key={i} d={`M${x} ${y} q ${-3 * s} ${-6 * s} ${-6 * s} ${-9 * s} M${x} ${y} q ${0.5 * s} ${-7 * s} ${0} ${-11 * s} M${x} ${y} q ${3 * s} ${-5 * s} ${7 * s} ${-8 * s}`} />
      ))}
    </g>
  );
}

/** Faceted rock: lit top face, shaded side, contact shadow (optional snow cap). */
export function Rock({ P, x, y, s = 1, flip = false, snow = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="2" cy="1" rx="24" ry="5" fill={P.shadow} opacity="0.16" />
      <path d="M-22 0 C -22 -10, -14 -20, -2 -22 C 10 -23, 20 -14, 22 0 Z" fill={P.rock} />
      <path d="M4 -22 C 14 -19, 21 -11, 22 0 L 6 0 C 8 -8, 7 -15, 4 -22 Z" fill={P.rockShade} opacity="0.85" />
      <path d="M-16 -9 C -13 -16, -6 -19, 1 -19 C -5 -15, -10 -12, -16 -9 Z" fill={P.rockHi} opacity="0.9" />
      {snow > 0.25 && <path d="M-18 -11 C -12 -21, 4 -25, 16 -15 C 8 -17, -6 -15, -18 -11 Z" fill="#F4F8FC" opacity={0.6 + snow * 0.4} />}
    </g>
  );
}

/** Rounded shrub of clustered leaves, optionally dotted with flowers (hydrangea / azalea). */
export function Bush({ P, x, y, s = 1, colors, flowers = null, seed = 0.5, snow = 0 }) {
  const r = rng(seed);
  const blobs = Array.from({ length: 7 }, (_, i) => ({ cx: -20 + i * 6.5 + (r() - 0.5) * 4, cy: -8 - Math.sin((i / 6) * Math.PI) * 10 + (r() - 0.5) * 4, rr: 8 + r() * 4 }));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="1" rx="28" ry="5" fill={P.shadow} opacity="0.15" />
      {blobs.map((b, i) => <circle key={`s${i}`} cx={b.cx + 2} cy={b.cy + 2} r={b.rr} fill={colors[0]} />)}
      {blobs.map((b, i) => <circle key={`b${i}`} cx={b.cx} cy={b.cy} r={b.rr * 0.9} fill={colors[1]} />)}
      {blobs.filter((_, i) => i % 2 === 0).map((b, i) => <circle key={`h${i}`} cx={b.cx - 2} cy={b.cy - 3} r={b.rr * 0.45} fill={colors[2]} />)}
      {flowers && blobs.map((b, i) => <circle key={`f${i}`} cx={b.cx + (r() - 0.5) * 6} cy={b.cy - 2} r="2.6" fill={flowers[i % flowers.length]} />)}
      {snow > 0.3 && blobs.map((b, i) => <ellipse key={`n${i}`} cx={b.cx} cy={b.cy - b.rr * 0.6} rx={b.rr * 0.7} ry={b.rr * 0.32} fill="#F6F9FC" />)}
    </g>
  );
}

/* ------------------------------------------------------------------ vegetation */

/**
 * Broad-canopy tree (sakura / momiji / summer green / snow): curved trunk with branches and a canopy built from
 * clustered puffs in three tones (shade, body, light) plus highlights, so it reads as a lit 2.5D volume.
 */
export function CanopyTree({ P, x, y, s = 1, foliage, seed = 0.4, spread = 1, snow = 0, sway = false, flip = false, petals = false }) {
  const r = rng(seed);
  const cw = 62 * spread;
  const clusters = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI;
    return { cx: Math.cos(a) * cw * (0.7 + r() * 0.3), cy: -96 - Math.sin(a) * 34 + (r() - 0.5) * 12, rr: 18 + r() * 10 };
  });
  clusters.push({ cx: -12, cy: -112, rr: 26 }, { cx: 16, cy: -104, rr: 24 }, { cx: 0, cy: -128, rr: 22 });
  const blossoms = Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * cw * 2, y: -80 - r() * 66, rr: 1.6 + r() * 1.6 }));
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="6" cy="2" rx={cw * 0.95} ry="8" fill={P.shadow} opacity="0.16" />
      <path d="M-7 0 C -5 -30, -12 -52, -4 -80 L 6 -80 C 2 -56, 9 -30, 9 0 Z" fill={P.trunk} />
      <path d="M2 -80 C 5 -56, 9 -30, 9 0 L 3 0 C 3 -30, 0 -56, 2 -80 Z" fill={P.trunkShade} />
      <path d="M-4 -70 C -18 -82, -30 -86, -44 -100 M 4 -74 C 16 -88, 30 -92, 44 -104 M 0 -78 C -2 -96, 4 -108, 2 -120" stroke={P.trunk} strokeWidth="5" strokeLinecap="round" fill="none" />
      <g className={sway ? 'rp-g-sway' : undefined}>
        {clusters.map((c, i) => <circle key={`s${i}`} cx={c.cx + 4} cy={c.cy + 5} r={c.rr} fill={foliage[0]} />)}
        {clusters.map((c, i) => <circle key={`b${i}`} cx={c.cx} cy={c.cy} r={c.rr * 0.92} fill={foliage[1]} />)}
        {clusters.map((c, i) => <circle key={`l${i}`} cx={c.cx - c.rr * 0.25} cy={c.cy - c.rr * 0.3} r={c.rr * 0.55} fill={foliage[2]} />)}
        {clusters.filter((_, i) => i % 3 === 0).map((c, i) => <circle key={`h${i}`} cx={c.cx - c.rr * 0.35} cy={c.cy - c.rr * 0.45} r={c.rr * 0.24} fill={foliage[3]} />)}
        {petals && blossoms.map((b, i) => <circle key={`p${i}`} cx={b.x} cy={b.y} r={b.rr} fill={foliage[3]} opacity="0.9" />)}
        {snow > 0.3 && clusters.filter((c) => c.cy < -100).map((c, i) => <ellipse key={`n${i}`} cx={c.cx - 2} cy={c.cy - c.rr * 0.62} rx={c.rr * 0.75} ry={c.rr * 0.3} fill="#F7FAFD" />)}
      </g>
    </g>
  );
}

/** Japanese black pine: leaning trunk with cloud-pruned foliage pads. */
export function PineTree({ P, x, y, s = 1, flip = false, snow = 0 }) {
  const pads = [
    [-30, -64, 34, 11], [22, -84, 30, 10], [-8, -104, 28, 10], [26, -120, 20, 8], [-22, -128, 18, 7],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="4" cy="2" rx="36" ry="6" fill={P.shadow} opacity="0.15" />
      <path d="M-5 0 C -2 -30, 10 -50, 2 -80 C -4 -100, 6 -116, 0 -132 L 5 -132 C 12 -114, 2 -100, 9 -80 C 17 -50, 5 -28, 6 0 Z" fill={P.trunk} />
      <path d="M-2 -60 L -26 -64 M 6 -80 L 20 -84 M 2 -100 L -6 -104" stroke={P.trunk} strokeWidth="3.4" strokeLinecap="round" />
      {pads.map(([cx, cy, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={cx + 2} cy={cy + 3} rx={rx} ry={ry} fill={P.pineShade} />
          <ellipse cx={cx} cy={cy} rx={rx * 0.95} ry={ry * 0.85} fill={P.pine} />
          <ellipse cx={cx - rx * 0.25} cy={cy - ry * 0.35} rx={rx * 0.5} ry={ry * 0.35} fill={P.pineHi} />
          {snow > 0.25 && <ellipse cx={cx} cy={cy - ry * 0.55} rx={rx * 0.85} ry={ry * 0.42} fill="#F6F9FC" />}
        </g>
      ))}
    </g>
  );
}

/** Bamboo grove: back and front stalk rows with nodes and leaf sprays; the front row sways. */
export function BambooGrove({ P, x, y, w = 180, h = 240, count = 9, seed = 0.6, sway = false, snow = 0 }) {
  const r = rng(seed);
  const stalks = Array.from({ length: count }, (_, i) => ({ sx: (w / count) * i + r() * 10, sw: 5 + r() * 3, sh: h * (0.8 + r() * 0.2), back: i % 2 === 1, lean: (r() - 0.5) * 10 }));
  const drawStalk = (st, i) => {
    const top = -st.sh;
    const color = st.back ? P.bambooDark : P.bamboo;
    const nodes = Array.from({ length: Math.floor(st.sh / 32) }, (_, k) => -24 - k * 32);
    return (
      <g key={i} transform={`translate(${st.sx} 0)`}>
        <path d={`M0 0 Q ${st.lean / 2} ${top / 2}, ${st.lean} ${top} l ${st.sw} 0 Q ${st.lean / 2 + st.sw} ${top / 2}, ${st.sw} 0 Z`} fill={color} />
        {!st.back && <path d={`M1.2 0 Q ${st.lean / 2 + 1.2} ${top / 2}, ${st.lean + 1.2} ${top} l 1.4 0 Q ${st.lean / 2 + 2.6} ${top / 2}, 2.6 0 Z`} fill={P.bambooHi} opacity="0.8" />}
        {nodes.map((ny) => <rect key={ny} x={(st.lean * ny) / top - 0.5} y={ny} width={st.sw + 1} height="2" rx="1" fill={P.bambooDark} opacity="0.7" />)}
        {[0.35, 0.6, 0.85].map((t, k) => {
          const lx = st.lean * t + st.sw / 2;
          const ly = top * t;
          const dir = (i + k) % 2 ? 1 : -1;
          return (
            <g key={k} fill={st.back ? P.bambooDark : P.bambooLeaf}>
              <path d={`M${lx} ${ly} q ${dir * 14} -4 ${dir * 26} 4 q ${dir * -12} 2 ${dir * -26} -4 Z`} />
              <path d={`M${lx} ${ly + 4} q ${dir * 12} 2 ${dir * 22} 12 q ${dir * -12} -3 ${dir * -22} -12 Z`} />
              {snow > 0.3 && <path d={`M${lx} ${ly - 1} q ${dir * 12} -4 ${dir * 22} 2`} stroke="#F6F9FC" strokeWidth="2" fill="none" strokeLinecap="round" />}
            </g>
          );
        })}
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={w / 2} cy="2" rx={w * 0.6} ry="8" fill={P.shadow} opacity="0.16" />
      {stalks.filter((st) => st.back).map(drawStalk)}
      <g className={sway ? 'rp-g-sway-slow' : undefined}>{stalks.filter((st) => !st.back).map(drawStalk)}</g>
    </g>
  );
}

/* ------------------------------------------------------------------ architecture */

/** Lit window glow (night / dusk), behind shoji paper. */
function WindowGlow({ x, y, w, h, lights }) {
  if (lights < 0.12) return null;
  return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w * 1.4} ry={h * 1.3} fill="#FFC86B" opacity={lights * 0.35} className="rp-g-window" />;
}

/**
 * Minka / machiya house in 2.5D: stone plinth, plaster front with timber frame, shaded side wall, hip roof with a lit
 * front plane and a darker side plane, eaves shadow, shoji windows that glow after dark, optional noren and snow.
 */
export function House({ P, x, y, s = 1, flip = false, lights = 0, snow = 0, noren = true, wide = 1, storey = 1 }) {
  const W = 110 * wide;
  const D = 34;
  const wallH = 34 + (storey - 1) * 26;
  const roofH = 38;
  const shoji = lights > 0.12 ? mix2(P.shoji, '#FFD98F', lights) : P.shoji;
  const wins = Math.max(2, Math.round(3 * wide));
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx={W * 0.15} cy="3" rx={W * 0.75} ry="9" fill={P.shadow} opacity="0.18" />
      {/* plinth */}
      <path d={`M${-W / 2 - 4} 0 h ${W + 8} l ${D * 0.6} -${D * 0.35} h -${W + 8} Z`} fill={P.stoneShade} transform={`translate(0 ${0})`} />
      <rect x={-W / 2 - 4} y="-6" width={W + 8} height="7" fill={P.stone} />
      {/* side wall (receding to the right) */}
      <path d={`M${W / 2} -6 l ${D} -${D * 0.45} v -${wallH} l -${D} ${D * 0.45} Z`} fill={P.plasterShade} />
      <path d={`M${W / 2} -6 l ${D} -${D * 0.45} v -6 l -${D} ${D * 0.45} Z`} fill={P.woodDark} opacity="0.6" />
      {/* front wall */}
      <rect x={-W / 2} y={-6 - wallH} width={W} height={wallH} fill={P.plaster} />
      <rect x={-W / 2} y={-12} width={W} height="6" fill={P.wood} />
      <rect x={-W / 2} y={-6 - wallH} width={W} height="5" fill={P.wood} />
      {Array.from({ length: wins + 1 }, (_, i) => (
        <rect key={i} x={-W / 2 + (W / wins) * i - 2} y={-6 - wallH} width="4" height={wallH} fill={P.wood} />
      ))}
      {Array.from({ length: wins }, (_, i) => {
        const wx = -W / 2 + (W / wins) * i + 6;
        const ww = W / wins - 12;
        const wy = -6 - wallH + 9;
        const wh = Math.min(20, wallH - 22);
        if (noren && i === Math.floor(wins / 2)) {
          return (
            <g key={i}>
              <rect x={wx} y={wy} width={ww} height={wallH - 15} fill={P.woodDark} />
              <WindowGlow x={wx} y={wy} w={ww} h={wallH - 15} lights={lights * 0.7} />
              <path d={`M${wx - 2} ${wy} h ${ww + 4} v 14 h -${(ww + 4) / 3} v -3 h -${(ww + 4) / 3} v 3 h -${(ww + 4) / 3} Z`} fill={P.noren} />
            </g>
          );
        }
        return (
          <g key={i}>
            <WindowGlow x={wx} y={wy} w={ww} h={wh} lights={lights} />
            <rect x={wx} y={wy} width={ww} height={wh} fill={shoji} stroke={P.woodDark} strokeWidth="1.2" />
            <path d={`M${wx + ww / 3} ${wy} v ${wh} M${wx + (2 * ww) / 3} ${wy} v ${wh} M${wx} ${wy + wh / 2} h ${ww}`} stroke={P.woodDark} strokeWidth="0.8" opacity="0.7" />
          </g>
        );
      })}
      {/* engawa veranda */}
      <path d={`M${-W / 2 - 6} -12 h ${W + 12} l 3 6 h -${W + 18} Z`} fill={P.engawa} />
      {/* roof */}
      <g transform={`translate(0 ${-6 - wallH})`}>
        <path d={`M${-W / 2 - 16} 4 L ${-W / 2 + 18} ${-roofH} L ${W / 2 - 6} ${-roofH} L ${W / 2 + 14} 4 Z`} fill={P.roofHi} />
        <path d={`M${W / 2 - 6} ${-roofH} L ${W / 2 + D - 4} ${-roofH - D * 0.3} L ${W / 2 + D + 16} ${-D * 0.45 + 2} L ${W / 2 + 14} 4 Z`} fill={P.roofShade} />
        <path d={`M${-W / 2 + 18} ${-roofH} L ${W / 2 - 6} ${-roofH} L ${W / 2 + D - 4} ${-roofH - D * 0.3} L ${-W / 2 + 26 + D * 0.4} ${-roofH - D * 0.3} Z`} fill={P.roof} />
        <path d={`M${-W / 2 + 22} ${-roofH - 1} L ${W / 2 + D - 6} ${-roofH - D * 0.3 - 1}`} stroke={P.roofEdge} strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${-W / 2 - 12 + ((W + 22) / 9) * i} 3 L ${-W / 2 + 20 + ((W - 26) / 9) * i} ${-roofH + 2}`} stroke={P.roof} strokeWidth="1" opacity="0.5" />
        ))}
        <path d={`M${-W / 2 - 18} 4 Q ${-W / 2 - 22} 0 ${-W / 2 - 24} -3 M${W / 2 + D + 16} ${-D * 0.45 + 2} q 4 -2 6 -6`} stroke={P.roofEdge} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <rect x={-W / 2 - 16} y="3" width={W + 30} height="3.5" fill={P.roofEdge} />
        {snow > 0.25 && (
          <g fill="#F6F9FC">
            <path d={`M${-W / 2 + 16} ${-roofH + 2} L ${W / 2 - 4} ${-roofH + 2} L ${W / 2 + 6} ${-roofH * 0.35} Q ${0} ${-roofH * 0.25} ${-W / 2 + 2} ${-roofH * 0.38} Z`} opacity={0.75 + snow * 0.25} />
            <path d={`M${-W / 2 + 22} ${-roofH - 1} L ${W / 2 + D - 6} ${-roofH - D * 0.3 - 1} L ${W / 2 + D - 10} ${-roofH - D * 0.3 + 6} L ${-W / 2 + 22} ${-roofH + 5} Z`} />
          </g>
        )}
      </g>
    </g>
  );
}

function mix2(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(a);
  const B = h(b);
  const k = Math.max(0, Math.min(1, t));
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Five-storey style pagoda (three visible tiers) with upturned eaves and a spire. */
export function Pagoda({ P, x, y, s = 1, tiers = 3, snow = 0, lights = 0 }) {
  const levels = Array.from({ length: tiers }, (_, i) => i);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="2" rx="40" ry="6" fill={P.shadow} opacity="0.16" />
      <rect x="-30" y="-6" width="60" height="7" fill={P.stone} />
      {levels.map((i) => {
        const w = 44 - i * 8;
        const by = -6 - i * 34;
        return (
          <g key={i}>
            <rect x={-w / 2} y={by - 22} width={w} height="22" fill={P.torii} />
            <rect x={w / 2 - 7} y={by - 22} width="7" height="22" fill={P.toriiShade} />
            <rect x={-w / 2 + 6} y={by - 17} width={w - 18} height="9" fill={lights > 0.12 ? '#FFD27E' : P.woodDark} opacity={lights > 0.12 ? 0.6 + lights * 0.4 : 0.8} />
            <path d={`M${-w / 2 - 16} ${by - 20} Q ${-w / 2 - 4} ${by - 24} ${-w / 2 + 2} ${by - 34} L ${w / 2 - 2} ${by - 34} Q ${w / 2 + 4} ${by - 24} ${w / 2 + 16} ${by - 20} Z`} fill={P.roof} />
            <path d={`M${0} ${by - 34} L ${w / 2 - 2} ${by - 34} Q ${w / 2 + 4} ${by - 24} ${w / 2 + 16} ${by - 20} L ${6} ${by - 22} Z`} fill={P.roofShade} />
            <path d={`M${-w / 2 - 16} ${by - 20} q -3 -2 -5 -6 M${w / 2 + 16} ${by - 20} q 3 -2 5 -6`} stroke={P.roofEdge} strokeWidth="2" strokeLinecap="round" fill="none" />
            {snow > 0.25 && <path d={`M${-w / 2 + 2} ${by - 34} L ${w / 2 - 2} ${by - 34} L ${w / 2 + 6} ${by - 27} Q 0 ${by - 25} ${-w / 2 - 6} ${by - 27} Z`} fill="#F6F9FC" />}
          </g>
        );
      })}
      <path d={`M0 ${-6 - tiers * 34} v -30`} stroke={P.roofEdge} strokeWidth="2.4" />
      {[0, 1, 2, 3].map((k) => <circle key={k} cx="0" cy={-12 - tiers * 34 - k * 5} r="2.6" fill={P.roofEdge} />)}
    </g>
  );
}

/** Small shrine hall on a stone base with steps and a gable roof. */
export function Shrine({ P, x, y, s = 1, snow = 0, lights = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="6" cy="2" rx="46" ry="7" fill={P.shadow} opacity="0.17" />
      <path d="M-40 0 h 80 l 10 -8 h -80 Z" fill={P.stoneShade} />
      <rect x="-40" y="-8" width="80" height="8" fill={P.stone} />
      <path d="M-10 0 h 20 v -8 h -20 Z M-8 -2 h 16" fill={P.stoneDark} stroke={P.stone} strokeWidth="1" />
      <rect x="-30" y="-40" width="60" height="32" fill={P.wood} />
      <path d="M30 -40 l 12 -6 v 30 l -12 8 Z" fill={P.woodDark} />
      <rect x="-22" y="-34" width="44" height="22" fill={lights > 0.12 ? mix2(P.shoji, '#FFD98F', lights) : P.shoji} stroke={P.woodDark} strokeWidth="1.2" />
      <path d="M-11 -34 v 22 M0 -34 v 22 M11 -34 v 22" stroke={P.woodDark} strokeWidth="0.9" />
      <rect x="-6" y="-46" width="12" height="7" fill={P.torii} />
      <path d="M-48 -38 Q -30 -44 -26 -62 L 26 -62 Q 30 -44 48 -38 L 54 -44 Q 34 -48 30 -66 L -30 -66 Q -34 -48 -54 -44 Z" fill={P.roof} />
      <path d="M0 -66 L 30 -66 Q 34 -48 54 -44 L 48 -38 Q 30 -44 26 -62 L 0 -62 Z" fill={P.roofShade} />
      <path d="M-30 -66 L 30 -66" stroke={P.roofEdge} strokeWidth="3" strokeLinecap="round" />
      <path d="M-22 -66 l -6 -8 M22 -66 l 6 -8" stroke={P.roofEdge} strokeWidth="2.4" strokeLinecap="round" />
      {snow > 0.25 && <path d="M-30 -66 L 30 -66 L 40 -52 Q 0 -48 -40 -52 Z" fill="#F6F9FC" />}
    </g>
  );
}

/** Torii gate with lit/shaded faces; `reflect` mirrors it faintly into water below the anchor. */
export function Torii({ P, x, y, s = 1, reflect = false, snow = 0 }) {
  const gate = (
    <>
      <rect x="-34" y="-82" width="8" height="82" fill={P.torii} />
      <rect x="-28" y="-82" width="2.6" height="82" fill={P.toriiShade} />
      <rect x="26" y="-82" width="8" height="82" fill={P.torii} />
      <rect x="32" y="-82" width="2.6" height="82" fill={P.toriiShade} />
      <rect x="-36" y="-6" width="12" height="6" fill={P.toriiDark} />
      <rect x="24" y="-6" width="12" height="6" fill={P.toriiDark} />
      <rect x="-44" y="-70" width="88" height="7" fill={P.torii} />
      <rect x="-44" y="-65" width="88" height="2" fill={P.toriiShade} />
      <rect x="-4" y="-80" width="8" height="11" fill={P.toriiShade} />
      <path d="M-56 -86 Q 0 -96 56 -86 L 60 -94 Q 0 -104 -60 -94 Z" fill={P.toriiDark} />
      <path d="M-52 -84 Q 0 -93 52 -84 L 54 -88 Q 0 -97 -54 -88 Z" fill={P.torii} />
      {snow > 0.25 && <path d="M-60 -94 Q 0 -104 60 -94 L 58 -98 Q 0 -108 -58 -98 Z" fill="#F6F9FC" />}
    </>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="2" rx="46" ry="5" fill={P.shadow} opacity="0.15" />
      {gate}
      {reflect && <g transform="scale(1 -0.55)" opacity="0.22">{gate}</g>}
    </g>
  );
}

/** Arched (taiko) bridge with railing posts, underside shadow and an optional water reflection. */
export function ArchBridge({ P, x, y, w = 150, s = 1, reflect = true, snow = 0 }) {
  const h = w * 0.22;
  const deck = `M${-w / 2} 0 Q 0 ${-h * 2} ${w / 2} 0`;
  const posts = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const px = -w / 2 + w * t;
    const py = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (-h * 2) + t * t * 0;
    return [px, py];
  });
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {reflect && <path d={`M${-w / 2} 4 Q 0 ${h * 1.2} ${w / 2} 4`} stroke={P.torii} strokeWidth="5" fill="none" opacity="0.18" />}
      <path d={`M${-w / 2} 2 Q 0 ${-h * 1.6} ${w / 2} 2 L ${w / 2 - 8} 2 Q 0 ${-h * 1.2} ${-w / 2 + 8} 2 Z`} fill={P.toriiDark} opacity="0.85" />
      <path d={deck} stroke={P.woodDark} strokeWidth="9" fill="none" />
      <path d={deck} stroke={P.torii} strokeWidth="6" fill="none" />
      {snow > 0.25 && <path d={deck} stroke="#F6F9FC" strokeWidth="3" fill="none" transform="translate(0 -3)" />}
      {posts.map(([px, py], i) => <rect key={i} x={px - 1.8} y={py - 18} width="3.6" height="16" fill={P.torii} />)}
      <path d={deck} stroke={P.torii} strokeWidth="3" fill="none" transform="translate(0 -16)" />
      <path d={deck} stroke={P.toriiShade} strokeWidth="1.2" fill="none" transform="translate(0 -13)" />
      {[posts[0], posts[8]].map(([px, py], i) => <circle key={i} cx={px} cy={py - 19} r="3" fill={P.lanternRed} />)}
    </g>
  );
}

/** Zigzag plank bridge (yatsuhashi) across water. */
export function PlankBridge({ P, x, y, s = 1 }) {
  const planks = [[0, 0, 70, 12], [62, -10, 66, -14], [120, -22, 70, 8]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {planks.map(([px, py, len, rot], i) => (
        <g key={i} transform={`translate(${px} ${py}) rotate(${rot})`}>
          <rect x="0" y="2" width={len} height="7" fill={P.woodDark} opacity="0.6" />
          <rect x="0" y="0" width={len} height="7" fill={P.engawa} />
          <rect x="0" y="0" width={len} height="2" fill={P.plaster} opacity="0.4" />
          <rect x="4" y="7" width="3" height="9" fill={P.woodDark} />
          <rect x={len - 7} y="7" width="3" height="9" fill={P.woodDark} />
        </g>
      ))}
    </g>
  );
}

/** Stone lantern (tōrō) — its fire box glows after dusk. */
export function StoneLantern({ P, x, y, s = 1, lights = 0, snow = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="3" cy="1" rx="18" ry="4" fill={P.shadow} opacity="0.16" />
      {lights > 0.12 && <circle cx="0" cy="-40" r="26" fill={`url(#rp-g-lantern-glow)`} opacity={lights} className="rp-g-lantern" />}
      <path d="M-12 0 h 24 l -3 -6 h -18 Z" fill={P.stoneShade} />
      <rect x="-4" y="-26" width="8" height="21" fill={P.stone} />
      <rect x="1" y="-26" width="3" height="21" fill={P.stoneShade} />
      <path d="M-12 -26 h 24 l -3 -5 h -18 Z" fill={P.stoneShade} />
      <rect x="-9" y="-46" width="18" height="15" fill={P.stone} />
      <rect x="-5" y="-43" width="10" height="9" fill={lights > 0.12 ? '#FFD27A' : P.stoneDark} />
      <path d="M-17 -46 Q 0 -56 17 -46 L 12 -52 Q 0 -60 -12 -52 Z" fill={P.stoneShade} />
      <path d="M0 -58 l 4 -6 l -4 -3 l -4 3 Z" fill={P.stoneShade} />
      {snow > 0.25 && <path d="M-15 -50 Q 0 -60 15 -50 Q 0 -54 -15 -50 Z" fill="#F6F9FC" />}
    </g>
  );
}

/** String of paper lanterns (chōchin) on a sagging cord — glow at dusk and night. */
export function LanternString({ P, x1, y1, x2, y2, count = 6, lights = 0, sag = 16 }) {
  const mx = (x1 + x2) / 2;
  const my = Math.max(y1, y2) + sag;
  const at = (t) => ({ x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2 });
  return (
    <g>
      <path d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke={P.toriiDark} strokeWidth="1.2" fill="none" />
      {Array.from({ length: count }, (_, i) => {
        const p = at((i + 1) / (count + 1));
        const red = i % 2 === 0;
        return (
          <g key={i} transform={`translate(${f1(p.x)} ${f1(p.y)})`} className={lights > 0.12 ? 'rp-g-lantern' : undefined} style={{ animationDelay: `${(i % 4) * 0.7}s` }}>
            {lights > 0.12 && <circle cx="0" cy="9" r="16" fill="url(#rp-g-lantern-glow)" opacity={lights * 0.9} />}
            <path d="M0 0 v 3" stroke={P.toriiDark} strokeWidth="1" />
            <ellipse cx="0" cy="10" rx="6.5" ry="8" fill={red ? P.lanternRed : P.lanternWhite} />
            <path d="M-6 8 h 12 M-6.4 11 h 12.8" stroke={red ? P.toriiShade : P.stoneShade} strokeWidth="0.7" opacity="0.7" />
            <rect x="-3.5" y="2" width="7" height="2" fill={P.toriiDark} />
            <rect x="-3.5" y="17" width="7" height="2" fill={P.toriiDark} />
          </g>
        );
      })}
    </g>
  );
}
