import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Clock,
  Eye,
  FileEdit,
  FileText,
  GraduationCap,
  Layers,
  Rocket,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { MentorShell } from '@/layouts';
import {
  AttachmentItemRow,
  AttachmentPreviewModal,
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  EmptyState,
  ErrorState,
  Modal,
  PageContainer,
  SakuraLoader,
  SearchInput,
  UnifiedToolbar,
  confirmAction,
  notify,
  useAttachmentPreview,
} from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { AdminIconAction } from '@/features/admin/components/AdminPrimitives.jsx';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  fetchMentorProposalAttachmentBlob,
  fetchMentorProposalAttachmentPreview,
  getMyTeachingProposal,
  getTeachingProposalContext,
  hideRejectedTeachingProposal,
  withdrawTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import ProposalDetailedScheduleCard from '@/features/scheduling/components/ProposalDetailedScheduleCard.jsx';
import ConfirmOpenEnrollmentModal from '@/features/scheduling/components/ConfirmOpenEnrollmentModal.jsx';
import ProposalResubmitModal from '@/features/scheduling/components/ProposalResubmitModal.jsx';
import {
  PROPOSAL_STATUS_META,
  formatTuitionVnd,
  normalizeProposalPolicy,
  sortWeeklySessions,
} from '@/features/scheduling/utils/proposalValidation.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';

const HISTORY_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả', dotClass: 'bg-[#CE476D]' },
  { value: 'PendingReview', label: 'Chờ duyệt', dotClass: 'bg-amber-500' },
  { value: 'ChangesRequested', label: 'Cần bổ sung', dotClass: 'bg-[#EA580C]' },
  { value: 'Approved', label: 'Đã duyệt', dotClass: 'bg-emerald-600' },
  { value: 'OpenedClass', label: 'Đã mở lớp', dotClass: 'bg-sky-600' },
  { value: 'Rejected', label: 'Bị từ chối', dotClass: 'bg-red-500' },
];

const LEVEL_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'status', label: 'Ưu tiên cần thao tác' },
];

const STATUS_PRIORITY = {
  Approved: 0,
  ChangesRequested: 1,
  PendingReview: 2,
  OpenedClass: 3,
  Rejected: 4,
};

function ProposalStatusPill({ status, tr }) {
  const meta = PROPOSAL_STATUS_META[status] || {
    label: status || 'Khác',
    pillClass: 'border-slate-200 bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${meta.pillClass}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot || '#64748B' }} aria-hidden="true" />
      <span>{tr(meta.label)}</span>
    </span>
  );
}

export default function MentorProposalHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tr, trf } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const attachmentPreview = useAttachmentPreview();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [contextData, setContextData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const [detailProposal, setDetailProposal] = useState(null);
  const [openEnrollTarget, setOpenEnrollTarget] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);
  const [busyActionId, setBusyActionId] = useState(null);

  const policy = useMemo(
    () => normalizeProposalPolicy(contextData?.policy),
    [contextData?.policy],
  );

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErrorMsg('');
    try {
      const res = await getTeachingProposalContext();
      setContextData(res || null);
    } catch (err) {
      setErrorMsg(describeApiError(err).message || tr('Không thể tải danh sách đăng ký mở lớp.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tr]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) void loadData();
    });
    return () => {
      alive = false;
    };
  }, [loadData]);

  // Exclude unsubmitted Draft items from Proposal History (Draft lives exclusively on template calendar)
  const rawProposals = contextData?.proposals;
  const historyRows = useMemo(() => {
    const raw = Array.isArray(rawProposals) ? rawProposals : [];
    return raw.filter((p) => p && p.status && p.status !== 'Draft' && p.status !== 'Withdrawn');
  }, [rawProposals]);

  // Deep-link via notification `?proposalId=...`
  const deepLinkProposalId = Number(searchParams.get('proposalId') || 0);
  useEffect(() => {
    if (!deepLinkProposalId || loading) return undefined;
    const matched = historyRows.find((p) => Number(p.id) === deepLinkProposalId);
    if (!matched) return undefined;
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setDetailProposal(matched);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('proposalId');
      setSearchParams(nextParams, { replace: true });
    });
    void getMyTeachingProposal(matched.id)
      .then((full) => {
        if (alive && full) setDetailProposal(full);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [deepLinkProposalId, loading, historyRows, searchParams, setSearchParams]);

  const statusCounts = useMemo(() => {
    const counts = {
      ALL: historyRows.length,
      PendingReview: 0,
      ChangesRequested: 0,
      Approved: 0,
      OpenedClass: 0,
      Rejected: 0,
    };
    for (const p of historyRows) {
      if (counts[p.status] != null) counts[p.status] += 1;
    }
    return counts;
  }, [historyRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return historyRows
      .filter((p) => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (levelFilter !== 'ALL' && String(p.jlptLevelCode || '').toUpperCase() !== levelFilter) return false;
        if (q) {
          const hay = [
            p.courseTitle,
            p.jlptLevelCode,
            p.courseObjective,
            p.reviewReason,
            p.linkedCohortName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'status') {
          const pa = STATUS_PRIORITY[a.status] ?? 99;
          const pb = STATUS_PRIORITY[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
        }
        const ta = new Date(a.submittedAtUtc || a.updatedAtUtc || a.createdAtUtc || 0).getTime();
        const tb = new Date(b.submittedAtUtc || b.updatedAtUtc || b.createdAtUtc || 0).getTime();
        return sortBy === 'oldest' ? ta - tb : tb - ta;
      });
  }, [historyRows, searchTerm, statusFilter, levelFilter, sortBy]);

  const handleOpenDetail = async (proposal) => {
    setDetailProposal(proposal);
    try {
      const full = await getMyTeachingProposal(proposal.id);
      if (full) setDetailProposal(full);
    } catch {
      // Keep summary data already displayed
    }
  };

  const handleViewProposalAttachment = useCallback((proposalId, att, idx) => {
    if (!proposalId) return;
    void attachmentPreview.openPreview({
      key: `hist:${proposalId}:${idx}:view`,
      attachment: att,
      fetchBlob: () => fetchMentorProposalAttachmentBlob(proposalId, idx, { download: false }),
      fetchDownloadBlob: () => fetchMentorProposalAttachmentBlob(proposalId, idx, { download: true }),
      fetchPreview: () => fetchMentorProposalAttachmentPreview(proposalId, idx),
    });
  }, [attachmentPreview]);

  const handleDownloadProposalAttachment = useCallback((proposalId, att, idx) => {
    if (!proposalId) return;
    void attachmentPreview.downloadAttachment({
      key: `hist:${proposalId}:${idx}:dl`,
      attachment: att,
      fetchBlob: () => fetchMentorProposalAttachmentBlob(proposalId, idx, { download: true }),
    });
  }, [attachmentPreview]);

  const handleWithdrawProposal = async (proposal) => {
    const isApproved = proposal.status === 'Approved';
    const confirmed = await confirmAction({
      title: isApproved ? tr('Hủy đề xuất đã duyệt?') : tr('Hủy đề xuất mở lớp?'),
      description: isApproved
        ? tr('Đề xuất sẽ bị hủy và không thể mở tuyển sinh. Bạn có thể gửi đăng ký mới bất cứ lúc nào.')
        : tr('Đề xuất sẽ bị hủy và không được tiếp tục xét duyệt. Bạn có thể gửi đăng ký mới bất cứ lúc nào.'),
      confirmLabel: tr('Xác nhận hủy'),
      cancelLabel: tr('Giữ lại'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusyActionId(proposal.id);
    try {
      await withdrawTeachingProposal(proposal.id, { expectedRevision: proposal.revision });
      notify.success(tr('Đã hủy đề xuất mở lớp.'));
      if (detailProposal?.id === proposal.id) setDetailProposal(null);
      void invalidateSidebarCounters(queryClient);
      await loadData({ silent: true });
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể hủy đề xuất lúc này.'));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDeleteRejected = async (proposal) => {
    const confirmed = await confirmAction({
      title: tr('Xóa đề xuất bị từ chối?'),
      description: tr('Đề xuất bị từ chối sẽ bị xóa khỏi danh sách đăng ký cá nhân và không hiển thị lại.'),
      confirmLabel: tr('Xác nhận xóa'),
      cancelLabel: tr('Giữ lại'),
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusyActionId(proposal.id);
    try {
      await hideRejectedTeachingProposal(proposal.id);
      setContextData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          proposals: (prev.proposals || []).filter((p) => p.id !== proposal.id),
        };
      });
      if (detailProposal?.id === proposal.id) setDetailProposal(null);
      void invalidateSidebarCounters(queryClient);
      notify.success(tr('Đã xóa đề xuất bị từ chối khỏi danh sách.'));
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể xóa đề xuất.'));
    } finally {
      setBusyActionId(null);
    }
  };

  const handleOpenEnrollmentSuccess = async () => {
    setOpenEnrollTarget(null);
    setDetailProposal(null);
    void invalidateSidebarCounters(queryClient);
    await loadData({ silent: true });
  };

  const handleResubmitSuccess = async () => {
    setResubmitTarget(null);
    setDetailProposal(null);
    void invalidateSidebarCounters(queryClient);
    await loadData({ silent: true });
  };

  const renderActions = (p, { compact = false, excludeView = false, modalFooter = false } = {}) => {
    const busy = busyActionId === p.id;
    const iconOnly = compact && !modalFooter;
    return (
      <div className={`inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap ${iconOnly ? 'justify-end' : 'justify-center'}`}>
        {p.status === 'Approved' && (
          <Button
            type="button"
            size={modalFooter ? 'md' : 'sm'}
            variant="primary"
            disabled={busy}
            onClick={() => setOpenEnrollTarget(p)}
          >
            <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{tr('Mở tuyển sinh')}</span>
          </Button>
        )}

        {p.status === 'ChangesRequested' && (
          iconOnly ? (
            <AdminIconAction
              icon={FileEdit}
              tone="brand"
              tooltip="Bổ sung & gửi lại"
              disabled={busy}
              onClick={() => setResubmitTarget(p)}
            />
          ) : (
            <Button
              type="button"
              size={modalFooter ? 'md' : 'sm'}
              variant="primary"
              disabled={busy}
              onClick={() => setResubmitTarget(p)}
            >
              <FileEdit className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tr('Bổ sung & gửi lại')}</span>
            </Button>
          )
        )}

        {p.status === 'OpenedClass' && p.linkedCohortId && (
          iconOnly ? (
            <AdminIconAction
              kind="openWorkspace"
              tone="brand"
              tooltip="Quản lý lớp"
              disabled={busy}
              onClick={() => navigate(`/mentor-study-courses/${p.linkedCohortId}/`)}
            />
          ) : (
            <Link to={`/mentor-study-courses/${p.linkedCohortId}/`}>
              <Button type="button" size={modalFooter ? 'md' : 'sm'} variant="secondary">
                <span>{tr('Quản lý lớp')}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          )
        )}

        {!excludeView && (
          iconOnly ? (
            <AdminIconAction
              kind="view"
              tone="neutral"
              tooltip="Xem chi tiết"
              disabled={busy}
              onClick={() => handleOpenDetail(p)}
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => handleOpenDetail(p)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tr('Xem chi tiết')}</span>
            </Button>
          )
        )}

        {(p.status === 'PendingReview' || p.status === 'ChangesRequested' || (p.status === 'Approved' && !modalFooter)) && (
          iconOnly ? (
            <AdminIconAction
              icon={XCircle}
              tone="danger"
              tooltip="Hủy đề xuất"
              disabled={busy}
              onClick={() => handleWithdrawProposal(p)}
            />
          ) : (
            <Button
              type="button"
              size={modalFooter ? 'md' : 'sm'}
              variant={modalFooter ? 'primary' : 'ghost'}
              disabled={busy}
              onClick={() => handleWithdrawProposal(p)}
              className={modalFooter ? undefined : 'text-rp-danger hover:bg-rp-danger-bg'}
            >
              <XCircle className={modalFooter ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
              <span>{tr('Hủy đề xuất')}</span>
            </Button>
          )
        )}

        {p.status === 'Rejected' && (
          iconOnly ? (
            <AdminIconAction
              kind="delete"
              tone="danger"
              tooltip="Xóa"
              disabled={busy}
              onClick={() => handleDeleteRejected(p)}
            />
          ) : (
            <Button
              type="button"
              size={modalFooter ? 'md' : 'sm'}
              variant="ghost"
              disabled={busy}
              onClick={() => handleDeleteRejected(p)}
              className={
                modalFooter
                  ? 'border border-rose-200 bg-rose-50/90 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                  : 'text-rp-danger hover:bg-rp-danger-bg'
              }
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tr('Xóa')}</span>
            </Button>
          )
        )}
      </div>
    );
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim()
    || statusFilter !== 'ALL'
    || levelFilter !== 'ALL'
    || sortBy !== 'newest'
  );

  const showToolbar = !loading && historyRows.length > 0;

  return (
    <MentorShell breadcrumb={tr('Danh sách đăng ký')}>
      <PageContainer as="div" data-page="MentorProposalHistory" width="default" className="space-y-4 text-rp-text">
        <h1 className="sr-only">{tr('Danh sách đăng ký')}</h1>

        {/* Single-Card Unified Filter & Action Toolbar (ẩn khi chưa có đề xuất nào hoặc đang tải) */}
        {showToolbar && (
        <UnifiedToolbar
          refresh={{
            onRefresh: () => loadData({ silent: true }),
            refreshing,
            disabled: loading,
          }}
          actions={(
            <Button as={Link} to="/mentor-shift-schedule/" variant="primary" size="sm" icon={CalendarPlus}>
              {tr('Đăng ký khung giờ')}
            </Button>
          )}
        >
          <SearchInput
            label={tr('Tìm kiếm đề xuất')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder={tr('Tìm tên lớp, mục tiêu, ghi chú…')}
            aria-label={tr('Tìm kiếm đề xuất')}
            className="w-full sm:w-[240px]"
            floatingLabel
          />

          <CustomSelect
            fitContent
            floatingLabel
            label={tr('Trạng thái')}
            value={statusFilter}
            aria-label={tr('Trạng thái')}
            onChange={setStatusFilter}
            options={HISTORY_STATUS_OPTIONS.map((opt) => ({
              value: opt.value,
              label: tr(opt.label),
              dotClass: opt.dotClass,
              count: statusCounts[opt.value] ?? 0,
            }))}
          />

          <CustomSelect
            fitContent
            floatingLabel
            label={tr('Cấp độ')}
            value={levelFilter}
            aria-label={tr('Cấp độ')}
            onChange={setLevelFilter}
            options={LEVEL_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
          />

          <CustomSelect
            fitContent
            floatingLabel
            label={tr('Sắp xếp')}
            value={sortBy}
            aria-label={tr('Sắp xếp')}
            onChange={setSortBy}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
          />

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              icon={X}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setLevelFilter('ALL');
                setSortBy('newest');
              }}
            >
              {tr('Xóa bộ lọc')}
            </Button>
          )}
        </UnifiedToolbar>
        )}

        {errorMsg && historyRows.length > 0 && (
          <Banner tone="danger" title={tr('Chưa tải được danh sách đăng ký')}>
            {errorMsg}
          </Banner>
        )}

        {loading ? (
          <Card className="py-12">
            <SakuraLoader label={tr('Đang tải danh sách đăng ký...')} />
          </Card>
        ) : errorMsg && historyRows.length === 0 ? (
          <Card>
            <ErrorState
              title={tr('Chưa tải được danh sách đăng ký')}
              message={errorMsg}
              onRetry={() => loadData()}
              retrying={refreshing}
            />
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardList}
              illustration={historyRows.length > 0 ? 'search' : 'calendar'}
              title={historyRows.length === 0 ? tr('Bạn chưa có đề xuất mở lớp nào') : tr('Không tìm thấy kết quả phù hợp')}
              description={
                historyRows.length === 0
                  ? tr('Hãy sang trang Đăng ký khung giờ để chọn mẫu lịch dạy hàng tuần và gửi đề xuất mới.')
                  : tr('Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.')
              }
              action={historyRows.length === 0 ? (
                <Link to="/mentor-shift-schedule/">
                  <Button type="button" variant="primary" size="sm">
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    <span>{tr('Đăng ký khung giờ ngay')}</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setLevelFilter('ALL');
                  }}
                >
                  {tr('Xóa bộ lọc')}
                </Button>
              )}
            />
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <Card padded={false} className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-rp-table-head">
                    <tr className="border-b border-rp-brand-border/80 bg-rp-table-head text-[13px] font-semibold text-rp-brand-strong">
                      <th className="px-4 py-3 text-left align-middle">{tr('Tên lớp')}</th>
                      <th className="w-[1%] px-4 py-3 text-center align-middle whitespace-nowrap">{tr('Cấp độ')}</th>
                      <th className="px-4 py-3 text-left align-middle whitespace-nowrap">{tr('Lịch giảng dạy')}</th>
                      <th className="w-[1%] px-4 py-3 text-right align-middle whitespace-nowrap">{tr('Học phí')}</th>
                      <th className="w-[1%] px-4 py-3 text-center align-middle whitespace-nowrap">{tr('Trạng thái')}</th>
                      <th className="w-[1%] px-4 py-3 text-right align-middle whitespace-nowrap">{tr('Thao tác')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rp-line">
                    {filteredRows.map((p) => {
                      const patterns = sortWeeklySessions(
                        p.weeklySessions || [],
                        p.sessionDurationMinutes || policy.sessionDurationMinutes,
                      );
                      const weeks = Math.max(1, Number(p.courseDurationWeeks || 1));
                      const weeklyCount = p.weeklySessionCount || patterns.length;
                      const totalSessions = p.totalSessions || (patterns.length * weeks);
                      return (
                        <tr key={p.id} className="align-middle transition-colors hover:bg-rp-brand-tint/25">
                          <td className="px-4 py-3.5 text-left align-middle">
                            <span className="font-semibold text-rp-text">
                              {p.courseTitle || trf('Lớp JLPT {0}', { 0: p.jlptLevelCode || '' })}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                            {p.jlptLevelCode ? (
                              <span className="font-semibold text-rp-text">
                                {formatJlptLevel(p.jlptLevelCode)}
                              </span>
                            ) : (
                              <span className="text-rp-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap font-semibold tabular-nums text-rp-text">
                            {trf('{0} buổi/tuần · {1} tuần ({2} buổi)', {
                              0: weeklyCount,
                              1: weeks,
                              2: totalSessions,
                            })}
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap font-semibold text-rp-text tabular-nums">
                            {Number(p.totalCourseTuition) > 0 ? formatTuitionVnd(p.totalCourseTuition) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                            <ProposalStatusPill status={p.status} tr={tr} />
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                            {renderActions(p, { compact: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 lg:hidden">
              {filteredRows.map((p) => (
                <Card key={p.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {p.jlptLevelCode && <Badge tone="brand" size="sm">{formatJlptLevel(p.jlptLevelCode)}</Badge>}
                    <ProposalStatusPill status={p.status} tr={tr} />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-rp-text">
                      {p.courseTitle || trf('Lớp JLPT {0}', { 0: p.jlptLevelCode || '' })}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-rp-text-2">
                      <span>{trf('{0} tuần · {1} buổi', { 0: p.courseDurationWeeks, 1: p.totalSessions })}</span>
                      {Number(p.totalCourseTuition) > 0 && (
                        <span className="font-semibold text-rp-text tabular-nums">
                          {formatTuitionVnd(p.totalCourseTuition)}
                        </span>
                      )}
                    </div>
                  </div>

                  <WeeklyScheduleDisplay
                    weeklySessions={p.weeklySessions}
                    sessionDurationMinutes={p.sessionDurationMinutes || policy.sessionDurationMinutes}
                    variant="standard"
                  />

                  <div className="border-t border-rp-line pt-2.5">
                    {renderActions(p)}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </PageContainer>

      {/* Proposal Detail Modal */}
      <Modal
        open={Boolean(detailProposal)}
        onClose={() => setDetailProposal(null)}
        size="lg"
        className="sm:!max-w-[590px]"
        title={detailProposal?.courseTitle || tr('Chi tiết đề xuất mở lớp')}
        footer={detailProposal && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setDetailProposal(null)}>
              {tr('Đóng')}
            </Button>
            {renderActions(detailProposal, { excludeView: true, modalFooter: true })}
          </div>
        )}
      >
        {detailProposal && (() => {
          const levelCode = formatJlptLevel(detailProposal.jlptLevelCode);
          const durationMinutes = detailProposal.sessionDurationMinutes || policy.sessionDurationMinutes;
          const reviewReason = String(detailProposal.reviewReason || '').trim();
          const courseObjective = String(detailProposal.courseObjective || '').trim();
          const optionalNotes = String(detailProposal.optionalNotes || '').trim();
          const attachments = Array.isArray(detailProposal.optionalAttachments)
            ? detailProposal.optionalAttachments.filter(Boolean)
            : [];

          return (
            <div className="flex flex-col gap-4">
              {/* Overview bar */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/70 px-4 py-2.5 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-rp-text-muted">{tr('Trạng thái')}:</span>
                  <ProposalStatusPill status={detailProposal.status} tr={tr} />
                </div>
                {levelCode && (
                  <>
                    <span aria-hidden="true" className="hidden h-4 w-px bg-rp-line sm:inline-block" />
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-rp-text-muted">{tr('Cấp độ')}:</span>
                      <Badge tone="brand" size="sm">{levelCode}</Badge>
                    </div>
                  </>
                )}
              </div>

              {reviewReason && (
                <Banner
                  tone={detailProposal.status === 'Rejected' ? 'danger' : detailProposal.status === 'ChangesRequested' ? 'warning' : 'info'}
                  title={detailProposal.status === 'Rejected' ? tr('Lý do từ chối') : tr('Ghi chú xét duyệt từ Quản trị viên')}
                >
                  {reviewReason}
                </Banner>
              )}

              {/* Key facts rows */}
              <div className="divide-y divide-rp-line/70 border-b border-rp-line/70 text-[13.5px]">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-rp-text-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Thời lượng')}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-rp-text">
                    {trf('{0} tuần · {1} buổi', { 0: detailProposal.courseDurationWeeks, 1: detailProposal.totalSessions })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-rp-text-2">
                    <Clock className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Thời gian mỗi buổi')}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-rp-text">
                    {trf('{0} phút', { 0: durationMinutes })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-rp-text-2">
                    <Layers className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Học phí dự kiến')}</span>
                  </span>
                  <span className="font-bold tabular-nums text-rp-brand-strong">
                    {Number(detailProposal.totalCourseTuition) > 0
                      ? formatTuitionVnd(detailProposal.totalCourseTuition)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Weekly schedule block */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-rp-text">
                  <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                  <span>{tr('Lịch giảng dạy hằng tuần')}</span>
                </h4>
                <WeeklyScheduleDisplay
                  weeklySessions={detailProposal.weeklySessions}
                  sessionDurationMinutes={durationMinutes}
                  variant="summary-rows"
                />
              </div>

              {/* Course info (rendered only when actual data exists) */}
              {(courseObjective || optionalNotes) && (
                <div className="space-y-2.5 border-t border-rp-line/70 pt-3">
                  {courseObjective && (
                    <div className="flex items-start gap-3.5 rounded-xl border border-rp-line bg-rp-brand-tint/35 px-4 py-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-brand-soft bg-rp-brand-tint text-rp-brand-strong"
                      >
                        <GraduationCap className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 border-l border-rp-line/80 pl-3.5">
                        <p className="text-[12px] font-medium text-rp-text-muted">{tr('Mục tiêu khóa học')}</p>
                        <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] font-medium leading-5 text-rp-text">
                          {courseObjective}
                        </p>
                      </div>
                    </div>
                  )}
                  {optionalNotes && (
                    <div className="flex items-start gap-3.5 rounded-xl border border-rp-line bg-rp-brand-tint/35 px-4 py-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-brand-soft bg-rp-brand-tint text-rp-brand-strong"
                      >
                        <FileEdit className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 border-l border-rp-line/80 pl-3.5">
                        <p className="text-[12px] font-medium text-rp-text-muted">{tr('Ghi chú Giáo viên')}</p>
                        <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] font-medium leading-5 text-rp-text">
                          {optionalNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments (rendered only when files exist) */}
              {attachments.length > 0 && (
                <div className="space-y-2 border-t border-rp-line/70 pt-3">
                  <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-rp-text">
                    <FileText className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Tệp đính kèm')}</span>
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {attachments.map((att, idx) => {
                      const fileName = att.name || att.fileName || att.originalFileName || att.storedFileName || '';
                      return (
                        <AttachmentItemRow
                          key={`${att.storedFileName || att.url || fileName}-${idx}`}
                          name={fileName}
                          contentType={att.contentType}
                          storedFileName={att.storedFileName}
                          sizeBytes={att.sizeBytes}
                          showFormatBadge={false}
                          viewing={attachmentPreview.busyKey === `hist:${detailProposal.id}:${idx}:view`}
                          downloading={attachmentPreview.busyKey === `hist:${detailProposal.id}:${idx}:dl`}
                          disabled={Boolean(attachmentPreview.busyKey)}
                          onView={() => handleViewProposalAttachment(detailProposal.id, { ...att, name: fileName }, idx)}
                          onDownload={() => handleDownloadProposalAttachment(detailProposal.id, { ...att, name: fileName }, idx)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {detailProposal.status === 'OpenedClass' && Array.isArray(detailProposal.occurrencesPreview) && detailProposal.occurrencesPreview.length > 0 && (
                <ProposalDetailedScheduleCard
                  weeklySessions={detailProposal.weeklySessions}
                  occurrences={detailProposal.occurrencesPreview}
                  durationWeeks={detailProposal.courseDurationWeeks}
                  projected={false}
                  initialVisibleCount={6}
                  columns="responsive-2"
                  resetKey={`hist-${detailProposal.id}`}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      <ConfirmOpenEnrollmentModal
        open={Boolean(openEnrollTarget)}
        proposal={openEnrollTarget}
        policy={policy}
        onClose={() => setOpenEnrollTarget(null)}
        onSuccess={handleOpenEnrollmentSuccess}
      />

      <ProposalResubmitModal
        open={Boolean(resubmitTarget)}
        proposal={resubmitTarget}
        userId={user?.id}
        onClose={() => setResubmitTarget(null)}
        onSuccess={handleResubmitSuccess}
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
    </MentorShell>
  );
}
