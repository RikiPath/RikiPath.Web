import { useEffect, useRef, useState } from 'react';
import {
  createCohortScheduleRequest,
  getCohortScheduleRequests,
  getCohortShiftPreview,
  SCHEDULE_REQUEST_KIND,
  SCHEDULE_REQUEST_STATUS,
  withdrawCohortScheduleRequest,
} from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import { ScheduleRequestHistory, ShiftPreviewDetails } from './AdminCohortScheduleRequestsPanel';

const PREVIEW_DEBOUNCE_MS = 400;
const date = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');

function CohortRequestForm({ cohort, busy, onRun }) {
  const [kind, setKind] = useState('ShiftWeeks');
  const [weeks, setWeeks] = useState(1);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const idempotencyKey = useRef(null);

  useEffect(() => {
    let alive = true;
    getCohortScheduleRequests(cohort.id)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(describeApiError(e).message));
    return () => {
      alive = false;
    };
  }, [cohort.id, tick]);

  const previewKey = kind === 'ShiftWeeks' ? `${cohort.id}:${weeks}` : '';
  useEffect(() => {
    if (!previewKey) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      getCohortShiftPreview(cohort.id, weeks)
        .then((p) => alive && setPreview({ key: previewKey, data: p, error: '' }))
        .catch((e) => alive && setPreview({ key: previewKey, data: null, error: describeApiError(e).message }));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [previewKey, cohort.id, weeks]);

  const activePreview = previewKey && preview?.key === previewKey ? preview : null;
  const hasPending = rows.some((r) => r.status === 'Pending');
  const blocked = kind === 'ShiftWeeks' && activePreview?.data && !activePreview.data.eligible;

  return (
    <article className="course-row">
      <h3>{cohort.name} <span className="course-meta">(#{cohort.id} · khai giảng {date(cohort.startsAt)})</span></h3>
      {hasPending ? (
        <p className="course-notice">Lớp đang có yêu cầu chờ Admin duyệt. Bạn có thể rút yêu cầu trước khi gửi yêu cầu mới.</p>
      ) : (
        <form
          className="course-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return;
            if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
            const key = idempotencyKey.current;
            onRun(async () => {
              await createCohortScheduleRequest(cohort.id, { kind, shiftWeeks: weeks, reason, idempotencyKey: key });
              idempotencyKey.current = null;
              setReason('');
              setTick((t) => t + 1);
            }, 'Đã gửi yêu cầu tới Admin. Lịch lớp chỉ thay đổi sau khi Admin duyệt.');
          }}
        >
          <fieldset disabled={busy}>
            <label className="course-field" style={{ maxWidth: 260 }}>
              <span>Loại yêu cầu</span>
              <select value={kind} onChange={(e) => { setKind(e.target.value); idempotencyKey.current = null; }}>
                {Object.entries(SCHEDULE_REQUEST_KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {kind === 'ShiftWeeks' && (
              <label className="course-field" style={{ maxWidth: 140 }}>
                <span>Số tuần dời</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={weeks}
                  onChange={(e) => { setWeeks(Math.min(8, Math.max(1, Number(e.target.value) || 1))); idempotencyKey.current = null; }}
                />
              </label>
            )}
            <label className="course-field">
              <span>Lý do (bắt buộc)</span>
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => { setReason(e.target.value); idempotencyKey.current = null; }}
                placeholder={kind === 'ShiftWeeks' ? 'VD: Chưa đủ học viên, đề nghị lùi khai giảng 1 tuần…' : 'VD: Lớp chưa có học viên ghi danh…'}
              />
            </label>
            <button className="course-primary" type="submit" disabled={!reason.trim() || blocked}>Gửi yêu cầu</button>
          </fieldset>
          {kind === 'ShiftWeeks' && !activePreview && <p className="course-meta">Đang xem trước lịch sau khi dời…</p>}
          {activePreview?.error && <p className="course-error">{activePreview.error}</p>}
          {kind === 'ShiftWeeks' && <ShiftPreviewDetails preview={activePreview?.data} />}
          {kind === 'CancelEmptyCohort' && (
            <p className="course-meta">Chỉ hủy được lớp chưa có học viên ghi danh thành công và không có giao dịch đang chờ.</p>
          )}
        </form>
      )}
      {error && <p role="alert" className="course-error">{error}</p>}
      {rows.length > 0 && (
        <>
          <p className="course-meta" style={{ marginTop: 8 }}><strong>Yêu cầu đã gửi</strong></p>
          {rows.map((r) => (
            <div key={r.id} className="course-form">
              <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                <span>
                  #{r.id} · {SCHEDULE_REQUEST_KIND[r.kind] || r.kind}
                  {r.kind === 'ShiftWeeks' ? ` (${r.shiftWeeks} tuần)` : ''} · {date(r.createdAtUtc)}
                </span>
                <span className={`course-badge ${r.status === 'Approved' ? 'ok' : r.status === 'Pending' ? 'warn' : 'muted'}`}>
                  {SCHEDULE_REQUEST_STATUS[r.status] || r.status}
                </span>
              </div>
              <p className="course-pre">{r.reason}</p>
              {r.decisionNote && <p className="course-pre"><strong>Phản hồi Admin:</strong> {r.decisionNote}</p>}
              {r.status === 'Pending' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onRun(async () => {
                      await withdrawCohortScheduleRequest(r.id);
                      setTick((t) => t + 1);
                    }, 'Đã rút yêu cầu.')
                  }
                >
                  Rút yêu cầu
                </button>
              )}
              <ScheduleRequestHistory history={r.history} />
            </div>
          ))}
        </>
      )}
    </article>
  );
}

export default function CohortScheduleRequestPanel({ cohorts = [], initialCohortId = null, busy = false, onRun }) {
  const [cohortId, setCohortId] = useState(initialCohortId ? String(initialCohortId) : '');
  const selected = cohorts.find((c) => String(c.id) === String(cohortId)) || cohorts[0] || null;
  if (cohorts.length === 0) return null;
  return (
    <section className="course-box">
      <h2>Yêu cầu dời lịch / hủy lớp trống</h2>
      <p className="course-meta">Yêu cầu cần Admin duyệt; không thể dời hoặc hủy lớp đã khai giảng.</p>
      {cohorts.length > 1 && (
        <label className="course-field" style={{ maxWidth: 420 }}>
          <span>Lớp phụ trách</span>
          <select value={selected?.id ?? ''} onChange={(e) => setCohortId(e.target.value)}>
            {cohorts.map((c) => <option key={c.id} value={c.id}>#{c.id} · {c.name} ({c.level})</option>)}
          </select>
        </label>
      )}
      {selected && <CohortRequestForm key={selected.id} cohort={selected} busy={busy} onRun={onRun} />}
    </section>
  );
}
