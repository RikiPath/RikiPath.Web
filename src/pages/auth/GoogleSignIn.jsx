import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Field, Input, SakuraSpinner } from '@/components/ui';
import { continueWithGoogle, getGoogleAuthConfig } from '@/features/auth/api/authApi.js';
import { useLocale } from '@/locales/locale.js';

const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
const scriptUrl = 'https://accounts.google.com/gsi/client';
let scriptPromise;
let cachedServerClientId = null;

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
  const host = useRef(null);
  const pending = useRef(false);
  const callbacks = useRef({ disabled, onPendingChange, onSuccess });
  const [serverClientId, setServerClientId] = useState(() => cachedServerClientId || '');
  const resolvedClientId = envClientId || serverClientId;
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [showGisFallback, setShowGisFallback] = useState(false);
  const [error, setError] = useState('');
  const [backendOff, setBackendOff] = useState(false);

  useEffect(() => {
    callbacks.current = { disabled, onPendingChange, onSuccess };
  }, [disabled, onPendingChange, onSuccess]);

  useEffect(() => {
    if (envClientId || cachedServerClientId) {
      return undefined;
    }
    let active = true;
    getGoogleAuthConfig()
      .then((res) => {
        if (!active) return;
        const cfg = res?.result || res;
        const serverId = cfg?.clientId?.trim() || '';
        if (cfg?.enabled === false || !serverId) {
          setBackendOff(true);
          return;
        }
        cachedServerClientId = serverId;
        setServerClientId(serverId);
      })
      .catch(() => {
        // Keep button visible if envClientId exists; if neither exists, wait for user click to retry config fetch.
      });
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async (token, currentPassword) => {
    if (pending.current || callbacks.current.disabled) return;
    pending.current = true;
    setBusy(true);
    setPrompting(false);
    setError('');
    callbacks.current.onPendingChange?.(true);

    try {
      const data = await continueWithGoogle(token, currentPassword);
      setCredential('');
      setShowGisFallback(false);
      await callbacks.current.onSuccess?.(data);
    } catch (requestError) {
      const code = requestError?.data?.errorCode || requestError?.errorCode;
      if (requestError?.status === 503 && /cấu hình/i.test(requestError?.message || '')) {
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

  const initializeGis = useCallback((identity, activeId) => {
    identity.initialize({
      client_id: activeId,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      callback: ({ credential: token }) => {
        setPrompting(false);
        if (pending.current || callbacks.current.disabled) return;
        if (token) {
          void authenticate(token);
        } else {
          setError(tr('Không nhận được thông tin xác thực từ Google. Hãy thử lại.'));
        }
      },
    });
  }, [authenticate, tr]);

  const renderGisFallbackButton = useCallback((identity) => {
    const container = host.current;
    if (!container || typeof identity?.renderButton !== 'function') return;
    const width = Math.max(240, Math.min(400, Math.floor(container.getBoundingClientRect().width || 320)));
    container.replaceChildren();
    identity.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: mode === 'register' ? 'signup_with' : 'signin_with',
      shape: 'rectangular',
      locale: locale === 'ja' ? 'ja' : 'vi',
      width,
    });
  }, [mode, locale]);

  useEffect(() => {
    if (!resolvedClientId) return undefined;
    let active = true;
    loadGoogleIdentity()
      .then((identity) => {
        if (!active) return;
        initializeGis(identity, resolvedClientId);
        if (showGisFallback) {
          renderGisFallbackButton(identity);
        }
      })
      .catch(() => {
        // Handled on explicit click if script fails to load.
      });
    return () => {
      active = false;
    };
  }, [resolvedClientId, showGisFallback, initializeGis, renderGisFallbackButton]);

  async function handleGoogleClick() {
    if (pending.current || busy || prompting || disabled) return;
    setError('');

    let activeId = resolvedClientId;
    if (!activeId) {
      try {
        const res = await getGoogleAuthConfig();
        const cfg = res?.result || res;
        activeId = cfg?.clientId?.trim() || '';
        if (!activeId || cfg?.enabled === false) {
          setBackendOff(true);
          return;
        }
        cachedServerClientId = activeId;
        setServerClientId(activeId);
      } catch {
        setError(tr('Không thể kết nối đến hệ thống. Vui lòng thử lại.'));
        return;
      }
    }

    setPrompting(true);
    try {
      const identity = await loadGoogleIdentity();
      initializeGis(identity, activeId);
      identity.prompt((notification) => {
        const notDisplayed = notification?.isNotDisplayed?.();
        const skipped = notification?.isSkippedMoment?.();
        const dismissed = notification?.isDismissedMoment?.();
        if (notDisplayed || skipped) {
          setPrompting(false);
          setShowGisFallback(true);
          renderGisFallbackButton(identity);
        } else if (dismissed) {
          const reason = notification?.getDismissedReason?.();
          if (reason !== 'credential_returned') {
            setPrompting(false);
          }
        }
      });
    } catch {
      setPrompting(false);
      setError(tr('Không tải được đăng nhập Google.'));
    }
  }

  if (backendOff) {
    return (
      <p role="status" className="text-center text-xs text-rp-text-muted">
        {tr('Đăng nhập bằng Google hiện chưa được bật. Vui lòng dùng email và mật khẩu.')}
      </p>
    );
  }

  const isWorking = busy || prompting;

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
        <div className="space-y-2.5">
          <button
            type="button"
            data-testid="google-signin-button"
            disabled={disabled || isWorking}
            aria-busy={isWorking || undefined}
            onClick={handleGoogleClick}
            className="rp-focus rp-press flex h-12 w-full cursor-pointer select-none items-center justify-center gap-2.5 rounded-xl border border-rp-line bg-rp-surface px-5 text-[15px] font-semibold text-rp-text shadow-rp-xs transition-[border-color,background-color,color,box-shadow,transform] duration-150 hover:border-rp-brand-border hover:bg-rp-brand-tint/50 hover:text-rp-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? (
              <SakuraSpinner size={18} tone="brand" />
            ) : (
              <GoogleLogoIcon className="h-5 w-5 shrink-0" />
            )}
            <span>
              {busy
                ? tr('Đang xác thực với Google…')
                : prompting
                  ? tr('Đang mở cửa sổ Google…')
                  : tr('Tiếp tục với Google')}
            </span>
          </button>

          <div
            ref={host}
            hidden={!showGisFallback}
            className="flex min-h-10 w-full justify-center"
            data-testid="google-gis-fallback"
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
