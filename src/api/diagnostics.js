// Centralized diagnostic buffer & structured error observability for RikiPath.Web.
// Never logs passwords, tokens or full request bodies; keeps diagnostics queryable for QA/support.

const MAX_ENTRIES = 60;
let entries = [];
const listeners = new Set();

function isTestProcess() {
  const proc = typeof globalThis !== 'undefined' ? globalThis.process : undefined;
  return Boolean(proc?.env?.NODE_TEST_CONTEXT || proc?.env?.NODE_ENV === 'test');
}

function isDevRuntime() {
  try {
    return Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV) && !isTestProcess();
  } catch {
    return false;
  }
}

function publishGlobal() {
  if (typeof globalThis !== 'undefined') {
    globalThis.__RIKIPATH_DIAGNOSTICS__ = entries;
  }
}

/**
 * Records a structured API/UI data diagnostic without exposing technical strings in primary UI copy.
 */
export function recordDiagnostic(entry = {}) {
  const item = {
    id: `diag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    scope: entry.scope || 'api',
    component: entry.component || null,
    method: entry.method ? String(entry.method).toUpperCase() : null,
    endpoint: entry.endpoint || null,
    status: entry.status ?? null,
    code: entry.code || null,
    state: entry.state || 'server-error',
    correlationId: entry.correlationId || null,
    technicalDetail: entry.technicalDetail ? String(entry.technicalDetail).slice(0, 320) : null,
  };

  entries = [item, ...entries].slice(0, MAX_ENTRIES);
  publishGlobal();
  for (const listener of listeners) {
    try {
      listener(entries);
    } catch {
      // listener errors must not cascade
    }
  }

  if (isDevRuntime()) {
    const label = `[RikiPath][${item.scope}${item.component ? `:${item.component}` : ''}] ${item.method || ''} ${item.endpoint || ''} -> ${item.status ?? item.state} (${item.code || 'ERROR'})`;
    if ((item.status && item.status >= 500) || item.state === 'server-error') {
      console.error(label, { correlationId: item.correlationId, detail: item.technicalDetail });
    } else {
      console.warn(label, { correlationId: item.correlationId, detail: item.technicalDetail });
    }
  }
  return item;
}

export function getDiagnostics() {
  return entries;
}

export function clearDiagnostics() {
  entries = [];
  publishGlobal();
}

export function subscribeDiagnostics(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
