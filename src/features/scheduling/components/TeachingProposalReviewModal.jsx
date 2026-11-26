import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Eye,
  Loader2,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Modal,
  formatIsoDateDisplay,
  formatTimeRange,
  notify,
} from '@/components/ui';
import ProposalDetailedScheduleCard from './ProposalDetailedScheduleCard.jsx';
import {
  formatAttachmentSize,
  getAttachmentIconComponent,
  isAttachmentInlinePreviewable,
  openOrDownloadBlob,
} from '@/features/scheduling/utils/attachmentHelpers.js';
import { fetchMentorProposalAttachmentBlob } from '@/features/scheduling/api/teachingProposalApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  computeProposalTuitionPreview,
  expandProposalOccurrences,
  formatTuitionVnd,
  PROPOSAL_STATUS_META,
  sortWeeklySessions,
  weekdayLabelVn,
} from '@/features/scheduling/utils/proposalValidation.js';
import { useLocale } from '@/locales/locale.js';

function classifyServerIssueStep(code = '') {
  if (
    code.includes('LEVEL')
    || code.includes('START_DATE')
    || code.includes('COURSE_START')
    || code.includes('LEAD_TIME')
    || code.includes('ALREADY_STARTED')
    || code.includes('QUALIFICATION')
    || code.includes('OBJECTIVE')
  ) {
    return 2;
  }
  return 1;
}

/**
 * Step 3 / Read-only Detail Modal:
 * - Editable Draft/ChangesRequested: "Xác nhận đề xuất mở lớp" with required confirmation checkbox & submit CTA.
 * - Submitted/Reviewed (PendingReview / Approved / Rejected): "Chi tiết đề xuất mở lớp" with status badge,
 *   contextual description, reviewer feedback if any, and clean Close / Withdraw footer.
 */
export default function TeachingProposalReviewModal({
  open,
  mode = 'create',
  baselineProposal = null,
  onClose,
  draft,
  availableLevels = [],
  qualifiedLevels = [],
  policy,
  validation,
  serverValidation,
  serverValidating = false,
  serverValidationError = null,
  onRetryValidation = null,
  readOnly = false,
  mentorVerified = true,
  submitting = false,
  onEditCourseInfo,
  onBackToCalendar,
  onEditSchedule = null,
  onSubmit,
  onStartRevision = null,
  onWithdraw = null,
}) {
  const { tr, trf } = useLocale();
  const isRevision = !readOnly && mode === 'revision';
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [loadingAttKey, setLoadingAttKey] = useState(null);

  const canOpenServerAttachment = Number.isFinite(Number(draft?.id)) && Number(draft.id) > 0;
  const handleAttachmentAction = async (att, idx, download = false) => {
    if (!canOpenServerAttachment || loadingAttKey) return;
    const key = `${idx}:${download ? 'dl' : 'view'}`;
    setLoadingAttKey(key);
    try {
      const blob = await fetchMentorProposalAttachmentBlob(Number(draft.id), idx, { download });
      openOrDownloadBlob(blob, att.name || 'tai-lieu-dinh-kem', {
        forceDownload: download,
        contentType: att.contentType,
      });
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể mở tài liệu đính kèm lúc này.'));
    } finally {
      setLoadingAttKey(null);
    }
  };

  const confirmResetKey = open
    ? `${mode}|${draft?.id ?? 'new'}|${draft?.status || ''}|${draft?.expectedStartDate || ''}|${(draft?.weeklySessions || []).map((s) => `${s.weekday}:${s.startMinute}`).join(',')}`
    : '';
  const [prevConfirmResetKey, setPrevConfirmResetKey] = useState('');
  if (confirmResetKey !== prevConfirmResetKey) {
    setPrevConfirmResetKey(confirmResetKey);
    setConfirmedReview(false);
  }

  const levelsList = useMemo(
    () => (availableLevels?.length ? availableLevels : qualifiedLevels || []),
    [availableLevels, qualifiedLevels]
  );

  const levelObj = useMemo(
    () => levelsList.find((l) => Number(l.certificateLevelId ?? l.id) === Number(draft?.certificateLevelId)) || null,
    [levelsList, draft?.certificateLevelId]
  );

  const draftWeeklySessions = draft?.weeklySessions;
  const weeklySessions = useMemo(() => sortWeeklySessions(draftWeeklySessions || []), [draftWeeklySessions]);
  const durationWeeks = Number(draft?.courseDurationWeeks || policy?.courseDurationWeeks || 10);
  const sessionMinutes = Number(draft?.sessionDurationMinutes || policy?.sessionDurationMinutes || 90);

  const serverOccurrences = serverValidation?.occurrencesPreview;
  const clientOccurrences = validation?.occurrences;
  const draftOccurrences = draft?.occurrencesPreview;
  const draftExpectedStart = draft?.expectedStartDate;

  const occurrences = useMemo(() => {
    let raw = [];
    if (readOnly) {
      if (Array.isArray(draftOccurrences) && draftOccurrences.length > 0) {
        raw = draftOccurrences;
      } else if (draftExpectedStart && weeklySessions.length > 0) {
        raw = expandProposalOccurrences({
          expectedStartDate: draftExpectedStart,
          weeklySessions,
          courseDurationWeeks: durationWeeks,
          sessionDurationMinutes: sessionMinutes,
        });
      }
    } else {
      raw = serverOccurrences?.length ? serverOccurrences : (clientOccurrences || []);
    }
    return [...raw].sort((a, b) => Number(a.sessionNumber || 0) - Number(b.sessionNumber || 0));
  }, [
    readOnly,
    draftOccurrences,
    draftExpectedStart,
    weeklySessions,
    durationWeeks,
    sessionMinutes,
    serverOccurrences,
    clientOccurrences,
  ]);

  const projectedEndDate = (readOnly ? draft?.projectedEndDate : (serverValidation?.projectedEndDate || validation?.projectedEndDate))
    || (occurrences.length > 0 ? occurrences[occurrences.length - 1].localDate : null);

  const totalSessionsDisplay = readOnly
    ? (occurrences.length || weeklySessions.length * durationWeeks)
    : (validation?.totalSessions ?? occurrences.length);

  const totalTeachingHoursDisplay = readOnly
    ? Math.round(((totalSessionsDisplay * sessionMinutes) / 60) * 10) / 10
    : (validation?.totalTeachingHours ?? Math.round(((totalSessionsDisplay * sessionMinutes) / 60) * 10) / 10);

  const serverErrors = (serverValidation?.issues || []).filter((i) => i.severity === 'Error');
  const clientErrors = validation?.errors || [];
  const allErrors = readOnly
    ? []
    : (serverErrors.length > 0
      ? serverErrors.map((e, idx) => ({
        key: `srv-${idx}-${e.code}`,
        step: classifyServerIssueStep(e.code),
        message: e.message,
      }))
      : clientErrors.map((e, idx) => ({
        key: `cli-${idx}-${e.code}`,
        step: e.step || 1,
        message: e.message,
      })));

  const hasStep1Errors = !readOnly && (clientErrors.some((e) => e.step === 1) || allErrors.some((e) => e.step === 1));
  const hasStep2Errors = !readOnly && (clientErrors.some((e) => e.step === 2) || allErrors.some((e) => e.step === 2));

  const needsServerCheck = Boolean(!readOnly && draft?.expectedStartDate && weeklySessions.length > 0);
  const serverVerifiedOk = !needsServerCheck || (!serverValidationError && serverValidation?.canSubmit === true);

  const showConfirmationCheckbox = !readOnly
    && mentorVerified
    && !serverValidationError
    && allErrors.length === 0
    && Boolean(validation?.canSubmit);

  const proposalDataReady = showConfirmationCheckbox
    && !serverValidating
    && serverVerifiedOk;

  const canSubmit = proposalDataReady && confirmedReview && !submitting;

  const statusMeta = PROPOSAL_STATUS_META[draft?.status] || null;
  const modalTitle = readOnly
    ? tr('Chi tiết đề xuất mở lớp')
    : isRevision
      ? tr('Xác nhận đề xuất đã chỉnh sửa')
      : tr('Xác nhận đề xuất mở lớp');

  const modalDescription = !readOnly
    ? (isRevision
      ? tr('Kiểm tra lại thông tin đã cập nhật trước khi gửi lại quản trị viên xét duyệt.')
      : tr('Kiểm tra lại thông tin trước khi gửi quản trị viên phê duyệt.'))
    : draft?.status === 'ChangesRequested'
      ? tr('Quản trị viên yêu cầu bổ sung thông tin cho đề xuất này. Xem phản hồi bên dưới và chỉnh sửa để gửi lại.')
      : draft?.status === 'PendingReview'
        ? tr('Đề xuất đã được gửi và đang chờ quản trị viên xem xét phê duyệt.')
        : draft?.status === 'Approved'
          ? (draft?.linkedCohortId || draft?.linkedCohortName
            ? tr('Đề xuất đã được quản trị viên phê duyệt, tự động tạo lớp và mở tuyển sinh.')
            : tr('Đề xuất đã được quản trị viên phê duyệt và sẵn sàng mở lớp học nhóm.'))
          : draft?.status === 'Rejected'
            ? tr('Đề xuất này không được phê duyệt. Xem phản hồi từ quản trị viên bên dưới.')
            : draft?.status === 'Withdrawn'
              ? tr('Đề xuất này đã được rút lại. Các khung giờ tạm giữ trước đó đã được giải phóng.')
              : tr('Thông tin chi tiết về đề xuất mở lớp của bạn.');

  const titleBadge = readOnly
    ? (statusMeta ? (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
          statusMeta.pillClass || 'border-rp-line bg-rp-bg-2 text-rp-text-2'
        }`}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: statusMeta.dot }}
        />
        {tr(statusMeta.label)}
      </span>
    ) : null)
    : isRevision
      ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA580C]" />
          {tr('Cần bổ sung')}
        </span>
      )
      : (proposalDataReady ? (
        <Badge tone="success" size="sm" icon={false}>
          {tr('Sẵn sàng gửi duyệt')}
        </Badge>
      ) : null);

  const resolvedTitle = draft?.courseTitle?.trim()
    || trf('Lớp JLPT {0} ({1} buổi/tuần)', {
      0: levelObj?.code || draft?.jlptLevelCode || 'JLPT',
      1: weeklySessions.length,
    });

  const attachments = draft?.optionalAttachments || [];

  const baselineAttKey = JSON.stringify(
    (baselineProposal?.optionalAttachments || []).map((a) => `${a.url || ''}|${a.name || ''}`)
  );
  const currentAttKey = JSON.stringify(
    attachments.map((a) => `${a.url || ''}|${a.name || ''}`)
  );
  const isFieldUpdated = (field) => {
    if (!isRevision || !baselineProposal) return false;
    if (field === 'optionalAttachments') return baselineAttKey !== currentAttKey;
    return String(draft?.[field] || '').trim() !== String(baselineProposal?.[field] || '').trim();
  };
  const scheduleChanged = useMemo(() => {
    if (!isRevision || !baselineProposal) return false;
    const baseKey = sortWeeklySessions(baselineProposal.weeklySessions || [])
      .map((s) => `${s.weekday}:${s.startMinute}:${s.endMinute || s.startMinute + sessionMinutes}`)
      .join(',');
    const curKey = weeklySessions
      .map((s) => `${s.weekday}:${s.startMinute}:${s.endMinute || s.startMinute + sessionMinutes}`)
      .join(',');
    return baseKey !== curKey
      || String(draft?.expectedStartDate || '') !== String(baselineProposal?.expectedStartDate || '');
  }, [baselineProposal, draft?.expectedStartDate, isRevision, sessionMinutes, weeklySessions]);

  const levelCodeForTuition = levelObj?.code || draft?.jlptLevelCode || '';
  const fallbackTuition = computeProposalTuitionPreview(levelCodeForTuition, totalSessionsDisplay, policy);
  const resolvedTotalTuition = Number(
    (readOnly ? draft?.totalCourseTuition : (serverValidation?.totalCourseTuition ?? draft?.totalCourseTuition))
    || fallbackTuition.totalCourseTuition
    || 0
  );

  const courseInfoRows = [
    { label: tr('Trình độ JLPT'), value: levelObj?.code || draft?.jlptLevelCode || '—' },
    { label: tr('Tên lớp'), value: resolvedTitle, updated: isFieldUpdated('courseTitle') },
    {
      label: tr('Ngày bắt đầu dự kiến'),
      value: draft?.expectedStartDate ? formatIsoDateDisplay(draft.expectedStartDate) : '—',
      updated: isFieldUpdated('expectedStartDate'),
    },
    {
      label: tr('Ngày kết thúc dự kiến'),
      value: projectedEndDate ? formatIsoDateDisplay(projectedEndDate) : '—',
    },
    {
      label: tr('Quy mô lớp'),
      value: Number(policy?.maxLearners) > 0
        ? trf('{0}–{1} học viên', { 0: Number(policy?.minLearners ?? policy?.minLearnersToStart ?? 1), 1: Number(policy.maxLearners) })
        : tr('Theo chính sách hiện hành'),
    },
    ...(resolvedTotalTuition > 0 ? [{
      label: tr('Học phí trọn khóa'),
      value: `${formatTuitionVnd(resolvedTotalTuition)} / ${tr('học viên')}`,
    }] : []),
    ...(draft?.linkedCohortName ? [{
      label: tr('Lớp đã mở'),
      value: draft.linkedCohortName,
    }] : []),
    {
      label: tr('Mục tiêu khóa học'),
      value: draft?.courseObjective?.trim() || tr('Không có'),
      muted: !draft?.courseObjective?.trim(),
      updated: isFieldUpdated('courseObjective'),
    },
    {
      label: tr('Ghi chú'),
      value: draft?.optionalNotes?.trim() || tr('Không có'),
      muted: !draft?.optionalNotes?.trim(),
      updated: isFieldUpdated('optionalNotes'),
    },
  ];
  const attachmentsUpdated = isFieldUpdated('optionalAttachments');

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      dismissible={!submitting}
      size="xl"
      title={modalTitle}
      titleBadge={titleBadge}
      description={modalDescription}
      footer={
        readOnly ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(draft?.status === 'PendingReview' || draft?.status === 'ChangesRequested') && onWithdraw && (
              <Button
                type="button"
                variant="outline"
                icon={Trash2}
                className="hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
                onClick={onWithdraw}
              >
                {tr('Hủy đề xuất')}
              </Button>
            )}
            {draft?.status === 'ChangesRequested' && onStartRevision ? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  {tr('Đóng')}
                </Button>
                <Button type="button" variant="primary" icon={Pencil} onClick={onStartRevision}>
                  {tr('Chỉnh sửa đề xuất')}
                </Button>
              </>
            ) : (
              <Button type="button" variant="primary" onClick={onClose}>
                {tr('Đóng')}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onEditCourseInfo && (
              <Button
                type="button"
                variant="outline"
                icon={Pencil}
                disabled={submitting}
                onClick={onEditCourseInfo}
              >
                {isRevision ? tr('Quay lại chỉnh sửa') : tr('Chỉnh sửa thông tin')}
              </Button>
            )}
            {!isRevision && (
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onBackToCalendar || onClose}
              >
                {tr('Chỉnh sửa lịch')}
              </Button>
            )}
            <span className="group relative inline-flex">
              <Button
                type="button"
                icon={Send}
                loading={submitting || (confirmedReview && serverValidating)}
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                {isRevision ? tr('Gửi lại xét duyệt') : tr('Gửi quản trị viên duyệt')}
              </Button>
              {!confirmedReview && !submitting && (
                <span
                  role="tooltip"
                  className="pointer-events-none invisible absolute bottom-full right-0 z-20 mb-2 w-max max-w-[260px] rounded-lg bg-rp-text px-2.5 py-1.5 text-[11.5px] font-medium leading-4 text-white opacity-0 shadow-rp-md transition-all duration-150 group-hover:visible group-hover:opacity-100"
                >
                  {tr('Vui lòng xác nhận trước khi gửi.')}
                </span>
              )}
            </span>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Compact Reviewer Request Box for ChangesRequested Proposals */}
        {draft?.reviewReason && draft?.status === 'ChangesRequested' && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/90 px-3.5 py-3 text-orange-950">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#C2410C]">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
              {tr('Yêu cầu từ quản trị viên')}
            </div>
            <p className="m-0 mt-1 text-xs leading-relaxed text-orange-950">{draft.reviewReason}</p>
          </div>
        )}

        {/* Reviewer Feedback Banner for Reviewed Proposals */}
        {readOnly && draft?.reviewReason && (draft.status === 'Rejected' || draft.status === 'Approved') && (
          <Banner
            tone={draft.status === 'Rejected' ? 'danger' : 'success'}
            title={
              draft.status === 'Rejected'
                ? tr('Lý do quản trị viên từ chối đề xuất')
                : tr('Ghi chú phê duyệt từ quản trị viên')
            }
          >
            {draft.reviewReason}
          </Banner>
        )}

        {/* Course Info & Schedule Summary Grid */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wide text-rp-text">
              {tr('Thông tin khóa học')}
            </div>

            <dl className="m-0 space-y-2 text-[13px] leading-5">
              {courseInfoRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[128px_minmax(0,1fr)] items-baseline gap-2.5">
                  <dt className="text-xs font-semibold text-rp-text-2">{row.label}</dt>
                  <dd className={`m-0 min-w-0 break-words font-medium ${row.muted ? 'text-rp-text-muted' : 'text-rp-text'}`}>
                    <span>{row.value}</span>
                    {row.updated && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.25 text-[10px] font-bold text-emerald-700 align-middle">
                        {tr('Đã cập nhật')}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-[128px_minmax(0,1fr)] items-baseline gap-2.5">
                <dt className="text-xs font-semibold text-rp-text-2">
                  <span>{tr('Tài liệu đính kèm')}</span>
                  {attachmentsUpdated && (
                    <span className="mt-0.5 block w-fit rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.25 text-[10px] font-bold text-emerald-700">
                      {tr('Đã cập nhật')}
                    </span>
                  )}
                </dt>
                <dd className="m-0 min-w-0 font-medium text-rp-text">
                  {attachments.length === 0 ? (
                    <span className="text-rp-text-muted">{tr('Không có')}</span>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-1.5">
                      {attachments.map((a, idx) => {
                        const IconComp = getAttachmentIconComponent(a.name, a.contentType);
                        const sizeText = formatAttachmentSize(a.sizeBytes);
                        const previewable = isAttachmentInlinePreviewable(a.name, a.contentType);
                        const isBusyView = loadingAttKey === `${idx}:view`;
                        const isBusyDl = loadingAttKey === `${idx}:dl`;
                        return (
                          <div
                            key={`${a.storedFileName || a.name}-${idx}`}
                            className="flex min-w-0 max-w-full items-center justify-between gap-2 rounded-lg border border-rp-line bg-white px-2.5 py-1.5 text-xs"
                          >
                            <span title={a.name} className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-rp-text">
                              <IconComp className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" aria-hidden="true" />
                              <span className="truncate">{a.name}</span>
                              {sizeText && (
                                <span className="shrink-0 text-[11px] font-normal tabular-nums text-rp-text-muted">
                                  ({sizeText})
                                </span>
                              )}
                            </span>
                            {canOpenServerAttachment && (
                              <span className="inline-flex shrink-0 items-center gap-1">
                                {previewable && (
                                  <button
                                    type="button"
                                    disabled={Boolean(loadingAttKey)}
                                    onClick={() => void handleAttachmentAction(a, idx, false)}
                                    className="rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 px-2 py-0.5 text-[11px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50"
                                  >
                                    {isBusyView ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                    <span>{tr('Xem')}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={Boolean(loadingAttKey)}
                                  onClick={() => void handleAttachmentAction(a, idx, true)}
                                  aria-label={trf('Tải xuống {0}', { 0: a.name })}
                                  className="rp-focus inline-flex items-center gap-1 rounded-md border border-rp-line bg-rp-bg-2/70 px-2 py-0.5 text-[11px] font-semibold text-rp-text hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong disabled:opacity-50"
                                >
                                  {isBusyDl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                  <span>{tr('Tải')}</span>
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="min-w-0 rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-rp-text">
                {tr('Lịch giảng dạy')}
              </div>
              {scheduleChanged && (
                <span
                  data-testid="review-schedule-changed-badge"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"
                >
                  {tr('Lịch giảng dạy đã thay đổi')}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {weeklySessions.length === 0 ? (
                <span className="text-xs text-rp-text-muted">{tr('Chưa chọn buổi học nào.')}</span>
              ) : (
                weeklySessions.map((s) => (
                  <span
                    key={s.key}
                    className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[#F2CCD7] bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-[#7D2941]"
                  >
                    {tr(weekdayLabelVn(s.weekday))} · {formatTimeRange(s.startClock, s.endClock)}
                  </span>
                ))
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">
                  {weeklySessions.length}
                </div>
                <div className="text-[11px] text-rp-text-muted">{tr('Buổi mỗi tuần')}</div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">{totalSessionsDisplay}</div>
                <div className="text-[11px] text-rp-text-muted">
                  {trf('Tổng buổi ({0} tuần)', { 0: durationWeeks })}
                </div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">{totalTeachingHoursDisplay} {tr('giờ')}</div>
                <div className="text-[11px] text-rp-text-muted">{tr('Tổng giờ dạy')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 10-Week Expanded Schedule Preview (Shared Component) */}
        <ProposalDetailedScheduleCard
          occurrences={occurrences}
          durationWeeks={durationWeeks}
          initialVisibleCount={6}
          columns="responsive-3"
          resetKey={confirmResetKey}
        />

        {/* Validation Summary (editable submission flow only) */}
        {!readOnly && !serverValidating && serverValidationError && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Chưa thể xác minh lịch với hệ thống')}
            actions={
              onRetryValidation ? (
                <Button type="button" size="sm" variant="outline" icon={RotateCcw} onClick={onRetryValidation}>
                  {tr('Thử kiểm tra lại')}
                </Button>
              ) : null
            }
          >
            {serverValidationError}
          </Banner>
        )}

        {!readOnly && !mentorVerified && (
          <Banner tone="warning" title={tr('Hồ sơ Giáo viên chưa được phê duyệt')}>
            {tr('Bạn cần hoàn tất phê duyệt hồ sơ Giáo viên trước khi gửi đề xuất lên quản trị viên.')}
          </Banner>
        )}

        {!readOnly && !serverValidating && allErrors.length > 0 && (
          <Banner tone="danger" icon={AlertTriangle} title={tr('Cần hoàn thiện trước khi gửi duyệt')}>
            <div className="space-y-2.5">
              <ul className="m-0 list-disc pl-4 space-y-1 text-xs">
                {allErrors.map((err) => (
                  <li key={err.key}>{err.message}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                {hasStep2Errors && onEditCourseInfo && (
                  <Button type="button" size="sm" variant="outline" onClick={onEditCourseInfo}>
                    {tr('Chỉnh sửa thông tin')}
                  </Button>
                )}
                {hasStep1Errors && (isRevision && onEditSchedule ? (
                  <Button type="button" size="sm" variant="outline" onClick={onEditSchedule}>
                    {tr('Chỉnh sửa lịch')}
                  </Button>
                ) : onBackToCalendar ? (
                  <Button type="button" size="sm" variant="outline" onClick={onBackToCalendar}>
                    {tr('Chỉnh sửa lịch')}
                  </Button>
                ) : null)}
              </div>
            </div>
          </Banner>
        )}

        {showConfirmationCheckbox && (
          <label className="inline-flex cursor-pointer items-center gap-2.5 pt-1 text-[13px] text-rp-text select-none">
            <input
              type="checkbox"
              required
              checked={confirmedReview}
              disabled={submitting}
              onChange={(e) => setConfirmedReview(e.target.checked)}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-rp-line outline-none ring-0 focus:outline-none focus:ring-0"
            />
            <span className="font-medium leading-snug">
              {tr('Tôi đã kiểm tra thông tin và toàn bộ lịch giảng dạy')}
              <span className="ml-1 font-bold text-red-600" aria-hidden="true">*</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
