import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { finishAuthSession } from '../../auth/finishAuthSession.js';
import { savePendingVerify } from '../../auth/session.js';
import BrandMark from '../../components/BrandMark.jsx';
import GoogleSignInButton from '../../components/GoogleSignInButton.jsx';
import { useRegisterMutation } from '../../hooks/useAuth.js';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import { useLocale } from '../../i18n/locale.js';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const registerMutation = useRegisterMutation();
  const { t } = useLocale();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const loading = registerMutation.isPending || googleLoading;

  async function handleGoogle(idToken) {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle({ idToken });
      const ok = finishAuthSession({ data, remember: true, login, navigate });
      if (!ok) setError(t('googleFailed'));
    } catch (err) {
      setError(err.message || t('googleFailed'));
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordShort'));
      return;
    }
    const payload = {
      email: email.trim(),
      password,
      confirmPassword,
    };
    if (firstName.trim()) payload.firstName = firstName.trim();
    if (lastName.trim()) payload.lastName = lastName.trim();
    const registeredEmail = email.trim();
    registerMutation.mutate(payload, {
      onSuccess: (data) => {
        const result = data.result || {};
        goToVerify(result.email || registeredEmail, result.userId);
      },
      onError: (err) => {
        const msg = err.message || t('registerFailed');
        if (msg.includes('Tạo tài khoản thành công')) {
          goToVerify(registeredEmail, resultUserIdFromError(err), msg);
          return;
        }
        if (msg.toLowerCase().includes('đã được đăng ký')) {
          setError(msg);
          return;
        }
        setError(msg);
      },
    });
  }

  function resultUserIdFromError(err) {
    const blob = `${err?.message || ''} ${JSON.stringify(err?.errors || err?.data || '')}`;
    const match = blob.match(/userId["']?\s*[:=]\s*(\d+)/i) || blob.match(/Id\s*=\s*(\d+)/);
    return match ? Number(match[1]) : undefined;
  }

  function goToVerify(registeredEmail, userId, notice) {
    savePendingVerify({ email: registeredEmail, userId: userId || undefined });
    navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`, {
      state: notice ? { notice } : undefined,
    });
  }

  const verifyHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : '/verify-email';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 text-charcoal-900 antialiased selection:bg-sakura-200 selection:text-sakura-800" style={{ backgroundColor: "rgb(250, 247, 242)", position: "relative" }} data-page="Register">
<div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: "url(\"https://lh3.googleusercontent.com/aida/AEtjO1XsYWpcypAaiicJ5aWDsaW-GEmVWOKogAEQ7kZW4nxNFB_JZTuC9dhy22iD5Mnutw1-dtQ-HzB6D_VzjEx9subcYz6PRrv0yijHn4N-jAJ5MXOS4-C7ZVxGV4l2XoEkHfC4wG6mbXFoj3jaBxyOPj_Z_xylJmm-FRcPsVf-1klRUQuv1hr9HgKslqHQcIxclS9hAnXtwq8jA0ngfRmWAVTjaBx5hh644yXJMi3Bdy5g8E0mhB9PvzPKpXg\")", backgroundRepeat: "repeat", backgroundSize: "120px 120px" }} aria-hidden="true"></div>


{/*  BEGIN: MainAuthCard  */}


<main className="w-full max-w-[1360px] bg-white rounded-3xl shadow-soft-card overflow-hidden border border-white/80 grid grid-cols-1 lg:grid-cols-12 min-h-[860px] relative z-10" data-purpose="registration-card-container">
{/*  ==============================================  */}
{/*  BEGIN: LeftShowcaseColumn (Sakura Visual Hero)  */}
{/*  ==============================================  */}
<section className="lg:col-span-5 xl:col-span-6 bg-gradient-to-br from-[#fff4f6] via-[#ffecee] to-[#fce4ea] p-8 md:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-sakura-100" data-purpose="visual-showcase">
{/*  Decorative Petal SVGs & Ambient Gradients  */}
<div className="absolute -top-16 -left-16 w-56 h-56 bg-sakura-200/40 rounded-full blur-3xl pointer-events-none"></div>
<div className="absolute bottom-10 -right-12 w-64 h-64 bg-sakura-300/30 rounded-full blur-3xl pointer-events-none"></div>
{/*  Top Badges & Japanese Slogan  */}
<header className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
{/*  Haru AI Assistant Pill  */}
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-sakura-200/80 shadow-sm" data-purpose="hero-badge">
<span className="text-base leading-none">🌸</span>
<span className="text-xs font-bold tracking-wider text-sakura-700 uppercase">BẮT ĐẦU HÀNH TRÌNH VỚI AI HARU</span>
</div>
{/*  Japanese Cultural Motto  */}
<div className="hidden sm:flex items-center gap-1.5 text-xs text-sakura-600 font-jp tracking-widest">
<span className="">桜</span>
<span className="text-[9px] text-sakura-400">●</span>
<span className="">日本への道</span>
</div>
</header>
{/*  Center Feature: Japanese Sakura Artwork Card  */}
<div className="relative z-10 my-auto py-6 flex flex-col items-center" data-purpose="illustration-wrapper">
<div className="relative group w-full max-w-[430px] aspect-square rounded-2xl p-2 bg-gradient-to-tr from-white/90 via-sakura-100/60 to-white/90 shadow-sakura-glow border border-sakura-200/80">
<img alt="Hoa anh đào sakura nền pastel ấm, phong cách minh họa Nhật Bản" className="w-full h-full object-cover object-center rounded-xl shadow-inner transition-transform duration-700 group-hover:scale-[1.01]" src="/images/sakura-hero.jpg" />
<div className="absolute -right-5 bottom-6 bg-white/90 backdrop-blur-md px-3 py-4 rounded-xl border border-sakura-200/90 shadow-md flex items-center gap-2" data-purpose="quote-callout">
<span className="text-xl">⛩️</span>
<div className="text-left">
<p className="text-[11px] font-medium text-slate-500">{t('dailyStep')}</p>
<p className="text-xs font-bold text-sakura-700 font-serif tracking-wider">一期一会 (Ichigo Ichie)</p>
</div>
</div>
</div>
</div>
{/*  Bottom Headline & Marketing Value Proposition  */}
<footer className="relative z-10 text-center lg:text-left mt-4">
{/*  Floating petal decorative accent  */}
<div className="w-2.5 h-2.5 bg-sakura-300 rotate-45 mb-4 mx-auto lg:mx-0 opacity-80"></div>
<h2 className="text-2xl xl:text-3xl font-extrabold text-charcoal-900 tracking-tight leading-snug">{t('registerHeadlineBefore')}<span className="text-sakura-600">RikiPath</span>{t('registerHeadlineAfter')}</h2>
<p className="mt-3 text-sm text-charcoal-500 leading-relaxed max-w-lg mx-auto lg:mx-0">{t('registerLead')}</p>
</footer>
</section>
{/*  END: LeftShowcaseColumn  */}
{/*  ==============================================  */}
{/*  BEGIN: RightFormColumn (Register Form)  */}
{/*  ==============================================  */}
<section className="lg:col-span-7 xl:col-span-6 p-7 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between bg-white overflow-y-auto" data-purpose="registration-form-panel">
<div>
{/*  Top App Bar: Brand Logo & Language Switcher  */}
<header className="flex items-center justify-between gap-4 pb-6">
{/*  Logo & Brand identity  */}
<div className="flex items-center gap-3" data-purpose="brand-logo">
<BrandMark className="h-12 w-[4.5rem]" />
<div>
<h1 className="text-xl font-extrabold text-charcoal-900 tracking-tight leading-none">RikiPath</h1>
<p className="text-[10px] tracking-widest font-bold text-sakura-600 mt-1 uppercase">Sakura Learning Hub</p>
</div>
</div>
{/*  Language Selector  */}
<LanguageSwitch className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-charcoal-200 bg-white text-xs font-semibold text-charcoal-700 hover:bg-sakura-50/50 hover:border-sakura-200 transition-colors" />
</header>
{/*  Segmented Tab Switcher (Sign in / Sign up)  */}
<nav className="grid grid-cols-2 p-1 bg-charcoal-100/80 rounded-xl mb-7" data-purpose="auth-tabs">
{/*  Inactive Login Tab  */}
<Link to="/auth" className="py-2.5 text-center text-sm font-semibold text-charcoal-500 rounded-lg hover:text-sakura-600 transition-colors">{t('login')}</Link>
{/*  Active Register Tab  */}
<a className="py-2.5 text-center text-sm font-bold text-sakura-700 bg-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 border border-sakura-100" href="#">
<span className="">{t('register')}</span>
<span className="w-1.5 h-1.5 rounded-full bg-sakura-600"></span>
</a>
</nav>
{/*  Form Title & Welcoming Introduction  */}
<div className="mb-6">
<div className="flex items-center gap-2">
<h2 className="text-2xl sm:text-[26px] font-extrabold text-charcoal-900 tracking-tight">{t('createTitle')}</h2>
<span className="text-xl" aria-hidden="true">🌸</span>
</div>
<p className="mt-1.5 text-sm text-charcoal-500">{t('join')}</p>
</div>
{/*  Registration Form Elements  */}
<form className="space-y-4" data-purpose="signup-form" onSubmit={handleRegister}>
{error ? (
  <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">
    <p>{error}</p>
    {error.toLowerCase().includes('đã được đăng ký') ? (
      <Link className="mt-1 inline-block font-bold text-sakura-600 underline" to={`/verify-email?email=${encodeURIComponent(email)}`}>{t('goVerify')}</Link>
    ) : null}
  </div>
) : null}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="lastName">{t('lastName')}</label>
<input className="h-11 w-full px-4 rounded-xl border border-[#f2dfe3] bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20" id="lastName" name="lastName" placeholder="Nguyễn" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="firstName">{t('firstName')}</label>
<input className="h-11 w-full px-4 rounded-xl border border-[#f2dfe3] bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20" id="firstName" name="firstName" placeholder="An" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
</div>
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="email">{t('emailShort')}</label>
<div className="relative">
<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
<input className="h-11 w-full rounded-xl border border-[#f2dfe3] bg-white pl-11 pr-4 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20" id="email" name="email" placeholder="nhap.email@example.com" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="password">{t('password')}</label>
<div className="relative">
<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
<path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
<input className="h-11 w-full rounded-xl border border-[#f2dfe3] bg-white pl-11 pr-11 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20" id="password" name="password" placeholder={t('passwordMin')} required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
<button aria-label={t('showPassword')} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-sakura-600" type="button" onClick={() => setShowPassword((v) => !v)}>
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</button>
</div>
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="confirm-password">{t('confirmPassword')}</label>
<div className="relative">
<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
<path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
<input className="h-11 w-full rounded-xl border border-[#f2dfe3] bg-white pl-11 pr-11 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20" id="confirm-password" name="confirmPassword" placeholder={t('confirmPlaceholder')} required minLength={6} type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
<button aria-label={t('showConfirm')} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-sakura-600" type="button" onClick={() => setShowConfirm((v) => !v)}>
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</button>
</div>
</div>
</div>
{/*  Terms Agreement Checkbox  */}
<div className="flex items-start gap-2.5 pt-1">
<input className="mt-1 w-4 h-4 rounded border-charcoal-300 text-sakura-600 focus:ring-sakura-500 cursor-pointer" id="terms" name="terms" required type="checkbox" />
<label className="cursor-pointer select-none text-xs leading-5 text-charcoal-600" htmlFor="terms">
<span className="whitespace-nowrap">{t('agreeTerms')}</span>{' '}
<span className="whitespace-nowrap font-semibold text-sakura-600">{t('serviceTerms')}</span>{' '}
<span className="whitespace-nowrap">{t('and')}</span>{' '}
<span className="whitespace-nowrap font-semibold text-sakura-600">{t('privacy')}</span>{' '}
<span className="whitespace-nowrap">{t('ofRiki')}</span>
</label>
</div>
{/*  Primary Submit CTA Button  */}
<button className="w-full py-3 px-6 mt-3 bg-sakura-600 hover:bg-sakura-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-sakura-btn hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-60" data-purpose="submit-button" type="submit" disabled={loading}>
<span className="">{loading ? t('creating') : t('registerNow')}</span>
<span className="text-base group-hover:rotate-12 transition-transform">🌸</span>
</button>
</form>
{/*  Social Separator Divider  */}
<div className="relative my-5 text-center">
<div aria-hidden="true" className="absolute inset-0 flex items-center">
<div className="w-full border-t border-charcoal-200"></div>
</div>
<span className="relative bg-white px-3 text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">{t('orRegister')}</span>
</div>
{/*  Social Login Buttons  */}
<GoogleSignInButton disabled={loading} onCredential={handleGoogle} onError={setError} />
</div>
{/*  Bottom Footer Navigation Link  */}
<footer className="mt-8 border-t border-[#F4EAEE] pt-5">
<p className="mb-2 text-center text-[12px] text-[#8A7380]">{t('hasAccount')}</p>
<div className="grid grid-cols-2 gap-2">
<Link to="/auth" className="flex h-10 items-center justify-center rounded-lg bg-[#FDF2F5] text-[12px] font-semibold text-[#C43E5C] hover:bg-[#FBE7EE]">
{t('loginNow')}
</Link>
<Link to={verifyHref} className="flex h-10 items-center justify-center rounded-lg border border-[#F0E4E8] text-[12px] font-semibold text-[#7A6570] hover:bg-[#FFF8FA]">
{t('verifyEmail')}
</Link>
</div>
<p className="mt-3 text-center text-[11px] leading-5 text-[#B3A4AB]">
<span className="whitespace-nowrap">{t('agreeContinue')}</span>{' '}
<span className="whitespace-nowrap">{t('terms')}</span>
{' · '}
<span className="whitespace-nowrap">{t('privacy')}</span>{' '}
<span className="whitespace-nowrap">{t('ofRiki')}</span>
</p>
</footer>
</section>
{/*  END: RightFormColumn  */}
</main>


{/*  END: MainAuthCard  */}


{/*  Interactive script for password visibility toggle & pill selection  */}





    </div>
  );
}
