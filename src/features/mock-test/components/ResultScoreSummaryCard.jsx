import { HelpCircle } from 'lucide-react';
import { Badge, Tooltip, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

const MODE_DEFAULT_TITLES = Object.freeze({
  practice: 'Điểm luyện tập',
  mock: 'Điểm thi thử JLPT',
  placement: 'Điểm đánh giá năng lực',
});

/**
 * Shared compact vertical Score Summary card rendered at the top of the Left Sidebar
 * across Practice Set, JLPT Mock Test, and Placement Assessment Result Workspaces.
 */
export default function ResultScoreSummaryCard({
  mode = 'practice',
  title,
  scoreValue,
  scoreUnit = null,
  scoreToneClass = 'text-rp-brand-strong',
  isValid = true,
  accuracyText = '—',
  accuracyLabel,
  secondaryCaption = null,
  statusBadge = null,
  tooltipText = null,
  tooltipAriaLabel = 'Giải thích cách tính điểm',
  correctCount = 0,
  wrongCount = 0,
  blankCount = 0,
  durationText = '—',
  overlay = null,
  footer = null,
  className,
  ...rest
}) {
  const { tr, trf } = useLocale();

  const resolvedTitle = title || tr(MODE_DEFAULT_TITLES[mode] || MODE_DEFAULT_TITLES.practice);
  const safeCorrect = Math.max(0, Number(correctCount) || 0);
  const safeWrong = Math.max(0, Number(wrongCount) || 0);
  const safeBlank = Math.max(0, Number(blankCount) || 0);
  const totalAnswers = safeCorrect + safeWrong + safeBlank;

  const correctPct = totalAnswers > 0 ? (safeCorrect / totalAnswers) * 100 : 0;
  const wrongPct = totalAnswers > 0 ? (safeWrong / totalAnswers) * 100 : 0;
  const blankPct = totalAnswers > 0 ? (safeBlank / totalAnswers) * 100 : 0;

  return (
    <section
      data-testid="result-overview-card"
      aria-label={resolvedTitle}
      className={cx(
        'relative overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs',
        className,
      )}
      {...rest}
    >
      {overlay}
      <div className="relative z-[1] space-y-3.5">
        {/* Centered Header + Main Score + Accuracy */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-rp-text-muted">
              {resolvedTitle}
            </p>
            {tooltipText && (
              <Tooltip content={tooltipText}>
                <button
                  type="button"
                  aria-label={tr(tooltipAriaLabel)}
                  className="rp-focus text-rp-text-muted hover:text-rp-brand-strong"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </div>

          {isValid ? (
            <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-1.5">
              <span className={cx('text-[28px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[30px]', scoreToneClass)}>
                {scoreValue}
              </span>
              {scoreUnit && (
                <span className="text-sm font-semibold text-rp-text-muted">{scoreUnit}</span>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-sm font-bold text-rp-warning">
              {tr('Chưa đủ dữ liệu tính điểm')}
            </p>
          )}

          <p className="mt-1 text-xs text-rp-text-2">
            {accuracyLabel || tr('Độ chính xác:')}{' '}
            <span className="font-semibold tabular-nums text-rp-text">{accuracyText}</span>
          </p>

          {(statusBadge?.label || secondaryCaption) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {statusBadge?.label && (
                <Badge tone={statusBadge.tone || 'neutral'} size="sm" icon={false}>
                  {statusBadge.label}
                </Badge>
              )}
              {secondaryCaption && (
                <span className="text-[11.5px] font-medium text-rp-text-muted">{secondaryCaption}</span>
              )}
            </div>
          )}
        </div>

        {/* Single Segmented Answer Distribution Progress Bar */}
        <div
          role="img"
          aria-label={trf('Phân bố câu trả lời: {0} đúng, {1} sai, {2} bỏ trống', {
            0: safeCorrect,
            1: safeWrong,
            2: safeBlank,
          })}
          className="flex h-2 w-full overflow-hidden rounded-full bg-rp-muted"
        >
          {correctPct > 0 && (
            <div
              className="h-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${correctPct}%` }}
            />
          )}
          {wrongPct > 0 && (
            <div
              className="h-full bg-rose-500 transition-[width] duration-300"
              style={{ width: `${wrongPct}%` }}
            />
          )}
          {blankPct > 0 && (
            <div
              className="h-full bg-slate-300 transition-[width] duration-300 dark:bg-slate-600"
              style={{ width: `${blankPct}%` }}
            />
          )}
        </div>

        {/* Balanced 2x2 Compact Stat Grid (single row of 4 on sm-md tablet for clean height) */}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-2 text-center">
            <dt className="text-[11px] font-medium text-emerald-800">{tr('Đúng')}</dt>
            <dd className="mt-0.5 text-[17px] font-extrabold leading-tight tabular-nums text-emerald-900">
              {safeCorrect}
            </dd>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-2 text-center">
            <dt className="text-[11px] font-medium text-rose-800">{tr('Sai')}</dt>
            <dd className="mt-0.5 text-[17px] font-extrabold leading-tight tabular-nums text-rose-900">
              {safeWrong}
            </dd>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2/80 px-2.5 py-2 text-center">
            <dt className="text-[11px] font-medium text-rp-text-muted">{tr('Bỏ trống')}</dt>
            <dd className="mt-0.5 text-[17px] font-extrabold leading-tight tabular-nums text-rp-text">
              {safeBlank}
            </dd>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2/80 px-2.5 py-2 text-center">
            <dt className="text-[11px] font-medium text-rp-text-muted">{tr('Thời gian')}</dt>
            <dd className="mt-0.5 whitespace-nowrap text-sm font-bold leading-tight tabular-nums text-rp-text sm:text-[15px]">
              {durationText || '—'}
            </dd>
          </div>
        </dl>

        {footer && (
          <div className="space-y-2.5 border-t border-rp-line/70 pt-3">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}
