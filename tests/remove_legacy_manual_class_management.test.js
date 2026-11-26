import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(import.meta.dirname, '..');
const BACKEND_ROOT = path.resolve(WEB_ROOT, '..', 'RikiPath.Backend');

const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');
const readBackend = (rel) => fs.readFileSync(path.join(BACKEND_ROOT, rel), 'utf8');

describe('Remove Legacy Manual Class Management — Frontend Cleanup & Monitoring Console', () => {
  it('removes manual edit modal, slot picker, publish checkbox, entitlement key/panel, and sync banner from AdminCohortConsolePanel', () => {
    const panel = readWeb('src/features/cohorts/components/AdminCohortConsolePanel.jsx');

    const forbiddenStrings = [
      'Sửa lớp nhóm',
      'Chỉnh sửa lớp nhóm',
      'Mở lớp từ đề xuất đã duyệt',
      'Mở lớp ngay sau khi lưu',
      'Quản lý quyền ghi danh',
      'Cấp quyền ghi danh',
      'Nhập mã hồ sơ học viên',
      'AdminManualGrant',
      'Đồng bộ lớp đã duyệt',
      'Tạo lớp thủ công',
      'saveCohort',
      'previewCohortSchedule',
      'grantCohortEntitlement',
      'revokeCohortEntitlement',
      'getCohortEntitlements',
      'repairApprovedCohorts',
      'KeyRound',
      'kind="edit"',
      'Checkbox',
    ];

    for (const token of forbiddenStrings) {
      assert.equal(panel.includes(token), false, `Forbidden legacy control "${token}" still present in AdminCohortConsolePanel.jsx`);
    }

    assert.ok(panel.includes('kind="view"'), 'Must render Eye (kind="view") inspection action');
    assert.ok(panel.includes('Xem chi tiết lớp'), 'Must include "Xem chi tiết lớp" tooltip/label');
    assert.ok(panel.includes('<Drawer'), 'Must render read-only class detail Drawer');
    assert.ok(panel.includes('<AdminDataTable'), 'Must preserve shared AdminDataTable');
    assert.ok(panel.includes('<AdminToolbar'), 'Must preserve shared AdminToolbar');
    assert.ok(panel.includes('hasAnyCohorts'), 'Must preserve conditional toolbar filter gating');
    assert.ok(panel.includes('<SearchInput'), 'Must include search control on toolbar');
    assert.ok(panel.includes('Tất cả cấp độ'), 'Must include JLPT level filter on toolbar');
    assert.ok(panel.includes('Tất cả giáo viên'), 'Must include Mentor filter on toolbar');
    assert.ok(panel.includes('mentorFilter'), 'Must wire mentorFilter state & select');
    assert.ok(panel.includes('Tất cả trạng thái'), 'Must include lifecycle status filter on toolbar');
    assert.ok(panel.includes('sortValue:'), 'AdminDataTable columns must support AdminUsers-standard column sorting');
    assert.ok(panel.includes('resolveClassLifecycleStatus'), 'Must use canonical class lifecycle status badges');
    assert.ok(panel.includes('titleBadge='), 'Class Detail Drawer must place status badge directly beside title');
    assert.ok(panel.includes('Tổng học phí đã thu'), 'Class Detail Drawer must show Total Tuition Collected card');
    assert.ok(panel.includes('<ProposalDetailedScheduleCard'), 'Class Detail Drawer must reuse shared ProposalDetailedScheduleCard');
    assert.equal(panel.includes('Tạo tự động từ đề xuất đã duyệt'), false, 'Redundant auto-created line must be removed from Class Detail Drawer');
    assert.equal(panel.includes('Lịch học hàng tuần cố định'), false, 'Repeated weekly schedule label must be removed from Class Detail Drawer');
    assert.equal(panel.includes('Học phí khóa'), false, 'Legacy Học phí khóa KPI title must be replaced');
    assert.equal(panel.includes('/admin/schedule-requests/'), false, 'Quick-nav footer links must be removed from Class Detail Drawer');
    assert.equal(panel.includes('/admin/mentor-replacements/'), false, 'Quick-nav footer links must be removed from Class Detail Drawer');
    assert.equal(panel.includes('/admin/transfers/'), false, 'Quick-nav footer links must be removed from Class Detail Drawer');
    assert.equal(panel.includes('/admin/payments/'), false, 'Quick-nav footer links must be removed from Class Detail Drawer');
  });

  it('removes legacy Gói khóa học tab and manual plan modal from AdminGroupWorkspace and isolates AdminPlansWorkspace to self-study/AI add-ons', () => {
    const workspace = readWeb('src/pages/admin/AdminGroupWorkspace.jsx');
    const proposalPanel = readWeb('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');
    const cohortApi = readWeb('src/features/cohorts/api/cohortApi.js');
    const proposalApi = readWeb('src/features/scheduling/api/teachingProposalApi.js');
    const adminPlansWs = readWeb('src/pages/admin/AdminPlansWorkspace.jsx');
    const adminPlansModel = readWeb('src/features/admin/plans/adminPlansModel.js');

    for (const forbidden of [
      'Lớp học & Quyền ghi danh',
      'Gói khóa học',
      'Mở Gói học & bảng giá',
      'Tạo gói mới',
      'Chỉnh sửa',
      'saveCoursePlan',
      'getApprovedProposalsForCohort',
      'getAdminAvailabilitySlots',
      'proposalIdParam',
    ]) {
      assert.equal(workspace.includes(forbidden), false, `Removed legacy text/ref "${forbidden}" still in AdminGroupWorkspace.jsx`);
    }
    assert.ok(workspace.includes('courses={courses}'), 'AdminGroupWorkspace must pass learner enrollment rows for drawer monitoring');
    assert.ok(workspace.includes('initialCohortId={cohortIdParam}'), 'AdminGroupWorkspace must support ?cohortId= deep-linking');

    // AdminPlansWorkspace must manage only self-study & AI add-on packages, never Group StudyCoursePlans
    assert.equal(adminPlansWs.includes('/study-courses/plans'), false);
    assert.equal(adminPlansModel.includes('mentor_legacy'), true);
    assert.ok(adminPlansModel.includes("'self_study'"));
    assert.ok(adminPlansModel.includes("'ai_grading'"));

    assert.equal(proposalPanel.includes('proposalId='), false, 'Approved proposal card/drawer must not link to legacy manual ?proposalId= class creation');
    assert.ok(proposalPanel.includes('/admin/study-courses/?cohortId=${detail.linkedCohortId}'));

    assert.equal(cohortApi.includes('saveCohort'), false);
    assert.equal(cohortApi.includes('previewCohortSchedule'), false);
    assert.equal(cohortApi.includes('grantCohortEntitlement'), false);
    assert.equal(cohortApi.includes('revokeCohortEntitlement'), false);
    assert.equal(cohortApi.includes('getCohortEntitlements'), false);
    assert.equal(cohortApi.includes('saveCoursePlan'), false);
    assert.equal(cohortApi.includes('getAdminAvailabilitySlots'), false);
    assert.ok(cohortApi.includes('export const getCohorts'));
    assert.ok(cohortApi.includes('export const getMyEntitlements'));

    assert.equal(proposalApi.includes('getApprovedProposalsForCohort'), false);
    assert.equal(proposalApi.includes('repairApprovedCohorts'), false);
  });
});

describe('Remove Legacy Manual Class Management — Backend Hardening & Auto-Sync Contracts', () => {
  it('blocks direct manual cohort creation, manual group course plan CRUD, and schedule/capacity/publish editing', () => {
    const cohortSvc = readBackend('RikiPath.Application/Services/StudyCohortService.cs');
    const courseSvc = readBackend('RikiPath.Application/Services/StudyCourseService.cs');
    const configSvc = readBackend('RikiPath.Application/Services/AdminBusinessConfigService.cs');

    assert.ok(cohortSvc.includes('LEGACY_MANUAL_COHORT_DISABLED'));
    assert.ok(cohortSvc.includes('COHORT_SCHEDULE_LOCKED_BY_PROPOSAL'));
    assert.ok(courseSvc.includes('LEGACY_MANUAL_COURSE_PLAN_DISABLED'));
    assert.ok(courseSvc.includes('PlansAsync'), 'Read-only PlansAsync and internal StudyCoursePlan FK dependencies remain preserved');
    assert.ok(courseSvc.includes('cohort?.TotalTuitionSnapshot is decimal snapshotTotal'), 'Checkout preserves immutable cohort tuition snapshot');
    assert.ok(
      configSvc.includes('TxNetAmount') && configSvc.includes('RefundedAmount'),
      'Revenue reports aggregate paid minus refunded StudyCourse.Amount snapshots without live pricing mutation',
    );
  });

  it('blocks legacy AdminManualGrant while preserving historical entitlements and automated/exception flows', () => {
    const entitlementSvc = readBackend('RikiPath.Application/Services/CohortEnrollmentEntitlementService.cs');
    const courseSvc = readBackend('RikiPath.Application/Services/StudyCourseService.cs');

    assert.ok(
      entitlementSvc.includes('Cấp quyền ghi danh thủ công đã ngừng sử dụng'),
      'GrantAsync must return explicit conflict when AdminManualGrant is attempted',
    );
    assert.ok(entitlementSvc.includes('"RemediationApproved"'), 'Retake support entitlement source must remain preserved');
    assert.ok(entitlementSvc.includes('"ScholarshipGrant"'));
    assert.ok(entitlementSvc.includes('"PartnerSponsor"'));
    assert.ok(entitlementSvc.includes('RevokeAsync'));
    assert.ok(entitlementSvc.includes('MyEntitlementsAsync'));
    assert.ok(courseSvc.includes('VerifiedCoursePurchase'), 'PayOS payment confirmation must automatically grant and consume VerifiedCoursePurchase');
  });

  it('automatically and idempotently backfills approved proposals without cohorts via StudyCohortLifecycleWorker', () => {
    const iface = readBackend('RikiPath.Application/IServices/IMentorTeachingProposalService.cs');
    const proposalSvc = readBackend('RikiPath.Application/Services/MentorTeachingProposalService.cs');
    const worker = readBackend('RikiPath.Infrastructure/Services/StudyCohortLifecycleWorker.cs');

    assert.ok(iface.includes('BackfillApprovedProposalCohortsSystemAsync'));
    assert.ok(proposalSvc.includes('BackfillApprovedProposalCohortsCoreAsync'));
    assert.ok(proposalSvc.includes('AutoBackfilledFromApprovedProposal'));
    assert.ok(proposalSvc.includes('LockScheduleAsync(proposal.MentorId, proposal.MentorId, token)'));
    assert.ok(proposalSvc.includes('EnsureCohortForApprovedProposalAsync'));
    assert.ok(worker.includes('BackfillApprovedProposalCohortsSystemAsync'));
  });
});
