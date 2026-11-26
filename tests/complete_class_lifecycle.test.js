import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeProposalTuitionPreview,
  formatTuitionVnd,
  normalizeProposalPolicy,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  computeClassProgress,
  isConfirmedClassEnrollment,
  resolveClassLifecycleStatus,
} from '@/features/scheduling/utils/teachingLifecycleModel.js';
import {
  buildActionQueueItems,
  normalizeServerDailyRevenueSeries,
} from '@/features/admin/utils/dashboardAnalytics.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(TEST_DIR, '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'RikiPath.Backend');

const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');
const readBackend = (rel) => fs.readFileSync(path.join(BACKEND_ROOT, rel), 'utf8');

describe('Complete Class Lifecycle — Tuition Config & Price Snapshot Math', () => {
  it('computes default N5-N2 per-session and 10-week full-course tuition accurately', () => {
    const policy = normalizeProposalPolicy();
    assert.equal(policy.minimumProposalLeadDays, 14);
    assert.equal(policy.minimumPublishedEnrollmentDays, 7);
    assert.deepEqual(policy.tuitionPerSessionByLevel, {
      N5: 60000,
      N4: 75000,
      N3: 90000,
      N2: 110000,
    });

    const n5Standard = computeProposalTuitionPreview('N5', 30, policy);
    assert.equal(n5Standard.levelCode, 'N5');
    assert.equal(n5Standard.tuitionPerSession, 60000);
    assert.equal(n5Standard.totalCourseTuition, 1800000);
    assert.equal(formatTuitionVnd(n5Standard.totalCourseTuition), '1.800.000 đ');

    const n4Light = computeProposalTuitionPreview('N4', 20, policy);
    assert.equal(n4Light.totalCourseTuition, 1500000);

    const n3Standard = computeProposalTuitionPreview('N3', 30, policy);
    assert.equal(n3Standard.totalCourseTuition, 2700000);

    const n2Advanced = computeProposalTuitionPreview('N2', 40, policy);
    assert.equal(n2Advanced.totalCourseTuition, 4400000);
  });

  it('respects custom Admin policy tuition & lead-day overrides and rejects invalid/zero levels', () => {
    const customPolicy = normalizeProposalPolicy({
      minimumProposalLeadDays: 21,
      minimumPublishedEnrollmentDays: 10,
      tuitionPerSessionByLevel: { N5: 80000, N4: 95000, N3: 0, N2: 120000 },
    });

    assert.equal(customPolicy.minimumProposalLeadDays, 21);
    assert.equal(customPolicy.minimumPublishedEnrollmentDays, 10);

    const customN5 = computeProposalTuitionPreview('n5', 30, customPolicy);
    assert.equal(customN5.totalCourseTuition, 2400000);

    const missingN3 = computeProposalTuitionPreview('N3', 30, customPolicy);
    assert.equal(missingN3.tuitionPerSession, 0);
    assert.equal(missingN3.totalCourseTuition, 0);

    const emptyLevel = computeProposalTuitionPreview('', 30, customPolicy);
    assert.equal(emptyLevel.totalCourseTuition, 0);
  });
});

describe('Complete Class Lifecycle — Mentor Class Gating & Enrollment Roster Isolation', () => {
  it('excludes unpaid holds, expired, failed, payment-review, transferred, and cancelled courses from confirmed roster', () => {
    assert.equal(isConfirmedClassEnrollment({ status: 'Active', paymentStatus: 'Paid' }), true);
    assert.equal(isConfirmedClassEnrollment({ status: 'Active', paymentStatus: 'PartiallyRefunded' }), true);
    assert.equal(isConfirmedClassEnrollment({ status: 'Ready', paymentStatus: 'Paid' }), true);
    assert.equal(isConfirmedClassEnrollment({ status: 'Completed', paymentStatus: 'Paid' }), true);

    assert.equal(isConfirmedClassEnrollment({ status: 'PendingPayment', paymentStatus: 'Pending' }), false);
    assert.equal(isConfirmedClassEnrollment({ status: 'PaymentExpired', paymentStatus: 'Expired' }), false);
    assert.equal(isConfirmedClassEnrollment({ status: 'PaymentFailed', paymentStatus: 'Failed' }), false);
    assert.equal(isConfirmedClassEnrollment({ status: 'PaymentReview', paymentStatus: 'Paid' }), false);
    assert.equal(isConfirmedClassEnrollment({ status: 'Transferred', paymentStatus: 'Paid' }), false);
    assert.equal(isConfirmedClassEnrollment({ status: 'Cancelled', paymentStatus: 'Refunded' }), false);
  });

  it('resolves Recruiting vs Upcoming vs Teaching vs Completed vs Cancelled accurately', () => {
    const futureIso = '2027-01-15T12:00:00Z';
    const pastIso = '2026-01-15T12:00:00Z';
    const nowMs = Date.parse('2026-11-25T06:00:00Z');

    // Newly auto-created cohort with 0 learners must be "Đang tuyển sinh" even if pending holds exist
    const recruiting = resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      confirmedEnrolledCount: 0,
      enrolledCount: 2, // e.g., pending holds only
      minLearnersToStart: 1,
      startsAt: futureIso,
      enrolledCourses: [{ status: 'PendingPayment', paymentStatus: 'Pending' }],
      nowMs,
    });
    assert.equal(recruiting.id, 'Recruiting');
    assert.equal(recruiting.label, 'Đang tuyển sinh');

    // Cohort with >= 1 confirmed paid learner before start date -> "Sắp khai giảng"
    const upcoming = resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      confirmedEnrolledCount: 1,
      minLearnersToStart: 1,
      startsAt: futureIso,
      enrolledCourses: [{ status: 'Ready', paymentStatus: 'Paid' }],
      nowMs,
    });
    assert.equal(upcoming.id, 'Upcoming');

    // Started cohort with confirmed learners -> "Đang giảng dạy"
    const teaching = resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      confirmedEnrolledCount: 2,
      minLearnersToStart: 1,
      startsAt: pastIso,
      enrolledCourses: [{ status: 'Active', paymentStatus: 'Paid' }],
      nowMs,
    });
    assert.equal(teaching.id, 'Teaching');

    // Explicitly completed cohort -> "Đã hoàn thành"
    const completed = resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      confirmedEnrolledCount: 1,
      startsAt: pastIso,
      enrolledCourses: [{ status: 'Completed', paymentStatus: 'Paid' }],
      nowMs,
    });
    assert.equal(completed.id, 'Completed');

    // Cancelled cohort -> "Đã hủy"
    const cancelled = resolveClassLifecycleStatus({
      cohortStatus: 'Cancelled',
      nowMs,
    });
    assert.equal(cancelled.id, 'Cancelled');

    const prog = computeClassProgress([
      { status: 'Present' },
      { status: 'Scheduled' },
      { status: 'Scheduled' },
      { status: 'Scheduled' },
    ], 4);
    assert.equal(prog.completedSessions, 1);
    assert.equal(prog.percent, 25);
  });
});

describe('Complete Class Lifecycle — Admin Dashboard Analytics & Action Queue', () => {
  it('prefers server pendingTeachingProposals when provided while remaining compatible with pendingMentorSchedules', () => {
    const withProposals = buildActionQueueItems({
      pendingTeachingProposals: 5,
      pendingMentorSchedules: 12,
    });
    const propItem = withProposals.find((x) => x.id === 'schedules');
    assert.equal(propItem.count, 5);
    assert.equal(propItem.label, 'Đề xuất mở lớp chờ duyệt');

    const fallback = buildActionQueueItems({ pendingMentorSchedules: 4 });
    assert.equal(fallback.find((x) => x.id === 'schedules').count, 4);
  });

  it('normalizes full server-authoritative daily revenue series without 100-row client truncation', () => {
    const normalized = normalizeServerDailyRevenueSeries([
      { date: '2026-11-24', subscriptionAmount: 199000, courseTuitionAmount: 1800000, aiTopUpAmount: 50000, netAmount: 2049000, paidOrders: 3 },
      { date: '2026-11-25', totalPaidAmount: 2700000 },
    ], 7);

    assert.equal(normalized.length, 7);
    const nov24 = normalized.find((d) => d.key === '2026-11-24');
    const nov25 = normalized.find((d) => d.key === '2026-11-25');
    assert.equal(nov24.value, 2049000);
    assert.equal(nov24.orders, 3);
    assert.equal(nov25.value, 2700000);
  });
});

describe('Complete Class Lifecycle — Backend Approval Bridge, Worker, Payments & KPI Contracts', () => {
  it('enforces atomic Approval-to-Cohort bridge, idempotent snapshot, and zero-tuition block', () => {
    const proposalSvc = readBackend('RikiPath.Application/Services/MentorTeachingProposalService.cs');
    assert.ok(proposalSvc.includes('EnsureCohortForApprovedProposalAsync'));
    assert.ok(proposalSvc.includes('TUITION_NOT_CONFIGURED'));
    assert.ok(proposalSvc.includes('TuitionPerSessionSnapshot'));
    assert.ok(proposalSvc.includes('TotalTuitionSnapshot'));
    assert.ok(proposalSvc.includes('TuitionPolicyVersionSnapshot'));
    assert.ok(proposalSvc.includes('RepairApprovedCohortsAsync'));
    assert.ok(proposalSvc.includes('/mentor-study-courses/{createdCohort.Id}/'));
  });

  it('registers StudyCohortLifecycleWorker to expire holds and alert Admins once per empty cutoff cohort', () => {
    const worker = readBackend('RikiPath.Infrastructure/Services/StudyCohortLifecycleWorker.cs');
    const program = readBackend('RikiPath.WebApi/Program.cs');

    assert.ok(worker.includes('SeatHoldExpired'));
    assert.ok(worker.includes('PaymentExpired'));
    assert.ok(worker.includes('cohort-empty-cutoff:'));
    assert.ok(program.includes('AddHostedService<RikiPath.Infrastructure.Services.StudyCohortLifecycleWorker>()'));
  });

  it('secures cohort payment snapshot, PayOS webhook handling, and Admin refund workflow', () => {
    const courseSvc = readBackend('RikiPath.Application/Services/StudyCourseService.cs');
    const paymentSvc = readBackend('RikiPath.Application/Services/PaymentService.cs');
    const configSvc = readBackend('RikiPath.Application/Services/AdminBusinessConfigService.cs');

    assert.ok(courseSvc.includes('cohort?.TotalTuitionSnapshot is decimal snapshotTotal'));
    assert.ok(courseSvc.includes('$"RP-C{course.Id}"'));
    assert.ok(courseSvc.includes('catch (PaymentGatewayException ex)'));

    assert.ok(paymentSvc.includes('currency mismatch (course)'));
    assert.ok(paymentSvc.includes('if (statusInt is >= 400 and < 500)'));

    assert.ok(configSvc.includes('c.Amount <= 0 || c.RetakeOfId.HasValue || c.TransferredFromCourseId.HasValue'));
    assert.ok(configSvc.includes('NormalizeStudyCoursePaymentStatus'));
    assert.ok(configSvc.includes('RefundStudyCoursePaymentAsync'));
  });

  it('aligns MentorKpiService with CohortMentorReviews, CohortComplaints, CancelledByLearner, and WebRTC fairness', () => {
    const kpiSvc = readBackend('RikiPath.Infrastructure/Services/MentorKpiService.cs');
    assert.ok(kpiSvc.includes('context.CohortMentorReviews'));
    assert.ok(kpiSvc.includes('context.CohortComplaints'));
    assert.ok(kpiSvc.includes('CancelledByLearner'));
    assert.ok(kpiSvc.includes('mentorAttendedRoom'));
    assert.ok(kpiSvc.includes('cancelledByLearner++'));
  });
});

describe('Complete Class Lifecycle — Zero Payroll & UI Hygiene Contracts', () => {
  it('excludes payroll, commission, salary, wallet, and raw technical IDs from new/updated UI workspaces', () => {
    const checkedFiles = [
      'src/pages/admin/AdminMentorGroupPolicy.jsx',
      'src/pages/admin/AdminPaymentsWorkspace.jsx',
      'src/pages/admin/AdminDashboard.jsx',
      'src/pages/mentor/MentorClassWorkspace.jsx',
      'src/pages/mentor/MentorAttendanceKpi.jsx',
      'src/pages/learner/LearnerMyCoursesPage.jsx',
      'src/features/cohorts/components/AdminCohortConsolePanel.jsx',
      'src/features/cohorts/components/LearnerCohortDiscoveryPanel.jsx',
    ];

    const forbiddenPayrollPattern = /(chi trả lương|bảng lương|hoa hồng giáo viên|ví tiền giáo viên|thanh toán thù lao)/i;
    for (const rel of checkedFiles) {
      const content = readWeb(rel);
      assert.equal(
        forbiddenPayrollPattern.test(content),
        false,
        `Unexpected payroll/commission wording found in ${rel}`,
      );
      assert.equal(content.includes('hover:underline'), false, `Forbidden hover:underline in ${rel}`);
      assert.equal(content.includes('Sparkles'), false, `Forbidden Sparkles icon in ${rel}`);
    }

    const adminCohortPanel = readWeb('src/features/cohorts/components/AdminCohortConsolePanel.jsx');
    assert.equal(adminCohortPanel.includes('Mã học viên (ID)'), false);

    const kpiPage = readWeb('src/pages/mentor/MentorAttendanceKpi.jsx');
    assert.equal(kpiPage.includes('toLocaleString('), false, 'MentorAttendanceKpi must use formatVnDateTime (24h standard)');

    const myCourses = readWeb('src/pages/learner/LearnerMyCoursesPage.jsx');
    assert.ok(myCourses.includes('HoldCountdown'));
    assert.ok(myCourses.includes('Bạn đã đăng ký lớp học thành công'));
  });
});
