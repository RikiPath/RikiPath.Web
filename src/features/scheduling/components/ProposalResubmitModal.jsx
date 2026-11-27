import { useMemo, useState } from 'react';
import { Paperclip, Send, Trash2, Upload } from 'lucide-react';
import {
  AttachmentItemRow,
  AttachmentPreviewModal,
  Badge,
  Banner,
  Button,
  Field,
  Input,
  Modal,
  Textarea,
  notify,
  useAttachmentPreview,
} from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import {
  fetchMentorProposalAttachmentBlob,
  fetchMentorProposalAttachmentPreview,
  resubmitTeachingProposal,
  uploadOptionalProposalAttachment,
} from '@/features/scheduling/api/teachingProposalApi.js';
import WeeklyScheduleDisplay from '@/features/scheduling/components/WeeklyScheduleDisplay.jsx';
import { buildSubmitIdempotencyKey } from '@/features/scheduling/utils/proposalDraftStorage.js';
import { formatTuitionVnd } from '@/features/scheduling/utils/proposalValidation.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { useLocale } from '@/locales/locale.js';

export default function ProposalResubmitModal({
  open,
  proposal,
  userId,
  onClose,
  onSuccess,
}) {
  const { tr, trf } = useLocale();
  const [courseTitle, setCourseTitle] = useState('');
  const [courseObjective, setCourseObjective] = useState('');
  const [optionalNotes, setOptionalNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { previewState, openPreview, closePreview } = useAttachmentPreview();

  const syncKey = open && proposal ? `${proposal.id ?? ''}:${proposal.updatedAt ?? ''}:${proposal.courseTitle ?? ''}` : null;
  const [prevSyncKey, setPrevSyncKey] = useState(null);
  if (syncKey && syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setCourseTitle(proposal.courseTitle || '');
    setCourseObjective(proposal.courseObjective || '');
    setOptionalNotes(proposal.optionalNotes || '');
    setAttachments(Array.isArray(proposal.optionalAttachments) ? proposal.optionalAttachments : []);
  }

  const trimmedTitle = courseTitle.trim();
  const canSubmit = Boolean(proposal && trimmedTitle.length > 0 && !uploading && !submitting);

  const lockedMeta = useMemo(() => {
    if (!proposal) return '';
    return trf('{0} tuần · {1} buổi/tuần · {2} buổi · Học phí dự kiến {3}', {
      0: proposal.courseDurationWeeks || 1,
      1: proposal.weeklySessionCount || (proposal.weeklySessions?.length ?? 0),
      2: proposal.totalSessions || 0,
      3: formatTuitionVnd(proposal.totalCourseTuition),
    });
  }, [proposal, trf]);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (attachments.length >= 5) {
      notify.warning(tr('Tối đa 5 tệp đính kèm cho mỗi đề xuất.'));
      return;
    }
    setUploading(true);
    try {
      const res = await uploadOptionalProposalAttachment(file);
      if (res?.url) {
        setAttachments((prev) => [
          ...prev,
          {
            name: res.name || file.name,
            url: res.url,
            storedFileName: res.storedFileName || null,
            contentType: res.contentType || file.type || null,
            sizeBytes: res.sizeBytes ?? file.size ?? null,
          },
        ]);
      }
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể tải tệp đính kèm.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!proposal || !canSubmit) return;

    setSubmitting(true);
    try {
      const updated = await resubmitTeachingProposal(proposal.id, {
        expectedRevision: proposal.revision,
        idempotencyKey: buildSubmitIdempotencyKey(userId, proposal.id, proposal.revision),
        certificateLevelId: proposal.certificateLevelId,
        programType: proposal.programType || 'StandardJlpt',
        coursePlanId: proposal.coursePlanId || null,
        courseTitle: trimmedTitle,
        courseObjective: courseObjective.trim() || null,
        expectedStartDate: null,
        courseDurationWeeks: proposal.courseDurationWeeks || 1,
        sessionDurationMinutes: proposal.sessionDurationMinutes || 90,
        weeklySessions: (proposal.weeklySessions || []).map((s) => ({
          weekday: Number(s.weekday),
          startMinute: Number(s.startMinute),
          endMinute: Number(s.endMinute || Number(s.startMinute) + Number(proposal.sessionDurationMinutes || 90)),
        })),
        optionalNotes: optionalNotes.trim() || null,
        optionalAttachments: attachments,
      });
      notify.success(tr('Đã gửi lại đăng ký thành công!'));
      onSuccess?.(updated);
    } catch (err) {
      notify.error(describeApiError(err).message || tr('Không thể gửi lại đề xuất lúc này.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={submitting ? undefined : onClose}
        dismissible={!submitting}
        size="lg"
        title={tr('Bổ sung thông tin & gửi lại đề xuất')}
        description={tr('Cập nhật tên lớp, mục tiêu, ghi chú hoặc tài liệu tham khảo theo góp ý của Quản trị viên. Lịch giảng dạy tuần giữ nguyên như đã gửi.')}
        footer={(
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
              {tr('Hủy')}
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{tr('Gửi lại đề xuất')}</span>
            </Button>
          </div>
        )}
      >
        {!proposal ? null : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {proposal.reviewReason && (
              <Banner tone="warning" title={tr('Yêu cầu bổ sung từ Quản trị viên')}>
                {proposal.reviewReason}
              </Banner>
            )}

            <div className="rounded-xl border border-rp-line bg-rp-surface-subtle/60 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {proposal.jlptLevelCode && <Badge tone="brand" size="sm">{formatJlptLevel(proposal.jlptLevelCode)}</Badge>}
                <span className="text-[12.5px] font-medium text-rp-text-muted">{lockedMeta}</span>
              </div>
              <div className="mt-2">
                <WeeklyScheduleDisplay
                  weeklySessions={proposal.weeklySessions}
                  sessionDurationMinutes={proposal.sessionDurationMinutes || 90}
                  variant="standard"
                  showSlotCount
                />
              </div>
            </div>

            <Field label={tr('Tên lớp')} required floatingLabel>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                maxLength={200}
                placeholder={tr('Ví dụ: JLPT N4 Căn bản - Tối Thứ 2/4/6')}
                required
              />
            </Field>

            <Field label={tr('Mục tiêu khóa học')} floatingLabel>
              <Textarea
                rows={3}
                maxLength={1500}
                value={courseObjective}
                onChange={(e) => setCourseObjective(e.target.value)}
                placeholder={tr('Mô tả ngắn mục tiêu đầu ra, trọng tâm kiến thức của khóa học...')}
              />
            </Field>

            <Field label={tr('Ghi chú cho Quản trị viên')} floatingLabel>
              <Textarea
                rows={3}
                maxLength={2000}
                value={optionalNotes}
                onChange={(e) => setOptionalNotes(e.target.value)}
                placeholder={tr('Giải trình hoặc thông tin bổ sung thêm...')}
              />
            </Field>

            <div className="flex flex-col gap-2 rounded-xl border border-rp-line bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rp-text">
                  <Paperclip className="h-4 w-4 text-rp-brand" aria-hidden="true" />
                  <span>{tr('Tài liệu đính kèm (tùy chọn)')}</span>
                </span>
                <label className="rp-focus inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rp-line px-3 py-1.5 text-[12px] font-semibold text-rp-text hover:bg-rp-surface-subtle">
                  <Upload className="h-3.5 w-3.5 text-rp-brand" aria-hidden="true" />
                  <span>{uploading ? tr('Đang tải...') : tr('Thêm tệp')}</span>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleUploadFile}
                    disabled={uploading || submitting}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.txt"
                  />
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="text-[12px] text-rp-text-muted">{tr('Chưa có tệp đính kèm.')}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {attachments.map((att, idx) => (
                    <div key={`${att.url}-${idx}`} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <AttachmentItemRow
                          attachment={att}
                          onPreview={() => openPreview(att, {
                            fetchPreview: () => fetchMentorProposalAttachmentPreview(proposal.id, idx),
                            fetchBlob: (opts) => fetchMentorProposalAttachmentBlob(proposal.id, idx, opts),
                          })}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAttachment(idx)}
                        aria-label={tr('Xóa tệp')}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rp-danger" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        )}
      </Modal>
      <AttachmentPreviewModal state={previewState} onClose={closePreview} />
    </>
  );
}
