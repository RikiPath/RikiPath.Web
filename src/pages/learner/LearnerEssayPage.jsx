import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client.js';
import { LearnerShell } from '@/layouts';
import { getPracticeLevelId } from '@/features/practice/api/practiceGradingApi.js';
import { writingLessons } from './productionPracticeLessons.js';
import RomajiJapaneseInput from '@/features/writing/components/RomajiJapaneseInput.jsx';

import {
  deleteLearnerEssay,
  getLearnerEssay,
  getLearnerEssays,
  rescanLearnerEssay,
  scanLearnerEssay,
  saveLearnerEssayDraft,
} from '@/features/writing/api/learnerEssayApi.js';
import { confirmAction, notify } from '@/components/ui/feedbackStore.js';
import { SakuraLoader } from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { parseUtcDate } from '@/utils/vnDateTime.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

const BUTTON_CLASS =
  'inline-flex min-h-9 items-center justify-center gap-1.5 ' +
  'rounded-lg border border-rp-line bg-white px-3 py-2 ' +
  'text-[12px] text-rp-brand-strong transition hover:bg-rp-brand-tint ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const PRIMARY_CLASS =
  'inline-flex min-h-9 items-center justify-center gap-1.5 ' +
  'rounded-lg bg-rp-brand-strong px-4 py-2 text-[12px] font-medium ' +
  'text-white transition hover:bg-rp-brand-deep ' +
  'disabled:cursor-not-allowed disabled:opacity-40';


function formatDate(value) {
  if (!value) return '—';

  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function validateFile(file) {
  if (!file) return 'Vui lòng chọn ảnh bài viết.';
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_SIZE) return 'Ảnh tối đa 10MB.';
  return '';
}

export default function LearnerEssayPage() {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [essays, setEssays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [text, setText] = useState('');
  const [originalOcrText, setOriginalOcrText] = useState('');
  const [lessonLevel, setLessonLevel] = useState('');
  const lesson = writingLessons.find(item => item.level === lessonLevel);
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState(null);

  async function gradeEssay() {
    if (!text.trim() || operation) return;
    setOperation('grade');
    setError('');
    setGrade(null);
    const toastKey = 'essay-grade';
    notify.loading(tr('Đang gửi bài & chấm điểm AI…'), '', { key: toastKey, maxWaitMs: 35000 });
    try {
      const levelId = await getPracticeLevelId(lesson?.level);
      const { result } = await api.post('/PracticeSubmission/submit', {
        type: 'Writing', textContent: text, certificateLevelId: levelId, gradeWithAi: true,
        topic: lesson ? lesson.prompt + "\n" + lesson.guide : undefined,
      });
      if (result?.grading) {
        setGrade(result.grading);
        notify.success(tr('Đã có kết quả chấm bài viết!'), '', { key: toastKey, replace: true });
      } else {
        const note = result?.gradingNote || 'Chưa chấm được bài viết.';
        setError(note);
        notify.warning(tr('Chưa chấm được bài viết'), note, { key: toastKey, replace: true });
      }
      await queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    } catch (err) {
      setError(err.message);
      const code = err?.data?.errorCode || err?.errorCode;
      const needsUpgrade = ['WRITING_PACKAGE_REQUIRED', 'AI_CREDIT_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED'].includes(code) || err?.status === 403;
      notify.apiError(err, tr('Không chấm được bài viết'), {
        key: toastKey,
        replace: true,
        ...(needsUpgrade ? { action: { label: tr('Xem gói & lượt AI'), onClick: () => navigate('/plans/', { state: { from: { pathname }, requiredFeatureLabel: tr('Luyện viết AI') } }) } } : {}),
      });
    } finally {
      setOperation('');
    }
  }

  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState('');
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const [speechBusy, setSpeechBusy] = useState(false);

  const busy = Boolean(operation) || speechBusy;
  const scanning = operation === 'scan' || operation === 'rescan';
  const previewSrc = file ? previewUrl : selected?.imageUrl;
  const changed = Boolean(
    file || (selected ? text !== (selected.contentText || '') : text.trim()),
  );

  const loadEssays = useCallback(async () => {
    setLoading(true);
    setListError('');

    try {
      const result = await getLearnerEssays();

      if (!Array.isArray(result)) {
        throw new Error(tr("Danh sách bài viết chưa đúng định dạng."));
      }

      setEssays(result);
    } catch (err) {
      setListError(err.message || tr("Không tải được danh sách."));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEssays(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadEssays]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!changed) return;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [changed]);

  function clearMessages() {
    setError('');
    setNotice('');
  }

  async function confirmDiscard() {
    if (!changed) return true;
    return confirmAction({
      title: tr('Bỏ thay đổi chưa lưu?'),
      description: tr('Bài viết có thay đổi chưa lưu. Nếu tiếp tục, các thay đổi này sẽ mất.'),
      confirmLabel: tr('Bỏ thay đổi'),
      tone: 'warning',
    });
  }

  async function newEssay() {
    if (busy || !(await confirmDiscard())) return;

    setSelected(null);
    setFile(null);
    setPreviewUrl('');
    setText('');
    setOriginalOcrText('');
    clearMessages();

    if (inputRef.current) inputRef.current.value = '';
  }

  function chooseFile(nextFile) {
    if (busy || !nextFile) return;

    const validationError = validateFile(nextFile);
    if (validationError) {
      setError(tr(validationError));
      return;
    }

    clearMessages();
    setFile(nextFile);
    setOriginalOcrText('');
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!busy) chooseFile(event.dataTransfer.files?.[0]);
  }

  async function openEssay(id) {
    if (busy || !(await confirmDiscard())) return;

    setOperation('open');
    clearMessages();

    try {
      const result = await getLearnerEssay(id);

      setSelected(result);
      setText(result.contentText || '');
      setOriginalOcrText(result.originalOcrText || '');
      setFile(null);
      setPreviewUrl('');
    } catch (err) {
      setError(err.message || tr("Không mở được bài viết."));
    } finally {
      setOperation('');
    }
  }

  async function scanImage() {
    if (busy) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(tr(validationError));
      return;
    }

    if (
      text.trim() &&
      !(await confirmAction({
        title: tr('Thay nội dung bằng kết quả nhận dạng?'),
        description: tr('Nhận dạng ảnh sẽ thay thế nội dung đang nhập.'),
        confirmLabel: tr('Thay nội dung'),
        tone: 'warning',
      }))
    ) {
      return;
    }

    clearMessages();
    setOperation(selected ? 'rescan' : 'scan');
    const toastKey = 'essay-scan';
    notify.loading(tr('Đang nhận dạng chữ viết từ ảnh…'), '', { key: toastKey, maxWaitMs: 35000 });

    try {
      const result = selected
        ? await rescanLearnerEssay(selected.id, file)
        : await scanLearnerEssay(file);
      const content = result.text ?? '';
      setText(content);
      setOriginalOcrText(content);
      setNotice(tr('Đã nhận dạng. Kiểm tra nội dung rồi bấm Lưu; bài đã lưu chưa thay đổi.'));
      notify.success(tr('Đã nhận dạng xong văn bản từ ảnh'), tr('Hãy kiểm tra nội dung rồi bấm Lưu bản nháp.'), {
        key: toastKey,
        replace: true,
      });
    } catch (err) {
      setError(err.message || tr("Không thể nhận dạng văn bản."));
      const code = err?.data?.errorCode || err?.errorCode;
      const needsUpgrade = ['WRITING_PACKAGE_REQUIRED', 'AI_CREDIT_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED'].includes(code) || err?.status === 403;
      notify.apiError(err, tr('Không thể nhận dạng văn bản từ ảnh'), {
        key: toastKey,
        replace: true,
        ...(needsUpgrade ? { action: { label: tr('Xem gói & lượt AI'), onClick: () => navigate('/plans/', { state: { from: { pathname }, requiredFeatureLabel: tr('Nhận dạng chữ viết tay') } }) } } : {}),
      });
    } finally {
      setOperation('');
    }
  }

  async function saveText() {
    if (busy || !text.trim() || !changed) return;

    setOperation('save');
    clearMessages();
    const toastKey = 'essay-save';
    notify.loading(tr('Đang lưu bài viết…'), '', { key: toastKey, maxWaitMs: 25000 });

    try {
      const result = await saveLearnerEssayDraft({
        id: selected?.id,
        file,
        contentText: text,
        originalOcrText,
      });

      setSelected(result);
      setText(result.contentText ?? text);
      setOriginalOcrText(result.originalOcrText || '');
      setFile(null);
      setPreviewUrl('');
      if (inputRef.current) inputRef.current.value = '';
      setNotice(tr("Đã lưu thay đổi."));
      notify.success(tr('Đã lưu bản nháp bài viết.'), '', { key: toastKey, replace: true });
      await loadEssays();
    } catch (err) {
      setError(err.message || tr("Không lưu được bài viết."));
      notify.apiError(err, tr('Không lưu được bài viết'), { key: toastKey, replace: true });
    } finally {
      setOperation('');
    }
  }

  async function removeEssay(essay) {
    if (
      busy ||
      !(await confirmAction({
        title: `${tr('Xóa')} "${essay.title || tr('bài viết này')}"?`,
        description: tr('Bài viết sẽ bị xóa vĩnh viễn và không thể khôi phục.'),
        confirmLabel: tr('Xóa bài viết'),
      }))
    ) {
      return;
    }

    setOperation('delete');
    clearMessages();
    const toastKey = 'essay-delete';

    try {
      await deleteLearnerEssay(essay.id);

      if (selected?.id === essay.id) {
        setSelected(null);
        setText('');
        setOriginalOcrText('');
        setFile(null);
        setPreviewUrl('');
      }

      setNotice(tr("Đã xóa bài viết."));
      notify.success(tr('Đã xóa bài viết.'), '', { key: toastKey });
      await loadEssays();
    } catch (err) {
      setError(err.message || tr("Không xóa được bài viết."));
      notify.apiError(err, tr('Không xóa được bài viết'), { key: toastKey });
    } finally {
      setOperation('');
    }
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Luyện viết")}>
      <main className="rp-container py-6 text-rp-text lg:py-8">
        <header
          className="mb-5 flex flex-wrap items-center
                     justify-between gap-3"
        >
          <div>
            <h1
              className="text-[25px] font-semibold
                         leading-tight tracking-tight"
            >
              {tr('Luyện viết tiếng Nhật')}
            </h1>
            <p className="mt-1.5 text-[13px] text-rp-text-muted">
              {tr('Nhập bài viết hoặc nhận dạng chữ từ ảnh để nhận điểm luyện viết riêng.')}
            </p>
          </div>

          <button
            type="button"
            onClick={newEssay}
            disabled={busy}
            className={BUTTON_CLASS}
          >
            <Icon name="add" className="text-[18px]" />{tr('Bài mới')}</button>
        </header>

        <section className="mb-5 space-y-2 rounded-xl border border-rp-line bg-white p-4">
          <label className="block max-w-md text-sm font-medium">
            {tr('Đề luyện viết')}
            <select className="mt-1 w-full rounded-lg border border-rp-line bg-white px-3 py-2"
              value={lessonLevel} disabled={busy} onChange={event => {
                setLessonLevel(event.target.value);
                setGrade(null);
              }}>
              <option value="">{tr('Viết tự do')}</option>
              {writingLessons.map(item => <option key={item.level} value={item.level}>{item.level} · {tr(item.title)}</option>)}
            </select>
          </label>
          {lesson && <>
            <p lang="ja" className="font-medium">{lesson.prompt}</p>
            <p className="text-sm">{lesson.guide}</p>
          </>}
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2
                       rounded-lg bg-rp-brand-tint px-4 py-3
                       text-[12px] leading-5 text-rp-brand-strong"
          >
            <Icon
              name="error_outline"
              className="mt-0.5 shrink-0 text-[16px]"
            />
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between
                       gap-3 rounded-lg bg-rp-brand-soft
                       px-4 py-3 text-[12px] leading-5 text-rp-text-muted"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label={tr("Đóng thông báo")}
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          hidden
          type="file"
          disabled={busy}
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <div
          className="grid items-start gap-4
                     lg:grid-cols-[220px_minmax(0,1fr)]"
        >
          {/* Lịch sử */}
          <aside
            className="overflow-hidden rounded-xl border
                       border-rp-line bg-white
                       lg:sticky lg:top-[84px]"
          >
            <header
              className="flex items-center justify-between
                         border-b border-rp-line px-4 py-3"
            >
              <h2 className="text-[13px] font-medium">{tr('Bài viết của tôi')}<span className="ml-2 text-[11px] text-rp-text-muted">
                  {loading ? '…' : essays.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={loadEssays}
                disabled={loading || busy}
                aria-label={tr("Tải lại danh sách")}
                className="rounded p-1 text-rp-text-muted
                           hover:bg-rp-brand-tint disabled:opacity-40"
              >
                {loading ? <SakuraLoader variant="inline" size={16} /> : <Icon name="refresh" className="text-[17px]" />}
              </button>
            </header>

            {loading && essays.length === 0 ? (
              <SakuraLoader variant="section" context="writing" label={tr('Đang tải bài viết')} className="min-h-[120px] py-6" delay={160} />
            ) : listError ? (
              <div className="px-4 py-5">
                <p role="alert" className="text-[12px] leading-5 text-rp-brand-strong">
                  {listError}
                </p>
                <button
                  type="button"
                  onClick={loadEssays}
                  disabled={busy}
                  className="mt-2 text-[12px] text-rp-brand-strong underline"
                >{tr("Thử lại")}</button>
              </div>
            ) : essays.length === 0 ? (
              <div className="px-4 py-6">
                <Icon
                  name="description"
                  className="text-[25px] text-rp-brand"
                />
                <p className="mt-2 text-[12px] text-rp-text-muted">{tr('Chưa có bài viết.')}</p>
                <p className="mt-1 text-[11px] leading-5 text-rp-text-muted">{tr('Bắt đầu bằng cách tải ảnh bài viết của bạn.')}</p>
              </div>
            ) : (
              <ul className="max-h-[65vh] divide-y divide-rp-line overflow-y-auto">
                {essays.map((essay) => (
                  <li
                    key={essay.id}
                    className={`flex items-start gap-1 px-3 py-3 ${
                      selected?.id === essay.id
                        ? 'bg-rp-brand-tint'
                        : 'hover:bg-rp-brand-tint'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openEssay(essay.id)}
                      disabled={busy}
                      className="min-w-0 flex-1 text-left disabled:opacity-50"
                    >
                      <span className="block truncate text-[12px] font-medium">
                        {essay.title || tr("Bài viết tiếng Nhật")}
                      </span>
                      <span className="mt-1 block text-[10px] text-rp-text-muted">
                        {formatDate(essay.scannedAt)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeEssay(essay)}
                      disabled={busy}
                      aria-label={trf('Xóa {0}', { 0: essay.title || 'bài viết' })}
                      className="rounded p-1 text-rp-brand
                                 hover:bg-rp-brand-soft
                                 hover:text-rp-brand-strong
                                 disabled:opacity-40"
                    >
                      <Icon name="delete_outline" className="text-[16px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Không gian làm bài */}
          <section
            aria-label={tr("Biên tập bài viết")}
            className="min-w-0 overflow-hidden rounded-2xl
                       border border-rp-line bg-white"
          >
            <header
              className="flex flex-wrap items-center justify-between
                         gap-2 border-b border-rp-line px-5 py-3.5"
            >
              <h2 className="min-w-0 break-words text-[14px] font-medium">
                {selected?.title || tr("Bài viết mới")}
              </h2>
              <span className="text-[11px] text-rp-text-muted">
                {changed ? tr("Có thay đổi chưa lưu") : tr("Ảnh → Văn bản → Chỉnh sửa")}
              </span>
            </header>

            <div
              className="grid items-start
                         xl:grid-cols-[260px_minmax(0,1fr)]"
            >
              {/* Ảnh gốc */}
              <div
                className="border-b border-rp-line
                           bg-rp-brand-tint p-4
                           xl:border-b-0 xl:border-r"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-rp-text-muted">{tr('Ảnh bài viết')}</h3>
                  {previewSrc && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRef.current?.click()}
                      className="text-[11px] text-rp-brand-strong
                                 hover:text-rp-brand-strong disabled:opacity-40"
                    >{tr('Đổi ảnh')}</button>
                  )}
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setDragging(false);
                    }
                  }}
                  onDrop={handleDrop}
                  className={[
                    'relative overflow-hidden rounded-xl border',
                    dragging
                      ? 'border-rp-brand-border bg-rp-brand-soft'
                      : 'border-rp-brand-border bg-white',
                  ].join(' ')}
                >
                  {previewSrc ? (
                    <div className="relative p-2">
                      <img
                        src={previewSrc}
                        alt={tr("Ảnh gốc của bài viết tiếng Nhật")}
                        className="max-h-[350px] w-full object-contain"
                      />

                      {scanning && (
                        <SakuraLoader variant="overlay" context="grading" label={tr('Đang nhận dạng…')} />
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={busy}
                      className="flex min-h-[190px] w-full
                                 flex-col items-center justify-center
                                 px-4 py-6 text-center
                                 hover:bg-rp-brand-tint
                                 disabled:opacity-50"
                    >
                      <span
                        className="flex h-11 w-11 items-center justify-center
                                   rounded-xl bg-rp-brand-soft text-rp-brand-strong"
                      >
                        <Icon name="add_photo_alternate" className="text-[25px]" />
                      </span>
                      <span className="mt-3 text-[13px] font-medium">{tr('Chọn ảnh bài viết')}</span>
                      <span className="mt-1 text-[11px] text-rp-text-muted">{tr('hoặc kéo ảnh vào đây')}</span>
                    </button>
                  )}
                </div>

                <p className="mt-2 text-[10px] leading-5 text-rp-text-muted">{tr('JPG, PNG, WEBP · Tối đa 10MB')}</p>

                {file && (
                  <>
                    <p
                      title={file.name}
                      className="mt-2 truncate text-[11px] text-rp-text-muted"
                    >
                      {file.name}
                    </p>
                    <button
                      type="button"
                      onClick={scanImage}
                      disabled={busy}
                      className={`${PRIMARY_CLASS} mt-3 w-full`}
                    >
                      {scanning ? (
                        <SakuraLoader variant="inline" size={16} tone="light" />
                      ) : (
                        <Icon name="document_scanner" className="text-[17px]" />
                      )}
                      {scanning
                        ? tr("Đang nhận dạng…")
                        : selected
                          ? tr("Nhận dạng lại")
                          : tr("Nhận dạng chữ")}
                    </button>
                  </>
                )}

                <p className="mt-4 text-[11px] leading-5 text-rp-text-muted">{tr('Chụp rõ chữ, đủ sáng và giữ ảnh ngay ngắn.')}</p>
              </div>

              {/* Nội dung */}
              <div className="min-w-0 p-4 sm:p-5">
                <button type="button" onClick={gradeEssay} disabled={busy || !text.trim()} className={PRIMARY_CLASS}>
                  {operation === 'grade' ? tr('Đang chấm bài…') : tr('Chấm bài bằng AI · 1 lượt')}
                </button>
                {grade && <section className="my-3 rounded-lg bg-rp-brand-tint p-3 text-sm">
                  <p className="font-semibold">{trf('Điểm luyện viết · {0}/100', { 0: grade.overallScore })}</p>
                  {grade.criteria?.map((criterion) => <p key={criterion.name}>{criterion.name}: {criterion.score}/10 · {criterion.comment}</p>)}
                  {grade.improvements?.length > 0 && <ul className="mt-2 list-disc pl-4">
                    {grade.improvements.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>}
                </section>}

                {operation === 'open' ? (
                  <SakuraLoader variant="section" context="writing" label={tr('Đang mở bài viết')} className="min-h-[260px]" />
                ) : (
                  <RomajiJapaneseInput
                    value={text}
                    onChange={setText}
                    disabled={Boolean(operation)}
                    onSpeechBusyChange={setSpeechBusy}
                  />
                )}

                <div
                  className="mt-4 flex flex-wrap items-center justify-between
                             gap-3 border-t border-rp-line pt-4"
                >
                  <p className="text-[11px] leading-5 text-rp-text-muted">{tr('Kiểm tra lại chữ được nhận dạng trước khi lưu.')}</p>

                  <button
                    type="button"
                    onClick={saveText}
                    disabled={busy || !text.trim() || !changed}
                    className={PRIMARY_CLASS}
                  >
                    {operation === 'save' ? (
                      <SakuraLoader variant="inline" size={16} tone="light" />
                    ) : (
                      <Icon name="check" className="text-[16px]" />
                    )}
                    {operation === 'save' ? tr("Đang lưu…") : selected ? tr("Lưu thay đổi") : tr('Lưu bài viết')}
                  </button>
                </div>

                {!selected && text.trim() && (
                  <p className="mt-3 text-[11px] leading-5 text-rp-brand-strong">
                    {tr('Bản nháp chưa lưu. Bấm Lưu bài viết để thêm vào danh sách của bạn.')}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
        <LearnerFeedbackPanel type="writing" label="Phản hồi về luyện viết" />
      </main>
    </LearnerShell>
  );
}
