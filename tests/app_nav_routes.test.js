import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROLE_NAV, allNavTargets, buildBreadcrumbs, flattenNavItems, isNavItemActive } from '@/layouts/appNav.js';
import { canAccessPath, homeForRole, matchRoute } from '@/app/routes/routeTable.js';

describe('role sidebars', () => {
  it('have no dead links: every target is a real route', () => {
    for (const to of allNavTargets()) assert.ok(matchRoute(to), `missing route for ${to}`);
  });

  it('only link to pages the role can open', () => {
    for (const [role, nav] of Object.entries(ROLE_NAV)) {
      for (const group of nav.groups) {
        for (const item of flattenNavItems(group.items)) {
          if (item.to) assert.ok(canAccessPath(item.to, [role]), `${role} cannot open ${item.to}`);
        }
      }
      assert.equal(nav.home, homeForRole(role));
    }
  });

  it('contain no 1-1 booking, consultation package, payroll or payout entries', () => {
    const labels = Object.values(ROLE_NAV)
      .flatMap((n) => n.groups.flatMap((g) => flattenNavItems(g.items).map((i) => `${i.label} ${i.to}`)))
      .join(' | ');
    assert.doesNotMatch(labels, /Tư vấn 1-1|booking|payout|payroll|lương|compensation|mentor-plans|consultation-/i);
  });

  it('Learner reaches Group Learning workspace hierarchy', () => {
    const learner = allNavTargets();
    assert.ok(learner.includes('/group-learning'));
    assert.ok(learner.includes('/mentors'));
    assert.ok(learner.includes('/cohorts'));
    assert.ok(learner.includes('/my-courses'));
    assert.ok(learner.includes('/calendar'));
    assert.ok(learner.includes('/homework'));
    assert.ok(learner.includes('/group-learning/progress'));
  });

  it('uses Giáo viên consistently in user-facing role navigation', () => {
    const labels = Object.values(ROLE_NAV)
      .flatMap((nav) => [nav.area, ...nav.groups.flatMap((group) => [group.label, ...flattenNavItems(group.items).map((item) => item.label)])]);
    assert.ok(labels.includes('Học cùng Giáo viên'));
    assert.ok(labels.includes('Tìm Giáo viên'));
    assert.doesNotMatch(labels.join(' | '), /\bMentor\b|Cố vấn/i);
  });
});

describe('active state and breadcrumbs', () => {
  it('matches query-specific items and propagates active state to hierarchical parents', () => {
    const kana = ROLE_NAV.Learner.groups.flatMap((g) => g.items).find((i) => i.label === 'Bảng chữ Katakana');
    assert.equal(isNavItemActive(kana, '/kanji-writing/', '?type=katakana'), true);
    assert.equal(isNavItemActive(kana, '/kanji-writing/', '?type=kanji'), false);

    const groupBranch = ROLE_NAV.Learner.groups.flatMap((g) => g.items).find((i) => i.id === 'group-learning');
    assert.equal(isNavItemActive(groupBranch, '/calendar', ''), true);
    assert.equal(isNavItemActive(groupBranch, '/my-courses/7', ''), true);
    assert.equal(isNavItemActive(groupBranch, '/roadmap', ''), false);
  });

  it('builds area › group › item › page trails', () => {
    const trail = buildBreadcrumbs('Learner', '/mentors/12/', '', 'Sensei Aoi');
    assert.deepEqual(trail.map((c) => c.label), ['Học viên', 'Học cùng Giáo viên', 'Tìm Giáo viên', 'Sensei Aoi']);
    assert.equal(trail[1].to, '/group-learning');
    assert.equal(trail[2].to, '/mentors');
  });

  it('does not repeat the page label when it equals the nav item', () => {
    const trail = buildBreadcrumbs('Admin', '/admin/users/', '', 'Người dùng & vai trò');
    assert.deepEqual(trail.map((c) => c.label), ['Quản trị', 'Điều hành', 'Người dùng & vai trò']);
  });

  it('builds Admin Cấu hình & Điều hành breadcrumbs and covers new admin routes', () => {
    const catalogTrail = buildBreadcrumbs('Admin', '/admin/study-catalog/', '', 'Chứng chỉ & cấp độ');
    assert.deepEqual(catalogTrail.map((c) => c.label), ['Quản trị', 'Cấu hình', 'Chứng chỉ & cấp độ']);

    const plansTrail = buildBreadcrumbs('Admin', '/admin/plans/', '', 'Gói học & bảng giá');
    assert.deepEqual(plansTrail.map((c) => c.label), ['Quản trị', 'Cấu hình', 'Gói học & bảng giá']);

    const paymentsTrail = buildBreadcrumbs('Admin', '/admin/payments/', '', 'Thanh toán & giao dịch');
    assert.deepEqual(paymentsTrail.map((c) => c.label), ['Quản trị', 'Điều hành', 'Thanh toán & giao dịch']);

    const policiesTrail = buildBreadcrumbs('Admin', '/admin/policies/', '', 'Chính sách học tập');
    assert.deepEqual(policiesTrail.map((c) => c.label), ['Quản trị', 'Cấu hình', 'Chính sách học tập']);

    const adminTargets = flattenNavItems(ROLE_NAV.Admin.groups.flatMap((g) => g.items)).map((i) => i.to);
    assert.ok(adminTargets.includes('/admin/plans'));
    assert.ok(adminTargets.includes('/admin/payments'));
    assert.ok(adminTargets.includes('/admin/policies'));
    assert.ok(!ROLE_NAV.Admin.groups.some((g) => g.label === 'Nội dung'));
  });

  it('builds ContentAuthor Studio VNext labels and breadcrumbs', () => {
    const manualTrail = buildBreadcrumbs('ContentAuthor', '/content-manual/', '', 'Biên soạn nội dung');
    assert.deepEqual(manualTrail.map((c) => c.label), ['Tác giả nội dung', 'Biên soạn học liệu', 'Biên soạn nội dung']);

    const planTrail = buildBreadcrumbs('ContentAuthor', '/content-plan/', '', 'Trợ lý biên soạn');
    assert.deepEqual(planTrail.map((c) => c.label), ['Tác giả nội dung', 'Biên soạn học liệu', 'Trợ lý biên soạn']);

    const historyTrail = buildBreadcrumbs('ContentAuthor', '/bulk-import/', '?view=history', 'Lịch sử nhập liệu');
    assert.deepEqual(historyTrail.map((c) => c.label), ['Tác giả nội dung', 'Nhập liệu', 'Lịch sử nhập liệu']);
  });
});
