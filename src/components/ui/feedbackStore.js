// Centralized user-feedback store & react-hot-toast adapter (no React/JSX import: unit-testable in Node).
//
// Which feedback to use:
//  - toast            → short, non-blocking result of an action ("Đã lưu").
//  - inline (Field)   → validation tied to one input; never a toast.
//  - banner           → persistent state of a page/section (offline, read-only, PaymentReview).
//  - confirm dialog   → before destructive / irreversible actions (never window.confirm).

import { describeApiError } from '@/api/apiErrors.js';
import { translateText } from '@/locales/locale.js';

export const DEFAULT_DURATION = {
  success: 3000,
  info: 3500,
  warning: 4500,
  error: 4500,
  loading: Infinity,
};
export const MAX_LOADING_WAIT_MS = 45_000;
const DEDUPE_WINDOW_MS = 4000;
const MAX_VISIBLE = 4;
const FLASH_STORAGE_KEY = 'rikipath.flashToast';

let toasts = [];
let seq = 0;
const listeners = new Set();
const recentKeys = new Map();
const loadingTimers = new Map();
let toastEngine = null;

function safeTranslate(text, locale) {
  return translateText(text, locale);
}

function clearLoadingSafetyTimer(id) {
  const timer = loadingTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    loadingTimers.delete(id);
  }
}

function armLoadingSafetyTimer(id, timeoutMs) {
  clearLoadingSafetyTimer(id);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return;
  const timer = setTimeout(() => {
    loadingTimers.delete(id);
    const active = toasts.find((t) => t.id === id && t.tone === 'loading');
    if (active) dismissToast(id);
  }, timeoutMs);
  loadingTimers.set(id, timer);
}

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function registerToastEngine(engine) {
  toastEngine = engine || null;
}

export function unregisterToastEngine() {
  toastEngine = null;
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function getToasts() {
  return toasts;
}

/**
 * Show or update a toast.
 * Duplicate key/content within DEDUPE_WINDOW_MS is ignored unless `replace: true`
 * (used when resolving an active loading toast cleanly into success/error).
 */
export function pushToast({
  tone = 'info',
  title,
  message = '',
  key,
  id,
  replace = false,
  duration,
  action,
  locale,
  maxWaitMs,
  now = Date.now(),
} = {}) {
  const trTitle = safeTranslate(title || '', locale);
  const trMessage = safeTranslate(message || '', locale);
  const trAction = action
    ? { ...action, label: safeTranslate(action.label || '', locale) }
    : null;

  if (!trTitle && !trMessage) return null;

  const dedupeKey = key || `${tone}|${trTitle}|${trMessage}`;
  const existingIndex = id
    ? toasts.findIndex((t) => t.id === id)
    : replace && key
      ? toasts.findIndex((t) => t.key === key)
      : -1;

  if (!replace) {
    const last = recentKeys.get(dedupeKey);
    if (last && now - last < DEDUPE_WINDOW_MS) return null;
    if (toasts.some((t) => t.key === dedupeKey)) return null;
  }

  recentKeys.set(dedupeKey, now);
  if (recentKeys.size > 200) {
    for (const [k, at] of recentKeys) {
      if (now - at > DEDUPE_WINDOW_MS) recentKeys.delete(k);
    }
  }

  const nextId = existingIndex >= 0 ? toasts[existingIndex].id : (id || `t${++seq}`);
  const resolvedDuration = duration ?? DEFAULT_DURATION[tone] ?? 4000;
  const item = {
    id: nextId,
    key: dedupeKey,
    tone,
    title: trTitle,
    message: trMessage,
    action: trAction,
    duration: resolvedDuration,
  };

  if (existingIndex >= 0) {
    const copy = toasts.slice();
    copy[existingIndex] = item;
    toasts = copy;
  } else {
    toasts = [...toasts, item];
    if (toasts.length > MAX_VISIBLE) {
      const evicted = toasts.slice(0, toasts.length - MAX_VISIBLE);
      toasts = toasts.slice(-MAX_VISIBLE);
      for (const old of evicted) {
        clearLoadingSafetyTimer(old.id);
        toastEngine?.dismiss?.(old.id);
      }
    }
  }

  if (tone === 'loading') {
    armLoadingSafetyTimer(nextId, maxWaitMs ?? MAX_LOADING_WAIT_MS);
  } else {
    clearLoadingSafetyTimer(nextId);
  }

  emit();
  toastEngine?.show?.(item);
  return nextId;
}

export function dismissToast(idOrKey) {
  if (!idOrKey) return;
  const target = toasts.find((t) => t.id === idOrKey || t.key === idOrKey);
  if (!target) {
    toastEngine?.dismiss?.(idOrKey);
    return;
  }
  clearLoadingSafetyTimer(target.id);
  toasts = toasts.filter((t) => t.id !== target.id);
  emit();
  toastEngine?.dismiss?.(target.id);
}

export function clearToasts() {
  for (const id of loadingTimers.keys()) clearTimeout(loadingTimers.get(id));
  loadingTimers.clear();
  toasts = [];
  recentKeys.clear();
  emit();
  toastEngine?.dismissAll?.();
}

function splitInput(titleOrOpts, maybeMessage, maybeOpts) {
  if (titleOrOpts && typeof titleOrOpts === 'object' && !Array.isArray(titleOrOpts)) {
    return titleOrOpts;
  }
  if (maybeMessage && typeof maybeMessage === 'object' && !Array.isArray(maybeMessage)) {
    return { ...maybeMessage, title: titleOrOpts, message: maybeMessage.message || '' };
  }
  return { ...(maybeOpts || {}), title: titleOrOpts, message: maybeMessage || '' };
}

function resolveDescriptor(descriptor, value, fallbackTitle) {
  const raw = typeof descriptor === 'function' ? descriptor(value) : descriptor;
  if (!raw) return fallbackTitle ? { title: fallbackTitle, message: '' } : null;
  if (typeof raw === 'string') return { title: raw, message: '' };
  return { title: raw.title || fallbackTitle || '', message: raw.message || '' };
}

export const notify = {
  success: (title, message, opts) => pushToast({ ...splitInput(title, message, opts), tone: 'success' }),
  info: (title, message, opts) => pushToast({ ...splitInput(title, message, opts), tone: 'info' }),
  warning: (title, message, opts) => pushToast({ ...splitInput(title, message, opts), tone: 'warning' }),
  error: (title, message, opts) => pushToast({ ...splitInput(title, message, opts), tone: 'error' }),
  loading: (title, message, opts) => pushToast({ ...splitInput(title, message, opts), tone: 'loading', duration: Infinity }),
  dismiss: (idOrKey) => dismissToast(idOrKey),
  clear: () => clearToasts(),

  /** Map any API/client error to a safe localized message via describeApiError. */
  apiError: (error, title = 'Chưa thực hiện được', opts) => {
    const info = describeApiError(error);
    const isWarning = info.offline || info.status === 429 || info.status === 503 || info.status === 504;
    return pushToast({
      ...opts,
      tone: isWarning ? 'warning' : 'error',
      title,
      message: info.message,
      key: opts?.key || `api|${info.code || info.status || 'x'}|${info.message}`,
    });
  },

  /**
   * Single-toast async lifecycle: loading → success / error on the same toast ID.
   * Soft-failed envelopes (`{ isSuccess: false }` / `{ success: false }`) never resolve as success.
   */
  async promise(promiseOrFactory, messages = {}, opts = {}) {
    const key = opts.key || (messages.loading ? `promise|${typeof messages.loading === 'string' ? messages.loading : messages.loading.title}` : undefined);
    if (key && toasts.some((t) => t.key === key && t.tone === 'loading')) {
      return typeof promiseOrFactory === 'function' ? promiseOrFactory() : promiseOrFactory;
    }

    const loadMsg = resolveDescriptor(messages.loading, undefined, 'Đang xử lý…');
    const toastId = pushToast({
      ...opts,
      key,
      tone: 'loading',
      duration: Infinity,
      title: loadMsg?.title || 'Đang xử lý…',
      message: loadMsg?.message || '',
    });

    try {
      const result = await (typeof promiseOrFactory === 'function' ? promiseOrFactory() : promiseOrFactory);
      if (result && typeof result === 'object' && (result.isSuccess === false || result.success === false)) {
        const envelopeErr = new Error(result.errorMessage || result.error || 'Không thể hoàn tất thao tác.');
        envelopeErr.errorCode = result.errorCode || null;
        envelopeErr.data = result;
        throw envelopeErr;
      }
      const okMsg = resolveDescriptor(messages.success, result, '');
      if (okMsg && (okMsg.title || okMsg.message)) {
        pushToast({
          id: toastId,
          key,
          replace: true,
          tone: opts.successTone || 'success',
          title: okMsg.title,
          message: okMsg.message,
          duration: opts.successDuration,
          locale: opts.locale,
        });
      } else if (toastId) {
        dismissToast(toastId);
      }
      return result;
    } catch (err) {
      if (err?.isCancelled) {
        if (toastId) dismissToast(toastId);
        throw err;
      }
      const info = describeApiError(err);
      const errMsg = typeof messages.error === 'function'
        ? resolveDescriptor(messages.error(err, info), err, 'Chưa thực hiện được')
        : typeof messages.error === 'string'
          ? { title: messages.error, message: info.message }
          : { title: messages.error?.title || 'Chưa thực hiện được', message: messages.error?.message || info.message };

      pushToast({
        id: toastId,
        key,
        replace: true,
        tone: info.offline || info.status === 429 || info.status === 503 || info.status === 504 ? 'warning' : 'error',
        title: errMsg.title,
        message: errMsg.message,
        duration: opts.errorDuration,
        locale: opts.locale,
      });
      throw err;
    }
  },

  /** Persist a one-shot notification across a full page reload (e.g. post-logout /auth redirect). */
  flash(tone, title, message = '', opts = {}) {
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(FLASH_STORAGE_KEY, JSON.stringify({ tone, title, message, key: opts.key }));
    } catch {
      // ignore storage blocked
    }
  },
};

export function consumeFlashToast() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(FLASH_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || (!parsed.title && !parsed.message)) return null;
    return pushToast({
      tone: parsed.tone || 'success',
      title: parsed.title,
      message: parsed.message,
      key: parsed.key,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- confirm
let confirmHandler = null;

/** Registered by <FeedbackProvider>. */
export function setConfirmHandler(handler) {
  confirmHandler = handler;
  return () => {
    if (confirmHandler === handler) confirmHandler = null;
  };
}

/**
 * Promise-based confirmation modal matching the visual tone of the app.
 * Fails safe to `false` when no provider is mounted (e.g. headless unit tests).
 */
export const __testing = { reset: clearToasts };

export async function confirmAction(options) {
  if (!confirmHandler) return false;
  const opts = typeof options === 'string' ? { title: options } : (options || {});
  return Boolean(await confirmHandler(opts));
}
