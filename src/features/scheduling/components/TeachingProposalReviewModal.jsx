import { Fragment, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  FileText,
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
} from '@/components/ui';
import {
  expandProposalOccurrences,
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

function formatDayMonth(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return formatIsoDateDisplay(isoDate);
  return `${m[3]}/${m[2]}`;
}

function extractYear(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const m = isoDate.match(/^(\d{4})-/);
  return m ? m[1] : '';
}

/**
 * Step 3 / Read-only Detail Modal:
 * - Editable Draft/ChangesRequested: "Xác nhận đề xuất mở lớp" with required confirmation checkbox & submit CTA.
 * - Submitted/Reviewed (PendingReview / Approved / Rejected): "Chi tiết đề xuất mở lớp" with status badge,
 *   contextual description, reviewer feedback if any, and clean Close / Withdraw footer.
 */
export default function TeachingProposalReviewModal({
  open,
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
  onSubmit,
  onWithdraw = null,
}) {
  const { tr, trf } = useLocale();
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [confirmedReview, setConfirmedReview] = useState(false);

  const confirmResetKey = open
    ? `${draft?.id ?? 'new'}|${draft?.status || ''}|${draft?.expectedStartDate || ''}|${(draft?.weeklySessions || []).map((s) => `${s.weekday}:${s.startMinute}`).join(',')}`
    : '';
  const [prevConfirmResetKey, setPrevConfirmResetKey] = useState('');
  if (confirmResetKey !== prevConfirmResetKey) {
    setPrevConfirmResetKey(confirmResetKey);
    setConfirmedReview(false);
    setShowAllOccurrences(false);
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

  const scheduleYearRangeLabel = useMemo(() => {
    if (occurrences.length === 0) return '';
    const firstYear = extractYear(occurrences[0]?.localDate);
    const lastYear = extractYear(occurrences[occurrences.length - 1]?.localDate);
    if (!firstYear) return '';
    if (!lastYear || firstYear === lastYear) return firstYear;
    return `${firstYear}–${lastYear}`;
  }, [occurrences]);

  const spansMultipleYears = useMemo(() => {
    if (occurrences.length < 2) return false;
    return extractYear(occurrences[0]?.localDate) !== extractYear(occurrences[occurrences.length - 1]?.localDate);
  }, [occurrences]);

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
    : tr('Xác nhận đề xuất mở lớp');

  const modalDescription = !readOnly
    ? tr('Kiểm tra lại thông tin trước khi gửi quản trị viên phê duyệt.')
    : draft?.status === 'PendingReview'
      ? tr('Đề xuất đã được gửi và đang chờ quản trị viên xem xét phê duyệt.')
      : draft?.status === 'Approved'
        ? (draft?.linkedCohortId || draft?.linkedCohortName
          ? tr('Đề xuất đã được quản trị viên phê duyệt và đã xếp vào lớp học nhóm.')
          : tr('Đề xuất đã được quản trị viên phê duyệt và đang chờ xếp lớp (chưa có học viên đăng ký).'))
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

  const visibleOccurrences = showAllOccurrences ? occurrences : occurrences.slice(0, 6);
  const attachments = draft?.optionalAttachments || [];

  const courseInfoRows = [
    { label: tr('Trình độ JLPT'), value: levelObj?.code || draft?.jlptLevelCode || '—' },
    { label: tr('Tên lớp'), value: resolvedTitle },
    {
      label: tr('Khai giảng dự kiến'),
      value: draft?.expectedStartDate ? formatIsoDateDisplay(draft.expectedStartDate) : '—',
    },
    {
      label: tr('Kết thúc dự kiến'),
      value: projectedEndDate ? formatIsoDateDisplay(projectedEndDate) : '—',
    },
    {
      label: tr('Quy mô lớp'),
      value: trf('1–{0} học viên', { 0: policy?.maxLearners ?? 4 }),
    },
    ...(draft?.linkedCohortName ? [{
      label: tr('Lớp đã xếp'),
      value: draft.linkedCohortName,
    }] : []),
    {
      label: tr('Mục tiêu khóa học'),
      value: draft?.courseObjective?.trim() || tr('Không có'),
      muted: !draft?.courseObjective?.trim(),
    },
    {
      label: tr('Ghi chú'),
      value: draft?.optionalNotes?.trim() || tr('Không có'),
      muted: !draft?.optionalNotes?.trim(),
    },
  ];

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
            {draft?.status === 'PendingReview' && onWithdraw && (
              <Button
                type="button"
                variant="outline"
                icon={Trash2}
                onClick={onWithdraw}
              >
                {tr('Hủy đề xuất')}
              </Button>
            )}
            <Button type="button" variant="primary" onClick={onClose}>
              {tr('Đóng')}
            </Button>
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
                {tr('Chỉnh sửa thông tin')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onBackToCalendar || onClose}
            >
              {tr('Chỉnh sửa lịch')}
            </Button>
            <Button
              type="button"
              icon={Send}
              loading={submitting || (confirmedReview && serverValidating)}
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {tr('Gửi quản trị viên duyệt')}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
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
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
              {tr('Thông tin khóa học')}
            </div>

            <dl className="m-0 space-y-2 text-[13px] leading-5">
              {courseInfoRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[128px_1fr] items-baseline gap-2.5">
                  <dt className="text-xs font-medium text-rp-text-muted">{row.label}</dt>
                  <dd className={`m-0 break-words font-medium ${row.muted ? 'text-rp-text-muted' : 'text-rp-text'}`}>
                    {row.value}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-[128px_1fr] items-baseline gap-2.5">
                <dt className="text-xs font-medium text-rp-text-muted">{tr('Tài liệu đính kèm')}</dt>
                <dd className="m-0 font-medium text-rp-text">
                  {attachments.length === 0 ? (
                    <span className="text-rp-text-muted">{tr('Không có')}</span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1.5">
                      {attachments.map((a, idx) => (
                        <a
                          key={`${a.url}-${idx}`}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rp-link inline-flex items-center gap-1 rounded border border-rp-line bg-white px-2 py-0.5 text-xs text-rp-text hover:text-rp-brand"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{a.name}</span>
                        </a>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-rp-line bg-rp-bg-2/40 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
              {tr('Lịch giảng dạy')}
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
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">
                  {weeklySessions.length}/{policy?.maxSessionsPerWeek ?? 4}
                </div>
                <div className="text-[11px] text-rp-text-muted">{tr('Buổi / tuần')}</div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">{totalSessionsDisplay}</div>
                <div className="text-[11px] text-rp-text-muted">
                  {trf('Tổng buổi ({0} tuần)', { 0: durationWeeks })}
                </div>
              </div>
              <div className="rounded-lg border border-rp-line bg-white p-2.5">
                <div className="text-base font-bold tabular-nums text-rp-text">{totalTeachingHoursDisplay}h</div>
                <div className="text-[11px] text-rp-text-muted">{tr('Tổng giờ dạy')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 10-Week Expanded Schedule Preview */}
        {occurrences.length > 0 && (
          <div className="rounded-xl border border-rp-line bg-white p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                  <CalendarCheck className="h-4 w-4 text-rp-brand" />
                  {trf('Lịch chi tiết {0} tuần dự kiến ({1} buổi)', {
                    0: durationWeeks,
                    1: occurrences.length,
                  })}
                </h3>
                {scheduleYearRangeLabel && (
                  <span className="rounded-md border border-rp-line bg-rp-bg-2 px-2 py-0.5 text-[11px] font-bold tabular-nums text-rp-text">
                    {scheduleYearRangeLabel}
                  </span>
                )}
              </div>
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

            <div className={showAllOccurrences ? 'max-h-[300px] overflow-y-auto pr-1' : ''}>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleOccurrences.map((occ, idx) => {
                  const occYear = extractYear(occ.localDate);
                  const prevYear = idx > 0 ? extractYear(visibleOccurrences[idx - 1]?.localDate) : occYear;
                  const showYearDivider = spansMultipleYears && occYear && (idx === 0 || occYear !== prevYear);
                  return (
                    <Fragment key={`${occ.sessionNumber}-${occ.localDate}-${occ.localStart}`}>
                      {showYearDivider && (
                        <div className="col-span-full flex items-center gap-2 pt-1.5 first:pt-0 text-[11px] font-bold text-rp-text">
                          <span>{trf('Năm {0}', { 0: occYear })}</span>
                          <span className="h-px flex-1 bg-rp-line" />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-1.5 rounded-lg border border-rp-line bg-rp-bg-2/30 px-2.5 py-1.5 text-[11.5px] whitespace-nowrap">
                        <span className="font-semibold text-rp-text">
                          {trf('Buổi {0}', { 0: occ.sessionNumber })}
                          {' · '}
                          {weekdayLabelVn(occ.weekday)} - {formatDayMonth(occ.localDate)}
                        </span>
                        <span className="tabular-nums text-rp-text-2">
                          ({occ.localStart}–{occ.localEnd})
                        </span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
                {hasStep1Errors && onBackToCalendar && (
                  <Button type="button" size="sm" variant="outline" onClick={onBackToCalendar}>
                    {tr('Chỉnh sửa lịch')}
                  </Button>
                )}
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
