import axios from 'axios';
import { getSession } from '@/app/auth/session.js';
import { apiBase } from '@/config/backend.js';
import { describeApiError, isSafeUserMessage } from './apiErrors.js';
import { recordDiagnostic } from './diagnostics.js';

export const API_TIMEOUT_MS = 20000;

export const api = axios.create({
  baseURL: apiBase,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const SESSION_EXPIRED_EVENT = 'rikipath:session-expired';

/** Short random id so a user-reported "Mã tra cứu" can be matched to server logs. */
export function newCorrelationId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // fall through to Math.random based id
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const AUTH_ENDPOINTS = /\/Auth\/(login|register|google|verify-email|resend-verification-email|forgot-password|reset-password)/i;

api.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers['X-Correlation-Id']) {
    config.headers['X-Correlation-Id'] = newCorrelationId();
  }
  return config;
});

/**
 * Only a 401 on an authenticated, non-auth request means the session expired.
 * Preview tokens (`Bearer preview-...`, available only when preview mode is enabled)
 * and 403 forbidden responses must never redirect the user out to /auth.
 */
export function isSessionExpiry(status, config) {
  if (status !== 401 || !config) return false;
  const auth = String(config.headers?.Authorization || '');
  if (!auth || auth.startsWith('Bearer preview-')) return false;
  return !AUTH_ENDPOINTS.test(String(config.url || ''));
}

function flattenErrors(errors) {
  if (!errors) return '';
  if (Array.isArray(errors)) return errors.filter(Boolean).join(' ');
  if (typeof errors === 'object') {
    return Object.values(errors).flat().filter(Boolean).join(' ');
  }
  return String(errors);
}

function readCorrelationId(headers) {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    const value = headers.get('x-correlation-id');
    if (value) return String(value);
  }
  return headers['x-correlation-id'] || headers['X-Correlation-Id'] || null;
}

function toApiError(data, status, isNetwork, extra = {}) {
  const payload = data && typeof data === 'object' && !(typeof Blob !== 'undefined' && data instanceof Blob) ? data : null;
  const info = describeApiError({
    status,
    isNetwork,
    isTimeout: extra.isTimeout,
    code: extra.code,
    errorCode: payload?.errorCode,
    correlationId: extra.correlationId || null,
    data: payload,
  });
  // Server text is shown only when it is a short, non-technical sentence (no stack traces, SQL, URLs).
  const serverText = [
    payload?.errorMessage,
    typeof payload?.error === 'string' ? payload.error : '',
    flattenErrors(payload?.errors),
    payload?.title,
  ].find((text) => isSafeUserMessage(text));
  const message = serverText && !(status && status >= 500) ? serverText : info.message;
  const technicalDetail =
    payload?.detail ||
    payload?.errorMessage ||
    payload?.title ||
    (typeof payload?.error === 'string' ? payload.error : null);

  const err = new Error(message);
  err.status = status ?? payload?.statusCode ?? undefined;
  err.errorCode = payload?.errorCode || null;
  err.errors = payload?.errors;
  err.data = data;
  err.correlationId = extra.correlationId || null;
  err.state = info.state;
  err.technicalDetail = technicalDetail || null;
  err.isNetwork = Boolean(isNetwork);
  err.isTimeout = Boolean(extra.isTimeout);
  if (extra.code) err.code = extra.code;

  recordDiagnostic({
    scope: 'api',
    method: extra.method,
    endpoint: extra.url,
    status: err.status ?? null,
    code: err.errorCode || info.code,
    state: info.state,
    correlationId: err.correlationId,
    technicalDetail: err.technicalDetail,
  });

  return err;
}

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data?.isSuccess === false || data?.success === false) {
      throw toApiError(data, response.status, false, {
        correlationId: readCorrelationId(response.headers),
        method: response.config?.method,
        url: response.config?.url,
      });
    }
    return data;
  },
  (error) => {
    if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
      const cancelled = new Error('Đã hủy yêu cầu.');
      cancelled.isCancelled = true;
      cancelled.code = 'ERR_CANCELED';
      return Promise.reject(cancelled);
    }
    const status = error.response?.status;
    if (isSessionExpiry(status, error.config) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(
      toApiError(error.response?.data, status, !error.response, {
        correlationId: readCorrelationId(error.response?.headers) || error.config?.headers?.['X-Correlation-Id'] || null,
        isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
        code: error.code,
        method: error.config?.method,
        url: error.config?.url,
      }),
    );
  },
);
