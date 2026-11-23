// Landing page: business facts, CTA routes, motion safety, back-to-home links.
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}
globalThis.window = globalThis.window || {};
window.sessionStorage = memoryStorage();

const content = await import('@/features/landing/constants/landingContent.js');
const { __testing: motion } = await import('@/features/landing/hooks/useLandingMotion.js');
const { ROUTES } = await import('@/app/routes/routeTable.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const routePaths = new Set(ROUTES.map((r) => r.path));
const landingSources = [
  'src/pages/marketing/HomeLanding.jsx',
  'src/features/landing/components/HeroLearningScene.jsx',
  'src/features/landing/components/LandingSections.jsx',
  'src/features/landing/constants/landingContent.js',
  'src/layouts/PublicShell.jsx',
].map(readSrc).join('\n');
// Visible copy only (strip comments, which legitimately say "no testimonials").
const landingCopy = landingSources.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const routePatterns = ROUTES.map((r) => new RegExp(`^${r.path.replace(/:[^/]+/g, '[^/]+')}$`));
const isRoute = (p) => routePaths.has(p) || routePatterns.some((re) => re.test(p));

describe('landing: business facts', () => {
  it('only presents the supported JLPT levels N5–N2 (no N1)', () => {
    assert.deepEqual(content.LEVELS.map((l) => l.level), ['N5', 'N4', 'N3', 'N2']);
    assert.doesNotMatch(landingSources, /\bN1\b/);
  });

  it('group learning facts match the rules: 10 weeks, 90 minutes, 1–4 learners, 2/3/4 sessions per week', () => {
    assert.deepEqual(content.INTENSITY.map((p) => [p.perWeek, p.sessions, p.hours]), [[2, 20, 30], [3, 30, 45], [4, 40, 60]]);
    for (const plan of content.INTENSITY) {
      assert.equal(plan.sessions, plan.perWeek * 10, '10-week course');
      assert.equal(plan.hours, plan.sessions * 1.5, '90-minute sessions');
      assert.equal(plan.days.length, plan.perWeek);
    }
    assert.match(landingSources, /1–4 học viên/);
  });

  it('shows no fabricated statistics, ratings or testimonials', () => {
    assert.doesNotMatch(landingCopy, /\d[\d.,]*\+?\s*(học viên đã|người học|lượt|đánh giá 5 sao)|testimonial|★/i);
    assert.match(readSrc('src/features/landing/components/HeroLearningScene.jsx'), /không phải dữ liệu học tập thật/);
  });

  it('journey has the five agreed steps', () => {
    assert.deepEqual(content.JOURNEY.map((s) => s.title), ['Đăng ký', 'Chọn mục tiêu JLPT', 'Học & luyện tập', 'Theo dõi tiến độ', 'Nhận gợi ý & hỗ trợ']);
  });
});

describe('landing: CTAs point at real routes', () => {
  it('every internal link target in landing sources exists in the route table', () => {
    const targets = [...landingSources.matchAll(/(?:to|href)=["'{`]+(\/[a-z0-9/-]*)/gi)].map((m) => m[1]);
    const toFields = [...landingSources.matchAll(/\bto: '(\/[a-z0-9/-]*)/gi)].map((m) => m[1]);
    for (const target of [...targets, ...toFields]) {
      const clean = target.replace(/\/$/, '') || '/';
      assert.ok(isRoute(clean), `${target} is not a route`);
    }
  });

  it('signed-in visitors go to their role home instead of /register or /plans', () => {
    const page = readSrc('src/pages/marketing/HomeLanding.jsx');
    assert.match(page, /isAuthenticated \? homeForRole\(primaryRole\) : '\/register'/);
    assert.doesNotMatch(landingSources, /'\/plans'/);
  });
});

describe('landing: motion safety', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    motion.reset();
  });

  it('plays the cinematic intro once per browser session (StrictMode re-run inside the window still plays)', () => {
    assert.equal(motion.shouldPlayIntro(), true);
    assert.equal(window.sessionStorage.getItem(motion.INTRO_KEY), '1');
    assert.equal(motion.shouldPlayIntro(), true, 'same page load re-run');
    motion.reset();
    assert.equal(motion.shouldPlayIntro(), false, 'later visit in the same session');
  });

  it('content is visible without JS: hiding only happens under classes added by the hook', () => {
    const css = readSrc('src/features/landing/landing.css');
    assert.match(css, /\.rp-reveal-on \[data-reveal\]:not\(\.is-in\) \{ opacity: 0;/);
    assert.match(css, /\.rp-intro-play \[data-intro\] \{ animation: lp-rise/);
    assert.doesNotMatch(css.replace(/\.rp-(reveal-on|intro-play)[^{]*\{[^}]*\}/g, ''), /^\s*\[data-(reveal|intro)\][^{]*\{[^}]*opacity:\s*0/m);
  });

  it('respects reduced motion and pauses idle loops off-screen', () => {
    const css = readSrc('src/features/landing/landing.css');
    assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*\.rp-landing \*[\s\S]*animation: none !important/);
    assert.match(css, /\[data-paused\] \.lp-bob/);
    const hook = readSrc('src/features/landing/hooks/useLandingMotion.js');
    assert.match(hook, /prefersReducedMotion\(\)/);
    assert.match(hook, /IntersectionObserver/);
  });

  it('pointer tilt never sets React state per frame and is limited', () => {
    const scene = readSrc('src/features/landing/components/HeroLearningScene.jsx');
    assert.match(scene, /const MAX_TILT = 5;/);
    assert.match(scene, /requestAnimationFrame\(apply\)/);
    assert.match(scene, /style\.setProperty\('--rx'/);
    assert.match(scene, /\(hover: hover\) and \(pointer: fine\)/);
  });

  it('adds no heavy animation libraries', () => {
    const pkg = JSON.parse(readSrc('package.json'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const lib of ['three', 'gsap', 'lottie-web', 'lottie-react', '@rive-app/react-canvas', 'framer-motion', 'motion']) {
      assert.ok(!deps.includes(lib), `${lib} should not be added for landing effects`);
    }
  });

  it('hero slideshow preserves original 5 scenes + adds the remaining 7 unique Japan banners (12 unique slides total)', () => {
    const scene = readSrc('src/features/landing/components/HeroLearningScene.jsx');
    assert.match(scene, /aspect-\[4\/5\][^"]*aspect-\[6\/5\][^"]*" \/>\s*<HeroScenicSlideshow className="absolute inset-0"/);
    assert.doesNotMatch(readSrc('src/pages/marketing/HomeLanding.jsx'), /<HeroScenicSlideshow/);

    const slidesSrc = readSrc('src/features/landing/components/HeroScenicSlideshow.jsx');
    assert.match(slidesSrc, /\{ name: 'fuji'/);
    assert.match(slidesSrc, /priority=\{current === 0\}/);

    const names = [...slidesSrc.matchAll(/\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]);
    assert.equal(names.length, 12, '5 existing hero scenes + 7 remaining Japan banners = 12 slides');
    assert.equal(new Set(names).size, 12, 'No duplicate slide names in HeroScenicSlideshow');
    for (const added of ['bannerHokkaido', 'bannerTokyo', 'bannerOsaka', 'bannerKanazawa', 'bannerMiyajima', 'bannerNara', 'bannerOkinawa']) {
      assert.ok(names.includes(added), `Hero slideshow must include ${added}`);
    }
    assert.equal(names.includes('bannerKyotoSakura'), false, 'Kyoto banner belongs strictly to Login slideshow');
  });

  it('hero slideshow renders no controls and pauses when hidden / off-screen / reduced motion', () => {
    const slides = readSrc('src/features/landing/components/HeroScenicSlideshow.jsx');
    assert.doesNotMatch(slides, /<button|role="tab"|aria-current|progress/i);
    assert.match(slides, /document\.hidden/);
    assert.match(slides, /IntersectionObserver/);
    assert.match(slides, /prefers-reduced-motion: reduce/);
  });

  it('public header navigates to existing Homepage sections and renders Login + Register without Bắt đầu ôn luyện', () => {
    const navSrc = readSrc('src/layouts/navConfig.js');
    const shellSrc = readSrc('src/layouts/PublicShell.jsx');
    const sectionsSrc = readSrc('src/features/landing/components/LandingSections.jsx');
    for (const id of ['roadmap', 'ecosystem', 'group-learning', 'faq']) {
      assert.match(navSrc, new RegExp(`id:\\s*'${id}'`));
      assert.ok(sectionsSrc.includes(`id="${id}"`), `Existing Homepage section id="${id}" must exist`);
    }
    assert.doesNotMatch(navSrc, /Bắt đầu ôn luyện/);
    assert.doesNotMatch(shellSrc, /Bắt đầu ôn luyện/);
    assert.match(shellSrc, /MARKETING_NAV\.login\.to/);
    assert.match(shellSrc, /MARKETING_NAV\.register\.to/);
  });
});

describe('back to home', () => {
  it('auth screens and the app top bar link back to the landing page', () => {
    assert.match(readSrc('src/components/brand/BackHomeLink.jsx'), /to="\/"/);
    assert.match(readSrc('src/layouts/AuthLayout.jsx'), /<BackHomeLink \/>/);
    assert.match(readSrc('src/layouts/AppShell.jsx'), /<BackHomeLink variant="icon" \/>/);
  });
});
