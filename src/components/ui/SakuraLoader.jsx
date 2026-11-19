import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/locales/locale.js';
import { useDelayedLoading } from './hooks.js';
import { cx } from './cx.js';
import { resolveLoadingLabel } from './sakuraLoadingLogic.js';

/*
 * RikiPath Global Sakura Loading System
 * 5 notched petals breathing/swaying + cream/gold stamen center + sequenced
 * bouncing Sakura Pink indicator dots (`● ● ●`). Never adds white card boxes
 * or outer rotating rings behind the bloom.
 */

const PETAL = 'M50,50 C23.2,40.3 28,7.8 43.2,6 Q47.7,5.6 50,12.2 Q52.3,5.6 56.8,6 C72,7.8 76.8,40.3 50,50Z';
const PETAL_ANGLES = [0, 72, 144, 216, 288];
const STAMENS = [0, 1, 2, 3, 4].map((i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
  return [50 + Math.cos(a) * 6, 50 + Math.sin(a) * 6];
});
const DOT_DELAYS = ['0s', '0.16s', '0.32s'];

export function SakuraBloom({ size = 56, tone = 'brand', animated = true, className }) {
  const gid = `rp-petal-${useId().replace(/:/g, '')}`;
  const light = tone === 'light';
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0 select-none', className)}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`${gid}-deep`} gradientUnits="userSpaceOnUse" x1="50" y1="50" x2="50" y2="6">
          <stop offset="0" stopColor={light ? '#FFFFFF' : '#FFD9E3'} stopOpacity={light ? 0.75 : 1} />
          <stop offset="1" stopColor={light ? '#FFFFFF' : '#E5577F'} />
        </linearGradient>
        <linearGradient id={`${gid}-mid`} gradientUnits="userSpaceOnUse" x1="50" y1="50" x2="50" y2="6">
          <stop offset="0" stopColor={light ? '#FFFFFF' : '#FFD9E3'} stopOpacity={light ? 0.6 : 1} />
          <stop offset="1" stopColor={light ? '#FFF0F3' : '#F08AA6'} />
        </linearGradient>
        {!light && (
          <filter id={`${gid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        )}
      </defs>
      <g className={animated ? 'rp-bloom' : undefined}>
        {!light && (
          <g filter={`url(#${gid}-shadow)`} transform="translate(0 1.8)" opacity="0.14">
            {PETAL_ANGLES.map((a) => <path key={a} d={PETAL} fill="#E5577F" transform={`rotate(${a} 50 50)`} />)}
          </g>
        )}
        {PETAL_ANGLES.map((a, i) => (
          <g key={a} transform={`rotate(${a} 50 50)`}>
            <path
              className={animated ? 'rp-petal' : undefined}
              style={animated ? { animationDelay: `${i * 0.28}s` } : undefined}
              d={PETAL}
              fill={`url(#${gid}-${i % 2 === 0 ? 'deep' : 'mid'})`}
            />
          </g>
        ))}
        <circle cx="50" cy="50" r="11" fill={light ? '#FFE7EE' : '#FFEDB8'} />
        {STAMENS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.2" fill={light ? '#E05A7A' : '#F2B84B'} />
        ))}
      </g>
    </svg>
  );
}

/** Three sequenced bouncing Sakura Pink typing dots shown under non-inline loading copy. */
export function SakuraDots({ size = 'md', tone = 'brand', className }) {
  const dotDim = size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  const dotColor = tone === 'light' ? 'bg-white/95' : 'bg-[#E05A7A]';
  return (
    <span aria-hidden="true" className={cx('inline-flex items-center justify-center gap-1.5', className)}>
      {DOT_DELAYS.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className={cx('rp-sakura-dot rounded-full', dotDim, dotColor)}
        />
      ))}
    </span>
  );
}

const DEFAULT_SIZES = {
  fullscreen: 72,
  page: 64,
  section: 44,
  inline: 16,
  overlay: 52,
};

/**
 * Unified Sakura Loader supporting 5 layout-aware variants:
 * `fullscreen` | `page` | `section` | `inline` | `overlay`.
 */
export function SakuraLoader({
  variant = 'section',
  context = 'data',
  label,
  size,
  tone = 'brand',
  delay = 0,
  blocking = false,
  open = true,
  showDots,
  className = '',
}) {
  const { tr } = useLocale();
  const visible = useDelayedLoading(open, delay);
  if (!open || !visible) return null;

  const text = resolveLoadingLabel({ label, context, tr });
  const bloomSize = size ?? (blocking ? 72 : DEFAULT_SIZES[variant] ?? 44);
  const renderDots = showDots ?? (variant !== 'inline');

  if (variant === 'inline') {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={text}
        data-sakura-loader="inline"
        className={cx('inline-flex items-center justify-center gap-1.5 align-middle', className)}
      >
        <SakuraBloom size={bloomSize} tone={tone} />
        {label && <span className="text-[13px] font-medium text-rp-text-muted">{tr(label)}</span>}
        {showDots && <SakuraDots size="sm" tone={tone} />}
      </span>
    );
  }

  const isLarge = variant === 'fullscreen' || variant === 'page' || blocking;
  const textTone = blocking
    ? 'text-sm font-semibold text-white drop-shadow'
    : isLarge
      ? 'text-sm font-medium text-rp-text-2 sm:text-[15px]'
      : 'text-[13px] font-medium text-rp-text-muted';

  const core = (
    <div
      role={blocking ? 'alertdialog' : 'status'}
      aria-modal={blocking ? 'true' : undefined}
      aria-live={blocking ? 'assertive' : 'polite'}
      aria-label={text}
      data-sakura-loader={variant}
      data-loading-context={context}
      className={cx(
        'flex flex-col items-center justify-center text-center',
        variant === 'fullscreen' && 'fixed inset-0 z-[120] gap-3.5 bg-[color-mix(in_srgb,var(--rp-bg)_88%,transparent)] px-4 backdrop-blur-[2px]',
        variant === 'page' && 'flex-1 min-h-[calc(100dvh-var(--spacing-rp-topbar)-3rem)] w-full gap-3 px-4 py-8',
        variant === 'section' && 'min-h-[160px] w-full gap-2.5 px-4 py-8',
        variant === 'overlay' && (blocking
          ? 'rp-anim-fade fixed inset-0 z-[120] gap-3.5 bg-[rgba(28,20,32,0.45)] px-4 backdrop-blur-[2px]'
          : 'rp-anim-fade absolute inset-0 z-20 gap-2.5 rounded-[inherit] bg-[color-mix(in_srgb,var(--rp-surface)_80%,transparent)] px-4 backdrop-blur-[1.5px]'),
        className,
      )}
    >
      <SakuraBloom size={bloomSize} tone={tone} />
      <p className={cx('max-w-sm leading-5', textTone)}>{tr(text)}</p>
      {renderDots && <SakuraDots size={isLarge ? 'lg' : 'md'} tone={blocking ? 'light' : tone} />}
    </div>
  );

  if ((variant === 'fullscreen' || (variant === 'overlay' && blocking)) && typeof document !== 'undefined' && document.body) {
    return createPortal(core, document.body);
  }
  return core;
}

export function SakuraSpinner({ size = 18, tone = 'brand', label }) {
  return <SakuraLoader variant="inline" size={size} tone={tone} label={label} showDots={false} />;
}

export function SectionLoader({ label, context = 'data', size = 44, delay = 0, className = '' }) {
  return <SakuraLoader variant="section" context={context} label={label} size={size} delay={delay} className={className} />;
}

export function PageLoader({ label, context = 'page', delay = 0, className = '' }) {
  return <SakuraLoader variant="page" context={context} label={label} delay={delay} className={className} />;
}

export function BlockingOverlay({ open, label = 'Đang xử lý, vui lòng không đóng trang', context = 'grading' }) {
  return <SakuraLoader variant="overlay" blocking open={open} label={label} context={context} />;
}

/** Subtle non-blocking badge shown while background TanStack refetch runs over visible data. */
export function RefreshingIndicator({ active, label = 'Đang cập nhật dữ liệu', delay = 180, className = '' }) {
  const { tr } = useLocale();
  const visible = useDelayedLoading(active, delay);
  if (!active || !visible) return null;
  const text = tr(label);
  return (
    <span
      role="status"
      aria-live="polite"
      className={cx('inline-flex items-center gap-1.5 rounded-full bg-rp-brand-tint/85 px-2.5 py-1 text-xs font-medium text-rp-brand-strong', className)}
    >
      <SakuraBloom size={14} />
      <span>{tr(text)}</span>
    </span>
  );
}
