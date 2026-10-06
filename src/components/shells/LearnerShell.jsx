import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getSession } from '../../auth/session.js';
import { displayName, learnerRoleLabel, useLearnerProfile } from '../../hooks/useLearnerHome.js';
import { LEARNER_NAV, pathMatches } from './navConfig.js';

const SIDEBAR_W = 280;
const RIKI_MENU_KEY = 'rikipath.rikiMenuOpen';

function navClass(active) {
  return [
    'rp-nav-item group/nav flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-left transition-all',
    active ? 'rp-nav-item-active' : 'text-[#6F6669] hover:bg-white hover:text-[#2D282A]',
  ].join(' ');
}

function NavIcon({ name, active, glyph }) {
  return (
    <span
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[18px] transition-colors',
        active ? 'bg-[#ffd9e4] text-[#D94B68]' : 'bg-[#FFF8F8] text-[#A59B9E] group-hover/nav:bg-[#fff0f5] group-hover/nav:text-[#D94B68]',
      ].join(' ')}
    >
      {glyph ? <span className="font-jp text-[15px] font-semibold leading-none">{glyph}</span> : <span className="material-symbols-outlined text-[20px]">{name}</span>}
    </span>
  );
}

function NavCopy({ label, hint, active }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={['block truncate text-[14px] leading-5 tracking-normal', active ? 'font-bold text-[#9E2A4B]' : 'font-semibold'].join(' ')}>
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

export default function LearnerShell({
  children,
  pathname,
  breadcrumb = 'Cổng học tập',
  searchPlaceholder = 'Tìm kiếm giáo trình, kanji, bài giảng...',
}) {
  const { logout } = useAuth();
  const session = getSession();
  const profileQuery = useLearnerProfile();
  const userName = displayName(profileQuery.data, session);
  const userRole = learnerRoleLabel(profileQuery.data, session);
  const avatarUrl = profileQuery.data?.avatarUrl;
  const sessionRole = session?.role || session?.user?.role;
  const isLearner = !sessionRole || ['learner', 'student'].includes(String(sessionRole).toLowerCase());
  const rikiItem = LEARNER_NAV.items.find((item) => item.id === 'riki');
  const rikiActive = rikiItem?.children?.some((child) => (
    child.children?.some((nested) => pathMatches(pathname, nested)) || pathMatches(pathname, child)
  )) ?? false;
  const [isRikiOpen, setIsRikiOpen] = useState(() => {
    try {
      return localStorage.getItem(RIKI_MENU_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const rikiMenuOpen = isRikiOpen || rikiActive;

  useEffect(() => {
    try {
      localStorage.setItem(RIKI_MENU_KEY, String(isRikiOpen));
    } catch {
      // Ignore storage restrictions; the menu remains usable for this session.
    }
  }, [isRikiOpen]);

  const groups = LEARNER_NAV.groups || [{ id: 'all', label: null }];

  const renderLeaf = (item) => {
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
      <NavLink key={item.to || item.label} to={item.to} end={item.end} className={navClass(active)}>
        <NavIcon name={item.icon} active={active} />
        <NavCopy label={item.label} hint={item.hint} active={active} />
      </NavLink>
    );
  };

  const renderRiki = (item) => {
    const active = item.children.some((child) => (
      child.children?.some((nested) => pathMatches(pathname, nested)) || pathMatches(pathname, child)
    ));
    return (
      <div key={item.id || item.label} className="space-y-1">
        <button
          type="button"
          onClick={() => setIsRikiOpen((open) => !open)}
          aria-expanded={rikiMenuOpen}
          className={navClass(active)}
        >
          <NavIcon name={item.icon} active={active} />
          <NavCopy label={item.label} hint={item.hint} active={active} />
          <span className="material-symbols-outlined pr-1 text-[18px] text-[#A59B9E]">
            {rikiMenuOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {rikiMenuOpen && (
          <div className="ml-4 space-y-1 border-l border-[#dfbfc1]/40 pl-3">
            {item.children.map((child) => {
              const childActive = child.children
                ? child.children.some((nested) => pathMatches(pathname, nested))
                : pathMatches(pathname, child);
              if (child.children) {
                return (
                  <div key={child.id || child.label} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-bold text-[#8A8084]">
                      <span className="material-symbols-outlined text-[16px]">{child.icon}</span>
                      <span>{child.label}</span>
                    </div>
                    {child.children.map((nested) => {
                      const nestedActive = pathMatches(pathname, nested);
                      return (
                        <NavLink key={nested.to} to={nested.to} className={navClass(nestedActive)}>
                          <NavIcon glyph={nested.icon} active={nestedActive} />
                          <NavCopy label={nested.label} active={nestedActive} />
                        </NavLink>
                      );
                    })}
                  </div>
                );
              }
              return (
                <NavLink key={child.to} to={child.to} className={navClass(childActive)}>
                  {child.icon?.length <= 2
                    ? <NavIcon glyph={child.icon} active={childActive} />
                    : <NavIcon name={child.icon} active={childActive} />}
                  <NavCopy label={child.label} active={childActive} />
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-[#2D282A]" data-shell="learner">
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto px-4 py-5"
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-white">
            <span className="material-symbols-outlined text-[22px]">local_florist</span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[18px] font-extrabold tracking-tight text-[#2D282A]">
              {LEARNER_NAV.brand.title}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A59B9E]">
              {LEARNER_NAV.brand.subtitle}
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6">
          {groups.map((group) => {
            const items = LEARNER_NAV.items.filter((item) => {
              if (item.id === 'riki' && !isLearner) return false;
              return !group.id || group.id === 'all' || item.group === group.id;
            });
            if (!items.length) return null;
            return (
              <div key={group.id}>
                {group.label ? (
                  <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">
                    {group.label}
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  {items.map((item) => (item.children ? renderRiki(item) : renderLeaf(item)))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="rp-catalog-card mt-6 flex items-center gap-3 rounded-[22px] p-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#D94B68]">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold text-[#2D282A]">{userName}</div>
            <div className="truncate text-[11px] font-medium text-[#A59B9E]">{userRole}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#A59B9E] hover:bg-[#fff0f5] hover:text-[#D94B68]"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0" style={{ paddingLeft: SIDEBAR_W }}>
        <header
          className="fixed top-0 right-0 z-40 flex h-[72px] items-center justify-between gap-4 px-6 sm:px-8"
          style={{ left: SIDEBAR_W }}
        >
          <div className="hidden min-w-0 items-center gap-2 text-[13px] text-[#8A8084] sm:flex">
            <span>Học tập</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="truncate font-bold text-[#2D282A]">{breadcrumb}</span>
          </div>
          <div className="mx-0 max-w-md flex-1 sm:mx-6">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-[18px] text-[#A59B9E]">search</span>
              <input
                className="h-11 w-full rounded-full border border-[#dfbfc1]/50 bg-white pl-11 pr-4 text-[13px] text-[#2D282A] shadow-sm placeholder:text-[#C4B8BA] focus:outline-none focus:ring-2 focus:ring-[#D94B68]/20"
                placeholder={searchPlaceholder}
                type="text"
              />
            </div>
          </div>
          <button
            type="button"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dfbfc1]/45 bg-white text-[#6F6669] shadow-sm hover:text-[#D94B68]"
            aria-label="Thông báo"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D94B68]" />
          </button>
        </header>
        <main className="min-h-screen pt-[72px]">{children}</main>
      </div>
    </div>
  );
}
