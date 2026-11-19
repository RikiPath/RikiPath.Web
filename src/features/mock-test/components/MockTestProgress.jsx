import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getMockTestAttempt } from '@/features/mock-test/api/mockTestApi.js';
import { jlptLevels, summarizeSkills } from '@/features/mock-test/utils/examSkillScores.js';
import { SakuraLoader } from '@/components/ui';
import ExamSkillRadar from './ExamSkillRadar.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const date = { format: (v) => new Intl.DateTimeFormat(currentIntlTag(), {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
}).format(v) };
const input = 'mt-1 block w-full rounded-lg border border-rp-line bg-white p-2.5 text-sm font-normal focus-visible:outline-2 focus-visible:outline-rp-brand-strong';

export function ExamLevelSelect({ levels, value, onChange }) {
  const { tr } = useLocale();
  return <label className="min-w-0 text-sm font-semibold">
    {tr('Cấp JLPT')}
    <select className={input} value={value} onChange={event => onChange(event.target.value)}>
      {levels.map(code => <option key={code} value={code}>{code}</option>)}
    </select>
  </label>;
}

export function MockAttemptSelect({ label, attempts, value, onChange }) {
  const { tr } = useLocale();
  return <label className="min-w-0 text-sm font-semibold">
    {tr(label)}
    <select className={input} value={value} onChange={event => onChange(Number(event.target.value))}>
      {attempts.map(attempt => <option key={attempt.attemptId} value={attempt.attemptId}>
        {date.format(new Date(attempt.submittedAt))} · {tr(attempt.title)}
      </option>)}
    </select>
  </label>;
}

export function MockResultComparison({ userId, baseline, compared }) {
  const { tr } = useLocale();
  const sources = [baseline, compared];
  const results = useQueries({ queries: sources.map(source => ({
    queryKey: ['mock-test-progress-result', userId, source.attemptId],
    queryFn: ({ signal }) => getMockTestAttempt(source.attemptId, { signal }),
    enabled: source.attemptId != null,
    staleTime: Infinity,
    retry: false,
  })) });
  const failed = results.filter(result => result.isError);
  if (failed.length > 0) return <div role="alert" className="text-sm text-rp-brand-strong">
    {tr('Không tải được điểm để so sánh.')}{' '}
    <button type="button" className="font-semibold underline" onClick={() => failed.forEach(result => result.refetch())}>{tr('Thử lại')}</button>
  </div>;
  if (sources.some((source, index) => source.attemptId != null && results[index].isPending)) {
    return <SakuraLoader variant="section" context="mocktest" delay={160} />;
  }

  return <>
    <ExamSkillRadar series={sources.map((source, index) => ({
      label: source.label, scores: source.scores ?? summarizeSkills(results[index].data?.sections),
    }))} compare />
    <p className="text-xs text-rp-text-2">{tr('Tỷ lệ tính từ số câu đúng và tổng số câu mỗi kỹ năng. Điểm có thể thay đổi theo độ khó và số câu của từng đề.')}</p>
  </>;
}

function CompareAttempts({ attempts, userId }) {
  const { tr } = useLocale();
  const [beforeId, setBeforeId] = useState(null);
  const [afterId, setAfterId] = useState(null);
  const selectedAfter = attempts.findIndex(attempt => attempt.attemptId === afterId);
  const afterIndex = selectedAfter > 0 ? selectedAfter : attempts.length - 1;
  const selectedBefore = attempts.findIndex(attempt => attempt.attemptId === beforeId);
  const beforeIndex = selectedBefore >= 0 && selectedBefore < afterIndex ? selectedBefore : 0;
  const before = attempts[beforeIndex];
  const after = attempts[afterIndex];

  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <MockAttemptSelect label={tr('Trước ôn luyện')} attempts={attempts.slice(0, afterIndex)} value={before.attemptId} onChange={setBeforeId} />
      <MockAttemptSelect label={tr('Sau ôn luyện')} attempts={attempts.slice(beforeIndex + 1).reverse()} value={after.attemptId} onChange={setAfterId} />
    </div>
    <MockResultComparison userId={userId} baseline={{ label: 'Trước ôn luyện', attemptId: before.attemptId }}
      compared={{ label: 'Sau ôn luyện', attemptId: after.attemptId }} />
  </>;
}

export default function MockTestProgress({ attempts, userId }) {
  const { tr } = useLocale();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const availableLevels = jlptLevels.filter(level => attempts.some(attempt => attempt.jlptLevelName === level));
  const levelsWithPairs = availableLevels.filter(level => attempts.filter(attempt => attempt.jlptLevelName === level).length >= 2);
  const level = availableLevels.includes(selectedLevel) ? selectedLevel
    : attempts.find(attempt => levelsWithPairs.includes(attempt.jlptLevelName))?.jlptLevelName ?? availableLevels[0];
  const comparable = attempts.filter(attempt => attempt.jlptLevelName === level).reverse();

  return <section aria-labelledby="mock-test-progress-title" className="space-y-4 rounded-xl border border-rp-line bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="mock-test-progress-title" className="text-lg font-bold">{tr('Tiến bộ sau ôn luyện')}</h2>
        <p className="mt-1 text-sm text-rp-text-2">{tr('So sánh tỷ lệ câu đúng theo kỹ năng của hai lượt thi cùng cấp JLPT.')}</p>
      </div>
      {level && <ExamLevelSelect levels={availableLevels} value={level} onChange={setSelectedLevel} />}
    </div>
    {comparable.length >= 2 ? <CompareAttempts key={level} attempts={comparable} userId={userId} />
      : <p className="rounded-lg bg-rp-brand-tint px-3 py-2.5 text-sm text-rp-text-2">
        {tr('Cần ít nhất hai lượt thi thử')}{' '}{level || tr('cùng cấp')}{' '}{tr('đã nộp để so sánh.')}
      </p>}
  </section>;
}
