import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Field, Input, SakuraSpinner } from '@/components/ui';
import { continueWithGoogle, getGoogleAuthConfig } from '@/features/auth/api/authApi.js';
import { useLocale } from '@/locales/locale.js';

const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
const scriptUrl = 'https://accounts.google.com/gsi/client';
const GIS_MAX_BUTTON_WIDTH = 400;
const GIS_MIN_BUTTON_WIDTH = 200;
const GIS_BUTTON_HEIGHT_SCALE = 1.3;

let scriptPromise;
let cachedServerConfig = null;

function loadGoogleIdentity() {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  scriptPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing && window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const identity = window.google?.accounts?.id;
      if (identity) resolve(identity);
      else reject(new Error('Không thể tải đăng nhập Google.'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Không thể tải đăng nhập Google.'));
    };
    document.head.append(script);
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

function GoogleLogoIcon({ className = 'h-5 w-5 shrink-0' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function GoogleSignIn({ mode = 'login', disabled = false, onPendingChange, onSuccess }) {
  const { tr, locale } = useLocale();
  const wrapperRef = useRef(null);
  const overlayHostRef = useRef(null);
  const pending = useRef(false);
  const authenticateRef = useRef(null);
  const callbacks = useRef({ disabled, onPendingChange, onSuccess });

  const [serverClientId, setServerClientId] = useState(() => cachedServerConfig?.clientId || '');
  const [backendOff, setBackendOff] = useState(() => cachedServerConfig?.enabled === false);
  // Prefer authoritative server Client ID so the GIS audience always matches Backend validation.
  const resolvedClientId = serverClientId || envClientId;

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [error, setError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    callbacks.current = { disabled, onPendingChange, onSuccess };
  }, [disabled, onPendingChange, onSuccess]);

  // Always verify authoritative Google auth configuration from Backend once per session
  // (falls back cleanly to VITE_GOOGLE_CLIENT_ID if the config endpoint is temporarily unreachable).
  useEffect(() => {
    if (cachedServerConfig) {
      return undefined;
    }
    let active = true;
    getGoogleAuthConfig()
      .then((res) => {
        if (!active) return;
        const cfg = res?.result || res;
        const serverId = cfg?.clientId?.trim() || '';
        const enabled = cfg?.enabled !== false && Boolean(serverId);
        cachedServerConfig = { enabled, clientId: serverId };
        if (!enabled) {
          setBackendOff(true);
          return;
        }
        setBackendOff(false);
        setServerClientId(serverId);
      })
      .catch(() => {
        // Keep button usable if envClientId exists; retry on explicit click if neither exists.
      });
    return () => {
      active = false;
    };
  }, []);

  // Track wrapper width so the invisible GIS click target always spans 100% of the Sakura button.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || credential || backendOff) return undefined;

    const measure = () => {
      const nextWidth = Math.round(el.getBoundingClientRect().width || 0);
      if (nextWidth > 0) {
        setContainerWidth((prev) => (Math.abs(prev - nextWidth) >= 2 ? nextWidth : prev));
      }
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [credential, backendOff]);

  const authenticate = useCallback(async (token, currentPassword) => {
    if (pending.current || callbacks.current.disabled) return;
    pending.current = true;
    setBusy(true);
    setError('');
    callbacks.current.onPendingChange?.(true);

    try {
      const data = await continueWithGoogle(token, currentPassword);
      setCredential('');
      await callbacks.current.onSuccess?.(data);
    } catch (requestError) {
      const code = requestError?.data?.errorCode || requestError?.errorCode;
      if (requestError?.status === 503 && /cấu hình/i.test(requestError?.message || '')) {
        cachedServerConfig = { enabled: false, clientId: '' };
        setBackendOff(true);
        setCredential('');
        return;
      }
      const needsLinkPassword =
        code === 'GOOGLE_LINK_PASSWORD_REQUIRED' ||
        code === 'GOOGLE_LINK_PASSWORD_INVALID' ||
        Boolean(currentPassword && (!requestError?.status || requestError?.status >= 500));
      setCredential(needsLinkPassword ? token : '');
      setError(requestError?.message || tr('Đăng nhập Google thất bại. Hãy thử lại.'));
    } finally {
      pending.current = false;
      setPassword('');
      setBusy(false);
      callbacks.current.onPendingChange?.(false);
    }
  }, [tr]);

  useEffect(() => {
    authenticateRef.current = authenticate;
  }, [authenticate]);

  // Render the official Google Identity Services button as a single invisible overlay directly
  // over the Sakura button so 1 click always opens Google's popup reliably without rendering a
  // second button below or getting blocked by One Tap cooldowns / FedCM suppression.
  useEffect(() => {
    if (!resolvedClientId || backendOff || credential) return undefined;
    const host = overlayHostRef.current;
    if (!host) return undefined;

    let active = true;
    loadGoogleIdentity()
      .then((identity) => {
        if (!active || !overlayHostRef.current) return;

        identity.initialize({
          client_id: resolvedClientId,
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
          callback: ({ credential: token }) => {
            if (pending.current || callbacks.current.disabled) return;
            if (token) {
              void authenticateRef.current?.(token);
            } else {
              setError(tr('Không nhận được thông tin xác thực từ Google. Hãy thử lại.'));
            }
          },
        });

        const measuredWidth = containerWidth || Math.round(wrapperRef.current?.getBoundingClientRect().width || 360);
        const buttonWidth = Math.max(GIS_MIN_BUTTON_WIDTH, Math.min(GIS_MAX_BUTTON_WIDTH, measuredWidth));
        overlayHostRef.current.replaceChildren();
        identity.renderButton(overlayHostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          locale: locale === 'ja' ? 'ja' : 'vi',
          width: buttonWidth,
        });
        setGisReady(true);
        setInitializing(false);
      })
      .catch(() => {
        if (!active) return;
        setGisReady(false);
        setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [resolvedClientId, backendOff, credential, containerWidth, mode, locale, reloadNonce, tr]);

  async function handleButtonFallbackClick() {
    if (pending.current || busy || initializing || disabled) return;
    setError('');
    setInitializing(true);

    let activeId = resolvedClientId;
    if (!activeId) {
      try {
        const res = await getGoogleAuthConfig();
        const cfg = res?.result || res;
        activeId = cfg?.clientId?.trim() || '';
        const enabled = cfg?.enabled !== false && Boolean(activeId);
        cachedServerConfig = { enabled, clientId: activeId };
        if (!enabled) {
          setBackendOff(true);
          setInitializing(false);
          return;
        }
        setServerClientId(activeId);
      } catch {
        setInitializing(false);
        setError(tr('Không thể kết nối đến hệ thống. Vui lòng thử lại.'));
        return;
      }
    }

    try {
      await loadGoogleIdentity();
      setReloadNonce((n) => n + 1);
    } catch {
      setInitializing(false);
      setError(tr('Không tải được đăng nhập Google. Vui lòng kiểm tra kết nối hoặc trình chặn quảng cáo.'));
    }
  }

  if (backendOff) {
    return (
      <p role="status" className="text-center text-xs text-rp-text-muted">
        {tr('Đăng nhập bằng Google hiện chưa được bật. Vui lòng dùng email và mật khẩu.')}
      </p>
    );
  }

  const isWorking = busy || initializing;
  const overlayInteractive = gisReady && !disabled && !isWorking;
  const scaleX = containerWidth > GIS_MAX_BUTTON_WIDTH ? containerWidth / GIS_MAX_BUTTON_WIDTH : 1;

  return (
    <div className="w-full space-y-3" data-purpose="google-auth-section">
      <div className="relative flex items-center gap-3 py-0.5" role="separator" aria-label={tr('Hoặc')}>
        <span className="h-px flex-1 bg-rp-line" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-rp-text-muted">
          {tr('Hoặc')}
        </span>
        <span className="h-px flex-1 bg-rp-line" />
      </div>

      {!credential && (
        <div
          ref={wrapperRef}
          className={`group relative h-12 w-full overflow-hidden rounded-xl focus-within:ring-2 focus-within:ring-rp-brand/35 ${
            disabled || isWorking ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <button
            type="button"
            data-testid="google-signin-button"
            tabIndex={overlayInteractive ? -1 : 0}
            disabled={disabled || isWorking}
            aria-busy={isWorking || undefined}
            onClick={handleButtonFallbackClick}
            className="rp-focus rp-press flex h-12 w-full cursor-pointer select-none items-center justify-center gap-2.5 rounded-xl border border-rp-line bg-rp-surface px-5 text-[15px] font-semibold text-rp-text shadow-rp-xs transition-[border-color,background-color,color,box-shadow,transform] duration-150 group-hover:border-rp-brand-border group-hover:bg-rp-brand-tint/50 group-hover:text-rp-brand-strong hover:border-rp-brand-border hover:bg-rp-brand-tint/50 hover:text-rp-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? (
              <SakuraSpinner size={18} tone="brand" />
            ) : (
              <GoogleLogoIcon className="h-5 w-5 shrink-0" />
            )}
            <span>
              {busy
                ? tr('Đang xác thực với Google…')
                : initializing
                  ? tr('Đang chuẩn bị đăng nhập Google…')
                  : tr('Tiếp tục với Google')}
            </span>
          </button>

          <div
            ref={overlayHostRef}
            aria-label={tr('Tiếp tục với Google')}
            className={`absolute inset-0 z-10 flex items-center justify-center opacity-[0.001] ${
              overlayInteractive ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{
              transform: `scale(${scaleX.toFixed(3)}, ${GIS_BUTTON_HEIGHT_SCALE})`,
              transformOrigin: 'center',
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rp-danger-line bg-rp-danger-bg px-3.5 py-2.5 text-xs font-medium leading-5 text-rp-danger">
          {tr(error)}
        </p>
      )}

      {credential && (
        <form
          data-testid="google-link-password-form"
          className="space-y-3 rounded-xl border border-rp-line bg-rp-surface p-3.5 shadow-rp-xs"
          onSubmit={(event) => {
            event.preventDefault();
            if (password && !busy && !disabled) {
              void authenticate(credential, password);
            }
          }}
        >
          <Field label="Mật khẩu RikiPath hiện tại" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <Button type="submit" size="sm" loading={busy} disabled={busy || disabled || !password}>
              {tr('Liên kết Google')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setCredential('');
                setPassword('');
                setError('');
              }}
            >
              {tr('Hủy')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
