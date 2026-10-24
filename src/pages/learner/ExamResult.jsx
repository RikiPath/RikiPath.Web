import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { getStudyStreak } from '../../api/analytics.js';
import { getSession } from '../../auth/session.js';

const RANGES = [
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: '3m', label: '3 tháng' },
  { id: 'all', label: 'Tất cả' },
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
  const { pathname } = useLocation();
  const session = getSession();
  const [range, setRange] = useState('7d');

  const streakQuery = useQuery({
    queryKey: ['learner', 'study-streak', 'exam-result'],
    queryFn: getStudyStreak,
    enabled: Boolean(session?.accessToken),
    retry: false,
  });

  const streakDays = streakQuery.data?.currentStreakDays;
  const rangeLabel = RANGES.find((item) => item.id === range)?.label;

  const stats = [
    { icon: 'quiz', label: '0 bài đã làm' },
    { icon: 'percent', label: 'Chưa có điểm TB' },
    {
      icon: 'local_fire_department',
      label:
        typeof streakDays === 'number'
          ? `Streak ${streakDays} ngày`
          : streakQuery.isPending
            ? 'Streak …'
            : 'Streak —',
    },
  ];

  return (
    <LearnerShell pathname={pathname} breadcrumb="Kết quả">
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
                <span className="h-1.5 w-1.5 rounded-full bg-[#AD3155]" />
                KẾT QUẢ CỦA TÔI
              </p>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#8C7782]">
                Theo dõi bài thi thử, xem điểm trung bình và chọn phần cần ôn lại.
              </p>
            </div>

            <div
              role="group"
              aria-label="Khoảng thời gian"
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
                    {item.label}
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
                  {item.label}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[#B09AA4]">
              Số liệu theo {rangeLabel?.toLowerCase()}.
            </p>
          </div>
        </section>

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

          <h1 className="mt-5 text-[18px] font-semibold">
            Chưa có dữ liệu phân tích
          </h1>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#967F8A]">
            Hoàn thành một bài thi thử để xem tiến độ trong {rangeLabel?.toLowerCase()}.
            Kết quả bài minh họa chưa được lưu vào lịch sử.
          </p>

          <Link
            to="/exam-n3"
            className="mt-5 inline-flex h-10 items-center gap-1.5
                       rounded-full bg-[#AD3155] px-5 text-[13px]
                       font-medium text-white hover:bg-[#982B4B]"
          >
            Bắt đầu bài đầu tiên
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </section>
      </main>
    </LearnerShell>
  );
}
