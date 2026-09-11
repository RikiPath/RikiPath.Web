import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Auth() {
  const navigate = useNavigate();
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
      document.addEventListener('DOMContentLoaded', () => {
            const toggleBtn = document.getElementById('toggle-password');
            const passwordInput = document.getElementById('password');
      
            if (toggleBtn && passwordInput) {
              toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                toggleBtn.classList.toggle('text-sakura-600', isPassword);
              });
            }
          });
      document.addEventListener('DOMContentLoaded', () => {
            const loginBtn = document.getElementById('tab-login-btn');
            const registerBtn = document.getElementById('tab-register-btn');
      
            if (loginBtn && registerBtn) {
              registerBtn.addEventListener('click', () => {
                // Switch active visual to register tab
                registerBtn.className = "flex-1 py-2.5 text-sm font-bold text-sakura-700 bg-white rounded-lg shadow-sm border border-sakura-100/60 transition-all text-center flex items-center justify-center gap-1.5";
                registerBtn.innerHTML = `<span>Đăng ký</span><span className="w-1.5 h-1.5 rounded-full bg-sakura-500 inline-block"></span>`;
                
                loginBtn.className = "flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:text-sakura-600 rounded-lg transition-colors text-center";
                loginBtn.innerHTML = `<span>Đăng nhập</span>`;
              });
      
              loginBtn.addEventListener('click', () => {
                // Switch back to login active state
                loginBtn.className = "flex-1 py-2.5 text-sm font-bold text-sakura-700 bg-white rounded-lg shadow-sm border border-sakura-100/60 transition-all text-center flex items-center justify-center gap-1.5";
                loginBtn.innerHTML = `<span>Đăng nhập</span><span className="w-1.5 h-1.5 rounded-full bg-sakura-500 inline-block"></span>`;
                
                registerBtn.className = "flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:text-sakura-600 rounded-lg transition-colors text-center";
                registerBtn.innerHTML = `<span>Đăng ký</span>`;
              });
            }
          });
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <div className="h-full font-sans text-slate-800 antialiased selection:bg-sakura-100 selection:text-sakura-700" style={{ backgroundColor: "rgb(250, 247, 242)", position: "relative" }} data-page="Auth">
<div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: "url(\"https://lh3.googleusercontent.com/aida/AEtjO1XsYWpcypAaiicJ5aWDsaW-GEmVWOKogAEQ7kZW4nxNFB_JZTuC9dhy22iD5Mnutw1-dtQ-HzB6D_VzjEx9subcYz6PRrv0yijHn4N-jAJ5MXOS4-C7ZVxGV4l2XoEkHfC4wG6mbXFoj3jaBxyOPj_Z_xylJmm-FRcPsVf-1klRUQuv1hr9HgKslqHQcIxclS9hAnXtwq8jA0ngfRmWAVTjaBx5hh644yXJMi3Bdy5g8E0mhB9PvzPKpXg\")", backgroundRepeat: "repeat", backgroundSize: "120px 120px" }}></div>


{/*  BEGIN: MainContainer  */}


<main className="min-h-screen w-full flex items-stretch justify-center p-0 md:p-6 lg:p-10 relative z-10">
<div className="w-full max-w-[1440px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-sakura-100 grid grid-cols-1 lg:grid-cols-12 min-h-[780px]" data-purpose="auth-split-wrapper">
{/*  BEGIN: LeftBrandingShowcase  */}
<section className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#fdf2f4] relative flex-col justify-between p-10 xl:p-14 overflow-hidden" data-purpose="brand-visual-showcase">
{/*  Soft decorative background gradients and sakura accents  */}
<div className="absolute -top-24 -left-24 w-80 h-80 bg-sakura-200/50 rounded-full blur-3xl pointer-events-none"></div>
<div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sakura-300/40 rounded-full blur-3xl pointer-events-none"></div>
{/*  Floating Petal SVG Decors  */}
<div className="absolute top-12 right-16 opacity-70 petal-floating pointer-events-none" style={{ animationDelay: "0s" }}>
<svg className="w-7 h-7 text-sakura-400 fill-current" viewBox="0 0 24 24">
<path d="M12 2C13.5 6 18 8 20 12C18 16 13.5 18 12 22C10.5 18 6 16 4 12C6 8 10.5 6 12 2Z"></path>
</svg>
</div>
<div className="absolute bottom-28 left-14 opacity-50 petal-floating pointer-events-none" style={{ animationDelay: "2.5s" }}>
<svg className="w-5 h-5 text-sakura-300 fill-current" viewBox="0 0 24 24">
<path d="M12 2C13.5 6 18 8 20 12C18 16 13.5 18 12 22C10.5 18 6 16 4 12C6 8 10.5 6 12 2Z"></path>
</svg>
</div>
{/*  Showcase Header / Mini Badge  */}
<div className="relative z-10 flex items-center justify-between">
<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-sakura-200 shadow-sm">
<span className="text-base leading-none">🌸</span>
<span className="text-xs font-semibold tracking-wide text-sakura-700 uppercase">Học tiếng Nhật thông minh với AI Haru</span>
</div>
{/*  Kanji artistic tag  */}
<span className="font-serif text-sm font-semibold text-sakura-600/70 tracking-widest hidden xl:block">桜・日本への道</span>
</div>
{/*  Artwork Centerpiece Card  */}
<div className="relative z-10 my-auto py-6 flex flex-col items-center">
<div className="relative group w-full max-w-[430px] aspect-square rounded-2xl p-2 bg-gradient-to-tr from-white/90 via-sakura-100/60 to-white/90 shadow-sakura-glow border border-sakura-200/80">
{/*  Provided Sakura Illustration Image  */}
<img alt="Japanese style sakura cherry blossom, beautiful delicate pink sakura petals with warm soft pastel background, aesthetic Japanese art, high quality illustration for educational learning app" className="w-full h-full object-cover rounded-xl shadow-inner transition-transform duration-700 group-hover:scale-[1.01]" loading="lazy" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWYbEhEoo5ezk9RfsOL90bHH9ptoneNYSVhIXsry9dpOuv9DwfIfTnece2u9Sw2TeSdVMuyq7EXP9wvFr1DRX-rdTzy_VNAMomsnw2PNmv8zVAwiupwNpSF9TSDj-haM0v7eswhkQoGfNt34_f_K4-cSLPa_AZ6W94Xai46Z6LdGPsDX2rnaxC9iMC87EPsgs2UKn2h5ixOTRE6s6mgFtlvLN6dFkUbwCk2rNeNjHfRQegbSWVqcF7" />
{/*  Subtle Floating Japanese Calligraphy Overlay  */}
<div className="absolute -right-5 bottom-6 bg-white/90 backdrop-blur-md px-3 py-4 rounded-xl border border-sakura-200/90 shadow-md flex items-center gap-2" data-purpose="quote-callout">
<span className="text-xl">⛩️</span>
<div className="text-left">
<p className="text-[11px] font-medium text-slate-500">Mỗi ngày một bước tiến</p>
<p className="text-xs font-bold text-sakura-700 font-serif tracking-wider">一期一会 (Ichigo Ichie)</p>
</div>
</div>
</div>
</div>
{/*  Showcase Footer: Inspiring Slogan & Quote  */}
<div className="relative z-10 text-center max-w-lg mx-auto" data-purpose="slogan-container">
<h2 className="text-2xl xl:text-3xl font-bold text-slate-800 tracking-tight leading-snug">{"Cùng "}<span className="text-sakura-500 font-extrabold">RikiPath</span>{" chinh phục tiếng Nhật trong sắc hoa anh đào\n          "}</h2>
<p className="mt-2.5 text-sm text-slate-600 font-normal leading-relaxed">{"Hành trình chạm đỉnh JLPT N5 — N1 với lộ trình chuẩn mực, hỗ trợ gia sư AI 24/7 và cộng đồng du học sinh năng động.\n          "}</p>
</div>
</section>
{/*  END: LeftBrandingShowcase  */}
{/*  BEGIN: RightAuthFormSection  */}
<section className="col-span-1 lg:col-span-6 xl:col-span-5 bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-10 xl:p-14 overflow-y-auto" data-purpose="auth-form-container">
<div>
{/*  Brand Logo Header  */}
<div className="flex items-center justify-between pb-6 border-b border-sakura-100" data-purpose="brand-header">
<a aria-label="RikiPath Home" className="flex items-center gap-2.5 group focus:outline-none" href="#">
<div className="w-10 h-10 rounded-xl bg-sakura-50 border border-sakura-200 flex items-center justify-center text-xl shadow-xs group-hover:bg-sakura-100 transition-colors">{"🌸\n              "}</div>
<div>
<span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">RikiPath</span>
<span className="text-[11px] font-medium tracking-wide text-sakura-500 uppercase">Sakura Learning Hub</span>
</div>
</a>
{/*  Language selector button  */}
<button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-sakura-50 rounded-lg border border-slate-200/80 transition-colors" type="button">
<span className="">🇻🇳 VN</span>
<svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
</button>
</div>
{/*  Tab Switcher (Login / Register)  */}
<div className="mt-7 p-1 bg-sakura-50/70 border border-sakura-100 rounded-xl flex items-center" data-purpose="auth-tabs">
<button aria-current="page" className="flex-1 py-2.5 text-sm font-bold text-sakura-700 bg-white rounded-lg shadow-sm border border-sakura-100/60 transition-all text-center flex items-center justify-center gap-1.5" id="tab-login-btn" type="button">
<span className="">Đăng nhập</span>
<span className="w-1.5 h-1.5 rounded-full bg-sakura-500 inline-block"></span>
</button>
<Link to="/register" className="flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:text-sakura-600 rounded-lg transition-colors text-center flex items-center justify-center" id="tab-register-btn">Đăng ký</Link>
</div>
{/*  Welcome Titles  */}
<div className="mt-6 mb-6">
<h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">{"Chào mừng bạn trở lại! "}<span className="text-2xl animate-pulse">🌸</span>
</h1>
<p className="mt-1 text-sm text-slate-500">{"Vui lòng nhập thông tin tài khoản để tiếp tục học tập.\n            "}</p>
</div>
{/*  Authentication Form  */}
<form action="#" className="space-y-4" data-purpose="login-form" method="POST" onSubmit={(e) => { e.preventDefault(); navigate('/app'); }}>
{/*  Email Input Field  */}
<div>
<label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="email">{"Địa chỉ Email\n              "}</label>
<div className="relative rounded-xl shadow-xs">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
{/*  Mail Icon  */}
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
<input className="block w-full pl-11 pr-4 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20 transition-all duration-200" id="email" name="email" placeholder="nhap.email@example.com" required type="email" />
</div>
</div>
{/*  Password Input Field  */}
<div>
<div className="flex items-center justify-between mb-1.5">
<label className="block text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor="password">{"Mật khẩu\n                "}</label>
</div>
<div className="relative rounded-xl shadow-xs">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
{/*  Lock Icon  */}
<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
<input className="block w-full pl-11 pr-11 py-3 bg-white border border-[#f2dfe3] rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-sakura-500 focus:ring-2 focus:ring-sakura-500/20 transition-all duration-200" id="password" name="password" placeholder="Nhập mật khẩu bí mật" required type="password" />
{/*  Toggle Password Visibility  */}
<button aria-label="Hiện hoặc ẩn mật khẩu" className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-sakura-600 focus:outline-none transition-colors" id="toggle-password" type="button">
<svg className="h-5 w-5" fill="none" id="eye-icon" stroke="currentColor" viewBox="0 0 24 24">
<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</button>
</div>
</div>
{/*  Remember me & Forgot Password  */}
<div className="flex items-center justify-between pt-1">
<label className="flex items-center gap-2 cursor-pointer select-none">
<input className="w-4 h-4 text-sakura-500 border-sakura-300 rounded focus:ring-sakura-500 focus:ring-offset-0 transition-colors" id="remember-me" name="remember" type="checkbox" />
<span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
</label>
<Link className="text-xs font-semibold text-[#d94b68] hover:text-sakura-700 hover:underline transition-colors" to="/forgot-password">Quên mật khẩu?</Link>
</div>
{/*  CTA Submit Button  */}
<div className="pt-2">
<button className="w-full h-12 flex items-center justify-center gap-2 bg-[#d94b68] hover:bg-sakura-600 text-white font-bold text-sm tracking-wide rounded-[10px] shadow-sakura-soft hover:shadow-lg transition-all duration-200 transform active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-sakura-300/40" type="submit">
<span className="">Đăng nhập ngay</span>
<span className="text-base leading-none">🌸</span>
</button>
</div>
</form>
{/*  Divider  */}
<div className="relative my-6 text-center" data-purpose="divider">
<div className="absolute inset-0 flex items-center">
<div className="w-full border-t border-slate-200/80"></div>
</div>
<div className="relative flex justify-center text-xs">
<span className="px-3 bg-white text-slate-400 uppercase font-medium tracking-wider">hoặc tiếp tục với</span>
</div>
</div>
{/*  Social Login Buttons  */}
<div className="grid grid-cols-2 gap-3" data-purpose="social-auth-buttons">
{/*  Google Login Button  */}
<button className="h-11 flex items-center justify-center gap-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 shadow-xs transition-colors focus:outline-none" type="button">
<svg className="w-4 h-4" viewBox="0 0 24 24">
<path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z" fill="#4285F4"></path>
<path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" fill="#34A853"></path>
<path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27 0-.78.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12c0 2.01.45 3.82 1.25 5.42l4.03-3.15Z" fill="#FBBC05"></path>
<path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" fill="#EA4335"></path>
</svg>
<span className="">Google</span>
</button>
{/*  Facebook / Apple Login Button  */}
<button className="h-11 flex items-center justify-center gap-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 shadow-xs transition-colors focus:outline-none" type="button">
{/*  Facebook Icon  */}
<svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24">
<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
</svg>
<span className="">Facebook</span>
</button>
</div>
</div>
{/*  Footer Notice & Registration Prompt  */}
<footer className="mt-8 pt-6 border-t border-slate-100 text-center" data-purpose="auth-footer">
<p className="text-xs text-slate-600">{"Chưa có tài khoản?"}<Link className="font-bold text-[#d94b68] hover:text-sakura-700 hover:underline" to="/register">Đăng ký miễn phí</Link>
</p>
<p className="mt-2 text-[11px] text-slate-400">{"Bằng việc tiếp tục, bạn đồng ý với"}<a className="underline hover:text-slate-600" href="#">Điều khoản sử dụng</a>{" &"}<a className="underline hover:text-slate-600" href="#">Chính sách bảo mật</a>{" của RikiPath.\n          "}</p>
</footer>
</section>
{/*  END: RightAuthFormSection  */}
</div>
</main>


{/*  END: MainContainer  */}


{/*  BEGIN: InteractiveScripts  */}








{/*  END: InteractiveScripts  */}


    </div>
  );
}
