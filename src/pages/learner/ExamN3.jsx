import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';

const DURATION = 15 * 60;

const QUESTIONS = [
  {
    id: 1,
    title: '本文によると、生け花は何を大切にしていますか。',
    options: [
      'できるだけ多くの花を飾ること',
      '余白を創り出すこと',
      '同じ色の花だけを使うこと',
      '大きな花瓶を選ぶこと',
    ],
    correct: 1,
    explanation:
      'Đoạn đầu cho biết nghệ thuật cắm hoa chú trọng tạo ra “余白” — khoảng trống.',
  },
  {
    id: 2,
    title: '春の初めに、まだ蕾のある枝を活けるのはなぜですか。',
    options: [
      '満開の花より長く保存できるから',
      '花瓶に入れやすいから',
      'これから咲く命の力などを感じられるから',
      '花の色を変えられるから',
    ],
    correct: 2,
    explanation:
      'Đoạn hai nhắc đến sức sống của nụ hoa sắp nở và cảm xúc trước sự mong manh của hoa.',
  },
  {
    id: 3,
    title: '筆者が最後の段落で伝えたいことは何ですか。',
    options: [
      '現代人は情報をもっと集めるべきだ',
      '花を飾れば、仕事が早く終わる',
      '生け花では、花の数が最も重要だ',
      '何かを減らすことで、大切なものが見えてくる',
    ],
    correct: 3,
    explanation:
      'Câu cuối nhấn mạnh rằng bớt đi một điều gì đó có thể giúp nhận ra bản chất quan trọng.',
  },
];

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

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;
}

const focusClass =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#AD3155]/40 focus-visible:ring-offset-2';

export default function ExamN3() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();

  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState([]);
  const [fontSize, setFontSize] = useState(17);
  const [remaining, setRemaining] = useState(DURATION);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const deadlineRef = useRef(null);
  const questionRefs = useRef({});

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = QUESTIONS.length - answeredCount;
  const correctCount = QUESTIONS.filter(
    (question) => answers[question.id] === question.correct,
  ).length;

  const expired = submitted && remaining === 0;
  const canAnswer = started && !submitted;

  useEffect(() => {
    if (!started || submitted) return undefined;

    function updateTimer() {
      const seconds = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );

      setRemaining(seconds);

      if (seconds === 0) {
        setSubmitted(true);
        setConfirmSubmit(false);
      }
    }

    updateTimer();
    const interval = window.setInterval(updateTimer, 500);

    return () => window.clearInterval(interval);
  }, [started, submitted]);

  function startExam() {
    deadlineRef.current = Date.now() + DURATION * 1000;
    setStarted(true);
  }

  function toggleFlag(id) {
    setFlagged((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function submitExam() {
    // Đọc lại thời gian thực tại thời điểm nộp bài.
    const seconds = Math.max(
      0,
      Math.ceil((deadlineRef.current - Date.now()) / 1000),
    );

    setRemaining(seconds);
    setSubmitted(true);
    setConfirmSubmit(false);
  }

  function restartExam() {
    deadlineRef.current = null;
    setAnswers({});
    setFlagged([]);
    setRemaining(DURATION);
    setStarted(false);
    setSubmitted(false);
    setConfirmSubmit(false);
  }

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Thi thử")}>
      <div
        data-page="ExamN3"
        className="min-h-full bg-[#FCF8FA] text-[#49353F]"
      >
        <div className="mx-auto max-w-[1360px] px-4 py-5 sm:px-6 lg:px-7">
          {/* Tiêu đề và thời gian */}
          <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight">{tr('Thi thử')}</h1>
              <p className="mt-1 text-[13px] text-[#927E89]">
                {locale === 'ja'
                  ? `読解サンプル · ${QUESTIONS.length}問 · 15分`
                  : `Bài đọc minh họa · ${QUESTIONS.length} câu · 15 phút`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                role="timer"
                aria-label={locale === 'ja' ? `残り時間 ${formatTime(remaining)}` : `Thời gian còn lại ${formatTime(remaining)}`}
                className={[
                  'flex items-center gap-2 rounded-xl border px-3 py-2',
                  remaining <= 60 && started && !submitted
                    ? 'border-[#E9B7C6] bg-[#FFF0F4] text-[#A33357]'
                    : 'border-[#EADFE5] bg-white text-[#78616E]',
                ].join(' ')}
              >
                <Icon name="timer" className="text-[19px]" />
                <span className="font-mono text-[19px] font-medium tabular-nums">
                  {formatTime(remaining)}
                </span>
              </div>

              {!started ? (
                <button
                  type="button"
                  onClick={startExam}
                  className={`h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
                >{tr('Bắt đầu làm bài')}</button>
              ) : submitted ? (
                <button
                  type="button"
                  onClick={restartExam}
                  className={`h-10 rounded-lg border border-[#E2CBD5] bg-white px-4 text-[13px] font-medium text-[#AD3155] hover:bg-[#FFF4F8] ${focusClass}`}
                >{tr('Làm lại')}</button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(true)}
                  className={`h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
                >{tr('Nộp bài')}</button>
              )}
            </div>
          </header>

          {/* Kết quả minh họa */}
          {submitted && (
            <div
              role="status"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8D5DE] bg-[#FCEEF4] px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-[#A33357]">
                  {expired ? tr("Đã hết thời gian") : tr("Đã hoàn thành bài đọc")}
                </p>
                <p className="mt-1 text-[13px] text-[#876C7B]">
                  {locale === 'ja'
                    ? `正解 ${correctCount}/${QUESTIONS.length}問${unansweredCount > 0 ? ` · 未回答 ${unansweredCount}問` : ''}。各問の下で解説を見てください。`
                    : `Đúng ${correctCount}/${QUESTIONS.length} câu${unansweredCount > 0 ? ` · ${unansweredCount} câu chưa trả lời` : ''}. Xem giải thích dưới mỗi câu.`}
                </p>
              </div>

              <Link
                to="/roadmap"
                className={`rounded text-[13px] font-medium text-[#AD3155] underline-offset-4 hover:underline ${focusClass}`}
              >{tr('Về lộ trình')}</Link>
            </div>
          )}

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            {/* Bài đọc */}
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#F0E7EC] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <Icon
                    name="menu_book"
                    className="text-[19px] text-[#AF7890]"
                  />
                  <h2 className="text-[14px] font-medium">{tr('Bài đọc')}</h2>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={tr("Giảm cỡ chữ bài đọc")}
                    disabled={fontSize <= 15}
                    onClick={() =>
                      setFontSize((current) => Math.max(15, current - 1))
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-[#927B87] hover:bg-[#FCF2F6] disabled:cursor-not-allowed disabled:opacity-30 ${focusClass}`}
                  >
                    <Icon name="text_decrease" className="text-[19px]" />
                  </button>

                  <span className="w-8 text-center text-[11px] tabular-nums text-[#A08B96]">
                    {fontSize}
                  </span>

                  <button
                    type="button"
                    aria-label={tr("Tăng cỡ chữ bài đọc")}
                    disabled={fontSize >= 22}
                    onClick={() =>
                      setFontSize((current) => Math.min(22, current + 1))
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-[#927B87] hover:bg-[#FCF2F6] disabled:cursor-not-allowed disabled:opacity-30 ${focusClass}`}
                  >
                    <Icon name="text_increase" className="text-[19px]" />
                  </button>
                </div>
              </div>

              <article className="px-5 py-5 sm:px-7 sm:py-6">
                <p className="text-[12px] text-[#AA758D]">
                  文化と暮らし
                </p>

                <h3
                  lang="ja"
                  className="mt-2 text-[21px] font-medium leading-relaxed text-[#533D49]"
                >
                  生け花に見る「余白」の美しさ
                </h3>

                <div
                  lang="ja"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: "'Noto Sans JP', sans-serif",
                  }}
                  className="mt-5 space-y-5 break-words leading-[2.1] text-[#594B53] selection:bg-[#F5D5E3]"
                >
                  <p>
                    日本の伝統的な文化である「生け花」は、ただ美しい花を
                    花瓶に集めて飾ることではない。西洋のフラワーアレンジメントが
                    空間を花で満たす「足し算の美」であるのに対して、日本の生け花は
                    不要な枝や葉をあえて切り落とし、「余白」を創り出す
                    「引き算の美学」に基づいている。
                  </p>

                  <p>
                    特に春の初めには、満開の桜ではなく、あえてまだ硬い蕾を
                    つけた一枝を活けることが多い。そこには、これから咲こうとする
                    命の力強さや、やがて散りゆく儚さを慈しむ「もののあわれ」
                    という独特の感性が宿っている。何もない空間、すなわち「間」が
                    存在することによってこそ、一本の花の凛とした立ち姿や、
                    風の流れが観る者の心に鮮やかに伝わってくるのである。
                  </p>

                  <p>
                    情報が溢れ、絶え間なく時間に追われる現代社会において、
                    この「余白」を味わう生け花の精神は、現代人にとって
                    大切な契機となっていると言えよう。あえて何かを引くことで、
                    本当に大切な本質が静かに浮かび上がってくるからである。
                  </p>
                </div>
              </article>
            </section>

            {/* Câu hỏi */}
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
              <div className="border-b border-[#F0E7EC] px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[14px] font-medium">{tr('Câu hỏi')}</h2>
                  <span className="text-[12px] text-[#98828E]">
                    {locale === 'ja' ? `回答済み ${answeredCount}/${QUESTIONS.length}` : `Đã chọn ${answeredCount}/${QUESTIONS.length}`}
                  </span>
                </div>

                <div
                  aria-label={tr("Đi đến câu hỏi")}
                  className="mt-3 flex items-center gap-2"
                >
                  {QUESTIONS.map((question, index) => {
                    const answered = answers[question.id] !== undefined;
                    const marked = flagged.includes(question.id);

                    return (
                      <button
                        key={question.id}
                        type="button"
                        aria-label={locale === 'ja'
                          ? `問${index + 1}${answered ? '、回答済み' : '、未回答'}${marked ? '、マーク済み' : ''}`
                          : `Câu ${index + 1}${answered ? ', đã trả lời' : ', chưa trả lời'}${marked ? ', đã đánh dấu' : ''}`}
                        onClick={() =>
                          questionRefs.current[question.id]?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          })
                        }
                        className={[
                          'relative flex h-8 w-8 items-center justify-center',
                          'rounded-lg border text-[12px] transition-colors',
                          focusClass,
                          answered
                            ? 'border-[#E5BCCC] bg-[#FBEAF2] font-medium text-[#A33357]'
                            : 'border-[#EDE4E9] text-[#9B8591] hover:bg-[#FCF7FA]',
                        ].join(' ')}
                      >
                        {index + 1}
                        {marked && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#B58D52] ring-2 ring-white" />
                        )}
                      </button>
                    );
                  })}

                  <span className="ml-auto text-[11px] text-[#A08C97]">
                    {locale === 'ja' ? `マーク ${flagged.length}` : `${flagged.length} đánh dấu`}
                  </span>
                </div>
              </div>

              {!started && (
                <p className="border-b border-[#F0E7EC] bg-[#FFF6F9] px-4 py-3 text-[12px] leading-5 text-[#987584] sm:px-5">{tr("Nhấn “Bắt đầu làm bài” để chọn đáp án và tính giờ.")}</p>
              )}

              <div className="divide-y divide-[#F0E7EC]">
                {QUESTIONS.map((question, questionIndex) => {
                  const marked = flagged.includes(question.id);
                  const chosen = answers[question.id];

                  return (
                    <article
                      key={question.id}
                      ref={(element) => {
                        questionRefs.current[question.id] = element;
                      }}
                      className="scroll-mt-24 px-4 py-4 sm:px-5"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[12px] font-semibold text-[#A33357]">
                          {locale === 'ja' ? `問 ${questionIndex + 1}` : `Câu ${questionIndex + 1}`}
                        </h3>

                        <button
                          type="button"
                          aria-label={locale === 'ja' ? `問${questionIndex + 1}をマーク` : `Đánh dấu câu ${questionIndex + 1}`}
                          aria-pressed={marked}
                          disabled={!canAnswer}
                          onClick={() => toggleFlag(question.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#FCF4F8] disabled:cursor-not-allowed disabled:opacity-40 ${
                            marked ? 'text-[#A57C40]' : 'text-[#B6A1AC]'
                          } ${focusClass}`}
                        >
                          <Icon
                            name={marked ? 'bookmark' : 'bookmark_border'}
                            className="text-[19px]"
                          />
                        </button>
                      </div>

                      <fieldset disabled={!canAnswer}>
                        <legend
                          lang="ja"
                          className="mb-3 text-[14px] font-medium leading-7"
                        >
                          {question.title}
                        </legend>

                        <div className="space-y-2">
                          {question.options.map((option, index) => {
                            const active = chosen === index;
                            const correct =
                              submitted && question.correct === index;
                            const incorrect =
                              submitted &&
                              active &&
                              index !== question.correct;

                            return (
                              <label
                                key={option}
                                className={[
                                  'flex items-start gap-2.5 rounded-lg border',
                                  'px-3 py-2.5 transition-colors',
                                  'focus-within:ring-2 focus-within:ring-[#AD3155]/30',
                                  canAnswer
                                    ? 'cursor-pointer'
                                    : 'cursor-default',
                                  correct
                                    ? 'border-[#BFD5C6] bg-[#F2F8F4]'
                                    : incorrect
                                      ? 'border-[#E8BBC8] bg-[#FFF2F6]'
                                      : active
                                        ? 'border-[#E2B7C8] bg-[#FDF0F6]'
                                        : 'border-[#EEE6EB] bg-white',
                                ].join(' ')}
                              >
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={index}
                                  checked={active}
                                  onChange={() =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: index,
                                    }))
                                  }
                                  className="mt-1 h-4 w-4 shrink-0 accent-[#AD3155]"
                                />

                                <span
                                  lang="ja"
                                  className="flex-1 text-[13px] leading-6 text-[#74606C]"
                                >
                                  <span className="mr-1.5 text-[#A48E9A]">
                                    {index + 1}.
                                  </span>
                                  {option}
                                </span>

                                {correct && (
                                  <Icon
                                    name="check"
                                    className="mt-0.5 text-[18px] text-[#538063]"
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      {submitted && (
                        <p className="mt-3 text-[12px] leading-6 text-[#8B7581]">
                          <span className="font-medium text-[#597D65]">
                            {locale === 'ja' ? `正解 ${question.correct + 1}.` : `Đáp án ${question.correct + 1}.`}{' '}
                          </span>
                          {tr(question.explanation)}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="border-t border-[#F0E7EC] bg-[#FDFAFC] px-4 py-3 text-[11px] leading-5 text-[#A18B97] sm:px-5">{tr('Bài minh họa · Kết quả chưa được lưu vào lịch sử.')}</div>
            </section>
          </div>

          {/* Xác nhận nộp bài */}
          {confirmSubmit && !submitted && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#34232D]/30 p-4">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="submit-title"
                aria-describedby="submit-description"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setConfirmSubmit(false);

                  // Giữ focus trong hai nút của hộp xác nhận.
                  if (event.key === 'Tab') {
                    const buttons =
                      event.currentTarget.querySelectorAll('button');
                    const first = buttons[0];
                    const last = buttons[buttons.length - 1];

                    if (
                      event.shiftKey &&
                      document.activeElement === first
                    ) {
                      event.preventDefault();
                      last.focus();
                    } else if (
                      !event.shiftKey &&
                      document.activeElement === last
                    ) {
                      event.preventDefault();
                      first.focus();
                    }
                  }
                }}
                className="w-full max-w-sm rounded-2xl border border-[#EADFE5] bg-white p-5 shadow-lg"
              >
                <h2
                  id="submit-title"
                  className="text-[18px] font-semibold"
                >{tr('Nộp bài ngay?')}</h2>

                <p
                  id="submit-description"
                  className="mt-2 text-[13px] leading-6 text-[#927B88]"
                >
                  {unansweredCount > 0
                    ? (locale === 'ja' ? `未回答が${unansweredCount}問あります。` : `Bạn còn ${unansweredCount} câu chưa trả lời.`)
                    : tr('Bạn đã trả lời tất cả câu hỏi.')}
                  {' '}{tr('Sau khi nộp, bạn có thể xem đáp án và giải thích.')}
                </p>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    autoFocus
                    type="button"
                    onClick={() => setConfirmSubmit(false)}
                    className={`h-10 rounded-lg border border-[#EADFE5] px-4 text-[13px] text-[#856C7B] hover:bg-[#FCF7FA] ${focusClass}`}
                  >{tr('Làm tiếp')}</button>

                  <button
                    type="button"
                    onClick={submitExam}
                    className={`h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focusClass}`}
                  >{tr('Nộp bài')}</button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </LearnerShell>
  );
}
