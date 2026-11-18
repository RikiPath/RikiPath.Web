import { useEffect, useRef, useState } from 'react';
import { getTransferRequests, requestCohortTransfer, withdrawTransfer } from '../../api/studyCourses';

const STATUS = {
  Pending: ['Chờ Admin xem xét', 'warn'],
  Approved: ['Đã duyệt chuyển lớp', 'ok'],
  Rejected: ['Bị từ chối', 'muted'],
  Withdrawn: ['Đã rút yêu cầu', 'muted'],
};
const ACTION = { Requested: 'Gửi yêu cầu', Approved: 'Admin duyệt', Rejected: 'Admin từ chối', Withdrawn: 'Học viên rút yêu cầu' };
const date = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

// Học viên KHÔNG tự đổi lớp/Mentor: chỉ gửi yêu cầu để Admin xem xét.
// Phản hồi/đánh giá Mentor và khiếu nại là luồng riêng; điểm đánh giá thấp không tự tạo yêu cầu chuyển lớp.
export default function LearnerCohortTransferPanel({ course, cohorts, busy, onRun }) {
  const [requests, setRequests] = useState([]);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [loadError, setLoadError] = useState('');
  const keyRef = useRef(null);
  const fileRef = useRef(null);

  const refresh = () =>
    getTransferRequests()
      .then((rows) => {
        setRequests(rows.filter((r) => r.sourceCourseId === course.id || r.destinationCourseId === course.id));
        setLoadError('');
      })
      .catch((e) => setLoadError(e.message));

  useEffect(() => {
    let alive = true;
    getTransferRequests()
      .then((rows) => alive && setRequests(rows.filter((r) => r.sourceCourseId === course.id || r.destinationCourseId === course.id)))
      .catch((e) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, [course.id]);

  const pending = requests.find((r) => r.status === 'Pending' && r.sourceCourseId === course.id);
  const canRequest = course.cohortId && course.status === 'Active' && course.paymentStatus === 'Paid' && !pending;
  // Danh sách lớp của Học viên do máy chủ trả về đã chỉ gồm lớp chưa khai giảng; máy chủ kiểm tra lại toàn bộ khi Admin duyệt.
  const candidates = cohorts.filter((c) => c.id !== course.cohortId && c.level === course.level);

  return (
    <section className="course-box" aria-labelledby={`transfer-${course.id}`}>
      <h2 id={`transfer-${course.id}`}>Yêu cầu chuyển lớp</h2>
      <p className="course-meta">
        Mentor chính hiện tại: <strong>{course.mentorName || 'Chưa phân công'}</strong> · Lớp hiện tại #{course.cohortId}. Việc chuyển lớp cần Admin xem xét
        sức chứa, lịch học, cấp độ và chính sách; lịch sử điểm danh, BTVN và nhận xét của bạn được giữ nguyên.
      </p>
      <p className="course-meta">
        Muốn góp ý hoặc đánh giá Mentor? Hãy dùng mục phản hồi/khiếu nại riêng — đánh giá Mentor không tự động tạo yêu cầu chuyển lớp.
      </p>
      {loadError && <p role="alert" className="course-error">{loadError}</p>}

      {course.status === 'Transferred' && (
        <p className="course-notice">Ghi danh này đã được chuyển sang lớp mới. Các buổi tương lai ở lớp cũ không còn quyền vào phòng học.</p>
      )}

      {canRequest && (
        <form
          className="course-form"
          onSubmit={(e) => {
            e.preventDefault();
            keyRef.current ||= crypto.randomUUID();
            const evidence = fileRef.current?.files?.[0];
            onRun(async () => {
              await requestCohortTransfer(course.id, { targetCohortId: target || null, reason, evidence, idempotencyKey: keyRef.current });
              keyRef.current = null;
              setReason('');
              setTarget('');
              if (fileRef.current) fileRef.current.value = '';
              await refresh();
            }, 'Đã gửi yêu cầu chuyển lớp. Admin sẽ xem xét và thông báo kết quả.');
          }}
        >
          <h3>Gửi yêu cầu chuyển lớp</h3>
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>Lớp muốn chuyển đến (không bắt buộc)</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Nhờ Admin chọn lớp phù hợp</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.seatsAvailable <= 0}>
                    {c.name} · {c.mentorName} · khai giảng {date(c.startsAt)} · còn {c.seatsAvailable}/{c.capacity} chỗ
                  </option>
                ))}
              </select>
            </label>
            <label className="course-field" style={{ flexBasis: '100%' }}>
              <span>Lý do chuyển lớp (bắt buộc, 10–1000 ký tự)</span>
              <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <label className="course-field">
              <span>Minh chứng (PDF/PNG/JPG ≤ 10 MB, không bắt buộc)</span>
              <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" />
            </label>
            <button className="course-primary" type="submit">Gửi yêu cầu</button>
          </fieldset>
        </form>
      )}

      {requests.length === 0 ? (
        <p className="course-meta" style={{ marginTop: 10 }}>Chưa có yêu cầu chuyển lớp nào.</p>
      ) : (
        requests.map((r) => {
          const [label, tone] = STATUS[r.status] || [r.status, 'muted'];
          return (
            <article className="course-row" key={r.id}>
              <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                <h3>Yêu cầu #{r.id} <span className={`course-badge ${tone}`}>{label}</span></h3>
                <span className="course-meta">Gửi lúc {date(r.createdAtUtc)}</span>
              </div>
              <p className="course-meta">
                Từ lớp: {r.sourceCohortName || `#${r.sourceCohortId}`} → {r.targetCohortName || r.requestedTargetCohortName || 'Admin chọn lớp'}
              </p>
              <p className="course-pre"><strong>Lý do:</strong> {r.reason}</p>
              {r.status === 'Rejected' && r.decisionNote && (
                <p className="course-error"><strong>Lý do từ chối:</strong> {r.decisionNote}</p>
              )}
              {r.status === 'Approved' && (
                <p className="course-notice">Đã chuyển sang {r.targetCohortName || `lớp #${r.targetCohortId}`} (ghi danh mới #{r.destinationCourseId}).</p>
              )}
              <details>
                <summary>Lịch sử yêu cầu</summary>
                <ul>
                  {r.history.map((h, i) => (
                    <li key={i} className="course-meta">{date(h.atUtc)} · {ACTION[h.action] || h.action}: {h.detail}</li>
                  ))}
                </ul>
              </details>
              {r.status === 'Pending' && (
                <button type="button" disabled={busy} onClick={() => onRun(async () => { await withdrawTransfer(r.id); await refresh(); }, 'Đã rút yêu cầu chuyển lớp.')}>
                  Rút yêu cầu
                </button>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
