import { Link, NavLink } from 'react-router-dom';
import { MARKETING_NAV } from './navConfig.js';

export default function MarketingShell({ children, pathname }) {
  return (
    <div className="min-h-screen bg-[#FAF7F5] text-[#2D282A]" data-shell="marketing">
      <header className="sticky top-0 z-50 border-b border-[#EADFD9] bg-[#FFF8F8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white">
              <span className="material-symbols-outlined text-[20px]">local_florist</span>
            </div>
            <span className="text-lg font-bold tracking-tight">
              Riki<span className="text-[#D94B68]">Path</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {MARKETING_NAV.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
                    isActive ? 'bg-[#FFF0F5] text-[#D94B68]' : 'text-[#6F6669] hover:text-[#D94B68]',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to={MARKETING_NAV.cta.to}
            className="rounded-full bg-[#D94B68] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-[#D94B68]/30 hover:bg-[#C53453]"
          >
            {MARKETING_NAV.cta.label}
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#EADFD9] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <div className="mb-3 text-lg font-bold">
              Riki<span className="text-[#D94B68]">Path</span>
            </div>
            <p className="text-sm leading-relaxed text-[#6F6669]">
              Nền tảng học tiếng Nhật JLPT theo triết lý tối giản Ma (間) và thẩm mỹ hoa anh đào.
            </p>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#A59B9E]">Khám phá</div>
            <div className="flex flex-col gap-2 text-sm text-[#6F6669]">
              <Link to="/courses" className="hover:text-[#D94B68]">
                Danh mục khóa học
              </Link>
              <Link to="/consultation" className="hover:text-[#D94B68]">
                Tư vấn 1-1
              </Link>
              <Link to="/app" className="hover:text-[#D94B68]">
                Cổng học tập
              </Link>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#A59B9E]">Tài khoản</div>
            <div className="flex flex-col gap-2 text-sm text-[#6F6669]">
              <Link to="/auth" className="hover:text-[#D94B68]">
                Đăng nhập
              </Link>
              <Link to="/register" className="hover:text-[#D94B68]">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#EADFD9] px-6 py-4 text-center text-xs text-[#A59B9E]">
          © 2026 RikiPath Learning
        </div>
      </footer>
    </div>
  );
}
