import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import {
  getPlacementStatus,
  getPlacementTest,
  skipPlacement,
  startPlacement,
} from '@/features/placement/api/placementApi.js';
import { ClipboardCheck } from 'lucide-react';
import { JlptThumb } from '@/assets/illustrations';
import { Banner, Button, Card, CardHeader, ErrorState, HaruMascot, SakuraLoader, notify } from '@/components/ui';

const LEVELS = [
  { id: 1, name: 'N5' },
  { id: 2, name: 'N4' },
  { id: 3, name: 'N3' },
  { id: 4, name: 'N2' },
];


export default function PlacementTest() {
  const navigate = useNavigate();
  const { tr } = useLocale();
  const [levelId, setLevelId] = useState(3);
  const [error, setError] = useState('');

  const uid = getSession()?.userId ?? 'anon';
  const statusQuery = useQuery({
    queryKey: ['placement-status', uid],
    queryFn: getPlacementStatus,
  });
  const status = statusQuery.data;

  const start = useMutation({
    mutationFn: async () => {
      const test = await getPlacementTest(levelId);
      if (!test?.mockTestId) throw new Error(tr('Chưa có bài đánh giá năng lực cho cấp độ này.'));
      return startPlacement(test.mockTestId);
    },
    onSuccess: (attempt) => {
      navigate('/placement/exam', { state: { attempt } });
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, tr('Không thể bắt đầu bài đánh giá năng lực'), { key: 'placement-start-err' });
    },
  });

  const skip = useMutation({
    mutationFn: skipPlacement,
    onSuccess: () => {
      notify.info(tr('Đã tạm bỏ qua bài đánh giá năng lực'), tr('Bạn có thể làm lại bất kỳ lúc nào từ Bảng học tập.'), { key: 'placement-skip' });
      navigate('/roadmap');
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, tr('Không bỏ qua được bài đánh giá'), { key: 'placement-skip-err' });
    },
  });

  const busy = start.isPending || skip.isPending;

  const retakeBlocked = Boolean(status && !status.hasActiveAttempt && status.canStartNewAttempt === false);

  return (
    <LearnerShell breadcrumb={tr('Đánh giá năng lực')}>
      <div data-page="PlacementTest" className="rp-container-reading rp-cq py-[var(--rp-space-page-y)]">
        <section className="relative overflow-hidden rounded-rp-card-lg border border-rp-line bg-rp-surface">
          <div className="rp-pattern-seigaiha absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rp-brand">{tr('Đánh giá năng lực')}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-rp-text sm:text-[28px]">{tr('Biết mình đang ở đâu trước khi ôn')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-rp-text-2">
                {tr('Làm một lượt để hệ thống ước tính trình độ JLPT hiện tại và gợi ý lộ trình. Có thể bỏ qua và làm sau.')}
              </p>
            </div>
            <HaruMascot pose="thinking" size={128} className="hidden shrink-0 sm:block" />
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {statusQuery.isPending && (
            <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
          )}
          {statusQuery.isError && <Card><ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} retrying={statusQuery.isFetching} compact /></Card>}

          {status?.hasCompletedPlacementTest && (
            <Banner tone="success" title={`${tr('Kết quả gần nhất')}: ${status.assessedJlptLevelName || 'JLPT'}`}
              actions={status.latestCompletedAttemptId && (
                <Link to={`/placement/result/${status.latestCompletedAttemptId}/`} className="rp-focus inline-flex items-center gap-1 rounded text-[13px] font-semibold text-rp-brand-strong underline">{tr('Xem kết quả')}</Link>
              )}
            />
          )}

          {status?.hasActiveAttempt && (
            <Banner tone="info" title={tr('Bạn còn một lượt đang làm dở')}
              actions={<Link to="/placement/exam/" className="rp-focus inline-flex h-9 items-center rounded-rp-input bg-rp-brand-pressed px-4 text-[13px] font-semibold text-white hover:bg-rp-brand-strong rp-press">{tr('Làm tiếp')}</Link>}
            >
              {tr('Thời gian làm bài vẫn được tính theo hạn của máy chủ.')}
            </Banner>
          )}

          {retakeBlocked && (
            <Banner tone="warning" title={tr('Chưa thể làm thêm lượt đánh giá')}>
              {tr('Bạn đã dùng hết số lượt làm bài theo quy định hiện hành của hệ thống. Hãy tiếp tục ôn theo lộ trình đã gợi ý.')}
            </Banner>
          )}

          <Card>
            <CardHeader title={tr('Chọn cấp độ đề')} description={tr('Chọn cấp độ bạn muốn kiểm tra. Đề có giới hạn thời gian.')} />
            <div role="radiogroup" aria-label={tr('Cấp độ đề')} style={{ '--rp-grid-min': '10rem' }} className="rp-fluid-grid">
              {LEVELS.map((level) => {
                const active = levelId === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={retakeBlocked}
                    onClick={() => setLevelId(level.id)}
                    className={`rp-focus overflow-hidden rounded-rp-card border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-rp-brand ring-2 ring-rp-brand/20' : 'border-rp-line hover:border-rp-brand-border'}`}
                  >
                    <JlptThumb level={level.name} className="block h-16 w-full" />
                    <span className="block px-3 py-2 text-sm font-bold text-rp-text">JLPT {level.name}</span>
                  </button>
                );
              })}
            </div>
            {error && <Banner tone="danger" className="mt-4">{error}</Banner>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                icon={ClipboardCheck}
                loading={start.isPending}
                disabled={busy || retakeBlocked || status?.hasActiveAttempt}
                onClick={() => {
                  setError('');
                  start.mutate();
                }}
              >
                {tr('Bắt đầu làm bài')}
              </Button>
              <Button variant="secondary" loading={skip.isPending} disabled={busy} onClick={() => skip.mutate()}>
                {tr('Bỏ qua lúc này')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </LearnerShell>
  );
}
