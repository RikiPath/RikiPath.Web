import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildActionQueueItems,
  buildJlptDistribution,
  buildRevenueSeries,
  buildUserRegistrationSeries,
  buildUserRoleDistribution,
  computeDateWindow,
  summarizeMentorKpis,
} from '@/features/admin/utils/dashboardAnalytics.js';
import { normalizeAdminRole } from '@/features/admin/utils/adminRoles.js';

describe('admin console v2 analytics helpers', () => {
  it('sorts action queue by priority with active counts above idle zeros', () => {
    const queue = buildActionQueueItems(
      {
        openComplaints: 2,
        paymentReviewCourses: 1,
        pendingSlotCancelRequests: 3,
        pendingSlotChangeRequests: 1,
        pendingCohortScheduleRequests: 0,
        pendingVerifications: 0,
        pendingMentorSchedules: 4,
        pendingTransferRequests: 0,
        pendingContent: 9,
      },
      { pendingProposals: 2, pendingRetakes: 1 },
    );

    const activeIds = queue.filter((q) => q.count > 0).map((q) => q.id);
    assert.deepEqual(activeIds, ['complaints', 'paymentReview', 'scheduleRequests', 'schedules', 'retakes', 'content']);
    assert.equal(queue[0].to, '/admin/complaints/');
    assert.equal(queue[1].to, '/admin/payments/');
    assert.equal(queue[2].count, 4);
    assert.equal(queue[3].count, 4);
  });

  it('normalizes user roles and aggregates distribution and registration curve', () => {
    assert.equal(normalizeAdminRole('admin'), 'Admin');
    assert.equal(normalizeAdminRole('Content Author'), 'ContentAuthor');
    assert.equal(normalizeAdminRole('consultant'), 'Mentor');
    assert.equal(normalizeAdminRole('unknown'), 'Learner');

    const users = [
      { id: 1, role: 'Admin', isActive: true, isEmailVerified: true, createdDate: '2026-10-01T08:00:00Z' },
      { id: 2, role: 'Mentor', isActive: true, isEmailVerified: true, createdDate: '2026-10-01T09:00:00Z' },
      { id: 3, role: 'ContentAuthor', isActive: false, isEmailVerified: false, createdDate: '2026-10-02T09:00:00Z' },
      { id: 4, role: 'Learner', isActive: true, isEmailVerified: true, createdDate: '2026-10-02T10:00:00Z' },
    ];

    const dist = buildUserRoleDistribution(users);
    assert.equal(dist.total, 4);
    assert.equal(dist.active, 3);
    assert.equal(dist.locked, 1);
    assert.equal(dist.verified, 3);
    assert.deepEqual(dist.segments.map((s) => s.value), [1, 1, 1, 1]);

    const curve = buildUserRegistrationSeries(users);
    assert.deepEqual(curve.map((p) => [p.label, p.value]), [
      ['01/10', 2],
      ['02/10', 2],
    ]);
  });

  it('aggregates paid revenue series and respects time window calculation', () => {
    const win7 = computeDateWindow('7d', new Date('2026-11-20T12:00:00Z'));
    assert.equal(win7.days, 7);
    assert.match(win7.fromDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(win7.toDate, /^\d{4}-\d{2}-\d{2}$/);

    const seriesAll = buildRevenueSeries([
      { status: 'Paid', amount: 1500000, paidAtUtc: '2026-10-01T04:00:00Z' },
      { status: 'Pending', amount: 900000, createdAtUtc: '2026-10-01T05:00:00Z' },
      { status: 'Paid', amount: 500000, paidAtUtc: '2026-10-01T06:00:00Z' },
    ], null);

    assert.equal(seriesAll.length, 1);
    assert.equal(seriesAll[0].value, 2000000);
    assert.equal(seriesAll[0].orders, 2);
  });

  it('summarizes JLPT distribution and mentor KPI ratios cleanly', () => {
    const jlpt = buildJlptDistribution(
      [
        { level: 'N5', cohorts: 1, enrolledCount: 4, capacity: 4 },
        { level: 'N3', cohorts: 1, enrolledCount: 2, capacity: 4 },
      ],
      [],
    );
    assert.equal(jlpt.length, 5);
    assert.deepEqual(
      jlpt.map((r) => [r.level, r.cohorts, r.learners]),
      [['N5', 1, 4], ['N4', 0, 0], ['N3', 1, 2], ['N2', 0, 0], ['N1', 0, 0]],
    );

    const kpi = summarizeMentorKpis([
      { completedValidSessions: 8, totalAssignedSessions: 10, cancelledSessionsCount: 1, missedOrNoShowSessionsCount: 1, averageRating: 4.8 },
      { completedValidSessions: 10, totalAssignedSessions: 10, cancelledSessionsCount: 0, missedOrNoShowSessionsCount: 0, averageRating: 5.0 },
    ]);
    assert.equal(kpi.completed, 18);
    assert.equal(kpi.assigned, 20);
    assert.equal(kpi.completionRate, 90);
    assert.equal(kpi.avgRating, 4.9);
  });
});

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(TEST_DIR, '..');
const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');

describe('admin console v2.1 UI, modal, drawer & scroll contracts', () => {
  it('enforces read-only DetailModal and role-only RoleEditModal without full-profile redirect or raw ID in AdminUsers', () => {
    const src = readWeb('src/pages/admin/AdminUsers.jsx');
    const primitives = readWeb('src/features/admin/components/AdminPrimitives.jsx');

    assert.equal(src.includes('Mở trang hồ sơ đầy đủ'), false);
    assert.equal(src.includes('Mã tài khoản'), false);
    assert.equal(src.includes('/admin/users/detail'), false);
    assert.ok(src.includes('<DetailModal'));
    assert.ok(src.includes('<RoleEditModal'));
    assert.ok(src.includes('<AdminAccountIdentityHeader'));
    assert.ok(src.includes('avatarUrl={detailRecord.avatarUrl}'));
    assert.ok(src.includes('tooltip="Chỉnh sửa vai trò"'));
    assert.ok(src.includes('fullName: target.name'));
    assert.ok(src.includes('role: nextRole'));
    assert.ok(src.includes("u.role !== 'Admin'"), 'AdminUsers must exclude the system Admin / current self account from the user list');
    assert.equal(src.includes("value: 'Admin', label: 'Quản trị viên'"), false, 'AdminUsers role filter must omit Admin since the list excludes Admin accounts');
    assert.ok(primitives.includes('export function DetailModal'));
    assert.ok(primitives.includes('export function RoleEditModal'));
    assert.ok(primitives.includes('export function AdminAccountIdentityHeader'));
    assert.ok(primitives.includes('disabled={roleLocked || !roleChanged || !confirmed}'));
  });

  it('uses right-side SideDrawer with fixed header/footer and single body scroll for AdminMentorGroupPolicy', () => {
    const policy = readWeb('src/pages/admin/AdminMentorGroupPolicy.jsx');
    const overlay = readWeb('src/components/ui/overlay.jsx');

    assert.ok(policy.includes('<SideDrawer'));
    assert.ok(policy.includes('<DrawerHeader'));
    assert.ok(policy.includes('<DrawerBody'));
    assert.ok(policy.includes('<DrawerFooter'));
    assert.equal(policy.includes('max-h-[42vh]'), false);
    assert.ok(overlay.includes('export function SideDrawer'));
    assert.ok(overlay.includes('export function DrawerHeader'));
    assert.ok(overlay.includes('export function DrawerBody'));
    assert.ok(overlay.includes('export function DrawerFooter'));
  });

  it('uses dedicated rp-table-scroll container and enforces strict pagination page-jump clamping', () => {
    const tokens = readWeb('src/styles/tokens.css');
    const dataTable = readWeb('src/components/ui/data.jsx');
    const pagination = readWeb('src/components/ui/Pagination.jsx');
    const primitives = readWeb('src/features/admin/components/AdminPrimitives.jsx');

    assert.ok(tokens.includes('.rp-table-scroll'));
    assert.ok(dataTable.includes("stickyHeader || scrollClassName || fillHeight ? 'rp-table-scroll' : 'rp-scroll-x'"));
    assert.ok(dataTable.includes("align = 'center'"));
    assert.ok(dataTable.includes('resolveColumnAlign(col, index)'));
    assert.ok(primitives.includes('viewportLocked'));
    assert.ok(primitives.includes('alwaysShowPagination = false'));
    assert.ok(primitives.includes('inline-flex items-center justify-center gap-1'));
    assert.ok(pagination.includes('if (safeTotalPages <= 1) return null;'));
    assert.ok(pagination.includes('parsed < 1 || parsed > safeTotalPages'));
    assert.ok(pagination.includes('normalizedPageSizeOptions'));
    assert.ok(pagination.includes('max-w-full flex-wrap'));
  });

  it('keeps Admin headers and copy free of redundant subtitle/sort clutter', () => {
    const quality = readWeb('src/pages/admin/AdminMentorQuality.jsx');
    const dashboard = readWeb('src/pages/admin/AdminDashboard.jsx');

    assert.equal(quality.includes('subtitle='), false);
    assert.equal(dashboard.includes('Sắp xếp theo mức độ ưu tiên'), false);
    assert.ok(dashboard.includes("tr('Cần xử lý')"));
  });

  it('fills listing tables to the viewport bottom (responsive gap) and supports compact columns', () => {
    const dataTable = readWeb('src/components/ui/data.jsx');
    const primitives = readWeb('src/features/admin/components/AdminPrimitives.jsx');
    const proposalPanel = readWeb('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');
    const approvedBank = readWeb('src/pages/content-author/ApprovedBankPage.jsx');
    const questionBank = readWeb('src/pages/content-author/QuestionBank.jsx');

    // Short listing tables stay compact while long tables are capped to the workspace and scroll inside;
    // the pager stays pinned at the card bottom (Management UI System §4).
    assert.ok(dataTable.includes("fillHeight && 'min-h-0 max-h-full'"));
    assert.equal(dataTable.includes("fillHeight && 'min-h-0 flex-initial'"), false);
    assert.equal(primitives.includes('flex-1 min-h-[240px]'), false);
    assert.ok(primitives.includes("lg:max-h-full"));

    // Column sizing & compact action column support
    assert.ok(dataTable.includes("col.compact && 'w-[1%] whitespace-nowrap'"));
    assert.ok(dataTable.includes('compact: actionsCompact'));

    // Proposal course title avoids premature 240px clamp and provides hover tooltip
    assert.equal(proposalPanel.includes('max-w-[240px]'), false);
    assert.ok(proposalPanel.includes('title={courseTitle}'));

    // Server-paged banks delegate pagination natively into DataTable instead of rendering duplicate bars
    assert.equal(approvedBank.includes('showPageSize={false}'), false);
    assert.equal(questionBank.includes('showPageSize={false}'), false);
  });
});
