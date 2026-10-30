import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession } from '../../auth/session.js';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import { useChangePasswordMutation } from '../../hooks/useAuth.js';
import { useLocale } from '../../i18n/locale.js';

const fieldClass = 'block w-full rounded-xl border border-[#EAE2E6] bg-white px-4 py-3 pr-11 text-sm text-[#352C31] outline-none focus:border-[#D94B68] focus:ring-2 focus:ring-[#D94B68]/20';

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle, showLabel, hideLabel, minLength }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#8A7A82]" htmlFor={id}>{label}</label>
      <div className="relative mt-2">
        <input
          id={id}
          required
          minLength={minLength}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
        />
        <button
          type="button"
          aria-label={show ? hideLabel : showLabel}
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#A08E97] hover:text-[#AD3155]"
        >
          <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { tr } = useLocale();
  const session = getSession();
  const mutation = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loading = mutation.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!session?.userId || !session?.accessToken) {
      navigate('/auth', { replace: true, state: { notice: tr('Đăng nhập để đổi mật khẩu.') } });
      return;
    }
    if (newPassword.length < 6) {
      setError(tr('Mật khẩu mới tối thiểu 6 ký tự.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(tr('Mật khẩu xác nhận không khớp.'));
      return;
    }
    mutation.mutate(
      { userId: session.userId, currentPassword, newPassword, confirmPassword },
      {
        onSuccess: () => {
          setNotice(tr('Đổi mật khẩu thành công.'));
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => setError(err.message || tr('Đổi mật khẩu thất bại.')),
      },
    );
  }

  const steps = [
    ['01', tr('Nhập mật khẩu hiện tại')],
    ['02', tr('Đặt mật khẩu mới')],
    ['03', tr('Xác nhận và lưu')],
  ];

  const fieldProps = {
    show,
    onToggle: () => setShow((open) => !open),
    showLabel: tr('Hiện mật khẩu'),
    hideLabel: tr('Ẩn mật khẩu'),
  };

  return (
    <div
      data-page="ChangePassword"
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
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">{tr('Đổi mật khẩu')}</h1>
            <p className="mt-4 max-w-[280px] text-[13px] leading-6 text-[#EDD4DC]">
              {tr('Đổi mật khẩu khi đã đăng nhập. Nhập mật khẩu đang dùng, rồi đặt mật khẩu mới.')}
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            {notice ? (
              <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{tr(error)}</p>
            ) : null}

            <PasswordField
              id="currentPassword"
              label={tr('Mật khẩu hiện tại')}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              {...fieldProps}
            />
            <PasswordField
              id="newPassword"
              label={tr('Mật khẩu mới')}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={6}
              {...fieldProps}
            />
            <p className="-mt-2 text-[11px] text-[#A08E97]">{tr('Tối thiểu 6 ký tự.')}</p>
            <PasswordField
              id="confirmPassword"
              label={tr('Xác nhận mật khẩu mới')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={6}
              {...fieldProps}
            />

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-[10px] bg-[#D94B68] text-[14px] font-semibold text-white hover:bg-[#C43E5C] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? tr('Đang đổi...') : tr('Đổi mật khẩu')}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-[#94858C]">
            <Link className="font-medium text-[#AD3155] hover:underline" to="/update-email">{tr('Đổi email')}</Link>
            {' · '}
            <Link className="font-medium text-[#AD3155] hover:underline" to="/auth">{tr('Đăng nhập')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
