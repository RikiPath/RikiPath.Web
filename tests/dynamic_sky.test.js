// RikiPath Dynamic Sky 2.0 — pure engine contracts (time zone, sun, weather mapping, season, no fabricated data).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { periodForTime, zonedParts } from '../src/features/atmosphere/engine/timeOfDay.js';
import { moonPhase, solarPosition, sunTimes } from '../src/features/atmosphere/engine/solar.js';
import { classifyWeather, cloudFractionForCover, weatherLabel, windVector } from '../src/features/atmosphere/engine/weatherCondition.js';
import { seasonalContext } from '../src/features/atmosphere/engine/season.js';
import { resolveScene } from '../src/features/atmosphere/engine/sceneResolver.js';
import { buildCloudField, visibleCount } from '../src/features/atmosphere/engine/clouds.js';
import { particleBudget } from '../src/features/atmosphere/engine/particles.js';
import { SCENE_PRESETS, presetInputs } from '../src/features/atmosphere/engine/presets.js';
import { WEATHER_MAX_AGE_MS, sanitizePrefs, weatherFreshness } from '../src/features/atmosphere/atmosphereLogic.js';
import { parseCurrentWeather } from '../src/features/atmosphere/weatherService.js';
import { ICON_LABEL, WEATHER_ICON_KEYS, iconForScene, modeIcons, resolveWeatherIcon } from '../src/features/atmosphere/engine/weatherIcon.js';
import { jaAppCore } from '../src/locales/ja/appCore.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKYO = { name: 'Tokyo', country: 'Nhật Bản', latitude: 35.68, longitude: 139.69, timezone: 'Asia/Tokyo', source: 'search' };
const minutesOf = (date, tz) => {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute;
};

describe('time of day & time zone', () => {
  it('names the five periods with the documented boundaries', () => {
    const cases = [[5, 0, 'morning'], [10, 59, 'morning'], [11, 0, 'noon'], [13, 29, 'noon'], [13, 30, 'afternoon'], [17, 59, 'afternoon'], [18, 0, 'evening'], [22, 59, 'evening'], [23, 0, 'latenight'], [4, 59, 'latenight']];
    for (const [h, m, expected] of cases) assert.equal(periodForTime(h, m), expected, `${h}:${m}`);
  });

  it('uses the place zone, not the device zone (Tokyo seen from Vietnam)', () => {
    const at = new Date('2026-11-24T06:00:00Z'); // 13:00 in Hà Nội, 15:00 in Tokyo
    const scene = resolveScene({ mode: 'sky', location: TOKYO, weather: null, now: at, deviceZone: 'Asia/Ho_Chi_Minh' });
    assert.equal(scene.place.timeZone, 'Asia/Tokyo');
    assert.equal(scene.local.hour, 15);
    assert.equal(scene.period, 'afternoon');
  });

  it('follows daylight saving time through Intl (New York, EST vs EDT)', () => {
    assert.equal(zonedParts(new Date('2026-01-15T17:00:00Z'), 'America/New_York').hour, 12);
    assert.equal(zonedParts(new Date('2026-07-15T17:00:00Z'), 'America/New_York').hour, 13);
  });
});

describe('sun & moon', () => {
  it('computes Tokyo sunrise/sunset within a few minutes of published times', () => {
    // 2026-06-21 Tokyo: sunrise ≈ 04:25, sunset ≈ 19:00 JST. 2026-12-21: ≈ 06:47 / 16:32.
    const june = sunTimes(new Date('2026-06-21T03:00:00Z'), 35.68, 139.69);
    assert.ok(Math.abs(minutesOf(june.sunrise, 'Asia/Tokyo') - (4 * 60 + 25)) <= 5);
    assert.ok(Math.abs(minutesOf(june.sunset, 'Asia/Tokyo') - (19 * 60)) <= 5);
    const dec = sunTimes(new Date('2026-12-21T03:00:00Z'), 35.68, 139.69);
    assert.ok(Math.abs(minutesOf(dec.sunrise, 'Asia/Tokyo') - (6 * 60 + 47)) <= 5);
    assert.ok(Math.abs(minutesOf(dec.sunset, 'Asia/Tokyo') - (16 * 60 + 32)) <= 5);
  });

  it('gives a high noon sun in summer and a set sun at night', () => {
    assert.ok(solarPosition(new Date('2026-06-21T02:45:00Z'), 35.68, 139.69).elevation > 75);
    assert.ok(solarPosition(new Date('2026-06-21T15:00:00Z'), 35.68, 139.69).elevation < -20);
  });

  it('handles polar day/night without inventing a sunrise', () => {
    assert.equal(sunTimes(new Date('2026-06-21T12:00:00Z'), 78.2, 15.6).polar, 'day');
    assert.equal(sunTimes(new Date('2026-12-21T12:00:00Z'), 78.2, 15.6).polar, 'night');
  });

  it('knows full and new moon', () => {
    assert.ok(moonPhase(new Date('2026-01-03T10:03:00Z')).illumination > 0.97); // full moon
    assert.ok(moonPhase(new Date('2026-01-18T19:52:00Z')).illumination < 0.03); // new moon
  });
});

describe('weather mapping (provider data only)', () => {
  it('maps rain intensity from code and measured mm/h', () => {
    assert.equal(classifyWeather({ temperature: 20, weatherCode: 61, cloudCover: 90, precipitation: 0.4, rain: 0.4 }).precip.level, 'light');
    assert.equal(classifyWeather({ temperature: 20, weatherCode: 63, cloudCover: 95, precipitation: 3.4, rain: 3.4 }).precip.level, 'moderate');
    assert.equal(classifyWeather({ temperature: 20, weatherCode: 61, cloudCover: 95, precipitation: 9, rain: 9 }).precip.level, 'heavy');
  });

  it('never invents precipitation', () => {
    assert.equal(classifyWeather({ temperature: 22, weatherCode: 2, cloudCover: 50 }).precip, null, '22°C partly cloudy is not rain');
    assert.equal(classifyWeather({ temperature: -3, weatherCode: 3, cloudCover: 100 }).precip, null, 'winter overcast is not snow');
    assert.equal(classifyWeather({ temperature: 28, weatherCode: 95, cloudCover: 100, precipitation: 0 }).precip, null, 'dry thunderstorm');
    assert.equal(classifyWeather({ temperature: 20, weatherCode: 42 }), null, 'unknown code → no weather scene');
  });

  it('uses cloud cover for density but keeps the reported label', () => {
    const mostlyClearHighCloud = classifyWeather({ temperature: 20, weatherCode: 0, cloudCover: 92 });
    assert.equal(weatherLabel(mostlyClearHighCloud), 'Trời quang');
    assert.ok(mostlyClearHighCloud.cloudFraction > 0.85);
    let prev = -1;
    for (let c = 0; c <= 100; c += 5) {
      const f = cloudFractionForCover(c);
      assert.ok(f >= prev, `monotonic at ${c}%`);
      prev = f;
    }
    assert.ok(cloudFractionForCover(5) < 0.1 && cloudFractionForCover(95) > 0.9);
  });

  it('turns meteorological wind direction into header drift', () => {
    assert.ok(windVector(20, 270).x > 0.99, 'west wind blows left → right');
    assert.ok(windVector(20, 90).x < -0.99, 'east wind blows right → left');
    assert.equal(windVector(55, 0).level, 'strong');
    assert.equal(windVector(null, null).speed, null);
  });

  it('keeps missing provider fields null instead of zero', () => {
    const parsed = parseCurrentWeather({ timezone: 'Asia/Tokyo', current: { time: '2026-11-24T15:30', temperature_2m: 13.2, weather_code: 2 } });
    assert.equal(parsed.windSpeed, null);
    assert.equal(parsed.cloudCover, null);
    assert.equal(parsed.humidity, null);
    assert.throws(() => parseCurrentWeather({ current: { weather_code: 2 } }));
  });
});

describe('seasonal decoration (estimate, never hard-coded)', () => {
  it('shows sakura only inside the estimated bloom window', () => {
    assert.equal(seasonalContext({ latitude: 35.68, month: 4, dayOfYear: 92, pref: 'auto' }).decoration, 'sakura');
    assert.equal(seasonalContext({ latitude: 35.68, month: 7, dayOfYear: 200, pref: 'auto' }).decoration, null);
    assert.equal(seasonalContext({ latitude: 35.68, month: 11, dayOfYear: 328, pref: 'auto' }).decoration, 'leaves');
    assert.equal(seasonalContext({ latitude: 43.06, month: 4, dayOfYear: 92, pref: 'auto' }).decoration, null, 'Sapporo blooms later');
  });

  it('adds no four-season decoration in the tropics or without a place', () => {
    const hanoi = seasonalContext({ latitude: 21.03, month: 4, dayOfYear: 92, pref: 'auto' });
    assert.equal(hanoi.season, 'tropical');
    assert.equal(hanoi.decoration, null);
    assert.equal(seasonalContext({ latitude: null, month: 4, dayOfYear: 92, pref: 'auto' }).decoration, null);
    assert.equal(seasonalContext({ latitude: 35.68, month: 4, dayOfYear: 92, pref: 'off' }).decoration, null);
    assert.ok(seasonalContext({ latitude: 35.68, month: 4, dayOfYear: 92, pref: 'auto' }).estimated);
  });
});

describe('scene composition', () => {
  const scene = (id, extra = {}) => {
    const p = presetInputs(SCENE_PRESETS.find((x) => x.id === id));
    return resolveScene({ mode: p.mode, location: p.location, weather: p.weather, now: p.now, deviceZone: 'Asia/Ho_Chi_Minh', ...extra });
  };

  it('Tokyo spring morning clear: daylight, sun, few clouds, sakura', () => {
    const s = scene('tokyo-spring-morning');
    assert.equal(s.period, 'morning');
    assert.ok(s.sun.opacity > 0.8);
    assert.ok(s.cloudFraction < 0.15);
    assert.equal(s.decoration, 'sakura');
    assert.equal(s.precip, null);
  });

  it('night clear shows moon/stars; night overcast hides stars', () => {
    const clear = scene('tokyo-night-clear');
    assert.ok(clear.starsOpacity > 0.8);
    assert.equal(clear.sun.opacity, 0);
    assert.equal(clear.isDark, true);
    assert.equal(scene('tokyo-night-overcast').starsOpacity, 0);
  });

  it('sunset is golden/twilight with a low sun', () => {
    const s = scene('tokyo-sunset');
    assert.ok(['golden', 'twilight'].includes(s.solar.phase));
    assert.equal(s.solar.afternoon, true);
  });

  it('storms hide the sun and petals; rain dims and thins decoration', () => {
    const storm = scene('tokyo-thunder');
    assert.equal(storm.sun.opacity, 0);
    assert.equal(storm.lightning, true);
    assert.equal(storm.decoration, null);
    const springRain = scene('tokyo-spring-rain-wind');
    assert.equal(springRain.precip.level, 'light');
    assert.ok(springRain.decorationFactor > 0 && springRain.decorationFactor < 0.5);
    assert.equal(springRain.wind.level, 'windy');
  });

  it('winter night snow and fog come only from the reported codes', () => {
    const snow = scene('tokyo-winter-snow');
    assert.equal(snow.precip.kind, 'snow');
    assert.equal(snow.isDark, true);
    assert.equal(scene('hanoi-fog').fog, 1);
  });

  it('sky-only and unavailable weather never show weather particles', () => {
    const skyOnly = resolveScene({ mode: 'sky', location: TOKYO, weather: { temperature: 10, weatherCode: 65, cloudCover: 100, precipitation: 9 }, now: new Date('2026-06-18T06:00:00Z') });
    assert.equal(skyOnly.live, false);
    assert.equal(skyOnly.precip, null);
    const down = scene('weather-unavailable');
    assert.equal(down.live, false);
    assert.equal(down.precip, null);
    assert.equal(down.lightning, false);
  });

  it('never defaults to Tokyo: no place → device-zone estimate or device clock', () => {
    const vn = resolveScene({ mode: 'sky', location: null, weather: null, now: new Date('2026-04-02T01:00:00Z'), deviceZone: 'Asia/Ho_Chi_Minh' });
    assert.equal(vn.place.source, 'zone');
    assert.equal(vn.place.timeZone, 'Asia/Ho_Chi_Minh');
    assert.notEqual(vn.decoration, 'sakura');
    const unknown = resolveScene({ mode: 'sky', location: null, weather: null, now: new Date(), deviceZone: 'Etc/UTC' });
    assert.equal(unknown.place.source, 'none');
    assert.equal(unknown.solar.estimated, true);
  });

  it('off mode resolves to a static scene', () => {
    assert.equal(scene('disabled').off, true);
  });
});

describe('performance budgets & stability', () => {
  it('builds the same cloud field every time (seeded, no re-randomising)', () => {
    assert.deepEqual(buildCloudField('high'), buildCloudField('high'));
    const f = buildCloudField('high');
    assert.ok(f.far.length + f.mid.length + f.near.length <= 11);
    assert.equal(buildCloudField('low').near.length, 0);
    assert.equal(visibleCount('near', 2, 0.2), 0);
    assert.equal(visibleCount('far', 5, 1), 5);
  });

  it('caps particles and lowers them on mobile / reduced motion', () => {
    const heavy = particleBudget({ precip: { kind: 'rain', level: 'heavy' }, intensity: 'high' });
    assert.ok(heavy.rain <= 110);
    assert.ok(particleBudget({ precip: { kind: 'rain', level: 'heavy' }, intensity: 'high', compact: true }).rain < heavy.rain);
    assert.ok(particleBudget({ precip: { kind: 'rain', level: 'heavy' }, intensity: 'low' }).rain < heavy.rain);
    assert.equal(particleBudget({ precip: null, decoration: null }).rain, 0);
  });
});

describe('preferences, freshness & roles', () => {
  it('sanitizes seasonal preference and time zone', () => {
    assert.equal(sanitizePrefs({}).seasonal, 'auto');
    assert.equal(sanitizePrefs({ seasonal: 'always' }).seasonal, 'auto');
    const p = sanitizePrefs({ location: { name: 'X', latitude: 35.6812, longitude: 139.7671, timezone: '<script>' } });
    assert.equal(p.location.timezone, '');
    assert.equal(p.location.latitude, 35.68);
  });

  it('marks old weather as expired instead of current', () => {
    const now = Date.now();
    assert.equal(weatherFreshness(now - 5 * 60_000, false, now), 'live');
    assert.equal(weatherFreshness(now - 5 * 60_000, true, now), 'cached');
    assert.equal(weatherFreshness(now - WEATHER_MAX_AGE_MS - 1, false, now), 'expired');
  });

  it('uses one shared sky for every role (no role-based petal lock)', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');
    assert.match(shell, /useAtmosphere\(\)/);
    for (const rel of ['src/features/atmosphere/useAtmosphere.js', 'src/features/atmosphere/atmosphereLogic.js', 'src/features/atmosphere/components/AtmosphericSky.jsx']) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.equal(/roleDecoration|'Mentor'/.test(code), false, `${rel} must not branch on role`);
    }
  });
});

describe('dynamic weather icons', () => {
  const icon = (input) => resolveWeatherIcon({ displayMode: 'weather', lightPhase: 'day', ...input }).key;

  it('maps verified conditions to the documented Lucide glyphs', () => {
    assert.equal(icon({ condition: 'clear', cloudCover: 5 }), 'sun');
    assert.equal(icon({ condition: 'partly', cloudCover: 45 }), 'cloud-sun');
    assert.equal(icon({ condition: 'partly', cloudCover: 45, isDay: false, lightPhase: 'night' }), 'cloud-moon');
    assert.equal(icon({ condition: 'mostly', cloudCover: 75 }), 'cloud');
    assert.equal(icon({ condition: 'overcast', cloudCover: 100 }), 'cloudy');
    assert.equal(icon({ condition: 'rain', weatherCode: 53, precipitation: { kind: 'rain', level: 'moderate' } }), 'drizzle');
    assert.equal(icon({ condition: 'rain', weatherCode: 63, precipitation: { kind: 'rain', level: 'moderate' } }), 'rain');
    assert.equal(icon({ condition: 'rain', weatherCode: 65, precipitation: { kind: 'rain', level: 'heavy' }, windSpeed: 45 }), 'rain-wind');
    assert.equal(icon({ condition: 'thunder' }), 'thunder');
    assert.equal(icon({ condition: 'snow' }), 'snow');
    assert.equal(icon({ condition: 'fog' }), 'fog');
    assert.equal(icon({ condition: 'clear', cloudCover: 3, isDay: false, lightPhase: 'night' }), 'moon-star');
    assert.equal(icon({ condition: 'clear', cloudCover: 3, lightPhase: 'golden', afternoon: false }), 'sunrise');
    assert.equal(icon({ condition: 'clear', cloudCover: 3, lightPhase: 'golden', afternoon: true }), 'sunset');
  });

  it('keeps precipitation icons at night and at sunrise/sunset', () => {
    assert.equal(icon({ condition: 'rain', weatherCode: 61, isDay: false, lightPhase: 'night' }), 'rain');
    assert.equal(icon({ condition: 'snow', lightPhase: 'golden', afternoon: true }), 'snow');
    assert.equal(icon({ condition: 'thunder', lightPhase: 'golden' }), 'thunder');
  });

  it('never shows Sun during storms or heavy rain', () => {
    for (const condition of ['thunder', 'rain']) {
      assert.notEqual(icon({ condition, precipitation: { kind: 'rain', level: 'heavy' }, cloudCover: 0 }), 'sun');
    }
  });

  it('treats wind as a supplement only', () => {
    const windy = resolveWeatherIcon({ displayMode: 'weather', condition: 'partly', cloudCover: 40, windSpeed: 58, lightPhase: 'day' });
    assert.equal(windy.key, 'cloud-sun');
    assert.equal(windy.supplement, 'wind');
    assert.equal(resolveWeatherIcon({ displayMode: 'weather', condition: 'partly', windSpeed: 10, lightPhase: 'day' }).supplement, null);
    assert.equal(resolveWeatherIcon({ displayMode: 'weather', condition: 'partly', windSpeed: null, lightPhase: 'day' }).supplement, null);
  });

  it('uses only time-of-day icons without verified data or in sky-only mode', () => {
    assert.equal(resolveWeatherIcon({ displayMode: 'weather', condition: null, lightPhase: 'day' }).key, 'sun');
    assert.equal(resolveWeatherIcon({ displayMode: 'weather', condition: null, lightPhase: 'night' }).key, 'moon-star');
    assert.equal(resolveWeatherIcon({ displayMode: 'sky', condition: 'rain', lightPhase: 'day' }).key, 'sun', 'sky mode ignores weather');
    assert.equal(resolveWeatherIcon({ displayMode: 'sky', lightPhase: 'twilight', afternoon: true }).key, 'sunset');
    assert.equal(resolveWeatherIcon({ displayMode: 'off' }).key, 'off');
    assert.equal(resolveWeatherIcon({ displayMode: 'weather', condition: null }).verified, false);
  });

  it('resolves scene and mode-option icons consistently', () => {
    const p = presetInputs(SCENE_PRESETS.find((x) => x.id === 'tokyo-rain'));
    const rainy = resolveScene({ ...p, deviceZone: 'Asia/Ho_Chi_Minh' });
    assert.equal(iconForScene(rainy).key, 'rain');
    const modes = modeIcons(rainy);
    assert.equal(modes.weather.key, 'rain');
    assert.equal(modes.sky.key, 'sun');
    assert.equal(modes.off.key, 'off');
    const nightSky = resolveScene({ mode: 'sky', location: TOKYO, weather: null, now: new Date('2026-11-20T13:40:00Z') });
    assert.equal(modeIcons(nightSky).sky.key, 'moon-star');
    assert.equal(modeIcons(nightSky).weather.key, 'cloud-moon', 'no data → neutral glyph, never rain/snow');
    const offScene = resolveScene({ mode: 'off', location: TOKYO, weather: null, now: new Date('2026-11-20T13:40:00Z') });
    assert.equal(iconForScene(offScene).key, 'off');
    assert.equal(modeIcons(offScene).sky.key, 'moon-star');
  });

  it('has Japanese labels for every icon', () => {
    for (const key of WEATHER_ICON_KEYS) assert.ok(jaAppCore[ICON_LABEL[key]], `JA for ${ICON_LABEL[key]}`);
  });

});

describe('original scenery preserved & no simulator in the UI', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/features/atmosphere/atmosphere.css'), 'utf8');
  const sky = fs.readFileSync(path.join(ROOT, 'src/features/atmosphere/components/AtmosphericSky.jsx'), 'utf8');

  it('keeps the original period gradients, weather veils, Fuji/torii, rain sheet and SVG petals', () => {
    for (const period of ['morning', 'afternoon', 'evening', 'night']) assert.ok(css.includes(`.rp-sky-layer[data-period='${period}']`), period);
    assert.match(css, /linear-gradient\(180deg, #0f1a3c 0%, #1b2a57 60%, #2a3767 100%\)/, 'original night gradient');
    assert.match(css, /linear-gradient\(180deg, #cdbde9 0%, #f0bccd 55%, #f9d3b8 100%\)/, 'original evening gradient');
    for (const cond of ['partly', 'cloudy', 'rain', 'snow', 'fog', 'thunder']) assert.ok(css.includes(`.rp-sky-layer[data-condition='${cond}']::before`), cond);
    assert.match(sky, /rp-sky-torii/);
    assert.match(sky, /M6 0C9 2\.5 11 5\.6 11 8\.6/, 'original petal silhouette');
    assert.match(css, /\.rp-sky-rain \{/);
  });

  it('maps engine scenes onto the original four periods and seven veils', () => {
    const at = (iso) => resolveScene({ mode: 'sky', location: TOKYO, weather: null, now: new Date(iso) }).visual.period;
    assert.equal(at('2026-04-01T23:30:00Z'), 'morning'); // 08:30 JST
    assert.equal(at('2026-04-02T05:00:00Z'), 'afternoon'); // 14:00 JST
    assert.equal(at('2026-04-02T09:05:00Z'), 'evening'); // ~18:05 JST, near sunset
    assert.equal(at('2026-04-02T13:00:00Z'), 'night'); // 22:00 JST
    const overcast = resolveScene({ mode: 'weather', location: TOKYO, weather: { temperature: 10, weatherCode: 3, cloudCover: 100 }, now: new Date('2026-04-02T05:00:00Z') });
    assert.equal(overcast.visual.condition, 'cloudy');
  });

  it('places sun and moon by progress inside the measured open band', () => {
    for (let h = 0; h < 24; h += 1) {
      const s = resolveScene({ mode: 'sky', location: TOKYO, weather: null, now: new Date(Date.UTC(2026, 10, 24, h)) });
      assert.ok(s.sun.p >= 0 && s.sun.p <= 1 && s.moonView.p >= 0 && s.moonView.p <= 1);
    }
    const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');
    assert.match(shell, /data-sky-open-band/);
  });

  it('shows a clearly visible full moon on a clear night and hides it under overcast', () => {
    const night = new Date('2026-11-24T13:00:00Z'); // 22:00 JST, near full moon
    const clear = resolveScene({ mode: 'weather', location: TOKYO, weather: { temperature: 9, weatherCode: 0, cloudCover: 5, isDay: false }, now: night });
    assert.ok(clear.moonView.opacity > 0.9);
    const overcast = resolveScene({ mode: 'weather', location: TOKYO, weather: { temperature: 9, weatherCode: 3, cloudCover: 100, isDay: false }, now: night });
    assert.equal(overcast.moonView.opacity, 0);
  });

  it('has no development scene preview in the popover or the shared hook', () => {
    for (const rel of ['src/features/atmosphere/components/WeatherSettings.jsx', 'src/features/atmosphere/components/WeatherHeaderControl.jsx', 'src/features/atmosphere/useAtmosphere.js']) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.equal(/SCENE_PRESETS|presetInputs|ScenePreview|Xem trước cảnh|Mô phỏng/.test(code), false, rel);
    }
  });
});
