import { forwardRef, useId, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react';
import { SakuraSpinner } from './SakuraLoader.jsx';
import { cx } from './cx.js';
import { useLocale } from '@/locales/locale.js';


/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  primary:
    'bg-rp-brand-pressed text-white shadow-rp-brand hover:bg-rp-brand-strong enabled:hover:scale-[1.02] enabled:hover:shadow-[0_10px_24px_-8px_rgba(194,67,98,0.45)] enabled:active:scale-[0.985] enabled:active:duration-100 motion-reduce:transform-none disabled:bg-rp-muted-strong disabled:text-rp-text-disabled disabled:shadow-none',
  secondary:
    'bg-rp-surface text-rp-text border border-rp-line hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:text-rp-text-disabled disabled:bg-rp-muted',
  soft: 'bg-rp-brand-tint text-rp-brand-strong border border-rp-brand-soft hover:bg-rp-brand-soft disabled:opacity-60',
  ghost: 'bg-transparent text-rp-text-2 hover:bg-rp-muted hover:text-rp-text disabled:text-rp-text-disabled',
  danger: 'bg-rp-danger text-white hover:bg-[#A61F1F] disabled:bg-rp-muted-strong disabled:text-rp-text-disabled',
  'danger-soft': 'bg-rp-danger-bg text-rp-danger border border-rp-danger-line hover:bg-[#FADCDC] disabled:opacity-60',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-rp-input',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-rp-input',
};

/**
 * `loading` disables the button and keeps its width (no layout jump), which is
 * the first line of defence against double submit. Async handlers should still
 * use `useSubmitGuard` so programmatic re-entry is blocked too.
 */
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, icon: Icon, iconRight: IconRight, className, children, type = 'button', ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        'rp-focus inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu backface-hidden disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <SakuraSpinner size={size === 'sm' ? 14 : 18} tone={variant === 'primary' || variant === 'danger' ? 'light' : 'brand'} />
      ) : (
        Icon && <Icon aria-hidden="true" className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {children != null && <span className="truncate">{children}</span>}
      {IconRight && !loading && <IconRight aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton(
  { label, icon: Icon, size = 'md', variant = 'ghost', className, badge, ...rest },
  ref,
) {
  const { tr } = useLocale();
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'rp-focus relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:opacity-50',
        variant === 'ghost' && 'text-rp-text-2 hover:bg-rp-muted hover:text-rp-text',
        variant === 'soft' && 'bg-rp-brand-tint text-rp-brand-strong hover:bg-rp-brand-soft',
        variant === 'outline' && 'border border-rp-line bg-rp-surface text-rp-text-2 hover:border-rp-brand-border hover:text-rp-brand-strong',
        dim,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden="true" className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
      {tr(badge)}
    </button>
  );
});

/* ------------------------------------------------------------------ Card */

export function Card({ as: Tag = 'section', density, className, padded = true, children, ...rest }) {
  return (
    <Tag
      data-density={density || undefined}
      className={cx('min-w-0 rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs', padded && 'p-[var(--rp-space-card-pad)]', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, icon, className }) {
  const { tr } = useLocale();
  return (
    <div className={cx('mb-[var(--rp-space-stack)] flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="rp-type-card text-rp-text">{tr(title)}</h2>
          {description && <p className="rp-type-secondary mt-0.5 text-rp-text-muted">{tr(description)}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ PageHeader */

export function PageHeader({ title, description, actions, eyebrow, className }) {
  const { tr } = useLocale();
  return (
    <header className={cx('mb-[var(--rp-space-section)] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="rp-type-caption mb-1 font-semibold uppercase tracking-[0.12em] text-rp-brand">{tr(eyebrow)}</p>}
        <h1 className="rp-type-page-title text-rp-text">{tr(title)}</h1>
        {description && <p className="rp-type-body mt-1 max-w-2xl text-rp-text-2">{tr(description)}</p>}
      </div>
      {actions && <div className="flex w-full max-w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ Status */

const STATUS_TONES = {
  success: { cls: 'bg-rp-success-bg text-rp-success border-rp-success-line', Icon: CircleCheck },
  warning: { cls: 'bg-rp-warning-bg text-rp-warning border-rp-warning-line', Icon: TriangleAlert },
  danger: { cls: 'bg-rp-danger-bg text-rp-danger border-rp-danger-line', Icon: CircleAlert },
  info: { cls: 'bg-rp-info-bg text-rp-info border-rp-info-line', Icon: Info },
  brand: { cls: 'bg-rp-brand-tint text-rp-brand-strong border-rp-brand-soft', Icon: null },
  neutral: { cls: 'bg-rp-muted text-rp-text-2 border-rp-line', Icon: null },
};

/** Badge always carries a text label; status tones also get an icon so colour is never the only signal. */
export function Badge({ tone = 'neutral', icon, children, className, size = 'md' }) {
  const t = STATUS_TONES[tone] || STATUS_TONES.neutral;
  const Icon = icon === false ? null : icon || t.Icon;
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        t.cls,
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Persistent, section-level message. Use for page state, not for action results (that is a toast). */
export function Banner({ tone = 'info', title, children, actions, onDismiss, className, role }) {
  const { tr } = useLocale();
  const t = STATUS_TONES[tone] || STATUS_TONES.info;
  const Icon = t.Icon || Info;
  return (
    <div
      role={role || (tone === 'danger' ? 'alert' : 'status')}
      className={cx('flex items-start gap-3 rounded-rp-input border px-4 py-3 text-sm', t.cls, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
      <div className="min-w-0 flex-1 leading-6">
        {title && <p className="font-semibold">{tr(title)}</p>}
        {children && <div className={cx(title && 'text-[13px]', 'text-rp-text-2')}>{children}</div>}
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={tr('Đóng')} className="rp-focus rounded-full p-1 opacity-70 hover:opacity-100">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Form fields */

export function Field({ label, hint, error, required, children, className, id: idProp, counter }) {
  const { tr } = useLocale();
  const autoId = useId();
  const id = idProp || autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = typeof children === 'function' ? children({ id, describedBy, invalid: Boolean(error) }) : children;
  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-[13px] font-semibold text-rp-text">
            {tr(label)}
            {required && <span className="ml-0.5 text-rp-danger" aria-hidden="true">*</span>}
          </label>
          {counter && <span className="text-[11px] tabular-nums text-rp-text-muted">{counter}</span>}
        </div>
      )}
      {control}
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs leading-5 text-rp-text-muted">{tr(hint)}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-medium leading-5 text-rp-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const CONTROL =
  'w-full rounded-rp-input border bg-rp-surface px-3.5 text-sm text-rp-text placeholder:text-rp-text-disabled transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-rp-brand focus:shadow-[0_0_0_3px_rgba(224,90,122,0.18)] disabled:cursor-not-allowed disabled:bg-rp-muted disabled:text-rp-text-disabled';

/**
 * `icon` (a lucide component) renders a leading icon that turns Sakura Primary while the field is focused
 * (red when invalid). Any `.relative` wrapper with an absolutely positioned icon/button next to an input
 * gets the same focus colour via `.rp-field-icon` rules in tokens.css.
 */
export const Input = forwardRef(function Input({ invalid, className, icon: LeadIcon, ...rest }, ref) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'h-11', LeadIcon && 'pl-10', invalid ? 'border-rp-danger' : 'border-rp-line', className)}
      {...rest}
    />
  );
  if (!LeadIcon) return input;
  return (
    <div className="relative">
      <LeadIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
      {input}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'py-2.5 leading-6', invalid ? 'border-rp-danger' : 'border-rp-line', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select({ invalid, className, children, style, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'min-h-11 py-2.5 leading-snug cursor-pointer appearance-none overflow-hidden text-ellipsis whitespace-nowrap bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10', invalid ? 'border-rp-danger' : 'border-rp-line', className)}
      style={{
        WebkitAppearance: 'none',
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23776C70' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Checkbox({ label, description, className, ...rest }) {
  const { tr } = useLocale();
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-rp-text', className)}>
      {/* Native input stays focusable/accessible; the visible box draws its tick (stroke) when checked. */}
      <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0">
        <input id={id} type="checkbox" className="rp-check peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" {...rest} />
        <span aria-hidden="true" className="rp-check-box pointer-events-none flex h-full w-full items-center justify-center rounded-[5px] border-[1.5px] border-rp-line-strong bg-rp-surface">
          <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="none">
            <path className="rp-check-tick" d="M2.6 8.3 6.3 12 13.4 4.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
          </svg>
        </span>
      </span>
      <span>
        <span className="font-medium">{tr(label)}</span>
        {description && <span className="block text-xs text-rp-text-muted">{tr(description)}</span>}
      </span>
    </label>
  );
}

/**
 * On/off switch (role="switch"). Use for settings that apply immediately or a single option such as
 * "Lặp theo tuần"; use Checkbox for items in a list. Keyboard: Space toggles (native checkbox).
 */
export function Switch({ label, description, className, checked, onChange, disabled, ...rest }) {
  const { tr } = useLocale();
  const id = useId();
  return (
    <label htmlFor={id} className={cx('inline-flex cursor-pointer items-start gap-3 text-sm text-rp-text', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="relative mt-0.5 inline-flex h-[22px] w-[38px] shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={Boolean(checked)}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="rp-switch peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span aria-hidden="true" className="rp-switch-track pointer-events-none h-full w-full rounded-full border border-rp-line-strong bg-rp-muted" />
        <span aria-hidden="true" className="rp-switch-thumb pointer-events-none absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow" />
      </span>
      {(label || description) && (
        <span>
          {label && <span className="font-medium">{tr(label)}</span>}
          {description && <span className="block text-xs text-rp-text-muted">{tr(description)}</span>}
        </span>
      )}
    </label>
  );
}

/** Native date/time pickers styled consistently (keyboard + screen-reader support for free). */
export const DateInput = forwardRef(function DateInput(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});
export const TimeInput = forwardRef(function TimeInput(props, ref) {
  return <Input ref={ref} type="time" step={props.step ?? 300} {...props} />;
});

/* ------------------------------------------------------------------ Skeleton */

export function Skeleton({ className, rounded = 'rounded-lg' }) {
  return <span aria-hidden="true" className={cx('rp-skeleton block', rounded, className)} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3, className }) {
  const { tr } = useLocale();
  return (
    <div role="status" aria-label={tr('Đang tải')} className={cx('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-rp-card border border-rp-line bg-rp-surface p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" rounded="rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <SkeletonText className="mt-4" lines={2} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Progress */

export function ProgressBar({ value = 0, max = 100, label, tone = 'brand', className }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className="h-2 overflow-hidden rounded-full bg-rp-brand-soft"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-500', tone === 'success' ? 'bg-rp-success' : 'bg-rp-brand')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

function initialsOf(name) {
  return String(name || '?').trim().split(/\s+/).slice(-2).map((p) => p[0] || '').join('').toUpperCase() || '?';
}

/** Image avatar with an initials fallback when the URL is missing or fails to load (no layout shift). */
export function Avatar({ src, name, size = 40, className }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) };
  if (src && !failed) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} style={style} className={cx('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span aria-hidden="true" style={style} className={cx('flex shrink-0 items-center justify-center rounded-full bg-rp-brand-tint font-bold text-rp-brand-strong', className)}>
      {initialsOf(name)}
    </span>
  );
}
