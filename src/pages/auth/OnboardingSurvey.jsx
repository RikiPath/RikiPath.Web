import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { getSession, patchSession } from '../../auth/session.js';
import { useSetJlptGoalMutation } from '../../hooks/useAuth.js';
import { prefetchLearnerHome } from '../../hooks/useLearnerHome.js';

const LEVELS = [
  {
    id: 1,
    name: 'N5',
    title: 'Ôn luyện nền tảng',
    desc: 'Từ vựng, chữ Hán và mẫu câu cơ bản.',
  },
  {
    id: 2,
    name: 'N4',
    title: 'Củng cố sơ cấp',
    desc: 'Ôn kiến thức và các tình huống quen thuộc.',
  },
  {
    id: 3,
    name: 'N3',
    title: 'Ôn luyện trung cấp',
    desc: 'Mở rộng từ vựng, luyện đọc và nghe hiểu.',
  },
  {
    id: 4,
    name: 'N2',
    title: 'Nâng cao năng lực',
    desc: 'Luyện hiểu văn bản dài và chủ đề đa dạng.',
  },
];

const MINUTES = [15, 30, 45, 60, 90];

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

export default function OnboardingSurvey() {
  const navigate = useNavigate();
  const session = getSession();
  const goalMutation = useSetJlptGoalMutation();

  const [levelId, setLevelId] = useState(3);
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const selectedLevel = LEVELS.find((level) => level.id === levelId);
  const busy = goalMutation.isPending || redirecting;

  function skipForNow() {
    if (busy) return;

    patchSession({ skipOnboarding: true });
    navigate('/app', { replace: true });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setError('');

    goalMutation.mutate(
      {
        targetJlptLevelId: levelId,
        dailyStudyMinutes: minutes,
      },
      {
        onSuccess: () => {
          setRedirecting(true);

          prefetchLearnerHome()
            .catch(() => {})
            .finally(() => {
              navigate('/app', { replace: true });
            });
        },
        onError: (err) => {
          setError(
            err?.message || 'Không lưu được mục tiêu. Vui lòng thử lại.',
          );
        },
      },
    );
  }

  if (!session?.accessToken) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div
      data-page="OnboardingSurvey"
      className="flex min-h-screen items-center justify-center
                 bg-[#F8F5F4] px-4 py-6
                 font-['Be_Vietnam_Pro',sans-serif]
                 text-[#352C31] sm:px-6 lg:py-8"
    >
      <main
        className="grid w-full max-w-[1100px] overflow-hidden
                   rounded-[24px] border border-[#EEE4E7]
                   bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)]
                   lg:grid-cols-[0.8fr_1.4fr]"
      >
        {/* Giới thiệu */}
        <aside
          className="relative flex flex-col overflow-hidden
                     bg-[#92344F] px-7 py-7 text-white
                     sm:px-9 lg:p-9"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24
                       -top-24 h-72 w-72 rounded-full
                       border border-white/[0.07]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32
                       -left-24 h-80 w-80 rounded-full
                       border border-white/[0.07]"
          />

          <Link
            to="/"
            className="relative inline-flex w-fit items-center
                       gap-2.5 rounded-lg
                       focus-visible:outline-none
                       focus-visible:ring-2
                       focus-visible:ring-white/70"
          >
            <span
              className="flex h-10 w-10 items-center justify-center
                         rounded-xl bg-white/10"
            >
              <Icon name="spa" className="text-[25px]" />
            </span>

            <span className="text-[21px] font-semibold tracking-tight">
              RikiPath
            </span>
          </Link>

          <div className="relative mt-7 lg:mt-10">
            <p className="text-[12px] font-medium text-[#EBC7D2]">
              Thiết lập mục tiêu ôn luyện
            </p>

            <h1
              className="mt-3 max-w-[330px] text-[30px]
                         font-semibold leading-[1.25]
                         tracking-tight lg:text-[34px]"
            >
              Bắt đầu từ
              <br />
              mục tiêu của bạn.
            </h1>

            <p
              className="mt-4 max-w-[320px] text-[13px]
                         leading-6 text-[#EDD4DC]"
            >
              Chọn cấp độ từ N5 đến N2 và thời gian phù hợp
              để bắt đầu ôn luyện cùng RikiPath.
            </p>
          </div>

          <ol className="relative mt-7 hidden space-y-4 lg:block">
            {[
              ['01', 'Chọn cấp độ', 'Xác định mục tiêu JLPT của bạn.'],
              ['02', 'Chọn thời gian', 'Dành thời gian ôn luyện mỗi ngày.'],
              ['03', 'Bắt đầu ôn luyện', 'Luyện tập và xem lại kết quả.'],
            ].map(([number, title, description]) => (
              <li key={number} className="flex items-start gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center
                             justify-center rounded-full
                             border border-white/20
                             text-[11px] text-[#EBC7D2]"
                >
                  {number}
                </span>

                <div className="pt-0.5">
                  <p className="text-[13px] font-medium">{title}</p>
                  <p className="mt-1 text-[12px] text-[#DFC0CB]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div
            className="relative mt-auto hidden items-start gap-2
                       border-t border-white/15 pt-4
                       text-[12px] leading-5 text-[#E7CBD5]
                       lg:flex"
          >
            <Icon
              name="lightbulb"
              className="mt-0.5 shrink-0 text-[18px]"
            />
            <p>
              Chọn thời lượng bạn có thể duy trì đều đặn
              mỗi ngày.
            </p>
          </div>
        </aside>

        {/* Chọn mục tiêu */}
        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <header>
            <p className="text-[12px] font-medium text-[#AD526F]">
              Mục tiêu của bạn
            </p>

            <h2
              className="mt-2 text-[25px] font-semibold
                         leading-tight tracking-tight sm:text-[28px]"
            >
              Bạn muốn ôn luyện cấp độ nào?
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-[#8A7A82]">
              Chọn cấp độ JLPT bạn đang hướng đến.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="mt-5">
            <fieldset disabled={busy}>
              <legend className="sr-only">
                Cấp độ JLPT mục tiêu
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {LEVELS.map((level) => {
                  const selected = levelId === level.id;

                  return (
                    <label key={level.id} className="relative block">
                      <input
                        type="radio"
                        name="jlpt-goal"
                        value={level.id}
                        checked={selected}
                        onChange={() => {
                          setLevelId(level.id);
                          setError('');
                        }}
                        aria-describedby={`level-${level.id}-description`}
                        className="peer sr-only"
                      />

                      <div
                        className={[
                          'flex h-full cursor-pointer items-start',
                          'gap-3 rounded-xl border p-4',
                          'transition-colors duration-150',
                          'peer-focus-visible:ring-2',
                          'peer-focus-visible:ring-[#D94B68]/40',
                          'peer-focus-visible:ring-offset-2',
                          'peer-disabled:cursor-wait',
                          selected
                            ? 'border-[#CD708C] bg-[#FFF5F8]'
                            : 'border-[#EAE2E6] bg-white hover:border-[#D8A7B7] hover:bg-[#FFFCFD]',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            'flex h-10 w-10 shrink-0 items-center',
                            'justify-center rounded-[10px]',
                            'text-[14px] font-semibold',
                            selected
                              ? 'bg-[#D94B68] text-white'
                              : 'bg-[#F5EFF2] text-[#947983]',
                          ].join(' ')}
                        >
                          {level.name}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div
                            className="flex items-center
                                       justify-between gap-2"
                          >
                            <span className="text-[14px] font-semibold">
                              JLPT {level.name}
                            </span>

                            <span
                              aria-hidden="true"
                              className={[
                                'flex h-[18px] w-[18px] shrink-0',
                                'items-center justify-center rounded-full',
                                selected
                                  ? 'bg-[#D94B68] text-white'
                                  : 'border border-[#DCD1D6]',
                              ].join(' ')}
                            >
                              {selected && (
                                <Icon
                                  name="check"
                                  className="text-[13px]"
                                />
                              )}
                            </span>
                          </div>

                          <p
                            className="mt-1 text-[12px]
                                       font-medium text-[#8C6E7A]"
                          >
                            {level.title}
                          </p>

                          <p
                            id={`level-${level.id}-description`}
                            className="mt-1 text-[12px] leading-5
                                       text-[#94858C]"
                          >
                            {level.desc}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Thời gian mỗi ngày */}
            <fieldset
              disabled={busy}
              className="mt-5 border-t border-[#F0E8EC] pt-5"
            >
              <legend className="sr-only">
                Thời gian ôn luyện mỗi ngày
              </legend>

              <h3 className="text-[14px] font-medium">
                Bạn dành bao nhiêu phút ôn luyện mỗi ngày?
              </h3>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {MINUTES.map((value) => {
                  const selected = minutes === value;

                  return (
                    <label key={value} className="relative">
                      <input
                        type="radio"
                        name="daily-minutes"
                        value={value}
                        checked={selected}
                        onChange={() => {
                          setMinutes(value);
                          setError('');
                        }}
                        aria-label={`${value} phút mỗi ngày`}
                        className="peer sr-only"
                      />

                      <span
                        className={[
                          'flex cursor-pointer items-center',
                          'justify-center rounded-lg border',
                          'py-2.5 text-[12px] transition-colors',
                          'peer-focus-visible:ring-2',
                          'peer-focus-visible:ring-[#D94B68]/40',
                          'peer-focus-visible:ring-offset-2',
                          'peer-disabled:cursor-wait',
                          selected
                            ? 'border-[#CD708C] bg-[#FBEAF0] font-semibold text-[#AD3155]'
                            : 'border-[#EAE2E6] text-[#8A7A82] hover:bg-[#FCF7F9]',
                        ].join(' ')}
                      >
                        {value}
                        <span className="ml-1 hidden sm:inline">
                          phút
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] text-[#A08E97]">
                Chọn thời gian phù hợp với lịch sinh hoạt của bạn.
              </p>
            </fieldset>

            {/* Tóm tắt */}
            <div
              className="mt-5 flex items-center gap-2.5
                         rounded-lg bg-[#FAF5F7] px-3 py-2.5"
            >
              <Icon
                name="flag"
                className="shrink-0 text-[19px] text-[#B26E86]"
              />

              <p className="text-[12px] text-[#8C6E7A]">
                Mục tiêu đã chọn:
                <strong className="ml-1 font-medium text-[#9E3658]">
                  JLPT {selectedLevel.name} · {minutes} phút/ngày
                </strong>
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-[#FFF0F2]
                           px-3 py-2.5 text-[12px]
                           leading-5 text-[#A13950]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-4 flex h-11 w-full items-center
                         justify-center gap-2 rounded-[10px]
                         bg-[#D94B68] px-4 text-[14px]
                         font-semibold text-white
                         transition-colors hover:bg-[#C43E5C]
                         focus-visible:outline-none
                         focus-visible:ring-2
                         focus-visible:ring-[#D94B68]/40
                         focus-visible:ring-offset-2
                         disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-[18px]"
                  />
                  {redirecting
                    ? 'Đang chuyển trang…'
                    : 'Đang lưu mục tiêu…'}
                </>
              ) : (
                <>
                  Lưu mục tiêu và tiếp tục
                  <Icon
                    name="arrow_forward"
                    className="text-[18px]"
                  />
                </>
              )}
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={skipForNow}
                disabled={busy}
                className="rounded px-2 py-1 text-[12px]
                           text-[#94858C] hover:text-[#AD3155]
                           focus-visible:outline-none
                           focus-visible:ring-2
                           focus-visible:ring-[#D94B68]/30
                           disabled:opacity-40"
              >
                Để sau, vào trang chủ
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
