import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Modal,
} from '@/components/ui';
import {
  PROPOSAL_PROGRAM_TYPES,
  sortWeeklySessions,
  weekdayLabelVn,
} from '@/features/scheduling/utils/proposalValidation.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Sakura Review & Submit Modal triggered from the InteractiveSlotCalendar action bar.
 * Lets Mentors review full 10-week schedule expansion, workload impact, and course metadata
 * before calling the idempotent Admin submission endpoint.
 */
export default function TeachingProposalReviewModal({
  open,
  onClose,
  draft,
  availableLevels = [],
  qualifiedLevels = [],
  coursePlans = [],
  policy,
  validation,
  serverValidation,
  serverValidating = false,
  workload,
  readOnly = false,
  mentorVerified = true,
  submitting = false,
  onEditCourseInfo,
  onBackToCalendar,
  onSubmit,
}) {
  const { tr, trf } = useLocale();
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);

  const levelsList = useMemo(
    () => (availableLevels?.length ? availableLevels : qualifiedLevels || []),
    [availableLevels, qualifiedLevels]
  );

  const levelObj = useMemo(
    () => levelsList.find((l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)) || null,
    [levelsList, draft.certificateLevelId]
  );
  const planObj = useMemo(
    () => coursePlans.find((p) => Number(p.id) === Number(draft.coursePlanId)) || null,
    [coursePlans, draft.coursePlanId]
  );
  const programLabel = useMemo(() => {
    const found = PROPOSAL_PROGRAM_TYPES.find((t) => t.value === draft.programType);
    return found ? tr(found.label) : draft.programType;
  }, [draft.programType, tr]);

  const weeklySessions = useMemo(() => sortWeeklySessions(draft.weeklySessions || []), [draft.weeklySessions]);
  const occurrences = serverValidation?.occurrencesPreview?.length
    ? serverValidation.occurrencesPreview
    : (validation?.occurrences || []);

  const serverErrors = (serverValidation?.issues || []).filter((i) => i.severity === 'Error');
  const clientErrors = validation?.errors || [];
  const allErrors = serverErrors.length > 0
    ? serverErrors.map((e, idx) => ({
      key: `srv-${idx}-${e.code}`,
      step: e.code?.includes('LEVEL') || e.code?.includes('START_DATE') || e.code?.includes('OBJECTIVE') ? 1 : 2,
      message: e.message,
    }))
    : clientErrors.map((e, idx) => ({
      key: `cli-${idx}-${e.code}`,
      step: e.step || 2,
      message: e.message,
    }));

  const hasStep1Errors = clientErrors.some((e) => e.step === 1) || allErrors.some((e) => e.step === 1);
  const hasStep2Errors = clientErrors.some((e) => e.step === 2) || allErrors.some((e) => e.step === 2);

  const canSubmit = !readOnly
    && mentorVerified
    && !submitting
    && !serverValidating
    && Boolean(validation?.canSubmit)
    && (serverValidation ? serverValidation.canSubmit !== false : true);

  const visibleOccurrences = showAllOccurrences ? occurrences : occurrences.slice(0, 6);
  const projectedWeeklyTotal = (workload?.weeklyTotalProjectedSessions ?? 0)
    + (draft.status === 'PendingReview' ? 0 : weeklySessions.length);

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      dismissible={!submitting}
      size="xl"
      title={tr('Xem lại đề xuất mở lớp & Gửi Admin duyệt')}
      description={tr('Kiểm tra thông tin khóa học, lịch 10 tuần dự kiến và tổng tải giảng dạy trước khi gửi.')}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone={readOnly ? 'neutral' : canSubmit ? 'success' : 'warning'} size="sm" icon={false}>
            {readOnly ? tr('Chỉ xem') : canSubmit ? tr('Sẵn sàng gửi duyệt') : tr('Cần hoàn thiện thêm')}
          </Badge>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              icon={ArrowLeft}
              disabled={submitting}
              onClick={onBackToCalendar || onClose}
            >
              {tr('Quay lại lịch')}
            </Button>
            {!readOnly && (
              <Button
                type="button"
                icon={Send}
                loading={submitting}
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {tr('Gửi Admin duyệt')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Course & Schedule Summary Grid */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                {tr('Thông tin khóa học')}
              </span>
              {!readOnly && onEditCourseInfo && (
                <button
                  type="button"
                  onClick={onEditCourseInfo}
                  className="rp-link inline-flex items-center gap-1 text-xs font-semibold text-rp-brand"
                >
                  <Pencil className="h-3 w-3" />
                  {tr('Chỉnh sửa thông tin')}
                </button>
              )}
            </div>

            <p className="m-0"><strong>{tr('Trình độ JLPT')}:</strong> {levelObj?.code || draft.jlptLevelCode || '—'}</p>
            <p className="m-0"><strong>{tr('Chương trình')}:</strong> {programLabel}</p>
            {planObj && <p className="m-0"><strong>{tr('Gói tham chiếu')}:</strong> {planObj.name}</p>}
            {draft.courseTitle && <p className="m-0"><strong>{tr('Tên đề xuất')}:</strong> {draft.courseTitle}</p>}
            <p className="m-0">
              <strong>{tr('Khai giảng dự kiến')}:</strong> {draft.expectedStartDate || '—'}
              {validation?.projectedEndDate ? ` → ${validation.projectedEndDate}` : ''}
            </p>
            {draft.courseObjective && (
              <p className="m-0 text-xs text-rp-text-2">
                <strong>{tr('Mục tiêu')}:</strong> {draft.courseObjective}
              </p>
            )}
            {draft.optionalNotes && (
              <p className="m-0 text-xs text-rp-text-muted">
                <strong>{tr('Ghi chú')}:</strong> {draft.optionalNotes}
              </p>
            )}
            <div className="pt-1 text-xs text-rp-text-muted">
              <strong>{tr('Tệp đính kèm')}:</strong>{' '}
              {(draft.optionalAttachments || []).length === 0 ? (
                <span>{tr('Không đính kèm (không bắt buộc)')}</span>
              ) : (
                <span className="inline-flex flex-wrap gap-1.5">
                  {(draft.optionalAttachments || []).map((a, idx) => (
                    <a
                      key={`${a.url}-${idx}`}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rp-link inline-flex items-center gap-1 rounded border border-rp-line bg-white px-2 py-0.5 text-rp-text hover:text-rp-brand"
                    >
                      <FileText className="h-3 w-3" />
                      {a.name}
                    </a>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                {tr('Lịch dạy & tải giảng dạy')}
              </span>
              {!readOnly && onBackToCalendar && (
                <button
                  type="button"
                  onClick={onBackToCalendar}
                  className="rp-link inline-flex items-center gap-1 text-xs font-semibold text-rp-brand"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {tr('Sửa lịch trên calendar')}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {weeklySessions.length === 0 ? (
                <span className="text-xs text-rp-text-muted">{tr('Chưa chọn buổi học nào.')}</span>
              ) : (
                weeklySessions.map((s) => (
                  <span
                    key={s.key}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2CCD7] bg-white px-2.5 py-1 text-xs font-semibold text-[#7D2941]"
                  >
                    {weekdayLabelVn(s.weekday)} · {s.startClock}–{s.endClock}
                  </span>
                ))
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-lg border border-rp-line bg-white p-2">
                <div className="text-base font-bold tabular-nums text-rp-text">
                  {weeklySessions.length}/{policy?.maxSessionsPerWeek ?? 4}
                </div>
                <div className="text-[11px] text-rp-text-muted">{tr('Buổi / tuần')}</div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2">
                <div className="text-base font-bold tabular-nums text-rp-text">{validation?.totalSessions ?? 0}</div>
                <div className="text-[11px] text-rp-text-muted">
                  {trf('Tổng buổi ({0} tuần)', { 0: policy?.courseDurationWeeks ?? 10 })}
                </div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2">
                <div className="text-base font-bold tabular-nums text-rp-text">{validation?.totalTeachingHours ?? 0}h</div>
                <div className="text-[11px] text-rp-text-muted">{tr('Tổng giờ dạy')}</div>
              </div>
            </div>

            {workload && (
              <div className="rounded-lg border border-rp-line bg-white px-3 py-2 text-xs text-rp-text-2 space-y-0.5">
                <div>
                  {trf('Lớp đang mở: {0} · Đề xuất chờ duyệt khác: {1}', {
                    0: workload.activeCohortsCount,
                    1: workload.pendingProposalsCount,
                  })}
                </div>
                <div>
                  {trf('Tổng tải tuần dự kiến sau khi gửi: {0} buổi/tuần', { 0: projectedWeeklyTotal })}
                  {policy?.weeklySessionCap > 0
                    ? ` (${trf('giới hạn chính sách: {0}/tuần', { 0: policy.weeklySessionCap })})`
                    : ` (${trf('tối đa {0} buổi/ngày', { 0: policy?.dailySessionCap ?? 4 })})`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 10-Week Expanded Schedule Preview */}
        {occurrences.length > 0 && (
          <div className="rounded-xl border border-rp-line bg-white p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                <CalendarCheck className="h-4 w-4 text-rp-brand" />
                {trf('Lịch chi tiết {0} tuần dự kiến ({1} buổi · GMT+7)', {
                  0: policy?.courseDurationWeeks ?? 10,
                  1: occurrences.length,
                })}
              </h3>
              {occurrences.length > 6 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  iconRight={showAllOccurrences ? ChevronUp : ChevronDown}
                  onClick={() => setShowAllOccurrences((v) => !v)}
                >
                  {showAllOccurrences ? tr('Thu gọn') : trf('Xem đủ {0} buổi', { 0: occurrences.length })}
                </Button>
              )}
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleOccurrences.map((occ) => (
                <div
                  key={`${occ.sessionNumber}-${occ.localDate}`}
                  className="flex items-center justify-between rounded-lg border border-rp-line bg-rp-bg-2/30 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-semibold text-rp-text">
                    {trf('Buổi {0}', { 0: occ.sessionNumber })} · {trf('Tuần {0}', { 0: occ.weekNumber })}
                  </span>
                  <span className="tabular-nums text-rp-text-2">
                    {weekdayLabelVn(occ.weekday)} {occ.localDate} ({occ.localStart}–{occ.localEnd})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Checklist & Actionable Fixes */}
        {serverValidating && (
          <Banner tone="info">
            {tr('Đang đối chiếu lịch 10 tuần với hệ thống để đảm bảo không trùng lịch hoặc vượt chính sách tải dạy…')}
          </Banner>
        )}

        {!mentorVerified && (
          <Banner tone="warning" title={tr('Hồ sơ Giáo viên chưa được phê duyệt')}>
            {tr('Bạn cần hoàn tất phê duyệt hồ sơ Giáo viên trước khi gửi duyệt đề xuất lên Admin.')}
          </Banner>
        )}

        {!serverValidating && allErrors.length > 0 && (
          <Banner tone="danger" icon={AlertTriangle} title={tr('Cần hoàn thiện trước khi gửi duyệt')}>
            <div className="space-y-2.5">
              <ul className="m-0 list-disc pl-4 space-y-1 text-xs">
                {allErrors.map((err) => (
                  <li key={err.key}>{err.message}</li>
                ))}
              </ul>
              {!readOnly && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hasStep1Errors && onEditCourseInfo && (
                    <Button type="button" size="sm" variant="outline" onClick={onEditCourseInfo}>
                      {tr('Mở Thông tin lớp dự kiến')}
                    </Button>
                  )}
                  {hasStep2Errors && onBackToCalendar && (
                    <Button type="button" size="sm" variant="outline" onClick={onBackToCalendar}>
                      {tr('Điều chỉnh lịch trên calendar')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Banner>
        )}

        {!serverValidating && allErrors.length === 0 && canSubmit && (
          <Banner tone="success" icon={CheckCircle2} title={tr('Lịch dạy hợp lệ và không có xung đột')}>
            {tr('Đề xuất đáp ứng đầy đủ quy chuẩn 2–4 buổi/tuần, 90 phút/buổi, nghỉ tối thiểu 15 phút và không trùng với các lớp hoặc đề xuất khác.')}
          </Banner>
        )}
      </div>
    </Modal>
  );
}
