import { forwardRef, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Info,
  Search,
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
  return (
    <Tag
      ref={ref}
      type={isNativeButton ? type : undefined}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      onClick={!isNativeButton && isDisabled ? (e) => e.preventDefault() : onClick}
      className={cx(
        'rp-focus inline-flex select-none items-center justify-center font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu backface-hidden disabled:cursor-not-allowed',
        wrap ? 'whitespace-normal text-left' : 'whitespace-nowrap',
        !isNativeButton && isDisabled && 'pointer-events-none opacity-60',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <SakuraSpinner size={size === 'sm' ? 14 : 18} tone={variant === 'primary' || variant === 'danger' ? 'light' : 'brand'} />
      ) : (
        Icon && (isValidElement(Icon) ? Icon : <Icon aria-hidden="true" className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />)
      )}
      {children != null && <span className={wrap ? 'leading-snug' : 'truncate'}>{children}</span>}
      {IconRight && !loading && (isValidElement(IconRight) ? IconRight : <IconRight aria-hidden="true" className="h-4 w-4 shrink-0" />)}
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

/** Shared red corner tag badge for top-bar circular icon controls (Language Globe, Smart Calendar, Notifications). */
export function HeaderIconBadge({ children, pulse = false, className }) {
  if (children == null || children === false) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5383B] px-1 text-[10px] font-bold leading-none text-white shadow-[0_2px_6px_-1px_rgba(229,56,59,0.55)]',
        pulse && 'rp-bell-badge-ping',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({ as: Tag = 'section', density, interactive = false, className, padded = true, padding, children, ...rest }) {
  const isPadded = padding !== undefined ? Boolean(padding) : padded;
  return (
    <Tag
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
    <header className={cx('mb-[var(--rp-space-section)] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
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
          <span>{typeof error === 'string' ? tr(error) : error}</span>
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

/* ------------------------------------------------------------------ Select & CustomSelect */

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Shared SearchInput with built-in leading Search icon and clear button.
 */
export const SearchInput = forwardRef(function SearchInput(
  { value = '', onChange, onClear, placeholder = 'Tìm kiếm...', clearLabel = 'Xóa tìm kiếm', className, inputClassName, ...rest },
  ref,
) {
  const { tr } = useLocale();
  const hasValue = String(value ?? '').length > 0;
  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) {
      onChange({ target: { value: '' }, currentTarget: { value: '' } });
    }
  };
  return (
    <div className={cx('relative w-full', className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={tr(placeholder)}
        className={cx(
          CONTROL,
          'h-11 pl-10',
          hasValue && 'pr-9',
          'border-rp-line',
          inputClassName,
        )}
        {...rest}
      />
      {hasValue && !rest.disabled && !rest.readOnly && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={tr(clearLabel)}
          className="rp-focus absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
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
    const width = Math.max(rect.width, 200);
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
  }, [align]);

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
        setOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
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
      ? 'h-8.5 px-3 text-[12.5px] rounded-xl font-semibold'
      : size === 'lg'
        ? 'h-12 px-4 text-[15px] rounded-rp-input font-medium'
        : 'min-h-11 h-11 px-3.5 text-sm rounded-rp-input font-medium';

  const menuNode = open ? (
    <div
      ref={menuRef}
      id={listboxId}
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

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={cx('relative inline-block w-full text-left', className)}
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
          'rp-focus flex w-full items-center justify-between gap-2 border bg-rp-surface text-rp-text transition-[border-color,box-shadow,background-color] duration-150',
          sizeClasses,
          showClear && 'pr-12',
          isInvalid
            ? 'border-rp-danger focus-visible:ring-2 focus-visible:ring-rp-danger/30'
            : 'border-rp-line hover:border-rp-brand-border focus-visible:border-rp-brand focus-visible:shadow-[0_0_0_3px_rgba(224,90,122,0.18)]',
          disabled && 'cursor-not-allowed bg-rp-muted opacity-60 text-rp-text-disabled',
          triggerClassName,
        )}
        {...rest}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
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
        </span>

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
export function StatusDotListbox({ size = 'sm', placeholder = 'Trạng thái', ...rest }) {
  return <CustomSelect size={size} placeholder={placeholder} {...rest} />;
}

export const Select = forwardRef(function Select({ native = false, invalid, className, children, options, style, ...rest }, ref) {
  if (native) {
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
  }
  return <CustomSelect ref={ref} invalid={invalid} className={className} options={options} {...rest}>{children}</CustomSelect>;
});

export function Radio({ label, description, className, ...rest }) {
  const { tr } = useLocale();
  const id = useId();
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-rp-text', className)}>
      <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input id={id} type="radio" className="rp-radio peer absolute inset-0 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" {...rest} />
        <span aria-hidden="true" className="rp-radio-box pointer-events-none flex h-full w-full items-center justify-center rounded-full border-[1.5px] border-rp-line-strong bg-rp-surface peer-checked:border-rp-brand peer-focus-visible:ring-2 peer-focus-visible:ring-rp-brand/40">
          <span className="h-2 w-2 rounded-full bg-rp-brand opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
      </span>
      <span>
        {label && <span className="font-medium">{tr(label)}</span>}
        {description && <span className="block text-xs text-rp-text-muted">{tr(description)}</span>}
      </span>
    </label>
  );
}

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

/** Paired start/end DateInputs with built-in inverted-range detection (`from > to`). */
export function DateRangePicker({
  from = '',
  to = '',
  onFromChange,
  onToChange,
  fromLabel = 'Từ ngày',
  toLabel = 'Đến ngày',
  min,
  max,
  disabled = false,
  className,
  inputClassName,
}) {
  const { tr } = useLocale();
  const invalidRange = Boolean(from && to && from > to);
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
          <span>{tr(fromLabel)}</span>
          <DateInput
            aria-label={tr(fromLabel)}
            value={from}
            min={min}
            max={to || max}
            disabled={disabled}
            invalid={invalidRange}
            onChange={(e) => onFromChange?.(e.target.value)}
            className={cx('h-9 w-auto min-w-[144px] text-xs', inputClassName)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-rp-text-muted">
          <span>{tr(toLabel)}</span>
          <DateInput
            aria-label={tr(toLabel)}
            value={to}
            min={from || min}
            max={max}
            disabled={disabled}
            invalid={invalidRange}
            onChange={(e) => onToChange?.(e.target.value)}
            className={cx('h-9 w-auto min-w-[144px] text-xs', inputClassName)}
          />
        </label>
      </div>
      {invalidRange && (
        <p role="alert" className="text-xs font-medium text-rp-danger">
          {tr('Ngày bắt đầu không thể lớn hơn ngày kết thúc.')}
        </p>
      )}
    </div>
  );
}

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
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className={cx('overflow-hidden rounded-full bg-rp-brand-soft', heightCls)}
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
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = Boolean(src) && failedSrc === src;
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) };
  if (src && !failed) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} style={style} className={cx('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span aria-hidden="true" style={style} className={cx('flex shrink-0 items-center justify-center rounded-full bg-rp-brand-tint font-bold text-rp-brand-strong', className)}>
      {initialsOf(name)}
    </span>
  );
}
