import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  CustomSelect,
  DatePicker,
  Drawer,
  Field,
  Input,
  Textarea,
  formatIsoDateDisplay,
  notify,
} from '@/components/ui';
import {
  resolveJlptLevelAvailability,
  validateCourseStartDate,
} from '@/features/scheduling/utils/proposalValidation.js';
import { uploadOptionalProposalAttachment } from '@/features/scheduling/api/teachingProposalApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { shiftDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { useLocale } from '@/locales/locale.js';

const ELEVATED_FIELD_CLS = 'bg-white border-rp-line shadow-[0_1px_2px_rgba(20,24,35,0.06),0_1px_3px_rgba(20,24,35,0.04)] hover:border-[#E5B8C5] transition-shadow';

/**
 * Step 2: Course Info Drawer ("Thông tin lớp dự kiến").
 * Concise, form-first drawer keeping all 6 fields, shared Sakura DatePicker
 * with disabledDate enforcement, qualification-aware JLPT selector, and clean inline errors.
 */
export default function TeachingProposalCourseInfoDrawer({
  open,
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
  onProceedToReview,
}) {
  const { tr, trf } = useLocale();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const sessionKey = open ? String(draft?.id ?? 'new') : '';
  const [prevSessionKey, setPrevSessionKey] = useState('');
  if (sessionKey !== prevSessionKey) {
    setPrevSessionKey(sessionKey);
    setTouched({});
    setSubmitAttempted(false);
  }

  const markTouched = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const todayVn = useMemo(() => toVnDateKey(new Date()), []);
  const leadDays = Math.max(0, Number(policy?.minimumProposalLeadDays ?? 7));
  const minDateVn = useMemo(() => shiftDateKey(todayVn, leadDays), [todayVn, leadDays]);

  const draftWeeklySessions = draft?.weeklySessions;
  const weeklySessions = useMemo(() => draftWeeklySessions || [], [draftWeeklySessions]);
  const isStartDateDisabled = useCallback(
    (dayKey) => !validateCourseStartDate({ dayKey, weeklySessions, policy }).valid,
    [weeklySessions, policy]
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
    [validatedLevels, levelsList, qualifiedLevels, mentorVerified, mentorVerifiedJlptLevel, currentProposalId]
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

  const shouldShowFieldError = (field) => Boolean(showAllErrors || submitAttempted || touched[field]);
  const getFieldError = (field, codes) => {
    if (!shouldShowFieldError(field)) return '';
    return step2Errors.find((e) => codes.includes(e.code))?.message || '';
  };

  const levelError = getFieldError('certificateLevelId', [
    'PROPOSAL_LEVEL_REQUIRED',
    'PROPOSAL_LEVEL_INVALID',
    'PROPOSAL_LEVEL_NOT_SUPPORTED',
    'PROPOSAL_DUPLICATE_ACTIVE_LEVEL',
    'DUPLICATE_ACTIVE_LEVEL_PROPOSAL',
    'INSUFFICIENT_TEACHING_QUALIFICATION',
    'MENTOR_QUALIFICATION_NOT_VERIFIED',
  ]);
  const dateError = getFieldError('expectedStartDate', [
    'PROPOSAL_START_DATE_REQUIRED',
    'PROPOSAL_START_DATE_PAST',
    'PAST_SCHEDULE_SLOT',
    'SESSION_ALREADY_STARTED',
    'INSUFFICIENT_PROPOSAL_LEAD_TIME',
    'INVALID_COURSE_START_DATE',
    'COURSE_START_SESSION_MISMATCH',
  ]);
  const objectiveError = getFieldError('courseObjective', [
    'PROPOSAL_OBJECTIVE_REQUIRED',
  ]);

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

  const handleOptionalFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || readOnly) return;

    const current = draft.optionalAttachments || [];
    if (current.length >= 5) {
      notify.error(tr('Tối đa 5 tệp đính kèm cho mỗi đề xuất.'));
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadOptionalProposalAttachment(file);
      const url = uploaded?.url || uploaded?.fileUrl || uploaded?.publicUrl;
      if (!url) {
        notify.error(tr('Không nhận được đường dẫn tệp sau khi tải lên.'));
        return;
      }
      onChange({
        optionalAttachments: [
          ...current,
          {
            name: uploaded?.originalFileName || file.name,
            url,
            storedFileName: uploaded?.storedFileName || null,
            contentType: file.type || null,
            sizeBytes: file.size || null,
          },
        ],
      });
      notify.success(tr('Đã đính kèm tệp tham khảo.'));
    } catch (err) {
      notify.error(
        describeApiError(err).message
        || tr('Chưa thể tải tệp lên. Bạn vẫn có thể gửi đề xuất mà không cần tệp đính kèm.')
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    if (readOnly) return;
    onChange({ optionalAttachments: (draft.optionalAttachments || []).filter((_, i) => i !== index) });
  };

  const handleContinueToReview = () => {
    setTouched({ certificateLevelId: true, expectedStartDate: true, courseObjective: true });
    setSubmitAttempted(true);
    if (!readOnly && (!validation?.step2Valid || !validation?.step1Valid)) {
      return;
    }
    onProceedToReview?.();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[min(520px,100vw)]"
      padded={false}
      title={tr('Thông tin lớp dự kiến')}
      description={tr('Điền thông tin lớp để gửi quản trị viên phê duyệt.')}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {tr('Quay lại lịch')}
          </Button>
          {onProceedToReview && (
            <Button
              type="button"
              iconRight={ArrowRight}
              loading={serverValidating}
              onClick={handleContinueToReview}
            >
              {tr('Kiểm tra đề xuất')}
            </Button>
          )}
        </div>
      }
    >
      <div className="min-h-full bg-[#F5F4F7] px-5 py-4 space-y-4">
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
                : tr('Tất cả trình độ JLPT khả dụng đang có đề xuất hoặc lớp hoạt động')
            }
            actions={
              !allBlockedByQualification && onOpenProposalList ? (
                <Button type="button" size="sm" variant="outline" onClick={onOpenProposalList}>
                  {tr('Xem danh sách đăng ký')}
                </Button>
              ) : null
            }
          >
            {allBlockedByQualification
              ? tr('Vui lòng cập nhật và chờ quản trị viên xác minh chứng chỉ JLPT trong mục Hồ sơ chuyên môn.')
              : tr('Mỗi trình độ N5–N2 chỉ được phép có 1 đề xuất chờ duyệt hoặc 1 lớp đang hoạt động cùng lúc.')}
          </Banner>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={tr('Trình độ JLPT giảng dạy')}
            required
            error={levelError}
          >
            {({ id, describedBy, invalid }) => (
              <CustomSelect
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                triggerClassName={ELEVATED_FIELD_CLS}
                value={draft.certificateLevelId ? String(draft.certificateLevelId) : ''}
                disabled={readOnly || levelAvailability.length === 0}
                aria-label={tr('Chọn trình độ JLPT')}
                onChange={handleSelectLevel}
                options={[
                  { value: '', label: tr('Chọn trình độ JLPT') },
                  ...levelAvailability.map((lvl) => {
                    const baseLabel = `${lvl.code}${lvl.name && lvl.name !== lvl.code ? ` · ${lvl.name}` : ''}`;
                    return {
                      value: String(lvl.certificateLevelId),
                      label: baseLabel,
                      disabled: !lvl.isAvailable,
                      description: lvl.isAvailable
                        ? undefined
                        : (lvl.unavailableReason || tr('Không đủ trình độ chuyên môn.')),
                    };
                  }),
                ]}
              />
            )}
          </Field>

          <Field
            label={tr('Ngày khai giảng dự kiến')}
            required
            error={dateError}
            hint={
              !dateError && draft.expectedStartDate && validation?.projectedEndDate
                ? (
                  <span className="font-semibold text-rp-brand-strong">
                    {trf('Dự kiến kết thúc: {0}', {
                      0: formatIsoDateDisplay(validation.projectedEndDate),
                    })}
                  </span>
                )
                : undefined
            }
          >
            {({ id, describedBy, invalid }) => (
              <DatePicker
                id={id}
                aria-describedby={describedBy}
                fullWidth
                triggerClassName={ELEVATED_FIELD_CLS}
                min={minDateVn}
                disabledDate={isStartDateDisabled}
                disabled={readOnly}
                value={draft.expectedStartDate || ''}
                placeholder={tr('dd/MM/yyyy')}
                invalid={invalid}
                onBlur={() => markTouched('expectedStartDate')}
                onChange={(iso) => {
                  markTouched('expectedStartDate');
                  onChange({ expectedStartDate: iso || '' });
                }}
              />
            )}
          </Field>
        </div>

        {draft.expectedStartDate && scheduleErrors.length > 0 && (
          <Banner
            tone="danger"
            icon={AlertTriangle}
            title={tr('Lịch dạy đang chọn xung đột với ngày khai giảng này')}
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
          label={tr('Tên hiển thị đề xuất (không bắt buộc)')}
          hint={<span className="text-rp-text-2">{tr('Giúp bạn và quản trị viên dễ phân biệt khi phụ trách nhiều lớp khác cấp độ.')}</span>}
        >
          <Input
            maxLength={200}
            disabled={readOnly}
            className={ELEVATED_FIELD_CLS}
            value={draft.courseTitle || ''}
            onChange={(e) => onChange({ courseTitle: e.target.value })}
            placeholder={tr('Ví dụ: JLPT N3 Tối Thứ 2–4–6 (Tháng 12)')}
          />
        </Field>

        <Field
          label={tr('Mục tiêu khóa học')}
          required
          error={objectiveError}
          hint={<span className="text-rp-text-2">{tr('Nêu rõ đầu ra kỹ năng hoặc mục tiêu điểm số để quản trị viên thẩm định và học viên dễ nắm bắt.')}</span>}
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

        <Field
          label={tr('Ghi chú cho quản trị viên (không bắt buộc)')}
          hint={<span className="text-rp-text-2">{tr('Ghi chú thêm về đối tượng học viên, yêu cầu đầu vào hoặc lưu ý tổ chức lớp nếu có.')}</span>}
        >
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
        <div className="rounded-xl border border-dashed border-rp-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,24,35,0.05)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                <Paperclip className="h-4 w-4 text-rp-brand" />
                {tr('Tài liệu / đề cương đính kèm')}
                <Badge tone="neutral" size="sm" icon={false}>{tr('Không bắt buộc')}</Badge>
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
                  loading={uploading}
                  disabled={uploading || (draft.optionalAttachments || []).length >= 5}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {tr('Tải tệp tham khảo')}
                </Button>
              </div>
            )}
          </div>

          {(draft.optionalAttachments || []).length > 0 && (
            <ul className="m-0 list-none space-y-1.5 p-0">
              {(draft.optionalAttachments || []).map((att, idx) => (
                <li
                  key={`${att.url}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-rp-line bg-white px-3 py-2 text-xs"
                >
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rp-link flex min-w-0 items-center gap-2 font-medium text-rp-text hover:text-rp-brand"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-rp-brand" />
                    <span className="truncate">{att.name}</span>
                  </a>
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
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
