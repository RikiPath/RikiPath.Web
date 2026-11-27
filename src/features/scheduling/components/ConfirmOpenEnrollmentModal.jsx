import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  DatePicker,
  Modal,
  SakuraDots,
  cx,
  formatDate,
  notify,
} from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import {
  confirmOpenEnrollment,
  previewOpenEnrollment,
} from '@/features/scheduling/api/teachingProposalApi.js';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import ProposalDetailedScheduleCard from '@/features/scheduling/components/ProposalDetailedScheduleCard.jsx';
import {
  DEFAULT_PROPOSAL_POLICY,
  formatTuitionVnd,
  normalizeProposalPolicy,
} from '@/features/scheduling/utils/proposalValidation.js';
import { shiftDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';

function createOpenEnrollmentIdempotencyKey(proposalId, revision) {
  const rnd = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `open-p${proposalId}-r${revision}-${rnd}`.slice(0, 128);
}

function formatVnDateDisplay(isoDate) {
  if (!isoDate) return '—';
  const formatted = formatDate(isoDate);
  return formatted || isoDate;
}

function SchedulePreviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1].map((wk) => (
        <div key={wk} className="overflow-hidden rounded-xl border border-rp-line/85 bg-white">
          <div className="flex items-center gap-2 border-b border-rp-brand-border/40 bg-rp-brand-tint/55 px-3.5 py-2.5">
            <span className="h-3.5 w-3.5 rounded-full bg-rp-brand-soft/80 animate-pulse" />
            <span className="h-3.5 w-36 rounded-full bg-rp-brand-soft/80 animate-pulse" />
          </div>
          <div className="divide-y divide-rp-line/55">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid min-h-[42px] grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2">
                <span className="h-5 w-full rounded-md bg-rp-bg-2 animate-pulse" />
                <span className="h-3.5 w-36 rounded-full bg-rp-bg-2 animate-pulse" />
                <span className="h-3.5 w-24 rounded-full bg-rp-bg-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderProjectedDateValue({ loading, dateValue, tokenKey }) {
  if (loading && !dateValue) {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-4 w-[84px] animate-pulse rounded-full bg-rp-brand-soft/65"
      />
    );
  }
  const formatted = dateValue ? formatVnDateDisplay(dateValue) : '—';
  return (
    <span
      key={loading ? 'updating' : `ready-${tokenKey}-${formatted}`}
      className={cx(
        'inline-flex h-5 items-center justify-end gap-2 font-semibold tabular-nums transition-opacity duration-200',
        loading
          ? 'text-rp-text-muted opacity-55'
          : dateValue
            ? 'rp-anim-fade text-rp-text'
            : 'text-rp-text-muted',
      )}
    >
      {loading && <SakuraDots size="sm" />}
      <span>{formatted}</span>
    </span>
  );
}

export default function ConfirmOpenEnrollmentModal({
  open,
  proposal,
  policy: policyProp = null,
  onClose,
  onSuccess,
}) {
  const { tr, trf } = useLocale();
  const policy = useMemo(() => normalizeProposalPolicy(policyProp || DEFAULT_PROPOSAL_POLICY), [policyProp]);
  const minDays = Math.max(1, Number(policy.minimumPublishedEnrollmentDays || 7));

  const todayVn = useMemo(() => toVnDateKey(new Date()), []);
  const minDeadlineDate = useMemo(() => shiftDateKey(todayVn, minDays), [todayVn, minDays]);

  const [deadlineDate, setDeadlineDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reqSeqRef = useRef(0);
  const proposalId = proposal?.id ?? null;

  const loadPreview = useCallback(async (targetProposalId, targetDate) => {
    if (!targetProposalId || !targetDate) return;
    const seq = ++reqSeqRef.current;
    setLoadingPreview(true);
    setPreviewError('');
    try {
      const data = await previewOpenEnrollment(targetProposalId, {
        enrollmentDeadlineLocalDate: targetDate,
      });
      if (reqSeqRef.current !== seq) return;
      setPreview(data || null);
    } catch (err) {
      if (reqSeqRef.current !== seq) return;
      const info = describeApiError(err);
      setPreview(null);
      setPreviewError(info.message || tr('Không thể tính toán lịch học dự kiến.'));
    } finally {
      if (reqSeqRef.current === seq) {
        setLoadingPreview(false);
      }
    }
  }, [tr]);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProposalId, setPrevProposalId] = useState(proposalId);
  if (open !== prevOpen || proposalId !== prevProposalId) {
    setPrevOpen(open);
    setPrevProposalId(proposalId);
    if (open) {
      setDeadlineDate('');
      setPreview(null);
      setPreviewError('');
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    reqSeqRef.current += 1;
  }, [open, proposalId]);

  const handleDeadlineChange = (nextDate) => {
    const cleaned = String(nextDate || '').trim();
    if (!cleaned) {
      reqSeqRef.current += 1;
      setDeadlineDate('');
      setPreview(null);
      setPreviewError('');
      setLoadingPreview(false);
      return;
    }
    setDeadlineDate(cleaned);
    if (cleaned < minDeadlineDate) {
      reqSeqRef.current += 1;
      setLoadingPreview(false);
      setPreview(null);
      setPreviewError(
        trf('Hạn tuyển sinh phải cách hiện tại tối thiểu {0} ngày (từ {1}).', {
          0: minDays,
          1: formatVnDateDisplay(minDeadlineDate),
        }),
      );
      return;
    }
    void loadPreview(proposalId, cleaned);
  };

  const handleApplySuggestedDeadline = () => {
    const suggested = preview?.suggestedEnrollmentDeadlineDate;
    if (!suggested) return;
    handleDeadlineChange(String(suggested));
  };

  const handleConfirm = async () => {
    if (!proposal || !deadlineDate || deadlineDate < minDeadlineDate) return;
    if (!preview?.canApprove || !preview?.schedulePreviewToken) return;

    setSubmitting(true);
    try {
      const result = await confirmOpenEnrollment(proposal.id, {
        enrollmentDeadlineLocalDate: deadlineDate,
        expectedRevision: proposal.revision,
        expectedSchedulePreviewToken: preview.schedulePreviewToken,
        idempotencyKey: createOpenEnrollmentIdempotencyKey(proposal.id, proposal.revision),
      });
      notify.success(
        trf('Đã mở tuyển sinh lớp "{0}" thành công.', {
          0: result?.cohortName || proposal.courseTitle || 'JLPT',
        }),
      );
      onSuccess?.(result);
    } catch (err) {
      const info = describeApiError(err);
      if (info.code === 'OPEN_ENROLLMENT_PREVIEW_STALE' || info.code === 'OPEN_ENROLLMENT_SCHEDULE_CONFLICT') {
        notify.warning(info.message || tr('Lịch dự kiến vừa thay đổi, vui lòng xem lại.'));
        await loadPreview(proposal.id, deadlineDate);
      } else {
        notify.error(info.message || tr('Không thể mở lớp tuyển sinh lúc này.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = Boolean(
    !loadingPreview
    && !submitting
    && !previewError
    && preview?.canApprove
    && preview?.schedulePreviewToken
    && deadlineDate
    && deadlineDate >= minDeadlineDate,
  );

  const occurrences = Array.isArray(preview?.occurrences) ? preview.occurrences : [];
  const totalSessions = preview?.totalSessions ?? proposal?.totalSessions ?? 0;
  const durationWeeks = preview?.courseDurationWeeks ?? proposal?.courseDurationWeeks ?? 1;
  const sessionMinutes = preview?.sessionDurationMinutes ?? proposal?.sessionDurationMinutes ?? policy.sessionDurationMinutes;
  const maxLearners = preview?.maxLearners ?? proposal?.maxLearners ?? policy.maxLearners;
  const totalTuition = preview?.totalCourseTuition ?? proposal?.totalCourseTuition ?? 0;
  const levelLabel = formatJlptLevel(proposal?.jlptLevelCode);
  const detailedCount = occurrences.length > 0 ? occurrences.length : totalSessions;
  const hasOccurrences = occurrences.length > 0;
  const scheduleValid = Boolean(!loadingPreview && !previewError && preview?.canApprove && hasOccurrences);
  const tokenKey = `${deadlineDate}-${preview?.schedulePreviewToken || ''}`;

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      dismissible={!submitting}
      size="xl"
      className="!max-h-[90dvh]"
      bodyClassName="flex flex-col md:overflow-hidden"
      title={tr('Xác nhận mở tuyển sinh')}
      description={tr('Chọn hạn tuyển sinh và kiểm tra lịch giảng dạy trước khi mở lớp.')}
      footer={(
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button type="button" variant="neutral" disabled={submitting} onClick={onClose}>
            {tr('Đóng')}
          </Button>
          <Button
            type="button"
            variant="primary"
            icon={CheckCircle2}
            loading={submitting}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {tr('Xác nhận mở tuyển sinh')}
          </Button>
        </div>
      )}
    >
      {!proposal ? null : (
        <div className="flex flex-col gap-4 md:min-h-0 md:flex-1">
          {/* 1-row Class Overview Summary */}
          <div className="shrink-0 rounded-xl border border-rp-line bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px]">
              <h3 className="m-0 text-[15px] font-bold leading-5 text-rp-text">
                {proposal.courseTitle || trf('Lớp JLPT {0}', { 0: levelLabel || '' })}
              </h3>
              {levelLabel && (
                <>
                  <span aria-hidden="true" className="hidden h-4 w-px bg-rp-line sm:inline-block" />
                  <Badge tone="brand" size="sm">{levelLabel}</Badge>
                </>
              )}
              <span aria-hidden="true" className="hidden h-4 w-px bg-rp-line sm:inline-block" />
              <Badge tone="success" size="sm">{tr('Đã duyệt')}</Badge>
              <span aria-hidden="true" className="hidden h-4 w-px bg-rp-line sm:inline-block" />
              <span className="font-medium text-rp-text-2 tabular-nums">
                {trf('{0} tuần · {1} buổi · {2} phút/buổi', {
                  0: durationWeeks,
                  1: totalSessions,
                  2: sessionMinutes,
                })}
              </span>
            </div>
          </div>

          {/* 2-Column Content (Left Column Sets Desktop Height; Right Column Matches & Scrolls Internally) */}
          <div className="grid grid-cols-1 gap-4 md:min-h-0 md:flex-1 md:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] md:items-stretch lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
            {/* Left Column: Thông tin tuyển sinh */}
            <section
              aria-labelledby="open-enroll-info-heading"
              className="flex min-w-0 flex-col rounded-xl border border-rp-line bg-white md:min-h-0 md:overflow-hidden"
            >
              <div className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-t-[11px] border-b border-rp-brand-border/45 bg-rp-brand-tint/65 px-4 py-2.5 text-[14px] font-bold leading-5 text-rp-brand-strong">
                <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                <h4 id="open-enroll-info-heading" className="m-0">{tr('Thông tin tuyển sinh')}</h4>
              </div>

              <div className="px-4 py-2 md:min-h-0 md:flex-1 md:overflow-y-auto rp-neutral-scroll">
                {/* Row: Mở tuyển sinh */}
                <div className="flex items-center justify-between gap-3 border-b border-rp-line/70 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-rp-text-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Mở tuyển sinh')}</span>
                  </span>
                  <span className="font-semibold text-rp-text tabular-nums">{formatVnDateDisplay(todayVn)}</span>
                </div>

                {/* Editable Row: Hạn tuyển sinh */}
                <div className="border-b border-rp-line/70 py-3.5">
                  <DatePicker
                    id="open-enrollment-deadline-picker"
                    label={tr('Hạn tuyển sinh')}
                    value={deadlineDate}
                    onChange={handleDeadlineChange}
                    min={minDeadlineDate}
                    clearable={false}
                    showToday={false}
                    fullWidth
                    floatingLabel
                    disabled={submitting}
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-4 text-rp-text-muted">
                    <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{trf('Tối thiểu {0} ngày tuyển sinh.', { 0: minDays })}</span>
                  </p>

                  {!loadingPreview && !previewError && preview?.canApprove && preview.wasShiftedDueToConflict && (
                    <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50/85 p-3 text-[12.5px] text-amber-950">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-semibold text-amber-950">{tr('Lịch bắt đầu được dời sang tuần trống tiếp theo')}</p>
                          {preview.conflictShiftReason && (
                            <p className="leading-5 text-amber-900/90">{preview.conflictShiftReason}</p>
                          )}
                          {preview.suggestedDeadlineReason && (
                            <p className="leading-5 text-amber-900">{preview.suggestedDeadlineReason}</p>
                          )}
                        </div>
                      </div>
                      {preview.suggestedEnrollmentDeadlineDate && (
                        <div>
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={handleApplySuggestedDeadline}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                            <span>
                              {trf('Áp dụng hạn tuyển sinh gợi ý ({0})', {
                                0: formatVnDateDisplay(preview.suggestedEnrollmentDeadlineDate),
                              })}
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Row: Ngày bắt đầu dự kiến */}
                <div className="flex items-center justify-between gap-3 border-b border-rp-line/70 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-rp-text-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Ngày bắt đầu dự kiến')}</span>
                  </span>
                  {renderProjectedDateValue({
                    loading: loadingPreview,
                    dateValue: preview?.startDate,
                    tokenKey,
                  })}
                </div>

                {/* Row: Ngày kết thúc dự kiến */}
                <div className="flex items-center justify-between gap-3 border-b border-rp-line/70 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-rp-text-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Ngày kết thúc dự kiến')}</span>
                  </span>
                  {renderProjectedDateValue({
                    loading: loadingPreview,
                    dateValue: preview?.endDate,
                    tokenKey,
                  })}
                </div>

                {/* Row: Sĩ số tối đa */}
                <div className="flex items-center justify-between gap-3 border-b border-rp-line/70 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-rp-text-2">
                    <Users className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Sĩ số tối đa')}</span>
                  </span>
                  <span className="font-semibold text-rp-text tabular-nums">
                    {trf('{0} học viên', { 0: maxLearners })}
                  </span>
                </div>

                {/* Row: Học phí dự kiến */}
                <div className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-rp-text-2">
                    <Layers className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                    <span>{tr('Học phí dự kiến')}</span>
                  </span>
                  <span className="text-right text-[15px] font-bold text-rp-brand-strong tabular-nums">
                    {formatTuitionVnd(totalTuition)}
                  </span>
                </div>
              </div>
            </section>

            {/* Right Column: Lịch giảng dạy (md+ pinned to left-column height so schedule list scrolls cleanly inside) */}
            <div className="min-w-0 md:relative md:min-h-0">
              <section
                aria-labelledby="open-enroll-schedule-heading"
                className="flex min-w-0 flex-col rounded-xl border border-rp-line bg-white md:absolute md:inset-0 md:overflow-hidden"
              >
                <div className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-t-[11px] border-b border-rp-brand-border/45 bg-rp-brand-tint/65 px-4 py-2.5 text-[14px] font-bold leading-5 text-rp-brand-strong">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <h4 id="open-enroll-schedule-heading" className="m-0">{tr('Lịch giảng dạy')}</h4>
                </div>

                <div className="flex flex-col gap-3 p-4 md:min-h-0 md:flex-1 md:overflow-hidden">
                  <div className="shrink-0">
                    <WeeklyScheduleDisplay
                      weeklySessions={proposal.weeklySessions}
                      sessionDurationMinutes={sessionMinutes}
                      variant="summary-rows"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 md:min-h-0 md:flex-1">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[14px] font-bold text-rp-text">
                        <CalendarDays className="h-4 w-4 shrink-0 text-rp-text-muted" aria-hidden="true" />
                        <span>{trf('Lịch giảng dạy chi tiết ({0} buổi)', { 0: detailedCount })}</span>
                      </div>
                      {loadingPreview ? (
                        <span
                          role="status"
                          aria-live="polite"
                          className="inline-flex items-center gap-1.5 rounded-full border border-rp-brand-border/60 bg-rp-brand-tint/75 px-2.5 py-0.5 text-[11.5px] font-semibold leading-4 text-rp-brand-strong"
                        >
                          <SakuraDots size="sm" />
                          <span>{tr('Đang cập nhật')}</span>
                        </span>
                      ) : scheduleValid ? (
                        <Badge tone="success" size="sm">{tr('Lịch hợp lệ')}</Badge>
                      ) : null}
                    </div>

                    <div className="md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1.5 rp-neutral-scroll">
                      {!deadlineDate && !loadingPreview && !previewError && !hasOccurrences && (
                        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-rp-brand-border/70 bg-rp-brand-tint/30 px-5 py-6 text-center md:h-full">
                          <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-rp-brand-border/60 bg-white text-rp-brand-strong shadow-xs">
                            <CalendarDays className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <p className="text-[13.5px] font-semibold text-rp-text">
                            {tr('Chọn hạn tuyển sinh để xem lịch chi tiết')}
                          </p>
                          <p className="mt-1 max-w-[320px] text-[12.5px] leading-5 text-rp-text-muted">
                            {tr('Hệ thống sẽ tự động xếp lịch từng buổi học và kiểm tra xung đột dựa trên hạn tuyển sinh bạn chọn.')}
                          </p>
                        </div>
                      )}

                      {loadingPreview && !hasOccurrences && <SchedulePreviewSkeleton />}

                      {!loadingPreview && previewError && (
                        <Banner tone="danger" title={tr('Chưa thể xếp lịch')}>
                          {previewError}
                        </Banner>
                      )}

                      {!loadingPreview && !previewError && preview && !preview.canApprove && (
                        <Banner tone="danger" title={tr('Không thể mở lớp trong khoảng thời gian đã chọn')}>
                          <p>{preview.blockingReason || tr('Lịch đang xung đột với các lớp chính thức của bạn.')}</p>
                          {Array.isArray(preview.conflicts) && preview.conflicts.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px]">
                              {preview.conflicts.slice(0, 5).map((c, idx) => (
                                <li key={`${c.code || 'c'}-${idx}`}>{c.message}</li>
                              ))}
                            </ul>
                          )}
                        </Banner>
                      )}

                      {hasOccurrences && (loadingPreview || (!previewError && preview?.canApprove)) && (
                        <ProposalDetailedScheduleCard
                          variant="weekly-compact"
                          occurrences={occurrences}
                          resetKey={`${proposal.id}-${tokenKey}`}
                          className={cx(
                            'pb-1 transition-opacity duration-200',
                            loadingPreview ? 'pointer-events-none opacity-45' : 'rp-anim-fade',
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
