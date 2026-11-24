// Continuous sky palette: interpolated along the sun's elevation, warmed after solar noon, then veiled by weather.
// Output is a small set of hex colours + alphas written as CSS custom properties (transitions happen in CSS).

const hex = (h) => {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const mix = (a, b, t) => {
  const A = hex(a);
  const B = hex(b);
  const k = clamp01(t);
  return toHex(A.map((c, i) => c + (B[i] - c) * k));
};
/** Relative luminance (sRGB, 0..1). */
export function luminance(color) {
  const [r, g, b] = hex(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// [elevation°, top, mid, bottom, horizon glow, glow strength, cloud highlight, cloud shade]
const STOPS = [
  [-18, '#0a1230', '#141f45', '#212c57', '#5b5f9e', 0.18, '#5a6796', '#323d6b'],
  [-9, '#121b42', '#26306a', '#4a447a', '#c0729a', 0.32, '#6a6c9f', '#3a3d70'],
  [-4, '#25336e', '#5f5b9c', '#d58f9f', '#ff9f86', 0.55, '#a68ab3', '#4c4a7e'],
  [0, '#5a78b8', '#d8a3bf', '#ffc49a', '#ffad6e', 0.85, '#ffd9c4', '#a98aa8'],
  [5, '#86b4e3', '#eccfd6', '#ffdcb9', '#ffcf94', 0.6, '#fff0e4', '#cdb7c3'],
  [14, '#97c8f1', '#cbe4f9', '#f1ece8', '#fff1d6', 0.32, '#ffffff', '#d7e3f0'],
  [40, '#78b8ef', '#b6dbf9', '#e4f2fd', '#fffbe8', 0.2, '#ffffff', '#dbe7f3'],
];

function interpolate(elevation) {
  const e = Math.max(STOPS[0][0], Math.min(STOPS[STOPS.length - 1][0], elevation));
  let i = 0;
  while (i < STOPS.length - 2 && e > STOPS[i + 1][0]) i += 1;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = (e - a[0]) / (b[0] - a[0]);
  return {
    top: mix(a[1], b[1], t),
    mid: mix(a[2], b[2], t),
    bottom: mix(a[3], b[3], t),
    glow: mix(a[4], b[4], t),
    glowA: a[5] + (b[5] - a[5]) * t,
    cloudHi: mix(a[6], b[6], t),
    cloudLo: mix(a[7], b[7], t),
  };
}

// Weather veils (day / night variants).
const VEILS = {
  cloudy: { day: ['#a3b0c1', '#bcc6d3', '#d5dce5'], night: ['#151c33', '#222a44', '#313a56'], hi: ['#eef1f6', '#3c4566'], lo: ['#aeb8c8', '#232a45'] },
  rain: { day: ['#7f8ca1', '#9ba7b8', '#b6c0cd'], night: ['#11172b', '#1c2338', '#2a3149'], hi: ['#d3dae4', '#353d5a'], lo: ['#8994a7', '#1d2339'] },
  thunder: { day: ['#3b4359', '#525b75', '#6b7490'], night: ['#0c1020', '#161b2e', '#232a42'], hi: ['#757e99', '#2b3150'], lo: ['#3b4159', '#141829'] },
  snow: { day: ['#c4cfdd', '#d9e1eb', '#edf1f6'], night: ['#1b2340', '#2a3352', '#3b4565'], hi: ['#f7f9fc', '#4a5578'], lo: ['#c3ccd9', '#2b3352'] },
  fog: { day: ['#ccd1d9', '#dde0e6', '#eceef1'], night: ['#1f2539', '#2c3247', '#3a4056'], hi: ['#f1f2f5', '#3e455e'], lo: ['#c9ced7', '#262c44'] },
};

/**
 * @param {{ elevation: number, afternoon: boolean, overcast: number, veil: keyof VEILS|null }} input
 *   overcast 0..1 — how strongly the weather veil replaces the clear-sky colours.
 */
export function skyPalette({ elevation, afternoon = false, overcast = 0, veil = null }) {
  const base = interpolate(elevation);
  // Afternoon light is warmer than the same elevation in the morning; mornings keep a pastel blush.
  if (elevation > 2 && elevation < 34) {
    const k = (1 - Math.abs(elevation - 14) / 20) * 0.5;
    if (afternoon) base.bottom = mix(base.bottom, '#fbe2c4', k);
    else base.bottom = mix(base.bottom, '#fbe5e6', k * 0.8);
  }
  const night = clamp01((2 - elevation) / 10); // 0 by day, 1 after nautical dusk
  const out = { ...base };
  if (veil && overcast > 0) {
    const v = VEILS[veil] || VEILS.cloudy;
    const target = [0, 1, 2].map((i) => mix(v.day[i], v.night[i], night));
    out.top = mix(base.top, target[0], overcast);
    out.mid = mix(base.mid, target[1], overcast);
    out.bottom = mix(base.bottom, target[2], overcast);
    out.cloudHi = mix(base.cloudHi, mix(v.hi[0], v.hi[1], night), overcast * 0.85);
    out.cloudLo = mix(base.cloudLo, mix(v.lo[0], v.lo[1], night), overcast * 0.85);
    out.glowA = base.glowA * (1 - overcast * 0.85);
  }
  const tone = luminance(out.mid) * 0.6 + luminance(out.top) * 0.4 < 0.24 ? 'dark' : 'light';
  return {
    tone,
    vars: {
      '--rp-sky-top': out.top,
      '--rp-sky-mid': out.mid,
      '--rp-sky-bottom': out.bottom,
      '--rp-sky-glow': out.glow,
      '--rp-cloud-hi': out.cloudHi,
      '--rp-cloud-lo': out.cloudLo,
      '--rp-fuji': mix(out.bottom, night > 0.5 ? '#050a1f' : '#6f86ad', night > 0.5 ? 0.55 : 0.32),
    },
    glowAlpha: Math.round(out.glowA * 100) / 100,
    night,
  };
}
