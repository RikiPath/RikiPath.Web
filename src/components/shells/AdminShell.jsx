import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_NAV, pathMatches } from './navConfig.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import NotificationPopover from '../admin/NotificationPopover.jsx';

const SIDEBAR_W = 248;
const HEADER_H = 68;

function navClass(active) {
  return [
    'group/nav flex min-h-[44px] w-full items-center gap-3',
    'rounded-[10px] px-3 text-left',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[#AD3155]/30',
    active
      ? 'bg-[#FCEEF3] text-[#AD3155]'
      : 'text-[#6F6669] hover:bg-[#F8F3F5] hover:text-[#4B4247]',
  ].join(' ');
}

function NavIcon({ name, active }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'material-symbols-outlined shrink-0 text-[21px]',
        'transition-colors duration-150',
        active
          ? 'text-[#AD3155]'
          : 'text-[#95888E] group-hover/nav:text-[#AD3155]',
      ].join(' ')}
    >
      {name}
    </span>
  );
}

export default function AdminShell({
  children,
  pathname,
  breadcrumb = 'Người dùng',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm người dùng, mentor, nội dung...',
  onNotificationsClick,
}) {
  const location = useLocation();
  const currentPath = pathname || location.pathname;

  const { user, logout } = useAuth();

  const displayName =
    user?.fullName || user?.name || user?.email || 'Admin';

  const initial = displayName.trim().charAt(0).toUpperCase() || 'A';

  const navItems = ADMIN_NAV.groups.flatMap((group) =>
    group.items.map((item, index) => ({
      ...item,
      navKey: `${group.label}-${item.to}-${index}`,
    })),
  );

  return (
    <div
      data-shell="admin"
      className="min-h-screen bg-[#FAF8F9]
                 font-['Be_Vietnam_Pro',sans-serif] text-[#2D282A]"
    >
      <aside
        aria-label="Thanh điều hướng quản trị"
        style={{ width: SIDEBAR_W }}
        className="fixed inset-y-0 left-0 z-50 flex flex-col
                   border-r border-[#EEE7EA] bg-[#FFFCFD]"
      >
        <div className="shrink-0 px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center
                         justify-center rounded-[14px]
                         bg-[#AD3155] text-white"
            >
              <span className="material-symbols-outlined text-[23px]">
                admin_panel_settings
              </span>
            </div>

            <div className="min-w-0">
              <div
                className="truncate text-[19px] font-semibold
                           tracking-tight text-[#352C31]"
              >
                {ADMIN_NAV.brand.title}
              </div>

              <div className="mt-0.5 text-[11px] text-[#8C7D84]">
                Trang quản trị
              </div>
            </div>
          </div>
        </div>

        <nav
          aria-label="Menu chính"
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathMatches(currentPath, item);

              return (
                <div key={item.navKey}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={navClass(active)}
                    title={item.label}
                  >
                    <NavIcon name={item.icon} active={active} />

                    <span
                      className={[
                        'min-w-0 flex-1 truncate text-[13px]',
                        active ? 'font-semibold' : 'font-medium',
                      ].join(' ')}
                    >
                      {item.label}
                    </span>
                  </NavLink>

                  {item.children?.length > 0 && (
                    <div className="mb-1 ml-[22px] border-l border-[#F0E6EA] pl-2">
                      {item.children.map((child) => {
                        const childActive = pathMatches(currentPath, child);

                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            title={child.label}
                            className={[
                              'flex min-h-[34px] items-center rounded-lg px-2',
                              'text-[12.5px] transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2',
                              'focus-visible:ring-[#AD3155]/30',
                              childActive
                                ? 'font-semibold text-[#AD3155]'
                                : 'font-medium text-[#8C7D84] hover:text-[#AD3155]',
                            ].join(' ')}
                          >
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 px-4 pb-4">
          <div
            className="flex items-center gap-2.5
                       border-t border-[#EEE7EA] px-1 pt-4"
          >
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center
                         justify-center rounded-full bg-[#F7E8EE]
                         text-[13px] font-semibold text-[#AD3155]"
            >
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div
                title={displayName}
                className="truncate text-[13px] font-medium
                           text-[#4B4247]"
              >
                {displayName}
              </div>

              <div className="mt-0.5 text-[11px] text-[#8C7D84]">
                Quản trị viên
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="flex h-8 w-8 shrink-0 items-center
                         justify-center rounded-lg text-[#95888E]
                         transition-colors hover:bg-[#FCEEF3]
                         hover:text-[#AD3155]
                         focus-visible:outline-none
                         focus-visible:ring-2
                         focus-visible:ring-[#AD3155]/30"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[19px]"
              >
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div
        style={{ paddingLeft: SIDEBAR_W }}
        className="min-w-0"
      >
        <header
          style={{
            left: SIDEBAR_W,
            height: HEADER_H,
          }}
          className="fixed right-0 top-0 z-40 flex items-center
                     justify-between gap-5 border-b
                     border-[#EEE7EA] bg-[#FFFCFD] px-6 lg:px-8"
        >
          <div
            aria-label="Vị trí hiện tại"
            className="flex min-w-0 items-center gap-2
                       text-[12px] text-[#95888E]"
          >
            <span className="shrink-0">Admin</span>

            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[16px]
                         text-[#B4A8AE]"
            >
              chevron_right
            </span>

            <span
              className="truncate font-medium text-[#4B4247]"
              title={breadcrumb}
            >
              {breadcrumb}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            {typeof onSearchChange === 'function' && (
              <div className="relative w-[240px] lg:w-[320px]">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined
                             pointer-events-none absolute left-3
                             top-1/2 -translate-y-1/2
                             text-[19px] text-[#A09399]"
                >
                  search
                </span>

                <input
                  type="search"
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={searchValue ?? ''}
                  onChange={(event) =>
                    onSearchChange(event.target.value)
                  }
                  className="h-9 w-full rounded-[10px] border
                             border-[#E9E1E5] bg-white pl-9 pr-3
                             text-[12px] text-[#4B4247]
                             placeholder:text-[#A89BA2]
                             focus:border-[#C8889D]
                             focus:outline-none focus:ring-2
                             focus:ring-[#AD3155]/10"
                />
              </div>
            )}

            {typeof onNotificationsClick === 'function' && (
              <button
                type="button"
                onClick={onNotificationsClick}
                aria-label="Mở thông báo"
                title="Thông báo"
                className="flex h-9 w-9 shrink-0 items-center
                           justify-center rounded-[10px]
                           text-[#8C7D84] transition-colors
                           hover:bg-[#FCEEF3] hover:text-[#AD3155]
                           focus-visible:outline-none
                           focus-visible:ring-2
                           focus-visible:ring-[#AD3155]/30"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[21px]"
                >
                  notifications
                </span>
              </button>
            )}
          </div>
          <NotificationPopover />
        </header>

        <div
          style={{ paddingTop: HEADER_H }}
          className="min-h-screen"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
