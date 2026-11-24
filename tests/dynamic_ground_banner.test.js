import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveScene } from '../src/features/atmosphere/engine/sceneResolver.js';
import {
  DAY_PALETTE,
  GROUND_LAYOUTS,
  GROUND_LAYOUT_LABEL,
  goldenWeight,
  greetingFor,
  layoutFor,
  resolveGroundScene,
} from '../src/features/atmosphere/ground/groundScene.js';
import { luminance } from '../src/features/atmosphere/engine/palette.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOKYO = { name: 'Tokyo', country: 'Nhật Bản', latitude: 35.68, longitude: 139.69, timezone: 'Asia/Tokyo', source: 'search' };

function atmo({ mode = 'weather', now, weather = null, reducedMotion = false, intensity = 'medium' }) {
  const scene = resolveScene({ mode, location: TOKYO, weather, now: new Date(now), deviceZone: 'Asia/Ho_Chi_Minh' });
  return { scene, prefs: { mode }, effectiveIntensity: intensity, reducedMotion, lowPower: false };
}

const DAY = { now: '2027-04-03T03:00:00Z', weather: { temperature: 18, weatherCode: 0, cloudCover: 5 } };

describe('Dynamic Ground Banner — shared sky context', () => {
  it('follows the header scene: same place-local time for the greeting, not the device clock', () => {
    const a = atmo(DAY); // 12:00 in Tokyo while the device zone is Ho Chi Minh (10:00)
    const g = resolveGroundScene(a);
    assert.equal(a.scene.local.hour, 12);
    assert.equal(g.greeting, 'day');
    assert.equal(greetingFor(6), 'dawn');
    assert.equal(greetingFor(18), 'dusk');
    assert.equal(greetingFor(23), 'night');
  });

  it('continues the header sky colours at the top of the ground canvas', () => {
    const a = atmo({ ...DAY, now: '2027-04-03T08:58:00Z' });
    const g = resolveGroundScene(a);
    assert.equal(g.sky.top, a.scene.palette.vars['--rp-sky-mid']);
    assert.equal(g.sky.bottom, a.scene.palette.vars['--rp-sky-bottom']);
  });

  it('grades day, golden hour and night from the sun (night darkens, lights come on)', () => {
    const day = resolveGroundScene(atmo(DAY));
    const dusk = resolveGroundScene(atmo({ ...DAY, now: '2027-04-03T08:58:00Z' }));
    const night = resolveGroundScene(atmo({ ...DAY, now: '2027-04-03T13:00:00Z' }));
    assert.ok(goldenWeight(1) > 0.5 && goldenWeight(30) === 0 && goldenWeight(-10) === 0);
    assert.ok(dusk.golden > 0.5 && day.golden === 0);
    assert.ok(luminance(night.palette.grass) < luminance(day.palette.grass) * 0.5);
    assert.equal(night.tone, 'dark');
    assert.equal(day.tone, 'light');
    assert.ok(night.lights > 0.9 && day.lights === 0);
    assert.notEqual(dusk.palette.mtnFar, day.palette.mtnFar);
  });

  it('rain: wet darker ground, ripples and rain particles; snow: snow cover, winter foliage, snowfall', () => {
    const rain = resolveGroundScene(atmo({ now: '2027-06-10T03:00:00Z', weather: { temperature: 21, weatherCode: 63, cloudCover: 95, precipitation: 4 } }));
    assert.equal(rain.particles.kind, 'rain');
    assert.ok(rain.water.ripples > 0 && rain.wet > 0);
    const snow = resolveGroundScene(atmo({ now: '2027-01-20T03:00:00Z', weather: { temperature: -1, weatherCode: 73, cloudCover: 90, snowfall: 1.5 } }));
    assert.equal(snow.particles.kind, 'snow');
    assert.equal(snow.foliageKey, 'winter');
    assert.ok(luminance(snow.palette.grass) > luminance(DAY_PALETTE.grass));
  });

  it('seasons: sakura petals in bloom, momiji leaves in autumn, never a contradiction with the header', () => {
    const spring = resolveGroundScene(atmo(DAY));
    assert.equal(spring.foliageKey, 'sakura');
    assert.equal(spring.particles?.kind, 'petals');
    const autumn = resolveGroundScene(atmo({ now: '2027-11-25T03:00:00Z', weather: { temperature: 14, weatherCode: 0, cloudCover: 5 } }));
    assert.equal(autumn.foliageKey, 'momiji');
    assert.equal(autumn.particles?.kind, 'leaves');
    const summer = resolveGroundScene(atmo({ now: '2027-07-20T02:00:00Z', weather: { temperature: 30, weatherCode: 1, cloudCover: 15 } }));
    assert.equal(summer.particles, null, 'no petals when the header shows none');
  });

  it('sky-only mode uses no weather; weather unavailable falls back to a clear sky; disabled sky is static', () => {
    const skyOnly = resolveGroundScene(atmo({ mode: 'sky', now: '2027-06-10T03:00:00Z', weather: { weatherCode: 63, precipitation: 4 } }));
    assert.equal(skyOnly.wet, 0);
    assert.notEqual(skyOnly.particles?.kind, 'rain');
    const unavailable = resolveGroundScene(atmo({ now: '2027-06-10T03:00:00Z', weather: null }));
    assert.equal(unavailable.wet, 0);
    const off = resolveGroundScene(atmo({ mode: 'off', now: '2027-06-10T03:00:00Z' }));
    assert.equal(off.static, true);
    assert.equal(off.motion, false);
    assert.equal(off.particles, null);
    const none = resolveGroundScene(null);
    assert.equal(none.static, true);
    assert.equal(none.motion, false);
  });

  it('reduced motion keeps the lit scene but stops particles and loops', () => {
    const g = resolveGroundScene(atmo({ ...DAY, reducedMotion: true }));
    assert.equal(g.motion, false);
    assert.equal(g.particles, null);
    assert.equal(g.foliageKey, 'sakura');
  });

  it('composition: beginners start on the riverside, then one layout per local day; richer with progress', () => {
    assert.equal(layoutFor({ dayOfYear: 200, completedLessons: 0 }), 'sakura_riverside');
    const seen = new Set(Array.from({ length: 5 }, (_, i) => layoutFor({ dayOfYear: i, completedLessons: 3 })));
    assert.equal(seen.size, GROUND_LAYOUTS.length);
    for (const l of GROUND_LAYOUTS) assert.ok(GROUND_LAYOUT_LABEL[l]);
    assert.equal(resolveGroundScene(atmo(DAY), { completedLessons: 0 }).richness, 0);
    assert.equal(resolveGroundScene(atmo(DAY), { completedLessons: 40, completionPct: 70 }).richness, 2);
  });
});

describe('Dynamic Ground Banner — wiring contracts', () => {
  it('dashboard uses the vector ground scene, not roadmap paintings or the device-clock scene', () => {
    const home = fs.readFileSync(path.join(ROOT, 'src/pages/learner/HomeLearner.jsx'), 'utf8');
    const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');
    const groundDir = path.join(ROOT, 'src/features/atmosphere/ground');
    const groundSrc = fs.readdirSync(groundDir).map((f) => fs.readFileSync(path.join(groundDir, f), 'utf8')).join('\n');
    assert.ok(home.includes('<DynamicGroundBanner'));
    assert.ok(!home.includes('<JapanScene'));
    assert.ok(shell.includes('<AtmosphereContext.Provider value={atmosphere}>'), 'header and banner share one atmosphere');
    assert.ok(!groundSrc.includes('roadmap-world') && !/\.webp|\.jpg|\.png/.test(groundSrc), 'no painted images in the ground scene');
    assert.ok(!groundSrc.includes('fetchCurrentWeather'), 'no second weather request');
    assert.ok(/prefers-reduced-motion/.test(groundSrc));
  });
});
