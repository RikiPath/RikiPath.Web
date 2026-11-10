import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';

const ROUTES = {
  goal: '/onboarding',
  roadmap: '/roadmap',
  exam: '/exam-n3',
  mentor: '/mentor',
  vocabulary: '/vocabulary',
  grammar: '/lessons',
  notebook: '/vocabulary',
  review: '/daily-srs',
  results: '/exam-result',
  haru: '/ai-counselor',
};

const QUICK_LINKS = [
  {
    key: 'vocabulary',
    title: 'Từ vựng',
    description: 'Ôn theo chủ đề',
    icon: 'translate',
  },
  {
    key: 'grammar',
    title: 'Bài luyện tập',
    description: 'Từ vựng, Kanji và ngữ pháp',
    icon: 'edit_note',
  },
  {
    key: 'notebook',
    title: 'Sổ tay',
    description: 'Nội dung đã lưu',
    icon: 'bookmarks',
  },
  {
    key: 'mentor',
    title: 'Tư vấn 1-1',
    description: 'Trao đổi kế hoạch ôn',
    icon: 'forum',
  },
];

const SKILLS = [
  { key: 'vocabulary', label: 'Từ vựng' },
  { key: 'grammar', label: 'Ngữ pháp' },
  { key: 'reading', label: 'Đọc hiểu' },
  { key: 'listening', label: 'Nghe hiểu' },
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

function ActionLink({
  to,
  children,
  primary = false,
  inverse = false,
  className = '',
}) {
  const { tr } = useLocale();
  const classes = [
    'inline-flex min-h-10 items-center justify-center gap-2',
    'rounded-full px-4 py-2 text-[13px] font-semibold',
    'transition-colors focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-[#D94B68]/30',
    'focus-visible:ring-offset-2',
    inverse
      ? 'bg-white text-[#AD3155] hover:bg-[#FFF4F7]'
      : primary
        ? 'bg-[#AD3155] text-white hover:bg-[#962A49]'
        : 'border border-[#E8DDE3] bg-white text-[#826271] hover:bg-[#FCF5F8]',
    className,
  ].join(' ');

  if (!to) {
    return (
      <button
        type="button"
        disabled
        title={tr('Chưa cấu hình đường dẫn')}
        className={`${classes} cursor-not-allowed opacity-40`}
      >
        {children}
      </button>
    );
  }

  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  );
}

function ProgressBar({ value, label }) {
  const valid = typeof value === 'number' && Number.isFinite(value);
  const percent = valid ? Math.max(0, Math.min(100, value)) : 0;

  return (
    <div
      role={valid ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={valid ? 0 : undefined}
      aria-valuemax={valid ? 100 : undefined}
      aria-valuenow={valid ? percent : undefined}
      className="h-2 overflow-hidden rounded-full bg-[#F6E8EE]"
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#E7A0B6,#AD3155)]
                   transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Stat({ icon, label, value, unit }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(90,40,58,0.04)]">
      <span
        className="flex h-10 w-10 shrink-0 items-center
                   justify-center rounded-2xl
                   bg-[#FDF2F5] text-[#AD3155]"
      >
        <Icon name={icon} className="text-[20px]" />
      </span>

      <div>
        <p className="text-[12px] text-[#8C7782]">{label}</p>
        <p className="mt-0.5 text-[24px] font-semibold tracking-tight text-[#3F3038]">
          {value ?? '—'}
          {value != null && (
            <span className="ml-1.5 text-[12px] font-medium text-[#A08D97]">
              {unit}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function HomeLearner({ data = null }) {
  const { pathname } = useLocation();
  const { locale, tr } = useLocale();

  const targetLevel = ['N5', 'N4', 'N3', 'N2'].includes(
    data?.targetLevel,
  )
    ? data.targetLevel
    : null;

  const dueCards =
    typeof data?.dueCards === 'number' &&
    Number.isFinite(data.dueCards)
      ? Math.max(0, data.dueCards)
      : null;

  const resume = data?.resume;
  const skillScores = data?.skillScores ?? {};

  const hasSkillData = SKILLS.some(
    ({ key }) =>
      typeof skillScores[key] === 'number' &&
      Number.isFinite(skillScores[key]),
  );

  const greeting = data?.displayName
    ? (locale === 'ja' ? `${data.displayName}さん、こんにちは！` : `Chào ${data.displayName}!`)
    : tr('Chào bạn!');

  const examLabel = targetLevel ? `Thi thử ${targetLevel}` : 'Thi thử';

  return (
    <LearnerShell pathname={pathname} breadcrumb="Tổng quan">
      <div
        data-page="HomeLearner"
        className="min-h-screen bg-[#F4EEF1]
                   font-['Nunito',sans-serif]
                   text-[#3F3038]"
      >
        <main
          className="mx-auto w-full max-w-[1180px]
                     px-5 py-7 lg:px-8"
        >
          <header
            className="mb-6 flex flex-wrap items-end
                       justify-between gap-4"
          >
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">
                {tr('Ôn luyện hôm nay')}
              </p>
              <h1
                className="mt-1 text-[32px] font-semibold
                           leading-tight tracking-tight"
              >
                {greeting}
              </h1>
              <p className="mt-1.5 text-[14px] text-[#8C7782]">
                {tr('Bạn muốn ôn luyện gì hôm nay?')}
              </p>
            </div>

            <Link
              to={ROUTES.goal}
              className="inline-flex items-center gap-2
                         rounded-full border border-white
                         bg-white px-3.5 py-2 text-[12px]
                         text-[#8F6879] shadow-[0_8px_20px_rgba(90,40,58,0.05)]
                         hover:text-[#AD3155]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FCE7EF] text-[#AD3155]">
                <Icon name="flag" className="text-[15px]" />
              </span>
              {targetLevel
                ? (locale === 'ja' ? `JLPT目標 ${targetLevel}` : `Mục tiêu JLPT ${targetLevel}`)
                : tr('Chọn mục tiêu JLPT')}
            </Link>
          </header>

          <section
            aria-label={tr('Thống kê ôn luyện')}
            className="mb-5 grid gap-3 sm:grid-cols-2"
          >
            <Stat
              icon="task_alt"
              label={tr('Bài đã luyện')}
              value={data?.completedExercises}
              unit={tr('bài')}
            />
            <Stat
              icon="local_fire_department"
              label={tr('Ôn liên tiếp')}
              value={data?.streakDays}
              unit={tr('ngày')}
            />
          </section>

          <div
            className="grid items-start gap-5
                       xl:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="min-w-0 space-y-5">
              <section className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_rgba(90,40,58,0.06)]">
                <div className="flex items-center justify-between gap-3 px-5 pt-5">
                  <h2 className="text-[15px] font-semibold">
                    {tr('Ôn luyện hôm nay')}
                  </h2>

                  <Link
                    to={ROUTES.roadmap}
                    className="inline-flex items-center gap-1
                               text-[12px] font-medium text-[#A66B82]
                               hover:text-[#AD3155]"
                  >
                    {tr('Lộ trình')}
                    <Icon name="arrow_forward" className="text-[15px]" />
                  </Link>
                </div>

                <div className="m-3 rounded-2xl bg-[linear-gradient(145deg,#C44768_0%,#AD3155_48%,#7C2340_100%)] p-5 text-white sm:p-6">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-white/75">
                    {resume ? tr('TIẾP TỤC ÔN LUYỆN') : tr('BẮT ĐẦU TỪ ĐÂY')}
                  </p>

                  <h3 className="mt-2 max-w-lg text-[26px] font-semibold leading-tight tracking-tight">
                    {resume?.title || tr('Thử sức với một đề thi')}
                  </h3>

                  <p className="mt-2 max-w-md text-[13px] leading-6 text-white/80">
                    {resume
                      ? resume.category || tr('Quay lại nội dung đang luyện.')
                      : tr('Làm đề, xem kết quả và chọn phần cần ôn thêm.')}
                  </p>

                  {resume &&
                    typeof resume.progress === 'number' &&
                    Number.isFinite(resume.progress) && (
                      <div className="mt-4 max-w-[300px]">
                        <div
                          className="mb-2 flex justify-between
                                     text-[11px] text-white/75"
                        >
                          <span>{tr('Tiến độ')}</span>
                          <span>
                            {Math.round(
                              Math.max(0, Math.min(100, resume.progress)),
                            )}
                            %
                          </span>
                        </div>
                        <ProgressBar
                          value={resume.progress}
                          label={tr('Tiến độ bài đang luyện')}
                        />
                      </div>
                    )}

                  <div className="mt-5">
                    <ActionLink
                      to={resume ? resume.to : ROUTES.exam}
                      inverse
                    >
                      {resume ? tr('Tiếp tục luyện') : tr(examLabel)}
                      <Icon name="arrow_forward" className="text-[17px]" />
                    </ActionLink>
                  </div>
                </div>

                <div className="grid gap-0 sm:grid-cols-2">
                  {[
                    {
                      title: 'Ôn từ vựng',
                      text: 'Củng cố từ theo chủ đề.',
                      icon: 'translate',
                      to: ROUTES.vocabulary,
                    },
                    {
                      title: 'Luyện ngữ pháp',
                      text: 'Ôn mẫu câu và cách dùng.',
                      icon: 'edit_note',
                      to: ROUTES.grammar,
                    },
                  ].map((item) => {
                    const className =
                      'mx-3 mb-3 flex items-center gap-3 rounded-2xl border ' +
                      'border-[#F3E7EC] bg-[#FFFBFC] p-3.5 text-left transition-colors ' +
                      (item.to
                        ? 'hover:border-[#E7C3D0] hover:bg-white'
                        : 'opacity-50');

                    const content = (
                      <>
                        <span
                          className="flex h-9 w-9 shrink-0
                                     items-center justify-center
                                     rounded-lg bg-[#F8F2F5]
                                     text-[#AF8295]"
                        >
                          <Icon name={item.icon} className="text-[20px]" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium">
                            {tr(item.title)}
                          </span>
                          <span className="mt-1 block text-[12px] text-[#A08D97]">
                            {tr(item.text)}
                          </span>
                        </span>

                        <Icon
                          name="chevron_right"
                          className="shrink-0 text-[18px] text-[#B8A3AD]"
                        />
                      </>
                    );

                    return item.to ? (
                      <Link key={item.title} to={item.to} className={className}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={item.title}
                        type="button"
                        disabled
                        title={tr('Chưa cấu hình đường dẫn')}
                        className={className}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-[15px] font-semibold">
                  {tr('Truy cập nhanh')}
                </h2>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {QUICK_LINKS.map((item) => {
                    const to = ROUTES[item.key];
                    const className =
                      'block rounded-2xl border border-white ' +
                      'bg-white p-4 text-left shadow-[0_10px_24px_rgba(90,40,58,0.04)] transition-colors ' +
                      (to
                        ? 'hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(90,40,58,0.08)]'
                        : 'opacity-50');

                    const content = (
                      <>
                        <Icon
                          name={item.icon}
                          className="text-[22px] text-[#B2778D]"
                        />
                        <span className="mt-3 block text-[13px] font-medium">
                          {tr(item.title)}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#A08D97]">
                          {tr(item.description)}
                        </span>
                      </>
                    );

                    return to ? (
                      <Link key={item.key} to={to} className={className}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={item.key}
                        type="button"
                        disabled
                        title={tr('Chưa cấu hình đường dẫn')}
                        className={className}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="min-w-0 space-y-4">
              <section
                className="rounded-3xl border border-white
                           bg-white p-5 shadow-[0_16px_40px_rgba(90,40,58,0.05)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold">
                    {tr('Ôn tập đến hạn')}
                  </h2>
                  <Icon
                    name="history"
                    className="text-[20px] text-[#B2778D]"
                  />
                </div>

                <p className="mt-4 text-[40px] font-semibold tracking-tight text-[#AD3155]">
                  {dueCards ?? '—'}
                  <span className="ml-2 text-[13px] font-normal text-[#A08D97]">
                    {tr('thẻ')}
                  </span>
                </p>

                <p className="mt-1 text-[12px] leading-5 text-[#95828C]">
                  {dueCards === null
                    ? tr('Chưa có dữ liệu ôn tập.')
                    : dueCards === 0
                      ? tr('Bạn chưa có thẻ đến hạn.')
                      : tr('Ôn lại nội dung đã lưu trong sổ tay.')}
                </p>

                <div className="mt-4">
                  <ActionLink
                    to={dueCards > 0 ? ROUTES.review : ROUTES.notebook}
                    className="w-full"
                    primary={dueCards > 0}
                  >
                    {dueCards > 0 ? tr('Bắt đầu ôn tập') : tr('Mở sổ tay')}
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </ActionLink>
                </div>
              </section>

              <section
                className="rounded-3xl border border-white
                           bg-white p-5 shadow-[0_16px_40px_rgba(90,40,58,0.05)]"
              >
                <h2 className="text-[15px] font-semibold">
                  {tr('Kết quả theo kỹ năng')}
                </h2>
                <p className="mt-1 text-[11px] text-[#A08D97]">
                  {tr('Dựa trên các bài luyện đã hoàn thành.')}
                </p>

                <div className="mt-5 space-y-4">
                  {SKILLS.map((skill) => {
                    const value = skillScores[skill.key];
                    const valid =
                      typeof value === 'number' &&
                      Number.isFinite(value);

                    const percent = valid
                      ? Math.round(Math.max(0, Math.min(100, value)))
                      : null;

                    return (
                      <div key={skill.key}>
                        <div
                          className="mb-2 flex justify-between
                                     text-[12px] text-[#8C7480]"
                        >
                          <span>{tr(skill.label)}</span>
                          <span>{percent === null ? '—' : `${percent}%`}</span>
                        </div>
                        <ProgressBar value={value} label={tr(skill.label)} />
                      </div>
                    );
                  })}
                </div>

                {!hasSkillData && (
                  <p
                    className="mt-4 border-t border-[#F0E7EC]
                               pt-3 text-[12px] leading-5 text-[#A08D97]"
                  >
                    {tr('Hoàn thành một bài thi thử để có thêm kết quả.')}
                  </p>
                )}

                {hasSkillData && ROUTES.results && (
                  <Link
                    to={ROUTES.results}
                    className="mt-4 inline-flex items-center gap-1
                               text-[12px] text-[#AD7389]"
                  >
                    {tr('Xem kết quả')}
                    <Icon name="arrow_forward" className="text-[15px]" />
                  </Link>
                )}
              </section>

              {data?.haruSuggestion && (
                <section
                  className="rounded-xl border border-[#EEDDE5]
                             bg-[#FCF4F7] p-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      name="chat_bubble_outline"
                      className="text-[18px] text-[#B2778D]"
                    />
                    <h2 className="text-[13px] font-medium">
                      {tr('Gợi ý từ Haru')}
                    </h2>
                  </div>

                  <p className="mt-2 text-[12px] leading-6 text-[#967A87]">
                    {data.haruSuggestion}
                  </p>

                  {ROUTES.haru && (
                    <Link
                      to={ROUTES.haru}
                      className="mt-2 inline-flex items-center gap-1
                                 text-[12px] font-medium text-[#AD3155]"
                    >
                      {tr('Xem thêm')}
                      <Icon name="arrow_forward" className="text-[15px]" />
                    </Link>
                  )}
                </section>
              )}
            </aside>
          </div>
        </main>
      </div>
    </LearnerShell>
  );
}
