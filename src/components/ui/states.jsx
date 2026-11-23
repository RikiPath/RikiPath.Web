import { Component } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CloudOff,
  FileQuestion,
  Home,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { Banner, Button } from './core.jsx';
import HaruMascot from './HaruMascot.jsx';
import { resolveDataState } from './dataStateLogic.js';
import { ContextualEmptyState, ContextualErrorState, StaleDataBar } from './SmartDataBoundary.jsx';
import { RefreshingIndicator, SakuraLoader } from './SakuraLoader.jsx';
import { useOnlineStatus } from './hooks.js';
import { useLocale, translateText } from '@/locales/locale.js';

/* ------------------------------------------------------------------ Riki mascot */

export { HaruMascot };

/* ------------------------------------------------------------------ Empty / Error states */

/**
 * Unified RikiPath EmptyState (`variant`, `illustration`, `title`, `description`, `action`, `size`).
 */
export function EmptyState({
  variant = 'default',
  illustration,
  title,
  description,
  action,
  size,
  ...rest
}) {
  return (
    <ContextualEmptyState
      variant={variant}
      illustration={illustration}
      title={title}
      description={description}
      action={action}
      size={size}
      {...rest}
    />
  );
}

export function ErrorState({ allowSupportDetails = false, ...props }) {
  return <ContextualErrorState allowSupportDetails={allowSupportDetails} {...props} />;
}

/**
 * Renders the right state for a query-like object ({ isLoading, isError, error, data, refetch, isFetching }).
 * Distinguishes initial loading, background refreshing, stale-data, error, empty and success.
 */
export function QueryState({ query, loading, loadingContext = 'data', loadingLabel, empty, isEmpty, errorTitle, refreshingLabel, allowSupportDetails = true, children }) {
  const state = resolveDataState(query, { isEmpty });
  if (state === 'initial-loading') {
    return loading ?? <SakuraLoader variant="section" context={loadingContext} label={loadingLabel} delay={160} />;
  }
  if (state === 'unauthenticated' || state === 'forbidden' || state === 'network-error' || state === 'business-conflict' || state === 'server-error') {
    return (
      <ContextualErrorState
        error={query.error}
        title={errorTitle}
        allowSupportDetails={allowSupportDetails}
        onRetry={() => query.refetch?.()}
        retrying={Boolean(query.isFetching)}
      />
    );
  }
  if (state === 'success-empty') return empty ?? <ContextualEmptyState />;
  const content = typeof children === 'function' ? children(query.data) : children;
  return (
    <div className="relative" data-ui-state={state}>
      {state === 'background-refresh' && (
        <div className="mb-2 flex justify-end">
          <RefreshingIndicator active label={refreshingLabel} />
        </div>
      )}
      {state === 'stale-data' && (
        <StaleDataBar onRetry={() => query.refetch?.()} retrying={Boolean(query.isFetching)} />
      )}
      {content}
    </div>
  );
}

/* ------------------------------------------------------------------ Full-page status screens */

function StatusScreen({ code, Icon, title, description, children }) {
  const { tr } = useLocale();
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rp-brand-tint text-rp-brand-strong">
          <Icon aria-hidden="true" className="h-7 w-7" />
        </span>
        {code && <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-rp-brand">{code}</p>}
        <h1 className="mt-2 text-2xl font-bold text-rp-text">{tr(title)}</h1>
        {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rp-text-2">{tr(description)}</p>}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">{children}</div>
      </div>
    </main>
  );
}

export function ForbiddenScreen({ homePath = '/', onSwitchAccount }) {
  const { tr } = useLocale();
  return (
    <StatusScreen
      code="403"
      Icon={ShieldAlert}
      title={tr('Bạn không có quyền truy cập trang này')}
      description={tr('Trang này dành cho vai trò khác. Phiên đăng nhập của bạn vẫn còn hiệu lực — hãy quay lại khu vực làm việc của bạn.')}
    >
      <Link to={homePath} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong">
        <Home aria-hidden="true" className="h-4 w-4" />{' '}{tr('Về trang của tôi')}
      </Link>
      {onSwitchAccount && (
        <Button variant="secondary" onClick={onSwitchAccount}>{tr('Đổi tài khoản')}</Button>
      )}
    </StatusScreen>
  );
}

export function NotFoundScreen({ homePath = '/' }) {
  const { tr } = useLocale();
  return (
    <StatusScreen code="404" Icon={FileQuestion} title={tr('Không tìm thấy trang')} description={tr('Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.')}>
      <Link to={homePath} className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white shadow-rp-brand hover:bg-rp-brand-strong">
        <Home aria-hidden="true" className="h-4 w-4" />{' '}{tr('Về trang chính')}
      </Link>
      <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>{tr('Quay lại')}</Button>
    </StatusScreen>
  );
}

/* ------------------------------------------------------------------ Error boundary */

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env?.DEV) console.error('[RikiPath] UI error', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunkFailed = /Loading chunk|dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i.test(String(this.state.error?.message));
    return (
      <StatusScreen
        Icon={TriangleAlert}
        title={chunkFailed ? translateText('Đã có phiên bản mới') : translateText('Màn hình này gặp sự cố')}
        description={chunkFailed ? translateText('Vui lòng tải lại trang để dùng phiên bản mới nhất.') : translateText('Dữ liệu của bạn không bị ảnh hưởng. Hãy thử tải lại trang; nếu vẫn lỗi, vui lòng quay lại sau ít phút.')}
      >
        <Button icon={RefreshCw} onClick={() => window.location.reload()}>{translateText('Tải lại trang')}</Button>
        <Button variant="secondary" onClick={() => this.setState({ error: null })}>{translateText('Thử lại')}</Button>
      </StatusScreen>
    );
  }
}

export function OfflineBanner({ className }) {
  const { tr } = useLocale();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')} className={className}>
      <span className="inline-flex items-center gap-1.5">
        <CloudOff aria-hidden="true" className="h-4 w-4" />{' '}{tr('Các thao tác gửi dữ liệu sẽ tạm khóa cho đến khi có mạng trở lại.')}
      </span>
    </Banner>
  );
}

