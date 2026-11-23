import { isValidElement } from 'react';
import { SearchInput } from './core.jsx';
import { RefreshButton } from './RefreshButton.jsx';
import { Tabs } from './overlay.jsx';
import { cx } from './cx.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Unified single-row workspace toolbar synchronizing Tabs (left) with Search, Filters & Actions (right).
 *
 * Desktop layout (>= lg): `[Tabs / Left]  |  [Search] [Filters] [Refresh] [Actions]`
 * Automatically wraps into clean stacked rows on narrow viewports with horizontal scrolling inside the Tabs zone only,
 * preventing page overflow and keeping dropdown popovers unclipped.
 */
export function UnifiedToolbar({
  tabs,
  left,
  search,
  filters,
  refresh,
  actions,
  children,
  surface = 'card',
  divider = true,
  className,
  leftClassName,
  rightClassName,
  ariaLabel,
}) {
  const { tr } = useLocale();

  const tabItems = Array.isArray(tabs)
    ? tabs
    : Array.isArray(tabs?.items)
      ? tabs.items
      : Array.isArray(tabs?.tabs)
        ? tabs.tabs
        : [];
  const hasTabs = tabItems.length > 0 && tabs && typeof tabs.onChange === 'function';
  const hasLeft = hasTabs || Boolean(left);

  const hasSearch = Boolean(search && typeof search === 'object');
  const canRenderRefresh = Boolean(refresh) && (
    isValidElement(refresh)
      ? true
      : typeof refresh === 'object' && refresh.when !== false
  );
  const renderedRefresh = canRenderRefresh
    ? isValidElement(refresh)
      ? refresh
      : (
          <RefreshButton
            onRefresh={refresh.onRefresh}
            refreshing={refresh.refreshing}
            disabled={refresh.disabled}
            label={refresh.label || 'Làm mới'}
            tooltip={refresh.tooltip}
            iconOnly={refresh.iconOnly}
            size={refresh.size || 'md'}
            tone={refresh.tone || 'sakura'}
            className={refresh.className}
          />
        )
    : null;
  const hasRight = hasSearch || Boolean(filters) || Boolean(children) || Boolean(renderedRefresh) || Boolean(actions);

  if (!hasLeft && !hasRight) return null;

  const surfaceClass =
    surface === 'card'
      ? 'rounded-rp-card border border-rp-line bg-rp-surface px-3 py-2.5 shadow-rp-xs sm:px-3.5'
      : surface === 'subtle'
        ? 'rounded-rp-card border border-rp-line/80 bg-rp-bg-2/70 px-3 py-2'
        : '';

  return (
    <div
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel ? tr(ariaLabel) : undefined}
      className={cx(
        'rp-unified-toolbar rp-admin-filterbar flex min-w-0 shrink-0 flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3',
        surfaceClass,
        className,
      )}
    >
      {hasLeft && (
        <div
          className={cx(
            'flex min-w-0 max-w-full items-center gap-2',
            hasRight ? 'lg:flex-[0_1_auto]' : 'w-full',
            leftClassName,
          )}
        >
          {hasTabs && (
            <Tabs
              variant={tabs.variant || 'pill'}
              tone={tabs.tone || 'default'}
              size={tabs.size || 'md'}
              label={tabs.label ? tr(tabs.label) : tr('Điều hướng danh mục')}
              value={tabs.value}
              onChange={tabs.onChange}
              tabs={tabItems}
              className={cx('min-w-0 max-w-full', tabs.className)}
            />
          )}
          {left}
        </div>
      )}

      {hasLeft && hasRight && divider && (
        <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-rp-line lg:block" />
      )}

      {hasRight && (
        <div
          className={cx(
            'flex min-w-0 flex-wrap items-center gap-2',
            hasLeft ? 'lg:flex-1 lg:justify-end' : 'w-full',
            rightClassName,
          )}
        >
          {hasSearch && (
            <SearchInput
              fitContent={search.fitContent ?? true}
              value={search.value ?? ''}
              onChange={search.onChange}
              onClear={search.onClear}
              placeholder={search.placeholder || 'Tìm kiếm...'}
              aria-label={search.ariaLabel ? tr(search.ariaLabel) : tr('Tìm kiếm')}
              className={cx('w-full sm:w-auto sm:min-w-[190px] sm:max-w-[260px]', search.className)}
              inputClassName={search.inputClassName}
            />
          )}
          {filters}
          {children}
          {(renderedRefresh || actions) && (
            <div className={cx('flex shrink-0 flex-wrap items-center gap-2', !hasLeft && 'ml-auto')}>
              {renderedRefresh}
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UnifiedToolbar;
