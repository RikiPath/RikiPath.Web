import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useNow } from '@/hooks/useNow.js';
import {
  createCohortHomework,
  generateHomeworkAiDraft,
  gradeHomeworkAssignment,
  openHomeworkScan,
  submitHomeworkScan,
  submitHomeworkText,
} from '@/features/cohorts/api/cohortApi';
import {
  HOMEWORK_FEEDBACK_MAX,
  HOMEWORK_SCAN_MAX_BYTES,
  HOMEWORK_SCAN_TYPES,
  aiDraftNotice,
  buildGradePayload,
} from '@/features/homework/utils/homeworkModel';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ContextualEmptyState,
  CustomSelect,
  Drawer,
  Field,
  FileUpload,
  Input,
  Modal,
  Radio,
  Textarea,
} from '@/components/ui';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');
const scopeLabel = (scope) => (
  scope === 'CohortCommon'
    ? 'Giao chung cả lớp'
    : scope === 'CohortIndividual'
      ? 'Bài riêng cá nhân'
      : 'Bài tập'
);

function toIsoWithVnOffset(localVal) {
  if (!localVal) return null;
  const isoCandidate = localVal.length === 16 ? `${localVal}:00+07:00` : `${localVal}+07:00`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function CohortHomeworkPanel({
  cohortId,
  cohortName = '',
  cohortMap = null,
  coursesInCohort = [],
  items = [],
  role = 'Learner',
  busy = false,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const nowMs = useNow();
  const isMentor = role === 'Mentor';
  const isLearner = role === 'Learner';

  // Mentor Create Homework Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [scopeMode, setScopeMode] = useState('common');
  const [selectedLearners, setSelectedLearners] = useState([]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [createError, setCreateError] = useState('');

  // Learner drafts & active Submission Modal
  const [drafts, setDrafts] = useState({});
  const [submitModalItem, setSubmitModalItem] = useState(null);

  // Mentor active Grading Drawer
  const [gradingItemId, setGradingItemId] = useState(null);
  const [gradeInputs, setGradeInputs] = useState({});
  const [gradeError, setGradeError] = useState('');

  const gradingItem = useMemo(
    () => items.find((x) => Number(x.id) === Number(gradingItemId)) || null,
    [items, gradingItemId],
  );

  const toggleLearner = (learnerId) => {
    setSelectedLearners((cur) => (cur.includes(learnerId) ? cur.filter((x) => x !== learnerId) : [...cur, learnerId]));
  };

  const resetCreateForm = () => {
    setTitle('');
    setInstructions('');
    setDueAt('');
    setSelectedLearners([]);
    setCreateError('');
    setScopeMode('common');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanInstructions = instructions.trim();
    if (!cleanTitle || !cleanInstructions) {
      setCreateError('Vui lòng nhập tiêu đề và hướng dẫn chi tiết.');
      return;
    }
    if (scopeMode === 'individual' && selectedLearners.length === 0) {
      setCreateError('Chọn ít nhất một học viên để giao bài riêng.');
      return;
    }
    const isoDue = toIsoWithVnOffset(dueAt);
    if (dueAt && (!isoDue || new Date(isoDue).getTime() <= Date.now())) {
      setCreateError('Hạn nộp phải là thời điểm trong tương lai (giờ Việt Nam UTC+7).');
      return;
    }
    setCreateError('');
    await onRun(async () => {
      await createCohortHomework(cohortId, {
        cohortId,
        title: cleanTitle,
        instructions: cleanInstructions,
        dueAt: isoDue,
        targetLearnerIds: scopeMode === 'individual' ? selectedLearners : null,
      });
      resetCreateForm();
      setCreateOpen(false);
    }, 'Đã giao bài tập cho lớp nhóm.');
  };

  const openGradingDrawer = (item) => {
    setGradeError('');
    setGradingItemId(item.id);
    setGradeInputs((cur) => cur[item.id] ? cur : ({
      ...cur,
      [item.id]: {
        passed: item.publishedGrade?.passed ?? (item.aiDraft?.suggestedScore != null ? item.aiDraft.suggestedScore >= 60 : true),
        score: item.publishedGrade?.score ?? item.aiDraft?.suggestedScore ?? '',
        feedback: item.publishedGrade?.feedback ?? item.aiDraft?.feedback ?? '',
      },
    }));
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!gradingItem) return;
    const draft = gradeInputs[gradingItem.id] || {};
    const gradeCheck = buildGradePayload(draft);
    if (gradeCheck.error) {
      setGradeError(gradeCheck.error);
      return;
    }
    setGradeError('');
    await onRun(async () => {
      await gradeHomeworkAssignment(gradingItem.id, gradeCheck.payload);
      setGradingItemId(null);
    }, 'Đã chấm và công bố nhận xét cho học viên.');
  };

  const submitItemDraft = submitModalItem
    ? {
        text: drafts[submitModalItem.id]?.text ?? (submitModalItem.submission?.textContent || ''),
        files: drafts[submitModalItem.id]?.files ?? [],
      }
    : { text: '', files: [] };

  const attachedModalExercises = submitModalItem && Array.isArray(submitModalItem.exercises)
    ? submitModalItem.exercises
    : [];
  const modalUnfinishedExercises = attachedModalExercises.filter(
    (ex) => ex.scorePercent == null && ex.bestScorePercent == null && ex.completed !== true,
  );
  const modalBlockedByExercises = isLearner && modalUnfinishedExercises.length > 0;
  const modalHasPayload = Boolean(
    submitItemDraft.text.trim()
    || submitItemDraft.files.length > 0
    || submitModalItem?.submission?.hasScan
    || (attachedModalExercises.length > 0 && !modalBlockedByExercises),
  );

  const handleLearnerSubmit = async (e) => {
    e.preventDefault();
    if (!submitModalItem || modalBlockedByExercises || !modalHasPayload) return;
    const targetItem = submitModalItem;
    const fileDraft = submitItemDraft.files[0] || null;
    const trimmedText = submitItemDraft.text.trim();

    await onRun(async () => {
      if (fileDraft) {
        const form = new FormData();
        if (trimmedText) form.append('textContent', trimmedText);
        form.append('scan', fileDraft);
        await submitHomeworkScan(targetItem.id, form);
      } else {
        await submitHomeworkText(targetItem.id, { textContent: trimmedText, fileUrl: null });
      }
      setSubmitModalItem(null);
    }, targetItem.submission ? 'Đã cập nhật bài nộp.' : 'Đã nộp bài thành công.');
  };

  const activeGradeDraft = gradingItem
    ? (gradeInputs[gradingItem.id] ?? {
        passed: gradingItem.publishedGrade?.passed ?? (gradingItem.aiDraft?.suggestedScore != null ? gradingItem.aiDraft.suggestedScore >= 60 : true),
        score: gradingItem.publishedGrade?.score ?? gradingItem.aiDraft?.suggestedScore ?? '',
        feedback: gradingItem.publishedGrade?.feedback ?? gradingItem.aiDraft?.feedback ?? '',
      })
    : null;

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Bài tập lớp nhóm (chung & cá nhân)"
        description="Phân tách rõ bài giao chung cả lớp và bài giao riêng cho từng học viên. Học viên có thể nộp chữ viết hoặc ảnh/PDF bài làm."
        actions={isMentor && Boolean(cohortId) && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            disabled={busy}
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            {tr('Giao bài tập')}
          </Button>
        )}
      />

      {items.length === 0 ? (
        <ContextualEmptyState
          compact
          context="homework"
          title="Chưa có bài tập nhóm nào được giao"
          message={isMentor ? 'Bấm "Giao bài tập" để giao bài luyện tập hoặc viết cho lớp.' : 'Khi Giáo viên giao bài, danh sách sẽ hiển thị tại đây.'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cohortMeta = item.cohortId && cohortMap ? cohortMap.get(item.cohortId) : null;
            const resolvedCohortName = cohortMeta?.name || item.cohortName || cohortName;
            const resolvedCourseId = item.studyCourseId || cohortMeta?.courseId;
            const dueMs = item.dueAt
              ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(item.dueAt) ? item.dueAt : `${item.dueAt}Z`).getTime()
              : null;
            const isOverdue = Boolean(dueMs && dueMs < nowMs && item.status === 'Assigned');
            const attachedLessons = Array.isArray(item.lessons) ? item.lessons : [];
            const attachedExercises = Array.isArray(item.exercises) ? item.exercises : [];
            const unfinishedExercises = attachedExercises.filter(
              (ex) => ex.scorePercent == null && ex.bestScorePercent == null && ex.completed !== true,
            );
            const hasUnfinishedExercises = isLearner && unfinishedExercises.length > 0;
            const firstLessonId = attachedLessons[0]?.id || 0;

            const statusBadge = item.status === 'Graded'
              ? { tone: 'success', label: 'Đã chấm' }
              : item.status === 'Submitted'
                ? { tone: 'warning', label: 'Đã nộp' }
                : isOverdue
                  ? { tone: 'danger', label: 'Chưa nộp · Quá hạn' }
                  : { tone: 'neutral', label: 'Chưa nộp' };

            return (
              <Card key={item.id} density="compact" className="space-y-3 bg-rp-bg-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {resolvedCohortName && (
                        resolvedCourseId && isLearner ? (
                          <Link to={`/my-courses/${resolvedCourseId}?section=homework`}>
                            <Badge tone="brand" icon={false} size="sm">{resolvedCohortName}</Badge>
                          </Link>
                        ) : (
                          <Badge tone="brand" icon={false} size="sm">{resolvedCohortName}</Badge>
                        )
                      )}
                      <Badge tone="neutral" icon={false} size="sm">{tr(scopeLabel(item.assignmentScope))}</Badge>
                      <Badge tone={statusBadge.tone} size="sm">{tr(statusBadge.label)}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-rp-text">
                      {item.title}
                      {isMentor && item.learnerName ? ` · ${item.learnerName}` : ''}
                    </h3>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className="text-xs text-rp-text-muted">
                      {trf('Giao: {0} · Hạn: {1}', { 0: fmtDate(item.assignedAt), 1: fmtDate(item.dueAt) })}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {isLearner && item.status !== 'Graded' && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={() => setSubmitModalItem(item)}
                        >
                          {item.submission ? tr('Chỉnh sửa bài nộp') : tr('Nộp bài')}
                        </Button>
                      )}
                      {isMentor && item.submission && (
                        <Button
                          variant={item.publishedGrade ? 'secondary' : 'primary'}
                          size="sm"
                          icon={ClipboardCheck}
                          disabled={busy}
                          onClick={() => openGradingDrawer(item)}
                        >
                          {item.publishedGrade ? tr('Xem / sửa điểm') : tr('Chấm bài')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {item.instructions && (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-rp-text-2">{item.instructions}</p>
                )}

                {/* Đính kèm bài học & bài luyện tập (click trực tiếp để làm bài) */}
                {(attachedLessons.length > 0 || attachedExercises.length > 0) && (
                  <div className="space-y-2 rounded-xl border border-rp-line bg-rp-surface p-3 text-xs">
                    {attachedLessons.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-rp-text-muted">{tr('Bài học liên quan:')}</span>
                        {attachedLessons.map((lesson) => (
                          <Link
                            key={lesson.id}
                            to={`/lesson-practice?lessonId=${lesson.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-rp-line bg-rp-bg-2 px-2 py-0.5 font-medium text-rp-brand-strong hover:border-rp-brand-border"
                          >
                            <span>{lesson.title}</span>
                            <ExternalLink aria-hidden="true" className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    )}
                    {attachedExercises.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="font-semibold text-rp-text-muted">
                          {tr('Bài luyện tập bắt buộc')} ({attachedExercises.length - unfinishedExercises.length}/{attachedExercises.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attachedExercises.map((ex) => {
                            const score = ex.scorePercent ?? ex.bestScorePercent;
                            const done = score != null || ex.completed === true;
                            const badgeEl = (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rp-line bg-rp-bg-2 px-2.5 py-1 text-rp-text"
                              >
                                <CheckCircle2
                                  aria-hidden="true"
                                  className={done ? 'h-3.5 w-3.5 text-rp-success' : 'h-3.5 w-3.5 text-rp-text-muted'}
                                />
                                <span className="font-medium">{ex.title}</span>
                                <span className="text-rp-text-muted">
                                  {score != null ? `${score}%` : tr('Chưa làm')}
                                </span>
                                {firstLessonId > 0 && isLearner && <ExternalLink aria-hidden="true" className="h-3 w-3 text-rp-brand-strong" />}
                              </span>
                            );
                            return firstLessonId > 0 && isLearner ? (
                              <Link key={ex.id} to={`/lesson-practice?lessonId=${firstLessonId}`}>
                                {badgeEl}
                              </Link>
                            ) : (
                              <span key={ex.id}>{badgeEl}</span>
                            );
                          })}
                        </div>
                        {hasUnfinishedExercises && (
                          <p className="font-medium text-rp-warning" role="status">
                            {trf('Cần hoàn thành {0}/{1} bài luyện tập đính kèm trước khi nộp bài.', {
                              0: unfinishedExercises.length,
                              1: attachedExercises.length,
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {item.submission ? (
                  <div className="rounded-xl border border-rp-line bg-rp-surface p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-rp-text-muted">
                      <span>
                        {tr('Đã nộp lần')} {item.submission.revisionCount} {tr('lúc')} {fmtDate(item.submission.submittedAt)}
                        {item.submission.lastRevisedAtUtc ? trf(' (chỉnh sửa: {0})', { 0: fmtDate(item.submission.lastRevisedAtUtc) }) : ''}
                      </span>
                      {item.submission.hasScan && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Download}
                          disabled={busy}
                          onClick={() => onRun(() => openHomeworkScan(item.id), 'Đã tải tệp bài làm.')}
                        >
                          {tr('Tải tệp ảnh/PDF bài làm')}
                        </Button>
                      )}
                    </div>
                    {item.submission.textContent && (
                      <p className="whitespace-pre-wrap text-[13px] text-rp-text">{item.submission.textContent}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-rp-text-muted">{tr('Học viên chưa nộp bài.')}</p>
                )}

                {item.publishedGrade && (
                  <Banner
                    tone={item.publishedGrade.passed ? 'success' : 'warning'}
                    title={`${tr('Kết quả Giáo viên:')} ${item.publishedGrade.passed ? tr('Đạt') : tr('Chưa đạt')}${item.publishedGrade.score != null ? ` · ${item.publishedGrade.score}/100` : ''}`}
                  >
                    <span className="whitespace-pre-wrap">{item.publishedGrade.feedback}</span>
                  </Banner>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Giao bài tập mới (Mentor) */}
      <Modal
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        title={cohortName ? trf('Giao bài tập cho lớp {0}', { 0: cohortName }) : tr('Giao bài tập cho lớp')}
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              {tr('Hủy')}
            </Button>
            <Button
              type="submit"
              form="mentor-create-homework-form"
              variant="primary"
              loading={busy}
              disabled={!title.trim() || !instructions.trim() || (scopeMode === 'individual' && selectedLearners.length === 0)}
            >
              {tr('Giao bài tập')}
            </Button>
          </>
        )}
      >
        <form id="mentor-create-homework-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <Banner tone="danger">{tr(createError)}</Banner>}

          <div className="flex flex-wrap gap-4">
            <Radio
              name="homework-scope"
              checked={scopeMode === 'common'}
              onChange={() => setScopeMode('common')}
              label="Giao chung cả lớp"
            />
            <Radio
              name="homework-scope"
              checked={scopeMode === 'individual'}
              onChange={() => setScopeMode('individual')}
              label="Giao riêng học viên"
            />
          </div>

          {scopeMode === 'individual' && (
            <div className="space-y-2 rounded-xl border border-rp-line bg-rp-bg-2 p-3">
              <p className="text-xs font-semibold text-rp-text-2">{tr('Chọn học viên nhận bài:')}</p>
              {coursesInCohort.length === 0 ? (
                <p className="text-xs text-rp-text-muted">{tr('Chưa có học viên nào trong lớp.')}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {coursesInCohort.map((c) => (
                    <Checkbox
                      key={c.learnerId}
                      checked={selectedLearners.includes(c.learnerId)}
                      onChange={() => toggleLearner(c.learnerId)}
                      label={c.learnerName || tr('Học viên')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiêu đề bài tập" required>
              <Input
                required
                disabled={busy}
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tr('Ví dụ: Luyện viết Kanji bài 5')}
              />
            </Field>
            <Field label="Hạn nộp (giờ Việt Nam, tùy chọn)">
              <Input
                type="datetime-local"
                disabled={busy}
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Hướng dẫn chi tiết" required counter={`${instructions.trim().length} / 10000`}>
            <Textarea
              required
              rows={5}
              disabled={busy}
              maxLength={10000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={tr('Nêu rõ yêu cầu, cấu trúc cần luyện và hình thức nộp bài…')}
            />
          </Field>
        </form>
      </Modal>

      {/* Modal Nộp bài (Learner) */}
      <Modal
        open={Boolean(submitModalItem)}
        onClose={() => !busy && setSubmitModalItem(null)}
        title={submitModalItem?.submission ? 'Chỉnh sửa bài nộp' : 'Nộp bài tập'}
        description={submitModalItem?.title || ''}
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setSubmitModalItem(null)} disabled={busy}>
              {tr('Hủy')}
            </Button>
            <Button
              type="submit"
              form="learner-submit-homework-form"
              variant="primary"
              loading={busy}
              disabled={modalBlockedByExercises || !modalHasPayload}
            >
              {submitModalItem?.submission ? tr('Cập nhật bài nộp') : tr('Nộp bài')}
            </Button>
          </>
        )}
      >
        {submitModalItem && (
          <form id="learner-submit-homework-form" onSubmit={handleLearnerSubmit} className="space-y-4">
            {modalBlockedByExercises && (
              <Banner tone="warning">
                {trf('Cần hoàn thành {0}/{1} bài luyện tập đính kèm trước khi nộp bài.', {
                  0: modalUnfinishedExercises.length,
                  1: attachedModalExercises.length,
                })}
              </Banner>
            )}

            <Field
              label={submitModalItem.submission ? 'Chỉnh sửa câu trả lời (trước khi Giáo viên chấm)' : 'Nội dung bài làm'}
              counter={`${submitItemDraft.text.length} / 20000`}
            >
              <Textarea
                rows={5}
                disabled={busy}
                maxLength={20000}
                value={submitItemDraft.text}
                onChange={(e) =>
                  setDrafts((cur) => ({
                    ...cur,
                    [submitModalItem.id]: { ...cur[submitModalItem.id], text: e.target.value },
                  }))
                }
                placeholder={tr('Nhập đáp án tiếng Nhật, giải thích hoặc ghi chú bài viết…')}
              />
            </Field>

            <Field label="Ảnh / PDF bài viết tay (không bắt buộc)" hint="PNG, JPG hoặc PDF · tối đa 10 MB.">
              <FileUpload
                label="Chọn ảnh hoặc PDF bài làm"
                accept={HOMEWORK_SCAN_TYPES}
                maxBytes={HOMEWORK_SCAN_MAX_BYTES}
                files={submitItemDraft.files}
                disabled={busy}
                onChange={(nextFiles) =>
                  setDrafts((cur) => ({
                    ...cur,
                    [submitModalItem.id]: { ...cur[submitModalItem.id], files: nextFiles },
                  }))
                }
              />
            </Field>
          </form>
        )}
      </Modal>

      {/* Drawer Chấm bài & Nhận xét (Mentor) */}
      <Drawer
        open={Boolean(gradingItem)}
        onClose={() => !busy && setGradingItemId(null)}
        title={tr('Chấm bài & công bố nhận xét')}
        width="w-[min(560px,100vw)]"
      >
        {gradingItem && activeGradeDraft && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm text-rp-text">{gradingItem.title}</strong>
                {gradingItem.learnerName && <Badge tone="brand" icon={false} size="sm">{gradingItem.learnerName}</Badge>}
              </div>
              {gradingItem.instructions && (
                <p className="whitespace-pre-wrap text-rp-text-2 leading-relaxed">{gradingItem.instructions}</p>
              )}
              {gradingItem.submission && (
                <div className="border-t border-rp-line pt-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-rp-text-muted">
                    <span>
                      {tr('Nộp lần')} {gradingItem.submission.revisionCount} {tr('lúc')} {fmtDate(gradingItem.submission.submittedAt)}
                    </span>
                    {gradingItem.submission.hasScan && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Download}
                        disabled={busy}
                        onClick={() => onRun(() => openHomeworkScan(gradingItem.id), 'Đã tải tệp bài làm.')}
                      >
                        {tr('Tải tệp ảnh/PDF bài làm')}
                      </Button>
                    )}
                  </div>
                  {gradingItem.submission.textContent && (
                    <p className="whitespace-pre-wrap rounded-lg bg-rp-surface p-2.5 text-[13px] text-rp-text">
                      {gradingItem.submission.textContent}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Trợ lý chấm bài AI */}
            <div className="space-y-2 rounded-xl border border-rp-line bg-rp-surface p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-rp-text">{tr('Gợi ý chấm bài AI (chỉ Giáo viên xem)')}</span>
                <Button
                  variant="soft"
                  size="sm"
                  icon={Sparkles}
                  disabled={busy}
                  onClick={() => onRun(() => generateHomeworkAiDraft(gradingItem.id), aiDraftNotice)}
                >
                  {tr('Tạo gợi ý AI')}
                </Button>
              </div>
              {gradingItem.aiDraft?.unavailableReason && (
                <Banner tone="warning">{gradingItem.aiDraft.unavailableReason}</Banner>
              )}
              {gradingItem.aiDraft?.feedback && (
                <div className="rounded-lg bg-rp-bg-2 p-2.5 text-xs text-rp-text-2 space-y-1">
                  {gradingItem.aiDraft.suggestedScore != null && (
                    <p className="font-semibold text-rp-brand-strong">
                      {tr('Điểm gợi ý:')} {gradingItem.aiDraft.suggestedScore}/100
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{gradingItem.aiDraft.feedback}</p>
                </div>
              )}
            </div>

            {gradeError && <Banner tone="danger">{gradeError}</Banner>}

            <form onSubmit={handleGradeSubmit} className="space-y-4 border-t border-rp-line pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kết quả" required>
                  <CustomSelect
                    disabled={busy}
                    value={String(Boolean(activeGradeDraft.passed))}
                    onChange={(val) => setGradeInputs((cur) => ({
                      ...cur,
                      [gradingItem.id]: { ...activeGradeDraft, passed: val === 'true' },
                    }))}
                    options={[
                      { value: 'true', label: tr('Đạt') },
                      { value: 'false', label: tr('Chưa đạt') },
                    ]}
                  />
                </Field>

                <Field label="Điểm (0–100)" required>
                  <Input
                    required
                    type="number"
                    disabled={busy}
                    min={0}
                    max={100}
                    step="0.5"
                    value={activeGradeDraft.score}
                    onChange={(e) => setGradeInputs((cur) => ({
                      ...cur,
                      [gradingItem.id]: { ...activeGradeDraft, score: e.target.value },
                    }))}
                  />
                </Field>
              </div>

              <Field
                label="Nhận xét chính thức gửi học viên"
                required
                counter={`${(activeGradeDraft.feedback || '').trim().length} / ${HOMEWORK_FEEDBACK_MAX}`}
              >
                <Textarea
                  required
                  rows={5}
                  disabled={busy}
                  maxLength={HOMEWORK_FEEDBACK_MAX}
                  value={activeGradeDraft.feedback}
                  onChange={(e) => setGradeInputs((cur) => ({
                    ...cur,
                    [gradingItem.id]: { ...activeGradeDraft, feedback: e.target.value },
                  }))}
                  placeholder={tr('Nhận xét chi tiết điểm mạnh, lỗi cần sửa và hướng ôn luyện tiếp theo…')}
                />
              </Field>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => setGradingItemId(null)} disabled={busy}>
                  {tr('Đóng')}
                </Button>
                <Button type="submit" variant="primary" loading={busy}>
                  {tr('Lưu & công bố kết quả')}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
    </Card>
  );
}
