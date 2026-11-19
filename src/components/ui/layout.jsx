import { cx } from './cx.js';
import { getContainerClass, getFluidGridStyle, normalizeDensity } from './layoutLogic.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Semantic adaptive page container.
 * Uses CSS container queries (`.rp-cq`) by default so nested widgets adapt to parent width
 * (sidebar collapsed/expanded, split-screen, zoom, or mobile drawer) automatically.
 */
export function PageContainer({
  as: Tag = 'div',
  width = 'default',
  density = 'comfortable',
  containerQuery = true,
  paddedY = true,
  className,
  children,
  ...rest
}) {
  const resolvedDensity = normalizeDensity(density);
  return (
    <Tag
      data-density={resolvedDensity}
      className={cx(
        getContainerClass(width),
        containerQuery && 'rp-cq',
        paddedY && 'py-[var(--rp-space-page-y)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Fluid CSS Grid backed by repeat(auto-fit/auto-fill, minmax(min(100%, minItemWidth), 1fr)).
 * Never overflows at 320px and scales seamlessly up to 2560px without hardcoded laptop hacks.
 */
export function FluidGrid({
  as: Tag = 'div',
  minItemWidth = 'md',
  mode = 'fit',
  className,
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      style={getFluidGridStyle(minItemWidth, style)}
      className={cx(mode === 'fill' ? 'rp-fluid-grid-fill' : 'rp-fluid-grid', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Section block with fluid vertical rhythm, semantic fluid heading, and wrap-safe actions.
 */
export function ResponsiveSection({
  as: Tag = 'section',
  title,
  description,
  eyebrow,
  actions,
  density,
  className,
  headerClassName,
  children,
  ...rest
}) {
  const { tr } = useLocale();
  const resolvedDensity = density ? normalizeDensity(density) : undefined;
  return (
    <Tag
      data-density={resolvedDensity}
      className={cx('min-w-0 space-y-[var(--rp-space-stack)]', className)}
      {...rest}
    >
      {(title || description || actions || eyebrow) && (
        <div className={cx('flex flex-wrap items-end justify-between gap-3', headerClassName)}>
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="rp-type-caption mb-1 font-semibold uppercase tracking-[0.12em] text-rp-brand">
                {tr(eyebrow)}
              </p>
            )}
            {title && <h2 className="rp-type-section text-rp-text">{tr(title)}</h2>}
            {description && <p className="rp-type-secondary mt-0.5 text-rp-text-muted">{tr(description)}</p>}
          </div>
          {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/**
 * Surface card whose internal spacing obeys semantic density tokens (`compact` | `comfortable` | `spacious`).
 */
export function AdaptiveCard({
  as: Tag = 'section',
  density,
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}) {
  const resolvedDensity = density ? normalizeDensity(density) : undefined;
  return (
    <Tag
      data-density={resolvedDensity}
      className={cx(
        'min-w-0 rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs',
        padded && 'p-[var(--rp-space-card-pad)]',
        interactive && 'rp-card-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Two-column primary + contextual aside dashboard grid driven by container width (`.rp-cq-two-col`).
 * Automatically stacks when sidebar-expanded viewports (<820px inner width) need room, and splits
 * smoothly when sidebar collapses or viewport widens.
 */
export function DashboardGrid({
  as: Tag = 'div',
  aside,
  stickyAside = false,
  className,
  mainClassName,
  asideClassName,
  children,
  ...rest
}) {
  return (
    <Tag className={cx('rp-cq-two-col', className)} {...rest}>
      <div className={cx('min-w-0 space-y-[var(--rp-space-section)]', mainClassName)}>{children}</div>
      {aside && (
        <aside
          className={cx(
            'min-w-0 space-y-[var(--rp-space-grid)]',
            stickyAside && 'lg:sticky lg:top-[calc(var(--spacing-rp-topbar)+1rem)]',
            asideClassName,
          )}
        >
          {aside}
        </aside>
      )}
    </Tag>
  );
}

/**
 * Flex stack that safely wraps or transitions vertical->horizontal without overflowing narrow viewports.
 */
export function ResponsiveStack({
  as: Tag = 'div',
  stackBelow = 'sm',
  align = 'center',
  justify = 'between',
  wrap = true,
  className,
  children,
  ...rest
}) {
  const dirClass =
    stackBelow === 'md'
      ? 'flex-col md:flex-row'
      : stackBelow === 'lg'
        ? 'flex-col lg:flex-row'
        : stackBelow === 'none'
          ? 'flex-row'
          : 'flex-col sm:flex-row';
  const alignClass = align === 'start' ? 'items-start' : align === 'end' ? 'items-end' : 'items-stretch sm:items-center';
  const justifyClass =
    justify === 'start' ? 'justify-start' : justify === 'end' ? 'justify-end' : 'justify-between';

  return (
    <Tag
      className={cx(
        'flex min-w-0 gap-[var(--rp-space-stack)]',
        dirClass,
        alignClass,
        justifyClass,
        wrap && 'flex-wrap',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Enterprise table / dense data panel wrapper.
 * Isolates horizontal scrolling inside `.rp-scroll-x` while keeping chrome, filters, and pagination 100% visible.
 */
export function DataPanel({
  as: Tag = 'section',
  title,
  description,
  actions,
  toolbar,
  footer,
  density = 'compact',
  scrollable = true,
  className,
  bodyClassName,
  children,
  ...rest
}) {
  const { tr } = useLocale();
  const resolvedDensity = normalizeDensity(density);
  return (
    <Tag
      data-density={resolvedDensity}
      className={cx('min-w-0 overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs', className)}
      {...rest}
    >
      {(title || description || actions || toolbar) && (
        <div className="space-y-3 border-b border-rp-line p-[var(--rp-space-card-pad)]">
          {(title || description || actions) && (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {title && <h2 className="rp-type-card text-rp-text">{tr(title)}</h2>}
                {description && <p className="rp-type-secondary mt-0.5 text-rp-text-muted">{tr(description)}</p>}
              </div>
              {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {toolbar && <div className="min-w-0">{toolbar}</div>}
        </div>
      )}
      <div className={cx(scrollable ? 'rp-scroll-x' : 'min-w-0', bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-rp-line">{footer}</div>}
    </Tag>
  );
}
