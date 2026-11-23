import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/authContext.js';
import { getMockTestHistory } from '@/features/mock-test/api/mockTestApi.js';
import {
  examSkills,
  extractUnevaluatedSkillNotes,
  jlptLevels,
  splitPlacementScores,
  summarizeSkills,
  translateBackendSkillComment,
} from '@/features/mock-test/utils/examSkillScores.js';
import { Banner, EmptyState, SakuraLoader, Tabs } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import ExamSkillRadar from './ExamSkillRadar.jsx';
import { ExamLevelSelect, MockAttemptSelect, MockResultComparison } from './MockTestProgress.jsx';

const views = [
  ['result', 'Bài đánh giá'],
  ['placement-and-mock', 'Đánh giá và thi thử'],
  ['two-mocks', 'Hai lượt thi thử'],
];

function formatDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

function PlacementGuidance({ assessments }) {
  const { tr, trf } = useLocale();
  if (!assessments?.length) return null;
  return (
    <details className="rounded-rp-input border border-rp-line bg-rp-bg-2/60 p-3.5 text-sm">
      <summary className="cursor-pointer font-semibold text-rp-text">
        {tr('Gợi ý ôn tập theo kết quả đánh giá')}
      </summary>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {examSkills.map((skill) => {
          const assessment = assessments.find((item) => item.skillCode === skill.code);
          if (!assessment) return null;
          return (
            <li key={skill.code} className="rounded-rp-sm border border-rp-line/70 bg-rp-surface p-2.5">
              <strong className="text-rp-text">
                {tr(skill.label)}
                {assessment.recommendedStudyLevelCode &&
                  trf(' · Ôn từ {0}', { 0: assessment.recommendedStudyLevelCode })}
              </strong>
              {assessment.hasData === false ? (
                <p className="mt-0.5 text-xs text-rp-text-muted">{tr('Chưa đánh giá')}</p>
              ) : (
                <>
                  {assessment.comment && (
                    <p className="mt-0.5 text-xs text-rp-text-2">
                      {translateBackendSkillComment(assessment.comment, tr, trf)}
                    </p>
                  )}
                  {assessment.recommendation && (
                    <p className="mt-0.5 text-xs text-rp-text-muted">{tr(assessment.recommendation)}</p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function CompareAtLevel({ attempts, placementScores, placementDate, userId, level }) {
  const { tr, trf } = useLocale();
  const [selectedId, setSelectedId] = useState(null);
  const latest = attempts[0];
  const choices = placementScores ? attempts : attempts.slice(1);
  const selected = choices.find((item) => item.attemptId === selectedId) ?? choices[0];
  if (!selected) {
    return (
      <EmptyState
        variant="inline"
        size="sm"
        illustration="certificate"
        title={
          placementScores
            ? trf('Cần ít nhất một lượt thi thử {0} đã nộp.', { 0: level })
            : trf('Cần ít nhất hai lượt thi thử {0} đã nộp.', { 0: level })
        }
        action={
          <Link to="/mock-tests/" className="rp-focus rp-link rounded-sm text-xs font-semibold">
            {tr('Chọn đề thi thử')}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <MockAttemptSelect
          label={placementScores ? tr('Lượt thi thử để đối chiếu') : tr('Lượt thi thử làm mốc')}
          attempts={choices}
          value={selected.attemptId}
          onChange={setSelectedId}
        />
        {placementScores && placementDate && (
          <p className="rounded-rp-input border border-rp-line bg-rp-bg-2 p-2.5 text-sm">
            <strong className="block text-rp-text">{trf('Bài đánh giá {0}', { 0: level })}</strong>
            <span className="text-rp-text-2">{formatDate(placementDate)}</span>
          </p>
        )}
        {!placementScores && (
          <p className="rounded-rp-input border border-rp-line bg-rp-bg-2 p-2.5 text-sm">
            <strong className="block text-rp-text">{tr('Lượt thi thử mới nhất')}</strong>
            <span className="text-rp-text-2">
              {formatDate(latest.submittedAt)} · {tr(latest.title)}
            </span>
          </p>
        )}
      </div>
      <MockResultComparison
        userId={userId}
        baseline={
          placementScores
            ? { label: trf('Đánh giá {0}', { 0: level }), scores: placementScores }
            : { label: tr('Lượt đã chọn'), attemptId: selected.attemptId }
        }
        compared={
          placementScores
            ? { label: trf('Thi thử {0}', { 0: level }), attemptId: selected.attemptId }
            : { label: tr('Lượt mới nhất'), attemptId: latest.attemptId }
        }
      />
    </>
  );
}

function ComparisonView({ attempts, placementScores, placementDate, targetLevel, userId }) {
  const { tr } = useLocale();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const levels = placementScores
    ? Object.keys(placementScores)
    : jlptLevels.filter((level) => level === targetLevel || attempts.some((item) => item.jlptLevelName === level));
  const enoughAttempts = (level) =>
    attempts.filter((item) => item.jlptLevelName === level).length >= (placementScores ? 1 : 2);
  const level = levels.includes(selectedLevel)
    ? selectedLevel
    : (levels.includes(targetLevel) && enoughAttempts(targetLevel) ? targetLevel : levels.find(enoughAttempts)) ??
      (levels.includes(targetLevel) ? targetLevel : levels[0]);

  if (!level) {
    return (
      <EmptyState
        variant="inline"
        size="sm"
        illustration="chart"
        title={
          placementScores
            ? tr('Bài này chưa có điểm kỹ năng theo cấp JLPT để đối chiếu.')
            : tr('Chưa có lượt thi thử để đối chiếu.')
        }
      />
    );
  }

  return (
    <>
      <div className="max-w-40">
        <ExamLevelSelect levels={levels} value={level} onChange={setSelectedLevel} />
      </div>
      <CompareAtLevel
        key={level}
        attempts={attempts.filter((item) => item.jlptLevelName === level)}
        placementScores={placementScores?.[level]}
        placementDate={placementDate}
        userId={userId}
        level={level}
      />
    </>
  );
}

export default function SkillAssessmentChart({ result, targetLevel, visibleLevels, animate = false }) {
  const { tr } = useLocale();
  const { user } = useAuth();
  const [view, setView] = useState('result');
  const compare = view !== 'result';
  const history = useQuery({
    queryKey: ['mock-test-history', user?.userId],
    queryFn: getMockTestHistory,
    enabled: compare,
    retry: false,
  });
  const scoresByLevel = splitPlacementScores(result);
  const unevaluatedNotes = extractUnevaluatedSkillNotes(result?.sections, result?.skillAssessments);
  const observed = Object.keys(scoresByLevel);
  const adjacent = visibleLevels?.filter((level) => scoresByLevel[level]) ?? [];
  const levels = adjacent.length ? adjacent : observed.slice(-2);
  let series = levels.length
    ? levels.map((level) => ({ label: level, scores: scoresByLevel[level] }))
    : [{ label: tr('Bài đánh giá'), scores: summarizeSkills(result?.sections, result?.skillAssessments) }];

  if (!levels.length && Object.keys(series[0].scores).length === 0 && Array.isArray(result?.skillAssessments)) {
    const fallbackScores = {};
    for (const item of result.skillAssessments) {
      if (item?.hasData && Number.isFinite(Number(item?.totalCount)) && Number(item.totalCount) > 0 && item?.skillCode) {
        fallbackScores[item.skillCode] = {
          correct: BigInt(Math.round(Number(item.correctCount) || 0)),
          count: BigInt(Math.round(Number(item.totalCount))),
        };
      }
    }
    series = [{ label: tr('Bài đánh giá'), scores: fallbackScores }];
  }

  return (
    <section
      aria-labelledby="assessment-radar-title"
      className="min-w-0 space-y-4 rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-card sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="assessment-radar-title" className="text-base font-bold text-rp-text">
            {tr('Phân tích kỹ năng')}
          </h3>
          <p className="text-xs text-rp-text-muted">
            {tr('So sánh tỷ lệ câu đúng và trạng thái từng kỹ năng theo cấp độ đã đánh giá.')}
          </p>
        </div>
        <Tabs
          variant="pill"
          className="flex-wrap"
          label={tr('Dữ liệu trên biểu đồ radar')}
          value={view}
          onChange={setView}
          tabs={views.map(([id, label]) => ({ value: id, label: tr(label) }))}
        />
      </div>
      {!compare && (
        <>
          <ExamSkillRadar series={series} unevaluatedNotes={unevaluatedNotes} animate={animate} />
          <PlacementGuidance assessments={result.skillAssessments} />
        </>
      )}
      {compare && history.isPending && <SakuraLoader variant="section" context="mocktest" delay={160} />}
      {compare && history.isError && (
        <Banner tone="danger">
          <span>{tr('Không tải được lịch sử thi thử.')}</span>{' '}
          <button type="button" onClick={() => history.refetch()} className="rp-link font-semibold">
            {tr('Thử lại')}
          </button>
        </Banner>
      )}
      {compare && history.isSuccess && (
        <ComparisonView
          key={view}
          attempts={history.data}
          targetLevel={targetLevel}
          placementScores={view === 'placement-and-mock' ? scoresByLevel : null}
          placementDate={result.submittedAt ?? result.startedAt}
          userId={user?.userId}
        />
      )}
    </section>
  );
}
