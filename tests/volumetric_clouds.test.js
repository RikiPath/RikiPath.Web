import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLOUD_LAYERS,
  DENSITY_MOOD,
  SUN_PASS_SHAPE,
  buildCloudField,
  cloudDensity,
  cumulusShape,
  seededRandom,
  sunPassEnabled,
} from '../src/features/atmosphere/engine/clouds.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src/features/atmosphere/atmosphere.css'), 'utf8');
const sky = fs.readFileSync(path.join(ROOT, 'src/features/atmosphere/components/AtmosphericSky.jsx'), 'utf8');

describe('volumetric clouds — shapes', () => {
  it('every cumulus is a layered solid: back puffs, front puffs, flat base, lit caps, inside its viewBox', () => {
    const rand = seededRandom(42);
    for (let n = 0; n < 40; n += 1) {
      const s = cumulusShape(rand, 70 + n * 4);
      const [, , w, h] = s.viewBox.split(' ').map(Number);
      assert.ok(s.front.length >= 3 && s.back.length >= 2, 'layered puffs');
      assert.ok(s.lights.length >= 1, 'lit tops');
      for (const c of [...s.front, ...s.back]) {
        assert.ok(c.cx - c.r >= -0.5 && c.cx + c.r <= w + 0.5, 'x inside viewBox');
        assert.ok(c.cy - c.r >= -0.5 && c.cy + c.r <= h + 0.5, 'y inside viewBox');
      }
      // Flat base sits at the bottom of the cloud (cumulus look), below every puff centre.
      assert.ok(s.front.every((c) => c.cy < s.base.cy + 1));
      assert.ok(s.height / s.width > 0.3 && s.height / s.width < 0.7, 'puffy proportions, not a streak');
    }
  });

  it('layers are opaque with parallax (far slower and smaller than near)', () => {
    assert.ok(CLOUD_LAYERS.far.opacity >= 0.85 && CLOUD_LAYERS.mid.opacity >= 0.95 && CLOUD_LAYERS.near.opacity === 1);
    assert.ok(CLOUD_LAYERS.far.duration > CLOUD_LAYERS.mid.duration && CLOUD_LAYERS.mid.duration > CLOUD_LAYERS.near.duration);
    assert.ok(CLOUD_LAYERS.far.width[1] <= CLOUD_LAYERS.near.width[0]);
    assert.match(css, /\.rp-sky-cloud\[data-on='true'\]\[data-layer='far'\] \{ opacity: 0\.86/);
    assert.match(css, /\.rp-sky-cloud\[data-on='true'\]\[data-layer='near'\] \{ opacity: 1; \}/);
    assert.doesNotMatch(css, /\.rp-sky-cloud\[data-on='true'\]\[data-layer='far'\] \{ opacity: 0\.[0-6]/);
  });

  it('clouds end inside a 64 px header (no flat cut at the bottom edge)', () => {
    const f = buildCloudField('high');
    for (const slot of [...f.far, ...f.mid, ...f.near]) {
      const bottom = (slot.top / 100) * 64 + slot.shape.height;
      assert.ok(bottom <= 64, `${slot.id} bottom ${bottom.toFixed(1)}px`);
    }
  });

  it('field stays seeded and bounded', () => {
    assert.deepEqual(buildCloudField('high'), buildCloudField('high'));
    const f = buildCloudField('high');
    assert.ok(f.far.length + f.mid.length + f.near.length <= 11);
  });
});

describe('volumetric clouds — density, mood and the sun', () => {
  it('maps cover to few / scattered / broken / overcast', () => {
    assert.equal(cloudDensity(5, 'clear'), 'clear');
    assert.equal(cloudDensity(20, 'clear'), 'few');
    assert.equal(cloudDensity(45, 'partly'), 'scattered');
    assert.equal(cloudDensity(75, 'mostly'), 'broken');
    assert.equal(cloudDensity(95, 'overcast'), 'overcast');
    assert.equal(cloudDensity(30, 'thunder'), 'overcast');
    assert.equal(cloudDensity(null, 'partly'), 'scattered');
  });

  it('denser cover is darker and heavier', () => {
    const order = ['clear', 'few', 'scattered', 'broken', 'overcast'];
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(DENSITY_MOOD[order[i]].dim >= DENSITY_MOOD[order[i - 1]].dim);
      assert.ok(DENSITY_MOOD[order[i]].deck >= DENSITY_MOOD[order[i - 1]].deck);
    }
    assert.ok(DENSITY_MOOD.overcast.dim > DENSITY_MOOD.few.dim);
  });

  it('a cloud passes the sun only in sunny / partly cloudy daylight and never with reduced motion', () => {
    assert.equal(sunPassEnabled({ density: 'few', sunOpacity: 0.9, reducedMotion: false }), true);
    assert.equal(sunPassEnabled({ density: 'scattered', sunOpacity: 0.8, reducedMotion: false }), true);
    assert.equal(sunPassEnabled({ density: 'clear', sunOpacity: 1, reducedMotion: false }), false);
    assert.equal(sunPassEnabled({ density: 'overcast', sunOpacity: 0.5, reducedMotion: false }), false);
    assert.equal(sunPassEnabled({ density: 'few', sunOpacity: 0.2, reducedMotion: false }), false);
    assert.equal(sunPassEnabled({ density: 'few', sunOpacity: 0.9, reducedMotion: true }), false);
    assert.ok(SUN_PASS_SHAPE.width >= 110, 'the passing cluster is big enough to cover the disc');
  });

  it('render order: clouds after the sun/moon (they occlude), bloom after clouds (light wraps the edges)', () => {
    const iSun = sky.indexOf('className="rp-sky-sun"');
    const iMoon = sky.indexOf('className="rp-sky-moon"');
    const iClouds = sky.indexOf("['far', 'mid'].map");
    const iNear = sky.indexOf('field.near.map');
    const iBloom = sky.indexOf('className="rp-sky-bloom"');
    assert.ok(iSun > 0 && iMoon > iSun && iClouds > iMoon && iNear > iClouds && iBloom > iNear);
    assert.match(css, /\.rp-sky-bloom \{[\s\S]*?mix-blend-mode: screen/);
    assert.match(css, /\.rp-sky-bloom\[data-diffuse='true'\]/);
  });

  it('pass cloud and shade share one timeline; both stop under reduced motion', () => {
    assert.match(css, /\.rp-sky-pass-cloud \{[\s\S]*?animation: rp-sky-pass 96s linear infinite/);
    assert.match(css, /\.rp-sky-shade \{[\s\S]*?animation: rp-sky-shade 96s linear infinite/);
    assert.match(css, /\.rp-sky-pass, \.rp-sky-shade \{ display: none; \}/);
  });
});
