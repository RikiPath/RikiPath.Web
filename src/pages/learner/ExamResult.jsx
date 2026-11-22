import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileCheck2 } from 'lucide-react';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FeatureIcon,
  PageContainer,
  PageHeader,
  ProgressBar,
  SakuraLoader,
  Tabs,
} from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import { LearnerShell } from '@/layouts';
import { getMockTestHistory } from '@/features/mock-test/api/mockTestApi.js';
import MockTestProgress from '@/features/mock-test/components/MockTestProgress.jsx';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { useNow } from '@/hooks/useNow.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

const ranges = [
  { days: 0, label: 'Tất cả' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
];

function formatPercent(v) {
  return new Intl.NumberFormat(currentIntlTag(), { maximumFractionDigits: 2 }).format(v);
}

function formatAttemptDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

export default function ExamResult() {
  const { trf, tr } = useLocale();
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [days, setDays] = useState(0);
  const nowMs = useNow(60_000);

  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId],
    queryFn: getMockTestHistory,
    enabled: isAuthenticated,
    retry: false,
  });

  const referenceTime = history.dataUpdatedAt || nowMs;
  const cutoff = referenceTime - days * 86_400_000;
  const attempts = (history.data ?? []).filter((attempt) => {
    if (!days) return true;
    const parsed = parseUtcDate(attempt.submittedAt);
    return parsed ? parsed.getTime() >= cutoff : false;
  });

  const average = attempts.length
    ? attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0) / attempts.length
    : null;
  const best = attempts.length ? Math.max(...attempts.map((a) => a.totalScore)) : null;

  return (
    <LearnerShell breadcrumb={tr('Lịch sử & kết quả')}>
      <PageContainer data-page="ExamResult" width="default">
        <PageHeader
          eyebrow={tr('Thi thử JLPT')}
          title={tr('Lịch sử & kết quả')}
          description={tr('Kết quả thi thử dùng để theo dõi tiến bộ, không phải chứng nhận JLPT chính thức.')}
          actions={
            <Button as={Link} to="/mock-tests/" variant="primary" size="sm" icon={FileCheck2}>
              {tr('Chọn đề thi thử')}
            </Button>
          }
        />

        {!isAuthenticated ? (
          <Banner
            tone="info"
            actions={
              <Link to="/auth" state={{ from: { pathname } }} className="rp-link text-xs font-semibold">
                {tr('Đăng nhập')}
              </Link>
            }
          >
            {tr('Đăng nhập để lưu và theo dõi lịch sử làm đề thi thử của bạn.')}
          </Banner>
        ) : (
          <div className="space-y-5">
            {history.isSuccess && history.data.length > 0 && (
              <MockTestProgress key={user?.userId} attempts={history.data} userId={user?.userId} />
            )}

            <Card padded={false}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line px-5 py-4">
                <dl className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Số lượt thi')}</dt>
                    <dd className="text-xl font-bold tabular-nums text-rp-text">
                      {history.isSuccess ? attempts.length : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Điểm trung bình')}</dt>
                    <dd className="text-xl font-bold tabular-nums text-rp-text">
                      {average != null ? `${formatPercent(average)}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-rp-text-muted">{tr('Cao nhất')}</dt>
                    <dd className="text-xl font-bold tabular-nums text-rp-text">
                      {best != null ? `${formatPercent(best)}%` : '—'}
                    </dd>
                  </div>
                </dl>
                <Tabs
                  variant="pill"
                  label={tr('Khoảng thời gian')}
                  value={days}
                  onChange={setDays}
                  tabs={ranges.map((r) => ({ value: r.days, label: tr(r.label) }))}
                />
              </div>

              {history.isPending && (
                <div className="p-5">
                  <SakuraLoader variant="section" context="mocktest" label={tr('Đang tải lịch sử thi thử')} delay={160} />
                </div>
              )}

              {history.isError && (
                <div className="p-5">
                  <ErrorState
                    error={history.error}
                    onRetry={() => history.refetch()}
                    retrying={history.isFetching}
                    compact
                  />
                </div>
              )}

              {history.isSuccess && attempts.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    compact
                    mascot="studying"
                    title={tr('Chưa có lượt thi thử trong khoảng thời gian này')}
                    description={tr('Làm một đề thi thử để xem điểm theo từng phần và lỗi cần ôn lại.')}
                    action={
                      <Link to="/mock-tests/" className="rp-link text-sm font-semibold">
                        {tr('Làm đề thi thử')}
                      </Link>
                    }
                  />
                </div>
              )}

              {history.isSuccess && attempts.length > 0 && (
                <ul className="divide-y divide-rp-line">
                  {attempts.map((attempt) => (
                    <li key={attempt.attemptId}>
                      <Link
                        to={`/mock-tests/?attemptId=${attempt.attemptId}`}
                        className="rp-focus group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-rp-bg-2"
                      >
                        <FeatureIcon feature="mock" size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-rp-text">{tr(attempt.title)}</p>
                          <p className="text-xs text-rp-text-muted">
                            {attempt.jlptLevelName} · {formatAttemptDate(attempt.submittedAt)}
                          </p>
                        </div>
                        <div className="w-32">
                          <p className="text-right text-lg font-bold tabular-nums text-rp-text">
                            {formatPercent(attempt.totalScore)}%
                          </p>
                          <ProgressBar value={attempt.totalScore} max={100} label={trf('Điểm {0}', { 0: attempt.title })} />
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 text-rp-text-muted transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
