import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';

const PRACTICE_OPTIONS = [
  {
    id: 'vocabulary',
    label: 'Từ vựng',
    japanese: '語彙',
    icon: 'style',
    title: 'Ôn lại từ, nhớ thêm một chút',
    description:
      'Bắt đầu bằng những từ đến hạn ôn, sau đó xem lại các từ bạn còn dễ nhầm.',
    steps: [
      'Ôn các thẻ đến hạn trong SRS.',
      'Đọc lại ví dụ của những từ chưa nhớ.',
      'Kết thúc khi bạn vẫn còn tập trung.',
    ],
    to: '/daily-srs',
    action: 'Ôn từ hôm nay',
    secondaryTo: '/vocabulary',
    secondaryLabel: 'Mở kho từ vựng',
  },
  {
    id: 'reading',
    label: 'Đọc hiểu',
    japanese: '読解',
    icon: 'menu_book',
    title: 'Đọc chậm một đoạn, hiểu rõ hơn',
    description:
      'Chọn một bài đọc vừa sức. Đọc để nắm ý chính trước khi xem lại từng câu.',
    steps: [
      'Đọc lướt để nhận ra chủ đề.',
      'Tìm thông tin liên quan đến câu hỏi.',
      'Xem lại câu trả lời và từ chưa rõ.',
    ],
    to: '/riki/reading',
    action: 'Luyện đọc hiểu',
    secondaryTo: '/vocabulary',
    secondaryLabel: 'Tra lại từ vựng',
  },
  {
    id: 'listening',
    label: 'Nghe hiểu',
    japanese: '聴解',
    icon: 'headphones',
    title: 'Nghe lại, bắt thêm một ý',
    description:
      'Luyện với một đoạn ngắn và nghe lại phần chưa rõ, thay vì chuyển bài quá nhanh.',
    steps: [
      'Nghe lần đầu để nắm tình huống.',
      'Nghe lại và ghi những ý nhận ra.',
      'Đối chiếu phần giải thích nếu có.',
    ],
    to: '/riki/listening',
    action: 'Luyện nghe hiểu',
    secondaryTo: '/speech',
    secondaryLabel: 'Thử luyện nói',
  },
  {
    id: 'writing',
    label: 'Luyện viết',
    japanese: '作文',
    icon: 'edit_note',
    title: 'Viết ngắn, diễn đạt rõ',
    description:
      'Chọn một chủ đề quen thuộc và viết vài câu bằng những mẫu câu bạn đã biết.',
    steps: [
      'Chọn một ý bạn muốn diễn đạt.',
      'Viết câu ngắn trước khi mở rộng.',
      'Đọc lại từ vựng và cách nối câu.',
    ],
    to: '/riki/essay',
    action: 'Bắt đầu luyện viết',
    secondaryTo: '/speech',
    secondaryLabel: 'Chuyển sang luyện nói',
  },
];

const QUICK_LINKS = [
  {
    to: '/roadmap',
    icon: 'route',
    title: 'Lộ trình ôn tập',
    description: 'Xem lại hướng ôn của bạn',
  },
  {
    to: '/exam-result',
    icon: 'assignment',
    title: 'Kết quả làm bài',
    description: 'Xem lại những lần luyện trước',
  },
  {
    to: '/mentor',
    icon: 'forum',
    title: 'Trao đổi với mentor',
    description: 'Khi bạn cần thêm hướng dẫn',
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

export default function AICounselor() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const [focusId, setFocusId] = useState('vocabulary');

  const focus =
    PRACTICE_OPTIONS.find((item) => item.id === focusId) ||
    PRACTICE_OPTIONS[0];

  const focusStyle =
    'focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[#AD3155]/40 focus-visible:ring-offset-2';

  return (
    <LearnerShell pathname={pathname} breadcrumb="Cố vấn ôn tập">
      <div
        data-page="AICounselor"
        className="min-h-full bg-[#FCF8FA] text-[#49353F]"
      >
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-7">
          {/* Tiêu đề */}
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[12px] font-medium text-[#AD3155]">
                HARU · ÔN TẬP TIẾNG NHẬT
              </p>

              <h1 className="text-[25px] font-semibold tracking-tight sm:text-[28px]">
                {tr('Hôm nay mình ôn gì?')}
              </h1>

              <p className="mt-1.5 text-[14px] leading-6 text-[#8C7782]">
                {tr('Chọn một kỹ năng, bắt đầu từ một phần nhỏ.')}
              </p>
            </div>

            <span
              lang="ja"
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#EEDDE5] bg-[#FBEAF1] font-serif text-[27px] text-[#AD3155]"
            >
              春
            </span>
          </header>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Nội dung chính */}
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
              <div className="border-b border-[#F0E7EC] px-4 py-4 sm:px-5">
                <h2 className="text-[14px] font-semibold">
                  {tr('Bạn muốn tập trung vào đâu?')}
                </h2>

                <div
                  role="group"
                  aria-label={tr('Chọn kỹ năng ôn tập')}
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {PRACTICE_OPTIONS.map((item) => {
                    const active = focusId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFocusId(item.id)}
                        className={[
                          'flex min-h-11 items-center justify-center gap-2',
                          'rounded-lg border px-3 py-2 text-[13px]',
                          'transition-colors',
                          focusStyle,
                          active
                            ? 'border-[#E8BFCE] bg-[#FCEEF4] font-medium text-[#A33357]'
                            : 'border-[#EDE5E9] bg-white text-[#85717C] hover:bg-[#FCF8FA]',
                        ].join(' ')}
                      >
                        <Icon
                          name={item.icon}
                          className="text-[18px]"
                        />
                        {tr(item.label)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="rounded-xl bg-[#FCF3F7] p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-[12px] text-[#A46B81]">
                    <span lang="ja">{focus.japanese}</span>
                    <span aria-hidden="true">/</span>
                    <span>{tr('Gợi ý ôn tập')}</span>
                  </div>

                  <h3 className="mt-2 text-[20px] font-semibold leading-snug tracking-tight">
                    {tr(focus.title)}
                  </h3>

                  <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#88727E]">
                    {tr(focus.description)}
                  </p>
                </div>

                <ol className="my-5 space-y-3">
                  {focus.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 text-[13px] leading-6"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5EFF2] text-[11px] font-medium text-[#9C7C8C]">
                        {index + 1}
                      </span>
                      <span>{tr(step)}</span>
                    </li>
                  ))}
                </ol>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#F0E7EC] pt-4">
                  <Link
                    to={focus.to}
                    className={[
                      'inline-flex min-h-10 items-center justify-center gap-2',
                      'rounded-lg bg-[#AD3155] px-4 py-2',
                      'text-[13px] font-medium text-white',
                      'transition-colors hover:bg-[#982B4B]',
                      focusStyle,
                    ].join(' ')}
                  >
                    {tr(focus.action)}
                    <Icon
                      name="arrow_forward"
                      className="text-[17px]"
                    />
                  </Link>

                  <Link
                    to={focus.secondaryTo}
                    className={[
                      'rounded text-[13px] text-[#8F6D7D]',
                      'underline-offset-4 hover:text-[#AD3155] hover:underline',
                      focusStyle,
                    ].join(' ')}
                  >
                    {tr(focus.secondaryLabel)}
                  </Link>
                </div>
              </div>
            </section>

            {/* Truy cập nhanh */}
            <aside className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
                <h2 className="px-4 pb-2 pt-4 text-[14px] font-semibold">
                  {tr('Tiếp tục từ đây')}
                </h2>

                <div className="px-2 pb-2">
                  {QUICK_LINKS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={[
                        'group flex items-center gap-3 rounded-lg px-2 py-3',
                        'transition-colors hover:bg-[#FCF4F8]',
                        focusStyle,
                      ].join(' ')}
                    >
                      <Icon
                        name={item.icon}
                        className="shrink-0 text-[21px] text-[#B08A9C]"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">
                          {tr(item.title)}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[#9A8691]">
                          {tr(item.description)}
                        </span>
                      </span>

                      <Icon
                        name="chevron_right"
                        className="shrink-0 text-[18px] text-[#C2AEB8] group-hover:text-[#AD3155]"
                      />
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#EEDFE6] bg-[#FFF4F8] p-4">
                <div className="flex items-center gap-2">
                  <Icon
                    name="bookmark"
                    className="text-[18px] text-[#AF6B86]"
                  />
                  <h2 className="text-[13px] font-medium">
                    {tr('Chưa biết bắt đầu ở đâu?')}
                  </h2>
                </div>

                <p className="mt-2 text-[13px] leading-6 text-[#927887]">
                  {tr('Xem lại mục tiêu JLPT để chọn phần ôn phù hợp với bạn.')}
                </p>

                <Link
                  to="/onboarding"
                  className={[
                    'mt-3 inline-flex items-center gap-1 rounded',
                    'text-[13px] font-medium text-[#AD3155]',
                    focusStyle,
                  ].join(' ')}
                >
                  {tr('Xem mục tiêu')}
                  <Icon
                    name="arrow_forward"
                    className="text-[16px]"
                  />
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </LearnerShell>
  );
}
