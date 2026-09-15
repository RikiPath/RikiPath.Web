import axios from 'axios';
import { getSession } from '../auth/session.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
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

function toApiError(data, status, isNetwork) {
  const payload = data && typeof data === 'object' ? data : null;
  const message =
    payload?.errorMessage ||
    flattenErrors(payload?.errors) ||
    payload?.title ||
    (isNetwork || status === 502 || status === 503
      ? 'Không kết nối được API. Kiểm tra backend đang chạy tại cổng 5265.'
      : `Không gọi được API (${status || 'lỗi'})`);
  const err = new Error(message);
  err.status = status;
  err.errors = payload?.errors;
  err.data = data;
  return err;
}

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data?.isSuccess === false) {
      throw toApiError(data, response.status, false);
    }
    return data;
  },
  (error) => Promise.reject(toApiError(error.response?.data, error.response?.status, !error.response)),
);
