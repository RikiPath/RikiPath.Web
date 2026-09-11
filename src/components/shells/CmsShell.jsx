import { NavLink } from 'react-router-dom';
import { CMS_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 260;

function NavItem({ item, pathname }) {
  if (item.neverActive) {
    return (
      <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-txt-muted/70">
        <span className="flex min-w-0 items-center gap-3">
          <span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
      </div>
    );
  }
  const active = pathMatches(pathname, item);
  return (
    <NavLink
      to={item.to}
      className={[
        'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] transition-all',
        active
          ? 'font-semibold bg-brand text-white shadow-md shadow-brand/25'
          : 'font-medium text-txt-muted hover:bg-canvas hover:text-txt-main',
      ].join(' ')}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge ? (
        <span
          className={[
            'px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0',
            active ? 'bg-white/20 text-white' : 'bg-brand-soft/50 text-brand-dark',
          ].join(' ')}
        >
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

/**
 * CMS shell — sidebar + topbar đồng bộ (chuẩn LessonCMS / screenshot).
 */
export default function CmsShell({ children, pathname, breadcrumb, hideHeader = false }) {
  return (
    <div className="bg-canvas font-sans antialiased text-txt-main min-h-screen" data-shell="cms">
      <aside
        className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col justify-between overflow-y-auto border-r border-surface-border bg-white px-4 py-6"
        style={{ width: SIDEBAR_W }}
      >
        <div className="flex flex-col">
          <div className="mb-8 flex items-center gap-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/25">
              <span className="material-symbols-outlined text-[24px]">local_florist</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold leading-tight tracking-tight text-txt-main">
                {CMS_NAV.brand.title}
              </span>
              <span className="text-[12px] font-semibold tracking-wide text-brand">
                {CMS_NAV.brand.subtitle}
              </span>
            </div>
          </div>

          {CMS_NAV.groups.map((group) => (
            <div key={group.label} className="mb-6">
              <div className="mb-2 px-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-light">
                  {group.label}
                </span>
              </div>
              <nav className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={`${group.label}-${item.label}`} item={item} pathname={pathname} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-surface-border/60 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-surface-border bg-canvas px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[12px] font-medium text-txt-muted">Cloud Sync</span>
            </div>
            <span className="text-[12px] font-bold text-emerald-700">Ổn định</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col" style={{ paddingLeft: SIDEBAR_W }}>
        {!hideHeader && (
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-6 border-b border-surface-border bg-white px-8 shadow-[0_1px_4px_rgba(45,40,42,0.03)]">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {breadcrumb ? (
                <div className="hidden shrink-0 items-center gap-1 text-[13px] text-txt-muted lg:flex">
                  <span>CMS</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="font-semibold text-brand">{breadcrumb}</span>
                </div>
              ) : null}
              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-txt-light">
                  search
                </span>
                <input
                  className="w-full rounded-xl border border-surface-border bg-canvas py-2 pl-10 pr-4 text-[13px] text-txt-main placeholder:text-txt-light focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft/50"
                  placeholder="Tìm kiếm học liệu, ngữ pháp, học viên... (Ctrl + K)"
                  type="text"
                />
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="hidden items-center gap-2 rounded-full border border-brand-soft/60 bg-brand-light px-3 py-1.5 xl:flex">
                <span className="material-symbols-outlined text-[16px] text-brand">spa</span>
                <span className="text-[12px] font-semibold text-brand-dark">{CMS_NAV.headerBadge}</span>
              </div>
              <button
                type="button"
                className="relative rounded-xl p-2 text-txt-muted transition-colors hover:bg-canvas hover:text-txt-main"
                title="Thông báo"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
              </button>
              <div className="h-6 w-px bg-surface-border" />
              <div className="flex cursor-pointer items-center gap-3 pl-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="hidden flex-col text-left md:flex">
                  <span className="text-[13px] font-semibold leading-tight text-txt-main">
                    {CMS_NAV.user.name}
                  </span>
                  <span className="text-[11px] text-txt-muted">{CMS_NAV.user.role}</span>
                </div>
              </div>
            </div>
          </header>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
