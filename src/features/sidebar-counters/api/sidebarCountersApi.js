import { api } from '@/api/client.js';
import { getSession } from '@/app/auth/session.js';
import {
  attachCounterIncreaseMetadata,
  normalizeSidebarCountersResponse,
  shouldAcceptCounterResponse,
} from '../sidebarCounterModel.js';

export const SIDEBAR_COUNTERS_ROOT_KEY = ['sidebar-counters'];
export const SIDEBAR_COUNTER_CHANNEL_NAME = 'rikipath:sidebar-counters';
export const SIDEBAR_COUNTER_STORAGE_KEY = 'rikipath:sidebar-counters:sync';

const TAB_INSTANCE_ID = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
})();

export function getSidebarTabInstanceId() {
  return TAB_INSTANCE_ID;
}

export function sidebarCountersQueryKey(userId, role) {
  return ['sidebar-counters', String(userId || 'anon'), String(role || 'Learner')];
}

// Per-scope high-water cache preventing out-of-order slow responses or transient failures
// from regressing counts, while preserving strict isolation across userId/role switches.
const scopedSnapshotMemory = new Map();

export function scopeKeyFor(userId, role) {
  return `${String(userId || 'anon')}:${String(role || 'Learner')}`;
}

export function clearSidebarCounterSnapshots(userId = null) {
  if (userId == null) {
    scopedSnapshotMemory.clear();
    return;
  }
  const prefix = `${String(userId)}:`;
  for (const key of scopedSnapshotMemory.keys()) {
    if (key.startsWith(prefix)) scopedSnapshotMemory.delete(key);
  }
}

export function getCachedScopedCounters(userId, role) {
  return scopedSnapshotMemory.get(scopeKeyFor(userId, role)) || null;
}

export async function fetchSidebarCountersForScope(userId, role) {
  const scopeKey = scopeKeyFor(userId, role);
  const raw = await api.get('/me/sidebar-counters');
  const normalized = normalizeSidebarCountersResponse(raw);
  const prev = scopedSnapshotMemory.get(scopeKey) || null;
  if (!shouldAcceptCounterResponse(prev, normalized)) {
    return prev;
  }
  const enriched = attachCounterIncreaseMetadata(prev, normalized, Date.now());
  scopedSnapshotMemory.set(scopeKey, enriched);
  return enriched;
}

function broadcastInvalidation() {
  if (typeof window === 'undefined') return;
  const userId = getSession()?.userId ?? null;
  if (!userId) return;
  const msg = {
    type: 'invalidate',
    userId: String(userId),
    tabId: TAB_INSTANCE_ID,
    at: Date.now(),
  };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel(SIDEBAR_COUNTER_CHANNEL_NAME);
      ch.postMessage(msg);
      ch.close();
      return;
    } catch {
      // Fallback to storage event below
    }
  }

  try {
    localStorage.setItem(SIDEBAR_COUNTER_STORAGE_KEY, JSON.stringify(msg));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function invalidateSidebarCounters(queryClient, { broadcast = true } = {}) {
  if (broadcast) broadcastInvalidation();
  if (!queryClient) return Promise.resolve();
  return queryClient.invalidateQueries({ queryKey: SIDEBAR_COUNTERS_ROOT_KEY });
}

let debounceTimer = null;

/**
 * Coalesces duplicate realtime notifications / SignalR event bursts into a single
 * authoritative server refetch without mutating counts optimistically.
 */
export function scheduleDebouncedSidebarCounterRefresh(queryClient, delayMs = 350) {
  if (!queryClient) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    queryClient.invalidateQueries({ queryKey: SIDEBAR_COUNTERS_ROOT_KEY });
  }, delayMs);
}
