import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  PLAN_GROUP_ORDER,
  PRODUCT_ACCENTS,
  SAKURA_PRODUCT_ACCENT,
  buildAiWalletItems,
  buildUnifiedProductCatalog,
  durationBucketOfPlan,
  groupStudyPlans,
  orderDurationLabel,
  orderQuantityLabel,
  paymentStatusMeta,
  productAccentOf,
  purchaseStatusMeta,
  purchaseValidityLines,
  summarizeSubscriptions,
  variantDurationLabel,
} from '../src/features/checkout/planGroups.js';
import { filterHistoryFallback } from '../src/features/checkout/api/subscriptionApi.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const i18n = {
  tr: (s) => s,
  trf: (tpl, vars = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')),
};

const SAMPLE_CATALOG = [
  { id: 1, name: 'Tự học tiếng Nhật - 1 tuần', price: 1000, durationDays: 7, aiUses: 1, kind: 'self_study', isPopular: true, sortOrder: 1, features: [{ id: 1, code: 'LESSONS_CONTENT', name: 'Toàn bộ bài học JLPT' }] },
  { id: 4, name: 'Tự học tiếng Nhật - 1 tháng', price: 4000, durationDays: 30, aiUses: 5, kind: 'self_study', isPopular: true, sortOrder: 4, features: [{ id: 1, code: 'LESSONS_CONTENT', name: 'Toàn bộ bài học JLPT' }] },
  { id: 6, name: 'Tự học tiếng Nhật - 3 tháng', price: 10000, durationDays: 90, aiUses: 15, kind: 'self_study', isPopular: false, sortOrder: 6 },
  { id: 8101, name: 'Luyện nói với AI - 1 tháng', price: 2000, durationDays: 30, aiUses: 20, kind: 'speaking', isPopular: true, sortOrder: 10 },
  { id: 8102, name: 'Luyện viết với AI - 1 tháng', price: 2000, durationDays: 30, aiUses: 20, kind: 'writing', isPopular: true, sortOrder: 11 },
  { id: 8103, name: 'Lượt chấm AI nói/viết - 5 lượt', price: 2000, durationDays: 0, aiUses: 5, kind: 'ai_grading', isPopular: true, sortOrder: 12 },
  { id: 8104, name: 'Lượt tạo lộ trình AI - 3 lượt', price: 2000, durationDays: 0, aiUses: 3, kind: 'learning_path', isPopular: true, sortOrder: 13 },
  { id: 8107, name: 'Gói kết hợp toàn diện - 1 tháng', price: 3000, durationDays: 30, aiUses: 20, kind: 'combo', isPopular: true, sortOrder: 14 },
];

describe('Plans Compact Dynamic Product Grid & Subscription Modals', () => {
  it('orders default grid groups cleanly (Self-Study, Speaking, Writing, AI Grading, Learning Path, Combo) and exposes non-empty tabs only', () => {
    assert.deepEqual(PLAN_GROUP_ORDER, ['self_study', 'speaking', 'writing', 'ai_grading', 'learning_path', 'combo']);
    const groups = groupStudyPlans(SAMPLE_CATALOG);
    const result = buildUnifiedProductCatalog(groups, {});

    assert.deepEqual(
      result.items.map((g) => g.kind),
      ['self_study', 'speaking', 'writing', 'ai_grading', 'learning_path', 'combo'],
    );
    assert.deepEqual(
      result.tabs.map((t) => t.value),
      ['all', 'self_study', 'ai_skills', 'ai_credits', 'combo'],
    );
    assert.ok(result.durationOptions.some((o) => o.value === 'WEEKLY'));
    assert.ok(result.durationOptions.some((o) => o.value === 'MONTHLY'));
    assert.ok(result.durationOptions.some((o) => o.value === 'LONG'));
    assert.ok(result.durationOptions.some((o) => o.value === 'USAGE'));
  });

  it('omits empty category tabs and scales dynamically beyond 10 distinct products without hardcoded layout', () => {
    const scaled = [
      ...SAMPLE_CATALOG,
      { id: 9001, name: 'JLPT N5 Cấp tốc - 1 tháng', price: 5000, durationDays: 30, aiUses: 10, kind: 'self_study', sortOrder: 20 },
      { id: 9002, name: 'JLPT N4 Cấp tốc - 1 tháng', price: 6000, durationDays: 30, aiUses: 10, kind: 'self_study', sortOrder: 21 },
      { id: 9003, name: 'JLPT N3 Cấp tốc - 1 tháng', price: 7000, durationDays: 30, aiUses: 10, kind: 'self_study', sortOrder: 22 },
      { id: 9004, name: 'Gói Chuyên biệt Đọc hiểu - 1 tháng', price: 2500, durationDays: 30, aiUses: 5, kind: 'exam_prep', sortOrder: 23 },
      { id: 9005, name: 'Luyện nghe thực chiến - 1 tháng', price: 2500, durationDays: 30, aiUses: 5, kind: 'listening_pack', sortOrder: 24 },
    ];
    const groups = groupStudyPlans(scaled);
    assert.equal(groups.length, 11);

    const catalog = buildUnifiedProductCatalog(groups, { durationFilter: 'USAGE' });
    assert.deepEqual(catalog.items.map((g) => g.kind), ['ai_grading', 'learning_path']);
    assert.ok(catalog.tabs.some((t) => t.value === 'exam_prep'), 'Discovers future backend categories automatically');

    // Removing combo removes its tab cleanly
    const withoutCombo = groupStudyPlans(SAMPLE_CATALOG.filter((p) => p.kind !== 'combo'));
    const noComboCatalog = buildUnifiedProductCatalog(withoutCombo, {});
    assert.equal(noComboCatalog.tabs.some((t) => t.value === 'combo'), false);
  });

  it('classifies duration buckets and renders accurate usage vs duration labels', () => {
    assert.equal(durationBucketOfPlan({ durationDays: 7 }), 'WEEKLY');
    assert.equal(durationBucketOfPlan({ durationDays: 30 }), 'MONTHLY');
    assert.equal(durationBucketOfPlan({ durationDays: 90 }), 'LONG');
    assert.equal(durationBucketOfPlan({ durationDays: 0, aiUses: 5 }), 'USAGE');

    assert.equal(variantDurationLabel({ durationDays: 0, aiUses: 5 }, i18n), '5 lượt');
    assert.equal(variantDurationLabel({ durationDays: 30, aiUses: 20 }, i18n), '1 tháng');
    assert.equal(orderDurationLabel({ durationDays: 0, aiUsesGranted: 3 }, i18n), '3 lượt');
    assert.equal(orderDurationLabel({ durationDays: 90, aiUsesGranted: 15 }, i18n), '3 tháng');
  });

  it('separates Payment Status from Validity Status accurately so Failed/Cancelled are never mislabeled Expired', () => {
    const failed = purchaseStatusMeta({ paymentStatus: 'Failed', active: false }, i18n);
    assert.equal(failed.label, 'Thanh toán thất bại');
    assert.equal(failed.tone, 'danger');
    assert.equal(failed.validityLabel, null);

    const cancelled = purchaseStatusMeta({ paymentStatus: 'Cancelled', active: false }, i18n);
    assert.equal(cancelled.label, 'Đã hủy');
    assert.equal(cancelled.validityLabel, null);

    const expiredValidity = purchaseStatusMeta({ paymentStatus: 'Paid', active: false, endDate: '2025-01-01T00:00:00Z' }, i18n);
    assert.equal(expiredValidity.label, 'Thành công');
    assert.equal(expiredValidity.validityLabel, 'Hết hiệu lực gói');

    const activeSoon = purchaseStatusMeta({
      paymentStatus: 'Paid',
      active: true,
      endDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    }, i18n);
    assert.equal(activeSoon.validityLabel, 'Sắp hết hạn');

    const unlimited = purchaseStatusMeta({
      paymentStatus: 'Paid',
      active: true,
      endDate: '2099-12-31T23:59:59Z',
    }, i18n);
    assert.equal(unlimited.validityLabel, 'Không giới hạn');
  });

  it('supports fallback history filtering and pagination without mutating order snapshots', () => {
    const orders = [
      { id: 1, planName: 'Gói A - 1 tháng', amountPaid: 4000, kind: 'self_study', paymentStatus: 'Paid', active: true, purchasedAt: '2026-11-26T10:00:00Z' },
      { id: 2, planName: 'Luyện nói - 1 tháng', amountPaid: 2000, kind: 'speaking', paymentStatus: 'Failed', active: false, purchasedAt: '2026-11-25T10:00:00Z' },
      { id: 3, planName: 'Gói C - cũ', amountPaid: 1000, kind: 'self_study', paymentStatus: 'Paid', active: false, purchasedAt: '2026-11-20T10:00:00Z' },
    ];
    const failedPage = filterHistoryFallback(orders, { status: 'Failed', page: 1, pageSize: 6 });
    assert.equal(failedPage.total, 1);
    assert.equal(failedPage.items[0].id, 2);

    const endedPage = filterHistoryFallback(orders, { status: 'ended', page: 1, pageSize: 6 });
    assert.equal(endedPage.total, 1);
    assert.equal(endedPage.items[0].id, 3);
  });

  it('tracks multi-plan concurrency, upcoming, unlimited, and dynamic AI wallet items', () => {
    const nowMs = Date.UTC(2026, 10, 26, 8, 0, 0);
    const access = {
      active: true,
      planName: 'Tự học tiếng Nhật - 3 tháng',
      aiGradingUsesRemaining: 16,
      learningPathUsesRemaining: 1,
      speakingUsesRemaining: 5,
      writingUsesRemaining: 5,
      purchases: [
        { id: 11, planId: 6, kind: 'self_study', paymentStatus: 'Paid', active: true, startDate: '2026-11-01T00:00:00Z', endDate: '2027-02-20T00:00:00Z' },
        { id: 12, planId: 8101, kind: 'speaking', paymentStatus: 'Paid', active: true, startDate: '2026-11-20T00:00:00Z', endDate: '2026-12-20T00:00:00Z', aiUsesRemaining: 5 },
      ],
    };
    const summary = summarizeSubscriptions(access, nowMs);
    assert.equal(summary.hasMultipleActive, true);
    assert.equal(summary.activeOrders.length, 2);

    const wallet = buildAiWalletItems(access, groupStudyPlans(SAMPLE_CATALOG));
    assert.equal(wallet.length, 4);
    assert.deepEqual(wallet.map((w) => w.remaining), [16, 1, 5, 5]);
  });

  it('uses compact unified grid, non-stacking modals, collapsible active details, and preserves AdminPlanEditModal compatibility', () => {
    const studyPlansSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/StudyPlans.jsx'), 'utf8');
    const activeModalSrc = fs.readFileSync(path.join(ROOT, 'src/features/checkout/components/ActiveSubscriptionsModal.jsx'), 'utf8');
    const cardSrc = fs.readFileSync(path.join(ROOT, 'src/features/checkout/components/PlanGroupCard.jsx'), 'utf8');
    const adminEditSrc = fs.readFileSync(path.join(ROOT, 'src/features/admin/plans/AdminPlanEditModal.jsx'), 'utf8');

    assert.ok(studyPlansSrc.includes('plans-product-grid'), 'Uses unified flat product grid');
    assert.equal(studyPlansSrc.includes('FeaturedPlanCard'), false, 'No stretched full-width featured banner card');
    assert.equal(studyPlansSrc.includes('ActiveSubscriptionsPanel'), false, 'No vertically stacked active banner block');
    assert.ok(studyPlansSrc.includes('<ActiveSubscriptionsModal'), 'Delegates active plans to dedicated modal');
    assert.ok(studyPlansSrc.includes('<PurchaseHistoryModal'), 'Delegates purchase history to dedicated modal');
    assert.ok(studyPlansSrc.includes('<PlanBenefitsModal'), 'Delegates selected variant benefits to dedicated modal');
    assert.ok(activeModalSrc.includes('<Collapsible'), 'Active modal collapses per-order benefits by default');
    assert.ok(cardSrc.includes('onViewBenefits'), 'PlanGroupCard invokes shared variant benefits preview');
    assert.ok(adminEditSrc.includes('<PlanGroupCard'), 'AdminPlanEditModal keeps PlanGroupCard preview compatibility');
  });

  it('unifies all product accents to Sakura tone and keeps PurchaseHistoryModal compact 5-column without filters or detail sub-modal', () => {
    for (const kind of ['self_study', 'speaking', 'writing', 'ai_grading', 'learning_path', 'combo', 'future_dynamic_kind']) {
      assert.deepEqual(productAccentOf(kind), SAKURA_PRODUCT_ACCENT, `Expected Sakura accent for ${kind}`);
    }
    for (const accent of Object.values(PRODUCT_ACCENTS)) {
      assert.deepEqual(accent, SAKURA_PRODUCT_ACCENT);
    }

    assert.equal(orderQuantityLabel({ durationDays: 0, aiUsesGranted: 5 }, i18n), '5 lượt AI');
    assert.equal(orderQuantityLabel({ durationDays: 90, aiUsesGranted: 15 }, i18n), '3 tháng');

    assert.deepEqual(paymentStatusMeta({ paymentStatus: 'Paid', active: false }, i18n), { label: 'Thành công', tone: 'success' });
    assert.deepEqual(paymentStatusMeta({ paymentStatus: 'Pending', active: false }, i18n), { label: 'Đang xử lý', tone: 'warning' });
    assert.deepEqual(paymentStatusMeta({ paymentStatus: 'Failed', active: false }, i18n), { label: 'Thất bại', tone: 'danger' });
    assert.deepEqual(paymentStatusMeta({ paymentStatus: 'Cancelled', active: false }, i18n), { label: 'Đã hủy', tone: 'danger' });
    assert.deepEqual(paymentStatusMeta({ paymentStatus: 'Refunded', active: false }, i18n), { label: 'Đã hoàn tiền', tone: 'info' });

    const timedValidity = purchaseValidityLines({
      paymentStatus: 'Paid',
      kind: 'self_study',
      durationDays: 7,
      startDate: '2026-11-21T07:37:00Z',
      endDate: '2026-11-28T07:37:00Z',
    }, i18n);
    assert.equal(timedValidity.primary, '21/11/2026');
    assert.equal(timedValidity.secondary, 'Đến 28/11/2026');

    const creditValidity = purchaseValidityLines({
      paymentStatus: 'Paid',
      kind: 'ai_grading',
      durationDays: 0,
      startDate: '2026-11-21T07:37:00Z',
      endDate: null,
    }, i18n);
    assert.equal(creditValidity.primary, 'Từ 21/11/2026');
    assert.equal(creditValidity.secondary, 'Không giới hạn thời gian');

    const pendingValidity = purchaseValidityLines({ paymentStatus: 'Pending', startDate: null, endDate: null }, i18n);
    assert.equal(pendingValidity.primary, 'Chưa kích hoạt');

    const cancelledValidity = purchaseValidityLines({ paymentStatus: 'Cancelled', startDate: null, endDate: null }, i18n);
    assert.equal(cancelledValidity.primary, '—');

    const historySrc = fs.readFileSync(path.join(ROOT, 'src/features/checkout/components/PurchaseHistoryModal.jsx'), 'utf8');
    assert.equal(historySrc.includes('CustomSelect'), false, 'No filter dropdowns in PurchaseHistoryModal');
    assert.equal(historySrc.includes('Chi tiết giao dịch'), false, 'No transaction detail sub-modal');
    assert.equal(historySrc.includes('Mua lại gói này'), false, 'No repurchase CTA in history modal');
    assert.equal(historySrc.includes('orderCode'), false, 'No technical order/transaction code shown');
    assert.equal(historySrc.includes('Sparkles'), false, 'Uses Ticket via planIcons instead of Sparkles');
  });
});
