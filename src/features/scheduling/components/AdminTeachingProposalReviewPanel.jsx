import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Eye,
  FileText,
  History,
  MessageSquareWarning,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Drawer,
  Field,
  Modal,
  SakuraLoader,
  SearchInput,
  Textarea,
  notify,
} from '@/components/ui';
import { AdminDataTable, AdminToolbar } from '@/features/admin/components/AdminPrimitives.jsx';
import { getAdminMentorVerificationDocument } from '@/features/admin/api/adminApi.js';
import {
  getAdminTeachingProposal,
  getAdminTeachingProposals,
  reviewAdminTeachingProposal,
} from '@/features/scheduling/api/teachingProposalApi.js';
import {
  PROPOSAL_PROGRAM_TYPES,
  PROPOSAL_STATUS_META,
  sortWeeklySessions,
  weekdayLabelVn,
} from '@/features/scheduling/utils/proposalValidation.js';
import { ADMIN_KEYS, invalidateAdminDomains } from '@/features/admin/api/adminQueryKeys.js';
import { describeApiError } from '@/api/apiErrors.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS_FILTER_OPTIONS = [
  { value: 'PendingReview', label: 'Chờ duyệt' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ChangesRequested', label: 'Cần bổ sung' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Bị từ chối' },
  { value: 'Withdrawn', label: 'Đã rút' },
];

export default function AdminTeachingProposalReviewPanel({
  initialProposalId = null,
  toolbarTabs = null,
  fillHeight = false,
}) {
  const { tr, trf } = useLocale();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState(() => (initialProposalId ? 'ALL' : 'PendingReview'));
  const [search, setSearch] = useState('');
  const [mentorFilter, setMentorFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(() => (initialProposalId ? Number(initialProposalId) : null));
  const [decisionModal, setDecisionModal] = useState(null); // { decision: 'Approve' | 'RequestChanges' | 'Reject', proposal }
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [docPreview, setDocPreview] = useState(null); // { mentorId, url, isPdf }

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
      notify.error(describeApiError(err).message || tr('Chưa tải được chứng chỉ hồ sơ của Giáo viên.'));
    },
  });

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
  });

  const allProposals = useMemo(
    () => (Array.isArray(proposalsQuery.data) ? proposalsQuery.data : []),
    [proposalsQuery.data]
  );

  const hasAnyProposals = proposalsQuery.isSuccess && allProposals.length > 0;

  const rows = useMemo(
    () => (statusFilter === 'ALL' ? allProposals : allProposals.filter((r) => r.status === statusFilter)),
    [allProposals, statusFilter]
  );

  const mentorOptions = useMemo(() => {
    const map = new Map();
    allProposals.forEach((r) => {
      if (r.mentorId && !map.has(String(r.mentorId))) {
        map.set(String(r.mentorId), r.mentorName || `#${r.mentorId}`);
      }
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [allProposals]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (mentorFilter !== 'ALL' && String(r.mentorId) !== String(mentorFilter)) return false;
      if (!q) return true;
      return (
        String(r.mentorName || '').toLowerCase().includes(q)
        || String(r.courseTitle || '').toLowerCase().includes(q)
        || String(r.jlptLevelCode || '').toLowerCase().includes(q)
        || String(r.courseObjective || '').toLowerCase().includes(q)
      );
    });
  }, [mentorFilter, rows, search]);

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
      await Promise.all([
        invalidateAdminDomains(queryClient, ['schedules', 'cohorts']),
        queryClient.invalidateQueries({ queryKey: ['admin-teaching-proposal-detail', vars.id] }),
      ]);
      const msg = vars.decision === 'Approve'
        ? tr('Đã phê duyệt đề xuất mở lớp và ghi nhận lịch dạy sẵn sàng tạo lớp nhóm.')
        : vars.decision === 'RequestChanges'
          ? tr('Đã gửi yêu cầu chỉnh sửa bổ sung tới Giáo viên.')
          : tr('Đã từ chối đề xuất mở lớp.');
      notify.success(msg);
      if (updated?.id) setSelectedId(updated.id);
    },
    onError: (err) => {
      notify.error(describeApiError(err).message || tr('Chưa xử lý được đề xuất mở lớp.'));
    },
  });

  const openDecisionModal = (decision, proposal) => {
    setReason('');
    setReasonError('');
    setDecisionModal({ decision, proposal });
  };

  const submitDecision = (e) => {
    e?.preventDefault?.();
    if (!decisionModal) return;
    const { decision, proposal } = decisionModal;
    const trimmed = reason.trim();
    if ((decision === 'RequestChanges' || decision === 'Reject') && !trimmed) {
      setReasonError(tr('Vui lòng nhập lý do rõ ràng để Giáo viên điều chỉnh lại đề xuất.'));
      return;
    }
    setReasonError('');
    reviewMutation.mutate({
      id: proposal.id,
      decision,
      reasonText: trimmed,
      expectedRevision: proposal.revision,
    });
  };

  const hasFilters = search.trim() !== '' || mentorFilter !== 'ALL' || statusFilter !== 'PendingReview';

  const columns = [
    {
      key: 'mentor',
      header: tr('Giáo viên'),
      width: 'min-w-[180px]',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-rp-text">{row.mentorName || `#${row.mentorId}`}</div>
          <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-rp-text-muted">
            <span>{row.mentorVerified ? tr('Hồ sơ đã duyệt') : tr('Chưa duyệt hồ sơ')}</span>
            {row.mentorJlptLevel && (
              <span>· {trf('Hồ sơ: {0}', { 0: row.mentorJlptLevel })}</span>
            )}
            {row.mentorYearsOfExperience != null && (
              <span>· {trf('{0} năm KN', { 0: row.mentorYearsOfExperience })}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: tr('Đề xuất khóa học'),
      width: 'min-w-[210px]',
      render: (row) => {
        const courseTitle = row.courseTitle?.trim() || row.coursePlanName || trf('Đề xuất #{0}', { 0: row.id });
        return (
          <div className="mx-auto max-w-[380px] space-y-0.5">
            <div className="flex items-center justify-center gap-1.5">
              {row.jlptLevelCode && <Badge tone="brand" size="sm" icon={false}>{row.jlptLevelCode}</Badge>}
              <span title={courseTitle} className="truncate font-semibold text-rp-text">
                {courseTitle}
              </span>
            </div>
            <div className="text-[11px] text-rp-text-muted">
              {tr('Khai giảng')}: {row.expectedStartDate || '—'} · {trf('{0} tuần', { 0: row.courseDurationWeeks })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'schedule',
      header: tr('Lịch tuần'),
      width: 'min-w-[175px]',
      render: (row) => (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-rp-text">
            {trf('{0} buổi/tuần ({1} buổi)', { 0: row.weeklySessionCount, 1: row.totalSessions })}
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {sortWeeklySessions(row.weeklySessions || []).slice(0, 4).map((s) => (
              <span key={s.key} className="rounded border border-rp-line bg-rp-bg-2/50 px-1.5 py-0.5 text-[10px] text-rp-text-2">
                {weekdayLabelVn(s.weekday)} {s.startClock}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'workload',
      header: tr('Tải & xung đột'),
      compact: true,
      render: (row) => (
        <div className="space-y-1 text-xs">
          {row.mentorWorkload && (
            <div className="text-rp-text-2">
              {trf('{0} lớp · {1} chờ duyệt', {
                0: row.mentorWorkload.activeCohortsCount,
                1: row.mentorWorkload.pendingProposalsCount,
              })}
            </div>
          )}
          {row.status === 'PendingReview' && (
            <Badge tone={row.hasConflicts ? 'danger' : 'success'} size="sm" icon={false}>
              {row.hasConflicts ? tr('Có xung đột') : tr('Hợp lệ')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      render: (row) => {
        const meta = PROPOSAL_STATUS_META[row.status] || PROPOSAL_STATUS_META.PendingReview;
        return (
          <Badge tone={meta.tone} size="sm" icon={false}>
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
            {tr(meta.label)}
          </Badge>
        );
      },
    },
  ];

  const detail = detailQuery.data;
  const programLabel = (code) => {
    const f = PROPOSAL_PROGRAM_TYPES.find((t) => t.value === code);
    return f ? tr(f.label) : code;
  };

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {(toolbarTabs || hasAnyProposals) && (
        <AdminToolbar
          tabs={toolbarTabs}
          className="lg:flex-wrap"
          leftClassName="lg:flex-none lg:shrink-0"
          rightClassName="lg:flex-1 lg:justify-end"
          refresh={{
            when: hasAnyProposals,
            onRefresh: () => proposalsQuery.refetch({ cancelRefetch: true }),
            refreshing: proposalsQuery.isFetching && !proposalsQuery.isPending,
          }}
        >
          {hasAnyProposals && (
            <>
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Tìm Giáo viên, JLPT, đề xuất…"
                aria-label={tr('Tìm đề xuất mở lớp')}
                className="w-full sm:w-[190px]"
              />

              <CustomSelect
                fitContent
                value={statusFilter}
                aria-label={tr('Lọc theo trạng thái đề xuất')}
                onChange={setStatusFilter}
                options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }))}
              />

              <CustomSelect
                fitContent
                value={mentorFilter}
                aria-label={tr('Lọc theo Giáo viên')}
                onChange={setMentorFilter}
                options={[{ value: 'ALL', label: tr('Tất cả Giáo viên') }, ...mentorOptions]}
              />

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setSearch('');
                    setMentorFilter('ALL');
                    setStatusFilter('PendingReview');
                  }}
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
          description={tr('Các đề xuất mở lớp nhóm JLPT do Giáo viên gửi lên sẽ hiển thị tại đây.')}
        />
      ) : filteredRows.length === 0 ? (
        <ContextualEmptyState
          variant="search"
          illustration="search"
          title={tr('Không có đề xuất nào khớp bộ lọc')}
          description={
            statusFilter === 'PendingReview' && !search.trim() && mentorFilter === 'ALL'
              ? tr('Hiện không có đề xuất đang chờ duyệt. Chọn Tất cả trạng thái để xem lịch sử đã xử lý.')
              : tr('Thử thay đổi trạng thái, Giáo viên hoặc xóa từ khóa tìm kiếm.')
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setMentorFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              {tr(statusFilter !== 'ALL' && !search.trim() && mentorFilter === 'ALL' ? 'Xem tất cả trạng thái' : 'Xóa bộ lọc')}
            </Button>
          }
        />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={filteredRows}
          rowKey={(r) => r.id}
          fillHeight={fillHeight}
          rowActions={(row) => (
            <div className="flex items-center justify-center gap-1.5">
              <Button size="sm" variant="outline" icon={Eye} onClick={() => setSelectedId(row.id)}>
                {tr('Xem & Duyệt')}
              </Button>
            </div>
          )}
        />
      )}

      {/* Full Proposal Review Drawer */}
      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail ? trf('Chi tiết đề xuất mở lớp #{0}', { 0: detail.id }) : tr('Đang tải chi tiết đề xuất…')}
        description={detail ? `${detail.mentorName} · ${detail.jlptLevelCode || ''}` : ''}
        size="lg"
      >
        {detailQuery.isLoading && !detail ? (
          <SakuraLoader variant="section" delay={100} />
        ) : detailQuery.error ? (
          <ContextualErrorState
            error={detailQuery.error}
            title={tr('Chưa tải được chi tiết đề xuất')}
            onRetry={() => detailQuery.refetch()}
          />
        ) : detail ? (
          <div className="space-y-4 text-sm">
            {/* Header Status & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/40 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={(PROPOSAL_STATUS_META[detail.status] || PROPOSAL_STATUS_META.PendingReview).tone} size="sm" icon={false}>
                  {tr((PROPOSAL_STATUS_META[detail.status] || PROPOSAL_STATUS_META.PendingReview).label)}
                </Badge>
                {detail.jlptLevelCode && <Badge tone="brand" size="sm" icon={false}>{detail.jlptLevelCode}</Badge>}
                <span className="text-xs text-rp-text-muted">
                  {detail.submittedAtUtc ? `${tr('Gửi lúc')}: ${formatVnDateTime(detail.submittedAtUtc, '—')}` : ''}
                </span>
              </div>

              {detail.status === 'PendingReview' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    icon={CheckCircle2}
                    disabled={reviewMutation.isPending || detail.hasConflicts}
                    onClick={() => openDecisionModal('Approve', detail)}
                  >
                    {tr('Phê duyệt')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={MessageSquareWarning}
                    disabled={reviewMutation.isPending}
                    onClick={() => openDecisionModal('RequestChanges', detail)}
                  >
                    {tr('Yêu cầu sửa')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    disabled={reviewMutation.isPending}
                    onClick={() => openDecisionModal('Reject', detail)}
                  >
                    {tr('Từ chối')}
                  </Button>
                </div>
              )}

              {detail.status === 'Approved' && (
                <Link
                  to={`/admin/study-courses?proposalId=${detail.id}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-rp-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-rp-brand-strong"
                >
                  {detail.linkedCohortId ? tr('Xem lớp trong Quản lý lớp') : tr('Mở lớp từ đề xuất đã duyệt')}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Live Conflict Check */}
            {detail.status === 'PendingReview' && detail.hasConflicts && (
              <Banner tone="danger" icon={AlertTriangle} title={tr('Phát hiện xung đột / vi phạm quy định tại thời điểm duyệt')}>
                <ul className="m-0 list-disc pl-4 space-y-1 text-xs">
                  {(detail.validationIssues || []).map((iss, idx) => (
                    <li key={`${iss.code}-${idx}`}>{iss.message}</li>
                  ))}
                </ul>
              </Banner>
            )}

            {detail.status === 'PendingReview' && !detail.hasConflicts && (
              <Banner tone="success" icon={ShieldCheck}>
                {tr('Đã đối chiếu lịch 10 tuần: hợp lệ và không trùng với lịch dạy hiện có của Giáo viên. Vui lòng đánh giá năng lực hồ sơ, chứng chỉ và nội dung khóa bên dưới trước khi phê duyệt.')}
              </Banner>
            )}

            {/* Mentor Capability & Profile Certificate Evaluation Card (HOTFIX: Admin evaluates directly on proposal) */}
            <Card className="p-4 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 flex items-center gap-1.5 text-sm font-bold text-rp-text">
                  <Award className="h-4 w-4 text-rp-brand" />
                  {tr('Hồ sơ năng lực & chứng chỉ Giáo viên')}
                </h3>
                <Badge tone={detail.mentorVerified ? 'success' : 'warning'} size="sm" icon={false}>
                  {detail.mentorVerified ? tr('Hồ sơ đã xác minh') : (detail.mentorVerificationStatus || tr('Chưa xác minh'))}
                </Badge>
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2">
                <p className="m-0"><strong>{tr('Giáo viên')}:</strong> {detail.mentorName} ({detail.mentorEmail})</p>
                <p className="m-0"><strong>{tr('Trình độ JLPT hồ sơ')}:</strong> {detail.mentorJlptLevel || '—'}</p>
                <p className="m-0">
                  <strong>{tr('Kinh nghiệm giảng dạy')}:</strong>{' '}
                  {detail.mentorYearsOfExperience != null ? trf('{0} năm', { 0: detail.mentorYearsOfExperience }) : '—'}
                </p>
                <p className="m-0"><strong>{tr('Chuyên môn')}:</strong> {detail.mentorExpertise || '—'}</p>
                {detail.mentorWorkplace && (
                  <p className="m-0 sm:col-span-2"><strong>{tr('Nơi công tác')}:</strong> {detail.mentorWorkplace}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      : tr('Xem chứng chỉ hồ sơ Giáo viên')}
                  </Button>
                ) : (
                  <span className="text-rp-text-muted">
                    {tr('Giáo viên chưa đính kèm tệp chứng chỉ trong hồ sơ.')}
                  </span>
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

              {docPreview?.mentorId === detail.mentorId && docPreview.url && (
                <div className="mt-2 overflow-hidden rounded-xl border border-rp-line bg-white">
                  {docPreview.isPdf ? (
                    <iframe
                      title={tr('Chứng chỉ Giáo viên')}
                      src={docPreview.url}
                      className="h-64 w-full border-0"
                    />
                  ) : (
                    <img
                      src={docPreview.url}
                      alt={tr('Chứng chỉ Giáo viên')}
                      className="max-h-64 w-full object-contain"
                    />
                  )}
                </div>
              )}
            </Card>

            {/* Proposed Course Metadata */}
            <Card className="p-4 space-y-2 text-xs">
              <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Thông tin khóa học đề xuất')}</h3>
              <p className="m-0"><strong>{tr('Trình độ đề xuất')}:</strong> {detail.jlptLevelCode || '—'}</p>
              <p className="m-0"><strong>{tr('Loại chương trình')}:</strong> {programLabel(detail.programType)}</p>
              {detail.coursePlanName && <p className="m-0"><strong>{tr('Gói tham chiếu')}:</strong> {detail.coursePlanName}</p>}
              {detail.courseTitle && <p className="m-0"><strong>{tr('Tên đề xuất')}:</strong> {detail.courseTitle}</p>}
              <p className="m-0">
                <strong>{tr('Thời gian khóa')}:</strong> {detail.expectedStartDate || '—'} → {detail.projectedEndDate || '—'}{' '}
                ({trf('{0} tuần · {1} buổi/tuần × {2} phút = {3} buổi', {
                  0: detail.courseDurationWeeks,
                  1: detail.weeklySessionCount,
                  2: detail.sessionDurationMinutes,
                  3: detail.totalSessions,
                })})
              </p>
              {detail.courseObjective && (
                <p className="m-0"><strong>{tr('Mục tiêu khóa học')}:</strong> {detail.courseObjective}</p>
              )}
              {detail.optionalNotes && (
                <p className="m-0"><strong>{tr('Ghi chú Giáo viên')}:</strong> {detail.optionalNotes}</p>
              )}
              <div className="pt-1">
                <strong>{tr('Tài liệu đính kèm riêng cho đề xuất (không bắt buộc)')}:</strong>{' '}
                {(!detail.optionalAttachments || detail.optionalAttachments.length === 0) ? (
                  <span className="text-rp-text-muted">{tr('Không có tệp đính kèm')}</span>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detail.optionalAttachments.map((a, idx) => (
                      <a
                        key={`${a.url}-${idx}`}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rp-link inline-flex items-center gap-1 rounded-lg border border-rp-line bg-white px-2.5 py-1 text-xs font-medium text-rp-text hover:text-rp-brand"
                      >
                        <FileText className="h-3.5 w-3.5 text-rp-brand" />
                        {a.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Combined Workload Summary */}
            {detail.mentorWorkload && (
              <Card className="p-4 space-y-2 text-xs">
                <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Tải giảng dạy tổng hợp của Giáo viên')}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 p-2 text-center">
                    <div className="text-base font-bold tabular-nums">{detail.mentorWorkload.activeCohortsCount}</div>
                    <div className="text-[11px] text-rp-text-muted">{tr('Lớp đang mở')}</div>
                  </div>
                  <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 p-2 text-center">
                    <div className="text-base font-bold tabular-nums">{detail.mentorWorkload.pendingProposalsCount}</div>
                    <div className="text-[11px] text-rp-text-muted">{tr('Đề xuất chờ duyệt')}</div>
                  </div>
                  <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 p-2 text-center">
                    <div className="text-base font-bold tabular-nums">{detail.mentorWorkload.weeklyTotalProjectedSessions}</div>
                    <div className="text-[11px] text-rp-text-muted">{tr('Tổng buổi / tuần')}</div>
                  </div>
                  <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 p-2 text-center">
                    <div className="text-base font-bold tabular-nums">{detail.mentorWorkload.dailySessionCap}</div>
                    <div className="text-[11px] text-rp-text-muted">{tr('Giới hạn / ngày')}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Weekly Timetable + 10-Week Preview */}
            <Card className="p-4 space-y-2.5 text-xs">
              <h3 className="m-0 text-sm font-bold text-rp-text">{tr('Khung lịch lặp hàng tuần & 10 tuần dự kiến')}</h3>
              <div className="flex flex-wrap gap-1.5">
                {sortWeeklySessions(detail.weeklySessions || []).map((s) => (
                  <span key={s.key} className="rounded-lg border border-[#F2CCD7] bg-[#FFF5F7] px-2.5 py-1 font-semibold text-[#7D2941]">
                    {weekdayLabelVn(s.weekday)} · {s.startClock}–{s.endClock}
                  </span>
                ))}
              </div>
              {detail.occurrencesPreview?.length > 0 && (
                <div className="grid max-h-48 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {detail.occurrencesPreview.map((o) => (
                    <div key={`${o.sessionNumber}-${o.localDate}`} className="flex items-center justify-between rounded border border-rp-line px-2 py-1">
                      <span className="font-semibold">{trf('Buổi {0} (T{1})', { 0: o.sessionNumber, 1: o.weekNumber })}</span>
                      <span className="tabular-nums text-rp-text-2">{o.localDate} · {o.localStart}–{o.localEnd}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* History */}
            {detail.history?.length > 0 && (
              <Card className="p-4 space-y-2 text-xs">
                <h3 className="m-0 flex items-center gap-1.5 text-sm font-bold text-rp-text">
                  <History className="h-4 w-4 text-rp-brand" />
                  {tr('Lịch sử phê duyệt')}
                </h3>
                <ol className="m-0 list-none space-y-1.5 p-0">
                  {detail.history.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-rp-line bg-rp-bg-2/30 px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        <span>{ev.action} ({ev.actorRole})</span>
                        <span className="text-rp-text-muted">{formatVnDateTime(ev.createdAtUtc, '—')}</span>
                      </div>
                      {ev.reason && <p className="m-0 mt-0.5 text-rp-text-2">{ev.reason}</p>}
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Admin Decision Modal */}
      <Modal
        open={Boolean(decisionModal)}
        onClose={() => !reviewMutation.isPending && setDecisionModal(null)}
        title={
          decisionModal?.decision === 'Approve'
            ? tr('Xác nhận phê duyệt đề xuất mở lớp')
            : decisionModal?.decision === 'RequestChanges'
              ? tr('Yêu cầu Giáo viên chỉnh sửa đề xuất')
              : tr('Từ chối đề xuất mở lớp')
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={reviewMutation.isPending} onClick={() => setDecisionModal(null)}>
              {tr('Hủy')}
            </Button>
            <Button
              type="button"
              variant={decisionModal?.decision === 'Reject' ? 'danger' : 'primary'}
              loading={reviewMutation.isPending}
              onClick={submitDecision}
            >
              {decisionModal?.decision === 'Approve' ? tr('Xác nhận phê duyệt') : tr('Gửi phản hồi')}
            </Button>
          </div>
        }
      >
        <form onSubmit={submitDecision} className="space-y-3">
          {decisionModal?.decision === 'Approve' && (
            <Banner tone="info">
              {tr('Phê duyệt sẽ tự động ghi nhận toàn bộ buổi dạy 10 tuần vào danh sách lịch sẵn sàng mở lớp. Lớp học nhóm sẽ không tự động công bố cho tới khi Admin cấu hình và mở lớp tại Quản lý lớp nhóm.')}
            </Banner>
          )}
          <Field
            label={decisionModal?.decision === 'Approve' ? tr('Ghi chú phê duyệt (không bắt buộc)') : tr('Lý do gửi Giáo viên')}
            required={decisionModal?.decision !== 'Approve'}
            error={reasonError}
          >
            <Textarea
              rows={4}
              maxLength={1500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                decisionModal?.decision === 'Approve'
                  ? tr('Ghi chú thêm cho Giáo viên (nếu có)…')
                  : tr('Nêu rõ nhận xét về năng lực/trình độ, nội dung khóa hoặc khung lịch để Giáo viên điều chỉnh…')
              }
              invalid={Boolean(reasonError)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
