import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getPlacementResult } from '../../api/placementApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function PlacementResult() {
  const { attemptId } = useParams();
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const query = useQuery({
    queryKey: ['placement-result', attemptId],
    queryFn: () => getPlacementResult(attemptId),
    enabled: Boolean(attemptId),
  });
  const result = query.data;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Kết quả đánh giá">
      <main
        data-page="PlacementResult"
        className="mx-auto max-w-[760px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7"
      >
        <header className="mb-5">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('KẾT QUẢ')}</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight">{tr('Kết quả đánh giá năng lực')}</h1>
        </header>

        {query.isPending && <p className="text-[13px] text-[#8C7782]">{tr('Đang tải kết quả…')}</p>}
        {query.isError && (
          <p role="alert" className="rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
            {query.error.message}
          </p>
        )}

        {result && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-5">
              <p className="text-[13px] text-[#8C7782]">{tr('Trình độ ước tính')}</p>
              <p className="mt-1 text-[28px] font-semibold text-[#AD3155]">{result.assessedJlptLevelName}</p>
              <p className="mt-2 text-[13px] leading-6 text-[#6F5C66]">
                {result.correctCount}/{result.totalQuestions} {tr('câu đúng')}
                {' · '}
                {Math.round(result.totalScore)}%
              </p>
              <p className="mt-2 text-[13px] text-[#6F5C66]">
                {tr('Nên ôn tới')} {result.recommendedTargetJlptLevelName}
              </p>
              <Link
                to="/roadmap"
                className={`mt-4 inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] ${focus}`}
              >
                {tr('Xem lộ trình')}
              </Link>
            </section>

            {result.levelBreakdowns?.length > 0 && (
              <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                <h2 className="text-[15px] font-semibold">{tr('Theo cấp độ')}</h2>
                <ul className="mt-3 space-y-2">
                  {result.levelBreakdowns.map((item) => (
                    <li key={item.jlptLevelId} className="flex items-center justify-between text-[13px]">
                      <span>{item.jlptLevelName}</span>
                      <span className="text-[#8C7782]">
                        {item.correctCount}/{item.totalCount} · {Math.round(item.scorePercent)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.sections?.length > 0 && (
              <section className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                <h2 className="text-[15px] font-semibold">{tr('Theo phần')}</h2>
                <ul className="mt-3 space-y-2">
                  {result.sections.map((item) => (
                    <li key={item.mockTestSectionId} className="flex items-center justify-between text-[13px]">
                      <span>{item.sectionTitle || item.languageSkillName}</span>
                      <span className="text-[#8C7782]">{item.correctCount}/{item.totalCount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </LearnerShell>
  );
}
