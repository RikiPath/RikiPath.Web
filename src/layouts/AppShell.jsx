import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Target,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import BrandMark from '@/components/brand/BrandMark.jsx';
import LanguageSwitch from '@/components/brand/LanguageSwitch.jsx';
import { useLocale } from '@/locales/locale.js';
import NotificationCenter from '@/features/notifications/components/NotificationCenter.jsx';
import HeaderCalendarPopover from '@/features/calendar/components/HeaderCalendarPopover.jsx';
import BackHomeLink from '@/components/brand/BackHomeLink.jsx';
import { Drawer, FEATURE_TONES, IconButton, Modal, OfflineBanner, Popover, Tooltip, cx } from '@/components/ui';
import { ROLE_NAV, buildBreadcrumbs, flattenNavItems, isNavItemActive } from './appNav.js';
import { StudyUnlockProvider } from '@/features/entitlements/components/StudyUnlock.jsx';
import { LOCK_REASON, useStudyUnlock } from '@/features/entitlements/studyUnlock.js';
import { useAtmosphere } from '@/features/atmosphere/useAtmosphere.js';
import AtmosphericSky from '@/features/atmosphere/components/AtmosphericSky.jsx';
import WeatherHeaderControl from '@/features/atmosphere/components/WeatherHeaderControl.jsx';
import '@/features/atmosphere/atmosphere.css';

const COLLAPSE_KEY = 'rp.sidebar.collapsed';

const ROLE_LABEL = { Learner: 'Học viên', Mentor: 'Giáo viên', ContentAuthor: 'Tác giả nội dung', Admin: 'Quản trị viên' };

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ Sidebar */

/**
 * Locked variant (Smart Feature Lock): same footprint as a normal item, label stays readable but quieter,
 * a small lock-keyhole at the end, no icon tilt, and a click opens the contextual unlock dialog instead of
 * navigating. Only rendered when the Backend has *confirmed* the learner lacks the entitlement.
 */
function LockedNavItem({ item, active, collapsed, onLockedClick, tr }) {
  const Icon = item.icon;
  const label = tr(item.label);
  const reason = tr(LOCK_REASON);
  const button = (
    <button
      type="button"
      onClick={() => onLockedClick(item)}
      aria-haspopup="dialog"
      aria-current={active ? 'page' : undefined}
      aria-label={`${label} — ${reason}`}
      data-locked="true"
      className={cx(
        'rp-focus rp-nav-locked group relative flex items-center rounded-xl rp-type-nav text-rp-text transition-[background-color,opacity] duration-150',
        collapsed ? 'mx-auto h-10 w-10 justify-center p-0' : 'min-h-10 w-full gap-3 px-2.5 py-1 text-left',
        active ? 'bg-rp-muted font-semibold' : 'font-medium hover:bg-rp-muted/50',
      )}
    >
      {active && !collapsed && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-rp-text-disabled" />}
      <span
        aria-hidden="true"
        data-tone={item.tone || 'neutral'}
        className="rp-nav-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {collapsed ? (
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rp-surface text-rp-text-muted shadow-rp-xs ring-1 ring-rp-line">
          <LockKeyhole className="h-2.5 w-2.5" />
        </span>
      ) : (
        <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
      )}
    </button>
  );
  return (
    <Tooltip
      side="right"
      fullWidth
      content={collapsed ? (<><span className="block font-semibold">{label}</span><span className="block opacity-85">{reason}</span></>) : reason}
    >
      {button}
    </Tooltip>
  );
}

function NavItem({ item, active, collapsed, onNavigate, tr, lockState = 'open', onLockedClick }) {
  const Icon = item.icon;
  const label = tr(item.label);
  if (lockState === 'locked' && onLockedClick) {
    return (
      <LockedNavItem
        item={item}
        active={active}
        collapsed={collapsed}
        tr={tr}
        onLockedClick={(target) => {
          onNavigate?.(); // close the mobile drawer first so only one dialog traps focus
          onLockedClick(target);
        }}
      />
    );
  }
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cx(
        'rp-focus rp-interactive group relative flex items-center rounded-xl rp-type-nav transition-all duration-150',
        collapsed
          ? 'mx-auto h-10 w-10 justify-center p-0'
          : 'min-h-10 w-full gap-3 px-2.5 py-1',
        active
          ? collapsed
            ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border shadow-rp-xs'
            : 'bg-rp-brand-tint/90 font-semibold text-rp-brand-strong shadow-rp-xs'
          : 'font-medium text-rp-text hover:bg-rp-muted/50',
      )}
    >
      {active && !collapsed && (
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-rp-brand" />
      )}
      <span
        aria-hidden="true"
        data-tone={item.tone || 'neutral'}
        className={cx(
          // Tile colours come from `.rp-nav-tile[data-tone]` (tokens.css): deeper glyph + richer pastel than FEATURE_TONES.
          'rp-nav-tile rp-icon-tilt flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
          // Active: the tile turns solid in its own feature colour (bg-current) with a white glyph.
          active && 'rp-nav-tile-active bg-current',
        )}
      >
        <Icon className={cx('h-[17px] w-[17px]', active && 'text-white')} />
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{tr(label)}</span>}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={label} side="right" fullWidth>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function CollapsedBranchFlyout({ item, anchorRect, pathname, search, tr, onNavigate, onClose, lockStateFor, onLockedClick }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!anchorRect || typeof document === 'undefined') return null;
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - 320 : anchorRect.top;
  const top = Math.max(12, Math.min(anchorRect.top - 8, maxTop));
  const left = anchorRect.right + 10;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={tr(item.label)}
      style={{ top, left }}
      className="rp-anim-pop fixed z-[140] w-60 rounded-2xl border border-rp-line bg-rp-surface p-2 shadow-rp-pop"
    >
      {item.to ? (
        <NavLink
          to={item.to}
          end
          onClick={() => {
            onClose();
            onNavigate?.();
          }}
          className="rp-focus flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold uppercase tracking-[0.06em] text-rp-brand-strong hover:bg-rp-brand-tint/60"
        >
          <span className="truncate">{tr(item.label)}</span>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </NavLink>
      ) : (
        <p className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-rp-text-muted">{tr(item.label)}</p>
      )}
      <ul className="mt-1 space-y-0.5 border-t border-rp-line/80 pt-1.5">
        {item.children.map((child) => {
          const childActive = isNavItemActive(child, pathname, search);
          const locked = lockStateFor(child) === 'locked' && onLockedClick;
          const ChildIcon = child.icon;
          if (locked) {
            return (
              <li key={child.to}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onNavigate?.();
                    onLockedClick(child);
                  }}
                  className="rp-focus flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-rp-text-muted hover:bg-rp-muted/60"
                >
                  <ChildIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
                  <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                </button>
              </li>
            );
          }
          return (
            <li key={child.to}>
              <NavLink
                to={child.to}
                role="menuitem"
                onClick={() => {
                  onClose();
                  onNavigate?.();
                }}
                className={cx(
                  'rp-focus flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors',
                  childActive
                    ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong'
                    : 'font-medium text-rp-text-2 hover:bg-rp-muted/65 hover:text-rp-text',
                )}
              >
                <ChildIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}

function HierarchicalNavItem({
  item,
  pathname,
  search,
  collapsed,
  expanded,
  onToggleExpand,
  onNavigate,
  tr,
  lockStateFor,
  onLockedClick,
}) {
  const Icon = item.icon;
  const label = tr(item.label);
  const subId = useId();
  const branchActive = isNavItemActive(item, pathname, search);
  const selfActive = item.to ? pathname.replace(/\/+$/, '') === item.to : false;
  const isOpen = Boolean(expanded);

  const [flyoutRect, setFlyoutRect] = useState(null);
  const btnRef = useRef(null);

  if (collapsed) {
    return (
      <>
        <Tooltip content={label} side="right" fullWidth>
          <button
            ref={btnRef}
            type="button"
            aria-expanded={Boolean(flyoutRect)}
            aria-haspopup="menu"
            aria-label={label}
            onClick={() => {
              if (flyoutRect) {
                setFlyoutRect(null);
              } else {
                setFlyoutRect(btnRef.current?.getBoundingClientRect() || { top: 120, right: 76 });
              }
            }}
            className={cx(
              'rp-focus rp-interactive group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl p-0 transition-all duration-150',
              branchActive
                ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border shadow-rp-xs'
                : 'font-medium text-rp-text hover:bg-rp-muted/50',
            )}
          >
            <span
              aria-hidden="true"
              data-tone={item.tone || 'neutral'}
              className={cx(
                'rp-nav-tile rp-icon-tilt flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
                branchActive && 'rp-nav-tile-active bg-current',
              )}
            >
              <Icon className={cx('h-[17px] w-[17px]', branchActive && 'text-white')} />
            </span>
          </button>
        </Tooltip>
        {flyoutRect && (
          <CollapsedBranchFlyout
            item={item}
            anchorRect={flyoutRect}
            pathname={pathname}
            search={search}
            tr={tr}
            onNavigate={onNavigate}
            onClose={() => setFlyoutRect(null)}
            lockStateFor={lockStateFor}
            onLockedClick={onLockedClick}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isOpen}
        aria-controls={subId}
        className={cx(
          'rp-focus rp-interactive group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-1 text-left rp-type-nav transition-colors duration-150',
          branchActive
            ? 'bg-rp-brand-tint/85 font-semibold text-rp-brand-strong shadow-rp-xs'
            : 'font-medium text-rp-text hover:bg-rp-muted/50',
        )}
      >
        {(selfActive || (branchActive && !isOpen)) && (
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-rp-brand" />
        )}
        <span
          aria-hidden="true"
          data-tone={item.tone || 'neutral'}
          className={cx(
            'rp-nav-tile rp-icon-tilt flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
            branchActive && 'rp-nav-tile-active bg-current',
          )}
        >
          <Icon className={cx('h-[17px] w-[17px]', branchActive && 'text-white')} />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cx(
            'mr-0.5 h-4 w-4 shrink-0 text-rp-text-muted transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        id={subId}
        inert={!isOpen || undefined}
        className={cx(
          'grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cx(
              'pt-1 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              isOpen ? 'translate-y-0' : '-translate-y-1.5',
            )}
          >
            <ul className="ml-[21px] space-y-0.5 border-l-2 border-rp-line/85 py-0.5 pl-3">
              {item.children.map((child) => {
                const childActive = isNavItemActive(child, pathname, search);
                const ChildIcon = child.icon;
                const locked = lockStateFor(child) === 'locked' && onLockedClick;
                if (locked) {
                  return (
                    <li key={child.to}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate?.();
                          onLockedClick(child);
                        }}
                        className="rp-focus flex min-h-8.5 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-rp-text-muted hover:bg-rp-muted/65 hover:text-rp-text-2"
                      >
                        <ChildIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
                        <LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={child.to}>
                    <NavLink
                      to={child.to}
                      onClick={onNavigate}
                      aria-current={childActive ? 'page' : undefined}
                      className={cx(
                        'rp-focus relative flex min-h-8.5 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors duration-150',
                        childActive
                          ? 'bg-rp-brand-tint/90 font-semibold text-rp-brand-strong shadow-rp-xs'
                          : 'font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text',
                      )}
                    >
                      <ChildIcon
                        aria-hidden="true"
                        className={cx('h-3.5 w-3.5 shrink-0', childActive ? 'text-rp-brand-strong' : 'text-rp-text-muted')}
                      />
                      <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Each page renders its own shell, so the sidebar remounts on every navigation. Its scroll offset is kept per role
// (memory for in-app navigation, sessionStorage for reloads) and restored before paint, so clicking a nav item only
// changes the page body — the sidebar stays exactly where the learner left it.
const sidebarScrollMemory = new Map();
const SIDEBAR_SCROLL_KEY = 'rp.sidebar.scroll.';

function readSidebarScroll(key) {
  if (sidebarScrollMemory.has(key)) return sidebarScrollMemory.get(key);
  try {
    const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY + key));
    return Number.isFinite(saved) ? saved : 0;
  } catch {
    return 0;
  }
}

function useSidebarScrollMemory(ref, key, enabled) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    el.scrollTop = readSidebarScroll(key);
    let frame = 0;
    const save = () => {
      sidebarScrollMemory.set(key, el.scrollTop);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(SIDEBAR_SCROLL_KEY + key, String(Math.round(el.scrollTop)));
        } catch {
          /* preference only */
        }
      });
    };
    el.addEventListener('scroll', save, { passive: true });
    return () => {
      sidebarScrollMemory.set(key, el.scrollTop);
      el.removeEventListener('scroll', save);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, key, enabled]);
}

const lastVisitedNavRoute = new Map();

function loadExpandedBranches(nav, storageKey, roleKey, pathname, search) {
  const map = {};
  nav.groups.forEach((g) => {
    g.items.forEach((item) => {
      if (item.children?.length) {
        map[item.id || item.label] = item.defaultOpen !== false;
      }
    });
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) Object.assign(map, JSON.parse(saved));
  } catch {
    /* ignore */
  }

  const prev = lastVisitedNavRoute.get(roleKey);
  if (prev) {
    let updated = false;
    nav.groups.forEach((g) => {
      g.items.forEach((item) => {
        if (!item.children?.length) return;
        const key = item.id || item.label;
        const wasInBranch = isNavItemActive(item, prev.pathname, prev.search);
        const nowInBranch = isNavItemActive(item, pathname, search);
        if (!wasInBranch && nowInBranch && !map[key]) {
          map[key] = true;
          updated = true;
        }
      });
    });
    if (updated) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(map));
      } catch {
        /* ignore */
      }
    }
  }

  return map;
}

function SidebarNav({ roleKey, collapsed, onNavigate, rememberScroll = false }) {
  const navRef = useRef(null);
  useSidebarScrollMemory(navRef, `${roleKey}.${collapsed ? 'rail' : 'full'}`, rememberScroll);
  const { pathname, search } = useLocation();
  const { tr } = useLocale();
  const nav = ROLE_NAV[roleKey];
  const unlock = useStudyUnlock();
  const storageKey = `rp.nav.expanded.${roleKey}`;

  const [expandedMap, setExpandedMap] = useState(() =>
    loadExpandedBranches(nav, storageKey, roleKey, pathname, search),
  );

  useEffect(() => {
    lastVisitedNavRoute.set(roleKey, { pathname, search });
  }, [roleKey, pathname, search]);

  const toggleExpanded = (branchKey) => {
    setExpandedMap((prev) => {
      const next = { ...prev, [branchKey]: !(prev[branchKey] ?? true) };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // loading / error → 'unknown' → rendered as a normal item (no lock flash, no false paywall).
  const lockStateFor = (item) => (unlock ? unlock.access.lockStateFor(item.to) : 'open');
  const onLockedClick = unlock ? (item) => unlock.requestUnlock(item.to, item.label) : undefined;
  return (
    <nav
      ref={navRef}
      aria-label={tr('Điều hướng chính')}
      className={cx('rp-sidebar-scroll min-h-0 flex-1 py-3', collapsed ? 'px-2' : 'px-3')}
    >
      {nav.groups.map((group) => {
        const singleBranchSameLabel =
          group.items.length === 1 &&
          group.items[0].children?.length &&
          group.items[0].label === group.label;
        return (
        <div key={group.label} className={collapsed ? 'mb-2.5' : 'mb-3.5'}>
          {!collapsed ? (
            !singleBranchSameLabel && (
              <p className="mb-1.5 truncate px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-rp-text-muted">
                {tr(group.label)}
              </p>
            )
          ) : (
            <span aria-hidden="true" className="mx-auto mb-2 block h-px w-6 bg-rp-line" />
          )}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.to || item.id || item.label} className={collapsed ? 'flex justify-center' : undefined}>
                {item.children?.length ? (
                  <HierarchicalNavItem
                    item={item}
                    pathname={pathname}
                    search={search}
                    collapsed={collapsed}
                    expanded={expandedMap[item.id || item.label] ?? item.defaultOpen !== false}
                    onToggleExpand={() => toggleExpanded(item.id || item.label)}
                    onNavigate={onNavigate}
                    tr={tr}
                    lockStateFor={lockStateFor}
                    onLockedClick={onLockedClick}
                  />
                ) : (
                  <NavItem
                    item={item}
                    active={isNavItemActive(item, pathname, search)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                    tr={tr}
                    lockState={lockStateFor(item)}
                    onLockedClick={onLockedClick}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
        );
      })}
    </nav>
  );
}

function Brand({ to, collapsed, area }) {
  return (
    <Link
      to={to}
      aria-label={`RikiPath — ${area}`}
      data-collapsed={collapsed ? 'true' : undefined}
      className={cx(
        'rp-focus rp-interactive group flex min-w-0 items-center rounded-xl transition-colors',
        collapsed ? 'h-10 w-10 justify-center p-0' : 'gap-2.5 px-1 py-0.5',
      )}
    >
      <BrandMark className={cx('rp-icon-tilt', collapsed ? 'h-8 w-8' : 'h-9 w-11')} />
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          {/* Role name is not shown under the wordmark (any role); it stays in the link's accessible name. */}
          <span className="block text-[17px] font-bold tracking-[-0.02em] text-rp-text">RikiPath</span>
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ Profile menu */

function ProfileMenu({ roleKey }) {
  const { user, primaryRole, logout } = useAuth();
  const { tr } = useLocale();
  const name = user?.fullName || user?.name || user?.email || tr('Tài khoản');
  const initial = String(name).trim().charAt(0).toUpperCase() || 'R';
  const role = ROLE_LABEL[primaryRole] || primaryRole;
  const links = [
    ...(roleKey === 'Learner'
      ? [
          { to: '/settings', label: 'Tài khoản của tôi', icon: Settings },
          { to: '/onboarding', label: 'Mục tiêu học tập', icon: Target },
        ]
      : []),
    ...(roleKey === 'Mentor' ? [{ to: '/mentor-profile', label: 'Hồ sơ chuyên môn', icon: UserRound }] : []),
    { to: '/change-password', label: 'Đổi mật khẩu', icon: KeyRound },
  ];
  return (
    <Popover
      label={tr('Tài khoản')}
      panelClassName="w-64"
      trigger={({ toggle, props, open }) => (
        <button
          {...props}
          type="button"
          onClick={toggle}
          aria-label={`${tr('Tài khoản')}: ${name}`}
          className="rp-focus flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-1 transition-colors hover:border-rp-line hover:bg-rp-surface/90 md:pr-2.5"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-rp-line" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-rp-brand-tint text-[13px] font-bold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border">
              {initial}
            </span>
          )}
          <span className="hidden max-w-[148px] text-left leading-tight md:block">
            <span className="block truncate text-[13px] font-semibold text-rp-text">{name}</span>
            <span className="block truncate text-[11px] text-rp-text-muted">{tr(role)}</span>
          </span>
          <ChevronDown aria-hidden="true" className={cx('h-4 w-4 text-rp-text-muted transition-transform duration-150', open && 'rotate-180')} />
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="border-b border-rp-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-rp-text">{name}</p>
            {user?.email && <p className="truncate text-xs text-rp-text-muted">{user.email}</p>}
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-brand">{tr(role)}</p>
          </div>
          <ul className="p-1.5">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={close} className="rp-focus group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-rp-text-2 hover:bg-rp-muted hover:text-rp-text">
                  <l.icon aria-hidden="true" className="rp-icon-tilt h-4 w-4" /> {tr(l.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-rp-line p-1.5">
            <button
              type="button"
              onClick={() => {
                close();
                logout();
              }}
              className="rp-focus flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-rp-danger hover:bg-rp-danger-bg"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" /> {tr('Đăng xuất')}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/* ------------------------------------------------------------------ Quick Jump (Ctrl+K) */

function QuickJumpModal({ open, onClose, groups, tr }) {
  const navigate = useNavigate();
  const unlock = useStudyUnlock();
  const isLocked = (item) => Boolean(unlock) && unlock.access.lockStateFor(item.to) === 'locked';
  const go = (item) => {
    if (isLocked(item)) {
      handleClose();
      unlock.requestUnlock(item.to, item.label);
      return;
    }
    navigate(item.to);
    handleClose();
  };
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => {
        const groupLabel = tr(g.label).toLowerCase();
        const uniqueByTo = new Map();
        for (const item of flattenNavItems(g.items)) {
          if (!item.to) continue;
          // Prefer leaf item when a hierarchical branch shares the exact route with a child item.
          if (!item.children?.length || !uniqueByTo.has(item.to)) {
            uniqueByTo.set(item.to, item);
          }
          if (!item.children?.length) {
            uniqueByTo.set(item.to, item);
          }
        }
        return {
          label: tr(g.label),
          items: [...uniqueByTo.values()].filter((i) => {
            if (!q) return true;
            if (tr(i.label).toLowerCase().includes(q) || i.to.toLowerCase().includes(q) || groupLabel.includes(q)) return true;
            return Array.isArray(i.keywords) && i.keywords.some((kw) => tr(kw).toLowerCase().includes(q) || kw.toLowerCase().includes(q));
          }),
        };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query, tr]);

  const firstItem = filtered[0]?.items[0] || null;
  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={tr('Chuyển nhanh đến chức năng')} size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (firstItem) go(firstItem);
        }}
      >
        <label className="relative block">
          <span className="sr-only">{tr('Tìm trang trong RikiPath')}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr('Nhập tên trang (ví dụ: Lộ trình, Từ vựng, Lớp nhóm...)')}
            className="h-11 w-full rounded-rp-input border border-rp-line bg-rp-bg-2 pl-10 pr-4 text-sm text-rp-text placeholder:text-rp-text-muted focus:border-rp-brand focus:bg-rp-surface focus:outline-none focus:shadow-[0_0_0_3px_rgba(224,90,122,0.16)]"
          />
        </label>
      </form>
      <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-text-muted">{tr('Không tìm thấy mục phù hợp trong vai trò hiện tại.')}</p>
        ) : (
          filtered.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{tr(g.label)}</p>
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const tone = FEATURE_TONES[item.tone] || FEATURE_TONES.neutral;
                  const Icon = item.icon;
                  const locked = isLocked(item);
                  return (
                    <li key={item.to}>
                      <button
                        type="button"
                        onClick={() => go(item)}
                        aria-haspopup={locked ? 'dialog' : undefined}
                        aria-label={locked ? `${tr(item.label)} — ${tr(LOCK_REASON)}` : undefined}
                        title={locked ? tr(LOCK_REASON) : undefined}
                        className={cx(
                          'rp-focus group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium',
                          locked ? 'text-rp-text-muted hover:bg-rp-muted/75 hover:text-rp-text-2' : 'rp-interactive text-rp-text hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong',
                        )}
                      >
                        <span aria-hidden="true" className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.bg, tone.fg, locked ? 'opacity-75 saturate-[0.55]' : 'rp-icon-tilt')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{tr(item.label)}</span>
                        {locked && <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Breadcrumbs */

function Breadcrumbs({ trail }) {
  const { tr } = useLocale();
  if (!trail.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 overflow-hidden md:block">
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden text-[13px]">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className={cx('flex min-w-0 items-center gap-1', !last && 'max-w-[160px] shrink')}>
              {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-disabled" />}
              {crumb.to && !last ? (
                <Link to={crumb.to} className="rp-focus truncate rounded text-rp-text-muted transition-colors hover:text-rp-brand-strong">{tr(crumb.label)}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cx('truncate', last ? 'font-semibold text-rp-text' : 'text-rp-text-muted')}>{tr(crumb.label)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ Shell */

/**
 * Unified app shell for Learner, Mentor, Content Author and Admin.
 * Desktop: smooth collapsible sidebar with centered collapsed icons & portal tooltips.
 * < lg: focus-trapped mobile/tablet navigation drawer.
 */
export default function AppShell({ roleKey = 'Learner', breadcrumb, searchValue, onSearchChange, searchPlaceholder = 'Tìm kiếm…', headerActions, children }) {
  const { pathname, search } = useLocation();
  const { tr } = useLocale();
  const nav = ROLE_NAV[roleKey] || ROLE_NAV.Learner;
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // Preference only; ignore storage failures.
    }
  }, [collapsed]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The area root ("Học viên", "Mentor"…) is already named in the brand pill, so the header trail starts below it.
  const trail = useMemo(() => buildBreadcrumbs(roleKey, pathname, search, breadcrumb).slice(1), [roleKey, pathname, search, breadcrumb]);
  const area = tr(nav.area);
  const toggleLabel = collapsed ? tr('Mở rộng thanh bên') : tr('Thu gọn thanh bên');
  const atmosphere = useAtmosphere(roleKey);
  const skyOn = atmosphere.prefs.mode !== 'off';

  return (
    <StudyUnlockProvider>
    <div
      data-shell={roleKey.toLowerCase()}
      data-paper={roleKey === 'Learner' ? 'learner' : 'quiet'}
      data-sky={skyOn ? 'on' : 'off'}
      data-sky-period={skyOn ? atmosphere.scene.period : undefined}
      className="rp-paper-bg min-h-screen text-rp-text"
    >
      <a href="#rp-main" className="sr-only z-[200] rounded-lg bg-rp-surface px-4 py-2 font-semibold text-rp-brand-strong shadow-rp-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {tr('Bỏ qua điều hướng')}
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label={area}
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cx(
          // Starts under the full-width sky header (brand lives in the header, like a top app bar).
          'rp-shell-sidebar fixed bottom-0 left-0 top-[var(--spacing-rp-topbar)] z-40 hidden flex-col border-r border-rp-line bg-rp-surface transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
          collapsed ? 'w-[var(--spacing-rp-sidebar-collapsed)]' : 'w-[var(--spacing-rp-sidebar)]',
        )}
      >
        {/* Collapse handle: an edge tab on the sidebar's right border, vertically centred. */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          className="rp-focus hidden h-[38px] w-5 items-center justify-center rounded-r-lg border border-l-0 border-rp-line bg-rp-surface text-rp-brand-strong shadow-[2px_2px_7px_rgba(22,40,60,0.09)] transition-colors duration-150 hover:bg-rp-brand-tint hover:text-rp-brand-pressed lg:absolute lg:left-full lg:top-1/2 lg:z-50 lg:flex lg:-translate-y-1/2"
        >
          {collapsed ? <ChevronRight aria-hidden="true" strokeWidth={2.5} className="h-[15px] w-[15px]" /> : <ChevronLeft aria-hidden="true" strokeWidth={2.5} className="h-[15px] w-[15px]" />}
        </button>

        <SidebarNav roleKey={roleKey} collapsed={collapsed} rememberScroll />

        <div className={cx('shrink-0 border-t border-rp-line p-2', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <Tooltip content={toggleLabel} side="right" fullWidth>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label={toggleLabel}
                aria-expanded={false}
                className="rp-focus mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-rp-text-muted transition-colors hover:bg-rp-muted hover:text-rp-text"
              >
                <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={toggleLabel}
              aria-expanded={true}
              className="rp-focus flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-[13px] font-medium text-rp-text-muted transition-colors hover:bg-rp-muted hover:text-rp-text"
            >
              <PanelLeftClose aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{tr('Thu gọn')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile / tablet drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left" width="w-[min(300px,88vw)]" title={area}>
        <div className="flex min-h-full flex-col">
          <SidebarNav roleKey={roleKey} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          <div className="shrink-0 space-y-2 border-t border-rp-line p-3 sm:hidden">
            {typeof onSearchChange !== 'function' && (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setQuickOpen(true);
                }}
                className="rp-focus flex min-h-[var(--rp-tap-min)] w-full items-center gap-2.5 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-left text-sm font-medium text-rp-text-2 hover:border-rp-brand-border hover:text-rp-text"
              >
                <Search aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
                <span className="truncate">{tr('Tìm nhanh…')}</span>
              </button>
            )}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2">
              <span className="text-xs font-semibold text-rp-text-muted">{tr('Trang chủ')}</span>
              <BackHomeLink />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2">
              <span className="text-xs font-semibold text-rp-text-muted">{tr('Ngôn ngữ')}</span>
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </Drawer>

      {/* Full-width sky header (spans above the sidebar too) */}
      <header
        data-role={roleKey.toLowerCase()}
        data-sky={skyOn ? 'on' : 'off'}
        data-sky-tone={skyOn && atmosphere.scene.isDark ? 'dark' : 'light'}
        className="rp-header-ambient rp-sky-header sticky top-0 z-[45] flex h-[var(--spacing-rp-topbar)] items-center gap-1 border-b border-rp-line bg-rp-surface/92 px-2.5 backdrop-blur-md sm:gap-2.5 sm:px-[var(--rp-space-page-x)] lg:pl-3"
      >
        {skyOn && (
          <AtmosphericSky
            scene={atmosphere.scene}
            intensity={atmosphere.effectiveIntensity}
            decoration={atmosphere.decoration}
            reducedMotion={atmosphere.reducedMotion}
          />
        )}
        <IconButton icon={Menu} label={tr('Mở menu')} onClick={() => setDrawerOpen(true)} className="lg:hidden" />
        <div className="shrink-0 lg:hidden">
          <Brand to={nav.home} collapsed area={area} />
        </div>
        {/* Desktop: brand pill sits in the sky bar above the sidebar column (width follows the sidebar). */}
        <div
          className={cx(
            'hidden shrink-0 items-center transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
            collapsed ? 'w-[calc(var(--spacing-rp-sidebar-collapsed)-0.75rem)] justify-center' : 'w-[calc(var(--spacing-rp-sidebar)-0.75rem)]',
          )}
        >
          <div className="rp-header-brand">
            <Brand to={nav.home} collapsed={collapsed} area={area} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <Breadcrumbs trail={trail} />
        </div>
        {typeof onSearchChange === 'function' ? (
          <>
            <IconButton
              icon={Search}
              label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              onClick={() => setQuickOpen(true)}
              className="xl:hidden"
            />
            <label className="relative hidden w-[220px] transition-[width] duration-200 focus-within:w-[280px] xl:block">
              <span className="sr-only">{tr(searchPlaceholder)}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={tr(searchPlaceholder)}
                className="h-9 w-full rounded-full border border-rp-line bg-rp-surface/90 pl-9 pr-3 text-[13px] text-rp-text placeholder:text-rp-text-muted transition-[border-color,box-shadow,background-color] focus:border-rp-brand focus:bg-rp-surface focus:outline-none focus:shadow-[0_0_0_3px_rgba(224,90,122,0.16)]"
              />
            </label>
          </>
        ) : (
          <>
            <IconButton
              icon={Search}
              label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              onClick={() => setQuickOpen(true)}
              className="md:hidden"
            />
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              aria-label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              className="rp-focus rp-interactive group hidden h-9 min-w-0 items-center gap-2.5 rounded-full border border-rp-line bg-rp-surface/85 px-3.5 text-[13px] text-rp-text-muted shadow-rp-xs transition-all hover:border-rp-brand-border hover:bg-rp-brand-tint/45 hover:text-rp-text md:inline-flex md:w-[220px] lg:w-[300px] xl:w-[340px]"
            >
              <Search aria-hidden="true" className="rp-icon-tilt h-3.5 w-3.5 shrink-0 text-rp-brand-strong" />
              {/* Quick jump searches pages & features (not lesson content), so the hint says exactly that. */}
              <span className="min-w-0 flex-1 truncate text-left">
                <span className="lg:hidden">{tr('Tìm nhanh…')}</span>
                <span className="hidden lg:inline">{tr('Tìm trang, tính năng học tập…')}</span>
              </span>
              <kbd className="shrink-0 whitespace-nowrap rounded bg-rp-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rp-text-muted">Ctrl K</kbd>
            </button>
          </>
        )}
        {headerActions && <div className="hidden min-w-0 shrink items-center gap-2 sm:flex">{headerActions}</div>}
        <WeatherHeaderControl atmosphere={atmosphere} />
        <BackHomeLink variant="icon" />
        <div
          role="group"
          aria-label={tr('Ngôn ngữ, lịch và thông báo')}
          className="flex shrink-0 items-center gap-1 sm:gap-2"
        >
          <LanguageSwitch variant="icon" />
          <HeaderCalendarPopover roleKey={roleKey} />
          <NotificationCenter />
        </div>
        <ProfileMenu roleKey={roleKey} />
      </header>

      <div className={cx('min-w-0 lg:transition-[padding-left] lg:duration-200 lg:ease-[cubic-bezier(0.22,1,0.36,1)]', collapsed ? 'lg:pl-[var(--spacing-rp-sidebar-collapsed)]' : 'lg:pl-[var(--spacing-rp-sidebar)]')}>

        <div id="rp-main" tabIndex={-1} className="flex min-h-[calc(100dvh-var(--spacing-rp-topbar))] min-w-0 flex-col outline-none">
          <OfflineBanner className="mx-4 mt-4 sm:mx-[var(--rp-space-page-x)]" />
          {children}
        </div>
      </div>

      <QuickJumpModal open={quickOpen} onClose={() => setQuickOpen(false)} groups={nav.groups} tr={tr} />
    </div>
    </StudyUnlockProvider>
  );
}
