import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  KeyRound,
  Layers,
  LockKeyhole,
  LockOpen,
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
import { Breadcrumb, Drawer, FEATURE_TONES, FloatingLabelScopeProvider, IconButton, Modal, OfflineBanner, Popover, SidebarBadge, Tooltip, UserAvatar, cx } from '@/components/ui';
import { confirmActiveNavigationGuards, consumePendingScrollRestore, hasActiveNavigationGuards } from '@/utils/navigationContext.js';
import { ROLE_NAV, buildBreadcrumbs, flattenNavItems, isNavItemActive } from './appNav.js';
import { useSidebarCounters } from '@/features/sidebar-counters/hooks/useSidebarCounters.js';
import { resolveNavItemBadge } from '@/features/sidebar-counters/sidebarCounterModel.js';
import { StudyUnlockProvider } from '@/features/entitlements/components/StudyUnlock.jsx';
import { LOCK_REASON, useStudyUnlock } from '@/features/entitlements/studyUnlock.js';
import { useJustUnlocked } from '@/features/entitlements/useJustUnlocked.js';
import '@/features/learning-moments/learningMoments.css';
import { setupFeatureForRoute, setupIndicatorForRoute } from '@/features/learning-path/learningPathFlow.js';
import { useLearningPathAccess } from '@/features/learning-path/useLearningPathAccess.js';
import { RoadmapSetupModal } from '@/features/learning-path/components/RoadmapSetupState.jsx';
import { useAtmosphere } from '@/features/atmosphere/useAtmosphere.js';
import { useHeaderGlass } from '@/features/atmosphere/useHeaderGlass.js';
import AtmosphericSky from '@/features/atmosphere/components/AtmosphericSky.jsx';
import { AtmosphereContext } from '@/features/atmosphere/atmosphereContext.js';
import WeatherHeaderControl from '@/features/atmosphere/components/WeatherHeaderControl.jsx';
import '@/features/atmosphere/atmosphere.css';

const COLLAPSE_KEY = 'rp.sidebar.collapsed';

const ROLE_LABEL = {
  Learner: 'Học viên',
  Mentor: 'Giáo viên',
  Consultant: 'Giáo viên',
  ContentAuthor: 'Quản lý nội dung',
  Admin: 'Quản trị viên',
};

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
function LockedNavItem({ item, active, collapsed, onLockedClick, reasonText, tr }) {
  const Icon = item.icon;
  const label = tr(item.label);
  const reason = tr(reasonText || LOCK_REASON);
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

/** Temporary "Đã mở khóa" marker for a destination the Backend just unlocked (green = success/unlocked). */
function JustUnlockedPill({ tr }) {
  return (
    <span className="rp-unlock-pill inline-flex shrink-0 items-center gap-1 rounded-full bg-rp-success-bg px-1.5 py-0.5 text-[10.5px] font-bold text-rp-success">
      <LockOpen aria-hidden="true" className="h-3 w-3" />
      {tr('Đã mở khóa')}
    </span>
  );
}

function isBranchFullyLocked(item, lockStateFor) {
  if (!item || typeof lockStateFor !== 'function') return false;
  const children = Array.isArray(item.children) ? item.children : [];
  if (children.length === 0) return lockStateFor(item) === 'locked';
  return children.every((child) => isBranchFullyLocked(child, lockStateFor));
}

function renderCollapsedTooltip(label, badgeInfo) {
  if (!badgeInfo || badgeInfo.count <= 0 || !badgeInfo.tooltip) return label;
  return (
    <>
      <span className="block font-semibold">{label}</span>
      <span className="block text-[11px] opacity-90">{badgeInfo.tooltip}</span>
    </>
  );
}

function NavItem({
  item,
  active,
  collapsed,
  onNavigate,
  tr,
  trf,
  counters,
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
  lockState = 'open',
  lockReason,
  onLockedClick,
  setupIndicator = null,
  onSetupRequiredClick,
}) {
  const guardNavigate = useNavigateGuarded();
  const Icon = item.icon;
  const label = tr(item.label);
  const badgeInfo = resolveNavItemBadge(item, counters, { collapsed, isStale: countersStale, tr, trf });
  const setupReason = setupIndicator?.reason ? tr(setupIndicator.reason) : null;
  if (lockState === 'locked' && onLockedClick) {
    return (
      <LockedNavItem
        item={item}
        active={active}
        collapsed={collapsed}
        reasonText={lockReason}
        tr={tr}
        onLockedClick={(target) => {
          onNavigate?.(); // close the mobile drawer first so only one dialog traps focus
          onLockedClick(target);
        }}
      />
    );
  }
  if (setupIndicator && onSetupRequiredClick) {
    const btn = (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onSetupRequiredClick(item);
        }}
        aria-haspopup="dialog"
        data-setup-required="true"
        aria-label={setupReason ? `${label} — ${setupReason}` : label}
        className={cx(
          'rp-focus rp-nav-locked group relative flex items-center rounded-xl text-left rp-type-nav transition-all duration-150',
          collapsed
            ? 'mx-auto h-10 w-10 justify-center p-0'
            : 'min-h-10 w-full gap-2.5 px-2 py-1',
          active
            ? collapsed
              ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border shadow-rp-xs'
              : 'bg-rp-brand-tint/90 font-semibold text-rp-brand-strong shadow-rp-xs'
            : 'font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text',
        )}
      >
        <span
          aria-hidden="true"
          data-tone={item.tone || 'neutral'}
          className={cx(
            'rp-nav-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
            active ? 'rp-nav-tile-active bg-current' : 'opacity-75 saturate-[0.65]',
          )}
        >
          <Icon className={cx('h-[17px] w-[17px]', active && 'text-white')} />
        </span>
        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
        {!collapsed && (
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
        )}
        {collapsed && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-rp-line bg-white text-rp-text-muted shadow-rp-xs"
          >
            <LockKeyhole className="h-2.5 w-2.5" />
          </span>
        )}
      </button>
    );
    return (
      <Tooltip content={collapsed && setupReason ? `${label} — ${setupReason}` : (setupReason || label)} side="right" fullWidth>
        {btn}
      </Tooltip>
    );
  }
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={(e) => guardNavigate(e, item.to, onNavigate)}
      aria-current={active ? 'page' : undefined}
      data-setup-required={setupIndicator ? 'true' : undefined}
      title={setupReason || undefined}
      aria-label={
        setupReason
          ? `${label} — ${setupReason}`
          : collapsed
            ? (badgeInfo.tooltip ? `${label} — ${badgeInfo.tooltip}` : label)
            : undefined
      }
      className={cx(
        'rp-focus rp-interactive group relative flex items-center rounded-xl rp-type-nav transition-all duration-150',
        lockState === 'just-unlocked' && 'rp-unlock-flash',
        collapsed
          ? 'mx-auto h-10 w-10 justify-center p-0'
          : 'min-h-10 w-full gap-2.5 px-2 py-1',
        active
          ? collapsed
            ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong ring-1 ring-inset ring-rp-brand-border shadow-rp-xs'
            : 'bg-rp-brand-tint/90 font-semibold text-rp-brand-strong shadow-rp-xs'
          : setupIndicator
            ? 'font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text'
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
          setupIndicator && !active && 'opacity-80 saturate-[0.7]',
        )}
      >
        <Icon className={cx('h-[17px] w-[17px]', active && 'text-white')} />
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {lockState === 'just-unlocked' && !collapsed && <JustUnlockedPill tr={tr} />}
      {setupIndicator && !collapsed && (
        <LockKeyhole
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-rp-text-muted"
        />
      )}
      {setupIndicator && collapsed && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-rp-line bg-white text-rp-text-muted shadow-rp-xs"
        >
          <LockKeyhole className="h-2.5 w-2.5" />
        </span>
      )}
      {badgeInfo.count > 0 && (
        <SidebarBadge
          count={badgeInfo.count}
          active={active}
          collapsed={collapsed}
          loading={countersLoading}
          stale={countersStale}
          tooltip={badgeInfo.tooltip}
          menuLabel={label}
          counterKey={badgeInfo.counterKey}
          counterKind={badgeInfo.counterKind}
          increaseSeq={badgeInfo.increaseSeq}
          increasedAtMs={badgeInfo.increasedAtMs}
          tabVisible={tabVisible}
        />
      )}
    </NavLink>
  );
  if (collapsed) {
    return (
      <Tooltip content={setupReason ? `${label} — ${setupReason}` : renderCollapsedTooltip(label, badgeInfo)} side="right" fullWidth>
        {link}
      </Tooltip>
    );
  }
  return setupReason ? (
    <Tooltip content={setupReason} side="right" fullWidth>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function RadioDot({ selected }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-rp-surface transition-colors',
        selected ? 'border-rp-brand' : 'border-rp-line-strong group-hover:border-rp-brand/70',
      )}
    >
      {selected && <span className="h-2 w-2 rounded-full bg-rp-brand-pressed" />}
    </span>
  );
}

/** Kind-aware lock reason (missing plan vs missing AI credits) for any locked nav row. */
function useLockReasonText(tr) {
  const unlock = useStudyUnlock();
  return (item) => tr(unlock?.access.lockReasonFor?.(item.to) || LOCK_REASON);
}

function FlyoutChildRow({
  child,
  pathname,
  search,
  tr,
  trf,
  counters,
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
  onClose,
  onNavigate,
  lockStateFor,
  onLockedClick,
}) {
  const childActive = isNavItemActive(child, pathname, search);
  const locked = lockStateFor(child) === 'locked' && onLockedClick;
  const ChildIcon = child.icon;
  const reasonOf = useLockReasonText(tr);
  const badgeInfo = resolveNavItemBadge(child, counters, { isStale: countersStale, tr, trf });
  if (locked) {
    return (
      <li>
        <Tooltip side="right" fullWidth content={reasonOf(child)}>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onNavigate?.();
            onLockedClick(child);
          }}
          aria-haspopup="dialog"
          aria-label={`${tr(child.label)} — ${reasonOf(child)}`}
          className="rp-focus flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-rp-text-muted hover:bg-rp-muted/60"
        >
          {ChildIcon ? <ChildIcon aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[1.9]" /> : (child.kind === 'radio' && <RadioDot selected={false} />)}
          <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
          {ChildIcon && child.kind === 'radio' && <RadioDot selected={false} />}
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </button>
        </Tooltip>
      </li>
    );
  }
  return (
    <li>
      <NavLink
        to={child.to}
        end={Boolean(child.end)}
        role="menuitem"
        onClick={() => {
          onClose();
          onNavigate?.();
        }}
        className={cx(
          'rp-focus group flex min-h-9 items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px] transition-colors',
          lockStateFor(child) === 'just-unlocked' && 'rp-unlock-flash',
          childActive
            ? 'bg-rp-brand-tint font-semibold text-rp-brand-strong'
            : 'font-medium text-rp-text-2 hover:bg-rp-muted/65 hover:text-rp-text',
        )}
      >
        {ChildIcon ? (
          <ChildIcon
            aria-hidden="true"
            className={cx('h-4 w-4 shrink-0 stroke-[1.9]', childActive ? 'text-rp-brand-strong' : 'text-rp-text-muted group-hover:text-rp-text')}
          />
        ) : (
          child.kind === 'radio' && <RadioDot selected={childActive} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{tr(child.label)}</span>
          {child.description && (
            <span className="block truncate text-[11px] font-normal text-rp-text-muted">{tr(child.description)}</span>
          )}
        </span>
        {lockStateFor(child) === 'just-unlocked' && <JustUnlockedPill tr={tr} />}
        {badgeInfo.count > 0 && (
          <SidebarBadge
            count={badgeInfo.count}
            active={childActive}
            loading={countersLoading}
            stale={countersStale}
            tooltip={badgeInfo.tooltip}
            menuLabel={tr(child.label)}
            counterKey={badgeInfo.counterKey}
            counterKind={badgeInfo.counterKind}
            increaseSeq={badgeInfo.increaseSeq}
            increasedAtMs={badgeInfo.increasedAtMs}
            tabVisible={tabVisible}
          />
        )}
        {ChildIcon && child.kind === 'radio' && <RadioDot selected={childActive} />}
      </NavLink>
    </li>
  );
}

function CollapsedBranchFlyout({
  item,
  anchorRect,
  pathname,
  search,
  tr,
  trf,
  counters,
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
  onNavigate,
  onClose,
  lockStateFor,
  onLockedClick,
}) {
  const flyoutNavigate = useNavigate();
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
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - 380 : anchorRect.top;
  const top = Math.max(12, Math.min(anchorRect.top - 8, maxTop));
  const left = anchorRect.right + 10;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={tr(item.label)}
      style={{ top, left }}
      className="rp-anim-pop fixed z-[140] max-h-[min(78vh,480px)] w-64 overflow-y-auto rounded-2xl border border-rp-line bg-rp-surface p-2 shadow-rp-pop"
    >
      {item.to && lockStateFor(item) !== 'locked' ? (
        <NavLink
          to={item.to}
          end
          onClick={(e) => {
            if (hasActiveNavigationGuards()) {
              e.preventDefault();
              void confirmActiveNavigationGuards().then((ok) => {
                if (ok) {
                  onClose();
                  onNavigate?.();
                  flyoutNavigate(item.to);
                }
              });
              return;
            }
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
          if (child.children?.length) {
            if (isBranchFullyLocked(child, lockStateFor) && onLockedClick) {
              return (
                <FlyoutChildRow
                  key={child.id || child.to || child.label}
                  child={child}
                  pathname={pathname}
                  search={search}
                  tr={tr}
                  trf={trf}
                  counters={counters}
                  countersLoading={countersLoading}
                  countersStale={countersStale}
                  tabVisible={tabVisible}
                  onClose={onClose}
                  onNavigate={onNavigate}
                  lockStateFor={lockStateFor}
                  onLockedClick={onLockedClick}
                />
              );
            }
            const subActive = isNavItemActive(child, pathname, search);
            const ChildIcon = child.icon;
            return (
              <li key={child.id || child.to || child.label} className="space-y-0.5 pt-0.5">
                <p
                  className={cx(
                    'flex items-center gap-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em]',
                    subActive ? 'text-rp-brand-strong' : 'text-rp-text-muted',
                  )}
                >
                  {ChildIcon && <ChildIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{tr(child.label)}</span>
                </p>
                <ul className="ml-2 space-y-0.5 border-l border-rp-line pl-2">
                  {child.children.map((subChild) => (
                    <FlyoutChildRow
                      key={subChild.to}
                      child={subChild}
                      pathname={pathname}
                      search={search}
                      tr={tr}
                      trf={trf}
                      counters={counters}
                      countersLoading={countersLoading}
                      countersStale={countersStale}
                      tabVisible={tabVisible}
                      onClose={onClose}
                      onNavigate={onNavigate}
                      lockStateFor={lockStateFor}
                      onLockedClick={onLockedClick}
                    />
                  ))}
                </ul>
              </li>
            );
          }
          return (
            <FlyoutChildRow
              key={child.to}
              child={child}
              pathname={pathname}
              search={search}
              tr={tr}
              trf={trf}
              counters={counters}
              countersLoading={countersLoading}
              countersStale={countersStale}
              tabVisible={tabVisible}
              onClose={onClose}
              onNavigate={onNavigate}
              lockStateFor={lockStateFor}
              onLockedClick={onLockedClick}
            />
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}

function NestedSubGroup({
  item,
  pathname,
  search,
  expanded,
  onToggleExpand,
  onNavigate,
  tr,
  trf,
  counters,
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
  lockStateFor,
  lockReasonFor,
  onLockedClick,
}) {
  const Icon = item.icon;
  const nestedSubId = useId();
  const reasonOf = useLockReasonText(tr);
  const branchActive = isNavItemActive(item, pathname, search);
  const groupLocked = isBranchFullyLocked(item, lockStateFor);
  const isOpen = !groupLocked && Boolean(expanded);
  const groupBadge = resolveNavItemBadge(item, counters, { isBranchOpen: isOpen, isStale: countersStale, tr, trf });

  if (groupLocked && onLockedClick) {
    const label = tr(item.label);
    const reason = lockReasonFor ? tr(lockReasonFor(item)) : reasonOf(item);
    return (
      <li>
        <Tooltip content={reason} side="right" fullWidth>
          <button
            type="button"
            onClick={() => onLockedClick(item)}
            aria-haspopup="dialog"
            aria-label={`${label} — ${reason}`}
            data-locked="true"
            className="rp-focus rp-nav-locked group flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-rp-text-2 transition-colors duration-150 hover:bg-rp-muted/60"
          >
            {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[1.9] text-rp-text-muted" />}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
          </button>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggleExpand(item.id || item.label)}
        aria-expanded={isOpen}
        aria-controls={nestedSubId}
        className={cx(
          'rp-focus group flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150',
          branchActive
            ? 'font-semibold text-rp-brand-strong hover:bg-rp-brand-tint/60'
            : 'font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text',
        )}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cx('h-4 w-4 shrink-0 stroke-[1.9]', branchActive ? 'text-rp-brand' : 'text-rp-text-muted')}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{tr(item.label)}</span>
        {groupBadge.count > 0 && (
          <SidebarBadge
            count={groupBadge.count}
            active={branchActive}
            parent
            loading={countersLoading}
            stale={countersStale}
            tooltip={groupBadge.tooltip}
            menuLabel={tr(item.label)}
            counterKey={groupBadge.counterKey}
            counterKind={groupBadge.counterKind}
            increaseSeq={groupBadge.increaseSeq}
            increasedAtMs={groupBadge.increasedAtMs}
            tabVisible={tabVisible}
          />
        )}
        <ChevronDown
          aria-hidden="true"
          className={cx(
            'h-3.5 w-3.5 shrink-0 text-rp-text-muted transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        id={nestedSubId}
        inert={!isOpen || undefined}
        className={cx(
          'grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cx(
              'pt-1 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              isOpen ? 'translate-y-0' : '-translate-y-1',
            )}
          >
            <ul
              className={cx(
                'ml-3 space-y-1 border-l-[1.5px] py-0.5 pl-2.5',
                branchActive ? 'border-rp-brand-border/80' : 'border-rp-line/85',
              )}
            >
              {item.children.map((subChild) => {
                const active = isNavItemActive(subChild, pathname, search);
                const SubIcon = subChild.icon;
                const locked = lockStateFor(subChild) === 'locked' && onLockedClick;
                const subBadge = resolveNavItemBadge(subChild, counters, { isStale: countersStale, tr, trf });
                if (locked) {
                  return (
                    <li key={subChild.to}>
                      <Tooltip side="right" fullWidth content={reasonOf(subChild)}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate?.();
                          onLockedClick(subChild);
                        }}
                        aria-haspopup="dialog"
                        aria-label={`${tr(subChild.label)} — ${reasonOf(subChild)}`}
                        className="rp-focus flex min-h-9 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[13px] font-medium text-rp-text-muted hover:bg-rp-muted/65"
                      >
                        {SubIcon ? (
                          <SubIcon aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[1.9]" />
                        ) : (
                          subChild.kind === 'radio' && <RadioDot selected={false} />
                        )}
                        <span className="min-w-0 flex-1 truncate">{tr(subChild.label)}</span>
                        {SubIcon && subChild.kind === 'radio' && <RadioDot selected={false} />}
                        <LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />
                      </button>
                      </Tooltip>
                    </li>
                  );
                }
                return (
                  <li key={subChild.to}>
                    <NavLink
                      to={subChild.to}
                      end={Boolean(subChild.end)}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'rp-focus group relative flex items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-[13px] transition-colors duration-150',
                        subChild.description ? 'min-h-11' : 'min-h-9',
                        active
                          ? 'border-rp-brand-border/80 bg-rp-brand-tint font-semibold text-rp-brand-strong shadow-rp-xs'
                          : 'border-transparent font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text',
                      )}
                    >
                      {SubIcon ? (
                        <SubIcon
                          aria-hidden="true"
                          className={cx(
                            'h-4 w-4 shrink-0 stroke-[1.9]',
                            active ? 'text-rp-brand-strong' : 'text-rp-text-muted group-hover:text-rp-text',
                          )}
                        />
                      ) : (
                        subChild.kind === 'radio' && <RadioDot selected={active} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate leading-5">{tr(subChild.label)}</span>
                        {subChild.description && (
                          <span className="block truncate text-[11px] font-normal leading-4 text-rp-text-muted">
                            {tr(subChild.description)}
                          </span>
                        )}
                      </span>
                      {subBadge.count > 0 && (
                        <SidebarBadge
                          count={subBadge.count}
                          active={active}
                          loading={countersLoading}
                          stale={countersStale}
                          tooltip={subBadge.tooltip}
                          menuLabel={tr(subChild.label)}
                          counterKey={subBadge.counterKey}
                          counterKind={subBadge.counterKind}
                          increaseSeq={subBadge.increaseSeq}
                          increasedAtMs={subBadge.increasedAtMs}
                          tabVisible={tabVisible}
                        />
                      )}
                      {SubIcon && subChild.kind === 'radio' && <RadioDot selected={active} />}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </li>
  );
}

function HierarchicalNavItem({
  item,
  pathname,
  search,
  collapsed,
  expandedMap,
  onToggleBranch,
  onNavigate,
  tr,
  trf,
  counters,
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
  lockStateFor,
  lockReasonFor,
  onLockedClick,
}) {
  const Icon = item.icon;
  const label = tr(item.label);
  const subId = useId();
  const reasonOf = useLockReasonText(tr);
  const branchKey = item.id || item.label;
  const branchLocked = isBranchFullyLocked(item, lockStateFor);
  const branchActive = isNavItemActive(item, pathname, search);
  const selfActive = item.to ? pathname.replace(/\/+$/, '') === item.to : false;
  const isOpen = !branchLocked && Boolean(expandedMap?.[branchKey] ?? item.defaultOpen !== false);
  const onToggleExpand = () => onToggleBranch(branchKey);
  const parentBadge = resolveNavItemBadge(item, counters, {
    isBranchOpen: isOpen,
    collapsed,
    isStale: countersStale,
    tr,
    trf,
  });

  const [flyoutRect, setFlyoutRect] = useState(null);
  const btnRef = useRef(null);

  // When an entire branch is locked, lock only the parent item and never expand or show locked children.
  if (branchLocked && onLockedClick) {
    return (
      <LockedNavItem
        item={item}
        active={branchActive}
        collapsed={collapsed}
        onLockedClick={onLockedClick}
        tr={tr}
        lockReason={lockReasonFor ? lockReasonFor(item) : undefined}
      />
    );
  }

  if (collapsed) {
    return (
      <>
        <Tooltip content={renderCollapsedTooltip(label, parentBadge)} side="right" fullWidth>
          <button
            ref={btnRef}
            type="button"
            aria-expanded={Boolean(flyoutRect)}
            aria-haspopup="menu"
            aria-label={parentBadge.tooltip ? `${label} — ${parentBadge.tooltip}` : label}
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
            {parentBadge.count > 0 && (
              <SidebarBadge
                count={parentBadge.count}
                active={branchActive}
                parent
                collapsed
                loading={countersLoading}
                stale={countersStale}
                tooltip={parentBadge.tooltip}
                menuLabel={label}
                counterKey={parentBadge.counterKey}
                counterKind={parentBadge.counterKind}
                increaseSeq={parentBadge.increaseSeq}
                increasedAtMs={parentBadge.increasedAtMs}
                tabVisible={tabVisible}
              />
            )}
          </button>
        </Tooltip>
        {flyoutRect && (
          <CollapsedBranchFlyout
            item={item}
            anchorRect={flyoutRect}
            pathname={pathname}
            search={search}
            tr={tr}
            trf={trf}
            counters={counters}
            countersLoading={countersLoading}
            countersStale={countersStale}
            tabVisible={tabVisible}
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
        {parentBadge.count > 0 && (
          <SidebarBadge
            count={parentBadge.count}
            active={branchActive}
            parent
            loading={countersLoading}
            stale={countersStale}
            tooltip={parentBadge.tooltip}
            menuLabel={label}
            counterKey={parentBadge.counterKey}
            counterKind={parentBadge.counterKind}
            increaseSeq={parentBadge.increaseSeq}
            increasedAtMs={parentBadge.increasedAtMs}
            tabVisible={tabVisible}
          />
        )}
        {branchLocked && <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />}
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
            <ul
              className={cx(
                'ml-[21px] space-y-1 border-l-[1.5px] py-0.5 pl-3',
                branchActive ? 'border-rp-brand-border/80' : 'border-rp-line/85',
              )}
            >
              {item.children.map((child) => {
                if (child.children?.length) {
                  const subKey = child.id || child.label;
                  return (
                    <NestedSubGroup
                      key={subKey}
                      item={child}
                      pathname={pathname}
                      search={search}
                      expanded={expandedMap?.[subKey] ?? child.defaultOpen !== false}
                      onToggleExpand={onToggleBranch}
                      onNavigate={onNavigate}
                      tr={tr}
                      trf={trf}
                      counters={counters}
                      countersLoading={countersLoading}
                      countersStale={countersStale}
                      tabVisible={tabVisible}
                      lockStateFor={lockStateFor}
                      lockReasonFor={lockReasonFor}
                      onLockedClick={onLockedClick}
                    />
                  );
                }
                const childActive = isNavItemActive(child, pathname, search);
                const ChildIcon = child.icon;
                const locked = lockStateFor(child) === 'locked' && onLockedClick;
                const childBadge = resolveNavItemBadge(child, counters, { isStale: countersStale, tr, trf });
                if (locked) {
                  return (
                    <li key={child.to}>
                      <Tooltip side="right" fullWidth content={reasonOf(child)}>
                        <button
                          type="button"
                          onClick={() => {
                            onNavigate?.();
                            onLockedClick(child);
                          }}
                          aria-haspopup="dialog"
                          aria-label={`${tr(child.label)} — ${reasonOf(child)}`}
                          className="rp-focus flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-rp-text-muted hover:bg-rp-muted/65 hover:text-rp-text-2"
                        >
                          <ChildIcon aria-hidden="true" className="h-4 w-4 shrink-0 stroke-[1.9]" />
                          <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
                          <LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />
                        </button>
                      </Tooltip>
                    </li>
                  );
                }
                return (
                  <li key={child.to}>
                    <NavLink
                      to={child.to}
                      end={Boolean(child.end)}
                      onClick={onNavigate}
                      aria-current={childActive ? 'page' : undefined}
                      className={cx(
                        'rp-focus relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors duration-150',
                        childActive
                          ? 'bg-rp-brand-tint/90 font-semibold text-rp-brand-strong shadow-rp-xs'
                          : 'font-medium text-rp-text-2 hover:bg-rp-muted/60 hover:text-rp-text',
                      )}
                    >
                      <ChildIcon
                        aria-hidden="true"
                        className={cx('h-4 w-4 shrink-0 stroke-[1.9]', childActive ? 'text-rp-brand-strong' : 'text-rp-text-muted')}
                      />
                      <span className="min-w-0 flex-1 truncate">{tr(child.label)}</span>
                      {childBadge.count > 0 && (
                        <SidebarBadge
                          count={childBadge.count}
                          active={childActive}
                          loading={countersLoading}
                          stale={countersStale}
                          tooltip={childBadge.tooltip}
                          menuLabel={tr(child.label)}
                          counterKey={childBadge.counterKey}
                          counterKind={childBadge.counterKind}
                          increaseSeq={childBadge.increaseSeq}
                          increasedAtMs={childBadge.increasedAtMs}
                          tabVisible={tabVisible}
                        />
                      )}
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

function collectBranches(items = [], out = []) {
  items.forEach((item) => {
    if (item.children?.length) {
      out.push(item);
      collectBranches(item.children, out);
    }
  });
  return out;
}

function loadExpandedBranches(nav, storageKey, roleKey, pathname, search) {
  const map = {};
  const branches = nav.groups.flatMap((g) => collectBranches(g.items));
  branches.forEach((item) => {
    map[item.id || item.label] = item.defaultOpen !== false;
  });

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) Object.assign(map, JSON.parse(saved));
  } catch {
    /* ignore */
  }

  let updated = false;
  const prev = lastVisitedNavRoute.get(roleKey);
  branches.forEach((item) => {
    const key = item.id || item.label;
    const nowInBranch = isNavItemActive(item, pathname, search);
    const wasInBranch = prev ? isNavItemActive(item, prev.pathname, prev.search) : false;
    if (nowInBranch && !map[key] && (!prev || !wasInBranch)) {
      map[key] = true;
      updated = true;
    }
  });
  if (updated) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }

  return map;
}

function loadExpandedGroups(nav, groupStorageKey, pathname, search) {
  const map = {};
  nav.groups.forEach((g) => {
    if (g.collapsible) map[g.label] = true;
  });
  try {
    const saved = localStorage.getItem(groupStorageKey);
    if (saved) Object.assign(map, JSON.parse(saved));
  } catch {
    /* ignore */
  }
  nav.groups.forEach((g) => {
    if (g.collapsible && g.items.some((item) => isNavItemActive(item, pathname, search))) {
      map[g.label] = true;
    }
  });
  return map;
}

function SidebarNav({
  roleKey,
  collapsed,
  onNavigate,
  onSetupGuide,
  rememberScroll = false,
  counters = {},
  countersLoading = false,
  countersStale = false,
  tabVisible = true,
}) {
  const navRef = useRef(null);
  useSidebarScrollMemory(navRef, `${roleKey}.${collapsed ? 'rail' : 'full'}`, rememberScroll);
  const { pathname, search } = useLocation();
  const { tr, trf } = useLocale();
  const nav = ROLE_NAV[roleKey];
  const unlock = useStudyUnlock();
  const navDestinations = useMemo(
    () => [...new Set(nav.groups.flatMap((g) => flattenNavItems(g.items)).map((i) => i.to).filter(Boolean))],
    [nav],
  );
  // Destinations the Backend just unlocked (e.g. right after a purchase) get a one-time highlight.
  const justUnlocked = useJustUnlocked(unlock?.access, navDestinations);
  const storageKey = `rp.nav.expanded.${roleKey}`;
  const groupStorageKey = `rp.nav.groups.expanded.${roleKey}`;

  const [expandedMap, setExpandedMap] = useState(() =>
    loadExpandedBranches(nav, storageKey, roleKey, pathname, search),
  );
  const [expandedGroups, setExpandedGroups] = useState(() =>
    loadExpandedGroups(nav, groupStorageKey, pathname, search),
  );
  const [manualGroupToggleRoute, setManualGroupToggleRoute] = useState({});
  const currentRouteSig = `${pathname}${search}`;

  const prevRouteRef = useRef({ pathname, search });

  useEffect(() => {
    const prevRoute = prevRouteRef.current;
    prevRouteRef.current = { pathname, search };
    lastVisitedNavRoute.set(roleKey, { pathname, search });

    const branches = nav.groups.flatMap((g) => collectBranches(g.items));
    const toAutoOpen = [];
    branches.forEach((item) => {
      const key = item.id || item.label;
      const nowInBranch = isNavItemActive(item, pathname, search);
      const wasInBranch = prevRoute ? isNavItemActive(item, prevRoute.pathname, prevRoute.search) : false;
      if (nowInBranch && !wasInBranch) toAutoOpen.push(key);
    });
    if (toAutoOpen.length > 0) {
      setExpandedMap((prev) => {
        if (toAutoOpen.every((k) => prev[k])) return prev;
        const next = { ...prev };
        toAutoOpen.forEach((k) => {
          next[k] = true;
        });
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }

    try {
      const next = { ...expandedGroups };
      let changed = false;
      nav.groups.forEach((g) => {
        if (g.collapsible && !next[g.label] && g.items.some((item) => isNavItemActive(item, pathname, search))) {
          next[g.label] = true;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(groupStorageKey, JSON.stringify(next));
      }
    } catch {
      /* ignore */
    }
  }, [roleKey, pathname, search, nav, storageKey, groupStorageKey, expandedGroups]);

  const isGroupOpen = (group, groupActive) => {
    if (groupActive && manualGroupToggleRoute[group.label] !== currentRouteSig) {
      return true;
    }
    return expandedGroups[group.label] ?? true;
  };

  const toggleGroup = (groupLabel, currentlyOpen) => {
    const nextOpen = !currentlyOpen;
    setManualGroupToggleRoute((prev) => ({ ...prev, [groupLabel]: currentRouteSig }));
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupLabel]: nextOpen };
      try {
        localStorage.setItem(groupStorageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  const roadmapAccess = useLearningPathAccess({ enabled: roleKey === 'Learner' });
  // loading / error → 'unknown' → rendered as a normal item (no lock flash, no false paywall).
  const lockStateFor = (item) => {
    const state = unlock ? unlock.access.lockStateFor(item.to) : 'open';
    return state !== 'locked' && justUnlocked.includes(item.to) ? 'just-unlocked' : state;
  };
  const lockReasonFor = (item) => (unlock?.access.lockReasonFor ? unlock.access.lockReasonFor(item.to) : LOCK_REASON);
  const onLockedClick = unlock ? (item) => unlock.requestUnlock(item.to, item.label, item.icon) : undefined;
  // One setup state decides every Learner lock: assessment needs a goal, roadmap needs a valid assessment.
  const setupIndicatorFor = (item) => (roleKey === 'Learner' ? setupIndicatorForRoute(roadmapAccess, item.to) : null);
  // The guide lives in AppShell (one instance), so closing the mobile drawer never unmounts it.
  const onSetupRequiredClick = (item) => onSetupGuide?.(setupFeatureForRoute(item?.to) || 'roadmap');
  return (
    <nav
      ref={navRef}
      aria-label={tr('Điều hướng chính')}
      className={cx('rp-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2.5')}
    >
      {nav.groups.map((group) => {
        const singleBranchSameLabel =
          group.items.length === 1 &&
          group.items[0].children?.length &&
          group.items[0].label === group.label;
        const isCollapsible = Boolean(group.collapsible && !collapsed && !singleBranchSameLabel);
        const groupActive = group.items.some((item) => isNavItemActive(item, pathname, search));
        const groupOpen = !isCollapsible || isGroupOpen(group, groupActive);
        return (
        <div key={group.label} className={collapsed ? 'mb-2.5' : 'mb-3'}>
          {!collapsed ? (
            !singleBranchSameLabel && (
              isCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label, groupOpen)}
                  aria-expanded={groupOpen}
                  className={cx(
                    'rp-focus mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:bg-rp-muted/50',
                    groupActive ? 'text-rp-brand-strong' : 'text-rp-text-muted',
                  )}
                >
                  <span className="truncate">{tr(group.label)}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cx(
                      'h-3.5 w-3.5 shrink-0 opacity-75 transition-transform duration-200 motion-reduce:transition-none',
                      groupOpen && 'rotate-180',
                    )}
                  />
                </button>
              ) : (
                <p className={cx('mb-1.5 truncate px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em]', groupActive ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
                  {tr(group.label)}
                </p>
              )
            )
          ) : (
            <span aria-hidden="true" className="mx-auto mb-2 block h-px w-6 bg-rp-line" />
          )}
          <div
            inert={(!collapsed && !groupOpen) || undefined}
            className={cx(
              isCollapsible && 'grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              isCollapsible ? (groupOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0') : undefined,
            )}
          >
            <div className={cx(isCollapsible && 'min-h-0 overflow-hidden')}>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to || item.id || item.label} className={collapsed ? 'flex justify-center' : undefined}>
                    {item.children?.length ? (
                      <HierarchicalNavItem
                        item={item}
                        pathname={pathname}
                        search={search}
                        collapsed={collapsed}
                        expandedMap={expandedMap}
                        onToggleBranch={toggleExpanded}
                        onNavigate={onNavigate}
                        tr={tr}
                        trf={trf}
                        counters={counters}
                        countersLoading={countersLoading}
                        countersStale={countersStale}
                        tabVisible={tabVisible}
                        lockStateFor={lockStateFor}
                        lockReasonFor={lockReasonFor}
                        onLockedClick={onLockedClick}
                      />
                    ) : (
                      <NavItem
                        item={item}
                        active={isNavItemActive(item, pathname, search)}
                        collapsed={collapsed}
                        onNavigate={onNavigate}
                        tr={tr}
                        trf={trf}
                        counters={counters}
                        countersLoading={countersLoading}
                        countersStale={countersStale}
                        tabVisible={tabVisible}
                        lockState={lockStateFor(item)}
                        lockReason={lockReasonFor(item)}
                        onLockedClick={onLockedClick}
                        setupIndicator={setupIndicatorFor(item)}
                        onSetupRequiredClick={onSetupRequiredClick}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
          <span className="block text-[17px] font-bold tracking-[-0.02em] text-rp-text">Riki<span className="rp-brand-path">Path</span></span>
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ Profile menu */

function ProfileMenu({ roleKey }) {
  const { user, userLoading, primaryRole, logout } = useAuth();
  const { tr } = useLocale();
  const name = user?.displayName || user?.fullName || user?.name || user?.email || tr('Tài khoản');
  const role = ROLE_LABEL[primaryRole] || primaryRole;
  const links = [
    { to: '/profile', label: 'Hồ sơ của tôi', icon: UserRound },
    ...(roleKey === 'Learner'
      ? [{ to: '/profile?tab=goals', label: 'Mục tiêu học tập', icon: Target }]
      : []),
    ...(roleKey === 'Mentor'
      ? [{ to: '/profile?tab=professional', label: 'Hồ sơ chuyên môn', icon: GraduationCap }]
      : []),
    ...(roleKey === 'ContentAuthor'
      ? [{ to: '/cms-studio', label: 'Biên soạn nội dung', icon: Layers }]
      : []),
    { to: '/profile?tab=notifications', label: 'Thông báo & tùy chọn', icon: Settings },
    { to: '/profile?tab=security', label: 'Bảo mật & đăng nhập', icon: KeyRound },
  ];
  return (
    <Popover
      label={tr('Tài khoản')}
      panelClassName="w-[min(288px,calc(100vw-24px))] overflow-hidden p-0"
      trigger={({ toggle, props, open }) => (
        <button
          {...props}
          type="button"
          onClick={toggle}
          aria-label={`${tr('Tài khoản')}: ${name}`}
          data-testid="header-profile-trigger"
          className="rp-focus rp-hc rp-hc-profile flex items-center gap-2 rounded-full border border-rp-line py-1 pl-1 pr-1.5 md:pr-2.5"
        >
          <UserAvatar
            src={user?.avatarUrl}
            name={name}
            size={32}
            loading={userLoading}
            eager
            decorative
            className="ring-1 ring-rp-line"
          />
          <span className="hidden max-w-[148px] text-left leading-tight md:block">
            <span className="block truncate text-[13px] font-semibold text-rp-text">{name}</span>
            <span className="block truncate text-[11px] text-rp-text-muted">{tr(role)}</span>
          </span>
          <ChevronDown aria-hidden="true" className={cx('h-4 w-4 shrink-0 text-rp-text-muted transition-transform duration-150', open && 'rotate-180')} />
        </button>
      )}
    >
      {({ close }) => (
        <div data-testid="account-dropdown-panel">
          <div className="flex items-center gap-3 border-b border-rp-line bg-gradient-to-br from-rp-brand-tint/35 via-rp-surface to-rp-surface px-4 py-3.5">
            <UserAvatar
              src={user?.avatarUrl}
              name={name}
              size={44}
              loading={userLoading}
              eager
              className="ring-2 ring-rp-brand-border/60 shadow-rp-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-rp-text">{name}</p>
              {user?.email && <p className="truncate text-xs text-rp-text-muted">{user.email}</p>}
              <span className="mt-1.5 inline-flex items-center rounded-full border border-rp-brand-border/70 bg-rp-brand-tint/70 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-rp-brand-strong">
                {tr(role)}
              </span>
            </div>
          </div>
          <ul className="p-1.5">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={close} className="rp-focus group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-rp-text-2 hover:bg-rp-muted hover:text-rp-text">
                  <l.icon aria-hidden="true" className="rp-icon-tilt h-4 w-4 shrink-0" />
                  <span className="truncate">{tr(l.label)}</span>
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
              <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" /> {tr('Đăng xuất')}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/* ------------------------------------------------------------------ Quick Jump (Ctrl+K) */

function QuickJumpModal({ open, onClose, groups, tr, onSetupGuide }) {
  const navigate = useNavigate();
  const { isLearner } = useAuth();
  const unlock = useStudyUnlock();
  const roadmapAccess = useLearningPathAccess({ enabled: Boolean(isLearner) });
  const isLocked = (item) => Boolean(unlock) && unlock.access.lockStateFor(item.to) === 'locked';
  const lockReasonOf = (item) => unlock?.access.lockReasonFor?.(item.to) || LOCK_REASON;
  const setupIndicatorOf = (item) => (isLearner ? setupIndicatorForRoute(roadmapAccess, item.to) : null);
  const go = (item) => {
    if (isLocked(item)) {
      handleClose();
      unlock.requestUnlock(item.to, item.label, item.icon);
      return;
    }
    if (setupIndicatorOf(item)) {
      handleClose();
      onSetupGuide?.(setupFeatureForRoute(item.to) || 'roadmap');
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
    <>
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
            className="h-11 w-full rounded-rp-input border border-rp-line bg-rp-bg-2 pl-10 pr-4 text-sm text-rp-text placeholder:text-rp-text-muted focus:border-rp-brand focus:bg-rp-surface focus:outline-none focus:shadow-[inset_0_0_0_0.5px_var(--color-rp-brand)]"
          />
        </label>
      </form>
      <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-rp-text-muted">{tr('Không tìm thấy mục phù hợp trong vai trò hiện tại.')}</p>
        ) : (
          filtered.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-rp-text-muted">{g.label}</p>
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const tone = FEATURE_TONES[item.tone] || FEATURE_TONES.neutral;
                  const Icon = item.icon;
                  const locked = isLocked(item);
                  const setupIndicator = !locked ? setupIndicatorOf(item) : null;
                  const indicatorReason = locked ? tr(lockReasonOf(item)) : setupIndicator ? tr(setupIndicator.reason) : null;
                  return (
                    <li key={item.to}>
                      <button
                        type="button"
                        onClick={() => go(item)}
                        aria-haspopup={(locked || setupIndicator) ? 'dialog' : undefined}
                        data-setup-required={setupIndicator ? 'true' : undefined}
                        aria-label={indicatorReason ? `${tr(item.label)} — ${indicatorReason}` : undefined}
                        title={indicatorReason || undefined}
                        className={cx(
                          'rp-focus group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium',
                          locked || setupIndicator ? 'text-rp-text-muted hover:bg-rp-muted/75 hover:text-rp-text-2' : 'rp-interactive text-rp-text hover:bg-rp-brand-tint/60 hover:text-rp-brand-strong',
                        )}
                      >
                        <span aria-hidden="true" className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.bg, tone.fg, locked || setupIndicator ? 'opacity-75 saturate-[0.55]' : 'rp-icon-tilt')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{tr(item.label)}</span>
                        {(locked || setupIndicator) && <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rp-text-muted" />}
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

    </>
  );
}

function useNavigateGuarded() {
  const navigate = useNavigate();
  return (event, to, afterAllow) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!hasActiveNavigationGuards()) {
      afterAllow?.(event);
      return;
    }
    event.preventDefault();
    void confirmActiveNavigationGuards().then((ok) => {
      if (!ok) return;
      afterAllow?.(event);
      navigate(to);
    });
  };
}

/* ------------------------------------------------------------------ Breadcrumbs */

function Breadcrumbs({ trail }) {
  if (!trail.length) return null;
  return <Breadcrumb items={trail} maxVisible={4} className="hidden md:block" />;
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
  // One setup guide for every entry point (Sidebar, mobile drawer, quick search); the clicked feature picks the story.
  const [setupGuideFeature, setSetupGuideFeature] = useState(null);
  const setupAccess = useLearningPathAccess({ enabled: roleKey === 'Learner' });
  const mainScrollRef = useRef(null);
  const prevPathRef = useRef(pathname);
  const locationKey = `${pathname}${search}`;
  const [lastLocationKey, setLastLocationKey] = useState(locationKey);
  if (locationKey !== lastLocationKey) {
    setLastLocationKey(locationKey);
    setDrawerOpen(false);
  }

  useEffect(() => {
    const pathChanged = prevPathRef.current !== pathname;
    prevPathRef.current = pathname;
    const savedTop = consumePendingScrollRestore(pathname, search);
    if (savedTop != null) {
      window.requestAnimationFrame(() => {
        mainScrollRef.current?.scrollTo({ top: savedTop, behavior: 'auto' });
      });
      return;
    }
    if (pathChanged) {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname, search]);

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
  const atmosphere = useAtmosphere();
  const headerGlass = useHeaderGlass(atmosphere.prefs?.mode === 'off' ? null : atmosphere.scene, { lowPower: atmosphere.lowPower, reducedMotion: atmosphere.reducedMotion });
  const skyOn = atmosphere.prefs.mode !== 'off';
  const sidebarCounters = useSidebarCounters();

  return (
    <AtmosphereContext.Provider value={atmosphere}>
    <StudyUnlockProvider>
    <div
      data-shell={roleKey.toLowerCase()}
      data-paper={roleKey === 'Learner' ? 'learner' : 'quiet'}
      data-sky={skyOn ? 'on' : 'off'}
      data-sky-period={skyOn ? atmosphere.scene.period : undefined}
      className="rp-paper-bg rp-app-shell-viewport flex flex-col text-rp-text"
    >
      <a href="#rp-main" className="sr-only z-[200] rounded-lg bg-rp-surface px-4 py-2 font-semibold text-rp-brand-strong shadow-rp-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        {tr('Bỏ qua điều hướng')}
      </a>

      <FloatingLabelScopeProvider enabled={false}>
      {/* Desktop sidebar */}
      <aside
        aria-label={area}
        data-collapsed={collapsed ? 'true' : 'false'}
        data-translate-scope="deny"
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

        <SidebarNav
          roleKey={roleKey}
          collapsed={collapsed}
          onSetupGuide={setSetupGuideFeature}
          rememberScroll
          counters={sidebarCounters.byKey}
          countersLoading={sidebarCounters.isLoading}
          countersStale={sidebarCounters.isStale}
          tabVisible={sidebarCounters.isTabVisible}
        />

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
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left" width="w-[min(300px,88vw)]" title={nav.area} padded={false}>
        <div className="flex min-h-full flex-col">
          <SidebarNav
            roleKey={roleKey}
            collapsed={false}
            onNavigate={() => setDrawerOpen(false)}
            onSetupGuide={setSetupGuideFeature}
            counters={sidebarCounters.byKey}
            countersLoading={sidebarCounters.isLoading}
            countersStale={sidebarCounters.isStale}
            tabVisible={sidebarCounters.isTabVisible}
          />
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
        data-translate-scope="deny"
        data-role={roleKey.toLowerCase()}
        data-sky={skyOn ? 'on' : 'off'}
        data-sky-tone={skyOn && atmosphere.scene.isDark ? 'dark' : 'light'}
        data-sky-period={skyOn ? atmosphere.scene.period : undefined}
        data-sky-condition={skyOn ? atmosphere.scene.condition : undefined}
        data-sidebar={collapsed ? 'collapsed' : 'expanded'}
        data-glass-variant={headerGlass.variant}
        data-glass-polarity={headerGlass.polarity}
        data-glass-switching={headerGlass.switching ? 'true' : undefined}
        style={headerGlass.style}
        className="rp-header-ambient rp-sky-header relative z-[45] flex h-[var(--spacing-rp-topbar)] shrink-0 items-center gap-1 border-b border-rp-line bg-rp-surface/92 px-2.5 backdrop-blur-md sm:gap-2.5 sm:px-[var(--rp-space-page-x)] lg:pl-3"
      >
        {skyOn && (
          <AtmosphericSky
            scene={atmosphere.scene}
            intensity={atmosphere.effectiveIntensity}
            reducedMotion={atmosphere.reducedMotion}
            lowPower={atmosphere.lowPower}
          />
        )}
        <IconButton icon={Menu} label={tr('Mở menu')} onClick={() => setDrawerOpen(true)} className="rp-hc lg:hidden" />
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
        <div className="min-w-0 flex-1" data-sky-open-band>
          <Breadcrumbs trail={trail} />
        </div>
        {typeof onSearchChange === 'function' ? (
          <>
            <IconButton
              icon={Search}
              label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              onClick={() => setQuickOpen(true)}
              className="rp-hc xl:hidden"
            />
            <label className="relative hidden w-[220px] transition-[width] duration-200 focus-within:w-[280px] xl:block">
              <span className="sr-only">{tr(searchPlaceholder)}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rp-text-muted" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={tr(searchPlaceholder)}
                className="rp-hc h-9 w-full rounded-full border border-rp-line bg-rp-surface/90 pl-9 pr-3 text-[13px] text-rp-text placeholder:text-rp-text-muted transition-[border-color,box-shadow,background-color] focus:border-rp-brand focus:bg-rp-surface focus:outline-none focus:shadow-[inset_0_0_0_0.5px_var(--color-rp-brand)]"
              />
            </label>
          </>
        ) : (
          <>
            <IconButton
              icon={Search}
              label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              onClick={() => setQuickOpen(true)}
              className="rp-hc md:hidden"
            />
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              aria-label={tr('Tìm nhanh trang và chức năng (Ctrl+K)')}
              className="rp-focus rp-interactive rp-hc group hidden h-9 min-w-0 items-center gap-2.5 rounded-full border border-rp-line bg-rp-surface/85 px-3.5 text-[13px] text-rp-text-muted shadow-rp-xs transition-all hover:border-rp-brand-border hover:bg-rp-brand-tint/45 hover:text-rp-text md:inline-flex md:w-[220px] lg:w-[300px] xl:w-[340px]"
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
      </FloatingLabelScopeProvider>

      <div
        ref={mainScrollRef}
        className={cx(
          'rp-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-clip lg:transition-[padding-left] lg:duration-200 lg:ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'lg:pl-[var(--spacing-rp-sidebar-collapsed)]' : 'lg:pl-[var(--spacing-rp-sidebar)]',
        )}
      >
        <div id="rp-main" tabIndex={-1} className="flex min-h-full min-w-0 flex-col outline-none">
          <FloatingLabelScopeProvider enabled>
            <OfflineBanner className="mx-4 mt-4 sm:mx-[var(--rp-space-page-x)]" />
            {children}
          </FloatingLabelScopeProvider>
        </div>
      </div>

      <QuickJumpModal open={quickOpen} onClose={() => setQuickOpen(false)} groups={nav.groups} tr={tr} onSetupGuide={setSetupGuideFeature} />
      {roleKey === 'Learner' && (
        <RoadmapSetupModal
          open={Boolean(setupGuideFeature)}
          feature={setupGuideFeature || 'roadmap'}
          onClose={() => setSetupGuideFeature(null)}
          roadmapAccess={setupAccess}
        />
      )}
    </div>
    </StudyUnlockProvider>
    </AtmosphereContext.Provider>
  );
}
