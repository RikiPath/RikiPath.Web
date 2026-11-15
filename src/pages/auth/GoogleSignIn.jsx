import { useEffect, useRef, useState } from 'react';
import { continueWithGoogle } from '../../api/auth.js';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const scriptUrl = 'https://accounts.google.com/gsi/client';
let scriptPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);

  scriptPromise ??= new Promise((resolve, reject) => {
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
  }).catch(error => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

export default function GoogleSignIn({ mode, disabled, onPendingChange, onSuccess }) {
  const host = useRef(null);
  const pending = useRef(false);
  const callbacks = useRef(null);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    callbacks.current = { disabled, onPendingChange, onSuccess };
  }, [disabled, onPendingChange, onSuccess]);

  useEffect(() => {
    if (!clientId) return;

    const button = host.current;
    let active = true;
    let observer;
    loadGoogleIdentity().then(identity => {
      if (!active) return;
      identity.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: ({ credential: token }) => {
          if (!active || pending.current || callbacks.current.disabled) return;
          if (token) void authenticate(token);
          else setError('Không nhận được thông tin xác thực từ Google. Hãy thử lại.');
        },
      });

      let lastWidth;
      function renderButton() {
        const width = Math.min(400, Math.floor(button.getBoundingClientRect().width));
        if (!width || width === lastWidth) return;
        lastWidth = width;
        button.replaceChildren();
        identity.renderButton(button, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          locale: 'vi',
          width,
        });
        setReady(true);
      }

      renderButton();
      observer = new ResizeObserver(renderButton);
      observer.observe(button);
    }).catch(() => {
      if (active) setLoadError(true);
    });

    return () => {
      active = false;
      observer?.disconnect();
      button.replaceChildren();
    };
  }, [mode, loadAttempt]);

  async function authenticate(token, currentPassword) {
    if (pending.current || callbacks.current.disabled) return;
    pending.current = true;
    setBusy(true);
    setError('');
    callbacks.current.onPendingChange(true);

    try {
      const data = await continueWithGoogle(token, currentPassword);
      setCredential('');
      await callbacks.current.onSuccess(data);
    } catch (requestError) {
      const code = requestError.data?.errorCode;
      setCredential(
        code === 'GOOGLE_LINK_PASSWORD_REQUIRED' || code === 'GOOGLE_LINK_PASSWORD_INVALID' ||
        (currentPassword && (!requestError.status || requestError.status >= 500)) ? token : '',
      );
      setError(requestError.message || 'Đăng nhập Google thất bại. Hãy thử lại.');
    } finally {
      pending.current = false;
      setPassword('');
      setBusy(false);
      callbacks.current.onPendingChange(false);
    }
  }

  if (!clientId) {
    return (
      <div className="mx-auto w-full max-w-[400px] space-y-2">
        <button type="button" disabled aria-describedby="google-sign-in-unavailable"
          className="min-h-10 w-full cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
          {mode === 'register' ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google'}
        </button>
        <p id="google-sign-in-unavailable" className="text-center text-xs text-slate-500">
          Xác thực bằng Google chưa được bật.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-3">
      <div hidden={Boolean(credential)} className={disabled || busy ? 'opacity-60' : undefined}
        inert={disabled || busy}>
        <div ref={host} className="min-h-10 w-full" />
        {!ready && !loadError && <p role="status" className="text-center text-xs text-slate-500">Đang tải nút Google…</p>}
      </div>
      {loadError && (
        <p role="alert" className="text-center text-sm text-slate-600">
          Không tải được đăng nhập Google.{' '}
          <button type="button" disabled={disabled} className="font-semibold text-[#AD3155] underline"
            onClick={() => { setLoadError(false); setLoadAttempt(value => value + 1); }}>Thử lại</button>
        </p>
      )}
      {busy && <p role="status" className="text-center text-sm text-slate-600">Đang xác thực với Google…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {credential && (
        <form className="space-y-2 rounded-xl border border-slate-200 p-3" onSubmit={event => {
          event.preventDefault();
          if (password) void authenticate(credential, password);
        }}>
          <label htmlFor="google-link-password" className="block text-sm font-semibold text-slate-700">Mật khẩu RikiPath hiện tại</label>
          <input id="google-link-password" type="password" autoComplete="current-password" required
            value={password} onChange={event => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button type="submit" disabled={busy || disabled || !password}
              className="rounded-lg bg-[#AD3155] px-3 py-2 font-semibold text-white disabled:opacity-50">Liên kết Google</button>
            <button type="button" disabled={busy} className="font-semibold text-slate-600 underline"
              onClick={() => { setCredential(''); setPassword(''); setError(''); }}>Hủy</button>
          </div>
        </form>
      )}
    </div>
  );
}
