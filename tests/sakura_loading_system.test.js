import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

import {
  DEFAULT_LOADING_DELAY_MS,
  LOADING_CONTEXTS,
  loadingContextForPath,
  queryViewState,
  resolveLoadingLabel,
} from '@/components/ui/sakuraLoadingLogic.js';
import { translateText } from '@/locales/locale.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

describe('Sakura Loading Logic — Context Messages, Route Mapping & Query States', () => {
  it('defines all required context messages with non-empty Japanese and English translations', () => {
    assert.equal(DEFAULT_LOADING_DELAY_MS, 180);

    const requiredBaseContexts = [
      ['page', 'Đang tải trang'],
      ['dashboard', 'Đang tải bảng học tập'],
      ['data', 'Đang tải dữ liệu'],
      ['roadmap', 'Đang chuẩn bị lộ trình'],
      ['lesson', 'Đang tải bài học'],
      ['vocabulary', 'Đang tải từ vựng'],
      ['grammar', 'Đang tải ngữ pháp'],
      ['writing', 'Đang chuẩn bị bài luyện viết'],
      ['srs', 'Đang chuẩn bị thẻ ôn tập'],
      ['mock', 'Đang chuẩn bị đề thi'],
      ['cohort', 'Đang tải lớp học'],
      ['homework', 'Đang tải bài tập'],
      ['calendar', 'Đang tải lịch học'],
      ['profile', 'Đang tải hồ sơ'],
      ['payment', 'Đang kiểm tra trạng thái thanh toán'],
      ['grading', 'Đang xử lý bài làm'],
    ];

    for (const [key, expectedVi] of requiredBaseContexts) {
      assert.equal(LOADING_CONTEXTS[key], expectedVi, `context ${key} mismatch`);
      const en = translateText(expectedVi, 'en');
      assert.notEqual(en, expectedVi, `missing English translation for "${expectedVi}"`);
      const ja = translateText(expectedVi, 'ja');
      assert.notEqual(ja, expectedVi, `missing Japanese translation for "${expectedVi}"`);
    }

    assert.equal(LOADING_CONTEXTS.kanji, LOADING_CONTEXTS.writing);
    assert.equal(LOADING_CONTEXTS.mocktest, LOADING_CONTEXTS.mock);
    assert.equal(LOADING_CONTEXTS.groupLearning, LOADING_CONTEXTS.cohort);
    assert.equal(resolveLoadingLabel({ context: 'srs', label: 'Đang làm mới hàng đợi' }), 'Đang làm mới hàng đợi');
  });

  it('maps routes across Learner, Mentor, ContentAuthor, Admin and Payment to accurate loading contexts', () => {
    const expectedRoutes = [
      ['/app/', 'dashboard'],
      ['/admin/dashboard/', 'dashboard'],
      ['/mentor-overview/', 'dashboard'],
      ['/author-dashboard/', 'dashboard'],
      ['/roadmap/', 'roadmap'],
      ['/lessons/', 'lesson'],
      ['/vocabulary-detail/', 'vocabulary'],
      ['/grammar/', 'grammar'],
      ['/kanji-writing/?type=kanji', 'writing'],
      ['/daily-srs/', 'srs'],
      ['/mock-tests/', 'mock'],
      ['/my-courses/', 'cohort'],
      ['/homework/', 'homework'],
      ['/work-schedule/', 'calendar'],
      ['/settings/', 'profile'],
      ['/plans/', 'payment'],
      ['/riki/essay/', 'grading'],
      ['/unknown-route-xyz/', 'page'],
    ];
    for (const [pathname, expectedCtx] of expectedRoutes) {
      assert.equal(loadingContextForPath(pathname), expectedCtx, `route context mismatch for ${pathname}`);
    }
  });

  it('classifies queryViewState so background refetches never discard loaded data or show premature empty/0 states', () => {
    assert.equal(queryViewState(null), 'loading');
    assert.equal(queryViewState({ isPending: true, isLoading: true, data: undefined }), 'loading');
    assert.equal(queryViewState({ isPending: false, isError: true, data: undefined }), 'error');
    assert.equal(
      queryViewState({ isPending: false, isFetching: true, data: { items: [1] } }),
      'refreshing',
    );
    assert.equal(
      queryViewState({ isPending: false, isFetching: true, data: [] }, { isEmpty: (d) => d.length === 0 }),
      'refreshing',
    );
    assert.equal(
      queryViewState({ isPending: false, isFetching: false, data: [] }, { isEmpty: (d) => d.length === 0 }),
      'empty',
    );
    assert.equal(
      queryViewState({ isPending: false, isFetching: false, data: [1] }, { isEmpty: (d) => d.length === 0 }),
      'success',
    );
  });
});

describe('SakuraLoader Component Variants, CSS Motion & App Integration', () => {
  let viteServer;
  let mod;

  const getModule = async () => {
    if (mod) return mod;
    viteServer = await createServer({
      root: ROOT,
      logLevel: 'silent',
      server: { middlewareMode: true },
      appType: 'custom',
    });
    mod = await viteServer.ssrLoadModule('/src/components/ui/SakuraLoader.jsx');
    return mod;
  };

  after(async () => {
    if (viteServer) await viteServer.close();
  });

  it('defines smooth CSS sway/breathing/typing-dot animations with reduced-motion support in tokens.css', () => {
    const tokens = readSrc('src/styles/tokens.css');
    assert.ok(tokens.includes('@keyframes rp-bloom-sway'), 'missing @keyframes rp-bloom-sway');
    assert.ok(tokens.includes('@keyframes rp-petal-wave'), 'missing @keyframes rp-petal-wave');
    assert.ok(tokens.includes('@keyframes rp-sakura-dot-bounce'), 'missing @keyframes rp-sakura-dot-bounce');
    assert.ok(tokens.includes('.rp-sakura-dot'), 'missing .rp-sakura-dot class');
    assert.match(
      tokens,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.rp-sakura-dot/,
      'prefers-reduced-motion must cover .rp-sakura-dot',
    );
  });

  it('implements useDelayedLoading anti-flicker hook with timer cleanup in hooks.js', () => {
    const hooksSrc = readSrc('src/components/ui/hooks.js');
    assert.match(hooksSrc, /export function useDelayedLoading\(active,\s*delayMs\s*=\s*180\)/);
    assert.match(hooksSrc, /window\.setTimeout/);
    assert.match(hooksSrc, /window\.clearTimeout/);
  });

  it('renders all 5 SakuraLoader variants without card wrappers around the bloom and with 3 sequenced pink dots', async () => {
    const {
      SakuraLoader,
      SakuraDots,
      RefreshingIndicator,
      SakuraBloom,
      SakuraSpinner,
      SectionLoader,
      PageLoader,
      BlockingOverlay,
    } = await getModule();

    // 1. Dots component renders 3 staggered Sakura Pink (#E05A7A) typing dots
    const dotsHtml = renderToStaticMarkup(React.createElement(SakuraDots));
    assert.equal((dotsHtml.match(/\brp-sakura-dot\b/g) || []).length, 3);
    assert.ok(dotsHtml.includes('0s') && dotsHtml.includes('0.16s') && dotsHtml.includes('0.32s'));

    // 2. Fullscreen variant centers horizontally/vertically in fixed viewport overlay without white card
    const fullHtml = renderToStaticMarkup(
      React.createElement(SakuraLoader, { variant: 'fullscreen', context: 'page', delay: 0 }),
    );
    assert.ok(fullHtml.includes('data-sakura-loader="fullscreen"'));
    assert.ok(fullHtml.includes('fixed inset-0') && fullHtml.includes('items-center') && fullHtml.includes('justify-center'));
    assert.ok(fullHtml.includes('rp-bloom'));
    assert.ok(fullHtml.includes('Đang tải trang'));
    assert.equal((fullHtml.match(/\brp-sakura-dot\b/g) || []).length, 3);
    assert.doesNotMatch(fullHtml, /\bbg-white\b/, 'Sakura bloom should float cleanly without a white card box');

    // 3. Page variant centers within AppShell main area without a white card wrapper
    const pageHtml = renderToStaticMarkup(
      React.createElement(SakuraLoader, { variant: 'page', context: 'payment', delay: 0 }),
    );
    assert.ok(pageHtml.includes('data-sakura-loader="page"'));
    assert.ok(pageHtml.includes('flex-1') && pageHtml.includes('items-center') && pageHtml.includes('justify-center'));
    assert.ok(pageHtml.includes('Đang kiểm tra trạng thái thanh toán'));
    assert.doesNotMatch(pageHtml, /\bbg-white\b/);

    // 4. Section variant centers within content area
    const sectionHtml = renderToStaticMarkup(
      React.createElement(SakuraLoader, { variant: 'section', context: 'srs', delay: 0 }),
    );
    assert.ok(sectionHtml.includes('data-sakura-loader="section"'));
    assert.ok(sectionHtml.includes('items-center') && sectionHtml.includes('justify-center'));
    assert.ok(sectionHtml.includes('Đang chuẩn bị thẻ ôn tập'));

    // 5. Inline variant uses compact inline-flex without oversized padding
    const inlineHtml = renderToStaticMarkup(
      React.createElement(SakuraLoader, { variant: 'inline', size: 16, context: 'data', label: 'Đang lưu…', delay: 0 }),
    );
    assert.ok(inlineHtml.includes('data-sakura-loader="inline"'));
    assert.ok(inlineHtml.includes('inline-flex'));
    assert.ok(inlineHtml.includes('width="16"'));
    assert.ok(inlineHtml.includes('Đang lưu…'));

    // 6. Overlay variant supports open=false (empty) and open=true (blocking + non-blocking)
    assert.equal(
      renderToStaticMarkup(React.createElement(SakuraLoader, { variant: 'overlay', open: false, delay: 0 })),
      '',
    );
    const overlayHtml = renderToStaticMarkup(
      React.createElement(SakuraLoader, { variant: 'overlay', open: true, blocking: true, context: 'grading', delay: 0 }),
    );
    assert.ok(overlayHtml.includes('role="alertdialog"') && overlayHtml.includes('aria-modal="true"'));
    assert.ok(overlayHtml.includes('Đang xử lý bài làm'));

    // 7. RefreshingIndicator respects anti-flicker default delay on initial mount and renders badge when delay=0
    assert.equal(renderToStaticMarkup(React.createElement(RefreshingIndicator, { active: false, delay: 0 })), '');
    assert.equal(renderToStaticMarkup(React.createElement(RefreshingIndicator, { active: true })), '');
    const refreshingHtml = renderToStaticMarkup(React.createElement(RefreshingIndicator, { active: true, delay: 0 }));
    assert.ok(refreshingHtml.includes('role="status"') && refreshingHtml.includes('Đang cập nhật dữ liệu'));

    // 8. Legacy named exports stay compatible
    for (const Cmp of [SakuraBloom, SakuraSpinner, SectionLoader, PageLoader, BlockingOverlay]) {
      assert.equal(typeof Cmp, 'function');
    }
  });

  it('standardizes all pages and feature views off Material progress_activity spinners', () => {
    const pagesAndFeatures = [
      ...listFiles(path.join(ROOT, 'src', 'pages')),
      ...listFiles(path.join(ROOT, 'src', 'features')),
    ].filter((f) => f.endsWith('.jsx') || f.endsWith('.js'));

    for (const file of pagesAndFeatures) {
      const content = fs.readFileSync(file, 'utf8');
      assert.equal(
        content.includes('progress_activity'),
        false,
        `legacy Material progress_activity spinner remains in ${path.relative(ROOT, file)}`,
      );
    }

    const appSrc = readSrc('src/app/App.jsx');
    assert.match(appSrc, /<Suspense\s+fallback=\{<RoutePageLoader\s*\/>}/);
    assert.match(appSrc, /loadingContextForPath\(pathname\)/);

    const statesSrc = readSrc('src/components/ui/states.jsx');
    assert.match(statesSrc, /(?:queryViewState|resolveDataState)\(query/);
    assert.match(statesSrc, /<RefreshingIndicator/);

    const homeLearnerSrc = readSrc('src/pages/learner/HomeLearner.jsx');
    assert.match(homeLearnerSrc, /\{!error && !loading && children\}/, 'StreakWeek dots must not flash 0 while streak query is loading');
    assert.match(homeLearnerSrc, /loading\.profile/);
  });
});
