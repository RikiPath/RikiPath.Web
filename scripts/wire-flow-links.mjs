import fs from 'fs';
import path from 'path';

const root = 'd:/RikiPath/src/pages';

function ensureLinkImport(src) {
  if (src.includes("from 'react-router-dom'") || src.includes('from "react-router-dom"')) {
    return src;
  }
  if (src.startsWith('import ')) {
    const match = src.match(/^(import .+?;\r?\n)+/);
    if (match) return match[0] + "import { Link } from 'react-router-dom';\n" + src.slice(match[0].length);
  }
  return "import { Link } from 'react-router-dom';\n" + src;
}

function patchHomeLanding(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    '<a className="px-4 py-2 rounded-full bg-white text-[#9E2A4B] shadow-sm transition-all" href="#">Khóa học</a>',
    '<Link className="px-4 py-2 rounded-full bg-white text-[#9E2A4B] shadow-sm transition-all" to="/courses">Khóa học</Link>'
  );
  s = s.replace(
    '<a className="px-4 py-2 rounded-full text-sm font-semibold text-on-surface hover:text-[#9E2A4B] transition-colors" href="#">Đăng nhập</a>',
    '<Link className="px-4 py-2 rounded-full text-sm font-semibold text-on-surface hover:text-[#9E2A4B] transition-colors" to="/auth">Đăng nhập</Link>'
  );
  s = s.replace(/href="#trial"/g, 'to="/register"');
  s = s.replace('href="#pathway"', 'to="/courses"');
  s = s.replace(
    /<a (className="px-5 py-2\.5 rounded-full bg-gradient-to-r[\s\S]*?to="\/register">)([\s\S]*?)<\/a>/,
    '<Link $1$2</Link>'
  );
  s = s.replace(
    /<a (className="flex items-center justify-center gap-2 px-8 py-4[\s\S]*?to="\/register">)([\s\S]*?)<\/a>/,
    '<Link $1$2</Link>'
  );
  s = s.replace(
    /<a (className="flex items-center justify-center gap-2 px-7 py-4[\s\S]*?to="\/courses">)([\s\S]*?)<\/a>/,
    '<Link $1$2</Link>'
  );
  return s;
}

function patchAuth(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    /<a className="text-xs font-semibold text-\[#d94b68\] hover:text-sakura-700 hover:underline transition-colors" href="#">\{\\"\\n                Quên mật khẩu\?\\n              \\"\}<\/a>/,
    '<Link className="text-xs font-semibold text-[#d94b68] hover:text-sakura-700 hover:underline transition-colors" to="/forgot-password">Quên mật khẩu?</Link>'
  );
  // fallback simpler
  if (s.includes('Quên mật khẩu?') && s.includes('href="#"')) {
    s = s.replace(
      /(<a className="text-xs font-semibold text-\[#d94b68\][^>]+)href="#">(\{"\\n                Quên mật khẩu\?\\n              "\})<\/a>/,
      '<Link className="text-xs font-semibold text-[#d94b68] hover:text-sakura-700 hover:underline transition-colors" to="/forgot-password">Quên mật khẩu?</Link>'
    );
  }
  s = s.replace(
    /<a className="font-bold text-\[#d94b68\] hover:text-sakura-700 hover:underline" href="#">\{\"\\n              Đăng ký miễn phí\\n            \"\}<\/a>/,
    '<Link className="font-bold text-[#d94b68] hover:text-sakura-700 hover:underline" to="/register">Đăng ký miễn phí</Link>'
  );
  s = s.replace(
    /<button className="flex-1 py-2\.5 text-sm font-semibold text-slate-500 hover:text-sakura-600 rounded-lg transition-colors text-center" id="tab-register-btn" type="button">\{\"\\n              Đăng ký\\n            \"\}<\/button>/,
    '<Link to="/register" className="flex-1 py-2.5 text-sm font-semibold text-slate-500 hover:text-sakura-600 rounded-lg transition-colors text-center flex items-center justify-center" id="tab-register-btn">Đăng ký</Link>'
  );
  s = s.replace(
    /<button className="(w-full flex items-center justify-center gap-2 py-3\.5 rounded-xl text-sm font-bold neo-sakura-btn[^"]*)"[^>]*>\s*<span className="">Đăng nhập ngay<\/span>\s*<\/button>/,
    '<Link to="/app" className="$1"><span>Đăng nhập ngay</span></Link>'
  );
  return s;
}

function patchRegister(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    /<a className="py-2\.5 text-center text-sm font-semibold text-charcoal-500 rounded-lg hover:text-sakura-600 transition-colors" href="#">\{\"\\n            Đăng nhập\\n          \"\}<\/a>/,
    '<Link to="/auth" className="py-2.5 text-center text-sm font-semibold text-charcoal-500 rounded-lg hover:text-sakura-600 transition-colors">Đăng nhập</Link>'
  );
  s = s.replace(
    '<a className="font-bold text-sakura-600 hover:text-sakura-700 hover:underline ml-1" href="#">Đăng nhập ngay</a>',
    '<Link to="/auth" className="font-bold text-sakura-600 hover:text-sakura-700 hover:underline ml-1">Đăng nhập ngay</Link>'
  );
  s = s.replace(
    /<button className="(w-full[^"]*neo-sakura-btn[^"]*)"[^>]*>\s*<span className="">Đăng ký tài khoản ngay<\/span>\s*<\/button>/,
    '<Link to="/onboarding" className="$1"><span>Đăng ký tài khoản ngay</span></Link>'
  );
  return s;
}

function patchForgot(s) {
  s = ensureLinkImport(s);
  // Trang chủ brand / back login
  s = s.replace(
    /(<a className="[^"]*"[^>]*data-path="trang-chu"[^>]*)href="#"/,
    '$1to="/"'
  );
  s = s.replace(
    /href="#">(\s*<span className="material-symbols-outlined text-\[15px\]">arrow_back<\/span>\{\"\\n        Đăng nhập\\n      \"\})<\/a>/,
    'to="/auth">$1</Link>'
  );
  // Convert remaining to= anchors for auth
  s = s.replace(/<a ([^>]*to="\/(?:auth|)"[^>]*)>/g, '<Link $1>');
  s = s.replace(
    /Quay lại trang Đăng nhập\\n            "\}<\/a>/,
    'Quay lại trang Đăng nhập</Link>'
  );
  s = s.replace(
    /(<a [^>]*className="[^"]*"[^>]*>\s*<span className="material-symbols-outlined text-\[16px\]">arrow_back<\/span>\{\"\\n              Quay lại trang Đăng nhập)/,
    (m) => m.replace('<a ', '<Link to="/auth" ').replace(/href="#"/, '')
  );
  s = s.replace(
    /Đăng nhập ngay<\/span>\s*<\/a>/,
    'Đăng nhập ngay</span></Link>'
  );
  s = s.replace(
    /(<a className="[^"]*neo-sakura-btn[^"]*"[^>]*)href="#"/,
    '$1to="/auth"'
  );
  s = s.replace(/<a ([^>]*to="\/auth"[^>]*)>/g, '<Link $1>');
  s = s.replace(/to="\/"([^>]*)>/g, (m) => m.includes('Link') ? m : m);
  // brand link
  s = s.replace(/<a ([^>]*to="\/"[^>]*)>/g, '<Link $1>');
  s = s.replace(/to="\/">([\s\S]*?Riki[\s\S]*?)<\/a>/, 'to="/">$1</Link>');
  return s;
}

function patchOnboarding(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    /(<a className="[^"]*"[^>]*data-path="trang-chu"[^>]*)href="#"/,
    '$1to="/"'
  );
  s = s.replace(/<a ([^>]*to="\/"[^>]*)>/g, '<Link $1>');
  s = s.replace(/data-path="trang-chu" to="\/">([\s\S]*?)<\/a>/, 'data-path="trang-chu" to="/">$1</Link>');
  s = s.replace(
    /<a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors text-center" href="#">\{\"\\n          Bỏ qua bước này và vào xem toàn bộ giáo trình\\n        \"\}<\/a>/,
    '<Link to="/app" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors text-center">Bỏ qua bước này và vào xem toàn bộ giáo trình</Link>'
  );
  // Để sau button → /app
  s = s.replace(
    /<button([^>]*)>\s*<span>Để sau<\/span>\s*<\/button>/,
    '<Link to="/app" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary"><span>Để sau</span></Link>'
  );
  // Tiếp tục cuối → /app (final CTA of survey for prototype)
  s = s.replace(
    /<button([^>]*neo-sakura-btn[^>]*)>\s*<span>Tiếp tục: Chọn mục tiêu học tập<\/span>\s*<\/button>/,
    '<Link to="/app" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold neo-sakura-btn"><span>Tiếp tục vào Tổng quan</span></Link>'
  );
  return s;
}

function patchCatalog(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    /(<a className="[^"]*"[^>]*data-path="trang-chu"[^>]*)href="#"/,
    '$1to="/"'
  );
  s = s.replace(/<a ([^>]*to="\/"[^>]*)>/g, '<Link $1>');
  s = s.replace(/data-path="trang-chu" to="\/">([\s\S]*?)<\/a>/, 'data-path="trang-chu" to="/">$1</Link>');
  // Đăng nhập / Học thử buttons in header
  s = s.replace(
    /<button className="px-space-md py-1\.5 font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors" type="button">\{\"\\n          Đăng nhập\\n        \"\}<\/button>/,
    '<Link to="/auth" className="px-space-md py-1.5 font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors inline-flex items-center">Đăng nhập</Link>'
  );
  s = s.replace(
    /<button className="px-space-md py-1\.5 bg-primary text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary\/90 transition-all" type="button">\{\"\\n          Học thử miễn phí\\n        \"\}<\/button>/,
    '<Link to="/register" className="px-space-md py-1.5 bg-primary text-on-primary font-label-lg text-label-lg rounded-full shadow-md hover:bg-primary/90 transition-all inline-flex items-center">Học thử miễn phí</Link>'
  );
  s = s.replace(
    /<button className="w-full py-2\.5 rounded-full bg-primary hover:bg-primary\/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center" type="button">\{\"\\n              Đăng ký ngay\\n            \"\}<\/button>/g,
    '<Link to="/course-detail" className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary font-label-lg text-label-lg shadow-md transition-all text-center inline-flex items-center justify-center">Đăng ký ngay</Link>'
  );
  return s;
}

function patchCourseDetail(s) {
  s = ensureLinkImport(s);
  s = s.replace(
    '<a className="text-primary font-bold border-b-2 border-primary pb-1" href="#">Khóa học</a>',
    '<Link className="text-primary font-bold border-b-2 border-primary pb-1" to="/courses">Khóa học</Link>'
  );
  s = s.replace(
    '<button className="text-on-surface-variant hover:text-primary transition-colors duration-200 font-title-sm text-title-sm">Đăng nhập</button>',
    '<Link to="/auth" className="text-on-surface-variant hover:text-primary transition-colors duration-200 font-title-sm text-title-sm">Đăng nhập</Link>'
  );
  s = s.replace(
    '<button className="bg-primary text-on-primary rounded-full px-space-lg py-space-sm font-title-sm text-title-sm hover:opacity-90 shadow-md shadow-primary/20 transition-all duration-200">Học thử miễn phí</button>',
    '<Link to="/register" className="bg-primary text-on-primary rounded-full px-space-lg py-space-sm font-title-sm text-title-sm hover:opacity-90 shadow-md shadow-primary/20 transition-all duration-200 inline-flex items-center">Học thử miễn phí</Link>'
  );
  // breadcrumb
  s = s.replace(
    /<a className="hover:text-primary transition-colors" href="#">Trang chủ<\/a>/,
    '<Link className="hover:text-primary transition-colors" to="/">Trang chủ</Link>'
  );
  s = s.replace(
    '<a className="hover:text-primary transition-colors" href="#">Khóa học</a>',
    '<Link className="hover:text-primary transition-colors" to="/courses">Khóa học</Link>'
  );
  // Đăng ký học ngay - find span parent button
  s = s.replace(
    /<button className="w-full bg-primary text-on-primary rounded-full py-space-md font-title-sm text-title-sm mb-space-sm hover:opacity-95 active:scale-\[0\.99\] transition-all duration-200 shadow-\[0_6px_16px_rgba\(217,75,104,0\.3\)\] flex items-center justify-center gap-2">\s*<span className="">Đăng ký học ngay<\/span>[\s\S]*?<\/button>/,
    '<Link to="/register" className="w-full bg-primary text-on-primary rounded-full py-space-md font-title-sm text-title-sm mb-space-sm hover:opacity-95 active:scale-[0.99] transition-all duration-200 shadow-[0_6px_16px_rgba(217,75,104,0.3)] flex items-center justify-center gap-2"><span>Đăng ký học ngay</span><span className="material-symbols-outlined text-lg">arrow_forward</span></Link>'
  );
  return s;
}

function patchDashboard(s) {
  s = ensureLinkImport(s);
  // data-path based sidebar
  const map = [
    ['dashboard', '/app'],
    ['explore', '/roadmap'],
    ['lessons', '/lessons'],
    ['notebook', '/kanji-studio'],
    ['settings', '/app'],
  ];
  for (const [dp, to] of map) {
    const re = new RegExp(`(<a[^>]*data-path="${dp}"[^>]*)href="#"`, 'g');
    s = s.replace(re, `$1to="${to}"`);
  }
  s = s.replace(/<a ([^>]*to="\/(?:app|roadmap|lessons|kanji-studio)"[^>]*)>/g, '<Link $1>');
  s = s.replace(/to="\/(?:app|roadmap|lessons|kanji-studio)"[^>]*>[\s\S]*?<\/a>/g, (m) =>
    m.replace(/<\/a>$/, '</Link>')
  );
  // Tiếp tục học CTA near top
  s = s.replace(
    /(<button[^>]*>\s*<span className="">Tiếp tục học<\/span>\s*<\/button>)/,
    '<Link to="/lessons" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold shadow-md"><span>Tiếp tục học</span></Link>'
  );
  return s;
}

const patches = {
  'HomeLanding.jsx': patchHomeLanding,
  'Auth.jsx': patchAuth,
  'Register.jsx': patchRegister,
  'ForgotPassword.jsx': patchForgot,
  'OnboardingSurvey.jsx': patchOnboarding,
  'CourseCatalog.jsx': patchCatalog,
  'CourseDetail.jsx': patchCourseDetail,
  'Dashboard.jsx': patchDashboard,
};

for (const [file, fn] of Object.entries(patches)) {
  const p = path.join(root, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  fs.writeFileSync(p, after);
  console.log(
    file,
    before === after ? 'NO_CHANGE' : 'UPDATED',
    'Link?',
    after.includes("from 'react-router-dom'")
  );
}
