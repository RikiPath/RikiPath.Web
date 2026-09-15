import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { savePendingVerify } from '../../auth/session.js';
import { useRegisterMutation } from '../../hooks/useAuth.js';

export default function Register() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const loading = registerMutation.isPending;

  function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
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
        goToVerify(result.email || registeredEmail);
      },
      onError: (err) => {
        const msg = err.message || 'Đăng ký thất bại.';
        if (msg.includes('Tạo tài khoản thành công')) {
          goToVerify(registeredEmail, msg);
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

  function goToVerify(registeredEmail, notice) {
    savePendingVerify({ email: registeredEmail });
    navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`, {
      state: notice ? { notice } : undefined,
    });
  }

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
<p className="text-[11px] font-medium text-slate-500">Mỗi ngày một bước tiến</p>
<p className="text-xs font-bold text-sakura-700 font-serif tracking-wider">一期一会 (Ichigo Ichie)</p>
</div>
</div>
</div>
</div>
{/*  Bottom Headline & Marketing Value Proposition  */}
<footer className="relative z-10 text-center lg:text-left mt-4">
{/*  Floating petal decorative accent  */}
<div className="w-2.5 h-2.5 bg-sakura-300 rotate-45 mb-4 mx-auto lg:mx-0 opacity-80"></div>
<h2 className="text-2xl xl:text-3xl font-extrabold text-charcoal-900 tracking-tight leading-snug">{"Cùng "}<span className="text-sakura-600">RikiPath</span>{" khởi đầu hành trình tiếng Nhật trong sắc hoa anh đào\n        "}</h2>
<p className="mt-3 text-sm text-charcoal-500 leading-relaxed max-w-lg mx-auto lg:mx-0">{"Lộ trình cá nhân hóa JLPT N5 — N1 chuẩn mực, trợ giảng AI 24/7 và cộng đồng du học sinh & người học năng động nhất.\n        "}</p>
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
<div className="w-11 h-11 rounded-xl bg-sakura-50 border border-sakura-200 flex items-center justify-center text-xl shadow-sm">{"🌸\n            "}</div>
<div>
<h1 className="text-xl font-extrabold text-charcoal-900 tracking-tight leading-none">RikiPath</h1>
<p className="text-[10px] tracking-widest font-bold text-sakura-600 mt-1 uppercase">Sakura Learning Hub</p>
</div>
</div>
{/*  Language Selector  */}
<div data-purpose="language-selector">
<button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-charcoal-200 bg-white text-xs font-semibold text-charcoal-700 hover:bg-sakura-50/50 hover:border-sakura-200 transition-colors" type="button">
<span className="">🇻🇳</span>
<span className="">VN</span>
<i className="ph ph-caret-down text-xs text-charcoal-400"></i>
</button>
</div>
</header>
{/*  Segmented Tab Switcher (Sign in / Sign up)  */}
<nav className="grid grid-cols-2 p-1 bg-charcoal-100/80 rounded-xl mb-7" data-purpose="auth-tabs">
{/*  Inactive Login Tab  */}
<Link to="/auth" className="py-2.5 text-center text-sm font-semibold text-charcoal-500 rounded-lg hover:text-sakura-600 transition-colors">Đăng nhập</Link>
{/*  Active Register Tab  */}
<a className="py-2.5 text-center text-sm font-bold text-sakura-700 bg-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 border border-sakura-100" href="#">
<span className="">Đăng ký</span>
<span className="w-1.5 h-1.5 rounded-full bg-sakura-600"></span>
</a>
</nav>
{/*  Form Title & Welcoming Introduction  */}
<div className="mb-6">
<div className="flex items-center gap-2">
<h2 className="text-2xl sm:text-[26px] font-extrabold text-charcoal-900 tracking-tight">Tạo tài khoản mới!</h2>
<span className="text-xl">🌸</span>
</div>
<p className="mt-1.5 text-sm text-charcoal-500">Gia nhập cộng đồng học tiếng Nhật thông minh cùng RikiPath.</p>
</div>
{/*  Registration Form Elements  */}
<form className="space-y-4" data-purpose="signup-form" onSubmit={handleRegister}>
{error ? (
  <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">
    <p>{error}</p>
    {error.toLowerCase().includes('đã được đăng ký') ? (
      <Link className="mt-1 inline-block font-bold text-sakura-600 underline" to={`/verify-email?email=${encodeURIComponent(email)}`}>Đi tới xác thực email</Link>
    ) : null}
  </div>
) : null}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="lastName">Họ</label>
<input className="w-full px-4 py-2.5 rounded-xl border border-charcoal-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-100 transition-all" id="lastName" name="lastName" placeholder="Nguyễn" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="firstName">Tên</label>
<input className="w-full px-4 py-2.5 rounded-xl border border-charcoal-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-100 transition-all" id="firstName" name="firstName" placeholder="An" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
</div>
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="email">{"Địa chỉ email\n            "}</label>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400 text-lg">
<i className="ph ph-envelope-simple"></i>
</div>
<input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-100 transition-all" id="email" name="email" placeholder="nhap.email@example.com" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="password">{"Mật khẩu\n              "}</label>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400 text-lg">
<i className="ph ph-lock"></i>
</div>
<input className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-charcoal-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-100 transition-all" id="password" name="password" placeholder="Tối thiểu 6 ký tự" required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
<button aria-label="Hiện mật khẩu" className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-700" type="button" onClick={() => setShowPassword((v) => !v)}>
<i className="ph ph-eye text-base"></i>
</button>
</div>
</div>
<div>
<label className="block text-[11px] font-bold tracking-wider text-charcoal-700 uppercase mb-1.5" htmlFor="confirm-password">{"Xác nhận mật khẩu\n              "}</label>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400 text-lg">
<i className="ph ph-shield-check"></i>
</div>
<input className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-charcoal-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-100 transition-all" id="confirm-password" name="confirmPassword" placeholder="Nhập lại mật khẩu" required minLength={6} type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
<button aria-label="Hiện xác nhận mật khẩu" className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal-400 hover:text-charcoal-700" type="button" onClick={() => setShowConfirm((v) => !v)}>
<i className="ph ph-eye text-base"></i>
</button>
</div>
</div>
</div>
{/*  Terms Agreement Checkbox  */}
<div className="flex items-start gap-2.5 pt-1">
<input className="mt-1 w-4 h-4 rounded border-charcoal-300 text-sakura-600 focus:ring-sakura-500 cursor-pointer" id="terms" name="terms" required type="checkbox" />
<label className="text-xs text-charcoal-600 leading-snug cursor-pointer select-none" htmlFor="terms">{"Tôi đồng ý với "}<a className="text-sakura-600 hover:underline font-semibold" href="#">Điều khoản dịch vụ</a>{" và "}<a className="text-sakura-600 hover:underline font-semibold" href="#">Chính sách bảo mật</a>{" của RikiPath.\n            "}</label>
</div>
{/*  Primary Submit CTA Button  */}
<button className="w-full py-3 px-6 mt-3 bg-sakura-600 hover:bg-sakura-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-sakura-btn hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-60" data-purpose="submit-button" type="submit" disabled={loading}>
<span className="">{loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản ngay'}</span>
<span className="text-base group-hover:rotate-12 transition-transform">🌸</span>
</button>
</form>
{/*  Social Separator Divider  */}
<div className="relative my-5 text-center">
<div aria-hidden="true" className="absolute inset-0 flex items-center">
<div className="w-full border-t border-charcoal-200"></div>
</div>
<span className="relative bg-white px-3 text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">{"Hoặc đăng ký với\n          "}</span>
</div>
{/*  Social Login Buttons  */}
<div className="grid grid-cols-2 gap-3" data-purpose="social-login-group">
{/*  Google Button  */}
<button className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-charcoal-200 text-xs sm:text-sm font-semibold text-charcoal-400 cursor-not-allowed" type="button" disabled title="API chưa hỗ trợ đăng ký Google">
{/*  Google SVG Icon  */}
<svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
<path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z" fill="#4285F4"></path>
<path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24Z" fill="#34A853"></path>
<path d="M5.28 14.27A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.97 11.97 0 0 0 0 12c0 1.92.46 3.74 1.25 5.42l4.03-3.15Z" fill="#FBBC05"></path>
<path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" fill="#EA4335"></path>
</svg>
<span className="">Google</span>
</button>
{/*  Facebook Button  */}
<button className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-charcoal-200 text-xs sm:text-sm font-semibold text-charcoal-400 cursor-not-allowed" type="button" disabled title="API chưa hỗ trợ đăng ký Facebook">
{/*  Facebook SVG Icon  */}
<svg className="w-4 h-4 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z"></path>
</svg>
<span className="">Facebook</span>
</button>
</div>
</div>
{/*  Bottom Footer Navigation Link  */}
<footer className="mt-8 pt-4 border-t border-charcoal-100 text-center text-xs text-charcoal-500">
<p className="">{"Đã có tài khoản?"}<Link to="/auth" className="font-bold text-sakura-600 hover:text-sakura-700 hover:underline ml-1">Đăng nhập ngay</Link>
</p>
<p className="mt-2">{"Đã nhận mã?"}<Link to="/verify-email" className="font-bold text-sakura-600 hover:text-sakura-700 hover:underline ml-1">Xác thực email</Link>
</p>
<p className="text-[11px] text-charcoal-400 mt-2">{"Bằng việc tiếp tục, bạn đồng ý nhận thông tin cập nhật học tập từ RikiPath.\n        "}</p>
</footer>
</section>
{/*  END: RightFormColumn  */}
</main>


{/*  END: MainAuthCard  */}


{/*  Interactive script for password visibility toggle & pill selection  */}





    </div>
  );
}
