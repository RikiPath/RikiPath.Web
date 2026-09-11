import { NavLink } from 'react-router-dom';
import { ADMIN_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 260;

function Item({ item, pathname, end }) {
  if (item.neverActive) {
    return (
      <div className="flex items-center border-l-4 border-transparent px-4 py-3 text-on-surface-variant/70">
        <span className="material-symbols-outlined mr-3">{item.icon}</span>
        <span className="font-body-md text-body-md">{item.label}</span>
      </div>
    );
  }
  const active = pathMatches(pathname, { ...item, end: end ?? item.end });
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={[
        'flex items-center border-l-4 px-4 py-3 transition-colors duration-150',
        active
          ? 'border-primary bg-surface-container/70 font-bold text-primary opacity-95'
          : 'border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
      ].join(' ')}
    >
      <span className={`material-symbols-outlined mr-3 ${active ? 'text-primary' : ''}`}>
        {item.icon}
      </span>
      <span className={`font-body-md text-body-md ${active ? 'font-semibold text-primary' : ''}`}>
        {item.label}
      </span>
    </NavLink>
  );
}

export default function AdminShell({ children, pathname, breadcrumb = 'Tổng quan' }) {
  return (
    <div
      className="flex min-h-screen overflow-hidden bg-background text-on-background"
      data-shell="admin"
    >
      <nav
        className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border-subtle bg-surface-container-lowest py-4"
        style={{ width: SIDEBAR_W }}
      >
        <div className="mb-6 px-4">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">
            {ADMIN_NAV.brand.title}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {ADMIN_NAV.brand.subtitle}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {ADMIN_NAV.items.map((item) => (
            <Item key={item.label} item={item} pathname={pathname} />
          ))}
        </div>
        <div className="mt-auto border-t border-border-subtle pt-4">
          {ADMIN_NAV.footerItems.map((item) => (
            <Item key={item.label} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      <div className="flex h-screen flex-1 flex-col overflow-hidden" style={{ marginLeft: SIDEBAR_W }}>
        <header className="z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-8">
          <div className="flex items-center font-body-sm text-body-sm text-on-surface-variant">
            <span>RikiPath Admin</span>
            <span className="material-symbols-outlined mx-1 text-[16px] text-outline">
              chevron_right
            </span>
            <span className="font-semibold text-primary">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <span className="material-symbols-outlined cursor-pointer hover:text-primary">
              notifications
            </span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary">help</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-primary">
              settings
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-surface-container-low/40">{children}</main>
        <footer className="shrink-0 border-t border-border-subtle bg-surface px-8 py-3 text-center font-body-sm text-body-sm text-on-surface-variant">
          © 2026 RikiPath Admin
        </footer>
      </div>
    </div>
  );
}
