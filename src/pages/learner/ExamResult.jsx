import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileCheck2 } from 'lucide-react';
import { Card, EmptyState, ErrorState, FeatureIcon, PageHeader, ProgressBar, SakuraLoader, Tabs } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import { getMockTestHistory } from '@/features/mock-test/api/mockTestApi.js';
import MockTestProgress from '@/features/mock-test/components/MockTestProgress.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const ranges = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
  { days: 0, label: 'Tất cả' },
];
const percent = { format: (v) => new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 2 }).format(v) };
const date = { format: (v) => new Intl.DateTimeFormat(currentIntlTag(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(v) };

export default function ExamResult() {
  const { trf, tr } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const [days, setDays] = useState(7);
  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId],
    queryFn: getMockTestHistory, enabled: isAuthenticated, retry: false,
  });
  const cutoff = history.dataUpdatedAt - days * 86_400_000;
  const attempts = (history.data ?? []).filter(attempt => !days || Date.parse(attempt.submittedAt) >= cutoff);
  const average = attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / attempts.length : null;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.totalScore)) : null;

  return <LearnerShell breadcrumb={tr('Lịch sử & kết quả')}>
    <div data-page="ExamResult" className="rp-container py-6 lg:py-8">
      <PageHeader
        eyebrow={tr('Thi thử JLPT')}
        title={tr('Lịch sử & kết quả')}
        description={tr('Kết quả thi thử dùng để theo dõi tiến bộ, không phải chứng nhận JLPT chính thức.')}
        actions={<Link className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong rp-press" to="/mock-tests/"><FileCheck2 aria-hidden="true" className="h-4 w-4" />{' '}{tr('Chọn đề thi thử')}</Link>}
      />

      {isAuthenticated && history.isSuccess && history.data.length > 0 && (
        <div className="mb-5"><MockTestProgress key={user?.userId} attempts={history.data} userId={user?.userId} /></div>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line px-5 py-4">
          <dl className="flex flex-wrap gap-6 text-sm">
            <div><dt className="text-xs text-rp-text-muted">{tr('Số lượt thi')}</dt><dd className="text-xl font-bold tabular-nums text-rp-text">{history.isSuccess ? attempts.length : '—'}</dd></div>
            <div><dt className="text-xs text-rp-text-muted">{tr('Điểm trung bình')}</dt><dd className="text-xl font-bold tabular-nums text-rp-text">{average != null ? `${percent.format(average)}%` : '—'}</dd></div>
            <div><dt className="text-xs text-rp-text-muted">{tr('Cao nhất')}</dt><dd className="text-xl font-bold tabular-nums text-rp-text">{best != null ? `${percent.format(best)}%` : '—'}</dd></div>
          </dl>
          <Tabs variant="pill" label={tr('Khoảng thời gian')} value={days} onChange={setDays} tabs={ranges.map((r) => ({ value: r.days, label: r.label }))} />
        </div>

        {isAuthenticated && history.isPending && (
          <div className="p-5">
            <SakuraLoader variant="section" context="mocktest" label={tr('Đang tải lịch sử thi thử')} delay={160} />
          </div>
        )}
        {history.isError && <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} compact />}
        {history.isSuccess && attempts.length === 0 && (
          <EmptyState compact mascot="studying" title={tr('Chưa có lượt thi thử trong khoảng thời gian này')} description={tr('Làm một đề thi thử để xem điểm theo từng phần và lỗi cần ôn lại.')} action={<Link className="rp-focus text-sm font-semibold text-rp-brand-strong underline" to="/mock-tests/">{tr('Làm đề thi thử')}</Link>} />
        )}
        {history.isSuccess && attempts.length > 0 && (
          <ul className="divide-y divide-rp-line">
            {attempts.map(attempt => <li key={attempt.attemptId}>
              <Link to={'/mock-tests/?attemptId=' + attempt.attemptId} className="rp-focus group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-rp-bg-2">
                <FeatureIcon feature="mock" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-rp-text">{tr(attempt.title)}</p>
                  <p className="text-sm text-rp-text-muted">{attempt.jlptLevelName} · {date.format(new Date(attempt.submittedAt))}</p>
                </div>
                <div className="w-32">
                  <p className="text-right text-lg font-bold tabular-nums text-rp-text">{percent.format(attempt.totalScore)}%</p>
                  <ProgressBar value={attempt.totalScore} max={100} label={trf('Điểm {0}', { 0: attempt.title })} />
                </div>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-rp-text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>)}
          </ul>
        )}
      </Card>
    </div>
  </LearnerShell>;
}
