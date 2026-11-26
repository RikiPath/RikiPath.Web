import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  Download,
  Eye,
  FileText,
  ListChecks,
  Loader2,
  MessageSquareWarning,
  RotateCcw,
  X,
} from 'lucide-react';
import {
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
  formatTimeRange,
  notify,
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
  getAdminTeachingProposal,
  getAdminTeachingProposals,
  prevalidateBulkApproveProposals,
  reviewAdminTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  formatAttachmentSize,
  getAttachmentIconComponent,
  isAttachmentInlinePreviewable,
  openOrDownloadBlob,
} from '@/features/scheduling/utils/attachmentHelpers.js';
import {
  formatTuitionVnd,
  PROPOSAL_STATUS_META,
  sortWeeklySessions,
  weekdayLabelVn,
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
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { useAuth } from '@/app/auth/authContext.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'ChangesRequested', label: 'Cần bổ sung' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Bị từ chối' },
];

const JLPT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả cấp độ' },
  { value: 'N5', label: 'JLPT N5' },
  { value: 'N4', label: 'JLPT N4' },
  { value: 'N3', label: 'JLPT N3' },
  { value: 'N2', label: 'JLPT N2' },
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authOwnerKey = user?.id ?? 'anon';

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
  const [bulkReason, setBulkReason] = useState('');
  const [bulkServerConflict, setBulkServerConflict] = useState(null);
  const bulkSubmitLockRef = useRef(false);

  const handleViewProposalFromBulk = useCallback((proposalId) => {
    if (!proposalId) return;
    setReturnToBulkConfirm(true);
    setBulkConfirmOpen(false);
    setSelectedId(proposalId);
  }, []);

  const closeDetailDrawer = useCallback(() => {
    setSelectedId(null);
    if (returnToBulkConfirm) {
      setReturnToBulkConfirm(false);
      setBulkConfirmOpen(true);
    }
  }, [returnToBulkConfirm]);

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

  const [loadingAttKey, setLoadingAttKey] = useState(null);
  const handleProposalAttachmentAction = useCallback(async (proposalId, att, idx, download = false) => {
    if (!proposalId || loadingAttKey) return;
    const key = `${proposalId}:${idx}:${download ? 'dl' : 'view'}`;
    setLoadingAttKey(key);
    try {
      const blob = await fetchAdminProposalAttachmentBlob(proposalId, idx, { download });
      openOrDownloadBlob(blob, att.name || 'tai-lieu-dinh-kem', {
        forceDownload: download,
        contentType: att.contentType,
      });
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể mở tài liệu đính kèm lúc này.'));
    } finally {
      setLoadingAttKey(null);
    }
  }, [loadingAttKey, tr]);

  useEffect(() => {
    if (!initialProposalId) return undefined;
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
    setBulkReason('');
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
    mutationFn: ({ items, reasonText }) =>
      bulkApproveTeachingProposals({ items, reason: reasonText || null }),
    onSuccess: async (res) => {
      const approvedIds = res?.approvedProposalIds || [];
      const approvedCount = res?.approvedCount ?? approvedIds.length;
      setBulkConfirmOpen(false);
      setBulkReason('');
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
      notify.success(
        trf('Đã phê duyệt {0} đề xuất mở lớp', { 0: approvedCount }),
        tr('Các lớp học đã được tự động tạo, mở tuyển sinh ngay và gửi thông báo tới giáo viên.'),
        { key: 'admin-proposal-bulk-approve', replace: true, duration: 5000 },
      );
      await syncAfterReviewMutation(approvedIds);
    },
    onError: async (err) => {
      const conflictPayload = err?.data?.result || null;
      if (conflictPayload && Array.isArray(conflictPayload.results)) {
        setBulkServerConflict(conflictPayload);
      }
      notify.error(
        tr('Chưa thể phê duyệt hàng loạt đề xuất mở lớp'),
        describeApiError(err).message,
        { key: 'admin-proposal-bulk-approve-err', replace: true },
      );
      await syncAfterReviewMutation(selectedIds);
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
    const items = buildBulkApproveItems(filteredRows, selectedIds, liveRevMap);
    if (items.length === 0) return;

    bulkSubmitLockRef.current = true;
    setBulkServerConflict(null);
    bulkApproveMutation.mutate({ items, reasonText: bulkReason.trim() });
  }, [bulkApproveMutation, bulkPrevalidateQuery.data, bulkReason, filteredRows, selectedIds]);

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
    mutationFn: ({ id, decision, reasonText, expectedRevision }) =>
      reviewAdminTeachingProposal(id, {
        decision,
        reason: reasonText || null,
        expectedRevision,
      }),
    onSuccess: async (updated, vars) => {
      setDecisionModal(null);
      setReason('');
      setReasonError('');
      const toastTitle = vars.decision === 'Approve'
        ? tr('Đã phê duyệt đề xuất mở lớp')
        : vars.decision === 'RequestChanges'
          ? tr('Đã gửi yêu cầu bổ sung')
          : tr('Đã từ chối đề xuất mở lớp');
      const toastDetail = vars.decision === 'Approve'
        ? tr('Lớp học đã được tự động tạo, mở tuyển sinh ngay và gửi thông báo tới giáo viên.')
        : vars.decision === 'RequestChanges'
          ? tr('Yêu cầu bổ sung kèm ghi chú đã được gửi tới Giáo viên.')
          : tr('Kết quả xét duyệt và lý do từ chối đã được gửi tới giáo viên.');
      notify.success(toastTitle, toastDetail, {
        key: `admin-proposal-review-${vars.id}-${vars.decision}`,
        replace: true,
        duration: 5000,
      });
      if (selectedId && updated?.id) {
        setSelectedId(updated.id);
      }
      await syncAfterReviewMutation(vars.id);
    },
    onError: async (err, vars) => {
      notify.error(
        tr('Chưa xử lý được đề xuất mở lớp'),
        describeApiError(err).message,
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
      } else {
        issues.push({
          code: 'PROPOSAL_APPROVAL_CONFLICT',
          message: tr('Phát hiện xung đột hoặc điều kiện không còn hợp lệ tại thời điểm duyệt.'),
        });
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
        reasonText: trimmed,
        expectedRevision: liveApproveProposal.revision,
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
    width: 'w-11',
    headerClassName: 'w-11',
    className: 'w-11',
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
      const disabledReason = row.status !== 'PendingReview'
        ? tr('Đề xuất này không còn ở trạng thái Chờ duyệt')
        : tr('Đề xuất đang có xung đột hoặc chưa đủ điều kiện phê duyệt');

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
      width: 'min-w-[160px]',
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
      width: 'min-w-[220px]',
      sortValue: (row) => row.expectedStartDate || '',
      render: (row) => {
        const { courseTitle, showLevelBadge, levelCode } = resolveProposalTableTitle(row, trf);
        const startDisplay = row.expectedStartDate ? formatIsoDateDisplay(row.expectedStartDate) : '—';
        return (
          <div className="max-w-[340px] space-y-0.5">
            <div className="flex items-center gap-1.5">
              {showLevelBadge && (
                <Badge tone="brand" size="sm" icon={false}>{levelCode}</Badge>
              )}
              <span title={courseTitle} className="truncate font-semibold text-rp-text">
                {courseTitle}
              </span>
            </div>
            <div className="text-[11.5px] tabular-nums text-rp-text-muted">
              {tr('Bắt đầu')}: {startDisplay}
            </div>
          </div>
        );
      },
    },
    {
      key: 'schedule',
      header: tr('Lịch giảng dạy'),
      align: 'left',
      width: 'min-w-[290px]',
      sortValue: (row) => Number(row.weeklySessionCount || 0),
      render: (row) => {
        const patterns = sortWeeklySessions(row.weeklySessions || [], row.sessionDurationMinutes);
        const total = row.totalSessions || (patterns.length * (row.courseDurationWeeks || 10));
        return (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold tabular-nums text-rp-text">
              {trf('{0} buổi/tuần ({1} buổi)', { 0: row.weeklySessionCount || patterns.length, 1: total })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patterns.slice(0, 4).map((s) => (
                <span
                  key={s.key}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-rp-text-2 whitespace-nowrap"
                >
                  <span>{tr(weekdayLabelVn(s.weekday))}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatTimeRange(s.startClock, s.endClock)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
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
  const rawDetailOccurrences = detail?.occurrencesPreview;
  const detailOccurrences = useMemo(() => {
    if (!Array.isArray(rawDetailOccurrences) || rawDetailOccurrences.length === 0) return [];
    return [...rawDetailOccurrences].sort((a, b) => Number(a.sessionNumber || 0) - Number(b.sessionNumber || 0));
  }, [rawDetailOccurrences]);

  const detailTitleInfo = detail ? resolveProposalTableTitle(detail, trf) : null;
  const drawerStatusMeta = detail
    ? (PROPOSAL_STATUS_META[detail.status] || PROPOSAL_STATUS_META.PendingReview)
    : null;
  const drawerDescription = detail
    ? [
      detail.mentorName,
      detail.jlptLevelCode ? `JLPT ${detail.jlptLevelCode}` : null,
      detail.submittedAtUtc ? `${tr('Gửi lúc')}: ${formatVnDateTime(detail.submittedAtUtc, '—')}` : null,
    ].filter(Boolean).join(' · ')
    : '';
  const drawerCanApprove = Boolean(
    detail
    && detail.status === 'PendingReview'
    && !detail.hasConflicts
    && !detailQuery.isFetching
    && !detailQuery.isError
    && !reviewMutation.isPending
  );

  const detailDurationSummary = detail
    ? formatProposalCourseDuration({
      expectedStartDate: detail.expectedStartDate,
      projectedEndDate: detail.projectedEndDate,
      occurrences: detailOccurrences,
      totalSessions: detail.totalSessions,
      trf,
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
                aria-label={tr('Lọc theo trạng thái đề xuất')}
                onChange={handleStatusFilterChange}
                options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
              />

              <CustomSelect
                fitContent
                value={jlptFilter}
                aria-label={tr('Lọc theo cấp độ JLPT')}
                onChange={handleJlptFilterChange}
                options={JLPT_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
              />

              <CustomSelect
                fitContent
                value={mentorFilter}
                aria-label={tr('Lọc theo giáo viên')}
                onChange={handleMentorFilterChange}
                options={[{ value: 'ALL', label: tr('Tất cả giáo viên') }, ...mentorOptions]}
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
              ? tr('Hiện không có đề xuất đang chờ duyệt. Chọn Tất cả trạng thái để xem lịch sử đã xử lý.')
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
                      className="flex flex-wrap items-center justify-between gap-3 rounded-rp-card border border-rp-brand-soft bg-[#FFF6F8] px-4 py-2.5 shadow-rp-xs"
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
                            setBulkReason('');
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
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
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
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
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

                {detail.status === 'Approved' && detail.linkedCohortId && (
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
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-950">
                        <p className="m-0 font-bold text-emerald-900">
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
                      <h3 className="m-0 flex items-center gap-1.5 text-[13.5px] font-bold text-rp-text">
                        <Award className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
                        <span>{tr('Hồ sơ chuyên môn giáo viên')}</span>
                      </h3>
                      {!detail.mentorVerified && (
                        <Badge tone="warning" size="sm" icon={false}>
                          {detail.mentorVerificationStatus || tr('Chưa xác minh hồ sơ')}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12.5px] leading-5 sm:grid-cols-2">
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

                    <div className="border-t border-rp-line/70 pt-2 text-[12.5px] leading-5">
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
                            className="rp-link text-xs font-semibold text-rp-brand"
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
                    <h3 className="m-0 flex items-center gap-1.5 pb-0.5 text-[13.5px] font-bold text-rp-text">
                      <BookOpen className="h-4 w-4 shrink-0 text-rp-brand" aria-hidden="true" />
                      <span>{tr('Thông tin khóa học đề xuất')}</span>
                    </h3>
                    <div className="space-y-2 text-[12.5px] leading-5">
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
                            {detail.optionalAttachments.map((a, idx) => {
                              const IconComp = getAttachmentIconComponent(a.name, a.contentType);
                              const sizeText = formatAttachmentSize(a.sizeBytes);
                              const previewable = isAttachmentInlinePreviewable(a.name, a.contentType);
                              const isBusyView = loadingAttKey === `${detail.id}:${idx}:view`;
                              const isBusyDl = loadingAttKey === `${detail.id}:${idx}:dl`;
                              return (
                                <div
                                  key={`${a.storedFileName || a.name}-${idx}`}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rp-line bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <span title={a.name} className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-rp-text">
                                    <IconComp className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
                                    <span className="truncate">{a.name}</span>
                                    {sizeText && (
                                      <span className="shrink-0 text-[11px] font-normal tabular-nums text-rp-text-muted">
                                        ({sizeText})
                                      </span>
                                    )}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-1">
                                    {previewable && (
                                      <button
                                        type="button"
                                        disabled={Boolean(loadingAttKey)}
                                        onClick={() => void handleProposalAttachmentAction(detail.id, a, idx, false)}
                                        className="rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 px-2 py-0.5 text-[11px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50"
                                      >
                                        {isBusyView ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                        <span>{tr('Xem')}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={Boolean(loadingAttKey)}
                                      onClick={() => void handleProposalAttachmentAction(detail.id, a, idx, true)}
                                      aria-label={trf('Tải xuống {0}', { 0: a.name })}
                                      className="rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 px-2 py-0.5 text-[11px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50"
                                    >
                                      {isBusyDl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                      <span>{tr('Tải')}</span>
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Unified Weekly + 10-Week Detailed Schedule (Shared with Mentor Flow) */}
                  <ProposalDetailedScheduleCard
                    weeklySessions={detail.weeklySessions || []}
                    showWeeklyPatterns
                    occurrences={detailOccurrences}
                    durationWeeks={detail.courseDurationWeeks || 10}
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
          decisionModal?.decision === 'Approve'
            ? tr('Xác nhận phê duyệt đề xuất mở lớp')
            : decisionModal?.decision === 'RequestChanges'
              ? tr('Yêu cầu bổ sung thông tin đề xuất')
              : tr('Từ chối đề xuất mở lớp')
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={reviewMutation.isPending}
              onClick={() => setDecisionModal(null)}
            >
              {tr('Hủy')}
            </Button>
            {decisionModal?.decision === 'Approve' ? (
              <Button
                type="button"
                variant="primary"
                icon={Check}
                data-testid="confirm-approve-proposal-btn"
                loading={reviewMutation.isPending}
                disabled={!canConfirmDecision}
                onClick={submitDecision}
              >
                {reviewMutation.isPending ? tr('Đang phê duyệt…') : tr('Xác nhận phê duyệt')}
              </Button>
            ) : (
              <Button
                type="button"
                data-testid="confirm-decision-submit-btn"
                variant={decisionModal?.decision === 'Reject' ? 'danger' : 'primary'}
                loading={reviewMutation.isPending}
                onClick={submitDecision}
              >
                {decisionModal?.decision === 'Reject' ? tr('Xác nhận từ chối') : tr('Gửi yêu cầu bổ sung')}
              </Button>
            )}
          </div>
        }
      >
        <form onSubmit={submitDecision} className="space-y-3">
          {decisionModal?.decision === 'Approve' && (
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
                  <ul className="m-0 list-disc space-y-1 pl-4 text-xs">
                    {approveBlockingIssues.map((iss, idx) => (
                      <li key={`${iss.code}-${idx}`}>{iss.message}</li>
                    ))}
                  </ul>
                </Banner>
              ) : (() => {
                const previewProposal = liveApproveProposal || decisionModal?.proposal;
                return previewProposal ? (
                  <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 px-3.5 py-2.5 text-xs text-rp-text-2 space-y-1">
                    <div className="font-semibold text-rp-text">
                      {[
                        previewProposal.mentorName,
                        previewProposal.jlptLevelCode ? `JLPT ${previewProposal.jlptLevelCode}` : null,
                      ].filter(Boolean).join(' · ')}
                    </div>
                    <div className="tabular-nums">
                      {formatProposalCourseDuration({
                        expectedStartDate: previewProposal.expectedStartDate,
                        projectedEndDate: previewProposal.projectedEndDate,
                        occurrences: previewProposal.occurrencesPreview || [],
                        totalSessions: previewProposal.totalSessions,
                        trf,
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              <Banner tone="info">
                {(liveApproveProposal?.courseDurationWeeks || decisionModal?.proposal?.courseDurationWeeks)
                  ? trf('Phê duyệt sẽ xác nhận toàn bộ lịch giảng dạy ({0} tuần) và tự động khởi tạo lớp học nhóm mở tuyển sinh tại trang Lớp học & ghi danh.', {
                      0: liveApproveProposal?.courseDurationWeeks || decisionModal?.proposal?.courseDurationWeeks,
                    })
                  : tr('Phê duyệt sẽ xác nhận toàn bộ lịch giảng dạy và tự động khởi tạo lớp học nhóm mở tuyển sinh tại trang Lớp học & ghi danh.')}
              </Banner>
            </>
          )}

          <Field
            label={
              decisionModal?.decision === 'Approve'
                ? tr('Ghi chú phê duyệt (nếu có)')
                : decisionModal?.decision === 'RequestChanges'
                  ? tr('Nội dung yêu cầu bổ sung')
                  : tr('Lý do từ chối')
            }
            required={decisionModal?.decision !== 'Approve'}
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
              placeholder={
                decisionModal?.decision === 'Approve'
                  ? tr('Ghi chú thêm cho giáo viên (nếu có)…')
                  : tr('Nêu rõ nhận xét về hồ sơ chuyên môn, nội dung khóa học hoặc khung lịch để giáo viên điều chỉnh…')
              }
              invalid={Boolean(reasonError)}
            />
          </Field>
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
        reason={bulkReason}
        onReasonChange={setBulkReason}
        onRemoveProposal={handleRemoveFromBulkConfirm}
        onRemoveInvalidProposals={handleRemoveInvalidFromBulkConfirm}
        onViewProposal={handleViewProposalFromBulk}
        onConfirm={handleConfirmBulkApprove}
      />
    </div>
  );
}
