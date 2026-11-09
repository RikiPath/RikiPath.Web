import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import {
  getPlacementStatus,
  getPlacementTest,
  skipPlacement,
  startPlacement,
} from '../../api/placementApi.js';

const LEVELS = [
  { id: 1, name: 'N5' },
  { id: 2, name: 'N4' },
  { id: 3, name: 'N3' },
  { id: 4, name: 'N2' },
];

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function PlacementTest() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tr } = useLocale();
  const [levelId, setLevelId] = useState(3);
  const [error, setError] = useState('');

  const statusQuery = useQuery({
    queryKey: ['placement-status'],
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
    onError: (err) => setError(err.message),
  });

  const skip = useMutation({
    mutationFn: skipPlacement,
    onSuccess: () => navigate('/roadmap'),
    onError: (err) => setError(err.message),
  });

  const busy = start.isPending || skip.isPending;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Đánh giá năng lực">
      <main
        data-page="PlacementTest"
        className="mx-auto max-w-[760px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7"
      >
        <header className="mb-5">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">
            {tr('PLACEMENT')}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
            {tr('Bài đánh giá năng lực')}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#8C7782]">
            {tr('Làm một lượt để hệ thống ước tính trình độ JLPT hiện tại. Có thể bỏ qua và làm sau.')}
          </p>
        </header>

        {statusQuery.isPending && (
          <p className="text-[13px] text-[#8C7782]">{tr('Đang tải trạng thái…')}</p>
        )}
        {statusQuery.isError && (
          <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
            {statusQuery.error.message}
          </p>
        )}

        {status?.hasCompletedPlacementTest && (
          <section className="mb-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
            <p className="text-[13px] text-[#6F5C66]">
              {tr('Đã hoàn thành. Trình độ ước tính:')}{' '}
              <span className="font-semibold text-[#AD3155]">
                {status.assessedJlptLevelName || 'JLPT'}
              </span>
            </p>
            {status.latestCompletedAttemptId && (
              <Link
                to={`/placement/result/${status.latestCompletedAttemptId}`}
                className={`mt-3 inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}
              >
                {tr('Xem kết quả')}
              </Link>
            )}
          </section>
        )}

        {status?.hasActiveAttempt && (
          <section className="mb-4 rounded-2xl border border-[#EADFE5] bg-[#FDF2F5] px-5 py-4">
            <p className="text-[13px] text-[#8E2948]">{tr('Bạn còn một lượt đang làm dở.')}</p>
            <Link
              to="/placement/exam"
              className={`mt-3 inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}
            >
              {tr('Làm tiếp')}
            </Link>
          </section>
        )}

        <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
          <h2 className="text-[15px] font-semibold">{tr('Chọn cấp độ đề')}</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {LEVELS.map((level) => {
              const active = levelId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLevelId(level.id)}
                  className={`h-10 rounded-xl border text-[13px] font-semibold ${focus} ${
                    active
                      ? 'border-[#AD3155] bg-[#FCEEF3] text-[#AD3155]'
                      : 'border-[#E7DAE1] bg-white text-[#49353F] hover:border-[#E7C9D6]'
                  }`}
                >
                  {level.name}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-[#A33357]">{error}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError('');
                start.mutate();
              }}
              className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
            >
              {start.isPending ? tr('Đang mở đề…') : tr('Bắt đầu')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => skip.mutate()}
              className={`h-10 rounded-xl border border-[#E7DAE1] px-4 text-[13px] text-[#6E5360] hover:bg-[#FDFAFC] disabled:opacity-50 ${focus}`}
            >
              {skip.isPending ? tr('Đang lưu…') : tr('Bỏ qua lúc này')}
            </button>
          </div>
        </section>
      </main>
    </LearnerShell>
  );
}
