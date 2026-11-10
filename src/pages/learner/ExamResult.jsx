import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getMonthlySkillAnalytics, getStudyStreak } from '../../api/analytics.js';
import { getDetailedMockAttempt, getWrongQuestions } from '../../api/mockTestApi.js';
import { getSession } from '../../auth/session.js';

const RANGES = [
  { id: '30d', label: '1 tháng', months: 1 },
  { id: '3m', label: '3 tháng', months: 3 },
  { id: 'all', label: '12 tháng', months: 12 },
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

export default function ExamResult() {
  const { locale, tr } = useLocale();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const attemptId = Number(params.get('attemptId')) || null;
  const session = getSession();
  const [range, setRange] = useState('30d');
  const detailQuery = useQuery({
    queryKey: ['mock-attempt-detail', attemptId],
    queryFn: () => getDetailedMockAttempt(attemptId),
    enabled: Boolean(session?.accessToken && attemptId),
    retry: false,
  });
  const wrongQuery = useQuery({
    queryKey: ['mock-wrong-questions', detailQuery.data?.mockTestId],
    queryFn: () => getWrongQuestions(detailQuery.data?.mockTestId),
    enabled: Boolean(session?.accessToken && detailQuery.data?.mockTestId),
    retry: false,
  });

  const streakQuery = useQuery({
    queryKey: ['learner', 'study-streak', 'exam-result'],
    queryFn: getStudyStreak,
    enabled: Boolean(session?.accessToken),
    retry: false,
  });
  const months = RANGES.find((item) => item.id === range)?.months || 12;
  const monthlyQuery = useQuery({
    queryKey: ['skill-monthly', months],
    queryFn: () => getMonthlySkillAnalytics(months),
    enabled: Boolean(session?.accessToken),
    retry: false,
  });

  const streakDays = streakQuery.data?.currentStreakDays;
  const rangeLabel = RANGES.find((item) => item.id === range)?.label;

  const monthly = monthlyQuery.data;
  const stats = [
    { icon: 'quiz', label: typeof monthly?.totalAttempts === 'number' ? `${monthly.totalAttempts} ${tr('lượt')}` : tr('Đang tải lượt làm') },
    { icon: 'percent', label: typeof monthly?.currentOverallScorePercent === 'number' ? `${Math.round(monthly.currentOverallScorePercent)}%` : tr('Chưa có điểm TB') },
    {
      icon: 'local_fire_department',
      label:
        typeof streakDays === 'number'
          ? (locale === 'ja' ? `${streakDays}日連続` : `Streak ${streakDays} ngày`)
          : streakQuery.isPending
            ? tr('Streak …')
            : tr('Streak —'),
    },
  ];

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr("Kết quả")}>
      <main
        data-page="ExamResult"
        className="mx-auto max-w-[1100px] px-5 py-6
                   font-['Be_Vietnam_Pro',sans-serif]
                   text-[#49353F] lg:px-7"
      >
        <section
          className="rounded-2xl border border-[#EADFE5]
                     bg-[#FFFCFD] px-5 py-5 sm:px-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#AD3155]" />{tr("KẾT QUẢ CỦA TÔI")}</p>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#8C7782]">{tr('Theo dõi bài thi thử, xem điểm trung bình và chọn phần cần ôn lại.')}</p>
            </div>

            <div
              role="group"
              aria-label={tr("Khoảng thời gian")}
              className="flex rounded-full border border-[#EADFE5] bg-[#FCF6F8] p-1"
            >
              {RANGES.map((item) => {
                const active = range === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRange(item.id)}
                    className={[
                      'h-8 rounded-full px-3 text-[12px] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-[#AD3155]/30',
                      active
                        ? 'bg-[#AD3155] font-medium text-white'
                        : 'text-[#8F7682] hover:bg-white',
                    ].join(' ')}
                  >
                    {tr(item.label)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {stats.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full
                             border border-[#EFE3E8] bg-white px-3 py-1.5
                             text-[12px] text-[#7D6874]"
                >
                  <Icon name={item.icon} className="text-[15px] text-[#B07A90]" />
                  {tr(item.label)}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[#B09AA4]">
              {locale === 'ja' ? `集計期間: ${tr(rangeLabel)}` : `Số liệu theo ${rangeLabel?.toLowerCase()}.`}
            </p>
          </div>
        </section>

        {attemptId && (
          <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <h2 className="text-[16px] font-semibold">{tr('Bài vừa nộp')}</h2>
            {detailQuery.isPending && <p className="mt-3 text-[13px] text-[#AA8F9B]">{tr('Đang mở kết quả…')}</p>}
            {detailQuery.isError && <p role="alert" className="mt-3 text-[13px] text-[#A33357]">{detailQuery.error.message}</p>}
            {detailQuery.data && (
              <>
                <p className="mt-2 text-[22px] font-semibold text-[#AD3155]">{Math.round(detailQuery.data.totalScore)} {tr('điểm')}</p>
                <ul className="mt-4 space-y-3">
                  {(detailQuery.data.questions || []).map((question) => (
                    <li key={question.questionId} className="rounded-2xl bg-[#FCFAFB] px-4 py-3">
                      <p className="text-[14px] leading-6" style={{ fontFamily: '"Yu Gothic", "Segoe UI", sans-serif' }}>{question.questionText}</p>
                      <p className={`mt-1 text-[12px] ${question.isCorrect ? 'text-[#1E5C36]' : 'text-[#A33357]'}`}>
                        {question.isCorrect ? tr('Đúng') : tr('Sai')}
                      </p>
                      {question.explanation && <p className="mt-1 text-[12px] leading-5 text-[#8C7782]">{question.explanation}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {wrongQuery.data?.length > 0 && (
              <p className="mt-4 text-[12px] text-[#8A5A10]">
                {wrongQuery.data.length} {tr('câu trong đề này từng làm sai và đang nằm trong danh sách ôn lại.')}
              </p>
            )}
          </section>
        )}

        {monthly?.skills?.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
            <h2 className="text-[16px] font-semibold">{monthly.summary || tr('Năng lực theo kỹ năng')}</h2>
            <ul className="mt-4 space-y-3">
              {monthly.skills.map((skill) => {
                const score = typeof skill.currentScorePercent === 'number' ? Math.max(0, Math.min(100, skill.currentScorePercent)) : 0;
                return (
                  <li key={skill.languageSkillName}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span>{skill.languageSkillName}</span>
                      <span className="text-[#8C7782]">{typeof skill.currentScorePercent === 'number' ? `${Math.round(skill.currentScorePercent)}%` : '—'}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F6EEF2]">
                      <div className="h-full rounded-full bg-[#AD3155]" style={{ width: `${score}%` }} />
                    </div>
                    {skill.currentAssessment && <p className="mt-1 text-[12px] text-[#8C7782]">{skill.currentAssessment}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
        <section
          className="mt-4 flex min-h-[340px] flex-col items-center
                     justify-center rounded-2xl border border-[#EADFE5]
                     bg-[#FFF8FA] px-6 py-14 text-center"
        >
          <span
            className="flex h-14 w-14 items-center justify-center
                       rounded-2xl border border-[#EEDCE5] bg-white
                       text-[#C48BA0]"
          >
            <Icon name="monitoring" className="text-[28px]" />
          </span>

          <h1 className="mt-5 text-[18px] font-semibold">{tr('Chưa có dữ liệu phân tích')}</h1>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#967F8A]">
            {locale === 'ja'
              ? `模擬試験を終えると、${tr(rangeLabel)}の進み具合が見られます。`
              : `Hoàn thành một bài thi thử để xem tiến độ trong ${rangeLabel?.toLowerCase()}.`}
            {' '}{tr('Điểm hiện khi bạn đã nộp một đề thi thử.')}
          </p>

          <Link
            to="/placement/"
            className="mt-5 inline-flex h-10 items-center gap-1.5
                       rounded-full bg-[#AD3155] px-5 text-[13px]
                       font-medium text-white hover:bg-[#982B4B]"
          >{tr('Làm bài đánh giá')}<Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </section>
        )}
      </main>
    </LearnerShell>
  );
}
