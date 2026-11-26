import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Layers,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { getMockTestAttempt } from '@/features/mock-test/api/mockTestApi.js';
import { getPlacementResult } from '@/features/placement/api/placementApi.js';
import {
  jlptLevels,
  splitPlacementScores,
  summarizeSkills,
} from '@/features/mock-test/utils/examSkillScores.js';
import {
  formatDurationSeconds,
  formatPercentage,
  formatScaleScore,
  isPracticeKind,
  resolveMockResultDisplay,
  resolvePracticeResultDisplay,
} from '@/features/mock-test/utils/practiceStatusHelpers.js';
import { Badge, Button, Card, CustomSelect, EmptyState, SakuraLoader, cx } from '@/components/ui';
import { currentIntlTag, useLocale } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import ExamSkillRadar from './ExamSkillRadar.jsx';

function formatAttemptDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

function classifyGroupKey(examKind) {
  const k = String(examKind || '').toLowerCase();
  if (k === 'placement') return 'PLACEMENT';
  if (isPracticeKind(k)) return 'PRACTICE';
  return 'MOCK';
}

function attemptKindLabel(groupKey, tr) {
  if (groupKey === 'PRACTICE') return tr('Luyện tập');
  if (groupKey === 'PLACEMENT') return tr('Đánh giá');
  return tr('Thi thử');
}

function formatAttemptOptionScore(attempt, tr) {
  const groupKey = classifyGroupKey(attempt.examKind);
  if (groupKey === 'PRACTICE') {
    const p = resolvePracticeResultDisplay(attempt, tr);
    return p.isValid ? `${formatScaleScore(p.score10)}/10` : formatPercentage(p.accuracyPct);
  }
  if (groupKey === 'MOCK') {
    const m = resolveMockResultDisplay(attempt, tr);
    return m.isValid ? `${formatScaleScore(m.score180, 0)}/${m.max180}` : formatPercentage(m.accuracyPct);
  }
  return `${Math.round(Number(attempt.totalScore || 0))}%`;
}

export function ExamLevelSelect({ levels, value, onChange }) {
  const { tr } = useLocale();
  const options = levels.map((code) => ({ value: code, label: code }));
  return (
    <div className="min-w-[116px] space-y-1">
      <span className="block text-[11px] font-semibold text-rp-text-muted">{tr('Cấp JLPT')}</span>
      <CustomSelect size="md" value={value} onChange={onChange} options={options} aria-label={tr('Cấp JLPT')} />
    </div>
  );
}

export function MockAttemptSelect({ label, attempts, value, onChange }) {
  const { tr } = useLocale();
  const options = attempts.map((attempt) => {
    const gKey = classifyGroupKey(attempt.examKind);
    return {
      value: String(attempt.attemptId),
      label: `[${attemptKindLabel(gKey, tr)}] ${tr(attempt.title)} · ${formatAttemptDate(attempt.submittedAt)} · ${formatAttemptOptionScore(attempt, tr)}`,
    };
  });
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <span className="block text-[11px] font-semibold text-rp-text-muted">{tr(label)}</span>
      <CustomSelect
        size="md"
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
        options={options}
        aria-label={tr(label)}
      />
    </div>
  );
}

function resolveScoresFromPayload(payload, examKind, levelCode) {
  if (!payload) return null;
  if (String(examKind || '').toLowerCase() === 'placement') {
    const split = splitPlacementScores(payload);
    if (levelCode && split[levelCode]) return split[levelCode];
    const firstKey = Object.keys(split)[0];
    return firstKey ? split[firstKey] : summarizeSkills(payload.sections);
  }
  return summarizeSkills(payload.sections);
}

function SummaryAttemptCard({ roleLabel, attempt, accentClass, tr, trf }) {
  const groupKey = classifyGroupKey(attempt.examKind);
  const practice = groupKey === 'PRACTICE' ? resolvePracticeResultDisplay(attempt, tr) : null;
  const mock = groupKey === 'MOCK' ? resolveMockResultDisplay(attempt, tr) : null;
  const durationStr = formatDurationSeconds(attempt.durationSeconds, trf);

  return (
    <Card className={cx('space-y-2.5 border p-4', accentClass)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge tone="neutral" size="sm" icon={false}>{tr(roleLabel)}</Badge>
          <Badge tone={groupKey === 'PRACTICE' ? 'info' : groupKey === 'PLACEMENT' ? 'brand' : 'neutral'} size="sm" icon={false}>
            {attemptKindLabel(groupKey, tr)}
          </Badge>
        </div>
        <span className="text-xs text-rp-text-muted">{formatAttemptDate(attempt.submittedAt)}</span>
      </div>

      <div>
        <h3 className="line-clamp-1 text-sm font-bold text-rp-text">{tr(attempt.title)}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          {practice ? (
            <>
              <span className={cx('text-2xl font-extrabold tabular-nums', practice.classes.scoreText)}>
                {practice.isValid ? `${formatScaleScore(practice.score10)}/10` : formatPercentage(practice.accuracyPct)}
              </span>
              <Badge tone={practice.classes.badgeTone} size="sm" icon={false}>{practice.bandLabel}</Badge>
            </>
          ) : mock ? (
            <>
              <span className={cx('text-2xl font-extrabold tabular-nums', mock.classes.scoreText)}>
                {mock.isValid ? `${formatScaleScore(mock.score180, 0)}/${mock.max180}` : formatPercentage(mock.accuracyPct)}
              </span>
              {mock.passStatusLabel && (
                <Badge tone={mock.classes.badgeTone} size="sm" icon={false}>{mock.passStatusLabel}</Badge>
              )}
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-rp-brand-strong">
                {Math.round(Number(attempt.totalScore || 0))}%
              </span>
              {attempt.assessedJlptLevelName && (
                <Badge tone="brand" size="sm" icon={false}>{attempt.assessedJlptLevelName}</Badge>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rp-line/60 pt-2 text-xs text-rp-text-2 tabular-nums">
        <span className="text-emerald-700 font-semibold">{tr('Đúng')}: {attempt.correctCount ?? 0}</span>
        <span className="text-rose-700 font-semibold">{tr('Sai')}: {attempt.wrongCount ?? 0}</span>
        <span className="text-rp-text-muted">{tr('Bỏ trống')}: {attempt.blankCount ?? 0}</span>
        {durationStr && (
          <span className="inline-flex items-center gap-1 text-rp-text-muted">
            <Clock aria-hidden="true" className="h-3 w-3" />
            {durationStr}
          </span>
        )}
      </div>
    </Card>
  );
}

function buildQuickInsights({ baselineAttempt, comparedAttempt, baseScores, compScores, compatibleScale, tr, trf }) {
  if (!baseScores || !compScores) return [];
  const skills = [
    { code: 'Vocabulary', label: 'Từ vựng' },
    { code: 'Kanji', label: 'Kanji' },
    { code: 'Grammar', label: 'Ngữ pháp' },
    { code: 'Reading', label: 'Đọc hiểu' },
    { code: 'Listening', label: 'Nghe hiểu' },
  ];

  const insights = [];
  let bestGain = null;
  let prioritySkill = null;
  const missingSkills = [];

  for (const sk of skills) {
    const a = baseScores[sk.code];
    const b = compScores[sk.code];
    const aValid = a && Number(a.count) > 0;
    const bValid = b && Number(b.count) > 0;
    if (!aValid || !bValid) {
      if (aValid || bValid) missingSkills.push(tr(sk.label));
      continue;
    }
    const aPct = Math.round((Number(a.correct) * 100) / Number(a.count));
    const bPct = Math.round((Number(b.correct) * 100) / Number(b.count));
    const diff = bPct - aPct;
    if (!bestGain || diff > bestGain.diff) bestGain = { label: tr(sk.label), diff, aPct, bPct };
    if (!prioritySkill || bPct < prioritySkill.bPct) prioritySkill = { label: tr(sk.label), bPct, diff };
  }

  const sameExam = baselineAttempt.mockTestId && comparedAttempt.mockTestId && baselineAttempt.mockTestId === comparedAttempt.mockTestId;

  if (bestGain && bestGain.diff > 0) {
    insights.push({
      tone: 'success',
      Icon: TrendingUp,
      text: trf('{0} cải thiện rõ nhất (+{1} điểm % so với lượt trước).', { 0: bestGain.label, 1: bestGain.diff }),
    });
  } else if (bestGain && bestGain.diff === 0) {
    insights.push({
      tone: 'neutral',
      Icon: Minus,
      text: trf('{0} giữ mức ổn định ({1}%).', { 0: bestGain.label, 1: bestGain.bPct }),
    });
  }

  if (prioritySkill && prioritySkill.bPct < 70) {
    insights.push({
      tone: 'warning',
      Icon: prioritySkill.diff < 0 ? TrendingDown : AlertTriangle,
      text: compatibleScale && sameExam
        ? trf('{0} đang ở mức {1}% — nên ưu tiên ôn luyện thêm.', { 0: prioritySkill.label, 1: prioritySkill.bPct })
        : trf('Tỷ lệ ở phần {0} là {1}%. Do hai bài khác đề/cấu trúc, kết quả chỉ mang tính tham khảo.', {
          0: prioritySkill.label,
          1: prioritySkill.bPct,
        }),
    });
  }

  if (missingSkills.length > 0) {
    insights.push({
      tone: 'neutral',
      Icon: CheckCircle2,
      text: trf('Chưa đủ dữ liệu chung ở: {0}.', { 0: missingSkills.join(', ') }),
    });
  }

  return insights;
}

export function MockResultComparison({ userId, baseline, compared, baselineAttempt, comparedAttempt, levelCode }) {
  const { tr, trf } = useLocale();
  const sources = [baseline, compared];
  const results = useQueries({
    queries: sources.map((source) => {
      const isPlacement = String(source.examKind || '').toLowerCase() === 'placement';
      return {
        queryKey: ['mock-test-progress-result', userId, source.attemptId, isPlacement ? 'placement' : 'mock'],
        queryFn: ({ signal }) => (isPlacement
          ? getPlacementResult(source.attemptId)
          : getMockTestAttempt(source.attemptId, { signal })),
        enabled: source.attemptId != null,
        staleTime: Infinity,
        retry: false,
      };
    }),
  });

  const failed = results.filter((result) => result.isError);
  if (failed.length > 0) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-rp-danger-line bg-rp-danger-bg px-3.5 py-2.5 text-sm text-rp-danger">
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

  const baseScores = baseline.scores ?? resolveScoresFromPayload(results[0].data, baseline.examKind, levelCode);
  const compScores = compared.scores ?? resolveScoresFromPayload(results[1].data, compared.examKind, levelCode);

  const baseGroup = baselineAttempt ? classifyGroupKey(baselineAttempt.examKind) : 'MOCK';
  const compGroup = comparedAttempt ? classifyGroupKey(comparedAttempt.examKind) : 'MOCK';
  const compatibleScale = baseGroup === compGroup && baseGroup !== 'PLACEMENT';

  // Compute comparable score diff ONLY when both attempts use the exact same scoring model!
  let scoreDiffBadge = null;
  if (compatibleScale && baselineAttempt && comparedAttempt) {
    if (baseGroup === 'PRACTICE') {
      const p1 = resolvePracticeResultDisplay(baselineAttempt, tr);
      const p2 = resolvePracticeResultDisplay(comparedAttempt, tr);
      if (p1.isValid && p2.isValid) {
        const d = Math.round((p2.score10 - p1.score10) * 100) / 100;
        const sign = d > 0 ? '+' : '';
        scoreDiffBadge = {
          text: d === 0 ? tr('Không đổi (0 điểm)') : `${sign}${formatScaleScore(d)} ${tr('điểm')}`,
          tone: d > 0 ? 'success' : d < 0 ? 'danger' : 'neutral',
        };
      }
    } else if (baseGroup === 'MOCK') {
      const m1 = resolveMockResultDisplay(baselineAttempt, tr);
      const m2 = resolveMockResultDisplay(comparedAttempt, tr);
      if (m1.isValid && m2.isValid) {
        const d = Math.round(m2.score180 - m1.score180);
        const sign = d > 0 ? '+' : '';
        scoreDiffBadge = {
          text: d === 0 ? tr('Không đổi (0 điểm)') : `${sign}${d} ${tr('điểm')}`,
          tone: d > 0 ? 'success' : d < 0 ? 'danger' : 'neutral',
        };
      }
    }
  }

  const insights = baselineAttempt && comparedAttempt
    ? buildQuickInsights({ baselineAttempt, comparedAttempt, baseScores, compScores, compatibleScale, tr, trf })
    : [];

  return (
    <div className="space-y-4">
      {baselineAttempt && comparedAttempt && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2/70 px-3.5 py-2 text-xs">
            <span className="font-medium text-rp-text-2">
              {compatibleScale
                ? tr('Cùng thang điểm — đối chiếu trực tiếp kết quả và kỹ năng chung.')
                : tr('Hai bài thuộc loại đề hoặc thang điểm khác nhau — chỉ đối chiếu tỷ lệ ở kỹ năng chung để tham khảo.')}
            </span>
            {scoreDiffBadge && (
              <Badge tone={scoreDiffBadge.tone} size="sm" icon={false}>
                {tr('Thay đổi:')}{' '}{scoreDiffBadge.text}
              </Badge>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SummaryAttemptCard
              roleLabel="Lượt làm trước"
              attempt={baselineAttempt}
              accentClass="border-amber-200/90 bg-amber-50/35"
              tr={tr}
              trf={trf}
            />
            <SummaryAttemptCard
              roleLabel="Lượt làm sau"
              attempt={comparedAttempt}
              accentClass="border-rp-brand-border/90 bg-rp-brand-tint/25"
              tr={tr}
              trf={trf}
            />
          </div>
        </>
      )}

      <ExamSkillRadar
        series={[
          { label: baseline.label, scores: baseScores },
          { label: compared.label, scores: compScores },
        ]}
        compare
      />

      {insights.length > 0 && (
        <Card className="space-y-2.5 bg-rp-bg-2/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-rp-text">{tr('Nhận xét nhanh & Gợi ý ôn tập')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button as={Link} to="/practice-sets/" variant="outline" size="xs" icon={Layers}>
                {tr('Luyện bộ đề khác')}
              </Button>
              <Button as={Link} to="/mock-tests/" variant="outline" size="xs" icon={FileCheck2}>
                {tr('Thi thử JLPT')}
              </Button>
              <Button as={Link} to="/lessons/" variant="ghost" size="xs" iconRight={ArrowRight}>
                {tr('Khám phá bài học')}
              </Button>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-rp-text-2">
            {insights.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <item.Icon
                  aria-hidden="true"
                  className={cx(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    item.tone === 'success' ? 'text-emerald-600' : item.tone === 'warning' ? 'text-amber-600' : 'text-rp-text-muted',
                  )}
                />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CompareAttempts({ attempts, userId, initialAttemptId, levelCode }) {
  const { tr } = useLocale();
  const sortedChronological = useMemo(
    () =>
      [...attempts].sort(
        (a, b) =>
          (parseUtcDate(a.submittedAt)?.getTime() || 0) - (parseUtcDate(b.submittedAt)?.getTime() || 0)
          || a.attemptId - b.attemptId,
      ),
    [attempts],
  );

  const initialMatchIdx = initialAttemptId
    ? sortedChronological.findIndex((a) => a.attemptId === Number(initialAttemptId))
    : -1;

  const defaultAfterId = initialMatchIdx >= 1
    ? sortedChronological[initialMatchIdx].attemptId
    : sortedChronological[sortedChronological.length - 1].attemptId;

  const defaultBeforeId = initialMatchIdx >= 1
    ? sortedChronological[initialMatchIdx - 1].attemptId
    : sortedChronological[0].attemptId === defaultAfterId
      ? sortedChronological[1]?.attemptId
      : sortedChronological[0].attemptId;

  const [beforeId, setBeforeId] = useState(defaultBeforeId);
  const [afterId, setAfterId] = useState(defaultAfterId);

  const before = sortedChronological.find((a) => a.attemptId === beforeId) ?? sortedChronological[0];
  const after = sortedChronological.find((a) => a.attemptId === afterId && a.attemptId !== before.attemptId)
    ?? sortedChronological.find((a) => a.attemptId !== before.attemptId)
    ?? sortedChronological[sortedChronological.length - 1];

  function handleSwap() {
    setBeforeId(after.attemptId);
    setAfterId(before.attemptId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <MockAttemptSelect
          label="Lượt làm trước"
          attempts={sortedChronological.filter((a) => a.attemptId !== after.attemptId)}
          value={before.attemptId}
          onChange={setBeforeId}
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={ArrowLeftRight}
          onClick={handleSwap}
          aria-label={tr('Đổi vị trí hai lượt làm')}
          className="shrink-0 self-start sm:self-end"
        >
          {tr('Đổi')}
        </Button>
        <MockAttemptSelect
          label="Lượt làm sau"
          attempts={[...sortedChronological].reverse().filter((a) => a.attemptId !== before.attemptId)}
          value={after.attemptId}
          onChange={setAfterId}
        />
      </div>

      <MockResultComparison
        userId={userId}
        levelCode={levelCode}
        baselineAttempt={before}
        comparedAttempt={after}
        baseline={{ label: 'Lượt làm trước', attemptId: before.attemptId, examKind: before.examKind }}
        compared={{ label: 'Lượt làm sau', attemptId: after.attemptId, examKind: after.examKind }}
      />
    </div>
  );
}

/**
 * Progress Comparison Dashboard ("So sánh tiến độ" tab inside ExamResult.jsx):
 * - Separates MockTest vs PracticeSet comparisons strictly by default so incompatible scales are never mixed blindly.
 * - Supports pre-selecting a specific `initialAttemptId` from Result Detail ("So sánh kết quả").
 */
export default function MockTestProgress({ attempts = [], userId, initialAttemptId = null }) {
  const { tr, trf } = useLocale();
  const completedAttempts = useMemo(
    () =>
      (Array.isArray(attempts) ? attempts : []).filter(
        (a) => (a.attemptStatus === 'completed' || a.attemptStatus === 'expired' || !a.attemptStatus)
          && a.attemptId != null,
      ),
    [attempts],
  );

  const focusedAttempt = initialAttemptId
    ? completedAttempts.find((a) => a.attemptId === Number(initialAttemptId)) ?? null
    : null;

  const [kindMode, setKindMode] = useState(() => {
    if (focusedAttempt) return classifyGroupKey(focusedAttempt.examKind);
    const mockCount = completedAttempts.filter((a) => classifyGroupKey(a.examKind) === 'MOCK').length;
    if (mockCount >= 2) return 'MOCK';
    const practiceCount = completedAttempts.filter((a) => classifyGroupKey(a.examKind) === 'PRACTICE').length;
    if (practiceCount >= 2) return 'PRACTICE';
    return 'MOCK';
  });

  const [selectedLevel, setSelectedLevel] = useState(() => focusedAttempt?.jlptLevelName || null);

  const scopedByKind = useMemo(() => {
    if (kindMode === 'ALL') return completedAttempts;
    return completedAttempts.filter((a) => classifyGroupKey(a.examKind) === kindMode);
  }, [completedAttempts, kindMode]);

  const availableLevels = useMemo(
    () => jlptLevels.filter((level) => scopedByKind.some((a) => a.jlptLevelName === level)),
    [scopedByKind],
  );

  const levelsWithPairs = useMemo(
    () => availableLevels.filter((level) => scopedByKind.filter((a) => a.jlptLevelName === level).length >= 2),
    [availableLevels, scopedByKind],
  );

  const effectiveLevel = availableLevels.includes(selectedLevel)
    ? selectedLevel
    : levelsWithPairs[0] ?? availableLevels[0] ?? null;

  const comparable = useMemo(
    () => (effectiveLevel ? scopedByKind.filter((a) => a.jlptLevelName === effectiveLevel) : scopedByKind),
    [scopedByKind, effectiveLevel],
  );

  const kindOptions = [
    { value: 'MOCK', label: tr('Thi thử JLPT (thang 180)') },
    { value: 'PRACTICE', label: tr('Bộ đề luyện tập (thang 10)') },
    { value: 'ALL', label: tr('Đối chiếu kỹ năng khác loại đề') },
  ];

  return (
    <Card aria-labelledby="mock-test-progress-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="mock-test-progress-title" className="text-lg font-bold text-rp-text">
            {tr('So sánh tiến độ')}
          </h2>
          <p className="mt-0.5 text-sm text-rp-text-2">
            {tr('Đối chiếu kết quả và từng kỹ năng giữa hai lượt làm cùng cấp JLPT.')}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[210px] space-y-1">
            <span className="block text-[11px] font-semibold text-rp-text-muted">{tr('Phạm vi so sánh')}</span>
            <CustomSelect
              size="md"
              value={kindMode}
              onChange={(val) => {
                setKindMode(val);
                setSelectedLevel(null);
              }}
              options={kindOptions}
              aria-label={tr('Phạm vi so sánh')}
            />
          </div>
          {availableLevels.length > 0 && (
            <ExamLevelSelect levels={availableLevels} value={effectiveLevel} onChange={setSelectedLevel} />
          )}
        </div>
      </div>

      {comparable.length >= 2 ? (
        <CompareAttempts
          key={`${kindMode}-${effectiveLevel}-${initialAttemptId || ''}`}
          attempts={comparable}
          userId={userId}
          levelCode={effectiveLevel}
          initialAttemptId={initialAttemptId}
        />
      ) : (
        <EmptyState
          illustration="chart"
          size="sm"
          title={tr('Chưa đủ dữ liệu để so sánh')}
          description={
            effectiveLevel
              ? trf('Hoàn thành ít nhất hai lượt {0} cấp {1} để theo dõi sự tiến bộ của bạn.', {
                0: kindMode === 'PRACTICE' ? tr('luyện tập') : tr('thi thử JLPT'),
                1: effectiveLevel,
              })
              : tr('Hoàn thành thêm bài luyện tập hoặc thi thử để theo dõi sự tiến bộ của bạn.')
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button as={Link} to="/practice-sets/" variant="outline" size="sm" icon={Layers}>
                {tr('Khám phá bộ đề')}
              </Button>
              <Button as={Link} to="/mock-tests/" variant="primary" size="sm" icon={FileCheck2}>
                {tr('Thi thử JLPT')}
              </Button>
            </div>
          }
        />
      )}
    </Card>
  );
}
