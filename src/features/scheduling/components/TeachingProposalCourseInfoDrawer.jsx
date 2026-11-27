import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  CustomSelect,
  Drawer,
  Field,
  Input,
  NumberInput,
  Textarea,
  formatTimeRange,
  notify,
} from '@/components/ui';
import {
  computeProposalTuitionPreview,
  resolveJlptLevelAvailability,
  sortWeeklySessions,
  weekdayLabelVn,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  formatAttachmentSize,
  getAttachmentExtension,
  getAttachmentFormatInfo,
  isAllowedAttachmentFile,
  MAX_PROPOSAL_ATTACHMENTS,
  resolveCanonicalMimeForExtension,
} from '@/features/scheduling/utils/attachmentHelpers.js';
import { uploadOptionalProposalAttachment } from '@/features/scheduling/api/teachingProposalApi.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { describeApiError } from '@/api/apiErrors.js';
import { useLocale } from '@/locales/locale.js';

const ELEVATED_FIELD_CLS = 'bg-white border-rp-line shadow-[0_1px_2px_rgba(20,24,35,0.06),0_1px_3px_rgba(20,24,35,0.04)] hover:border-[#E5B8C5] transition-shadow';

/**
 * Step 2: Course Info Drawer ("Thông tin lớp dự kiến").
 * Allows flexible positive integer course weeks (1..104) without mentor start-date selection.
 */
export default function TeachingProposalCourseInfoDrawer({
  open,
  mode = 'create',
  onClose,
  draft,
  onChange,
  availableLevels = [],
  qualifiedLevels = [],
  policy,
  validation,
  readOnly = false,
  mentorVerified = true,
  mentorVerifiedJlptLevel = null,
  showAllErrors = false,
  serverValidating = false,
  onOpenProposalList = null,
  onEditSchedule = null,
  scheduleChanged = false,
  onProceedToReview,
}) {
  const { tr, trf } = useLocale();
  const isRevision = mode === 'revision';
  const fileInputRef = useRef(null);
  const [uploadTasks, setUploadTasks] = useState([]);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const sessionKey = open ? `${mode}:${draft?.id ?? 'new'}` : '';
  const [prevSessionKey, setPrevSessionKey] = useState('');
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    setTouched({});
    setSubmitAttempted(false);
    setUploadTasks([]);
  }

  const markTouched = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const draftCertificateLevelId = draft?.certificateLevelId;
  const selectedLevelObj = useMemo(
    () => (availableLevels?.length ? availableLevels : qualifiedLevels || [])
      .find((l) => Number(l.certificateLevelId ?? l.id) === Number(draftCertificateLevelId)) || null,
    [availableLevels, qualifiedLevels, draftCertificateLevelId]
  );
  const selectedLevelCode = selectedLevelObj?.code || draft?.jlptLevelCode || '';
  const rawWeeks = draft?.courseDurationWeeks;
  const parsedWeeks = Number(rawWeeks);
  const maxWeeksLimit = Math.max(1, Number(policy?.maxCourseDurationWeeksTechnical ?? 104));
  const effectiveWeeksForPreview = Number.isInteger(parsedWeeks) && parsedWeeks >= 1 ? parsedWeeks : 0;
  const sessionDurationMinutes = Number(draft?.sessionDurationMinutes || policy?.sessionDurationMinutes || 90);
  const draftWeeklySessions = draft?.weeklySessions;
  const weeklySessions = useMemo(() => sortWeeklySessions(draftWeeklySessions || [], sessionDurationMinutes), [draftWeeklySessions, sessionDurationMinutes]);
  const plannedTotalSessions = weeklySessions.length * effectiveWeeksForPreview;
  const totalTeachingHours = Math.round(((plannedTotalSessions * sessionDurationMinutes) / 60) * 10) / 10;
  const tuitionPreview = useMemo(
    () => computeProposalTuitionPreview(selectedLevelCode, plannedTotalSessions, policy),
    [selectedLevelCode, plannedTotalSessions, policy]
  );

  const levelsList = useMemo(
    () => (availableLevels?.length ? availableLevels : qualifiedLevels || []),
    [availableLevels, qualifiedLevels]
  );

  const validatedLevels = validation?.levelAvailability;
  const currentProposalId = draft?.id || null;
  const levelAvailability = useMemo(
    () => (validatedLevels?.length
      ? validatedLevels
      : resolveJlptLevelAvailability({
        availableLevels: levelsList,
        qualifiedLevels,
        mentorVerified,
        mentorVerifiedJlptLevel,
        currentProposalId,
      })),
    [
      validatedLevels,
      levelsList,
      qualifiedLevels,
      mentorVerified,
      mentorVerifiedJlptLevel,
      currentProposalId,
    ]
  );

  const allLevelsUnavailable = useMemo(
    () => levelAvailability.length > 0 && levelAvailability.every((l) => !l.isAvailable),
    [levelAvailability]
  );

  const allBlockedByQualification = useMemo(
    () => allLevelsUnavailable && levelAvailability.every(
      (l) => l.blockingStatus === 'UnverifiedQualification' || l.blockingStatus === 'InsufficientQualification'
    ),
    [allLevelsUnavailable, levelAvailability]
  );

  const step2Errors = useMemo(
    () => (validation?.errors || []).filter((e) => e.step === 2),
    [validation?.errors]
  );
  const scheduleErrors = useMemo(
    () => (validation?.errors || []).filter((e) => e.step === 1),
    [validation?.errors]
  );
  const hasInvalidRevisionSchedule = isRevision
    && (weeklySessions.length < 1 || scheduleErrors.length > 0);

  const shouldShowFieldError = (field) => Boolean(showAllErrors || submitAttempted || touched[field]);
  const getFieldError = (field, codes) => {
    if (!shouldShowFieldError(field)) return '';
    return step2Errors.find((e) => codes.includes(e.code))?.message || '';
  };

  const levelError = getFieldError('certificateLevelId', [
    'PROPOSAL_LEVEL_REQUIRED',
    'PROPOSAL_LEVEL_INVALID',
    'PROPOSAL_LEVEL_NOT_SUPPORTED',
    'INSUFFICIENT_TEACHING_QUALIFICATION',
    'MENTOR_QUALIFICATION_NOT_VERIFIED',
  ]);
  const weeksError = getFieldError('courseDurationWeeks', [
    'PROPOSAL_COURSE_WEEKS_INVALID',
    'TOTAL_SESSIONS_EXCEEDS_LIMIT',
  ]);
  const titleError = getFieldError('courseTitle', [
    'PROPOSAL_TITLE_REQUIRED',
  ]);
  const objectiveError = getFieldError('courseObjective', []);

  const handleSelectLevel = (nextLevelId) => {
    markTouched('certificateLevelId');
    const numId = nextLevelId ? Number(nextLevelId) : null;
    const foundLevel = levelAvailability.find((l) => Number(l.certificateLevelId) === numId)
      || levelsList.find((l) => Number(l.certificateLevelId ?? l.id) === numId);
    onChange({
      certificateLevelId: numId,
      jlptLevelCode: foundLevel?.code || null,
      programType: 'StandardJlpt',
      coursePlanId: null,
    });
  };

  const attachmentsRef = useRef(draft?.optionalAttachments || []);
  useEffect(() => {
    attachmentsRef.current = draft?.optionalAttachments || [];
  }, [draft?.optionalAttachments]);

  const isAnyUploading = uploadTasks.some((t) => t.status === 'uploading');
  const hasFailedUpload = uploadTasks.some((t) => t.status === 'failed');

  const runUploadTask = async (task) => {
    setUploadTasks((prev) => [
      ...prev.filter((item) => item.tempId !== task.tempId),
      { ...task, status: 'uploading', errorMessage: '' },
    ]);
    try {
      const uploaded = await uploadOptionalProposalAttachment(task.file);
      const url = uploaded?.url || uploaded?.fileUrl || uploaded?.publicUrl;
      if (!url) {
        throw new Error(tr('Không nhận được đường dẫn tệp sau khi tải lên.'));
      }
      const resolvedName = uploaded?.originalFileName || task.name;
      const resolvedExt = getAttachmentExtension(resolvedName, uploaded?.storedFileName);
      const nextAttachment = {
        name: resolvedName,
        url,
        storedFileName: uploaded?.storedFileName || null,
        contentType: uploaded?.contentType || resolveCanonicalMimeForExtension(resolvedExt) || task.contentType || null,
        sizeBytes: uploaded?.sizeBytes || task.sizeBytes || null,
      };
      const latestList = attachmentsRef.current || [];
      if (latestList.length < MAX_PROPOSAL_ATTACHMENTS) {
        onChange({ optionalAttachments: [...latestList, nextAttachment] });
      }
      setUploadTasks((prev) => prev.filter((item) => item.tempId !== task.tempId));
      notify.success(tr('Đã đính kèm tệp tham khảo.'));
    } catch (err) {
      const message = describeApiError(err).message || err?.message || tr('Chưa thể tải tệp lên. Vui lòng thử lại.');
      setUploadTasks((prev) => prev.map((item) => (
        item.tempId === task.tempId
          ? { ...item, status: 'failed', errorMessage: message }
          : item
      )));
      notify.error(message);
    }
  };

  const handleOptionalFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || readOnly) return;

    const current = draft.optionalAttachments || [];
    if (current.length + uploadTasks.length >= MAX_PROPOSAL_ATTACHMENTS) {
      notify.error(trf('Tối đa {0} tệp đính kèm cho mỗi đề xuất.', { 0: MAX_PROPOSAL_ATTACHMENTS }));
      return;
    }

    const check = isAllowedAttachmentFile(file);
    if (!check.valid) {
      notify.error(tr(check.reason));
      return;
    }

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await runUploadTask({
      tempId,
      file,
      name: file.name,
      sizeBytes: file.size || 0,
      contentType: file.type || '',
    });
  };

  const removeAttachment = (index) => {
    if (readOnly) return;
    onChange({ optionalAttachments: (draft.optionalAttachments || []).filter((_, i) => i !== index) });
  };

  const removeUploadTask = (tempId) => {
    setUploadTasks((prev) => prev.filter((t) => t.tempId !== tempId));
  };

  const handleContinueToReview = () => {
    setTouched({ certificateLevelId: true, courseDurationWeeks: true, courseTitle: true, courseObjective: true });
    setSubmitAttempted(true);
    if (isAnyUploading || hasFailedUpload) {
      return;
    }
    if (!readOnly && (!validation?.step2Valid || !validation?.step1Valid)) {
      return;
    }
    onProceedToReview?.();
  };

  const feedbackMentionsAttachment = isRevision
    && Boolean(draft?.reviewReason)
    && /tài liệu|đính kèm|tệp|file|giáo trình|đề cương|syllabus|attachment/i.test(String(draft.reviewReason));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[min(520px,100vw)]"
      padded={false}
      title={isRevision ? tr('Chỉnh sửa đề xuất mở lớp') : tr('Thông tin lớp dự kiến')}
      description={
        isRevision
          ? tr('Cập nhật thông tin theo yêu cầu của quản trị viên trước khi gửi lại xét duyệt.')
          : tr('Điền thông tin lớp để gửi quản trị viên phê duyệt.')
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {isRevision ? tr('Đóng') : tr('Quay lại lịch')}
          </Button>
          {onProceedToReview && (
            <Button
              type="button"
              iconRight={ArrowRight}
              loading={serverValidating}
              disabled={isAnyUploading || hasFailedUpload}
              onClick={handleContinueToReview}
            >
              {tr('Kiểm tra đề xuất')}
            </Button>
          )}
        </div>
      }
    >
      <div className="min-h-full bg-rp-bg px-5 py-4 space-y-4">
        {isRevision && draft?.reviewReason && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/95 px-3.5 py-3 text-orange-950 shadow-[0_1px_2px_rgba(20,24,35,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C2410C]">
                <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
                {tr('Yêu cầu từ quản trị viên')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10.5px] font-bold text-orange-800">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C]" aria-hidden="true" />
                {tr('Cần bổ sung')}
              </span>
            </div>
            <p className="m-0 mt-1.5 text-xs leading-relaxed text-orange-950">{draft.reviewReason}</p>
          </div>
        )}

        {isRevision && (
          <div
            data-testid="revision-schedule-summary"
            className={`rounded-xl border bg-white p-3.5 shadow-[0_1px_2px_rgba(20,24,35,0.04)] space-y-2.5 ${
              hasInvalidRevisionSchedule
                ? 'border-red-300 bg-red-50/30'
                : 'border-rp-line'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                  {tr('Lịch giảng dạy cố định')}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full border border-rp-line bg-rp-muted px-2.5 py-0.5 text-[11px] font-semibold text-rp-text-2">
                {tr('Không hỗ trợ đổi lịch')}
              </span>
            </div>

            {weeklySessions.length === 0 ? (
              <p className="m-0 text-xs text-rp-text-muted">{tr('Chưa có buổi học nào.')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {weeklySessions.map((s) => (
                  <span
                    key={s.key || `${s.weekday}-${s.startMinute}`}
                    className="inline-flex items-center rounded-lg border border-[#F2CCD7] bg-[#FFF8FA] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#7D2941]"
                  >
                    {tr(weekdayLabelVn(s.weekday))} · {formatTimeRange(s.startClock, s.endClock)}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tabular-nums text-rp-text-2">
              <span>{trf('{0} buổi/tuần', { 0: weeklySessions.length })}</span>
              {effectiveWeeksForPreview > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{trf('{0} buổi ({1} tuần)', { 0: plannedTotalSessions, 1: effectiveWeeksForPreview })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{trf('{0} giờ', { 0: totalTeachingHours })}</span>
                </>
              )}
            </div>

            <p className="m-0 text-[11.5px] leading-relaxed text-rp-text-muted">
              {tr('Bạn chỉ có thể bổ sung thông tin khóa học theo yêu cầu của quản trị viên. Nếu muốn thay đổi khung giờ hoặc thời lượng, hãy hủy đề xuất này và đăng ký đề xuất mới.')}
            </p>

            {hasInvalidRevisionSchedule && (
              <div className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-900 space-y-1">
                <p className="m-0 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-700" aria-hidden="true" />
                  {weeklySessions.length < 1
                    ? tr('Vui lòng chọn ít nhất một khung giờ giảng dạy trước khi gửi lại xét duyệt.')
                    : tr('Lịch giảng dạy cần được kiểm tra hoặc điều chỉnh trước khi gửi lại xét duyệt.')}
                </p>
                {scheduleErrors.length > 0 && (
                  <ul className="m-0 list-disc pl-4 space-y-0.5">
                    {scheduleErrors.map((err, idx) => (
                      <li key={`${err.code}-${idx}`}>{err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {!mentorVerified && (
          <Banner tone="warning" title={tr('Hồ sơ Giáo viên chưa được phê duyệt')}>
            {tr('Bạn cần hoàn tất xác minh hồ sơ chuyên môn trước khi gửi đề xuất lên quản trị viên.')}
          </Banner>
        )}

        {allLevelsUnavailable && mentorVerified && (
          <Banner
            tone="warning"
            title={
              allBlockedByQualification
                ? tr('Chưa có trình độ JLPT đủ điều kiện giảng dạy')
                : tr('Chưa thể chọn trình độ JLPT')
            }
          >
            {allBlockedByQualification
              ? tr('Vui lòng cập nhật và chờ quản trị viên xác minh chứng chỉ JLPT trong mục Hồ sơ chuyên môn.')
              : tr('Vui lòng kiểm tra lại trình độ chuyên môn được cấp quyền.')}
          </Banner>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={tr('Trình độ JLPT giảng dạy')}
            required
            error={levelError}
            hint={isRevision ? <span className="text-rp-text-2">{tr('Cấp độ JLPT được giữ cố định cho đề xuất đang bổ sung.')}</span> : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <CustomSelect
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                triggerClassName={ELEVATED_FIELD_CLS}
                value={draft.certificateLevelId ? String(draft.certificateLevelId) : ''}
                disabled={readOnly || isRevision || levelAvailability.length === 0}
                aria-label={tr('Trình độ JLPT giảng dạy')}
                onChange={handleSelectLevel}
                options={levelAvailability.map((lvl) => ({
                  value: String(lvl.certificateLevelId),
                  label: formatJlptLevel(lvl.code || lvl.name),
                  disabled: !lvl.isAvailable,
                  description: lvl.isAvailable
                    ? undefined
                    : (lvl.unavailableReason || tr('Không đủ trình độ chuyên môn.')),
                }))}
              />
            )}
          </Field>

          <Field
            label={tr('Số tuần giảng dạy')}
            required
            error={weeksError}
            hint={isRevision ? <span className="text-rp-text-2">{tr('Thời lượng khóa học được giữ cố định cho đề xuất đã gửi.')}</span> : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <NumberInput
                id={id}
                aria-describedby={describedBy}
                min={1}
                max={maxWeeksLimit}
                disabled={readOnly || isRevision}
                className={ELEVATED_FIELD_CLS}
                value={draft.courseDurationWeeks ?? ''}
                invalid={invalid}
                onBlur={() => markTouched('courseDurationWeeks')}
                onChange={(val) => {
                  markTouched('courseDurationWeeks');
                  onChange({ courseDurationWeeks: val === '' || val === null ? '' : Number(val) });
                }}
              />
            )}
          </Field>
        </div>

        <div className="rounded-xl border border-rp-line bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(20,24,35,0.04)] space-y-2.5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 px-2 py-2">
              <div className="text-sm font-bold tabular-nums text-rp-text">{weeklySessions.length}</div>
              <div className="text-[11px] text-rp-text-muted">{tr('Số buổi mỗi tuần')}</div>
            </div>
            <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 px-2 py-2">
              <div className="text-sm font-bold tabular-nums text-rp-text">
                {effectiveWeeksForPreview > 0 ? plannedTotalSessions : '—'}
              </div>
              <div className="text-[11px] text-rp-text-muted">{tr('Tổng số buổi dự kiến')}</div>
            </div>
            <div className="rounded-lg border border-rp-line bg-rp-bg-2/40 px-2 py-2">
              <div className="text-sm font-bold tabular-nums text-rp-text">
                {effectiveWeeksForPreview > 0 ? `${totalTeachingHours} ${tr('giờ')}` : '—'}
              </div>
              <div className="text-[11px] text-rp-text-muted">{tr('Tổng giờ dạy dự kiến')}</div>
            </div>
          </div>
          <p className="m-0 text-xs text-rp-text-2">
            {tr('Lịch học chính thức sẽ được xác định sau khi đề xuất được duyệt.')}
          </p>
        </div>

        {tuitionPreview.totalCourseTuition > 0 && (
          <div className="rounded-xl border border-rp-line bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(20,24,35,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-rp-text-2">
                {tr('Học phí trọn khóa áp dụng cho học viên')}
              </span>
              <span className="text-sm font-bold tabular-nums text-rp-brand-strong">
                {tuitionPreview.formattedTotal}
                <span className="ml-1 text-xs font-medium text-rp-text-muted">/{tr('học viên')}</span>
              </span>
            </div>
          </div>
        )}

        {!isRevision && scheduleErrors.length > 0 && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Lịch giảng dạy cần điều chỉnh')}
            actions={
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                {tr('Quay lại lịch để chỉnh')}
              </Button>
            }
          >
            <ul className="m-0 list-disc pl-4 space-y-0.5 text-xs">
              {scheduleErrors.map((err, idx) => (
                <li key={`${err.code}-${idx}`}>{err.message}</li>
              ))}
            </ul>
          </Banner>
        )}

        <Field
          label={tr('Tên lớp')}
          required
          error={titleError}
        >
          <Input
            maxLength={200}
            disabled={readOnly}
            className={ELEVATED_FIELD_CLS}
            value={draft.courseTitle || ''}
            onBlur={() => markTouched('courseTitle')}
            onChange={(e) => {
              markTouched('courseTitle');
              onChange({ courseTitle: e.target.value });
            }}
            placeholder={tr('Ví dụ: JLPT N3 Tối Thứ 2–4–6 (Tháng 12)')}
            invalid={Boolean(titleError)}
          />
        </Field>

        <Field
          label={tr('Mục tiêu khóa học (không bắt buộc)')}
          error={objectiveError}
        >
          <Textarea
            rows={5}
            maxLength={1500}
            disabled={readOnly}
            className={ELEVATED_FIELD_CLS}
            value={draft.courseObjective || ''}
            onBlur={() => markTouched('courseObjective')}
            onChange={(e) => {
              markTouched('courseObjective');
              onChange({ courseObjective: e.target.value });
            }}
            placeholder={tr('Ví dụ: Hoàn thiện ngữ pháp và đọc hiểu N3, luyện đề sát cấu trúc JLPT, mục tiêu đạt từ 110/180 điểm.')}
            invalid={Boolean(objectiveError)}
          />
        </Field>

        <Field label={tr('Ghi chú cho quản trị viên (nếu có)')}>
          <Textarea
            rows={4}
            maxLength={2000}
            disabled={readOnly}
            className={ELEVATED_FIELD_CLS}
            value={draft.optionalNotes || ''}
            onChange={(e) => onChange({ optionalNotes: e.target.value })}
            placeholder={tr('Ví dụ: Ưu tiên học viên đã hoàn thành N4 hoặc ghi chú cần lưu ý thêm.')}
          />
        </Field>

        {/* Strictly OPTIONAL attachments */}
        <div
          className={`rounded-xl border border-dashed p-3.5 shadow-[0_1px_2px_rgba(20,24,35,0.05)] space-y-3 ${
            feedbackMentionsAttachment
              ? 'border-orange-300 bg-orange-50/40'
              : 'border-rp-line bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                <Paperclip className="h-4 w-4 text-rp-brand" />
                {tr('Tài liệu / đề cương đính kèm')}
                <Badge tone="neutral" size="sm" icon={false} className="px-2 py-0 text-[10.5px] leading-4">
                  {tr('Nếu có')}
                </Badge>
              </p>
              <p className="m-0 text-xs text-rp-text-2">
                {tr('Hỗ trợ PDF, Word, ảnh hoặc bảng tính (tối đa 5 tệp).')}
              </p>
            </div>
            {!readOnly && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={handleOptionalFileChange}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Upload}
                  loading={isAnyUploading}
                  disabled={isAnyUploading || (draft.optionalAttachments || []).length + uploadTasks.length >= MAX_PROPOSAL_ATTACHMENTS}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {tr('Tải tệp tham khảo')}
                </Button>
              </div>
            )}
          </div>

          {((draft.optionalAttachments || []).length > 0 || uploadTasks.length > 0) && (
            <ul className="m-0 list-none space-y-1.5 p-0">
              {(draft.optionalAttachments || []).map((att, idx) => {
                const format = getAttachmentFormatInfo(att.name, att.contentType, att.storedFileName);
                const IconComp = format.Icon;
                const sizeText = formatAttachmentSize(att.sizeBytes);
                return (
                  <li
                    key={`${att.storedFileName || att.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-rp-line bg-white px-3 py-2 text-xs"
                  >
                    <span
                      title={att.name}
                      className="flex min-w-0 items-center gap-2 font-medium text-rp-text"
                    >
                      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${format.iconBgClass}`} aria-hidden="true">
                        <IconComp className={`h-3.5 w-3.5 ${format.iconClass}`} />
                      </span>
                      <span className="truncate">{att.name}</span>
                      {format.badgeLabel && (
                        <span className={`shrink-0 rounded border px-1.5 py-0.25 text-[10px] font-bold uppercase leading-tight ${format.badgeClass}`}>
                          {format.badgeLabel}
                        </span>
                      )}
                      {sizeText && (
                        <span className="shrink-0 text-[11px] font-normal tabular-nums text-rp-text-muted">
                          ({sizeText})
                        </span>
                      )}
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={tr('Đã tải lên')} />
                    </span>
                    {!readOnly && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => removeAttachment(idx)}
                        aria-label={tr('Xóa tệp đính kèm')}
                      />
                    )}
                  </li>
                );
              })}

              {uploadTasks.map((task) => {
                const format = getAttachmentFormatInfo(task.name, task.contentType);
                const IconComp = format.Icon;
                const sizeText = formatAttachmentSize(task.sizeBytes);
                const isFailed = task.status === 'failed';
                return (
                  <li
                    key={task.tempId}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                      isFailed ? 'border-red-200 bg-red-50/60' : 'border-rp-line bg-rp-bg-2/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 font-medium text-rp-text">
                        {task.status === 'uploading' ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-rp-brand" aria-hidden="true" />
                        ) : (
                          <IconComp className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
                        )}
                        <span className="truncate">{task.name}</span>
                        {sizeText && (
                          <span className="shrink-0 text-[11px] font-normal tabular-nums text-rp-text-muted">
                            ({sizeText})
                          </span>
                        )}
                      </div>
                      <p className={`m-0 text-[11px] ${isFailed ? 'text-red-700' : 'text-rp-text-muted'}`}>
                        {task.status === 'uploading' ? tr('Đang tải tệp lên...') : (task.errorMessage || tr('Tải tệp thất bại.'))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isFailed && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          icon={RotateCcw}
                          onClick={() => void runUploadTask(task)}
                        >
                          {tr('Thử lại')}
                        </Button>
                      )}
                      {isFailed && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => removeUploadTask(task.tempId)}
                          aria-label={tr('Xóa tệp lỗi')}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {(isAnyUploading || hasFailedUpload) && (
            <p className="m-0 text-xs font-medium text-amber-800">
              {isAnyUploading
                ? tr('Đang tải tệp lên. Vui lòng đợi hoàn tất trước khi tiếp tục.')
                : tr('Có tệp tải lên thất bại. Vui lòng thử lại hoặc xóa tệp lỗi trước khi tiếp tục.')}
            </p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
