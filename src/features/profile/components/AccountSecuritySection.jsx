import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Globe,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { Banner, Button, cx, useOnlineStatus } from '@/components/ui';
import { useAuth } from '@/app/auth/authContext.js';
import PasswordInputField from '@/features/auth/components/PasswordInputField.jsx';
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter.jsx';
import {
  useChangePasswordMutation,
  useSetPasswordMutation,
} from '@/features/auth/hooks/useAuthMutations.js';
import { evaluatePasswordSecurity } from '@/features/auth/utils/passwordStrength.js';
import { useLocale } from '@/locales/locale.js';

export default function AccountSecuritySection({ profile }) {
  const { tr } = useLocale();
  const { logout, expireSession } = useAuth();
  const online = useOnlineStatus();

  const hasPassword = profile?.hasPassword !== false;
  const googleLinked = Boolean(profile?.googleLinked);
  const userId = profile?.userId;
  const userEmail = profile?.email || '';
  const userFullName = profile?.fullName || '';

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [pwdFormError, setPwdFormError] = useState('');
  const [currentPwdServerError, setCurrentPwdServerError] = useState('');
  const [ambiguousPwdWarning, setAmbiguousPwdWarning] = useState(false);

  const submittingPwdRef = useRef(false);
  const currentPwdInputRef = useRef(null);

  const changePwdMutation = useChangePasswordMutation();
  const setPwdMutation = useSetPasswordMutation();

  const evaluation = useMemo(
    () => evaluatePasswordSecurity(newPassword, {
      email: userEmail,
      fullName: userFullName,
      currentPassword: hasPassword ? currentPassword : undefined,
    }),
    [newPassword, userEmail, userFullName, hasPassword, currentPassword],
  );

  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const pwdBusy = changePwdMutation.isPending || setPwdMutation.isPending;
  const canSubmitPwd = online && !pwdBusy && (!hasPassword || currentPassword.length > 0) && evaluation.policyValid && passwordsMatch;

  const currentError = currentPwdServerError || (submitAttempted && hasPassword && !currentPassword ? 'Vui lòng nhập mật khẩu hiện tại.' : '');
  const newPwdError = submitAttempted && newPassword && !evaluation.policyValid
    ? evaluation.policyError
    : submitAttempted && !newPassword
      ? 'Vui lòng nhập mật khẩu mới.'
      : '';
  const confirmPwdError = confirmMismatch
    ? 'Mật khẩu xác nhận không khớp.'
    : submitAttempted && !confirmPassword
      ? 'Vui lòng xác nhận mật khẩu mới.'
      : '';

  function handlePasswordSuccess() {
    logout({
      notice: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
      tone: 'success',
      email: userEmail,
      focusPassword: true,
      skipDefaultToast: true,
    });
  }

  function handlePasswordError(err) {
    submittingPwdRef.current = false;
    if (err?.status === 401) {
      expireSession();
      return;
    }
    if (!err?.status || err?.code === 'ECONNABORTED' || err?.isTimeout) {
      setAmbiguousPwdWarning(true);
      setPwdFormError('');
      return;
    }
    const msg = err?.message || 'Chưa cập nhật được mật khẩu.';
    if (/mật khẩu hiện tại/i.test(msg)) {
      setCurrentPwdServerError(msg);
      setPwdFormError('');
      window.requestAnimationFrame(() => currentPwdInputRef.current?.focus({ preventScroll: true }));
      return;
    }
    setPwdFormError(msg);
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);
    setPwdFormError('');
    setCurrentPwdServerError('');
    setAmbiguousPwdWarning(false);

    if (submittingPwdRef.current || !canSubmitPwd) return;
    submittingPwdRef.current = true;

    if (hasPassword) {
      changePwdMutation.mutate(
        { userId, currentPassword, newPassword, confirmPassword },
        {
          onSuccess: handlePasswordSuccess,
          onError: handlePasswordError,
        },
      );
      return;
    }

    setPwdMutation.mutate(
      { newPassword, confirmPassword },
      {
        onSuccess: handlePasswordSuccess,
        onError: handlePasswordError,
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#EAE3E4] pb-4">
        <h3 className="text-[17px] font-semibold text-rp-text">{tr('Bảo mật & phương thức đăng nhập')}</h3>
        <p className="mt-1 text-[12.5px] leading-5 text-rp-text-muted">
          {tr('Quản lý mật khẩu nội bộ, phương thức đăng nhập và bảo vệ phiên tài khoản.')}
        </p>
      </div>

      {/* Connected authentication providers */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-brand-strong">
              <KeyRound aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-rp-text">{tr('Mật khẩu nội bộ')}</p>
              <p className="text-[11.5px] text-rp-text-muted">
                {hasPassword ? tr('Đã thiết lập trên tài khoản') : tr('Chưa có mật khẩu (đăng nhập Google)')}
              </p>
            </div>
          </div>
          <span className={cx(
            'shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            hasPassword ? 'bg-rp-success-bg text-rp-success' : 'bg-rp-warning-bg text-rp-warning',
          )}>
            {hasPassword ? tr('Đã bật') : tr('Chưa đặt')}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-brand-strong">
              <Globe aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-rp-text">{tr('Tài khoản Google')}</p>
              <p className="text-[11.5px] text-rp-text-muted">
                {googleLinked ? tr('Đã liên kết đăng nhập một chạm') : tr('Chưa liên kết Google')}
              </p>
            </div>
          </div>
          <span className={cx(
            'shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            googleLinked ? 'bg-rp-success-bg text-rp-success' : 'border border-[#EAE3E4] bg-white text-rp-text-muted',
          )}>
            {googleLinked ? tr('Đã liên kết') : tr('Chưa liên kết')}
          </span>
        </div>
      </div>

      {/* Password management */}
      <section aria-label={tr('Mật khẩu')} className="rounded-xl border border-[#EAE3E4] bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
            <Lock aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-[14.5px] font-semibold text-rp-text">
              {hasPassword ? tr('Đổi mật khẩu') : tr('Thiết lập mật khẩu nội bộ')}
            </h4>
            <p className="mt-0.5 text-[12px] leading-5 text-rp-text-muted">
              {hasPassword
                ? tr('Sau khi đổi mật khẩu, tất cả phiên đăng nhập cũ sẽ tự động hết hiệu lực để bảo vệ tài khoản.')
                : tr('Tài khoản này đang đăng nhập qua Google. Hãy đặt mật khẩu để có thể đăng nhập trực tiếp bằng email và thay đổi email.')}
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5" noValidate>
          {ambiguousPwdWarning && (
            <Banner
              tone="warning"
              title={tr('Kết nối bị gián đoạn khi đang xử lý')}
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

          {pwdFormError && <Banner tone="danger">{tr(pwdFormError)}</Banner>}

          {hasPassword && (
            <PasswordInputField
              ref={currentPwdInputRef}
              id="sec-current-pw"
              name="currentPassword"
              label="Mật khẩu hiện tại"
              placeholder="Nhập mật khẩu hiện tại"
              autoComplete="current-password"
              value={currentPassword}
              disabled={pwdBusy}
              error={currentError}
              required
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentPwdServerError) setCurrentPwdServerError('');
              }}
            />
          )}

          <div className="grid gap-3.5 sm:grid-cols-2">
            <PasswordInputField
              id="sec-new-pw"
              name="newPassword"
              label="Mật khẩu mới"
              placeholder="Tạo mật khẩu mới"
              autoComplete="new-password"
              value={newPassword}
              disabled={pwdBusy}
              error={newPwdError}
              required
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInputField
              id="sec-confirm-pw"
              name="confirmPassword"
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={pwdBusy}
              error={confirmPwdError}
              required
              trailingAdornment={passwordsMatch ? (
                <CheckCircle2 aria-label={tr('Mật khẩu xác nhận khớp')} className="h-4 w-4 text-[#16A34A]" />
              ) : null}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <PasswordStrengthMeter
            evaluation={evaluation}
            hasCurrentPasswordField={hasPassword}
          />

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={ShieldCheck}
              loading={pwdBusy}
              disabled={!canSubmitPwd}
            >
              {pwdBusy
                ? tr('Đang cập nhật mật khẩu...')
                : hasPassword
                  ? tr('Đổi mật khẩu')
                  : tr('Thiết lập mật khẩu')}
            </Button>
          </div>
        </form>
      </section>

      {/* Active session revocation policy note */}
      <div className="flex items-start gap-3 rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] px-4 py-3 text-[12px] leading-5 text-rp-text-muted">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" />
        <p>
          {tr('Bảo vệ phiên đăng nhập đang bật: khi đổi mật khẩu, xác nhận email mới hoặc cập nhật phân quyền, các thiết bị khác sẽ tự động đăng xuất.')}
        </p>
      </div>
    </div>
  );
}
