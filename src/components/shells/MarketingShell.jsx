import { Link, NavLink } from 'react-router-dom';
import { MARKETING_NAV } from './navConfig.js';

export default function MarketingShell({ children }) {
  return (
    <div className="min-h-screen bg-[#FFF8F8] text-[#2D282A]" data-shell="marketing">
      <header className="sticky top-0 z-50 border-b border-[#dfbfc1]/50 bg-[#FFF8F8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white shadow-sm shadow-[#D94B68]/25">
              <span className="material-symbols-outlined text-[18px]">local_florist</span>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold tracking-tight">
                Riki<span className="text-[#D94B68]">Path</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A59B9E]">
                JLPT Academy
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {MARKETING_NAV.links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [
                    'text-[14px] font-medium transition-colors',
                    isActive && link.end ? 'text-[#9E2A4B]' : 'text-[#6F6669] hover:text-[#D94B68]',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={MARKETING_NAV.login.to}
              className="hidden rounded-full border border-[#D94B68] px-4 py-2 text-[13px] font-semibold text-[#D94B68] sm:inline-flex"
            >
              {MARKETING_NAV.login.label}
            </Link>
            <Link
              to={MARKETING_NAV.cta.to}
              className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-[#D94B68]/25"
            >
              {MARKETING_NAV.cta.label}
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#dfbfc1]/50 bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-3">
          <div>
            <div className="mb-3 text-lg font-extrabold">
              Riki<span className="text-[#D94B68]">Path</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#6F6669]">
              Tự học, luyện thi và thi thử JLPT trong một dashboard gọn, đồng bộ với tiến độ thật của bạn.
            </p>
          </div>
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Khám phá</div>
            <div className="flex flex-col gap-2.5 text-sm text-[#6F6669]">
              <Link to="/courses" className="hover:text-[#D94B68]">Luyện thi JLPT</Link>
              <Link to="/mentor" className="hover:text-[#D94B68]">Tư vấn 1-1</Link>
              <Link to="/app" className="hover:text-[#D94B68]">Vào dashboard</Link>
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Tài khoản</div>
            <div className="flex flex-col gap-2.5 text-sm text-[#6F6669]">
              <Link to="/auth" className="hover:text-[#D94B68]">Đăng nhập</Link>
              <Link to="/register" className="hover:text-[#D94B68]">Đăng ký</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#dfbfc1]/40 px-6 py-4 text-center text-xs text-[#A59B9E]">
          © 2026 RikiPath Learning
        </div>
      </footer>
    </div>
  );
}
