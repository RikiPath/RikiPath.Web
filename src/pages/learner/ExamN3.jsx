import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { LearnerShell } from '../../components/shells';
import { getJlptLevels } from '../../api/lessons.js';
import { getMockTestsByLevel, startMockTest, submitMockTest } from '../../api/mockTestApi.js';
import { getSession } from '../../auth/session.js';
import { useLearnerProfile } from '../../hooks/useLearnerHome.js';
import { useLocale } from '../../i18n/locale.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const jp = { fontFamily: '"Yu Gothic", "Yu Gothic UI", "Segoe UI", sans-serif' };

function sectionsOf(questions) {
  const groups = new Map();
  for (const question of questions) {
    const key = question.mockTestSectionId || question.sectionTitle || 'section';
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        title: question.sectionTitle || 'Phần thi',
        order: question.sectionOrder || 0,
        questions: [],
      });
    }
    groups.get(key).questions.push(question);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      ...section,
      questions: [...section.questions].sort((a, b) => (a.order || 0) - (b.order || 0)),
    }));
}

export default function ExamN3() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const signedIn = Boolean(getSession()?.accessToken);
  const profile = useLearnerProfile();
  const [levelId, setLevelId] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [picks, setPicks] = useState({});
  const [result, setResult] = useState(null);

  const levelsQuery = useQuery({
    queryKey: ['jlpt-levels'],
    queryFn: getJlptLevels,
    enabled: signedIn,
  });
  const levels = (Array.isArray(levelsQuery.data) ? levelsQuery.data : [])
    .filter((level) => String(level.code || '').toUpperCase() !== 'N1');
  const preferred = levelId || profile.data?.targetJlptLevelId;
  const activeLevelId = levels.some((level) => level.id === preferred) ? preferred : levels[0]?.id;

  const testsQuery = useQuery({
    queryKey: ['mock-tests', activeLevelId],
    queryFn: () => getMockTestsByLevel(activeLevelId),
    enabled: signedIn && Boolean(activeLevelId) && !attempt,
  });
  const tests = Array.isArray(testsQuery.data) ? testsQuery.data : [];

  const start = useMutation({
    mutationFn: startMockTest,
    onSuccess: (data) => {
      setAttempt(data);
      setPicks({});
      setResult(null);
    },
  });
  const submit = useMutation({
    mutationFn: () => submitMockTest(attempt.attemptId, (attempt.questions || []).map((question) => ({
      questionId: question.questionId,
      selectedOptionId: picks[question.questionId] ?? null,
    }))),
    onSuccess: setResult,
  });

  const sections = useMemo(() => sectionsOf(attempt?.questions || []), [attempt]);
  const answered = Object.values(picks).filter((value) => value != null).length;
  const total = attempt?.questions?.length || 0;
  const error = levelsQuery.error || testsQuery.error || start.error || submit.error;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Thi thử')}>
      <main className="mx-auto max-w-[980px] px-4 py-6 text-[#49353F] sm:px-6">
        <header className="mb-5">
          <p className="text-[12px] font-medium tracking-[0.12em] text-[#AD3155]">{tr('ĐỀ THI')}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{tr('Thi thử theo cấp độ')}</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#927B88]">
            {tr('Chọn một đề đã duyệt. Bài làm được lưu khi bạn nộp, kèm điểm từng phần.')}
          </p>
        </header>

        {!signedIn && (
          <p className="rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {tr('Đăng nhập bằng tài khoản học viên để làm đề.')}
          </p>
        )}
        {error && <p role="alert" className="mb-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}

        {signedIn && !attempt && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={level.id === activeLevelId}
                  onClick={() => setLevelId(level.id)}
                  className={`h-8 rounded-full px-3 text-[12px] ${level.id === activeLevelId ? 'bg-[#AD3155] text-white' : 'bg-white text-[#826773]'} ${focus}`}
                >
                  {level.code}
                </button>
              ))}
            </div>
            {testsQuery.isFetching && <p className="text-[13px] text-[#AA8F9B]">{tr('Đang tải đề…')}</p>}
            {!testsQuery.isFetching && !testsQuery.isError && activeLevelId && !tests.length && (
              <p className="rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-10 text-center text-[13px] text-[#AA8F9B]">
                {tr('Cấp này chưa có đề thi thử.')}
              </p>
            )}
            <div className="grid gap-3">
              {tests.map((test) => (
                <article key={test.mockTestId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
                  <div>
                    <h2 className="text-[16px] font-semibold">{test.title}</h2>
                    <p className="mt-1 text-[12px] text-[#967F8A]">
                      {test.jlptLevelName} · {test.timeLimitMinutes} {tr('phút')}
                    </p>
                    {test.description && <p className="mt-1 max-w-xl text-[13px] leading-6 text-[#8C7782]">{test.description}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={start.isPending}
                    onClick={() => start.mutate(test.mockTestId)}
                    className={`h-10 rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
                  >
                    {start.isPending ? tr('Đang mở đề…') : tr('Làm đề')}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {attempt && !result && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit.mutate();
            }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EADFE5] bg-white px-4 py-3">
              <p className="text-[13px] text-[#705261]">
                {tr('Đã chọn')} {answered}/{total}
                {attempt.timeLimitMinutes ? ` · ${attempt.timeLimitMinutes} ${tr('phút')}` : ''}
              </p>
              <button
                type="submit"
                disabled={submit.isPending || !total}
                className={`h-10 rounded-xl bg-[#2F6B45] px-4 text-[13px] font-medium text-white disabled:opacity-50 ${focus}`}
              >
                {submit.isPending ? tr('Đang nộp…') : tr('Nộp bài')}
              </button>
            </div>
            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.id}>
                  <h2 className="mb-2 text-[14px] font-semibold text-[#705261]">{section.title}</h2>
                  <div className="space-y-3">
                    {section.questions.map((question, index) => (
                      <article key={question.questionId} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
                        <p className="text-[12px] text-[#AA929F]">{tr('Câu')} {index + 1}</p>
                        <p className="mt-1 text-[15px] leading-7" style={jp}>{question.content}</p>
                        {question.audioUrl && <audio className="mt-3 w-full" controls src={question.audioUrl} />}
                        {question.imageUrl && <img src={question.imageUrl} alt="" className="mt-3 max-h-48 rounded-xl" />}
                        {question.options?.length ? (
                          <div className="mt-3 grid gap-2">
                            {question.options.map((option) => {
                              const selected = picks[question.questionId] === option.optionId;
                              return (
                                <button
                                  key={option.optionId}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => setPicks((current) => ({ ...current, [question.questionId]: option.optionId }))}
                                  className={`rounded-xl border px-3 py-2 text-left text-[14px] ${selected ? 'border-[#AD3155] bg-[#FCEEF3] text-[#8B2344]' : 'border-[#EADFE5] bg-[#FCFAFB]'} ${focus}`}
                                  style={jp}
                                >
                                  {option.content}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-[12px] text-[#AA8F9B]">{tr('Câu này không có đáp án trắc nghiệm để nộp.')}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </form>
        )}

        {result && (
          <section className="rounded-3xl border border-[#EADFE5] bg-white px-5 py-5">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[#2F6B45]">{result.status || tr('ĐÃ NỘP')}</p>
            <h2 className="mt-1 text-[28px] font-semibold">{Math.round(result.totalScore)} {tr('điểm')}</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {(result.sections || []).map((section) => (
                <li key={section.mockTestSectionId} className="rounded-2xl bg-[#FCFAFB] px-4 py-3">
                  <p className="text-[14px] font-medium">{section.sectionTitle}</p>
                  <p className="mt-1 text-[12px] text-[#8C7782]">
                    {section.languageSkillName} · {section.correctCount}/{section.totalCount}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/exam-result/?attemptId=${result.attemptId}`} className={`inline-flex h-10 items-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white ${focus}`}>
                {tr('Xem từng câu')}
              </Link>
              <button
                type="button"
                onClick={() => { setAttempt(null); setResult(null); setPicks({}); }}
                className={`h-10 rounded-xl border border-[#E7DAE1] px-4 text-[13px] text-[#6F5660] ${focus}`}
              >
                {tr('Chọn đề khác')}
              </button>
            </div>
          </section>
        )}
      </main>
    </LearnerShell>
  );
}
