import { useEffect, useState } from 'react';
import { CheckCircle2, Flame, Sparkles, Trophy, X } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { cx } from './cx.js';
import { Badge, Card, ProgressBar } from './core.jsx';
import {
  markCelebratedOnce,
  prefersReducedMotion,
  shouldPlayCelebration,
} from './celebrationLogic.js';

const HERO_PETALS = [
  { id: 'h1', x: '7%', y: '-6%', delay: '0ms', duration: '1650ms', driftX: '24px', fallY: '260px', rot: '58deg', fill: '#FAD4DE', scale: 1.05 },
  { id: 'h2', x: '15%', y: '-10%', delay: '120ms', duration: '1850ms', driftX: '-16px', fallY: '295px', rot: '-64deg', fill: '#F7B6C8', scale: 0.9 },
  { id: 'h3', x: '24%', y: '-4%', delay: '240ms', duration: '1750ms', driftX: '30px', fallY: '240px', rot: '72deg', fill: '#E05A7A', scale: 0.72 },
  { id: 'h4', x: '34%', y: '-8%', delay: '80ms', duration: '1900ms', driftX: '18px', fallY: '270px', rot: '-46deg', fill: '#FFDCE6', scale: 0.96 },
  { id: 'h5', x: '46%', y: '-6%', delay: '320ms', duration: '1680ms', driftX: '-22px', fallY: '220px', rot: '52deg', fill: '#F7B6C8', scale: 0.76 },
  { id: 'h6', x: '56%', y: '-9%', delay: '170ms', duration: '1880ms', driftX: '26px', fallY: '235px', rot: '-58deg', fill: '#FAD4DE', scale: 0.88 },
  { id: 'h7', x: '67%', y: '-5%', delay: '60ms', duration: '1720ms', driftX: '-18px', fallY: '265px', rot: '66deg', fill: '#E05A7A', scale: 0.7 },
  { id: 'h8', x: '76%', y: '-10%', delay: '260ms', duration: '1920ms', driftX: '20px', fallY: '290px', rot: '-70deg', fill: '#F7B6C8', scale: 0.95 },
  { id: 'h9', x: '85%', y: '-6%', delay: '140ms', duration: '1760ms', driftX: '-28px', fallY: '250px', rot: '54deg', fill: '#FAD4DE', scale: 0.86 },
  { id: 'h10', x: '93%', y: '-8%', delay: '360ms', duration: '1820ms', driftX: '-14px', fallY: '275px', rot: '-52deg', fill: '#FFDCE6', scale: 0.92 },
];

const CARD_PETALS = [
  HERO_PETALS[0],
  HERO_PETALS[2],
  HERO_PETALS[4],
  HERO_PETALS[6],
  HERO_PETALS[8],
  HERO_PETALS[9],
];

export function SakuraPetalEffect({ active = true, side = 'both', density = 'card', className }) {
  if (!active || prefersReducedMotion()) return null;
  const source = density === 'hero' ? HERO_PETALS : CARD_PETALS;
  const petals = side === 'left'
    ? source.slice(0, Math.ceil(source.length / 2))
    : side === 'right'
      ? source.slice(Math.ceil(source.length / 2))
      : source;

  return (
    <div
      aria-hidden="true"
      className={cx('pointer-events-none absolute inset-0 overflow-hidden select-none', className)}
    >
      {petals.map((petal) => (
        <svg
          key={petal.id}
          viewBox="0 0 24 18"
          className="rp-celebrate-petal absolute h-4 w-5"
          style={{
            left: petal.x,
            top: petal.y || '0%',
            '--rp-delay': petal.delay,
            '--rp-petal-dur': petal.duration,
            '--rp-drift-x': petal.driftX,
            '--rp-fall-y': petal.fallY,
            '--rp-rot': petal.rot,
            transform: `scale(${petal.scale})`,
          }}
        >
          <path
            d="M12 1C17 2 22 6.5 22 11.5C22 15 18 17 14 16.5C12.7 16.3 12 15.2 12 14.3C12 15.2 11.3 16.3 10 16.5C6 17 2 15 2 11.5C2 6.5 7 2 12 1Z"
            fill={petal.fill}
            opacity="0.9"
          />
        </svg>
      ))}
    </div>
  );
}

export function HaruAchievement({
  size = 120,
  showCheck = true,
  className,
}) {
  return (
    <div
      className={cx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden="true"
        className="rp-celebrate-halo absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,220,232,0.88)_0%,rgba(250,212,222,0.42)_54%,transparent_78%)] ring-1 ring-rp-brand-border/50"
      />
      <div className="relative flex h-3/4 w-3/4 items-center justify-center rounded-full border border-rp-brand-border bg-white text-rp-brand shadow-rp-md">
        <Trophy aria-hidden="true" className="h-1/2 w-1/2" />
      </div>
      {showCheck && (
        <span
          aria-hidden="true"
          className="rp-onboarding-check-pop absolute right-1 bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rp-success text-white shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

export function AnimatedScoreReveal({
  value = 0,
  decimals = 0,
  suffix = '%',
  animate = true,
  durationMs = 750,
  className,
  formatFn,
}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const skipAnimation = !animate || prefersReducedMotion() || durationMs <= 0;
  const [display, setDisplay] = useState(skipAnimation ? target : 0);

  useEffect(() => {
    if (skipAnimation) return undefined;

    let frame = 0;
    let startTime = 0;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - elapsed) ** 3;
      setDisplay(target * eased);
      if (elapsed < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [target, durationMs, skipAnimation]);

  const currentDisplay = skipAnimation ? target : display;
  const formatted = formatFn
    ? formatFn(currentDisplay)
    : `${Number(currentDisplay).toFixed(decimals)}${suffix}`;

  return <span className={cx('tabular-nums', className)}>{formatted}</span>;
}

export function AchievementCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'brand',
  className,
}) {
  const toneCls = tone === 'success'
    ? 'border-rp-success-line bg-white'
    : tone === 'brand'
      ? 'border-rp-brand-border bg-white'
      : 'border-rp-line bg-white';

  const iconCls = tone === 'success'
    ? 'bg-white text-rp-success border-rp-success-line'
    : tone === 'brand'
      ? 'bg-white text-rp-brand border-rp-brand-border'
      : 'bg-white text-rp-text-2 border-rp-line';

  return (
    <div className={cx('rounded-rp-input border p-3.5', toneCls, className)}>
      <div className="flex items-start gap-2.5">
        {Icon && (
          <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', iconCls)}>
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {label && <p className="text-[11.5px] font-semibold uppercase tracking-wide text-rp-text-muted">{label}</p>}
          {value != null && <p className="mt-0.5 text-sm font-bold text-rp-text">{value}</p>}
          {detail && <p className="mt-0.5 text-xs leading-5 text-rp-text-2">{detail}</p>}
        </div>
      </div>
    </div>
  );
}

export function CompletionSummary({
  completedCount,
  totalCount,
  streakDays = 0,
  levelLabel,
  summaryText,
  className,
}) {
  const { tr, trf } = useLocale();
  const hasCounts = Number.isFinite(completedCount) && Number.isFinite(totalCount) && totalCount > 0;
  const pct = hasCounts ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : null;

  return (
    <div className={cx('space-y-3 rounded-rp-input border border-rp-line bg-rp-bg-2/80 p-3.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {levelLabel && <Badge tone="brand" size="sm" icon={false}>{levelLabel}</Badge>}
          {hasCounts && (
            <span className="text-xs font-semibold tabular-nums text-rp-text">
              {trf('{0}/{1} bài hoàn thành ({2}%)', { 0: completedCount, 1: totalCount, 2: pct })}
            </span>
          )}
        </div>
        {streakDays > 0 && (
          <Badge tone="warning" size="sm" icon={Flame}>
            {trf('{0} ngày liên tiếp', { 0: streakDays })}
          </Badge>
        )}
      </div>

      {hasCounts && (
        <ProgressBar
          value={completedCount}
          max={totalCount}
          tone={pct >= 100 ? 'success' : 'brand'}
          label={tr('Tiến độ lộ trình')}
        />
      )}

      {summaryText && <p className="text-xs leading-5 text-rp-text-2">{summaryText}</p>}
    </div>
  );
}

export function LearningPathReveal({
  phases = [],
  animate = true,
  className,
  renderPhase,
}) {
  if (!phases.length) return null;
  const reduce = !animate || prefersReducedMotion();

  return (
    <ol className={cx('space-y-3', className)}>
      {phases.map((phase, index) => (
        <li
          key={phase.title || phase.startDay || index}
          style={!reduce ? { '--rp-delay': `${Math.min(index, 6) * 90}ms` } : undefined}
          className={cx(
            'rounded-rp-card border border-rp-line bg-rp-surface p-4',
            !reduce && 'rp-celebrate-stagger',
          )}
        >
          {renderPhase ? renderPhase(phase, index) : (
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-rp-brand">
                  {phase.startDay != null && phase.endDay != null
                    ? `Ngày ${phase.startDay}–${phase.endDay}`
                    : `#${index + 1}`}
                </p>
                <p className="mt-0.5 text-sm font-bold text-rp-text">{phase.title}</p>
                {phase.focus && <p className="mt-1 text-xs leading-5 text-rp-text-2">{phase.focus}</p>}
              </div>
              {phase.startDate && phase.endDate && (
                <Badge tone="neutral" size="sm" icon={false}>
                  {String(phase.startDate).slice(0, 10)} → {String(phase.endDate).slice(0, 10)}
                </Badge>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function CelebrationScene({
  open = true,
  variant = 'inline',
  tier = 'goal',
  onceKey,
  badge,
  title,
  description,
  children,
  actions,
  onSkip,
  onClose,
  skipLabel,
  className,
}) {
  const { tr } = useLocale();
  const [playMotion] = useState(() => shouldPlayCelebration(onceKey));
  const dismiss = onSkip || onClose;

  useEffect(() => {
    if (!open || !onceKey) return;
    markCelebratedOnce(onceKey);
  }, [open, onceKey]);

  useEffect(() => {
    if (!open || variant === 'inline' || !dismiss) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, variant, dismiss]);

  if (!open) return null;

  const isFullscreen = variant === 'fullscreen';
  const isOverlay = variant === 'overlay';

  const cardContent = (
    <Card
      padded={false}
      className={cx(
        'relative overflow-hidden border-rp-line bg-white',
        playMotion && 'rp-celebrate-bloom',
        isFullscreen ? 'w-full max-w-xl shadow-rp-card-lg' : isOverlay ? 'w-full max-w-lg shadow-rp-card-lg' : '',
        className,
      )}
    >
      <SakuraPetalEffect active={playMotion} density={isFullscreen || isOverlay ? 'hero' : 'card'} />

      {dismiss && (
        <button
          type="button"
          onClick={dismiss}
          title={skipLabel || tr('Đóng')}
          aria-label={skipLabel || tr('Đóng')}
          className="rp-focus absolute top-3.5 right-3.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rp-line/90 bg-white/90 text-rp-text-2 transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint/40 hover:text-rp-brand-strong"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}

      <div className={cx('relative z-[1] p-5 sm:p-6', (isFullscreen || isOverlay) && 'text-center')}>
        <div
          className={cx(
            'flex flex-col gap-4',
            !isFullscreen && !isOverlay && 'sm:flex-row sm:items-center sm:justify-between',
            (isFullscreen || isOverlay) && 'items-center',
          )}
        >
          <div className={cx('min-w-0 space-y-2.5', !isFullscreen && !isOverlay && 'flex-1')}>
            {badge && (
              <div
                style={playMotion ? { '--rp-delay': '60ms' } : undefined}
                className={cx(playMotion && 'rp-celebrate-stagger')}
              >
                <Badge tone="brand" icon={Sparkles} size="sm">
                  {badge}
                </Badge>
              </div>
            )}
            {title && (
              <h2
                style={playMotion ? { '--rp-delay': '130ms' } : undefined}
                className={cx(
                  'rp-type-section-title font-bold text-rp-text sm:text-[22px]',
                  playMotion && 'rp-celebrate-stagger',
                )}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                style={playMotion ? { '--rp-delay': '200ms' } : undefined}
                className={cx(
                  'text-sm leading-6 text-rp-text-2',
                  (isFullscreen || isOverlay) && 'mx-auto max-w-md',
                  playMotion && 'rp-celebrate-stagger',
                )}
              >
                {description}
              </p>
            )}
          </div>

          <div
            className={cx(
              'flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-rp-brand-border bg-rp-brand-tint text-rp-brand-strong shadow-rp-sm',
              (isFullscreen || isOverlay) && 'order-first',
              playMotion && 'rp-celebrate-stagger',
            )}
            aria-hidden="true"
          >
            {tier === 'assessment' ? <Sparkles className="h-10 w-10" /> : <Trophy className="h-10 w-10" />}
          </div>
        </div>

        {children && (
          <div
            style={playMotion ? { '--rp-delay': '260ms' } : undefined}
            className={cx('mt-4', playMotion && 'rp-celebrate-stagger')}
          >
            {children}
          </div>
        )}

        {actions && (
          <div
            style={playMotion ? { '--rp-delay': '320ms' } : undefined}
            className={cx(
              'mt-5 flex flex-wrap items-center gap-2.5',
              (isFullscreen || isOverlay) && 'justify-center',
              playMotion && 'rp-celebrate-stagger',
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </Card>
  );

  if (variant === 'inline') {
    return cardContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || tr('Chúc mừng hoàn thành')}
      onClick={dismiss ? (e) => { if (e.target === e.currentTarget) dismiss(); } : undefined}
      className="rp-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
    >
      {cardContent}
    </div>
  );
}
