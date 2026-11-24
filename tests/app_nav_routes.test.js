import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

  it('Learner reaches Group Learning workspace hierarchy prioritized by active study needs', () => {
    const learner = allNavTargets();
    assert.equal(learner.includes('/group-learning'), false, 'Tổng quan lớp học (/group-learning) must be removed from sidebar');

    const groupBranch = ROLE_NAV.Learner.groups.flatMap((g) => g.items).find((i) => i.id === 'group-learning');
    assert.equal(groupBranch.to, '/my-courses');
    assert.deepEqual(
      groupBranch.children.map((c) => c.to),
      ['/my-courses', '/homework', '/calendar', '/group-learning/progress', '/cohorts', '/mentors'],
    );
  });

  it('removes duplicate Kho từ vựng from all role sidebars while keeping Grammar, Kanji, Kana, SRS, and Sổ tay cá nhân', () => {
    const allItems = Object.values(ROLE_NAV).flatMap((nav) => nav.groups.flatMap((g) => flattenNavItems(g.items)));
    assert.equal(allItems.some((i) => i.to === '/vocabulary' || i.label === 'Kho từ vựng'), false);

    const learnerTargets = new Set(
      ROLE_NAV.Learner.groups.flatMap((g) => flattenNavItems(g.items)).map((i) => i.to),
    );
    for (const required of ['/grammar', '/kanji-writing?type=kanji', '/kanji-writing?type=hiragana', '/kanji-writing?type=katakana', '/daily-srs', '/kanji-notebook']) {
      assert.ok(learnerTargets.has(required), `Learner sidebar missing ${required}`);
    }
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

    const srsBranch = ROLE_NAV.Learner.groups.flatMap((g) => g.items).find((i) => i.id === 'srs-review');
    assert.ok(srsBranch, 'Learner sidebar must define expandable srs-review branch');
    assert.deepEqual(
      srsBranch.children.map((c) => c.label),
      ['Tổng quan', 'Ôn thẻ đến hạn', 'Ôn tự do', 'Thẻ của tôi', 'Thư viện thẻ mẫu'],
    );
    const srsModes = srsBranch.children.find((c) => c.id === 'srs-practice');
    assert.equal(Boolean(srsModes.dividerAfter), false, 'SRS modes subgroup must not render horizontal dividerAfter');
    assert.deepEqual(
      srsModes.children.map((c) => ({ to: c.to, kind: c.kind, hasDesc: Boolean(c.description), hasIcon: Boolean(c.icon) })),
      [
        { to: '/daily-srs/practice/flip', kind: 'radio', hasDesc: false, hasIcon: true },
        { to: '/daily-srs/practice/typing', kind: 'radio', hasDesc: false, hasIcon: true },
        { to: '/daily-srs/practice/mcq', kind: 'radio', hasDesc: false, hasIcon: true },
        { to: '/daily-srs/practice/mixed', kind: 'radio', hasDesc: false, hasIcon: true },
      ],
    );
    const modeIconSet = new Set(srsModes.children.map((c) => c.icon));
    assert.equal(modeIconSet.size, 4, 'Each SRS review mode must use a distinct icon');
    assert.equal(isNavItemActive(srsBranch, '/daily-srs/practice/typing/', ''), true);
    assert.equal(isNavItemActive(srsModes, '/daily-srs/practice/mcq/', ''), true);
    assert.equal(isNavItemActive(srsModes, '/daily-srs/due/', ''), false);
    assert.equal(isNavItemActive(srsModes, '/daily-srs/library/', ''), false);

    const srsModeTrail = buildBreadcrumbs('Learner', '/daily-srs/practice/typing/', '', 'Gõ đáp án');
    assert.deepEqual(srsModeTrail.map((c) => c.label), ['Học viên', 'Ôn tập SRS', 'Ôn tự do', 'Gõ đáp án']);
    assert.ok(srsModeTrail[srsModeTrail.length - 1].icon, 'Active mode breadcrumb must carry mode icon');

    const srsProgressTrail = buildBreadcrumbs('Learner', '/daily-srs/progress/', '', 'Tổng quan');
    assert.deepEqual(srsProgressTrail.map((c) => c.label), ['Học viên', 'Ôn tập SRS', 'Tổng quan']);
  });

  it('builds area › group › item › page trails', () => {
    const trail = buildBreadcrumbs('Learner', '/mentors/12/', '', 'Sensei Aoi');
    assert.deepEqual(trail.map((c) => c.label), ['Học viên', 'Học cùng Giáo viên', 'Tìm Giáo viên', 'Sensei Aoi']);
    assert.equal(trail[1].to, '/my-courses');
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

    assert.deepEqual(
      ROLE_NAV.Admin.groups.map((g) => g.label),
      ['Điều hành', 'Lớp học & ghi danh', 'Lịch dạy & điều phối', 'Giám sát & hỗ trợ', 'Giáo viên', 'Cấu hình'],
    );
    const adminItems = ROLE_NAV.Admin.groups.flatMap((g) => g.items);
    assert.equal(adminItems.length, 19);

    for (const group of ROLE_NAV.Admin.groups) {
      const expectedTone = group.label === 'Cấu hình' ? 'neutral' : 'sakura';
      for (const item of group.items) {
        assert.equal(item.tone, expectedTone, `${group.label} item ${item.label} should use tone=${expectedTone}`);
      }
    }

    const complaintsTrail = buildBreadcrumbs('Admin', '/admin/complaints/', '', 'Khiếu nại khóa học');
    assert.deepEqual(complaintsTrail.map((c) => c.label), ['Quản trị', 'Giám sát & hỗ trợ', 'Khiếu nại khóa học']);

    const transfersTrail = buildBreadcrumbs('Admin', '/admin/transfers/', '', 'Chuyển lớp');
    assert.deepEqual(transfersTrail.map((c) => c.label), ['Quản trị', 'Lịch dạy & điều phối', 'Chuyển lớp']);
  });

  it('builds ContentAuthor Studio VNext labels and breadcrumbs', () => {
    const manualTrail = buildBreadcrumbs('ContentAuthor', '/content-manual/', '', 'Biên soạn nội dung');
    assert.deepEqual(manualTrail.map((c) => c.label), ['Tác giả nội dung', 'Biên soạn học liệu', 'Biên soạn nội dung']);

    const planTrail = buildBreadcrumbs('ContentAuthor', '/content-plan/', '', 'Trợ lý biên soạn');
    assert.deepEqual(planTrail.map((c) => c.label), ['Tác giả nội dung', 'Biên soạn học liệu', 'Trợ lý biên soạn']);

    const historyTrail = buildBreadcrumbs('ContentAuthor', '/bulk-import/', '?view=history', 'Lịch sử nhập liệu');
    assert.deepEqual(historyTrail.map((c) => c.label), ['Tác giả nội dung', 'Nhập liệu', 'Lịch sử nhập liệu']);
  });

  it('restructures Learner Luyện tập & Thi thử with Luyện đề & Thi thử accordion and exact active/breadcrumb states', () => {
    const practiceGroup = ROLE_NAV.Learner.groups.find((g) => g.label === 'Luyện tập & Thi thử');
    assert.ok(practiceGroup, 'Learner sidebar must include Luyện tập & Thi thử group');
    assert.deepEqual(
      practiceGroup.items.map((i) => i.label),
      ['Luyện viết', 'Luyện nói', 'Luyện đề & Thi thử'],
    );

    const branch = practiceGroup.items.find((i) => i.id === 'practice-exam');
    assert.ok(branch, 'practice-exam accordion branch must exist');
    assert.equal(branch.defaultOpen, false);
    assert.deepEqual(
      branch.children.map((c) => ({ label: c.label, to: c.to })),
      [
        { label: 'Bộ đề luyện tập', to: '/practice-sets' },
        { label: 'Thi thử JLPT', to: '/mock-tests' },
        { label: 'Lịch sử & kết quả', to: '/exam-result' },
      ],
    );

    const [practiceChild, mockChild, historyChild] = branch.children;
    const assertSingleActive = (pathname, search, expectedChild) => {
      assert.equal(isNavItemActive(branch, pathname, search), true, `${pathname}${search} must activate parent branch`);
      const activeCount = [practiceChild, mockChild, historyChild].filter((c) => isNavItemActive(c, pathname, search)).length;
      assert.equal(activeCount, 1, `${pathname}${search} must highlight exactly one child`);
      assert.equal(isNavItemActive(expectedChild, pathname, search), true, `${pathname}${search} must activate ${expectedChild.label}`);
    };

    assertSingleActive('/practice-sets', '', practiceChild);
    assertSingleActive('/practice-sets/', '', practiceChild);
    assertSingleActive('/practice-sets', '?level=N3', practiceChild);
    assertSingleActive('/practice-sets/42', '', practiceChild);

    assertSingleActive('/mock-tests', '', mockChild);
    assertSingleActive('/mock-tests/', '?attemptId=55', mockChild);
    assertSingleActive('/mock-tests/12', '', mockChild);
    assertSingleActive('/mock-test', '', mockChild);

    assertSingleActive('/exam-result', '', historyChild);
    assertSingleActive('/exam-result/', '', historyChild);
    assertSingleActive('/exam-result', '?attemptId=55', historyChild);
    assertSingleActive('/exam-result/12', '', historyChild);

    for (const [otherPath, otherSearch] of [['/riki/listening', ''], ['/app', '']]) {
      assert.equal(isNavItemActive(branch, otherPath, otherSearch), false);
      assert.equal(isNavItemActive(practiceChild, otherPath, otherSearch), false);
      assert.equal(isNavItemActive(mockChild, otherPath, otherSearch), false);
      assert.equal(isNavItemActive(historyChild, otherPath, otherSearch), false);
    }

    assert.deepEqual(
      buildBreadcrumbs('Learner', '/practice-sets/', '', 'Bộ đề luyện tập').map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Bộ đề luyện tập'],
    );
    assert.deepEqual(
      buildBreadcrumbs('Learner', '/mock-tests/', '?attemptId=55', 'Thi thử').map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Thi thử JLPT'],
    );
    assert.deepEqual(
      buildBreadcrumbs('Learner', '/exam-result/', '', 'Lịch sử & kết quả').map((c) => c.label),
      ['Học viên', 'Luyện đề & Thi thử', 'Lịch sử & kết quả'],
    );

    for (const target of ['/practice-sets', '/mock-tests', '/mock-test', '/exam-result']) {
      const route = matchRoute(target);
      assert.ok(route, `Route ${target} must remain registered`);
      assert.equal(Boolean(route.study), false, `Route ${target} must not be forced-locked by nav restructuring`);
    }

    const appShellSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/layouts/AppShell.jsx'), 'utf8');
    assert.ok(appShellSrc.includes('aria-expanded={isOpen}'));
    assert.ok(appShellSrc.includes('aria-controls={subId}'));
    assert.ok(appShellSrc.includes('motion-reduce:transition-none'));
    assert.ok(appShellSrc.includes("item.to && lockStateFor(item) !== 'locked'"));
    assert.ok(appShellSrc.includes('function isBranchFullyLocked('));
    assert.match(appShellSrc, /if\s*\(branchLocked && onLockedClick\)\s*\{\s*return\s*\(\s*<LockedNavItem/);
  });

  it('restructures Khám phá bài học into 6 submenus, removes duplicate listening/reading items, and preserves Kanji naming', () => {
    const roadmapGroup = ROLE_NAV.Learner.groups.find((g) => g.label === 'Lộ trình học JLPT');
    assert.ok(roadmapGroup, 'Learner sidebar must include Lộ trình học JLPT group');
    assert.deepEqual(roadmapGroup.items.map((i) => i.label), ['Lộ trình của tôi', 'Khám phá bài học']);

    const branch = roadmapGroup.items.find((i) => i.id === 'lesson-discovery');
    assert.ok(branch, 'lesson-discovery expandable branch must exist');
    assert.equal(branch.defaultOpen, false);
    assert.deepEqual(
      branch.children.map((c) => ({ label: c.label, to: c.to })),
      [
        { label: 'Tất cả bài học', to: '/lessons' },
        { label: 'Từ vựng', to: '/lessons?category=vocabulary' },
        { label: 'Ngữ pháp', to: '/lessons?category=grammar' },
        { label: 'Kanji', to: '/lessons?category=kanji' },
        { label: 'Nghe hiểu', to: '/lessons?category=listening' },
        { label: 'Đọc hiểu', to: '/lessons?category=reading' },
      ],
    );

    const [allChild, vocabChild, grammarChild, kanjiChild, listeningChild, readingChild] = branch.children;
    const assertSingleActive = (pathname, search, expectedChild) => {
      assert.equal(isNavItemActive(branch, pathname, search), true, `${pathname}${search} must activate lesson-discovery parent`);
      const activeChildren = branch.children.filter((c) => isNavItemActive(c, pathname, search));
      assert.equal(activeChildren.length, 1, `${pathname}${search} must highlight exactly one submenu child`);
      assert.equal(activeChildren[0], expectedChild, `${pathname}${search} must activate ${expectedChild.label}`);
    };

    assertSingleActive('/lessons', '', allChild);
    assertSingleActive('/lessons/', '', allChild);
    assertSingleActive('/lessons', '?level=N4', allChild);
    assertSingleActive('/lessons', '?category=all&level=N3', allChild);
    assertSingleActive('/lessons', '?category=vocabulary&level=N5', vocabChild);
    assertSingleActive('/lessons', '?skill=Vocabulary', vocabChild);
    assertSingleActive('/lessons', '?category=grammar', grammarChild);
    assertSingleActive('/lessons', '?skill=Grammar', grammarChild);
    assertSingleActive('/lessons', '?category=kanji', kanjiChild);
    assertSingleActive('/lessons', '?skill=Kanji', kanjiChild);
    assertSingleActive('/lessons', '?category=listening', listeningChild);
    assertSingleActive('/riki/listening', '', listeningChild);
    assertSingleActive('/riki/listening/', '?level=N4', listeningChild);
    assertSingleActive('/lessons', '?category=reading', readingChild);
    assertSingleActive('/riki/reading', '', readingChild);
    assertSingleActive('/riki/reading/', '?level=N3', readingChild);

    for (const [otherPath, otherSearch] of [['/roadmap', ''], ['/app', ''], ['/grammar', '']]) {
      assert.equal(isNavItemActive(branch, otherPath, otherSearch), false);
      for (const child of branch.children) {
        assert.equal(isNavItemActive(child, otherPath, otherSearch), false);
      }
    }

    assert.deepEqual(
      buildBreadcrumbs('Learner', '/lessons/', '', 'Tất cả bài học').map((c) => c.label),
      ['Học viên', 'Khám phá bài học', 'Tất cả bài học'],
    );
    assert.deepEqual(
      buildBreadcrumbs('Learner', '/lessons/', '?category=vocabulary&level=N5', 'Từ vựng').map((c) => c.label),
      ['Học viên', 'Khám phá bài học', 'Từ vựng'],
    );
    assert.deepEqual(
      buildBreadcrumbs('Learner', '/riki/listening/', '', 'Nghe hiểu').map((c) => c.label),
      ['Học viên', 'Khám phá bài học', 'Nghe hiểu'],
    );

    const libraryGroup = ROLE_NAV.Learner.groups.find((g) => g.label === 'Thư viện tiếng Nhật');
    assert.ok(libraryGroup, 'Learner sidebar must preserve Thư viện tiếng Nhật group');
    assert.deepEqual(
      libraryGroup.items.map((i) => i.label),
      ['Ngữ pháp tiếng Nhật', 'Kanji (Hán tự)', 'Bảng chữ Hiragana', 'Bảng chữ Katakana'],
    );

    for (const target of ['/lessons', '/riki/listening', '/riki/reading']) {
      const route = matchRoute(target);
      assert.ok(route, `Route ${target} must stay registered`);
      assert.equal(Boolean(route.study), true, `Route ${target} must preserve study=true entitlement lock`);
    }
  });
});
