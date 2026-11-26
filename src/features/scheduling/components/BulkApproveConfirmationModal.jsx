import { useMemo } from 'react';
import { AlertTriangle, Check, CheckCircle2, Eye, RotateCcw, X } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Field,
  Modal,
  Textarea,
  formatIsoDateDisplay,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

function resolveTitle(item, trf) {
  const cleaned = String(item?.courseTitle || '')
    .replace(/\s*\(\s*\d+\s*buổi\s*\/\s*tuần\s*\)\s*$/i, '')
    .trim();
  if (cleaned) return cleaned;
  const code = String(item?.jlptLevelCode || '').trim().toUpperCase();
  return code ? trf('Lớp JLPT {0}', { 0: code }) : trf('Đề xuất mở lớp', {});
}

/**
 * Confirmation dialog for Bulk Approval of Teaching Proposals.
 * Displays live server pre-validation + intra-batch conflict results and lets Admin remove invalid items before confirming.
 */
export default function BulkApproveConfirmationModal({
  open,
  onClose,
  selectedProposals = [],
  prevalidationData = null,
  prevalidating = false,
  prevalidationError = null,
  onRetryPrevalidation,
  serverConflictResult = null,
  submitting = false,
  reason = '',
  onReasonChange,
  onRemoveProposal,
  onRemoveInvalidProposals,
  onViewProposal,
  onConfirm,
}) {
  const { tr, trf } = useLocale();

  const effectiveValidation = serverConflictResult || prevalidationData || null;

  const validationById = useMemo(() => {
    const map = new Map();
    const list = effectiveValidation?.results || [];
    list.forEach((item) => {
      map.set(item.proposalId, item);
    });
    return map;
  }, [effectiveValidation]);

  const mergedRows = useMemo(() => {
    return selectedProposals.map((row) => {
      const check = validationById.get(row.id) || null;
      const issues = Array.isArray(check?.issues) ? check.issues.filter((i) => !i.severity || i.severity === 'Error') : [];
      const isEligible = check ? Boolean(check.isEligible && issues.length === 0) : null;
      return {
        id: row.id,
        mentorName: check?.mentorName || row.mentorName || `#${row.mentorId}`,
        jlptLevelCode: check?.jlptLevelCode || row.jlptLevelCode || '—',
        courseTitle: resolveTitle(check || row, trf),
        expectedStartDate: check?.expectedStartDate || row.expectedStartDate || null,
        weeklySessionCount: check?.weeklySessionCount || row.weeklySessionCount || (row.weeklySessions?.length ?? 0),
        totalSessions: check?.totalSessions || row.totalSessions || 0,
        isEligible,
        issues,
      };
    });
  }, [selectedProposals, validationById, trf]);

  const invalidRows = useMemo(
    () => mergedRows.filter((r) => r.isEligible === false),
    [mergedRows],
  );

  const canConfirm = Boolean(
    open
    && mergedRows.length > 0
    && !submitting
    && !prevalidating
    && !prevalidationError
    && effectiveValidation
    && invalidRows.length === 0
    && effectiveValidation.allEligible === true,
  );

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose?.()}
      dismissible={!submitting}
      size="lg"
      title={tr('Xác nhận phê duyệt hàng loạt')}
      description={trf('Tổng số đề xuất được chọn: {0} đề xuất', { 0: mergedRows.length })}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {invalidRows.length > 0 && (
            <span className="text-xs text-rp-text-muted">
              {trf('Còn {0} đề xuất không đủ điều kiện cần bỏ chọn trước khi phê duyệt.', { 0: invalidRows.length })}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              data-testid="bulk-approve-cancel-btn"
              disabled={submitting}
              onClick={onClose}
            >
              {tr('Quay lại')}
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Check}
              data-testid="bulk-approve-confirm-btn"
              loading={submitting}
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              {submitting
                ? tr('Đang phê duyệt…')
                : tr('Xác nhận phê duyệt')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        {!prevalidating && prevalidationError && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Chưa thể xác minh danh sách đề xuất từ máy chủ')}
            actions={
              onRetryPrevalidation ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={RotateCcw}
                  onClick={onRetryPrevalidation}
                >
                  {tr('Thử kiểm tra lại')}
                </Button>
              ) : null
            }
          >
            {tr('Không thể phê duyệt hàng loạt khi chưa hoàn tất kiểm tra điều kiện. Vui lòng thử lại.')}
          </Banner>
        )}

        {!prevalidating && invalidRows.length > 0 && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={trf('Phát hiện {0} đề xuất không đủ điều kiện hoặc xung đột lịch', { 0: invalidRows.length })}
            actions={
              onRemoveInvalidProposals ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="bulk-approve-remove-invalid-btn"
                  disabled={submitting}
                  onClick={() => onRemoveInvalidProposals(invalidRows.map((r) => r.id))}
                >
                  {trf('Bỏ chọn {0} đề xuất lỗi', { 0: invalidRows.length })}
                </Button>
              ) : null
            }
          >
            {tr('Hệ thống không phê duyệt một phần để đảm bảo an toàn lịch dạy. Vui lòng bỏ chọn các đề xuất không hợp lệ bên dưới rồi tiếp tục.')}
          </Banner>
        )}

        {/* Selected Proposals Summary List */}
        <div
          data-testid="bulk-approve-summary-list"
          className="max-h-[300px] space-y-2 overflow-y-auto overscroll-contain pr-1"
        >
          {mergedRows.map((row) => {
            const hasErr = row.isEligible === false;
            const isOk = row.isEligible === true;
            return (
              <div
                key={row.id}
                data-testid={`bulk-confirm-item-${row.id}`}
                className={`rounded-xl border px-3.5 py-2.5 text-xs transition-colors ${
                  hasErr
                    ? 'border-rp-danger-line bg-rp-danger-bg/60'
                    : 'border-rp-line bg-rp-bg-2/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-rp-text">{row.mentorName}</span>
                      <Badge tone="brand" size="sm" icon={false}>
                        {row.jlptLevelCode ? `JLPT ${row.jlptLevelCode}` : 'JLPT'}
                      </Badge>
                      <span className="truncate font-semibold text-rp-text">{row.courseTitle}</span>
                      {isOk && !prevalidating && (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          aria-label={tr('Đủ điều kiện phê duyệt')}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums text-rp-text-2">
                      <span>
                        {tr('Bắt đầu')}: <strong className="font-semibold text-rp-text">{row.expectedStartDate ? formatIsoDateDisplay(row.expectedStartDate) : '—'}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="font-semibold text-rp-text">{trf('{0} buổi/tuần', { 0: row.weeklySessionCount })}</strong>
                        {row.totalSessions > 0 ? ` (${trf('{0} buổi', { 0: row.totalSessions })})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {onViewProposal && (
                      <button
                        type="button"
                        data-testid={`bulk-confirm-view-${row.id}`}
                        disabled={submitting}
                        onClick={() => onViewProposal(row.id)}
                        className="rp-focus inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-rp-line bg-white px-2 text-[11px] font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        <span>{tr('Xem chi tiết')}</span>
                      </button>
                    )}

                    {onRemoveProposal && (
                      <button
                        type="button"
                        data-testid={`bulk-confirm-remove-${row.id}`}
                        disabled={submitting}
                        onClick={() => onRemoveProposal(row.id)}
                        className={`rp-focus inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                          hasErr
                            ? 'border-rp-danger-line bg-white text-rp-danger hover:bg-rp-danger-bg'
                            : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-line-strong hover:text-rp-text'
                        }`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                        <span>{tr('Bỏ chọn')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {hasErr && row.issues.length > 0 && (
                  <ul className="m-0 mt-2 list-disc space-y-0.5 pl-4 text-[11.5px] font-medium text-rp-danger">
                    {row.issues.map((iss, idx) => (
                      <li key={`${iss.code}-${idx}`}>{iss.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Optional Approval Note */}
        <Field label={tr('Ghi chú phê duyệt chung (nếu có)')}>
          <Textarea
            rows={2}
            maxLength={1500}
            value={reason}
            disabled={submitting}
            onChange={(e) => onReasonChange?.(e.target.value)}
            placeholder={tr('Ghi chú thêm cho giáo viên (nếu có)…')}
          />
        </Field>
      </div>
    </Modal>
  );
}
