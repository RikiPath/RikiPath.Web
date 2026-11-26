import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatApprovalStatusLabel,
  formatAuditActionLabel,
  formatContentEntityLabel,
  formatExamKindLabel,
  formatImportRowStatusLabel,
  formatQuestionTypeLabel,
  formatRightsStatusLabel,
  formatRoleLabel,
  formatSkillNameLabel,
  formatSourceTypeLabel,
} from '../src/utils/terminology.js';
import {
  normalizeLegacyNotificationItem,
  normalizeLegacyNotificationText,
} from '../src/features/notifications/utils/normalizeLegacyNotification.js';
import {
  computeScheduleYearRange,
  mapCohortSessionsToOccurrences,
} from '../src/features/scheduling/utils/proposalScheduleFormatters.js';

const ROOT = process.cwd();
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Global Terminology Standardization — Shared Mappings', () => {
  it('maps all system roles consistently to Vietnamese without leaking raw role enums', () => {
    assert.equal(formatRoleLabel('Admin', (s) => s), 'Quản trị viên');
    assert.equal(formatRoleLabel('Administrator', (s) => s), 'Quản trị viên');
    assert.equal(formatRoleLabel('Mentor', (s) => s), 'Giáo viên');
    assert.equal(formatRoleLabel('Consultant', (s) => s), 'Giáo viên');
    assert.equal(formatRoleLabel('Learner', (s) => s), 'Học viên');
    assert.equal(formatRoleLabel('ContentAuthor', (s) => s), 'Quản lý nội dung');
    assert.equal(formatRoleLabel('System', (s) => s), 'Hệ thống');
  });

  it('maps approval, audit, content, exam, skill, source, rights, and import enums cleanly', () => {
    assert.equal(formatApprovalStatusLabel('PendingReview', (s) => s), 'Chờ duyệt');
    assert.equal(formatApprovalStatusLabel('Approved', (s) => s), 'Đã duyệt');
    assert.equal(formatApprovalStatusLabel('Rejected', (s) => s), 'Bị từ chối');
    assert.equal(formatApprovalStatusLabel('ChangesRequested', (s) => s), 'Cần bổ sung');
    assert.equal(formatApprovalStatusLabel('NeedsRevision', (s) => s), 'Cần bổ sung');
    assert.equal(formatApprovalStatusLabel('Withdrawn', (s) => s), 'Đã rút');
    assert.equal(formatApprovalStatusLabel('Draft', (s) => s), 'Bản nháp');

    assert.equal(formatAuditActionLabel('Submitted', (s) => s), 'Gửi xét duyệt');
    assert.equal(formatAuditActionLabel('ChangesRequested', (s) => s), 'Yêu cầu bổ sung');
    assert.equal(formatContentEntityLabel('QuestionBank', (s) => s), 'Câu hỏi ngân hàng');
    assert.equal(formatExamKindLabel('FullMockTest', (s) => s), 'Đề thi thử JLPT');
    assert.equal(formatSourceTypeLabel('Manual', (s) => s), 'Biên soạn thủ công');
    assert.equal(formatRightsStatusLabel('Owned', (s) => s), 'Tự biên soạn / Sở hữu');
    assert.equal(formatSkillNameLabel('Listening', (s) => s), 'Nghe hiểu');
    assert.equal(formatImportRowStatusLabel('Valid', (s) => s), 'Hợp lệ');
    assert.equal(formatQuestionTypeLabel('MultipleChoice', (s) => s), 'Trắc nghiệm 4 lựa chọn');
  });
});

describe('Legacy Notification Display Normalizer', () => {
  it('normalizes legacy Admin / Mentor / Cố vấn / Learner / BTVN / raw category phrases', () => {
    assert.equal(
      normalizeLegacyNotificationText('Admin đã approve proposal của Mentor.'),
      'Quản trị viên đã phê duyệt đề xuất mở lớp của giáo viên.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Admin đã phê duyệt đề xuất của Mentor.'),
      'Quản trị viên đã phê duyệt đề xuất của Giáo viên.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Cố vấn đã phản hồi khiếu nại'),
      'Giáo viên đã phản hồi khiếu nại',
    );
    assert.equal(
      normalizeLegacyNotificationText('Ban quản trị đã đưa ra quyết định cho khiếu nại #12.'),
      'Quản trị viên đã đưa ra quyết định cho khiếu nại #12.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Lớp có cố vấn chính mới'),
      'Lớp học có Giáo viên mới',
    );
    assert.equal(
      normalizeLegacyNotificationText('Có khiếu nại mới #12 (PaymentEnrollment) cần xem xét.'),
      'Có khiếu nại mới #12 (Thanh toán & Ghi danh) cần xem xét.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Học viên đã nộp 90% BTVN đúng hạn.'),
      'Học viên đã nộp 90% bài tập về nhà đúng hạn.',
    );
  });

  it('preserves user-generated proper names, class names, and custom feedback verbatim', () => {
    const item = normalizeLegacyNotificationItem({
      id: 42,
      title: 'Đề xuất mở lớp JLPT N4 mới chờ duyệt',
      message: 'Giáo viên Mentor One vừa gửi đề xuất mở lớp "JLPT N4" (4 buổi/tuần × 10 tuần).',
      type: 'MentorSchedule',
    });
    assert.equal(item.title, 'Đề xuất mở lớp JLPT N4 mới chờ duyệt');
    assert.equal(item.message, 'Giáo viên Mentor One vừa gửi đề xuất mở lớp "JLPT N4" (4 buổi/tuần × 10 tuần).');
  });
});

describe('Global Terminology — UI & Technical Identifier Contracts', () => {
  it('wires NotificationCenter to legacy normalizer and preserves canonical role & route identifiers', () => {
    const notif = readSrc('src/features/notifications/components/NotificationCenter.jsx');
    assert.match(notif, /normalizeLegacyNotificationItem/);

    const shell = readSrc('src/layouts/AppShell.jsx');
    assert.match(shell, /Consultant:\s*'Giáo viên'/);
    assert.match(shell, /ContentAuthor:\s*'Quản lý nội dung'/);

    const mod = readSrc('src/features/admin/components/AdminModerationV2Panel.jsx');
    assert.match(mod, /formatExamKindLabel/);
    assert.match(mod, /formatContentEntityLabel/);
    assert.match(mod, /formatSourceTypeLabel/);
    assert.match(mod, /formatApprovalStatusLabel/);
    assert.match(mod, /formatAuditActionLabel/);

    // Technical route & role identifiers must stay untouched
    const nav = readSrc('src/layouts/appNav.js');
    assert.match(nav, /\/admin\/mentor-schedules/);
    assert.match(nav, /ContentAuthor:/);
  });

  it('supports week and year units in shared relative time formatter', () => {
    const fmtSrc = readSrc('src/locales/format.js');
    assert.match(fmtSrc, /'week'/);
    assert.match(fmtSrc, /'year'/);
  });

  it('normalizes legacy Khai giảng phrases to Bắt đầu without breaking custom titles', () => {
    assert.equal(
      normalizeLegacyNotificationText('Ngày khai giảng dự kiến của lớp chưa hợp lệ.'),
      'Ngày bắt đầu dự kiến của lớp chưa hợp lệ.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Lớp đã qua mốc đóng đăng ký. Vui lòng xem xét dời lịch khai giảng hoặc hủy lớp.'),
      'Lớp đã qua mốc đóng đăng ký. Vui lòng xem xét đổi ngày bắt đầu hoặc hủy lớp.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Chỉ được hủy ghi danh trước giờ khai giảng 24 giờ.'),
      'Chỉ được hủy ghi danh trước giờ bắt đầu 24 giờ.',
    );
    assert.equal(
      normalizeLegacyNotificationText('Lớp hiện tại đã khai giảng.'),
      'Lớp hiện tại đã bắt đầu.',
    );
  });
});

describe('Class Detail Schedule Conversion & Global Drawer Animation Contracts', () => {
  it('maps 20/30/40 cohort sessions in chronological VN order with accurate cross-year bounds (2026–2027)', () => {
    for (const total of [20, 30, 40]) {
      // Unordered input sessions crossing Dec 2026 into Jan 2027
      const raw = Array.from({ length: total }, (_, idx) => {
        const num = idx + 1;
        const start = new Date(Date.UTC(2026, 11, 3 + idx * 2, 3, 15, 0)); // 10:15 VN
        const end = new Date(start.getTime() + 90 * 60_000); // 11:45 VN
        return {
          number: num,
          availabilityId: 900 + num,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'Scheduled',
        };
      }).reverse();

      const occurrences = mapCohortSessionsToOccurrences(raw, {
        resolveStatus: () => ({ label: 'Sắp diễn ra', tone: 'info' }),
      });

      assert.equal(occurrences.length, total);
      assert.equal(occurrences[0].sessionNumber, 1);
      assert.equal(occurrences[0].localDate, '2026-12-03');
      assert.equal(occurrences[0].localStart, '10:15');
      assert.equal(occurrences[0].localEnd, '11:45');
      assert.equal(occurrences[0].statusLabel, 'Sắp diễn ra');
      assert.equal(occurrences[total - 1].sessionNumber, total);
      assert.equal(computeScheduleYearRange(occurrences), '2026–2027');
    }
  });

  it('provides GPU-composited enter/exit drawer animations and reduced-motion guards without changing Modal animations', () => {
    const css = readSrc('src/styles/design-system.css');
    assert.ok(css.includes('--rp-dur-drawer-in: 260ms'));
    assert.ok(css.includes('--rp-dur-drawer-out: 220ms'));
    assert.ok(css.includes('@keyframes rp-drawer-in-right'));
    assert.ok(css.includes('@keyframes rp-drawer-out-right'));
    assert.ok(css.includes('@keyframes rp-drawer-in-left'));
    assert.ok(css.includes('@keyframes rp-drawer-out-left'));
    assert.ok(css.includes('.rp-drawer-backdrop-in'));
    assert.ok(css.includes('.rp-drawer-backdrop-out'));

    const overlay = readSrc('src/components/ui/overlay.jsx');
    assert.ok(overlay.includes('const DRAWER_EXIT_MS = 230'));
    assert.ok(overlay.includes('useExitPresence(open, DRAWER_EXIT_MS)'));
    assert.ok(overlay.includes('rp-drawer-out-right'));
    assert.ok(overlay.includes('rp-anim-modal-out'));
    assert.ok(overlay.includes('titleBadge'));
  });
});
