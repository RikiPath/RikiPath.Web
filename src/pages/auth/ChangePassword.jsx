import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { Banner, Button, cx, useOnlineStatus } from '@/components/ui';
import PasswordInputField from '@/features/auth/components/PasswordInputField.jsx';
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter.jsx';
import SecurityShieldHero from '@/features/auth/components/SecurityShieldHero.jsx';
import { useChangePasswordMutation, useSetPasswordMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { evaluatePasswordSecurity } from '@/features/auth/utils/passwordStrength.js';
import { useLocale } from '@/locales/locale.js';

function isAmbiguousNetworkError(err) {
  if (!err) return false;
  if (err.code === 'ECONNABORTED' || err.isTimeout) return true;
  return !err.status;
}

export default function ChangePassword() {
  const { tr } = useLocale();
  const { user, primaryRole, logout, expireSession } = useAuth();
  const online = useOnlineStatus();
  const reducedMotion = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const hasPassword = user?.hasPassword !== false;
  const userId = user?.userId;
  const userEmail = user?.email || '';
  const userFullName = user?.fullName || '';

  const changeMutation = useChangePasswordMutation();
  const setMutation = useSetPasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [currentPwdServerError, setCurrentPwdServerError] = useState('');
  const [ambiguousWarning, setAmbiguousWarning] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const submittingRef = useRef(false);
  const currentInputRef = useRef(null);
  const logoutTimerRef = useRef(null);

  useEffect(() => () => {
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
  }, []);

  const evaluation = useMemo(
    () => evaluatePasswordSecurity(newPassword, {
      email: userEmail,
      fullName: userFullName,
      currentPassword: hasPassword ? currentPassword : undefined,
    }),
    [newPassword, userEmail, userFullName, hasPassword, currentPassword],
  );

  const isConfirmEntered = confirmPassword.length > 0;
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const confirmMismatch = isConfirmEntered && newPassword !== confirmPassword;

  const busy = changeMutation.isPending || setMutation.isPending || succeeded;
  const canSubmit = online && !busy && (!hasPassword || currentPassword.length > 0) && evaluation.policyValid && passwordsMatch;

  const currentError = currentPwdServerError || (submitAttempted && hasPassword && !currentPassword ? 'Vui lòng nhập mật khẩu hiện tại.' : '');
  const newPasswordError = submitAttempted && newPassword && !evaluation.policyValid
    ? evaluation.policyError
    : submitAttempted && !newPassword
      ? 'Vui lòng nhập mật khẩu mới.'
      : '';
  const confirmError = confirmMismatch
    ? 'Mật khẩu xác nhận không khớp.'
    : submitAttempted && !confirmPassword
      ? 'Vui lòng xác nhận mật khẩu mới.'
      : '';

  const shieldMood = succeeded
    ? 'success'
    : evaluation.score >= 4 && evaluation.policyValid
      ? 'strong'
      : (newPassword.length > 0 || currentPassword.length > 0)
        ? 'typing'
        : 'idle';

  function completeSuccessFlow() {
    setSucceeded(true);
    const delay = reducedMotion ? 120 : 650;
    logoutTimerRef.current = window.setTimeout(() => {
      logout({
        notice: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        tone: 'success',
        email: userEmail,
        focusPassword: true,
        skipDefaultToast: true,
      });
    }, delay);
  }

  function handleMutationError(err) {
    submittingRef.current = false;

    if (err?.status === 401) {
      expireSession();
      return;
    }

    if (isAmbiguousNetworkError(err)) {
      setAmbiguousWarning(true);
      setServerError(null);
      return;
    }

    const msg = err?.message || tr('Chưa cập nhật được mật khẩu. Vui lòng kiểm tra lại thông tin.');
    if (/mật khẩu hiện tại/i.test(msg)) {
      setCurrentPwdServerError(msg);
      setServerError(null);
      window.requestAnimationFrame(() => currentInputRef.current?.focus({ preventScroll: true }));
      return;
    }

    setServerError(msg);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    setServerError(null);
    setCurrentPwdServerError('');
    setAmbiguousWarning(false);

    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;

    if (hasPassword) {
      changeMutation.mutate(
        { userId, currentPassword, newPassword, confirmPassword },
        {
          onSuccess: completeSuccessFlow,
          onError: handleMutationError,
        },
      );
      return;
    }

    setMutation.mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: completeSuccessFlow,
        onError: handleMutationError,
      },
    );
  }

  const securityHighlights = [
    {
      label: tr('Xác thực chính chủ'),
      active: !hasPassword || currentPassword.length > 0,
    },
    {
      label: tr('Đáp ứng chuẩn an toàn'),
      active: evaluation.policyValid,
    },
    {
      label: tr('Khớp mật khẩu xác nhận'),
      active: passwordsMatch,
    },
    {
      label: tr('Thu hồi mọi phiên đăng nhập cũ sau khi lưu'),
      active: succeeded,
    },
  ];

  const isMutating = changeMutation.isPending || setMutation.isPending;

  return (
    <div
      data-page="ChangePassword"
      className="flex min-h-dvh items-center justify-center bg-[#F8F6F4] px-3 py-4 text-rp-text sm:px-6 sm:py-6"
    >
      <main className="grid w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-[#EAE3E4] bg-white shadow-[0_24px_64px_-28px_rgba(120,40,70,0.22),0_2px_8px_rgba(45,40,42,0.04)] lg:grid-cols-[0.88fr_1.12fr]">
        {/* Left column: Branding + 3D Security Shield + Meaningful Live Checklist */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#C84666] via-[#B53D5C] to-[#982E4B] p-6 text-white lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full border border-white/10" />

          <div className="relative flex items-center justify-between gap-3">
            <Link
              to={homeForRole(primaryRole)}
              className="rp-focus inline-flex items-center gap-2.5 rounded-lg"
            >
              <BrandMark className="h-9 w-12" />
              <span className="text-[20px] font-semibold tracking-tight">RikiPath</span>
            </Link>
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/95">
              {tr('Bảo mật tài khoản')}
            </span>
          </div>

          <div className="relative my-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:my-6 lg:flex-col lg:items-start">
            <SecurityShieldHero mood={shieldMood} />
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[28px]">
                {hasPassword ? tr('Đổi mật khẩu') : tr('Thiết lập mật khẩu')}
              </h1>
              <p className="mt-2 max-w-[340px] text-[13px] leading-5 text-[#F6DDE5]">
                {hasPassword
                  ? tr('Cập nhật mật khẩu mới khó đoán hơn. Tất cả phiên đăng nhập cũ sẽ tự động đăng xuất ngay khi lưu.')
                  : tr('Tài khoản đang đăng nhập qua Google. Hãy đặt mật khẩu nội bộ để đăng nhập bằng email hoặc thay đổi email.')}
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-white/20 bg-black/10 p-3.5 backdrop-blur-xs">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F5D2DC]">
              {tr('Trạng thái bảo vệ')}
            </p>
            <ul className="space-y-2 text-[12.5px]">
              {securityHighlights.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                      item.active
                        ? 'border-emerald-300 bg-emerald-400/25 text-emerald-100'
                        : 'border-white/25 bg-white/10 text-white/60',
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                  <span className={cx('transition-opacity', item.active ? 'font-medium text-white' : 'text-white/80')}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right column: Clean unified form */}
        <section className="flex flex-col justify-between p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE3E4] pb-3.5">
            <Link
              to="/profile?tab=security"
              className="rp-focus inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-rp-text-2 transition-colors hover:bg-[#FFF0F4] hover:text-rp-brand-strong"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {tr('Quay lại hồ sơ & bảo mật')}
            </Link>
            <LanguageSwitch />
          </div>

          <div className="my-auto py-4">
            {userEmail && (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] px-3.5 py-2 text-[12.5px]">
                <span className="text-rp-text-muted">{tr('Tài khoản')}:</span>
                <strong className="truncate text-rp-text">{userEmail}</strong>
              </div>
            )}

            {!online && (
              <Banner tone="warning" title={tr('Bạn đang ngoại tuyến')} className="mb-4">
                {tr('Cần kết nối mạng ổn định để cập nhật mật khẩu.')}
              </Banner>
            )}

            {ambiguousWarning && (
              <Banner
                tone="warning"
                title={tr('Kết nối bị gián đoạn khi đang xử lý')}
                className="mb-4"
                actions={(
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => logout({
                      notice: 'Vui lòng đăng nhập lại để kiểm tra mật khẩu mới hoặc cũ của bạn.',
                      tone: 'info',
                      email: userEmail,
                      focusPassword: true,
                      skipDefaultToast: true,
                    })}
                  >
                    {tr('Đi tới trang đăng nhập')}
                  </Button>
                )}
              >
                {tr('Hệ thống không xác nhận được kết quả vì mạng gián đoạn. Để tránh gửi trùng yêu cầu, hãy thử đăng nhập lại trước khi đổi tiếp.')}
              </Banner>
            )}

            {succeeded && (
              <Banner tone="success" title={tr('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')} className="mb-4">
                {tr('Phiên đăng nhập cũ đã được thu hồi. Đang chuyển về trang đăng nhập...')}
              </Banner>
            )}

            {serverError && !succeeded && (
              <Banner tone="danger" className="mb-4">
                {tr(serverError)}
              </Banner>
            )}

            <form className="space-y-3.5" noValidate onSubmit={handleSubmit}>
              {hasPassword && (
                <PasswordInputField
                  ref={currentInputRef}
                  id="currentPassword"
                  name="currentPassword"
                  label="Mật khẩu hiện tại"
                  placeholder="Nhập mật khẩu hiện tại"
                  autoComplete="current-password"
                  value={currentPassword}
                  disabled={busy}
                  error={currentError}
                  required
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (currentPwdServerError) setCurrentPwdServerError('');
                  }}
                />
              )}

              <div className="space-y-2.5">
                <PasswordInputField
                  id="newPassword"
                  name="newPassword"
                  label="Mật khẩu mới"
                  placeholder="Tạo mật khẩu mới"
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={busy}
                  error={newPasswordError}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <PasswordStrengthMeter
                  evaluation={evaluation}
                  hasCurrentPasswordField={hasPassword}
                />
              </div>

              <div>
                <PasswordInputField
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={busy}
                  error={confirmError}
                  required
                  trailingAdornment={passwordsMatch ? (
                    <CheckCircle2 aria-label={tr('Mật khẩu xác nhận khớp')} className="h-4 w-4 text-[#16A34A]" />
                  ) : null}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span className="sr-only" role="status" aria-live="polite">
                  {passwordsMatch
                    ? tr('Mật khẩu xác nhận đã khớp.')
                    : confirmMismatch
                      ? tr('Mật khẩu xác nhận không khớp.')
                      : ''}
                </span>
              </div>

              <div className="pt-1.5">
                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  icon={KeyRound}
                  loading={isMutating}
                  disabled={!canSubmit}
                  className="w-full justify-center"
                >
                  {isMutating
                    ? tr('Đang cập nhật mật khẩu...')
                    : hasPassword
                      ? tr('Đổi mật khẩu')
                      : tr('Thiết lập mật khẩu')}
                </Button>
              </div>
            </form>
          </div>

          <div className="border-t border-[#EAE3E4] pt-3.5 text-[12px] text-rp-text-muted">
            <span>{tr('Đổi xong hệ thống tự động đăng xuất khỏi các thiết bị cũ.')}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
