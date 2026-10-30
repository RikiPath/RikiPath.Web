import { NavLink, useLocation } from 'react-router-dom';

import NotificationPopover from '../admin/NotificationPopover.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { CMS_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 248;
const HEADER_H = 64;

function navClass(active) {
  return [
    'group/nav flex min-h-[36px] w-full items-center gap-2.5',
    'rounded-lg px-2.5 text-left text-[13px]',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[#AD3155]/25',
    active
      ? 'bg-[#FADDE8] font-medium text-[#A12E50]'
      : 'font-normal text-[#826773] hover:bg-[#F7F1F3] hover:text-[#A24867]',
  ].join(' ');
}

function roleLabel(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'contentauthor') return 'Tác giả nội dung';
  if (value === 'admin') return 'Quản trị viên';
  return role || 'Tác giả nội dung';
}

export default function CmsShell({
  children,
  pathname,
  breadcrumb = 'Studio',
  hideHeader = false,
}) {
  const location = useLocation();
  const currentPath = pathname || location.pathname;
  const { user, primaryRole, logout } = useAuth();

  const displayName =
    user?.fullName || user?.name || user?.email || CMS_NAV.user.name;
  const initial = displayName.trim().charAt(0).toUpperCase() || 'R';

  return (
    <div
      data-shell="cms"
      className="min-h-screen bg-[#FAF8F7]
                 font-['Nunito',sans-serif] text-[#3F3038]"
    >
      <aside
        aria-label="Điều hướng CMS"
        style={{ width: SIDEBAR_W }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col
                   border-r border-[#E8DFDC] bg-[#FAF8F7]"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
          <span
            className="flex h-9 w-9 items-center justify-center
                       rounded-xl bg-[#AD3155] text-white"
          >
            <span className="material-symbols-outlined text-[22px]">
              spa
            </span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[16px] font-medium">
              {CMS_NAV.brand.title}
            </span>
            <span className="mt-0.5 block text-[10px] text-[#AA8F9B]">
              Studio nội dung
            </span>
          </span>
        </div>

        <nav
          aria-label="Menu chính"
          className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3"
        >
          {CMS_NAV.groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div
                className="mb-1 px-2.5 text-[10px] font-medium
                           tracking-[0.08em] text-[#B18F9E]"
              >
                {group.label.toUpperCase()}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = !item.neverActive && pathMatches(currentPath, item);
                  const className = navClass(active);
                  const body = (
                    <>
                      <span
                        aria-hidden="true"
                        className={[
                          'material-symbols-outlined text-[19px]',
                          active ? 'text-[#AD3155]' : 'text-[#B18B9B]',
                        ].join(' ')}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </>
                  );

                  if (item.neverActive) {
                    return (
                      <div key={item.label} className={className}>
                        {body}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={`${group.label}-${item.to}-${item.label}`}
                      to={item.to}
                      title={item.label}
                      className={className}
                    >
                      {body}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

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
        {!hideHeader && (
          <header
            style={{ left: SIDEBAR_W, height: HEADER_H }}
            className="fixed right-0 top-0 z-40 flex items-center
                       border-b border-[#E8DFDC] bg-[#FAF8F7] px-6"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-[#AA98A1]">
              <span>Studio</span>
              <span className="material-symbols-outlined text-[16px] text-[#C9B8C0]">
                chevron_right
              </span>
              <span className="truncate text-[#826A76]">{breadcrumb}</span>
            </div>
            <NotificationPopover />
          </header>
        )}
        <main className={hideHeader ? 'min-h-screen' : 'min-h-screen'} style={hideHeader ? undefined : { paddingTop: HEADER_H }}>
          {children}
        </main>
      </div>
    </div>
  );
}
