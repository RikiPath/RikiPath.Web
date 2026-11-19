import { useState } from 'react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  decideCohortComplaint,
  getCohortComplaint,
  getCohortComplaints,
  openCohortComplaintEvidence,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import { ContextualEmptyState, SmartDataBoundary } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { ComplaintHistory } from './CohortComplaintPanel';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const categoryLabel = (v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label || v;

// Hàng đợi khiếu nại khóa học: Admin lọc, xem chi tiết + minh chứng + phản hồi Mentor, rồi ra quyết định.
export default function AdminCohortComplaintsPanel({ busy = false, initialComplaintId = null, onRun }) {
  const { tr, trf } = useLocale();
  const initialIdNum = initialComplaintId ? Number(initialComplaintId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Open');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [detail, setDetail] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('Resolved');
  const [decision, setDecision] = useState('');
  const [error, setError] = useState('');

  const query = useAsyncResource(
    () => getCohortComplaints(status || undefined),
    [status],
  );
  const setReloadTick = (fn) => {
    void fn;
    query.refetch();
  };

  const loadDetail = (id) =>
    getCohortComplaint(id)
      .then((d) => {
        setError('');
        setDetail(d);
      })
      .catch((e) => setError(describeApiError(e).message));

  const [loadedInitialId, setLoadedInitialId] = useState(null);
  if (initialIdNum && loadedInitialId !== initialIdNum) {
    setLoadedInitialId(initialIdNum);
    loadDetail(initialIdNum);
  }

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
        <h2>{tr('Khiếu nại khóa học')}</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }} aria-label={tr('Lọc trạng thái khiếu nại')}>
          {Object.entries(COMPLAINT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          <option value="">{tr('Tất cả')}</option>
        </select>
      </div>
      <p className="course-meta">
        {tr('Yêu cầu xem xét hoàn tiền chỉ là đề nghị của học viên; quyết định hoàn tiền (nếu có) thực hiện theo quy trình riêng, không tự động.')}
      </p>
      {error && <p role="alert" className="course-error">{error}</p>}
      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải danh sách khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="AdminCohortComplaintsPanel"
        empty={<ContextualEmptyState compact context="adminQueue" title={tr('Không có khiếu nại.')} />}
      >
        {(rows) => (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}><th>#</th><th>{tr('Lớp')}</th><th>{tr('Loại')}</th><th>{tr('Giáo viên')}</th><th>{tr('Gửi lúc')}</th><th>{tr('Trạng thái')}</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0e3e8', background: r.id === selectedId ? '#fff8fb' : undefined }}>
                    <td>{r.id}</td>
                    <td>{r.cohortName || (r.cohortId ? `#${r.cohortId}` : trf('Khóa #{0}', { 0: r.courseId }))}</td>
                    <td>
                      {categoryLabel(r.category)}
                      {r.refundReviewRequested ? <span className="course-badge warn" style={{ marginLeft: 4 }}>{tr('Xin xem xét hoàn tiền')}</span> : null}
                    </td>
                    <td>{r.mentorName || '—'}</td>
                    <td>{date(r.createdAtUtc)}</td>
                    <td>{tr(COMPLAINT_STATUS_LABELS[r.status] || r.status)}</td>
                    <td><button type="button" onClick={() => choose(r)}>{tr('Xem')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SmartDataBoundary>

      {item && (
        <div className="course-form">
          <h3>{tr('Khiếu nại #')}{item.id} · {categoryLabel(item.category)} · {tr(COMPLAINT_STATUS_LABELS[item.status] || item.status)}</h3>
          <p className="course-meta">
            {item.cohortName || trf('Khóa #{0}', { 0: item.courseId })} · {tr('Giáo viên:')} {item.mentorName || tr('Không chỉ định')}{' '}{tr('· Gửi lúc')}{' '}{date(item.createdAtUtc)}
          </p>
          {item.refundReviewRequested && (
            <p className="course-notice">{tr('Học viên đề nghị xem xét hoàn tiền / ghi danh – cần đối chiếu giao dịch trước khi quyết định.')}</p>
          )}
          <p className="course-pre"><strong>{tr('Nội dung:')}</strong> {tr(item.message)}</p>
          {item.mentorResponse && <p className="course-pre"><strong>{tr('Phản hồi của Giáo viên:')}</strong> {item.mentorResponse}</p>}
          {item.decision && <p className="course-pre"><strong>{trf('Quyết định ({0}):', { 0: date(item.decidedAtUtc) })}</strong> {item.decision}</p>}
          {item.hasEvidence && (
            <button type="button" disabled={busy} onClick={() => onRun(() => openCohortComplaintEvidence(item.id), 'Đã mở minh chứng riêng tư.')}>
              {tr('Xem minh chứng')}
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
              <h3>{tr('Quyết định của Admin')}</h3>
              <fieldset disabled={busy}>
                <label className="course-field" style={{ maxWidth: 220 }}>
                  <span>{tr('Kết quả')}</span>
                  <select value={decisionStatus} onChange={(e) => setDecisionStatus(e.target.value)}>
                    <option value="Resolved">{COMPLAINT_STATUS_LABELS.Resolved}</option>
                    <option value="Rejected">{COMPLAINT_STATUS_LABELS.Rejected}</option>
                  </select>
                </label>
                <label className="course-field">
                  <span>{tr('Nội dung quyết định (bắt buộc)')}</span>
                  <textarea required maxLength={2000} value={decision} onChange={(e) => setDecision(e.target.value)} />
                </label>
                <button className="course-primary" type="submit" disabled={!decision.trim()}>{tr('Lưu quyết định')}</button>
              </fieldset>
            </form>
          )}
          <ComplaintHistory history={item.history} />
        </div>
      )}
    </section>
  );
}
