import { Link, NavLink, useLocation } from 'react-router-dom';

import BrandMark from '../BrandMark.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { CONSULT_NAV, pathMatches } from './navConfig.js';
import NotificationBell from './NotificationBell.jsx';

const SIDEBAR_W = 248;
const HEADER_H = 64;

function navClass(active) {
  return [
    'group/nav flex w-full items-center gap-2.5',
    'rounded-lg px-2.5 py-1.5 text-left',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[#AD3155]/25',
    active
      ? 'bg-[#FADDE8] text-[#A12E50]'
      : 'text-[#826773] hover:bg-[#F7F1F3] hover:text-[#A24867]',
  ].join(' ');
}

function roleLabel(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'mentor' || value === 'consultant') return 'Cố vấn';
  if (value === 'admin') return 'Quản trị viên';
  return 'Cố vấn';
}

export default function ConsultShell({ children, pathname, breadcrumb = 'Cố vấn' }) {
  const location = useLocation();
  const currentPath = pathname || location.pathname;
  const { user, primaryRole, logout } = useAuth();

  const displayName =
    user?.fullName || user?.name || user?.email || CONSULT_NAV.user.name;
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';

  return (
    <div
      data-shell="consult"
      className="min-h-screen bg-[#FAF8F7]
                 font-['Nunito',sans-serif] text-[#3F3038]"
    >
      <aside
          aria-label="Điều hướng cố vấn"
        style={{ width: SIDEBAR_W }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden
                   border-r border-[#E8DFDC] bg-[#FAF8F7]"
      >
        <Link
          to="/"
          aria-label="Về trang chủ"
          className="flex h-16 shrink-0 items-center gap-2.5 px-4 rounded-lg
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[#AD3155]/30"
        >
          <BrandMark className="h-10 w-14" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[16px] font-medium">
              {CONSULT_NAV.brand.title}
            </span>
            <span className="mt-0.5 block text-[10px] text-[#AA8F9B]">
              Cổng mentor
            </span>
          </span>
        </Link>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <nav
          aria-label="Menu chính"
          className="px-2.5 pb-4"
        >
          {CONSULT_NAV.groups.map((group) => (
            <div key={group.label} className="mb-2.5">
              <div
                className="mb-1 px-2.5 text-[10px] font-medium
                           tracking-[0.08em] text-[#B18F9E]"
              >
                {group.label.toUpperCase()}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathMatches(currentPath, item);
                  return (
                    <NavLink
                      key={`${group.label}-${item.to}-${item.label}`}
                      to={item.to}
                      className={navClass(active)}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'material-symbols-outlined text-[19px]',
                          active ? 'text-[#AD3155]' : 'text-[#B18B9B]',
                        ].join(' ')}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[13px] ${active ? 'font-medium' : ''}`}>
                          {item.label}
                        </span>
                        {item.hint ? (
                          <span className={`block truncate text-[10px] ${active ? 'text-[#C46B86]' : 'text-[#B39AA6]'}`}>
                            {item.hint}
                          </span>
                        ) : null}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        </div>

        <div className="shrink-0 border-t border-[#E8DFDC] px-3 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center
                         justify-center rounded-full bg-[#F8DFE9]
                         text-[12px] font-medium text-[#AD3155]"
            >
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#AA8F9B]">
                {roleLabel(primaryRole || user?.role)}
              </span>
            </span>
            <button
              type="button"
              onClick={logout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="flex h-8 w-8 items-center justify-center
                         rounded-lg text-[#B18B9B] hover:bg-[#FADDE8]
                         hover:text-[#AD3155]"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0" style={{ paddingLeft: SIDEBAR_W }}>
        <header
          style={{ left: SIDEBAR_W, height: HEADER_H }}
          className="fixed right-0 top-0 z-50 flex items-center
                     border-b border-[#E8DFDC] bg-[#FAF8F7] px-6"
        >
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#AA98A1]">
            <span>Cố vấn</span>
            <span className="material-symbols-outlined text-[16px] text-[#C9B8C0]">
              chevron_right
            </span>
            <span className="truncate text-[#826A76]">{breadcrumb}</span>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="min-h-screen" style={{ paddingTop: HEADER_H }}>
          {children}
        </main>
      </div>
    </div>
  );
}
