import { useEffect, useState } from 'react';
import {
  approveCohortScheduleRequest,
  getAdminCohortScheduleRequests,
  getCohortShiftPreview,
  rejectCohortScheduleRequest,
  SCHEDULE_REQUEST_KIND,
  SCHEDULE_REQUEST_STATUS,
} from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import ScheduleConflictList from './ScheduleConflictList';

const date = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');

export function ScheduleRequestHistory({ history = [] }) {
  if (!history.length) return null;
  return (
    <details>
      <summary>Lịch sử xử lý ({history.length})</summary>
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
  if (!preview) return null;
  const checks = preview.checks || [];
  const blockers = preview.blockers || [];
  return (
    <div className={preview.eligible ? 'course-notice' : 'course-error'} style={{ marginTop: 8 }}>
      <strong>{preview.eligible ? 'Đủ điều kiện dời lịch' : 'Chưa đủ điều kiện dời lịch'}</strong>
      {preview.newEnrollmentClosesAtUtc && (
        <span className="course-meta"> · Hạn ghi danh mới: {date(preview.newEnrollmentClosesAtUtc)}</span>
      )}
      {checks.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {checks.map((c) => (
            <li key={c.code} className="course-meta" style={{ color: c.passed ? '#1e5c36' : '#a42222' }}>
              {c.passed ? '✓' : '✗'} {c.message}
            </li>
          ))}
        </ul>
      )}
      {blockers.length > 0 && (
        <>
          <p className="course-meta" style={{ marginTop: 6 }}><strong>Điểm chặn:</strong></p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {blockers.map((b, i) => (
              <li key={b.code || i} className="course-meta">{typeof b === 'string' ? b : b.message || describeApiError({ errorCode: b.code }).message}</li>
            ))}
          </ul>
        </>
      )}
      <ScheduleConflictList conflicts={preview.conflicts || []} compact />
      {(preview.proposedSessions || []).length > 0 && (
        <details>
          <summary>Lịch dự kiến sau khi dời ({preview.proposedSessions.length} buổi)</summary>
          <ul>
            {preview.proposedSessions.map((s) => (
              <li key={s.number} className="course-meta">Buổi {s.number}: {date(s.startTime)} – {date(s.endTime)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Hàng đợi yêu cầu dời lịch / hủy lớp trống: Admin xem kiểm tra điều kiện, xung đột rồi duyệt / từ chối.
export default function AdminCohortScheduleRequestsPanel({ busy = false, onRun }) {
  const [status, setStatus] = useState('Pending');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getAdminCohortScheduleRequests(status || undefined)
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setError('');
      })
      .catch((e) => alive && setError(describeApiError(e).message));
    return () => {
      alive = false;
    };
  }, [status, reloadTick]);

  const selected = rows.find((r) => r.id === selectedId) || null;

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

  const refresh = () => setReloadTick((t) => t + 1);
  const blocked = selected?.kind === 'ShiftWeeks' && preview && !preview.eligible;

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>Yêu cầu dời/hủy lớp</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label="Lọc trạng thái yêu cầu dời/hủy">
          {Object.entries(SCHEDULE_REQUEST_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          <option value="">Tất cả</option>
        </select>
      </div>
      <p className="course-meta">
        Mentor hoặc Admin gửi yêu cầu; chỉ Admin duyệt. Máy chủ kiểm tra lại toàn bộ điều kiện (học viên đã ghi danh, thanh toán đang chờ, xung đột lịch) khi duyệt.
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      {rows.length === 0 ? (
        <p className="course-meta">Không có yêu cầu.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}><th>#</th><th>Lớp</th><th>Loại</th><th>Người gửi</th><th>Gửi lúc</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                  <td>{r.id}</td>
                  <td>{r.cohortName || `#${r.cohortId}`}</td>
                  <td>{SCHEDULE_REQUEST_KIND[r.kind] || r.kind}{r.kind === 'ShiftWeeks' ? ` (${r.shiftWeeks} tuần)` : ''}</td>
                  <td>{r.requestedByRole}</td>
                  <td>{date(r.createdAtUtc)}</td>
                  <td>{SCHEDULE_REQUEST_STATUS[r.status] || r.status}</td>
                  <td><button type="button" onClick={() => choose(r)}>Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="course-form">
          <h3>
            Yêu cầu #{selected.id} · {selected.cohortName || `Lớp #${selected.cohortId}`} · {SCHEDULE_REQUEST_STATUS[selected.status] || selected.status}
          </h3>
          <p className="course-meta">
            {SCHEDULE_REQUEST_KIND[selected.kind] || selected.kind}
            {selected.kind === 'ShiftWeeks' ? ` · dời ${selected.shiftWeeks} tuần` : ''} · gửi bởi {selected.requestedByRole} lúc {date(selected.createdAtUtc)}
          </p>
          <p className="course-pre"><strong>Lý do:</strong> {selected.reason}</p>
          {previewError && <p className="course-error">{previewError}</p>}
          <ShiftPreviewDetails preview={preview} />
          {selected.decisionNote && <p className="course-pre"><strong>Quyết định:</strong> {selected.decisionNote}</p>}

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
                    <span>Ghi chú duyệt (không bắt buộc)</span>
                    <input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                  </label>
                  <button className="course-primary" type="submit">Duyệt yêu cầu</button>
                </fieldset>
                {blocked && <p className="course-meta">Không thể duyệt khi còn điểm chặn hoặc xung đột lịch.</p>}
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
                    <span>Lý do từ chối (bắt buộc)</span>
                    <textarea required maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  </label>
                  <button type="submit" disabled={!rejectReason.trim()}>Từ chối</button>
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
