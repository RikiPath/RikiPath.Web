import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import {
  getPlacementStatus,
  getPlacementTest,
  skipPlacement,
  startPlacement,
} from '@/features/placement/api/placementApi.js';
import {
  useCertificateLevelsQuery,
  useCertificateTypesQuery,
} from '@/features/learning-path/hooks/useCertificates.js';
import { JlptThumb } from '@/assets/illustrations';
import {
  Banner,
  Button,
  Card,
  CardHeader,
  ErrorState,
  HaruMascot,
  PageContainer,
  SakuraLoader,
  notify,
} from '@/components/ui';

const FALLBACK_LEVELS = [
  { id: 1, code: 'N5', name: 'N5' },
  { id: 2, code: 'N4', name: 'N4' },
  { id: 3, code: 'N3', name: 'N3' },
  { id: 4, code: 'N2', name: 'N2' },
  { id: 5, code: 'N1', name: 'N1' },
];

export default function PlacementTest() {
  const navigate = useNavigate();
  const { tr } = useLocale();
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [error, setError] = useState('');

  const uid = getSession()?.userId ?? 'anon';
  const statusQuery = useQuery({
    queryKey: ['placement-status', uid],
    queryFn: getPlacementStatus,
  });
  const status = statusQuery.data;

  const { data: certTypes = [] } = useCertificateTypesQuery();
  const jlptCertId = useMemo(
    () => certTypes.find((c) => c.name?.trim().toUpperCase() === 'JLPT')?.id ?? certTypes[0]?.id ?? null,
    [certTypes],
  );
  const { data: apiLevels = [] } = useCertificateLevelsQuery(jlptCertId);
  const levels = useMemo(() => {
    const filtered = apiLevels.filter((l) => ['N5', 'N4', 'N3', 'N2', 'N1'].includes((l.code || l.name || '').trim().toUpperCase()));
    return filtered.length > 0 ? filtered : FALLBACK_LEVELS;
  }, [apiLevels]);

  const effectiveLevelId = selectedLevelId
    ?? status?.targetJlptLevelId
    ?? levels.find((l) => (l.code || l.name || '').toUpperCase() === 'N3')?.id
    ?? levels[0]?.id
    ?? 3;

  const start = useMutation({
    mutationFn: async () => {
      const test = await getPlacementTest(effectiveLevelId);
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
      <PageContainer data-page="PlacementTest" width="reading" density="comfortable" className="text-rp-text">
        <section className="relative overflow-hidden rounded-rp-card-lg border border-rp-line bg-rp-surface">
          <div className="rp-pattern-seigaiha absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rp-brand">{tr('Đánh giá năng lực')}</p>
              <h1 className="mt-2 rp-type-page-title text-rp-text">{tr('Biết mình đang ở đâu trước khi ôn')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-rp-text-2">
                {tr('Làm một lượt để hệ thống ước tính trình độ JLPT hiện tại và gợi ý lộ trình. Có thể bỏ qua và làm sau.')}
              </p>
              <div className="mt-3">
                <Link to="/app/placement-test" className="rp-link inline-flex items-center gap-1 text-xs font-semibold">
                  {tr('Mở đánh giá năng lực chuẩn hóa theo mục tiêu')} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <HaruMascot pose="thinking" size={128} className="hidden shrink-0 sm:block" />
          </div>
        </section>

        <div className="mt-5 space-y-4">
          {statusQuery.isPending && (
            <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
          )}
          {statusQuery.isError && (
            <Card><ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} retrying={statusQuery.isFetching} compact /></Card>
          )}

          {status?.hasCompletedPlacementTest && (
            <Banner
              tone="success"
              title={`${tr('Kết quả gần nhất')}: ${status.assessedJlptLevelName || 'JLPT'}`}
              actions={status.latestCompletedAttemptId && (
                <Link to={`/placement/result/${status.latestCompletedAttemptId}/`}>
                  <Button variant="secondary" size="sm">{tr('Xem kết quả')}</Button>
                </Link>
              )}
            />
          )}

          {status?.hasActiveAttempt && (
            <Banner
              tone="info"
              title={tr('Bạn còn một lượt đang làm dở')}
              actions={(
                <Link to="/placement/exam/">
                  <Button variant="primary" size="sm">{tr('Làm tiếp')}</Button>
                </Link>
              )}
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
            <CardHeader
              title="Chọn cấp độ đề"
              description="Chọn cấp độ JLPT (N5–N1) bạn muốn kiểm tra nhanh. Đề có giới hạn thời gian."
            />
            <div role="radiogroup" aria-label={tr('Cấp độ đề')} style={{ '--rp-grid-min': '9.5rem' }} className="rp-fluid-grid">
              {levels.map((level) => {
                const code = (level.code || level.name || '').trim().toUpperCase();
                const active = effectiveLevelId === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={retakeBlocked || busy}
                    onClick={() => setSelectedLevelId(level.id)}
                    className={`rp-focus overflow-hidden rounded-rp-card border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      active ? 'border-rp-brand ring-2 ring-rp-brand/20 bg-rp-brand-tint/20' : 'border-rp-line hover:border-rp-brand-border'
                    }`}
                  >
                    <JlptThumb level={code} className="block h-16 w-full" />
                    <span className="block px-3 py-2 text-sm font-bold text-rp-text">JLPT {code}</span>
                  </button>
                );
              })}
            </div>
            {error && <Banner tone="danger" className="mt-4">{error}</Banner>}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="primary"
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
      </PageContainer>
    </LearnerShell>
  );
}
