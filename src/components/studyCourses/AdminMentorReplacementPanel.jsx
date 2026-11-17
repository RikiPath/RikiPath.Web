import { useRef, useState } from 'react';
import { previewMentorReplacement, replaceCohortMentor } from '../../api/studyCourses';

const date = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

// Thay cố vấn chính cho các buổi CÒN LẠI của lớp (khác với cố vấn dạy thay một buổi riêng lẻ).
// Buổi đã diễn ra giữ cố vấn thực dạy, điểm danh và KPI; sĩ số và ghi danh không thay đổi.
export default function AdminMentorReplacementPanel({ cohorts, mentors, busy, onRun }) {
  const [cohortId, setCohortId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [fromSession, setFromSession] = useState('');
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const keyRef = useRef(null);
  const cohort = cohorts.find((c) => c.id === Number(cohortId));

  const runPreview = () => {
    setError('');
    setPreview(null);
    keyRef.current = null;
    previewMentorReplacement(Number(cohortId), Number(mentorId), fromSession ? Number(fromSession) : null)
      .then(setPreview)
      .catch((e) => setError(e.message));
  };

  return (
    <section className="course-box">
      <h2>Thay cố vấn chính của lớp</h2>
      <p className="course-meta">
        Chọn lớp → chọn cố vấn thay thế → xem trước tác động → xác nhận. Chỉ các buổi tương lai (đủ thời gian báo trước theo chính sách) được chuyển.
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      <div className="course-form">
        <fieldset disabled={busy}>
          <label className="course-field">
            <span>Lớp</span>
            <select value={cohortId} onChange={(e) => { setCohortId(e.target.value); setPreview(null); }}>
              <option value="">Chọn lớp</option>
              {cohorts.filter((c) => c.status === 'Published' || c.status === 'Draft').map((c) => (
                <option key={c.id} value={c.id}>#{c.id} {c.name} · {c.level} · Mentor {c.mentorName}</option>
              ))}
            </select>
          </label>
          <label className="course-field">
            <span>Cố vấn thay thế</span>
            <select value={mentorId} onChange={(e) => { setMentorId(e.target.value); setPreview(null); }}>
              <option value="">Chọn cố vấn</option>
              {mentors.filter((m) => m.id !== cohort?.mentorId).map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>)}
            </select>
          </label>
          <label className="course-field">
            <span>Từ buổi số (để trống = buổi tương lai đầu tiên)</span>
            <input type="number" min={1} value={fromSession} onChange={(e) => setFromSession(e.target.value)} />
          </label>
          <button type="button" disabled={!cohortId || !mentorId} onClick={runPreview}>Xem trước tác động</button>
        </fieldset>
      </div>

      {preview && (
        <div className="course-form">
          <h3>
            {preview.name}: {preview.currentMentorName} → {preview.replacementMentorName || `#${preview.replacementMentorId}`}{' '}
            <span className={`course-badge ${preview.eligible ? 'ok' : 'muted'}`}>{preview.eligible ? 'Có thể thay' : 'Chưa thể thay'}</span>
          </h3>
          <p className="course-meta">
            Từ buổi {preview.fromSessionNumber || '—'} · Giữ nguyên {preview.impact.retainedSessionCount} buổi với cố vấn hiện tại · Chuyển{' '}
            {preview.impact.affectedSessionCount} buổi · {preview.impact.activeLearnerCount} học viên đang học · Sĩ số {preview.capacity} (không đổi)
            {preview.policyVersion ? ` · chính sách v${preview.policyVersion}, báo trước ${preview.leadHours} giờ` : ''}
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {preview.checks.map((c) => (
              <li key={c.code} className="course-meta" style={{ color: c.passed ? '#1e5c36' : '#a42222' }}>{c.passed ? '✓' : '✗'} {c.message}</li>
            ))}
          </ul>
          {preview.conflicts.length > 0 && (
            <div className="course-error">
              <strong>Lịch trùng của cố vấn thay thế</strong>
              <ul>{preview.conflicts.map((c, i) => <li key={i}>Buổi {c.sessionNumber}: {c.kind} #{c.conflictId} ({date(c.startTime)})</li>)}</ul>
            </div>
          )}
          <div className="course-grid">
            <div>
              <h3>Giữ nguyên (lịch sử)</h3>
              <ul>{preview.retainedSessions.map((s) => <li key={s.number} className="course-meta">Buổi {s.number} · {date(s.startTime)} · Mentor #{s.actualMentorId}</li>)}</ul>
            </div>
            <div>
              <h3>Chuyển cho cố vấn mới</h3>
              <ul>{preview.affectedSessions.map((s) => <li key={s.number} className="course-meta">Buổi {s.number} · {date(s.startTime)}</li>)}</ul>
            </div>
          </div>
          <form
            className="course-form"
            onSubmit={(e) => {
              e.preventDefault();
              keyRef.current ||= crypto.randomUUID();
              onRun(async () => {
                await replaceCohortMentor(preview.cohortId, {
                  mentorId: preview.replacementMentorId,
                  reason,
                  idempotencyKey: keyRef.current,
                  expectedCohortRevision: preview.revision,
                  fromSessionNumber: fromSession ? Number(fromSession) : null,
                });
                keyRef.current = null;
                setReason('');
                setPreview(null);
              }, 'Đã thay cố vấn chính cho các buổi còn lại; học viên và cố vấn sẽ nhận thông báo.');
            }}
          >
            <fieldset disabled={busy || !preview.eligible}>
              <label className="course-field" style={{ flexBasis: '100%' }}>
                <span>Lý do thay cố vấn (bắt buộc, 10–1000 ký tự; được lưu kiểm toán)</span>
                <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <label><input type="checkbox" required /> Tôi đã xem tác động và xác nhận thay cố vấn chính</label>
              <button className="course-primary" type="submit">Xác nhận thay cố vấn</button>
            </fieldset>
          </form>
          {preview.history.length > 0 && (
            <details>
              <summary>Lịch sử phân công cố vấn ({preview.history.length})</summary>
              <ul>
                {preview.history.map((h) => (
                  <li key={h.id} className="course-meta">
                    {date(h.createdAtUtc)} · #{h.previousMentorId} → #{h.mentorId} từ buổi {h.effectiveFromSessionNumber} ({h.affectedSessionCount} buổi): {h.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
