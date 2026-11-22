import { useRef, useState } from 'react';
import { previewMentorReplacement, replaceCohortMentor } from '@/features/cohorts/api/cohortApi';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

// Thay cố vấn chính cho các buổi CÒN LẠI của lớp (khác với cố vấn dạy thay một buổi riêng lẻ).
// Buổi đã diễn ra giữ cố vấn thực dạy, điểm danh và KPI; sĩ số và ghi danh không thay đổi.
export default function AdminMentorReplacementPanel({ cohorts, mentors, busy, onRun }) {
  const { tr, trf } = useLocale();
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
      <h2>{tr('Thay cố vấn chính của lớp')}</h2>
      <p className="course-meta">
        {tr('Chọn lớp → chọn cố vấn thay thế → xem trước tác động → xác nhận. Chỉ các buổi tương lai (đủ thời gian báo trước theo chính sách) được chuyển.')}
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      <div className="course-form">
        <fieldset disabled={busy}>
          <label className="course-field">
            <span>{tr('Lớp')}</span>
            <select value={cohortId} onChange={(e) => { setCohortId(e.target.value); setPreview(null); }}>
              <option value="">{tr('Chọn lớp')}</option>
              {cohorts.filter((c) => c.status === 'Published' || c.status === 'Draft').map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.level} · {trf('Mentor {0}', { 0: c.mentorName || '—' })}</option>
              ))}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('Cố vấn thay thế')}</span>
            <select value={mentorId} onChange={(e) => { setMentorId(e.target.value); setPreview(null); }}>
              <option value="">{tr('Chọn cố vấn')}</option>
              {mentors.filter((m) => m.id !== cohort?.mentorId).map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>)}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('Từ buổi số (để trống = buổi tương lai đầu tiên)')}</span>
            <input type="number" min={1} value={fromSession} onChange={(e) => setFromSession(e.target.value)} />
          </label>
          <button type="button" disabled={!cohortId || !mentorId} onClick={runPreview}>{tr('Xem trước tác động')}</button>
        </fieldset>
      </div>

      {preview && (
        <div className="course-form">
          <h3>
            {preview.name}: {preview.currentMentorName} → {preview.replacementMentorName || `#${preview.replacementMentorId}`}{' '}
            <span className={`course-badge ${preview.eligible ? 'ok' : 'muted'}`}>{preview.eligible ? tr('Có thể thay') : tr('Chưa thể thay')}</span>
          </h3>
          <p className="course-meta">
            {tr('Từ buổi')}{' '}{preview.fromSessionNumber || '—'}{' '}{tr('· Giữ nguyên')}{' '}{preview.impact.retainedSessionCount}{' '}{tr('buổi với cố vấn hiện tại · Chuyển')}{' '}
            {preview.impact.affectedSessionCount}{' '}{tr('buổi ·')}{' '}{preview.impact.activeLearnerCount}{' '}{tr('học viên đang học · Sĩ số')}{' '}{preview.capacity}{' '}{tr('(không đổi)')}
            {preview.policyVersion ? trf(' · chính sách v{0}, báo trước {1} giờ', { 0: preview.policyVersion, 1: preview.leadHours }) : ''}
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {preview.checks.map((c) => (
              <li key={c.code} className="course-meta" style={{ color: c.passed ? '#1e5c36' : '#a42222' }}>{c.passed ? '✓' : '✗'} {tr(c.message)}</li>
            ))}
          </ul>
          {preview.conflicts.length > 0 && (
            <div className="course-error">
              <strong>{tr('Lịch trùng của cố vấn thay thế')}</strong>
              <ul>{preview.conflicts.map((c, i) => <li key={i}>{trf('Buổi {0}: {1} #{2} ({3})', { 0: c.sessionNumber, 1: c.kind, 2: c.conflictId, 3: date(c.startTime) })}</li>)}</ul>
            </div>
          )}
          <div className="course-grid">
            <div>
              <h3>{tr('Giữ nguyên (lịch sử)')}</h3>
              <ul>{preview.retainedSessions.map((s) => <li key={s.number} className="course-meta">{trf('Buổi {0} · {1} · Mentor #{2}', { 0: s.number, 1: date(s.startTime), 2: s.actualMentorId })}</li>)}</ul>
            </div>
            <div>
              <h3>{tr('Chuyển cho cố vấn mới')}</h3>
              <ul>{preview.affectedSessions.map((s) => <li key={s.number} className="course-meta">{trf('Buổi {0} · {1}', { 0: s.number, 1: date(s.startTime) })}</li>)}</ul>
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
                <span>{tr('Lý do thay cố vấn (bắt buộc, 10–1000 ký tự; được lưu kiểm toán)')}</span>
                <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <label><input type="checkbox" required />{' '}{tr('Tôi đã xem tác động và xác nhận thay cố vấn chính')}</label>
              <button className="course-primary" type="submit">{tr('Xác nhận thay cố vấn')}</button>
            </fieldset>
          </form>
          {preview.history.length > 0 && (
            <details>
              <summary>{trf('Lịch sử phân công cố vấn ({0})', { 0: preview.history.length })}</summary>
              <ul>
                {preview.history.map((h) => (
                  <li key={h.id} className="course-meta">
                    {trf('{0} · #{1} → #{2} từ buổi {3} ({4} buổi): {5}', { 0: date(h.createdAtUtc), 1: h.previousMentorId, 2: h.mentorId, 3: h.effectiveFromSessionNumber, 4: h.affectedSessionCount, 5: h.reason })}
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
