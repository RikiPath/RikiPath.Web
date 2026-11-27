/**
 * Pure selection helpers for Admin Bulk Approval Selection Mode at /admin/mentor-schedules/.
 * All selection rules are deterministic, side-effect free, and unit-tested.
 */

/**
 * A proposal row is eligible for bulk approval selection whenever it is PendingReview.
 * (V4 decouples Admin approval from slot/cohort conflict checks.)
 */
export function isProposalSelectableForBulkApprove(row) {
  return Boolean(row && row.status === 'PendingReview');
}

export function getEligibleProposals(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isProposalSelectableForBulkApprove);
}

export function getEligibleProposalIds(rows = []) {
  return getEligibleProposals(rows).map((r) => r.id);
}

export function hasAnyEligibleProposals(rows = []) {
  if (!Array.isArray(rows)) return false;
  return rows.some(isProposalSelectableForBulkApprove);
}

/**
 * Computes header Select All checkbox state strictly for the currently visible page rows.
 * Never counts ineligible rows and never reaches into other pages.
 */
export function computeHeaderCheckboxState(visibleRows = [], selectedIds = []) {
  const eligibleIds = getEligibleProposalIds(visibleRows);
  const selectedSet = new Set(selectedIds);
  const selectedOnPage = eligibleIds.filter((id) => selectedSet.has(id));
  const eligibleCount = eligibleIds.length;
  const selectedCount = selectedOnPage.length;

  return {
    eligibleIds,
    eligibleCount,
    selectedCount,
    checked: eligibleCount > 0 && selectedCount === eligibleCount,
    indeterminate: selectedCount > 0 && selectedCount < eligibleCount,
    disabled: eligibleCount === 0,
  };
}

/**
 * Toggles a single row if and only if it is eligible for bulk approval.
 */
export function toggleProposalSelection(selectedIds = [], row) {
  if (!isProposalSelectableForBulkApprove(row)) return selectedIds;
  const id = row.id;
  if (selectedIds.includes(id)) {
    return selectedIds.filter((item) => item !== id);
  }
  return [...selectedIds, id];
}

/**
 * Toggles Select All strictly across eligible rows on the current page.
 * Does not select rows from other pages and does not select ineligible rows.
 */
export function toggleSelectAllOnPage(visibleRows = [], selectedIds = []) {
  const { eligibleIds, checked } = computeHeaderCheckboxState(visibleRows, selectedIds);
  if (eligibleIds.length === 0) return [];
  if (checked) return [];
  return [...eligibleIds];
}

/**
 * Keeps only selected IDs that still exist in the current eligible row set.
 * Never auto-selects newly arrived proposals after refresh.
 */
export function reconcileSelectionWithRows(selectedIds = [], currentRows = []) {
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return [];
  const eligibleSet = new Set(getEligibleProposalIds(currentRows));
  const next = selectedIds.filter((id) => eligibleSet.has(id));
  return next.length === selectedIds.length ? selectedIds : next;
}

/**
 * Builds the authoritative API payload for pre-validation and transactional bulk approval.
 */
export function buildBulkApproveItems(
  proposals = [],
  selectedIds = [],
  liveRevisionsById = null,
  previewTokensById = null,
) {
  const byId = new Map((Array.isArray(proposals) ? proposals : []).map((p) => [p.id, p]));
  const items = [];
  const seen = new Set();

  for (const rawId of selectedIds || []) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    const row = byId.get(id);
    const revision = liveRevisionsById?.get?.(id) ?? row?.revision ?? null;
    const previewToken = previewTokensById?.get?.(id)
      ?? row?.approvalSchedulePreview?.schedulePreviewToken
      ?? row?.expectedSchedulePreviewToken
      ?? null;
    items.push({
      proposalId: id,
      expectedRevision: revision != null ? Number(revision) : null,
      expectedSchedulePreviewToken: previewToken || null,
    });
  }

  return items;
}
