import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
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
  Drawer,
  Field,
  Input,
  Textarea,
  notify,
} from '@/components/ui';
import { PROPOSAL_PROGRAM_TYPES } from '@/features/scheduling/utils/proposalValidation.js';
import { uploadOptionalProposalAttachment } from '@/features/scheduling/api/teachingProposalApi.js';
import { describeApiError } from '@/api/apiErrors.js';
import { shiftDateKey, toVnDateKey } from '@/features/scheduling/utils/calendarGeometry.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Right-side Course Info Drawer for Mentor Teaching Proposals.
 * Keeps the primary calendar workspace visible above the fold while letting
 * Mentors configure JLPT level (self-selected N5-N1), program type, start date,
 * objectives, notes, and optional syllabus attachments.
 */
export default function TeachingProposalCourseInfoDrawer({
  open,
  onClose,
  draft,
  onChange,
  availableLevels = [],
  qualifiedLevels = [],
  coursePlans = [],
  policy,
  validation,
  readOnly = false,
  mentorVerified = true,
  mentorDeclaredJlptLevel = null,
  showAllErrors = false,
  onProceedToReview,
}) {
  const { tr, trf } = useLocale();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [touched, setTouched] = useState({});

  const markTouched = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const todayVn = useMemo(() => toVnDateKey(new Date()), []);
  const minDateVn = useMemo(() => shiftDateKey(todayVn, 1), [todayVn]);

  const levelsList = useMemo(
    () => (availableLevels?.length ? availableLevels : qualifiedLevels || []),
    [availableLevels, qualifiedLevels]
  );

  const filteredPlans = useMemo(() => {
    if (!draft.certificateLevelId) return coursePlans;
    return coursePlans.filter((p) => Number(p.certificateLevelId) === Number(draft.certificateLevelId));
  }, [coursePlans, draft.certificateLevelId]);

  const selectedPlan = useMemo(
    () => coursePlans.find((p) => Number(p.id) === Number(draft.coursePlanId)) || null,
    [coursePlans, draft.coursePlanId]
  );

  const objectiveRequired = !draft.coursePlanId;
  const step1Errors = (validation?.errors || []).filter((e) => e.step === 1);

  const shouldShowFieldError = (field) => Boolean(showAllErrors || touched[field]);
  const getFieldError = (field, codes) => {
    if (!shouldShowFieldError(field)) return '';
    return step1Errors.find((e) => codes.includes(e.code))?.message || '';
  };

  const levelError = getFieldError('certificateLevelId', ['PROPOSAL_LEVEL_REQUIRED', 'PROPOSAL_LEVEL_INVALID']);
  const dateError = getFieldError('expectedStartDate', ['PROPOSAL_START_DATE_REQUIRED', 'PROPOSAL_START_DATE_PAST']);
  const objectiveError = getFieldError('courseObjective', ['PROPOSAL_OBJECTIVE_REQUIRED']);

  const handleSelectLevel = (nextLevelId) => {
    markTouched('certificateLevelId');
    const numId = nextLevelId ? Number(nextLevelId) : null;
    const foundLevel = levelsList.find((l) => Number(l.certificateLevelId ?? l.id) === numId);
    const keepPlan = draft.coursePlanId && coursePlans.some(
      (p) => Number(p.id) === Number(draft.coursePlanId) && Number(p.certificateLevelId) === numId
    );
    onChange({
      certificateLevelId: numId,
      jlptLevelCode: foundLevel?.code || draft.jlptLevelCode || null,
      coursePlanId: keepPlan ? draft.coursePlanId : null,
    });
  };

  const handleSelectPlan = (nextPlanId) => {
    const numPlanId = nextPlanId ? Number(nextPlanId) : null;
    const plan = coursePlans.find((p) => Number(p.id) === numPlanId) || null;
    onChange({
      coursePlanId: numPlanId,
      certificateLevelId: plan ? Number(plan.certificateLevelId) : draft.certificateLevelId,
      jlptLevelCode: plan ? (plan.levelCode || draft.jlptLevelCode) : draft.jlptLevelCode,
      courseTitle: draft.courseTitle?.trim() ? draft.courseTitle : (plan?.name || ''),
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={tr('Thông tin lớp dự kiến')}
      description={trf('{0} tuần · {1} phút/buổi · {2}–{3} buổi/tuần · 1–{4} học viên.', {
        0: policy?.courseDurationWeeks ?? 10,
        1: policy?.sessionDurationMinutes ?? 90,
        2: policy?.minSessionsPerWeek ?? 2,
        3: policy?.maxSessionsPerWeek ?? 4,
        4: policy?.maxLearners ?? 4,
      })}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {validation?.step1Valid ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {tr('Thông tin lớp đã đầy đủ')}
              </span>
            ) : (
              <span className="text-rp-text-muted">
                {tr('Điền đủ trình độ JLPT, ngày khai giảng và mục tiêu khóa để gửi duyệt.')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {tr('Xong')}
            </Button>
            {onProceedToReview && (
              <Button
                type="button"
                iconRight={ArrowRight}
                onClick={() => {
                  setTouched({ certificateLevelId: true, expectedStartDate: true, courseObjective: true });
                  onProceedToReview();
                }}
              >
                {tr('Xem lại đề xuất')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {!mentorVerified && (
          <Banner tone="warning" title={tr('Hồ sơ Giáo viên chưa được phê duyệt')}>
            {tr('Bạn vẫn có thể soạn và lưu bản nháp đề xuất mở lớp, nhưng cần hoàn tất phê duyệt hồ sơ Giáo viên trước khi gửi duyệt lên Admin.')}
          </Banner>
        )}

        <div className="rounded-xl border border-[#F2CCD7] bg-[#FFF5F7]/70 px-3.5 py-2.5 text-xs text-[#7D2941] flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-rp-brand shrink-0" />
            {tr('Bạn tự chọn trình độ JLPT (N5–N1) phù hợp để đề xuất mở lớp. Admin sẽ đánh giá hồ sơ, chứng chỉ và lịch dạy khi xét duyệt.')}
          </span>
          {mentorDeclaredJlptLevel && (
            <Badge tone="brand" size="sm" icon={false}>
              {trf('Hồ sơ: {0}', { 0: mentorDeclaredJlptLevel })}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={tr('Trình độ JLPT giảng dạy')}
            required
            error={levelError}
          >
            <CustomSelect
              value={draft.certificateLevelId ? String(draft.certificateLevelId) : ''}
              disabled={readOnly || levelsList.length === 0}
              aria-label={tr('Chọn trình độ JLPT')}
              onChange={handleSelectLevel}
              options={[
                { value: '', label: tr('Chọn trình độ JLPT') },
                ...levelsList.map((lvl) => {
                  const idVal = lvl.certificateLevelId ?? lvl.id;
                  const matchesProfile = lvl.isRecommendedByProfile
                    || (mentorDeclaredJlptLevel && String(lvl.code).toUpperCase() === String(mentorDeclaredJlptLevel).toUpperCase());
                  const baseLabel = `${lvl.code}${lvl.name && lvl.name !== lvl.code ? ` · ${lvl.name}` : ''}`;
                  return {
                    value: String(idVal),
                    label: matchesProfile ? `${baseLabel} (${tr('Khớp hồ sơ')})` : baseLabel,
                  };
                }),
              ]}
            />
          </Field>

          <Field label={tr('Loại chương trình')} required>
            <CustomSelect
              value={draft.programType || 'StandardJlpt'}
              disabled={readOnly}
              aria-label={tr('Chọn loại chương trình')}
              onChange={(val) => onChange({ programType: val })}
              options={PROPOSAL_PROGRAM_TYPES.map((opt) => ({
                value: opt.value,
                label: tr(opt.label),
              }))}
            />
          </Field>

          <Field
            label={tr('Gói khóa học tham chiếu (không bắt buộc)')}
            hint={tr('Nếu chọn gói có sẵn, số buổi/tuần trên lịch cần khớp cấu hình gói.')}
          >
            <CustomSelect
              value={draft.coursePlanId ? String(draft.coursePlanId) : ''}
              disabled={readOnly || filteredPlans.length === 0}
              aria-label={tr('Chọn gói khóa học tham chiếu')}
              onChange={handleSelectPlan}
              options={[
                { value: '', label: tr('Không gắn gói sẵn — tự nhập mục tiêu khóa') },
                ...filteredPlans.map((pl) => ({
                  value: String(pl.id),
                  label: `${pl.name} (${pl.levelCode} · ${pl.sessionsPerWeek} buổi/tuần)`,
                })),
              ]}
            />
          </Field>

          <Field
            label={tr('Ngày khai giảng dự kiến')}
            required
            error={dateError}
            hint={tr('Múi giờ Việt Nam (GMT+7). Khuyến nghị chọn Thứ 2 đầu tuần.')}
          >
            <Input
              type="date"
              icon={Calendar}
              min={minDateVn}
              disabled={readOnly}
              value={draft.expectedStartDate || ''}
              onBlur={() => markTouched('expectedStartDate')}
              onChange={(e) => {
                markTouched('expectedStartDate');
                onChange({ expectedStartDate: e.target.value });
              }}
              invalid={Boolean(dateError)}
            />
          </Field>
        </div>

        {selectedPlan && (
          <div className="rounded-xl border border-[#F2CCD7] bg-[#FFF5F7]/70 px-3.5 py-2.5 text-xs text-[#7D2941]">
            <strong>{tr('Gói tham chiếu đã chọn')}:</strong>{' '}
            {selectedPlan.name} · {selectedPlan.levelCode} ·{' '}
            {trf('{0} buổi/tuần × {1} phút ({2} buổi toàn khóa)', {
              0: selectedPlan.sessionsPerWeek,
              1: selectedPlan.sessionMinutes,
              2: selectedPlan.totalSessions,
            })}
          </div>
        )}

        <Field
          label={tr('Tên hiển thị đề xuất (không bắt buộc)')}
          hint={tr('Giúp bạn và Admin dễ phân biệt khi bạn gửi nhiều đề xuất mở lớp song song.')}
        >
          <Input
            maxLength={200}
            disabled={readOnly}
            value={draft.courseTitle || ''}
            onChange={(e) => onChange({ courseTitle: e.target.value })}
            placeholder={tr('Ví dụ: JLPT N3 Tối Thứ 2–4–6 (Tháng 12)')}
          />
        </Field>

        <Field
          label={objectiveRequired ? tr('Mục tiêu khóa học') : tr('Mục tiêu khóa học (không bắt buộc)')}
          required={objectiveRequired}
          error={objectiveError}
          hint={
            objectiveRequired
              ? tr('Bắt buộc khi bạn không gắn gói khóa học có sẵn. Nêu rõ đầu ra kỹ năng hoặc mục tiêu kỳ thi.')
              : tr('Bạn có thể bổ sung thêm trọng tâm giảng dạy riêng cho lớp này.')
          }
        >
          <Textarea
            rows={3}
            maxLength={1500}
            disabled={readOnly}
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

        <Field label={tr('Ghi chú thêm cho Admin (không bắt buộc)')}>
          <Textarea
            rows={2}
            maxLength={2000}
            disabled={readOnly}
            value={draft.optionalNotes || ''}
            onChange={(e) => onChange({ optionalNotes: e.target.value })}
            placeholder={tr('Ví dụ: Ưu tiên học viên đã hoàn thành N4, có thể bắt đầu sớm hơn 1 tuần nếu đủ sĩ số.')}
          />
        </Field>

        {/* Strictly OPTIONAL attachments */}
        <div className="rounded-xl border border-dashed border-rp-line bg-rp-bg-2/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-rp-text">
                <Paperclip className="h-4 w-4 text-rp-brand" />
                {tr('Tài liệu / đề cương đính kèm')}
                <Badge tone="neutral" size="sm" icon={false}>{tr('Không bắt buộc')}</Badge>
              </p>
              <p className="mt-0.5 text-xs text-rp-text-muted">
                {tr('Tùy chọn tải lên giáo trình hoặc đề cương tham khảo (PDF, Word, ảnh, bảng tính). Không bắt buộc để gửi duyệt.')}
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
