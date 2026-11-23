import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { getMockTestAttempt } from '@/features/mock-test/api/mockTestApi.js';
import { jlptLevels, summarizeSkills } from '@/features/mock-test/utils/examSkillScores.js';
import { Button, Card, CustomSelect, EmptyState, SakuraLoader } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import ExamSkillRadar from './ExamSkillRadar.jsx';

function formatAttemptDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

export function ExamLevelSelect({ levels, value, onChange }) {
  const { tr } = useLocale();
  const options = levels.map((code) => ({ value: code, label: code }));
  return (
    <div className="min-w-[120px] space-y-1">
      <span className="block text-xs font-semibold text-rp-text-muted">{tr('Cấp JLPT')}</span>
      <CustomSelect size="sm" value={value} onChange={onChange} options={options} aria-label={tr('Cấp JLPT')} />
    </div>
  );
}

export function MockAttemptSelect({ label, attempts, value, onChange }) {
  const { tr } = useLocale();
  const options = attempts.map((attempt) => ({
    value: String(attempt.attemptId),
    label: `${formatAttemptDate(attempt.submittedAt)} · ${tr(attempt.title)}`,
  }));
  return (
    <div className="min-w-0 space-y-1">
      <span className="block text-xs font-semibold text-rp-text-muted">{tr(label)}</span>
      <CustomSelect
        size="sm"
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
        options={options}
        aria-label={tr(label)}
      />
    </div>
  );
}

export function MockResultComparison({ userId, baseline, compared }) {
  const { tr } = useLocale();
  const sources = [baseline, compared];
  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: ['mock-test-progress-result', userId, source.attemptId],
      queryFn: ({ signal }) => getMockTestAttempt(source.attemptId, { signal }),
      enabled: source.attemptId != null,
      staleTime: Infinity,
      retry: false,
    })),
  });
  const failed = results.filter((result) => result.isError);
  if (failed.length > 0) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-rp-brand-strong">
        <span>{tr('Không tải được điểm để so sánh.')}</span>
        <Button size="sm" variant="ghost" onClick={() => failed.forEach((result) => result.refetch())}>
          {tr('Thử lại')}
        </Button>
      </div>
    );
  }
  if (sources.some((source, index) => source.attemptId != null && results[index].isPending)) {
    return <SakuraLoader variant="section" context="mocktest" delay={160} />;
  }

  return (
    <>
      <ExamSkillRadar
        series={sources.map((source, index) => ({
          label: source.label,
          scores: source.scores ?? summarizeSkills(results[index].data?.sections),
        }))}
        compare
      />
      <p className="text-xs text-rp-text-2">
        {tr('Tỷ lệ tính từ số câu đúng và tổng số câu mỗi kỹ năng. Điểm có thể thay đổi theo độ khó và số câu của từng đề.')}
      </p>
    </>
  );
}

function CompareAttempts({ attempts, userId }) {
  const { tr } = useLocale();
  const [beforeId, setBeforeId] = useState(null);
  const [afterId, setAfterId] = useState(null);
  const selectedAfter = attempts.findIndex((attempt) => attempt.attemptId === afterId);
  const afterIndex = selectedAfter > 0 ? selectedAfter : attempts.length - 1;
  const selectedBefore = attempts.findIndex((attempt) => attempt.attemptId === beforeId);
  const beforeIndex = selectedBefore >= 0 && selectedBefore < afterIndex ? selectedBefore : 0;
  const before = attempts[beforeIndex];
  const after = attempts[afterIndex];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <MockAttemptSelect
          label={tr('Trước ôn luyện')}
          attempts={attempts.slice(0, afterIndex)}
          value={before.attemptId}
          onChange={setBeforeId}
        />
        <MockAttemptSelect
          label={tr('Sau ôn luyện')}
          attempts={attempts.slice(beforeIndex + 1).reverse()}
          value={after.attemptId}
          onChange={setAfterId}
        />
      </div>
      <MockResultComparison
        userId={userId}
        baseline={{ label: tr('Trước ôn luyện'), attemptId: before.attemptId }}
        compared={{ label: tr('Sau ôn luyện'), attemptId: after.attemptId }}
      />
    </>
  );
}

export default function MockTestProgress({ attempts, userId }) {
  const { tr } = useLocale();
  const [selectedLevel, setSelectedLevel] = useState(null);
  const availableLevels = jlptLevels.filter((level) =>
    attempts.some((attempt) => attempt.jlptLevelName === level),
  );
  const levelsWithPairs = availableLevels.filter(
    (level) => attempts.filter((attempt) => attempt.jlptLevelName === level).length >= 2,
  );
  const level = availableLevels.includes(selectedLevel)
    ? selectedLevel
    : attempts.find((attempt) => levelsWithPairs.includes(attempt.jlptLevelName))?.jlptLevelName ??
      availableLevels[0];
  const comparable = attempts.filter((attempt) => attempt.jlptLevelName === level).reverse();

  return (
    <Card
      aria-labelledby="mock-test-progress-title"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mock-test-progress-title" className="text-lg font-bold text-rp-text">
            {tr('Tiến bộ sau ôn luyện')}
          </h2>
          <p className="mt-1 text-sm text-rp-text-2">
            {tr('So sánh tỷ lệ câu đúng theo kỹ năng của hai lượt thi cùng cấp JLPT.')}
          </p>
        </div>
        {level && <ExamLevelSelect levels={availableLevels} value={level} onChange={setSelectedLevel} />}
      </div>
      {comparable.length >= 2 ? (
        <CompareAttempts key={level} attempts={comparable} userId={userId} />
      ) : (
        <EmptyState
          variant="inline"
          size="sm"
          illustration="certificate"
          title={`${tr('Cần ít nhất hai lượt thi thử')} ${level || tr('cùng cấp')} ${tr('đã nộp để so sánh.')}`}
          action={
            <Link to="/mock-tests/" className="rp-focus rp-link text-xs font-semibold">
              {tr('Chọn đề thi thử')}
            </Link>
          }
        />
      )}
    </Card>
  );
}
