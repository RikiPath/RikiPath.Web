const KEY = 'rikipath.auth';
const PENDING_KEY = 'rikipath.pendingVerify';

export function saveSession(session, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  store.setItem(KEY, JSON.stringify(session));
}

export function getSession() {
  const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function patchSession(partial) {
  const current = getSession();
  if (!current) return null;
  const remember = Boolean(localStorage.getItem(KEY));
  const next = { ...current, ...partial };
  saveSession(next, remember);
  return next;
}

export function clearSession() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export function savePendingVerify(payload) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function getPendingVerify() {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingVerify() {
  sessionStorage.removeItem(PENDING_KEY);
}
