import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '@/api/client.js';
import { gradeSpeaking } from '@/features/practice/api/practiceGradingApi.js';
import GradingFeedback from '@/features/practice/components/GradingFeedback.jsx';
import { MentorShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import {
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  FileUpload,
  Input,
  PageContainer,
  PageHeader,
  Textarea,
  useSubmitGuard,
} from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useCertificateLevelsQuery, useCertificateTypesQuery } from '@/features/learning-path/hooks/useCertificates.js';
import { useLocale } from '@/locales/locale.js';

const MAX_AUDIO_BYTES = 27 * 1024 * 1024;
const AUDIO_EXT_RE = /\.(mp3|wav|webm|ogg|m4a|mp4|aac|flac)$/i;

export default function MentorGrading() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [type, setType] = useState('Writing');
  const [levelId, setLevelId] = useState('');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioError, setAudioError] = useState('');
  const [textError, setTextError] = useState('');
  const [levelError, setLevelError] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const certificates = useCertificateTypesQuery();
  const jlpt = certificates.data?.find((item) => String(item.name || '').trim().toUpperCase() === 'JLPT') || certificates.data?.[0];
  const levels = useCertificateLevelsQuery(jlpt?.id);
  const loadingLevels = certificates.isLoading || levels.isLoading;

  const [runEvaluate, busy] = useSubmitGuard(async () => {
    setLevelError('');
    setTextError('');
    setAudioError('');
    setError('');

    if (!levelId) {
      setLevelError(tr('Vui lòng chọn trình độ JLPT tham chiếu.'));
      return;
    }
    if (type === 'Writing') {
      if (!text.trim()) {
        setTextError(tr('Vui lòng nhập nội dung bài viết để đánh giá.'));
        return;
      }
    } else {
      if (!audioFile) {
        setAudioError(tr('Vui lòng chọn tệp ghi âm để đánh giá.'));
        return;
      }
      if (audioFile.size > MAX_AUDIO_BYTES) {
        setAudioError(tr('Tệp âm thanh vượt quá giới hạn 27 MB.'));
        return;
      }
    }

    setResult(null);
    const toastKey = 'mentor-practice-eval';
    notify.loading(
      tr(type === 'Speaking' ? 'Đang tải bản ghi & đánh giá phần nói…' : 'Đang phân tích và đánh giá bài viết…'),
      '',
      { key: toastKey, maxWaitMs: 35000 },
    );
    try {
      const response = type === 'Speaking'
        ? await gradeSpeaking(audioFile, levelId, topic.trim())
        : (await api.post('/PracticeSubmission/submit', {
            type,
            certificateLevelId: Number(levelId),
            textContent: text.trim(),
            topic: topic.trim(),
            gradeWithAi: true,
          })).result;
      setResult(response);
      if (response?.grading) {
        notify.success(tr('Đã có gợi ý đánh giá bài luyện tập.'), '', { key: toastKey, replace: true });
      } else {
        const note = response?.gradingNote || tr('Hệ thống chưa thể hoàn tất nhận xét lúc này.');
        setError(note);
        notify.warning(tr('Chưa hoàn tất đánh giá'), note, { key: toastKey, replace: true });
      }
    } catch (err) {
      const msg = describeApiError(err).message || tr('Chưa đánh giá được bài luyện tập.');
      setError(msg);
      notify.apiError(err, tr('Đánh giá bài luyện tập thất bại'), { key: toastKey, replace: true });
    }
  });

  function handleSelectAudio(files) {
    const file = files?.[0] || null;
    if (!file) {
      setAudioFile(null);
      setAudioError('');
      return;
    }
    const isAudioType = String(file.type || '').startsWith('audio/') || AUDIO_EXT_RE.test(file.name);
    if (!isAudioType) {
      setAudioFile(null);
      setAudioError(tr('Chỉ hỗ trợ định dạng âm thanh (MP3, WAV, WebM, M4A, OGG).'));
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setAudioFile(null);
      setAudioError(tr('Tệp âm thanh vượt quá giới hạn 27 MB.'));
      return;
    }
    setAudioError('');
    setAudioFile(file);
  }

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Đánh giá bài luyện tập')}>
      <PageContainer width="default" density="comfortable" className="space-y-5 text-rp-text">
        <PageHeader
          eyebrow="CÔNG CỤ ĐÁNH GIÁ ĐỘC LẬP"
          title="Đánh giá bài luyện tập"
          description="Thử nghiệm và nhận gợi ý chấm điểm tự động cho bài viết hoặc ghi âm luyện nói JLPT. Để chấm bài tập lớp nhóm của học viên, vui lòng mở mục Bài tập & chấm điểm."
          actions={(
            <Button as={Link} to="/mentor-homework/" variant="secondary" size="sm" iconRight={ArrowRight}>
              {tr('Mở Bài tập lớp nhóm')}
            </Button>
          )}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runEvaluate();
              }}
              className="space-y-4"
            >
              <Banner tone="info" title={tr('Lưu ý phạm vi sử dụng')}>
                {tr('Công cụ này tạo gợi ý đánh giá tham khảo cho bài luyện tập độc lập, tách biệt với bài tập về nhà của từng lớp nhóm.')}
              </Banner>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr('Kỹ năng')}>
                  {({ id }) => (
                    <CustomSelect
                      id={id}
                      value={type}
                      disabled={busy}
                      onChange={(nextType) => {
                        setType(nextType);
                        setAudioFile(null);
                        setAudioError('');
                        setTextError('');
                        setResult(null);
                        setError('');
                      }}
                      options={[
                        { value: 'Writing', label: 'Viết' },
                        { value: 'Speaking', label: 'Nói' },
                      ]}
                    />
                  )}
                </Field>

                <Field label={tr('Cấp độ JLPT tham chiếu')} required error={levelError}>
                  {({ id, invalid }) => (
                    <CustomSelect
                      id={id}
                      value={levelId}
                      invalid={invalid}
                      loading={loadingLevels}
                      disabled={busy || loadingLevels}
                      placeholder={loadingLevels ? 'Đang tải…' : 'Chọn cấp độ'}
                      onChange={(val) => {
                        setLevelId(val);
                        setLevelError('');
                      }}
                      options={(levels.data || []).map((level) => ({
                        value: String(level.id),
                        label: level.code || level.name,
                      }))}
                    />
                  )}
                </Field>
              </div>

              {(certificates.isError || levels.isError) && (
                <ContextualErrorState
                  variant="inline"
                  compact
                  error={certificates.error || levels.error}
                  title={tr('Chưa tải được danh sách cấp độ')}
                  description={
                    (certificates.error?.status === 403 || levels.error?.status === 403)
                      ? tr('Tài khoản Giáo viên hiện chưa được cấp quyền tải danh mục cấp độ JLPT từ máy chủ.')
                      : undefined
                  }
                  onRetry={() => (certificates.isError ? certificates.refetch() : levels.refetch())}
                  retrying={certificates.isFetching || levels.isFetching}
                />
              )}

              <Field label={tr('Đề bài hoặc ngữ cảnh tham chiếu (tùy chọn)')}>
                {({ id }) => (
                  <Input
                    id={id}
                    value={topic}
                    disabled={busy}
                    maxLength={300}
                    placeholder={tr('Ví dụ: Viết đoạn văn ngắn giới thiệu thói quen cuối tuần')}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                )}
              </Field>

              {type === 'Writing' ? (
                <Field label={tr('Nội dung bài viết')} required error={textError} counter={`${text.length}/4000`}>
                  {({ id, invalid }) => (
                    <Textarea
                      id={id}
                      lang="ja"
                      rows={7}
                      maxLength={4000}
                      disabled={busy}
                      invalid={invalid}
                      placeholder={tr('Nhập hoặc dán đoạn văn tiếng Nhật cần đánh giá...')}
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        if (textError) setTextError('');
                      }}
                    />
                  )}
                </Field>
              ) : (
                <Field
                  label={tr('Tệp ghi âm phần nói')}
                  required
                  error={audioError}
                  hint={tr('Hỗ trợ MP3, WAV, WebM, M4A, OGG (tối đa 27 MB). Hệ thống chép lời và nhận xét theo cấp độ đã chọn.')}
                >
                  {() => (
                    <FileUpload
                      accept={['audio/*', '.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4']}
                      maxBytes={MAX_AUDIO_BYTES}
                      disabled={busy}
                      label={audioFile ? audioFile.name : tr('Chọn tệp ghi âm để đánh giá')}
                      files={audioFile ? [audioFile] : []}
                      onChange={handleSelectAudio}
                    />
                  )}
                </Field>
              )}

              {error && (
                <Banner
                  tone="danger"
                  title={tr('Chưa thể hoàn tất đánh giá')}
                  actions={(
                    <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => runEvaluate()} loading={busy}>
                      {tr('Thử lại')}
                    </Button>
                  )}
                >
                  {error}
                </Banner>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-line pt-4">
                {(text || audioFile || result || error) && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setText('');
                      setTopic('');
                      setAudioFile(null);
                      setTextError('');
                      setAudioError('');
                      setResult(null);
                      setError('');
                    }}
                  >
                    {tr('Làm mới')}
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  icon={Sparkles}
                  loading={busy}
                  disabled={busy || loadingLevels}
                >
                  {busy ? tr('Đang đánh giá…') : tr('Đánh giá bài luyện tập')}
                </Button>
              </div>
            </form>
          </Card>

          <div className="min-w-0 space-y-4">
            {!result?.grading && !result?.transcript && (
              <Card className="border-dashed bg-rp-surface/90">
                <ContextualEmptyState
                  compact
                  title={tr('Kết quả đánh giá sẽ hiển thị tại đây')}
                  description={tr('Chọn kỹ năng Viết hoặc Nói, chọn cấp độ JLPT phù hợp và gửi bài để xem gợi ý nhận xét chi tiết.')}
                />
              </Card>
            )}
            {result?.transcript && (
              <Card>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
                  {tr('Nội dung đã nhận dạng từ bản ghi')}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-rp-text" lang="ja">
                  {result.transcript}
                </p>
              </Card>
            )}
            <GradingFeedback grading={result?.grading} skill={type === 'Speaking' ? tr('nói') : tr('viết')} />
          </div>
        </div>
      </PageContainer>
    </MentorShell>
  );
}
