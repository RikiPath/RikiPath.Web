// 2.5D cloud field: three depth layers of procedurally shaped clouds from a fixed seed, so every slot keeps
// its shape, height and drift phase across renders and reloads (no re-randomising the scene).

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
  far: { width: [64, 104], top: [-4, 34], duration: 560, opacity: 0.55 },
  mid: { width: [104, 156], top: [4, 46], duration: 360, opacity: 0.82 },
  near: { width: [156, 228], top: [22, 62], duration: 230, opacity: 0.92 },
};

/** Slots per layer by effect intensity (Nhẹ uses fewer layers and nodes). */
export const CLOUD_SLOTS = {
  low: { far: 3, mid: 2, near: 0 },
  medium: { far: 4, mid: 3, near: 1 },
  high: { far: 5, mid: 4, near: 2 },
};

/** One cumulus-like shape: overlapping puffs over a flattened base, in a viewBox of width × height. */
function cloudShape(rand, width) {
  const height = Math.round(width * (0.36 + rand() * 0.08));
  const puffs = 4 + Math.floor(rand() * 3);
  const base = height * 0.78;
  const circles = [];
  for (let i = 0; i < puffs; i += 1) {
    const t = (i + 0.5) / puffs;
    const hump = Math.sin(Math.PI * t); // taller in the middle
    const r = height * (0.2 + 0.24 * hump + rand() * 0.08);
    const cx = width * (0.12 + 0.76 * t) + (rand() - 0.5) * width * 0.05;
    circles.push({ cx: Math.round(cx * 10) / 10, cy: Math.round((base - r * 0.72) * 10) / 10, r: Math.round(r * 10) / 10 });
  }
  const baseRect = { x: Math.round(width * 0.1), y: Math.round(base - height * 0.2), w: Math.round(width * 0.8), h: Math.round(height * 0.2), r: Math.round(height * 0.1) };
  return { width, height, circles, baseRect };
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
      // Mid/near clouds use the original silhouette (mirrored / stretched per slot); far clouds alternate it with small puffs.
      const classic = layer !== 'far' || i % 2 === 0;
      const shape = classic
        ? { classic: true, width, height: Math.round(width * (40 / 84) * (0.82 + rand() * 0.3)), flip: rand() < 0.5 }
        : cloudShape(rand, width);
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
