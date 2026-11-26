import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildBulkApproveItems,
  computeHeaderCheckboxState,
  getEligibleProposalIds,
  hasAnyEligibleProposals,
  isProposalSelectableForBulkApprove,
  reconcileSelectionWithRows,
  toggleProposalSelection,
  toggleSelectAllOnPage,
} from '@/features/scheduling/utils/bulkApprovalSelection.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Admin Bulk Approval Selection Mode — Pure Selection Engine', () => {
  const page1Rows = [
    { id: 101, status: 'PendingReview', hasConflicts: false, revision: 2, totalSessions: 40 },
    { id: 102, status: 'PendingReview', hasConflicts: false, revision: 1, totalSessions: 30 },
    { id: 103, status: 'Approved', hasConflicts: false, revision: 3, totalSessions: 20 },
    { id: 104, status: 'Rejected', hasConflicts: false, revision: 2, totalSessions: 20 },
    { id: 105, status: 'Withdrawn', hasConflicts: false, revision: 2, totalSessions: 20 },
    { id: 106, status: 'PendingReview', hasConflicts: true, revision: 1, totalSessions: 30 },
    { id: 107, status: 'ChangesRequested', hasConflicts: false, revision: 2, totalSessions: 20 },
  ];

  const page2Rows = [
    { id: 201, status: 'PendingReview', hasConflicts: false, revision: 1, totalSessions: 40 },
    { id: 202, status: 'PendingReview', hasConflicts: false, revision: 1, totalSessions: 20 },
  ];

  it('only allows PendingReview proposals without conflicts to be ticked', () => {
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[0]), true);
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[1]), true);
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[2]), false); // Approved
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[3]), false); // Rejected
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[4]), false); // Withdrawn
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[5]), false); // PendingReview with conflicts
    assert.equal(isProposalSelectableForBulkApprove(page1Rows[6]), false); // ChangesRequested
    assert.deepEqual(getEligibleProposalIds(page1Rows), [101, 102]);
  });

  it('blocks ticking ineligible rows and toggles eligible rows cleanly (40-session proposal counts as 1)', () => {
    let selected = [];
    selected = toggleProposalSelection(selected, page1Rows[2]); // Approved -> ignored
    selected = toggleProposalSelection(selected, page1Rows[3]); // Rejected -> ignored
    selected = toggleProposalSelection(selected, page1Rows[5]); // Conflicting -> ignored
    assert.deepEqual(selected, []);

    selected = toggleProposalSelection(selected, page1Rows[0]); // 40-session PendingReview -> 1 item
    assert.deepEqual(selected, [101]);
    assert.equal(selected.length, 1);

    selected = toggleProposalSelection(selected, page1Rows[1]);
    assert.deepEqual(selected, [101, 102]);

    selected = toggleProposalSelection(selected, page1Rows[0]);
    assert.deepEqual(selected, [102]);
  });

  it('computes unchecked, indeterminate, checked, and disabled states for current page header checkbox', () => {
    const emptyState = computeHeaderCheckboxState(page1Rows, []);
    assert.equal(emptyState.eligibleCount, 2);
    assert.equal(emptyState.selectedCount, 0);
    assert.equal(emptyState.checked, false);
    assert.equal(emptyState.indeterminate, false);
    assert.equal(emptyState.disabled, false);

    const partialState = computeHeaderCheckboxState(page1Rows, [101]);
    assert.equal(partialState.selectedCount, 1);
    assert.equal(partialState.checked, false);
    assert.equal(partialState.indeterminate, true);

    const fullState = computeHeaderCheckboxState(page1Rows, [101, 102]);
    assert.equal(fullState.selectedCount, 2);
    assert.equal(fullState.checked, true);
    assert.equal(fullState.indeterminate, false);

    const noEligibleState = computeHeaderCheckboxState([page1Rows[2], page1Rows[3]], []);
    assert.equal(noEligibleState.eligibleCount, 0);
    assert.equal(noEligibleState.disabled, true);
  });

  it('Select All only selects eligible proposals on the current page and never selects rows from page 2', () => {
    const afterSelectAll = toggleSelectAllOnPage(page1Rows, []);
    assert.deepEqual(afterSelectAll, [101, 102]);
    assert.equal(afterSelectAll.includes(201), false);
    assert.equal(afterSelectAll.includes(103), false);
    assert.equal(afterSelectAll.includes(106), false);

    // Toggling Select All again clears all selections on page 1
    const afterClear = toggleSelectAllOnPage(page1Rows, afterSelectAll);
    assert.deepEqual(afterClear, []);

    // Page 2 operates independently
    const page2Selected = toggleSelectAllOnPage(page2Rows, []);
    assert.deepEqual(page2Selected, [201, 202]);
  });

  it('reconciles selections after refresh/withdrawal without auto-selecting newly arrived proposals', () => {
    const refreshedRows = [
      { id: 101, status: 'Withdrawn', hasConflicts: false, revision: 3 }, // Mentor withdrew while admin had it selected
      { id: 102, status: 'PendingReview', hasConflicts: false, revision: 1 },
      { id: 109, status: 'PendingReview', hasConflicts: false, revision: 1 }, // Newly arrived proposal
    ];

    const reconciled = reconcileSelectionWithRows([101, 102], refreshedRows);
    assert.deepEqual(reconciled, [102]);
    assert.equal(reconciled.includes(109), false, 'Newly arrived proposal must never be auto-selected');
    assert.equal(hasAnyEligibleProposals([refreshedRows[0]]), false);
    assert.equal(hasAnyEligibleProposals(refreshedRows), true);
  });

  it('builds deduplicated bulk approve items with latest authoritative revisions', () => {
    const liveRevs = new Map([[101, 5]]);
    const items = buildBulkApproveItems(page1Rows, [101, 102, 101, -1], liveRevs);
    assert.deepEqual(items, [
      { proposalId: 101, expectedRevision: 5 },
      { proposalId: 102, expectedRevision: 1 },
    ]);
  });
});

describe('Admin Bulk Approval Selection Mode — UI & Safety Contracts', () => {
  it('keeps Default Mode clean, shows Chọn hàng loạt only when eligible proposals exist, and hides row Approve/Reject in Selection Mode', () => {
    const panel = readSrc('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');
    assert.match(panel, /ListChecks/);
    assert.match(panel, /hasEligibleInFiltered \? \(/);
    assert.match(panel, /selectionMode \? tr\('Thoát chế độ chọn'\) : tr\('Chọn hàng loạt'\)/);
    assert.match(panel, /const columns = selectionMode \? \[selectionColumn, \.\.\.baseColumns\] : baseColumns;/);
    assert.match(panel, /\{!selectionMode && isActionable && \(/);
    assert.match(panel, /data-testid="bulk-action-bar"/);
    assert.match(panel, /trf\('Đã chọn \{0\}\/\{1\} đề xuất'/);
    assert.match(panel, /tr\('Bỏ chọn tất cả'\)/);
    assert.match(panel, /trf\('Phê duyệt \(\{0\}\)'/);
    assert.match(panel, /bulkSubmitLockRef/);
    assert.match(panel, /ownerKey === authOwnerKey/);
    assert.doesNotMatch(panel, /localStorage\.setItem.*select|sessionStorage\.setItem.*select/i);
  });

  it('confirmation modal displays required fields, sakura primary confirm CTA, live prevalidation, and invalid item removal', () => {
    const modal = readSrc('src/features/scheduling/components/BulkApproveConfirmationModal.jsx');
    assert.match(modal, /tr\('Xác nhận phê duyệt hàng loạt'\)/);
    assert.match(modal, /trf\('Tổng số đề xuất được chọn: \{0\} đề xuất'/);
    assert.match(modal, /row\.mentorName/);
    assert.match(modal, /row\.jlptLevelCode/);
    assert.match(modal, /row\.courseTitle/);
    assert.match(modal, /row\.expectedStartDate/);
    assert.match(modal, /row\.weeklySessionCount/);
    assert.match(modal, /tr\('Quay lại'\)/);
    assert.match(modal, /tr\('Xác nhận phê duyệt'\)/);
    assert.match(modal, /variant="primary"/);
    assert.match(modal, /bulk-approve-remove-invalid-btn/);
  });

  it('shared Checkbox supports indeterminate state and DataTable supports beforeTable + onViewChange', () => {
    const core = readSrc('src/components/ui/core.jsx');
    assert.match(core, /indeterminate = false/);
    assert.match(core, /inputRef\.current\.indeterminate = Boolean\(indeterminate\)/);
    assert.match(core, /aria-checked=\{indeterminate \? 'mixed' : rest\.checked\}/);

    const dataTable = readSrc('src/components/ui/data.jsx');
    assert.match(dataTable, /onViewChange\?\.\(/);
    assert.match(dataTable, /beforeTable/);
    assert.match(dataTable, /typeof col\.header === 'function'/);
  });
});
