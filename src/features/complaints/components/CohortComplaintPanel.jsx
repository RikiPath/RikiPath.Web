import { useRef, useState } from 'react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  getCohortComplaints,
  respondCohortComplaint,
  submitCohortComplaint,
} from '@/features/cohorts/api/cohortApi';
import { paymentStateMessage } from '@/api/apiErrors';
import { ContextualEmptyState, SmartDataBoundary } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const EVIDENCE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const categoryLabel = (v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label || v;
const statusTone = (s) => (s === 'Resolved' ? 'ok' : s === 'Rejected' ? 'muted' : 'warn');

export function ComplaintHistory({ history = [] }) {
  const { trf } = useLocale();
  if (!history?.length) return null;
  return (
    <details>
      <summary>{trf('Lịch sử xử lý ({0})', { 0: history.length })}</summary>
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

function ComplaintRow({ item, children }) {
  const { tr } = useLocale();
  return (
    <article className="course-row">
      <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
        <strong>#{item.id} · {categoryLabel(item.category)}</strong>
        <span className={`course-badge ${statusTone(item.status)}`}>{tr(COMPLAINT_STATUS_LABELS[item.status] || item.status)}</span>
      </div>
      <p className="course-meta">
        {item.cohortName || tr('Khóa học nhóm')}
        {item.mentorName ? ` · Mentor: ${item.mentorName}` : ''}{' '}{tr('· Gửi lúc')}{' '}{date(item.createdAtUtc)}
        {item.hasEvidence ? tr(' · Có minh chứng') : ''}
        {item.refundReviewRequested ? tr(' · Đề nghị xem xét hoàn tiền') : ''}
      </p>
      <p className="course-pre">{tr(item.message)}</p>
      {item.mentorResponse && <p className="course-pre"><strong>{tr('Phản hồi của Mentor:')}</strong> {item.mentorResponse}</p>}
      {item.decision && <p className="course-pre"><strong>{tr('Quyết định của Admin:')}</strong> {item.decision}</p>}
      {children}
      <ComplaintHistory history={item.history} />
    </article>
  );
}

function MentorComplaints({ busy, onRun }) {
  const { tr } = useLocale();
  const [drafts, setDrafts] = useState({});
  const query = useAsyncResource(() => getCohortComplaints(), []);
  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <section className="course-box">
      <h2>{tr('Khiếu nại liên quan đến bạn')}{query.isSuccess ? ` (${rows.length})` : ''}</h2>
      <p className="course-meta">
        {tr('Bạn có thể phản hồi khiếu nại về giảng dạy, ứng xử hoặc lịch học. Khiếu nại về thanh toán & ghi danh do Admin xử lý.')}
      </p>
      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="CohortComplaintPanel.Mentor"
        empty={
          <p className="mt-3 rounded-rp-input border border-dashed border-rp-line bg-rp-bg-2 px-3.5 py-2.5 text-[13px] text-rp-text-muted">
            {tr('Chưa có khiếu nại nào liên quan đến lớp của bạn.')}
          </p>
        }
      >
        {(list) =>
          list.map((item) => {
            const canRespond =
              item.category !== 'PaymentEnrollment' && !item.mentorResponse && (item.status === 'Open' || item.status === 'UnderReview');
            const draft = drafts[item.id] ?? '';
            return (
              <ComplaintRow key={item.id} item={item}>
                {canRespond && (
                  <form
                    className="course-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft.trim()) return;
                      onRun(async () => {
                        await respondCohortComplaint(item.id, draft);
                        setDrafts((cur) => ({ ...cur, [item.id]: '' }));
                        query.refetch();
                      }, 'Đã gửi phản hồi của bạn tới Admin.');
                    }}
                  >
                    <fieldset disabled={busy}>
                      <label className="course-field">
                        <span>{tr('Phản hồi của Mentor (bắt buộc)')}</span>
                        <textarea
                          required
                          maxLength={2000}
                          value={draft}
                          onChange={(e) => setDrafts((cur) => ({ ...cur, [item.id]: e.target.value }))}
                        />
                      </label>
                      <button className="course-primary" type="submit" disabled={!draft.trim()}>{tr('Gửi phản hồi')}</button>
                    </fieldset>
                  </form>
                )}
              </ComplaintRow>
            );
          })
        }
      </SmartDataBoundary>
    </section>
  );
}

function LearnerComplaints({ course, mentors = [], busy, onRun }) {
  const { tr } = useLocale();
  const underReview = course?.paymentState === 'PaidUnderReview';
  const [category, setCategory] = useState(underReview ? 'PaymentEnrollment' : 'TeachingQuality');
  const [mentorId, setMentorId] = useState('');
  const [message, setMessage] = useState('');
  const [refund, setRefund] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const [fileError, setFileError] = useState('');
  const idempotencyKey = useRef(null);
  const fileInput = useRef(null);

  const query = useAsyncResource(
    async () => {
      const r = await getCohortComplaints();
      return (Array.isArray(r) ? r : []).filter((x) => !course?.id || x.courseId === course.id);
    },
    [course?.id],
  );
  const rows = Array.isArray(query.data) ? query.data : [];

  const pickFile = (file) => {
    setFileError('');
    if (!file) return setEvidence(null);
    if (!EVIDENCE_TYPES.includes(file.type)) {
      setEvidence(null);
      setFileError('Chỉ chấp nhận tệp PDF, PNG hoặc JPG.');
      return undefined;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setEvidence(null);
      setFileError('Tệp minh chứng vượt quá 10 MB.');
      return undefined;
    }
    setEvidence(file);
    return undefined;
  };

  const resetDraftKey = () => {
    idempotencyKey.current = null;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!message.trim() || fileError) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const key = idempotencyKey.current;
    onRun(async () => {
      await submitCohortComplaint(course.id, {
        category,
        message,
        mentorId: mentorId ? Number(mentorId) : null,
        refundReviewRequested: category === 'PaymentEnrollment' && refund,
        idempotencyKey: key,
        evidence,
      });
      idempotencyKey.current = null;
      setMessage('');
      setRefund(false);
      setEvidence(null);
      setMentorId('');
      if (fileInput.current) fileInput.current.value = '';
      query.refetch();
    }, 'Đã gửi khiếu nại. Trạng thái: Đã tiếp nhận.');
  };

  return (
    <section className="course-box">
      <h2>{tr('Khiếu nại & hỗ trợ')}</h2>
      {underReview && (
        <div className="course-notice" role="status" style={{ borderLeft: '4px solid #ad3155' }}>
          <strong>{paymentStateMessage('PaidUnderReview')}</strong>
          <p className="course-meta">
            {tr('Nếu cần, hãy gửi khiếu nại loại "Thanh toán & ghi danh" và đánh dấu "Đề nghị xem xét hoàn tiền" để Admin ưu tiên xử lý.')}
          </p>
        </div>
      )}
      <form className="course-form" onSubmit={submit}>
        <h3>{tr('Gửi khiếu nại mới')}</h3>
        <fieldset disabled={busy || !course}>
          <label className="course-field" style={{ maxWidth: 260 }}>
            <span>{tr('Loại khiếu nại')}</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (e.target.value !== 'PaymentEnrollment') setRefund(false);
                resetDraftKey();
              }}
            >
              {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{tr(c.label)}</option>)}
            </select>
          </label>
          <label className="course-field" style={{ maxWidth: 260 }}>
            <span>{tr('Mentor liên quan (không bắt buộc)')}</span>
            <select value={mentorId} onChange={(e) => { setMentorId(e.target.value); resetDraftKey(); }}>
              <option value="">{tr('Không chỉ định')}</option>
              {mentors.map((m) => <option key={m.mentorId} value={m.mentorId}>{m.mentorName}</option>)}
            </select>
          </label>
          <label className="course-field">
            <span>{tr('Nội dung (bắt buộc)')}</span>
            <textarea
              required
              maxLength={2000}
              value={message}
              onChange={(e) => { setMessage(e.target.value); resetDraftKey(); }}
              placeholder={tr('Mô tả rõ sự việc, thời gian và mong muốn của bạn…')}
            />
          </label>
          <label className="course-field" style={{ flexBasis: '100%' }}>
            <span>{tr('Minh chứng (PDF/PNG/JPG ≤ 10 MB, không bắt buộc)')}</span>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => { pickFile(e.target.files?.[0] || null); resetDraftKey(); }}
            />
          </label>
          {fileError && <p className="course-error">{fileError}</p>}
          {category === 'PaymentEnrollment' && (
            <label style={underReview ? { fontWeight: 600, color: '#8f2948' } : undefined}>
              <input type="checkbox" checked={refund} onChange={(e) => { setRefund(e.target.checked); resetDraftKey(); }} />{' '}{tr('Đề nghị Admin xem xét hoàn tiền / ghi danh')}
            </label>
          )}
          <button className="course-primary" type="submit" disabled={!message.trim() || Boolean(fileError)}>{tr('Gửi khiếu nại')}</button>
        </fieldset>
      </form>
      <h3 style={{ marginTop: 12 }}>{tr('Khiếu nại đã gửi')}{query.isSuccess ? ` (${rows.length})` : ''}</h3>
      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="CohortComplaintPanel.Learner"
        empty={<ContextualEmptyState compact title={tr('Bạn chưa gửi khiếu nại nào cho khóa học này.')} />}
      >
        {(list) => list.map((item) => <ComplaintRow key={item.id} item={item} />)}
      </SmartDataBoundary>
    </section>
  );
}

export default function CohortComplaintPanel({ role = 'Learner', course = null, mentors = [], busy = false, onRun }) {
  if (role === 'Mentor') return <MentorComplaints busy={busy} onRun={onRun} />;
  return <LearnerComplaints key={course?.id ?? 'none'} course={course} mentors={mentors} busy={busy} onRun={onRun} />;
}
