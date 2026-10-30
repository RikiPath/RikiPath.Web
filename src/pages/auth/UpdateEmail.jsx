import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, patchSession, savePendingVerify } from '../../auth/session.js';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import { useUpdateEmailMutation } from '../../hooks/useAuth.js';
import { useLocale } from '../../i18n/locale.js';

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
          goToVerify(newEmail.trim());
        },
        onError: (err) => {
          const msg = err.message || tr('Cập nhật email thất bại.');
          if (msg.includes('Đã cập nhật email')) {
            patchSession({ email: newEmail.trim() });
            goToVerify(newEmail.trim(), msg);
            return;
          }
          setError(msg);
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
      className="flex min-h-screen items-center justify-center bg-[#F8F5F4] px-4 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#352C31] sm:px-6"
    >
      <main className="grid w-full max-w-[920px] overflow-hidden rounded-[24px] border border-[#EEE4E7] bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)] lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="relative flex flex-col overflow-hidden bg-[#92344F] px-7 py-7 text-white sm:px-9 lg:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/[0.07]" />

          <Link to="/" className="relative inline-flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <span className="material-symbols-outlined text-[24px]">spa</span>
            </span>
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
                <p className="text-[13px] font-medium">{label}</p>
              </li>
            ))}
          </ol>
        </aside>

        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <div className="mb-5 flex justify-end">
            <LanguageSwitch className="inline-flex items-center gap-1 rounded-lg border border-[#EAE2E6] bg-[#FCF7F9] px-2.5 py-1 text-xs font-semibold text-[#6F5C66]" />
          </div>

          <p className="text-[12px] font-medium text-[#AD526F]">{tr('Email hiện tại')}</p>
          <p className="mt-2 break-all rounded-xl bg-[#FAF5F7] px-4 py-3 text-[14px] font-medium text-[#9E3658]">
            {currentEmail}
          </p>

          <form className="mt-6" onSubmit={handleSubmit}>
            {error ? (
              <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {tr(error)}
              </p>
            ) : null}

            <label className="block text-[12px] font-medium text-[#8A7A82]" htmlFor="newEmail">
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
              className="mt-2 block w-full rounded-xl border border-[#EAE2E6] bg-white px-4 py-3 text-sm text-[#352C31] outline-none focus:border-[#D94B68] focus:ring-2 focus:ring-[#D94B68]/20"
            />
            <p className="mt-2 text-[11px] leading-5 text-[#A08E97]">
              {tr('Mã được gửi tới email mới, không gửi lại email cũ.')}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-[10px] bg-[#D94B68] text-[14px] font-semibold text-white hover:bg-[#C43E5C] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? tr('Đang cập nhật...') : tr('Cập nhật email')}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-[#94858C]">
            <Link className="font-medium text-[#AD3155] hover:underline" to="/change-password">{tr('Đổi mật khẩu')}</Link>
            {' · '}
            <Link className="font-medium text-[#AD3155] hover:underline" to="/settings">{tr('Cài đặt')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
