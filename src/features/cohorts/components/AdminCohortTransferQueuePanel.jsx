import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { describeApiError } from '@/api/apiErrors';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  CustomSelect,
  Drawer,
  Field,
  Input,
  SmartDataBoundary,
  Textarea,
} from '@/components/ui';
import {
  AdminDataTable,
  AdminIconAction,
  AdminRowActions,
  AdminStatusBadge,
  AdminToolbar,
} from '@/features/admin/components/AdminPrimitives.jsx';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import {
  approveTransfer,
  getTransferEligibility,
  getTransferRequest,
  getTransferRequests,
  openTransferEvidence,
  rejectTransfer,
} from '@/features/cohorts/api/cohortApi';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { formatAuditActionLabel, formatRoleLabel } from '@/utils/terminology.js';
import { useLocale } from '@/locales/locale.js';

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', tone: 'warning', dot: '#f59e0b' },
  Approved: { label: 'Đã duyệt', tone: 'success', dot: '#22c55e' },
  Rejected: { label: 'Từ chối', tone: 'danger', dot: '#ef4444' },
  Withdrawn: { label: 'Đã rút', tone: 'neutral', dot: '#94a3b8' },
};

const ENROLLMENT_STATUS = {
  Active: 'Đang học',
  Completed: 'Đã hoàn thành',
  Transferred: 'Đã chuyển lớp',
  TransferredOut: 'Đã chuyển sang lớp khác',
  Cancelled: 'Đã hủy',
  PendingPayment: 'Chờ thanh toán',
};

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

function CohortCard({ cohort, selected, onSelect }) {
  const { tr, trf } = useLocale();
  return (
    <Card
      className={`space-y-2 p-3.5 text-sm ${selected ? 'border-rp-brand-strong bg-rp-brand-tint/30' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="neutral" size="sm" icon={false}>{cohort.level}</Badge>
        <Badge tone={cohort.seatsAvailable > 0 ? 'success' : 'neutral'} size="sm" icon={false}>
          {trf('{0}/{1} học viên · còn {2} chỗ', { 0: cohort.enrolledCount, 1: cohort.capacity, 2: cohort.seatsAvailable })}
        </Badge>
      </div>
      <p className="font-semibold text-rp-text">{cohort.name}</p>
      <p className="text-xs text-rp-text-muted">
        {trf('Giáo viên: {0} · Bắt đầu {1}', { 0: cohort.mentorName, 1: date(cohort.startsAt) })}
      </p>
      {onSelect && (
        <Button size="sm" variant={selected ? 'primary' : 'outline'} onClick={onSelect}>
          {selected ? tr('Đang chọn làm lớp đích') : tr('Chọn làm lớp đích')}
        </Button>
      )}
    </Card>
  );
}

export default function AdminCohortTransferQueuePanel({
  busy,
  fillHeight = false,
  initialTransferId = null,
  toolbarTabs = null,
  refreshSignal = 0,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const initialIdNum = initialTransferId ? Number(initialTransferId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Pending');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [detail, setDetail] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const query = useAsyncResource(() => getTransferRequests(), []);
  const queryRefetch = query.refetch;
  useEffect(() => {
    if (refreshSignal > 0) queryRefetch();
  }, [refreshSignal, queryRefetch]);
  const hasRecords = query.isSuccess && Array.isArray(query.data) && query.data.length > 0;

  const loadList = () => query.refetch();
  const loadDetail = (id) =>
    getTransferRequest(id)
      .then((d) => {
        setError('');
        setDetail(d);
        const t = d.request.targetCohortId || d.request.requestedTargetCohortId || null;
        setTargetId(t);
        setEligibility(d.eligibility ? { ...d.eligibility, targetCohortId: t } : null);
      })
      .catch((e) => setError(describeApiError(e).message));

  const [loadedInitialId, setLoadedInitialId] = useState(null);
  if (initialIdNum && loadedInitialId !== initialIdNum) {
    setLoadedInitialId(initialIdNum);
    loadDetail(initialIdNum);
  }

  const choose = (cohortId) => {
    setTargetId(cohortId);
    setEligibility(null);
    setError('');
    getTransferEligibility(selectedId, cohortId)
      .then(setEligibility)
      .catch((e) => setError(describeApiError(e).message));
  };

  const request = detail?.request;
  const drawerOpen = Boolean(selectedId);

  const columns = [
    {
      key: 'learnerName',
      header: tr('Học viên'),
      render: (r) => <span className="font-semibold text-rp-text">{r.learnerName}</span>,
    },
    {
      key: 'sourceCohortName',
      header: tr('Lớp nguồn'),
      render: (r) => <span className="text-sm text-rp-text-2">{r.sourceCohortName}</span>,
    },
    {
      key: 'requestedTargetCohortName',
      header: tr('Lớp đề xuất'),
      render: (r) => <span className="text-xs text-rp-text-muted">{r.requestedTargetCohortName || tr('Quản trị viên chọn')}</span>,
    },
    {
      key: 'createdAtUtc',
      header: tr('Gửi lúc'),
      compact: true,
      render: (r) => <span className="whitespace-nowrap text-xs text-rp-text-2">{date(r.createdAtUtc)}</span>,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      compact: true,
      render: (r) => {
        const meta = STATUS_META[r.status] || { label: r.status, tone: 'neutral' };
        return <AdminStatusBadge tone={meta.tone} label={meta.label} />;
      },
    },
  ];

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-4' : 'space-y-4'}>
      {(toolbarTabs || hasRecords) && (
        <AdminToolbar
          tabs={toolbarTabs}
          refresh={{
            when: hasRecords,
            onRefresh: query.refetch,
            refreshing: query.isFetching && !query.isPending,
          }}
        >
          {hasRecords && (
            <CustomSelect
              fitContent
              value={status}
              aria-label={tr('Lọc trạng thái chuyển lớp')}
              onChange={setStatus}
              options={[
                { value: 'Pending', label: tr('Chờ duyệt'), dotClass: 'bg-[#f59e0b]' },
                { value: 'Approved', label: tr('Đã duyệt'), dotClass: 'bg-[#22c55e]' },
                { value: 'Rejected', label: tr('Từ chối'), dotClass: 'bg-[#ef4444]' },
                { value: 'Withdrawn', label: tr('Đã rút'), dotClass: 'bg-[#94a3b8]' },
                { value: '', label: tr('Tất cả trạng thái') },
              ]}
            />
          )}
        </AdminToolbar>
      )}

      {error && <Banner tone="danger">{error}</Banner>}

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu chuyển lớp')}
        errorTitle={tr('Chưa tải được hàng đợi chuyển lớp')}
        compact
        diagnosticScope="AdminCohortTransferQueuePanel"
        className={fillHeight ? 'flex min-h-0 flex-1 flex-col' : undefined}
        empty={
          <ContextualEmptyState
            variant="compact"
            context="adminQueue"
            illustration="appointment"
            title={tr('Không có yêu cầu chuyển lớp.')}
            description=""
          />
        }
      >
        {(list) => {
          const visible = status ? list.filter((item) => item.status === status) : list;
          return visible.length === 0 ? (
            <ContextualEmptyState variant="search" illustration="search" title={tr('Không tìm thấy kết quả phù hợp')} description={tr('Thử chọn trạng thái khác hoặc xóa bộ lọc.')} action={<Button size="sm" variant="outline" onClick={() => setStatus('')}>{tr('Xóa bộ lọc')}</Button>} />
          ) : <AdminDataTable
            columns={columns}
            rows={visible}
            rowKey={(r) => r.id}
            itemLabel="yêu cầu"
            fillHeight={fillHeight}
            onRowClick={(r) => {
              setSelectedId(r.id);
              setNote('');
              setRejectReason('');
              loadDetail(r.id);
            }}
            rowActions={(r) => (
              <AdminRowActions>
                <AdminIconAction
                  kind="view"
                  tooltip="Xem & xử lý yêu cầu chuyển lớp"
                  onClick={() => {
                    setSelectedId(r.id);
                    setNote('');
                    setRejectReason('');
                    loadDetail(r.id);
                  }}
                />
              </AdminRowActions>
            )}
          />;
        }}
      </SmartDataBoundary>

      <Drawer
        open={drawerOpen}
        onClose={() => setSelectedId(null)}
        title={request ? `${tr('Yêu cầu chuyển lớp')} · ${request.learnerName}` : tr('Chi tiết yêu cầu chuyển lớp')}
        width="w-[min(560px,100vw)]"
      >
        {request && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={(STATUS_META[request.status] || { tone: 'neutral' }).tone} size="sm" icon={false}>
                {tr((STATUS_META[request.status] || { label: request.status }).label)}
              </Badge>
              {request.hasEvidence && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={FileText}
                  disabled={busy}
                  onClick={() => onRun(() => openTransferEvidence(request.id), 'Đã mở minh chứng riêng tư.')}
                >
                  {tr('Xem minh chứng')}
                </Button>
              )}
            </div>

            <Card className="space-y-2 bg-rp-bg-2/40 p-4 text-sm">
              <p><strong>{tr('Lý do học viên')}:</strong> {request.reason}</p>
              {detail.sourceEnrollment && (
                <p className="text-xs text-rp-text-muted">
                  {trf('Ghi danh ({1}) · Có mặt {2}/{3} · Vắng {4} · Còn {5} buổi · Bài tập {6}/{7}', {
                    1: tr(ENROLLMENT_STATUS[detail.sourceEnrollment.status] || 'Khác'),
                    2: detail.sourceEnrollment.progress.attended,
                    3: detail.sourceEnrollment.progress.totalSessions,
                    4: detail.sourceEnrollment.progress.absent,
                    5: detail.sourceEnrollment.progress.upcoming,
                    6: detail.sourceEnrollment.progress.homeworkSubmitted,
                    7: detail.sourceEnrollment.progress.homeworkAssigned,
                  })}
                </p>
              )}
            </Card>

            {detail.sourceCohort && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-rp-text-muted">{tr('Lớp nguồn')}</p>
                <CohortCard cohort={detail.sourceCohort} />
              </div>
            )}

            {request.status === 'Pending' && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-rp-text-muted">{tr('Chọn lớp đích phù hợp')}</p>
                  {detail.candidateCohorts.length === 0 ? (
                    <Banner tone="warning">{tr('Không có lớp đích phù hợp.')}</Banner>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {detail.candidateCohorts.map((c) => (
                        <CohortCard key={c.id} cohort={c} selected={c.id === targetId} onSelect={() => choose(c.id)} />
                      ))}
                    </div>
                  )}
                </div>

                {eligibility && (
                  <Banner tone={eligibility.eligible ? 'success' : 'danger'} title={eligibility.eligible ? tr('Đủ điều kiện chuyển') : tr('Chưa đủ điều kiện chuyển')}>
                    <ul className="mt-1 space-y-1 text-xs">
                      {eligibility.checks.map((c) => (
                        <li key={c.code}>
                          {c.passed ? '✓' : '✗'} {tr(c.message)}
                        </li>
                      ))}
                    </ul>
                  </Banner>
                )}

                <Card className="space-y-3 p-4">
                  <Field label={tr('Ghi chú duyệt (không bắt buộc)')}>
                    <Input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <Button
                    loading={busy}
                    disabled={busy || !targetId || (eligibility && !eligibility.eligible)}
                    onClick={() =>
                      onRun(async () => {
                        await approveTransfer(request.id, { targetCohortId: targetId, note, expectedRevision: request.revision });
                        await loadList();
                        await loadDetail(request.id);
                      }, 'Đã duyệt chuyển lớp; ghi danh được cập nhật và thông báo sẽ gửi sau khi lưu.')
                    }
                  >
                    {tr('Duyệt chuyển lớp')}
                  </Button>
                </Card>

                <Card className="space-y-3 p-4">
                  <Field label={tr('Lý do từ chối (bắt buộc)')}>
                    <Textarea rows={3} maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  </Field>
                  <Button
                    variant="danger"
                    disabled={busy || !rejectReason.trim()}
                    onClick={() =>
                      onRun(async () => {
                        await rejectTransfer(request.id, rejectReason, request.revision);
                        await loadList();
                        await loadDetail(request.id);
                      }, 'Đã từ chối yêu cầu và gửi lý do cho học viên.')
                    }
                  >
                    {tr('Từ chối yêu cầu')}
                  </Button>
                </Card>
              </>
            )}

            {request.decisionNote && (
              <Banner tone="info" title={tr('Quyết định')}>
                {request.decisionNote}
              </Banner>
            )}

            {request.history?.length > 0 && (
              <div className="space-y-1.5 border-t border-rp-line pt-3">
                <p className="text-xs font-semibold text-rp-text-muted">{tr('Lịch sử xử lý')}</p>
                <ul className="space-y-1 text-xs text-rp-text-2">
                  {request.history.map((h, i) => (
                    <li key={i}>{date(h.atUtc)} · {formatRoleLabel(h.actorRole, tr)} · {formatAuditActionLabel(h.action, tr)}: {h.detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
