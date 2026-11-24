import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import { getSession } from '@/app/auth/session.js';
import { PenLine } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  PageContainer,
  SakuraLoader,
} from '@/components/ui';
import { ControlGroup, CounterPill, IllustratedPageHeader } from '@/features/learner-ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import {
  getPracticeHistory,
  getPracticeSubmission,
  regradePracticeSubmission,
} from '@/features/practice/api/practiceSubmissionApi.js';
import { LearnerShell } from '@/layouts';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

function formatWhen(value) {
  if (!value) return '';
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentIntlTag(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AIScoringResult() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const submissionId = Number(params.get('submissionId')) || 0;
  const session = getSession();
  const signedIn = Boolean(session?.accessToken);
  const uid = session?.userId ?? 'anon';
  const client = useQueryClient();
  const studyAccess = useStudyAccess();
  const subscription = studyAccess.data;
  const totalAiQuota = subscription
    ? (Number(subscription.writingUsesRemaining ?? 0) +
       Number(subscription.speakingUsesRemaining ?? 0) +
       Number(subscription.aiGradingUsesRemaining ?? 0))
    : null;

  const historyQuery = useQuery({
    queryKey: ['practice-history', uid],
    queryFn: getPracticeHistory,
    enabled: signedIn,
  });

  const history = useMemo(() => Array.isArray(historyQuery.data) ? historyQuery.data : [], [historyQuery.data]);

  useEffect(() => {
    if (!submissionId && history.length > 0 && history[0]?.id) {
      setParams({ submissionId: String(history[0].id) }, { replace: true });
    }
  }, [submissionId, history, setParams]);

  const detailQuery = useQuery({
    queryKey: ['practice-submission', uid, submissionId],
    queryFn: () => getPracticeSubmission(submissionId),
    enabled: signedIn && submissionId > 0,
  });

  const regrade = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang chấm lại bài luyện…'), '', { key: 'ai-regrade', maxWaitMs: 30000 });
      return regradePracticeSubmission(submissionId);
    },
    onSuccess: async () => {
      notify.success(tr('Đã cập nhật kết quả chấm lại.'), '', { key: 'ai-regrade', replace: true });
      await detailQuery.refetch();
      await client.invalidateQueries({ queryKey: ['practice-history', uid] });
    },
    onError: (err) => notify.apiError(err, tr('Chưa chấm lại được bài'), { key: 'ai-regrade', replace: true }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['study-subscription'] });
    },
  });

  const detail = detailQuery.data;
  const grading = detail?.grading;
  const isSpeaking = String(detail?.type || '').toLowerCase() === 'speaking';
  const isQuotaError = Boolean(
    regrade.isError &&
      (regrade.error?.status === 403 ||
        ['AI_CREDIT_REQUIRED', 'WRITING_PACKAGE_REQUIRED', 'SPEAKING_PACKAGE_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED'].includes(
          regrade.error?.data?.errorCode || regrade.error?.errorCode,
        )),
  );

  return (
    <LearnerShell pathname="/ai-scoring" breadcrumb={tr('Kết quả chấm')}>
      <PageContainer width="default" className="space-y-4">
        <IllustratedPageHeader
          icon="achievement"
          tone="peach"
          eyebrow={tr('LỊCH SỬ CHẤM ĐIỂM AI')}
          title={tr('Kết quả luyện viết & nói')}
          description={tr('Xem lại các bài đã nộp, tiêu chí đánh giá và yêu cầu chấm lại khi cần.')}
          actions={
            <ControlGroup>
              {totalAiQuota !== null && (
                <CounterPill tone={totalAiQuota > 0 ? 'brand' : 'neutral'}>
                  {trf('Lượt AI còn: {0}', { 0: totalAiQuota })}
                </CounterPill>
              )}
              <Button as={Link} to="/sentence-studio/" variant="primary" size="md" icon={PenLine}>
                {tr('Viết bài mới')}
              </Button>
            </ControlGroup>
          }
        />

        {!signedIn ? (
          <Banner
            tone="info"
            actions={
              <Link to="/auth" state={{ from: { pathname } }} className="rp-link text-xs font-semibold">
                {tr('Đăng nhập')}
              </Link>
            }
          >
            {tr('Đăng nhập để xem lịch sử các bài đã nộp và nhận xét AI.')}
          </Banner>
        ) : historyQuery.isSuccess && history.length === 0 ? (
          <div className="mx-auto max-w-xl py-4">
            <ContextualEmptyState
              variant="card"
              illustration="homework"
              title={tr('Chưa có bài nào được nộp.')}
              description={tr('Hãy hoàn thành một bài luyện viết hoặc luyện nói để nhận điểm và góp ý chi tiết từ AI.')}
              action={
                <Button as={Link} to="/sentence-studio/" variant="primary" size="sm" icon={PenLine}>
                  {tr('Viết bài mới')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,0.34fr)_minmax(0,1fr)]">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-rp-text">{tr('Bài đã nộp')}</h2>
                <Badge tone="neutral" size="sm" icon={false}>
                  {history.length}
                </Badge>
              </div>

              {historyQuery.isLoading && (
                <SakuraLoader variant="inline" context="writing" label={tr('Đang tải lịch sử bài viết')} delay={160} />
              )}

              {historyQuery.isError && (
                <ContextualErrorState
                  variant="inline"
                  compact
                  className="mt-3"
                  error={historyQuery.error}
                  title={tr('Chưa tải được lịch sử')}
                  onRetry={() => historyQuery.refetch()}
                  retrying={historyQuery.isFetching}
                />
              )}

              {history.length === 0 && historyQuery.isSuccess && (
                <ContextualEmptyState
                  variant="inline"
                  size="sm"
                  illustration="homework"
                  title={tr('Chưa có bài nào được nộp.')}
                  className="mt-3"
                />
              )}

              <ul className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto">
                {history.map((item) => {
                  const active = item.id === submissionId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setParams({ submissionId: String(item.id) })}
                        className={`rp-focus w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-rp-brand bg-rp-brand-tint text-rp-brand-strong'
                            : 'border-transparent hover:bg-rp-brand-tint/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-rp-text">
                            {item.certificateLevelCode || tr(item.type)}
                          </span>
                          <Badge tone={item.isGraded ? 'brand' : 'neutral'} size="sm" icon={false}>
                            {item.isGraded ? `${Math.round(item.overallScore || 0)}/100` : tr('Chưa chấm')}
                          </Badge>
                        </div>
                        <span className="mt-1 block text-[11px] text-rp-text-muted">{formatWhen(item.submittedAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              {!submissionId && !historyQuery.isLoading && (
                <ContextualEmptyState
                  illustration="clock"
                  title={tr('Chưa chọn bài luyện')}
                  description={tr('Chọn một bài ở cột bên hoặc bắt đầu viết bài mới để xem nhận xét.')}
                  action={
                    <Button as={Link} to="/sentence-studio/" variant="primary" size="sm">
                      {tr('Viết bài mới')}
                    </Button>
                  }
                />
              )}

              {detailQuery.isLoading && submissionId > 0 && (
                <SakuraLoader variant="section" context="writing" label={tr('Đang tải nhận xét bài viết')} delay={160} />
              )}

              {detailQuery.isError && (
                <ContextualErrorState
                  variant="inline"
                  error={detailQuery.error}
                  title={tr('Chưa tải được nhận xét bài viết')}
                  onRetry={() => detailQuery.refetch()}
                  retrying={detailQuery.isFetching}
                />
              )}

              {detail && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rp-line pb-4">
                    <div>
                      <Badge tone="brand" size="sm" icon={false}>
                        {detail.certificateLevelCode || (isSpeaking ? tr('Nói') : tr('Viết'))}
                      </Badge>
                      <h2 className="mt-2 text-lg font-semibold text-rp-text">
                        {isSpeaking ? tr('Nhận xét bài nói') : tr('Nhận xét bài viết')}
                      </h2>
                      {detail.submittedAt && (
                        <p className="mt-0.5 text-xs text-rp-text-muted">{formatWhen(detail.submittedAt)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-rp-text-muted">{tr('Điểm tổng quan')}</p>
                      <p className="text-3xl font-bold tabular-nums text-rp-brand">
                        {grading ? `${Math.round(grading.overallScore)}/100` : '—'}
                      </p>
                    </div>
                  </div>

                  {detail.textContent && (
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-4 py-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rp-text-muted">
                        {isSpeaking ? tr('Bản chép lời') : tr('Nội dung bài viết')}
                      </p>
                      <p lang="ja" className="whitespace-pre-wrap text-sm leading-7 text-rp-text">
                        {detail.textContent}
                      </p>
                    </div>
                  )}

                  {detailQuery.data && !grading && (
                    <Banner tone="info">
                      {tr('Bài đã lưu nhưng chưa có điểm AI. Bạn có thể chọn Chấm lại bên dưới.')}
                    </Banner>
                  )}

                  {grading?.criteria?.length > 0 && (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {grading.criteria.map((item, idx) => (
                        <li key={item.name || idx} className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-rp-text">{item.name}</p>
                            <Badge tone="neutral" size="sm" icon={false}>
                              {item.score}/10
                            </Badge>
                          </div>
                          {item.comment && <p className="mt-1.5 text-xs leading-5 text-rp-text-2">{item.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  )}

                  {grading?.strengths?.length > 0 && (
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                      <h3 className="text-xs font-semibold text-rp-success">{tr('Điểm mạnh')}</h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-rp-text-2">
                        {grading.strengths.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {grading?.improvements?.length > 0 && (
                    <div className="rounded-xl border border-rp-line bg-rp-bg-2 p-3.5">
                      <h3 className="text-xs font-semibold text-rp-brand-strong">{tr('Cần cải thiện')}</h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-rp-text-2">
                        {grading.improvements.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {grading?.corrections?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-rp-text">{tr('Gợi ý sửa câu')}</h3>
                      <ul className="space-y-2">
                        {grading.corrections.map((item, idx) => (
                          <li key={idx} className="rounded-xl border border-rp-line bg-rp-bg-2/70 px-3.5 py-3 text-xs">
                            <p lang="ja" className="text-rp-text-muted line-through">{item.original}</p>
                            <p lang="ja" className="mt-1 font-semibold text-rp-success">{item.suggestion}</p>
                            {item.reason && <p className="mt-1 text-rp-text-2">{item.reason}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {regrade.isError && (
                    <Banner
                      tone="danger"
                      actions={
                        isQuotaError ? (
                          <Link
                            to="/plans/"
                            state={{ from: { pathname }, requiredFeatureLabel: tr('Chấm bài AI') }}
                            className="rp-link text-xs font-semibold"
                          >
                            {tr('Mua gói ngay')}
                          </Link>
                        ) : null
                      }
                    >
                      {formatApiError(regrade.error, tr('Chưa chấm lại được bài này.'))}
                    </Banner>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
                    <Link
                      to={isSpeaking ? '/speech/' : '/sentence-studio/'}
                      className="rp-link text-xs font-semibold"
                    >
                      {isSpeaking ? tr('← Luyện nói câu mới') : tr('← Viết bài mới')}
                    </Link>

                    <Button
                      type="button"
                      variant={grading ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={regrade.isPending}
                      loading={regrade.isPending}
                      onClick={() => regrade.mutate()}
                    >
                      {regrade.isPending ? tr('Đang chấm lại…') : tr('Chấm lại')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </PageContainer>
    </LearnerShell>
  );
}
