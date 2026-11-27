import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  Eye,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  MessageSquareWarning,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  AttachmentItemRow,
  AttachmentPreviewModal,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  DrawerBody,
  DrawerHeader,
  Field,
  Modal,
  SakuraLoader,
  SearchInput,
  SideDrawer,
  Textarea,
  Tooltip,
  formatIsoDateDisplay,
  notify,
  useAttachmentPreview,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { getAdminMentorVerificationDocument } from '@/features/admin/api/adminApi.js';
import {
  bulkApproveTeachingProposals,
  fetchAdminProposalAttachmentBlob,
  fetchAdminProposalAttachmentPreview,
  getAdminTeachingProposal,
  getAdminTeachingProposals,
  prevalidateBulkApproveProposals,
  reviewAdminTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  formatTuitionVnd,
  PROPOSAL_STATUS_META,
  sortWeeklySessions,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  buildBulkApproveItems,
  computeHeaderCheckboxState,
  hasAnyEligibleProposals,
  isProposalSelectableForBulkApprove,
  reconcileSelectionWithRows,
  toggleProposalSelection,
  toggleSelectAllOnPage,
} from '@/features/scheduling/utils/bulkApprovalSelection.js';
import BulkApproveConfirmationModal from './BulkApproveConfirmationModal.jsx';
import ProposalDetailedScheduleCard from './ProposalDetailedScheduleCard.jsx';
import { formatProposalCourseDuration } from '@/features/scheduling/utils/proposalScheduleFormatters.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { useAuth } from '@/app/auth/authContext.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả', dotClass: 'bg-[#CE476D]' },
  { value: 'PendingReview', label: 'Chờ duyệt', dotClass: 'bg-amber-500' },
  { value: 'ChangesRequested', label: 'Cần bổ sung', dotClass: 'bg-[#EA580C]' },
  { value: 'Approved', label: 'Đã duyệt', dotClass: 'bg-emerald-600' },
  { value: 'OpenedClass', label: 'Đã mở lớp', dotClass: 'bg-sky-600' },
  { value: 'Rejected', label: 'Bị từ chối', dotClass: 'bg-red-500' },
];

const JLPT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
];

function stripRedundantFrequency(title = '') {
  return String(title || '')
    .replace(/\s*\(\s*\d+\s*buổi\s*\/\s*tuần\s*\)\s*$/i, '')
    .trim();
}

function resolveProposalTableTitle(row, trf) {
  const cleaned = stripRedundantFrequency(row?.courseTitle || '');
  if (cleaned) {
    const levelCode = String(row?.jlptLevelCode || '').trim().toUpperCase();
    const hasLevelInTitle = Boolean(levelCode && new RegExp(`\\b${levelCode}\\b`, 'i').test(cleaned));
    return {
      courseTitle: cleaned,
      showLevelBadge: Boolean(levelCode && !hasLevelInTitle),
      levelCode,
    };
  }
  const levelCode = String(row?.jlptLevelCode || '').trim().toUpperCase();
  if (levelCode) {
    return {
      courseTitle: trf('Lớp JLPT {0}', { 0: levelCode }),
      showLevelBadge: false,
      levelCode,
    };
  }
  return {
    courseTitle: trf('Đề xuất mở lớp', {}),
    showLevelBadge: false,
    levelCode: '',
  };
}

export default function AdminTeachingProposalReviewPanel({
  initialProposalId = null,
  toolbarTabs = null,
  fillHeight = false,
}) {
  const { tr, trf } = useLocale();
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authOwnerKey = user?.id ?? 'anon';
  const lastHandledUrlProposalIdRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState(() => (initialProposalId ? 'ALL' : 'PendingReview'));
  const [jlptFilter, setJlptFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(() => (initialProposalId ? Number(initialProposalId) : null));
  const [decisionModal, setDecisionModal] = useState(null); // { decision: 'Approve' | 'RequestChanges' | 'Reject', proposal }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [docPreview, setDocPreview] = useState(null); // { mentorId, url, isPdf }

  // Bulk Approval Selection Mode state — strictly in-memory & scoped to current auth user (never persisted across logout/account switch)
  const [selectionState, setSelectionState] = useState(() => ({
    ownerKey: authOwnerKey,
    enabled: false,
    ids: [],
  }));
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [returnToBulkConfirm, setReturnToBulkConfirm] = useState(false);
  const [bulkServerConflict, setBulkServerConflict] = useState(null);
  const bulkSubmitLockRef = useRef(false);

  const handleViewProposalFromBulk = useCallback((proposalId) => {
    if (!proposalId) return;
    setReturnToBulkConfirm(true);
    setBulkConfirmOpen(false);
    setSelectedId(proposalId);
  }, []);

  const clearProposalUrlParam = useCallback(() => {
    setSearchParams((prev) => {
      if (!prev.has('proposalId')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('proposalId');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeDetailDrawer = useCallback(() => {
    setSelectedId(null);
    clearProposalUrlParam();
    if (returnToBulkConfirm) {
      setReturnToBulkConfirm(false);
      setBulkConfirmOpen(true);
    }
  }, [returnToBulkConfirm, clearProposalUrlParam]);

  useEffect(() => () => {
    if (docPreview?.url) URL.revokeObjectURL(docPreview.url);
  }, [docPreview]);

  const docMutation = useMutation({
    mutationFn: (mentorId) => getAdminMentorVerificationDocument(mentorId),
    onSuccess: (blob, mentorId) => {
      setDocPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          mentorId,
          url: URL.createObjectURL(blob),
          isPdf: String(blob?.type || '').toLowerCase().includes('pdf'),
        };
      });
    },
    onError: (err) => {
      notify.error(describeApiError(err).message || tr('Chưa tải được chứng chỉ hồ sơ của giáo viên.'));
    },
  });

  const attachmentPreview = useAttachmentPreview();

  const handleViewProposalAttachment = useCallback((proposalId, att, idx) => {
    if (!proposalId) return;
    void attachmentPreview.openPreview({
      key: `${proposalId}:${idx}:view`,
      attachment: att,
      fetchBlob: () => fetchAdminProposalAttachmentBlob(proposalId, idx, { download: false }),
      fetchDownloadBlob: () => fetchAdminProposalAttachmentBlob(proposalId, idx, { download: true }),
      fetchPreview: () => fetchAdminProposalAttachmentPreview(proposalId, idx),
    });
  }, [attachmentPreview]);

  const handleDownloadProposalAttachment = useCallback((proposalId, att, idx) => {
    if (!proposalId) return;
    void attachmentPreview.downloadAttachment({
      key: `${proposalId}:${idx}:dl`,
      attachment: att,
      fetchBlob: () => fetchAdminProposalAttachmentBlob(proposalId, idx, { download: true }),
    });
  }, [attachmentPreview]);

  useEffect(() => {
    if (!initialProposalId) {
      lastHandledUrlProposalIdRef.current = null;
      return undefined;
    }
    const targetId = String(initialProposalId);
    if (lastHandledUrlProposalIdRef.current === targetId) return undefined;
    lastHandledUrlProposalIdRef.current = targetId;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setSelectedId(Number(initialProposalId));
      setStatusFilter('ALL');
    });
    return () => {
      alive = false;
    };
  }, [initialProposalId]);

  const proposalsQuery = useQuery({
    queryKey: [...ADMIN_KEYS.teachingProposals, 'ALL'],
    queryFn: () => getAdminTeachingProposals({ status: 'ALL' }),
    refetchInterval: 20000,
  });

  const detailQuery = useQuery({
    queryKey: ['admin-teaching-proposal-detail', selectedId],
    queryFn: () => getAdminTeachingProposal(selectedId),
    enabled: Boolean(selectedId),
    staleTime: 0,
  });

  // Live server revalidation whenever an Approval Confirmation modal is open (never approve on stale table data)
  const approveTargetId = decisionModal?.decision === 'Approve' ? decisionModal?.proposal?.id : null;
  const liveApproveQuery = useQuery({
    queryKey: ['admin-teaching-proposal-live-approve', approveTargetId],
    queryFn: () => getAdminTeachingProposal(approveTargetId),
    enabled: Boolean(approveTargetId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const allProposals = useMemo(
    () => (Array.isArray(proposalsQuery.data)
      ? proposalsQuery.data.filter((r) => r && r.status !== 'Withdrawn' && r.status !== 'Cancelled')
      : []),
    [proposalsQuery.data]
  );

  const statusCounts = useMemo(() => {
    const counts = {
      ALL: allProposals.length,
      PendingReview: 0,
      ChangesRequested: 0,
      Approved: 0,
      OpenedClass: 0,
      Rejected: 0,
    };
    for (const row of allProposals) {
      if (row?.status && counts[row.status] != null) {
        counts[row.status] += 1;
      }
    }
    return counts;
  }, [allProposals]);

  const hasAnyProposals = proposalsQuery.isSuccess && allProposals.length > 0;

  const mentorOptions = useMemo(() => {
    const map = new Map();
    allProposals.forEach((r) => {
      if (r.mentorId && !map.has(String(r.mentorId))) {
        map.set(String(r.mentorId), r.mentorName || tr('Giáo viên'));
      }
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [allProposals, tr]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProposals.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (jlptFilter !== 'ALL' && String(r.jlptLevelCode || '').trim().toUpperCase() !== jlptFilter) return false;
      if (mentorFilter !== 'ALL' && String(r.mentorId) !== String(mentorFilter)) return false;
      if (!q) return true;
      return (
        String(r.mentorName || '').toLowerCase().includes(q)
        || String(r.courseTitle || '').toLowerCase().includes(q)
        || String(r.jlptLevelCode || '').toLowerCase().includes(q)
        || String(r.courseObjective || '').toLowerCase().includes(q)
      );
    });
  }, [allProposals, jlptFilter, mentorFilter, search, statusFilter]);

  const syncAfterReviewMutation = async (proposalId) => {
    const tasks = [
      invalidateAdminDomains(queryClient, ['schedules', 'cohorts']),
      invalidateSidebarCounters(queryClient),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['mentor-teaching-proposals-context'] }),
      queryClient.invalidateQueries({ queryKey: ['my-mentor-schedule'] }),
      queryClient.invalidateQueries({ queryKey: ['my-availability-slots'] }),
    ];
    if (Array.isArray(proposalId)) {
      proposalId.forEach((pid) => {
        tasks.push(queryClient.invalidateQueries({ queryKey: ['admin-teaching-proposal-detail', pid] }));
      });
    } else if (proposalId) {
      tasks.push(queryClient.invalidateQueries({ queryKey: ['admin-teaching-proposal-detail', proposalId] }));
    }
    await Promise.allSettled(tasks);
  };

  // Derived selection state: automatically resets on account switch, reconciles on data refresh, and auto-exits when no eligible proposals remain
  const hasEligibleInFiltered = useMemo(
    () => hasAnyEligibleProposals(filteredRows),
    [filteredRows],
  );
  const selectionMode = Boolean(
    selectionState.ownerKey === authOwnerKey
    && selectionState.enabled
    && hasEligibleInFiltered,
  );
  const selectedIds = useMemo(() => {
    if (!selectionMode) return [];
    return reconcileSelectionWithRows(selectionState.ids, filteredRows);
  }, [selectionMode, selectionState.ids, filteredRows]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProposals = useMemo(() => {
    const byId = new Map(filteredRows.map((r) => [r.id, r]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [filteredRows, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectionState((prev) => ({
      ownerKey: authOwnerKey,
      enabled: prev.ownerKey === authOwnerKey ? prev.enabled : false,
      ids: [],
    }));
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const exitSelectionMode = useCallback(() => {
    setSelectionState({ ownerKey: authOwnerKey, enabled: false, ids: [] });
    setBulkConfirmOpen(false);
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }
    if (!hasEligibleInFiltered) return;
    setSelectionState({ ownerKey: authOwnerKey, enabled: true, ids: [] });
    setBulkServerConflict(null);
  }, [authOwnerKey, exitSelectionMode, hasEligibleInFiltered, selectionMode]);

  const handleToggleRow = useCallback((row) => {
    setSelectionState((prev) => {
      const baseIds = prev.ownerKey === authOwnerKey ? prev.ids : [];
      return {
        ownerKey: authOwnerKey,
        enabled: true,
        ids: toggleProposalSelection(baseIds, row),
      };
    });
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const handleToggleSelectAllOnPage = useCallback((visibleRows) => {
    setSelectionState((prev) => {
      const baseIds = prev.ownerKey === authOwnerKey ? prev.ids : [];
      return {
        ownerKey: authOwnerKey,
        enabled: true,
        ids: toggleSelectAllOnPage(visibleRows, baseIds),
      };
    });
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const handleRemoveFromBulkConfirm = useCallback((proposalId) => {
    setSelectionState((prev) => {
      const nextIds = (prev.ownerKey === authOwnerKey ? prev.ids : []).filter((id) => id !== proposalId);
      if (nextIds.length === 0) {
        setBulkConfirmOpen(false);
      }
      return {
        ownerKey: authOwnerKey,
        enabled: prev.ownerKey === authOwnerKey ? prev.enabled : false,
        ids: nextIds,
      };
    });
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const handleRemoveInvalidFromBulkConfirm = useCallback((invalidIds = []) => {
    const dropSet = new Set(invalidIds);
    setSelectionState((prev) => {
      const nextIds = (prev.ownerKey === authOwnerKey ? prev.ids : []).filter((id) => !dropSet.has(id));
      if (nextIds.length === 0) {
        setBulkConfirmOpen(false);
      }
      return {
        ownerKey: authOwnerKey,
        enabled: prev.ownerKey === authOwnerKey ? prev.enabled : false,
        ids: nextIds,
      };
    });
    setBulkServerConflict(null);
  }, [authOwnerKey]);

  const prevalidateItems = useMemo(
    () => buildBulkApproveItems(filteredRows, selectedIds),
    [filteredRows, selectedIds],
  );
  const prevalidateKey = useMemo(
    () => prevalidateItems.map((x) => `${x.proposalId}:${x.expectedRevision ?? ''}`).join(','),
    [prevalidateItems],
  );

  const bulkPrevalidateQuery = useQuery({
    queryKey: ['admin-teaching-proposals-bulk-prevalidate', prevalidateKey],
    queryFn: () => prevalidateBulkApproveProposals({ items: prevalidateItems }),
    enabled: Boolean(bulkConfirmOpen && prevalidateItems.length > 0),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: 0,
  });

  const bulkApproveMutation = useMutation({
    mutationFn: ({ items }) => bulkApproveTeachingProposals({ items }),
    onSuccess: async (res) => {
      const approvedIds = res?.approvedProposalIds || [];
      const approvedCount = res?.approvedCount ?? approvedIds.length;
      setBulkConfirmOpen(false);
      setBulkServerConflict(null);
      setSelectionState((prev) => {
        const approvedSet = new Set(approvedIds);
        const remaining = (prev.ownerKey === authOwnerKey ? prev.ids : []).filter((id) => !approvedSet.has(id));
        return {
          ownerKey: authOwnerKey,
          enabled: remaining.length > 0,
          ids: remaining,
        };
      });
      if (selectedId && approvedIds.some((id) => Number(id) === Number(selectedId))) {
        setSelectedId(null);
        setReturnToBulkConfirm(false);
        clearProposalUrlParam();
      }
      notify.success(
        trf('Đã phê duyệt {0} đề xuất mở lớp.', { 0: approvedCount }),
        '',
        { key: 'admin-proposal-bulk-approve', replace: true },
      );
      await syncAfterReviewMutation(approvedIds);
    },
    onError: async (err) => {
      const conflictPayload = err?.data?.result || null;
      if (conflictPayload && Array.isArray(conflictPayload.results)) {
        setBulkServerConflict(conflictPayload);
      }
      const status = err?.response?.status ?? err?.status;
      const errMsg = status === 409
        ? tr('Một số đề xuất vừa được cập nhật từ thao tác khác. Vui lòng kiểm tra lại.')
        : describeApiError(err).message;
      notify.error(
        tr('Chưa thể phê duyệt hàng loạt đề xuất mở lớp'),
        errMsg,
        { key: 'admin-proposal-bulk-approve-err', replace: true },
      );
      await syncAfterReviewMutation(selectedIds);
      if (status === 409) {
        bulkPrevalidateQuery.refetch();
      }
    },
    onSettled: () => {
      bulkSubmitLockRef.current = false;
    },
  });

  const handleConfirmBulkApprove = useCallback(() => {
    if (bulkSubmitLockRef.current || bulkApproveMutation.isPending) return;
    const prevalidated = bulkPrevalidateQuery.data;
    if (!prevalidated || !prevalidated.allEligible || selectedIds.length === 0) return;

    const liveRevMap = new Map(
      (prevalidated.results || [])
        .filter((r) => r.currentRevision != null)
        .map((r) => [r.proposalId, r.currentRevision]),
    );
    const previewTokenMap = new Map(
      (prevalidated.results || [])
        .filter((r) => r.schedulePreviewToken)
        .map((r) => [r.proposalId, r.schedulePreviewToken]),
    );
    const items = buildBulkApproveItems(filteredRows, selectedIds, liveRevMap, previewTokenMap);
    if (items.length === 0) return;

    bulkSubmitLockRef.current = true;
    setBulkServerConflict(null);
    bulkApproveMutation.mutate({ items });
  }, [bulkApproveMutation, bulkPrevalidateQuery.data, filteredRows, selectedIds]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    if (selectedIds.length > 0) clearSelection();
  };
  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    if (selectedIds.length > 0) clearSelection();
  };
  const handleJlptFilterChange = (val) => {
    setJlptFilter(val);
    if (selectedIds.length > 0) clearSelection();
  };
  const handleMentorFilterChange = (val) => {
    setMentorFilter(val);
    if (selectedIds.length > 0) clearSelection();
  };
  const handleResetFilters = () => {
    setSearch('');
    setJlptFilter('ALL');
    setMentorFilter('ALL');
    setStatusFilter('PendingReview');
    if (selectedIds.length > 0) clearSelection();
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision, reasonText, expectedRevision, expectedSchedulePreviewToken }) =>
      reviewAdminTeachingProposal(id, {
        decision,
        reason: reasonText || null,
        expectedRevision,
        expectedSchedulePreviewToken: expectedSchedulePreviewToken || null,
      }),
    onSuccess: async (updated, vars) => {
      setDecisionModal(null);
      setReason('');
      setReasonError('');
      const toastTitle = vars.decision === 'Approve'
        ? tr('Đã phê duyệt đề xuất mở lớp.')
        : vars.decision === 'RequestChanges'
          ? tr('Đã gửi yêu cầu bổ sung.')
          : tr('Đã từ chối đề xuất mở lớp.');
      notify.success(toastTitle, '', {
        key: `admin-proposal-review-${vars.id}-${vars.decision}`,
        replace: true,
      });
      setSelectedId(null);
      setReturnToBulkConfirm(false);
      setDocPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      clearProposalUrlParam();
      await syncAfterReviewMutation(vars.id);
    },
    onError: async (err, vars) => {
      const errCode = err?.response?.data?.code || err?.data?.code || err?.code;
      const status = err?.response?.status ?? err?.status;
      const errMsg = (status === 409 || errCode === 'SCHEDULE_PREVIEW_STALE')
        ? tr('Lịch dự kiến đã thay đổi do có lịch mới hoặc chính sách vừa cập nhật. Đang tải lại lịch dự kiến mới nhất.')
        : describeApiError(err).message;
      notify.error(
        tr('Chưa xử lý được đề xuất mở lớp'),
        errMsg,
        { key: `admin-proposal-review-err-${vars?.id || 'x'}`, replace: true },
      );
      // Refresh authoritative state on conflict/stale revision so UI never stays out of sync
      if (vars?.id) {
        await syncAfterReviewMutation(vars.id);
        if (decisionModal?.decision === 'Approve') {
          liveApproveQuery.refetch();
        }
      }
    },
  });

  const openDecisionModal = (decision, proposal) => {
    if (!proposal || proposal.status !== 'PendingReview' || reviewMutation.isPending) return;
    setReason('');
    setReasonError('');
    setDecisionModal({ decision, proposal });
  };

  const liveApproveProposal = decisionModal?.decision === 'Approve' ? liveApproveQuery.data : null;
  const approveChecking = Boolean(decisionModal?.decision === 'Approve' && (liveApproveQuery.isLoading || liveApproveQuery.isFetching));
  const approveCheckFailed = Boolean(decisionModal?.decision === 'Approve' && liveApproveQuery.isError);
  const approveBlockingIssues = useMemo(() => {
    if (decisionModal?.decision !== 'Approve' || !liveApproveProposal) return [];
    const issues = [];
    if (liveApproveProposal.status !== 'PendingReview') {
      issues.push({
        code: 'PROPOSAL_NOT_PENDING',
        message: tr('Đề xuất này không còn ở trạng thái Chờ duyệt.'),
      });
    }
    if (liveApproveProposal.hasConflicts) {
      const serverIssues = (liveApproveProposal.validationIssues || []).filter((i) => !i.severity || i.severity === 'Error');
      if (serverIssues.length > 0) {
        issues.push(...serverIssues);
      }
    }
    return issues;
  }, [decisionModal?.decision, liveApproveProposal, tr]);

  const canConfirmDecision = decisionModal?.decision === 'Approve'
    ? Boolean(
      !reviewMutation.isPending
      && !approveChecking
      && !approveCheckFailed
      && liveApproveProposal
      && approveBlockingIssues.length === 0
    )
    : !reviewMutation.isPending;

  const submitDecision = (e) => {
    e?.preventDefault?.();
    if (!decisionModal || reviewMutation.isPending) return;
    const { decision, proposal } = decisionModal;
    const trimmed = reason.trim();

    if (decision === 'Approve') {
      if (!canConfirmDecision || !liveApproveProposal) return;
      reviewMutation.mutate({
        id: liveApproveProposal.id,
        decision: 'Approve',
        expectedRevision: liveApproveProposal.revision,
        expectedSchedulePreviewToken: liveApproveProposal?.approvalSchedulePreview?.schedulePreviewToken || null,
      });
      return;
    }

    if (!trimmed) {
      setReasonError(tr('Vui lòng nhập lý do rõ ràng để giáo viên điều chỉnh lại đề xuất.'));
      return;
    }
    setReasonError('');
    const authoritativeRevision = (detailQuery.data?.id === proposal.id ? detailQuery.data.revision : null)
      ?? proposal.revision;
    reviewMutation.mutate({
      id: proposal.id,
      decision,
      reasonText: trimmed,
      expectedRevision: authoritativeRevision,
    });
  };

  const hasFilters = search.trim() !== ''
    || mentorFilter !== 'ALL'
    || jlptFilter !== 'ALL'
    || statusFilter !== 'PendingReview';

  const resetPageKey = `${statusFilter}|${jlptFilter}|${mentorFilter}|${search.trim()}`;

  const selectionColumn = {
    key: '__select',
    align: 'center',
    headerAlign: 'center',
    compact: true,
    sortable: false,
    header: ({ visibleRows }) => {
      const headerState = computeHeaderCheckboxState(visibleRows, selectedIds);
      return (
        <div className="inline-flex items-center justify-center">
          <Checkbox
            data-testid="bulk-select-all-checkbox"
            checked={headerState.checked}
            indeterminate={headerState.indeterminate}
            disabled={headerState.disabled || bulkApproveMutation.isPending}
            aria-label={tr('Chọn tất cả đề xuất đủ điều kiện trên trang hiện tại')}
            onChange={() => handleToggleSelectAllOnPage(visibleRows)}
          />
        </div>
      );
    },
    render: (row) => {
      const selectable = isProposalSelectableForBulkApprove(row);
      const checked = selectable && selectedIdSet.has(row.id);
      const disabledReason = tr('Đề xuất này không còn ở trạng thái Chờ duyệt');

      const checkboxNode = (
        <div
          className="inline-flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            data-testid={`bulk-select-row-${row.id}`}
            checked={checked}
            disabled={!selectable || bulkApproveMutation.isPending}
            aria-label={trf('Chọn đề xuất của {0}', { 0: row.mentorName || tr('Giáo viên') })}
            onChange={() => handleToggleRow(row)}
          />
        </div>
      );

      if (!selectable) {
        return <Tooltip content={disabledReason}>{checkboxNode}</Tooltip>;
      }
      return checkboxNode;
    },
  };

  const baseColumns = [
    {
      key: 'mentor',
      header: tr('Giáo viên'),
      align: 'left',
      sortValue: (row) => row.mentorName || '',
      render: (row) => (
        <span className="font-semibold text-rp-text">
          {row.mentorName || tr('Giáo viên')}
        </span>
      ),
    },
    {
      key: 'course',
      header: tr('Đề xuất mở lớp'),
      align: 'left',
      sortValue: (row) => resolveProposalTableTitle(row, trf).courseTitle || '',
      render: (row) => {
        const { courseTitle, showLevelBadge, levelCode } = resolveProposalTableTitle(row, trf);
        const approvedStart = (row.status === 'OpenedClass' || row.status === 'Approved') && row.expectedStartDate
          ? formatIsoDateDisplay(row.expectedStartDate)
          : null;
        return (
          <div className="max-w-[360px] space-y-0.5">
            <div className="flex items-center gap-1.5">
              {showLevelBadge && (
                <span className="shrink-0 text-[13px] font-semibold text-rp-text">{levelCode}</span>
              )}
              {showLevelBadge && <span aria-hidden="true" className="text-rp-text-muted">·</span>}
              <span title={courseTitle} className="truncate font-semibold text-rp-text">
                {courseTitle}
              </span>
            </div>
            {approvedStart && (
              <div className="text-[12.5px] tabular-nums text-rp-text-muted">
                {tr('Lịch học')}: {approvedStart}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'schedule',
      header: tr('Lịch giảng dạy'),
      align: 'left',
      sortValue: (row) => Number(row.weeklySessionCount || 0),
      render: (row) => {
        const patterns = sortWeeklySessions(row.weeklySessions || [], row.sessionDurationMinutes);
        const weeks = Math.max(1, Number(row.courseDurationWeeks || 1));
        const total = row.totalSessions || (patterns.length * weeks);
        return (
          <div className="text-[13px] font-semibold tabular-nums text-rp-text">
            {trf('{0} buổi/tuần · {1} tuần ({2} buổi)', {
              0: row.weeklySessionCount || patterns.length,
              1: weeks,
              2: total,
            })}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      compact: true,
      sortValue: (row) => row.status || '',
      render: (row) => {
        const meta = PROPOSAL_STATUS_META[row.status] || PROPOSAL_STATUS_META.PendingReview;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap ${
              meta.pillClass || 'border-rp-line bg-rp-bg-2 text-rp-text-2'
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} />
            {tr(meta.label)}
          </span>
        );
      },
    },
  ];

  const columns = selectionMode ? [selectionColumn, ...baseColumns] : baseColumns;

  const detail = detailQuery.data;
  const detailOccurrences = useMemo(() => {
    const raw = detail?.status === 'OpenedClass' ? detail?.occurrencesPreview : null;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return [...raw].sort((a, b) => Number(a.sessionNumber || 0) - Number(b.sessionNumber || 0));
  }, [detail?.occurrencesPreview, detail?.status]);

  const detailTitleInfo = detail ? resolveProposalTableTitle(detail, trf) : null;
  const drawerStatusMeta = detail
    ? (PROPOSAL_STATUS_META[detail.status] || PROPOSAL_STATUS_META.PendingReview)
    : null;
  const drawerDescription = detail
    ? [
      detail.mentorName,
      detail.jlptLevelCode ? formatJlptLevel(detail.jlptLevelCode) : null,
      detail.submittedAtUtc ? `${tr('Gửi lúc')}: ${formatVnDateTime(detail.submittedAtUtc, '—')}` : null,
    ].filter(Boolean).join(' · ')
    : '';
  const drawerCanApprove = Boolean(
    detail
    && detail.status === 'PendingReview'
    && !detailQuery.isFetching
    && !detailQuery.isError
    && !reviewMutation.isPending
  );

  const detailDurationSummary = detail
    ? (detail.status === 'OpenedClass' && detail.expectedStartDate)
      ? formatProposalCourseDuration({
        expectedStartDate: detail.expectedStartDate,
        projectedEndDate: detail.projectedEndDate,
        occurrences: detailOccurrences,
        totalSessions: detail.totalSessions,
        trf,
      })
      : trf('{0} tuần · {1} buổi (mở tuyển sinh do giáo viên quyết định)', {
        0: Math.max(1, Number(detail.courseDurationWeeks || 1)),
        1: detail.totalSessions || 0,
      })
    : '—';

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {(toolbarTabs || hasAnyProposals) && (
        <AdminToolbar
          tabs={toolbarTabs}
          rightClassName={toolbarTabs ? 'lg:flex-1 lg:justify-end' : 'w-full justify-between'}
          refresh={{
            when: hasAnyProposals,
            onRefresh: () => proposalsQuery.refetch({ cancelRefetch: true }),
            refreshing: proposalsQuery.isFetching && !proposalsQuery.isPending,
          }}
          actions={
            hasEligibleInFiltered ? (
              <Button
                type="button"
                size="sm"
                variant={selectionMode ? 'secondary' : 'outline'}
                data-testid="toggle-bulk-selection-mode-btn"
                icon={selectionMode ? X : ListChecks}
                disabled={bulkApproveMutation.isPending}
                onClick={toggleSelectionMode}
              >
                {selectionMode ? tr('Thoát chế độ chọn') : tr('Chọn hàng loạt')}
              </Button>
            ) : null
          }
        >
          {hasAnyProposals && (
            <>
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                onClear={() => {
                  setSearch('');
                  if (selectedIds.length > 0) clearSelection();
                }}
                placeholder="Tìm giáo viên, tên lớp, JLPT…"
                aria-label={tr('Tìm đề xuất mở lớp')}
                className="w-full min-w-[200px] flex-1 sm:max-w-[360px]"
              />

              <CustomSelect
                fitContent
                value={statusFilter}
                aria-label={tr('Trạng thái')}
                onChange={handleStatusFilterChange}
                options={STATUS_FILTER_OPTIONS.map((o) => ({
                  value: o.value,
                  label: tr(o.label),
                  dotClass: o.dotClass,
                  count: statusCounts[o.value] ?? 0,
                }))}
              />

              <CustomSelect
                fitContent
                value={jlptFilter}
                aria-label={tr('Cấp độ')}
                onChange={handleJlptFilterChange}
                options={JLPT_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
              />

              <CustomSelect
                fitContent
                value={mentorFilter}
                aria-label={tr('Giáo viên')}
                onChange={handleMentorFilterChange}
                options={[{ value: 'ALL', label: tr('Tất cả') }, ...mentorOptions]}
              />

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={handleResetFilters}
                >
                  {tr('Đặt lại')}
                </Button>
              )}
            </>
          )}
        </AdminToolbar>
      )}

      {proposalsQuery.isLoading ? (
        <SakuraLoader variant="section" context="cohort" delay={120} />
      ) : proposalsQuery.error ? (
        <ContextualErrorState
          error={proposalsQuery.error}
          title={tr('Chưa tải được danh sách đề xuất mở lớp')}
          onRetry={() => proposalsQuery.refetch()}
        />
      ) : !hasAnyProposals ? (
        <ContextualEmptyState
          variant="compact"
          illustration="appointment"
          title={tr('Chưa có đề xuất mở lớp nào cần duyệt')}
          description={tr('Các đề xuất mở lớp nhóm JLPT do giáo viên gửi lên sẽ hiển thị tại đây.')}
        />
      ) : filteredRows.length === 0 ? (
        <ContextualEmptyState
          variant="search"
          illustration="search"
          title={tr('Không có đề xuất nào khớp bộ lọc')}
          description={
            statusFilter === 'PendingReview' && !search.trim() && mentorFilter === 'ALL' && jlptFilter === 'ALL'
              ? tr('Hiện không có đề xuất đang chờ duyệt. Chọn Tất cả để xem lịch sử đã xử lý.')
              : tr('Thử thay đổi trạng thái, cấp độ JLPT, giáo viên hoặc xóa từ khóa tìm kiếm.')
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setJlptFilter('ALL');
                setMentorFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              {tr(
                statusFilter !== 'ALL' && !search.trim() && mentorFilter === 'ALL' && jlptFilter === 'ALL'
                  ? 'Xem tất cả trạng thái'
                  : 'Xóa bộ lọc'
              )}
            </Button>
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filteredRows}
          rowKey={(r) => r.id}
          fillHeight={fillHeight}
          itemLabel="đề xuất"
          resetPageKey={resetPageKey}
          onViewChange={() => {
            if (selectedIds.length > 0) clearSelection();
          }}
          rowClassName={(row) => (selectionMode && selectedIdSet.has(row.id) ? 'bg-rp-brand-tint/35' : undefined)}
          beforeTable={({ visibleRows }) => {
            const pageHeaderState = computeHeaderCheckboxState(visibleRows, selectedIds);
            const selectedCount = pageHeaderState.selectedCount;
            const eligibleOnPageCount = pageHeaderState.eligibleCount;
            const canOpenBulkApprove = selectedCount > 0 && !bulkApproveMutation.isPending;

            return (
              <div
                className="rp-collapsible"
                data-open={selectionMode ? 'true' : 'false'}
                aria-hidden={!selectionMode || undefined}
              >
                <div className="rp-collapsible-inner" inert={!selectionMode ? '' : undefined}>
                  {selectionMode && (
                    <div
                      data-testid="bulk-action-bar"
                      className="flex flex-wrap items-center justify-between gap-3 rounded-rp-card border border-rp-brand-border/75 bg-rp-surface px-4 py-2.5 shadow-rp-xs"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          data-testid="bulk-selected-count"
                          className="text-sm font-semibold tabular-nums text-rp-text"
                        >
                          {trf('Đã chọn {0}/{1} đề xuất', { 0: selectedCount, 1: eligibleOnPageCount })}
                        </span>

                        <button
                          type="button"
                          data-testid="bulk-clear-selection-btn"
                          disabled={selectedCount === 0 || bulkApproveMutation.isPending}
                          onClick={clearSelection}
                          className="rp-focus rp-link text-xs font-semibold text-rp-brand-strong transition-colors hover:text-rp-brand-pressed disabled:cursor-not-allowed disabled:text-rp-text-muted disabled:opacity-55"
                        >
                          {tr('Bỏ chọn tất cả')}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          icon={Check}
                          data-testid="bulk-approve-trigger-btn"
                          disabled={!canOpenBulkApprove}
                          onClick={() => {
                            if (!canOpenBulkApprove) return;
                            setBulkServerConflict(null);
                            setBulkConfirmOpen(true);
                          }}
                        >
                          {trf('Phê duyệt ({0})', { 0: selectedCount })}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
          rowActions={(row) => {
            const isActionable = row.status === 'PendingReview';
            return (
              <AdminRowActions>
                <AdminIconAction
                  icon={Eye}
                  tone="neutral"
                  tooltip={tr('Xem chi tiết')}
                  data-testid={`proposal-action-view-${row.id}`}
                  onClick={() => setSelectedId(row.id)}
                />

                {!selectionMode && isActionable && (
                  <>
                    <AdminIconAction
                      icon={Check}
                      tone="brand"
                      tooltip={tr('Phê duyệt đề xuất')}
                      data-testid={`proposal-action-approve-${row.id}`}
                      disabled={reviewMutation.isPending}
                      onClick={() => openDecisionModal('Approve', row)}
                    />

                    <AdminIconAction
                      icon={X}
                      tone="danger"
                      tooltip={tr('Từ chối đề xuất')}
                      data-testid={`proposal-action-reject-${row.id}`}
                      disabled={reviewMutation.isPending}
                      onClick={() => openDecisionModal('Reject', row)}
                    />
                  </>
                )}
              </AdminRowActions>
            );
          }}
        />
      )}

      {/* Proposal Details Drawer — Compact Right Panel (Fixed Header + Status Badge beside Title + Fixed Actions + Single Scrollable Body) */}
      <SideDrawer
        open={Boolean(selectedId)}
        onClose={closeDetailDrawer}
        title={tr('Chi tiết đề xuất mở lớp')}
        description={drawerDescription}
        width="w-[min(580px,100vw)]"
      >
        {({ titleId, descId }) => (
          <>
            {/* Sticky/Fixed Top Header with Status Badge right beside Title */}
            <DrawerHeader
              title={tr('Chi tiết đề xuất mở lớp')}
              titleBadge={drawerStatusMeta ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span
                    data-testid="proposal-drawer-status-badge"
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${
                      drawerStatusMeta.pillClass || 'border-rp-line bg-rp-bg-2 text-rp-text-2'
                    }`}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: drawerStatusMeta.dot }}
                    />
                    {tr(drawerStatusMeta.label)}
                  </span>
                  {detail?.status === 'PendingReview' && (detail?.history || []).some((h) => h.action === 'Resubmitted') && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                      {tr('Đã bổ sung')}
                    </span>
                  )}
                </span>
              ) : null}
              description={drawerDescription ? <span className="tabular-nums">{drawerDescription}</span> : null}
              onClose={closeDetailDrawer}
              titleId={titleId}
              descId={descId}
            />

            {/* Sticky/Fixed Compact Action Bar (Left-aligned like Reference Form) */}
            {detail && (detail.status === 'PendingReview' || detail.status === 'Approved') && (
              <div
                data-testid="proposal-drawer-sticky-actions"
                className="flex shrink-0 flex-wrap items-center gap-2 border-b border-rp-line bg-[#FAF8F9] px-5 py-2.5"
              >
                {detail.status === 'PendingReview' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      icon={Check}
                      data-testid="drawer-action-approve"
                      disabled={!drawerCanApprove}
                      onClick={() => openDecisionModal('Approve', detail)}
                    >
                      {tr('Phê duyệt')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="drawer-action-request-changes"
                      icon={MessageSquareWarning}
                      disabled={reviewMutation.isPending}
                      onClick={() => openDecisionModal('RequestChanges', detail)}
                    >
                      {tr('Yêu cầu bổ sung')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      data-testid="drawer-action-reject"
                      icon={X}
                      disabled={reviewMutation.isPending}
                      onClick={() => openDecisionModal('Reject', detail)}
                    >
                      {tr('Từ chối')}
                    </Button>
                  </>
                )}

                {(detail.status === 'OpenedClass' || detail.status === 'Approved') && detail.linkedCohortId && (
                  <Link
                    to={`/admin/study-courses/?cohortId=${detail.linkedCohortId}`}
                    className="inline-flex h-8.5 items-center gap-1 rounded-xl bg-rp-brand-pressed px-3 text-xs font-semibold text-white transition-colors hover:bg-rp-brand-strong"
                  >
                    <span>{tr('Xem lớp trong Lớp học & ghi danh')}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}

            {/* Single Scrollable Drawer Content Area */}
            <DrawerBody className="bg-[#FAF9FB]/60 px-4 py-3.5">
              {detailQuery.isLoading && !detail ? (
                <SakuraLoader variant="section" delay={100} />
              ) : detailQuery.error ? (
                <ContextualErrorState
                  error={detailQuery.error}
                  title={tr('Chưa tải được chi tiết đề xuất')}
                  onRetry={() => detailQuery.refetch()}
                />
              ) : detail ? (
                <div className="space-y-3 text-sm">
                  {/* Blocking Validation Issues ONLY */}
                  {detail.status === 'PendingReview' && detail.hasConflicts && (
                    <Banner
                      tone="danger"
                      icon={AlertTriangle}
                      title={tr('Không đủ điều kiện phê duyệt — phát hiện xung đột / vi phạm quy định')}
                    >
                      <ul className="m-0 list-disc space-y-1 pl-4 text-xs">
                        {(detail.validationIssues || []).map((iss, idx) => (
                          <li key={`${iss.code}-${idx}`}>{iss.message}</li>
                        ))}
                      </ul>
                    </Banner>
                  )}

                  {detail.status === 'PendingReview' && (detail.history || []).some((h) => h.action === 'Resubmitted') && (() => {
                    const lastRequest = [...(detail.history || [])]
                      .reverse()
                      .find((h) => h.action === 'ChangesRequested' && h.reason);
                    return (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-[13px] leading-5 text-emerald-950">
                        <p className="m-0 font-semibold text-emerald-900">
                          {tr('Giáo viên đã bổ sung và gửi lại xét duyệt')}
                        </p>
                        {lastRequest?.reason && (
                          <p className="m-0 mt-1 text-emerald-900/90">
                            <span className="font-semibold">{tr('Yêu cầu bổ sung trước đó')}: </span>
                            {lastRequest.reason}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {detail.reviewReason && (detail.status === 'Rejected' || detail.status === 'ChangesRequested') && (
                    <Banner
                      tone={detail.status === 'Rejected' ? 'danger' : 'warning'}
                      title={detail.status === 'Rejected' ? tr('Lý do từ chối') : tr('Nội dung yêu cầu bổ sung')}
                    >
                      {detail.reviewReason}
                    </Banner>
                  )}

                  {/* Mentor Professional Profile — Compact Form Layout (all info preserved) */}
                  <Card className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
                      <h3 className="m-0 flex items-center gap-1.5 text-[14px] font-semibold leading-5 text-rp-text">
                        <Award className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
                        <span>{tr('Hồ sơ chuyên môn giáo viên')}</span>
                      </h3>
                      {!detail.mentorVerified && (
                        <Badge tone="warning" size="sm" icon={false}>
                          {detail.mentorVerificationStatus || tr('Chưa xác minh hồ sơ')}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-[22px] sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Giáo viên')}:</span>{' '}
                        <span className="text-rp-text-2">{detail.mentorName || tr('Không có')}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-rp-text">{tr('Email')}:</span>{' '}
                        <span className="break-all text-rp-text-2">{detail.mentorEmail || tr('Không có')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Trình độ JLPT')}:</span>{' '}
                        <span className="font-medium text-rp-text">{detail.mentorJlptLevel || tr('Không có')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Kinh nghiệm giảng dạy')}:</span>{' '}
                        <span className="text-rp-text-2">
                          {detail.mentorYearsOfExperience != null
                            ? trf('{0} năm', { 0: detail.mentorYearsOfExperience })
                            : tr('Không có')}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-rp-text">{tr('Chuyên môn')}:</span>{' '}
                        <span className={detail.mentorExpertise ? 'text-rp-text-2' : 'text-rp-text-muted'}>
                          {detail.mentorExpertise || tr('Không có')}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-rp-text">{tr('Nơi công tác')}:</span>{' '}
                        <span className={detail.mentorWorkplace ? 'text-rp-text-2' : 'text-rp-text-muted'}>
                          {detail.mentorWorkplace || tr('Không có')}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-rp-line/70 pt-2.5 text-[14px] leading-[22px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-rp-text">{tr('Chứng chỉ & tài liệu hồ sơ')}:</span>
                        {detail.mentorHasVerificationDocument ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            icon={FileText}
                            loading={docMutation.isPending}
                            onClick={() => docMutation.mutate(detail.mentorId)}
                          >
                            {docPreview?.mentorId === detail.mentorId
                              ? tr('Tải lại chứng chỉ hồ sơ')
                              : tr('Xem chứng chỉ hồ sơ')}
                          </Button>
                        ) : (
                          <span className="text-rp-text-muted">{tr('Không có')}</span>
                        )}
                        {docPreview?.mentorId === detail.mentorId && docPreview.url && (
                          <a
                            href={docPreview.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rp-link text-[13px] font-medium text-rp-brand"
                          >
                            {tr('Mở chứng chỉ ở tab mới')}
                          </a>
                        )}
                      </div>
                    </div>

                    {docPreview?.mentorId === detail.mentorId && docPreview.url && (
                      <div className="overflow-hidden rounded-xl border border-rp-line bg-white">
                        {docPreview.isPdf ? (
                          <iframe
                            title={tr('Chứng chỉ giáo viên')}
                            src={docPreview.url}
                            className="h-64 w-full border-0"
                          />
                        ) : (
                          <img
                            src={docPreview.url}
                            alt={tr('Chứng chỉ giáo viên')}
                            className="max-h-64 w-full object-contain"
                          />
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Proposed Course Information — Compact Inline Form Layout (all info preserved) */}
                  <Card className="space-y-3 p-4">
                    <h3 className="m-0 flex items-center gap-1.5 pb-0.5 text-[14px] font-semibold leading-5 text-rp-text">
                      <BookOpen className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
                      <span>{tr('Thông tin khóa học đề xuất')}</span>
                    </h3>
                    <div className="space-y-2 text-[14px] leading-[22px]">
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Trình độ JLPT')}:</span>{' '}
                        <span className="font-medium text-rp-text">{detail.jlptLevelCode || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Tên lớp')}:</span>{' '}
                        <span className="text-rp-text-2">{detailTitleInfo?.courseTitle || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Thời gian khóa học')}:</span>{' '}
                        <span className="tabular-nums text-rp-text-2">{detailDurationSummary}</span>
                      </div>
                      {Number(detail.totalCourseTuition) > 0 && (
                        <div>
                          <span className="font-semibold text-rp-text">{tr('Học phí trọn khóa')}:</span>{' '}
                          <span className="font-semibold tabular-nums text-rp-brand-strong">
                            {formatTuitionVnd(detail.totalCourseTuition)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Mục tiêu khóa học')}:</span>{' '}
                        <span className={detail.courseObjective?.trim() ? 'text-rp-text-2' : 'text-rp-text-muted'}>
                          {detail.courseObjective?.trim() || tr('Không có')}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-rp-text">{tr('Ghi chú')}:</span>{' '}
                        <span className={detail.optionalNotes?.trim() ? 'text-rp-text-2' : 'text-rp-text-muted'}>
                          {detail.optionalNotes?.trim() || tr('Không có')}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="font-semibold text-rp-text">{tr('Tài liệu đính kèm')}:</span>
                        {(!detail.optionalAttachments || detail.optionalAttachments.length === 0) ? (
                          <span className="ml-1.5 text-rp-text-muted">{tr('Không có')}</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {detail.optionalAttachments.map((a, idx) => (
                              <AttachmentItemRow
                                key={`${a.storedFileName || a.name}-${idx}`}
                                name={a.name}
                                contentType={a.contentType}
                                storedFileName={a.storedFileName}
                                sizeBytes={a.sizeBytes}
                                viewing={attachmentPreview.busyKey === `${detail.id}:${idx}:view`}
                                downloading={attachmentPreview.busyKey === `${detail.id}:${idx}:dl`}
                                disabled={Boolean(attachmentPreview.busyKey)}
                                onView={() => handleViewProposalAttachment(detail.id, a, idx)}
                                onDownload={() => handleDownloadProposalAttachment(detail.id, a, idx)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {detail.status === 'Approved' && !detail.linkedCohortId && (
                    <Banner tone="info">
                      {tr('Đề xuất đã được duyệt và đang chờ Giáo viên chọn hạn tuyển sinh để mở lớp chính thức.')}
                    </Banner>
                  )}

                  {/* Unified Weekly + Detailed Schedule */}
                  <ProposalDetailedScheduleCard
                    weeklySessions={detail.weeklySessions || []}
                    showWeeklyPatterns
                    occurrences={detailOccurrences}
                    projected={detail.status !== 'OpenedClass'}
                    durationWeeks={Math.max(1, Number(detail.courseDurationWeeks || 1))}
                    initialVisibleCount={6}
                    columns="responsive-2"
                    resetKey={`admin-proposal-${detail.id}-${detail.revision ?? 0}`}
                  />
                </div>
              ) : null}
            </DrawerBody>
          </>
        )}
      </SideDrawer>

      {/* Shared Approval / Request Changes / Rejection Confirmation Modal */}
      <Modal
        open={Boolean(decisionModal)}
        onClose={() => !reviewMutation.isPending && setDecisionModal(null)}
        title={
          decisionModal?.decision === 'Approve' ? (
            <span className="text-[17.5px] font-bold leading-6 text-rp-text">
              {tr('Xác nhận phê duyệt đề xuất mở lớp')}
            </span>
          ) : decisionModal?.decision === 'RequestChanges' ? (
            tr('Yêu cầu bổ sung thông tin đề xuất')
          ) : (
            tr('Từ chối đề xuất mở lớp')
          )
        }
        description={
          decisionModal?.decision === 'Approve'
            ? tr('Sau khi phê duyệt, Giáo viên có thể chủ động chọn hạn tuyển sinh để mở lớp.')
            : decisionModal?.decision === 'RequestChanges'
              ? tr('Đề xuất sẽ trả về trạng thái Cần bổ sung kèm góp ý để Giáo viên cập nhật.')
              : tr('Đề xuất sẽ bị từ chối và không thể mở lớp từ bản đăng ký này.')
        }
        size={decisionModal?.decision === 'Approve' ? 'lg' : 'md'}
        className={decisionModal?.decision === 'Approve' ? 'sm:max-w-[560px]' : undefined}
        footer={
          <div className="flex justify-end gap-2">
            {decisionModal?.decision === 'Approve' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="neutral"
                  className="h-9 rounded-xl px-3.5 text-[13px]"
                  disabled={reviewMutation.isPending}
                  onClick={() => setDecisionModal(null)}
                >
                  {tr('Hủy')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="confirm"
                  icon={Check}
                  className="h-9 rounded-xl px-3.5 text-[13px]"
                  data-testid="confirm-approve-proposal-btn"
                  loading={reviewMutation.isPending}
                  disabled={!canConfirmDecision}
                  onClick={submitDecision}
                >
                  {reviewMutation.isPending ? tr('Đang phê duyệt…') : tr('Xác nhận phê duyệt')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="md"
                  variant="neutral"
                  disabled={reviewMutation.isPending}
                  onClick={() => setDecisionModal(null)}
                >
                  {tr('Hủy')}
                </Button>
                <Button
                  type="button"
                  size="md"
                  data-testid="confirm-decision-submit-btn"
                  variant={decisionModal?.decision === 'Reject' ? 'danger' : 'warning'}
                  loading={reviewMutation.isPending}
                  onClick={submitDecision}
                >
                  {decisionModal?.decision === 'Reject' ? tr('Xác nhận từ chối') : tr('Gửi yêu cầu bổ sung')}
                </Button>
              </>
            )}
          </div>
        }
      >
        <form onSubmit={submitDecision} className="space-y-4">
          {decisionModal?.decision === 'Approve' ? (
            <>
              {!approveChecking && approveCheckFailed ? (
                <Banner
                  tone="danger"
                  icon={AlertTriangle}
                  title={tr('Chưa thể xác minh điều kiện phê duyệt từ máy chủ')}
                  actions={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={RotateCcw}
                      onClick={() => liveApproveQuery.refetch()}
                    >
                      {tr('Thử kiểm tra lại')}
                    </Button>
                  }
                >
                  {tr('Không thể phê duyệt khi chưa đối chiếu được dữ liệu mới nhất. Vui lòng thử lại.')}
                </Banner>
              ) : !approveChecking && approveBlockingIssues.length > 0 ? (
                <Banner
                  tone="danger"
                  icon={AlertTriangle}
                  title={tr('Đề xuất không đủ điều kiện phê duyệt')}
                >
                  <ul className="m-0 list-disc space-y-1 pl-4 text-sm">
                    {approveBlockingIssues.map((iss, idx) => (
                      <li key={`${iss.code}-${idx}`}>{iss.message}</li>
                    ))}
                  </ul>
                </Banner>
              ) : (() => {
                const previewProposal = liveApproveProposal || decisionModal?.proposal;
                const schedulePreview = previewProposal?.approvalSchedulePreview || null;
                if (!previewProposal) return null;

                const { courseTitle, showLevelBadge, levelCode } = resolveProposalTableTitle(previewProposal, trf);
                const weeksCount = Number(schedulePreview?.courseDurationWeeks ?? previewProposal?.courseDurationWeeks ?? 0);
                const sessionsCount = Number(schedulePreview?.totalSessions ?? previewProposal?.totalSessions ?? 0);
                const maxLearnersCount = Number(schedulePreview?.maxLearners ?? previewProposal?.maxLearners ?? 0);
                const tuitionAmount = schedulePreview?.totalCourseTuition ?? previewProposal?.totalCourseTuition ?? null;

                return (
                  <div className="flex flex-col gap-3.5">
                    {/* Header: Class Icon + Class Name + Mentor Name */}
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rp-brand-border/80 bg-rp-brand-tint text-rp-brand-strong"
                      >
                        <GraduationCap className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 text-[15.5px] font-semibold leading-5 text-rp-text">
                            {courseTitle}
                          </h3>
                          {showLevelBadge && (
                            <span className="text-[13.5px] font-semibold text-rp-text-2">
                              · {levelCode}
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-[13px] leading-[18px] text-rp-text-2">
                          {tr('Giáo viên')}:{' '}
                          <span className="font-medium text-rp-text">
                            {previewProposal.mentorName || tr('Giáo viên')}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Three Metric Boxes on One Row */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 px-3 py-2">
                        <p className="m-0 text-[13px] leading-[18px] text-rp-text-muted">{tr('Số tuần')}</p>
                        <p className="m-0 mt-0.5 text-[14px] font-semibold leading-5 tabular-nums text-rp-text">
                          {weeksCount > 0 ? trf('{0} tuần', { 0: weeksCount }) : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 px-3 py-2">
                        <p className="m-0 text-[13px] leading-[18px] text-rp-text-muted">{tr('Tổng số buổi')}</p>
                        <p className="m-0 mt-0.5 text-[14px] font-semibold leading-5 tabular-nums text-rp-text">
                          {sessionsCount > 0 ? trf('{0} buổi', { 0: sessionsCount }) : '—'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rp-line bg-rp-bg-2/50 px-3 py-2">
                        <p className="m-0 text-[13px] leading-[18px] text-rp-text-muted">{tr('Sĩ số tối đa')}</p>
                        <p className="m-0 mt-0.5 text-[14px] font-semibold leading-5 tabular-nums text-rp-text">
                          {maxLearnersCount > 0 ? trf('{0} học viên', { 0: maxLearnersCount }) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Dedicated Prominent Tuition Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-brand-border/75 bg-rp-brand-tint/45 px-3.5 py-2.5">
                      <div className="space-y-0.5">
                        <p className="m-0 text-[13.5px] font-semibold leading-5 text-rp-text">
                          {tr('Học phí trọn khóa')}
                        </p>
                        <p className="m-0 text-[13px] leading-[18px] text-rp-text-muted">
                          {tr('Tính trên mỗi học viên')}
                        </p>
                      </div>
                      <p className="m-0 text-[20px] font-semibold leading-6 tabular-nums text-rp-brand-strong">
                        {Number(tuitionAmount) > 0 ? formatTuitionVnd(tuitionAmount) : '—'}
                      </p>
                    </div>

                    {/* Single Concise Guidance Line */}
                    <p className="m-0 flex items-start gap-2 text-[13px] leading-[18px] text-rp-text-2">
                      <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                      <span>{tr('Phê duyệt chỉ xác nhận năng lực & mẫu lịch tuần. Giáo viên sẽ chủ động chọn hạn tuyển sinh để mở lớp sau khi được duyệt.')}</span>
                    </p>
                  </div>
                );
              })()}
            </>
          ) : (
            <Field
              label={
                decisionModal?.decision === 'RequestChanges'
                  ? tr('Nội dung yêu cầu bổ sung')
                  : tr('Lý do từ chối')
              }
              required
              error={reasonError}
            >
              <Textarea
                rows={4}
                maxLength={1500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError('');
                }}
                placeholder={tr('Nêu rõ nhận xét về hồ sơ chuyên môn, nội dung khóa học hoặc khung lịch để giáo viên điều chỉnh…')}
                invalid={Boolean(reasonError)}
              />
            </Field>
          )}
        </form>
      </Modal>

      {/* Bulk Approval Confirmation Modal */}
      <BulkApproveConfirmationModal
        open={bulkConfirmOpen && selectedProposals.length > 0}
        onClose={() => {
          if (bulkApproveMutation.isPending) return;
          setBulkConfirmOpen(false);
          setBulkServerConflict(null);
        }}
        selectedProposals={selectedProposals}
        prevalidationData={bulkPrevalidateQuery.data || null}
        prevalidating={bulkPrevalidateQuery.isLoading || bulkPrevalidateQuery.isFetching}
        prevalidationError={bulkPrevalidateQuery.error || null}
        onRetryPrevalidation={() => {
          setBulkServerConflict(null);
          bulkPrevalidateQuery.refetch();
        }}
        serverConflictResult={bulkServerConflict}
        submitting={bulkApproveMutation.isPending}
        onRemoveProposal={handleRemoveFromBulkConfirm}
        onRemoveInvalidProposals={handleRemoveInvalidFromBulkConfirm}
        onViewProposal={handleViewProposalFromBulk}
        onConfirm={handleConfirmBulkApprove}
      />

      <AttachmentPreviewModal
        open={attachmentPreview.modalOpen}
        onClose={attachmentPreview.closePreview}
        attachment={attachmentPreview.activeAttachment}
        loading={attachmentPreview.previewLoading}
        error={attachmentPreview.previewError}
        preview={attachmentPreview.previewData}
        onDownload={attachmentPreview.handleDownloadActive}
        downloading={Boolean(attachmentPreview.busyKey && attachmentPreview.busyKey.endsWith('-modal-dl'))}
      />
    </div>
  );
}
