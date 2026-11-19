import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession } from '@/app/auth/session.js';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { useChangePasswordMutation } from '@/features/auth/hooks/useAuthMutations.js';
import { useLocale } from '@/locales/locale.js';
import { notify } from '@/components/ui/feedbackStore.js';
import Icon from '@/components/ui/Icon.jsx';

const fieldClass = 'block w-full rounded-xl border border-rp-line bg-white px-4 py-3 pr-11 text-sm text-rp-text outline-none focus:border-rp-brand focus:ring-2 focus:ring-rp-brand/20';

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle, showLabel, hideLabel, minLength }) {
  const { tr } = useLocale();
  return (
    <div>
      <label className="block text-[12px] font-medium text-rp-text-muted" htmlFor={id}>{tr(label)}</label>
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
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-rp-text-muted hover:text-rp-brand-strong"
        >
          <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[18px]" />
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
          notify.success(tr('Đổi mật khẩu thành công.'), '', { key: 'auth-change-pw' });
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err) => {
          setError(err.message || tr('Đổi mật khẩu thất bại.'));
          notify.apiError(err, tr('Đổi mật khẩu thất bại.'), { key: 'auth-change-pw-err' });
        },
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
      className="flex min-h-dvh items-center justify-center bg-rp-brand-tint px-[var(--rp-space-page-x)] py-[var(--rp-space-page-y)] text-rp-text"
    >
      <main className="grid w-full max-w-[960px] overflow-hidden rounded-[24px] border border-rp-line bg-white shadow-[0_12px_48px_rgba(75,42,55,0.06)] lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="relative flex flex-col overflow-hidden bg-rp-brand-strong p-[var(--rp-space-card-pad)] text-white lg:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/[0.07]" />

          <Link to="/" className="relative inline-flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <BrandMark className="h-11 w-16" />
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
                <p className="text-[13px] font-medium">{tr(label)}</p>
              </li>
            ))}
          </ol>
        </aside>

        <section className="px-5 py-6 sm:p-8 lg:px-9 lg:py-8">
          <div className="mb-5 flex justify-end">
            <LanguageSwitch />
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
            <p className="-mt-2 text-[11px] text-rp-text-muted">{tr('Tối thiểu 6 ký tự.')}</p>
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
              className="flex h-11 w-full items-center justify-center rounded-[10px] bg-rp-brand-pressed text-[14px] font-semibold text-white hover:bg-rp-brand disabled:cursor-wait disabled:opacity-60 rp-press"
            >
              {loading ? tr('Đang đổi...') : tr('Đổi mật khẩu')}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-rp-text-muted">
            <Link className="font-medium rp-link" to="/update-email">{tr('Đổi email')}</Link>
            {' · '}
            <Link className="font-medium rp-link" to="/auth">{tr('Đăng nhập')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
