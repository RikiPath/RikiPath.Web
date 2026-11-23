import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { matchRoute, ROUTES, REDIRECTS, canAccessPath, homeForRole } from '@/app/routes/routeTable.js';
import { evaluateStudyPlanAccess, studyFeatureInfo } from '@/app/guards/studyPlanGate.js';
import { ACCESS, featureLockState } from '@/features/entitlements/featureAccess.js';
import { resolvePaymentReturn } from '@/app/guards/paymentReturnResolver.js';
import { describeApiError } from '@/api/apiErrors.js';
import { notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Regression guard: /plans gating & self-study route contracts', () => {
  it('does NOT wrap free or credit-on-action Backend routes in RequireStudyPlan', () => {
    const freeOrActionGatedPaths = [
      '/kanji-writing',
      '/kanji-writing?type=kanji',
      '/kanji-writing?type=hiragana',
      '/daily-srs',
      '/vocabulary-detail',
      '/vocabulary-detail?id=10',
      '/riki/essay',
      '/riki/speaking',
      '/speech',
      '/grammar',
      '/roadmap',
      '/placement',
      '/mock-tests',
      '/exam-result',
      '/sentence-studio',
      '/ai-scoring',
      '/mentors',
      '/mentors/12',
      '/my-courses',
      '/homework',
      '/settings',
    ];
    for (const url of freeOrActionGatedPaths) {
      const route = matchRoute(url);
      assert.ok(route, `Expected route match for ${url}`);
      assert.equal(Boolean(route.study), false, `Route ${url} must NOT bounce to /plans at entry`);
    }
  });

  it('keeps study: true ONLY on Backend [RequireSelfStudy] routes with readable metadata', () => {
    const gatedPaths = ['/lessons', '/lesson-player', '/riki/listening', '/riki/reading'];
    // `/lesson-player/:lessonId` is the deep-link form of the same Lesson Player (same Backend gate).
    const actualGated = ROUTES.filter((r) => Boolean(r.study)).map((r) => r.path).sort();
    assert.deepEqual(actualGated, [...gatedPaths, '/lesson-player/:lessonId'].sort());
    assert.equal(Boolean(matchRoute('/roadmap/stages/12')?.study), false, 'Roadmap Stage Detail must remain Core Free');

    assert.equal(Boolean(matchRoute('/kanji-notebook')?.study), false, 'Personal Notebook must remain Core Free');
    assert.equal(Boolean(matchRoute('/roadmap')?.study), false, 'Standard Roadmap must remain Core Free');
    assert.equal(featureLockState('/kanji-notebook', ACCESS.FREE), 'open');
    assert.equal(featureLockState('/roadmap', ACCESS.FREE), 'open');
    assert.equal(featureLockState('/lessons', ACCESS.FREE), 'locked');

    assert.ok(
      REDIRECTS.some(([from, to]) => from === '/vocabulary' && to === '/kanji-notebook'),
      'Legacy /vocabulary route must redirect to /kanji-notebook',
    );

    for (const p of gatedPaths) {
      const info = studyFeatureInfo(p);
      assert.ok(info.featureLabel && !info.featureLabel.includes('Nội dung tự học'), `Missing specific feature label for ${p}`);
      assert.ok(info.description.length > 20, `Missing contextual description for ${p}`);
    }
  });

  it('prefers server feature entitlement truth over fallback route table locks', () => {
    assert.equal(
      featureLockState('/lessons', ACCESS.FREE, [
        { code: 'LESSONS_CONTENT', routes: ['/lessons', '/lesson-player'], allowed: true },
      ]),
      'open',
    );
    assert.equal(
      featureLockState('/roadmap', ACCESS.FREE, [
        { code: 'STANDARD_ROADMAP', routes: ['/roadmap'], allowed: false, accessMode: 'PLAN_REQUIRED' },
      ]),
      'locked',
    );
  });

  it('evaluateStudyPlanAccess returns contextual plan-required instead of silent redirect', () => {
    assert.equal(evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: false }), 'login');
    assert.equal(evaluateStudyPlanAccess({ pathname: '/lessons', isPreview: true, isAuthenticated: true, isLearner: true }), 'allow');
    assert.equal(evaluateStudyPlanAccess({ pathname: '/plans', isAuthenticated: true, isLearner: true, subscriptionData: { active: false } }), 'allow');
    assert.equal(evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: true, isLearner: false }), 'allow');
    assert.equal(evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: true, isLearner: true, isPending: true }), 'loading');
    assert.equal(evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: true, isLearner: true, isError: true }), 'error');
    assert.equal(
      evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: true, isLearner: true, subscriptionData: { active: false } }),
      'plan-required',
    );
    assert.equal(
      evaluateStudyPlanAccess({ pathname: '/lessons', isAuthenticated: true, isLearner: true, subscriptionData: { active: true } }),
      'allow',
    );
    assert.equal(
      evaluateStudyPlanAccess({
        pathname: '/lessons',
        isAuthenticated: true,
        isLearner: true,
        subscriptionData: {
          active: false,
          features: [{ code: 'LESSONS_CONTENT', routes: ['/lessons'], accessMode: 'DISABLED', allowed: false }],
        },
      }),
      'disabled',
    );
  });

  it('RequireStudyPlan renders inline contextual gate (no blind <Navigate to="/plans">)', () => {
    const source = readSrc('src/app/guards/RequireStudyPlan.jsx');
    assert.doesNotMatch(source, /<Navigate[^>]*to="\/plans"/);
    assert.match(source, /data-gate="self-study-required"/);
    assert.match(source, /to="\/plans\/"/);
  });
});

describe('PayOS return URL reconciliation & route parity', () => {
  it('routes /payment/success and /payment/cancel to StudyPaymentReceipt (never drops purchaseId to /app)', () => {
    assert.equal(REDIRECTS.some(([from]) => from === '/payment/success'), false);
    assert.equal(matchRoute('/payment/success')?.page, 'StudyPaymentReceipt');
    assert.equal(matchRoute('/payment/cancel')?.page, 'StudyPaymentReceipt');
    assert.equal(matchRoute('/study-payment-receipt')?.page, 'StudyPaymentReceipt');

    const okReturn = resolvePaymentReturn({
      pathname: '/payment/success',
      search: '?purchaseId=42&code=00&cancel=false&status=PAID&orderCode=900000042',
    });
    assert.deepEqual(okReturn, {
      destination: '/payment/success/',
      state: { payment: { kind: 'study', id: 42 } },
    });

    const cancelReturn = resolvePaymentReturn({
      pathname: '/payment/cancel',
      search: '?purchaseId=42&cancel=true&status=CANCELLED',
    });
    assert.deepEqual(cancelReturn, {
      destination: '/payment/cancel/',
      state: { payment: { kind: 'study', id: 42 } },
    });

    const legacySuccess = resolvePaymentReturn({
      pathname: '/plans',
      search: '?purchaseId=99&cancel=false&status=PAID',
      legacyPlans: true,
    });
    assert.deepEqual(legacySuccess, {
      destination: '/payment/success/',
      state: { payment: { kind: 'study', id: 99 } },
    });

    const legacyCancelled = resolvePaymentReturn({
      pathname: '/plans',
      search: '?purchaseId=99&cancel=true&status=CANCELLED',
      legacyPlans: true,
    });
    assert.deepEqual(legacyCancelled, {
      destination: '/payment/cancel/',
      state: { payment: { kind: 'study', id: 99 } },
    });
  });

  it('normalizes marketing links (no dead /#plans anchor or redirect hops to /exam-n3)', () => {
    for (const rel of [
      'src/pages/marketing/CourseCatalog.jsx',
      'src/pages/marketing/AboutRiki.jsx',
      'src/pages/marketing/MockExam.jsx',
    ]) {
      const code = readSrc(rel);
      assert.doesNotMatch(code, /to="\/#plans"/, `${rel} must not link to non-existent /#plans anchor`);
      assert.doesNotMatch(code, /['"]\/exam-n3['"]/, `${rel} should link directly to /mock-tests/?level=N3`);
    }
  });

  it('role home routes and deep links resolve cleanly without crossing role boundaries', () => {
    assert.equal(homeForRole('Learner'), '/app');
    assert.equal(homeForRole('Mentor'), '/mentor-overview');
    assert.equal(homeForRole('ContentAuthor'), '/cms-studio');
    assert.equal(homeForRole('Admin'), '/admin/dashboard');

    assert.equal(canAccessPath('/admin/users/detail?id=5', ['Admin']), true);
    assert.equal(canAccessPath('/admin/users/detail?id=5', ['Learner']), false);
    assert.equal(canAccessPath('/mentors/12', ['Learner']), true);
    assert.equal(canAccessPath('/mentors/12', ['Mentor']), false);
    assert.equal(notificationDestination('/mentor-availability'), '/mentor-shift-schedule/');
    assert.equal(notificationDestination('https://evil.example/phish'), '');
  });

  it('translates Self-Study and AI Credit 403 error codes to friendly Vietnamese guidance', () => {
    for (const code of [
      'SELF_STUDY_PACKAGE_REQUIRED',
      'WRITING_PACKAGE_REQUIRED',
      'SPEAKING_PACKAGE_REQUIRED',
      'AI_CREDIT_REQUIRED',
    ]) {
      const info = describeApiError({ status: 403, errorCode: code });
      assert.ok(info.message.length > 15 && !/permission|forbidden/i.test(info.message), `Expected tailored message for ${code}`);
    }
  });
});
