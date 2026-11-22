import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KanjiBrushIcon,
  KanaHiraganaIcon,
  JlptRoadmapIcon,
  GroupClassIcon,
  SrsLoopIcon,
} from '@/components/ui/SakuraIcons.js';
import { FEATURE_TONES, errorStateKind } from '@/components/ui/logic.js';
import { isSessionExpiry } from '@/api/client.js';
import { ROLE_NAV, findActiveNav } from '@/layouts/appNav.js';
import {
  learnerKeys,
  learnerScopeKey,
  learnerProfileQueryKey,
  splitSrsQueue,
  weekBloomStates,
} from '@/features/dashboard/hooks/useLearnerHome.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('SakuraIcons & semantic tone mapping', () => {
  it('renders custom Japanese domain icons in pure JS for SSR/Node compatibility', () => {
    for (const Icon of [KanjiBrushIcon, KanaHiraganaIcon, JlptRoadmapIcon, GroupClassIcon, SrsLoopIcon]) {
      const el = Icon({ className: 'h-4 w-4' });
      assert.equal(el.type, 'svg');
      assert.equal(el.props['aria-hidden'], 'true');
      assert.ok(String(el.props.className).includes('h-4 w-4'));
    }
  });

  it('registers semantic FEATURE_TONES for kanji, kana, srs, roadmap, and group', () => {
    for (const key of ['kanji', 'kana', 'srs', 'roadmap', 'group', 'vocabulary', 'grammar', 'listening', 'reading', 'writing', 'speaking', 'mock', 'mentor', 'calendar', 'haru']) {
      assert.ok(FEATURE_TONES[key], `missing FEATURE_TONES.${key}`);
      assert.ok(FEATURE_TONES[key].Icon, `missing Icon for ${key}`);
      assert.ok(FEATURE_TONES[key].bg, `missing bg for ${key}`);
      assert.ok(FEATURE_TONES[key].fg, `missing fg for ${key}`);
    }
    assert.equal(FEATURE_TONES.kanji.Icon, KanjiBrushIcon);
    assert.equal(FEATURE_TONES.kana.Icon, KanaHiraganaIcon);
    assert.equal(FEATURE_TONES.srs.Icon, SrsLoopIcon);
    assert.equal(FEATURE_TONES.roadmap.Icon, JlptRoadmapIcon);
    assert.equal(FEATURE_TONES.group.Icon, GroupClassIcon);
  });

  it('assigns distinct adjacent semantic icons across Learner nav groups', () => {
    const learnerItems = ROLE_NAV.Learner.groups.flatMap((g) => g.items);
    const roadmap = learnerItems.find((i) => i.to === '/roadmap');
    const kanji = learnerItems.find((i) => i.to === '/kanji-writing?type=kanji');
    const kana = learnerItems.find((i) => i.to === '/kanji-writing?type=hiragana');
    const srs = learnerItems.find((i) => i.to === '/daily-srs');
    const courses = learnerItems.find((i) => i.to === '/my-courses');
    assert.equal(roadmap.icon, JlptRoadmapIcon);
    assert.equal(kanji.icon, KanjiBrushIcon);
    assert.equal(kana.icon, KanaHiraganaIcon);
    assert.equal(srs.icon, SrsLoopIcon);
    assert.equal(courses.icon, GroupClassIcon);
    assert.notEqual(kanji.icon, kana.icon);
  });

  it('resolves active nav across all 4 roles', () => {
    assert.equal(findActiveNav('Learner', '/roadmap/', '')?.item.to, '/roadmap');
    assert.equal(findActiveNav('Mentor', '/mentor-attendance-kpi', '')?.item.to, '/mentor-attendance-kpi');
    assert.equal(findActiveNav('ContentAuthor', '/bulk-import', '')?.item.to, '/bulk-import');
    assert.equal(findActiveNav('Admin', '/admin/study-courses', '')?.item.to, '/admin/study-courses');
  });
});

describe('Learner dashboard cache isolation & state math', () => {
  it('isolates learner query scopes by userId and preview mode while keeping prefix invalidation', () => {
    const alice = learnerScopeKey({ userId: 101, isPreview: false });
    const bob = learnerScopeKey({ userId: 202, isPreview: false });
    const preview = learnerScopeKey({ userId: 101, isPreview: true });
    assert.notDeepEqual(alice, bob);
    assert.notDeepEqual(alice, preview);

    const kAlice = learnerProfileQueryKey({ userId: 101, isPreview: false });
    assert.deepEqual(kAlice.slice(0, learnerKeys.profile.length), learnerKeys.profile);
  });

  it('computes SRS due buckets and week bloom streak states cleanly', () => {
    assert.deepEqual(splitSrsQueue([]), { urgent: 0, due: 0, longTerm: 0 });
    assert.deepEqual(
      splitSrsQueue([{ repetitions: 0 }, { repetitions: 3 }, { repetitions: 7 }]),
      { urgent: 1, due: 1, longTerm: 1 },
    );
    const week = weekBloomStates(2, true);
    assert.equal(week.length, 7);
    assert.ok(week.includes('today'));
  });

  it('distinguishes 5xx server failure from offline and forbidden errors', () => {
    assert.equal(errorStateKind({ status: 500 }), 'error');
    assert.equal(errorStateKind({ isNetwork: true }), 'offline');
    assert.equal(errorStateKind({ status: 403 }), 'forbidden');
    assert.equal(
      isSessionExpiry(401, { url: '/Notification/unread-count', headers: { Authorization: 'Bearer preview-learner' } }),
      false,
    );
    assert.equal(
      isSessionExpiry(401, { url: '/Notification/unread-count', headers: { Authorization: 'Bearer real.jwt.token' } }),
      true,
    );
  });
});

describe('Layout tokens, sidebar collapse geometry & canonical Group Learning UI', () => {
  it('defines fluid containers, 76px collapsed sidebar token, motion preferences & hover classes', () => {
    const css = readSrc('src/styles/tokens.css');
    assert.match(css, /--spacing-rp-sidebar-collapsed:\s*76px/);
    assert.match(css, /\.rp-container\s*\{/);
    assert.match(css, /\.rp-container-reading\s*\{/);
    assert.match(css, /\.rp-icon-tilt/);
    assert.match(css, /\.rp-card-hover/);
    assert.match(css, /\.rp-header-ambient/);
    assert.match(css, /\.rp-sidebar-scroll[\s\S]*overflow-x:\s*clip/);
    assert.match(css, /aside\[data-collapsed='true'\]\s+\.rp-sidebar-scroll/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });

  it('uses Portal fixed tooltips and centered collapsed buttons in AppShell', () => {
    const shell = readSrc('src/layouts/AppShell.jsx');
    const overlay = readSrc('src/components/ui/overlay.jsx');
    assert.match(shell, /mx-auto h-10 w-10 justify-center/);
    assert.match(shell, /side="right"/);
    assert.match(overlay, /<Portal>/);
    assert.match(overlay, /role="tooltip"/);
    assert.match(overlay, /fixed z-\[140\]/);
  });

  it('keeps Haru mascot confined to Learner workspace and absent from Mentor dashboard', () => {
    const homeLearner = readSrc('src/pages/learner/HomeLearner.jsx');
    const mentorOverview = readSrc('src/pages/mentor/ConsultantOverview.jsx');
    assert.match(homeLearner, /HaruMascot/);
    assert.doesNotMatch(mentorOverview, /HaruMascot/);
  });

  it('removes legacy 1-1 consultation & mentor-session strings across active components', () => {
    for (const file of [
      'src/pages/learner/StudyPlans.jsx',
      'src/features/cohorts/components/LearnerCohortDiscoveryPanel.jsx',
      'src/features/cohorts/components/AdminCohortConsolePanel.jsx',
      'src/pages/shared/StudyCoursesPage.jsx',
      'src/pages/mentor/WorkSchedule.jsx',
      'src/pages/shared/MeetingRoom.jsx',
    ]) {
      const content = readSrc(file);
      assert.doesNotMatch(
        content,
        /Vé tư vấn 1-1|Khóa 1-1|mentorSessionsRemaining|buổi ôn luyện cùng mentor|Đã có người đặt|lịch hẹn của bạn/i,
        `Legacy wording remained in ${file}`,
      );
    }
  });
});
