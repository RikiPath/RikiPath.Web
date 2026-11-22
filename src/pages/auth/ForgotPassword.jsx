import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout.jsx';
import { useAuth } from '@/app/auth/authContext.js';
import { Banner } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * The Backend (AuthController) exposes no forgot/reset-password endpoint yet,
 * so this page must not pretend to send recovery e-mails. It explains the real
 * options instead. When the API exists, replace this with request → code → new password.
 */
export default function ForgotPassword() {
  const { tr } = useLocale();
  const { isAuthenticated } = useAuth();
  return (
    <AuthLayout title={tr('Quên mật khẩu')} subtitle={tr('Khôi phục quyền truy cập tài khoản RikiPath.')}>
      <Banner tone="info" title={tr('Khôi phục qua email chưa được hỗ trợ')}>
        {tr('Hệ thống hiện chưa có chức năng gửi liên kết đặt lại mật khẩu. Chúng tôi sẽ không gửi email nào từ trang này.')}
      </Banner>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-rp-text-2">
        <li className="flex gap-2.5">
          <KeyRound aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rp-brand" />
          <span>
            {tr('Nếu bạn vẫn đang đăng nhập trên thiết bị này, hãy')}{' '}
            {isAuthenticated ? (
              <Link to="/change-password/" className="rp-focus rp-link rounded-sm">{tr('đổi mật khẩu')}</Link>
            ) : (
              tr('đổi mật khẩu trong phần Tài khoản')
            )}
            .
          </span>
        </li>
        <li className="flex gap-2.5">
          <KeyRound aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rp-brand" />
          <span>{tr('Nếu tài khoản liên kết Google, bạn có thể đăng nhập bằng Google (khi tính năng được bật).')}</span>
        </li>
        <li className="flex gap-2.5">
          <KeyRound aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-rp-brand" />
          <span>{tr('Trường hợp khác, vui lòng liên hệ quản trị viên RikiPath để được hỗ trợ xác minh và cấp lại quyền truy cập.')}</span>
        </li>
      </ul>
      <Link to="/auth/" className="rp-focus mt-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold rp-link">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />{' '}{tr('Quay lại đăng nhập')}
      </Link>
    </AuthLayout>
  );
}
