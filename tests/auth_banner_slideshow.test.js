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
  it('configures exactly the 4 Sakura Banner Pack slides with WebP primary, JPG fallback, and files on disk', () => {
    assert.equal(AUTH_SLIDES.length, 4);
    const expectedFiles = [
      'rikipath-banner-fuji-lake',
      'rikipath-banner-pagoda-sunrise',
      'rikipath-banner-kyoto-street',
      'rikipath-banner-japanese-garden',
    ];

    AUTH_SLIDES.forEach((slide, idx) => {
      const photo = PHOTOS[slide.photo];
      assert.ok(photo, `Missing PHOTOS entry for ${slide.photo}`);
      assert.ok(Array.isArray(photo.webp) && photo.webp.length > 0, `Missing webp srcset for ${slide.photo}`);
      assert.match(photo.jpg, new RegExp(`${expectedFiles[idx]}\\.jpg$`));
      assert.match(photo.webp[0][0], new RegExp(`${expectedFiles[idx]}\\.webp$`));
      assert.ok(photo.width > 0 && photo.height > 0);
      assert.ok(slide.position && slide.mobilePosition);
      assert.ok(slide.caption);

      const webpDisk = path.join(ROOT, 'public', photo.webp[0][0]);
      const jpgDisk = path.join(ROOT, 'public', photo.jpg);
      assert.equal(fs.existsSync(webpDisk), true, `Missing asset ${webpDisk}`);
      assert.equal(fs.existsSync(jpgDisk), true, `Missing asset ${jpgDisk}`);
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
    assert.match(css, /7\.8s ease-out both/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.rp-kb-zoom-in/);
  });
});
