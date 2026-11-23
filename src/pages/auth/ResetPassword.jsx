import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import { Banner, Button } from '@/components/ui';
import PasswordInputField from '@/features/auth/components/PasswordInputField.jsx';
import PasswordStrengthMeter from '@/features/auth/components/PasswordStrengthMeter.jsx';
import { useResetPasswordMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { evaluatePasswordSecurity } from '@/features/auth/utils/passwordStrength.js';
import { useLocale } from '@/locales/locale.js';

export default function ResetPassword() {
  const { t, tr } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const reset = useResetPasswordMutation();

  const evaluation = useMemo(() => evaluatePasswordSecurity(newPassword), [newPassword]);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  function submit(event) {
    event.preventDefault();
    if (reset.isPending) return;
    setError('');
    if (!evaluation.policyValid) {
      setError(tr(evaluation.policyError || 'Mật khẩu mới chưa đạt tiêu chuẩn bảo mật.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tr('Mật khẩu xác nhận không khớp.'));
      return;
    }
    reset.mutate({ token, newPassword, confirmPassword }, {
      onSuccess: () => navigate('/auth/', {
        replace: true,
        state: {
          notice: tr('Đã đặt lại mật khẩu. Đăng nhập để tiếp tục.'),
          noticeTone: 'success',
          focusPassword: true,
        },
      }),
      onError: (failure) => setError(failure?.message || tr('Chưa đặt lại được mật khẩu. Vui lòng thử lại.')),
    });
  }

  return (
    <AuthLayout title={tr('Đặt lại mật khẩu')} subtitle={tr('Tạo mật khẩu mới để tiếp tục học cùng RikiPath.')}>
      {!token ? (
        <Banner tone="warning" title={tr('Thiếu liên kết đặt lại mật khẩu')}>
          {tr('Vui lòng mở liên kết trong email hoặc yêu cầu gửi liên kết mới.')}{' '}
          <Link to="/forgot-password/" className="rp-focus rp-link rounded-sm">{tr('Quên mật khẩu')}</Link>
        </Banner>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <PasswordInputField
            id="resetNewPassword"
            name="newPassword"
            label="Mật khẩu mới"
            placeholder="Tạo mật khẩu mới"
            autoComplete="new-password"
            value={newPassword}
            disabled={reset.isPending}
            required
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <PasswordInputField
            id="resetConfirmPassword"
            name="confirmPassword"
            label={t('confirmPassword')}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={reset.isPending}
            error={confirmMismatch ? 'Mật khẩu xác nhận không khớp.' : ''}
            required
            trailingAdornment={passwordsMatch ? (
              <CheckCircle2 aria-label={tr('Mật khẩu xác nhận khớp')} className="h-4 w-4 text-[#16A34A]" />
            ) : null}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <PasswordStrengthMeter evaluation={evaluation} compact />
          {error && <Banner tone="danger">{error}</Banner>}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={reset.isPending}
            disabled={!evaluation.policyValid || !passwordsMatch}
          >
            {reset.isPending ? tr('Đang cập nhật mật khẩu...') : tr('Lưu mật khẩu mới')}
          </Button>
        </form>
      )}
      <Link to="/auth/" className="rp-focus rp-link mt-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />{tr('Quay lại đăng nhập')}
      </Link>
    </AuthLayout>
  );
}
