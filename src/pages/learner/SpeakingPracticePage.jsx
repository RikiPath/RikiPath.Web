import LearnerFeedbackPanel from '../../components/LearnerFeedbackPanel.jsx';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import GradingFeedback from '../../components/GradingFeedback.jsx';
import { useSpeakingGrading } from '../../hooks/useSpeechToText.js';
import { useLocale } from '../../i18n/locale.js';

import { speakingLessons } from './productionPracticeLessons.js';

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

export default function SpeakingPracticePage() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [showReading, setShowReading] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);
  const lesson = speakingLessons[lessonIndex];

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

  const hasText = Boolean(
    fullText || transcript || interimTranscript,
  );

  function handleToggleListening() {
    if (isListening) {
      stopListening();
    } else if (!loading) {
      startListening();
    }
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Luyện nói")}>
      <main
        data-page="SpeakingPracticePage"
        className="mx-auto max-w-[1180px] px-5 py-6
                   font-['Be_Vietnam_Pro',sans-serif]
                   text-[#49353F] lg:px-7"
      >
        {/* Tiêu đề */}
        <header className="mb-5">
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1
                       rounded text-[12px] text-[#A0808E]
                       hover:text-[#AD3155]"
          >
            <Icon
              name="arrow_back"
              className="text-[15px]"
            />{tr("Lộ trình ôn luyện")}</Link>

          <h1
            className="mt-3 text-[26px] font-semibold
                       leading-tight tracking-tight"
          >{tr('Luyện nói tiếng Nhật')}</h1>

          <p className="mt-1.5 text-[13px] text-[#967F8A]">
            Thu âm câu mẫu để nhận điểm luyện nói riêng. N5–N2 thể hiện độ khó của bài.
          </p>
          <label className="mt-4 block max-w-md text-sm font-medium">
            Bài luyện nói
            <select className="mt-1 w-full rounded-lg border border-[#E7D7DF] bg-white px-3 py-2"
              value={lessonIndex} disabled={loading || isListening} onChange={event => {
                resetTranscript();
                setShowReading(false);
                setLessonIndex(Number(event.target.value));
              }}>
              {speakingLessons.map((item, index) => <option key={item.level} value={index}>{item.level} · {item.title}</option>)}
            </select>
          </label>
        </header>

        <div className="max-w-[760px]">
          <section
            aria-labelledby="speaking-exercise-title"
            className="min-w-0 overflow-hidden rounded-2xl
                       border border-[#EADFE5] bg-white"
          >
            <header
              className="flex flex-wrap items-center
                         justify-between gap-2
                         border-b border-[#F0E7EC]
                         px-5 py-3.5"
            >
              <h2
                id="speaking-exercise-title"
                className="flex items-center gap-2
                           text-[14px] font-medium"
              >
                <Icon
                  name="record_voice_over"
                  className="text-[19px] text-[#B67D94]"
                />{tr('Đọc theo câu mẫu')}</h2>

            </header>

            {/* Câu cần luyện */}
            <div className="px-5 py-6 sm:px-6">
              <p className="text-[12px] text-[#A08A95]">{tr('Câu cần đọc')}</p>

              <p
                lang="ja"
                className="mt-4 break-words
                           font-['Noto_Sans_JP',sans-serif]
                           text-[25px] font-medium
                           leading-[1.8] tracking-wide
                           text-[#513B46] sm:text-[29px]"
              >
                {lesson.text}
              </p>

              <p
                className="mt-3 text-[13px]
                           leading-6 text-[#967F8A]"
              >
                {lesson.meaning}
              </p>

              <button
                type="button"
                aria-expanded={showReading}
                aria-controls="sentence-reading"
                onClick={() => setShowReading((current) => !current)}
                className="mt-4 inline-flex items-center gap-1
                           rounded text-[12px] text-[#AD627F]
                           hover:text-[#AD3155]
                           focus-visible:outline-none
                           focus-visible:ring-2
                           focus-visible:ring-[#AD3155]/25"
              >
                {showReading ? tr("Ẩn cách đọc") : tr("Hiện cách đọc")}
                <Icon
                  name={showReading ? 'expand_less' : 'expand_more'}
                  className="text-[17px]"
                />
              </button>

              {showReading && (
                <div
                  id="sentence-reading"
                  className="mt-3 rounded-lg bg-[#FCF5F8]
                             px-4 py-3"
                >
                  <p
                    lang="ja"
                    className="font-['Noto_Sans_JP',sans-serif]
                               text-[14px] leading-7 text-[#9B6C80]"
                  >
                    {lesson.reading}
                  </p>
                </div>
              )}
            </div>

            {/* Điều khiển mic */}
            <div
              className="border-y border-[#F0E7EC]
                         bg-[#FFFAFC] px-5 py-4 sm:px-6"
            >
              <div
                className="flex flex-wrap items-center
                           justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={[
                      'flex h-10 w-10 shrink-0 items-center',
                      'justify-center rounded-full',
                      isListening
                        ? 'bg-[#F7DFE8] text-[#AD3155]'
                        : 'bg-[#F5ECF0] text-[#B78A9D]',
                    ].join(' ')}
                  >
                    <Icon
                      name={isListening ? 'graphic_eq' : 'mic_none'}
                      className="text-[23px]"
                    />
                  </span>

                  <div role="status">
                    <p className="text-[13px] font-medium">
                      {loading
                        ? tr("Đang xử lý…")
                        : isListening
                          ? tr("Đang nghe bạn nói")
                          : hasText
                            ? tr("Bạn có thể nói thêm hoặc luyện lại")
                            : tr("Sẵn sàng luyện nói")}
                    </p>

                    <p className="mt-1 text-[11px] text-[#A08A95]">
                      {isListening
                        ? tr("Đọc rõ ràng, với tốc độ tự nhiên.")
                        : tr("Cho phép sử dụng micro khi được hỏi.")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleListening}
                  disabled={loading && !isListening}
                  aria-pressed={isListening}
                  className="inline-flex h-10 items-center
                             justify-center gap-2 rounded-[10px]
                             bg-[#AD3155] px-4 text-[13px]
                             font-medium text-white
                             transition-colors hover:bg-[#982B4B]
                             focus-visible:outline-none
                             focus-visible:ring-2
                             focus-visible:ring-[#AD3155]/30
                             focus-visible:ring-offset-2
                             disabled:cursor-wait
                             disabled:opacity-50"
                >
                  <Icon
                    name={
                      isListening
                        ? 'stop'
                        : loading
                          ? 'progress_activity'
                          : 'mic'
                    }
                    className={`text-[18px] ${
                      loading && !isListening ? 'animate-spin' : ''
                    }`}
                  />

                  {isListening
                    ? tr("Dừng nói")
                    : loading
                      ? tr("Đang xử lý…")
                      : tr("Bắt đầu nói")}
                </button>
              </div>
            </div>

            {/* Nội dung nhận dạng */}
            <div className="px-5 py-5 sm:px-6">
              <div
                className="mb-3 flex items-center
                           justify-between gap-3"
              >
                <h3 className="text-[13px] font-medium">{tr('Nội dung nhận dạng')}</h3>

                {isListening && (
                  <span
                    className="inline-flex items-center gap-1.5
                               text-[11px] text-[#AD627F]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full
                                 bg-[#C46E8D]"
                    />{tr("Đang nghe")}</span>
                )}
              </div>

              <div
                aria-live="polite"
                aria-atomic="true"
                className="min-h-[88px] rounded-xl
                           border border-[#EEE4E9]
                           bg-[#FDFBFC] px-4 py-3"
              >
                {hasText ? (
                  <p
                    lang="ja"
                    className="whitespace-pre-wrap break-words
                               font-['Noto_Sans_JP',sans-serif]
                               text-[18px] leading-8"
                  >
                    <span className="text-[#62505A]">
                      {transcript}
                    </span>

                    {interimTranscript && (
                      <span className="text-[#BE8BA0]">
                        {transcript ? ' ' : ''}
                        {interimTranscript}
                      </span>
                    )}

                    {!transcript && !interimTranscript && fullText}
                  </p>
                ) : (
                  <p className="text-[12px] leading-6 text-[#AC98A2]">
                    {isListening
                      ? 'Hãy đọc câu mẫu rồi dừng thu âm.'
                      : audioFile
                        ? 'Đã thu âm. Chọn chấm bài để xem bản chép lời và nhận xét.'
                        : 'Nhấn “Bắt đầu nói” để thực hiện bài luyện.'}
                  </p>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2
                             rounded-lg bg-[#FFF0F3]
                             px-3 py-2.5 text-[12px]
                             leading-5 text-[#A15A70]"
                >
                  <Icon
                    name="error_outline"
                    className="mt-0.5 shrink-0 text-[16px]"
                  />
                  {String(error.message || error)}
                </p>
              )}

              {audioFile && !grading && <button
                type="button" disabled={loading || isListening} onClick={() => gradeRecording(lesson.text, lesson.level)}
                className="mt-4 rounded-lg bg-[#AD3155] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {loading ? 'Đang chấm…' : 'Chấm bài bằng AI · 1 lượt'}
              </button>}
              <GradingFeedback grading={grading} skill="nói" />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-[420px] text-[11px] leading-5 text-[#A08A95]">
                  Nội dung nhận dạng có thể khác lời bạn nói.
                  AI nhận xét nội dung từ bản chép lời.
                </p>

                <button
                  type="button"
                  onClick={resetTranscript}
                  disabled={loading || isListening || (!hasText && !audioFile)}
                  className="inline-flex h-9 shrink-0
                             items-center gap-1.5 rounded-lg
                             border border-[#E7D7DF]
                             px-3 text-[12px] text-[#9C6B80]
                             hover:bg-[#FCF3F7]
                             disabled:cursor-not-allowed
                             disabled:opacity-40"
                >
                  <Icon name="refresh" className="text-[17px]" />{tr('Xóa và luyện lại')}</button>
              </div>
            </div>
          </section>

          {/* Hướng dẫn ngắn */}
          <aside className="space-y-4">
            <section
              className="rounded-xl border border-[#EADFE5]
                         bg-white p-4"
            >
              <h2 className="text-[14px] font-medium">
                Cách luyện
              </h2>

              <ol className="mt-4 space-y-4">
                {[
                  ['1', 'Đọc câu mẫu', 'Xem cách đọc nếu cần.'],
                  ['2', 'Nói vào micro', 'Đọc trọn câu với tốc độ vừa phải.'],
                  ['3', 'Chấm bài', 'Xem bản chép lời và nhận xét của AI.'],
                ].map(([number, title, description]) => (
                  <li key={number} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-6 shrink-0
                                 items-center justify-center
                                 rounded-full bg-[#FAEAF1]
                                 text-[11px] text-[#AD7389]"
                    >
                      {number}
                    </span>

                    <div>
                      <p className="text-[12px] font-medium">
                        {title}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[#A08A95]">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div
              className="flex items-start gap-2 rounded-xl
                         border border-[#EEDFE6]
                         bg-[#FCF2F6] p-4"
            >
              <Icon
                name="lightbulb"
                className="mt-0.5 shrink-0 text-[18px] text-[#B77E95]"
              />
              <p className="text-[12px] leading-6 text-[#A0808E]">
                Luyện từng câu ngắn trong không gian yên tĩnh
                để dễ theo dõi lời nói được nhận dạng.
              </p>
            </div>
          </aside>
        </div>
        <LearnerFeedbackPanel type="speaking" label="Phản hồi về luyện nói" />
      </main>
    </LearnerShell>
  );
}
