import { useRef, useState } from 'react';
import { getTransferRequests, requestCohortTransfer, withdrawTransfer } from '@/features/cohorts/api/cohortApi';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  CustomSelect,
  Field,
  FileUpload,
  SmartDataBoundary,
  Textarea,
  confirmAction,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const STATUS = {
  Pending: { label: 'Chờ Admin xem xét', tone: 'warning' },
  Approved: { label: 'Đã duyệt chuyển lớp', tone: 'success' },
  Rejected: { label: 'Bị từ chối', tone: 'danger' },
  Withdrawn: { label: 'Đã rút yêu cầu', tone: 'neutral' },
};
const ACTION = {
  Requested: 'Gửi yêu cầu',
  Approved: 'Admin duyệt',
  Rejected: 'Admin từ chối',
  Withdrawn: 'Học viên rút yêu cầu',
};
const formatDate = (v) => (v ? formatVnDateTime(v, '—') : '—');

export default function LearnerCohortTransferPanel({ course, cohorts, busy, onRun }) {
  const { tr, trf } = useLocale();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const keyRef = useRef(null);

  const query = useAsyncResource(
    async () => {
      const rows = await getTransferRequests();
      return (Array.isArray(rows) ? rows : []).filter(
        (r) => r.sourceCourseId === course.id || r.destinationCourseId === course.id,
      );
    },
    [course.id],
    { enabled: Boolean(course?.id) },
  );
  const requests = Array.isArray(query.data) ? query.data : [];

  const pending = requests.find((r) => r.status === 'Pending' && r.sourceCourseId === course.id);
  const canRequest = course.cohortId && course.status === 'Active' && course.paymentStatus === 'Paid' && !pending;
  const candidates = cohorts.filter((c) => c.id !== course.cohortId && c.level === course.level);

  const targetOptions = [
    { value: '', label: tr('Nhờ Admin chọn lớp phù hợp') },
    ...candidates.map((c) => ({
      value: String(c.id),
      disabled: c.seatsAvailable <= 0,
      label: trf('{0} · {1} · khai giảng {2} · còn {3}/{4} chỗ', {
        0: c.name,
        1: c.mentorName,
        2: formatDate(c.startsAt),
        3: c.seatsAvailable,
        4: c.capacity,
      }),
    })),
  ];

  return (
    <Card className="space-y-4 p-5" aria-labelledby={`transfer-${course.id}`}>
      <div>
        <h2 id={`transfer-${course.id}`} className="text-base font-bold text-rp-text">
          {tr('Yêu cầu chuyển lớp')}
        </h2>
        <p className="mt-1 text-xs leading-5 text-rp-text-2">
          {tr('Giáo viên chính hiện tại:')}{' '}
          <strong>{course.mentorName || tr('Chưa phân công')}</strong>{' '}
          {tr('· Lớp hiện tại:')}{' '}
          <strong>{course.cohortName || tr('Lớp đang học')}</strong>
          {tr('. Việc chuyển lớp cần Admin xem xét sức chứa, lịch học, cấp độ và chính sách; lịch sử điểm danh, bài tập về nhà và nhận xét của bạn được giữ nguyên.')}
        </p>
        <p className="mt-1 text-xs leading-5 text-rp-text-muted">
          {tr('Muốn góp ý hoặc đánh giá Giáo viên? Hãy dùng mục phản hồi/khiếu nại riêng — đánh giá Giáo viên không tự động tạo yêu cầu chuyển lớp.')}
        </p>
      </div>

      {course.status === 'Transferred' && (
        <Banner tone="info">
          {tr('Ghi danh này đã được chuyển sang lớp mới. Các buổi tương lai ở lớp cũ không còn quyền vào phòng học.')}
        </Banner>
      )}

      {canRequest && (
        <form
          className="space-y-3 rounded-xl border border-rp-line bg-rp-bg-2/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            keyRef.current ||= crypto.randomUUID();
            onRun(async () => {
              await requestCohortTransfer(course.id, {
                targetCohortId: target || null,
                reason: reason.trim(),
                evidence: evidenceFile || undefined,
                idempotencyKey: keyRef.current,
              });
              keyRef.current = null;
              setReason('');
              setTarget('');
              setEvidenceFile(null);
              query.refetch();
            }, 'Đã gửi yêu cầu chuyển lớp. Admin sẽ xem xét và thông báo kết quả.');
          }}
        >
          <h3 className="text-sm font-semibold text-rp-text">{tr('Gửi yêu cầu chuyển lớp')}</h3>
          <Field label={tr('Lớp muốn chuyển đến (không bắt buộc)')}>
            <CustomSelect
              value={target}
              disabled={busy}
              onChange={setTarget}
              options={targetOptions}
            />
          </Field>
          <Field label={tr('Lý do chuyển lớp (bắt buộc, 10–1000 ký tự)')} required>
            <Textarea
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              disabled={busy}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr('Mô tả lý do bạn cần đổi lịch học hoặc chuyển lớp…')}
            />
          </Field>
          <Field label={tr('Minh chứng (PDF/PNG/JPG ≤ 10 MB, không bắt buộc)')}>
            <FileUpload
              accept="application/pdf,image/png,image/jpeg"
              maxSizeMb={10}
              disabled={busy}
              value={evidenceFile}
              onChange={(file) => setEvidenceFile(file || null)}
            />
          </Field>
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy || reason.trim().length < 10}
              loading={busy}
            >
              {tr('Gửi yêu cầu')}
            </Button>
          </div>
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
        empty={
          <ContextualEmptyState
            compact
            title={tr('Chưa có yêu cầu chuyển lớp nào.')}
            description={tr('Bạn có thể gửi yêu cầu chuyển lớp ở biểu mẫu phía trên khi cần hỗ trợ.')}
          />
        }
      >
        {(list) => (
          <div className="space-y-3">
            {list.map((r) => {
              const statusMeta = STATUS[r.status] || { label: r.status, tone: 'neutral' };
              return (
                <article className="space-y-2 rounded-xl border border-rp-line bg-rp-surface p-4 text-xs" key={r.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-rp-text">{tr('Yêu cầu chuyển lớp')}</span>
                      <Badge tone={statusMeta.tone} size="sm">
                        {tr(statusMeta.label)}
                      </Badge>
                    </div>
                    <span className="text-rp-text-muted">{trf('Gửi lúc {0}', { 0: formatDate(r.createdAtUtc) })}</span>
                  </div>

                  <p className="text-rp-text-2">
                    {tr('Từ lớp:')}{' '}{r.sourceCohortName || tr('Lớp hiện tại')} →{' '}
                    {r.targetCohortName || r.requestedTargetCohortName || tr('Admin chọn lớp')}
                  </p>
                  <p className="whitespace-pre-wrap text-rp-text">
                    <strong>{tr('Lý do:')}</strong>{' '}{r.reason}
                  </p>
                  {r.status === 'Rejected' && r.decisionNote && (
                    <Banner tone="danger">
                      <strong>{tr('Lý do từ chối:')}</strong>{' '}{r.decisionNote}
                    </Banner>
                  )}
                  {r.status === 'Approved' && (
                    <Banner tone="success">
                      {r.targetCohortName ? trf('Đã chuyển sang lớp {0}.', { 0: r.targetCohortName }) : tr('Đã chuyển sang lớp mới.')}
                    </Banner>
                  )}

                  {Array.isArray(r.history) && r.history.length > 0 && (
                    <details className="text-rp-text-muted">
                      <summary className="cursor-pointer font-medium">{tr('Lịch sử yêu cầu')}</summary>
                      <ul className="mt-1.5 space-y-1 pl-4">
                        {r.history.map((h, i) => (
                          <li key={i}>
                            {formatDate(h.atUtc)} · {tr(ACTION[h.action] || h.action)}
                            {h.detail ? `: ${h.detail}` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {r.status === 'Pending' && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await confirmAction({
                            title: tr('Rút yêu cầu chuyển lớp?'),
                            description: tr('Yêu cầu đang chờ Admin xử lý sẽ bị hủy.'),
                            confirmLabel: tr('Rút yêu cầu'),
                            tone: 'warning',
                          });
                          if (!ok) return;
                          onRun(async () => {
                            await withdrawTransfer(r.id);
                            query.refetch();
                          }, 'Đã rút yêu cầu chuyển lớp.');
                        }}
                      >
                        {tr('Rút yêu cầu')}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </SmartDataBoundary>
    </Card>
  );
}
