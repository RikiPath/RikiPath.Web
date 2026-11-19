import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '@/layouts';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import {
  getPracticeHistory,
  getPracticeSubmission,
  regradePracticeSubmission,
} from '@/features/practice/api/practiceSubmissionApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { ContextualErrorState, SakuraLoader } from '@/components/ui';
import { parseUtcDate } from '@/utils/vnDateTime.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';

function formatWhen(value) {
  if (!value) return '';
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentIntlTag(), { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AIScoringResult() {
  const { tr } = useLocale();
  const [params, setParams] = useSearchParams();
  const submissionId = Number(params.get('submissionId')) || 0;
  const session = getSession();
  const signedIn = Boolean(session?.accessToken);
  const uid = session?.userId ?? 'anon';
  const client = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['practice-history', uid],
    queryFn: getPracticeHistory,
    enabled: signedIn,
  });
  const detailQuery = useQuery({
    queryKey: ['practice-submission', uid, submissionId],
    queryFn: () => getPracticeSubmission(submissionId),
    enabled: signedIn && submissionId > 0,
  });
  const regrade = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang chấm lại bài viết…'), '', { key: 'ai-regrade', maxWaitMs: 30000 });
      return regradePracticeSubmission(submissionId);
    },
    onSuccess: async () => {
      notify.success(tr('Đã cập nhật kết quả chấm lại.'), '', { key: 'ai-regrade', replace: true });
      await detailQuery.refetch();
      await client.invalidateQueries({ queryKey: ['practice-history', uid] });
    },
    onError: (err) => notify.apiError(err, tr('Chưa chấm lại được bài'), { key: 'ai-regrade', replace: true }),
  });

  const history = Array.isArray(historyQuery.data) ? historyQuery.data : [];
  const detail = detailQuery.data;
  const grading = detail?.grading;

  return (
    <LearnerShell pathname="/ai-scoring" breadcrumb={tr('Kết quả chấm')}>
      <main className="rp-container rp-cq grid gap-[var(--rp-space-section)] py-[var(--rp-space-page-y)] text-rp-text lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-rp-line bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">{tr('Bài đã nộp')}</h2>
            <Link to="/sentence-studio/" className={`text-[12px] text-rp-brand-strong ${focus}`}>{tr('Viết mới')}</Link>
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
            <p className="mt-3 text-[13px] text-rp-text-muted">{tr('Chưa có bài nào.')}</p>
          )}
          <ul className="mt-3 space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setParams({ submissionId: String(item.id) })}
                  className={`w-full rounded-xl px-3 py-2 text-left ${focus} ${
                    item.id === submissionId ? 'bg-rp-brand-tint' : 'hover:bg-rp-brand-tint'
                  }`}
                >
                  <span className="block text-[13px] font-medium">{item.certificateLevelCode || item.type} · {item.isGraded ? `${Math.round(item.overallScore || 0)}` : tr('Chưa chấm')}</span>
                  <span className="mt-0.5 block text-[11px] text-rp-text-muted">{formatWhen(item.submittedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-2xl border border-rp-line bg-white px-5 py-5">
          {!submissionId && <p className="text-[14px] text-rp-text-muted">{tr('Chọn một bài ở cột bên để xem nhận xét.')}</p>}
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
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.14em] text-rp-brand-strong">{detail.certificateLevelCode}</p>
                  <h1 className="mt-1 text-[22px] font-semibold">{tr('Nhận xét bài viết')}</h1>
                </div>
                <p className="text-[32px] font-semibold text-rp-brand-strong">
                  {grading ? Math.round(grading.overallScore) : '—'}
                </p>
              </div>
              {detail.textContent && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-rp-brand-tint px-4 py-3 text-[14px] leading-7" style={{ fontFamily: '"Yu Gothic", "Yu Gothic UI", sans-serif' }}>
                  {detail.textContent}
                </p>
              )}
              {detailQuery.data && !grading && (
                <p className="mt-3 text-[13px] text-rp-text-muted">{tr('Bài đã lưu. Có thể nhờ chấm lại.')}</p>
              )}
              {grading?.criteria?.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {grading.criteria.map((item) => (
                    <li key={item.name} className="rounded-xl border border-rp-line px-3 py-3">
                      <p className="text-[12px] text-rp-text-muted">{item.name}</p>
                      <p className="mt-1 text-[18px] font-semibold">{item.score}/10</p>
                      {item.comment && <p className="mt-1 text-[12px] leading-5 text-rp-text-2">{item.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {grading?.strengths?.length > 0 && <p className="mt-4 text-[13px] text-rp-success">{grading.strengths.join(' · ')}</p>}
              {grading?.improvements?.length > 0 && <p className="mt-1 text-[13px] text-rp-brand-strong">{grading.improvements.join(' · ')}</p>}
              {grading?.corrections?.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {grading.corrections.map((item) => (
                    <li key={`${item.original}-${item.suggestion}`} className="rounded-xl bg-rp-brand-tint px-3 py-3 text-[13px]">
                      <p className="text-rp-brand-strong">{item.original}</p>
                      <p className="mt-1 text-rp-success">{item.suggestion}</p>
                      {item.reason && <p className="mt-1 text-rp-text-muted">{tr(item.reason)}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(regrade.isError) && <p role="alert" className="mt-3 text-[13px] text-rp-brand-strong">{tr(regrade.error.message)}</p>}
              <button
                type="button"
                disabled={regrade.isPending}
                onClick={() => regrade.mutate()}
                className={`mt-4 h-9 rounded-lg border border-rp-line px-3 text-[12px] disabled:opacity-50 ${focus}`}
              >
                {regrade.isPending ? tr('Đang chấm lại…') : tr('Chấm lại')}
              </button>
            </>
          )}
        </section>
      </main>
    </LearnerShell>
  );
}
