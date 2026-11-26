import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  AnimatedScoreReveal,
  Badge,
  Button,
  Card,
  ProgressBar,
  SakuraPetalEffect,
  cx,
  markCelebratedOnce,
  shouldPlayCelebration,
} from '@/components/ui';
import SkillAssessmentChart from './SkillAssessmentChart.jsx';
import ResultScoreSummaryCard from './ResultScoreSummaryCard.jsx';
import {
  groupSkillCardsByLevel,
  resolveSkillFeedbackSummary,
  translateBackendAssessmentMessage,
} from '../utils/examSkillScores.js';
import {
  formatDurationSeconds,
  formatPercentage,
} from '../utils/practiceStatusHelpers.js';
import { useLocale } from '@/locales/locale.js';

function resolveStrengthCopy(feedback, tr, trf) {
  const { strengthMode, topSkills } = feedback;
  if (strengthMode === 'strong' || strengthMode === 'relative') {
    const headline = topSkills.map((s) => `${tr(s.skill)} (${s.scorePercent}%)`).join(' · ');
    const lead = topSkills[0];
    const ratio = lead.totalCount > 0
      ? trf('{0}/{1} câu đúng', { 0: lead.correctCount, 1: lead.totalCount })
      : `${lead.scorePercent}%`;
    return {
      isPositive: true,
      badge: strengthMode === 'strong' ? tr('Nền tảng vững') : tr('Tốt nhất hiện tại'),
      headline,
      detail: strengthMode === 'strong'
        ? trf('Đạt kết quả tốt nhất trên dữ liệu làm bài thực tế ({0}).', { 0: ratio })
        : trf('Kỹ năng đạt tỷ lệ đúng cao nhất hiện tại ({0}), là điểm tựa để nâng các phần còn lại.', { 0: ratio }),
    };
  }
  if (strengthMode === 'zero') {
    return {
      isPositive: false,
      badge: tr('Cần khởi động'),
      headline: tr('Chưa ghi nhận điểm mạnh nổi bật (0%)'),
      detail: tr('Các kỹ năng đã chấm hiện ở mức 0%; hãy bắt đầu từ bài học nền tảng theo cấp độ phù hợp.'),
    };
  }
  return {
    isPositive: false,
    badge: tr('Chưa đủ dữ liệu'),
    headline: tr('Chưa đủ dữ liệu đánh giá'),
    detail: tr('Cần ít nhất một kỹ năng có câu hỏi hợp lệ để tổng hợp điểm mạnh.'),
  };
}

function resolveImprovementCopy(feedback, tr, trf) {
  const { focusMode, focusSkills } = feedback;
  if (focusMode === 'needs_work' || focusMode === 'maintain') {
    const headline = focusSkills.map((s) => `${tr(s.skill)} (${s.scorePercent}%)`).join(' · ');
    const primary = focusSkills[0];
    const detail = primary?.recommendation
      ? tr(primary.recommendation)
      : (focusMode === 'maintain'
        ? tr('Các kỹ năng đã chấm đều đạt từ 80% trở lên; tiếp tục duy trì và luyện tốc độ làm bài.')
        : trf('Ưu tiên ôn tập kỹ năng này ({0}/{1} câu đúng) trước khi luyện đề nâng cao.', {
            0: primary?.correctCount ?? 0,
            1: primary?.totalCount ?? 0,
          }));
    return {
      isMaintain: focusMode === 'maintain',
      badge: focusMode === 'maintain' ? tr('Tiếp tục duy trì') : tr('Ưu tiên ôn tập'),
      headline,
      detail,
    };
  }
  return {
    isMaintain: true,
    badge: tr('Chưa đủ dữ liệu'),
    headline: tr('Chưa đủ dữ liệu đánh giá'),
    detail: tr('Cần dữ liệu kỹ năng hợp lệ để gợi ý phần cần ưu tiên ôn tập.'),
  };
}

/**
 * Two-Column Placement Result Workspace:
 * - Left Sidebar: Compact vertical ResultScoreSummaryCard directly above Section & Level Overview Navigator.
 * - Right Column: SkillAssessmentChart (Radar + Table), Strength vs Improvement cards, Skill Breakdown, Actions.
 */
export default function AssessmentResultDashboard({
  result,
  onceKey,
  badgeText,
  targetLevelLabel,
  estimatedLevelLabel,
  chartTarget,
  visibleLevels,
  allowanceText,
  primaryCtaTo = '/roadmap/?generateAi=1',
  primaryCtaLabel,
  showAiCta = true,
  footerActions = null,
}) {
  const { tr, trf } = useLocale();
  const [playReveal] = useState(() => shouldPlayCelebration(onceKey));

  useEffect(() => {
    if (!result || !onceKey) return;
    markCelebratedOnce(onceKey);
  }, [result, onceKey]);

  if (!result) return null;

  const scoreValue = Number(result.totalScore) || 0;
  const correctCount = Math.max(0, Number(result.correctCount ?? 0));
  const blankCount = Math.max(0, Number(result.notStudiedCount ?? 0));
  const totalQuestions = Math.max(0, Number(result.totalQuestions ?? 0));
  const wrongCount = Math.max(0, totalQuestions - correctCount - blankCount);
  const accuracyPct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : scoreValue;
  const durationStr = result.durationSeconds != null ? formatDurationSeconds(result.durationSeconds, trf) : '—';

  const feedback = resolveSkillFeedbackSummary(result);
  const strengthCopy = resolveStrengthCopy(feedback, tr, trf);
  const improvementCopy = resolveImprovementCopy(feedback, tr, trf);
  const levelGroups = groupSkillCardsByLevel(result);
  const showAnalyticsChart =
    (Array.isArray(result.sections) && result.sections.length > 0) ||
    (Array.isArray(result.skillAssessments) && result.skillAssessments.length > 0);
  const levelBreakdowns = Array.isArray(result.levelBreakdowns) ? result.levelBreakdowns : [];

  const jumpLinks = [
    showAnalyticsChart && { id: 'assessment-radar', label: tr('Biểu đồ & bảng kỹ năng'), Icon: BarChart3 },
    { id: 'assessment-feedback', label: tr('Nhận xét năng lực'), Icon: Sparkles },
    levelGroups.length > 0 && { id: 'assessment-breakdown', label: tr('Chi tiết kỹ năng'), Icon: Layers },
  ].filter(Boolean);

  return (
    <div
      className="grid gap-4 pb-16 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start lg:pb-2"
      data-testid="assessment-result-dashboard"
    >
      {/* Left Sidebar: Score Summary directly above Section & Level Overview */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
        <ResultScoreSummaryCard
          mode="placement"
          title={badgeText || tr('Điểm đánh giá năng lực')}
          scoreValue={
            <AnimatedScoreReveal
              key={result.attemptId ?? scoreValue}
              value={scoreValue}
              animate={playReveal}
              formatFn={(v) => formatPercentage(v)}
            />
          }
          scoreToneClass={playReveal ? 'text-rp-brand-strong rp-celebrate-bloom' : 'text-rp-brand-strong'}
          accuracyText={formatPercentage(accuracyPct)}
          statusBadge={
            estimatedLevelLabel && estimatedLevelLabel !== '—'
              ? { tone: 'brand', label: `${tr('Trình độ ước tính')}: ${estimatedLevelLabel}` }
              : null
          }
          secondaryCaption={targetLevelLabel ? `${tr('Mục tiêu')}: ${targetLevelLabel}` : null}
          correctCount={correctCount}
          wrongCount={wrongCount}
          blankCount={blankCount}
          durationText={durationStr}
          overlay={<SakuraPetalEffect active={playReveal} density="card" />}
          footer={
            <>
              {result.assessmentMessage && (
                <p className="text-xs font-medium leading-5 text-rp-text-2">
                  {translateBackendAssessmentMessage(result.assessmentMessage, tr, trf)}
                </p>
              )}
              <p className="text-[11px] leading-4 text-rp-text-muted">
                {tr('Kết quả đánh giá nội bộ giúp cá nhân hóa lộ trình trên RikiPath, không thay thế điểm thi JLPT chính thức.')}
              </p>
              {showAiCta && (
                <Button
                  as={Link}
                  to={primaryCtaTo}
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  iconRight={ArrowRight}
                  className={cx('w-full', playReveal && 'rp-celebrate-cta-glow')}
                >
                  {primaryCtaLabel || tr('Tạo lộ trình học với AI')}
                </Button>
              )}
            </>
          }
        />

        {/* Compact Section Navigator & Level Breakdown Card */}
        <aside className="rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-rp-text-muted">
              {tr('Tổng quan phân tích')}
            </p>
            {allowanceText && (
              <span className="text-[11px] font-medium text-rp-text-muted">{allowanceText}</span>
            )}
          </div>

          <nav aria-label={tr('Điều hướng kết quả đánh giá')} className="space-y-1.5">
            {jumpLinks.map(({ id, label, Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  const target = document.getElementById(id);
                  if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="rp-focus flex items-center justify-between gap-2 rounded-xl border border-rp-line/80 bg-rp-bg-2/60 px-3 py-2 text-xs font-semibold text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/30 hover:text-rp-brand-strong"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                  {label}
                </span>
                <ArrowRight aria-hidden="true" className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </nav>

          {levelBreakdowns.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-rp-line/70 pt-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-rp-text-muted">
                <Compass aria-hidden="true" className="h-3 w-3 text-rp-brand-strong" />
                {tr('Kết quả theo cấp độ')}
              </p>
              <div className="space-y-1.5">
                {levelBreakdowns.map((lvl) => (
                  <div
                    key={lvl.jlptLevelId ?? lvl.jlptLevelName}
                    className="flex items-center justify-between gap-2 rounded-xl border border-rp-line/70 bg-rp-bg-2/50 px-3 py-1.5 text-xs"
                  >
                    <Badge tone="brand" size="sm" icon={false}>
                      {lvl.jlptLevelName}
                    </Badge>
                    <span className="font-semibold tabular-nums text-rp-text">
                      {trf('{0}/{1} câu đúng', { 0: lvl.correctCount, 1: lvl.totalCount })} · {Math.round(Number(lvl.scorePercent) || 0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Right Column: Analytics, Feedback & Detailed Breakdown starting at Y = 0 */}
      <div className="min-w-0 space-y-4">
        {showAnalyticsChart && (
          <div id="assessment-radar">
            <SkillAssessmentChart
              key={result.attemptId}
              result={result}
              targetLevel={chartTarget}
              visibleLevels={visibleLevels}
              animate={playReveal}
            />
          </div>
        )}

        <section id="assessment-feedback" aria-label={tr('Nhận xét năng lực')} className="space-y-3">
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            <div
              className={cx(
                'flex h-full flex-col justify-between gap-3 rounded-rp-card border p-4 shadow-rp-xs sm:p-5',
                strengthCopy.isPositive
                  ? 'border-rp-success-line bg-rp-success-bg/50'
                  : 'border-rp-line bg-rp-bg-2',
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-rp-sm border bg-rp-surface',
                      strengthCopy.isPositive
                        ? 'border-rp-success-line text-rp-success'
                        : 'border-rp-line text-rp-text-muted',
                    )}
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
                      {tr('Điểm mạnh nổi bật')}
                    </p>
                    <p className="mt-0.5 text-base font-extrabold text-rp-text">{strengthCopy.headline}</p>
                  </div>
                </div>
                <Badge tone={strengthCopy.isPositive ? 'success' : 'neutral'} size="sm" icon={false}>
                  {strengthCopy.badge}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-rp-text-2">{strengthCopy.detail}</p>
            </div>

            <div
              className={cx(
                'flex h-full flex-col justify-between gap-3 rounded-rp-card border p-4 shadow-rp-xs sm:p-5',
                improvementCopy.isMaintain
                  ? 'border-rp-info-line bg-rp-info-bg/45'
                  : 'border-rp-brand-border bg-rp-brand-tint/35',
              )}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-rp-sm border bg-rp-surface',
                      improvementCopy.isMaintain
                        ? 'border-rp-info-line text-rp-info'
                        : 'border-rp-brand-border text-rp-brand',
                    )}
                  >
                    <TrendingUp aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-rp-text-muted">
                      {tr('Nội dung cần cải thiện')}
                    </p>
                    <p className="mt-0.5 text-base font-extrabold text-rp-text">{improvementCopy.headline}</p>
                  </div>
                </div>
                <Badge tone={improvementCopy.isMaintain ? 'info' : 'brand'} size="sm" icon={false}>
                  {improvementCopy.badge}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-rp-text-2">{improvementCopy.detail}</p>
            </div>
          </div>

          {feedback.unevaluated.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-rp-input border border-rp-line bg-rp-bg-2/80 px-4 py-2.5 text-xs text-rp-text-2">
              <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-muted" />
              <Badge tone="neutral" size="sm" icon={false}>
                {tr('Chưa đánh giá')}
              </Badge>
              <strong className="font-semibold text-rp-text">
                {feedback.unevaluated.map((s) => tr(s.skill)).join(' · ')}
              </strong>
              <span>
                — {tr('Chưa đủ dữ liệu kiểm tra hợp lệ (ví dụ phần nghe chưa có tệp âm thanh) nên chưa chấm điểm.')}
              </span>
            </div>
          )}
        </section>

        {levelGroups.length > 0 && (
          <Card id="assessment-breakdown" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-bold text-rp-text">{tr('Chi tiết kỹ năng')}</h3>
              <p className="text-xs text-rp-text-muted">
                {tr('Tỷ lệ đúng và số câu đã chấm theo từng kỹ năng JLPT.')}
              </p>
            </div>

            <div className={cx('grid gap-6', levelGroups.length > 1 ? 'md:grid-cols-2 md:gap-8' : 'grid-cols-1')}>
              {levelGroups.map((group) => (
                <div key={group.key} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 border-b border-rp-line pb-2.5">
                    <div className="flex items-center gap-2">
                      {group.levelName && (
                        <Badge tone="brand" size="sm" icon={false}>
                          {group.levelName}
                        </Badge>
                      )}
                      <span className="text-sm font-bold text-rp-text">
                        {group.levelName ? trf('Kỹ năng {0}', { 0: group.levelName }) : tr('Các kỹ năng')}
                      </span>
                    </div>
                    {group.hasData ? (
                      <span className="text-xs font-semibold tabular-nums text-rp-text-2">
                        {trf('{0}/{1} đúng · {2}%', {
                          0: group.evaluatedCorrect,
                          1: group.evaluatedTotal,
                          2: group.scorePercent,
                        })}
                      </span>
                    ) : (
                      <Badge tone="neutral" size="sm" icon={false}>
                        {tr('Chưa đánh giá')}
                      </Badge>
                    )}
                  </div>

                  <ul className="divide-y divide-rp-line/70">
                    {group.items.map((item) => (
                      <li key={item.id} className="space-y-2 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-rp-text">{tr(item.title)}</span>
                          {item.hasData ? (
                            <div className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                              <span className="text-xs text-rp-text-muted">
                                {trf('{0}/{1} đúng', { 0: item.correctCount, 1: item.totalCount })}
                              </span>
                              <span className="min-w-[2.75rem] text-right text-sm font-bold text-rp-brand-strong">
                                {item.scorePercent}%
                              </span>
                            </div>
                          ) : (
                            <Badge tone="neutral" size="sm" icon={false}>
                              {tr('Chưa đánh giá')}
                            </Badge>
                          )}
                        </div>

                        {item.hasData ? (
                          <ProgressBar
                            value={item.scorePercent ?? 0}
                            max={100}
                            tone={(item.scorePercent ?? 0) >= 80 ? 'success' : 'brand'}
                            label={`${group.levelName || ''} ${tr(item.title)}`.trim()}
                          />
                        ) : (
                          <p className="text-xs text-rp-text-muted">
                            {item.unverifiedAudio
                              ? tr('Thiếu tệp âm thanh để chấm phần Nghe.')
                              : tr('Chưa đủ dữ liệu kiểm tra hợp lệ.')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        )}

        {footerActions && (
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
              {tr('Hành động tiếp theo')}
            </span>
            <div className="flex flex-wrap items-center gap-3">{footerActions}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
