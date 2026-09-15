import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getSession, patchSession } from '../../auth/session.js';
import { useSetJlptGoalMutation } from '../../hooks/useAuth.js';
import { prefetchLearnerHome } from '../../hooks/useLearnerHome.js';

const LEVELS = [
  {
    id: 1,
    name: 'N5',
    title: 'Mới bắt đầu / JLPT N5',
    badge: 'Nhập môn',
    desc: 'Chưa biết hoặc mới học Hiragana & Katakana. Mục tiêu thi N5.',
  },
  {
    id: 2,
    name: 'N4',
    title: 'JLPT N4',
    badge: 'Sơ cấp 2',
    desc: 'Đã thuộc hai bảng chữ, giao tiếp vỡ lòng. Mục tiêu thi N4.',
  },
  {
    id: 3,
    name: 'N3',
    title: 'JLPT N3',
    badge: 'Trung cấp',
    desc: 'Giao tiếp độc lập, đọc tin tức đơn giản. Mục tiêu thi N3.',
    popular: true,
  },
  {
    id: 4,
    name: 'N2',
    title: 'JLPT N2',
    badge: 'Cao cấp',
    desc: 'Hiểu văn bản chuyên sâu, tài liệu công việc. Mục tiêu thi N2.',
  },
  {
    id: 5,
    name: 'N1',
    title: 'JLPT N1',
    badge: 'Thượng cấp',
    desc: 'Gần mức người bản ngữ, văn học và tài liệu phức tạp. Mục tiêu thi N1.',
  },
];

const MINUTES = [15, 30, 45, 60, 90];

export default function OnboardingSurvey() {
  const navigate = useNavigate();
  const session = getSession();
  const goalMutation = useSetJlptGoalMutation();
  const [levelId, setLevelId] = useState(3);
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState('');

  function skipForNow() {
    patchSession({ skipOnboarding: true });
    navigate('/app', { replace: true });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    goalMutation.mutate(
      { targetJlptLevelId: levelId, dailyStudyMinutes: minutes },
      {
        onSuccess: () => {
          prefetchLearnerHome()
            .catch(() => {})
            .finally(() => navigate('/app', { replace: true }));
        },
        onError: (err) => {
          setError(err.message || 'Không lưu được mục tiêu JLPT.');
        },
      },
    );
  }

  if (!session?.accessToken) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F5] text-[#1f1a1c]" data-page="OnboardingSurvey">
      <header className="sticky top-0 z-50 border-b border-[#eadfd9] bg-[#FAF7F5]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-[#D94B68]">spa</span>
            <span className="text-lg font-bold tracking-tight">
              Riki<span className="text-[#D94B68]">Path</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={skipForNow}
            className="text-sm font-semibold text-[#6F6669] hover:text-[#D94B68]"
          >
            Để sau
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D94B68]">Khảo sát trình độ</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
          Mục tiêu JLPT của bạn là gì?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#6F6669] sm:text-base">
          Đăng ký chưa hỏi cấp độ thi. Chọn mục tiêu tại đây để trang chủ hiện đúng kỳ thi và nhịp học mỗi ngày.
        </p>

        <form className="mt-8 flex flex-col gap-8" onSubmit={handleSubmit}>
          <div>
            <p className="mb-3 text-base font-bold">Cấp độ mục tiêu</p>
            <div className="flex flex-col gap-3">
              {LEVELS.map((level) => {
                const selected = levelId === level.id;
                return (
                  <label
                    key={level.id}
                    className={[
                      'flex cursor-pointer items-start gap-4 rounded-2xl border p-4 sm:p-5 transition-all',
                      selected
                        ? 'border-[#D94B68]/40 bg-[#FEE8EE] shadow-sm'
                        : 'border-[#eadfd9] bg-white hover:border-[#D94B68]/30 hover:shadow-sm',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="jlpt-goal"
                      className="sr-only"
                      checked={selected}
                      onChange={() => setLevelId(level.id)}
                    />
                    <div
                      className={[
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                        selected ? 'bg-[#D94B68] text-white' : 'bg-[#f4ece9] text-[#6F6669]',
                      ].join(' ')}
                    >
                      {level.name}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{level.title}</span>
                        <span className="rounded-full bg-[#f4ece9] px-2 py-0.5 text-[11px] font-semibold text-[#6F6669]">
                          {level.badge}
                        </span>
                        {level.popular ? (
                          <span className="rounded-full bg-[#D94B68]/10 px-2 py-0.5 text-[11px] font-semibold text-[#D94B68]">
                            Phổ biến
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[#6F6669]">{level.desc}</p>
                    </div>
                    <div
                      className={[
                        'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        selected ? 'bg-[#D94B68] text-white' : 'border border-[#eadfd9] bg-white text-transparent',
                      ].join(' ')}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-base font-bold">Bạn muốn học bao nhiêu phút mỗi ngày?</p>
            <div className="flex flex-wrap gap-2">
              {MINUTES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMinutes(value)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                    minutes === value
                      ? 'bg-[#D94B68] text-white'
                      : 'bg-white text-[#6F6669] ring-1 ring-[#eadfd9] hover:bg-[#FEE8EE]',
                  ].join(' ')}
                >
                  {value} phút
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-[#B3261E]">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#eadfd9] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={skipForNow}
              className="text-center text-sm font-semibold text-[#6F6669] hover:text-[#D94B68]"
            >
              Bỏ qua, vào trang chủ
            </button>
            <button
              type="submit"
              disabled={goalMutation.isPending}
              className="rounded-xl bg-[#D94B68] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#9E2A4B] disabled:opacity-60 sm:px-8"
            >
              {goalMutation.isPending ? 'Đang lưu…' : 'Lưu mục tiêu và vào trang chủ'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
