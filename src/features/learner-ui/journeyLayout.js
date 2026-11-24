// Computed layout for the dashboard lesson map: node positions, label width and title length depend on the real
// number of steps in a scene and on the drawing size — never on a fixed 4-slot template.

/** Small stable hash → 0..1 (same scene key = same decoration every render). */
export function seedOf(key) {
  let h = 2166136261;
  const str = String(key ?? '');
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Road patterns (y offsets as a function of position; positive = lower on screen):
 *  - gentle  (A, Gentle Wave): one soft swell — ordinary lesson stages.
 *  - rolling (B, Rolling Hills): alternating peaks and valleys — 4–6 steps spread evenly.
 *  - ascent  (C, Mountain Ascent): climbs from lower-left to upper-right — ends on a milestone/test.
 *  - valley  (D, Valley Journey): dips through a valley and climbs out — review or mixed stages.
 */
export const PATTERNS = ['gentle', 'rolling', 'ascent', 'valley'];

function patternOffset(pattern, i, k, amp, phase) {
  const t = k > 1 ? i / (k - 1) : 0.5;
  switch (pattern) {
    case 'rolling':
      return amp * Math.sin(phase + i * Math.PI * 0.95);
    case 'ascent':
      return amp * 0.95 * (1 - 2 * t) + amp * 0.22 * Math.sin(i * Math.PI + phase);
    case 'valley':
      return amp * (Math.sin(Math.PI * t) * 1.15 - 0.45) + amp * 0.18 * Math.sin(i * Math.PI * 1.1 + phase);
    case 'gentle':
    default:
      return amp * 0.62 * Math.sin(phase + Math.PI * 1.2 * t);
  }
}

/**
 * Stable pattern for a scene: milestone at the end → ascent; mostly review → valley; otherwise the landscape's
 * character (village rolls, momiji/snowy climb, bamboo winds), never the same as the previous scene.
 * @param {{ key: string, landscape?: string, kinds?: string[], previous?: string|null }} input
 */
export function choosePattern({ key, landscape = '', kinds = [], previous = null }) {
  const k = kinds.length;
  const last = kinds[k - 1];
  let pattern;
  if (k >= 3 && (last === 'quiz' || last === 'checkpoint')) pattern = 'ascent';
  else if (k >= 2 && kinds.filter((x) => x === 'review').length >= k / 2) pattern = 'valley';
  else {
    const byLandscape = { village: 'rolling', momiji: 'ascent', snowy: 'ascent', bamboo: 'valley', lakeside: 'gentle', sakura_garden: 'gentle', festival: 'rolling' };
    pattern = byLandscape[landscape] || PATTERNS[Math.floor(seedOf(`pattern:${key}`) * PATTERNS.length) % PATTERNS.length];
  }
  if (pattern === 'rolling' && k > 0 && k < 4) pattern = 'gentle';
  if (pattern === previous) pattern = PATTERNS[(PATTERNS.indexOf(pattern) + 1) % PATTERNS.length];
  if (pattern === 'rolling' && k > 0 && k < 4) pattern = 'valley';
  return pattern;
}

const LABEL_H = 34;
const BELOW_TOP = 19; // label rect, relative to the node centre (clears the raised platform + its shadow)
const ABOVE_TOP = -78;
const TAG_ABOVE = -52; // "Bạn đang ở đây" tag centre when the label is below

/**
 * Node positions for a scene.
 * x: evenly spread across the width minus safe margins (label half-width + edge padding + nav gutter).
 * y: band centre + pattern offset, clamped to the safe band where a label fits above OR below the node.
 * @param {{ count: number, width: number, height: number, pattern?: string, variant?: number, seed?: number,
 *   compact?: boolean, gutter?: number }} input
 * @returns {{ points: {x:number,y:number}[], labelWidth: number, titleChars: number, pattern: string }}
 */
export function layoutNodes({ count, width, height, pattern, variant = 0, seed = 0.5, compact = false, gutter = 0 }) {
  const k = Math.max(0, Math.floor(count));
  const pat = PATTERNS.includes(pattern) ? pattern : PATTERNS[((variant % 4) + 4) % 4];
  if (k === 0) return { points: [], labelWidth: 0, titleChars: 0, pattern: pat };
  const maxLabel = 150;
  const minLabel = compact ? 104 : 96;
  let labelWidth = maxLabel;
  let margin = labelWidth / 2 + 14 + gutter;
  let spacing = k > 1 ? (width - 2 * margin) / (k - 1) : 0;
  if (k > 1 && spacing - 10 < labelWidth) {
    labelWidth = Math.max(minLabel, Math.min(maxLabel, spacing - 10));
    margin = labelWidth / 2 + 14 + gutter;
    spacing = (width - 2 * margin) / (k - 1);
  }
  // Safe band: a label above needs ~80 units over the node, a label below ~54 under it.
  const yMin = 80;
  const yMax = height - 58;
  const centre = (yMin + yMax) / 2 + 4;
  const room = (yMax - yMin) / 2;
  // Amplitude scales with the real safe band (taller scenes → livelier road); gentle stays calm, hills/climbs bolder.
  const shape = { gentle: 0.55, rolling: 0.9, ascent: 0.85, valley: 0.85 }[pat];
  const amp = room * shape * (compact ? 0.8 : 1) * (k <= 2 ? 0.55 : 1);
  const phase = 0.3 + seed * 1.2;
  const points = Array.from({ length: k }, (_, i) => {
    const x = k === 1 ? width / 2 : margin + spacing * i;
    const y = centre + patternOffset(pat, i, k, amp, phase);
    return { x: Math.round(x), y: Math.round(Math.min(yMax, Math.max(yMin, y))) };
  });
  return { points, labelWidth: Math.round(labelWidth), titleChars: Math.max(10, Math.floor((labelWidth - 14) / 6.4)), pattern: pat };
}

/** Catmull–Rom spline through the points, converted to cubic Béziers (C1-continuous: no kinks at nodes). */
function catmullRomSegments(pts) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    segs.push({ a: p1, c1, c2, b: p2 });
  }
  return segs;
}

const fmt = (n) => Math.round(n * 10) / 10;
const segD = (s, move = true) => `${move ? `M ${fmt(s.a.x)} ${fmt(s.a.y)} ` : ''}C ${fmt(s.c1.x)} ${fmt(s.c1.y)}, ${fmt(s.c2.x)} ${fmt(s.c2.y)}, ${fmt(s.b.x)} ${fmt(s.b.y)}`;

/**
 * The road through a scene. Extends past the edges when the journey continues in a neighbour scene.
 * @returns {{ d: string, segments: object[], nodeSegments: string[], samples: {x:number,y:number}[], lead: string|null }}
 *   nodeSegments[i] = path from node i to node i+1 (for the green "travelled" tint); lead = edge → first node.
 */
export function buildRoad(points, { width, fromLeft = false, toRight = false } = {}) {
  if (!points.length) return { d: '', segments: [], nodeSegments: [], samples: [], lead: null };
  const pts = [...points];
  if (fromLeft) pts.unshift({ x: -24, y: points[0].y + 14 });
  if (toRight) pts.push({ x: width + 24, y: points[points.length - 1].y - 12 });
  const segments = catmullRomSegments(pts);
  const offset = fromLeft ? 1 : 0;
  const d = segments.length ? segments.map((s, i) => segD(s, i === 0)).join(' ') : `M ${pts[0].x} ${pts[0].y}`;
  const nodeSegments = points.slice(0, -1).map((_, i) => segD(segments[i + offset]));
  const samples = [];
  for (const s of segments) {
    for (let j = 0; j <= 16; j += 1) {
      const t = j / 16;
      const u = 1 - t;
      samples.push({
        x: u * u * u * s.a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.b.x,
        y: u * u * u * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.b.y,
      });
    }
  }
  return {
    d,
    segments,
    nodeSegments,
    samples,
    lead: fromLeft && segments.length ? segD(segments[0]) : null,
    trail: toRight && segments.length > points.length - 1 + offset ? segD(segments[segments.length - 1]) : null,
    offset,
  };
}

const REACHED = new Set(['done', 'current', 'in_progress']);

/**
 * Contiguous journey progress inside one scene — NOT "every completed node". Progress runs from the scene start
 * through the unbroken run of completed checkpoints and stops at the first checkpoint that is not completed:
 *  - that checkpoint is the current / in-progress one → progress ends exactly on it;
 *  - it is upcoming/locked → progress ends on the last completed checkpoint before it (a later out-of-order
 *    completion never paints the road between);
 *  - every checkpoint completed → progress continues to the scene edge when the journey goes on (trail).
 * The lead-in from the previous scene counts only when this scene has been entered (first node reached).
 * @param {string[]} statuses
 * @param {{ hasPrev?: boolean, hasNext?: boolean }} opts
 * @returns {{ endIndex: number, includeLead: boolean, includeTrail: boolean, allDone: boolean, started: boolean }}
 *   endIndex = index of the checkpoint the progress ends on (−1 = no progress in this scene).
 */
export function resolveJourneyProgress(statuses = [], { hasPrev = false, hasNext = false } = {}) {
  const n = statuses.length;
  let k = 0;
  while (k < n && statuses[k] === 'done') k += 1;
  const allDone = n > 0 && k === n;
  let endIndex;
  if (allDone) endIndex = n - 1;
  else if (REACHED.has(statuses[k])) endIndex = k;
  else endIndex = k - 1;
  const started = endIndex >= 0;
  return {
    endIndex,
    includeLead: Boolean(hasPrev && started),
    includeTrail: Boolean(hasNext && allDone),
    allDone,
    started,
  };
}

/**
 * One continuous SVG path for the travelled part, built from the SAME Bézier segments as the road (shared geometry):
 * it starts at the scene start (or the left edge when the lead-in counts) and ends exactly on the progress checkpoint
 * (or the right edge when the whole scene is completed). Returns '' when nothing has been travelled.
 */
export function buildProgressPath(roadGeo, progress) {
  if (!roadGeo?.segments?.length || !progress) return '';
  const { offset = 0, segments } = roadGeo;
  const from = progress.includeLead ? 0 : offset;
  let to = progress.endIndex >= 0 ? offset + progress.endIndex : -1; // exclusive segment index = node index + offset
  if (progress.includeTrail) to = segments.length;
  if (to <= from) return '';
  return segments.slice(from, to).map((seg, i) => segD(seg, i === 0)).join(' ');
}

/** Backwards-compatible: road path string only. */
export function windingPath(points, opts) {
  return buildRoad(points, opts).d;
}

/** Label rectangle (absolute) for a node and side; `current` lifts the "you are here" tag above an upper label. */
export function labelRect(point, side, labelWidth) {
  const top = point.y + (side === 'below' ? BELOW_TOP : ABOVE_TOP);
  return { x1: point.x - labelWidth / 2, x2: point.x + labelWidth / 2, y1: top, y2: top + LABEL_H };
}

/**
 * Smart label placement (above / below each node), decided from coordinates — not index parity:
 *  1. preference: peak → below, valley → above, slope → the side with more room; the current node prefers
 *     below so its "Bạn đang ở đây" tag keeps the space above;
 *  2. a side is infeasible if the label would leave the scene (4-unit margin) or, for the current node above,
 *     its tag would leave the top;
 *  3. among feasible sides, pick the fewest road crossings (road samples inside the label box ± 9), then the
 *     preference; neighbouring labels never overlap because x-spacing ≥ label width + 4.
 * @returns {('above'|'below')[]}
 */
export function placeLabels({ points, labelWidth, width, height, samples = [], currentIndex = -1 }) {
  return points.map((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    const higherThanNeighbours = (!prev || p.y < prev.y - 4) && (!next || p.y < next.y - 4) && (prev || next);
    const lowerThanNeighbours = (!prev || p.y > prev.y + 4) && (!next || p.y > next.y + 4) && (prev || next);
    let preferred;
    if (i === currentIndex) preferred = 'below';
    else if (higherThanNeighbours) preferred = 'below';
    else if (lowerThanNeighbours) preferred = 'above';
    else preferred = p.y - 0 > height - p.y ? 'above' : 'below';
    const score = (side) => {
      const r = labelRect(p, side, labelWidth);
      const topLimit = i === currentIndex && side === 'above' ? r.y1 - 30 : r.y1;
      if (r.x1 < 2 || r.x2 > width - 2 || topLimit < 4 || r.y2 > height - 4) return Infinity;
      let hits = 0;
      for (const s of samples) {
        if (Math.hypot(s.x - p.x, s.y - p.y) < 28) continue; // the road under the node itself
        if (s.x > r.x1 - 9 && s.x < r.x2 + 9 && s.y > r.y1 - 9 && s.y < r.y2 + 9) hits += 1;
      }
      return hits * 10 + (side === preferred ? 0 : 1);
    };
    const below = score('below');
    const above = score('above');
    if (below === Infinity && above === Infinity) return 'below';
    return above < below ? 'above' : 'below';
  });
}

export const LABEL_GEOMETRY = { BELOW_TOP, ABOVE_TOP, LABEL_H, TAG_ABOVE };

/** Segment a→b (kept for callers that tint a single hop). */
export function segmentPath(a, b) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

export function truncate(text, max) {
  const t = String(text || '');
  return t.length > max ? `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…` : t;
}

/** The seven RikiPath landscapes (see journeyScenes.jsx). */
export const LANDSCAPES = ['sakura_garden', 'village', 'momiji', 'lakeside', 'snowy', 'festival', 'bamboo'];

/**
 * Stable landscape for a stage: derived from the stage key (same stage → same world on every refresh and device),
 * never from the JLPT level or the season. Consecutive stages that would repeat a landscape take the next one.
 */
export function landscapeFor(stageKey, previous = null) {
  let idx = Math.floor(seedOf(`stage:${stageKey}`) * LANDSCAPES.length) % LANDSCAPES.length;
  if (LANDSCAPES[idx] === previous) idx = (idx + 1) % LANDSCAPES.length;
  return LANDSCAPES[idx];
}

/**
 * Painted landscape art (team-provided illustrations, optimised WebP in /public/images/roadmap-world/).
 * `focus` is the object-position that keeps the subject in frame when the wide scene crops the image.
 * A landscape without art (null) uses the vector backdrop, which is also the loading/error fallback.
 */
const ART_WIDTHS = [800, 1280, 2000];
const ART_FOCUS = {
  sakura_garden: '50% 62%',
  village: '50% 60%',
  momiji: '50% 58%',
  lakeside: '50% 55%',
  snowy: '50% 52%',
  festival: '50% 58%',
  bamboo: null,
};
export function landscapeArt(landscape) {
  const focus = ART_FOCUS[landscape];
  if (!focus) return null;
  const base = `/images/roadmap-world/${landscape}`;
  return {
    src: `${base}-1280.webp`,
    srcSet: ART_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', '),
    focus,
  };
}
