import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingVerify, getPendingVerify } from '@/app/auth/session.js';
import { CircleAlert, MailCheck, RefreshCw } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import AuthPromptLinks from '@/features/auth/components/AuthPromptLinks.jsx';
import { Banner, Button, notify } from '@/components/ui';
import { useResendVerificationMutation, useVerifyEmailMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLocale } from '@/locales/locale.js';

function CodeBoxes({ value, onChange, disabled, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  function write(index, raw) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
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
    <div className="mt-3 grid grid-cols-6 gap-2" onPaste={onPaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${index + 1}`}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          className={`h-12 w-full rounded-lg border bg-white text-center text-[18px] font-semibold text-rp-text outline-none disabled:opacity-60 ${
            invalid
              ? 'border-rp-brand-border'
              : 'border-rp-line focus:border-rp-brand-strong focus:ring-2 focus:ring-rp-brand-strong/15'
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

  const pending = getPendingVerify();
  const email = params.get('email') || pending?.email || '';
  const userId = Number(params.get('userId') || pending?.userId || 0);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [notice] = useState(location.state?.notice || '');

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const loading = verifyMutation.isPending;
  const resending = resendMutation.isPending;
  const validSession = Number.isInteger(userId) && userId > 0;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function handleResend() {
    const address = email.trim();
    if (!address || resending || cooldown > 0) return;
    setResendError('');
    setResendMessage('');
    resendMutation.mutate(address, {
      onSuccess: () => {
        setResendMessage('Đã gửi mã mới. Mã cũ không còn dùng được.');
        notify.info(tr('Đã gửi lại mã xác thực'), tr('Mã cũ không còn hiệu lực. Hãy kiểm tra hộp thư của bạn.'), { key: 'auth-resend-success' });
        setCooldown(60);
      },
      onError: (err) => {
        const message = err?.message || 'Chưa gửi lại được mã.';
        setResendError(message);
        notify.apiError(err, tr('Chưa gửi lại được mã'), { key: 'auth-resend-error' });
        const wait = message.match(/(\d+)\s*giây/);
        if (wait) setCooldown(Number(wait[1]));
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
      { userId, verificationCode: code },
      {
        onSuccess: () => {
          clearPendingVerify();
          notify.success(tr('Xác thực email thành công!'), tr('Bạn có thể đăng nhập ngay để tiếp tục.'), { key: 'auth-verify-success' });
          navigate('/auth', {
            replace: true,
            state: {
              email,
              notice: tr('Email đã xác thực. Đăng nhập để tiếp tục.'),
            },
          });
        },
        onError: (err) => {
          setError(err?.message || tr('Chưa xác thực được. Vui lòng kiểm tra lại mã.'));
          notify.apiError(err, tr('Chưa xác thực được email'), { key: 'auth-verify-error' });
        },
      },
    );
  }

  return (
    <AuthLayout
      variant="verify"
      title={tr('Xác thực email')}
      subtitle={email ? <>{tr('Nhập mã 6 chữ số đã gửi tới')} <strong className="font-semibold text-rp-text">{email}</strong></> : tr('Nhập mã 6 chữ số trong email xác thực.')}
    >
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

      <div className="mt-6 rounded-rp-input border border-rp-line bg-rp-bg-2 p-4 text-sm">
        <p className="text-rp-text-2">{tr('Chưa nhận được email? Kiểm tra cả thư mục Spam hoặc gửi lại mã.')}</p>
        {resendMessage && <p role="status" className="mt-2 font-medium text-rp-success">{resendMessage}</p>}
        {resendError && <p role="alert" className="mt-2 font-medium text-rp-danger">{resendError}</p>}
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          icon={RefreshCw}
          loading={resending}
          disabled={!email.trim() || cooldown > 0}
          onClick={handleResend}
        >
          {cooldown > 0 ? `${tr('Gửi lại sau')} ${cooldown}s` : tr('Gửi lại mã')}
        </Button>
      </div>

      <AuthPromptLinks
        items={[
          { question: tr('Đã xác thực xong?'), label: t('login'), to: '/auth/' },
          { question: tr('Nhập sai email?'), label: tr('Đăng ký bằng email khác'), to: '/register/' },
        ]}
      />
    </AuthLayout>
  );
}
