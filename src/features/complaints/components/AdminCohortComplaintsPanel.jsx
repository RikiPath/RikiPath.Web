import { useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  decideCohortComplaint,
  getCohortComplaint,
  getCohortComplaints,
  openCohortComplaintEvidence,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  CustomSelect,
  DataTable,
  Drawer,
  Field,
  IconButton,
  SmartDataBoundary,
  Textarea,
} from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { ComplaintHistory } from './CohortComplaintPanel';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');
const categoryLabel = (v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)?.label || v;
const STATUS_TONE = { Open: 'warning', UnderReview: 'info', Resolved: 'success', Rejected: 'danger' };

export default function AdminCohortComplaintsPanel({ busy = false, initialComplaintId = null, onRun }) {
  const { tr, trf } = useLocale();
  const initialIdNum = initialComplaintId ? Number(initialComplaintId) : null;
  const [status, setStatus] = useState(initialIdNum ? '' : 'Open');
  const [selectedId, setSelectedId] = useState(initialIdNum);
  const [detail, setDetail] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('Resolved');
  const [decision, setDecision] = useState('');
  const [error, setError] = useState('');

  const query = useAsyncResource(() => getCohortComplaints(status || undefined), [status]);

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

  const columns = [
    { key: 'id', header: '#', render: (r) => <span className="font-mono text-xs text-rp-text-muted">#{r.id}</span> },
    {
      key: 'cohortName',
      header: tr('Lớp / Khóa'),
      render: (r) => <span className="font-semibold text-rp-text">{r.cohortName || (r.cohortId ? `#${r.cohortId}` : trf('Khóa #{0}', { 0: r.courseId }))}</span>,
    },
    {
      key: 'category',
      header: tr('Loại khiếu nại'),
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{tr(categoryLabel(r.category))}</span>
          {r.refundReviewRequested && <Badge tone="warning" size="sm" icon={false}>{tr('Xin xem xét hoàn tiền')}</Badge>}
        </div>
      ),
    },
    { key: 'mentorName', header: tr('Giáo viên'), render: (r) => <span className="text-sm text-rp-text-2">{r.mentorName || '—'}</span> },
    { key: 'createdAtUtc', header: tr('Gửi lúc'), render: (r) => <span className="text-xs text-rp-text-2">{date(r.createdAtUtc)}</span> },
    {
      key: 'status',
      header: tr('Trạng thái'),
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] || 'neutral'} size="sm" icon={false}>
          {tr(COMPLAINT_STATUS_LABELS[r.status] || r.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-rp-text">{tr('Khiếu nại khóa học')}</h2>
            <p className="text-xs text-rp-text-muted">
              {tr('Yêu cầu xem xét hoàn tiền chỉ là đề nghị của học viên; hệ thống không hoàn tiền tự động.')}
            </p>
          </div>
          <div className="w-full sm:w-[200px]">
            <CustomSelect
              value={status}
              aria-label={tr('Lọc trạng thái khiếu nại')}
              onChange={setStatus}
              options={[
                ...Object.entries(COMPLAINT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: tr(l) })),
                { value: '', label: tr('Tất cả trạng thái') },
              ]}
            />
          </div>
        </div>
      </Card>

      {error && <Banner tone="danger">{error}</Banner>}

      <SmartDataBoundary
        query={query}
        isEmpty={(list) => !Array.isArray(list) || list.length === 0}
        loadingContext="cohort"
        loadingLabel={tr('Đang tải danh sách khiếu nại')}
        errorTitle={tr('Chưa tải được danh sách khiếu nại')}
        compact
        diagnosticScope="AdminCohortComplaintsPanel"
        empty={<ContextualEmptyState compact context="adminQueue" title={tr('Không có khiếu nại nào.')} />}
      >
        {(rows) => (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={choose}
            rowActions={(r) => (
              <IconButton icon={Eye} size="sm" variant="ghost" label={tr('Xem chi tiết')} onClick={() => choose(r)} />
            )}
          />
        )}
      </SmartDataBoundary>

      <Drawer
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={item ? `${tr('Khiếu nại')} #${item.id} · ${tr(categoryLabel(item.category))}` : tr('Chi tiết khiếu nại')}
        width="w-[min(560px,100vw)]"
      >
        {item && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[item.status] || 'neutral'} size="sm" icon={false}>
                {tr(COMPLAINT_STATUS_LABELS[item.status] || item.status)}
              </Badge>
              {item.hasEvidence && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={FileText}
                  disabled={busy}
                  onClick={() => onRun(() => openCohortComplaintEvidence(item.id), 'Đã mở minh chứng riêng tư.')}
                >
                  {tr('Xem minh chứng')}
                </Button>
              )}
            </div>

            {item.refundReviewRequested && (
              <Banner tone="warning">
                {tr('Học viên đề nghị xem xét hoàn tiền / ghi danh — cần đối chiếu giao dịch trước khi quyết định.')}
              </Banner>
            )}

            <Card className="space-y-2.5 bg-rp-bg-2/40 p-4 text-sm">
              <p><strong>{tr('Nội dung khiếu nại')}:</strong> {tr(item.message)}</p>
              {item.mentorResponse && (
                <p><strong>{tr('Phản hồi của Giáo viên')}:</strong> {item.mentorResponse}</p>
              )}
              {item.decision && (
                <p><strong>{trf('Quyết định ({0})', { 0: date(item.decidedAtUtc) })}:</strong> {item.decision}</p>
              )}
            </Card>

            {decidable && (
              <Card className="space-y-3 p-4">
                <h3 className="text-sm font-bold text-rp-text">{tr('Quyết định của Admin')}</h3>
                <Field label={tr('Kết quả xử lý')}>
                  <CustomSelect
                    value={decisionStatus}
                    aria-label={tr('Kết quả xử lý')}
                    onChange={setDecisionStatus}
                    options={[
                      { value: 'Resolved', label: tr(COMPLAINT_STATUS_LABELS.Resolved) },
                      { value: 'Rejected', label: tr(COMPLAINT_STATUS_LABELS.Rejected) },
                    ]}
                  />
                </Field>
                <Field label={tr('Nội dung quyết định')} required>
                  <Textarea
                    rows={4}
                    maxLength={2000}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder={tr('Nêu rõ kết quả xử lý để gửi thông báo cho học viên…')}
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    loading={busy}
                    disabled={busy || !decision.trim()}
                    onClick={() =>
                      onRun(async () => {
                        await decideCohortComplaint(item.id, { status: decisionStatus, decision, expectedRevision: item.revision });
                        setDecision('');
                        query.refetch();
                        await loadDetail(item.id);
                      }, 'Đã lưu quyết định và thông báo cho học viên.')
                    }
                  >
                    {tr('Lưu quyết định')}
                  </Button>
                </div>
              </Card>
            )}

            <ComplaintHistory history={item.history} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
