import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SOFT_PULSE_COUNTER_KEYS,
  buildSidebarBadgeAriaLabel,
  formatSidebarBadgeText,
  normalizeBadgeCount,
  resolveSidebarBadgeAttention,
  resolveSidebarBadgeVariant,
  shouldRenderSidebarBadge,
} from '@/components/ui/sidebarBadgeLogic.js';
import {
  COUNTER_TOOLTIP_TEMPLATES,
  SIDEBAR_COUNTER_KEYS,
  attachCounterIncreaseMetadata,
  collectUniqueCounterKeys,
  computeNextDueDelayMs,
  formatCounterTooltip,
  normalizeSidebarCountersResponse,
  resolveNavItemBadge,
  shouldAcceptCounterResponse,
} from '@/features/sidebar-counters/sidebarCounterModel.js';
import {
  clearSidebarCounterSnapshots,
  getCachedScopedCounters,
  sidebarCountersQueryKey,
} from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { ROLE_NAV, flattenNavItems } from '@/layouts/appNav.js';
import { JA_DICTIONARIES } from '@/locales/ja/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function relativeLuminance(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/\w\w/g)
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Smart Sidebar — SidebarBadge formatting & state logic', () => {
  it('hides count=0 and invalid/negative/NaN/undefined values without showing + prefix', () => {
    for (const bad of [0, -1, -99, NaN, undefined, null, Infinity, -Infinity, '', false, true]) {
      assert.equal(normalizeBadgeCount(bad), 0);
      assert.equal(shouldRenderSidebarBadge(bad), false);
      assert.equal(formatSidebarBadgeText(bad), '');
    }
  });

  it('formats 1..99 accurately and caps >99 at 99+ with full count in aria-label', () => {
    assert.equal(formatSidebarBadgeText(1), '1');
    assert.equal(formatSidebarBadgeText(20), '20');
    assert.equal(formatSidebarBadgeText(99), '99');
    assert.equal(formatSidebarBadgeText(100), '99+');
    assert.equal(formatSidebarBadgeText(245), '99+');
    assert.equal(formatSidebarBadgeText(19.9), '19');
    assert.equal(formatSidebarBadgeText(5).startsWith('+'), false);

    const tooltip = formatCounterTooltip({
      counterKey: SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE,
      count: 142,
    });
    assert.equal(tooltip, '142 thẻ đến hạn ôn tập');

    const aria = buildSidebarBadgeAriaLabel({
      label: 'Ôn thẻ đến hạn',
      count: 142,
      tooltip,
      stale: true,
    });
    assert.ok(aria.includes('142'));
    assert.ok(aria.includes('đang hiển thị số liệu gần nhất'));
  });

  it('switches cleanly between default (Coral) and active (Sakura muted) badge states', () => {
    const inactive = resolveSidebarBadgeVariant({ active: false, collapsed: false, parent: false });
    assert.equal(inactive.tone, 'default');
    assert.equal(inactive.dataState, 'inactive');

    const active = resolveSidebarBadgeVariant({ active: true, collapsed: false, parent: false });
    assert.equal(active.tone, 'active');
    assert.equal(active.dataState, 'active');

    const collapsedParent = resolveSidebarBadgeVariant({ active: false, collapsed: true, parent: true });
    assert.equal(collapsedParent.size, 'collapsed');
    assert.equal(collapsedParent.isParent, true);
  });

  it('disables infinite soft-pulse and applies finite 2-beat pop only on genuine fresh increases for eligible kinds', () => {
    assert.deepEqual(SOFT_PULSE_COUNTER_KEYS, []);

    // learner.srs_due: steady initial load -> none; active -> none; hidden tab -> none; count=0 -> none
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 1,
        counterKey: 'learner.srs_due',
        counterKind: 'DueItems',
        active: false,
        increaseSeq: 0,
        increasedAtMs: 0,
        mountTimeMs: 10_000,
        tabVisible: true,
      }).mode,
      'none',
    );
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 12,
        counterKey: 'learner.srs_due',
        counterKind: 'DueItems',
        active: true,
        increaseSeq: 1,
        increasedAtMs: 12_000,
        mountTimeMs: 10_000,
        tabVisible: true,
      }).mode,
      'none',
    );
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 12,
        counterKey: 'learner.srs_due',
        counterKind: 'DueItems',
        active: false,
        increaseSeq: 1,
        increasedAtMs: 12_000,
        mountTimeMs: 10_000,
        tabVisible: false,
      }).mode,
      'none',
    );
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 0,
        counterKey: 'learner.srs_due',
        counterKind: 'DueItems',
        active: false,
        increaseSeq: 1,
        increasedAtMs: 12_000,
        mountTimeMs: 10_000,
        tabVisible: true,
      }).mode,
      'none',
    );

    // Fresh realtime increases -> finite pop (odd/even phase + bumpNum) for ActionRequired, DueItems, PendingUserAction
    const duePop = resolveSidebarBadgeAttention({
      count: 2,
      counterKey: 'learner.srs_due',
      counterKind: 'DueItems',
      increaseSeq: 1,
      increasedAtMs: 11_000,
      mountTimeMs: 10_000,
    });
    assert.equal(duePop.mode, 'pop');
    assert.equal(duePop.popPhase, 'odd');
    assert.equal(duePop.bumpNum, true);

    const pendingPop = resolveSidebarBadgeAttention({
      count: 2,
      counterKey: 'mentor.proposals_action_required',
      counterKind: 'PendingUserAction',
      increaseSeq: 2,
      increasedAtMs: 12_000,
      mountTimeMs: 10_000,
    });
    assert.equal(pendingPop.mode, 'pop');
    assert.equal(pendingPop.popPhase, 'even');
    assert.equal(pendingPop.bumpNum, true);

    // ActionRequired: steady -> none, fresh increase -> pop (odd/even phase), stale remount -> none
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 3,
        counterKey: 'admin.mentor_schedules',
        counterKind: 'ActionRequired',
        increaseSeq: 0,
        increasedAtMs: 0,
        mountTimeMs: 10_000,
      }).mode,
      'none',
    );
    const pop1 = resolveSidebarBadgeAttention({
      count: 4,
      counterKey: 'admin.mentor_schedules',
      counterKind: 'ActionRequired',
      increaseSeq: 1,
      increasedAtMs: 12_000,
      mountTimeMs: 10_000,
    });
    assert.equal(pop1.mode, 'pop');
    assert.equal(pop1.popPhase, 'odd');

    const pop2 = resolveSidebarBadgeAttention({
      count: 5,
      counterKey: 'admin.mentor_schedules',
      counterKind: 'ActionRequired',
      increaseSeq: 2,
      increasedAtMs: 14_000,
      mountTimeMs: 10_000,
    });
    assert.equal(pop2.mode, 'pop');
    assert.equal(pop2.popPhase, 'even');

    // Navigating to a new page 5s after increase must NOT replay stale pop
    assert.equal(
      resolveSidebarBadgeAttention({
        count: 5,
        counterKey: 'admin.mentor_schedules',
        counterKind: 'ActionRequired',
        increaseSeq: 2,
        increasedAtMs: 14_000,
        mountTimeMs: 19_000,
      }).mode,
      'none',
    );
  });

  it('tracks genuine realtime increases without triggering on initial load, same-count refetch, or decrease', () => {
    const snap1 = attachCounterIncreaseMetadata(
      null,
      normalizeSidebarCountersResponse({
        result: {
          role: 'Admin',
          serverVersionMs: 1000,
          counters: [{ key: 'admin.mentor_schedules', count: 3, kind: 'ActionRequired' }],
        },
      }),
      10_000,
    );
    assert.equal(snap1.byKey['admin.mentor_schedules'].increaseSeq, 0);

    // Same-count refetch keeps seq=0
    const snapSame = attachCounterIncreaseMetadata(
      snap1,
      normalizeSidebarCountersResponse({
        result: {
          role: 'Admin',
          serverVersionMs: 2000,
          counters: [{ key: 'admin.mentor_schedules', count: 3, kind: 'ActionRequired' }],
        },
      }),
      15_000,
    );
    assert.equal(snapSame.byKey['admin.mentor_schedules'].increaseSeq, 0);

    // Increase 3 -> 4 bumps seq=1
    const snapUp = attachCounterIncreaseMetadata(
      snapSame,
      normalizeSidebarCountersResponse({
        result: {
          role: 'Admin',
          serverVersionMs: 3000,
          counters: [{ key: 'admin.mentor_schedules', count: 4, kind: 'ActionRequired' }],
        },
      }),
      20_000,
    );
    assert.equal(snapUp.byKey['admin.mentor_schedules'].increaseSeq, 1);
    assert.equal(snapUp.byKey['admin.mentor_schedules'].increasedAtMs, 20_000);

    // Same-count refetch after increase does NOT increment seq again
    const snapSameAfterUp = attachCounterIncreaseMetadata(
      snapUp,
      normalizeSidebarCountersResponse({
        result: {
          role: 'Admin',
          serverVersionMs: 4000,
          counters: [{ key: 'admin.mentor_schedules', count: 4, kind: 'ActionRequired' }],
        },
      }),
      30_000,
    );
    assert.equal(snapSameAfterUp.byKey['admin.mentor_schedules'].increaseSeq, 1);
    assert.equal(snapSameAfterUp.byKey['admin.mentor_schedules'].increasedAtMs, 20_000);

    // Decrease 4 -> 3 resets seq to 0 (no notification animation)
    const snapDown = attachCounterIncreaseMetadata(
      snapSameAfterUp,
      normalizeSidebarCountersResponse({
        result: {
          role: 'Admin',
          serverVersionMs: 5000,
          counters: [{ key: 'admin.mentor_schedules', count: 3, kind: 'ActionRequired' }],
        },
      }),
      35_000,
    );
    assert.equal(snapDown.byKey['admin.mentor_schedules'].increaseSeq, 0);
    assert.equal(snapDown.byKey['admin.mentor_schedules'].increasedAtMs, 0);
  });
});

describe('Smart Sidebar — Parent/child aggregation & anti-double-counting', () => {
  it('aggregates distinct child counters when parent is collapsed and distributes without duplication when expanded', () => {
    const mentorScheduleBranch = ROLE_NAV.Mentor.groups
      .flatMap((g) => g.items)
      .find((i) => i.id === 'mentor-teaching-schedule');
    assert.ok(mentorScheduleBranch, 'Mentor nav must expose mentor-teaching-schedule branch');

    const counterMap = {
      [SIDEBAR_COUNTER_KEYS.MENTOR_PROPOSALS_ACTION_REQUIRED]: { count: 3, kind: 'PendingUserAction' },
      [SIDEBAR_COUNTER_KEYS.MENTOR_COHORT_ATTENDANCE_PENDING]: { count: 2, kind: 'PendingUserAction' },
      [SIDEBAR_COUNTER_KEYS.MENTOR_HOMEWORK_TO_GRADE]: { count: 5, kind: 'ActionRequired' },
    };

    const whenClosed = resolveNavItemBadge(mentorScheduleBranch, counterMap, { isBranchOpen: false, collapsed: false });
    assert.equal(whenClosed.count, 3);
    assert.equal(whenClosed.parent, true);
    assert.equal(whenClosed.tooltip, '3 đăng ký cần xử lý');

    const whenExpanded = resolveNavItemBadge(mentorScheduleBranch, counterMap, { isBranchOpen: true, collapsed: false });
    assert.equal(whenExpanded.count, 0, 'Expanded parent must hide redundant aggregate when child displays count');

    const whenRailCollapsed = resolveNavItemBadge(mentorScheduleBranch, counterMap, { isBranchOpen: true, collapsed: true });
    assert.equal(whenRailCollapsed.count, 3, 'Collapsed icon rail must always show parent aggregate');

    const proposalChild = mentorScheduleBranch.children.find((c) => c.to === '/mentor-proposal-history');
    assert.ok(proposalChild);
    assert.equal(proposalChild.label, 'Danh sách đăng ký');
    assert.equal(resolveNavItemBadge(proposalChild, counterMap).count, 3);

    const mentorItems = ROLE_NAV.Mentor.groups.flatMap((g) => flattenNavItems(g.items));
    const leafAttendance = mentorItems.find((c) => c.to === '/mentor-study-courses');
    const leafHomework = mentorItems.find((c) => c.to === '/mentor-homework');
    assert.equal(resolveNavItemBadge(leafAttendance, counterMap).count, 2);
    assert.equal(resolveNavItemBadge(leafHomework, counterMap).count, 5);

    // Learner Group Learning branch aggregation & Sổ tay cá nhân intentional omission
    const learnerItems = ROLE_NAV.Learner.groups.flatMap((g) => g.items);
    const groupBranch = learnerItems.find((i) => i.id === 'group-learning');
    assert.ok(groupBranch);
    const learnerMap = {
      [SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE]: { count: 1, kind: 'DueItems' },
      [SIDEBAR_COUNTER_KEYS.LEARNER_HOMEWORK_PENDING]: { count: 4, kind: 'PendingUserAction' },
    };
    assert.equal(resolveNavItemBadge(groupBranch, learnerMap, { isBranchOpen: false, collapsed: false }).count, 4);
    assert.equal(resolveNavItemBadge(groupBranch, learnerMap, { isBranchOpen: true, collapsed: false }).count, 0);
    assert.equal(resolveNavItemBadge(groupBranch, learnerMap, { isBranchOpen: true, collapsed: true }).count, 4);

    const notebookItem = learnerItems.find((i) => i.to === '/kanji-notebook');
    assert.ok(notebookItem);
    assert.equal(notebookItem.counterKey, undefined, 'Sổ tay cá nhân must NOT carry a total-items notification badge');
    assert.equal(resolveNavItemBadge(notebookItem, learnerMap).count, 0);

    // Multi-child branch aggregate (2 + 5 = 7) with aggregate tooltip
    const multiChildBranch = {
      id: 'multi-child-test',
      children: [
        { to: '/mentor-study-courses', counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_COHORT_ATTENDANCE_PENDING },
        { to: '/mentor-homework', counterKey: SIDEBAR_COUNTER_KEYS.MENTOR_HOMEWORK_TO_GRADE },
      ],
    };
    const multiClosed = resolveNavItemBadge(multiChildBranch, counterMap, { isBranchOpen: false, collapsed: false });
    assert.equal(multiClosed.count, 7);
    assert.equal(multiClosed.tooltip, '7 công việc cần xử lý');
    assert.equal(resolveNavItemBadge(multiChildBranch, counterMap, { isBranchOpen: true, collapsed: false }).count, 0);
    assert.equal(resolveNavItemBadge(multiChildBranch, counterMap, { isBranchOpen: true, collapsed: true }).count, 7);
  });

  it('uses single-child semantic tooltip on collapsed Learner SRS parent and deduplicates repeated keys', () => {
    const srsBranch = ROLE_NAV.Learner.groups
      .flatMap((g) => g.items)
      .find((i) => i.id === 'srs-review');
    assert.ok(srsBranch);

    const map = { [SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE]: { count: 20 } };
    const closed = resolveNavItemBadge(srsBranch, map, { isBranchOpen: false, collapsed: false });
    assert.equal(closed.count, 20);
    assert.equal(closed.tooltip, '20 thẻ đến hạn ôn tập');

    // Duplicate key guard across hypothetical duplicate children
    const syntheticBranch = {
      id: 'dup-test',
      children: [
        { to: '/a', counterKey: SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE },
        { to: '/b', counterKey: SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE },
      ],
    };
    assert.deepEqual(collectUniqueCounterKeys(syntheticBranch), [SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE]);
    assert.equal(resolveNavItemBadge(syntheticBranch, map, { isBranchOpen: false }).count, 20);
  });

  it('partitions Content Author workbenches cleanly with zero overlap', () => {
    const authorCreate = ROLE_NAV.ContentAuthor.groups
      .flatMap((g) => g.items)
      .find((i) => i.id === 'author-create');
    const authorBank = ROLE_NAV.ContentAuthor.groups
      .flatMap((g) => g.items)
      .find((i) => i.id === 'author-bank');
    const createKeys = collectUniqueCounterKeys(authorCreate);
    const bankKeys = collectUniqueCounterKeys(authorBank);
    assert.equal(createKeys.length, 4);
    assert.equal(bankKeys.length, 1);
    for (const k of bankKeys) {
      assert.equal(createKeys.includes(k), false, `Duplicate counterKey ${k} across Author branches`);
    }
  });
});

describe('Smart Sidebar — Synchronization, out-of-order, SRS timer & cache isolation', () => {
  it('normalizes API responses and blocks out-of-order older snapshots while allowing role switch', () => {
    const newer = normalizeSidebarCountersResponse({
      result: {
        role: 'Learner',
        updatedAtUtc: '2026-11-24T06:00:10Z',
        serverVersionMs: 2000,
        nextDueAtUtc: '2026-11-24T06:10:00Z',
        counters: [
          { key: 'learner.srs_due', count: 19, kind: 'DueItems' },
          { key: 'learner.homework_pending', count: -3, kind: 'PendingUserAction' },
        ],
      },
    });
    assert.equal(newer.byKey['learner.srs_due'].count, 19);
    assert.equal(newer.byKey['learner.homework_pending'].count, 0);

    const older = normalizeSidebarCountersResponse({
      result: {
        role: 'Learner',
        serverVersionMs: 1000,
        counters: [{ key: 'learner.srs_due', count: 20, kind: 'DueItems' }],
      },
    });
    assert.equal(shouldAcceptCounterResponse(newer, older), false);
    assert.equal(shouldAcceptCounterResponse(older, newer), true);

    const differentRole = normalizeSidebarCountersResponse({
      result: {
        role: 'Admin',
        serverVersionMs: 900,
        counters: [{ key: 'admin.mentor_schedules', count: 3, kind: 'ActionRequired' }],
      },
    });
    assert.equal(shouldAcceptCounterResponse(newer, differentRole), true);
  });

  it('computes safe bounded SRS due-time refresh delays', () => {
    const now = Date.parse('2026-11-24T06:00:00Z');
    assert.equal(computeNextDueDelayMs(null, now), null);
    assert.equal(computeNextDueDelayMs('not-a-date', now), null);
    assert.equal(computeNextDueDelayMs('2026-11-24T05:59:00Z', now), 1500);
    assert.equal(computeNextDueDelayMs('2026-11-24T06:05:00Z', now), 5 * 60 * 1000 + 500);
    assert.equal(computeNextDueDelayMs('2026-11-25T06:00:00Z', now), null);
  });

  it('isolates query keys and snapshot cache strictly per (userId, role)', () => {
    const k1 = sidebarCountersQueryKey(101, 'Learner');
    const k2 = sidebarCountersQueryKey(102, 'Learner');
    const k3 = sidebarCountersQueryKey(101, 'Admin');
    assert.notDeepEqual(k1, k2);
    assert.notDeepEqual(k1, k3);
    clearSidebarCounterSnapshots();
    assert.equal(getCachedScopedCounters(101, 'Learner'), null);
  });
});

describe('Smart Sidebar — Design tokens, WCAG contrast, i18n & architecture contracts', () => {
  it('ensures every counterKey in ROLE_NAV is registered, has tooltip template, and has JA translation', () => {
    const knownKeys = new Set(Object.values(SIDEBAR_COUNTER_KEYS));
    const allJa = Object.assign({}, ...JA_DICTIONARIES);
    const seenPerRole = {};

    for (const [role, nav] of Object.entries(ROLE_NAV)) {
      seenPerRole[role] = new Set();
      for (const group of nav.groups) {
        for (const item of flattenNavItems(group.items)) {
          if (!item.counterKey) continue;
          assert.ok(knownKeys.has(item.counterKey), `${role} uses unregistered counterKey: ${item.counterKey}`);
          assert.equal(seenPerRole[role].has(item.counterKey), false, `${role} duplicates counterKey ${item.counterKey}`);
          seenPerRole[role].add(item.counterKey);

          const tpl = COUNTER_TOOLTIP_TEMPLATES[item.counterKey];
          assert.ok(tpl, `Missing tooltip template for ${item.counterKey}`);
          assert.ok(allJa[tpl], `Missing JA translation for "${tpl}"`);
        }
      }
    }
    assert.ok(seenPerRole.Learner.size >= 2);
    assert.ok(seenPerRole.Mentor.size >= 5);
    assert.ok(seenPerRole.Admin.size >= 8);
    assert.ok(seenPerRole.ContentAuthor.size >= 5);
  });

  it('defines light & dark badge tokens passing WCAG AA >= 4.5:1 with finite 2-beat pop, no white border, no soft-pulse, and reduced-motion guard', () => {
    const tokens = readSrc('src/styles/tokens.css');
    const lightBg = tokens.match(/--rp-sidebar-badge-bg:\s*(#[0-9A-Fa-f]{6})/)[1];
    const lightFg = tokens.match(/--rp-sidebar-badge-fg:\s*(#[0-9A-Fa-f]{6})/)[1];
    assert.ok(contrastRatio(lightBg, lightFg) >= 4.5, `Coral badge contrast must be >= 4.5:1 (got ${contrastRatio(lightBg, lightFg).toFixed(2)})`);

    const darkBlock = tokens.slice(tokens.lastIndexOf("[data-theme='dark']"));
    const darkBg = darkBlock.match(/--rp-sidebar-badge-bg:\s*(#[0-9A-Fa-f]{6})/)[1];
    const darkFg = darkBlock.match(/--rp-sidebar-badge-fg:\s*(#[0-9A-Fa-f]{6})/)[1];
    assert.ok(contrastRatio(darkBg, darkFg) >= 4.5, 'Dark badge contrast must be >= 4.5:1');

    const badgeCss = tokens.slice(tokens.indexOf('.rp-sidebar-badge {'));
    assert.doesNotMatch(badgeCss, /--rp-sidebar-badge-ring/, 'SidebarBadge must not add a white ring/border');
    assert.doesNotMatch(badgeCss, /soft-pulse/, 'SidebarBadge must not run an infinite soft-pulse animation');
    assert.match(badgeCss, /\.rp-sidebar-badge\[data-attention="pop"\]\[data-pop-phase="odd"\]/);
    assert.match(badgeCss, /\.rp-sidebar-badge\[data-attention="pop"\]\[data-pop-phase="even"\]/);
    assert.match(badgeCss, /animation:\s*rp-sidebar-badge-pop-odd\s+480ms[\s\S]*\b2\s+both;/);
    assert.match(badgeCss, /data-tab-hidden="true"[\s\S]*animation-play-state:\s*paused/);
    assert.match(badgeCss, /prefers-reduced-motion:\s*reduce/);
  });

  it('mounts useSidebarCounters once in AppShell (desktop + mobile Drawer), renders pop attrs in SidebarBadge, clears cache on Auth, and reconciles via SignalR/fallback', () => {
    const shell = readSrc('src/layouts/AppShell.jsx');
    assert.equal((shell.match(/useSidebarCounters\(/g) || []).length, 1, 'AppShell must call useSidebarCounters once');
    assert.match(shell, /<SidebarBadge/);
    assert.ok((shell.match(/counters=\{sidebarCounters\.byKey\}/g) || []).length >= 2, 'AppShell must wire counters into both desktop sidebar and mobile Drawer');
    assert.match(shell, /<Drawer[\s\S]{0,600}counters=\{sidebarCounters\.byKey\}/);

    const badgeComponent = readSrc('src/components/ui/SidebarBadge.jsx');
    assert.match(badgeComponent, /data-attention=\{attention\.mode\}/);
    assert.match(badgeComponent, /data-pop-phase=\{attention\.popPhase \|\| undefined\}/);
    assert.match(badgeComponent, /rp-sidebar-badge-num-bump/);

    const auth = readSrc('src/app/auth/AuthContext.jsx');
    assert.match(auth, /const login = useCallback[\s\S]{0,300}clearSidebarCounterSnapshots\(\);\s*queryClient\.clear\(\);/);
    assert.match(auth, /const logout = useCallback[\s\S]{0,350}clearSidebarCounterSnapshots\(\);\s*queryClient\.clear\(\);/);
    assert.match(auth, /const expireSession = useCallback[\s\S]{0,200}clearSidebarCounterSnapshots\(\);\s*queryClient\.clear\(\);/);

    const notif = readSrc('src/features/notifications/hooks/useNotification.js');
    assert.match(notif, /SidebarCountersChanged/);
    assert.match(notif, /setInterval\([\s\S]{0,300}scheduleDebouncedSidebarCounterRefresh\(queryClient\)/);
  });
});
