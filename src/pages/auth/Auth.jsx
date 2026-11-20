import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import AuthPromptLinks from '@/features/auth/components/AuthPromptLinks.jsx';
import { useLocale } from '@/locales/locale.js';
import { useAuth } from '@/app/auth/authContext.js';
import { consumeAuthRedirectNotice, getRememberedLogin, savePendingVerify } from '@/app/auth/session.js';
import { useLoginMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { describeApiError } from '@/api/apiErrors.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import { Banner, Button, Checkbox, Field, Input, notify, useOnlineStatus } from '@/components/ui';
import GoogleSignIn from './GoogleSignIn.jsx';
import { useCompleteSignIn } from './useCompleteSignIn.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const location = useLocation();
  const { t, tr } = useLocale();
  const { isAuthenticated, primaryRole } = useAuth();
  const online = useOnlineStatus();
  const completeSignIn = useCompleteSignIn();
  const loginMutation = useLoginMutation();
  // Remember-me: restore the last choice and (only if it was on) the last email; never the password.
  const [remembered] = useState(getRememberedLogin);
  const [redirectBanner] = useState(() => consumeAuthRedirectNotice());
  const passwordInputRef = useRef(null);
  const [email, setEmail] = useState(() => location.state?.email || redirectBanner?.email || remembered.email);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(remembered.remember);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [notice] = useState(() => location.state?.notice || redirectBanner?.notice || '');
  const [noticeTone] = useState(() => location.state?.noticeTone || redirectBanner?.tone || 'info');
  const [googlePending, setGooglePending] = useState(false);
  const loading = loginMutation.isPending || googlePending;

  useEffect(() => {
    if ((location.state?.focusPassword || redirectBanner?.focusPassword) && passwordInputRef.current) {
      window.requestAnimationFrame(() => passwordInputRef.current?.focus({ preventScroll: true }));
    }
  }, [location.state?.focusPassword, redirectBanner?.focusPassword]);

  // Already signed in (e.g. back button): go to the role home instead of showing the form.
  if (isAuthenticated && !loginMutation.isPending && !loginMutation.isSuccess) {
    return <Navigate to={homeForRole(primaryRole)} replace />;
  }

  function validate() {
    const next = {};
    if (!email.trim()) next.email = tr('Vui lòng nhập email.');
    else if (!EMAIL_RE.test(email.trim())) next.email = tr('Email chưa đúng định dạng.');
    if (!password) next.password = tr('Vui lòng nhập mật khẩu.');
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleLogin(e) {
    e.preventDefault();
    if (loading || !validate()) return;
    setError(null);
    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: async (data) => {
          try {
            await completeSignIn(data, remember);
          } catch (signInError) {
            setError({ message: signInError.message });
          }
        },
        onError: (err) => {
          const info = describeApiError(err);
          // 401 here means wrong credentials, not an expired session.
          const isConnectivity = info.offline || !err.status || err.status >= 500;
          const message = err.status === 401
            ? (err.message || t('loginFailed'))
            : isConnectivity
              ? tr('Không thể kết nối đến hệ thống. Vui lòng thử lại.')
              : info.message;
          const unverified = /xác thực email|chưa xác thực|verify/i.test(err.message || '');
          if (unverified) savePendingVerify({ email: email.trim() });
          setError({ message, unverified });
          if (isConnectivity) {
            notify.warning(tr('Chưa kết nối được'), message, { key: 'auth-login-network' });
          } else {
            notify.error(tr('Chưa đăng nhập được'), message, { key: 'auth-login-error' });
          }
        },
      },
    );
  }

  return (
    <AuthLayout
      title={t('welcome')}
      subtitle={t('loginHint')}
      footer={<>{t('agreeContinue')} {t('terms')} · {t('privacy')} {t('ofRiki')}</>}
    >
      <form className="space-y-4" noValidate onSubmit={handleLogin} data-purpose="login-form">
        {notice && <Banner tone={noticeTone}>{tr(notice)}</Banner>}
        {!online && <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')}>{tr('Kết nối mạng để đăng nhập.')}</Banner>}
        {error && (
          <Banner tone="danger" title={tr('Chưa đăng nhập được')}>
            {tr(error.message)}
            {error.unverified && (
              <Link className="rp-focus rp-link ml-1 rounded-sm" to={`/verify-email?email=${encodeURIComponent(email.trim())}`}>
                {t('enterCode')}
              </Link>
            )}
          </Banner>
        )}

        <Field label={t('email')} error={fieldErrors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} icon={Mail} aria-describedby={describedBy} invalid={invalid} type="email" autoComplete="email" inputMode="email" placeholder="ban@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
        </Field>

        <Field label={t('password')} error={fieldErrors.password} required>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <Input ref={passwordInputRef} id={id} aria-describedby={describedBy} invalid={invalid} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('passwordPlaceholder')} className="pl-10 pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={t('togglePassword')} aria-pressed={showPassword} className="rp-focus absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-rp-text-muted hover:text-rp-text">
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          )}
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Checkbox label={t('remember')} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <Link to="/forgot-password/" className="rp-focus rp-link whitespace-nowrap rounded-sm text-[13px]">{tr('Quên mật khẩu?')}</Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!online} icon={LogIn}>
          {loading ? t('loggingIn') : t('loginNow')}
        </Button>
      </form>

      <div className="mt-4">
        <GoogleSignIn mode="login" disabled={loginMutation.isPending} onPendingChange={setGooglePending} onSuccess={(data) => completeSignIn(data, remember)} />
      </div>

      <AuthPromptLinks items={[{ question: t('noAccount'), label: tr('Đăng ký'), to: '/register/' }]} />
    </AuthLayout>
  );
}
