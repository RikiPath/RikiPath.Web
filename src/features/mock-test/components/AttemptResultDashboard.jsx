import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  Clock,
  FileCheck2,
  GitCompareArrows,
  Layers,
  RotateCcw,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DetailPageHeader,
  ProgressBar,
  Tabs,
} from '@/components/ui';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import { getMockTestReview } from '../api/mockTestApi.js';
import QuestionReviewWorkspace from './QuestionReviewWorkspace.jsx';
import ResultScoreSummaryCard from './ResultScoreSummaryCard.jsx';
import {
  formatDurationSeconds,
  formatPercentage,
  formatScaleScore,
  isPracticeKind,
  resolveMockResultDisplay,
  resolvePracticeResultDisplay,
  resolveStatusMeta,
} from '../utils/practiceStatusHelpers.js';

function formatResultDate(value) {
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(currentIntlTag(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}

/**
 * Compact Result Dashboard for both Practice Sets (10-pt scale) and JLPT Mock Tests (180-pt simulation).
 * Renders: DetailPageHeader -> Result Overview & Skill Performance side-by-side -> Result Tabs (Xem lại bài làm / Tổng kết & gợi ý).
 */
export default function AttemptResultDashboard({
  result,
  userId,
  onRestart,
  restarting = false,
}) {
  const { tr, trf } = useLocale();
  const [activeTab, setActiveTab] = useState('review');

  const reviewQuery = useQuery({
    queryKey: ['mock-test-review', userId, result?.attemptId],
    queryFn: () => getMockTestReview(result.attemptId),
    enabled: Boolean(result?.attemptId),
    retry: false,
    staleTime: 60_000,
  });

  if (!result) return null;

  const isPractice = isPracticeKind(result.examKind);
  const statusMeta = resolveStatusMeta(result.status, tr);
  const practiceDisplay = isPractice ? resolvePracticeResultDisplay(result, tr) : null;
  const mockDisplay = !isPractice ? resolveMockResultDisplay(result, tr) : null;

  const submittedStr = formatResultDate(result.submittedAt || result.startedAt);
  const durationStr = formatDurationSeconds(result.durationSeconds, trf);

  const sectionsWithData = (result.sections || []).filter((s) => Number(s.totalCount) > 0);
  const weakestSection = sectionsWithData.reduce(
    (weakest, section) => (!weakest || Number(section.score) < Number(weakest.score) ? section : weakest),
    null,
  );

  const primaryScoreBadge = isPractice
    ? { tone: practiceDisplay?.classes.badgeTone || 'neutral', label: practiceDisplay?.bandLabel }
    : { tone: mockDisplay?.classes.badgeTone || 'neutral', label: mockDisplay?.passStatusLabel };

  const headerBadges = (
    <>
      {result.jlptLevelName && <Badge tone="brand" size="sm" icon={false}>JLPT {result.jlptLevelName}</Badge>}
      <Badge tone={isPractice ? 'info' : 'neutral'} size="sm" icon={false}>
        {isPractice ? tr('Bộ đề luyện tập') : tr('Thi thử JLPT')}
      </Badge>
      <Badge tone={statusMeta.tone} size="sm" icon={false}>{statusMeta.label}</Badge>
    </>
  );

  const headerMeta = (
    <>
      {submittedStr && (
        <span className="inline-flex items-center gap-1">
          <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
          {submittedStr}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        {trf('{0} câu hỏi', { 0: result.totalQuestions ?? 0 })}
      </span>
      {durationStr && (
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
          {durationStr}
        </span>
      )}
    </>
  );

  const compareHref = `/exam-result/?tab=compare&attemptId=${result.attemptId}`;

  const scoreSummaryCard = (
    <ResultScoreSummaryCard
      mode={isPractice ? 'practice' : 'mock'}
      isValid={isPractice ? Boolean(practiceDisplay?.isValid) : Boolean(mockDisplay?.isValid)}
      scoreValue={
        isPractice
          ? (practiceDisplay?.isValid ? `${formatScaleScore(practiceDisplay.score10)}/10` : null)
          : (mockDisplay?.isValid ? `${formatScaleScore(mockDisplay.score180, 0)}/${mockDisplay.max180}` : null)
      }
      scoreUnit={
        (isPractice ? practiceDisplay?.isValid : mockDisplay?.isValid) ? tr('điểm') : null
      }
      scoreToneClass={isPractice ? practiceDisplay?.classes.scoreText : mockDisplay?.classes.scoreText}
      accuracyLabel={
        !isPractice && !mockDisplay?.isValid ? tr('Độ chính xác riêng:') : tr('Độ chính xác:')
      }
      accuracyText={formatPercentage(
        isPractice ? (practiceDisplay?.accuracyPct ?? 0) : (mockDisplay?.accuracyPct ?? 0),
      )}
      secondaryCaption={
        !isPractice && mockDisplay?.isValid && mockDisplay.passingScore != null
          ? `(${trf('Chuẩn: {0}', { 0: mockDisplay.passingScore })})`
          : null
      }
      statusBadge={primaryScoreBadge.label ? primaryScoreBadge : null}
      tooltipText={
        !isPractice
          ? (mockDisplay?.disclaimer || tr('Điểm thi thử mô phỏng theo quy chuẩn JLPT (không phải Scaled Score IRT chính thức của JLPT).'))
          : null
      }
      tooltipAriaLabel="Giải thích điểm thi thử"
      correctCount={result.correctCount ?? 0}
      wrongCount={result.wrongCount ?? 0}
      blankCount={result.blankCount ?? 0}
      durationText={durationStr || '—'}
    />
  );

  const skillsSummaryCard = (
    <Card className="flex flex-col justify-between gap-3" data-testid="result-skills-card">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-rp-text">
            {isPractice ? tr('Kết quả theo kỹ năng trong bài') : tr('Điểm từng phần theo cấu trúc JLPT')}
          </h2>
          <span className="text-xs text-rp-text-muted">
            {isPractice ? tr('Theo phần thực tế của bộ đề') : tr('Điểm đạt / tối đa')}
          </span>
        </div>

        {!isPractice && mockDisplay?.scoringSections?.length > 0 ? (
          <div className="space-y-2.5">
            {mockDisplay.scoringSections.map((sec) => (
              <div key={sec.sectionKey} className="space-y-1 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-rp-text">{tr(sec.title)}</span>
                  <div className="flex items-center gap-2">
                    {sec.hasValidData ? (
                      <>
                        <span className="font-bold tabular-nums text-rp-text">
                          {formatScaleScore(sec.score, 0)}/{sec.maxScore}
                        </span>
                        <Badge tone={sec.isPassed ? 'success' : 'danger'} size="sm" icon={false}>
                          {sec.isPassed ? tr('Đạt liệt') : trf('Dưới {0}', { 0: sec.passScore })}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-rp-text-muted">{tr('Chưa đánh giá')}</span>
                    )}
                  </div>
                </div>
                {sec.hasValidData && (
                  <ProgressBar
                    value={sec.score}
                    max={sec.maxScore}
                    tone={sec.isPassed ? 'success' : 'danger'}
                    size="sm"
                    label={sec.title}
                  />
                )}
              </div>
            ))}
          </div>
        ) : sectionsWithData.length > 0 ? (
          <div className="space-y-2.5">
            {sectionsWithData.map((section) => {
              const total = Number(section.totalCount) || 0;
              const correct = Number(section.correctCount) || 0;
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              const barTone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
              return (
                <div key={section.mockTestSectionId} className="space-y-1 rounded-xl border border-rp-line/80 bg-rp-bg-2/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-rp-text">
                      {tr(section.languageSkillName || section.sectionTitle)}
                    </span>
                    <span className="font-semibold tabular-nums text-rp-text-2">
                      {trf('{0}/{1} câu đúng', { 0: correct, 1: total })} · {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} max={100} tone={barTone} size="sm" label={section.sectionTitle} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-rp-line p-4 text-xs text-rp-text-muted">
            {tr('Chưa đánh giá được chi tiết từng kỹ năng cho lượt làm bài này.')}
          </p>
        )}
      </div>

      {!isPractice && mockDisplay?.failureReasons?.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3.5 py-2.5 text-xs text-rose-900">
          {mockDisplay.failureReasons.map((reason, idx) => (
            <li key={idx}>{tr(reason)}</li>
          ))}
        </ul>
      )}

      {weakestSection && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rp-brand-border/60 bg-rp-brand-tint/25 px-3 py-2 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-rp-brand-strong">{tr('Gợi ý ôn tập:')}{' '}</span>
            <span className="font-medium text-rp-text">{tr(weakestSection.languageSkillName || weakestSection.sectionTitle)}</span>
          </div>
          <Link
            to={isPractice ? '/practice-sets/' : '/lessons/'}
            className="rp-focus inline-flex items-center gap-1 font-semibold text-rp-brand-strong hover:underline"
          >
            <span>{isPractice ? tr('Luyện bộ đề khác') : tr('Khám phá bài học')}</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-4" data-testid="attempt-result-dashboard">
      {/* 1. Compact Detail Header + Context-Aware BackButton */}
      <DetailPageHeader
        compact
        backFallbackTo={isPractice ? '/practice-sets/' : '/mock-tests/'}
        backLabel={isPractice ? 'Quay lại bộ đề' : 'Quay lại thi thử'}
        backOriginLabel="Quay lại lịch sử"
        restoreListKey={isPractice ? '/practice-sets' : '/mock-tests'}
        icon={isPractice ? Layers : FileCheck2}
        title={isPractice ? tr('Kết quả luyện tập') : tr('Kết quả thi thử JLPT')}
        subtitle={result.title ? tr(result.title) : undefined}
        badges={headerBadges}
        meta={headerMeta}
        actions={
          <>
            <Button
              as={Link}
              to={compareHref}
              variant="outline"
              size="sm"
              icon={GitCompareArrows}
              data-testid="btn-compare-from-result"
            >
              {tr('So sánh kết quả')}
            </Button>
            {result.mockTestId && onRestart && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={RotateCcw}
                loading={restarting}
                onClick={onRestart}
                data-testid="btn-retry-from-result"
              >
                {tr('Làm lại')}
              </Button>
            )}
          </>
        }
      />

      {/* 2. Result Tabs directly below Header */}
      <Tabs
        variant="line"
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'review', label: tr('Xem lại bài làm') },
          { value: 'summary', label: tr('Tổng kết & gợi ý') },
        ]}
      />

      {/* 3. Two-Column Result Workspace (Score Summary at top of Left Column) */}
      {activeTab === 'review' ? (
        <QuestionReviewWorkspace
          sidebarHeader={scoreSummaryCard}
          questions={reviewQuery.data?.questions ?? []}
          loading={reviewQuery.isPending}
          error={reviewQuery.isError ? reviewQuery.error : null}
          onRetry={() => reviewQuery.refetch()}
          retrying={reviewQuery.isFetching}
        />
      ) : (
        <div className="grid gap-4 pb-16 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start lg:pb-2">
          <div className="min-w-0 lg:sticky lg:top-4">
            {scoreSummaryCard}
          </div>

          <div className="min-w-0 space-y-4">
            {skillsSummaryCard}

            <Card className="space-y-4">
              <div className="space-y-2 text-sm text-rp-text-2">
                <h3 className="text-base font-bold text-rp-text">{tr('Tổng kết bài làm')}</h3>
                <p>
                  {isPractice
                    ? trf('Bạn đạt {0}/10 điểm ({1}), trả lời đúng {2}/{3} câu hỏi.', {
                      0: formatScaleScore(practiceDisplay?.score10 ?? 0),
                      1: practiceDisplay?.bandLabel || tr('Hoàn thành'),
                      2: result.correctCount ?? 0,
                      3: result.totalQuestions ?? 0,
                    })
                    : mockDisplay?.isValid
                      ? trf('Tổng điểm mô phỏng: {0}/{1} điểm ({2}).', {
                        0: formatScaleScore(mockDisplay.score180, 0),
                        1: mockDisplay.max180,
                        2: mockDisplay.passStatusLabel || '',
                      })
                      : tr('Bài thi thiếu cấu trúc phần bắt buộc để quy đổi điểm chuẩn JLPT 180.')}
                </p>
                <p className="text-xs text-rp-text-muted">
                  {isPractice
                    ? tr('Điểm luyện tập chỉ phục vụ theo dõi tiến độ kỹ năng, không thay thế lộ trình học hiện tại.')
                    : (mockDisplay?.disclaimer || tr('Điểm thi thử mô phỏng theo quy chuẩn JLPT (không phải Scaled Score IRT chính thức của JLPT).'))}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button as={Link} to={compareHref} variant="primary" size="sm" icon={GitCompareArrows}>
                  {tr('So sánh tiến độ')}
                </Button>
                <Button as={Link} to={isPractice ? '/practice-sets/' : '/mock-tests/'} variant="outline" size="sm">
                  {isPractice ? tr('Khám phá bộ đề') : tr('Chọn đề thi khác')}
                </Button>
                <Button as={Link} to="/lessons/" variant="ghost" size="sm">
                  {tr('Khám phá bài học')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
