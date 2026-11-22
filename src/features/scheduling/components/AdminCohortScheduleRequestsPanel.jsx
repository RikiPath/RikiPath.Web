import { useState } from 'react';
import { Eye } from 'lucide-react';
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
  DataTable,
  Drawer,
  Field,
  IconButton,
  Input,
  SmartDataBoundary,
  Textarea,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import ScheduleConflictList from './ScheduleConflictList';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const STATUS_TONE = { Pending: 'warning', Approved: 'success', Rejected: 'danger', Withdrawn: 'neutral' };

export function ScheduleRequestHistory({ history = [] }) {
  const { trf } = useLocale();
  if (!history.length) return null;
  return (
    <div className="space-y-1.5 border-t border-rp-line pt-3">
      <p className="text-xs font-semibold text-rp-text-muted">{trf('Lịch sử xử lý ({0})', { 0: history.length })}</p>
      <ul className="space-y-1 text-xs text-rp-text-2">
        {history.map((h, i) => (
          <li key={`${h.atUtc}-${i}`}>
            {date(h.atUtc)} · {h.actorRole} · {h.action}{h.detail ? `: ${h.detail}` : ''}
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
                <li key={s.number}>{trf('Buổi {0}: {1} – {2}', { 0: s.number, 1: date(s.startTime), 2: date(s.endTime) })}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Banner>
  );
}

export default function AdminCohortScheduleRequestsPanel({ busy = false, initialRequestId = null, onRun }) {
  const { trf, tr } = useLocale();
  const initialIdNum = initialRequestId ? Number(initialRequestId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Pending');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const query = useAsyncResource(() => getAdminCohortScheduleRequests(status || undefined), [status]);
  const rows = Array.isArray(query.data) ? query.data : [];
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
    { key: 'id', header: '#', render: (r) => <span className="font-mono text-xs text-rp-text-muted">#{r.id}</span> },
    { key: 'cohortName', header: tr('Lớp'), render: (r) => <span className="font-semibold text-rp-text">{r.cohortName || `#${r.cohortId}`}</span> },
    {
      key: 'kind',
      header: tr('Loại yêu cầu'),
      render: (r) => (
        <span className="text-sm text-rp-text-2">
          {tr(SCHEDULE_REQUEST_KIND[r.kind] || r.kind)}
          {r.kind === 'ShiftWeeks' ? trf(' ({0} tuần)', { 0: r.shiftWeeks }) : ''}
        </span>
      ),
    },
    { key: 'requestedByRole', header: tr('Người gửi'), render: (r) => <span className="text-xs text-rp-text-muted">{r.requestedByRole}</span> },
    { key: 'createdAtUtc', header: tr('Gửi lúc'), render: (r) => <span className="text-xs text-rp-text-2">{date(r.createdAtUtc)}</span> },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] || 'neutral'} size="sm" icon={false}>
          {tr(SCHEDULE_REQUEST_STATUS[r.status] || r.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-rp-text">{tr('Yêu cầu dời/hủy lớp nhóm')}</h2>
            <p className="text-xs text-rp-text-muted">
              {tr('Giáo viên hoặc Admin gửi yêu cầu; máy chủ kiểm tra lại toàn bộ điều kiện trước khi duyệt.')}
            </p>
          </div>
          <div className="w-full sm:w-[200px]">
            <CustomSelect
              value={status}
              aria-label={tr('Lọc trạng thái yêu cầu dời/hủy')}
              onChange={setStatus}
              options={[
                ...Object.entries(SCHEDULE_REQUEST_STATUS).map(([v, l]) => ({ value: v, label: tr(l) })),
                { value: '', label: tr('Tất cả trạng thái') },
              ]}
            />
          </div>
        </div>
      </Card>

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu dời/hủy lớp')}
        errorTitle={tr('Chưa tải được yêu cầu dời/hủy lớp')}
        compact
        diagnosticScope="AdminCohortScheduleRequestsPanel"
        empty={<ContextualEmptyState compact context="adminQueue" title={tr('Không có yêu cầu dời/hủy lớp.')} />}
      >
        {(list) => (
          <DataTable
            columns={columns}
            rows={list}
            rowKey={(r) => r.id}
            onRowClick={choose}
            rowActions={(r) => (
              <IconButton icon={Eye} size="sm" variant="ghost" label={tr('Xem chi tiết')} onClick={() => choose(r)} />
            )}
          />
        )}
      </SmartDataBoundary>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `${tr('Yêu cầu')} #${selected.id} · ${selected.cohortName || trf('Lớp #{0}', { 0: selected.cohortId })}` : ''}
        width="w-[min(560px,100vw)]"
      >
        {selected && (
          <div className="space-y-4">
            <Badge tone={STATUS_TONE[selected.status] || 'neutral'} size="sm" icon={false}>
              {tr(SCHEDULE_REQUEST_STATUS[selected.status] || selected.status)}
            </Badge>

            <Card className="space-y-2 bg-rp-bg-2/40 p-4 text-sm">
              <p><strong>{tr('Loại')}:</strong> {tr(SCHEDULE_REQUEST_KIND[selected.kind] || selected.kind)}</p>
              <p><strong>{tr('Lý do')}:</strong> {tr(selected.reason)}</p>
            </Card>

            {previewError && <Banner tone="danger">{previewError}</Banner>}
            <ShiftPreviewDetails preview={preview} />
            {selected.decisionNote && <Banner tone="info" title={tr('Quyết định')}>{selected.decisionNote}</Banner>}

            {selected.status === 'Pending' && (
              <>
                <Card className="space-y-3 p-4">
                  <Field label={tr('Ghi chú duyệt (không bắt buộc)')}>
                    <Input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <Button
                    loading={busy}
                    disabled={busy || blocked}
                    onClick={() =>
                      onRun(async () => {
                        await approveCohortScheduleRequest(selected.id, { note, expectedRevision: selected.revision });
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
