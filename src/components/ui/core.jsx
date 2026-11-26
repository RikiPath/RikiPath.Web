import { forwardRef, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Info,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { SakuraSpinner } from './SakuraLoader.jsx';
import { cx } from './cx.js';
import UserAvatar from './UserAvatar.jsx';
import { useLocale } from '@/locales/locale.js';


/* ------------------------------------------------------------------ Button */

const BUTTON_VARIANTS = {
  primary:
    'rp-btn-primary bg-rp-brand-pressed text-white shadow-rp-brand hover:bg-rp-brand-strong enabled:hover:scale-[1.02] enabled:hover:shadow-[0_10px_24px_-8px_rgba(194,67,98,0.45)] enabled:active:scale-[0.985] enabled:active:duration-100 motion-reduce:transform-none disabled:bg-rp-muted-strong disabled:text-rp-text-disabled disabled:shadow-none',
  secondary:
    'bg-rp-surface text-rp-text border border-rp-line hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong hover:shadow-rp-xs disabled:text-rp-text-disabled disabled:bg-rp-muted disabled:hover:border-rp-line disabled:hover:bg-rp-muted disabled:hover:text-rp-text-disabled disabled:hover:shadow-none',
  outline:
    'bg-rp-surface text-rp-text border border-rp-line hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong hover:shadow-rp-xs disabled:text-rp-text-disabled disabled:bg-rp-muted disabled:hover:border-rp-line disabled:hover:bg-rp-muted disabled:hover:text-rp-text-disabled disabled:hover:shadow-none',
  soft: 'bg-rp-brand-tint text-rp-brand-strong border border-rp-brand-soft hover:bg-rp-brand-soft disabled:opacity-60 disabled:hover:bg-rp-brand-tint',
  ghost: 'bg-transparent text-rp-text-2 hover:bg-rp-muted hover:text-rp-text disabled:text-rp-text-disabled disabled:hover:bg-transparent disabled:hover:text-rp-text-disabled',
  link: 'rp-underline bg-transparent text-rp-brand-strong hover:text-rp-brand-deep px-1 shadow-none disabled:text-rp-text-disabled',
  success:
    'rp-btn-primary bg-rp-brand-pressed text-white shadow-rp-brand hover:bg-rp-brand-strong enabled:hover:scale-[1.02] enabled:hover:shadow-[0_10px_24px_-8px_rgba(194,67,98,0.45)] enabled:active:scale-[0.985] enabled:active:duration-100 motion-reduce:transform-none disabled:bg-rp-muted-strong disabled:text-rp-text-disabled disabled:shadow-none',
  danger: 'bg-rp-danger text-white hover:bg-[#A61F1F] disabled:bg-rp-muted-strong disabled:text-rp-text-disabled disabled:hover:bg-rp-muted-strong',
  'danger-soft':
    'bg-rp-muted/70 text-rp-text-2 border border-rp-line hover:border-rp-danger-line hover:bg-rp-danger-bg/60 hover:text-rp-danger disabled:opacity-60 disabled:hover:border-rp-line disabled:hover:bg-rp-muted/70 disabled:hover:text-rp-text-2',
};

const BUTTON_SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-[8px]',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
};

/**
 * Sizes (height is fixed per size, width follows label + icon + padding):
 * xs 28px · sm 32px (filters, row actions) · md 40px (default, dialog footers) · lg 48px (primary CTA).
 * Buttons in one row must share one size so they share one height.
 *
 * `loading` disables the button and keeps its width (no layout jump), which is
 * the first line of defence against double submit. Async handlers should still
 * use `useSubmitGuard` so programmatic re-entry is blocked too.
 */
export const Button = forwardRef(function Button(
  {
    as: Tag = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    wrap = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    children,
    type = 'button',
    onClick,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const isNativeButton = Tag === 'button';
  const compactIcon = size === 'sm' || size === 'xs';
  const spinnerTone = variant === 'primary' || variant === 'danger' || variant === 'success' ? 'light' : 'brand';
  // Without a leading icon the spinner sits over the (transparent, still announced) label, so the width never changes.
  const overlaySpinner = loading && !Icon && children != null;
  return (
    <Tag
      ref={ref}
      type={isNativeButton ? type : undefined}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      onClick={!isNativeButton && isDisabled ? (e) => e.preventDefault() : onClick}
      className={cx(
        'rp-focus rp-press group relative inline-flex cursor-pointer select-none items-center justify-center font-semibold transform-gpu backface-hidden disabled:cursor-not-allowed motion-reduce:transform-none',
        wrap ? 'whitespace-normal text-left' : 'whitespace-nowrap',
        !isNativeButton && isDisabled && 'pointer-events-none opacity-60',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      )}
      {...rest}
    >
      {loading && Icon ? (
        <SakuraSpinner size={compactIcon ? 14 : 16} tone={spinnerTone} />
      ) : (
        Icon && (isValidElement(Icon) ? Icon : <Icon aria-hidden="true" className={compactIcon ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />)
      )}
      {children != null && (
        <span className={cx('inline-flex items-center gap-1.5', wrap ? 'leading-snug' : 'truncate', overlaySpinner && 'opacity-0')}>{children}</span>
      )}
      {IconRight && (
        <span aria-hidden="true" className={cx('inline-flex shrink-0', loading && 'opacity-0')}>
          {isValidElement(IconRight) ? IconRight : <IconRight aria-hidden="true" className="rp-btn-arrow h-4 w-4 shrink-0" />}
        </span>
      )}
      {overlaySpinner && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <SakuraSpinner size={compactIcon ? 14 : 16} tone={spinnerTone} />
        </span>
      )}
    </Tag>
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
      data-rp-icon-button="true"
      data-rp-icon-size={size}
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

/** Shared coral-rose corner badge for top-bar circular icon controls (Language Globe, Smart Calendar, Notifications). */
export function HeaderIconBadge({ children, pulse = false, className }) {
  if (children == null || children === false) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        // Seamless token-backed coral-rose badge (#D6404E / #FFFFFF = 4.52:1 AA), no white border, subtle shadow.
        'rp-header-badge pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[9.5px] font-semibold leading-none tracking-[-0.01em]',
        pulse && 'rp-bell-badge-ping',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({ as: Tag = 'section', density, interactive = false, className, padded = true, padding, tone, children, ...rest }) {
  void tone;
  const isPadded = padding !== undefined ? Boolean(padding) : padded;
  return (
    <Tag
      data-rp-surface="true"
      data-density={density || undefined}
      className={cx(
        'min-w-0 rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs',
        isPadded && 'p-[var(--rp-space-card-pad)]',
        interactive && 'rp-card-hover',
        className,
      )}
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

export function PageHeader({ title, description, subtitle, actions, eyebrow, className }) {
  const { tr } = useLocale();
  const resolvedDescription = description ?? subtitle;
  return (
    <header data-page-header="true" data-translate-scope="deny" className={cx('mb-[var(--rp-space-section)] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="rp-type-caption mb-1 font-semibold uppercase tracking-[0.12em] text-rp-brand">{tr(eyebrow)}</p>}
        <h1 className="rp-type-page-title text-rp-text">{tr(title)}</h1>
        {resolvedDescription && <p className="rp-type-body mt-1 max-w-2xl text-rp-text-2">{tr(resolvedDescription)}</p>}
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
  const rawLabel = typeof label === 'string' ? tr(label) : label;
  const hasTrailingStar = typeof rawLabel === 'string' && /\s*\*\s*$/.test(rawLabel);
  const cleanLabel = hasTrailingStar ? rawLabel.replace(/\s*\*\s*$/, '') : rawLabel;
  const showRequiredStar = Boolean(required || hasTrailingStar);
  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <div className="mb-1.5 flex min-h-4 items-center justify-between gap-2">
          <label htmlFor={id} className="inline-flex items-center gap-1 text-[13px] font-semibold leading-4 text-rp-text">
            <span>{cleanLabel}</span>
            {showRequiredStar && <span className="ml-0.5 text-rp-danger" aria-hidden="true">*</span>}
          </label>
          {counter && <span className="text-[11px] leading-4 tabular-nums text-rp-text-muted">{counter}</span>}
        </div>
      )}
      {control}
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs leading-5 text-rp-text-muted">{tr(hint)}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-medium leading-5 text-rp-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{typeof error === 'string' ? tr(error) : error}</span>
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'rp-control rounded-rp-input border bg-rp-surface px-3.5 text-sm text-rp-text placeholder:text-rp-text-disabled transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-rp-brand focus:shadow-[0_0_0_3px_rgba(224,90,122,0.18)] disabled:cursor-not-allowed disabled:bg-rp-muted disabled:text-rp-text-disabled';
const CONTROL = cx('w-full', CONTROL_BASE);

/**
 * `icon` (a lucide component) renders a leading icon that turns Sakura Primary while the field is focused
 * (red when invalid). Any `.relative` wrapper with an absolutely positioned icon/button next to an input
 * gets the same focus colour via `.rp-field-icon` rules in tokens.css.
 */
const FIELD_SIZES = {
  sm: 'h-8 px-3 text-xs rounded-[10px]',
  md: 'h-10 px-3.5 text-sm rounded-rp-input',
  lg: 'h-12 px-4 text-[15px] rounded-xl',
};

export const Input = forwardRef(function Input({ invalid, className, icon: LeadIcon, ...rest }, ref) {
  const { fitContent = false, size = 'md', htmlSize, ...inputRest } = rest;
  const resolvedSize = size === 'sm' || size === 'lg' ? size : 'md';
  const input = (
    <input
      ref={ref}
      size={htmlSize}
      aria-invalid={invalid || undefined}
      className={cx(
        CONTROL_BASE,
        fitContent ? 'w-fit max-w-full' : 'w-full',
        FIELD_SIZES[resolvedSize],
        LeadIcon && (resolvedSize === 'sm' ? 'pl-8.5' : 'pl-10'),
        invalid ? 'border-rp-danger' : 'border-rp-line',
        className,
      )}
      {...inputRest}
    />
  );
  if (!LeadIcon) return input;
  return (
    <div className={cx('relative', fitContent && 'inline-block max-w-full')}>
      <LeadIcon
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-rp-text-muted',
          resolvedSize === 'sm' ? 'left-3 h-3.5 w-3.5' : 'left-3.5 h-4 w-4',
        )}
      />
      {input}
    </div>
  );
});

export const NumberInput = forwardRef(function NumberInput(
  {
    value,
    onChange,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    disabled = false,
    invalid = false,
    size = 'md',
    fullWidth = false,
    integerOnly = true,
    unit,
    className = '',
    decrementLabel = 'Giảm',
    incrementLabel = 'Tăng',
    onKeyDown,
    ...rest
  },
  ref,
) {
  const { tr } = useLocale();
  const heightCls = size === 'sm'
    ? 'h-8 text-xs rounded-[10px]'
    : size === 'lg'
      ? 'h-12 text-[15px] rounded-xl'
      : 'h-10 text-sm rounded-rp-input';
  const btnWidth = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-11' : 'w-9';
  const parsed = Number(value);
  const hasNumeric = value !== '' && value !== null && value !== undefined && Number.isFinite(parsed);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const hasExplicitWidth = /(?:^|\s)(?:w-|min-w-|max-w-)/.test(className);

  const handleStep = (delta) => {
    if (disabled) return;
    const base = hasNumeric ? (integerOnly ? Math.trunc(parsed) : parsed) : clamp(0);
    onChange?.(clamp(base + delta * step));
  };

  const control = (
    <div
      className={cx(
        'inline-flex items-stretch overflow-hidden border bg-rp-surface transition-colors focus-within:border-rp-brand focus-within:ring-2 focus-within:ring-rp-brand/15',
        fullWidth ? 'w-full' : (!hasExplicitWidth && 'w-[132px]'),
        heightCls,
        invalid ? 'border-rp-danger' : 'border-rp-line',
        disabled && 'cursor-not-allowed bg-rp-bg-2 opacity-60',
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled || (hasNumeric && parsed <= min)}
        aria-label={tr(decrementLabel)}
        onClick={() => handleStep(-1)}
        className={cx(
          'flex shrink-0 items-center justify-center border-r border-rp-line font-semibold text-rp-text-2 transition-colors hover:bg-rp-bg-2 disabled:pointer-events-none disabled:opacity-40',
          btnWidth,
        )}
      >
        −
      </button>
      <input
        ref={ref}
        type="number"
        inputMode={integerOnly ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        value={value ?? ''}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (integerOnly && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const blocked = min >= 0 ? ['-', '+', 'e', 'E', '.', ','] : ['+', 'e', 'E', '.', ','];
            if (blocked.includes(e.key)) e.preventDefault();
          }
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange?.('');
            return;
          }
          if (integerOnly) {
            const pattern = min >= 0 ? /^\d+$/ : /^-?\d+$/;
            if (!pattern.test(raw)) return;
            const intVal = Number.parseInt(raw, 10);
            if (Number.isFinite(intVal)) onChange?.(intVal);
            return;
          }
          const num = Number(raw);
          if (Number.isFinite(num)) onChange?.(num);
        }}
        className="w-full min-w-0 bg-transparent px-2 text-center font-semibold tabular-nums text-rp-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...rest}
      />
      <button
        type="button"
        disabled={disabled || (hasNumeric && parsed >= max)}
        aria-label={tr(incrementLabel)}
        onClick={() => handleStep(1)}
        className={cx(
          'flex shrink-0 items-center justify-center border-l border-rp-line font-semibold text-rp-text-2 transition-colors hover:bg-rp-bg-2 disabled:pointer-events-none disabled:opacity-40',
          btnWidth,
        )}
      >
        +
      </button>
    </div>
  );

  if (!unit) return control;
  return (
    <div className="inline-flex max-w-full items-center gap-2">
      {control}
      <span className="whitespace-nowrap text-[13px] font-medium text-rp-text-muted">{tr(unit)}</span>
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

/* ------------------------------------------------------------------ Select & CustomSelect */

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Shared SearchInput with built-in leading Search icon and clear button.
 */
export const SearchInput = forwardRef(function SearchInput(
  {
    value = '',
    onChange,
    onClear,
    placeholder = 'Tìm kiếm...',
    clearLabel = 'Xóa tìm kiếm',
    size = 'md',
    fitContent = false,
    className,
    inputClassName,
    ...rest
  },
  ref,
) {
  const { tr } = useLocale();
  const hasValue = String(value ?? '').length > 0;
  const resolvedPlaceholder = tr(placeholder);
  const resolvedSize = size === 'sm' || size === 'lg' ? size : 'md';
  const sizeClass =
    resolvedSize === 'sm'
      ? 'h-8 pl-8.5 pr-3 text-xs rounded-[10px]'
      : resolvedSize === 'lg'
        ? 'h-12 pl-10.5 pr-4 text-[15px] rounded-xl'
        : 'h-10 pl-10 pr-3.5 text-sm rounded-rp-input';
  const sizerTextClass =
    resolvedSize === 'sm' ? 'pl-8.5 pr-8 text-xs' : resolvedSize === 'lg' ? 'pl-10.5 pr-9 text-[15px]' : 'pl-10 pr-9 text-sm';
  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) {
      onChange({ target: { value: '' }, currentTarget: { value: '' } });
    }
  };
  return (
    <div
      className={cx(
        'relative',
        fitContent ? 'inline-grid min-w-[168px] max-w-full sm:max-w-[300px]' : 'w-full',
        className,
      )}
    >
      <Search
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-rp-text-muted',
          resolvedSize === 'sm' ? 'left-3 h-3.5 w-3.5' : 'left-3.5 h-4 w-4',
        )}
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={resolvedPlaceholder}
        className={cx(
          CONTROL_BASE,
          fitContent ? 'col-start-1 row-start-1 w-full min-w-0 pr-9' : cx('w-full', hasValue && 'pr-9'),
          sizeClass,
          '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
          'border-rp-line',
          inputClassName,
        )}
        {...rest}
      />
      {fitContent && (
        <>
          <span
            aria-hidden="true"
            className={cx('pointer-events-none col-start-1 row-start-1 flex h-0 select-none overflow-hidden whitespace-nowrap invisible', sizerTextClass)}
          >
            {resolvedPlaceholder}
          </span>
          {hasValue && (
            <span
              aria-hidden="true"
              className={cx('pointer-events-none col-start-1 row-start-1 flex h-0 select-none overflow-hidden whitespace-nowrap invisible', sizerTextClass)}
            >
              {String(value)}
            </span>
          )}
        </>
      )}
      {hasValue && !rest.disabled && !rest.readOnly && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={tr(clearLabel)}
          className={cx(
            'rp-focus absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full text-rp-text-muted hover:bg-rp-muted hover:text-rp-text',
            resolvedSize === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
          )}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});

/**
 * Premium Sakura Custom Select / Dropdown Listbox.
 * Supports single-select, search filtering, option icons, status color dots,
 * count badges, selected checkmarks, Portal menu placement (never clipped by overflow-hidden),
 * keyboard navigation (ArrowUp/Down, Home/End, Enter, Space, Escape), and full ARIA combobox/listbox a11y.
 */
export const CustomSelect = forwardRef(function CustomSelect(
  {
    value,
    onChange,
    options = [],
    placeholder = 'Chọn...',
    label,
    size = 'md',
    align = 'start',
    fitContent = false,
    disabled = false,
    readOnly = false,
    loading = false,
    invalid = false,
    error = null,
    clearable = false,
    searchable = false,
    searchPlaceholder = 'Tìm kiếm...',
    emptyMessage = 'Không có lựa chọn',
    className,
    triggerClassName,
    menuClassName,
    dataTestId,
    'data-testid': dataTestIdProp,
    testIdPrefix = 'select-option',
    icon: LeadIcon,
    id: propId,
    name,
    'aria-describedby': ariaDescribedBy,
    children,
    ...rest
  },
  forwardedRef,
) {
  const { tr } = useLocale();
  const generatedId = useId();
  const selectId = propId || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const itemRefs = useRef([]);
  const wasOpenRef = useRef(false);

  // Normalize options: handles array of objects, primitives, or nested React <option>/Fragment children
  const normalizedOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (opt == null) return { value: '', label: '' };
        if (typeof opt !== 'object') return { value: String(opt), label: String(opt) };
        return {
          value: opt.value != null ? String(opt.value) : opt.id != null ? String(opt.id) : '',
          label: opt.label != null ? String(opt.label) : opt.name != null ? String(opt.name) : String(opt.value ?? opt.id ?? ''),
          icon: opt.icon,
          dotClass: opt.dotClass,
          count: opt.count,
          description: opt.description,
          disabled: Boolean(opt.disabled),
        };
      });
    }
    if (children) {
      const list = [];
      const iterate = (nodes) => {
        if (nodes == null || typeof nodes === 'boolean') return;
        if (Array.isArray(nodes)) {
          nodes.forEach(iterate);
          return;
        }
        if (nodes.type === Fragment) {
          iterate(nodes.props?.children);
          return;
        }
        if (nodes.type === 'option') {
          const text = Array.isArray(nodes.props?.children)
            ? nodes.props.children.map((part) => (part == null ? '' : String(part))).join('')
            : nodes.props?.children ?? nodes.props?.value ?? '';
          list.push({
            value: String(nodes.props?.value ?? ''),
            label: String(text),
            disabled: Boolean(nodes.props?.disabled),
          });
        }
      };
      iterate(children);
      return list;
    }
    return [];
  }, [options, children]);

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return null;
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        tr(opt.label).toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)),
    );
  }, [normalizedOptions, searchable, searchQuery, tr]);

  const updateMenuPosition = useMemo(() => () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < 230 && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, fitContent ? 156 : 200);
    const left = align === 'end'
      ? Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      : Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    setMenuStyle({
      position: 'fixed',
      left,
      minWidth: width,
      maxWidth: 'calc(100vw - 24px)',
      ...(flip ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      zIndex: 200,
    });
  }, [align, fitContent]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      const idx = Math.max(0, filteredOptions.findIndex((opt) => String(opt.value) === String(value)));
      setActiveIndex(idx);
      const timer = window.setTimeout(() => {
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          itemRefs.current[idx]?.focus();
        }
      }, 16);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, searchable, filteredOptions, value, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = (opt) => {
    if (opt.disabled || disabled || readOnly) return;
    const nextVal = opt.value;
    if (onChange) {
      const event = {
        target: { value: nextVal, name },
        currentTarget: { value: nextVal, name },
      };
      onChange(nextVal, event);
    }
    setOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled || readOnly) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    const total = filteredOptions.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (total === 0) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % total;
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (total === 0) return;
      setActiveIndex((prev) => {
        const next = (prev - 1 + total) % total;
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (total === 0) return;
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      if (total === 0) return;
      const last = total - 1;
      setActiveIndex(last);
      itemRefs.current[last]?.focus();
    } else if (e.key === 'Enter' && e.target !== searchInputRef.current) {
      e.preventDefault();
      const picked = filteredOptions[activeIndex];
      if (picked) handleSelect(picked);
    } else if (e.key === ' ' && !searchable && e.target === triggerRef.current) {
      e.preventDefault();
      const picked = filteredOptions[activeIndex];
      if (picked) handleSelect(picked);
    }
  };

  const isInvalid = invalid || Boolean(error);
  const showClear = clearable && Boolean(selectedOption) && !disabled && !readOnly;
  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-3 text-xs rounded-[10px] font-semibold'
      : size === 'lg'
        ? 'h-12 px-4 text-[15px] rounded-xl font-semibold'
        : 'h-10 px-3.5 text-sm rounded-xl font-semibold';

  const menuNode = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      data-rp-floating-portal="true"
      role="listbox"
      aria-label={label || tr(placeholder)}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={menuStyle || undefined}
      className={cx(
        'rp-anim-pop rounded-rp-card border border-rp-line bg-rp-surface py-1 shadow-rp-pop focus:outline-none',
        !menuStyle && 'absolute top-[calc(100%+6px)] left-0 z-[120] min-w-[200px] w-full',
        menuClassName,
      )}
    >
      {searchable && (
        <div className="border-b border-rp-line p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rp-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(searchPlaceholder)}
              className="w-full rounded-lg border border-rp-line bg-rp-bg-2 py-1.5 pl-8 pr-2.5 text-xs text-rp-text placeholder:text-rp-text-disabled focus:border-rp-brand focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="hide-scrollbar max-h-60 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-rp-text-muted">
            <SakuraSpinner size={14} tone="brand" />
            <span>{tr('Đang tải...')}</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-center text-xs text-rp-text-muted">
            {tr(emptyMessage)}
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
            return (
              <button
                key={`${opt.value}-${idx}`}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                disabled={opt.disabled}
                data-testid={`${testIdPrefix}-${opt.value}`}
                onClick={() => handleSelect(opt)}
                className={cx(
                  'flex w-full items-center justify-between gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40',
                  isSelected
                    ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong'
                    : 'font-medium text-rp-text hover:bg-rp-bg-2 focus:bg-rp-bg-2',
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  {opt.dotClass && (
                    <span
                      aria-hidden="true"
                      className={cx('h-2 w-2 shrink-0 rounded-full', opt.dotClass)}
                    />
                  )}
                  {opt.icon && <opt.icon className="h-4 w-4 shrink-0 text-rp-text-muted" />}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block truncate">{tr(opt.label)}</span>
                    {opt.description && (
                      <span className="block truncate text-[11px] font-normal text-rp-text-muted">
                        {tr(opt.description)}
                      </span>
                    )}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-1.5">
                  {opt.count != null && (
                    <span className="rounded-full bg-rp-bg-2 px-1.5 py-px text-[10.5px] font-semibold text-rp-text-muted">
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-rp-brand-strong" />
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  const triggerContent = (
    <>
      {LeadIcon && <LeadIcon className="h-4 w-4 shrink-0 text-rp-text-muted" />}
      {selectedOption?.dotClass && (
        <span
          aria-hidden="true"
          className={cx('h-2 w-2 shrink-0 rounded-full', selectedOption.dotClass)}
        />
      )}
      {selectedOption?.icon && (
        <selectedOption.icon className="h-4 w-4 shrink-0 text-rp-text-muted" />
      )}
      <span className={cx('truncate', !selectedOption && 'text-rp-text-disabled')}>
        {selectedOption ? tr(selectedOption.label) : tr(placeholder)}
      </span>
      {selectedOption?.count != null && (
        <span className="rounded-full bg-rp-bg-2 px-1.5 py-px text-[10.5px] font-semibold text-rp-text-muted">
          {selectedOption.count}
        </span>
      )}
    </>
  );

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={cx('relative inline-block text-left', fitContent ? 'w-fit max-w-full' : 'w-full', className)}
    >
      <button
        ref={(el) => {
          triggerRef.current = el;
          if (typeof forwardedRef === 'function') forwardedRef(el);
          else if (forwardedRef) forwardedRef.current = el;
        }}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={label}
        aria-invalid={isInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => {
          if (!disabled && !readOnly) setOpen((prev) => !prev);
        }}
        data-testid={dataTestIdProp || dataTestId}
        className={cx(
          'rp-focus flex items-center justify-between gap-2 border bg-rp-surface text-rp-text transition-[border-color,box-shadow,background-color] duration-150',
          fitContent ? 'w-auto max-w-full' : 'w-full',
          sizeClasses,
          showClear && 'pr-12',
          isInvalid
            ? 'border-rp-danger focus-visible:ring-2 focus-visible:ring-rp-danger/30'
            : 'border-rp-line hover:border-rp-brand-border focus-visible:border-rp-brand-border focus-visible:shadow-[0_0_0_3px_rgba(204,75,107,0.14)]',
          open && !isInvalid && 'border-rp-brand-border shadow-[0_0_0_3px_rgba(204,75,107,0.14)]',
          disabled && 'cursor-not-allowed bg-rp-muted opacity-60 text-rp-text-disabled',
          triggerClassName,
        )}
        {...rest}
      >
        {fitContent ? (
          <span className="inline-grid min-w-0 items-center text-left">
            <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 truncate text-left">
              {triggerContent}
            </span>
            {[
              { key: 'placeholder', label: tr(placeholder) },
              ...normalizedOptions.map((opt, idx) => ({ ...opt, key: `${opt.value}-${idx}`, label: tr(opt.label) })),
            ].map((sizer) => (
              <span
                key={`sizer-${sizer.key}`}
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 flex h-0 select-none items-center gap-2 overflow-hidden whitespace-nowrap invisible"
              >
                {LeadIcon && <span className="h-4 w-4 shrink-0" />}
                {sizer.dotClass && <span className="h-2 w-2 shrink-0" />}
                {sizer.icon && <span className="h-4 w-4 shrink-0" />}
                <span>{sizer.label}</span>
                {sizer.count != null && (
                  <span className="rounded-full px-1.5 py-px text-[10.5px] font-semibold">
                    {sizer.count}
                  </span>
                )}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
            {triggerContent}
          </span>
        )}

        <ChevronDown
          aria-hidden="true"
          className={cx(
            'h-4 w-4 shrink-0 text-rp-text-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {showClear && (
        <button
          type="button"
          aria-label={tr('Xóa lựa chọn')}
          onClick={(e) => {
            e.stopPropagation();
            if (onChange) onChange('', { target: { value: '', name } });
            triggerRef.current?.focus();
          }}
          className="rp-focus absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}

      {menuNode && (typeof document !== 'undefined' ? createPortal(menuNode, document.body) : menuNode)}
    </div>
  );
});

/**
 * Shared StatusDotListbox built directly on CustomSelect for toolbar status filters.
 */
export function StatusDotListbox({ size = 'sm', placeholder = 'Trạng thái', fitContent = true, ...rest }) {
  return <CustomSelect size={size} placeholder={placeholder} fitContent={fitContent} {...rest} />;
}

export const Select = forwardRef(function Select({ native = false, invalid, size = 'md', className, children, options, style, ...rest }, ref) {
  if (native) {
    const resolvedSize = size === 'sm' || size === 'lg' ? size : 'md';
    const nativeSizeClass =
      resolvedSize === 'sm'
        ? 'h-8 text-xs rounded-[10px]'
        : resolvedSize === 'lg'
          ? 'h-12 text-[15px] rounded-xl'
          : 'h-10 text-sm';
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, nativeSizeClass, 'py-0 leading-snug cursor-pointer appearance-none overflow-hidden text-ellipsis whitespace-nowrap bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10', invalid ? 'border-rp-danger' : 'border-rp-line', className)}
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
  }
  return <CustomSelect ref={ref} invalid={invalid} size={size} className={className} options={options} {...rest}>{children}</CustomSelect>;
});

function AnimatedTick({ sizeClass = 'h-[15px] w-[15px]', className }) {
  return (
    <svg viewBox="0 0 16 16" className={sizeClass} fill="none">
      <path
        className={className}
        d="M2.6 8.3 6.3 12 13.4 4.2"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
    </svg>
  );
}

export function Radio({ label, description, className, ...rest }) {
  const { tr } = useLocale();
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-rp-text', className)}>
      {/* Native radio stays focusable/accessible; selected circle pops & draws its checkmark just like Checkbox. */}
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input id={id} type="radio" className="rp-radio peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" {...rest} />
        <span aria-hidden="true" className="rp-radio-box pointer-events-none flex h-full w-full items-center justify-center rounded-full border-2 border-rp-line-strong bg-rp-surface transition-all">
          <AnimatedTick sizeClass="h-[13px] w-[13px]" className="rp-radio-tick" />
        </span>
      </span>
      <span>
        {label && <span className="font-medium">{tr(label)}</span>}
        {description && <span className="block text-xs text-rp-text-muted">{tr(description)}</span>}
      </span>
    </label>
  );
}

export function Checkbox({ label, description, indeterminate = false, className, ...rest }) {
  const { tr } = useLocale();
  const id = useId();
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  const hasText = Boolean(label || description);

  return (
    <label
      htmlFor={id}
      className={cx(
        'inline-flex items-start text-sm text-rp-text',
        rest.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        hasText && 'flex gap-2.5',
        className,
      )}
    >
      {/* Native input stays focusable/accessible; the visible box draws its tick or dash when checked/indeterminate. */}
      <span className={cx('relative inline-flex h-[18px] w-[18px] shrink-0', hasText && 'mt-0.5')}>
        <input id={id} type="checkbox" className="rp-check peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" ref={inputRef} aria-checked={indeterminate ? 'mixed' : rest.checked} {...rest} />
        <span aria-hidden="true" className="rp-check-box pointer-events-none flex h-full w-full items-center justify-center rounded-[5px] border-[1.5px] border-rp-line-strong bg-rp-surface">
          {indeterminate ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-[14px] w-[14px] text-white" aria-hidden="true">
              <path d="M3.5 8h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          ) : (
            <AnimatedTick sizeClass="h-[15px] w-[15px]" className="rp-check-tick" />
          )}
        </span>
      </span>
      {hasText && (
        <span>
          {label && <span className="font-medium">{tr(label)}</span>}
          {description && <span className="block text-xs text-rp-text-muted">{tr(description)}</span>}
        </span>
      )}
    </label>
  );
}

/**
 * On/off switch (role="switch"). Use for settings that apply immediately or a single option such as
 * "Lặp theo tuần"; use Checkbox for items in a list. Keyboard: Space toggles (native checkbox).
 * Vertically centered on the OY axis against its title + description block so single- and multi-line rows align evenly.
 */
/**
 * Shared Switch (controlled). `onChange` receives the native change event (legacy contract);
 * prefer `onCheckedChange(nextBoolean)` — it never leaks the event object into boolean state.
 * `loading` keeps the current value visible but blocks input while an async save is in flight.
 */
export function Switch({
  label,
  description,
  className,
  checked,
  onChange,
  onCheckedChange,
  disabled,
  loading = false,
  fullWidth = false,
  ...rest
}) {
  const { tr } = useLocale();
  const id = useId();
  const hasCopy = Boolean(label || description);
  const isOn = Boolean(checked);
  const blocked = Boolean(disabled || loading);
  return (
    <label
      htmlFor={id}
      className={cx(
        'text-sm text-rp-text select-none',
        hasCopy
          ? cx('flex min-h-[44px] items-center gap-3.5 py-1', fullWidth && 'w-full')
          : 'inline-flex items-center justify-center',
        disabled ? 'cursor-not-allowed opacity-60' : loading ? 'cursor-progress' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={isOn}
          aria-busy={loading || undefined}
          checked={isOn}
          onChange={(e) => {
            if (blocked) return;
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          disabled={blocked}
          className="rp-switch peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span aria-hidden="true" className="rp-switch-track pointer-events-none h-full w-full rounded-full border border-rp-line-strong bg-rp-muted" />
        <span aria-hidden="true" className="rp-switch-thumb pointer-events-none absolute left-[3px] top-[3px] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
          {loading && <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-rp-brand-pressed border-t-transparent motion-reduce:animate-none" />}
        </span>
      </span>
      {hasCopy && (
        <span className="min-w-0 flex-1 space-y-0.5">
          {label && (
            <span className="block text-[13.5px] font-semibold leading-5 text-rp-text">
              {tr(label)}
            </span>
          )}
          {description && (
            <span className="block text-xs leading-[18px] text-rp-text-muted">
              {tr(description)}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

const DEFAULT_WEEKDAY_OPTIONS = [
  { value: 1, short: 'T2', full: 'Thứ 2', jaShort: '月', jaFull: '月曜日' },
  { value: 2, short: 'T3', full: 'Thứ 3', jaShort: '火', jaFull: '火曜日' },
  { value: 3, short: 'T4', full: 'Thứ 4', jaShort: '水', jaFull: '水曜日' },
  { value: 4, short: 'T5', full: 'Thứ 5', jaShort: '木', jaFull: '木曜日' },
  { value: 5, short: 'T6', full: 'Thứ 6', jaShort: '金', jaFull: '金曜日' },
  { value: 6, short: 'T7', full: 'Thứ 7', jaShort: '土', jaFull: '土曜日' },
  { value: 0, short: 'CN', full: 'Chủ nhật', jaShort: '日', jaFull: '日曜日' },
];

/**
 * Multi-select weekday chip group. Starts empty (`value = []`) unless stored preferences exist;
 * 1st click selects with a distinct Sakura check indicator, 2nd click deselects cleanly down to empty.
 */
export function WeekdayPicker({
  value = [],
  onChange,
  options,
  size = 'md',
  disabled = false,
  invalid = false,
  className,
  'aria-label': ariaLabel,
}) {
  const { locale, tr } = useLocale();
  const selectedSet = useMemo(() => new Set(Array.isArray(value) ? value : []), [value]);
  const items = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) => ({
        value: opt.value,
        short: tr(opt.short || opt.label),
        full: tr(opt.full || opt.label || opt.short),
        disabled: Boolean(opt.disabled),
      }));
    }
    return DEFAULT_WEEKDAY_OPTIONS.map((d) => ({
      value: d.value,
      short: locale === 'ja' ? d.jaShort : d.short,
      full: locale === 'ja' ? d.jaFull : d.full,
      disabled: false,
    }));
  }, [options, locale, tr]);

  const orderMap = useMemo(() => {
    const map = new Map();
    items.forEach((opt, idx) => map.set(opt.value, idx));
    return map;
  }, [items]);

  const chipSizeClass = size === 'sm'
    ? 'h-8 min-w-[60px] px-2.5 text-xs rounded-[10px]'
    : 'h-10 min-w-[70px] px-3 text-[13px] rounded-xl';

  const handleToggle = (dayValue) => {
    if (disabled) return;
    const next = selectedSet.has(dayValue)
      ? items.filter((opt) => selectedSet.has(opt.value) && opt.value !== dayValue).map((opt) => opt.value)
      : [...selectedSet, dayValue].sort((a, b) => (orderMap.get(a) ?? 99) - (orderMap.get(b) ?? 99));
    onChange?.(next);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel || tr('Chọn ngày trong tuần')}
      aria-invalid={invalid || undefined}
      className={cx('flex flex-wrap gap-2', className)}
    >
      {items.map((opt) => {
        const selected = selectedSet.has(opt.value);
        const itemDisabled = disabled || opt.disabled;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={itemDisabled}
            aria-label={opt.full}
            title={opt.full}
            aria-pressed={selected}
            data-selected={selected ? 'true' : 'false'}
            onClick={() => handleToggle(opt.value)}
            className={cx(
              'rp-focus inline-flex shrink-0 items-center justify-center gap-1.5 border transition-[background-color,border-color,color,box-shadow] duration-150 select-none',
              chipSizeClass,
              selected
                ? 'border-rp-brand-pressed bg-rp-brand-tint font-bold text-rp-brand-strong shadow-rp-xs hover:bg-rp-brand-soft'
                : invalid
                  ? 'border-rp-danger/70 bg-rp-surface font-semibold text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-text'
                  : 'border-rp-line-strong bg-rp-surface font-semibold text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint/60 hover:text-rp-text',
              itemDisabled && 'cursor-not-allowed opacity-50 hover:bg-rp-surface',
            )}
          >
            {selected && (
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rp-brand-pressed text-white"
              >
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
            <span className="leading-none">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Native date picker styled consistently with FIELD_SIZES. */
export const DateInput = forwardRef(function DateInput({ className, ...props }, ref) {
  return <Input ref={ref} type="date" className={cx('tabular-nums', className)} {...props} />;
});

const CLOCK_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

function normalizeClock24(raw) {
  if (typeof raw !== 'string') return '';
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildMinuteOptions(stepSeconds, currentMinute) {
  const stepMins = Math.max(1, Math.min(60, Math.round(Number(stepSeconds || 300) / 60)));
  const set = new Set();
  for (let m = 0; m < 60; m += stepMins) {
    set.add(String(m).padStart(2, '0'));
  }
  if (currentMinute && /^\d{2}$/.test(currentMinute)) {
    set.add(currentMinute);
  }
  return Array.from(set).sort((a, b) => Number(a) - Number(b));
}

function isClockInBounds(clock, minClock, maxClock) {
  if (!clock) return false;
  if (minClock && clock < minClock) return false;
  if (maxClock && clock > maxClock) return false;
  return true;
}

/**
 * Custom 24h (`HH:mm`) Time Dropdown built to match CustomSelect & FIELD_SIZES (32px / 40px / 48px).
 * Clicking anywhere on the trigger opens a Portal two-column Hour/Minute selector with Escape/focus handling.
 */
export const TimeInput = forwardRef(function TimeInput(
  {
    value,
    defaultValue = '',
    onChange,
    name,
    placeholder = '--:--',
    clearLabel = 'Xóa giờ',
    size = 'md',
    fitContent = false,
    step = 300,
    min,
    max,
    disabled = false,
    readOnly = false,
    required = false,
    invalid = false,
    clearable,
    align = 'start',
    className,
    triggerClassName,
    menuClassName,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const { tr } = useLocale();
  const isControlled = value !== undefined;
  const [internalClock, setInternalClock] = useState(() => normalizeClock24(defaultValue));
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  const popupId = useId();
  const currentClock = normalizeClock24(isControlled ? value : internalClock);
  const [selectedHour = '', selectedMinute = ''] = currentClock ? currentClock.split(':') : ['', ''];
  const minClock = normalizeClock24(min || '');
  const maxClock = normalizeClock24(max || '');
  const minuteOptions = useMemo(() => buildMinuteOptions(step, selectedMinute), [step, selectedMinute]);

  const resolvedSize = size === 'sm' || size === 'lg' ? size : 'md';
  const sizeClasses = FIELD_SIZES[resolvedSize];
  const showClear = !disabled && !readOnly && !required && Boolean(currentClock) && clearable !== false;

  const setTriggerRefs = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const emitClock = (nextRaw) => {
    const nextClock = normalizeClock24(nextRaw);
    if (!isControlled) setInternalClock(nextClock);
    if (onChange) {
      onChange({
        target: { value: nextClock, name },
        currentTarget: { value: nextClock, name },
      });
    }
  };

  const updateMenuPosition = useMemo(() => () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < 310 && spaceAbove > spaceBelow;
    const width = Math.max(256, Math.min(284, rect.width > 256 ? rect.width : 264));
    const left = align === 'end'
      ? Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      : Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    setMenuStyle({
      position: 'fixed',
      left,
      width,
      maxWidth: 'calc(100vw - 24px)',
      ...(flip ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      zIndex: 200,
    });
  }, [align]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const timer = window.setTimeout(() => {
      const centerActive = (container) => {
        if (!container) return;
        const activeBtn = container.querySelector('[data-active="true"]');
        if (!activeBtn) return;
        container.scrollTop = Math.max(
          0,
          activeBtn.offsetTop - container.clientHeight / 2 + activeBtn.clientHeight / 2,
        );
      };
      centerActive(hourListRef.current);
      centerActive(minuteListRef.current);
    }, 16);
    return () => window.clearTimeout(timer);
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEscapeCapture = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onEscapeCapture, true);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onEscapeCapture, true);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const handleHourPick = (hh) => {
    const candidateMinutes = selectedMinute ? [selectedMinute, ...minuteOptions] : minuteOptions;
    const pickedMin = candidateMinutes.find((mm) => isClockInBounds(`${hh}:${mm}`, minClock, maxClock)) || minuteOptions[0] || '00';
    emitClock(`${hh}:${pickedMin}`);
  };

  const handleMinutePick = (mm) => {
    const fallbackHour = selectedHour || CLOCK_HOURS.find((hh) => isClockInBounds(`${hh}:${mm}`, minClock, maxClock)) || '08';
    emitClock(`${fallbackHour}:${mm}`);
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled || readOnly) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  };

  const menuNode = open ? (
    <div
      ref={menuRef}
      id={popupId}
      data-rp-floating-portal="true"
      role="dialog"
      aria-label={ariaLabel || tr('Chọn giờ')}
      style={menuStyle || undefined}
      className={cx(
        'rp-anim-pop overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-pop focus:outline-none',
        !menuStyle && 'absolute top-[calc(100%+6px)] left-0 z-[120] w-[264px]',
        menuClassName,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#EAE3E4] bg-[#FFFCF8] px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
          <span className="truncate text-xs font-semibold text-rp-text-2">{tr('Chọn giờ')}</span>
        </div>
        <span className="inline-flex h-6 min-w-[58px] items-center justify-center rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2 text-xs font-bold tabular-nums text-rp-brand-strong">
          {currentClock || placeholder}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#EAE3E4]">
        <div>
          <div className="border-b border-[#EAE3E4] bg-rp-surface px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
            {tr('Giờ')}
          </div>
          <div ref={hourListRef} className="max-h-[196px] space-y-0.5 overflow-y-auto p-1.5">
            {CLOCK_HOURS.map((hh) => {
              const active = hh === selectedHour;
              const hourValid = minuteOptions.some((mm) => isClockInBounds(`${hh}:${mm}`, minClock, maxClock));
              return (
                <button
                  key={hh}
                  type="button"
                  disabled={!hourValid}
                  data-active={active ? 'true' : undefined}
                  aria-pressed={active}
                  onClick={() => handleHourPick(hh)}
                  className={cx(
                    'rp-focus flex h-8 w-full items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors',
                    active
                      ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                      : 'font-medium text-rp-text hover:bg-rp-bg-2 hover:text-rp-brand-strong',
                    !hourValid && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-rp-text',
                  )}
                >
                  {hh}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="border-b border-[#EAE3E4] bg-rp-surface px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
            {tr('Phút')}
          </div>
          <div ref={minuteListRef} className="max-h-[196px] space-y-0.5 overflow-y-auto p-1.5">
            {minuteOptions.map((mm) => {
              const active = mm === selectedMinute;
              const targetHour = selectedHour || '00';
              const minValid = selectedHour
                ? isClockInBounds(`${targetHour}:${mm}`, minClock, maxClock)
                : CLOCK_HOURS.some((hh) => isClockInBounds(`${hh}:${mm}`, minClock, maxClock));
              return (
                <button
                  key={mm}
                  type="button"
                  disabled={!minValid}
                  data-active={active ? 'true' : undefined}
                  aria-pressed={active}
                  onClick={() => handleMinutePick(mm)}
                  className={cx(
                    'rp-focus flex h-8 w-full items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors',
                    active
                      ? 'bg-rp-brand-tint font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border'
                      : 'font-medium text-rp-text hover:bg-rp-bg-2 hover:text-rp-brand-strong',
                    !minValid && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-rp-text',
                  )}
                >
                  {mm}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#EAE3E4] bg-[#FFFCF8] px-3 py-2">
        {!required && currentClock ? (
          <button
            type="button"
            onClick={() => {
              emitClock('');
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="rp-focus inline-flex h-7 items-center rounded-lg px-2 text-xs font-semibold text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
          >
            {tr('Xóa')}
          </button>
        ) : (
          <span className="text-[11px] font-medium tabular-nums text-rp-text-muted">24h</span>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          className="rp-focus inline-flex h-7 items-center rounded-lg bg-rp-brand-pressed px-3 text-xs font-semibold text-white shadow-rp-xs hover:bg-rp-brand-strong"
        >
          {tr('Xong')}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cx(
        'relative',
        fitContent ? 'inline-grid max-w-full' : 'w-full',
        className,
      )}
    >
      <button
        ref={setTriggerRefs}
        type="button"
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-label={ariaLabel || tr('Chọn giờ')}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => {
          if (!disabled && !readOnly) setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          'rp-focus flex items-center justify-between gap-2 border bg-rp-surface text-rp-text transition-[border-color,box-shadow,background-color] duration-150',
          fitContent ? (resolvedSize === 'sm' ? 'min-w-[116px] w-auto max-w-full' : 'min-w-[132px] w-auto max-w-full') : 'w-full',
          sizeClasses,
          showClear && 'pr-12',
          invalid
            ? 'border-rp-danger focus-visible:ring-2 focus-visible:ring-rp-danger/30'
            : 'border-rp-line hover:border-rp-brand-border focus-visible:border-rp-brand-border focus-visible:shadow-[0_0_0_3px_rgba(204,75,107,0.14)]',
          open && !invalid && 'border-rp-brand-border shadow-[0_0_0_3px_rgba(204,75,107,0.14)]',
          disabled && 'cursor-not-allowed bg-rp-muted opacity-60 text-rp-text-disabled',
          triggerClassName,
        )}
        {...rest}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Clock aria-hidden="true" className={cx('h-4 w-4 shrink-0', currentClock ? 'text-rp-brand-strong' : 'text-rp-text-muted')} />
          <span className={cx('truncate font-medium tabular-nums', !currentClock && 'text-rp-text-disabled font-normal')}>
            {currentClock || placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cx('h-4 w-4 shrink-0 text-rp-text-muted transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {showClear && (
        <button
          type="button"
          aria-label={tr(clearLabel)}
          onClick={(e) => {
            e.stopPropagation();
            emitClock('');
            triggerRef.current?.focus();
          }}
          className="rp-focus absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}

      {menuNode && (typeof document !== 'undefined' ? createPortal(menuNode, document.body) : menuNode)}
    </div>
  );
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

export function SkeletonLoader({ variant = 'cards', count = 3, lines = 3, className }) {
  if (variant === 'lines' || variant === 'text') return <SkeletonText lines={lines} className={className} />;
  return <SkeletonCards count={count} className={className} />;
}

/* ------------------------------------------------------------------ Progress */

export function ProgressBar({ value = 0, max = 100, label, tone = 'brand', size = 'md', className }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const heightCls = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const fillCls =
    tone === 'success'
      ? 'bg-emerald-500'
      : tone === 'danger'
        ? 'bg-rose-500'
        : tone === 'warning'
          ? 'bg-amber-500'
          : tone === 'info'
            ? 'bg-sky-500'
            : 'bg-rp-brand';
  const trackCls = 'bg-[#E5E7EB]';
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className={cx('overflow-hidden rounded-full', trackCls, heightCls)}
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-500', fillCls)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Avatar */

/** Shared avatar primitive wrapping UserAvatar for backward compatibility. */
export function Avatar({ src, name, size = 40, className, rounded, loading, decorative, alt }) {
  return (
    <UserAvatar
      src={src}
      name={name}
      size={size}
      className={className}
      rounded={rounded}
      loading={loading}
      decorative={decorative}
      alt={alt}
    />
  );
}
