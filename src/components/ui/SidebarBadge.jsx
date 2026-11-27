import { useState } from 'react';
import CountBadge from './CountBadge.jsx';
import { cx } from './cx.js';
import {
  buildSidebarBadgeAriaLabel,
  formatSidebarBadgeText,
  normalizeBadgeCount,
  resolveSidebarBadgeAttention,
  resolveSidebarBadgeVariant,
  shouldRenderSidebarBadge,
} from './sidebarBadgeLogic.js';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared dynamic numeric counter badge for AppShell sidebars across every role.
 * Delegates shape/tone/typography to `CountBadge` (MD expanded 20px, XS collapsed 16px).
 */
export default function SidebarBadge({
  count = 0,
  active = false,
  parent = false,
  collapsed = false,
  loading = false,
  stale = false,
  tooltip = '',
  ariaLabel,
  menuLabel = '',
  counterKey = null,
  counterKind = null,
  increaseSeq = 0,
  increasedAtMs = 0,
  tabVisible = true,
  className = '',
}) {
  const { tr, trf } = useLocale();
  const [mountTimeMs] = useState(() => Date.now());
  const safeCount = normalizeBadgeCount(count);
  const visible = shouldRenderSidebarBadge(safeCount, { loading });
  if (!visible) return null;

  const text = formatSidebarBadgeText(safeCount);
  const variant = resolveSidebarBadgeVariant({ active, collapsed, parent });
  const attention = resolveSidebarBadgeAttention({
    count: safeCount,
    counterKey,
    counterKind,
    active,
    increaseSeq,
    increasedAtMs,
    mountTimeMs,
    tabVisible,
  });
  const resolvedAriaLabel = ariaLabel || buildSidebarBadgeAriaLabel({
    label: menuLabel,
    count: safeCount,
    tooltip,
    stale,
    tr,
    trf,
  });

  return (
    <CountBadge
      count={safeCount}
      size={collapsed ? 'xs' : 'md'}
      tone="danger"
      max={99}
      ariaLabel={resolvedAriaLabel}
      title={!collapsed && tooltip ? tooltip : undefined}
      data-sidebar-badge="true"
      data-state={variant.dataState}
      data-active={active ? 'true' : 'false'}
      data-parent={parent ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-stale={stale ? 'true' : 'false'}
      data-attention={attention.mode}
      data-pop-phase={attention.popPhase || undefined}
      data-tab-hidden={tabVisible ? 'false' : 'true'}
      className={cx(
        'rp-sidebar-badge rp-sidebar-badge-enter',
        collapsed && 'pointer-events-none absolute -top-0.5 -right-0.5 z-10',
        className,
      )}
    >
      <span
        key={attention.bumpNum ? `inc-${increaseSeq}` : 'steady'}
        className={cx('relative z-[1]', attention.bumpNum && 'rp-sidebar-badge-num-bump')}
      >
        {text}
      </span>
    </CountBadge>
  );
}
