import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONTAINER_WIDTHS,
  DENSITY_LEVELS,
  GRID_MIN_PRESETS,
  getColumnPriorityClass,
  getContainerClass,
  getFluidGridStyle,
  normalizeDensity,
} from '@/components/ui/layoutLogic.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Fluid Design Tokens & CSS Container Queries', () => {
  const tokens = readSrc('src/styles/tokens.css');
  const indexCss = readSrc('src/index.css');

  it('defines fluid rem+clamp typography tokens and all 11 semantic type classes', () => {
    const vars = [
      '--rp-text-display',
      '--rp-text-page-title',
      '--rp-text-section',
      '--rp-text-card-title',
      '--rp-text-body',
      '--rp-text-secondary',
      '--rp-text-caption',
      '--rp-text-label',
      '--rp-text-button',
      '--rp-text-kpi',
      '--rp-text-nav',
    ];
    for (const v of vars) {
      assert.match(tokens, new RegExp(`${v}:\\s*clamp\\([^;]*rem`), `expected fluid rem clamp for ${v}`);
    }

    const classes = [
      '.rp-type-display',
      '.rp-type-page-title',
      '.rp-type-section',
      '.rp-type-card',
      '.rp-type-body',
      '.rp-type-secondary',
      '.rp-type-caption',
      '.rp-type-label',
      '.rp-type-button',
      '.rp-type-kpi',
      '.rp-type-nav',
    ];
    for (const cls of classes) {
      assert.ok(tokens.includes(cls), `missing typography class ${cls}`);
    }
  });

  it('defines adaptive shell dimensions, fluid spacing, and 3 semantic density levels', () => {
    assert.match(tokens, /--spacing-rp-sidebar:\s*clamp\(/);
    assert.match(tokens, /--spacing-rp-topbar:\s*clamp\(/);
    for (const density of ['compact', 'comfortable', 'spacious']) {
      assert.ok(tokens.includes(`[data-density='${density}']`), `missing density token block for ${density}`);
    }
    assert.ok(tokens.includes('@media (pointer: coarse)'));
    assert.ok(tokens.includes('--rp-tap-min: 44px'));
  });

  it('defines all 5 adaptive container widths and @container rp-panel responsive rules', () => {
    for (const cls of ['.rp-container-narrow', '.rp-container-reading', '.rp-container', '.rp-container-wide', '.rp-container-full']) {
      assert.ok(tokens.includes(cls), `missing container class ${cls}`);
    }
    assert.match(tokens, /\.rp-cq\s*\{[^}]*container-type:\s*inline-size/);
    assert.ok(tokens.includes('@container rp-panel'));
    assert.ok(tokens.includes('.rp-fluid-grid'));
    assert.ok(tokens.includes('.rp-cq-kpis'));
    assert.ok(tokens.includes('.rp-cq-practice'));
    assert.ok(tokens.includes('.rp-cq-two-col'));
    assert.ok(tokens.includes('.rp-scroll-x'));
  });

  it('keeps unified wide scenic banner column ratio across desktop Login and Register pages', () => {
    assert.match(tokens, /\.rp-auth-card\[data-variant='login'\],\s*\.rp-auth-card\[data-variant='register'\]\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1\.55fr\)\s+minmax\(380px,\s*1fr\)/);

    const registerSrc = readSrc('src/pages/auth/Register.jsx');
    assert.ok(registerSrc.includes("t('fullName')"), 'Register should render single fullName input');
    assert.equal(registerSrc.includes("t('firstName')"), false);
    assert.equal(registerSrc.includes("t('lastName')"), false);

    const settingsSrc = readSrc('src/pages/learner/LearnerSettings.jsx');
    assert.ok(settingsSrc.includes('name="fullName"'), 'LearnerSettings should render single fullName input');
    assert.equal(settingsSrc.includes('name="firstName"'), false);
    assert.equal(settingsSrc.includes('name="lastName"'), false);

    const profileApiSrc = readSrc('src/features/profile/api/profileApi.js');
    assert.match(profileApiSrc, /updateProfile\(\{\s*fullName\s*\}\)/);
  });

  it('removes colliding fixed sidebar/topbar tokens from index.css', () => {
    assert.equal(indexCss.includes('--spacing-sidebar-width'), false);
    assert.equal(indexCss.includes('--spacing-topbar-height'), false);
    assert.match(tokens, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});

describe('Layout Primitives logic & exports', () => {
  it('resolves container classes, densities, fluid min-width styles, and table column priority cleanly', () => {
    assert.equal(getContainerClass('narrow'), CONTAINER_WIDTHS.narrow);
    assert.equal(getContainerClass('wide'), CONTAINER_WIDTHS.wide);
    assert.equal(getContainerClass('unknown'), CONTAINER_WIDTHS.default);

    assert.deepEqual(DENSITY_LEVELS, ['compact', 'comfortable', 'spacious']);
    assert.equal(normalizeDensity('compact'), 'compact');
    assert.equal(normalizeDensity('invalid'), 'comfortable');

    assert.deepEqual(getFluidGridStyle('sm'), { '--rp-grid-min': GRID_MIN_PRESETS.sm });
    assert.deepEqual(getFluidGridStyle('12rem', { gap: '1rem' }), { gap: '1rem', '--rp-grid-min': '12rem' });

    assert.equal(getColumnPriorityClass('essential'), '');
    assert.equal(getColumnPriorityClass('secondary'), 'hidden sm:table-cell');
    assert.equal(getColumnPriorityClass('optional'), 'hidden lg:table-cell');
  });

  it('exports all adaptive primitives from layout.jsx and ui/index.js', () => {
    const layoutJsx = readSrc('src/components/ui/layout.jsx');
    const barrel = readSrc('src/components/ui/index.js');
    for (const name of ['PageContainer', 'FluidGrid', 'ResponsiveSection', 'AdaptiveCard', 'DashboardGrid', 'ResponsiveStack', 'DataPanel']) {
      assert.ok(layoutJsx.includes(`export function ${name}`), `missing ${name} in layout.jsx`);
    }
    assert.ok(barrel.includes("export * from './layout.jsx'"));
    assert.ok(barrel.includes("export * from './layoutLogic.js'"));
  });
});

describe('Screen responsive regression guards', () => {
  it('guards critical views against 320px horizontal overflow and 1024px panel crush', () => {
    const homeLearner = readSrc('src/pages/learner/HomeLearner.jsx');
    assert.ok(homeLearner.includes('rp-cq-kpis'));
    assert.ok(homeLearner.includes('rp-cq-two-col'));
    assert.ok(homeLearner.includes('rp-cq-practice'));

    const kanaPage = readSrc('src/pages/learner/KanjiWritingPracticePage.jsx');
    assert.ok(kanaPage.includes('rp-fluid-grid'));
    assert.equal(kanaPage.includes("'grid-cols-5'"), false);

    const vocab = readSrc('src/pages/learner/VocabularyNotebook.jsx');
    assert.ok(vocab.includes('rp-scroll-x'));
    assert.ok(vocab.includes('basis-[210px]'));

    const landing = readSrc('src/pages/marketing/HomeLanding.jsx');
    const heroScene = readSrc('src/features/landing/components/HeroLearningScene.jsx');
    assert.ok(landing.includes('overflow-x-clip'));
    assert.equal(heroScene.includes('absolute -left-4'), false);
    assert.equal(heroScene.includes('absolute -bottom-6 -right-3'), false);
    assert.ok(heroScene.includes('w-[min(200px,50%)]'));

    const adminReview = readSrc('src/pages/admin/AdminContentReview.jsx');
    assert.ok(adminReview.includes('flex-wrap items-center justify-between gap-2'));

    const pagination = readSrc('src/components/ui/Pagination.jsx');
    assert.ok(pagination.includes('max-w-full flex-wrap'));
  });
});
