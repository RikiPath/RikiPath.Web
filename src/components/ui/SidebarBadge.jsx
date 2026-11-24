import { useState } from 'react';
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
 * Shared dynamic numeric counter pill for AppShell sidebars across every role.
 * Visual tokens & accessible contrast live in `src/styles/tokens.css` (`--rp-sidebar-badge-*`).
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
    <span
      data-sidebar-badge="true"
      data-count={safeCount}
      data-state={variant.dataState}
      data-active={active ? 'true' : 'false'}
      data-parent={parent ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
      data-stale={stale ? 'true' : 'false'}
      data-attention={attention.mode}
      data-pop-phase={attention.popPhase || undefined}
      data-tab-hidden={tabVisible ? 'false' : 'true'}
      aria-label={resolvedAriaLabel}
      title={!collapsed && tooltip ? tooltip : undefined}
      className={cx(
        'rp-sidebar-badge rp-sidebar-badge-enter inline-flex shrink-0 items-center justify-center rounded-full leading-none select-none',
        collapsed
          ? 'pointer-events-none absolute -top-0.5 -right-0.5 z-10 h-4 min-w-[16px] px-1 text-[10px] font-bold'
          : 'h-5 min-w-[20px] px-1.5 text-[11px] font-semibold',
        className,
      )}
    >
      <span
        key={attention.bumpNum ? `inc-${increaseSeq}` : 'steady'}
        className={cx('relative z-[1]', attention.bumpNum && 'rp-sidebar-badge-num-bump')}
      >
        {text}
      </span>
    </span>
  );
}
