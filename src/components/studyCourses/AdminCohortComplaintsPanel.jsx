import { useEffect, useState } from 'react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  decideCohortComplaint,
  getCohortComplaint,
  getCohortComplaints,
  openCohortComplaintEvidence,
} from '../../api/studyCourses';
import { describeApiError } from '../../api/apiErrors';
import { ComplaintHistory } from './CohortComplaintPanel';

const date = (v) => (v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');
const categoryLabel = (v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label || v;

// Hàng đợi khiếu nại khóa học: Admin lọc, xem chi tiết + minh chứng + phản hồi Mentor, rồi ra quyết định.
export default function AdminCohortComplaintsPanel({ busy = false, onRun }) {
  const [status, setStatus] = useState('Open');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('Resolved');
  const [decision, setDecision] = useState('');
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getCohortComplaints(status || undefined)
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

  const loadDetail = (id) =>
    getCohortComplaint(id)
      .then(setDetail)
      .catch((e) => setError(describeApiError(e).message));

  const choose = (row) => {
    setSelectedId(row.id);
    setDetail(row);
    setDecision('');
    setDecisionStatus('Resolved');
    loadDetail(row.id);
  };

  const item = detail && detail.id === selectedId ? detail : null;
  const decidable = item && (item.status === 'Open' || item.status === 'UnderReview');

  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>Khiếu nại khóa học</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label="Lọc trạng thái khiếu nại">
          {Object.entries(COMPLAINT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          <option value="">Tất cả</option>
        </select>
      </div>
      <p className="course-meta">
        Yêu cầu xem xét hoàn tiền chỉ là đề nghị của học viên; quyết định hoàn tiền (nếu có) thực hiện theo quy trình riêng, không tự động.
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      {rows.length === 0 ? (
        <p className="course-meta">Không có khiếu nại.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}><th>#</th><th>Lớp</th><th>Loại</th><th>Mentor</th><th>Gửi lúc</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                  <td>{r.id}</td>
                  <td>{r.cohortName || (r.cohortId ? `#${r.cohortId}` : `Khóa #${r.courseId}`)}</td>
                  <td>
                    {categoryLabel(r.category)}
                    {r.refundReviewRequested ? <span className="course-badge warn" style={{ marginLeft: 4 }}>Xin xem xét hoàn tiền</span> : null}
                  </td>
                  <td>{r.mentorName || '—'}</td>
                  <td>{date(r.createdAtUtc)}</td>
                  <td>{COMPLAINT_STATUS_LABELS[r.status] || r.status}</td>
                  <td><button type="button" onClick={() => choose(r)}>Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {item && (
        <div className="course-form">
          <h3>Khiếu nại #{item.id} · {categoryLabel(item.category)} · {COMPLAINT_STATUS_LABELS[item.status] || item.status}</h3>
          <p className="course-meta">
            {item.cohortName || `Khóa #${item.courseId}`} · Mentor: {item.mentorName || 'Không chỉ định'} · Gửi lúc {date(item.createdAtUtc)}
          </p>
          {item.refundReviewRequested && (
            <p className="course-notice">Học viên đề nghị xem xét hoàn tiền / ghi danh – cần đối chiếu giao dịch trước khi quyết định.</p>
          )}
          <p className="course-pre"><strong>Nội dung:</strong> {item.message}</p>
          {item.mentorResponse && <p className="course-pre"><strong>Phản hồi của Mentor:</strong> {item.mentorResponse}</p>}
          {item.decision && <p className="course-pre"><strong>Quyết định ({date(item.decidedAtUtc)}):</strong> {item.decision}</p>}
          {item.hasEvidence && (
            <button type="button" disabled={busy} onClick={() => onRun(() => openCohortComplaintEvidence(item.id), 'Đã mở minh chứng riêng tư.')}>
              Xem minh chứng
            </button>
          )}
          {decidable && (
            <form
              className="course-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!decision.trim()) return;
                onRun(async () => {
                  await decideCohortComplaint(item.id, { status: decisionStatus, decision, expectedRevision: item.revision });
                  setDecision('');
                  setReloadTick((t) => t + 1);
                  await loadDetail(item.id);
                }, 'Đã lưu quyết định và thông báo cho học viên.');
              }}
            >
              <h3>Quyết định của Admin</h3>
              <fieldset disabled={busy}>
                <label className="course-field" style={{ maxWidth: 220 }}>
                  <span>Kết quả</span>
                  <select value={decisionStatus} onChange={(e) => setDecisionStatus(e.target.value)}>
                    <option value="Resolved">{COMPLAINT_STATUS_LABELS.Resolved}</option>
                    <option value="Rejected">{COMPLAINT_STATUS_LABELS.Rejected}</option>
                  </select>
                </label>
                <label className="course-field">
                  <span>Nội dung quyết định (bắt buộc)</span>
                  <textarea required maxLength={2000} value={decision} onChange={(e) => setDecision(e.target.value)} />
                </label>
                <button className="course-primary" type="submit" disabled={!decision.trim()}>Lưu quyết định</button>
              </fieldset>
            </form>
          )}
          <ComplaintHistory history={item.history} />
        </div>
      )}
    </section>
  );
}
