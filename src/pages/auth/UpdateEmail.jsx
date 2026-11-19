import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, patchSession, savePendingVerify } from '@/app/auth/session.js';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { useUpdateEmailMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLocale } from '@/locales/locale.js';
import { notify } from '@/components/ui/feedbackStore.js';

export default function UpdateEmail() {
  const navigate = useNavigate();
  const { tr } = useLocale();
  const session = getSession();
  const mutation = useUpdateEmailMutation();
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const loading = mutation.isPending;
  const currentEmail = session?.email || tr('chưa đăng nhập');

  function goToVerify(email, notice) {
    savePendingVerify({ email, userId: session?.userId });
    navigate(`/verify-email?email=${encodeURIComponent(email)}&userId=${session?.userId || ''}`, {
      state: notice ? { notice } : undefined,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!session?.userId || !session?.accessToken) {
      navigate('/auth', { replace: true, state: { notice: tr('Đăng nhập để đổi email.') } });
      return;
    }
    mutation.mutate(
      { userId: session.userId, newEmail: newEmail.trim() },
      {
        onSuccess: () => {
          patchSession({ email: newEmail.trim() });
          notify.info(tr('Đã cập nhật email mới'), tr('Kiểm tra hộp thư mới để nhập mã xác thực.'), { key: 'auth-update-email' });
          goToVerify(newEmail.trim());
        },
        onError: (err) => {
          const msg = err.message || tr('Cập nhật email thất bại.');
          if (msg.includes('Đã cập nhật email')) {
            patchSession({ email: newEmail.trim() });
            notify.info(tr('Đã cập nhật email mới'), msg, { key: 'auth-update-email' });
            goToVerify(newEmail.trim(), msg);
            return;
          }
          setError(msg);
          notify.apiError(err, tr('Cập nhật email thất bại.'), { key: 'auth-update-email-err' });
        },
      },
    );
  }

  const steps = [
    ['01', tr('Nhập địa chỉ mới')],
    ['02', tr('Nhận mã xác thực')],
    ['03', tr('Xác thực rồi đăng nhập lại')],
  ];

  return (
    <div
      data-page="UpdateEmail"
      className="flex min-h-dvh items-center justify-center bg-rp-brand-tint px-[var(--rp-space-page-x)] py-[var(--rp-space-page-y)] text-rp-text"
    >
      <main className="grid w-full max-w-[960px] overflow-hidden rounded-[24px] border border-rp-line bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)] lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="relative flex flex-col overflow-hidden bg-gradient-to-br from-[#C84666] via-[#B53D5C] to-[#9E3350] p-[var(--rp-space-card-pad)] text-white lg:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/[0.07]" />

          <Link to="/" className="relative inline-flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <BrandMark className="h-11 w-16" />
            <span className="text-[21px] font-semibold tracking-tight">RikiPath</span>
          </Link>

          <div className="relative mt-8">
            <p className="text-[12px] font-medium text-[#EBC7D2]">{tr('Tài khoản')}</p>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">{tr('Đổi email')}</h1>
            <p className="mt-4 max-w-[280px] text-[13px] leading-6 text-[#EDD4DC]">
              {tr('Đổi địa chỉ email. Hệ thống gửi mã xác thực tới email mới; bạn phải xác thực trước khi đăng nhập lại.')}
            </p>
          </div>

          <ol className="relative mt-8 space-y-4">
            {steps.map(([number, label]) => (
              <li key={number} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-[11px] text-[#EBC7D2]">
                  {number}
                </span>
                <p className="text-[13px] font-medium">{tr(label)}</p>
              </li>
            ))}
          </ol>
        </aside>

        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <div className="mb-5 flex justify-end">
            <LanguageSwitch />
          </div>

          <p className="text-[12px] font-medium text-rp-brand-strong">{tr('Email hiện tại')}</p>
          <p className="mt-2 break-all rounded-xl bg-rp-brand-tint px-4 py-3 text-[14px] font-medium text-rp-brand-strong">
            {currentEmail}
          </p>

          <form className="mt-6" onSubmit={handleSubmit}>
            {error ? (
              <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {tr(error)}
              </p>
            ) : null}

            <label className="block text-[12px] font-medium text-rp-text-muted" htmlFor="newEmail">
              {tr('Email mới')}
            </label>
            <input
              id="newEmail"
              required
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ten.moi@email.com"
              className="mt-2 block w-full rounded-xl border border-rp-line bg-white px-4 py-3 text-sm text-rp-text outline-none focus:border-rp-brand focus:ring-2 focus:ring-rp-brand/20"
            />
            <p className="mt-2 text-[11px] leading-5 text-rp-text-muted">
              {tr('Mã được gửi tới email mới, không gửi lại email cũ.')}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-[10px] bg-rp-brand-pressed text-[14px] font-semibold text-white hover:bg-rp-brand disabled:cursor-wait disabled:opacity-60 rp-press"
            >
              {loading ? tr('Đang cập nhật...') : tr('Cập nhật email')}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-rp-text-muted">
            <Link className="font-medium rp-link" to="/change-password">{tr('Đổi mật khẩu')}</Link>
            {' · '}
            <Link className="font-medium rp-link" to="/settings">{tr('Cài đặt')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
