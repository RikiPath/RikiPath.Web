import { Fragment, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cx } from './cx.js';
import { useLocale } from '@/locales/locale.js';
import {
  confirmActiveNavigationGuards,
  hasActiveNavigationGuards,
  markPendingScrollRestore,
  readListViewState,
  resolveBackTarget,
} from '@/utils/navigationContext.js';

/* ------------------------------------------------------------------ BackButton */

/**
 * Global Context-Aware Back Button standard for every Detail / Result / Review / Edit page.
 * Resolves originating list/dashboard target safely (never calls raw `navigate(-1)`),
 * enforces unsaved-changes / active-exam guards, and signals scroll/filter restoration cleanly.
 */
export function BackButton({
  to,
  fallbackTo = '/',
  label,
  defaultOriginLabel,
  onClick,
  onBeforeNavigate,
  restoreListKey,
  variant = 'outline',
  size = 'sm',
  className,
  ...rest
}) {
  const { tr } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  const resolved = resolveBackTarget(location, {
    explicitTo: to,
    fallbackTo,
    fallbackLabel: label || 'Quay lại',
    defaultOriginLabel,
  });

  const targetLabel = label && (to || !resolved.fromOrigin) ? label : resolved.label;

  async function handleClick(event) {
    event.preventDefault();
    if (onClick) {
      onClick(event);
      if (event.defaultPrevented) return;
    }
    if (onBeforeNavigate) {
      const ok = await onBeforeNavigate();
      if (ok === false) return;
    }
    const guardsOk = await confirmActiveNavigationGuards();
    if (!guardsOk) return;

    let destination = resolved.to;
    if (restoreListKey) {
      const saved = readListViewState(restoreListKey);
      if (saved?.scrollTop != null) {
        markPendingScrollRestore(destination, saved.scrollTop);
      }
      if (!resolved.fromOrigin && !to && saved?.search && !destination.includes('?')) {
        destination = `${destination}${saved.search}`;
      }
    } else if (resolved.fromOrigin) {
      const saved = readListViewState(destination.split('?')[0]);
      if (saved?.scrollTop != null) {
        markPendingScrollRestore(destination, saved.scrollTop);
      }
    }

    navigate(destination);
  }

  const sizeClass = size === 'md' ? 'h-10 px-3.5 text-sm gap-2' : 'h-9 px-3 text-[13px] gap-1.5';
  const toneClass = variant === 'ghost'
    ? 'border border-transparent bg-transparent text-rp-text-2 hover:bg-rp-muted hover:text-rp-text'
    : 'border border-rp-line bg-rp-surface text-rp-text-2 shadow-rp-xs hover:border-rp-brand-border hover:bg-rp-brand-tint/40 hover:text-rp-brand-strong';

  return (
    <a
      href={resolved.to}
      onClick={handleClick}
      className={cx(
        'rp-focus rp-press inline-flex shrink-0 items-center rounded-rp-input font-semibold transition-colors duration-150',
        sizeClass,
        toneClass,
        className,
      )}
      {...rest}
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{tr(targetLabel)}</span>
    </a>
  );
}

/* ------------------------------------------------------------------ DetailPageHeader */

/**
 * Unified compact Detail Page Header for Result, Review, Lesson, Profile & Admin Detail workspaces.
 * Combines top-left Context-Aware `<BackButton>`, representative icon, single-row metadata strip, and actions.
 */
export function DetailPageHeader({
  backTo,
  backFallbackTo = '/',
  backLabel,
  backOriginLabel,
  restoreListKey,
  onBeforeBack,
  icon: Icon,
  iconTileClass = 'border-rp-brand-border/80 bg-rp-brand-tint text-rp-brand-strong',
  eyebrow,
  title,
  subtitle,
  description,
  badges,
  meta,
  actions,
  compact = false,
  className,
}) {
  const { tr } = useLocale();

  if (compact) {
    return (
      <header
        data-page-header="true"
        data-translate-scope="deny"
        className={cx(
          'rounded-rp-card border border-rp-line bg-rp-surface px-4 py-3 shadow-rp-xs sm:px-5 sm:py-3',
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
            <BackButton
              to={backTo}
              fallbackTo={backFallbackTo}
              label={backLabel}
              defaultOriginLabel={backOriginLabel}
              restoreListKey={restoreListKey}
              onBeforeNavigate={onBeforeBack}
            />
            <span aria-hidden="true" className="hidden h-4 w-px shrink-0 bg-rp-line sm:inline-block" />
            {Icon && (
              <span
                aria-hidden="true"
                className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border', iconTileClass)}
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-base font-bold leading-snug text-rp-text sm:text-[17px]">
                {title}
              </h1>
              {badges}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {(subtitle || description || meta) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rp-line/60 pt-2 text-xs text-rp-text-muted">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              {subtitle && <span className="font-medium text-rp-text-2">{subtitle}</span>}
              {description && <span>{description}</span>}
            </div>
            {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</div>}
          </div>
        )}
      </header>
    );
  }

  return (
    <header
      data-page-header="true"
      data-translate-scope="deny"
      className={cx(
        'rounded-rp-card border border-rp-line bg-rp-surface px-4 py-3.5 shadow-rp-xs sm:px-5 sm:py-4',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <BackButton
          to={backTo}
          fallbackTo={backFallbackTo}
          label={backLabel}
          defaultOriginLabel={backOriginLabel}
          restoreListKey={restoreListKey}
          onBeforeNavigate={onBeforeBack}
        />
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {Icon && (
            <span
              aria-hidden="true"
              className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', iconTileClass)}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-rp-brand-strong">
                {tr(eyebrow)}
              </p>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-bold leading-snug text-rp-text sm:text-xl">
                {title}
              </h1>
              {badges}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-rp-text-2 sm:text-[13px]">{subtitle}</p>
            )}
            {description && (
              <p className="mt-1 text-xs leading-5 text-rp-text-2 sm:text-[13px]">{description}</p>
            )}
            {meta && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-rp-text-muted">
                {meta}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Breadcrumb */

/**
 * Interactive Global Header Breadcrumb primitive.
 * - Clickable ancestor routes check active unsaved/exam guards cleanly.
 * - Group-only labels (no `to`) render cleanly as non-clickable separators.
 * - Collapses long trails gracefully on smaller screens while keeping keyboard focus & accessibility intact.
 */
export function Breadcrumb({ items = [], maxVisible = 4, className }) {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(items) || items.length === 0) return null;

  const shouldCollapse = !expanded && items.length > maxVisible;
  const visibleItems = shouldCollapse
    ? [items[0], { __ellipsis: true, label: '...' }, ...items.slice(-(maxVisible - 2))]
    : items;

  async function handleCrumbClick(event, to) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (hasActiveNavigationGuards()) {
      event.preventDefault();
      const allowed = await confirmActiveNavigationGuards();
      if (!allowed) return;
      const saved = readListViewState(String(to).split('?')[0]);
      if (saved?.scrollTop != null) {
        markPendingScrollRestore(to, saved.scrollTop);
      }
      navigate(to);
      return;
    }
    const saved = readListViewState(String(to).split('?')[0]);
    if (saved?.scrollTop != null) {
      markPendingScrollRestore(to, saved.scrollTop);
    }
  }

  return (
    <nav aria-label={tr('Đường dẫn điều hướng')} className={cx('min-w-0 overflow-hidden', className)}>
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden text-[12.5px] sm:text-[13px]">
        {visibleItems.map((crumb, i) => {
          const isLast = i === visibleItems.length - 1;
          if (crumb.__ellipsis) {
            return (
              <Fragment key="breadcrumb-ellipsis">
                <li className="flex shrink-0 items-center gap-1">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-disabled" />}
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    aria-label={tr('Hiển thị đầy đủ đường dẫn')}
                    className="rp-focus inline-flex h-6 w-6 items-center justify-center rounded text-rp-text-muted hover:bg-rp-muted hover:text-rp-text"
                  >
                    <MoreHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              </Fragment>
            );
          }

          const CrumbIcon = crumb.icon;
          const isClickable = Boolean(crumb.to) && !isLast;

          return (
            <li
              key={`${crumb.label}-${i}`}
              className={cx('flex min-w-0 items-center gap-1', !isLast && 'max-w-[140px] shrink sm:max-w-[180px]')}
            >
              {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-disabled" />}
              {isClickable ? (
                <Link
                  to={crumb.to}
                  onClick={(e) => handleCrumbClick(e, crumb.to)}
                  className="rp-focus inline-flex min-w-0 items-center gap-1.5 truncate rounded px-1 py-0.5 text-rp-text-muted transition-colors hover:bg-rp-muted/60 hover:text-rp-brand-strong"
                >
                  {CrumbIcon && <CrumbIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 stroke-[1.9]" />}
                  <span className="truncate">{tr(crumb.label)}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cx(
                    'inline-flex min-w-0 items-center gap-1.5 truncate px-1 py-0.5',
                    isLast ? 'font-semibold text-rp-text' : 'text-rp-text-muted',
                  )}
                >
                  {CrumbIcon && (
                    <CrumbIcon
                      aria-hidden="true"
                      className={cx('h-3.5 w-3.5 shrink-0 stroke-[1.9]', isLast && 'text-rp-brand-strong')}
                    />
                  )}
                  <span className="truncate">{tr(crumb.label)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
