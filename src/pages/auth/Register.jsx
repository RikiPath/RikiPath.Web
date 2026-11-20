import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail, UserPlus, UserRound } from 'lucide-react';
import { useLocale } from '@/locales/locale.js';
import { savePendingVerify } from '@/app/auth/session.js';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import AuthPromptLinks from '@/features/auth/components/AuthPromptLinks.jsx';
import PasswordInputField from '@/features/auth/components/PasswordInputField.jsx';
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter.jsx';
import { evaluatePasswordSecurity } from '@/features/auth/utils/passwordStrength.js';
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
  const [error, setError] = useState('');
  const [googlePending, setGooglePending] = useState(false);
  const loading = registerMutation.isPending || googlePending;

  const passwordEval = useMemo(
    () => evaluatePasswordSecurity(password, { email, fullName }),
    [password, email, fullName],
  );
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

  function handleRegister(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    // Mirrors Backend RegisterRequest + PasswordPolicyHelper
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = tr('Email chưa đúng định dạng.');
    if (!password) next.password = t('passwordShort');
    else if (!passwordEval.policyValid) next.password = tr(passwordEval.policyError);
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
        const emailSent = result.verificationEmailSent !== false;
        const notice = emailSent
          ? tr('Vui lòng kiểm tra email để nhập mã xác thực tài khoản.')
          : tr('Tài khoản đã được tạo nhưng chưa gửi được email xác thực. Hãy thử gửi lại mã.');
        if (emailSent) {
          notify.success(tr('Đăng ký thành công!'), notice, { key: 'auth-register-success' });
        } else {
          notify.warning(tr('Chưa gửi được email xác thực'), notice, { key: 'auth-register-mail-failed' });
        }
        goToVerify(result.email || registeredEmail, result.userId, notice, emailSent);
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

  function goToVerify(registeredEmail, userId, notice, emailSent = true) {
    savePendingVerify({ email: registeredEmail, userId: userId || undefined });
    navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`, {
      state: { notice, emailSent },
    });
  }

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
        <div className="space-y-2.5">
          <PasswordInputField
            name="password"
            label={t('password')}
            placeholder="Tạo mật khẩu mới"
            autoComplete="new-password"
            value={password}
            error={fieldErrors.password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && <PasswordStrengthMeter evaluation={passwordEval} compact />}
        </div>
        <PasswordInputField
          name="confirmPassword"
          label={t('confirmPassword')}
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          value={confirmPassword}
          error={confirmPassword && password !== confirmPassword ? t('passwordMismatch') : fieldErrors.confirmPassword}
          required
          trailingAdornment={passwordsMatch ? (
            <CheckCircle2 aria-label={tr('Mật khẩu xác nhận khớp')} className="h-4 w-4 text-[#16A34A]" />
          ) : null}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
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
        ]}
      />
    </AuthLayout>
  );
}
