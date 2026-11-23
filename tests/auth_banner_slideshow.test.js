import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUTH_SLIDES } from '@/features/auth/constants/authSlides.js';
import { PHOTOS } from '@/assets/photos.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Sakura Auth Banner Pack & Slideshow integration', () => {
  it('uses five distinct high-resolution scenes with complete editorial copy', () => {
    assert.equal(AUTH_SLIDES.length, 5);
    const expectedFiles = [
      'rikipath-banner-fuji-lake-hd.jpg',
      'rikipath-banner-pagoda-sunrise-hd.jpg',
      'rikipath-banner-kyoto-street-hd.jpg',
      'rikipath-banner-japanese-garden-hd.jpg',
      'rikipath-banner-kyoto-sakura-hd.webp',
    ];

    const seenPhotos = new Set();
    AUTH_SLIDES.forEach((slide, idx) => {
      assert.equal(seenPhotos.has(slide.photo), false, `Duplicate slide photo ${slide.photo}`);
      seenPhotos.add(slide.photo);

      const photo = PHOTOS[slide.photo];
      assert.ok(photo, `Missing PHOTOS entry for ${slide.photo}`);
      assert.equal(photo.jpg.endsWith(expectedFiles[idx]), true);
      assert.ok(photo.width >= 1600 && photo.height > 0);
      assert.ok(slide.position && slide.mobilePosition);
      assert.ok(slide.caption);
      assert.ok(slide.eyebrow && slide.description);
      assert.ok(slide.verticalLabel);
      assert.equal(slide.titleLines?.length, 2);
      assert.ok(slide.layout && slide.reveal);

      const fallbackDisk = path.join(ROOT, 'public', photo.jpg);
      assert.equal(fs.existsSync(fallbackDisk), true, `Missing asset ${fallbackDisk}`);
      for (const [webp] of photo.webp || []) {
        assert.equal(fs.existsSync(path.join(ROOT, 'public', webp)), true, `Missing asset ${webp}`);
      }
    });
  });

  it('uses 5-7s auto-advance interval, preloading, manual dots/prev/next controls, gradient scrims, visibility pause, and reduced motion', () => {
    const carousel = readSrc('src/features/auth/components/AuthScenicCarousel.jsx');
    assert.match(carousel, /SLIDE_INTERVAL_MS\s*=\s*(5\d{3}|6\d{3}|7000)/);
    assert.match(carousel, /SLIDE_FADE_MS\s*=\s*1150/);
    assert.match(carousel, /type="image\/webp"/);
    assert.match(carousel, /loading="eager"/);
    assert.match(carousel, /warm\.decode\?\.\(\)/);
    assert.match(carousel, /visibilitychange/);
    assert.match(carousel, /prefers-reduced-motion:\s*reduce/);
    assert.match(carousel, /animationPlayState:\s*animationPaused\s*\?\s*'paused'\s*:\s*'running'/);
    assert.match(carousel, /aria-label=\{tr\('Ảnh banner trước'\)\}/);
    assert.match(carousel, /aria-label=\{tr\('Ảnh banner tiếp theo'\)\}/);
    assert.match(carousel, /role="tablist"/);
    assert.match(carousel, /bg-gradient-to-t from-\[rgba\(22,10,18,0\.9\)\]/);
  });

  it('wires responsive desktop & compact mobile slideshow across Login, Register, and VerifyEmail layouts', () => {
    const layout = readSrc('src/layouts/AuthLayout.jsx');
    assert.match(layout, /<AuthScenicCarousel className=/);
    assert.match(layout, /<AuthScenicCarousel compact className=/);
    assert.doesNotMatch(layout, /<ScenicPhoto name="fuji"/);

    for (const rel of ['src/pages/auth/Auth.jsx', 'src/pages/auth/Register.jsx', 'src/pages/auth/VerifyEmail.jsx']) {
      const page = readSrc(rel);
      assert.match(page, /<AuthLayout\b/, `${rel} must use shared AuthLayout slideshow`);
    }

    const css = readSrc('src/styles/tokens.css');
    assert.match(css, /rp-kb-zoom-in/);
    assert.match(css, /rp-kb-pan-right/);
    assert.match(css, /rp-kb-zoom-out/);
    assert.match(css, /rp-kb-pan-left/);
    assert.match(css, /rp-auth-reveal/);
    assert.match(css, /7\.8s ease-out both/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rp-kb-zoom-in/);
  });
});
