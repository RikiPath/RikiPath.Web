import { useState } from 'react';
import {
  approveCohortScheduleRequest,
  getAdminCohortScheduleRequests,
  getCohortShiftPreview,
  rejectCohortScheduleRequest,
  SCHEDULE_REQUEST_KIND,
  SCHEDULE_REQUEST_STATUS,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import { ContextualEmptyState, SmartDataBoundary } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import ScheduleConflictList from './ScheduleConflictList';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

export function ScheduleRequestHistory({ history = [] }) {
  const { trf } = useLocale();
  if (!history.length) return null;
  return (
    <details>
      <summary>{trf('Lịch sử xử lý ({0})', { 0: history.length })}</summary>
      <ul>
        {history.map((h, i) => (
          <li key={`${h.atUtc}-${i}`} className="course-meta">
            {date(h.atUtc)} · {h.actorRole} · {h.action}{h.detail ? `: ${h.detail}` : ''}
          </li>
        ))}
      </ul>
    </details>
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
    <div className={preview.eligible ? 'course-notice' : 'course-error'} style={{ marginTop: 8 }}>
      <div>
        <strong>{preview.eligible ? tr('Đủ điều kiện dời lịch') : tr('Chưa đủ điều kiện dời lịch')}</strong>
        {preview.newEnrollmentClosesAtUtc && (
          <span className="course-meta">{trf('· Hạn ghi danh mới: {0}', { 0: date(preview.newEnrollmentClosesAtUtc) })}</span>
        )}
        {checks.length > 0 && failedChecks.length === 0 && (
          <p className="course-meta" style={{ color: '#1e5c36', marginTop: 4 }}>
            {trf('✓ Đạt toàn bộ {0}/{1} điều kiện dời lịch.', { 0: checks.length, 1: checks.length })}
          </p>
        )}
        {failedChecks.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {failedChecks.map((c) => (
              <li key={c.code} className="course-meta" style={{ color: '#a42222' }}>
                ✗ {tr(c.message)}
              </li>
            ))}
          </ul>
        )}
        {blockers.length > 0 && (
          <>
            <p className="course-meta" style={{ marginTop: 6 }}><strong>{tr('Điểm chặn:')}</strong></p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {blockers.map((b, i) => (
                <li key={b.code || i} className="course-meta">{typeof b === 'string' ? b : b.message || describeApiError({ errorCode: b.code }).message}</li>
              ))}
            </ul>
          </>
        )}
        <ScheduleConflictList conflicts={preview.conflicts || []} compact />
        {validProposed.length > 0 && (
          <details>
            <summary>{trf('Lịch dự kiến sau khi dời ({0} buổi)', { 0: validProposed.length })}</summary>
            <ul>
              {validProposed.map((s) => (
                <li key={s.number} className="course-meta">{trf('Buổi {0}: {1} – {2}', { 0: s.number, 1: date(s.startTime), 2: date(s.endTime) })}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

// Hàng đợi yêu cầu dời lịch / hủy lớp trống: Admin xem kiểm tra điều kiện, xung đột rồi duyệt / từ chối.
export default function AdminCohortScheduleRequestsPanel({ busy = false, initialRequestId = null, onRun }) {
  const { trf, tr } = useLocale();
  const initialIdNum = initialRequestId ? Number(initialRequestId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Pending');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const query = useAsyncResource(
    () => getAdminCohortScheduleRequests(status || undefined),
    [status],
  );
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

  const refresh = () => query.refetch();
  const blocked = selected?.kind === 'ShiftWeeks' && preview && !preview.eligible;

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>{tr('Yêu cầu dời/hủy lớp')}</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label={tr('Lọc trạng thái yêu cầu dời/hủy')}>
          {Object.entries(SCHEDULE_REQUEST_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          <option value="">{tr('Tất cả')}</option>
        </select>
      </div>
      <p className="course-meta">
        {tr('Giáo viên hoặc Admin gửi yêu cầu; chỉ Admin duyệt. Máy chủ kiểm tra lại toàn bộ điều kiện (học viên đã ghi danh, thanh toán đang chờ, xung đột lịch) khi duyệt.')}
      </p>
      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu dời/hủy lớp')}
        errorTitle={tr('Chưa tải được yêu cầu dời/hủy lớp')}
        compact
        diagnosticScope="AdminCohortScheduleRequestsPanel"
        empty={<ContextualEmptyState compact context="adminQueue" title={tr('Không có yêu cầu.')} />}
      >
        {(list) => (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}><th>#</th><th>{tr('Lớp')}</th><th>{tr('Loại')}</th><th>{tr('Người gửi')}</th><th>{tr('Gửi lúc')}</th><th>{tr('Trạng thái')}</th><th /></tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                    <td>{r.id}</td>
                    <td>{r.cohortName || `#${r.cohortId}`}</td>
                    <td>{tr(SCHEDULE_REQUEST_KIND[r.kind] || r.kind)}{r.kind === 'ShiftWeeks' ? trf(' ({0} tuần)', { 0: r.shiftWeeks }) : ''}</td>
                    <td>{r.requestedByRole}</td>
                    <td>{date(r.createdAtUtc)}</td>
                    <td>{tr(SCHEDULE_REQUEST_STATUS[r.status] || r.status)}</td>
                    <td><button type="button" onClick={() => choose(r)}>{tr('Xem')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SmartDataBoundary>

      {selected && (
        <div className="course-form">
          <h3>
            {tr('Yêu cầu #')}{selected.id} · {selected.cohortName || trf('Lớp #{0}', { 0: selected.cohortId })} · {tr(SCHEDULE_REQUEST_STATUS[selected.status] || selected.status)}
          </h3>
          <p className="course-meta">
            {tr(SCHEDULE_REQUEST_KIND[selected.kind] || selected.kind)}
            {selected.kind === 'ShiftWeeks' ? trf(' · dời {0} tuần', { 0: selected.shiftWeeks }) : ''}{' '}{tr('· gửi bởi')}{' '}{selected.requestedByRole}{' '}{tr('lúc')}{' '}{date(selected.createdAtUtc)}
          </p>
          <p className="course-pre"><strong>{tr('Lý do:')}</strong> {tr(selected.reason)}</p>
          {previewError && <p className="course-error">{previewError}</p>}
          <ShiftPreviewDetails preview={preview} />
          {selected.decisionNote && <p className="course-pre"><strong>{tr('Quyết định:')}</strong> {selected.decisionNote}</p>}

          {selected.status === 'Pending' && (
            <>
              <form
                className="course-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onRun(async () => {
                    await approveCohortScheduleRequest(selected.id, { note, expectedRevision: selected.revision });
                    refresh();
                  }, selected.kind === 'ShiftWeeks' ? 'Đã duyệt dời lịch lớp; học viên sẽ được thông báo.' : 'Đã duyệt hủy lớp chưa có học viên.');
                }}
              >
                <fieldset disabled={busy || blocked}>
                  <label className="course-field">
                    <span>{tr('Ghi chú duyệt (không bắt buộc)')}</span>
                    <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  </label>
                  <button className="course-primary" type="submit">{tr('Duyệt yêu cầu')}</button>
                </fieldset>
                {blocked && <p className="course-meta">{tr('Không thể duyệt khi còn điểm chặn hoặc xung đột lịch.')}</p>}
              </form>
              <form
                className="course-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!rejectReason.trim()) return;
                  onRun(async () => {
                    await rejectCohortScheduleRequest(selected.id, rejectReason);
                    refresh();
                  }, 'Đã từ chối yêu cầu và gửi lý do cho người gửi.');
                }}
              >
                <fieldset disabled={busy}>
                  <label className="course-field">
                    <span>{tr('Lý do từ chối (bắt buộc)')}</span>
                    <textarea required maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  </label>
                  <button type="submit" disabled={!rejectReason.trim()}>{tr('Từ chối')}</button>
                </fieldset>
              </form>
            </>
          )}
          <ScheduleRequestHistory history={selected.history} />
        </div>
      )}
    </section>
  );
}
