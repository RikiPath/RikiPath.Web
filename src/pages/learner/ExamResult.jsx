import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { LearnerShell } from '../../components/shells';
import { getMockTestHistory } from '../../api/mockTestApi.js';

const ranges = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
  { days: 0, label: 'Tất cả' },
];
const card = 'rounded-xl border border-[#EADFE5] bg-white p-5';
const button = 'inline-flex rounded-lg bg-[#AD3155] px-4 py-2.5 text-sm font-semibold text-white';
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

export default function ExamResult() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [days, setDays] = useState(7);
  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId],
    queryFn: getMockTestHistory, enabled: isAuthenticated, retry: false,
  });
  const cutoff = Date.now() - days * 86_400_000;
  const attempts = (history.data ?? []).filter(attempt => !days || Date.parse(attempt.submittedAt) >= cutoff);
  const average = attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / attempts.length : null;

  return <LearnerShell pathname={pathname} breadcrumb="Kết quả thi thử">
    <main data-page="ExamResult" className="mx-auto max-w-4xl space-y-4 px-4 py-6 text-[#49353F]">
      <header className={card + ' flex flex-wrap items-center justify-between gap-3'}>
        <div>
          <h1 className="text-xl font-bold">Lịch sử thi thử</h1>
          {history.isSuccess && <p className="mt-1 text-sm text-[#765E6B]">
            {attempts.length} lượt thi{average != null && ' · Trung bình ' + percent.format(average) + '%'}
          </p>}
        </div>
        <Link className={button} to="/mock-tests/">Chọn đề thi thử</Link>
      </header>
      {!isAuthenticated && <Link className={button} to="/auth/">Đăng nhập để xem lịch sử</Link>}
      {isAuthenticated && <div className="flex flex-wrap gap-2" role="group" aria-label="Khoảng thời gian">
        {ranges.map(range => <button key={range.days} type="button" aria-pressed={days === range.days}
          onClick={() => setDays(range.days)}
          className={'rounded-lg border px-3 py-2 text-sm ' + (days === range.days ? 'border-[#AD3155] bg-[#FFF0F5] text-[#AD3155]' : 'border-[#EADFE5] bg-white')}>
          {range.label}
        </button>)}
      </div>}
      {isAuthenticated && history.isPending && <p role="status">Đang tải lịch sử thi thử…</p>}
      {history.isError && <p role="alert" className={card}>{history.error.message}</p>}
      {history.isSuccess && (attempts.length ? <ul className="space-y-2">
        {attempts.map(attempt => <li key={attempt.attemptId}>
          <Link to={'/mock-tests/?attemptId=' + attempt.attemptId} className={card + ' flex flex-wrap items-center justify-between gap-3 hover:border-[#AD3155]'}>
            <div>
              <p className="font-semibold">{attempt.title}</p>
              <p className="text-sm text-[#765E6B]">{attempt.jlptLevelName} · {date.format(new Date(attempt.submittedAt))}</p>
            </div>
            <strong className="text-[#AD3155]">{percent.format(attempt.totalScore)}%</strong>
          </Link>
        </li>)}
      </ul> : <p className={card}>Chưa có lượt thi thử trong khoảng thời gian này.</p>)}
    </main>
  </LearnerShell>;
}
