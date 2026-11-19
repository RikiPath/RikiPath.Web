import { useRef, useState } from 'react';
import { getTransferRequests, requestCohortTransfer, withdrawTransfer } from '@/features/cohorts/api/cohortApi';
import { ContextualEmptyState, SmartDataBoundary } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS = {
  Pending: ['Chờ Admin xem xét', 'warn'],
  Approved: ['Đã duyệt chuyển lớp', 'ok'],
  Rejected: ['Bị từ chối', 'muted'],
  Withdrawn: ['Đã rút yêu cầu', 'muted'],
};
const ACTION = { Requested: 'Gửi yêu cầu', Approved: 'Admin duyệt', Rejected: 'Admin từ chối', Withdrawn: 'Học viên rút yêu cầu' };
const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

// Học viên KHÔNG tự đổi lớp/Mentor: chỉ gửi yêu cầu để Admin xem xét.
// Phản hồi/đánh giá Mentor và khiếu nại là luồng riêng; điểm đánh giá thấp không tự tạo yêu cầu chuyển lớp.
export default function LearnerCohortTransferPanel({ course, cohorts, busy, onRun }) {
  const { tr, trf } = useLocale();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const keyRef = useRef(null);
  const fileRef = useRef(null);

  const query = useAsyncResource(
    async () => {
      const rows = await getTransferRequests();
      return (Array.isArray(rows) ? rows : []).filter((r) => r.sourceCourseId === course.id || r.destinationCourseId === course.id);
    },
    [course.id],
    { enabled: Boolean(course?.id) },
  );
  const requests = Array.isArray(query.data) ? query.data : [];

  const pending = requests.find((r) => r.status === 'Pending' && r.sourceCourseId === course.id);
  const canRequest = course.cohortId && course.status === 'Active' && course.paymentStatus === 'Paid' && !pending;
  // Danh sách lớp của Học viên do máy chủ trả về đã chỉ gồm lớp chưa khai giảng; máy chủ kiểm tra lại toàn bộ khi Admin duyệt.
  const candidates = cohorts.filter((c) => c.id !== course.cohortId && c.level === course.level);

  return (
    <section className="course-box" aria-labelledby={`transfer-${course.id}`}>
      <h2 id={`transfer-${course.id}`}>{tr('Yêu cầu chuyển lớp')}</h2>
      <p className="course-meta">
        {tr('Giáo viên chính hiện tại:')}{' '}<strong>{course.mentorName || tr('Chưa phân công')}</strong>{' '}{tr('· Lớp hiện tại:')}{' '}<strong>{course.cohortName || tr('Lớp đang học')}</strong>{tr('. Việc chuyển lớp cần Admin xem xét sức chứa, lịch học, cấp độ và chính sách; lịch sử điểm danh, bài tập về nhà và nhận xét của bạn được giữ nguyên.')}
      </p>
      <p className="course-meta">
        {tr('Muốn góp ý hoặc đánh giá Giáo viên? Hãy dùng mục phản hồi/khiếu nại riêng — đánh giá Giáo viên không tự động tạo yêu cầu chuyển lớp.')}
      </p>

      {course.status === 'Transferred' && (
        <p className="course-notice">{tr('Ghi danh này đã được chuyển sang lớp mới. Các buổi tương lai ở lớp cũ không còn quyền vào phòng học.')}</p>
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
              query.refetch();
            }, 'Đã gửi yêu cầu chuyển lớp. Admin sẽ xem xét và thông báo kết quả.');
          }}
        >
          <h3>{tr('Gửi yêu cầu chuyển lớp')}</h3>
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>{tr('Lớp muốn chuyển đến (không bắt buộc)')}</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">{tr('Nhờ Admin chọn lớp phù hợp')}</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.seatsAvailable <= 0}>
                    {trf('{0} · {1} · khai giảng {2} · còn {3}/{4} chỗ', { 0: c.name, 1: c.mentorName, 2: date(c.startsAt), 3: c.seatsAvailable, 4: c.capacity })}
                  </option>
                ))}
              </select>
            </label>
            <label className="course-field" style={{ flexBasis: '100%' }}>
              <span>{tr('Lý do chuyển lớp (bắt buộc, 10–1000 ký tự)')}</span>
              <textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <label className="course-field">
              <span>{tr('Minh chứng (PDF/PNG/JPG ≤ 10 MB, không bắt buộc)')}</span>
              <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" />
            </label>
            <button className="course-primary" type="submit">{tr('Gửi yêu cầu')}</button>
          </fieldset>
        </form>
      )}

      <SmartDataBoundary
        query={query}
        isEmpty={(rows) => !Array.isArray(rows) || rows.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu chuyển lớp')}
        errorTitle={tr('Chưa tải được yêu cầu chuyển lớp')}
        compact
        diagnosticScope="LearnerCohortTransferPanel"
        empty={<ContextualEmptyState compact title={tr('Chưa có yêu cầu chuyển lớp nào.')} description={tr('Bạn có thể gửi yêu cầu chuyển lớp ở biểu mẫu phía trên khi cần hỗ trợ.')} />}
      >
        {(list) =>
          list.map((r) => {
            const [label, tone] = STATUS[r.status] || [r.status, 'muted'];
            return (
              <article className="course-row" key={r.id}>
                <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                  <h3>{tr('Yêu cầu chuyển lớp')} <span className={`course-badge ${tone}`}>{tr(label)}</span></h3>
                  <span className="course-meta">{trf('Gửi lúc {0}', { 0: date(r.createdAtUtc) })}</span>
                </div>
                <p className="course-meta">
                  {tr('Từ lớp:')}{' '}{r.sourceCohortName || tr('Lớp hiện tại')} → {r.targetCohortName || r.requestedTargetCohortName || tr('Admin chọn lớp')}
                </p>
                <p className="course-pre"><strong>{tr('Lý do:')}</strong> {tr(r.reason)}</p>
                {r.status === 'Rejected' && r.decisionNote && (
                  <p className="course-error"><strong>{tr('Lý do từ chối:')}</strong> {r.decisionNote}</p>
                )}
                {r.status === 'Approved' && (
                  <p className="course-notice">{r.targetCohortName ? trf('Đã chuyển sang lớp {0}.', { 0: r.targetCohortName }) : tr('Đã chuyển sang lớp mới.')}</p>
                )}
                <details>
                  <summary>{tr('Lịch sử yêu cầu')}</summary>
                  <ul>
                    {r.history.map((h, i) => (
                      <li key={i} className="course-meta">{date(h.atUtc)} · {tr(ACTION[h.action] || h.action)}: {h.detail}</li>
                    ))}
                  </ul>
                </details>
                {r.status === 'Pending' && (
                  <button type="button" disabled={busy} onClick={() => onRun(async () => { await withdrawTransfer(r.id); query.refetch(); }, 'Đã rút yêu cầu chuyển lớp.')}>
                    {tr('Rút yêu cầu')}
                  </button>
                )}
              </article>
            );
          })
        }
      </SmartDataBoundary>
    </section>
  );
}
