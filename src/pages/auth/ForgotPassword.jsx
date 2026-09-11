import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
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
      function showStep(stepNumber) {
            document.querySelectorAll('.step-container').forEach(el => {
              el.classList.remove('active');
            });
            const target = document.getElementById(`step-${stepNumber}`);
            if (target) {
              target.classList.add('active');
            }
          }
      
          function togglePassword(inputId, triggerBtn) {
            const input = document.getElementById(inputId);
            const icon = triggerBtn.querySelector('.material-symbols-outlined') || triggerBtn;
            if (input.type === 'password') {
              input.type = 'text';
              icon.textContent = 'visibility';
            } else {
              input.type = 'password';
              icon.textContent = 'visibility_off';
            }
          }
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  return (
    <div className="bg-[#FAF7F2] text-[#1F1A1D] min-h-screen flex flex-col relative overflow-x-hidden selection:bg-pink-200 selection:text-[#ab2848]" data-page="ForgotPassword">


{/*  Ambient Decorative Background Glows & Petal Elements  */}


<div className="fixed inset-0 pointer-events-none z-0">
<div className="absolute -top-36 -right-36 w-96 h-96 bg-gradient-to-br from-[#ffd9dd]/60 to-[#fec1d6]/20 rounded-full blur-3xl"></div>
<div className="absolute top-1/2 -left-32 w-80 h-80 bg-gradient-to-tr from-[#ffd9e4]/50 to-transparent rounded-full blur-3xl"></div>
<div className="absolute -bottom-24 right-1/4 w-[28rem] h-[28rem] bg-[#fde8ec]/60 rounded-full blur-3xl"></div>
{/*  Floating Petal SVG Accents  */}
<div className="absolute top-20 left-[10%] opacity-40 petal-float">
<svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C8.5 7 6 12 12 22C18 12 15.5 7 12 2Z" fill="#F2B6CB" transform="rotate(-25 12 12)"></path>
</svg>
</div>
<div className="absolute bottom-28 right-[12%] opacity-35 petal-float" style={{ animationDelay: "-3s" }}>
<svg fill="none" height="28" viewBox="0 0 24 24" width="28" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C8.5 7 6 12 12 22C18 12 15.5 7 12 2Z" fill="#E892A8" transform="rotate(35 12 12)"></path>
</svg>
</div>
</div>


{/*  Subtle Top Navigation / Authentic Shell Header  */}


<header className="w-full relative z-20 border-b border-[#dfbfc1]/40 bg-white/70 backdrop-blur-md px-6 lg:px-12 py-3.5 flex items-center justify-between">
<Link className="flex items-center gap-2.5 group" to="/">
<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ab2848] to-[#cd425f] flex items-center justify-center text-white shadow-sm shadow-[#ab2848]/25 group-hover:scale-105 transition-transform duration-200">
<span className="material-symbols-outlined text-[20px]">local_florist</span>
</div>
<div>
<div className="flex items-center gap-1.5 leading-none">
<span className="font-bold text-lg text-[#ab2848] tracking-tight">RikiPath</span>
<span className="text-[10px] font-semibold text-[#805062] bg-[#ffd9dd] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Sakura</span>
</div>
<p className="text-[10px] tracking-widest text-[#8b7073] uppercase mt-0.5 font-medium">Sakura Learning Hub</p>
</div>
</Link>
<nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#584143]">
<Link className="hover:text-[#ab2848] transition-colors flex items-center gap-1.5" to="/">
<span className="material-symbols-outlined text-[17px]">home</span>
<span>Trang chủ</span>
</Link>
<Link className="hover:text-[#ab2848] transition-colors flex items-center gap-1.5" to="/courses">
<span className="material-symbols-outlined text-[17px]">menu_book</span>
<span>Khóa học</span>
</Link>
<a className="hover:text-[#ab2848] transition-colors flex items-center gap-1.5" href="#">
<span className="material-symbols-outlined text-[17px]">help_outline</span>
<span>Trợ giúp học viên</span>
</a>
</nav>
<div className="flex items-center gap-3">
<span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#805062] bg-[#f5ebef] px-2.5 py-1 rounded-full font-medium">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{"Hỗ trợ 24/7\n      "}</span>
<Link className="text-xs font-semibold text-[#ab2848] hover:text-[#8e0d34] px-3 py-1.5 rounded-full hover:bg-pink-50 transition-colors border border-[#dfbfc1]/60 flex items-center gap-1" to="/auth">
<span className="material-symbols-outlined text-[15px]">arrow_back</span>{"Đăng nhập\n      "}</Link>
</div>
</header>


{/*  Main Recovery Container  */}


<main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10">
<div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-pink-950/5 border border-[#dfbfc1]/50 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
{/*  Left Artistic Visual Area (Col: 5)  */}
<aside className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-[#FFF7F9] via-[#FAF1F3] to-[#FCE4EC] border-r border-[#dfbfc1]/40 overflow-hidden">
{/*  Sakura Blossom Image Motif  */}
<div className="absolute inset-0 z-0">
<img alt="Sakura Blossom Art" className="w-full h-full object-cover object-center mix-blend-multiply opacity-80 filter contrast-105" src="https://lh3.googleusercontent.com/aida/AEtjO1WNQbKlEcHaEbnIugJracoZGASfEVtxILyV6z0Y_wrXO6Ms5cvx1Ht8rQsFNIOJgvFvQFuXpJSVfRfLxStxHkxpTpnGVjrXxe3toC5u3BS0VLjj4mOVuWjQVhC_S_8LE54VhsnhJLWphh_mL78n2fBmj6wgnL3MOr560Xk-a1XRrXtkZnkSE4WXqUJHq3TJVuOQRtEcYTYxkrqmJTq2y2NW8A2OLSmp8yjI-NkOow26HlYdGO2i24zR6-k" />
<div className="absolute inset-0 bg-gradient-to-t from-[#2D1B22]/90 via-[#2D1B22]/40 to-transparent"></div>
</div>
{/*  Top Left Watermark & Badge  */}
<div className="relative z-10">
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/60 shadow-sm text-xs font-semibold text-[#ab2848]">
<span className="material-symbols-outlined text-[15px]">lock_reset</span>
<span>Khôi phục bảo mật</span>
</div>
<div className="mt-4">
<span className="japanese-font text-white/40 text-4xl block font-semibold tracking-widest leading-none select-none">パスワード再設定</span>
<span className="text-[11px] text-pink-200 tracking-wider font-medium uppercase mt-1 block">An tâm đồng hành cùng RikiPath</span>
</div>
</div>
{/*  Bottom Quote & Assurance  */}
<div className="relative z-10 text-white mt-auto pt-12">
<div className="w-8 h-1 bg-[#f2b6cb] rounded-full mb-3.5"></div>
<blockquote className="text-[15px] leading-relaxed font-medium text-pink-50 italic">{"“Bước tiếp trên con đường chinh phục tiếng Nhật cùng RikiPath. Mọi hành trình vĩ đại đều bắt đầu từ sự kiên trì mỗi ngày.”\n          "}</blockquote>
<div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-pink-100">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-emerald-400">verified_user</span>
<span>Bảo mật chuẩn SSL 256-bit</span>
</div>
<span className="japanese-font opacity-80">桜の道</span>
</div>
</div>
</aside>
{/*  Right Form & Interaction Area (Col: 7)  */}
<section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
{/*  Step 1: Request Email State  */}
<div className="step-container active" id="step-1">
{/*  Step Header  */}
<div className="mb-6">
<div className="flex items-center justify-between mb-4">
<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#805062] bg-[#fbf1f5] border border-[#dfbfc1]/60 px-3 py-1 rounded-full">
<span className="w-1.5 h-1.5 rounded-full bg-[#ab2848] animate-ping"></span>
<span>Bước 1 / 2: Xác nhận tài khoản</span>
</div>
<span className="japanese-font text-xs text-[#8b7073] hidden sm:inline">アカウント確認</span>
</div>
<h1 className="text-2xl sm:text-3xl font-bold text-[#1f1a1d] tracking-tight flex items-center gap-2">{"Khôi phục mật khẩu\n              "}<span className="material-symbols-outlined text-[#ab2848] text-2xl">key</span>
</h1>
<p className="text-sm text-[#584143] leading-relaxed mt-2.5">{"Đừng lo lắng! Nhập địa chỉ email đã đăng ký của bạn. RikiPath sẽ gửi liên kết xác thực an toàn kèm hướng dẫn tạo mật khẩu mới trong tích tắc.\n            "}</p>
</div>
{/*  Recovery Method Selector Tabs  */}
<div className="flex rounded-xl bg-[#f5ebef] p-1 mb-6 border border-[#dfbfc1]/40">
<button className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white text-[#ab2848] shadow-sm flex items-center justify-center gap-1.5 transition-all" type="button">
<span className="material-symbols-outlined text-[16px]">mail</span>{"Qua Email\n            "}</button>
<button className="flex-1 py-1.5 rounded-lg text-xs font-medium text-[#805062] hover:text-[#1f1a1d] flex items-center justify-center gap-1.5 transition-colors" onClick={(e) => { alert('Tính năng khôi phục qua SMS đang bảo trì. Vui lòng sử dụng Email để nhận liên kết ngay lập tức.') }} type="button">
<span className="material-symbols-outlined text-[16px]">sms</span>{"Qua SMS số điện thoại\n            "}</button>
</div>
{/*  Form  */}
<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); showStep(2); }}>
<div>
<label className="block text-xs font-semibold text-[#1f1a1d] mb-1.5" htmlFor="recovery-email">{"Email đăng ký "}<span className="text-[#ba1a1a]">*</span>
</label>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8b7073]">
<span className="material-symbols-outlined text-[19px]">mail_outline</span>
</div>
<input className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-[#dfbfc1] rounded-xl text-sm text-[#1f1a1d] bg-[#fff7f9]/50 placeholder:text-[#8b7073]/60 focus:bg-white focus:outline-none focus:border-[#ab2848] focus:ring-2 focus:ring-[#ab2848]/25 transition duration-150" id="recovery-email" placeholder="vidu@rikipath.edu.vn" required type="email" value="nguyen.an@rikipath.edu.vn" />
</div>
<div className="flex items-center justify-between mt-1.5 text-[11px] text-[#805062]">
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-[13px] text-emerald-600">schedule</span>{"Liên kết có hiệu lực trong 15 phút\n                "}</span>
<span className="text-[#8b7073]">Bảo mật cá nhân</span>
</div>
</div>
{/*  Submit Button  */}
<button className="w-full mt-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#ab2848] via-[#cd425f] to-[#ab2848] hover:from-[#8e0d34] hover:to-[#ab2848] text-white font-semibold text-sm shadow-md shadow-[#ab2848]/25 hover:shadow-lg hover:shadow-[#ab2848]/35 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer" type="submit">
<span>Gửi liên kết đặt lại mật khẩu</span>
<span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">send</span>
</button>
</form>
{/*  Return to Login & Direct Assistance  */}
<div className="mt-6 pt-5 border-t border-[#dfbfc1]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
<Link to="/auth" className="text-[#ab2848] hover:text-[#8e0d34] font-semibold flex items-center gap-1 hover:underline">
<span className="material-symbols-outlined text-[16px]">arrow_back</span>
<span>Quay lại trang Đăng nhập</span>
</Link>
<span className="text-[#805062]">
Cần trợ giúp?{' '}
<a className="text-[#ab2848] font-medium hover:underline" href="#">Hướng dẫn lấy lại mật khẩu</a>
</span>
</div>
</div>
{/*  Step 2: Email Dispatched State  */}
<div className="step-container text-center py-4" id="step-2">
<div className="w-16 h-16 bg-[#fde8ec] border border-[#dfbfc1] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#ab2848] shadow-sm">
<span className="material-symbols-outlined text-[34px]">mark_email_read</span>
</div>
<span className="japanese-font text-xs text-[#805062] block mb-1">送信完了</span>
<h2 className="text-2xl font-bold text-[#1f1a1d] mb-2">Đã gửi email khôi phục!</h2>
<p className="text-sm text-[#584143] max-w-md mx-auto leading-relaxed mb-6">{"Chúng tôi đã gửi một thư bảo mật chứa liên kết đặt lại mật khẩu tới hộp thư "}<span className="font-semibold text-[#1f1a1d] bg-[#f5ebef] px-1.5 py-0.5 rounded">nguyen.an@rikipath.edu.vn</span>{". Vui lòng kiểm tra hộp thư đến hoặc mục thư rác (Spam).\n          "}</p>
<div className="space-y-3 max-w-sm mx-auto">
<button className="w-full py-2.5 px-4 bg-gradient-to-r from-[#ab2848] to-[#cd425f] text-white rounded-xl text-sm font-semibold hover:shadow-md hover:shadow-pink-900/20 transition-all flex items-center justify-center gap-2" onClick={(e) => { showStep(3) }} type="button">
<span>Mô phỏng: Mở liên kết từ Email</span>
<span className="material-symbols-outlined text-[18px]">open_in_new</span>
</button>
<div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#dfbfc1]/50 text-xs text-[#805062]">{"Chưa nhận được email?"}<button className="text-[#ab2848] font-bold hover:underline ml-1" onClick={(e) => { alert('Đã gửi lại email xác thực thành công!') }} type="button">{"Gửi lại sau (59s)\n              "}</button>
</div>
<button className="text-xs text-[#8b7073] hover:text-[#1f1a1d] underline pt-2 inline-block" onClick={(e) => { showStep(1) }} type="button">{"← Sử dụng địa chỉ email khác\n            "}</button>
</div>
</div>
{/*  Step 3: Enter New Password Form  */}
<div className="step-container" id="step-3">
<div className="mb-5">
<div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#366800] bg-[#eef7e9] border border-[#d6ebd0] px-3 py-1 rounded-full mb-3">
<span className="material-symbols-outlined text-[14px]">verified</span>
<span>Xác thực an toàn thành công</span>
</div>
<h2 className="text-2xl font-bold text-[#1f1a1d]">Tạo mật khẩu mới</h2>
<p className="text-xs text-[#584143] mt-1 leading-relaxed">{"Mật khẩu mới của bạn cần tối thiểu 8 ký tự, bao gồm ít nhất một chữ hoa, một số và một ký tự đặc biệt.\n            "}</p>
</div>
<form className="space-y-3.5" onSubmit={(e) => { e.preventDefault(); showStep(4); }}>
<div>
<label className="block text-xs font-semibold text-[#1f1a1d] mb-1" htmlFor="new-pw">Mật khẩu mới</label>
<div className="relative">
<input className="w-full pl-3.5 pr-10 py-2.5 border border-[#dfbfc1] rounded-xl text-sm text-[#1f1a1d] focus:border-[#ab2848] focus:ring-2 focus:ring-[#ab2848]/20 focus:outline-none" id="new-pw" placeholder="Nhập mật khẩu mới" required type="password" />
<button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7073] hover:text-[#ab2848]" onClick={(e) => { togglePassword('new-pw', e.currentTarget) }} type="button">
<span className="material-symbols-outlined text-[18px]">visibility_off</span>
</button>
</div>
</div>
<div>
<label className="block text-xs font-semibold text-[#1f1a1d] mb-1" htmlFor="confirm-pw">Xác nhận mật khẩu mới</label>
<div className="relative">
<input className="w-full pl-3.5 pr-10 py-2.5 border border-[#dfbfc1] rounded-xl text-sm text-[#1f1a1d] focus:border-[#ab2848] focus:ring-2 focus:ring-[#ab2848]/20 focus:outline-none" id="confirm-pw" placeholder="Nhập lại mật khẩu mới" required type="password" />
<button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7073] hover:text-[#ab2848]" onClick={(e) => { togglePassword('confirm-pw', e.currentTarget) }} type="button">
<span className="material-symbols-outlined text-[18px]">visibility_off</span>
</button>
</div>
</div>
<div className="p-3 bg-[#fbf1f5] rounded-xl border border-[#dfbfc1]/40 text-[11px] text-[#584143] space-y-1">
<div className="flex items-center gap-1.5 text-[#366800]">
<span className="material-symbols-outlined text-[13px]">check_circle</span>{"Tối thiểu 8 ký tự\n              "}</div>
<div className="flex items-center gap-1.5 text-[#805062]">
<span className="material-symbols-outlined text-[13px]">radio_button_unchecked</span>{"Chứa chữ hoa và số\n              "}</div>
</div>
<button className="w-full py-3 bg-gradient-to-r from-[#ab2848] to-[#cd425f] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2" type="submit">
<span>{"Lưu mật khẩu & Đăng nhập"}</span>
<span className="material-symbols-outlined text-[18px]">lock_open</span>
</button>
</form>
</div>
{/*  Step 4: Success State  */}
<div className="step-container text-center py-6" id="step-4">
<div className="w-16 h-16 bg-[#eef7e9] border border-[#b7f481] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#366800] shadow-sm">
<span className="material-symbols-outlined text-[36px]">check_circle</span>
</div>
<span className="japanese-font text-xs text-[#366800] font-semibold block mb-1">設定完了</span>
<h2 className="text-2xl font-bold text-[#1f1a1d] mb-2">Đổi mật khẩu thành công!</h2>
<p className="text-sm text-[#584143] max-w-sm mx-auto leading-relaxed mb-6">{"Mật khẩu tài khoản RikiPath của bạn đã được cập nhật thành công. Bây giờ bạn có thể tiếp tục hành trình học tập.\n          "}</p>
<Link to="/auth" className="py-3 px-8 bg-gradient-to-r from-[#ab2848] to-[#cd425f] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2">
<span>Đăng nhập ngay</span>
<span className="material-symbols-outlined text-[18px]">login</span>
</Link>
</div>
{/*  Footer / Support Guarantee Contact  */}
<div className="mt-8 pt-4 border-t border-[#dfbfc1]/40 bg-[#fff7f9]/60 -mx-6 sm:-mx-10 lg:-mx-12 -mb-6 sm:-mb-10 lg:-mb-12 p-4 sm:px-8 text-center text-xs text-[#805062]">
<p className="leading-relaxed">{"Gặp khó khăn khi nhận mã? Liên hệ bộ phận Chăm sóc học viên:"}<span className="font-bold text-[#ab2848]">Hotline 1900 6868</span>{" hoặc"}<a className="text-[#ab2848] font-semibold hover:underline" href="mailto:support@rikipath.edu.vn">support@rikipath.edu.vn</a>
</p>
</div>
</section>
</div>
</main>


{/*  Minimal Zen Bottom Footer  */}


<footer className="relative z-20 py-4 px-6 text-center text-xs text-[#8b7073] border-t border-[#dfbfc1]/30 bg-white/40">
<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
<span>© 2025 RikiPath Sakura Learning Hub. Toàn bộ quyền được bảo lưu.</span>
<span className="hidden sm:inline text-pink-300">•</span>
<a className="hover:text-[#ab2848] transition-colors" href="#">Điều khoản dịch vụ</a>
<span className="hidden sm:inline text-pink-300">•</span>
<a className="hover:text-[#ab2848] transition-colors" href="#">Chính sách bảo mật</a>
<span className="hidden sm:inline text-pink-300">•</span>
<span className="japanese-font text-pink-800/60 font-medium">日本語学習プラットフォーム</span>
</div>
</footer>





    </div>
  );
}
