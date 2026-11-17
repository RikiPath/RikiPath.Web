import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingVerify, getPendingVerify } from '../../auth/session.js';
import BrandMark from '../../components/BrandMark.jsx';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import { useResendVerificationMutation, useVerifyEmailMutation } from '../../hooks/useAuth.js';
import { useLocale } from '../../i18n/locale.js';

function CodeBoxes({ value, onChange, disabled, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  function write(index, raw) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function onKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(event) {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    event.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="mt-3 grid grid-cols-6 gap-2" onPaste={onPaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${index + 1}`}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          className={`h-12 w-full rounded-lg border bg-white text-center text-[18px] font-semibold text-[#352C31] outline-none disabled:opacity-60 ${
            invalid
              ? 'border-[#CE8FA5]'
              : 'border-[#E7DEE2] focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/15'
          }`}
        />
      ))}
    </div>
  );
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t, tr } = useLocale();

  const pending = getPendingVerify();
  const email = params.get('email') || pending?.email || '';
  const userId = Number(params.get('userId') || pending?.userId || 0);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [notice] = useState(location.state?.notice || '');

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const loading = verifyMutation.isPending;
  const resending = resendMutation.isPending;
  const validSession = Number.isInteger(userId) && userId > 0;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function handleResend() {
    const address = email.trim();
    if (!address || resending || cooldown > 0) return;
    setResendError('');
    setResendMessage('');
    resendMutation.mutate(address, {
      onSuccess: () => {
        setResendMessage('Đã gửi mã mới. Mã cũ không còn dùng được.');
        setCooldown(60);
      },
      onError: (err) => {
        const message = err?.message || 'Chưa gửi lại được mã.';
        setResendError(message);
        const wait = message.match(/(\d+)\s*giây/);
        if (wait) setCooldown(Number(wait[1]));
      },
    });
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

  return (
    <div className="h-full font-sans text-slate-800 antialiased selection:bg-sakura-100 selection:text-sakura-700" style={{ backgroundColor: 'rgb(250, 247, 242)', position: 'relative' }} data-page="VerifyEmail">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida/AEtjO1XsYWpcypAaiicJ5aWDsaW-GEmVWOKogAEQ7kZW4nxNFB_JZTuC9dhy22iD5Mnutw1-dtQ-HzB6D_VzjEx9subcYz6PRrv0yijHn4N-jAJ5MXOS4-C7ZVxGV4l2XoEkHfC4wG6mbXFoj3jaBxyOPj_Z_xylJmm-FRcPsVf-1klRUQuv1hr9HgKslqHQcIxclS9hAnXtwq8jA0ngfRmWAVTjaBx5hh644yXJMi3Bdy5g8E0mhB9PvzPKpXg")', backgroundRepeat: 'repeat', backgroundSize: '120px 120px' }} />
      <main className="relative z-10 flex min-h-screen w-full items-stretch justify-center p-0 md:p-6 lg:p-10">
        <div className="grid min-h-[780px] w-full max-w-[1440px] grid-cols-1 overflow-hidden rounded-3xl border border-sakura-100 bg-white shadow-2xl lg:grid-cols-12">
          <section className="relative hidden flex-col justify-between overflow-hidden bg-[#fdf2f4] p-10 lg:col-span-6 lg:flex xl:col-span-7 xl:p-14">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sakura-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sakura-300/40 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-sakura-200 bg-white/80 px-3.5 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="text-base leading-none">🌸</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-sakura-700">{t('badge')}</span>
              </div>
              <span className="hidden font-serif text-sm font-semibold tracking-widest text-sakura-600/70 xl:block">桜・日本への道</span>
            </div>
            <div className="relative z-10 my-auto flex flex-col items-center py-6">
              <div className="relative w-full max-w-[430px] rounded-2xl border border-sakura-200/80 bg-gradient-to-tr from-white/90 via-sakura-100/60 to-white/90 p-2 shadow-sakura-glow">
                <img alt="Hoa anh đào sakura nền pastel ấm, phong cách minh họa Nhật Bản" className="h-full w-full rounded-xl object-cover object-center shadow-inner" loading="lazy" src="/images/sakura-hero.jpg" />
                <div className="absolute -right-5 bottom-6 flex items-center gap-2 rounded-xl border border-sakura-200/90 bg-white/90 px-3 py-4 shadow-md backdrop-blur-md">
                  <span className="text-xl">⛩️</span>
                  <div className="text-left">
                    <p className="text-[11px] font-medium text-slate-500">{t('dailyStep')}</p>
                    <p className="font-serif text-xs font-bold tracking-wider text-sakura-700">一期一会 (Ichigo Ichie)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 mx-auto max-w-lg text-center">
              <h2 className="text-2xl font-bold leading-snug tracking-tight text-slate-800 xl:text-3xl">{t('loginHeadlineBefore')}<span className="font-extrabold text-sakura-500">RikiPath</span>{t('loginHeadlineAfter')}</h2>
              <p className="mt-2.5 text-sm font-normal leading-relaxed text-slate-600">{t('loginLead')}</p>
            </div>
          </section>

          <section className="col-span-1 flex flex-col justify-between overflow-y-auto bg-white p-8 sm:p-12 lg:col-span-6 lg:p-10 xl:col-span-5 xl:p-14">
            <div>
              <div className="flex items-center justify-between border-b border-sakura-100 pb-6">
                <Link aria-label="RikiPath Home" className="group flex items-center gap-2.5 focus:outline-none" to="/">
                  <BrandMark className="h-11 w-16" />
                  <div>
                    <span className="block text-xl font-bold leading-tight tracking-tight text-slate-900">RikiPath</span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-sakura-500">Sakura Learning Hub</span>
                  </div>
                </Link>
                <LanguageSwitch className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-sakura-50" />
              </div>

              <div className="mt-7 flex items-center rounded-xl border border-sakura-100 bg-sakura-50/70 p-1">
                <Link to="/auth" className="flex flex-1 items-center justify-center rounded-lg py-2.5 text-center text-sm font-semibold text-slate-500 transition-colors hover:text-sakura-600">{t('login')}</Link>
                <Link to="/register" className="flex flex-1 items-center justify-center rounded-lg py-2.5 text-center text-sm font-semibold text-slate-500 transition-colors hover:text-sakura-600">{t('register')}</Link>
              </div>

              <div className="mb-6 mt-6">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">{t('verifyEmail')} <span className="text-2xl">🌸</span></h1>
                <p className="mt-1 text-sm text-slate-500">{tr('Nhập mã 6 số đã gửi tới email. Mã có hiệu lực trong 30 phút.')}</p>
              </div>

              <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">{tr('Email nhận mã')}</p>
              {email ? (
                <p className="break-all text-sm font-medium text-slate-800">{email}</p>
              ) : (
                <p className="text-sm text-slate-500">
                  {tr('Chưa có email để xác thực.')}{' '}
                  <Link to="/register" className="font-semibold text-[#d94b68] hover:underline">{t('register')}</Link>
                </p>
              )}

              {notice ? (
                <p role="status" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{tr(notice)}</p>
              ) : null}

              <form className="mt-5 space-y-4" onSubmit={handleVerify} aria-busy={loading}>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600" id="verification-code-label">{tr('Mã xác thực')}</p>
                  <CodeBoxes value={code} onChange={(next) => { setCode(next); if (error) setError(''); }} disabled={loading} invalid={Boolean(error)} />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <p>{tr('Mã có hiệu lực trong 30 phút.')}</p>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={!email.trim() || resending || cooldown > 0}
                      className="shrink-0 font-semibold text-[#d94b68] hover:underline disabled:cursor-default disabled:text-slate-300 disabled:no-underline"
                    >
                      {resending
                        ? tr('Đang gửi mã…')
                        : cooldown > 0
                          ? `${tr('Gửi lại sau')} ${cooldown} ${tr('giây')}`
                          : tr('Gửi lại mã')}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p id="verification-error" role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{tr(error)}</p>
                ) : null}
                {resendMessage ? (
                  <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{tr(resendMessage)}</p>
                ) : null}
                {resendError ? (
                  <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{tr(resendError)}</p>
                ) : null}

                <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#d94b68] text-sm font-bold tracking-wide text-white transition-all hover:bg-sakura-600 focus:outline-none focus:ring-4 focus:ring-sakura-300/40 disabled:opacity-60" type="submit" disabled={loading}>
                  <span>{loading ? tr('Đang xác thực…') : t('verifyEmail')}</span>
                  <span className="text-base leading-none">🌸</span>
                </button>
              </form>
            </div>

            <footer className="mt-8 border-t border-[#F4EAEE] pt-5">
              <p className="mb-2 text-center text-[12px] text-[#8A7380]">{tr('Đã xác thực?')}</p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/auth" state={email ? { email } : undefined} className="flex h-10 items-center justify-center rounded-lg bg-[#FDF2F5] text-[12px] font-semibold text-[#C43E5C] hover:bg-[#FBE7EE]">
                  {t('login')}
                </Link>
                <Link to="/register" className="flex h-10 items-center justify-center rounded-lg border border-[#F0E4E8] text-[12px] font-semibold text-[#7A6570] hover:bg-[#FFF8FA]">
                  {tr('Đăng ký lại')}
                </Link>
              </div>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#B3A4AB]">
                <span className="whitespace-nowrap">{tr('Chưa thấy email?')}</span>{' '}
                <span className="whitespace-nowrap">{tr('Kiểm tra mục Spam / Thư rác.')}</span>
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
