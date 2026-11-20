import { useMemo, useRef, useState } from 'react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  getCohortComplaints,
  respondCohortComplaint,
  submitCohortComplaint,
} from '@/features/cohorts/api/cohortApi';
import { paymentStateMessage } from '@/api/apiErrors';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualEmptyState,
  CustomSelect,
  Drawer,
  Field,
  FileUpload,
  Modal,
  SearchInput,
  SmartDataBoundary,
  Tabs,
  Textarea,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const EVIDENCE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const categoryLabel = (v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label || v;
const badgeTone = (s) => (s === 'Resolved' ? 'success' : s === 'Rejected' ? 'neutral' : 'warning');

const ACTOR_ROLE_LABELS = {
  Learner: 'Học viên',
  Mentor: 'Giáo viên',
  Admin: 'Quản trị viên',
  System: 'Hệ thống',
};

const ACTION_LABELS = {
  Submitted: 'Gửi khiếu nại',
  Created: 'Tạo khiếu nại',
  MentorResponded: 'Giáo viên phản hồi',
  Responded: 'Đã phản hồi',
  UnderReview: 'Đang xem xét',
  Resolved: 'Đã xử lý',
  Rejected: 'Không chấp nhận',
  Decision: 'Quyết định xử lý',
};

export function ComplaintHistory({ history = [] }) {
  const { tr, trf } = useLocale();
  if (!history?.length) return null;
  return (
    <details className="mt-3 rounded-lg border border-rp-line bg-rp-bg-2 px-3 py-2 text-xs text-rp-text-2">
      <summary className="cursor-pointer font-medium text-rp-text select-none">
        {trf('Lịch sử xử lý ({0})', { 0: history.length })}
      </summary>
      <ul className="mt-2 space-y-1 border-t border-rp-line pt-2 text-rp-text-muted">
        {history.map((h, i) => (
          <li key={`${h.atUtc}-${i}`} className="leading-relaxed">
            <span>{date(h.atUtc)}</span>
            {' · '}
            <span className="font-medium text-rp-text-2">{tr(ACTOR_ROLE_LABELS[h.actorRole] || h.actorRole)}</span>
            {' · '}
            <span>{tr(ACTION_LABELS[h.action] || h.action)}</span>
            {h.detail ? `: ${h.detail}` : ''}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ComplaintRow({ item, highlighted = false, actions, children }) {
  const { tr } = useLocale();
  return (
    <Card
      id={`complaint-${item.id}`}
      density="compact"
      className={highlighted ? 'ring-2 ring-rp-brand-strong/40 bg-rp-brand-tint/20' : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-rp-text">{tr(categoryLabel(item.category))}</h3>
            <Badge tone={badgeTone(item.status)} size="sm">
              {tr(COMPLAINT_STATUS_LABELS[item.status] || item.status)}
            </Badge>
          </div>
          <p className="text-xs text-rp-text-muted">
            {item.cohortName || tr('Khóa học nhóm')}
            {item.learnerName ? ` · ${tr('Học viên:')} ${item.learnerName}` : ''}
            {item.mentorName ? ` · ${tr('Giáo viên:')} ${item.mentorName}` : ''}
            {' · '}
            {tr('Gửi lúc')} {date(item.createdAtUtc)}
            {item.hasEvidence ? ` · ${tr('Có minh chứng')}` : ''}
            {item.refundReviewRequested ? ` · ${tr('Đề nghị xem xét hoàn tiền')}` : ''}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-rp-text">{item.message}</p>

      {item.mentorResponse && (
        <div className="mt-2.5 rounded-lg border border-rp-line bg-rp-bg-2 px-3 py-2 text-[13px] text-rp-text-2">
          <strong className="font-semibold text-rp-text">{tr('Phản hồi của Giáo viên:')}</strong>{' '}
          <span className="whitespace-pre-wrap">{item.mentorResponse}</span>
        </div>
      )}
      {item.decision && (
        <div className="mt-2 rounded-lg border border-rp-line bg-rp-brand-tint/30 px-3 py-2 text-[13px] text-rp-text">
          <strong className="font-semibold text-rp-brand-strong">{tr('Quyết định của Quản trị viên:')}</strong>{' '}
          <span className="whitespace-pre-wrap">{item.decision}</span>
        </div>
      )}
      {children}
      <ComplaintHistory history={item.history} />
    </Card>
  );
}

function isCanRespond(item) {
  return Boolean(
    item
    && item.category !== 'PaymentEnrollment'
    && !item.mentorResponse
    && (item.status === 'Open' || item.status === 'UnderReview'),
  );
}

function MentorComplaints({ cohortId = null, highlightComplaintId = null, busy, onRun }) {
  const { tr } = useLocale();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dismissedAutoId, setDismissedAutoId] = useState(null);
  const [responseDraft, setResponseDraft] = useState('');

  const query = useAsyncResource(async () => {
    const all = await getCohortComplaints();
    const list = Array.isArray(all) ? all : [];
    if (cohortId != null && Number(cohortId) > 0) {
      return list.filter((item) => Number(item.cohortId) === Number(cohortId));
    }
    return list;
  }, [cohortId]);

  const rows = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);

  const activeId = selectedId ?? (
    highlightComplaintId && dismissedAutoId !== Number(highlightComplaintId)
      ? (rows.find((item) => Number(item.id) === Number(highlightComplaintId))?.id ?? null)
      : null
  );

  const openCount = useMemo(() => rows.filter((item) => isCanRespond(item)).length, [rows]);
  const respondedCount = useMemo(
    () => rows.filter((item) => Boolean(item.mentorResponse) || item.status === 'Resolved' || item.status === 'Rejected').length,
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (statusFilter === 'OPEN' && !isCanRespond(item)) return false;
      if (statusFilter === 'RESPONDED' && isCanRespond(item)) return false;
      if (!q) return true;
      const haystack = `${categoryLabel(item.category)} ${item.cohortName || ''} ${item.learnerName || ''} ${item.message || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, statusFilter, search]);

  const activeComplaint = useMemo(
    () => rows.find((item) => Number(item.id) === Number(activeId)) || null,
    [rows, activeId],
  );

  const closeDrawer = () => {
    if (highlightComplaintId) setDismissedAutoId(Number(highlightComplaintId));
    setSelectedId(null);
    setResponseDraft('');
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    const trimmed = responseDraft.trim();
    if (!activeComplaint || !trimmed) return;
    await onRun(async () => {
      await respondCohortComplaint(activeComplaint.id, trimmed);
      closeDrawer();
      query.refetch();
    }, 'Đã gửi phản hồi của bạn tới Quản trị viên.');
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="rp-type-card text-rp-text">
            {tr('Khiếu nại liên quan đến bạn')}
            {query.isSuccess ? ` (${rows.length})` : ''}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-rp-text-muted">
            {tr('Bạn có thể xem chi tiết và phản hồi khiếu nại về giảng dạy, ứng xử hoặc lịch học. Khiếu nại thanh toán do Quản trị viên xử lý.')}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Tìm lớp, học viên, nội dung…"
          />
        </div>
      </div>

      <Tabs
        variant="pill"
        className="flex-wrap sm:flex-nowrap"
        label={tr('Lọc trạng thái khiếu nại')}
        value={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { value: 'ALL', label: 'Tất cả', count: rows.length },
          { value: 'OPEN', label: 'Cần phản hồi', count: openCount },
          { value: 'RESPONDED', label: 'Đã phản hồi / Xong', count: respondedCount },
        ]}
      />

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="CohortComplaintPanel.Mentor"
        empty={
          <ContextualEmptyState
            compact
            title="Chưa có khiếu nại nào"
            message="Chưa có khiếu nại nào liên quan đến lớp của bạn."
          />
        }
      >
        {() => (
          filtered.length === 0 ? (
            <ContextualEmptyState
              compact
              title="Không có khiếu nại phù hợp"
              message="Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc khác."
              action={statusFilter !== 'ALL' || search ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setStatusFilter('ALL'); setSearch(''); }}
                >
                  {tr('Đặt lại bộ lọc')}
                </Button>
              ) : null}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const canRespond = isCanRespond(item);
                const highlighted = Boolean(highlightComplaintId && Number(highlightComplaintId) === Number(item.id));
                return (
                  <ComplaintRow
                    key={item.id}
                    item={item}
                    highlighted={highlighted}
                    actions={(
                      <Button
                        variant={canRespond ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          setSelectedId(item.id);
                          setResponseDraft('');
                        }}
                      >
                        {tr(canRespond ? 'Xem & phản hồi' : 'Xem chi tiết')}
                      </Button>
                    )}
                  />
                );
              })}
            </div>
          )
        )}
      </SmartDataBoundary>

      <Drawer
        open={Boolean(activeComplaint)}
        onClose={closeDrawer}
        title={tr('Chi tiết & phản hồi khiếu nại')}
        width="w-[min(520px,100vw)]"
      >
        {activeComplaint && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-rp-text">{tr(categoryLabel(activeComplaint.category))}</h3>
                <Badge tone={badgeTone(activeComplaint.status)} size="sm">
                  {tr(COMPLAINT_STATUS_LABELS[activeComplaint.status] || activeComplaint.status)}
                </Badge>
              </div>
              <p className="text-xs text-rp-text-muted">
                {activeComplaint.cohortName || tr('Khóa học nhóm')}
                {activeComplaint.learnerName ? ` · ${tr('Học viên:')} ${activeComplaint.learnerName}` : ''}
                {' · '}
                {tr('Gửi lúc')} {date(activeComplaint.createdAtUtc)}
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-rp-text">{activeComplaint.message}</p>
            </div>

            {activeComplaint.mentorResponse && (
              <div className="rounded-xl border border-rp-line bg-rp-surface p-3.5 text-[13px]">
                <p className="text-xs font-semibold text-rp-text-muted">{tr('Phản hồi của Giáo viên')}</p>
                <p className="mt-1 whitespace-pre-wrap text-rp-text">{activeComplaint.mentorResponse}</p>
              </div>
            )}

            {activeComplaint.decision && (
              <div className="rounded-xl border border-rp-brand-border bg-rp-brand-tint/30 p-3.5 text-[13px]">
                <p className="text-xs font-semibold text-rp-brand-strong">{tr('Quyết định của Quản trị viên')}</p>
                <p className="mt-1 whitespace-pre-wrap text-rp-text">{activeComplaint.decision}</p>
              </div>
            )}

            {isCanRespond(activeComplaint) && (
              <form onSubmit={handleSubmitResponse} className="space-y-3 border-t border-rp-line pt-4">
                <Field
                  label="Phản hồi của Giáo viên"
                  required
                  hint="Trình bày khách quan bối cảnh buổi học, trao đổi đã thực hiện và hướng khắc phục."
                  counter={`${responseDraft.trim().length} / 2000`}
                >
                  <Textarea
                    required
                    rows={5}
                    maxLength={2000}
                    disabled={busy}
                    value={responseDraft}
                    onChange={(e) => setResponseDraft(e.target.value)}
                    placeholder={tr('Nhập phản hồi gửi tới Quản trị viên…')}
                  />
                </Field>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={closeDrawer} disabled={busy}>
                    {tr('Đóng')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={busy}
                    disabled={!responseDraft.trim()}
                  >
                    {tr('Gửi phản hồi')}
                  </Button>
                </div>
              </form>
            )}

            <ComplaintHistory history={activeComplaint.history} />
          </div>
        )}
      </Drawer>
    </Card>
  );
}

function LearnerComplaints({ course, mentors = [], busy, onRun }) {
  const { tr } = useLocale();
  const underReview = course?.paymentState === 'PaidUnderReview';
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState(underReview ? 'PaymentEnrollment' : 'TeachingQuality');
  const [mentorId, setMentorId] = useState('');
  const [message, setMessage] = useState('');
  const [refund, setRefund] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const idempotencyKey = useRef(null);

  const query = useAsyncResource(
    async () => {
      const r = await getCohortComplaints();
      return (Array.isArray(r) ? r : []).filter((x) => !course?.id || x.courseId === course.id);
    },
    [course?.id],
  );
  const rows = Array.isArray(query.data) ? query.data : [];

  const resetDraftKey = () => {
    idempotencyKey.current = null;
  };

  const openModal = (presetRefund = false) => {
    setCategory(presetRefund || underReview ? 'PaymentEnrollment' : 'TeachingQuality');
    setRefund(Boolean(presetRefund));
    resetDraftKey();
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const key = idempotencyKey.current;
    await onRun(async () => {
      await submitCohortComplaint(course.id, {
        category,
        message: trimmed,
        mentorId: mentorId ? Number(mentorId) : null,
        refundReviewRequested: category === 'PaymentEnrollment' && refund,
        idempotencyKey: key,
        evidence: evidenceFiles[0] || null,
      });
      idempotencyKey.current = null;
      setMessage('');
      setRefund(false);
      setEvidenceFiles([]);
      setMentorId('');
      setModalOpen(false);
      query.refetch();
    }, 'Đã gửi khiếu nại. Trạng thái: Đã tiếp nhận.');
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="rp-type-card text-rp-text">
            {tr('Khiếu nại & hỗ trợ')}
            {query.isSuccess ? ` (${rows.length})` : ''}
          </h2>
          <p className="mt-1 text-xs text-rp-text-muted">
            {tr('Theo dõi các yêu cầu hỗ trợ đã gửi hoặc tạo khiếu nại mới khi có vấn đề về buổi học hoặc ghi danh.')}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !course}
          onClick={() => openModal(false)}
        >
          {tr('Gửi khiếu nại mới')}
        </Button>
      </div>

      {underReview && (
        <Banner
          tone="warning"
          title={paymentStateMessage('PaidUnderReview')}
          actions={(
            <Button variant="secondary" size="sm" onClick={() => openModal(true)}>
              {tr('Gửi yêu cầu hoàn tiền')}
            </Button>
          )}
        >
          {tr('Nếu cần, hãy gửi khiếu nại loại "Thanh toán & ghi danh" và đánh dấu "Đề nghị xem xét hoàn tiền" để Quản trị viên ưu tiên xử lý.')}
        </Banner>
      )}

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="CohortComplaintPanel.Learner"
        empty={
          <ContextualEmptyState
            compact
            title="Chưa có khiếu nại nào"
            message="Bạn chưa gửi khiếu nại nào cho khóa học này."
          />
        }
      >
        {(list) => (
          <div className="space-y-3">
            {list.map((item) => <ComplaintRow key={item.id} item={item} />)}
          </div>
        )}
      </SmartDataBoundary>

      <Modal
        open={modalOpen}
        onClose={() => !busy && setModalOpen(false)}
        title="Gửi khiếu nại mới"
        description="Mô tả chi tiết vấn đề bạn gặp phải để Giáo viên hoặc Quản trị viên hỗ trợ kịp thời."
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={busy}>
              {tr('Hủy')}
            </Button>
            <Button
              type="submit"
              form="learner-complaint-form"
              variant="primary"
              loading={busy}
              disabled={!message.trim() || !course}
            >
              {tr('Gửi khiếu nại')}
            </Button>
          </>
        )}
      >
        <form id="learner-complaint-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại khiếu nại" required>
              <CustomSelect
                disabled={busy}
                value={category}
                onChange={(val) => {
                  setCategory(val);
                  if (val !== 'PaymentEnrollment') setRefund(false);
                  resetDraftKey();
                }}
                options={COMPLAINT_CATEGORIES.map((c) => ({ value: c.value, label: tr(c.label) }))}
              />
            </Field>
            <Field label="Giáo viên liên quan">
              <CustomSelect
                disabled={busy}
                value={mentorId}
                onChange={(val) => { setMentorId(val); resetDraftKey(); }}
                options={[
                  { value: '', label: tr('Không chỉ định') },
                  ...mentors.map((m) => ({ value: String(m.mentorId), label: m.mentorName })),
                ]}
              />
            </Field>
          </div>

          <Field
            label="Nội dung chi tiết"
            required
            counter={`${message.trim().length} / 2000`}
          >
            <Textarea
              required
              rows={4}
              maxLength={2000}
              disabled={busy}
              value={message}
              onChange={(e) => { setMessage(e.target.value); resetDraftKey(); }}
              placeholder={tr('Mô tả rõ sự việc, thời gian và mong muốn của bạn…')}
            />
          </Field>

          <Field label="Minh chứng (không bắt buộc)" hint="PDF, PNG hoặc JPG · tối đa 10 MB.">
            <FileUpload
              label="Chọn tệp minh chứng"
              accept={EVIDENCE_TYPES}
              maxBytes={MAX_EVIDENCE_BYTES}
              files={evidenceFiles}
              disabled={busy}
              onChange={(nextFiles) => {
                setEvidenceFiles(nextFiles);
                resetDraftKey();
              }}
            />
          </Field>

          {category === 'PaymentEnrollment' && (
            <Checkbox
              checked={refund}
              disabled={busy}
              onChange={(e) => { setRefund(e.target.checked); resetDraftKey(); }}
              label="Đề nghị Quản trị viên xem xét hoàn tiền / ghi danh"
            />
          )}
        </form>
      </Modal>
    </Card>
  );
}

export default function CohortComplaintPanel({
  role = 'Learner',
  course = null,
  cohortId = null,
  highlightComplaintId = null,
  mentors = [],
  busy = false,
  onRun,
}) {
  if (role === 'Mentor') {
    return (
      <MentorComplaints
        cohortId={cohortId}
        highlightComplaintId={highlightComplaintId}
        busy={busy}
        onRun={onRun}
      />
    );
  }
  return (
    <LearnerComplaints
      key={course?.id ?? 'none'}
      course={course}
      mentors={mentors}
      busy={busy}
      onRun={onRun}
    />
  );
}
