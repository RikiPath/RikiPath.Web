import { useEffect, useState } from 'react';
import {
  approveTransfer,
  getTransferEligibility,
  getTransferRequest,
  getTransferRequests,
  openTransferEvidence,
  rejectTransfer,
} from '../../api/studyCourses';

const STATUS = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Withdrawn: 'Đã rút' };
const date = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

function Checks({ checks }) {
  return (
    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
      {checks.map((c) => (
        <li key={c.code} className="course-meta" style={{ color: c.passed ? '#1e5c36' : '#a42222' }}>
          {c.passed ? '✓' : '✗'} {c.message} <code style={{ fontSize: 11 }}>{c.code}</code>
        </li>
      ))}
    </ul>
  );
}

function CohortCard({ cohort, selected, onSelect }) {
  return (
    <article className="course-box" style={{ borderColor: selected ? '#ad3155' : undefined }}>
      <span className="course-badge">{cohort.level}</span>{' '}
      <span className={`course-badge ${cohort.seatsAvailable > 0 ? 'ok' : 'muted'}`}>
        {cohort.enrolledCount}/{cohort.capacity} học viên · còn {cohort.seatsAvailable} chỗ
      </span>
      <h3 style={{ marginTop: 8 }}>{cohort.name}</h3>
      <p className="course-meta">Mentor: {cohort.mentorName} · Khai giảng {date(cohort.startsAt)} · Khóa đăng ký {date(cohort.enrollmentClosesAtUtc)}</p>
      <details>
        <summary>Lịch {cohort.sessions.length} buổi</summary>
        <ul>{cohort.sessions.map((s) => <li key={s.number} className="course-meta">Buổi {s.number}: {date(s.startTime)}</li>)}</ul>
      </details>
      {onSelect && (
        <button type="button" onClick={onSelect} className={selected ? 'course-primary' : ''}>
          {selected ? 'Đang chọn' : 'Chọn làm lớp đích'}
        </button>
      )}
    </article>
  );
}

// Hàng đợi yêu cầu chuyển lớp: xem chi tiết, tiến độ, lớp đích (sức chứa/lịch) và duyệt/từ chối.
export default function AdminCohortTransferQueuePanel({ busy, onRun }) {
  const [status, setStatus] = useState('Pending');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const loadList = (s = status) =>
    getTransferRequests(s || undefined).then(setRows).catch((e) => setError(e.message));
  const loadDetail = (id) =>
    getTransferRequest(id)
      .then((d) => {
        setDetail(d);
        const t = d.request.targetCohortId || d.request.requestedTargetCohortId || null;
        setTargetId(t);
        setEligibility(d.eligibility ? { ...d.eligibility, targetCohortId: t } : null);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    let alive = true;
    getTransferRequests(status || undefined)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [status]);

  const choose = (cohortId) => {
    setTargetId(cohortId);
    setEligibility(null);
    getTransferEligibility(selectedId, cohortId).then(setEligibility).catch((e) => setError(e.message));
  };

  const request = detail?.request;
  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>Yêu cầu chuyển lớp của học viên</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label="Lọc trạng thái">
          <option value="Pending">Chờ duyệt</option>
          <option value="Approved">Đã duyệt</option>
          <option value="Rejected">Từ chối</option>
          <option value="Withdrawn">Đã rút</option>
          <option value="">Tất cả</option>
        </select>
      </div>
      <p className="course-meta">
        Học viên không thể tự đổi lớp hoặc Mentor. Máy chủ kiểm tra lại toàn bộ điều kiện khi duyệt; chuyển vào lớp đã khai giảng chưa được hỗ trợ.
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      {rows.length === 0 ? (
        <p className="course-meta">Không có yêu cầu.</p>
      ) : (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}><th>#</th><th>Học viên</th><th>Lớp nguồn</th><th>Đề xuất</th><th>Gửi lúc</th><th>Trạng thái</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                <td>{r.id}</td><td>{r.learnerName}</td><td>{r.sourceCohortName}</td>
                <td>{r.requestedTargetCohortName || 'Admin chọn'}</td><td>{date(r.createdAtUtc)}</td><td>{STATUS[r.status] || r.status}</td>
                <td>
                  <button type="button" onClick={() => { setSelectedId(r.id); setNote(''); setRejectReason(''); loadDetail(r.id); }}>Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {request && request.id === selectedId && (
        <div className="course-form">
          <h3>Yêu cầu #{request.id} · {request.learnerName} · {STATUS[request.status] || request.status}</h3>
          <p className="course-pre"><strong>Lý do:</strong> {request.reason}</p>
          {request.hasEvidence && (
            <button type="button" disabled={busy} onClick={() => onRun(() => openTransferEvidence(request.id), 'Đã mở minh chứng riêng tư.')}>
              Xem minh chứng
            </button>
          )}
          {detail.sourceEnrollment && (
            <p className="course-meta">
              Ghi danh nguồn #{detail.sourceEnrollment.id} ({detail.sourceEnrollment.status}) · Có mặt {detail.sourceEnrollment.progress.attended}/
              {detail.sourceEnrollment.progress.totalSessions} buổi · Vắng {detail.sourceEnrollment.progress.absent} · Còn {detail.sourceEnrollment.progress.upcoming} buổi
              · BTVN đã nộp {detail.sourceEnrollment.progress.homeworkSubmitted}/{detail.sourceEnrollment.progress.homeworkAssigned}
            </p>
          )}
          {detail.sourceCohort && <CohortCard cohort={detail.sourceCohort} />}
          {request.status === 'Pending' && (
            <>
              <h3 style={{ marginTop: 14 }}>Lớp đích phù hợp (cùng cấp độ, chưa khai giảng)</h3>
              {detail.candidateCohorts.length === 0 ? (
                <p className="course-meta">Không có lớp đích phù hợp.</p>
              ) : (
                <div className="course-grid">
                  {detail.candidateCohorts.map((c) => (
                    <CohortCard key={c.id} cohort={c} selected={c.id === targetId} onSelect={() => choose(c.id)} />
                  ))}
                </div>
              )}
              {eligibility && (
                <div className={eligibility.eligible ? 'course-notice' : 'course-error'}>
                  <strong>{eligibility.eligible ? 'Đủ điều kiện chuyển' : 'Chưa đủ điều kiện chuyển'}</strong>
                  {eligibility.policyVersion ? ` · chính sách v${eligibility.policyVersion}` : ''}
                  <Checks checks={eligibility.checks} />
                </div>
              )}
              <form
                className="course-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onRun(async () => {
                    await approveTransfer(request.id, { targetCohortId: targetId, note, expectedRevision: request.revision });
                    await loadList();
                    await loadDetail(request.id);
                  }, 'Đã duyệt chuyển lớp; ghi danh được cập nhật và thông báo sẽ gửi sau khi lưu.');
                }}
              >
                <fieldset disabled={busy || !targetId || (eligibility && !eligibility.eligible)}>
                  <label className="course-field"><span>Ghi chú duyệt (không bắt buộc)</span><input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></label>
                  <button className="course-primary" type="submit">Duyệt chuyển lớp</button>
                </fieldset>
              </form>
              <form
                className="course-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onRun(async () => {
                    await rejectTransfer(request.id, rejectReason, request.revision);
                    await loadList();
                    await loadDetail(request.id);
                  }, 'Đã từ chối yêu cầu và gửi lý do cho học viên.');
                }}
              >
                <fieldset disabled={busy}>
                  <label className="course-field"><span>Lý do từ chối (bắt buộc)</span><textarea required maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></label>
                  <button type="submit">Từ chối</button>
                </fieldset>
              </form>
            </>
          )}
          {request.decisionNote && <p className="course-pre"><strong>Quyết định:</strong> {request.decisionNote}</p>}
          <details open>
            <summary>Lịch sử kiểm toán</summary>
            <ul>{request.history.map((h, i) => <li key={i} className="course-meta">{date(h.atUtc)} · {h.actorRole} · {h.action}: {h.detail}</li>)}</ul>
          </details>
        </div>
      )}
    </section>
  );
}
