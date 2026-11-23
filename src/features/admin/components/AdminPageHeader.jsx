import { isValidElement } from 'react';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Admin page heading.
 *
 * Management pages show no visual title/icon block: the breadcrumb in the global header and the active sidebar item
 * already name the page, so the title stays only as a screen-reader `h1`. Page actions belong in the page's toolbar
 * row; when a page has no toolbar, `badge` / `actions` render as one compact right-aligned row.
 *
 * `showTitle` keeps the visual title for detail pages whose heading is content (e.g. a user's name + email).
 */
export default function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className,
  showTitle = false,
}) {
  const { tr } = useLocale();
  const titleText = typeof title === 'string' ? tr(title) : title;

  if (!showTitle) {
    const hasRow = Boolean(badge || actions);
    return (
      <>
        <h1 className="sr-only">{titleText}</h1>
        {hasRow && (
          <div className={cx('flex shrink-0 flex-wrap items-center justify-end gap-2', className)}>
            {badge && <div className="mr-auto flex min-w-0 flex-wrap items-center gap-2">{badge}</div>}
            {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
      </>
    );
  }

  return (
    <header
      className={cx(
        'mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rp-line bg-rp-bg-2 text-rp-text-2"
          >
            {isValidElement(Icon) ? Icon : <Icon className="h-[18px] w-[18px]" strokeWidth={2} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[19px] font-bold tracking-[-0.015em] text-rp-text sm:text-[21px] sm:leading-7">
              {titleText}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 max-w-3xl text-[13px] leading-5 text-rp-text-muted">
              {typeof subtitle === 'string' ? tr(subtitle) : subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
