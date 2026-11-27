import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  approveCohortScheduleRequest,
  getAdminCohortScheduleRequests,
  getCohortShiftPreview,
  rejectCohortScheduleRequest,
  SCHEDULE_REQUEST_KIND,
  SCHEDULE_REQUEST_STATUS,
} from '@/features/cohorts/api/cohortApi';
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
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { formatDate, formatTimeRange } from '@/utils/dateTimeFormat.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { formatAuditActionLabel, formatRoleLabel } from '@/utils/terminology.js';
import ScheduleConflictList from './ScheduleConflictList';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const STATUS_TONE = { Pending: 'warning', Approved: 'success', Rejected: 'danger', Withdrawn: 'neutral' };

export function ScheduleRequestHistory({ history = [] }) {
  const { tr, trf } = useLocale();
  if (!history.length) return null;
  return (
    <div className="space-y-1.5 border-t border-rp-line pt-3">
      <p className="text-xs font-semibold text-rp-text-muted">{trf('Lịch sử xử lý ({0})', { 0: history.length })}</p>
      <ul className="space-y-1 text-xs text-rp-text-2">
        {history.map((h, i) => (
          <li key={`${h.atUtc}-${i}`}>
            {date(h.atUtc)} · {formatRoleLabel(h.actorRole, tr)} · {formatAuditActionLabel(h.action, tr)}{h.detail ? `: ${h.detail}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShiftPreviewDetails({ preview }) {
  const { tr, trf } = useLocale();
  if (!preview) return null;
  const checks = preview.checks || [];
  const failedChecks = checks.filter((c) => !c.passed);
  const blockers = preview.blockers || [];
  const validProposed = preview.eligible
    ? (preview.proposedSessions || []).filter((s) => s.startTime && s.endTime)
    : [];
  return (
    <Banner
      tone={preview.eligible ? 'success' : 'danger'}
      title={preview.eligible ? tr('Đủ điều kiện dời lịch') : tr('Chưa đủ điều kiện dời lịch')}
    >
      <div className="space-y-2 text-xs">
        {preview.newEnrollmentClosesAtUtc && (
          <p>{trf('Hạn ghi danh mới: {0}', { 0: date(preview.newEnrollmentClosesAtUtc) })}</p>
        )}
        {checks.length > 0 && failedChecks.length === 0 && (
          <p>{trf('✓ Đạt toàn bộ {0}/{1} điều kiện dời lịch.', { 0: checks.length, 1: checks.length })}</p>
        )}
        {failedChecks.length > 0 && (
          <ul className="space-y-0.5">
            {failedChecks.map((c) => <li key={c.code}>✗ {tr(c.message)}</li>)}
          </ul>
        )}
        {blockers.length > 0 && (
          <ul className="space-y-0.5">
            {blockers.map((b, i) => (
              <li key={b.code || i}>
                • {typeof b === 'string' ? b : b.message || describeApiError({ errorCode: b.code }).message}
              </li>
            ))}
          </ul>
        )}
        <ScheduleConflictList conflicts={preview.conflicts || []} compact />
        {validProposed.length > 0 && (
          <details>
            <summary className="cursor-pointer font-semibold">
              {trf('Lịch dự kiến sau khi dời ({0} buổi)', { 0: validProposed.length })}
            </summary>
            <ul className="mt-1 space-y-0.5">
              {validProposed.map((s) => (
                <li key={s.number}>{trf('Buổi {0}: {1} · {2}', { 0: s.number, 1: formatDate(s.startTime, '—'), 2: formatTimeRange(s.startTime, s.endTime, '—') })}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Banner>
  );
}

export default function AdminCohortScheduleRequestsPanel({
  busy = false,
  fillHeight = false,
  initialRequestId = null,
  toolbarTabs = null,
  refreshSignal = 0,
  onRun,
}) {
  const { trf, tr } = useLocale();
  const queryClient = useQueryClient();
  const initialIdNum = initialRequestId ? Number(initialRequestId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Pending');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const query = useAsyncResource(() => getAdminCohortScheduleRequests(), []);
  const queryRefetch = query.refetch;
  useEffect(() => {
    if (refreshSignal > 0) queryRefetch();
  }, [refreshSignal, queryRefetch]);
  const rows = Array.isArray(query.data) ? (status ? query.data.filter((item) => item.status === status) : query.data) : [];
  const hasRecords = query.isSuccess && Array.isArray(query.data) && query.data.length > 0;
  const selected = rows.find((r) => r.id === selectedId) || null;

  const [previewedInitialId, setPreviewedInitialId] = useState(null);
  if (selected && initialIdNum && selected.id === initialIdNum && previewedInitialId !== selected.id && selected.kind === 'ShiftWeeks' && selected.status === 'Pending') {
    setPreviewedInitialId(selected.id);
    getCohortShiftPreview(selected.cohortId, selected.shiftWeeks || 1)
      .then(setPreview)
      .catch((e) => setPreviewError(describeApiError(e).message));
  }

  const choose = (row) => {
    setSelectedId(row.id);
    setNote('');
    setRejectReason('');
    setPreview(null);
    setPreviewError('');
    if (row.kind === 'ShiftWeeks' && row.status === 'Pending') {
      getCohortShiftPreview(row.cohortId, row.shiftWeeks || 1)
        .then(setPreview)
        .catch((e) => setPreviewError(describeApiError(e).message));
    }
  };

  const blocked = selected?.kind === 'ShiftWeeks' && preview && !preview.eligible;

  const columns = [
    { key: 'cohortName', header: tr('Lớp'), align: 'left', render: (r) => <span className="font-semibold text-rp-text">{r.cohortName || tr('Lớp học nhóm')}</span> },
    {
      key: 'kind',
      header: tr('Loại yêu cầu'),
      align: 'left',
      render: (r) => (
        <span className="text-sm text-rp-text-2">
          {tr(SCHEDULE_REQUEST_KIND[r.kind] || r.kind)}
          {r.kind === 'ShiftWeeks' ? trf(' ({0} tuần)', { 0: r.shiftWeeks }) : ''}
        </span>
      ),
    },
    { key: 'requestedByRole', header: tr('Người gửi'), align: 'center', compact: true, render: (r) => <span className="text-xs text-rp-text-muted">{formatRoleLabel(r.requestedByRole, tr)}</span> },
    { key: 'createdAtUtc', header: tr('Gửi lúc'), align: 'center', compact: true, render: (r) => <span className="whitespace-nowrap text-xs text-rp-text-2">{date(r.createdAtUtc)}</span> },
    {
      key: 'status',
      header: tr('Trạng thái'),
      align: 'center',
      compact: true,
      render: (r) => (
        <AdminStatusBadge
          tone={STATUS_TONE[r.status] || 'neutral'}
          label={SCHEDULE_REQUEST_STATUS[r.status] || r.status}
        />
      ),
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
              aria-label={tr('Trạng thái')}
              onChange={setStatus}
              options={[
                ...Object.entries(SCHEDULE_REQUEST_STATUS).map(([v, l]) => ({ value: v, label: tr(l) })),
                { value: '', label: tr('Tất cả') },
              ]}
            />
          )}
        </AdminToolbar>
      )}

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu dời/hủy lớp')}
        errorTitle={tr('Chưa tải được yêu cầu dời/hủy lớp')}
        compact
        diagnosticScope="AdminCohortScheduleRequestsPanel"
        className={fillHeight ? 'flex min-h-0 flex-1 flex-col' : undefined}
        empty={
          <ContextualEmptyState
            variant="compact"
            context="adminQueue"
            illustration="appointment"
            title={tr('Không có yêu cầu dời/hủy lớp.')}
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
            onRowClick={choose}
            rowActions={(r) => (
              <AdminRowActions>
                <AdminIconAction
                  kind="view"
                  tooltip="Xem chi tiết yêu cầu dời lịch"
                  onClick={() => choose(r)}
                />
              </AdminRowActions>
            )}
          />;
        }}
      </SmartDataBoundary>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `${tr('Yêu cầu điều chỉnh lịch')} · ${selected.cohortName || tr('Lớp học nhóm')}` : ''}
        width="w-[min(560px,100vw)]"
      >
        {selected && (
          <div className="space-y-4">
            <Badge tone={STATUS_TONE[selected.status] || 'neutral'} size="sm" icon={false}>
              {tr(SCHEDULE_REQUEST_STATUS[selected.status] || selected.status)}
            </Badge>

            <Card className="space-y-2 bg-rp-bg-2/40 p-4 text-sm">
              <p><strong>{tr('Loại')}:</strong> {tr(SCHEDULE_REQUEST_KIND[selected.kind] || selected.kind)}</p>
              <p><strong>{tr('Lý do')}:</strong> {selected.reason}</p>
            </Card>

            {previewError && <Banner tone="danger">{previewError}</Banner>}
            <ShiftPreviewDetails preview={preview} />
            {selected.decisionNote && <Banner tone="info" title={tr('Quyết định')}>{selected.decisionNote}</Banner>}

            {selected.status === 'Pending' && (
              <>
                <Card className="space-y-3 p-4">
                  <Field label={tr('Ghi chú duyệt (nếu có)')}>
                    <Input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <Button
                    loading={busy}
                    disabled={busy || blocked}
                    onClick={() =>
                      onRun(async () => {
                        await approveCohortScheduleRequest(selected.id, { note, expectedRevision: selected.revision });
                        await invalidateSidebarCounters(queryClient);
                        query.refetch();
                      }, selected.kind === 'ShiftWeeks' ? 'Đã duyệt dời lịch lớp; học viên sẽ được thông báo.' : 'Đã duyệt hủy lớp chưa có học viên.')
                    }
                  >
                    {tr('Duyệt yêu cầu')}
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
                        await rejectCohortScheduleRequest(selected.id, rejectReason);
                        await invalidateSidebarCounters(queryClient);
                        query.refetch();
                      }, 'Đã từ chối yêu cầu và gửi lý do cho người gửi.')
                    }
                  >
                    {tr('Từ chối yêu cầu')}
                  </Button>
                </Card>
              </>
            )}

            <ScheduleRequestHistory history={selected.history} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
