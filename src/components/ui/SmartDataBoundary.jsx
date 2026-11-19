import { useEffect, useRef } from 'react';
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
import Haru from '@/assets/illustrations/Haru.jsx';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import { useLocale } from '@/locales/locale.js';
import { Button } from './core.jsx';
import { cx } from './cx.js';
import {
  getContextualEmptyCopy,
  resolveDataState,
  resolveErrorPresentation,
  resolveOptionalWidgetPolicy,
} from './dataStateLogic.js';
import { RefreshingIndicator, SakuraLoader } from './SakuraLoader.jsx';

const POSE_MAP = {
  greeting: { mood: 'happy', activity: 'wave' },
  guiding: { mood: 'wink', activity: 'flag' },
  studying: { mood: 'calm', activity: 'book' },
  celebrating: { mood: 'cheer', activity: 'trophy' },
  thinking: { mood: 'thinking', activity: 'none' },
  listening: { mood: 'happy', activity: 'headset' },
  writing: { mood: 'happy', activity: 'pencil' },
  sad: { mood: 'sad', activity: 'none' },
};

const KIND_COPY = {
  offline: { Icon: WifiOff, title: 'Mất kết nối mạng', tone: 'text-rp-warning bg-rp-warning-bg' },
  expired: { Icon: LogIn, title: 'Phiên đăng nhập đã hết hạn', tone: 'text-rp-warning bg-rp-warning-bg' },
  forbidden: { Icon: ShieldAlert, title: 'Bạn không có quyền xem nội dung này', tone: 'text-rp-danger bg-rp-danger-bg' },
  notFound: { Icon: SearchX, title: 'Không tìm thấy dữ liệu', tone: 'text-rp-text-2 bg-rp-muted' },
  conflict: { Icon: RefreshCw, title: 'Dữ liệu vừa thay đổi', tone: 'text-rp-info bg-rp-info-bg' },
  error: { Icon: TriangleAlert, title: 'Chưa tải được dữ liệu', tone: 'text-rp-danger bg-rp-danger-bg' },
};

/**
 * Context-aware Empty State: strictly for verified empty Backend responses (never API errors).
 */
export function ContextualEmptyState({
  context,
  title,
  description,
  icon: Icon = Inbox,
  mascot,
  art,
  action,
  className,
  compact = false,
}) {
  const { tr } = useLocale();
  const preset = context ? getContextualEmptyCopy(context) : null;
  const resolvedTitle = tr(title || preset?.title || 'Chưa có dữ liệu');
  const resolvedDesc = description !== undefined ? (description ? tr(description) : '') : (preset?.description ? tr(preset.description) : '');

  return (
    <div
      data-ui-state="success-empty"
      className={cx('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-7' : 'gap-3 py-11', className)}
    >
      {mascot ? (
        <Haru
          mood={(POSE_MAP[mascot] || POSE_MAP.greeting).mood}
          activity={(POSE_MAP[mascot] || POSE_MAP.greeting).activity}
          size={compact ? 84 : 112}
          className="select-none"
        />
      ) : art ? (
        <SpotArt name={art} size={compact ? 110 : 150} />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rp-muted text-rp-text-muted">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
      )}
      <div className="max-w-sm">
        <p className="text-[15px] font-bold text-rp-text">{resolvedTitle}</p>
        {resolvedDesc && <p className="mt-1 text-sm leading-6 text-rp-text-muted">{resolvedDesc}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
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

  return (
    <div
      role="alert"
      data-ui-state={info.state}
      className={cx('flex flex-col items-center justify-center text-center', compact ? 'gap-2 py-6' : 'gap-3 py-11', className)}
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
          <RefreshCw aria-hidden="true" className={cx('h-3 w-3', retrying && 'animate-spin')} /> {tr('Làm mới')}
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
    return (
      <ContextualErrorState
        error={query?.error}
        title={errorTitle}
        compact={compact}
        allowSupportDetails={allowSupportDetails}
        onRetry={() => query?.refetch?.()}
        retrying={Boolean(query?.isFetching)}
        className={className}
      />
    );
  }

  if (state === 'success-empty') {
    return empty ?? <ContextualEmptyState context={emptyContext} compact={compact} />;
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
    return wrap(empty ?? <ContextualEmptyState compact />, state);
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
