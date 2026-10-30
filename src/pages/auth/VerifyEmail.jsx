import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingVerify, getPendingVerify } from '../../auth/session.js';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import { useVerifyEmailMutation } from '../../hooks/useAuth.js';
import { useLocale } from '../../i18n/locale.js';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { locale, tr } = useLocale();

  const pending = getPendingVerify();
  const email = params.get('email') || pending?.email || '';
  const userId = Number(params.get('userId') || pending?.userId || 0);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [notice] = useState(location.state?.notice || '');

  const verifyMutation = useVerifyEmailMutation();
  const loading = verifyMutation.isPending;
  const validSession = Number.isInteger(userId) && userId > 0;

  function handleCodeChange(event) {
    const next = event.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    if (error) setError('');
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
        },
      },
    );
  }

  const steps = [
    ['01', tr('Mở email')],
    ['02', tr('Nhập mã 6 số')],
    ['03', tr('Đăng nhập để tiếp tục')],
  ];

  return (
    <div
      data-page="VerifyEmail"
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
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight">{tr('Xác thực email')}</h1>
            <p className="mt-4 max-w-[280px] text-[13px] leading-6 text-[#EDD4DC]">
              {tr('Nhập mã 6 số đã gửi tới email. Mã có hiệu lực trong 30 phút.')}
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

          <p className="text-[12px] font-medium text-[#AD526F]">{tr('Email nhận mã')}</p>
          <p className="mt-2 break-all rounded-xl bg-[#FAF5F7] px-4 py-3 text-[14px] font-medium text-[#9E3658]">
            {email || tr('email bạn dùng để đăng ký')}
          </p>

          {notice ? (
            <p role="status" className="mt-4 rounded-xl border border-[#EBDDE5] bg-[#FCF5F9] px-3 py-2.5 text-[12px] leading-5 text-[#8F6A7C]">
              {tr(notice)}
            </p>
          ) : null}

          <form className="mt-6" onSubmit={handleVerify} aria-busy={loading}>
            <label className="block text-[12px] font-medium text-[#8A7A82]" htmlFor="verification-code">
              {tr('Mã xác thực')}
            </label>
            <input
              id="verification-code"
              name="verificationCode"
              type="text"
              required
              minLength={6}
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              autoCapitalize="off"
              spellCheck={false}
              value={code}
              onChange={handleCodeChange}
              disabled={loading}
              placeholder="000000"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'verification-error' : undefined}
              className={`mt-2 h-[58px] w-full rounded-xl border bg-white text-center font-mono text-[27px] font-medium tracking-[0.35em] text-[#704355] outline-none placeholder:text-[#D8C6D0] disabled:cursor-wait disabled:opacity-60 ${
                error ? 'border-[#CE8FA5]' : 'border-[#EAE2E6] focus:border-[#D94B68] focus:ring-2 focus:ring-[#D94B68]/20'
              }`}
            />
            <p className="mt-2 text-[11px] text-[#A08E97]">{tr('Mã có hiệu lực trong 30 phút.')}</p>

            {error ? (
              <p id="verification-error" role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {tr(error)}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-[10px] bg-[#D94B68] text-[14px] font-semibold text-white hover:bg-[#C43E5C] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? tr('Đang xác thực…') : tr('Xác thực email')}
            </button>
          </form>

          <div className="mt-5 border-t border-[#F0E7EC] pt-4">
            <button
              type="button"
              aria-expanded={showHelp}
              aria-controls="email-help"
              onClick={() => setShowHelp((current) => !current)}
              className="flex w-full items-center justify-between gap-2 text-left text-[12px] text-[#927687] hover:text-[#AD3155]"
            >
              {tr('Chưa thấy email?')}
              <span className="material-symbols-outlined text-[18px]">{showHelp ? 'expand_less' : 'expand_more'}</span>
            </button>
            {showHelp ? (
              <p id="email-help" className="mt-2 rounded-lg bg-[#FCF6F9] px-3 py-3 text-[12px] leading-6 text-[#947B89]">
                {tr('Kiểm tra mục Spam / Thư rác và chờ thêm vài phút. Nếu nhập sai địa chỉ email, bạn có thể')}{' '}
                <Link to="/register" className="font-medium text-[#AD3155] underline underline-offset-2">{tr('đăng ký lại')}</Link>{locale === 'ja' ? '。' : '.'}
              </p>
            ) : null}
          </div>

          <p className="mt-5 text-center text-[12px] text-[#94858C]">
            {tr('Đã xác thực?')}{' '}
            <Link className="font-medium text-[#AD3155] hover:underline" to="/auth" state={email ? { email } : undefined}>{tr('Đăng nhập')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
