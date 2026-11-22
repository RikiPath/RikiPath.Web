import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROLE_NAV, allNavTargets, buildBreadcrumbs, isNavItemActive } from '@/layouts/appNav.js';
import { canAccessPath, homeForRole, matchRoute } from '@/app/routes/routeTable.js';

describe('role sidebars', () => {
  it('have no dead links: every target is a real route', () => {
    for (const to of allNavTargets()) assert.ok(matchRoute(to), `missing route for ${to}`);
  });

  it('only link to pages the role can open', () => {
    for (const [role, nav] of Object.entries(ROLE_NAV)) {
      for (const group of nav.groups) {
        for (const item of group.items) assert.ok(canAccessPath(item.to, [role]), `${role} cannot open ${item.to}`);
      }
      assert.equal(nav.home, homeForRole(role));
    }
  });

  it('contain no 1-1 booking, consultation package, payroll or payout entries', () => {
    const labels = Object.values(ROLE_NAV).flatMap((n) => n.groups.flatMap((g) => g.items.map((i) => `${i.label} ${i.to}`))).join(' | ');
    assert.doesNotMatch(labels, /Tư vấn 1-1|booking|payout|payroll|lương|compensation|mentor-plans|consultation-/i);
  });

  it('Learner reaches Group Learning (not 1-1 consultation)', () => {
    const learner = allNavTargets();
    assert.ok(learner.includes('/mentors'));
    assert.ok(learner.includes('/my-courses'));
  });
});

describe('active state and breadcrumbs', () => {
  it('matches query-specific items', () => {
    const kana = ROLE_NAV.Learner.groups[1].items.find((i) => i.label === 'Kana');
    assert.equal(isNavItemActive(kana, '/kanji-writing/', '?type=katakana'), true);
    assert.equal(isNavItemActive(kana, '/kanji-writing/', '?type=kanji'), false);
  });

  it('builds area › group › item › page trails', () => {
    const trail = buildBreadcrumbs('Learner', '/mentors/12/', '', 'Sensei Aoi');
    assert.deepEqual(trail.map((c) => c.label), ['Học viên', 'Học nhóm', 'Tìm Mentor', 'Sensei Aoi']);
    assert.equal(trail[2].to, '/mentors');
  });

  it('does not repeat the page label when it equals the nav item', () => {
    const trail = buildBreadcrumbs('Admin', '/admin/users/', '', 'Người dùng & vai trò');
    assert.deepEqual(trail.map((c) => c.label), ['Quản trị', 'Điều hành', 'Người dùng & vai trò']);
  });
});
