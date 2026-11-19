import { getPreviewSession, PREVIEW_FLAG, PREVIEW_ROLE } from '@/mocks/preview.js';

const KEY = 'rikipath.auth';
const PENDING_KEY = 'rikipath.pendingVerify';
// "Ghi nhớ đăng nhập" preference + last email (never the password: that stays with the browser's
// password manager). Survives logout on purpose so the login form comes back pre-filled.
const REMEMBER_KEY = 'rikipath.rememberLogin';

// Storage can be missing (tests/SSR) or throw (blocked cookies, some private modes): never let that
// break API requests — fall back to "no session" instead.
function storage(kind) {
  try {
    const store = typeof window !== 'undefined' ? window[kind] : undefined;
    return store && typeof store.getItem === 'function' ? store : null;
  } catch {
    return null;
  }
}
function read(kind, key) {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(kind, key, value) {
  try {
    storage(kind)?.setItem(key, value);
  } catch {
    // Session persistence is best-effort; the in-memory AuthContext state still works.
  }
}
function remove(kind, key) {
  try {
    storage(kind)?.removeItem(key);
  } catch {
    // ignore
  }
}

export function saveSession(session, remember = true) {
  remove('localStorage', KEY);
  remove('sessionStorage', KEY);
  write(remember ? 'localStorage' : 'sessionStorage', KEY, JSON.stringify(session));
}

export function getSession() {
  const preview = getPreviewSession();
  if (preview) return preview;
  const isQaOrDev = typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'qa');
  if (isQaOrDev && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('qa_auth_token');
    if (token) {
      const auth = {
        accessToken: token,
        role: params.get('qa_role') || 'Admin',
        userId: params.get('qa_user_id') || '900001',
        email: params.get('qa_email') || 'admin@rikipath.local',
        fullName: params.get('qa_name') || 'Admin System'
      };
      saveSession(auth, true);
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('qa_auth_token');
        cleanUrl.searchParams.delete('qa_role');
        cleanUrl.searchParams.delete('qa_user_id');
        cleanUrl.searchParams.delete('qa_email');
        cleanUrl.searchParams.delete('qa_name');
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : '') + cleanUrl.hash);
      } catch {
        // Safe no-op
      }
      return auth;
    }
  }
  const raw = read('localStorage', KEY) || read('sessionStorage', KEY);
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
  const remember = Boolean(read('localStorage', KEY));
  const next = { ...current, ...partial };
  saveSession(next, remember);
  return next;
}

export function clearSession() {
  remove('localStorage', KEY);
  remove('sessionStorage', KEY);
  remove('localStorage', PREVIEW_FLAG);
  remove('localStorage', PREVIEW_ROLE);
}

/** Persist the remember-me choice after a successful sign-in. Unchecked → forget the stored email. */
export function saveRememberedLogin({ email, remember }) {
  if (remember && email) write('localStorage', REMEMBER_KEY, JSON.stringify({ email: String(email).trim(), remember: true }));
  else write('localStorage', REMEMBER_KEY, JSON.stringify({ email: '', remember: false }));
}

/** `{ email, remember }` for pre-filling the login form; defaults to remember = true, no email. */
export function getRememberedLogin() {
  const raw = read('localStorage', REMEMBER_KEY);
  if (!raw) return { email: '', remember: true };
  try {
    const parsed = JSON.parse(raw);
    return { email: typeof parsed?.email === 'string' ? parsed.email : '', remember: parsed?.remember !== false };
  } catch {
    return { email: '', remember: true };
  }
}

export function savePendingVerify(payload) {
  write('sessionStorage', PENDING_KEY, JSON.stringify(payload));
}

export function getPendingVerify() {
  const raw = read('sessionStorage', PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingVerify() {
  remove('sessionStorage', PENDING_KEY);
}
