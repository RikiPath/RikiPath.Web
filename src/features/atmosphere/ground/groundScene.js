// Dynamic Ground Scene resolver — the "ground" half of the shared sky scene.
// Pure: reads only the sky scene produced by `resolveScene` (same clock, place, weather, season and preferences as the
// header) plus a little learning context, and returns what the vector renderer needs: which composition to draw,
// a graded colour palette, seasonal foliage, lights, water behaviour and particles. No clock reads, no randomness.
import { mix } from '../engine/palette.js';

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** Compositions (see groundLayouts.js). The order is the daily rotation once the learner has started. */
export const GROUND_LAYOUTS = ['sakura_riverside', 'mountain_village', 'lakeside_shrine', 'bamboo_garden', 'lantern_village'];

/** Accessible one-line descriptions (Vietnamese source text, translated at display time). */
export const GROUND_LAYOUT_LABEL = {
  sakura_riverside: 'Làng ven suối với cây anh đào và cầu đỏ',
  mountain_village: 'Làng núi Nhật Bản với chùa tháp trên sườn đồi',
  lakeside_shrine: 'Đền nhỏ và cổng torii bên hồ',
  bamboo_garden: 'Vườn tre với trà thất và lối đá',
  lantern_village: 'Phố làng gỗ với dây đèn lồng',
};

/** Daylight base palette of every scene material (graded below by light, weather and snow). */
export const DAY_PALETTE = Object.freeze({
  haze: '#EAF2FA',
  mtnFar: '#A9BCD8', mtnFarShade: '#8FA3C6', mtnSnow: '#F8FBFE', mtnSnowShade: '#D6E1EF',
  mtnMid: '#8DAEB8', mtnMidShade: '#7595A5',
  hillFar: '#A9C9A2', hillMid: '#88B880', hillMidShade: '#6E9F68', hillNear: '#77AD6B',
  grass: '#8CC57A', grassLight: '#B9DD9B', grassShade: '#5F9756', tuft: '#4F8848',
  path: '#EADFCB', pathShade: '#CFBDA1',
  water: '#94CFE8', waterDeep: '#5FA7CE', waterHi: '#F3FBFF', bank: '#B5A48D', bankShade: '#8E7D68',
  rock: '#A9A6AB', rockHi: '#D3D1D6', rockShade: '#7F7C85',
  trunk: '#6B4839', trunkShade: '#4B3127',
  pine: '#3E7651', pineHi: '#5C9A67', pineShade: '#2B5A3D',
  bamboo: '#82B46B', bambooHi: '#AED48E', bambooDark: '#4E8446', bambooLeaf: '#6FA85B',
  plaster: '#F7EFE1', plasterShade: '#E0D0B5', wood: '#8B5B3D', woodDark: '#5D3A26', engawa: '#B48760',
  roof: '#505A6B', roofHi: '#6F7A8D', roofShade: '#3A4252', roofEdge: '#2E3442',
  torii: '#E2553F', toriiShade: '#B13B2C', toriiDark: '#2F2A2E',
  stone: '#CBC5BC', stoneShade: '#A69F95', stoneDark: '#7F786F',
  shoji: '#FFF8E8', noren: '#C9485B', lanternRed: '#E05845', lanternWhite: '#FFF6E6',
  shadow: '#24304A',
});

/** Seasonal foliage sets: [shade, base, light, highlight]. */
export const FOLIAGE = Object.freeze({
  sakura: ['#D98AA2', '#F2A9BE', '#F8C6D3', '#FFE6EE'],
  momiji: ['#A9341F', '#D9472D', '#F07A38', '#F7B14C'],
  green: ['#4C8549', '#679F5B', '#86BA70', '#AED38E'],
  winter: ['#B9C6D6', '#D9E2EE', '#EEF3F9', '#FFFFFF'],
});

const LIGHT_KEYS = new Set(['shoji', 'lanternRed', 'lanternWhite']);
const FAR_KEYS = new Set(['mtnFar', 'mtnFarShade', 'mtnSnow', 'mtnSnowShade', 'haze']);
const MID_KEYS = new Set(['mtnMid', 'mtnMidShade', 'hillFar']);
const WATER_KEYS = new Set(['water', 'waterDeep', 'waterHi']);
const SNOWABLE = new Set(['grass', 'grassLight', 'grassShade', 'hillNear', 'hillMid', 'hillMidShade', 'hillFar', 'path', 'tuft', 'mtnMid']);

/** Morning blush vs evening amber: the same warm hour reads differently before and after noon. */
function warmTint(afternoon) {
  return afternoon ? '#FF9F7A' : '#FFC3C9';
}

/**
 * Grades one material colour. Depth layers take more of the header's horizon colour (aerial perspective), which is
 * what visually joins the banner to the sky above it.
 */
export function gradeColor(key, hex, light) {
  const { golden, night, overcast, wet, snow, haze, afternoon } = light;
  let c = hex;
  if (SNOWABLE.has(key) && snow > 0) c = mix(c, key === 'grassShade' || key === 'tuft' ? '#C9D6E6' : '#EEF3F9', Math.min(1, snow * 0.95));
  // Water mirrors the header's horizon colour; far layers dissolve into it (aerial perspective).
  const aerial = FAR_KEYS.has(key) ? 0.38 : MID_KEYS.has(key) ? 0.2 : WATER_KEYS.has(key) ? 0.3 : 0;
  if (aerial) c = mix(c, haze, aerial);
  if (LIGHT_KEYS.has(key)) return night > 0.35 ? mix(c, '#FFD58A', 0.35) : c;
  if (golden > 0) c = mix(c, warmTint(afternoon), golden * (FAR_KEYS.has(key) ? 0.6 : WATER_KEYS.has(key) ? 0.5 : 0.4));
  // Snow cover stays bright under cloud (it reflects light); rain-soaked ground reads a little darker and greyer.
  const grey = clamp01(overcast * (snow > 0 && SNOWABLE.has(key) ? 0.12 : 0.3) + wet * 0.14);
  if (grey > 0) c = mix(c, '#7C8798', grey);
  if (night > 0) c = mix(c, '#1A2148', night * (FAR_KEYS.has(key) ? 0.78 : 0.7));
  return c;
}

function gradePalette(base, light) {
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = gradeColor(k, v, light);
  return out;
}

const PERIOD_LIGHT = {
  morning: { night: 0, golden: 0.35, afternoon: false },
  afternoon: { night: 0, golden: 0, afternoon: true },
  evening: { night: 0.22, golden: 0.75, afternoon: true },
  night: { night: 1, golden: 0, afternoon: true },
};

/** Golden-hour weight from the sun's elevation (peaks just above the horizon, fades into night and full day). */
export function goldenWeight(elevation) {
  if (!Number.isFinite(elevation)) return 0;
  if (elevation >= 12 || elevation <= -6) return 0;
  return elevation >= 3 ? (12 - elevation) / 9 : clamp01((elevation + 6) / 9);
}

function foliageFor(scene, snowK) {
  if (snowK > 0.3) return 'winter';
  if (scene.decoration === 'leaves' || scene.season?.season === 'autumn') return 'momiji';
  if (scene.decoration === 'sakura' || scene.season?.season === 'spring') return 'sakura';
  if (scene.season?.season === 'summer') return 'green';
  if (scene.season?.season === 'winter') return 'green';
  // Tropical or unknown place: the brand's blossom trees stay (static — falling petals only in real seasons).
  return 'sakura';
}

function richnessFor({ completedLessons = 0, completionPct = 0 } = {}) {
  if (completionPct >= 50 || completedLessons >= 30) return 2;
  return completedLessons > 0 ? 1 : 0;
}

/** Stable composition: beginners open on the riverside; afterwards one composition per local day. */
export function layoutFor({ dayOfYear = 1, completedLessons = 0 } = {}) {
  if (!completedLessons) return GROUND_LAYOUTS[0];
  return GROUND_LAYOUTS[Math.abs(Math.floor(dayOfYear)) % GROUND_LAYOUTS.length];
}

/** dawn 05–10 · day 10–17 · dusk 17–20 · night — same buckets as `sceneForHour`, fed by the shared clock. */
export function greetingFor(hour) {
  if (hour >= 5 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const PARTICLE_SCALE = { low: 0.6, medium: 1, high: 1.35 };

/**
 * @param {object|null} atmosphere — the shared `useAtmosphere()` result (scene, prefs, effectiveIntensity, reducedMotion, lowPower)
 * @param {{ completedLessons?: number, completionPct?: number }} learning
 */
export function resolveGroundScene(atmosphere, learning = {}) {
  const scene = atmosphere?.scene || null;
  const mode = atmosphere?.prefs?.mode || 'off';
  const staticScene = !scene || mode === 'off' || scene.off;
  const richness = richnessFor(learning);
  const layout = layoutFor({ dayOfYear: scene?.local?.dayOfYear ?? 1, completedLessons: learning.completedLessons });

  let light;
  let precip = null;
  let condition = 'clear';
  if (staticScene) {
    // Sky disabled: a calm static landscape at the matching time of day — no weather, no motion.
    const pl = PERIOD_LIGHT[scene?.visual?.period] || PERIOD_LIGHT.afternoon;
    light = { ...pl, overcast: 0, wet: 0, snow: 0, haze: DAY_PALETTE.haze };
  } else {
    precip = scene.precip || null;
    condition = scene.condition || 'clear';
    const elevation = scene.solar?.elevation;
    const night = clamp01(scene.palette?.night ?? 0);
    const golden = goldenWeight(elevation) * (1 - clamp01(scene.overcast) * 0.7);
    const snow = precip?.kind === 'snow' ? { light: 0.55, moderate: 0.8, heavy: 1 }[precip.level] ?? 0.7 : 0;
    const wet = precip?.kind === 'rain' ? { light: 0.5, moderate: 0.75, heavy: 1 }[precip.level] ?? 0.6 : condition === 'thunder' ? 1 : 0;
    light = {
      night,
      golden,
      afternoon: Boolean(scene.solar?.afternoon),
      overcast: clamp01(scene.overcast),
      wet,
      snow,
      haze: scene.palette?.vars?.['--rp-sky-bottom'] || DAY_PALETTE.haze,
    };
  }

  const foliageKey = staticScene ? 'sakura' : foliageFor(scene, light.snow);
  const palette = gradePalette(DAY_PALETTE, light);
  const foliage = FOLIAGE[foliageKey].map((c) => gradeColor('foliage', c, light));

  const lights = clamp01(light.night * 1.15 + (light.afternoon ? light.golden * 0.45 : 0) + light.overcast * light.wet * 0.25);
  const moonGlint = !staticScene && light.night > 0.55 ? clamp01(scene.moonView?.opacity ?? 0) : 0;
  const sunGlint = clamp01((1 - light.night) * (1 - light.overcast * 0.9) * (1 - light.wet));

  const motion = !staticScene && !atmosphere?.reducedMotion;
  let particles = null;
  if (motion) {
    const scale = (PARTICLE_SCALE[atmosphere?.effectiveIntensity] ?? 0.6) * (atmosphere?.lowPower ? 0.5 : 1);
    if (precip?.kind === 'rain' || condition === 'thunder') {
      const base = { light: 12, moderate: 18, heavy: 24 }[precip?.level] ?? 20;
      particles = { kind: 'rain', count: Math.round(base * scale) };
    } else if (precip?.kind === 'snow') {
      const base = { light: 12, moderate: 16, heavy: 22 }[precip.level] ?? 14;
      particles = { kind: 'snow', count: Math.round(base * scale) };
    } else if (scene.decoration && scene.decorationFactor > 0) {
      particles = { kind: scene.decoration === 'leaves' ? 'leaves' : 'petals', count: Math.max(3, Math.round(9 * scene.decorationFactor * scale)) };
    }
    if (particles && particles.count <= 0) particles = null;
  }

  // The canvas top continues the header's sky (same palette variables) so ground and sky read as one scene.
  const sky = staticScene
    ? { top: mix('#CFE4F7', '#1E2650', light.night * 0.85), bottom: mix(DAY_PALETTE.haze, '#3A3F6E', light.night * 0.8) }
    : { top: scene.palette?.vars?.['--rp-sky-mid'] || '#CFE4F7', bottom: light.haze };

  const tone = light.night > 0.5 || condition === 'thunder' || (light.night > 0.25 && light.overcast > 0.7) ? 'dark' : 'light';

  return {
    layout,
    richness,
    static: staticScene,
    motion,
    tone,
    palette,
    foliage,
    foliageKey,
    snow: light.snow,
    wet: light.wet,
    night: light.night,
    golden: light.golden,
    lights,
    water: { sunGlint, moonGlint, ripples: light.wet > 0 ? 0.4 + light.wet * 0.6 : 0 },
    fog: staticScene ? 0 : clamp01(scene.fog ?? 0),
    sunX: !staticScene && scene.sun ? clamp01(scene.sun.p) : 0.7,
    sunOpacity: !staticScene && scene.sun ? clamp01(scene.sun.opacity) : 0,
    moonX: !staticScene && scene.moonView ? clamp01(scene.moonView.p) : 0.3,
    particles,
    sky,
    // Greeting bucket from the SHARED local time of the sky's place (same buckets as the old device-clock helper).
    greeting: scene?.local && Number.isFinite(scene.local.hour) ? greetingFor(scene.local.hour) : null,
    // A stable key: the vector scene only re-renders when something visible changed.
    key: [layout, richness, foliageKey, light.night.toFixed(2), light.golden.toFixed(2), light.overcast.toFixed(2), light.wet, light.snow, staticScene ? 's' : 'd', sky.top, sky.bottom, scene?.sun?.p ?? '', scene?.moonView?.opacity ?? ''].join('|'),
  };
}
