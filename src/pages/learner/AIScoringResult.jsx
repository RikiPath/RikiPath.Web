import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getSession } from '../../auth/session.js';
import {
  getPracticeHistory,
  getPracticeSubmission,
  regradePracticeSubmission,
} from '../../api/practiceSubmissionApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AIScoringResult() {
  const { tr } = useLocale();
  const [params, setParams] = useSearchParams();
  const submissionId = Number(params.get('submissionId')) || 0;
  const signedIn = Boolean(getSession()?.accessToken);
  const client = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['practice-history'],
    queryFn: getPracticeHistory,
    enabled: signedIn,
  });
  const detailQuery = useQuery({
    queryKey: ['practice-submission', submissionId],
    queryFn: () => getPracticeSubmission(submissionId),
    enabled: signedIn && submissionId > 0,
  });
  const regrade = useMutation({
    mutationFn: () => regradePracticeSubmission(submissionId),
    onSuccess: async () => {
      await detailQuery.refetch();
      await client.invalidateQueries({ queryKey: ['practice-history'] });
    },
  });

  const history = Array.isArray(historyQuery.data) ? historyQuery.data : [];
  const detail = detailQuery.data;
  const grading = detail?.grading;

  return (
    <LearnerShell pathname="/ai-scoring" breadcrumb={tr('Kết quả chấm')}>
      <main className="mx-auto grid max-w-[1080px] gap-4 px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:grid-cols-[280px_minmax(0,1fr)] lg:px-7">
        <aside className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">{tr('Bài đã nộp')}</h2>
            <Link to="/sentence-studio/" className={`text-[12px] text-[#AD3155] ${focus}`}>{tr('Viết mới')}</Link>
          </div>
          {historyQuery.isError && <p className="mt-3 text-[12px] text-[#A33357]">{historyQuery.error.message}</p>}
          {history.length === 0 && historyQuery.isSuccess && (
            <p className="mt-3 text-[13px] text-[#8C7782]">{tr('Chưa có bài nào.')}</p>
          )}
          <ul className="mt-3 space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setParams({ submissionId: String(item.id) })}
                  className={`w-full rounded-xl px-3 py-2 text-left ${focus} ${
                    item.id === submissionId ? 'bg-[#FCEEF3]' : 'hover:bg-[#FCF5F8]'
                  }`}
                >
                  <span className="block text-[13px] font-medium">{item.certificateLevelCode || item.type} · {item.isGraded ? `${Math.round(item.overallScore || 0)}` : tr('Chưa chấm')}</span>
                  <span className="mt-0.5 block text-[11px] text-[#8C7782]">{formatWhen(item.submittedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
          {!submissionId && <p className="text-[14px] text-[#8C7782]">{tr('Chọn một bài ở cột bên để xem nhận xét.')}</p>}
          {detailQuery.isPending && submissionId > 0 && <p className="text-[13px] text-[#8C7782]">{tr('Đang tải bài…')}</p>}
          {detailQuery.isError && <p role="alert" className="text-[13px] text-[#A33357]">{detailQuery.error.message}</p>}
          {detail && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{detail.certificateLevelCode}</p>
                  <h1 className="mt-1 text-[22px] font-semibold">{tr('Nhận xét bài viết')}</h1>
                </div>
                <p className="text-[32px] font-semibold text-[#AD3155]">
                  {grading ? Math.round(grading.overallScore) : '—'}
                </p>
              </div>
              {detail.textContent && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#FCF7F9] px-4 py-3 text-[14px] leading-7" style={{ fontFamily: '"Yu Gothic", "Yu Gothic UI", sans-serif' }}>
                  {detail.textContent}
                </p>
              )}
              {detailQuery.data && !grading && (
                <p className="mt-3 text-[13px] text-[#8C7782]">{tr('Bài đã lưu. Có thể nhờ chấm lại.')}</p>
              )}
              {grading?.criteria?.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {grading.criteria.map((item) => (
                    <li key={item.name} className="rounded-xl border border-[#F0E4E8] px-3 py-3">
                      <p className="text-[12px] text-[#8C7782]">{item.name}</p>
                      <p className="mt-1 text-[18px] font-semibold">{item.score}/10</p>
                      {item.comment && <p className="mt-1 text-[12px] leading-5 text-[#6F5C66]">{item.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {grading?.strengths?.length > 0 && <p className="mt-4 text-[13px] text-[#2F6B45]">{grading.strengths.join(' · ')}</p>}
              {grading?.improvements?.length > 0 && <p className="mt-1 text-[13px] text-[#A33357]">{grading.improvements.join(' · ')}</p>}
              {grading?.corrections?.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {grading.corrections.map((item) => (
                    <li key={`${item.original}-${item.suggestion}`} className="rounded-xl bg-[#FCF7F9] px-3 py-3 text-[13px]">
                      <p className="text-[#A33357]">{item.original}</p>
                      <p className="mt-1 text-[#2F6B45]">{item.suggestion}</p>
                      {item.reason && <p className="mt-1 text-[#8C7782]">{item.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(regrade.isError) && <p role="alert" className="mt-3 text-[13px] text-[#A33357]">{regrade.error.message}</p>}
              <button
                type="button"
                disabled={regrade.isPending}
                onClick={() => regrade.mutate()}
                className={`mt-4 h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] disabled:opacity-50 ${focus}`}
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
