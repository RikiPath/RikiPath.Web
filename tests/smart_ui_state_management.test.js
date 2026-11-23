import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';

import {
  FORBIDDEN_MESSAGE,
  INTERNAL_MESSAGE,
  classifyApiErrorState,
  describeApiError,
} from '@/api/apiErrors.js';
import {
  clearDiagnostics,
  getDiagnostics,
  recordDiagnostic,
} from '@/api/diagnostics.js';
import { shouldRetryQuery } from '@/api/queryClient.js';
import {
  DATA_VIEW_STATES,
  getContextualEmptyCopy,
  resolveDataState,
  resolveErrorPresentation,
  resolveOptionalWidgetPolicy,
} from '@/components/ui/dataStateLogic.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

globalThis.window = globalThis.window || {};
globalThis.window.location = globalThis.window.location || {
  origin: 'http://localhost:5176',
  hostname: 'localhost',
  pathname: '/app',
  href: 'http://localhost:5176/app',
  search: '',
};
globalThis.window.location.hostname = globalThis.window.location.hostname || 'localhost';
globalThis.window.localStorage = globalThis.window.localStorage || memoryStorage();
globalThis.window.sessionStorage = globalThis.window.sessionStorage || memoryStorage();
globalThis.window.matchMedia = globalThis.window.matchMedia || (() => ({
  matches: false,
  media: '',
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
}));
globalThis.localStorage = globalThis.window.localStorage;
globalThis.sessionStorage = globalThis.window.sessionStorage;
const noopEl = () => {
  const el = {
    setAttribute: () => {},
    remove: () => {},
    style: {},
    dataset: {},
    firstChild: { data: '' },
    appendChild: (child) => {
      if (!el.firstChild) el.firstChild = child;
      return child;
    },
  };
  return el;
};
globalThis.document = globalThis.document || {
  hidden: false,
  head: noopEl(),
  body: noopEl(),
  documentElement: noopEl(),
  querySelector: () => noopEl(),
  querySelectorAll: () => [],
  createElement: noopEl,
  createTextNode: (t = '') => ({ data: String(t) }),
  addEventListener: () => {},
  removeEventListener: () => {},
};

describe('Smart UI State Management — Pure Classification, Errors, Diagnostics & Retry', () => {
  beforeEach(() => {
    clearDiagnostics();
  });

  it('classifies all 10 standardized UI data states and guards disabled idle queries', () => {
    assert.equal(DATA_VIEW_STATES.length, 10);

    // 1. initial-loading vs disabled idle query (must NEVER spin forever on enabled: false)
    assert.equal(resolveDataState({ isPending: true, isLoading: true, fetchStatus: 'fetching' }), 'initial-loading');
    assert.equal(resolveDataState({ isPending: true, isLoading: false, fetchStatus: 'idle' }), 'success-empty');

    // 2. success-with-data & success-empty
    assert.equal(
      resolveDataState({ data: [{ id: 1 }], isSuccess: true }, { isEmpty: (d) => d.length === 0 }),
      'success-with-data',
    );
    assert.equal(
      resolveDataState({ data: [], isSuccess: true }, { isEmpty: (d) => d.length === 0 }),
      'success-empty',
    );

    // 3. background-refresh & stale-data preserve cached data cleanly
    assert.equal(
      resolveDataState({ data: [{ id: 1 }], isFetching: true, isError: false }),
      'background-refresh',
    );
    assert.equal(
      resolveDataState({ data: [{ id: 1 }], isFetching: false, isError: true, error: { status: 500 } }),
      'stale-data',
    );

    // 4. Error classes: 401, 403, network, 5xx, business conflict
    assert.equal(resolveDataState({}, { isAuthenticated: false }), 'unauthenticated');
    assert.equal(resolveDataState({ isError: true, error: { status: 401 } }), 'unauthenticated');
    assert.equal(resolveDataState({ isError: true, error: { status: 403 } }), 'forbidden');
    assert.equal(resolveDataState({ isError: true, error: { code: 'ERR_NETWORK' } }), 'network-error');
    assert.equal(resolveDataState({ isError: true, error: { status: 500 } }), 'server-error');
    assert.equal(resolveDataState({ isError: true, error: { status: 409 } }), 'business-conflict');
    assert.equal(
      classifyApiErrorState({ status: 400, data: { errorCode: 'COHORT_FULL' } }),
      'business-conflict',
    );
  });

  it('keeps correlationId separated from clean primary error copy while recording bounded diagnostics', () => {
    const info = describeApiError({
      response: {
        status: 500,
        data: { errorCode: 'INTERNAL_ERROR', errorMessage: 'Npgsql 42P01 relation MentorGroupPolicies' },
        headers: { 'x-correlation-id': '0HNJ4TEST001' },
      },
    });
    assert.equal(info.state, 'server-error');
    assert.equal(info.message, INTERNAL_MESSAGE);
    assert.equal(info.userMessage, INTERNAL_MESSAGE);
    assert.equal(info.correlationId, '0HNJ4TEST001');
    assert.equal(info.referenceText, 'Mã tra cứu: 0HNJ4TEST001');
    assert.ok(!info.message.includes('0HNJ4TEST001'));
    assert.ok(!info.message.includes('Npgsql'));
    assert.ok(!info.message.includes('Mã tra cứu'));

    const forbiddenInfo = describeApiError({ response: { status: 403, data: {} } });
    assert.equal(forbiddenInfo.state, 'forbidden');
    assert.equal(forbiddenInfo.message, FORBIDDEN_MESSAGE);
    assert.equal(resolveErrorPresentation({ status: 404, data: {} }).uiKind, 'notFound');

    for (let i = 0; i < 65; i += 1) {
      recordDiagnostic({ scope: 'test', component: 'Widget', status: 500, correlationId: `cid-${i}` });
    }
    const entries = getDiagnostics();
    assert.equal(entries.length, 60);
    assert.equal(entries[0].correlationId, 'cid-64');
    assert.equal(entries[59].correlationId, 'cid-5');
  });

  it('enforces bounded query retry (retries once on 5xx/network, never on 401/403/404/409/canceled)', () => {
    assert.equal(shouldRetryQuery(0, { status: 500 }), true);
    assert.equal(shouldRetryQuery(1, { status: 500 }), false);
    assert.equal(shouldRetryQuery(0, { status: 503 }), true);
    assert.equal(shouldRetryQuery(0, { status: 429 }), true);
    assert.equal(shouldRetryQuery(0, { code: 'ERR_NETWORK' }), true);

    assert.equal(shouldRetryQuery(0, { status: 400 }), false);
    assert.equal(shouldRetryQuery(0, { status: 401 }), false);
    assert.equal(shouldRetryQuery(0, { status: 403 }), false);
    assert.equal(shouldRetryQuery(0, { status: 404 }), false);
    assert.equal(shouldRetryQuery(0, { status: 409 }), false);
    assert.equal(shouldRetryQuery(0, { status: 422 }), false);
    assert.equal(shouldRetryQuery(0, { code: 'ERR_CANCELED' }), false);
  });

  it('resolves optional widget policies without leaking error cards or fake empty states', () => {
    assert.deepEqual(resolveOptionalWidgetPolicy('success-with-data', {}), {
      mode: 'data',
      shouldRecordDiagnostic: false,
    });
    assert.deepEqual(resolveOptionalWidgetPolicy('success-empty', { emptyPolicy: 'cta' }), {
      mode: 'empty',
      shouldRecordDiagnostic: false,
    });
    assert.deepEqual(resolveOptionalWidgetPolicy('success-empty', { emptyPolicy: 'hide' }), {
      mode: 'hidden',
      shouldRecordDiagnostic: false,
    });
    assert.deepEqual(resolveOptionalWidgetPolicy('server-error', { errorPolicy: 'hide' }), {
      mode: 'hidden',
      shouldRecordDiagnostic: true,
    });
    assert.deepEqual(resolveOptionalWidgetPolicy('server-error', { errorPolicy: 'compact' }), {
      mode: 'error-compact',
      shouldRecordDiagnostic: true,
    });
    assert.deepEqual(resolveOptionalWidgetPolicy('stale-data', { errorPolicy: 'hide' }), {
      mode: 'stale',
      shouldRecordDiagnostic: true,
    });
    assert.ok(getContextualEmptyCopy('groupLearning').title.includes('Bạn chưa có lớp học nào'));
  });
});

describe('Smart UI State Management — Component SSR & HomeLearner Integration', () => {
  let viteServer;
  let BoundaryMod;
  let HomeLearnerMod;
  let AuthContext;
  let saveSession;

  before(async () => {
    viteServer = await createServer({
      root: ROOT,
      server: { middlewareMode: true, watch: null, ws: false },
      optimizeDeps: { noDiscovery: true },
      appType: 'custom',
    });
    BoundaryMod = await viteServer.ssrLoadModule('/src/components/ui/SmartDataBoundary.jsx');
    HomeLearnerMod = await viteServer.ssrLoadModule('/src/pages/learner/HomeLearner.jsx');
    const ac = await viteServer.ssrLoadModule('/src/app/auth/authContext.js');
    AuthContext = ac.AuthContext;
    const sess = await viteServer.ssrLoadModule('/src/app/auth/session.js');
    saveSession = sess.saveSession;
  });

  after(async () => {
    await viteServer?.close();
  });

  function renderInShell(node, client) {
    const rqClient = client || new QueryClient({
      defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity } },
    });
    try {
      return renderToStaticMarkup(
        React.createElement(
          AuthContext.Provider,
          {
            value: {
              user: { userId: 77, fullName: 'Học viên QA', role: 'Learner', primaryRole: 'Learner' },
              primaryRole: 'Learner',
              isAuthenticated: true,
              logout: () => {},
            },
          },
          React.createElement(
            QueryClientProvider,
            { client: rqClient },
            React.createElement(MemoryRouter, { initialEntries: ['/app'] }, node),
          ),
        ),
      );
    } finally {
      if (!client) rqClient.clear();
    }
  }

  it('OptionalDashboardWidget renders data, empty CTA, hides cleanly on 500, preserves stale data, and recovers', () => {
    const { OptionalDashboardWidget, ContextualEmptyState } = BoundaryMod;
    const serverErr = Object.assign(new Error('500'), {
      status: 500,
      correlationId: 'cid-widget-500',
    });

    // 1. Optional widget hidden on 500 without giant error card or Mã tra cứu
    const hiddenHtml = renderInShell(
      React.createElement(
        OptionalDashboardWidget,
        {
          name: 'TestWidget',
          query: { isError: true, error: serverErr, isPending: false },
          errorPolicy: 'hide',
          emptyPolicy: 'cta',
        },
        () => React.createElement('div', null, 'Loaded'),
      ),
    );
    assert.equal(hiddenHtml, '');

    // 2. Empty state CTA on verified empty response
    const emptyHtml = renderInShell(
      React.createElement(
        OptionalDashboardWidget,
        {
          name: 'TestWidget',
          query: { data: [], isSuccess: true, isPending: false },
          isEmpty: (rows) => !rows?.length,
          errorPolicy: 'hide',
          emptyPolicy: 'cta',
          empty: React.createElement(ContextualEmptyState, { context: 'groupLearning' }),
        },
        () => React.createElement('div', null, 'Loaded'),
      ),
    );
    assert.ok(emptyHtml.includes('Bạn chưa có lớp học nào.'));
    assert.equal(emptyHtml.includes('role="alert"'), false);

    // 3. Stale data preserved when refetch fails
    const staleHtml = renderInShell(
      React.createElement(
        OptionalDashboardWidget,
        {
          name: 'TestWidget',
          query: { data: [{ id: 1, name: 'N3 Intensive' }], isError: true, error: serverErr, isFetching: false },
          isEmpty: (rows) => !rows?.length,
          errorPolicy: 'hide',
        },
        (rows) => React.createElement('div', null, rows[0].name),
      ),
    );
    assert.ok(staleHtml.includes('N3 Intensive'));
    assert.ok(staleHtml.includes('data-ui-state="stale-data"'));

    // 4. Recovery transitions cleanly back to content
    const recoveredHtml = renderInShell(
      React.createElement(
        OptionalDashboardWidget,
        {
          name: 'TestWidget',
          query: { data: [{ id: 1, name: 'N3 Intensive Recovered' }], isSuccess: true, isError: false },
          isEmpty: (rows) => !rows?.length,
          errorPolicy: 'hide',
        },
        (rows) => React.createElement('div', null, rows[0].name),
      ),
    );
    assert.ok(recoveredHtml.includes('N3 Intensive Recovered'));
    assert.ok(recoveredHtml.includes('data-ui-state="success-with-data"'));
  });

  it('SmartDataBoundary distinguishes 500 with Retry + collapsible support ID, 401 vs 403, and stale-data bar', () => {
    const { SmartDataBoundary } = BoundaryMod;
    const err500 = Object.assign(new Error('Internal error'), {
      status: 500,
      correlationId: 'cid-primary-500',
    });
    const html500 = renderInShell(
      React.createElement(
        SmartDataBoundary,
        {
          query: { isError: true, error: err500, refetch: () => {} },
          emptyContext: 'groupLearning',
        },
        () => React.createElement('div', null, 'Content'),
      ),
    );
    assert.ok(html500.includes('role="alert"'));
    assert.ok(html500.includes('Thử lại'));
    assert.ok(html500.includes('<details'));
    assert.ok(html500.includes('cid-primary-500'));
    assert.ok(!html500.includes('Npgsql'));

    const htmlNoDetails = renderInShell(
      React.createElement(
        SmartDataBoundary,
        {
          query: { isError: true, error: err500, refetch: () => {} },
          allowSupportDetails: false,
        },
        () => React.createElement('div', null, 'Content'),
      ),
    );
    assert.ok(htmlNoDetails.includes('Thử lại'));
    assert.ok(!htmlNoDetails.includes('Mã tra cứu'));
    assert.ok(!htmlNoDetails.includes('cid-primary-500'));

    const html401 = renderInShell(
      React.createElement(SmartDataBoundary, {
        query: { isError: true, error: { status: 401 }, refetch: () => {} },
      }),
    );
    assert.ok(html401.includes('data-ui-state="unauthenticated"'));
    assert.ok(html401.includes('Đăng nhập lại'));
    assert.ok(!html401.includes('Thử lại'));

    const html403 = renderInShell(
      React.createElement(SmartDataBoundary, {
        query: { isError: true, error: { status: 403 }, refetch: () => {} },
      }),
    );
    assert.ok(html403.includes('data-ui-state="forbidden"'));
    assert.ok(!html403.includes('Đăng nhập lại'));
    assert.ok(!html403.includes('Thử lại'));

    const htmlStale = renderInShell(
      React.createElement(
        SmartDataBoundary,
        {
          query: { data: [{ id: 1, title: 'Khóa học của tôi' }], isError: true, error: err500, refetch: () => {} },
          isEmpty: (rows) => !rows?.length,
        },
        (rows) => React.createElement('div', null, rows[0].title),
      ),
    );
    assert.ok(htmlStale.includes('Khóa học của tôi'));
    assert.ok(htmlStale.includes('data-ui-state="stale-data"'));
    assert.ok(htmlStale.includes('Làm mới'));
  });

  it('HomeLearner hides GroupLearningWidget on /api/study-courses 500 without Mã tra cứu or fake 0s', () => {
    const HomeLearner = HomeLearnerMod.default;
    saveSession({ userId: 77, accessToken: 'tok-test', role: 'Learner', fullName: 'Học viên QA' }, true);

    const err500 = Object.assign(new Error('Database table missing'), {
      status: 500,
      correlationId: 'cid-study-courses-500',
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, retryOnMount: false, staleTime: 60_000, gcTime: Infinity } },
    });
    const cacheQuery = client.getQueryCache().build(client, {
      queryKey: ['learner-courses-summary', 77],
    });
    cacheQuery.setState({
      status: 'error',
      error: err500,
      fetchStatus: 'idle',
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
    });

    const htmlError = renderInShell(
      React.createElement(HomeLearner, {
        data: {
          displayName: 'Học viên QA',
          targetLevel: 'N3',
          streakDays: 4,
          completedExercises: 5,
          errors: { skills: err500, srs: err500 },
          queries: {
            profile: { isSuccess: true, isPending: false },
            streak: { isSuccess: true, isPending: false },
            completion: { isSuccess: true, isPending: false },
            skills: { isError: true, error: err500, isPending: false },
            srs: { isError: true, error: err500, isPending: false },
          },
        },
      }),
      client,
    );
    client.clear();

    // Group Learning optional widget hides cleanly on 500: no giant card, no Mã tra cứu, no correlationId
    assert.ok(!htmlError.includes('cid-study-courses-500'));
    assert.ok(!htmlError.includes('Mã tra cứu'));
    assert.ok(!htmlError.includes('Học nhóm cùng Mentor'));

    // SRS & Skills optional widgets show compact non-disruptive error fallback rather than fake '0'
    assert.ok(htmlError.includes('Tạm chưa cập nhật được hàng đợi SRS'));
    assert.ok(htmlError.includes('Tạm chưa tải được năng lực theo kỹ năng'));

    // Recovery: when /api/study-courses succeeds with data, GroupLearningWidget reappears seamlessly
    const recoveredClient = new QueryClient({
      defaultOptions: { queries: { retry: false, retryOnMount: false, staleTime: 60_000, gcTime: Infinity } },
    });
    recoveredClient.setQueryData(['learner-courses-summary', 77], [
      {
        id: 11,
        cohortId: 22,
        cohortName: 'JLPT N3 Nhóm Tối',
        mentorName: 'Sensei Yuki',
        status: 'Active',
        level: 'N3',
        sessionsPerWeek: 3,
        completedSessions: 2,
        totalSessions: 30,
        sessions: [{ id: 1, number: 3, scheduledAt: '2026-11-25T12:00:00Z', status: 'Scheduled' }],
      },
    ]);
    const htmlRecovered = renderInShell(
      React.createElement(HomeLearner, {
        data: {
          displayName: 'Học viên QA',
          targetLevel: 'N3',
          streakDays: 4,
          completedExercises: 5,
          dueCards: 1,
          skillScores: { vocabulary: 78 },
          srsItems: [{ reviewCardId: 1, term: '日', reading: 'にち', meaning: 'ngày', dueAt: new Date().toISOString() }],
          queries: {
            profile: { isSuccess: true, isPending: false },
            streak: { isSuccess: true, isPending: false },
            completion: { isSuccess: true, isPending: false },
            skills: { isSuccess: true, isPending: false, data: { vocabulary: 78 } },
            srs: { isSuccess: true, isPending: false, data: { dueCards: 1, items: [{ reviewCardId: 1 }] } },
          },
        },
      }),
      recoveredClient,
    );
    recoveredClient.clear();
    assert.ok(htmlRecovered.includes('Học nhóm cùng Giáo viên'));
    assert.ok(htmlRecovered.includes('JLPT N3 Nhóm Tối'));
  });

  it('CSS includes clean grid reflow rule when optional sidebar collapses empty', () => {
    const tokens = readSrc('src/styles/tokens.css');
    assert.match(tokens, /\.rp-cq-two-col:has\(>\s*aside:empty\)\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);?\s*\}/);
  });

  it('standardizes non-inline EmptyStateCard, ContextualEmptyState, and ContextualErrorState into unified white cards without double borders inside nested surfaces', async () => {
    const { EmptyStateCard, ContextualEmptyState, ContextualErrorState } = BoundaryMod;
    const statesMod = await viteServer.ssrLoadModule('/src/components/ui/states.jsx');
    const coreMod = await viteServer.ssrLoadModule('/src/components/ui/core.jsx');
    const tokens = readSrc('src/styles/tokens.css');

    assert.match(tokens, /\.rp-state-card\s*\{[\s\S]*min-height:\s*240px[\s\S]*background-color:\s*var\(--color-rp-surface\)/);
    assert.ok(tokens.includes("[data-rp-surface='true']"), 'Nested surface selector must suppress double borders');
    assert.ok(tokens.includes('.course-box'), 'Legacy .course-box card must suppress double borders');

    const emptyHtml = renderInShell(
      React.createElement(ContextualEmptyState, {
        variant: 'compact',
        illustration: 'message',
        title: 'Không có khiếu nại nào.',
      }),
    );
    assert.ok(emptyHtml.includes('rp-state-card'));
    assert.ok(emptyHtml.includes('data-empty-framed="true"'));

    const searchEmptyHtml = renderInShell(
      React.createElement(statesMod.EmptyState, {
        variant: 'search',
        title: 'Không tìm thấy kết quả phù hợp',
      }),
    );
    assert.ok(searchEmptyHtml.includes('rp-state-card'));

    const inlineEmptyHtml = renderInShell(
      React.createElement(ContextualEmptyState, {
        variant: 'inline',
        title: 'Chưa có dữ liệu',
      }),
    );
    assert.equal(inlineEmptyHtml.includes('rp-state-card'), false);
    assert.ok(inlineEmptyHtml.includes('data-empty-framed="false"'));

    const errorHtml = renderInShell(
      React.createElement(ContextualErrorState, {
        error: new Error('500'),
        onRetry: () => {},
      }),
    );
    assert.ok(errorHtml.includes('rp-state-card'));
    assert.ok(errorHtml.includes('Thử lại'));

    const inlineErrorHtml = renderInShell(
      React.createElement(ContextualErrorState, {
        variant: 'inline',
        error: new Error('500'),
        onRetry: () => {},
      }),
    );
    assert.equal(inlineErrorHtml.includes('rp-state-card'), false);

    const cardWrapperHtml = renderInShell(
      React.createElement(
        coreMod.Card,
        null,
        React.createElement(ContextualEmptyState, { title: 'Chưa có dữ liệu' }),
      ),
    );
    assert.ok(cardWrapperHtml.includes('data-rp-surface="true"'));

    const explicitEmptyCardHtml = renderInShell(
      React.createElement(
        EmptyStateCard,
        null,
        React.createElement(ContextualEmptyState, { title: 'Chưa có yêu cầu chuyển lớp.' }),
      ),
    );
    assert.ok(explicitEmptyCardHtml.includes('data-empty-card="true"'));
    assert.ok(explicitEmptyCardHtml.includes('bg-rp-surface'));
  });
});
