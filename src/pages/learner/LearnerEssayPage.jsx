import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Image as ImageIcon, Maximize2, PanelLeftOpen, Plus, ScanText } from 'lucide-react';

import { api } from '@/api/client.js';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  Drawer,
  EmptyState,
  ErrorState,
  PageContainer,
  PageHeader,
  SakuraLoader,
  useUnsavedGuard,
} from '@/components/ui';
import Icon from '@/components/ui/Icon.jsx';
import { confirmAction, notify } from '@/components/ui/feedbackStore.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { getPracticeLevelId } from '@/features/practice/api/practiceGradingApi.js';
import GradingFeedback from '@/features/practice/components/GradingFeedback.jsx';
import {
  deleteLearnerEssay,
  getLearnerEssay,
  getLearnerEssays,
  rescanLearnerEssay,
  saveLearnerEssayDraft,
  scanLearnerEssay,
} from '@/features/writing/api/learnerEssayApi.js';
import RomajiJapaneseInput from '@/features/writing/components/RomajiJapaneseInput.jsx';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

import { writingLessons } from './productionPracticeLessons.js';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;
const QUOTA_ERROR_CODES = new Set([
  'WRITING_PACKAGE_REQUIRED',
  'AI_CREDIT_REQUIRED',
  'SELF_STUDY_PACKAGE_REQUIRED',
]);

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
  const queryClient = useQueryClient();

  const [essays, setEssays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [text, setText] = useState('');
  const [originalOcrText, setOriginalOcrText] = useState('');
  const [lessonLevel, setLessonLevel] = useState('');
  const [grade, setGrade] = useState(null);
  const [gradeQuotaError, setGradeQuotaError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState('');
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const [speechBusy, setSpeechBusy] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [scanDrawerOpen, setScanDrawerOpen] = useState(false);

  const studyAccess = useStudyAccess();
  const subscription = studyAccess.data;
  const writingQuota = subscription
    ? (Number(subscription.writingUsesRemaining ?? 0) + Number(subscription.aiGradingUsesRemaining ?? 0))
    : null;

  const lesson = writingLessons.find((item) => item.level === lessonLevel);
  const busy = Boolean(operation) || speechBusy;
  const scanning = operation === 'scan' || operation === 'rescan';
  const previewSrc = file ? previewUrl : selected?.imageUrl;
  const changed = Boolean(
    file || (selected ? text !== (selected.contentText || '') : text.trim()),
  );

  useUnsavedGuard(changed);

  const loadEssays = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const result = await getLearnerEssays();
      if (!Array.isArray(result)) {
        throw new Error(tr('Danh sách bài viết chưa đúng định dạng.'));
      }
      setEssays(result);
    } catch (err) {
      setListError(describeApiError(err, tr('Không tải được danh sách.')));
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

  function clearMessages() {
    setError('');
    setNotice('');
    setGradeQuotaError(false);
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
    setGrade(null);
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
    setGrade(null);
    try {
      const result = await getLearnerEssay(id);
      setSelected(result);
      setText(result.contentText || '');
      setOriginalOcrText(result.originalOcrText || '');
      setFile(null);
      setPreviewUrl('');
    } catch (err) {
      setError(describeApiError(err, tr('Không mở được bài viết.')));
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
      setGrade(null);
      setScanDrawerOpen(false);
      setNotice(tr('Đã nhận dạng. Kiểm tra nội dung rồi bấm Lưu; bài đã lưu chưa thay đổi.'));
      notify.success(tr('Đã nhận dạng xong văn bản từ ảnh'), tr('Hãy kiểm tra nội dung rồi bấm Lưu bản nháp.'), {
        key: toastKey,
        replace: true,
      });
    } catch (err) {
      const code = err?.data?.errorCode || err?.errorCode;
      const needsUpgrade = QUOTA_ERROR_CODES.has(code) || err?.status === 403;
      setGradeQuotaError(needsUpgrade);
      setError(describeApiError(err, tr('Không thể nhận dạng văn bản.')));
      notify.apiError(err, tr('Không thể nhận dạng văn bản từ ảnh'), {
        key: toastKey,
        replace: true,
        ...(needsUpgrade
          ? {
              action: {
                label: tr('Xem gói & lượt AI'),
                onClick: () => navigate('/plans/', { state: { from: { pathname }, requiredFeatureLabel: tr('Nhận dạng chữ viết tay') } }),
              },
            }
          : {}),
      });
    } finally {
      setOperation('');
      await queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    }
  }

  async function gradeEssay() {
    if (!text.trim() || operation) return;
    setOperation('grade');
    clearMessages();
    setGrade(null);
    const toastKey = 'essay-grade';
    notify.loading(tr('Đang gửi bài & chấm điểm AI…'), '', { key: toastKey, maxWaitMs: 35000 });
    try {
      const levelId = await getPracticeLevelId(lesson?.level);
      const { result } = await api.post('/PracticeSubmission/submit', {
        type: 'Writing',
        textContent: text,
        certificateLevelId: levelId,
        gradeWithAi: true,
        topic: lesson ? `${lesson.prompt}\n${lesson.guide}` : undefined,
      });
      if (result?.grading) {
        setGrade(result.grading);
        notify.success(tr('Đã có kết quả chấm bài viết!'), '', { key: toastKey, replace: true });
      } else {
        const note = result?.gradingNote || tr('Chưa chấm được bài viết.');
        setError(note);
        notify.warning(tr('Chưa chấm được bài viết'), note, { key: toastKey, replace: true });
      }
      await queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    } catch (err) {
      const code = err?.data?.errorCode || err?.errorCode;
      const needsUpgrade = QUOTA_ERROR_CODES.has(code) || err?.status === 403;
      setGradeQuotaError(needsUpgrade);
      setError(describeApiError(err, tr('Không chấm được bài viết.')));
      notify.apiError(err, tr('Không chấm được bài viết'), {
        key: toastKey,
        replace: true,
        ...(needsUpgrade
          ? {
              action: {
                label: tr('Xem gói & lượt AI'),
                onClick: () => navigate('/plans/', { state: { from: { pathname }, requiredFeatureLabel: tr('Luyện viết AI') } }),
              },
            }
          : {}),
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
      setNotice(tr('Đã lưu thay đổi.'));
      notify.success(tr('Đã lưu bản nháp bài viết.'), '', { key: toastKey, replace: true });
      await loadEssays();
    } catch (err) {
      setError(describeApiError(err, tr('Không lưu được bài viết.')));
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
        setGrade(null);
      }
      setNotice(tr('Đã xóa bài viết.'));
      notify.success(tr('Đã xóa bài viết.'), '', { key: toastKey });
      await loadEssays();
    } catch (err) {
      setError(describeApiError(err, tr('Không xóa được bài viết.')));
      notify.apiError(err, tr('Không xóa được bài viết'), { key: toastKey });
    } finally {
      setOperation('');
    }
  }

  const lessonOptions = [
    { value: '', label: tr('Viết tự do') },
    ...writingLessons.map((item) => ({
      value: item.level,
      label: `${item.level} · ${tr(item.title)}`,
    })),
  ];

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Luyện viết')}>
      <PageContainer width="default">
        <PageHeader
          eyebrow="JLPT N5 – N1"
          title={tr('Luyện viết tiếng Nhật')}
          description={tr('Soạn bài trực tiếp hoặc quét chữ từ ảnh viết tay, lưu bản nháp và nhận chấm điểm AI.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {writingQuota !== null && (
                <Badge tone={writingQuota > 0 ? 'brand' : 'warning'} icon={false}>
                  {trf('Lượt AI viết: {0}', { 0: writingQuota })}
                </Badge>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFocusMode((v) => !v)}
                icon={focusMode ? PanelLeftOpen : Maximize2}
              >
                {focusMode ? tr('Hiện danh sách') : tr('Chế độ tập trung')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => setScanDrawerOpen(true)}
                icon={ScanText}
              >
                {previewSrc ? tr('Ảnh bài viết') : tr('Quét từ ảnh')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={newEssay}
                disabled={busy}
                icon={Plus}
              >
                {tr('Bài mới')}
              </Button>
            </div>
          }
        />

        {writingQuota === 0 && (
          <Banner
            tone="warning"
            className="mb-4"
            actions={
              <Link
                to="/plans/"
                state={{ from: { pathname }, requiredFeatureLabel: tr('Luyện viết AI') }}
                className="rp-link text-xs font-semibold"
              >
                {tr('Xem gói & lượt AI')}
              </Link>
            }
          >
            {tr('Bạn đã hết lượt chấm viết & quét chữ AI. Bạn vẫn có thể viết và lưu bản nháp bình thường.')}
          </Banner>
        )}

        <Card className="mb-5 space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full max-w-md">
              <label className="mb-1.5 block text-xs font-semibold text-rp-text-muted">
                {tr('Đề luyện viết')}
              </label>
              <CustomSelect
                value={lessonLevel}
                disabled={busy}
                onChange={(nextLevel) => {
                  setLessonLevel(nextLevel);
                  setGrade(null);
                }}
                options={lessonOptions}
              />
            </div>
            <Link to="/sentence-studio/" className="rp-link text-xs font-semibold">
              {tr('Mở chấm câu nhanh theo chủ đề →')}
            </Link>
          </div>
          {lesson && (
            <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-3 text-sm">
              <p lang="ja" className="font-semibold text-rp-text">
                {lesson.prompt}
              </p>
              <p className="mt-1 text-xs leading-5 text-rp-text-muted">{tr(lesson.guide)}</p>
            </div>
          )}
        </Card>

        {error && (
          <Banner
            tone="danger"
            className="mb-4"
            actions={
              gradeQuotaError ? (
                <Link
                  to="/plans/"
                  state={{ from: { pathname }, requiredFeatureLabel: tr('Luyện viết AI') }}
                  className="rp-link text-xs font-semibold"
                >
                  {tr('Xem gói & lượt AI')}
                </Link>
              ) : null
            }
          >
            {error}
          </Banner>
        )}

        {notice && (
          <Banner tone="info" className="mb-4" onDismiss={() => setNotice('')}>
            {notice}
          </Banner>
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
          className={`grid items-start gap-5 ${
            focusMode ? 'mx-auto max-w-4xl grid-cols-1' : 'lg:grid-cols-[240px_minmax(0,1fr)]'
          }`}
        >
          {!focusMode && (
            <Card padded={false} className="overflow-hidden lg:sticky lg:top-[calc(var(--spacing-rp-topbar)+16px)]">
              <div className="flex items-center justify-between border-b border-rp-line px-4 py-3">
                <h2 className="text-xs font-semibold text-rp-text">
                  {tr('Bài viết của tôi')}
                  <span className="ml-2 text-rp-text-muted">{loading ? '…' : essays.length}</span>
                </h2>
                <button
                  type="button"
                  onClick={loadEssays}
                  disabled={loading || busy}
                  aria-label={tr('Tải lại danh sách')}
                  className="rp-focus rounded p-1 text-rp-text-muted hover:bg-rp-brand-tint disabled:opacity-40"
                >
                  {loading ? <SakuraLoader variant="inline" size={16} /> : <Icon name="refresh" className="text-[17px]" />}
                </button>
              </div>

              {loading && essays.length === 0 ? (
                <SakuraLoader
                  variant="section"
                  context="writing"
                  label={tr('Đang tải bài viết')}
                  className="min-h-[120px] py-6"
                  delay={160}
                />
              ) : listError ? (
                <div className="p-4">
                  <ErrorState error={{ message: listError }} onRetry={loadEssays} retrying={loading} compact />
                </div>
              ) : essays.length === 0 ? (
                <EmptyState
                  compact
                  title={tr('Chưa có bài viết')}
                  description={tr('Soạn bài mới hoặc quét ảnh bài viết tay để bắt đầu.')}
                />
              ) : (
                <ul className="max-h-[60vh] divide-y divide-rp-line overflow-y-auto">
                  {essays.map((essay) => (
                    <li
                      key={essay.id}
                      className={`flex items-start gap-1 px-3 py-3 transition-colors ${
                        selected?.id === essay.id ? 'bg-rp-brand-tint' : 'hover:bg-rp-brand-tint/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openEssay(essay.id)}
                        disabled={busy}
                        className="rp-focus min-w-0 flex-1 text-left disabled:opacity-50"
                      >
                        <span className="block truncate text-xs font-semibold text-rp-text">
                          {essay.title || tr('Bài viết tiếng Nhật')}
                        </span>
                        <span className="mt-1 block text-[11px] text-rp-text-muted">
                          {formatDate(essay.scannedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEssay(essay)}
                        disabled={busy}
                        aria-label={trf('Xóa {0}', { 0: essay.title || tr('bài viết') })}
                        className="rp-focus rounded p-1 text-rp-text-muted hover:bg-rp-brand-soft hover:text-rp-brand-strong disabled:opacity-40"
                      >
                        <Icon name="delete_outline" className="text-[16px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <div className="min-w-0 space-y-5">
            <Card padded={false} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-rp-text">
                    {selected?.title || tr('Bài viết mới')}
                  </h2>
                  {changed && (
                    <Badge tone="warning" size="sm" icon={false}>
                      {tr('Chưa lưu')}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {previewSrc && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScanDrawerOpen(true)}
                      icon={ImageIcon}
                    >
                      {tr('Xem ảnh đính kèm')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
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

                {!selected && text.trim() && (
                  <p className="text-xs text-rp-brand-strong">
                    {tr('Bản nháp chưa lưu. Bấm Lưu bài viết để lưu vào danh sách của bạn.')}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
                  <p className="text-xs text-rp-text-muted">
                    {tr('Kiểm tra kỹ chữ nhận dạng từ ảnh trước khi lưu hoặc gửi chấm.')}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={saveText}
                      disabled={busy || !text.trim() || !changed}
                      loading={operation === 'save'}
                      icon={Check}
                    >
                      {operation === 'save' ? tr('Đang lưu…') : selected ? tr('Lưu thay đổi') : tr('Lưu bài viết')}
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={gradeEssay}
                      disabled={busy || !text.trim()}
                      loading={operation === 'grade'}
                    >
                      {operation === 'grade' ? tr('Đang chấm bài…') : tr('Chấm bài bằng AI · 1 lượt')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <GradingFeedback grading={grade} skill={tr('viết')} />
          </div>
        </div>

        <Drawer
          open={scanDrawerOpen}
          onClose={() => { if (!scanning) setScanDrawerOpen(false); }}
          title={tr('Quét chữ viết tay từ ảnh')}
          description={tr('Tải ảnh bài viết tiếng Nhật (JPG, PNG, WEBP, tối đa 10MB) để trích xuất văn bản vào khung soạn thảo.')}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rp-text-muted">{tr('Ảnh bài viết')}</span>
              {previewSrc && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="rp-link text-xs font-semibold disabled:opacity-40"
                >
                  {tr('Đổi ảnh')}
                </button>
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
              className={`relative overflow-hidden rounded-rp-card border transition-colors ${
                dragging ? 'border-rp-brand bg-rp-brand-soft/40' : 'border-rp-line bg-rp-bg-2'
              }`}
            >
              {previewSrc ? (
                <div className="relative p-3">
                  <img
                    src={previewSrc}
                    alt={tr('Ảnh gốc của bài viết tiếng Nhật')}
                    className="max-h-[380px] w-full rounded-lg object-contain"
                  />
                  {scanning && <SakuraLoader variant="overlay" context="grading" label={tr('Đang nhận dạng…')} />}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="rp-focus flex min-h-[210px] w-full flex-col items-center justify-center px-4 py-8 text-center hover:bg-rp-brand-tint/60 disabled:opacity-50"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rp-brand-soft text-rp-brand-strong">
                    <Icon name="add_photo_alternate" className="text-[26px]" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-rp-text">{tr('Chọn ảnh bài viết')}</span>
                  <span className="mt-1 text-xs text-rp-text-muted">{tr('hoặc kéo thả ảnh vào đây')}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-rp-text-muted">{tr('Chụp rõ chữ, đủ ánh sáng và giữ trang giấy ngay ngắn.')}</p>

            {file && (
              <div className="space-y-3 border-t border-rp-line pt-3">
                <p title={file.name} className="truncate text-xs font-medium text-rp-text-2">
                  {file.name}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={scanImage}
                  disabled={busy}
                  loading={scanning}
                  icon={ScanText}
                >
                  {scanning
                    ? tr('Đang nhận dạng…')
                    : selected
                      ? tr('Nhận dạng lại · 1 lượt AI')
                      : tr('Nhận dạng chữ · 1 lượt AI')}
                </Button>
              </div>
            )}
          </div>
        </Drawer>
      </PageContainer>
    </LearnerShell>
  );
}
