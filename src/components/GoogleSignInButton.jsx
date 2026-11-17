import { useEffect, useRef } from 'react';
import { googleClientId, renderGoogleButton } from '../auth/googleSignIn.js';
import { useLocale } from '../i18n/locale.js';

export default function GoogleSignInButton({ onCredential, onError, disabled }) {
  const { locale, t } = useLocale();
  const hostRef = useRef(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  credentialRef.current = onCredential;
  errorRef.current = onError;
  const clientId = googleClientId();

  useEffect(() => {
    if (!clientId || !hostRef.current) return undefined;
    let cancelled = false;
    renderGoogleButton(hostRef.current, {
      locale,
      onCredential: (credential) => credentialRef.current?.(credential),
    }).catch(() => {
      if (!cancelled) errorRef.current?.(t('googleFailed'));
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, locale, t]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onError?.(t('googleMissing'))}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        <GoogleMark />
        Google
      </button>
    );
  }

  return <div ref={hostRef} className="flex min-h-11 w-full justify-center" />;
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" fill="#34A853" />
      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27 0-.78.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12c0 2.01.45 3.82 1.25 5.42l4.03-3.15Z" fill="#FBBC05" />
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" fill="#EA4335" />
    </svg>
  );
}
