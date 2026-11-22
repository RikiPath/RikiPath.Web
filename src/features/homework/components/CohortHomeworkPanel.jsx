import { useState } from 'react';
import {
  createCohortHomework,
  generateHomeworkAiDraft,
  gradeHomeworkAssignment,
  openHomeworkScan,
  submitHomeworkScan,
  submitHomeworkText,
} from '@/features/cohorts/api/cohortApi';
import { FileText, Paperclip, X } from 'lucide-react';
import {
  HOMEWORK_FEEDBACK_MAX,
  aiDraftNotice,
  buildGradePayload,
  validateHomeworkScanFile,
} from '@/features/homework/utils/homeworkModel';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const fmtDate = (v) => (v ? formatVnDateTime(v, '—') : '—');
const scopeLabel = (scope) => (scope === 'CohortCommon' ? 'Giao chung cả lớp' : scope === 'CohortIndividual' ? 'Bài riêng cá nhân' : 'Bài tập');

export default function CohortHomeworkPanel({
  cohortId,
  cohortName = '',
  coursesInCohort = [],
  items = [],
  role = 'Learner',
  busy = false,
  onRun,
}) {
  const { tr, trf } = useLocale();
  const isMentor = role === 'Mentor';
  const isLearner = role === 'Learner';
  const [scopeMode, setScopeMode] = useState('common');
  const [selectedLearners, setSelectedLearners] = useState([]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [drafts, setDrafts] = useState({});
  const [gradeInputs, setGradeInputs] = useState({});
  const [localErrors, setLocalErrors] = useState({});
  const setLocalError = (id, message) => setLocalErrors((cur) => ({ ...cur, [id]: message }));

  const toggleLearner = (learnerId) => {
    setSelectedLearners((cur) => (cur.includes(learnerId) ? cur.filter((x) => x !== learnerId) : [...cur, learnerId]));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    onRun(async () => {
      await createCohortHomework(cohortId, {
        cohortId,
        title: title.trim(),
        instructions: instructions.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        targetLearnerIds: scopeMode === 'individual' ? selectedLearners : null,
      });
      setTitle('');
      setInstructions('');
      setDueAt('');
      setSelectedLearners([]);
    }, 'Đã giao bài tập cho lớp nhóm.');
  };

  return (
    <section className="course-box">
      <h2>{tr('Bài tập lớp nhóm (chung & cá nhân)')}</h2>
      <p className="course-meta">
        {tr('Phân tách rõ bài giao chung cả lớp và bài giao riêng cho từng học viên. Học viên có thể nộp chữ viết hoặc ảnh/PDF bài làm.')}
      </p>

      {isMentor && (
        <form className="course-form" onSubmit={handleCreate}>
          <h3>{cohortName ? trf('Giao bài tập cho lớp {0}', { 0: cohortName }) : tr('Giao bài tập cho lớp')}</h3>
          <div className="course-buttons" style={{ marginTop: 8 }}>
            <label>
              <input type="radio" checked={scopeMode === 'common'} onChange={() => setScopeMode('common')} />{' '}{tr('Giao chung cả lớp')}
            </label>
            <label>
              <input type="radio" checked={scopeMode === 'individual'} onChange={() => setScopeMode('individual')} />{' '}{tr('Giao riêng học viên')}
            </label>
          </div>
          {scopeMode === 'individual' && (
            <div className="course-buttons" style={{ marginTop: 8 }}>
              {coursesInCohort.map((c) => (
                <label key={c.learnerId}>
                  <input
                    type="checkbox"
                    checked={selectedLearners.includes(c.learnerId)}
                    onChange={() => toggleLearner(c.learnerId)}
                  />
                  {c.learnerName || tr('Học viên')}
                </label>
              ))}
            </div>
          )}
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>{tr('Tiêu đề bài tập')}</span>
              <input required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="course-field">
              <span>{tr('Hạn nộp (tùy chọn)')}</span>
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </label>
            <label className="course-field" style={{ flexBasis: '100%' }}>
              <span>{tr('Hướng dẫn chi tiết')}</span>
              <textarea required maxLength={10000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </label>
            <button
              className="course-primary"
              type="submit"
              disabled={busy || (scopeMode === 'individual' && selectedLearners.length === 0)}
            >
              {tr('Giao bài tập')}
            </button>
          </fieldset>
        </form>
      )}

      {items.length === 0 ? (
        <p className="course-meta" style={{ marginTop: 12 }}>{tr('Chưa có bài tập nhóm nào được giao.')}</p>
      ) : (
        items.map((item) => {
          const textDraft = drafts[item.id]?.text ?? (item.submission?.textContent || '');
          const fileDraft = drafts[item.id]?.file ?? null;
          const gradeDraft = gradeInputs[item.id] ?? {
            passed: item.publishedGrade?.passed ?? (item.aiDraft?.suggestedScore != null ? item.aiDraft.suggestedScore >= 60 : true),
            score: item.publishedGrade?.score ?? item.aiDraft?.suggestedScore ?? '',
            feedback: item.publishedGrade?.feedback ?? item.aiDraft?.feedback ?? '',
          };
          const canLearnerSubmit = isLearner && item.status !== 'Graded';
          const fileError = validateHomeworkScanFile(fileDraft);
          const gradeCheck = buildGradePayload(gradeDraft);

          return (
            <article className="course-row" key={item.id}>
              <div className="course-buttons" style={{ justifyContent: 'space-between' }}>
                <div>
                  <span className="course-badge">{scopeLabel(item.assignmentScope)}</span>{' '}
                  <span className={`course-badge ${item.status === 'Graded' ? 'ok' : item.status === 'Submitted' ? 'warn' : 'muted'}`}>
                    {item.status === 'Graded' ? tr('Đã chấm') : item.status === 'Submitted' ? tr('Đã nộp') : tr('Chưa nộp')}
                  </span>
                </div>
                <span className="course-meta">
                  {trf('Giao: {0} · Hạn: {1}', { 0: fmtDate(item.assignedAt), 1: fmtDate(item.dueAt) })}
                </span>
              </div>
              <h3 style={{ marginTop: 8 }}>
                {tr(item.title)} {isMentor ? `· ${item.learnerName}` : ''}
              </h3>
              {item.instructions && <p className="course-pre">{item.instructions}</p>}

              {item.submission ? (
                <div className="course-confirm">
                  <p className="course-meta">
                    {tr('Đã nộp lần')}{' '}{item.submission.revisionCount}{' '}{tr('lúc')}{' '}{fmtDate(item.submission.submittedAt)}
                    {item.submission.lastRevisedAtUtc ? trf(' (chỉnh sửa: {0})', { 0: fmtDate(item.submission.lastRevisedAtUtc) }) : ''}
                  </p>
                  {item.submission.textContent && <p className="course-pre">{item.submission.textContent}</p>}
                  {item.submission.hasScan && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRun(() => openHomeworkScan(item.id), 'Đã tải tệp bài làm.')}
                    >
                      {tr('Tải tệp ảnh/PDF bài làm')}
                    </button>
                  )}
                </div>
              ) : (
                <p className="course-meta">{tr('Học viên chưa nộp bài.')}</p>
              )}

              {item.publishedGrade && (
                <div className="course-notice" style={{ marginTop: 10 }}>
                  <strong>
                    {tr('Kết quả Mentor:')}{' '}{item.publishedGrade.passed ? tr('Đạt') : tr('Chưa đạt')}
                    {item.publishedGrade.score != null ? ` · ${item.publishedGrade.score}/100` : ''}
                  </strong>
                  <p className="course-pre">{item.publishedGrade.feedback}</p>
                </div>
              )}

              {canLearnerSubmit && (
                <form
                  className="course-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (fileError) return;
                    onRun(async () => {
                      if (fileDraft) {
                        const form = new FormData();
                        if (textDraft.trim()) form.append('textContent', textDraft.trim());
                        form.append('scan', fileDraft);
                        await submitHomeworkScan(item.id, form);
                      } else {
                        await submitHomeworkText(item.id, { textContent: textDraft.trim(), fileUrl: null });
                      }
                    }, item.submission ? 'Đã cập nhật bài nộp.' : 'Đã nộp bài thành công.');
                  }}
                >
                  <fieldset disabled={busy}>
                    <label className="course-field" style={{ flexBasis: '100%' }}>
                      <span>{item.submission ? tr('Chỉnh sửa câu trả lời (trước khi Mentor chấm)') : tr('Nội dung bài làm')}</span>
                      <textarea
                        maxLength={20000}
                        value={textDraft}
                        onChange={(e) =>
                          setDrafts((cur) => ({ ...cur, [item.id]: { ...cur[item.id], text: e.target.value } }))
                        }
                        placeholder={tr('Nhập đáp án tiếng Nhật, giải thích hoặc ghi chú bài viết...')}
                      />
                    </label>
                    <div className="course-field">
                      <span>{tr('Ảnh / PDF bài viết tay (PNG, JPG, PDF ≤ 10 MB)')}</span>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-rp-input border border-rp-brand-border bg-rp-brand-tint/60 px-3.5 py-2 text-[13px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-tint">
                          <Paperclip aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span>{fileDraft ? tr('Đổi tệp đính kèm') : tr('Chọn ảnh hoặc PDF')}</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="application/pdf,image/png,image/jpeg"
                            onChange={(e) =>
                              setDrafts((cur) => ({
                                ...cur,
                                [item.id]: { ...cur[item.id], text: textDraft, file: e.target.files?.[0] || null },
                              }))
                            }
                          />
                        </label>
                        {fileDraft && (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-rp-line bg-rp-bg-2 px-3 py-1 text-xs font-medium text-rp-text">
                            <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
                            <span className="truncate max-w-[200px]">{fileDraft.name}</span>
                            <button
                              type="button"
                              aria-label={tr('Gỡ tệp đính kèm')}
                              className="!min-h-0 !border-0 !bg-transparent !p-0.5 text-rp-text-muted hover:text-rp-danger"
                              onClick={() =>
                                setDrafts((cur) => ({
                                  ...cur,
                                  [item.id]: { ...cur[item.id], text: textDraft, file: null },
                                }))
                              }
                            >
                              <X aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="course-primary"
                      type="submit"
                      disabled={busy || Boolean(fileError) || (!textDraft.trim() && !fileDraft)}
                    >
                      {item.submission ? tr('Cập nhật bài nộp') : tr('Nộp bài')}
                    </button>
                    {fileError && <p className="course-error" role="alert">{fileError}</p>}
                  </fieldset>
                </form>
              )}

              {isMentor && item.submission && (
                <div className="course-form">
                  <div className="course-buttons" style={{ marginBottom: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onRun(() => generateHomeworkAiDraft(item.id), aiDraftNotice)
                      }
                    >
                      {tr('Tạo nháp gợi ý AI (chỉ Mentor xem)')}
                    </button>
                    {item.aiDraft?.unavailableReason && (
                      <span className="course-badge warn">{item.aiDraft.unavailableReason}</span>
                    )}
                  </div>
                  {item.aiDraft?.feedback && (
                    <div className="course-policy" style={{ marginTop: 6, marginBottom: 10 }}>
                      <strong>{tr('Nháp AI nội bộ:')}</strong> {item.aiDraft.suggestedScore != null ? `${item.aiDraft.suggestedScore}/100 · ` : ''}
                      {item.aiDraft.feedback}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (gradeCheck.error) {
                        setLocalError(item.id, gradeCheck.error);
                        return;
                      }
                      setLocalError(item.id, '');
                      onRun(
                        () => gradeHomeworkAssignment(item.id, gradeCheck.payload),
                        'Đã chấm và công bố nhận xét cho học viên.'
                      );
                    }}
                  >
                    <fieldset disabled={busy}>
                      <label className="course-field">
                        <span>{tr('Kết quả')}</span>
                        <select
                          value={String(Boolean(gradeDraft.passed))}
                          onChange={(e) =>
                            setGradeInputs((cur) => ({
                              ...cur,
                              [item.id]: { ...gradeDraft, passed: e.target.value === 'true' },
                            }))
                          }
                        >
                          <option value="true">{tr('Đạt')}</option>
                          <option value="false">{tr('Chưa đạt')}</option>
                        </select>
                      </label>
                      <label className="course-field">
                        <span>{tr('Điểm (0–100, bắt buộc)')}</span>
                        <input
                          required
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={gradeDraft.score}
                          onChange={(e) =>
                            setGradeInputs((cur) => ({
                              ...cur,
                              [item.id]: { ...gradeDraft, score: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="course-field" style={{ flexBasis: '100%' }}>
                        <span>{tr('Nhận xét chính thức gửi học viên')}</span>
                        <textarea
                          required
                          maxLength={HOMEWORK_FEEDBACK_MAX}
                          value={gradeDraft.feedback}
                          onChange={(e) =>
                            setGradeInputs((cur) => ({
                              ...cur,
                              [item.id]: { ...gradeDraft, feedback: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <button className="course-primary" type="submit" disabled={busy}>
                        {tr('Lưu & công bố kết quả')}
                      </button>
                      {localErrors[item.id] && <p className="course-error" role="alert">{localErrors[item.id]}</p>}
                    </fieldset>
                  </form>
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
