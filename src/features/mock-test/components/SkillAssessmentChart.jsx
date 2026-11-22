import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getMockTestHistory } from '@/features/mock-test/api/mockTestApi.js';
import { examSkills, jlptLevels, splitPlacementScores, summarizeSkills } from '@/features/mock-test/utils/examSkillScores.js';
import { SakuraLoader } from '@/components/ui';
import ExamSkillRadar from './ExamSkillRadar.jsx';
import { ExamLevelSelect, MockAttemptSelect, MockResultComparison } from './MockTestProgress.jsx';
import { useLocale, currentIntlTag } from '@/locales/locale.js';

const views = [
  ['result', 'Bài đánh giá'],
  ['placement-and-mock', 'Đánh giá và thi thử'],
  ['two-mocks', 'Hai lượt thi thử'],
];
const date = { format: (v) => new Intl.DateTimeFormat(currentIntlTag(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(v) };

function PlacementGuidance({ assessments }) {
  const { tr } = useLocale();
  if (!assessments?.length) return null;
  return <details className="rounded-lg bg-rp-brand-tint p-3 text-sm">
    <summary className="cursor-pointer font-semibold">{tr('Gợi ý ôn tập theo kết quả đánh giá')}</summary>
    <ul className="mt-3 space-y-3">
      {examSkills.map(skill => {
        const assessment = assessments.find(item => item.skillCode === skill.code);
        if (!assessment) return null;
        return <li key={skill.code}>
          <strong>{tr(skill.label)}{assessment.recommendedStudyLevelCode && ' · Ôn từ ' + assessment.recommendedStudyLevelCode}</strong>
          {assessment.comment && <p>{assessment.comment}</p>}
          {assessment.recommendation && <p>{assessment.recommendation}</p>}
        </li>;
      })}
    </ul>
  </details>;
}

function CompareAtLevel({ attempts, placementScores, placementDate, userId, level }) {
  const { tr, trf } = useLocale();
  const [selectedId, setSelectedId] = useState(null);
  const latest = attempts[0];
  const choices = placementScores ? attempts : attempts.slice(1);
  const selected = choices.find(item => item.attemptId === selectedId) ?? choices[0];
  if (!selected) return <p className="rounded-lg bg-rp-brand-tint p-3 text-sm text-rp-text-2">
    {placementScores ? trf('Cần ít nhất một lượt thi thử {0} đã nộp.', { 0: level }) : trf('Cần ít nhất hai lượt thi thử {0} đã nộp.', { 0: level })}
    {' '}<Link to="/mock-tests/" className="rp-focus rp-link rounded-sm">{tr('Chọn đề thi thử')}</Link>
  </p>;

  return <>
    <div className="grid items-end gap-3 sm:grid-cols-2">
      <MockAttemptSelect label={placementScores ? tr('Lượt thi thử để đối chiếu') : tr('Lượt thi thử làm mốc')}
        attempts={choices} value={selected.attemptId} onChange={setSelectedId} />
      {placementScores && placementDate && <p className="rounded-lg bg-rp-brand-tint p-2.5 text-sm">
        <strong className="block">{trf('Bài đánh giá {0}', { 0: level })}</strong>
        {date.format(new Date(placementDate))}
      </p>}
      {!placementScores && <p className="rounded-lg bg-rp-brand-tint p-2.5 text-sm">
        <strong className="block">{tr('Lượt thi thử mới nhất')}</strong>
        {date.format(new Date(latest.submittedAt))} · {tr(latest.title)}
      </p>}
    </div>
    <MockResultComparison userId={userId}
      baseline={placementScores ? { label: 'Đánh giá ' + level, scores: placementScores }
        : { label: 'Lượt đã chọn', attemptId: selected.attemptId }}
      compared={placementScores ? { label: 'Thi thử ' + level, attemptId: selected.attemptId }
        : { label: 'Lượt mới nhất', attemptId: latest.attemptId }} />
  </>;
}

function ComparisonView({ attempts, placementScores, placementDate, targetLevel, userId }) {
  const { tr } = useLocale();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const levels = placementScores ? Object.keys(placementScores)
    : jlptLevels.filter(level => level === targetLevel || attempts.some(item => item.jlptLevelName === level));
  const enoughAttempts = level => attempts.filter(item => item.jlptLevelName === level).length >= (placementScores ? 1 : 2);
  const level = levels.includes(selectedLevel) ? selectedLevel
    : (levels.includes(targetLevel) && enoughAttempts(targetLevel) ? targetLevel : levels.find(enoughAttempts))
      ?? (levels.includes(targetLevel) ? targetLevel : levels[0]);

  if (!level) return <p className="text-sm text-rp-text-2">
    {placementScores ? tr('Bài này chưa có điểm kỹ năng theo cấp JLPT để đối chiếu.') : tr('Chưa có lượt thi thử để đối chiếu.')}
  </p>;

  return <>
    <div className="max-w-40"><ExamLevelSelect levels={levels} value={level} onChange={setSelectedLevel} /></div>
    <CompareAtLevel key={level} attempts={attempts.filter(item => item.jlptLevelName === level)}
      placementScores={placementScores?.[level]} placementDate={placementDate} userId={userId} level={level} />
  </>;
}

export default function SkillAssessmentChart({ result, targetLevel, visibleLevels }) {
  const { tr } = useLocale();
  const { user } = useAuth();
  const [view, setView] = useState('result');
  const compare = view !== 'result';
  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId], queryFn: getMockTestHistory, enabled: compare, retry: false,
  });
  const scoresByLevel = splitPlacementScores(result);
  const observed = Object.keys(scoresByLevel);
  const adjacent = visibleLevels?.filter(level => scoresByLevel[level]) ?? [];
  const levels = adjacent.length ? adjacent : observed.slice(-2);
  const series = levels.length ? levels.map(level => ({ label: level, scores: scoresByLevel[level] }))
    : [{ label: 'Bài đánh giá', scores: summarizeSkills(result.sections) }];

  return <section aria-labelledby="assessment-radar-title" className="mt-4 space-y-3 rounded-xl border border-rp-line bg-white p-3 wrap-anywhere sm:p-4">
    <h3 id="assessment-radar-title" className="font-semibold">{tr('Kết quả theo kỹ năng')}</h3>
    <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Dữ liệu trên biểu đồ radar')}>
      {views.map(([id, label]) => <button type="button" key={id} aria-pressed={view === id}
        className={'min-w-0 max-w-full rounded-lg border px-3 py-2 text-sm ' + (view === id ? 'border-rp-brand-strong bg-rp-brand-tint font-semibold text-rp-brand-strong' : 'border-rp-line')}
        onClick={() => setView(id)}>{tr(label)}</button>)}
    </div>
    {!compare && <>
      <ExamSkillRadar series={series} />
      <PlacementGuidance assessments={result.skillAssessments} />
    </>}
    {compare && history.isPending && <SakuraLoader variant="section" context="mocktest" delay={160} />}
    {compare && history.isError && <p role="alert" className="text-sm text-rp-brand-strong">
      {tr('Không tải được lịch sử thi thử.')}{' '}<button type="button" onClick={() => history.refetch()} className="font-semibold underline">{tr('Thử lại')}</button>
    </p>}
    {compare && history.isSuccess && <ComparisonView key={view} attempts={history.data} targetLevel={targetLevel}
      placementScores={view === 'placement-and-mock' ? scoresByLevel : null} placementDate={result.submittedAt ?? result.startedAt}
      userId={user?.userId} />}
  </section>;
}
