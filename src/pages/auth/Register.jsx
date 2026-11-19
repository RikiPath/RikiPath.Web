import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, UserPlus, UserRound } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { savePendingVerify } from '@/app/auth/session.js';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import AuthPromptLinks from '@/features/auth/components/AuthPromptLinks.jsx';
import { describeApiError } from '@/api/apiErrors.js';
import { Banner, Button, Checkbox, Field, Input, notify } from '@/components/ui';
import { useRegisterMutation } from '@/features/auth/hooks/useAuthMutations.js';
import GoogleSignIn from './GoogleSignIn.jsx';
import { useCompleteSignIn } from './useCompleteSignIn.js';

export default function Register() {
  const navigate = useNavigate();
  const { t, tr } = useLocale();
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const registerMutation = useRegisterMutation();
  const completeSignIn = useCompleteSignIn();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [googlePending, setGooglePending] = useState(false);
  const loading = registerMutation.isPending || googlePending;

  function handleRegister(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    // Mirrors Backend RegisterRequest: [EmailAddress], [MinLength(6)], [Compare(Password)], [MaxLength(200)] FullName.
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = tr('Email chưa đúng định dạng.');
    if (password.length < 6) next.password = t('passwordShort');
    if (password !== confirmPassword) next.confirmPassword = t('passwordMismatch');
    if (!agreed) next.terms = tr('Vui lòng đồng ý với điều khoản để tiếp tục.');
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    const payload = {
      email: email.trim(),
      password,
      confirmPassword,
    };
    if (fullName.trim()) payload.fullName = fullName.trim();
    const registeredEmail = email.trim();
    registerMutation.mutate(payload, {
      onSuccess: (data) => {
        const result = data.result || {};
        notify.success(
          tr('Đăng ký thành công!'),
          tr('Vui lòng kiểm tra email để nhập mã xác thực tài khoản.'),
          { key: 'auth-register-success' },
        );
        goToVerify(result.email || registeredEmail, result.userId);
      },
      onError: (err) => {
        const msg = err.message || t('registerFailed');
        const fields = err.errors && typeof err.errors === 'object' && !Array.isArray(err.errors) ? err.errors : null;
        if (fields) {
          const map = {};
          for (const [k, v] of Object.entries(fields)) map[k.charAt(0).toLowerCase() + k.slice(1)] = [].concat(v)[0];
          setFieldErrors(map);
        }
        if (msg.includes('Tạo tài khoản thành công')) {
          notify.success(tr('Đăng ký thành công!'), msg, { key: 'auth-register-success' });
          goToVerify(registeredEmail, resultUserIdFromError(err), msg);
          return;
        }
        if (msg.toLowerCase().includes('đã được đăng ký')) {
          setError(msg);
          notify.warning(tr('Email đã tồn tại'), msg, { key: 'auth-register-exists' });
          return;
        }
        const safeMsg = err.status && err.status >= 500 ? describeApiError(err).message : msg;
        setError(safeMsg);
        if (!fields) {
          notify.apiError(err, tr('Chưa tạo được tài khoản'), { key: 'auth-register-error' });
        }
      },
    });
  }

  function resultUserIdFromError(err) {
    const blob = `${err?.message || ''} ${JSON.stringify(err?.errors || err?.data || '')}`;
    const match = blob.match(/userId["']?\s*[:=]\s*(\d+)/i) || blob.match(/Id\s*=\s*(\d+)/);
    return match ? Number(match[1]) : undefined;
  }

  function goToVerify(registeredEmail, userId, notice) {
    savePendingVerify({ email: registeredEmail, userId: userId || undefined });
    navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`, {
      state: notice ? { notice } : undefined,
    });
  }

  const verifyHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : '/verify-email';

  const pwToggle = (shown, set) => (
    <button type="button" onClick={() => set((v) => !v)} aria-label={t('togglePassword')} aria-pressed={shown} className="rp-focus absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-rp-text-muted hover:text-rp-text">
      {shown ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
    </button>
  );

  return (
    <AuthLayout
      variant="register"
      title={tr('Tạo tài khoản RikiPath')}
      subtitle={tr('Miễn phí. Bạn sẽ nhận mã xác thực qua email sau khi đăng ký.')}
     
    >
      <form className="space-y-4" noValidate onSubmit={handleRegister} data-page="Register">
        {error && <Banner tone="danger" title={tr('Chưa tạo được tài khoản')}>{error}{/đã được đăng ký/i.test(error) && <> <Link to="/auth/" state={{ email: email.trim() }} className="rp-focus rp-link rounded-sm">{tr('Đăng nhập')}</Link></>}</Banner>}
        <Field label={t('fullName')} error={fieldErrors.fullName}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              icon={UserRound}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="name"
              placeholder={tr('Nguyễn Minh Anh')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('email')} error={fieldErrors.email} required>
          {({ id, describedBy, invalid }) => <Input id={id} icon={Mail} aria-describedby={describedBy} invalid={invalid} type="email" inputMode="email" autoComplete="email" placeholder="ban@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={t('password')} hint={t('passwordShort')} error={fieldErrors.password} required>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('passwordPlaceholder')}
                className="pl-10 pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {pwToggle(showPassword, setShowPassword)}
            </div>
          )}
        </Field>
        <Field label={t('confirmPassword')} error={fieldErrors.confirmPassword} required>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('confirmPlaceholder')}
                className="pl-10 pr-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {pwToggle(showConfirm, setShowConfirm)}
            </div>
          )}
        </Field>
        <div>
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} label={`${t('agreeContinue')} ${t('terms')} · ${t('privacy')} ${t('ofRiki')}`} />
          {fieldErrors.terms && <p role="alert" className="mt-1 text-xs font-medium text-rp-danger">{fieldErrors.terms}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={UserPlus}>{tr('Tạo tài khoản')}</Button>
      </form>
      <div className="mt-4">
        <GoogleSignIn mode="register" disabled={registerMutation.isPending} onPendingChange={setGooglePending} onSuccess={(data) => completeSignIn(data, true)} />
      </div>
      <AuthPromptLinks
        items={[
          { question: tr('Đã có tài khoản?'), label: t('login'), to: '/auth/' },
          { question: tr('Chưa xác thực tài khoản?'), label: t('verifyEmail'), to: verifyHref },
        ]}
      />
    </AuthLayout>
  );
}
