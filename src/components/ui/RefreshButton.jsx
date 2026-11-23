import { forwardRef, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tooltip } from './overlay.jsx';
import { cx } from './cx.js';
import { useLocale } from '@/locales/locale.js';

const SIZE_MAP = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-[8px]',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
};

const ICON_ONLY_SIZE_MAP = {
  xs: 'h-7 w-7 p-0 rounded-[8px]',
  sm: 'h-8 w-8 p-0 rounded-[10px]',
  md: 'h-10 w-10 p-0 rounded-xl',
  lg: 'h-12 w-12 p-0 rounded-xl',
};

const TONE_MAP = {
  sakura:
    'border border-rp-brand-border/75 bg-rp-surface text-rp-text shadow-rp-xs hover:border-rp-brand hover:bg-rp-brand-tint/85 hover:text-rp-brand-strong data-[refreshing=true]:border-rp-brand-border data-[refreshing=true]:bg-rp-brand-tint/70 data-[refreshing=true]:text-rp-brand-strong',
  subtle:
    'border border-rp-line bg-rp-surface text-rp-text-2 shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint/65 hover:text-rp-brand-strong data-[refreshing=true]:border-rp-brand-border data-[refreshing=true]:bg-rp-brand-tint/60 data-[refreshing=true]:text-rp-brand-strong',
  soft:
    'border border-rp-brand-soft bg-rp-brand-tint/80 text-rp-brand-strong hover:border-rp-brand-border hover:bg-rp-brand-soft/80 data-[refreshing=true]:bg-rp-brand-soft',
};

/**
 * Standardized RikiPath Refresh button (`RefreshCw` + "Làm mới").
 * Keeps the `RefreshCw` icon visible and spins it via `.rp-refresh-spin` CSS animation
 * while disabled + `aria-busy` until the active request completes.
 */
export const RefreshButton = forwardRef(function RefreshButton(
  {
    onRefresh,
    onClick,
    refreshing = false,
    loading = false,
    disabled = false,
    label = 'Làm mới',
    tooltip,
    iconOnly = false,
    size = 'sm',
    tone = 'sakura',
    className,
    iconClassName,
    type = 'button',
    ...rest
  },
  ref,
) {
  const { tr } = useLocale();
  const mountedRef = useRef(true);
  const [pendingAsync, setPendingAsync] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isSpinning = Boolean(refreshing || loading || pendingAsync);
  const isDisabled = Boolean(disabled || isSpinning);
  const handler = onRefresh || onClick;

  const resolvedLabel = tr(label);
  const resolvedTooltip = tooltip ? tr(tooltip) : iconOnly ? resolvedLabel : undefined;

  const handleClick = (event) => {
    if (isDisabled || typeof handler !== 'function') return;
    const outcome = handler(event);
    if (outcome && typeof outcome.then === 'function') {
      setPendingAsync(true);
      Promise.resolve(outcome).finally(() => {
        if (mountedRef.current) setPendingAsync(false);
      });
    }
  };

  const buttonNode = (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isSpinning || undefined}
      aria-label={rest['aria-label'] || (iconOnly ? resolvedTooltip || resolvedLabel : undefined)}
      data-refreshing={isSpinning ? 'true' : 'false'}
      data-testid={rest['data-testid'] || 'refresh-button'}
      onClick={handleClick}
      className={cx(
        'rp-focus rp-press group inline-flex shrink-0 cursor-pointer select-none items-center justify-center font-semibold transition-colors transform-gpu backface-hidden whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-65 motion-reduce:transform-none',
        TONE_MAP[tone] || TONE_MAP.sakura,
        iconOnly ? ICON_ONLY_SIZE_MAP[size] || ICON_ONLY_SIZE_MAP.sm : SIZE_MAP[size] || SIZE_MAP.sm,
        className,
      )}
      {...rest}
    >
      <RefreshCw
        aria-hidden="true"
        className={cx(
          size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5',
          'shrink-0 text-rp-brand-strong transition-transform',
          isSpinning && 'rp-refresh-spin',
          iconClassName,
        )}
      />
      {!iconOnly && <span>{resolvedLabel}</span>}
    </button>
  );

  if (resolvedTooltip) {
    return (
      <Tooltip content={resolvedTooltip} side="top">
        {buttonNode}
      </Tooltip>
    );
  }

  return buttonNode;
});

export default RefreshButton;
