import axios from 'axios';
import { getSession } from '../auth/session.js';
import { apiBase } from '../config/backend.js';

export const API_TIMEOUT_MS = 20000;

export const api = axios.create({
  baseURL: apiBase,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getSession()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  const message =
    payload?.errorMessage ||
    (typeof payload?.error === 'string' ? payload.error : '') ||
    flattenErrors(payload?.errors) ||
    payload?.title ||
    (isNetwork || status === 502 || status === 503
      ? 'Không kết nối được API. Kiểm tra backend đang chạy tại cổng 5265.'
      : `Không gọi được API (${status || 'lỗi'})`);
  const err = new Error(message);
  err.status = status ?? payload?.statusCode ?? undefined;
  err.errorCode = payload?.errorCode || null;
  err.errors = payload?.errors;
  err.data = data;
  err.correlationId = extra.correlationId || null;
  err.isNetwork = Boolean(isNetwork);
  err.isTimeout = Boolean(extra.isTimeout);
  if (extra.code) err.code = extra.code;
  return err;
}

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data?.isSuccess === false) {
      throw toApiError(data, response.status, false, { correlationId: readCorrelationId(response.headers) });
    }
    return data;
  },
  (error) =>
    Promise.reject(
      toApiError(error.response?.data, error.response?.status, !error.response, {
        correlationId: readCorrelationId(error.response?.headers),
        isTimeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
        code: error.code,
      }),
    ),
);
