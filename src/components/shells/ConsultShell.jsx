import { NavLink } from 'react-router-dom';
import { CONSULT_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 260;

export default function ConsultShell({ children, pathname, breadcrumb = 'Cố Vấn SENSEI' }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md" data-shell="consult">
      <aside
        className="fixed left-0 top-0 z-50 flex h-screen flex-col justify-between bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        style={{ width: SIDEBAR_W }}
      >
        <div className="flex flex-col">
          <div className="flex h-16 items-center gap-3 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-headline-sm text-headline-sm text-on-primary">
              R
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-headline-sm text-headline-sm tracking-tight text-primary">
                {CONSULT_NAV.brand.title}
                <span className="rounded-full bg-secondary-tint px-2 py-0.5 font-label-xs text-label-xs text-primary">
                  {CONSULT_NAV.brand.badge}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {CONSULT_NAV.brand.subtitle}
              </span>
            </div>
          </div>
          <nav className="mt-2 flex flex-col gap-1 px-3">
            {CONSULT_NAV.items.map((item) => {
              const active = pathMatches(pathname, item);
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body-md text-body-md transition-all',
                    active
                      ? 'bg-primary font-semibold text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="m-4 rounded-xl bg-surface-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <div className="min-w-0">
              <div className="truncate font-label-md text-label-md text-text-charcoal">
                {CONSULT_NAV.user.name}
              </div>
              <div className="truncate font-label-xs text-label-xs text-on-surface-variant">
                {CONSULT_NAV.user.role}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ paddingLeft: SIDEBAR_W }}>
        <header
          className="fixed right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface/80 px-8 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
          style={{ left: SIDEBAR_W }}
        >
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <span>RikiPath</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="font-label-md text-label-md text-primary">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Thông báo"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          </div>
        </header>
        <main className="min-h-screen bg-surface pt-16">{children}</main>
      </div>
    </div>
  );
}
