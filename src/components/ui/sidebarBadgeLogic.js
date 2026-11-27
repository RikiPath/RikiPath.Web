export const SIDEBAR_BADGE_OVERFLOW_CAP = 99;
export const SOFT_PULSE_COUNTER_KEYS = Object.freeze([]);
export const ATTENTION_POP_WINDOW_MS = 2200;

export function normalizeBadgeCount(raw) {
  if (raw == null || typeof raw === 'boolean') return 0;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

export function formatSidebarBadgeText(rawCount) {
  const count = normalizeBadgeCount(rawCount);
  if (count <= 0) return '';
  if (count > SIDEBAR_BADGE_OVERFLOW_CAP) return `${SIDEBAR_BADGE_OVERFLOW_CAP}+`;
  return String(count);
}

export function shouldRenderSidebarBadge(rawCount, { loading = false } = {}) {
  const count = normalizeBadgeCount(rawCount);
  if (count <= 0) return false;
  // Loading without prior data has count=0 anyway; never show noise placeholders.
  return !loading || count > 0;
}

export function resolveSidebarBadgeVariant({ active = false, collapsed = false, parent = false } = {}) {
  return {
    tone: active ? 'active' : 'default',
    size: collapsed ? 'collapsed' : 'default',
    dataState: active ? 'active' : 'inactive',
    isParent: Boolean(parent),
  };
}

/**
 * Determines whether a SidebarBadge should play a subtle, finite 2-beat Attention Pop:
 * - 'pop': 2-iteration Attention Pop ONLY when a counter genuinely increased recently.
 * - 'none': steady state, active route, hidden tab, count <= 0, decreased count, or stale remount.
 */
export function resolveSidebarBadgeAttention({
  count = 0,
  counterKey = null,
  counterKind = null,
  active = false,
  increaseSeq = 0,
  increasedAtMs = 0,
  mountTimeMs = 0,
  tabVisible = true,
} = {}) {
  void counterKey;
  const safeCount = normalizeBadgeCount(count);
  if (safeCount <= 0 || active || !tabVisible) {
    return { mode: 'none', popPhase: null, bumpNum: false };
  }

  const hasFreshIncrease =
    Number(increaseSeq) > 0 &&
    Number(increasedAtMs) > 0 &&
    (mountTimeMs <= 0 || (mountTimeMs - increasedAtMs) < ATTENTION_POP_WINDOW_MS);

  const eligibleKind =
    counterKind === 'ActionRequired' ||
    counterKind === 'DueItems' ||
    counterKind === 'PendingUserAction';

  if (eligibleKind && hasFreshIncrease) {
    return {
      mode: 'pop',
      popPhase: Number(increaseSeq) % 2 === 0 ? 'even' : 'odd',
      bumpNum: true,
    };
  }

  return { mode: 'none', popPhase: null, bumpNum: false };
}

export function buildSidebarBadgeAriaLabel({
  label = '',
  count = 0,
  tooltip = '',
  stale = false,
  tr = (s) => s,
  trf = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] ?? '')),
} = {}) {
  const safeCount = normalizeBadgeCount(count);
  if (safeCount <= 0) return '';
  const base = tooltip
    ? tooltip
    : label
      ? trf('{0}: {1} mục cần xử lý', { 0: label, 1: safeCount })
      : trf('{0} mục cần xử lý', { 0: safeCount });
  if (stale) {
    return `${base} (${tr('đang hiển thị số liệu gần nhất')})`;
  }
  return base;
}
