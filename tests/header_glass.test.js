import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GLASS_VARIANTS,
  GLASS_WORST_BACKDROPS,
  brandPathInk,
  brandSurface,
  compositeOver,
  contrastRatio,
  glassPolarity,
  glassVars,
  resolveGlassVariant,
  worstTextContrast,
} from '../src/features/atmosphere/engine/headerGlass.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));

const base = { off: false, isDark: false, condition: 'clear', precip: { kind: 'none', level: 0 }, solar: { phase: 'day', elevation: 30, afternoon: false }, period: 'morning', visual: { period: 'morning' }, moonView: { opacity: 0 } };
const scene = (over) => ({ ...base, ...over });

// 20-scene matrix: [label, scene, expected variant]
const MATRIX = [
  ['clear morning', scene({}), 'light'],
  ['clear noon', scene({ period: 'noon', solar: { phase: 'day', elevation: 70 } }), 'bright'],
  ['clear afternoon', scene({ period: 'afternoon', visual: { period: 'afternoon' }, solar: { phase: 'day', elevation: 35, afternoon: true } }), 'warm'],
  ['golden sunset', scene({ period: 'evening', visual: { period: 'evening' }, solar: { phase: 'golden', elevation: 4, afternoon: true } }), 'warm'],
  ['partly cloudy morning', scene({ condition: 'partly' }), 'light'],
  ['mostly cloudy', scene({ condition: 'mostly' }), 'neutral'],
  ['overcast', scene({ condition: 'overcast' }), 'neutral'],
  ['light rain day', scene({ condition: 'rain', precip: { kind: 'rain', level: 1 } }), 'rain'],
  ['heavy rain day', scene({ condition: 'rain', precip: { kind: 'rain', level: 3 } }), 'rain'],
  ['thunder day', scene({ condition: 'thunder', precip: { kind: 'rain', level: 3 } }), 'storm'],
  ['thunder night', scene({ isDark: true, condition: 'thunder' }), 'storm'],
  ['snow day', scene({ condition: 'snow', precip: { kind: 'snow', level: 2 } }), 'snow'],
  ['fog morning', scene({ condition: 'fog' }), 'fog'],
  ['clear night, moon up', scene({ isDark: true, period: 'latenight', visual: { period: 'night' }, solar: { phase: 'night', elevation: -30 }, moonView: { opacity: 0.9 } }), 'moon'],
  ['clear night, no moon', scene({ isDark: true, period: 'latenight', visual: { period: 'night' }, solar: { phase: 'night', elevation: -30 }, moonView: { opacity: 0 } }), 'dark'],
  ['rainy night', scene({ isDark: true, condition: 'rain', precip: { kind: 'rain', level: 2 }, moonView: { opacity: 0.9 } }), 'dark'],
  ['snowy night', scene({ isDark: true, condition: 'snow', precip: { kind: 'snow', level: 1 } }), 'dark'],
  ['sky off, light theme', { off: true }, 'system'],
  ['sky off, dark theme', { off: true, theme: 'dark' }, 'system-dark'],
  ['high contrast night', scene({ isDark: true, hc: true }), 'high-contrast-dark'],
];

describe('Adaptive Atmospheric Glass V3 — resolver', () => {
  for (const [label, sc, expected] of MATRIX) {
    it(`${label} → ${expected}`, () => {
      const got = resolveGlassVariant(sc, { themeMode: sc.theme || 'light', highContrast: Boolean(sc.hc) });
      assert.equal(got, expected);
    });
  }

  it('null scene (sky off) resolves to the system surface', () => {
    assert.equal(resolveGlassVariant(null), 'system');
  });

  it('polarity follows the sky darkness, never dark ink on dark glass', () => {
    for (const [, sc] of MATRIX) {
      const v = resolveGlassVariant(sc, { themeMode: sc.theme || 'light', highContrast: Boolean(sc.hc) });
      const p = glassPolarity(v);
      const ink = relLum(hex(GLASS_VARIANTS[v].text));
      if (p === 'dark') assert.ok(ink > 0.7, `${v}: light ink on dark glass`);
      else assert.ok(ink < 0.05, `${v}: dark ink on light glass`);
    }
  });
});

function relLum([r, g, b]) {
  const c = (x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

describe('Adaptive Atmospheric Glass V3 — contrast over real sky colours', () => {
  for (const variant of Object.keys(GLASS_WORST_BACKDROPS)) {
    it(`${variant}: text and muted text ≥ 4.5:1 over its worst backdrops`, () => {
      assert.ok(worstTextContrast(variant) >= 4.5, `${variant} = ${worstTextContrast(variant).toFixed(2)}`);
    });
    it(`${variant}: icons and accent ≥ 3:1`, () => {
      const v = GLASS_VARIANTS[variant];
      const vars = glassVars(variant);
      for (const bd of GLASS_WORST_BACKDROPS[variant]) {
        const surface = compositeOver(v.bg, bd);
        assert.ok(contrastRatio(hex(v.icon), surface) >= 3, `${variant} icon over ${bd}`);
        assert.ok(contrastRatio(hex(vars['--header-glass-accent']), surface) >= 3, `${variant} accent over ${bd}`);
        assert.ok(contrastRatio(hex(vars['--header-glass-globe']), surface) >= 3, `${variant} globe over ${bd}`);
      }
    });
  }

  it('brand pill: "Riki" ≥ 4.5:1 and Sakura "Path" ≥ 3:1 (large bold text) over the worst sky', () => {
    for (const variant of Object.keys(GLASS_WORST_BACKDROPS)) {
      const v = GLASS_VARIANTS[variant];
      for (const bd of GLASS_WORST_BACKDROPS[variant]) {
        const surface = compositeOver(brandSurface(v), bd);
        assert.ok(contrastRatio(hex(v.text), surface) >= 4.5, `${variant} Riki over ${bd}`);
        assert.ok(contrastRatio(hex(brandPathInk(v)), surface) >= 3, `${variant} Path over ${bd}: ${contrastRatio(hex(brandPathInk(v)), surface).toFixed(2)}`);
      }
    }
  });

  it('system and high-contrast surfaces meet 4.5:1 over white and night navy', () => {
    for (const variant of ['system', 'system-dark', 'high-contrast-light', 'high-contrast-dark']) {
      const v = GLASS_VARIANTS[variant];
      for (const bd of ['#ffffff', '#0f1a3c']) {
        const surface = compositeOver(v.bg, bd);
        assert.ok(contrastRatio(hex(v.text), surface) >= 4.5, `${variant} over ${bd}`);
      }
    }
  });

  it('low-power devices get a lighter blur, system surfaces none', () => {
    assert.match(glassVars('light', { reduceBlur: true })['--header-glass-blur'], /blur\(8px\)/);
    assert.equal(glassVars('system')['--header-glass-blur'], 'none');
  });
});

describe('Adaptive Atmospheric Glass V3 — wiring', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/features/atmosphere/atmosphere.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');

  it('header applies the resolved tokens and exposes variant / polarity / switching', () => {
    assert.match(shell, /useHeaderGlass\(/);
    assert.match(shell, /data-glass-variant=\{headerGlass\.variant\}/);
    assert.match(shell, /data-glass-switching=/);
    assert.match(shell, /style=\{headerGlass\.style\}/);
  });

  it('controls consume --header-glass-* tokens with backdrop blur and a fallback', () => {
    assert.match(css, /\.rp-sky-header \.rp-hc \{[\s\S]*?background-color: var\(--header-glass-bg\)/);
    assert.match(css, /backdrop-filter: var\(--header-glass-blur\)/);
    assert.match(css, /@supports not \(\(backdrop-filter/);
    assert.match(css, /\[data-glass-switching='true'\] \.rp-hc > \*/);
    assert.match(css, /\[data-glass-variant\] \.rp-header-brand \{[\s\S]*?background: var\(--header-glass-brand-bg\)/);
  });
});
