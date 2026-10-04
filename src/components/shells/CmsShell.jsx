import { NavLink } from 'react-router-dom';
import { CMS_NAV, pathMatches } from './navConfig.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const SIDEBAR_W = 280;

function navClass(active) {
  return [
    'rp-nav-item group/nav flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-left transition-all',
    active ? 'rp-nav-item-active' : 'text-[#6F6669] hover:bg-white hover:text-[#2D282A]',
  ].join(' ');
}

function NavIcon({ name, active }) {
  return (
    <span
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[18px] transition-colors',
        active ? 'bg-[#ffd9e4] text-[#D94B68]' : 'bg-[#FFF8F8] text-[#A59B9E] group-hover/nav:bg-[#fff0f5] group-hover/nav:text-[#D94B68]',
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-[20px]">{name}</span>
    </span>
  );
}

function NavCopy({ label, hint, active }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={['block truncate text-[14px] leading-5', active ? 'font-bold text-[#9E2A4B]' : 'font-semibold'].join(' ')}>
        {label}
      </span>
      {hint ? (
        <span className={['mt-0.5 block truncate text-[11px] font-medium leading-4', active ? 'text-[#D94B68]/80' : 'text-[#A59B9E]'].join(' ')}>
          {hint}
        </span>
      ) : null}
    </span>
  );
}

export default function CmsShell({ children, pathname, breadcrumb, hideHeader = false }) {
  const { user, primaryRole } = useAuth();
  const displayName = user?.fullName || user?.name || user?.email || CMS_NAV.user.name;
  const roleName = primaryRole || user?.role || CMS_NAV.user.role;

  return (
    <div className="min-h-screen bg-transparent text-[#2D282A]" data-shell="cms">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto px-4 py-5">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white">
            <span className="material-symbols-outlined text-[22px]">local_florist</span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[18px] font-extrabold tracking-tight text-[#2D282A]">{CMS_NAV.brand.title}</div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A59B9E]">{CMS_NAV.brand.subtitle}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5">
          {CMS_NAV.groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">{group.label}</div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  if (item.neverActive) {
                    return (
                      <div key={item.label} className={navClass(false)}>
                        <NavIcon name={item.icon} />
                        <NavCopy label={item.label} hint={item.hint} />
                      </div>
                    );
                  }
                  const active = pathMatches(pathname, item);
                  return (
                    <NavLink key={`${group.label}-${item.to}-${item.label}`} to={item.to} className={navClass(active)}>
                      <NavIcon name={item.icon} active={active} />
                      <NavCopy label={item.label} hint={item.hint} active={active} />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rp-catalog-card mt-6 flex items-center gap-3 rounded-[22px] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5] text-sm font-bold text-[#D94B68]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold text-[#2D282A]">{displayName}</div>
            <div className="truncate text-[11px] font-medium text-[#A59B9E]">{roleName}</div>
          </div>
        </div>
      </aside>

      <div className="min-w-0" style={{ paddingLeft: SIDEBAR_W }}>
        {!hideHeader && (
          <header
            className="fixed top-0 right-0 z-40 flex h-[72px] items-center justify-between gap-4 px-6 sm:px-8"
            style={{ left: SIDEBAR_W }}
          >
            <div className="hidden min-w-0 items-center gap-2 text-[13px] text-[#8A8084] sm:flex">
              <span>CMS</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="truncate font-bold text-[#2D282A]">{breadcrumb || 'Studio'}</span>
            </div>
            <div className="mx-0 max-w-md flex-1 sm:mx-6">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[18px] text-[#A59B9E]">search</span>
                <input
                  className="h-11 w-full rounded-full border border-[#dfbfc1]/50 bg-white pl-11 pr-4 text-[13px] text-[#2D282A] shadow-sm placeholder:text-[#C4B8BA] focus:outline-none focus:ring-2 focus:ring-[#D94B68]/20"
                  placeholder="Tìm bài học, từ vựng, đề thi..."
                  type="search"
                />
              </div>
            </div>
            <button
              type="button"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dfbfc1]/45 bg-white text-[#6F6669] shadow-sm hover:text-[#D94B68]"
              aria-label="Thông báo"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          </header>
        )}
        <main className={hideHeader ? 'min-h-screen' : 'min-h-screen pt-[72px]'}>{children}</main>
      </div>
    </div>
  );
}
