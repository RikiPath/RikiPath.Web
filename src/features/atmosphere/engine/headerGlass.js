// Adaptive Atmospheric Glass V3 — header control appearance resolved from the Dynamic Sky scene.
// Pure module: scene (+ theme) → glass variant → CSS custom properties. No DOM reads, no per-frame work;
// the header re-resolves only when the scene's visual context changes.

/**
 * Glass variants. `polarity` = which ink sits on the glass (dark ink on light glass, light ink on dark glass).
 * Opacities were tuned so text keeps ≥ 4.5:1 over the worst sky behind the controls (see GLASS_WORST_BACKDROPS).
 */
export const GLASS_VARIANTS = {
  // Clear day: white frosted glass, sky clearly visible through it.
  light: { polarity: 'light', bg: [255, 255, 255, 0.56], border: 'rgba(255,255,255,0.78)', text: '#1C2240', muted: '#454A64', icon: '#2E3452', hover: 'rgba(255,244,248,0.78)', active: 'rgba(255,233,240,0.86)', blur: 14 },
  // Bright midday / snow-bright scenes: a touch more frost so white clouds never swallow the capsule.
  bright: { polarity: 'light', bg: [255, 255, 255, 0.66], border: 'rgba(190,200,220,0.62)', text: '#1A203E', muted: '#434862', icon: '#2C3250', hover: 'rgba(255,244,248,0.84)', active: 'rgba(255,233,240,0.9)', blur: 14 },
  // Afternoon light / sunset: warm ivory with a hint of sakura, plum-navy ink.
  warm: { polarity: 'light', bg: [255, 249, 244, 0.64], border: 'rgba(255,232,222,0.85)', text: '#2A1E33', muted: '#56475B', icon: '#3A2D45', hover: 'rgba(255,240,243,0.82)', active: 'rgba(255,228,236,0.9)', blur: 14 },
  // Cloudy / overcast: cool neutral frost with a firmer border against grey skies.
  neutral: { polarity: 'light', bg: [246, 248, 252, 0.7], border: 'rgba(200,210,226,0.9)', text: '#1B2140', muted: '#454B63', icon: '#2C3352', hover: 'rgba(255,246,249,0.86)', active: 'rgba(255,233,240,0.9)', blur: 16 },
  // Rain (day): denser cool glass so streaks behind never cut through the text.
  rain: { polarity: 'light', bg: [240, 245, 252, 0.8], border: 'rgba(186,200,222,0.95)', text: '#1A2040', muted: '#424A62', icon: '#2A3252', hover: 'rgba(250,246,250,0.9)', active: 'rgba(255,233,240,0.92)', blur: 16 },
  // Snow: separated from the white ground by a blue-grey edge and more body.
  snow: { polarity: 'light', bg: [250, 251, 255, 0.74], border: 'rgba(140,160,196,0.6)', text: '#17203F', muted: '#3F4865', icon: '#27304F', hover: 'rgba(255,246,250,0.9)', active: 'rgba(255,233,240,0.92)', blur: 12 },
  // Fog / mist: crisp boundaries, modest blur (the scene is already soft).
  fog: { polarity: 'light', bg: [252, 252, 254, 0.8], border: 'rgba(150,162,186,0.62)', text: '#1A2040', muted: '#434A62', icon: '#2B3252', hover: 'rgba(255,246,250,0.9)', active: 'rgba(255,233,240,0.92)', blur: 8 },
  // Night: translucent navy, light rim, warm-white ink.
  dark: { polarity: 'dark', bg: [22, 30, 66, 0.55], border: 'rgba(255,255,255,0.24)', text: '#F7F3EC', muted: '#D9D4E8', icon: '#ECE7F5', hover: 'rgba(48,58,104,0.66)', active: 'rgba(92,54,96,0.66)', blur: 14 },
  // Moonlit clear night: indigo-violet glass with a soft highlight.
  moon: { polarity: 'dark', bg: [42, 38, 96, 0.52], border: 'rgba(214,206,255,0.3)', text: '#F8F5EE', muted: '#DCD6EE', icon: '#EEE9F8', hover: 'rgba(66,60,128,0.64)', active: 'rgba(98,58,108,0.66)', blur: 14 },
  // Storm (day or night): stable dark glass, high body — never follows lightning.
  storm: { polarity: 'dark', bg: [26, 30, 50, 0.7], border: 'rgba(255,255,255,0.22)', text: '#F5F3F8', muted: '#D6D3E2', icon: '#EAE7F2', hover: 'rgba(46,52,80,0.78)', active: 'rgba(88,54,92,0.78)', blur: 12 },
  // Sky off: the design-system header surface (light theme) — near-opaque, no blur needed.
  system: { polarity: 'light', bg: [255, 255, 255, 0.92], border: 'rgba(95,85,89,0.2)', text: '#2D282A', muted: '#5F5559', icon: '#4A4246', hover: 'rgba(255,244,247,1)', active: 'rgba(255,233,240,1)', blur: 0 },
  // Sky off + dark app theme.
  'system-dark': { polarity: 'dark', bg: [35, 28, 33, 0.94], border: 'rgba(255,255,255,0.16)', text: '#F5EEF0', muted: '#D3C6CB', icon: '#ECDFE4', hover: 'rgba(61,37,48,1)', active: 'rgba(80,44,60,1)', blur: 0 },
  // prefers-contrast: more / forced high contrast: opaque-enough surface on either polarity.
  'high-contrast-light': { polarity: 'light', bg: [255, 255, 255, 0.95], border: 'rgba(28,34,64,0.55)', text: '#10142A', muted: '#2E3350', icon: '#151A33', hover: 'rgba(255,240,245,1)', active: 'rgba(255,226,236,1)', blur: 0 },
  'high-contrast-dark': { polarity: 'dark', bg: [14, 18, 40, 0.94], border: 'rgba(255,255,255,0.6)', text: '#FFFFFF', muted: '#E6E3F0', icon: '#FFFFFF', hover: 'rgba(40,46,80,1)', active: 'rgba(70,40,72,1)', blur: 0 },
};

/**
 * Worst backdrops that can sit behind the controls for each variant (Dynamic Sky original period gradients,
 * weather veils and cloud highlights). Used by tests to prove the contrast targets over real scene colours.
 */
export const GLASS_WORST_BACKDROPS = {
  light: ['#a6d3f6', '#c9e4f9', '#ffffff', '#fbe7e1', '#7fb6e6'],
  bright: ['#a6d3f6', '#ffffff', '#eaf5fd', '#7fb6e6'],
  warm: ['#cdbde9', '#f0bccd', '#f9d3b8', '#ffffff', '#b9a0d6'],
  neutral: ['#b2bccc', '#d6dce6', '#9aa7b8', '#ffffff'],
  rain: ['#8c9cb4', '#bac6d6', '#7f8ca1', '#e8eef7'],
  snow: ['#ffffff', '#dee6f2', '#c9d3e0'],
  fog: ['#e8eaef', '#ffffff', '#cfd3da'],
  dark: ['#0f1a3c', '#1b2a57', '#2a3767', '#5a6796', '#6a6c9f', '#2e3858'],
  moon: ['#0f1a3c', '#1b2a57', '#2a3767', '#5a6796', '#6a6c9f'],
  storm: ['#2c3248', '#464e6a', '#757e99', '#0c1020'],
};

/**
 * Resolution order (only fields the scene really has): display mode → app theme → contrast preference →
 * storm → sky darkness (palette tone, not just isDay) → weather condition → light phase / period.
 * @param {object} scene  resolved Dynamic Sky scene ({ off, isDark, condition, precip, solar, period, moonView, visual })
 * @param {{ themeMode?: 'light'|'dark', highContrast?: boolean }} [opts]
 * @returns {string} variant key
 */
export function resolveGlassVariant(scene, { themeMode = 'light', highContrast = false } = {}) {
  if (!scene || scene.off) return themeMode === 'dark' ? 'system-dark' : 'system';
  const dark = Boolean(scene.isDark);
  if (highContrast) return dark ? 'high-contrast-dark' : 'high-contrast-light';
  const condition = scene.condition;
  if (condition === 'thunder') return 'storm';
  if (dark) {
    const moonlit = (scene.moonView?.opacity ?? 0) > 0.55 && (condition === 'clear' || condition === 'partly');
    return moonlit ? 'moon' : 'dark';
  }
  if (scene.precip?.kind === 'snow' || condition === 'snow') return 'snow';
  if (condition === 'fog') return 'fog';
  if (scene.precip?.kind === 'rain' || condition === 'rain') return 'rain';
  if (condition === 'mostly' || condition === 'overcast') return 'neutral';
  const phase = scene.solar?.phase;
  const period = scene.visual?.period || scene.period;
  if (period === 'evening' || ((phase === 'golden' || phase === 'twilight') && scene.solar?.afternoon)) return 'warm';
  if (scene.period === 'afternoon') return 'warm';
  if (scene.period === 'noon' || (scene.solar?.elevation ?? 0) > 45) return 'bright';
  return 'light';
}

const rgba = ([r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a})`;

/** CSS custom properties for a variant (applied on the header; controls read them). */
export function glassVars(variant, { reduceBlur = false } = {}) {
  const v = GLASS_VARIANTS[variant] || GLASS_VARIANTS.light;
  const dark = v.polarity === 'dark';
  const blur = reduceBlur ? Math.min(v.blur, 8) : v.blur;
  return {
    '--header-glass-bg': rgba(v.bg),
    '--header-glass-opacity': String(v.bg[3]),
    '--header-glass-border': v.border,
    '--header-glass-text': v.text,
    '--header-glass-text-muted': v.muted,
    '--header-glass-icon': v.icon,
    '--header-glass-hover': v.hover,
    '--header-glass-active': v.active,
    '--header-glass-accent': dark ? '#FFB4C8' : '#B53D5C',
    '--header-glass-focus': dark ? '0 0 0 3px rgba(255, 180, 200, 0.6)' : '0 0 0 3px rgba(224, 90, 122, 0.45)',
    '--header-glass-blur': blur ? `blur(${blur}px) saturate(1.15)` : 'none',
    '--header-glass-shadow': dark
      ? 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 10px rgba(4,8,26,0.28)'
      : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(28,39,67,0.06), 0 4px 12px rgba(28,39,67,0.07)',
    '--header-glass-kbd': dark ? 'rgba(255,255,255,0.14)' : 'rgba(28,34,64,0.08)',
    '--header-glass-globe': dark ? '#9CCBF5' : '#2F74C0',
    // Brand pill: same glass family, denser body (the wordmark is the one element that must never blur into the sky).
    '--header-glass-brand-bg': rgba(brandSurface(v)),
    '--header-glass-brand-text': v.text,
    '--header-glass-brand-path': brandPathInk(v),
  };
}

/** Brand pill surface: the variant's tint at a higher opacity (≥ .92 light glass, ≥ .66 dark glass). */
export function brandSurface(v) {
  const [r, g, b, a] = v.bg;
  return [r, g, b, Math.max(a, v.polarity === 'dark' ? 0.66 : 0.92)];
}
/** "Path" stays Sakura Pink: brand pink on light glass, the lighter sakura tint on dark glass. */
export const brandPathInk = (v) => (v.polarity === 'dark' ? '#F07B98' : '#E05A7A');

export const glassPolarity = (variant) => (GLASS_VARIANTS[variant] || GLASS_VARIANTS.light).polarity;

/* ------------------------------------------------------------------ contrast helpers (WCAG 2.x) */
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const relativeLuminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Glass surface composited over a backdrop colour. */
export function compositeOver(bg, backdropHex) {
  const [r, g, b, a] = bg;
  const [br, bgc, bb] = hexToRgb(backdropHex);
  return [r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a)];
}
/** Worst text contrast of a variant over its worst backdrops. */
export function worstTextContrast(variant) {
  const v = GLASS_VARIANTS[variant];
  const text = hexToRgb(v.text);
  const muted = hexToRgb(v.muted);
  const backdrops = GLASS_WORST_BACKDROPS[variant] || ['#ffffff'];
  let min = Infinity;
  for (const bd of backdrops) {
    const surface = compositeOver(v.bg, bd);
    min = Math.min(min, contrastRatio(text, surface), contrastRatio(muted, surface));
  }
  return min;
}
