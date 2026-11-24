import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ArrowLeft, HelpCircle, Mic, RotateCcw, Square } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  PageContainer,
  Popover,
  Collapsible,
} from '@/components/ui';
import { ControlGroup, CounterPill, IllustratedPageHeader } from '@/features/learner-ui';
import Icon from '@/components/ui/Icon.jsx';
import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import { LearnerShell } from '@/layouts';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import GradingFeedback from '@/features/practice/components/GradingFeedback.jsx';
import { useSpeakingGrading } from '@/features/speaking/hooks/useSpeechToText.js';
import { useLocale } from '@/locales/locale.js';

import { speakingLessons } from './productionPracticeLessons.js';

function formatTimer(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function SpeakingPracticePage() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [showReading, setShowReading] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const lesson = speakingLessons[lessonIndex] || speakingLessons[0];

  const studyAccess = useStudyAccess();
  const subscription = studyAccess.data;
  const speakingQuota = subscription
    ? (Number(subscription.speakingUsesRemaining ?? 0) + Number(subscription.aiGradingUsesRemaining ?? 0))
    : null;

  const {
    isListening,
    transcript,
    interimTranscript,
    fullText,
    loading,
    error,
    startListening,
    stopListening,
    resetTranscript,
    audioFile,
    grading,
    gradeRecording,
  } = useSpeakingGrading();

  useEffect(() => {
    if (!isListening) return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setRecordingSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 250);
    return () => {
      clearInterval(timer);
      setRecordingSeconds(0);
    };
  }, [isListening]);

  const audioPreviewUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : ''),
    [audioFile],
  );

  useEffect(() => () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  const hasText = Boolean(fullText || transcript || interimTranscript);
  const isQuotaError = Boolean(
    error &&
      typeof error === 'object' &&
      (error.status === 403 ||
        ['AI_CREDIT_REQUIRED', 'SPEAKING_PACKAGE_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED'].includes(
          error?.data?.errorCode || error?.errorCode,
        )),
  );
  const errorMessage = error
    ? typeof error === 'string'
      ? error
      : formatApiError(error, tr('Chưa chấm được bài nói.'))
    : '';

  function handleToggleListening() {
    if (isListening) {
      stopListening();
    } else if (!loading) {
      startListening();
    }
  }

  const lessonOptions = speakingLessons.map((item, index) => ({
    value: String(index),
    label: `${item.level} · ${tr(item.title)}`,
  }));

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Luyện nói')}>
      <PageContainer data-page="SpeakingPracticePage" width="default">
        <Link to="/roadmap" className="rp-focus rp-link mb-3 inline-flex items-center gap-1 text-xs font-semibold">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          {tr('Lộ trình ôn luyện')}
        </Link>
        <IllustratedPageHeader
          icon="speaking"
          tone="mint"
          className="mb-4"
          eyebrow="JLPT N5 – N2"
          title={tr('Luyện nói tiếng Nhật')}
          description={tr('Thu âm câu mẫu để nghe lại và nhận bản chép lời cùng nhận xét phát âm.')}
          actions={
            <ControlGroup>
              <div className="min-w-[205px] max-w-full sm:w-[235px]">
                <CustomSelect
                  size="md"
                  aria-label={tr('Bài luyện nói')}
                  value={String(lessonIndex)}
                  disabled={loading || isListening}
                  onChange={(next) => {
                    resetTranscript();
                    setShowReading(false);
                    setLessonIndex(Number(next));
                  }}
                  options={lessonOptions}
                />
              </div>
              {speakingQuota !== null && (
                <CounterPill tone={speakingQuota > 0 ? 'brand' : 'neutral'}>
                  {trf('Lượt AI nói: {0}', { 0: speakingQuota })}
                </CounterPill>
              )}
              <Popover
                align="end"
                label={tr('Hướng dẫn')}
                panelClassName="w-72 p-4 text-xs"
                trigger={({ toggle, props }) => (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={HelpCircle}
                    onClick={toggle}
                    {...props}
                  >
                    {tr('Hướng dẫn')}
                  </Button>
                )}
              >
                <div className="w-72 space-y-3 p-1 text-xs">
                  <p className="font-semibold text-rp-text">{tr('Cách luyện hiệu quả')}</p>
                  <ol className="space-y-2 text-rp-text-2">
                    <li>1. {tr('Đọc câu mẫu và mở cách đọc kana nếu cần.')}</li>
                    <li>2. {tr('Bấm Bắt đầu nói và đọc trọn câu ở tốc độ tự nhiên.')}</li>
                    <li>3. {tr('Nghe lại bản thu âm rồi chọn Chấm bài bằng AI.')}</li>
                  </ol>
                  <p className="border-t border-rp-line pt-2 text-rp-text-muted">
                    {tr('Luyện trong không gian yên tĩnh để hệ thống nhận dạng chính xác hơn.')}
                  </p>
                </div>
              </Popover>
            </ControlGroup>
          }
        />

        {speakingQuota === 0 && (
          <Banner
            tone="warning"
            className="mb-4"
            actions={
              <Link
                to="/plans/"
                state={{ from: { pathname }, requiredFeatureLabel: tr('Luyện nói AI') }}
                className="rp-link text-xs font-semibold"
              >
                {tr('Mua gói ngay')}
              </Link>
            }
          >
            {tr('Bạn đã hết lượt chấm nói AI. Bạn vẫn có thể thu âm và nghe lại, hoặc nạp thêm lượt để AI chấm.')}
          </Banner>
        )}

        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rp-line px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-rp-text">
                <Icon name="record_voice_over" className="text-[19px] text-rp-brand-strong" />
                {tr('Đọc theo câu mẫu')}
              </h2>
              <Badge tone="neutral" size="sm" icon={false}>
                {lesson.level}
              </Badge>
            </div>

            <div className="px-5 py-6 sm:px-6">
              <p className="text-xs font-medium text-rp-text-muted">{tr('Câu cần đọc')}</p>
              <p
                lang="ja"
                className="mt-3 break-words font-['Noto_Sans_JP',sans-serif] text-2xl font-medium leading-[1.8] tracking-wide text-rp-text sm:text-[28px]"
              >
                {lesson.text}
              </p>
              <p className="mt-2.5 text-sm leading-6 text-rp-text-muted">{tr(lesson.meaning)}</p>

              <button
                type="button"
                aria-expanded={showReading}
                aria-controls="sentence-reading"
                onClick={() => setShowReading((current) => !current)}
                className="rp-focus mt-3 inline-flex items-center gap-1 rounded text-xs font-medium text-rp-brand-strong hover:text-rp-brand-deep"
              >
                {showReading ? tr('Ẩn cách đọc') : tr('Hiện cách đọc')}
                <Icon name="expand_more" className="rp-disclosure-chevron text-[17px]" />
              </button>

              <Collapsible open={showReading} id="sentence-reading" innerClassName="pt-3">
                <div className="rounded-xl border border-rp-line bg-white px-4 py-3">
                  <p lang="ja" className="font-['Noto_Sans_JP',sans-serif] text-sm leading-7 text-rp-brand-strong">
                    {lesson.reading}
                  </p>
                </div>
              </Collapsible>
            </div>

            <div className="border-y border-rp-line bg-white px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isListening ? 'bg-rp-brand-strong text-white' : 'bg-rp-brand-soft text-rp-brand-strong'
                    }`}
                  >
                    <Icon name={isListening ? 'graphic_eq' : 'mic_none'} className="text-[22px]" />
                  </span>

                  <div role="status">
                    <p className="text-sm font-semibold text-rp-text">
                      {loading
                        ? tr('Đang xử lý…')
                        : isListening
                          ? trf('Đang ghi âm · {0}', { 0: formatTimer(recordingSeconds) })
                          : audioFile
                            ? tr('Đã thu âm xong · Nghe lại hoặc gửi chấm')
                            : tr('Sẵn sàng luyện nói')}
                    </p>
                    <p className="mt-0.5 text-xs text-rp-text-muted">
                      {isListening
                        ? tr('Đọc rõ ràng ở tốc độ tự nhiên, nhấn Dừng khi xong.')
                        : tr('Cho phép trình duyệt sử dụng micro khi được hỏi.')}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={isListening ? 'danger' : 'primary'}
                  onClick={handleToggleListening}
                  disabled={loading && !isListening}
                  loading={loading && !isListening}
                  aria-pressed={isListening}
                  icon={isListening ? Square : Mic}
                >
                  {isListening ? tr('Dừng nói') : loading ? tr('Đang xử lý…') : tr('Bắt đầu nói')}
                </Button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              {audioPreviewUrl && (
                <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3">
                  <p className="mb-1.5 text-xs font-medium text-rp-text-muted">{tr('Nghe lại bản thu âm')}</p>
                  <audio controls src={audioPreviewUrl} className="h-9 w-full" />
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-rp-text">{tr('Bản chép lời nhận dạng')}</h3>
                  {isListening && (
                    <Badge tone="brand" size="sm" icon={false}>
                      {tr('Đang nghe')}
                    </Badge>
                  )}
                </div>

                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className="min-h-[84px] rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-3"
                >
                  {hasText ? (
                    <p lang="ja" className="whitespace-pre-wrap break-words font-['Noto_Sans_JP',sans-serif] text-lg leading-8 text-rp-text">
                      <span>{transcript}</span>
                      {interimTranscript && (
                        <span className="text-rp-brand-strong">
                          {transcript ? ' ' : ''}
                          {interimTranscript}
                        </span>
                      )}
                      {!transcript && !interimTranscript && fullText}
                    </p>
                  ) : (
                    <p className="text-xs leading-6 text-rp-text-muted">
                      {isListening
                        ? tr('Hãy đọc câu mẫu rồi nhấn Dừng nói.')
                        : audioFile
                          ? tr('Đã thu âm xong. Bấm Chấm bài bằng AI để nhận bản chép lời và góp ý phát âm.')
                          : tr('Nhấn “Bắt đầu nói” để thu âm câu luyện của bạn.')}
                    </p>
                  )}
                </div>
              </div>

              {errorMessage && (
                <Banner
                  tone="danger"
                  actions={
                    isQuotaError ? (
                      <Link
                        to="/plans/"
                        state={{ from: { pathname }, requiredFeatureLabel: tr('Luyện nói AI') }}
                        className="rp-link text-xs font-semibold"
                      >
                        {tr('Mua gói ngay')}
                      </Link>
                    ) : null
                  }
                >
                  {errorMessage}
                </Banner>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
                <p className="max-w-md text-xs leading-5 text-rp-text-muted">
                  {tr('Nội dung nhận dạng có thể khác nhẹ lời nói thực tế; AI đánh giá dựa trên bản ghi và câu mẫu.')}
                </p>

                <ControlGroup>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={resetTranscript}
                    disabled={loading || isListening || (!hasText && !audioFile && !grading)}
                    icon={RotateCcw}
                  >
                    {tr('Xóa và luyện lại')}
                  </Button>

                  {audioFile && !grading && (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={loading || isListening}
                      onClick={() => gradeRecording(lesson.text, lesson.level)}
                    >
                      {loading ? tr('Đang chấm…') : tr('Chấm bài bằng AI · 1 lượt')}
                    </Button>
                  )}
                </ControlGroup>
              </div>
            </div>
          </Card>

          <GradingFeedback grading={grading} skill={tr('nói')} />
        </div>
      </PageContainer>
    </LearnerShell>
  );
}
