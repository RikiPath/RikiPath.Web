import { cx } from './cx.js';
import { FloatingLabelScopeContext } from './floatingFieldLogic.js';
import { useLocale } from '@/locales/locale.js';

export function FloatingLabelScopeProvider({ enabled = true, children }) {
  return (
    <FloatingLabelScopeContext.Provider value={Boolean(enabled)}>
      {children}
    </FloatingLabelScopeContext.Provider>
  );
}

const OUTLINE_RADIUS = {
  sm: 'rounded-[10px]',
  md: 'rounded-rp-input',
  lg: 'rounded-xl',
};

const RESTING_LEADING_ICON_LEFT = {
  sm: 'left-8.5',
  md: 'left-10',
  lg: 'left-10.5',
};

const RESTING_TEXT_SIZE = {
  sm: 'text-xs font-normal',
  md: 'text-sm font-normal',
  lg: 'text-[15px] font-normal',
};

/**
 * Shared Material-style Outlined Floating Label + true `<fieldset>/<legend>` Notched Outline wrapper.
 * Breaks the top border cleanly without hardcoding notch widths or label backgrounds.
 */
export function OutlinedField({
  label,
  htmlFor,
  required = false,
  focused = false,
  open = false,
  hasValue = false,
  invalid = false,
  disabled = false,
  readOnly = false,
  multiline = false,
  hasLeadingIcon = false,
  hasTrailingControl = false,
  alwaysFloat = false,
  size = 'md',
  fitContent = false,
  className,
  labelClassName,
  fieldsetClassName,
  surfaceClass,
  children,
}) {
  const { tr } = useLocale();
  const resolvedSize = size === 'sm' || size === 'lg' ? size : 'md';
  const rawLabel = typeof label === 'string' ? tr(label) : label;
  const hasTrailingStar = typeof rawLabel === 'string' && /\s*\*\s*$/.test(rawLabel);
  const cleanLabel = hasTrailingStar ? rawLabel.replace(/\s*\*\s*$/, '') : rawLabel;
  const showRequiredStar = Boolean(required || hasTrailingStar);
  const isActive = Boolean(focused || open);
  const isFloated = Boolean(alwaysFloat || isActive || hasValue);

  const radiusClass = OUTLINE_RADIUS[resolvedSize];
  const restingLeft = hasLeadingIcon ? RESTING_LEADING_ICON_LEFT[resolvedSize] : 'left-3.5';
  const restingMaxWidth = hasTrailingControl
    ? (hasLeadingIcon ? 'max-w-[calc(100%-64px)]' : 'max-w-[calc(100%-40px)]')
    : (hasLeadingIcon ? 'max-w-[calc(100%-48px)]' : 'max-w-[calc(100%-28px)]');
  const restingVertical = multiline ? 'top-3 translate-y-0' : 'top-1/2 -translate-y-1/2';

  const borderToneClass = invalid
    ? (isActive ? 'border-[1.5px] border-rp-danger' : 'border border-rp-danger')
    : isActive
      ? 'border-[1.5px] border-rp-brand'
      : disabled
        ? 'border border-rp-line'
        : 'border border-rp-line group-hover/rpfield:border-rp-brand-border';

  const labelToneClass = invalid
    ? 'text-rp-danger'
    : isActive
      ? 'text-rp-brand-strong'
      : disabled
        ? 'text-rp-text-disabled'
        : 'text-rp-text-muted';

  const floatedBackdropClass = isFloated
    ? invalid
      ? 'bg-rp-danger-bg/35 backdrop-blur-[3px]'
      : isActive
        ? 'bg-rp-surface/55 backdrop-blur-[3px] [text-shadow:0_0_8px_rgba(224,90,122,0.14)]'
        : 'bg-rp-surface/40 backdrop-blur-[2px]'
    : '';

  return (
    <div
      className={cx(
        'rp-outlined-field group/rpfield relative min-w-0 transition-colors duration-150',
        radiusClass,
        surfaceClass ?? (disabled ? 'bg-rp-muted' : 'bg-rp-surface'),
        readOnly && !disabled && 'bg-rp-bg-2',
        fitContent ? 'inline-block w-fit max-w-full' : 'w-full',
        className,
      )}
    >
      {children}

      {cleanLabel && (
        <label
          htmlFor={htmlFor}
          className={cx(
            'rp-outlined-label pointer-events-none absolute z-[2] select-none truncate leading-[1.4] transition-[top,left,transform,font-size,color,background-color] duration-150 ease-out',
            isFloated
              ? 'top-0 left-3.5 max-w-[calc(100%-28px)] -translate-y-1/2 rounded-sm px-0.5 text-[11px] font-semibold'
              : cx(restingMaxWidth, restingVertical, restingLeft, RESTING_TEXT_SIZE[resolvedSize]),
            floatedBackdropClass,
            labelToneClass,
            labelClassName,
          )}
        >
          <span>{cleanLabel}</span>
          {showRequiredStar && (
            <span className="ml-0.5 text-rp-danger" aria-hidden="true">*</span>
          )}
        </label>
      )}

      <fieldset
        aria-hidden="true"
        className={cx(
          'rp-outlined-fieldset pointer-events-none absolute inset-x-0 bottom-0 m-0 min-w-0 rounded-[inherit] transition-[border-color,border-width] duration-150',
          borderToneClass,
          fieldsetClassName,
        )}
      >
        <legend
          data-floated={isFloated ? 'true' : 'false'}
          className="rp-outlined-legend ml-[13px] block h-[11px] w-auto overflow-hidden whitespace-nowrap p-0 text-[11px] font-semibold leading-[11px] invisible"
        >
          {cleanLabel ? (
            <span className="inline-block px-0.5">
              {cleanLabel}
              {showRequiredStar ? ' *' : ''}
            </span>
          ) : null}
        </legend>
      </fieldset>
    </div>
  );
}
