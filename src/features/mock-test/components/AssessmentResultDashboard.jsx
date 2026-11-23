import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  AnimatedScoreReveal,
  Badge,
  Button,
  Card,
  HaruAchievement,
  ProgressBar,
  SakuraPetalEffect,
  cx,
  markCelebratedOnce,
  shouldPlayCelebration,
} from '@/components/ui';
import SkillAssessmentChart from './SkillAssessmentChart.jsx';
import {
  groupSkillCardsByLevel,
  resolveSkillFeedbackSummary,
  translateBackendAssessmentMessage,
} from '../utils/examSkillScores.js';
import { currentIntlTag, useLocale } from '@/locales/locale.js';

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
 * Wide Sakura Analytics Result Dashboard used across Placement Result & ExamN3.
 * Structured in 5 horizontal rows: Hero Summary, 40/60 Radar + Table, Strength vs Improvement,
 * Unified N5/N4 Skill Breakdown Panel, and Next-Step Action Bar.
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
  const feedback = resolveSkillFeedbackSummary(result);
  const strengthCopy = resolveStrengthCopy(feedback, tr, trf);
  const improvementCopy = resolveImprovementCopy(feedback, tr, trf);
  const levelGroups = groupSkillCardsByLevel(result);
  const showAnalyticsChart =
    (Array.isArray(result.sections) && result.sections.length > 0) ||
    (Array.isArray(result.skillAssessments) && result.skillAssessments.length > 0);

  return (
    <div className="space-y-5">
      {/* Row 1 — Wide Overview Hero Card */}
      <Card
        padded={false}
        className={cx(
          'relative overflow-hidden border-rp-line bg-gradient-to-br from-rp-brand-tint/40 via-rp-surface to-rp-surface shadow-rp-card',
          playReveal && 'rp-celebrate-bloom',
        )}
      >
        <SakuraPetalEffect active={playReveal} density="card" />
        <div className="relative z-[1] flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" size="sm" icon={Sparkles}>
                  {badgeText || tr('Đánh giá năng lực JLPT')}
                </Badge>
                {estimatedLevelLabel && (
                  <Badge tone="neutral" size="sm" icon={false}>
                    <span>{tr('Trình độ ước tính')}:</span>
                    <strong className="ml-1 text-rp-brand-strong">{estimatedLevelLabel}</strong>
                  </Badge>
                )}
              </div>
              <h2 className="rp-type-section-title font-extrabold tracking-tight text-rp-text sm:text-2xl">
                {tr('Bạn đã hoàn thành bài đánh giá!')}
              </h2>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-4xl font-extrabold tracking-tight tabular-nums text-rp-brand sm:text-[42px]">
                    <AnimatedScoreReveal
                      key={result.attemptId ?? scoreValue}
                      value={scoreValue}
                      animate={playReveal}
                      formatFn={(v) =>
                        `${v.toLocaleString(currentIntlTag(), {
                          maximumFractionDigits: scoreValue % 1 === 0 ? 0 : 1,
                        })}%`
                      }
                    />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
                    {tr('Điểm đánh giá nội bộ RikiPath')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {result.totalQuestions > 0 && (
                    <Badge tone="info" icon={false}>
                      {trf('{0}/{1} câu đúng', { 0: result.correctCount ?? 0, 1: result.totalQuestions })}
                    </Badge>
                  )}
                  {targetLevelLabel && (
                    <Badge tone="brand" icon={false}>
                      {tr('Mục tiêu')} {targetLevelLabel}
                    </Badge>
                  )}
                  {allowanceText && (
                    <Badge tone="neutral" icon={false}>
                      {allowanceText}
                    </Badge>
                  )}
                  {result.notStudiedCount > 0 && (
                    <Badge tone="neutral" icon={false}>
                      {trf('Chưa học hoặc không biết · {0} câu', { 0: result.notStudiedCount })}
                    </Badge>
                  )}
                </div>
              </div>

              <ProgressBar
                value={scoreValue}
                max={100}
                tone={scoreValue >= 80 ? 'success' : 'brand'}
                label={tr('Tổng điểm đánh giá')}
              />
            </div>

            <div className="flex flex-col gap-3 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                {result.assessmentMessage && (
                  <p className="text-xs font-medium leading-5 text-rp-text-2">
                    {translateBackendAssessmentMessage(result.assessmentMessage, tr, trf)}
                  </p>
                )}
                <p className="text-[11.5px] leading-4 text-rp-text-muted">
                  {tr('Kết quả đánh giá nội bộ giúp cá nhân hóa lộ trình trên RikiPath, không thay thế điểm thi JLPT chính thức.')}
                </p>
              </div>

              {showAiCta && (
                <Button
                  as={Link}
                  to={primaryCtaTo}
                  variant="primary"
                  size="md"
                  icon={Sparkles}
                  iconRight={ArrowRight}
                  className={cx('shrink-0 self-start sm:self-center', playReveal && 'rp-celebrate-cta-glow')}
                >
                  {primaryCtaLabel || tr('Tạo lộ trình học với AI')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center self-center rounded-full border border-rp-brand-border/60 bg-rp-brand-tint/45 p-3 lg:p-4">
            <HaruAchievement tier="assessment" size={128} />
          </div>
        </div>
      </Card>

      {/* Row 2 — Unified Skill Analytics Module (40% Radar | 60% Comparison Table) */}
      {showAnalyticsChart && (
        <SkillAssessmentChart
          key={result.attemptId}
          result={result}
          targetLevel={chartTarget}
          visibleLevels={visibleLevels}
          animate={playReveal}
        />
      )}

      {/* Row 3 — Paired Skill Feedback (Strengths & Priority Improvements) */}
      <section aria-label={tr('Nhận xét năng lực')} className="space-y-3">
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

      {/* Row 4 — Unified Skill Breakdown Panel (N5 | N4 Two-Column Compact Rows) */}
      {levelGroups.length > 0 && (
        <Card className="space-y-4">
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

      {/* Row 5 — Compact Next-Step Action Bar */}
      {footerActions && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
            {tr('Hành động tiếp theo')}
          </span>
          <div className="flex flex-wrap items-center gap-3">{footerActions}</div>
        </Card>
      )}
    </div>
  );
}
