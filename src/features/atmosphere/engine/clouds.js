// 2.5D cloud field: three depth layers of volumetric cumulus clouds from a fixed seed, so every slot keeps
// its shape, height and drift phase across renders and reloads (no re-randomising the scene).
// Clouds are SOLID shapes (opaque body, lit tops, shaded flat base) that occlude the sun/moon; density follows
// the reported cloud cover (few → scattered → broken → overcast) and sets the overall brightness / mood.

/** Small deterministic PRNG (mulberry32). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CLOUD_LAYERS = {
  // Parallax: far clouds are small, high, hazy and slow; near clouds are large, low, crisp and faster.
  // Sized for a ~56–64 px header; `top` (%) may be negative so a cloud hangs from the top edge, but its flat base
  // always ends inside the header (never cut off at the bottom).
  far: { width: [56, 84], top: [-14, 14], duration: 620, opacity: 0.86 },
  mid: { width: [88, 124], top: [-30, 2], duration: 400, opacity: 0.97 },
  near: { width: [124, 168], top: [-48, -16], duration: 250, opacity: 1 },
};

/** Slots per layer by effect intensity (Nhẹ uses fewer layers and nodes). */
export const CLOUD_SLOTS = {
  low: { far: 3, mid: 2, near: 0 },
  medium: { far: 4, mid: 3, near: 1 },
  high: { far: 5, mid: 4, near: 2 },
};

/**
 * One volumetric cumulus: a back row of smaller puffs (in shadow), a front row of larger puffs (lit), a flat base,
 * and highlight caps on the sun-facing tops. Returns geometry in its own viewBox (tight bounding box).
 */
export function cumulusShape(rand, width) {
  const h = width * (0.4 + rand() * 0.08);
  const base = h * 0.86;
  const front = [];
  const back = [];
  const nf = 3 + Math.floor(rand() * 3); // 3–5 front puffs
  for (let i = 0; i < nf; i += 1) {
    const t = (i + 0.5) / nf;
    const hump = Math.sin(Math.PI * t) ** 0.8; // tower in the middle, shoulders at the ends
    const r = h * (0.2 + 0.26 * hump + rand() * 0.06);
    const cx = width * (0.14 + 0.72 * t) + (rand() - 0.5) * width * 0.04;
    front.push({ cx, cy: base - r * 0.78, r });
  }
  const nb = 2 + Math.floor(rand() * 2); // 2–3 back puffs, raised between the front ones
  for (let i = 0; i < nb; i += 1) {
    const t = (i + 1) / (nb + 1);
    const r = h * (0.22 + 0.16 * Math.sin(Math.PI * t) + rand() * 0.05);
    const cx = width * (0.2 + 0.6 * t) + (rand() - 0.5) * width * 0.06;
    back.push({ cx, cy: base - r * 1.05 - h * 0.08, r });
  }
  const baseEllipse = { cx: width / 2, cy: base - h * 0.06, rx: width * 0.42, ry: h * 0.13 };
  // Lit caps: up-left of each tall front puff (light from above), smaller than the puff.
  const lights = front
    .filter((c) => c.r > h * 0.26)
    .map((c) => ({ cx: c.cx - c.r * 0.16, cy: c.cy - c.r * 0.22, r: c.r * 0.66 }));
  const all = [...front, ...back];
  const minY = Math.min(...all.map((c) => c.cy - c.r), baseEllipse.cy - baseEllipse.ry);
  const minX = Math.min(...all.map((c) => c.cx - c.r), baseEllipse.cx - baseEllipse.rx);
  const maxX = Math.max(...all.map((c) => c.cx + c.r), baseEllipse.cx + baseEllipse.rx);
  const maxY = Math.max(...all.map((c) => c.cy + c.r), baseEllipse.cy + baseEllipse.ry);
  const pad = 1;
  const r1 = (v) => Math.round(v * 10) / 10;
  const shift = (c) => ({ cx: r1(c.cx - minX + pad), cy: r1(c.cy - minY + pad), r: r1(c.r) });
  const vbW = Math.ceil(maxX - minX + pad * 2);
  const vbH = Math.ceil(maxY - minY + pad * 2);
  return {
    width: Math.round(width),
    height: Math.round((width * vbH) / vbW),
    viewBox: `0 0 ${vbW} ${vbH}`,
    front: front.map(shift),
    back: back.map(shift),
    lights: lights.map(shift),
    base: { cx: r1(baseEllipse.cx - minX + pad), cy: r1(baseEllipse.cy - minY + pad), rx: r1(baseEllipse.rx), ry: r1(baseEllipse.ry) },
  };
}

/** The original RikiPath cloud silhouette (viewBox 0 0 84 40) — kept as the main cloud style. */
export const CLASSIC_CLOUD_PATH =
  'M22 38c-8.3 0-15-5.6-15-12.5S13.7 13 22 13c1.3 0 2.6.1 3.8.4C28.6 6.6 35.6 2 43.8 2c9.6 0 17.6 6.3 19.4 14.7.9-.1 1.8-.2 2.8-.2 8.3 0 15 5.4 15 12s-6.7 12-15 12H22z';

/** Stable cloud slots for an intensity. Order within a layer = order in which slots become visible. */
export function buildCloudField(intensity = 'medium', seed = 20260401) {
  const slots = CLOUD_SLOTS[intensity] || CLOUD_SLOTS.medium;
  const field = {};
  for (const [layer, count] of Object.entries(slots)) {
    const conf = CLOUD_LAYERS[layer];
    const rand = seededRandom(seed + layer.length * 7919 + count * 104729);
    field[layer] = Array.from({ length: count }, (_, i) => {
      const width = Math.round(conf.width[0] + rand() * (conf.width[1] - conf.width[0]));
      const duration = Math.round(conf.duration * (0.85 + rand() * 0.3));
      const shape = { ...cumulusShape(rand, width), flip: rand() < 0.5 };
      return {
        id: `${layer}-${i}`,
        shape,
        top: Math.round(conf.top[0] + rand() * (conf.top[1] - conf.top[0])),
        duration,
        // Spread phases evenly (with jitter) so clouds never bunch up at load.
        delay: -Math.round(duration * (((i + rand() * 0.6) / Math.max(1, count)) % 1)),
        mobileHidden: layer === 'near' || (layer === 'far' && i % 2 === 1),
      };
    });
  }
  return field;
}

/** How many slots of a layer are visible for a cloud fraction (0..1). Far clouds appear first. */
export function visibleCount(layer, total, fraction) {
  if (total === 0) return 0;
  const f = Math.max(0, Math.min(1, fraction));
  const shifted = layer === 'far' ? f * 1.25 : layer === 'mid' ? f * 1.05 - 0.05 : (f - 0.35) / 0.65;
  return Math.max(0, Math.min(total, Math.round(total * shifted)));
}

/** Cloud-cover density band (METAR-style): drives cloud count, deck, dimming and mood. */
export function cloudDensity(cover, condition) {
  if (condition === 'thunder' || condition === 'fog') return 'overcast';
  const c = cover === null || cover === undefined || cover === '' ? NaN : Number(cover);
  if (!Number.isFinite(c)) return condition === 'rain' || condition === 'snow' ? 'overcast' : 'scattered';
  if (c <= 10) return 'clear';
  if (c <= 30) return 'few';
  if (c <= 55) return 'scattered';
  if (c <= 85) return 'broken';
  return 'overcast';
}

/** Overall sky mood per density: `dim` = grey veil over the sky (0..1), `deck` floor for the cloud bank. */
export const DENSITY_MOOD = {
  clear: { dim: 0, deck: 0 },
  few: { dim: 0, deck: 0 },
  scattered: { dim: 0.03, deck: 0 },
  broken: { dim: 0.08, deck: 0.35 },
  overcast: { dim: 0.14, deck: 0.85 },
};

/**
 * Whether a cloud cluster periodically passes in front of the sun (a short shaded moment): only in sunny / partly
 * cloudy daylight with the sun clearly up, never with reduced motion.
 */
export function sunPassEnabled({ density, sunOpacity, reducedMotion }) {
  if (reducedMotion) return false;
  return (density === 'few' || density === 'scattered') && sunOpacity >= 0.45;
}

/** The passing cluster's own stable shape (a mid-size cumulus). */
export const SUN_PASS_SHAPE = cumulusShape(seededRandom(77031), 120);
