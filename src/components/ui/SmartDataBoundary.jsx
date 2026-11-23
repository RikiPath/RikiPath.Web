import { cloneElement, isValidElement, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Inbox,
  LogIn,
  RefreshCw,
  SearchX,
  ShieldAlert,
  TriangleAlert,
  WifiOff,
} from 'lucide-react';
import { recordDiagnostic } from '@/api/diagnostics.js';
import HaruMascot from './HaruMascot.jsx';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import { useLocale } from '@/locales/locale.js';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import {
  getContextualEmptyCopy,
  resolveDataState,
  resolveEmptyIllustration,
  resolveErrorPresentation,
  resolveOptionalWidgetPolicy,
} from './dataStateLogic.js';
import { RefreshButton } from './RefreshButton.jsx';
import { RefreshingIndicator, SakuraLoader } from './SakuraLoader.jsx';

const KIND_COPY = {
  offline: { Icon: WifiOff, title: 'Mất kết nối mạng', tone: 'text-rp-warning bg-rp-warning-bg' },
  expired: { Icon: LogIn, title: 'Phiên đăng nhập đã hết hạn', tone: 'text-rp-warning bg-rp-warning-bg' },
  forbidden: { Icon: ShieldAlert, title: 'Bạn không có quyền xem nội dung này', tone: 'text-rp-danger bg-rp-danger-bg' },
  notFound: { Icon: SearchX, title: 'Không tìm thấy dữ liệu', tone: 'text-rp-text-2 bg-rp-muted' },
  conflict: { Icon: RefreshCw, title: 'Dữ liệu vừa thay đổi', tone: 'text-rp-info bg-rp-info-bg' },
  error: { Icon: TriangleAlert, title: 'Chưa tải được dữ liệu', tone: 'text-rp-danger bg-rp-danger-bg' },
};

const EMPTY_ILLUSTRATION_SIZES = {
  sm: 96,
  md: 128,
  lg: 152,
};

/**
 * Removes redundant RefreshButton nodes from empty states so empty views never offer "Làm mới"
 * (API errors continue to use ContextualErrorState with "Thử lại").
 */
function stripRefreshAction(node) {
  if (!isValidElement(node) && !Array.isArray(node)) return node;
  if (Array.isArray(node)) {
    const next = node.map(stripRefreshAction).filter((child) => child != null && child !== false);
    return next.length > 0 ? next : null;
  }
  if (node.type === RefreshButton || node.props?.['data-testid'] === 'refresh-button') {
    return null;
  }
  const children = node.props?.children;
  if (children === undefined) return node;
  if (Array.isArray(children)) {
    const next = children.map(stripRefreshAction).filter((child) => child != null && child !== false);
    if (next.length === children.length && next.every((item, idx) => item === children[idx])) return node;
    return next.length > 0 ? cloneElement(node, undefined, ...next) : null;
  }
  const nextChild = stripRefreshAction(children);
  if (nextChild === children) return node;
  return nextChild == null || nextChild === false ? null : cloneElement(node, undefined, nextChild);
}

/**
 * Standard RikiPath EmptyStateCard container: full-width crisp white surface card for Empty & Error states.
 * ContextualEmptyState and ContextualErrorState apply `.rp-state-card` automatically unless nested
 * inside an existing Card, DataTable, Modal, Drawer, Popover, or white bordered box.
 */
export function EmptyStateCard({ className, padded = true, centered = true, children, ...rest }) {
  return (
    <section
      data-empty-card="true"
      data-rp-surface="true"
      className={cx(
        'w-full min-w-0 rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs',
        centered && 'flex min-h-[240px] flex-col items-center justify-center text-center',
        padded && 'px-5 py-8 sm:px-8 sm:py-10',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/**
 * Standardized RikiPath Sakura Empty State: strictly for verified empty Backend responses (never API errors).
 * Automatically renders inside a unified white `.rp-state-card` surface unless nested inside an existing card/table/dialog or using `variant="inline"`.
 * Supports `variant` ('default' | 'compact' | 'card' | 'inline' | 'search'), `illustration`, `title`,
 * `description`, `action`, `framed`, and `size` ('sm' | 'md' | 'lg' or number), plus backwards-compatible `art`,
 * `context`, `mascot`, `message`, `compact`.
 */
export function ContextualEmptyState({
  variant = 'default',
  framed,
  illustration,
  size,
  context,
  title,
  description,
  message,
  icon: Icon = Inbox,
  mascot,
  art,
  action,
  actions,
  actionLabel,
  onAction,
  className,
  compact = false,
}) {
  const { tr } = useLocale();
  const preset = context ? getContextualEmptyCopy(context) : null;
  const resolvedVariant = compact && variant === 'default' ? 'compact' : variant;
  const resolvedTitle = tr(title || preset?.title || 'Chưa có dữ liệu');
  const descInput = description !== undefined ? description : message;
  const resolvedDesc = descInput !== undefined ? (descInput ? tr(descInput) : '') : (preset?.description ? tr(preset.description) : '');
  const resolvedAction = stripRefreshAction(
    action
      ?? actions
      ?? (actionLabel && typeof onAction === 'function' ? (
        <Button variant="primary" size="sm" onClick={onAction}>
          {tr(actionLabel)}
        </Button>
      ) : undefined),
  );

  const resolvedSize = typeof size === 'number'
    ? size
    : EMPTY_ILLUSTRATION_SIZES[size]
      || (resolvedVariant === 'inline' ? 88 : resolvedVariant === 'compact' ? 104 : 132);

  const resolvedIllustration = illustration === false
    ? null
    : resolveEmptyIllustration({
        illustration,
        art,
        variant: resolvedVariant,
        context,
        title: title || preset?.title,
        description: descInput ?? preset?.description,
      });

  const isInline = resolvedVariant === 'inline';
  const isCompact = resolvedVariant === 'compact' || isInline;
  const shouldFrame = framed !== undefined ? Boolean(framed) : !isInline;

  return (
    <div
      data-ui-state="success-empty"
      data-empty-variant={resolvedVariant}
      data-empty-framed={shouldFrame ? 'true' : 'false'}
      className={cx(
        'flex flex-col items-center justify-center text-center',
        shouldFrame && 'rp-state-card',
        resolvedVariant === 'inline' && 'gap-2 rounded-rp-input bg-rp-bg-2/60 px-3.5 py-5',
        resolvedVariant === 'compact' && (shouldFrame ? 'gap-2.5' : 'gap-2.5 px-4 py-6'),
        (resolvedVariant === 'default' || resolvedVariant === 'search' || resolvedVariant === 'card') && (shouldFrame ? 'gap-3' : 'gap-3 px-4 py-10'),
        className,
      )}
    >
      {mascot ? (
        <HaruMascot
          pose={mascot}
          size={isInline ? 76 : isCompact ? 88 : 114}
          className="shrink-0"
        />
      ) : resolvedIllustration ? (
        <SpotArt name={resolvedIllustration} size={resolvedSize} className="max-w-full shrink-0" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      )}
      <div className="max-w-md">
        <p className={cx('font-bold text-rp-text', isInline ? 'text-sm' : 'text-[15px]')}>{resolvedTitle}</p>
        {resolvedDesc && (
          <p className={cx('mt-1 text-rp-text-muted', isInline ? 'text-xs leading-5' : 'text-sm leading-6')}>
            {resolvedDesc}
          </p>
        )}
      </div>
      {resolvedAction && <div className="mt-1 flex flex-wrap justify-center gap-2">{resolvedAction}</div>}
    </div>
  );
}

/**
 * Context-aware Error State:
 * - Clean human copy without technical stack traces or inline correlationId clutter
 * - Collapsible support reference ONLY on non-compact primary views when requested
 * - Optional inline variant for tight widget / header rows
 */
export function ContextualErrorState({
  error,
  title,
  description,
  onRetry,
  retrying = false,
  action,
  className,
  compact = false,
  variant = 'block', // 'block' | 'inline'
  framed,
  allowSupportDetails = true,
}) {
  const { tr } = useLocale();
  const info = resolveErrorPresentation(error);
  const copy = KIND_COPY[info.uiKind] || KIND_COPY.error;
  const resolvedTitle = tr(title || copy.title);
  const resolvedMessage = tr(description || info.message);
  const canRetry = Boolean(onRetry) && info.uiKind !== 'forbidden' && info.uiKind !== 'expired';

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        data-ui-state={info.state}
        className={cx(
          'flex flex-wrap items-center justify-between gap-2.5 rounded-rp-input border border-rp-line bg-rp-bg-2/75 px-3.5 py-2.5 text-left',
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', copy.tone)}>
            <copy.Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-rp-text">{resolvedTitle}</p>
            {resolvedMessage && resolvedMessage !== resolvedTitle && (
              <p className="line-clamp-1 text-xs text-rp-text-muted">{resolvedMessage}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {info.uiKind === 'expired' && (
            <Link to="/auth/" className="rp-focus rp-link text-xs font-semibold">{tr('Đăng nhập')}</Link>
          )}
          {canRetry && (
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} loading={retrying}>
              {tr('Thử lại')}
            </Button>
          )}
          {action}
        </div>
      </div>
    );
  }

  const shouldFrame = framed !== undefined ? Boolean(framed) : true;

  return (
    <div
      role="alert"
      data-ui-state={info.state}
      data-error-framed={shouldFrame ? 'true' : 'false'}
      className={cx(
        'flex flex-col items-center justify-center text-center',
        shouldFrame && 'rp-state-card',
        compact ? (shouldFrame ? 'gap-2' : 'gap-2 py-6') : (shouldFrame ? 'gap-3' : 'gap-3 py-11'),
        className,
      )}
    >
      <span className={cx('flex h-13 w-13 items-center justify-center rounded-2xl', copy.tone)}>
        <copy.Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="max-w-md">
        <p className="text-[15px] font-bold text-rp-text">{resolvedTitle}</p>
        <p className="mt-1 text-sm leading-6 text-rp-text-muted">{resolvedMessage}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {info.uiKind === 'expired' && (
          <Link to="/auth/" className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-rp-brand-pressed px-3.5 text-[13px] font-semibold text-white hover:bg-rp-brand-strong">
            <LogIn aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Đăng nhập lại')}
          </Link>
        )}
        {canRetry && (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} loading={retrying}>
            {tr('Thử lại')}
          </Button>
        )}
        {action}
      </div>
      {allowSupportDetails && !compact && info.referenceText && (
        <details className="mt-1 text-xs text-rp-text-muted">
          <summary className="cursor-pointer select-none hover:text-rp-text-2">{tr('Chi tiết hỗ trợ')}</summary>
          <p className="mt-1 font-mono text-[11px] text-rp-text-muted">{info.referenceText}</p>
        </details>
      )}
    </div>
  );
}

export function StaleDataBar({ onRetry, retrying = false, label, className }) {
  const { tr } = useLocale();
  return (
    <div
      role="status"
      data-ui-state="stale-data"
      className={cx(
        'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-rp-input border border-rp-warning-line/70 bg-rp-warning-bg/70 px-3 py-2 text-xs text-rp-text-2',
        className,
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-warning" />
        <span>{tr(label || 'Đang hiển thị dữ liệu đã lưu — làm mới tạm thời chưa thành công.')}</span>
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="rp-focus inline-flex items-center gap-1 rounded font-semibold rp-link disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={cx('h-3 w-3', retrying && 'rp-refresh-spin')} /> {tr('Làm mới')}
        </button>
      )}
    </div>
  );
}

/**
 * Primary Feature Data Boundary: handles all 10 Smart UI Rendering states consistently.
 * Preserves valid cached data on both `background-refresh` and `stale-data`.
 */
export function SmartDataBoundary({
  query,
  isAuthenticated = true,
  isEmpty,
  hasData,
  loading,
  loadingContext = 'data',
  loadingLabel,
  refreshingLabel,
  empty,
  emptyContext,
  emptyIllustration,
  errorTitle,
  allowSupportDetails = true,
  compact = false,
  diagnosticScope,
  className,
  children,
}) {
  const state = resolveDataState(query, { isAuthenticated, isEmpty, hasData });
  const loggedRef = useRef(null);

  useEffect(() => {
    if (!diagnosticScope || !query?.error) return;
    const key = `${state}|${query.error.correlationId || query.error.message || ''}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    const info = resolveErrorPresentation(query.error);
    recordDiagnostic({
      scope: 'ui-boundary',
      component: diagnosticScope,
      status: info.status,
      code: info.code,
      state,
      correlationId: info.correlationId,
      technicalDetail: query.error.technicalDetail || info.message,
    });
  }, [diagnosticScope, state, query?.error]);

  if (state === 'initial-loading') {
    return loading ?? <SakuraLoader variant="section" context={loadingContext} label={loadingLabel} delay={160} />;
  }

  if (state === 'unauthenticated' || state === 'forbidden' || state === 'network-error' || state === 'business-conflict' || state === 'server-error') {
    const errorNode = (
      <ContextualErrorState
        error={query?.error}
        title={errorTitle}
        compact={compact}
        allowSupportDetails={allowSupportDetails}
        onRetry={() => query?.refetch?.()}
        retrying={Boolean(query?.isFetching)}
      />
    );
    return className ? <div className={className}>{errorNode}</div> : errorNode;
  }

  if (state === 'success-empty') {
    return empty ?? <ContextualEmptyState context={emptyContext} illustration={emptyIllustration} variant={compact ? 'compact' : 'default'} />;
  }

  const content = typeof children === 'function' ? children(query?.data, state) : children;
  return (
    <div className={cx('relative', className)} data-ui-state={state}>
      {state === 'background-refresh' && (
        <div className="mb-2 flex justify-end">
          <RefreshingIndicator active label={refreshingLabel} />
        </div>
      )}
      {state === 'stale-data' && (
        <StaleDataBar onRetry={() => query?.refetch?.()} retrying={Boolean(query?.isFetching)} />
      )}
      {content}
    </div>
  );
}

/**
 * Unified DataRefreshBoundary:
 * Coordinates Initial SakuraLoader, Empty State (strictly non-error), Error State + Retry,
 * and Non-Blocking Refresh Indicator over visible cached data without screen dimming or layout jump.
 * Supports either TanStack `query` / `queries` or explicit imperative status flags.
 */
export function DataRefreshBoundary({
  query,
  queries,
  loading,
  refreshing,
  error,
  hasData,
  isEmpty,
  onRetry,
  fillHeight = false,
  loadingContext = 'data',
  loadingLabel,
  refreshingLabel,
  loadingDelay = 160,
  indicatorDelay = 60,
  indicatorPlacement = 'floating', // 'floating' | 'top' | 'none'
  empty,
  emptyContext,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  emptyAction,
  errorTitle,
  allowSupportDetails = true,
  compact = false,
  className,
  children,
}) {
  const queryList = (Array.isArray(queries) && queries.length > 0 ? queries : query ? [query] : []).filter(Boolean);
  const firstQuery = queryList[0];

  const derivedLoading = loading !== undefined
    ? Boolean(loading)
    : queryList.length > 0 && queryList.every((q) => Boolean(q.isPending));

  const derivedRefreshing = refreshing !== undefined
    ? Boolean(refreshing)
    : queryList.some((q) => Boolean(q.isFetching) && !q.isPending);

  const firstError = error !== undefined
    ? error
    : queryList.find((q) => q.isError && q.error)?.error || null;

  const evalHasData = (() => {
    if (typeof hasData === 'boolean') return hasData;
    if (typeof hasData === 'function') return Boolean(hasData(firstQuery?.data));
    if (typeof isEmpty === 'boolean') return !isEmpty && !derivedLoading && (queryList.length === 0 || queryList.some((q) => q.data !== undefined));
    return queryList.some((q) => q.data !== undefined);
  })();

  const evalIsEmpty = (() => {
    if (typeof isEmpty === 'boolean') return isEmpty;
    if (typeof isEmpty === 'function') return Boolean(isEmpty(firstQuery?.data));
    if (Array.isArray(firstQuery?.data)) return firstQuery.data.length === 0;
    return false;
  })();

  const retryFn = onRetry || (() => queryList.forEach((q) => q?.refetch?.({ cancelRefetch: true })));

  if (derivedLoading && !evalHasData) {
    return (
      <div className={cx('relative', className)} data-refresh-state="initial-loading">
        <SakuraLoader
          variant="section"
          context={loadingContext}
          label={loadingLabel}
          delay={loadingDelay}
        />
      </div>
    );
  }

  if (firstError && !evalHasData) {
    const errorNode = (
      <ContextualErrorState
        error={firstError}
        title={errorTitle}
        compact={compact}
        allowSupportDetails={allowSupportDetails}
        onRetry={retryFn}
        retrying={derivedRefreshing}
      />
    );
    return className ? <div className={className}>{errorNode}</div> : errorNode;
  }

  if (!firstError && evalIsEmpty) {
    return (
      empty ?? (
        <ContextualEmptyState
          context={emptyContext}
          illustration={emptyIllustration}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          variant={compact ? 'compact' : 'default'}
        />
      )
    );
  }

  const content = typeof children === 'function' ? children(firstQuery?.data) : children;

  return (
    <div
      className={cx('relative min-w-0', fillHeight && 'flex min-h-0 flex-1 flex-col', className)}
      data-refresh-state={firstError ? 'stale-data' : derivedRefreshing ? 'refreshing' : 'ready'}
      aria-busy={derivedRefreshing || undefined}
    >
      {derivedRefreshing && indicatorPlacement === 'floating' && (
        <div className="pointer-events-none sticky top-2 z-20 flex h-0 justify-end overflow-visible">
          <div className="mr-1 mt-1">
            <RefreshingIndicator active label={refreshingLabel} delay={indicatorDelay} />
          </div>
        </div>
      )}
      {derivedRefreshing && indicatorPlacement === 'top' && (
        <div className="mb-2 flex justify-end">
          <RefreshingIndicator active label={refreshingLabel} delay={indicatorDelay} />
        </div>
      )}
      {firstError && evalHasData && (
        <StaleDataBar onRetry={retryFn} retrying={derivedRefreshing} />
      )}
      <div
        className={cx(
          'transition-opacity duration-200 motion-reduce:transition-none',
          fillHeight && 'flex min-h-0 flex-1 flex-col',
          derivedRefreshing && 'opacity-80',
        )}
      >
        {content}
      </div>
    </div>
  );
}

/**
 * Optional Dashboard Widget Boundary:
 * - Never renders giant error cards or correlationId clutter on Dashboards
 * - Hides cleanly (`errorPolicy="hide"`) or renders compact inline fallback (`errorPolicy="compact"`) on error
 * - Logs structured error diagnostics silently in the background
 * - Preserves valid data when background refetch fails (`stale-data`)
 * - Automatically restores UI when a retry / background refetch succeeds
 */
export function OptionalDashboardWidget({
  name = 'DashboardWidget',
  query,
  isAuthenticated = true,
  isEmpty,
  hasData,
  emptyPolicy = 'cta', // 'cta' | 'hide'
  errorPolicy = 'hide', // 'hide' | 'compact'
  loading,
  loadingContext = 'data',
  loadingLabel,
  empty,
  emptyContext,
  emptyIllustration,
  errorFallback,
  wrap = (node) => node,
  children,
}) {
  const state = resolveDataState(query, { isAuthenticated, isEmpty, hasData });
  const policy = resolveOptionalWidgetPolicy(state, { emptyPolicy, errorPolicy });
  const lastLoggedRef = useRef(null);

  useEffect(() => {
    if (!policy.shouldRecordDiagnostic || !query?.error) return;
    const sig = `${state}|${policy.mode}|${query.error.correlationId || query.error.message || ''}`;
    if (lastLoggedRef.current === sig) return;
    lastLoggedRef.current = sig;
    const info = resolveErrorPresentation(query.error);
    recordDiagnostic({
      scope: 'dashboard-widget',
      component: name,
      status: info.status,
      code: info.code,
      state,
      correlationId: info.correlationId,
      technicalDetail: `${policy.mode}: ${query.error.technicalDetail || info.message}`,
    });
  }, [name, policy.mode, policy.shouldRecordDiagnostic, query?.error, state]);

  if (policy.mode === 'hidden') return null;

  if (policy.mode === 'loading') {
    return wrap(
      loading ?? <SakuraLoader variant="section" context={loadingContext} label={loadingLabel} className="min-h-[120px] py-4" delay={160} />,
      state,
    );
  }

  if (policy.mode === 'empty') {
    return wrap(empty ?? <ContextualEmptyState variant="compact" context={emptyContext} illustration={emptyIllustration} />, state);
  }

  if (policy.mode === 'error-compact') {
    if (errorFallback) {
      return wrap(typeof errorFallback === 'function' ? errorFallback(query?.error, () => query?.refetch?.(), query) : errorFallback, state);
    }
    return wrap(
      <ContextualErrorState
        variant="inline"
        error={query?.error}
        allowSupportDetails={false}
        onRetry={() => query?.refetch?.()}
        retrying={Boolean(query?.isFetching)}
      />,
      state,
    );
  }

  const content = typeof children === 'function' ? children(query?.data, state) : children;
  return wrap(
    <div className="relative" data-ui-state={state}>
      {policy.mode === 'refresh' && (
        <div className="mb-2 flex justify-end">
          <RefreshingIndicator active />
        </div>
      )}
      {content}
    </div>,
    state,
  );
}
