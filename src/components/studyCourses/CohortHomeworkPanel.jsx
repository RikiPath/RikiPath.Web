import { useState } from 'react';
import {
  createCohortHomework,
  generateHomeworkAiDraft,
  gradeHomeworkAssignment,
  openHomeworkScan,
  submitHomeworkScan,
  submitHomeworkText,
} from '../../api/studyCourses';
import {
  HOMEWORK_FEEDBACK_MAX,
  aiDraftNotice,
  buildGradePayload,
  validateHomeworkScanFile,
} from './homeworkModel';

const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '—');
const scopeLabel = (scope) => (scope === 'CohortCommon' ? 'Giao chung cả lớp' : scope === 'CohortIndividual' ? 'Bài riêng cá nhân' : 'Bài tập');

export default function CohortHomeworkPanel({
  cohortId,
  coursesInCohort = [],
  items = [],
  role = 'Learner',
  busy = false,
  onRun,
}) {
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
      <h2>Bài tập lớp nhóm (chung & cá nhân)</h2>
      <p className="course-meta">
        Phân tách rõ bài giao chung cả lớp và bài giao riêng cho từng học viên. Học viên có thể nộp chữ viết hoặc ảnh/PDF bài làm.
      </p>

      {isMentor && (
        <form className="course-form" onSubmit={handleCreate}>
          <h3>Giao bài tập cho lớp #{cohortId}</h3>
          <div className="course-buttons" style={{ marginTop: 8 }}>
            <label>
              <input type="radio" checked={scopeMode === 'common'} onChange={() => setScopeMode('common')} /> Giao chung cả lớp
            </label>
            <label>
              <input type="radio" checked={scopeMode === 'individual'} onChange={() => setScopeMode('individual')} /> Giao riêng học viên
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
                  {c.learnerName || `Học viên #${c.learnerId}`}
                </label>
              ))}
            </div>
          )}
          <fieldset disabled={busy}>
            <label className="course-field">
              <span>Tiêu đề bài tập</span>
              <input required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="course-field">
              <span>Hạn nộp (tùy chọn)</span>
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </label>
            <label className="course-field" style={{ flexBasis: '100%' }}>
              <span>Hướng dẫn chi tiết</span>
              <textarea required maxLength={10000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </label>
            <button
              className="course-primary"
              type="submit"
              disabled={busy || (scopeMode === 'individual' && selectedLearners.length === 0)}
            >
              Giao BTVN
            </button>
          </fieldset>
        </form>
      )}

      {items.length === 0 ? (
        <p className="course-meta" style={{ marginTop: 12 }}>Chưa có bài tập nhóm nào được giao.</p>
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
                    {item.status === 'Graded' ? 'Đã chấm' : item.status === 'Submitted' ? 'Đã nộp' : 'Chưa nộp'}
                  </span>
                </div>
                <span className="course-meta">
                  Giao: {fmtDate(item.assignedAt)} · Hạn: {fmtDate(item.dueAt)}
                </span>
              </div>
              <h3 style={{ marginTop: 8 }}>
                {item.title} {isMentor ? `· ${item.learnerName}` : ''}
              </h3>
              {item.instructions && <p className="course-pre">{item.instructions}</p>}

              {item.submission ? (
                <div className="course-confirm">
                  <p className="course-meta">
                    Đã nộp lần {item.submission.revisionCount} lúc {fmtDate(item.submission.submittedAt)}
                    {item.submission.lastRevisedAtUtc ? ` (chỉnh sửa: ${fmtDate(item.submission.lastRevisedAtUtc)})` : ''}
                  </p>
                  {item.submission.textContent && <p className="course-pre">{item.submission.textContent}</p>}
                  {item.submission.hasScan && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRun(() => openHomeworkScan(item.id), 'Đã tải tệp bài làm.')}
                    >
                      Tải tệp ảnh/PDF bài làm
                    </button>
                  )}
                </div>
              ) : (
                <p className="course-meta">Học viên chưa nộp bài.</p>
              )}

              {item.publishedGrade && (
                <div className="course-notice" style={{ marginTop: 10 }}>
                  <strong>
                    Kết quả Mentor: {item.publishedGrade.passed ? 'Đạt' : 'Chưa đạt'}
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
                      <span>{item.submission ? 'Chỉnh sửa câu trả lời (trước khi Mentor chấm)' : 'Nội dung bài làm'}</span>
                      <textarea
                        maxLength={20000}
                        value={textDraft}
                        onChange={(e) =>
                          setDrafts((cur) => ({ ...cur, [item.id]: { ...cur[item.id], text: e.target.value } }))
                        }
                        placeholder="Nhập đáp án tiếng Nhật, giải thích hoặc ghi chú bài viết..."
                      />
                    </label>
                    <label className="course-field">
                      <span>Ảnh / PDF bài viết tay (PNG, JPG, PDF ≤ 10 MB)</span>
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        onChange={(e) =>
                          setDrafts((cur) => ({
                            ...cur,
                            [item.id]: { ...cur[item.id], text: textDraft, file: e.target.files?.[0] || null },
                          }))
                        }
                      />
                    </label>
                    <button
                      className="course-primary"
                      type="submit"
                      disabled={busy || Boolean(fileError) || (!textDraft.trim() && !fileDraft)}
                    >
                      {item.submission ? 'Cập nhật bài nộp' : 'Nộp bài'}
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
                      Tạo nháp gợi ý AI (chỉ Mentor xem)
                    </button>
                    {item.aiDraft?.unavailableReason && (
                      <span className="course-badge warn">{item.aiDraft.unavailableReason}</span>
                    )}
                  </div>
                  {item.aiDraft?.feedback && (
                    <div className="course-policy" style={{ marginTop: 6, marginBottom: 10 }}>
                      <strong>Nháp AI nội bộ:</strong> {item.aiDraft.suggestedScore != null ? `${item.aiDraft.suggestedScore}/100 · ` : ''}
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
                        <span>Kết quả</span>
                        <select
                          value={String(Boolean(gradeDraft.passed))}
                          onChange={(e) =>
                            setGradeInputs((cur) => ({
                              ...cur,
                              [item.id]: { ...gradeDraft, passed: e.target.value === 'true' },
                            }))
                          }
                        >
                          <option value="true">Đạt</option>
                          <option value="false">Chưa đạt</option>
                        </select>
                      </label>
                      <label className="course-field">
                        <span>Điểm (0–100, bắt buộc)</span>
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
                        <span>Nhận xét chính thức gửi học viên</span>
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
                        Lưu & công bố kết quả
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
