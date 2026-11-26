import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, ClipboardCheck, Compass, PlayCircle, Target } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import {
  getPlacementStatus,
  skipStandardPlacement,
  startPlacementAttempt,
  submitPlacementAttempt,
} from '@/features/placement/api/placementApi.js';
import {
  invalidateLearnerSetupQueries,
  useLearningPathAccess,
} from '@/features/learning-path/useLearningPathAccess.js';
import {
  useCertificateLevelsQuery,
  useCertificateTypesQuery,
} from '@/features/learning-path/hooks/useCertificates.js';
import { JlptThumb } from '@/assets/illustrations';
import { IllustratedPageHeader } from '@/features/learner-ui';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  ErrorState,
  PageContainer,
  SakuraLoader,
  cx,
  notify,
} from '@/components/ui';

const FALLBACK_LEVELS = [
  { id: 1, code: 'N5', name: 'N5' },
  { id: 2, code: 'N4', name: 'N4' },
  { id: 3, code: 'N3', name: 'N3' },
  { id: 4, code: 'N2', name: 'N2' },
];

export default function PlacementTest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tr, trf } = useLocale();
  const roadmapAccess = useLearningPathAccess();
  // 'COMPREHENSIVE' | 'TARGETED' — default null lets target goal pre-select TARGETED or untargeted COMPREHENSIVE
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [error, setError] = useState('');

  const { data: certTypes = [] } = useCertificateTypesQuery();
  const jlptCertId = useMemo(
    () => certTypes.find((c) => c.name?.trim().toUpperCase() === 'JLPT')?.id ?? certTypes[0]?.id ?? null,
    [certTypes],
  );
  const { data: apiLevels = [] } = useCertificateLevelsQuery(jlptCertId);
  const levels = useMemo(() => {
    const filtered = apiLevels.filter((l) => ['N5', 'N4', 'N3', 'N2'].includes((l.code || l.name || '').trim().toUpperCase()));
    return filtered.length > 0 ? filtered : FALLBACK_LEVELS;
  }, [apiLevels]);

  const hasGoal = roadmapAccess.hasConfirmedGoal;
  const goalLevelId = roadmapAccess.profile?.targetJlptLevelId ?? null;
  const effectiveMode = selectedMode ?? (selectedLevelId || goalLevelId ? 'TARGETED' : 'COMPREHENSIVE');
  const effectiveLevelId = effectiveMode === 'TARGETED'
    ? (selectedLevelId ?? goalLevelId ?? levels.find((l) => (l.code || l.name || '').toUpperCase() === 'N5')?.id ?? levels[0]?.id ?? 1)
    : null;

  const uid = getSession()?.userId ?? 'anon';
  const statusQuery = useQuery({
    queryKey: ['placement-status', uid, effectiveMode, effectiveLevelId ?? 'comp'],
    queryFn: () => getPlacementStatus({
      assessmentMode: effectiveMode,
      assessmentLevelId: effectiveLevelId,
    }),
  });
  const status = statusQuery.data;

  const allowance = status?.attemptAllowance ?? null;
  const quotaInitialized = Boolean(status?.quotaInitialized ?? allowance);
  const hasActiveAttempt = Boolean(status?.hasActiveAttempt);
  const pendingSubmissionId = allowance?.pendingSubmissionAttemptId ?? null;
  const quotaExhausted = Boolean(
    status &&
    quotaInitialized &&
    !hasActiveAttempt &&
    !pendingSubmissionId &&
    (status.cannotStartReason === 'PLACEMENT_ATTEMPT_LIMIT_REACHED' || allowance?.remaining === 0),
  );

  const isRetakeForScope = Boolean(
    status?.hasCompletedPlacementTest &&
    (effectiveMode === 'COMPREHENSIVE'
      ? status?.latestAssessmentIsComprehensive
      : status?.latestAssessmentLevelId === effectiveLevelId),
  );

  const start = useMutation({
    mutationFn: async () => startPlacementAttempt({
      assessmentMode: effectiveMode,
      assessmentLevelId: effectiveLevelId,
      retakeTargetAssessment: isRetakeForScope,
    }),
    onSuccess: async (attempt) => {
      await invalidateLearnerSetupQueries(queryClient);
      navigate(`/app/placement-test?attemptId=${attempt.attemptId}`);
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, tr('Không thể bắt đầu bài đánh giá năng lực'), { key: 'placement-start-err' });
    },
  });

  const submitExpired = useMutation({
    mutationFn: () => submitPlacementAttempt(pendingSubmissionId, []),
    onSuccess: async (res) => {
      await invalidateLearnerSetupQueries(queryClient);
      navigate(`/app/placement-test?attemptId=${res.attemptId}`);
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, tr('Chưa nộp được lượt đánh giá đã hết giờ'), { key: 'placement-submit-expired-err' });
    },
  });

  const skip = useMutation({
    mutationFn: skipStandardPlacement,
    onSuccess: async () => {
      await invalidateLearnerSetupQueries(queryClient);
      notify.info(
        tr('Đã kích hoạt lộ trình tiêu chuẩn'),
        tr('Lộ trình tiêu chuẩn đã sẵn sàng.'),
        { key: 'placement-skip' },
      );
      navigate('/roadmap');
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, tr('Không bỏ qua được bài đánh giá'), { key: 'placement-skip-err' });
    },
  });

  const busy = start.isPending || skip.isPending || submitExpired.isPending;

  return (
    <LearnerShell breadcrumb={tr('Đánh giá năng lực')}>
      <PageContainer data-page="PlacementTest" width="reading" density="comfortable" className="text-rp-text">
        <IllustratedPageHeader
          icon="placement"
          tone="sky"
          eyebrow={tr('Đánh giá năng lực')}
          title={tr('Biết mình đang ở đâu trước khi ôn')}
          description={tr('Bạn có thể làm bài đánh giá năng lực bất kỳ lúc nào — không cần đặt mục tiêu JLPT trước. Hệ thống ước tính trình độ hiện tại và tự động giữ kết quả khi bạn chọn mục tiêu sau.')}
          badges={
            hasGoal && roadmapAccess.profile?.targetJlptLevelName ? (
              <Badge tone="brand" size="sm" icon={Target}>
                {trf('Mục tiêu tham khảo: JLPT {0}', { 0: roadmapAccess.profile.targetJlptLevelName })}
              </Badge>
            ) : null
          }
          actions={
            <Button as={Link} to="/app/placement-test" variant="secondary" size="md" iconRight={ArrowRight}>
              {tr('Mở đánh giá chuẩn hóa')}
            </Button>
          }
        />

        <div className="mt-5 space-y-4">
          {statusQuery.isPending && (
            <SakuraLoader variant="section" context="assessment" label={tr('Đang tải trạng thái bài đánh giá')} delay={160} />
          )}

          {statusQuery.isError && (
            <Card>
              <ErrorState
                error={statusQuery.error}
                onRetry={() => statusQuery.refetch()}
                retrying={statusQuery.isFetching}
                compact
              />
            </Card>
          )}

          {hasGoal && status?.placementCompatibilityStatus === 'INSUFFICIENT_FOR_TARGET' && status?.placementCompatibilityReason && (
            <Banner tone="warning" title={tr('Cần đánh giá bổ sung cho mục tiêu mới')}>
              {status.placementCompatibilityReason}
            </Banner>
          )}

          {status?.hasCompletedPlacementTest && (
            <Banner
              tone="success"
              title={status.assessedJlptLevelName
                ? trf('Trình độ hiện tại ước tính: JLPT {0}', { 0: status.assessedJlptLevelName })
                : tr('Bạn đã hoàn thành một lượt đánh giá năng lực')}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {status.latestCompletedAttemptId && (
                    <Link to={`/app/placement-test?attemptId=${status.latestCompletedAttemptId}`}>
                      <Button variant="secondary" size="sm">{tr('Xem kết quả')}</Button>
                    </Link>
                  )}
                  {!hasGoal && (
                    <Link to="/onboarding/">
                      <Button variant="primary" size="sm">{tr('Thiết lập mục tiêu JLPT')}</Button>
                    </Link>
                  )}
                </div>
              }
            >
              {!hasGoal
                ? tr('Kết quả đánh giá đã được lưu. Hãy chọn mục tiêu JLPT cho hành trình tiếp theo.')
                : undefined}
            </Banner>
          )}

          {hasActiveAttempt && (
            <Banner
              tone="info"
              title={tr('Bạn còn một lượt đánh giá đang làm dở')}
              actions={(
                <Link to="/app/placement-test/">
                  <Button variant="primary" size="sm" icon={PlayCircle}>
                    {tr('Tiếp tục bài đánh giá')}
                  </Button>
                </Link>
              )}
            >
              {tr('Bài làm đang được giữ nguyên tiến độ và thời gian còn lại theo máy chủ.')}
            </Banner>
          )}

          {!hasActiveAttempt && pendingSubmissionId && (
            <Banner
              tone="warning"
              title={tr('Bạn có lượt đánh giá đã hết giờ cần nộp')}
              actions={(
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={submitExpired.isPending}
                  onClick={() => submitExpired.mutate()}
                >
                  {tr('Nộp lượt đã hết giờ')}
                </Button>
              )}
            >
              {tr('Hãy nộp bài đánh giá trước để xem kết quả và làm lượt mới.')}
            </Banner>
          )}

          {quotaExhausted && (
            <Banner tone="warning" title={tr('Chưa thể làm thêm lượt đánh giá ở phạm vi này')}>
              {trf('Bạn đã sử dụng hết {0}/{1} lượt đánh giá cho phạm vi đang chọn. Bạn vẫn có thể xem lại kết quả hoặc chọn phạm vi/cấp độ đánh giá khác nếu còn lượt.', {
                0: allowance?.started ?? 0,
                1: allowance?.limit ?? 2,
              })}
            </Banner>
          )}

          <Card>
            <CardHeader
              title={tr('Chọn phương thức và cấp độ đánh giá')}
              description={tr('Chưa rõ trình độ hiện tại? Hãy chọn Đánh giá tổng hợp (N5–N3). Nếu muốn kiểm tra sâu một cấp cụ thể, chọn cấp độ N5–N2 bên dưới.')}
              action={
                allowance && quotaInitialized && (
                  <Badge tone={allowance.remaining > 0 ? 'brand' : 'warning'} size="sm" icon={false}>
                    {trf('Còn {0}/{1} lượt', { 0: allowance.remaining, 1: allowance.limit })}
                  </Badge>
                )
              }
            />

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelectedMode('COMPREHENSIVE');
                  setError('');
                }}
                className={cx(
                  'rp-focus flex items-start gap-3 rounded-rp-card border p-3.5 text-left transition-colors',
                  effectiveMode === 'COMPREHENSIVE'
                    ? 'border-rp-brand bg-rp-brand-tint/30 ring-2 ring-rp-brand/20'
                    : 'border-rp-line bg-white hover:border-rp-brand-border',
                )}
              >
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-rp-brand-strong" />
                <div>
                  <p className="text-sm font-bold text-rp-navy">{tr('Đánh giá tổng hợp (N5–N3)')}</p>
                  <p className="mt-1 text-xs leading-5 text-rp-text-2">
                    {tr('Phù hợp khi bạn chưa rõ trình độ hoặc chưa đặt mục tiêu JLPT. Hệ thống ước tính trình độ nền tảng hiện tại.')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelectedMode('TARGETED');
                  setError('');
                }}
                className={cx(
                  'rp-focus flex items-start gap-3 rounded-rp-card border p-3.5 text-left transition-colors',
                  effectiveMode === 'TARGETED'
                    ? 'border-rp-brand bg-rp-brand-tint/30 ring-2 ring-rp-brand/20'
                    : 'border-rp-line bg-white hover:border-rp-brand-border',
                )}
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rp-brand-strong" />
                <div>
                  <p className="text-sm font-bold text-rp-navy">{tr('Đánh giá theo cấp độ JLPT')}</p>
                  <p className="mt-1 text-xs leading-5 text-rp-text-2">
                    {tr('Kiểm tra 4 kỹ năng ở cấp độ N5–N2 bạn chọn (không tự động thay đổi mục tiêu JLPT của bạn).')}
                  </p>
                </div>
              </button>
            </div>

            {effectiveMode === 'TARGETED' && (
              <div role="radiogroup" aria-label={tr('Cấp độ đề')} style={{ '--rp-grid-min': '9.5rem' }} className="rp-fluid-grid-fill">
                {levels.map((level) => {
                  const code = (level.code || level.name || '').trim().toUpperCase();
                  const active = effectiveLevelId === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={busy}
                      onClick={() => {
                        setSelectedMode('TARGETED');
                        setSelectedLevelId(level.id);
                        setError('');
                      }}
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
            )}

            {error && <Banner tone="danger" className="mt-4">{error}</Banner>}

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {hasActiveAttempt ? (
                <Button as={Link} to="/app/placement-test/" variant="primary" icon={PlayCircle}>
                  {tr('Tiếp tục bài đánh giá')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  icon={ClipboardCheck}
                  loading={start.isPending}
                  disabled={busy || statusQuery.isPending || quotaExhausted || Boolean(pendingSubmissionId)}
                  onClick={() => {
                    setError('');
                    start.mutate();
                  }}
                >
                  {isRetakeForScope ? tr('Đánh giá lại') : tr('Bắt đầu làm bài')}
                </Button>
              )}

              {hasGoal ? (
                <Button variant="secondary" loading={skip.isPending} disabled={busy} onClick={() => skip.mutate()}>
                  {tr('Bỏ qua và sử dụng lộ trình tiêu chuẩn')}
                </Button>
              ) : (
                <Button as={Link} to="/onboarding/" variant="secondary" disabled={busy}>
                  {tr('Đặt mục tiêu JLPT')}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </PageContainer>
    </LearnerShell>
  );
}
