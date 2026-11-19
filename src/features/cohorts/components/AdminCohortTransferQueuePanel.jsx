import { useState } from 'react';
import { describeApiError } from '@/api/apiErrors';
import { ContextualEmptyState, SmartDataBoundary } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import {
  approveTransfer,
  getTransferEligibility,
  getTransferRequest,
  getTransferRequests,
  openTransferEvidence,
  rejectTransfer,
} from '@/features/cohorts/api/cohortApi';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Withdrawn: 'Đã rút' };
const ENROLLMENT_STATUS = { Active: 'Đang học', Completed: 'Đã hoàn thành', Transferred: 'Đã chuyển lớp', TransferredOut: 'Đã chuyển sang lớp khác', Cancelled: 'Đã hủy', PendingPayment: 'Chờ thanh toán' };
const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

function Checks({ checks }) {
  const { tr } = useLocale();
  return (
    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
      {checks.map((c) => (
        <li key={c.code} className="course-meta" style={{ color: c.passed ? '#1e5c36' : '#a42222' }}>
          {c.passed ? '✓' : '✗'} {tr(c.message)} <code style={{ fontSize: 11 }}>{c.code}</code>
        </li>
      ))}
    </ul>
  );
}

function CohortCard({ cohort, selected, onSelect }) {
  const { tr, trf } = useLocale();
  return (
    <article className="course-box" style={{ borderColor: selected ? 'var(--color-rp-brand-pressed, #cc4b6b)' : undefined }}>
      <span className="course-badge">{cohort.level}</span>{' '}
      <span className={`course-badge ${cohort.seatsAvailable > 0 ? 'ok' : 'muted'}`}>
        {trf('{0}/{1} học viên · còn {2} chỗ', { 0: cohort.enrolledCount, 1: cohort.capacity, 2: cohort.seatsAvailable })}
      </span>
      <h3 style={{ marginTop: 8 }}>{cohort.name}</h3>
      <p className="course-meta">{trf('Giáo viên: {0} · Khai giảng {1} · Khóa đăng ký {2}', { 0: cohort.mentorName, 1: date(cohort.startsAt), 2: date(cohort.enrollmentClosesAtUtc) })}</p>
      <details>
        <summary>{trf('Lịch {0} buổi', { 0: cohort.sessions.length })}</summary>
        <ul>{cohort.sessions.map((s) => <li key={s.number} className="course-meta">{trf('Buổi {0}: {1}', { 0: s.number, 1: date(s.startTime) })}</li>)}</ul>
      </details>
      {onSelect && (
        <button type="button" onClick={onSelect} className={selected ? 'course-primary' : ''}>
          {selected ? tr('Đang chọn') : tr('Chọn làm lớp đích')}
        </button>
      )}
    </article>
  );
}

// Hàng đợi yêu cầu chuyển lớp: xem chi tiết, tiến độ, lớp đích (sức chứa/lịch) và duyệt/từ chối.
export default function AdminCohortTransferQueuePanel({ busy, initialTransferId = null, onRun }) {
  const { tr, trf } = useLocale();
  const initialIdNum = initialTransferId ? Number(initialTransferId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Pending');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [detail, setDetail] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [note, setNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const query = useAsyncResource(
    () => getTransferRequests(status || undefined),
    [status],
  );
  const rows = Array.isArray(query.data) ? query.data : [];

  const loadList = () => query.refetch();
  const loadDetail = (id) =>
    getTransferRequest(id)
      .then((d) => {
        setError('');
        setDetail(d);
        const t = d.request.targetCohortId || d.request.requestedTargetCohortId || null;
        setTargetId(t);
        setEligibility(d.eligibility ? { ...d.eligibility, targetCohortId: t } : null);
      })
      .catch((e) => setError(describeApiError(e).message));

  const [loadedInitialId, setLoadedInitialId] = useState(null);
  if (initialIdNum && loadedInitialId !== initialIdNum) {
    setLoadedInitialId(initialIdNum);
    loadDetail(initialIdNum);
  }

  const choose = (cohortId) => {
    setTargetId(cohortId);
    setEligibility(null);
    setError('');
    getTransferEligibility(selectedId, cohortId).then(setEligibility).catch((e) => setError(describeApiError(e).message));
  };

  const request = detail?.request;
  return (
    <section className="course-box">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <h2>{tr('Yêu cầu chuyển lớp của học viên')}</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label={tr('Lọc trạng thái')}>
          <option value="Pending">{tr('Chờ duyệt')}</option>
          <option value="Approved">{tr('Đã duyệt')}</option>
          <option value="Rejected">{tr('Từ chối')}</option>
          <option value="Withdrawn">{tr('Đã rút')}</option>
          <option value="">{tr('Tất cả')}</option>
        </select>
      </div>
      <p className="course-meta">
        {tr('Học viên không thể tự đổi lớp hoặc Giáo viên. Máy chủ kiểm tra lại toàn bộ điều kiện khi duyệt; chuyển vào lớp đã khai giảng chưa được hỗ trợ.')}
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải yêu cầu chuyển lớp')}
        errorTitle={tr('Chưa tải được hàng đợi chuyển lớp')}
        compact
        diagnosticScope="AdminCohortTransferQueuePanel"
        empty={<ContextualEmptyState compact context="adminQueue" title={tr('Không có yêu cầu chuyển lớp.')} />}
      >
        {(list) => (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}><th>#</th><th>{tr('Học viên')}</th><th>{tr('Lớp nguồn')}</th><th>{tr('Đề xuất')}</th><th>{tr('Gửi lúc')}</th><th>{tr('Trạng thái')}</th><th /></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                  <td>{r.id}</td><td>{r.learnerName}</td><td>{r.sourceCohortName}</td>
                  <td>{r.requestedTargetCohortName || tr('Admin chọn')}</td><td>{date(r.createdAtUtc)}</td><td>{tr(STATUS[r.status] || r.status)}</td>
                  <td>
                    <button type="button" onClick={() => { setSelectedId(r.id); setNote(''); setRejectReason(''); loadDetail(r.id); }}>Xem</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SmartDataBoundary>

      {rows.length > 0 && request && request.id === selectedId && (
        <div className="course-form">
          <h3>{tr('Yêu cầu #')}{request.id} · {request.learnerName} · {tr(STATUS[request.status] || request.status)}</h3>
          <p className="course-pre"><strong>{tr('Lý do:')}</strong> {tr(request.reason)}</p>
          {request.hasEvidence && (
            <button type="button" disabled={busy} onClick={() => onRun(() => openTransferEvidence(request.id), 'Đã mở minh chứng riêng tư.')}>
              {tr('Xem minh chứng')}
            </button>
          )}
          {detail.sourceEnrollment && (
            <p className="course-meta">
              {trf('Ghi danh hiện tại ({1}) · Có mặt {2}/{3} buổi · Vắng {4} · Còn {5} buổi · Bài tập đã nộp {6}/{7}', { 1: tr(ENROLLMENT_STATUS[detail.sourceEnrollment.status] || 'Khác'), 2: detail.sourceEnrollment.progress.attended, 3: detail.sourceEnrollment.progress.totalSessions, 4: detail.sourceEnrollment.progress.absent, 5: detail.sourceEnrollment.progress.upcoming, 6: detail.sourceEnrollment.progress.homeworkSubmitted, 7: detail.sourceEnrollment.progress.homeworkAssigned })}
            </p>
          )}
          {detail.sourceCohort && <CohortCard cohort={detail.sourceCohort} />}
          {request.status === 'Pending' && (
            <>
              <h3 style={{ marginTop: 14 }}>{tr('Lớp đích phù hợp (cùng cấp độ, chưa khai giảng)')}</h3>
              {detail.candidateCohorts.length === 0 ? (
                <p className="course-meta">{tr('Không có lớp đích phù hợp.')}</p>
              ) : (
                <div className="course-grid">
                  {detail.candidateCohorts.map((c) => (
                    <CohortCard key={c.id} cohort={c} selected={c.id === targetId} onSelect={() => choose(c.id)} />
                  ))}
                </div>
              )}
              {eligibility && (
                <div className={eligibility.eligible ? 'course-notice' : 'course-error'}>
                  <strong>{eligibility.eligible ? tr('Đủ điều kiện chuyển') : tr('Chưa đủ điều kiện chuyển')}</strong>
                  {eligibility.policyVersion ? trf(' · chính sách v{0}', { 0: eligibility.policyVersion }) : ''}
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
                  <label className="course-field"><span>{tr('Ghi chú duyệt (không bắt buộc)')}</span><input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></label>
                  <button className="course-primary" type="submit">{tr('Duyệt chuyển lớp')}</button>
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
                  <label className="course-field"><span>{tr('Lý do từ chối (bắt buộc)')}</span><textarea required maxLength={1000} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></label>
                  <button type="submit">{tr('Từ chối')}</button>
                </fieldset>
              </form>
            </>
          )}
          {request.decisionNote && <p className="course-pre"><strong>{tr('Quyết định:')}</strong> {request.decisionNote}</p>}
          <details open>
            <summary>{tr('Lịch sử kiểm toán')}</summary>
            <ul>{request.history.map((h, i) => <li key={i} className="course-meta">{date(h.atUtc)} · {h.actorRole} · {h.action}: {h.detail}</li>)}</ul>
          </details>
        </div>
      )}
    </section>
  );
}
