/**
 * HanziWriter character data for Kana, built locally from the KanjiVG stroke paths already shipped in
 * `src/data/kanaStrokes.json` (CC BY-SA 3.0, Ulrich Apel — attribution shown in the writing dialog).
 *
 * HanziWriter's bundled data covers Hanzi only, so Kana had no practice engine. KanjiVG gives one centre-line
 * path per stroke (109×109 box, y down). HanziWriter needs, per stroke, a filled outline path + a median polyline
 * in its 1024-unit box with y up (bounds x 0…1024, y −124…900). We sample each centre line, offset it into a
 * round-capped outline and down-sample it into the median used by HanziWriter's own stroke matcher — so shape,
 * order and direction are checked by the real quiz engine, nothing is simulated.
 *
 * Only the 92 basic Hiragana/Katakana in the JSON are supported; other characters report "no data".
 */
import kanaStrokes from '@/data/kanaStrokes.json';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SCALE = 1024 / 109;
const HALF_WIDTH = 30; // outline half-thickness in HanziWriter units (~6.4 KanjiVG units total)
const SAMPLE_STEP = 1.1; // KanjiVG units between samples along a stroke
const CAP_SEGMENTS = 8;
const MEDIAN_POINTS = 14;

const cache = new Map();
let sampler = null;

export function hasKanaStrokeData(character) {
  return Array.isArray(kanaStrokes[character]) && kanaStrokes[character].length > 0;
}

function samplerSvg() {
  if (sampler?.isConnected) return sampler;
  sampler = document.createElementNS(SVG_NS, 'svg');
  sampler.setAttribute('aria-hidden', 'true');
  sampler.setAttribute('width', '0');
  sampler.setAttribute('height', '0');
  sampler.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  document.body.appendChild(sampler);
  return sampler;
}

/** Points along a KanjiVG path, converted to HanziWriter space (x right, y up). */
function samplePath(d) {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  samplerSvg().appendChild(path);
  try {
    const length = path.getTotalLength();
    const count = Math.max(2, Math.ceil(length / SAMPLE_STEP));
    const points = [];
    for (let i = 0; i <= count; i += 1) {
      const p = path.getPointAtLength((length * i) / count);
      points.push([p.x * SCALE, 900 - p.y * SCALE]);
    }
    return points;
  } finally {
    path.remove();
  }
}

function unitNormal(points, i) {
  const a = points[Math.max(0, i - 1)];
  const b = points[Math.min(points.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len];
}

const fmt = (n) => Math.round(n * 10) / 10;

/** Closed, round-capped outline around a centre line. */
function outlinePath(points) {
  const left = [];
  const right = [];
  points.forEach((p, i) => {
    const [nx, ny] = unitNormal(points, i);
    left.push([p[0] + nx * HALF_WIDTH, p[1] + ny * HALF_WIDTH]);
    right.push([p[0] - nx * HALF_WIDTH, p[1] - ny * HALF_WIDTH]);
  });
  const cap = (center, normal, from) => {
    const base = Math.atan2(normal[1], normal[0]) + from;
    const arc = [];
    for (let k = 1; k < CAP_SEGMENTS; k += 1) {
      const angle = base - (Math.PI * k) / CAP_SEGMENTS;
      arc.push([center[0] + Math.cos(angle) * HALF_WIDTH, center[1] + Math.sin(angle) * HALF_WIDTH]);
    }
    return arc;
  };
  const last = points.length - 1;
  const ring = [
    ...left,
    ...cap(points[last], unitNormal(points, last), 0), // left → right around the stroke's end
    ...right.reverse(),
    ...cap(points[0], unitNormal(points, 0), Math.PI), // right → left around the stroke's start
  ];
  return `M ${ring.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L ')} Z`;
}

function medianOf(points) {
  const n = Math.min(MEDIAN_POINTS, points.length);
  const median = [];
  for (let i = 0; i < n; i += 1) {
    const p = points[Math.round((i * (points.length - 1)) / Math.max(1, n - 1))];
    median.push([Math.round(p[0]), Math.round(p[1])]);
  }
  return median;
}

export function buildKanaCharData(character) {
  if (cache.has(character)) return cache.get(character);
  if (!hasKanaStrokeData(character) || typeof document === 'undefined') return null;
  const sampled = kanaStrokes[character].map(samplePath);
  const data = { strokes: sampled.map(outlinePath), medians: sampled.map(medianOf) };
  cache.set(character, data);
  return data;
}

/** HanziWriter `charDataLoader` (stable module-level reference, so writers are not recreated per render). */
export function loadKanaCharData(character, onLoad, onError) {
  try {
    const data = buildKanaCharData(character);
    if (data) onLoad(data);
    else onError(new Error('NO_KANA_STROKE_DATA'));
  } catch (error) {
    onError(error);
  }
}
