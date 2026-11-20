import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import { Banner, Button, Field, Input } from '@/components/ui';
import { useRequestPasswordResetMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLocale } from '@/locales/locale.js';

export default function ForgotPassword() {
  const { t, tr } = useLocale();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const requestReset = useRequestPasswordResetMutation();

  function submit(event) {
    event.preventDefault();
    if (requestReset.isPending) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(tr('Email chưa đúng định dạng.'));
      return;
    }
    requestReset.mutate(email.trim(), {
      onSuccess: () => setSubmitted(true),
      onError: (failure) => setError(failure?.status === 503
        ? tr('Gửi email hiện chưa sẵn sàng. Vui lòng thử lại sau.')
        : failure?.message || tr('Chưa gửi được yêu cầu. Vui lòng thử lại.')),
    });
  }

  return (
    <AuthLayout title={tr('Quên mật khẩu')} subtitle={tr('Khôi phục quyền truy cập tài khoản RikiPath.')}>
      {submitted ? (
        <Banner tone="success" title={tr('Kiểm tra hộp thư của bạn')}>
          {tr('Nếu email đã xác thực thuộc một tài khoản RikiPath, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư mục Spam.')}
        </Banner>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-sm leading-6 text-rp-text-2">{tr('Nhập email đã dùng để đăng ký. Liên kết đặt lại mật khẩu có hiệu lực trong 30 phút.')}</p>
          <Field label={t('emailShort')} required error={error}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} icon={Mail} type="email" autoComplete="email" inputMode="email" placeholder="ban@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={requestReset.isPending}>{tr('Gửi liên kết đặt lại mật khẩu')}</Button>
        </form>
      )}
      <Link to="/auth/" className="rp-focus rp-link mt-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />{tr('Quay lại đăng nhập')}
      </Link>
    </AuthLayout>
  );
}
