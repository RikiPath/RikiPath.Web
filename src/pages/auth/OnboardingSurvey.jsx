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
    <div className="min-h-screen bg-surface text-on-surface antialiased" data-page="OnboardingSurvey">
      <header className="fixed top-0 z-50 h-16 w-full border-b border-outline-variant/30 bg-surface/85 px-6 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[26px] text-primary">spa</span>
            <span className="font-headline-sm font-bold tracking-tight">
              Riki<span className="text-primary">Path</span>
            </span>
          </Link>
          <button type="button" onClick={skipForNow} className="font-label-md text-on-surface-variant hover:text-primary">
            Để sau
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-24">
        <p className="mb-2 font-label-sm font-bold uppercase tracking-widest text-primary">Khảo sát trình độ</p>
        <h1 className="font-headline-lg text-3xl font-bold tracking-tight">Mục tiêu JLPT của bạn là gì?</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Đăng ký chưa hỏi cấp độ thi. Chọn mục tiêu tại đây để trang chủ hiện đúng kỳ thi và nhịp học mỗi ngày.
        </p>

        <form className="mt-8 flex flex-col gap-8" onSubmit={handleSubmit}>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-title-md font-bold">Cấp độ mục tiêu</legend>
            {LEVELS.map((level) => {
              const selected = levelId === level.id;
              return (
                <label
                  key={level.id}
                  className={[
                    'flex cursor-pointer items-start gap-4 rounded-xl p-5 transition-all',
                    selected ? 'bg-surface-container-low shadow-md' : 'bg-surface-container-lowest shadow-sm hover:shadow-md',
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
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold',
                      selected ? 'bg-secondary-container text-primary' : 'bg-surface-container-low text-on-surface-variant',
                    ].join(' ')}
                  >
                    {level.name}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-title-md font-bold">{level.title}</span>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">
                        {level.badge}
                      </span>
                      {level.popular ? (
                        <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-xs font-semibold">Phổ biến</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">{level.desc}</p>
                  </div>
                  <div
                    className={[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-transparent',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-title-md font-bold">Bạn muốn học bao nhiêu phút mỗi ngày?</legend>
            <div className="flex flex-wrap gap-2">
              {MINUTES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMinutes(value)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                    minutes === value
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                  ].join(' ')}
                >
                  {value} phút
                </button>
              ))}
            </div>
          </fieldset>

          {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={skipForNow} className="text-center text-sm text-on-surface-variant hover:text-primary">
              Bỏ qua, vào trang chủ
            </button>
            <button
              type="submit"
              disabled={goalMutation.isPending}
              className="rounded-xl bg-primary px-8 py-3 font-bold text-on-primary shadow-md disabled:opacity-60"
            >
              {goalMutation.isPending ? 'Đang lưu…' : 'Lưu mục tiêu và vào trang chủ'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
