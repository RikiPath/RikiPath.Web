import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { canAccessPath, matchRoute } from '@/app/routes/routeTable.js';
import { ROLE_NAV, flattenNavItems } from '@/layouts/appNav.js';
import { notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';
import { buildLearnerCalendarEvents } from '@/features/calendar/utils/calendarEventsModel.js';
import { JA_DICTIONARIES } from '@/locales/ja/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('V6 Multi-Role Workspace contracts', () => {
  it('routes Mentor Cohort Workspace, Complaints, Consultation Room & Admin deep-links cleanly', () => {
    const mentorCohortMatch = matchRoute('/mentor-study-courses/12');
    assert.ok(mentorCohortMatch, '/mentor-study-courses/12 should match a real route');
    assert.equal(mentorCohortMatch.path, '/mentor-study-courses/:cohortId');
    assert.equal(mentorCohortMatch.page, 'MentorClassWorkspace');

    const mentorAliasMatch = matchRoute('/mentor/cohorts/45');
    assert.ok(mentorAliasMatch);
    assert.equal(mentorAliasMatch.path, '/mentor/cohorts/:cohortId');
    assert.equal(mentorAliasMatch.page, 'MentorClassWorkspace');
    assert.equal(canAccessPath('/mentor/cohorts/45', ['Mentor']), true);

    const complaintMatch = matchRoute('/mentor/complaints/9');
    assert.ok(complaintMatch);
    assert.equal(complaintMatch.page, 'MentorDisputes');

    const consultRoomMatch = matchRoute('/consultation-room');
    assert.ok(consultRoomMatch);
    assert.equal(consultRoomMatch.page, 'ConsultationRoom');

    const adminStudyMatch = matchRoute('/admin/study-courses');
    assert.ok(adminStudyMatch);
    assert.equal(adminStudyMatch.page, 'AdminGroupWorkspace');
  });

  it('preserves notification destinations and query parameters for Mentor, Admin and Learner deep-links', () => {
    assert.equal(notificationDestination('/mentor/cohorts/14?section=attendance'), '/mentor-study-courses/14/?section=attendance');
    assert.equal(notificationDestination('/mentor/complaints/8'), '/mentor-disputes/?complaintId=8');
    assert.equal(notificationDestination('/mentor/schedule'), '/work-schedule/');
    assert.equal(notificationDestination('/mentor/availability'), '/mentor-shift-schedule/');
    assert.equal(notificationDestination('/admin/study-courses?cohortScheduleRequestId=3'), '/admin/study-courses?cohortScheduleRequestId=3');
    assert.equal(notificationDestination('/my-courses/21?section=homework'), '/my-courses/21?section=homework');
  });

  it('keeps every role sidebar hierarchy at <= 2 levels and includes Group Overview for Learner', () => {
    for (const [role, nav] of Object.entries(ROLE_NAV)) {
      for (const group of nav.groups) {
        for (const item of group.items) {
          if (item.children) {
            for (const child of item.children) {
              assert.equal(Boolean(child.children), false, `${role} nav child ${child.label} must not nest 3 levels`);
            }
          }
        }
      }
      assert.ok(flattenNavItems(nav.groups.flatMap((g) => g.items)).length > 0);
    }
    const learnerTargets = flattenNavItems(ROLE_NAV.Learner.groups.flatMap((g) => g.items)).map((i) => i.to);
    assert.ok(learnerTargets.includes('/group-learning'));
  });

  it('formats homework publishedGrade object DTO as /100 score instead of [object Object]', () => {
    const events = buildLearnerCalendarEvents({
      homeworks: [
        {
          id: 91,
          cohortId: 3,
          cohortName: 'N3 Chuyên sâu',
          title: 'Bài tập tuần 1',
          dueAt: '2026-11-20T12:00:00Z',
          status: 'Graded',
          publishedGrade: { score: 85, passed: true },
        },
        {
          id: 92,
          cohortId: 3,
          cohortName: 'N3 Chuyên sâu',
          title: 'Bài tập tuần 2',
          dueAt: '2026-11-21T12:00:00Z',
          status: 'Graded',
          publishedGrade: { passed: false },
        },
      ],
    });
    const hw1 = events.find((e) => e.id === 'hw-91');
    const hw2 = events.find((e) => e.id === 'hw-92');
    assert.ok(hw1);
    assert.ok(hw2);
    const serialized = JSON.stringify([hw1.metaRows, hw2.metaRows]);
    assert.equal(serialized.includes('[object Object]'), false);
    assert.ok(hw1.metaRows.some((m) => String(m.value).includes('85/100')));
    assert.ok(hw2.metaRows.some((m) => m.label === 'Điểm số' && String(m.value).length > 0));
  });

  it('mounts QuickJumpModal unconditionally in AppShell and includes JA translations for dynamic V6 keys', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');
    assert.equal(/!\s*onSearchChange[\s\S]{0,80}<QuickJumpModal/.test(shell), false);
    assert.match(shell, /<QuickJumpModal/);

    const allJa = Object.assign({}, ...JA_DICTIONARIES);
    const dynamicKeys = [
      'Chưa lưu thay đổi?',
      'Học viên & Năng lực',
      'Lịch học & Dời lịch',
      'Lớp học & Quyền ghi danh',
      'Ghi danh & Ôn lại JLPT',
      'Biên soạn & Kho học liệu',
      'Không dùng lịch giảng dạy nhóm',
      'Điều phối lịch & yêu cầu',
      'Tiến độ học liệu',
      'Thông báo điều phối',
      'Thông báo học liệu',
    ];
    for (const key of dynamicKeys) {
      assert.ok(allJa[key], `Missing JA translation for "${key}"`);
    }
  });

  it('orders the unified 3-icon header group (Globe -> Calendar -> Bell) with shared HeaderIconBadge styling', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'src/layouts/AppShell.jsx'), 'utf8');
    assert.match(shell, /<LanguageSwitch variant="icon" \/>\s*<HeaderCalendarPopover roleKey=\{roleKey\} \/>\s*<NotificationCenter \/>/);

    const uiCore = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');
    assert.match(uiCore, /export function HeaderIconBadge[\s\S]*bg-\[#E5383B\]/);

    for (const rel of [
      'src/components/brand/LanguageSwitch.jsx',
      'src/features/calendar/components/HeaderCalendarPopover.jsx',
      'src/features/notifications/components/NotificationCenter.jsx',
    ]) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(code, /HeaderIconBadge/, `${rel} must use shared HeaderIconBadge`);
      assert.match(code, /variant="outline"/, `${rel} must use outline circular IconButton`);
    }
  });

  it('passes valid props to Tabs and schedulePatternText in V6 workspaces', () => {
    for (const rel of [
      'src/pages/mentor/MentorClassWorkspace.jsx',
      'src/pages/admin/AdminGroupWorkspace.jsx',
      'src/pages/admin/AdminMentorCases.jsx',
    ]) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(code, /<Tabs[\s\S]{0,220}tabs=/, `${rel} must pass tabs= to <Tabs>`);
      assert.equal(/<Tabs[\s\S]{0,160}items=/.test(code), false, `${rel} must not pass items= to <Tabs>`);
    }
    const mentorWs = fs.readFileSync(path.join(ROOT, 'src/pages/mentor/MentorClassWorkspace.jsx'), 'utf8');
    assert.match(mentorWs, /schedulePatternText\(\s*entry\.cohortObj\.schedulePattern\s*,\s*entry\.cohortObj\.sessions\s*\)/);
  });
});
