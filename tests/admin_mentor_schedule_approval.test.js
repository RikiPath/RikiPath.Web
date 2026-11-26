import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeScheduleYearRange,
  formatDayMonth,
  formatProposalCourseDuration,
} from '@/features/scheduling/utils/proposalScheduleFormatters.js';
import {
  expandProposalOccurrences,
} from '@/features/scheduling/utils/proposalValidation.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const TWO_PER_WEEK = [
  { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
  { key: '5_720', weekday: 5, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
];

const THREE_PER_WEEK = [
  ...TWO_PER_WEEK,
  { key: '1_720', weekday: 1, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
];

const FOUR_PER_WEEK = [
  { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
  { key: '3_885', weekday: 3, startMinute: 885, endMinute: 975, startClock: '14:45', endClock: '16:15' },
  { key: '4_765', weekday: 4, startMinute: 765, endMinute: 855, startClock: '12:45', endClock: '14:15' },
  { key: '4_975', weekday: 4, startMinute: 975, endMinute: 1065, startClock: '16:15', endClock: '17:45' },
];

describe('Admin Mentor Schedule Approval — Refinement & Consistency', () => {
  it('B. formats course date range and 20/30/40 session counts accurately using actual last occurrence', () => {
    const occ20 = expandProposalOccurrences({
      expectedStartDate: '2026-12-02',
      weeklySessions: TWO_PER_WEEK,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(occ20.length, 20);
    assert.equal(
      formatProposalCourseDuration({ expectedStartDate: '2026-12-02', occurrences: occ20 }),
      `02/12/2026 → ${formatDayMonth(occ20[19].localDate)}/${occ20[19].localDate.slice(0, 4)} (20 buổi)`
    );

    const occ30 = expandProposalOccurrences({
      expectedStartDate: '2026-12-07',
      weeklySessions: THREE_PER_WEEK,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(occ30.length, 30);
    assert.ok(formatProposalCourseDuration({ expectedStartDate: '2026-12-07', occurrences: occ30 }).includes('(30 buổi)'));

    const occ40 = expandProposalOccurrences({
      expectedStartDate: '2026-12-02',
      weeklySessions: FOUR_PER_WEEK,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(occ40.length, 40);
    assert.equal(
      formatProposalCourseDuration({ expectedStartDate: '2026-12-02', occurrences: occ40 }),
      '02/12/2026 → 04/02/2027 (40 buổi)'
    );

    // Year range & cross-year continuous numbering
    assert.equal(computeScheduleYearRange(occ40), '2026–2027');
    assert.equal(occ40[0].sessionNumber, 1);
    assert.equal(occ40[39].sessionNumber, 40);
    const first2027Idx = occ40.findIndex((o) => o.localDate.startsWith('2027-'));
    assert.ok(first2027Idx > 0);
    assert.equal(occ40[first2027Idx].sessionNumber, occ40[first2027Idx - 1].sessionNumber + 1);

    // Single-year course displays single year only
    const singleYearOccs = expandProposalOccurrences({
      expectedStartDate: '2027-03-03',
      weeklySessions: TWO_PER_WEEK,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(computeScheduleYearRange(singleYearOccs), '2027');
  });

  it('A. removes legacy tabs from /admin/mentor-schedules/, simplifies table/toolbar, and separates semantic actions', () => {
    const hubSrc = readSrc('src/pages/admin/AdminMentorHub.jsx');
    const panelSrc = readSrc('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');

    // Legacy tabs completely removed from /admin/mentor-schedules/
    assert.ok(hubSrc.includes('<AdminTeachingProposalReviewPanel'), 'AdminMentorHub must render AdminTeachingProposalReviewPanel directly');
    assert.equal(hubSrc.includes("allowedTabs={['proposals', 'review']}"), false, 'Legacy proposal/review tabs must be removed from /admin/mentor-schedules/');
    assert.equal(hubSrc.includes('AdminSlotReview'), false, 'AdminMentorHub must no longer wrap schedules in AdminSlotReview');

    // Simplified 5-column proposal table (no teacher profile description, no workload column)
    assert.equal(panelSrc.includes('Hồ sơ đã duyệt'), false, 'Teacher column must not show profile verification description');
    assert.equal(panelSrc.includes('Tải & xung đột'), false, 'Workload & conflict column must be removed');
    assert.equal(panelSrc.includes('Xem & Duyệt'), false, 'Combined Xem & Duyệt button must be replaced by 3 independent icon buttons');

    // Three independent icon actions with proper semantic styling & tooltips
    assert.ok(panelSrc.includes('proposal-action-view-'), 'Must render Eye view action');
    assert.ok(panelSrc.includes('proposal-action-approve-'), 'Must render green Check approve action');
    assert.ok(panelSrc.includes('proposal-action-reject-'), 'Must render red X reject action');
    assert.ok(panelSrc.includes("tr('Xem chi tiết')"));
    assert.ok(panelSrc.includes("tr('Phê duyệt đề xuất')"));
    assert.ok(panelSrc.includes("tr('Từ chối đề xuất')"));
    assert.ok(panelSrc.includes('tone="brand"'), 'Approve icon action must use AdminIconAction brand tone');
    assert.ok(panelSrc.includes('tone="danger"'), 'Reject icon action must use AdminIconAction danger tone');
  });

  it('A, B & C. enforces sticky drawer header/actions, removes redundant cards, and shares Detailed Schedule with Mentor', () => {
    const panelSrc = readSrc('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');
    const mentorModalSrc = readSrc('src/features/scheduling/components/TeachingProposalReviewModal.jsx');
    const sharedSchedSrc = readSrc('src/features/scheduling/components/ProposalDetailedScheduleCard.jsx');

    // Fixed header + fixed sticky action bar + single scrollable DrawerBody
    assert.ok(panelSrc.includes('<SideDrawer'));
    assert.ok(panelSrc.includes('<DrawerHeader'));
    assert.ok(panelSrc.includes('data-testid="proposal-drawer-sticky-actions"'));
    assert.ok(panelSrc.includes('<DrawerBody'));
    assert.equal(panelSrc.includes('Chi tiết đề xuất mở lớp #{0}'), false, 'Drawer title must not expose internal #ID');
    assert.ok(panelSrc.includes("tr('Yêu cầu bổ sung')"), 'Must rename Yêu cầu sửa to Yêu cầu bổ sung');
    assert.equal(panelSrc.includes("tr('Yêu cầu sửa')"), false);

    // Removed redundant validation success box, verified badge, workload card, legacy fields, and history section
    assert.equal(panelSrc.includes('Đã đối chiếu lịch 10 tuần: hợp lệ'), false, 'Redundant green success box must be removed');
    assert.equal(panelSrc.includes('Hồ sơ đã xác minh'), false, 'Redundant verified badge must be removed');
    assert.equal(panelSrc.includes('Tải giảng dạy tổng hợp của Giáo viên'), false, 'Workload summary card must be removed');
    assert.equal(panelSrc.includes('Lịch sử phê duyệt'), false, 'Technical approval history section must be removed');
    assert.equal(panelSrc.includes('Loại chương trình'), false, 'Legacy program type field must be removed');
    assert.equal(panelSrc.includes('Gói tham chiếu'), false, 'Legacy course plan reference must be removed');

    // Shared 10-week Detailed Schedule reused by BOTH Mentor & Admin
    assert.ok(panelSrc.includes('<ProposalDetailedScheduleCard'), 'Admin drawer must reuse shared ProposalDetailedScheduleCard');
    assert.ok(mentorModalSrc.includes('<ProposalDetailedScheduleCard'), 'Mentor modal must reuse shared ProposalDetailedScheduleCard');
    assert.equal(sharedSchedSrc.includes('(T{1})'), false, 'Detailed schedule must not render legacy T1/T2 week tokens');
    assert.ok(sharedSchedSrc.includes("trf('Năm {0}'"), 'Detailed schedule must group sessions by year');

    // Live server revalidation before approval & full cross-role cache sync
    assert.ok(panelSrc.includes('admin-teaching-proposal-live-approve'), 'Approval confirmation must revalidate live server state before approving');
    assert.ok(panelSrc.includes("queryKey: ['mentor-teaching-proposals-context']"), 'Must sync Mentor proposal context after review');
    assert.ok(panelSrc.includes('invalidateSidebarCounters(queryClient)'), 'Must sync Smart Sidebar counters after review');
    assert.ok(!panelSrc.includes('Sparkles') && !sharedSchedSrc.includes('Sparkles'));
  });
});
