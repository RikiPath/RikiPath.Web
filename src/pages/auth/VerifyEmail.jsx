import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingVerify, getPendingVerify, savePendingVerify } from '@/app/auth/session.js';
import { useAuth } from '@/app/auth/authContext.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import { CircleAlert, MailCheck, RefreshCw } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import AuthPromptLinks from '@/features/auth/components/AuthPromptLinks.jsx';
import { Banner, Button, Field, Input, Modal, notify } from '@/components/ui';
import { useChangeUnverifiedEmailMutation, useResendPendingEmailMutation, useResendVerificationMutation, useVerifyEmailLinkMutation, useVerifyEmailMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLocale } from '@/locales/locale.js';

function CodeBoxes({ value, onChange, disabled, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  function write(index, raw) {
    const clean = raw.replace(/\D/g, '');
    if (clean.length > 1) {
      const clipped = clean.slice(0, 6);
      onChange(clipped);
      refs.current[Math.min(clipped.length, 5)]?.focus();
      return;
    }
    const digit = clean.slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function onPaste(event) {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    event.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="mt-2.5 grid grid-cols-6 gap-2 sm:gap-3" onPaste={onPaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus={index === 0 && !disabled}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${index + 1}`}
          maxLength={index === 0 ? 6 : 1}
          value={digit}
          disabled={disabled}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          className={`h-12 w-full rounded-xl border bg-white text-center text-[18px] font-bold tracking-tight tabular-nums text-rp-text outline-none transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:border-[#DEC9CE] disabled:bg-rp-muted/70 disabled:text-rp-text-muted sm:h-[54px] sm:text-[20px] ${
            invalid
              ? 'border-rp-danger focus:border-rp-danger focus:shadow-[inset_0_0_0_0.5px_var(--color-rp-danger)]'
              : 'border-rp-line-strong focus:border-rp-brand focus:shadow-[inset_0_0_0_0.5px_var(--color-rp-brand)]'
          }`}
        />
      ))}
    </div>
  );
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t, tr } = useLocale();
  const { isAuthenticated, primaryRole, user, expireSession } = useAuth();

  const pending = getPendingVerify();
  const requestedEmail = params.get('email') || '';
  const verificationToken = (params.get('token') || '').trim();
  const email = pending?.email || '';
  const userId = Number(pending?.userId || 0);
  const changeEmailFlow = pending?.purpose === 'changeEmail';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [preferManualOtp, setPreferManualOtp] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendRequested, setResendRequested] = useState(false);
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [emailDispatched, setEmailDispatched] = useState(location.state?.emailSent !== false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [emailChangeError, setEmailChangeError] = useState('');

  const verifyMutation = useVerifyEmailMutation();
  const verifyLinkMutation = useVerifyEmailLinkMutation();
  const resendMutation = useResendVerificationMutation();
  const pendingResendMutation = useResendPendingEmailMutation();
  const changeEmailMutation = useChangeUnverifiedEmailMutation();
  const loading = verifyMutation.isPending;
  const linkLoading = verifyLinkMutation.isPending;
  const resending = resendMutation.isPending || pendingResendMutation.isPending;
  const validSession = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    (!requestedEmail || requestedEmail.trim().toLowerCase() === email.trim().toLowerCase());
  const isOneClickMode = Boolean(verificationToken) && !preferManualOtp;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function goToLogin(alreadyConfirmed = false) {
    clearPendingVerify();
    expireSession();
    navigate('/auth', {
      replace: true,
      state: {
        email,
        notice: alreadyConfirmed
          ? tr('Email này đã được xác thực. Đăng nhập để tiếp tục.')
          : tr('Email đã xác thực. Đăng nhập để tiếp tục.'),
      },
    });
  }

  function handleResend() {
    const address = email.trim();
    if (!validSession || !address || resending || cooldown > 0) return;
    setResendError('');
    setResendMessage('');
    const mutation = changeEmailFlow ? pendingResendMutation : resendMutation;
    mutation.mutate(changeEmailFlow ? undefined : address, {
      onSuccess: (data) => {
        savePendingVerify({ email, userId: userId || undefined, purpose: pending?.purpose });
        setResendRequested(true);
        setNotice('');
        setResendMessage(tr('Nếu tài khoản đang chờ xác thực, hãy kiểm tra hộp thư để lấy mã mới.'));
        notify.info(tr('Đã tiếp nhận yêu cầu'), tr('Nếu tài khoản đang chờ xác thực, hãy kiểm tra hộp thư.'), { key: 'auth-resend-success' });
        setCooldown(Number(data?.retryAfterSeconds) > 0 ? Number(data.retryAfterSeconds) : 60);
      },
      onError: (err) => {
        const message = err?.message || 'Chưa gửi lại được mã.';
        if (/đã được xác thực/i.test(message)) {
          notify.info(tr('Email này đã được xác thực.'), '', { key: 'auth-verify-already' });
          goToLogin(true);
          return;
        }
        setResendError(message);
        notify.apiError(err, tr('Chưa gửi lại được mã'), { key: 'auth-resend-error' });
        const wait = message.match(/(\d+)\s*giây/);
        if (wait) setCooldown(Number(wait[1]));
      },
    });
  }

  function handleVerifyByLink(event) {
    event.preventDefault();
    if (linkLoading || !verificationToken) return;
    setLinkError('');

    verifyLinkMutation.mutate(verificationToken, {
      onSuccess: () => {
        notify.success(tr('Xác thực email thành công!'), '', { key: 'auth-verify-success' });
        goToLogin();
      },
      onError: (err) => {
        const message = err?.message || tr('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
        if (/đã được xác thực/i.test(message)) {
          notify.info(tr('Email này đã được xác thực.'), '', { key: 'auth-verify-already' });
          goToLogin(true);
          return;
        }
        setLinkError(message);
        notify.apiError(err, tr('Chưa xác thực được email'), { key: 'auth-verify-error' });
      },
    });
  }

  function handleVerify(event) {
    event.preventDefault();
    if (loading) return;
    setError('');

    if (!validSession) {
      setError(tr('Không tìm thấy phiên đăng ký. Bạn vui lòng đăng ký lại.'));
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError(tr('Bạn nhập đủ 6 chữ số trong email nhé.'));
      return;
    }

    verifyMutation.mutate(
      { userId: userId || undefined, email: email.trim() || undefined, verificationCode: code },
      {
        onSuccess: () => {
          notify.success(tr('Xác thực email thành công!'), '', { key: 'auth-verify-success' });
          goToLogin();
        },
        onError: (err) => {
          const message = err?.message || tr('Chưa xác thực được. Vui lòng kiểm tra lại mã.');
          if (/đã được xác thực/i.test(message)) {
            notify.info(tr('Email này đã được xác thực.'), '', { key: 'auth-verify-already' });
            goToLogin(true);
            return;
          }
          setError(message);
          notify.apiError(err, tr('Chưa xác thực được email'), { key: 'auth-verify-error' });
        },
      },
    );
  }

  function handleEmailChange(event) {
    event.preventDefault();
    if (changeEmailMutation.isPending) return;
    const address = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address === email.trim().toLowerCase()) {
      setEmailChangeError(tr('Vui lòng nhập một email mới hợp lệ.'));
      return;
    }
    if (!registrationPassword) {
      setEmailChangeError(tr('Nhập lại mật khẩu đã dùng khi đăng ký.'));
      return;
    }
    setEmailChangeError('');
    changeEmailMutation.mutate({ currentEmail: email.trim(), newEmail: address, password: registrationPassword }, {
      onSuccess: (data) => {
        const result = data.result || {};
        const emailSent = result.verificationEmailSent !== false;
        savePendingVerify({ email: address, userId: result.userId || userId || undefined });
        setCode('');
        setRegistrationPassword('');
        setNewEmail('');
        setShowEmailChange(false);
        setCooldown(0);
        setResendError('');
        setResendMessage('');
        setEmailDispatched(emailSent);
        const message = emailSent
          ? tr('Email đã được cập nhật. Hãy kiểm tra hộp thư mới để lấy mã xác thực.')
          : tr('Email đã được cập nhật nhưng chưa gửi được mã. Hãy thử gửi lại.');
        setNotice(message);
        navigate(`/verify-email?email=${encodeURIComponent(address)}`, {
          replace: true,
          state: { notice: message, emailSent },
        });
      },
      onError: (err) => setEmailChangeError(err?.message || tr('Chưa đổi được email. Vui lòng thử lại.')),
    });
  }

  if (!isOneClickMode && isAuthenticated && user?.isEmailVerified && !changeEmailFlow) {
    return <Navigate to={homeForRole(primaryRole)} replace />;
  }

  return (
    <AuthLayout
      variant="verify"
      title={tr('Xác thực email')}
      subtitle={isOneClickMode
        ? tr('Nhấn nút bên dưới để hoàn tất xác thực email cho tài khoản RikiPath của bạn.')
        : resendRequested
        ? tr('Nếu tài khoản đang chờ xác thực, hãy kiểm tra hộp thư để lấy mã mới.')
        : !emailDispatched
        ? tr('Hãy gửi lại mã xác thực rồi kiểm tra hộp thư của bạn.')
        : email ? <>{tr('Nhập mã 6 chữ số đã gửi tới')} <strong className="font-semibold text-rp-text">{email}</strong></> : tr('Nhập mã 6 chữ số trong email xác thực.')}
    >
      {isOneClickMode ? (
        <form noValidate onSubmit={handleVerifyByLink} className="space-y-4" data-page="VerifyEmailLink">
          <Banner tone="info">
            {tr('Liên kết xác thực chỉ sử dụng một lần. Nhấn nút xác nhận bên dưới để kích hoạt email và quay lại đăng nhập.')}
          </Banner>
          {linkError && (
            <p role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-rp-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> {linkError}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" icon={MailCheck} loading={linkLoading}>
            {linkLoading ? tr('Đang xác thực...') : tr('Xác thực email')}
          </Button>
          {validSession && (
            <div className="pt-1 text-center text-sm">
              <button
                type="button"
                className="rp-focus rp-link rounded-sm font-semibold"
                onClick={() => setPreferManualOtp(true)}
              >
                {tr('Hoặc nhập mã 6 chữ số thủ công')}
              </button>
            </div>
          )}
        </form>
      ) : (
        <>
          <form noValidate onSubmit={handleVerify} className="space-y-4" data-page="VerifyEmail">
            {notice && <Banner tone="info">{notice}</Banner>}
            {!validSession && (
              <Banner tone="warning" title={tr('Không tìm thấy phiên đăng ký')}>
                {tr('Mở trang này từ bước đăng ký, hoặc đăng ký lại để nhận mã mới.')} <Link to="/register/" className="rp-focus rp-link rounded-sm">{tr('Đăng ký')}</Link>
              </Banner>
            )}
            <fieldset disabled={loading || !validSession}>
              <legend className="text-[13px] font-semibold text-rp-text">{tr('Mã xác thực')}</legend>
              <CodeBoxes value={code} onChange={(next) => { setCode(next); setError(''); }} disabled={loading || !validSession} invalid={Boolean(error)} />
            </fieldset>
            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-rp-danger">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" icon={MailCheck} loading={loading} disabled={!validSession || code.length !== 6}>
              {tr('Xác thực')}
            </Button>
          </form>

          <div className="mt-5 rounded-rp-input border border-rp-line bg-rp-bg-2 p-4 text-sm">
            <p className="text-rp-text-2">{tr('Chưa nhận được email? Kiểm tra cả thư mục Spam hoặc gửi lại mã.')}</p>
            {resendMessage && <p role="status" className="mt-2 font-medium text-rp-success">{resendMessage}</p>}
            {resendError && <p role="alert" className="mt-2 font-medium text-rp-danger">{resendError}</p>}
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              icon={RefreshCw}
              loading={resending}
              disabled={!validSession || cooldown > 0 || (changeEmailFlow && !isAuthenticated)}
              onClick={handleResend}
            >
              {cooldown > 0 ? `${tr('Gửi lại sau')} ${cooldown}s` : tr('Gửi lại mã')}
            </Button>
          </div>

          {email && (
            <div className="mt-4 text-sm">
              <button type="button" className="rp-focus rp-link rounded-sm font-semibold" onClick={() => setShowEmailChange(true)}>
                {tr('Dùng email khác để xác thực')}
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        open={showEmailChange}
        onClose={() => { setShowEmailChange(false); setRegistrationPassword(''); setEmailChangeError(''); }}
        title="Dùng email khác để xác thực"
        description="Tài khoản chưa xác thực có thể đổi email. Nhập lại mật khẩu đăng ký để bảo vệ tài khoản."
        size="sm"
        dismissible={!changeEmailMutation.isPending}
      >
        <form onSubmit={handleEmailChange} className="space-y-3 text-sm">
          <Field label="Email mới" required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required />
            )}
          </Field>
          <Field label="Mật khẩu đã đăng ký" required>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} type="password" autoComplete="current-password" value={registrationPassword} onChange={(event) => setRegistrationPassword(event.target.value)} required />
            )}
          </Field>
          {emailChangeError && <p role="alert" className="text-rp-danger">{emailChangeError}</p>}
          <Button type="submit" size="md" className="w-full" loading={changeEmailMutation.isPending} disabled={changeEmailMutation.isPending} aria-label={tr('Cập nhật email và gửi mã')}>
            {changeEmailMutation.isPending ? null : tr('Cập nhật email và gửi mã')}
          </Button>
        </form>
      </Modal>

      <AuthPromptLinks
        items={[
          { question: t('hasAccount'), label: t('login'), to: '/auth/' },
          { question: t('noAccount'), label: t('register'), to: '/register/' },
        ]}
      />
    </AuthLayout>
  );
}
